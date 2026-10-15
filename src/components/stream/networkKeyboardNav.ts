import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkSceneEdge, NetworkSceneNode } from "./networkTypes"
import { glyphHitGeometry } from "./glyphDef"
import {
  nextGraphIndex,
  type NavGraph,
  type NavPoint,
  type NavPosition
} from "./navigationGraph"

// ── Network Extraction ───────────────────────────────────────────────────

/**
 * Extract navigable points from network scene nodes.
 * Each node's group is its own id, enabling neighbor traversal via edges.
 */
export function extractNetworkNavPoints(scene: NetworkSceneNode[]): NavPoint[] {
  const points: NavPoint[] = []

  // Skip non-visible scene nodes — same gates the canvas renderers use
  // (`if (c.r <= 0) continue`, `if (r.w <= 0 || r.h <= 0) continue`).
  // ProcessSankey emits zero-radius placeholder circles for color
  // binding (read by `nodeColorMap`); they must not enter the keyboard
  // nav graph or focus would start on an off-canvas invisible node.
  for (const node of scene) {
    if (!node.datum) continue
    if (node.type === "circle" && node.cx != null) {
      if (node.r <= 0) continue
      points.push({
        x: node.cx,
        y: node.cy,
        datum: node.datum,
        shape: "circle",
        group: node.datum.id ?? "_default"
      })
    } else if (node.type === "rect" && node.x != null) {
      if (node.w <= 0 || node.h <= 0) continue
      points.push({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
        datum: node.datum,
        shape: "rect",
        w: node.w,
        h: node.h,
        group: node.datum.id ?? "_default"
      })
    } else if (node.type === "arc" && node.cx != null) {
      points.push({
        x: node.cx,
        y: node.cy,
        datum: node.datum,
        shape: "circle",
        group: node.datum.id ?? "_default"
      })
    } else if (node.type === "symbol" && node.cx != null) {
      if (node.size <= 0) continue
      points.push({
        x: node.cx,
        y: node.cy,
        datum: node.datum,
        shape: "circle",
        group: node.datum.id ?? "_default"
      })
    } else if (node.type === "glyph" && node.cx != null) {
      if (node.size <= 0) continue
      const geometry = glyphHitGeometry(node.glyph, node.size)
      points.push({
        x: node.cx + geometry.centerDx,
        y: node.cy + geometry.centerDy,
        datum: node.datum,
        shape: "rect",
        w: geometry.halfWidth * 2,
        h: geometry.halfHeight * 2,
        group: node.datum.id ?? "_default"
      })
    }
  }

  for (const point of points)
    if (point.datum?.id != null) point.semanticKey = String(point.datum.id)

  points.sort((a, b) => a.x - b.x || a.y - b.y)
  return points
}

/**
 * Network-specific navigation: spatial arrow keys + edge following.
 *
 * ArrowRight/Left/Up/Down: move to the nearest node in that direction.
 * Enter: follow an edge to a connected neighbor of the current node.
 * PageUp/Down, Home/End, Escape: flat navigation.
 *
 * Returns the flat index of the target node, -1 to clear, or null for unhandled keys.
 */
const previousNetworkSteps = /* @__PURE__ */ new WeakMap<
  object,
  { nodeId: string; previousId: string }
>()

export function nextNetworkIndex(
  key: string,
  pos: NavPosition,
  graph: NavGraph,
  edges: EdgeLike[],
  neighborIndexRef: { current: number }
): number | null {
  const currentPoint = graph.flat[pos.flatIndex]
  if (!currentPoint) return nextGraphIndex(key, pos, graph)

  const nodeId = currentPoint.datum?.id

  switch (key) {
    case "ArrowRight":
    case "ArrowLeft":
    case "ArrowDown":
    case "ArrowUp": {
      const dir =
        key === "ArrowRight"
          ? "right"
          : key === "ArrowLeft"
            ? "left"
            : key === "ArrowDown"
              ? "down"
              : "up"
      const target =
        findNearestSpatial(graph, currentPoint, dir) ?? pos.flatIndex
      if (target !== pos.flatIndex) {
        neighborIndexRef.current = -1
        previousNetworkSteps.delete(neighborIndexRef)
      }
      return target
    }

    case "Enter": {
      // Follow edges: cycle through connected neighbors
      if (nodeId == null) return pos.flatIndex
      const neighborIds = collectNeighborIds(nodeId, edges)
      if (neighborIds.length === 0) return pos.flatIndex

      const previousStep = previousNetworkSteps.get(neighborIndexRef)
      const previousId =
        previousStep?.nodeId === String(nodeId)
          ? previousStep.previousId
          : undefined
      const candidates = neighborIds.filter(
        (id) => id !== previousId && graph.idToIdx.has(id)
      )
      const available = candidates.length
        ? candidates
        : neighborIds.filter((id) => graph.idToIdx.has(id))
      if (!available.length) return pos.flatIndex
      const next = (neighborIndexRef.current + 1) % available.length
      const targetIdx = graph.idToIdx.get(available[next]) ?? -1
      if (targetIdx >= 0) {
        // Reset so the new node starts its own neighbor cycle from -1
        neighborIndexRef.current = -1
        previousNetworkSteps.set(neighborIndexRef, {
          nodeId: available[next],
          previousId: String(nodeId)
        })
        return targetIdx
      }
      return pos.flatIndex
    }

    default: {
      previousNetworkSteps.delete(neighborIndexRef)
      const result = nextGraphIndex(key, pos, graph)
      if (result !== null && result !== pos.flatIndex) {
        neighborIndexRef.current = -1
      }
      return result
    }
  }
}

/** Find the nearest node in a cardinal direction from a reference point. */
function findNearestSpatial(
  graph: NavGraph,
  from: NavPoint,
  direction: "right" | "left" | "up" | "down"
): number | null {
  let bestIdx: number | null = null
  let bestDist = Infinity

  for (let i = 0; i < graph.flat.length; i++) {
    const p = graph.flat[i]
    if (p === from) continue

    const dx = p.x - from.x
    const dy = p.y - from.y

    // Check if the candidate is in the correct direction
    // Use a cone: primary axis delta must exceed cross-axis delta
    let inDirection = false
    switch (direction) {
      case "right":
        inDirection = dx > 0 && Math.abs(dx) >= Math.abs(dy)
        break
      case "left":
        inDirection = dx < 0 && Math.abs(dx) >= Math.abs(dy)
        break
      case "down":
        inDirection = dy > 0 && Math.abs(dy) >= Math.abs(dx)
        break
      case "up":
        inDirection = dy < 0 && Math.abs(dy) >= Math.abs(dx)
        break
    }

    if (!inDirection) continue

    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return bestIdx
}

/** Collect neighbor node ids from edge list for a given node. */
type EdgeLike =
  | NetworkSceneEdge
  | { source?: unknown; target?: unknown; datum?: Datum | null }

function getLinkedId(value: unknown): unknown {
  if (typeof value === "object" && value !== null && "id" in value) {
    return (value as { id?: unknown }).id
  }
  return value
}

function collectNeighborIds(nodeId: string, edges: EdgeLike[]): string[] {
  const nid = String(nodeId)
  const ids: string[] = []
  for (const edge of edges) {
    const raw = (edge.datum ?? edge) as { source?: unknown; target?: unknown }
    const srcRaw = getLinkedId(raw.source)
    const tgtRaw = getLinkedId(raw.target)
    const hasSrc = srcRaw != null
    const hasTgt = tgtRaw != null
    if (hasSrc && String(srcRaw) === nid && hasTgt) ids.push(String(tgtRaw))
    else if (hasTgt && String(tgtRaw) === nid && hasSrc)
      ids.push(String(srcRaw))
  }
  return [...new Set(ids)]
}
