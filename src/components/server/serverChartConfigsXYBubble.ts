import type { Datum } from "../charts/shared/datumTypes"
import {
  createColorScale,
  DEFAULT_COLOR,
  getColor,
  getSize
} from "../charts/shared/colorUtils"
import { getMinMax } from "../charts/shared/minMax"
import {
  makeXYRuleContext,
  resolveStyleRules,
  type StyleRule
} from "../charts/shared/styleRules"
import { resolveTheme } from "./themeResolver"
import type { ChartConfig } from "./serverChartConfigShared"

export const bubbleChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "scatter",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    colorAccessor: colorBy,
    sizeAccessor: rest.sizeBy,
    sizeRange: rest.sizeRange || [5, 40],
    colorScheme,
    ...common,
    pointStyle:
      common.pointStyle ||
      buildBubblePointStyle(data, colorBy, colorScheme, common, rest),
    showLegend: common.showLegend ?? Boolean(colorBy)
  })
}

/** Mirror BubbleChart's HOC-level point encoding on the server path. */
export function buildBubblePointStyle(
  data: unknown,
  colorBy: string | ((d: Datum) => unknown) | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum
): (d: Datum) => Datum {
  const rows = Array.isArray(data)
    ? data.filter((d): d is Datum => !!d && typeof d === "object")
    : []
  const themeCategorical = resolveTheme(
    common.theme as Parameters<typeof resolveTheme>[0]
  ).colors.categorical
  const resolvedColorScheme =
    colorScheme ?? common.colorScheme ?? themeCategorical
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrBubbleColorBy"
  const colorRows =
    typeof colorBy === "function"
      ? rows.map((d) => ({ ...d, __ssrBubbleColorBy: colorBy(d) }))
      : rows
  const colorScale = colorBy
    ? createColorScale(
        colorRows,
        colorKey,
        resolvedColorScheme as string | string[] | Record<string, string>
      )
    : undefined
  const sizeBy = rest.sizeBy as string | ((d: Datum) => number) | undefined
  const sizeRange = Array.isArray(rest.sizeRange)
    ? (rest.sizeRange as [number, number])
    : ([5, 40] as [number, number])
  const sizeValues = sizeBy
    ? rows
        .map((d) =>
          typeof sizeBy === "function" ? sizeBy(d) : Number(d[sizeBy])
        )
        .filter(Number.isFinite)
    : []
  const sizeDomain = sizeValues.length ? getMinMax(sizeValues) : undefined
  const ruleContext = makeXYRuleContext(
    rest.xAccessor as string | ((d: Datum) => unknown) | undefined,
    rest.yAccessor as string | ((d: Datum) => unknown) | undefined
  )
  const rules = rest.styleRules as StyleRule[] | undefined

  return (d) => {
    const style: Datum = {
      fill:
        colorBy && colorScale
          ? getColor(
              d,
              colorBy as string | ((datum: Datum) => string),
              colorScale
            )
          : typeof rest.color === "string"
            ? rest.color
            : DEFAULT_COLOR,
      fillOpacity:
        typeof rest.bubbleOpacity === "number" ? rest.bubbleOpacity : 0.6,
      r: sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : sizeRange[0],
      stroke: rest.bubbleStrokeColor ?? "white",
      strokeWidth: rest.bubbleStrokeWidth ?? 1
    }
    if (rules?.length)
      Object.assign(style, resolveStyleRules(d, rules, ruleContext(d)))
    if (rest.stroke !== undefined) style.stroke = rest.stroke
    if (rest.strokeWidth !== undefined) style.strokeWidth = rest.strokeWidth
    if (rest.opacity !== undefined) style.opacity = rest.opacity
    return style
  }
}
