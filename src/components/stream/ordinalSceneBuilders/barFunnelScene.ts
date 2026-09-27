import { buildRectNode } from "../SceneGraph"
import { aggregateOrdinalColumns } from "../ordinalAggregation"
import type { OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"
import type { Datum } from "../../charts/shared/datumTypes"

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
 * The rScale (y-axis) is set by the pipeline based on the data's max value.
 * Bars are sized proportionally via scales.r so the first step fills the
 * available height and subsequent steps shrink relative to it.
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
  _layout: OrdinalLayout
): OrdinalSceneNode[] {
  const { columns, getR, getStack, resolvePieceStyle, scales } = ctx
  const nodes: OrdinalSceneNode[] = []

  // Get steps in ordinal domain order (left to right)
  const domain = scales.o.domain()
  const orderedColumns = domain.map((name) => columns[name]).filter(Boolean)
  if (orderedColumns.length === 0) return nodes

  const { steps, keys: categoryKeys } = aggregateOrdinalColumns(orderedColumns, getR, getStack)
  const hasCategories = categoryKeys.length > 1 && categoryKeys[0] !== "_default"

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
      const catFirstTotal = steps[0].groups.get(catKey)?.total ?? 0
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

      const retainedDatum: Datum = {
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
          Math.min(retainedTop, retainedBottom),
          barWidth,
          Math.abs(retainedH),
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
        const dropoffStyle = { ...retainedStyle }

        const dropoffDatum: Datum = {
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
