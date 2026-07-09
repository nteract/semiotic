/**
 * Distance-cartogram projection of geo point scene nodes.
 * Mutates point/line positions in place; returns layout metadata for overlays.
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
  if (strength === 0) return null

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

  const cx = centerNode.x
  const cy = centerNode.y

  // Compute max cost for scaling
  const costs = pointNodes
    .map((n) => (n.datum ? costAcc(n.datum) : NaN))
    .filter((c) => isFinite(c) && c >= 0)
  const maxCost = getMax(costs, 1)

  const availableRadius = Math.min(layout.width, layout.height) / 2

  const costScale = scaleLinear().domain([0, maxCost]).range([0, availableRadius])

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

  for (const node of pointNodes) {
    if (node === centerNode) continue
    if (!node.datum) continue

    const angle = Math.atan2(node.y - cy, node.x - cx)
    const geoDist = Math.sqrt((node.x - cx) ** 2 + (node.y - cy) ** 2)
    const cost = costAcc(node.datum)
    const costDist = isFinite(cost) ? costScale(cost) : geoDist

    const dist = geoDist + (costDist - geoDist) * strength

    node.x = cx + Math.cos(angle) * dist
    node.y = cy + Math.sin(angle) * dist
  }

  // Re-center the cartogram so the center node is always at the
  // viewport center. Without this, fitProjection moves the center
  // as new points arrive, causing the cartogram to "bounce around."
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

  const cartogramLayout: GeoCartogramLayout = { cx: viewCx, cy: viewCy, maxCost, availableRadius }

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
