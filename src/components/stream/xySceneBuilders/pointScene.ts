/**
 * Point/scatter/bubble scene builder.
 *
 * Handles: size scaling from sizeAccessor, color mapping from colorAccessor,
 * and pointId attachment for hit testing.
 *
 * Dependencies: SceneGraph (buildPointNode)
 * Consumed by: PipelineStore.buildSceneNodes (chartTypes "scatter", "bubble")
 */
import type { SceneNode } from "../types"
import { buildPointNode } from "../SceneGraph"
import type { XYSceneContext } from "./types"

export function buildPointScene(ctx: XYSceneContext, data: Record<string, any>[]): SceneNode[] {
  const nodes: SceneNode[] = []
  const defaultR = ctx.config.chartType === "bubble" ? 10 : 5
  const sizeRange = ctx.config.sizeRange || [3, 15]

  // Compute size scale if sizeAccessor is set and no pointStyle handles it
  let sizeScale: ((v: number) => number) | null = null
  if (ctx.getSize && !ctx.config.pointStyle) {
    const sizes = data.map(d => ctx.getSize!(d)).filter(s => s != null && !Number.isNaN(s))
    if (sizes.length > 0) {
      let minSize = Infinity
      let maxSize = -Infinity
      for (const s of sizes) {
        if (s < minSize) minSize = s
        if (s > maxSize) maxSize = s
      }
      sizeScale = (s: number) => {
        if (minSize === maxSize) return (sizeRange[0] + sizeRange[1]) / 2
        return sizeRange[0] + ((s - minSize) / (maxSize - minSize)) * (sizeRange[1] - sizeRange[0])
      }
    }
  }

  // Build color map from colorAccessor
  const colorMap = ctx.getColor
    ? ctx.resolveColorMap(data)
    : null

  for (const d of data) {
    let style = ctx.config.pointStyle ? ctx.config.pointStyle(d) : { fill: "#4e79a7", opacity: 0.8 }

    let r = (style as any).r || defaultR
    if (sizeScale && ctx.getSize) {
      const sizeVal = ctx.getSize(d)
      if (sizeVal != null && !Number.isNaN(sizeVal)) {
        r = sizeScale(sizeVal)
      }
    }

    if (colorMap && ctx.getColor && !style.fill) {
      const colorVal = ctx.getColor(d)
      if (colorVal && colorMap.has(colorVal)) {
        style = { ...style, fill: colorMap.get(colorVal)! }
      }
    }

    const pointId = ctx.getPointId ? String(ctx.getPointId(d)) : undefined
    const node = buildPointNode(d, ctx.scales, ctx.getX, ctx.getY, r, style, pointId)
    if (node) nodes.push(node)
  }

  return nodes
}
