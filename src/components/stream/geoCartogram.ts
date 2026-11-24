/**
 * Distance-cartogram projection of geo point scene nodes.
 * Mutates point/line positions in place; returns layout metadata for overlays.
 *
 * Two encodings:
 * - `radial` (default): pixel distance from center ∝ cost; bearing from geography
 * - `strip`: 1D Langren-style cost axis — x ∝ cost, y collapsed to a baseline
 *   (sparkline-friendly; no map chrome)
 */

import { geoAccessor } from "./geoPipelineHelpers"
import type {
  DistanceCartogramConfig,
  GeoLineSceneNode,
  GeoSceneNode
} from "./geoTypes"
import type { PointSceneNode, StreamLayout } from "./types"

export type GeoCartogramLayout = {
  cx: number
  cy: number
  maxCost: number
  availableRadius: number
  /** Active layout encoding — overlays branch on this. */
  layout: "radial" | "strip"
}

/**
 * Apply a distance cartogram transform to the scene.
 * Returns layout info when applied, or null when skipped.
 */
export function applyDistanceCartogram(
  scene: GeoSceneNode[],
  transform: DistanceCartogramConfig,
  layout: StreamLayout,
  areasLength: number
): GeoCartogramLayout | null {
  const pointNodes = scene.filter(
    (n): n is PointSceneNode => n.type === "point"
  )
  if (pointNodes.length < 2) return null

  const requestedStrength = transform.strength ?? 1
  const strength = Number.isFinite(requestedStrength)
    ? Math.max(0, Math.min(1, requestedStrength))
    : 1
  // Radial strength=0 means "leave geographic positions"; strip always
  // encodes cost on the axis (the map isn't the message).
  const strip = transform.layout === "strip"
  if (!strip && strength === 0) return null

  const idAcc = geoAccessor(transform.centerAccessor, "id")
  const costAcc = geoAccessor(transform.costAccessor, "")
  const readCost = (node: PointSceneNode) => node.datum ? Number(costAcc(node.datum)) : NaN
  // Find center node
  const centerNode = pointNodes.find(
    (n) => n.datum && String(idAcc(n.datum)) === String(transform.center)
  )
  if (!centerNode) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `GeoFrame: Distance cartogram center "${transform.center}" not found in point data`
      )
    }
    return null
  }

  // Compute max cost for scaling
  let maxCost = 1
  for (const point of pointNodes) {
    const cost = readCost(point)
    if (Number.isFinite(cost) && cost > maxCost) maxCost = cost
  }

  // Warn about areas in cartogram mode
  if (areasLength > 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      "GeoFrame: Distance cartogram does not support area rendering. " +
        "Areas will be ignored. Remove areas or set projectionTransform " +
        "to null to render them."
    )
  }

  const cartogramLayout =
    strip
      ? applyStripLayout(pointNodes, centerNode, readCost, maxCost, layout)
      : applyRadialLayout(pointNodes, centerNode, readCost, maxCost, strength, layout)

  const positions = new Map<string, [number, number]>()
  for (const point of pointNodes) {
    if (point.pointId != null) positions.set(String(point.pointId), [point.x, point.y])
  }
  let retained = 0
  for (let i = 0; i < scene.length; i++) {
    const node = scene[i]
    if (node.type === "geoarea" && node.interactive) continue
    scene[retained++] = node
    if (node.type !== "line" || node.datum?.source == null || node.datum.target == null) continue
    const start = positions.get(String(node.datum.source))
    const end = positions.get(String(node.datum.target))
    if (!start || !end) continue
    const fractional = transform.lineMode === "fractional"
    const route = fractional ? node.path.slice() : node.path
    let next = scene[i + 1]
    while (next?.type === "line" && next.continuation && next.datum === node.datum) {
      if (fractional) {
        // Continue in the same projected plane as the previous seam endpoint.
        const last = route[route.length - 1]
        const [firstX, firstY] = next.path[0]
        for (const [x, y] of next.path.slice(1)) route.push([last[0] + x - firstX, last[1] + y - firstY])
      }
      delete node.style._edgeFade
      i++
      next = scene[i + 1]
    }
    node.path = fractional && route.length > 2
      ? reattachRoute(route, start, end)
      : [start, end]
  }
  scene.length = retained

  return cartogramLayout
}

/** Translate each vertex by its distance-weighted share of both endpoint moves. */
function reattachRoute(
  route: GeoLineSceneNode["path"], start: [number, number], end: [number, number]
): GeoLineSceneNode["path"] {
  const last = route.length - 1
  const cumulative = [0]
  for (let i = 1; i <= last; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]))
  }
  return route.map(([x, y], i) => {
    if (i === 0) return start
    if (i === last) return end
    const fraction = cumulative[last] > 0 ? cumulative[i] / cumulative[last] : i / last
    return [
      x + (start[0] - route[0][0]) * (1 - fraction) + (end[0] - route[last][0]) * fraction,
      y + (start[1] - route[0][1]) * (1 - fraction) + (end[1] - route[last][1]) * fraction
    ]
  })
}

// ── Radial (polar) layout ─────────────────────────────────────────────

function applyRadialLayout(
  pointNodes: PointSceneNode[],
  centerNode: PointSceneNode,
  readCost: (node: PointSceneNode) => number,
  maxCost: number,
  strength: number,
  layout: StreamLayout
): GeoCartogramLayout {
  const viewCx = layout.width / 2
  const viewCy = layout.height / 2
  const availableRadius = Math.min(layout.width, layout.height) / 2

  for (const node of pointNodes) {
    if (node === centerNode || !node.datum) continue

    const dx = node.x - centerNode.x
    const dy = node.y - centerNode.y
    const geoDist = Math.hypot(dx, dy)
    const cost = readCost(node)
    const costDist =
      isFinite(cost) && cost >= 0
        ? (cost / maxCost) * availableRadius
        : geoDist
    const costX = viewCx + (geoDist ? dx / geoDist : 1) * costDist
    const costY = viewCy + (geoDist ? dy / geoDist : 0) * costDist

    // Interpolate between two complete, in-bounds layouts: the fitted
    // geography and the centered cost cartogram. Applying the full recenter
    // offset at partial strength pushes the geographic half outside the plot.
    node.x += (costX - node.x) * strength
    node.y += (costY - node.y) * strength
  }

  centerNode.x += (viewCx - centerNode.x) * strength
  centerNode.y += (viewCy - centerNode.y) * strength

  return {
    cx: centerNode.x,
    cy: centerNode.y,
    maxCost,
    availableRadius,
    layout: "radial",
  }
}

// ── Strip (Langren 1D) layout ─────────────────────────────────────────

function applyStripLayout(
  pointNodes: PointSceneNode[],
  centerNode: PointSceneNode,
  readCost: (node: PointSceneNode) => number,
  maxCost: number,
  layout: StreamLayout
): GeoCartogramLayout {
  // Inset so endpoint marks don't clip at the plot edge. Scale with height
  // so a 24px sparkline still has room for a 1.5–2px radius.
  const pad = Math.max(3, Math.min(8, layout.height * 0.35))
  const stripLen = Math.max(1, layout.width - pad * 2)
  const midY = layout.height / 2

  const placed: PointSceneNode[] = []
  for (const node of pointNodes) {
    node.x = pad
    node.y = midY
    if (node === centerNode || !node.datum) continue
    const cost = readCost(node)
    if (Number.isFinite(cost) && cost > 0) node.x += cost / maxCost * stripLen
    placed.push(node)
  }

  // Light beeswarm: when marks share nearly the same x, fan them vertically
  // so collisions stay legible without looking like a 2D map. Amplitude is
  // capped by plot height so a 24px sparkline only jogs ±2–3px.
  placed.sort((a, b) => a.x - b.x)
  const collisionPx = 3
  const maxOffset = Math.max(0, Math.min(layout.height / 2 - 1, 6))
  let runStart = 0
  while (runStart < placed.length) {
    let runEnd = runStart + 1
    while (
      runEnd < placed.length &&
      Math.abs(placed[runEnd].x - placed[runStart].x) < collisionPx
    ) {
      runEnd++
    }
    const runLen = runEnd - runStart
    if (runLen > 1 && maxOffset > 0) {
      const step = Math.min(2.5, (maxOffset * 2) / (runLen - 1))
      for (let i = 0; i < runLen; i++) {
        // Center the stack on midY: … -2, -1, 0, 1, 2 …
        const offsetIndex = i - (runLen - 1) / 2
        placed[runStart + i].y = midY + offsetIndex * step
      }
    }
    runStart = runEnd
  }

  return {
    cx: pad,
    cy: midY,
    maxCost,
    availableRadius: stripLen,
    layout: "strip",
  }
}
