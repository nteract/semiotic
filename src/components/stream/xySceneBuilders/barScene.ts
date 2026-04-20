/**
 * Realtime histogram bar scene builder.
 *
 * Builds binned bars with optional category stacking. Maintains stable
 * category order via barColors keys + alphabetical fallback to prevent
 * flicker when bins partially exit the sliding window.
 *
 * Dependencies: BinAccumulator (computeBins), SceneGraph (buildRectNode)
 * Consumed by: PipelineStore.buildSceneNodes (chartType "bar")
 */
import type { SceneNode } from "../types"
import { computeBins } from "../../realtime/BinAccumulator"
import { buildRectNode } from "../SceneGraph"
import type { XYSceneContext } from "./types"

export interface BarSceneResult {
  nodes: SceneNode[]
  /** Sorted bin boundary values (edges of all bins) for data-driven brush snapping */
  binBoundaries: number[]
}

export function buildBarScene(ctx: XYSceneContext, data: Record<string, any>[]): BarSceneResult {
  if (!ctx.config.binSize) return { nodes: [], binBoundaries: [] }

  const bins = computeBins(data, ctx.getX, ctx.getY, ctx.config.binSize, ctx.getCategory)
  if (bins.size === 0) return { nodes: [], binBoundaries: [] }

  // Establish stable category order (instance-scoped cache on ctx)
  let categoryOrder: string[] | null = null
  if (ctx.getCategory) {
    const allCategories = new Set<string>()
    for (const bin of bins.values()) {
      for (const cat of bin.categories.keys()) {
        allCategories.add(cat)
      }
    }
    const colorKeys = ctx.config.barColors ? Object.keys(ctx.config.barColors) : []
    const listed = new Set(colorKeys)
    const unlisted = Array.from(allCategories).filter(c => !listed.has(c)).sort()
    const activeKeys = colorKeys.filter(k => allCategories.has(k))
    const cacheKey = activeKeys.join('\0') + '\x01' + unlisted.join('\0')
    if (ctx.barCategoryCache && ctx.barCategoryCache.key === cacheKey) {
      categoryOrder = ctx.barCategoryCache.order
    } else {
      categoryOrder = [...activeKeys, ...unlisted]
      ctx.barCategoryCache = { key: cacheKey, order: categoryOrder }
    }
  }

  const nodes: SceneNode[] = []
  const scales = ctx.scales
  const [domainMin, domainMax] = scales.x.domain() as [number, number]

  // ── Resolve style inputs once per scene build ────────────────────────
  // Precedence for stacked fill:   barColors[cat] > themeSemantic.primary > #4e79a7
  // Precedence for unstacked fill: barStyle.fill  > themeSemantic.primary > #007bff
  // Stroke/strokeWidth flow from barStyle directly (no hardcoded stroke).
  const barStyle = ctx.config.barStyle
  const themePrimary = ctx.config.themeSemantic?.primary
  const userGap = barStyle?.gap
  const gap = typeof userGap === "number" && userGap >= 0 ? userGap : 1
  const strokeStyle: { stroke?: string; strokeWidth?: number } = {}
  if (barStyle?.stroke) strokeStyle.stroke = barStyle.stroke
  if (typeof barStyle?.strokeWidth === "number") strokeStyle.strokeWidth = barStyle.strokeWidth

  for (const bin of bins.values()) {
    const clampedStart = Math.max(bin.start, domainMin)
    const clampedEnd = Math.min(bin.end, domainMax)
    if (clampedStart >= clampedEnd) continue

    const rawX0 = scales.x(clampedStart)
    const rawX1 = scales.x(clampedEnd)
    const rawWidth = Math.abs(rawX1 - rawX0)
    const effectiveGap = rawWidth > gap + 1 ? gap : 0
    const x0 = Math.min(rawX0, rawX1) + effectiveGap / 2
    const barWidth = Math.max(rawWidth - effectiveGap, 1)
    if (barWidth <= 0) continue

    if (categoryOrder && bin.categories.size > 0) {
      let cumulativeBase = 0
      for (const cat of categoryOrder) {
        const catVal = bin.categories.get(cat) || 0
        if (catVal === 0) continue
        const yBottom = scales.y(cumulativeBase)
        const yTop = scales.y(cumulativeBase + catVal)
        const rectY = Math.min(yBottom, yTop)
        const rectH = Math.abs(yBottom - yTop)

        const fill = ctx.config.barColors?.[cat] || themePrimary || "#4e79a7"
        nodes.push(buildRectNode(
          x0, rectY, barWidth, rectH,
          { fill, ...strokeStyle },
          { binStart: bin.start, binEnd: bin.end, total: bin.total, category: cat, categoryValue: catVal },
          cat
        ))
        cumulativeBase += catVal
      }
    } else {
      const yZero = scales.y(0)
      const yTop = scales.y(bin.total)
      const rectY = Math.min(yZero, yTop)
      const rectH = Math.abs(yZero - yTop)

      const fill = barStyle?.fill || themePrimary || "#007bff"
      nodes.push(buildRectNode(
        x0, rectY, barWidth, rectH,
        { fill, ...strokeStyle },
        { binStart: bin.start, binEnd: bin.end, total: bin.total }
      ))
    }
  }

  // Extract sorted bin boundaries (unique edges) for data-driven brush snapping
  const boundarySet = new Set<number>()
  for (const bin of bins.values()) {
    boundarySet.add(bin.start)
    boundarySet.add(bin.end)
  }
  const binBoundaries = Array.from(boundarySet).sort((a, b) => a - b)

  return { nodes, binBoundaries }
}
