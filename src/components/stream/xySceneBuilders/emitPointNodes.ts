import type { Datum } from "../../charts/shared/datumTypes"
/**
 * Shared helper for emitting PointSceneNodes from grouped data.
 *
 * Used by line, area, and stacked area scene builders when the HOC's
 * `showPoints` prop is active (i.e., `ctx.config.pointStyle` is set).
 * Handles group color fallback for push API mode and pointId passthrough.
 */
import type { SceneNode } from "../types"
import { buildPointNode } from "../SceneGraph"
import type { XYSceneContext } from "./types"

export function emitPointNodes(
  ctx: XYSceneContext,
  groups: { key: string; data: Datum[] }[],
  nodes: SceneNode[],
  yGetOverride?: (d: Datum) => number
): void {
  if (!ctx.config.pointStyle) return

  const yGet = yGetOverride ?? ctx.getY

  for (const g of groups) {
    const groupColor = ctx.resolveGroupColor(g.key)
    for (const d of g.data) {
      let style = ctx.config.pointStyle(d)
      if (!style.fill && groupColor) {
        style = { ...style, fill: groupColor }
      }
      const r = style.r ?? 3
      const pointId = ctx.getPointId ? String(ctx.getPointId(d)) : undefined
      const node = buildPointNode(d, ctx.scales, ctx.getX, yGet, r, style, pointId)
      if (node) nodes.push(node)
    }
  }
}
