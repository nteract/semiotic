import type { CategoricalLegendConfig } from "../../types/legendTypes"
import type { Datum } from "../shared/datumTypes"
import {
  composeStyleRules,
  type StyleRule,
  type StyleRuleContext
} from "../shared/styleRules"

/** Which series is on top (area) or which overlay line this vertex belongs to. */
export function differenceWinner(d: Datum): "A" | "B" {
  const winner = d.__diffWinner
  if (winner === "A" || winner === "B") return winner
  return String(d.__diffSegment).endsWith("-A") ? "A" : "B"
}

/**
 * Rule context for synthesized difference rows. `axis: "x"|"y"` reads the
 * plotted `__x`/`__y`; `field` thresholds see the original source row when
 * `__sourceDatum` is present.
 */
function finiteCoordinate(value: unknown) {
  const coordinate = Number(value)
  return Number.isFinite(coordinate) ? coordinate : undefined
}

function differenceRuleContext(d: Datum): StyleRuleContext {
  const y = finiteCoordinate(d.__y)
  return { value: y, x: finiteCoordinate(d.__x), y, category: differenceWinner(d) }
}

interface DifferenceColors {
  seriesAColor: string
  seriesBColor: string
  styleRules?: ReadonlyArray<StyleRule>
}

export function buildDifferenceLegend(
  seriesALabel: string, seriesAColor: string, seriesBLabel: string, seriesBColor: string
): CategoricalLegendConfig {
  return {
    legendGroups: [{
      label: "", type: "fill", styleFn: item => ({ fill: item.color || "currentColor" }),
      items: [{ label: seriesALabel, color: seriesAColor }, { label: seriesBLabel, color: seriesBColor }]
    }]
  }
}

export function buildDifferenceStyles(options: DifferenceColors & {
  areaOpacity: number
  lineWidth: number
  pointRadius: number
}) {
  const styleForWinner = (style: (color: string) => Datum) => composeStyleRules(
    datum => style(differenceWinner(datum) === "A" ? options.seriesAColor : options.seriesBColor),
    options.styleRules,
    differenceRuleContext,
    datum => datum.__sourceDatum ? { ...datum.__sourceDatum, ...datum } : datum
  )
  return [
    styleForWinner(fill => ({ fill, stroke: "none", fillOpacity: options.areaOpacity })),
    styleForWinner(stroke => ({ stroke, strokeWidth: options.lineWidth, fill: "none" })),
    styleForWinner(fill => ({ fill, r: options.pointRadius }))
  ] as const
}
