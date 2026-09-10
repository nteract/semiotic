import type { Datum } from "../shared/datumTypes"
import {
  composeStyleRules,
  type StyleRule,
  type StyleRuleContext
} from "../shared/styleRules"

/** Which series is on top (area) or which overlay line this vertex belongs to. */
export function differenceWinner(d: Datum): "A" | "B" {
  if (d.__diffWinner === "A" || d.__diffWinner === "B") return d.__diffWinner
  const key = String(d.__diffSegment ?? "")
  return key === "line-A" || key.endsWith("-A") ? "A" : "B"
}

/**
 * Rule context for synthesized difference rows. `axis: "x"|"y"` reads the
 * plotted `__x`/`__y`; `field` thresholds see the original source row when
 * `__sourceDatum` is present.
 */
export function makeDifferenceRuleContext(): (d: Datum) => StyleRuleContext {
  return (d) => {
    const x = Number(d.__x)
    const y = Number(d.__y)
    return {
      value: Number.isFinite(y) ? y : undefined,
      x: Number.isFinite(x) ? x : undefined,
      y: Number.isFinite(y) ? y : undefined,
      category: differenceWinner(d)
    }
  }
}

function withDifferenceRules(
  base: (d: Datum) => Datum,
  styleRules: ReadonlyArray<StyleRule> | undefined
): (d: Datum) => Datum {
  return composeStyleRules(
    base,
    styleRules,
    makeDifferenceRuleContext(),
    (d) => (d.__sourceDatum ? { ...(d.__sourceDatum as Datum), ...d } : d)
  )
}

export function buildDifferenceAreaStyle(options: {
  seriesAColor: string
  seriesBColor: string
  areaOpacity: number
  styleRules?: ReadonlyArray<StyleRule>
}): (d: Datum) => Datum {
  const { seriesAColor, seriesBColor, areaOpacity, styleRules } = options
  return withDifferenceRules((d) => {
    const winner = differenceWinner(d)
    return {
      fill: winner === "A" ? seriesAColor : seriesBColor,
      stroke: "none",
      fillOpacity: areaOpacity
    }
  }, styleRules)
}

export function buildDifferenceLineStyle(options: {
  seriesAColor: string
  seriesBColor: string
  lineWidth: number
  styleRules?: ReadonlyArray<StyleRule>
}): (d: Datum) => Datum {
  const { seriesAColor, seriesBColor, lineWidth, styleRules } = options
  return withDifferenceRules((d) => {
    const winner = differenceWinner(d)
    return {
      stroke: winner === "A" ? seriesAColor : seriesBColor,
      strokeWidth: lineWidth,
      fill: "none"
    }
  }, styleRules)
}

export function buildDifferencePointStyle(options: {
  seriesAColor: string
  seriesBColor: string
  pointRadius: number
  styleRules?: ReadonlyArray<StyleRule>
}): (d: Datum) => Datum {
  const { seriesAColor, seriesBColor, pointRadius, styleRules } = options
  return withDifferenceRules((d) => {
    const winner = differenceWinner(d)
    return {
      fill: winner === "A" ? seriesAColor : seriesBColor,
      r: pointRadius
    }
  }, styleRules)
}
