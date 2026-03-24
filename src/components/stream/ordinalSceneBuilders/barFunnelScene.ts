import { buildRectNode } from "../SceneGraph"
import type { OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

/**
 * Bar-funnel scene builder (vertical orientation).
 *
 * Renders funnel data as vertical bars — one per step on the x-axis.
 * Each bar is stacked: solid bottom = retained value, hatched top = dropoff
 * from the previous step. The first step has no dropoff (100% solid).
 *
 * Multi-category: bars are grouped side-by-side within each step,
 * each with its own retained + dropoff stack.
 *
 * The rScale (y-axis) is set by the pipeline based on the data's max value,
 * but we override it here to use the first-step max so all bars are
 * proportional to 100%.
 *
 * Metadata on each rect datum (used by barFunnelLabelRenderer):
 *  - __barFunnelValue: numeric value for this bar
 *  - __barFunnelPercent: percent of this category's first-step value
 *  - __barFunnelIsFirstStep: true for step index 0
 *  - __barFunnelIsDropoff: true for the dropoff portion (hatched)
 *  - __barFunnelStep: step name
 *  - __barFunnelDropoffValue: the dropoff amount
 *  - __barFunnelCategory: category key (for multi-category)
 *  - __barFunnelLabelX/Y: position for the floating label
 */
export function buildBarFunnelScene(
  ctx: OrdinalSceneContext,
  layout: OrdinalLayout
): OrdinalSceneNode[] {
  const { columns, getR, getO, getStack, resolvePieceStyle, scales } = ctx
  const nodes: OrdinalSceneNode[] = []

  // Get steps in ordinal domain order (left to right)
  const domain = scales.o.domain()
  const orderedColumns = domain.map((name) => columns[name]).filter(Boolean)
  if (orderedColumns.length === 0) return nodes

  // Discover category keys
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
  const hasCategories = categoryKeys.length > 1 && categoryKeys[0] !== "_default"

  // Compute per-step, per-category totals
  interface StepGroup {
    total: number
    pieces: Record<string, any>[]
  }
  interface StepData {
    col: (typeof orderedColumns)[0]
    groups: Map<string, StepGroup>
    stepTotal: number
  }
  const steps: StepData[] = []

  for (const col of orderedColumns) {
    const groups = new Map<string, StepGroup>()
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
  }

  // Per-category first-step totals (= 100%)
  const catFirstTotals = new Map<string, number>()
  for (const key of categoryKeys) {
    const firstGroup = steps[0]?.groups.get(key)
    catFirstTotals.set(key, firstGroup?.total ?? 0)
  }

  // Use the pipeline's rScale (vertical: domain [0, max] → range [height, 0])
  const rScale = scales.r

  const groupCount = hasCategories ? categoryKeys.length : 1
  const innerPadRatio = hasCategories ? 0.15 : 0

  for (let si = 0; si < steps.length; si++) {
    const step = steps[si]
    const col = step.col
    const isFirstStep = si === 0
    const prevStep = si > 0 ? steps[si - 1] : null

    const subWidth = col.width / groupCount
    const innerPad = subWidth * innerPadRatio
    const barWidth = subWidth - innerPad

    for (let ci = 0; ci < categoryKeys.length; ci++) {
      const catKey = categoryKeys[ci]
      const group = step.groups.get(catKey)
      if (!group) continue

      const val = group.total
      const catFirstTotal = catFirstTotals.get(catKey) ?? val
      const pct = catFirstTotal > 0 ? (val / catFirstTotal) * 100 : 0

      // Dropoff = previous step's value for this category minus this step's value
      const prevGroup = prevStep?.groups.get(catKey)
      const prevVal = prevGroup?.total ?? val
      const dropoff = isFirstStep ? 0 : Math.max(0, prevVal - val)

      // Bar x position (grouped within step band)
      const barX = col.x + ci * subWidth + innerPad / 2

      // Retained bar (solid): from baseline to value
      const retainedTop = rScale(val)
      const retainedBottom = rScale(0)
      const retainedH = retainedBottom - retainedTop

      const retainedStyle = resolvePieceStyle(
        group.pieces[0],
        hasCategories ? catKey : col.name
      )

      const retainedDatum: Record<string, any> = {
        ...group.pieces[0],
        __barFunnelValue: val,
        __barFunnelPercent: pct,
        __barFunnelIsFirstStep: isFirstStep,
        __barFunnelIsDropoff: false,
        __barFunnelStep: col.name,
        __barFunnelDropoffValue: dropoff,
        __barFunnelCategory: catKey === "_default" ? undefined : catKey,
        category: hasCategories ? catKey : col.name,
        // Label position: centered above the total bar (retained + dropoff)
        __barFunnelLabelX: barX + barWidth / 2,
        __barFunnelLabelY: rScale(val + dropoff),
      }

      nodes.push(
        buildRectNode(
          barX,
          retainedTop,
          barWidth,
          retainedH,
          retainedStyle,
          retainedDatum,
          hasCategories ? catKey : col.name
        )
      )

      // Dropoff bar (hatched): stacked on top of retained
      if (dropoff > 0) {
        const dropoffTop = rScale(val + dropoff)
        const dropoffH = retainedTop - dropoffTop

        // Use same fill color but mark for hatching — the renderer will
        // apply the hatch pattern based on __barFunnelIsDropoff
        const dropoffStyle = {
          ...retainedStyle,
          __isDropoff: true,
        }

        const dropoffDatum: Record<string, any> = {
          ...group.pieces[0],
          __barFunnelValue: dropoff,
          __barFunnelPercent: catFirstTotal > 0 ? (dropoff / catFirstTotal) * 100 : 0,
          __barFunnelIsFirstStep: false,
          __barFunnelIsDropoff: true,
          __barFunnelStep: col.name,
          __barFunnelCategory: catKey === "_default" ? undefined : catKey,
          category: hasCategories ? catKey : col.name,
        }

        nodes.push(
          buildRectNode(
            barX,
            dropoffTop,
            barWidth,
            dropoffH,
            dropoffStyle,
            dropoffDatum,
            hasCategories ? catKey : col.name
          )
        )
      }
    }
  }

  return nodes
}
