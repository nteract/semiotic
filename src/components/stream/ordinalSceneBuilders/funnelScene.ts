import { scaleLinear } from "d3-scale"
import { buildRectNode } from "../SceneGraph"
import type { OrdinalSceneNode, OrdinalLayout, TrapezoidSceneNode } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

/**
 * Funnel scene builder.
 *
 * Steps run top-to-bottom. Each step is a horizontal row whose bar width is
 * proportional to its value. Multiple categories mirror around the center axis:
 * with 2 categories, one extends right and the other extends left.
 *
 * Produces:
 *  - RectSceneNode for each bar (step × category)
 *  - TrapezoidSceneNode for each connector between consecutive steps
 *
 * Label metadata on each rect datum (used by funnelLabelRenderer):
 *  - __funnelStepLabel: step name (only on first category rect per row)
 *  - __funnelValue: numeric value for this bar
 *  - __funnelPercent: percent of this category's first-step value
 *  - __funnelIsFirstStep: true for step index 0 (suppresses "100%")
 *  - __funnelStepLabelX/Y: center position for step name
 *  - __funnelValueLabelX/Y: center position for value label
 *  - __funnelBarW: pixel width of this bar (for min-size suppression)
 *
 * NOTE: FunnelChart HOC uses projection="horizontal" so the ordinal band
 * scale maps to layout.height (y-axis). col.x = y-position, col.width = band height.
 */
export function buildFunnelScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { columns, getR, getStack, resolvePieceStyle } = ctx
  const nodes: OrdinalSceneNode[] = []
  const centerX = layout.width / 2
  const showLabels = ctx.config.showLabels !== false

  // Get steps in ordinal domain order (top to bottom)
  const domain = ctx.scales.o.domain()
  const orderedColumns = domain.map(name => columns[name]).filter(Boolean)
  if (orderedColumns.length === 0) return nodes

  // Discover category keys (from stackBy/groupBy accessor)
  const categoryKeys: string[] = []
  const categorySet = new Set<string>()
  for (const col of orderedColumns) {
    for (const d of col.pieceData) {
      const key = getStack ? getStack(d) : "_default"
      if (!categorySet.has(key)) {
        categorySet.add(key)
        categoryKeys.push(key)
      }
    }
  }
  const hasMultipleCategories = categoryKeys.length > 1 && categoryKeys[0] !== "_default"

  // Compute per-step, per-category aggregated values
  interface StepData {
    col: typeof orderedColumns[0]
    groups: Map<string, { total: number; pieces: Record<string, any>[] }>
    stepTotal: number
  }
  const steps: StepData[] = []
  let globalMax = 0

  for (const col of orderedColumns) {
    const groups = new Map<string, { total: number; pieces: Record<string, any>[] }>()
    let stepTotal = 0
    for (const d of col.pieceData) {
      const key = getStack ? getStack(d) : "_default"
      if (!groups.has(key)) groups.set(key, { total: 0, pieces: [] })
      const g = groups.get(key)!
      const v = getR(d)
      g.total += v
      g.pieces.push(d)
      stepTotal += v
    }
    steps.push({ col, groups, stepTotal })
    if (!hasMultipleCategories) {
      if (stepTotal > globalMax) globalMax = stepTotal
    }
  }

  // For multi-category, globalMax must reflect the max combined total on either
  // side of the center axis (categories alternate sides: even→right, odd→left).
  // This prevents stacked bars from overflowing when 2+ categories share a side.
  if (hasMultipleCategories) {
    for (const step of steps) {
      let rightTotal = 0
      let leftTotal = 0
      for (let ci = 0; ci < categoryKeys.length; ci++) {
        const group = step.groups.get(categoryKeys[ci])
        if (!group) continue
        if (ci % 2 === 0) rightTotal += group.total
        else leftTotal += group.total
      }
      const sideMax = Math.max(rightTotal, leftTotal)
      if (sideMax > globalMax) globalMax = sideMax
    }
  }

  if (globalMax === 0) return nodes

  // Per-category first-step totals (for percent calculation)
  const catFirstTotals = new Map<string, number>()
  for (const key of categoryKeys) {
    const firstGroup = steps[0].groups.get(key)
    catFirstTotals.set(key, firstGroup?.total ?? 0)
  }
  const firstStepTotal = steps[0].stepTotal

  // Width scale — single-category bars span up to ~90% of full width (centered),
  // multi-category bars span up to ~95% of half-width (one side of center axis)
  const halfWidth = centerX
  const maxBarWidth = hasMultipleCategories ? halfWidth * 0.95 : layout.width * 0.9
  const widthScale = scaleLinear().domain([0, globalMax]).range([0, maxBarWidth])

  const connectorOpacity = ctx.config.connectorOpacity ?? 0.3
  const barHeightRatio = 0.55

  let prevBars: Map<string, { x: number; y: number; w: number; h: number }> = new Map()

  for (let si = 0; si < steps.length; si++) {
    const step = steps[si]
    const col = step.col
    const isFirstStep = si === 0

    const rowY = col.x
    const rowH = col.width
    const barH = rowH * barHeightRatio
    const barY = rowY + (rowH - barH) / 2

    const currentBars = new Map<string, { x: number; y: number; w: number; h: number }>()

    if (!hasMultipleCategories) {
      // Single category: centered bar
      const val = step.stepTotal
      const barW = widthScale(val)
      const barX = centerX - barW / 2

      // Use the real category key (not step name) so tooltips/selection work
      const catKey = categoryKeys[0]
      const isRealCategory = catKey !== "_default"
      const datum = step.groups.get(catKey)?.pieces[0] ?? col.pieceData[0]
      const styleKey = isRealCategory ? catKey : col.name
      const style = resolvePieceStyle(datum, styleKey)
      const pct = firstStepTotal > 0 ? (val / firstStepTotal * 100) : 0

      const labelData: Record<string, any> = {
        ...datum,
        __funnelValue: val,
        __funnelPercent: pct,
        __funnelStep: col.name,
        __funnelIsFirstStep: isFirstStep,
        category: isRealCategory ? catKey : col.name,
      }

      if (showLabels) {
        labelData.__funnelStepLabel = col.name
        labelData.__funnelStepLabelX = centerX
        labelData.__funnelStepLabelY = barY
        labelData.__funnelRowWidth = barW
        labelData.__funnelValueLabelX = centerX
        labelData.__funnelValueLabelY = barY
        labelData.__funnelBarW = barW
      }

      nodes.push(buildRectNode(barX, barY, barW, barH, style, labelData, styleKey))
      currentBars.set(catKey, { x: barX, y: barY, w: barW, h: barH })
    } else {
      // Multi-category: mirror around center
      // Pre-compute total row width for step label suppression
      let rowTotalWidth = 0
      for (const catKey of categoryKeys) {
        const group = step.groups.get(catKey)
        if (group) rowTotalWidth += widthScale(group.total)
      }

      // Stack bars outward from center on each side
      let rightOffset = centerX
      let leftOffset = centerX

      for (let ci = 0; ci < categoryKeys.length; ci++) {
        const catKey = categoryKeys[ci]
        const group = step.groups.get(catKey)
        if (!group) continue

        const barW = widthScale(group.total)
        const isRight = ci % 2 === 0
        const barX = isRight ? rightOffset : leftOffset - barW
        if (isRight) rightOffset += barW
        else leftOffset -= barW

        const style = resolvePieceStyle(group.pieces[0], catKey)
        const catFirstTotal = catFirstTotals.get(catKey) ?? group.total
        const pct = catFirstTotal > 0 ? (group.total / catFirstTotal * 100) : 0

        const labelData: Record<string, any> = {
          ...group.pieces[0],
          __funnelValue: group.total,
          __funnelPercent: pct,
          __funnelStep: col.name,
          __funnelIsFirstStep: isFirstStep,
          __aggregateValue: group.total,
          __pieceCount: group.pieces.length,
          category: catKey,
        }

        if (showLabels) {
          // Step name only on the first category rect per row
          if (ci === 0) {
            labelData.__funnelStepLabel = col.name
            labelData.__funnelStepLabelX = centerX
            labelData.__funnelStepLabelY = barY
            labelData.__funnelRowWidth = rowTotalWidth
          }
          // Every bar gets its own value label centered within the bar
          labelData.__funnelValueLabelX = barX + barW / 2
          labelData.__funnelValueLabelY = barY
          labelData.__funnelBarW = barW
        }

        nodes.push(buildRectNode(barX, barY, barW, barH, style, labelData, catKey))
        currentBars.set(catKey, { x: barX, y: barY, w: barW, h: barH })
      }
    }

    // Build trapezoid connectors between this step and the previous
    if (si > 0 && prevBars.size > 0) {
      const keys = hasMultipleCategories ? categoryKeys : [categoryKeys[0]]
      for (const key of keys) {
        const prev = prevBars.get(key)
        const curr = currentBars.get(key)
        if (!prev || !curr) continue

        const style = (() => {
          const group = step.groups.get(key)
          const styleKey = key === "_default" ? col.name : key
          if (group) return resolvePieceStyle(group.pieces[0], styleKey)
          return resolvePieceStyle(col.pieceData[0], styleKey)
        })()

        const trapezoid: TrapezoidSceneNode = {
          type: "trapezoid",
          points: [
            [prev.x, prev.y + prev.h],
            [prev.x + prev.w, prev.y + prev.h],
            [curr.x + curr.w, curr.y],
            [curr.x, curr.y],
          ],
          style: {
            fill: style.fill || "#999",
            opacity: connectorOpacity,
          },
          datum: step.groups.get(key)?.pieces[0] ?? col.pieceData[0],
          category: key === "_default" ? col.name : key,
        }
        nodes.push(trapezoid)
      }
    }

    prevBars = currentBars
  }

  return nodes
}
