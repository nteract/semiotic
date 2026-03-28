/**
 * Bounds scene builder — produces an AreaSceneNode for confidence bands/envelopes.
 *
 * Consumed by: lineScene (renders bounds behind lines)
 */
import type { AreaSceneNode } from "../types"
import type { XYSceneContext } from "./types"

export function buildBoundsForGroup(ctx: XYSceneContext, data: Record<string, any>[], group: string): AreaSceneNode | null {
  if (!ctx.getBounds || !ctx.scales) return null

  const topPath: [number, number][] = []
  const bottomPath: [number, number][] = []

  for (const d of data) {
    const x = ctx.getX(d)
    const y = ctx.getY(d)
    if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) continue

    const offset = ctx.getBounds(d)
    const px = ctx.scales.x(x)

    if (!offset || offset === 0) {
      const py = ctx.scales.y(y)
      topPath.push([px, py])
      bottomPath.push([px, py])
    } else {
      topPath.push([px, ctx.scales.y(y + offset)])
      bottomPath.push([px, ctx.scales.y(y - offset)])
    }
  }

  if (topPath.length < 2) return null

  return {
    type: "area",
    topPath,
    bottomPath,
    style: ctx.resolveBoundsStyle(group, data[0]),
    datum: data,
    group,
    interactive: false
  }
}
