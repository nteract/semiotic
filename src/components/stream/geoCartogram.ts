/**
 * Distance-cartogram projection of geo point scene nodes.
 * Mutates point/line positions in place; returns layout metadata for overlays.
 *
 * Two encodings:
 * - `radial` (default): pixel distance from center ∝ cost; bearing from geography
 * - `strip`: 1D Langren-style cost axis — x ∝ cost, y collapsed to a baseline
 *   (sparkline-friendly; no map chrome)
 */

import { scaleLinear } from "d3-scale"
import type { Datum } from "../charts/shared/datumTypes"
import { getMax } from "../charts/shared/minMax"
import type {
  DistanceCartogramConfig,
  GeoAreaSceneNode,
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

  const strength = transform.strength ?? 1
  // Radial strength=0 means "leave geographic positions"; strip always
  // encodes cost on the axis (the map isn't the message).
  const layoutMode = transform.layout === "strip" ? "strip" : "radial"
  if (layoutMode === "radial" && strength === 0) return null

  const idAcc = transform.centerAccessor
    ? typeof transform.centerAccessor === "function"
      ? transform.centerAccessor
      : (d: Datum) => d[transform.centerAccessor as string]
    : (d: Datum) => d.id

  const costAcc =
    typeof transform.costAccessor === "function"
      ? transform.costAccessor
      : (d: Datum) => d[transform.costAccessor as string]

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
  const costs = pointNodes
    .map((n) => (n.datum ? Number(costAcc(n.datum)) : NaN))
    .filter((c) => isFinite(c) && c >= 0)
  const maxCost = getMax(costs, 1)

  // Warn about areas in cartogram mode
  if (areasLength > 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      "GeoFrame: Distance cartogram does not support area rendering. " +
        "Areas will be ignored. Remove areas or set projectionTransform " +
        "to null to render them."
    )
  }

  // Filter out area nodes in cartogram mode (mutate caller's array via splice)
  for (let i = scene.length - 1; i >= 0; i--) {
    const n = scene[i]
    if (n.type === "geoarea" && (n as GeoAreaSceneNode).interactive) {
      scene.splice(i, 1)
    }
  }

  const cartogramLayout =
    layoutMode === "strip"
      ? applyStripLayout(pointNodes, centerNode, costAcc, maxCost, layout)
      : applyRadialLayout(pointNodes, centerNode, costAcc, maxCost, strength, layout)

  // Reposition lines connecting repositioned points
  const lineNodes = scene.filter(
    (n): n is GeoLineSceneNode => n.type === "line"
  )
  if (lineNodes.length > 0 && transform.lineMode !== "fractional") {
    // Build position lookup from repositioned points
    const posMap = new Map<string, [number, number]>()
    for (const pn of pointNodes) {
      if (pn.pointId) posMap.set(pn.pointId, [pn.x, pn.y])
    }

    for (const ln of lineNodes) {
      const src = ln.datum?.source
      const tgt = ln.datum?.target
      if (src && tgt) {
        const srcPos = posMap.get(String(src))
        const tgtPos = posMap.get(String(tgt))
        if (srcPos && tgtPos) {
          ln.path = [srcPos, tgtPos]
        }
      }
    }
  }

  return cartogramLayout
}

// ── Radial (polar) layout ─────────────────────────────────────────────

function applyRadialLayout(
  pointNodes: PointSceneNode[],
  centerNode: PointSceneNode,
  costAcc: (d: Datum) => unknown,
  maxCost: number,
  strength: number,
  layout: StreamLayout
): GeoCartogramLayout {
  const cx = centerNode.x
  const cy = centerNode.y
  const availableRadius = Math.min(layout.width, layout.height) / 2
  const costScale = scaleLinear().domain([0, maxCost]).range([0, availableRadius])

  for (const node of pointNodes) {
    if (node === centerNode) continue
    if (!node.datum) continue

    const angle = Math.atan2(node.y - cy, node.x - cx)
    const geoDist = Math.sqrt((node.x - cx) ** 2 + (node.y - cy) ** 2)
    const cost = Number(costAcc(node.datum))
    const costDist = isFinite(cost) ? costScale(cost) : geoDist

    const dist = geoDist + (costDist - geoDist) * strength

    node.x = cx + Math.cos(angle) * dist
    node.y = cy + Math.sin(angle) * dist
  }

  // Re-center so the center node is always at the viewport center.
  const viewCx = layout.width / 2
  const viewCy = layout.height / 2
  const offsetX = viewCx - centerNode.x
  const offsetY = viewCy - centerNode.y

  if (Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5) {
    for (const node of pointNodes) {
      node.x += offsetX
      node.y += offsetY
    }
  }

  return {
    cx: viewCx,
    cy: viewCy,
    maxCost,
    availableRadius,
    layout: "radial",
  }
}

// ── Strip (Langren 1D) layout ─────────────────────────────────────────

function applyStripLayout(
  pointNodes: PointSceneNode[],
  centerNode: PointSceneNode,
  costAcc: (d: Datum) => unknown,
  maxCost: number,
  layout: StreamLayout
): GeoCartogramLayout {
  // Inset so endpoint marks don't clip at the plot edge. Scale with height
  // so a 24px sparkline still has room for a 1.5–2px radius.
  const pad = Math.max(3, Math.min(8, layout.height * 0.35))
  const stripLen = Math.max(1, layout.width - pad * 2)
  const midY = layout.height / 2
  const costScale = scaleLinear().domain([0, maxCost]).range([0, stripLen])

  // Origin at the left; cost grows rightward.
  centerNode.x = pad
  centerNode.y = midY

  // Place each non-center mark on the cost axis.
  type Placed = { node: PointSceneNode; x: number }
  const placed: Placed[] = []
  for (const node of pointNodes) {
    if (node === centerNode) continue
    if (!node.datum) {
      node.x = pad
      node.y = midY
      continue
    }
    const cost = Number(costAcc(node.datum))
    const x = pad + (isFinite(cost) && cost >= 0 ? costScale(cost) : 0)
    node.x = x
    node.y = midY
    placed.push({ node, x })
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
      for (let i = 0; i < runLen; i++) {
        // Center the stack on midY: … -2, -1, 0, 1, 2 …
        const offsetIndex = i - (runLen - 1) / 2
        const step = Math.min(2.5, (maxOffset * 2) / Math.max(1, runLen - 1))
        placed[runStart + i].node.y = midY + offsetIndex * step
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
