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
import { prepareLineSeriesForSsr } from "../charts/shared/lineSeriesSsr"
import type { AnomalyConfig, ForecastConfig } from "../charts/shared/statisticalOverlays"
import { mergeServerRegressionAnnotation, type ChartConfig } from "./serverChartConfigShared"
import { resolveTheme } from "./themeResolver"

/** Resolve Scatterplot/QuadrantChart's HOC-level point encoding for SSR. */
export function buildScatterPointStyle(
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
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrScatterColorBy"
  const colorRows =
    typeof colorBy === "function"
      ? rows.map((d) => ({ ...d, __ssrScatterColorBy: colorBy(d) }))
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
    : ([3, 15] as [number, number])
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
        typeof rest.pointOpacity === "number" ? rest.pointOpacity : 0.8,
      r: sizeBy
        ? getSize(d, sizeBy, sizeRange, sizeDomain)
        : typeof rest.pointRadius === "number"
          ? rest.pointRadius
          : 5
    }
    if (rules?.length)
      Object.assign(style, resolveStyleRules(d, rules, ruleContext(d)))
    if (rest.stroke !== undefined) style.stroke = rest.stroke
    if (rest.strokeWidth !== undefined) style.strokeWidth = rest.strokeWidth
    if (rest.opacity !== undefined) style.opacity = rest.opacity
    return style
  }
}

export const scatterplot: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const series = prepareLineSeriesForSsr({
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      forecast: rest.forecast as ForecastConfig | undefined,
      anomaly: rest.anomaly as AnomalyConfig | undefined,
      annotations: common.annotations as Datum[] | undefined,
      themeCategorical: resolveTheme(
        common.theme as Parameters<typeof resolveTheme>[0],
      ).colors.categorical,
    })
    const annotations = mergeServerRegressionAnnotation(
      series.annotations,
      rest.regression,
    )
    return {
      chartType: "scatter",
      data: series.data,
      xAccessor: series.xAccessor,
      yAccessor: series.yAccessor,
      colorAccessor: colorBy,
      sizeAccessor: rest.sizeBy,
      ...(rest.symbolBy && { symbolAccessor: rest.symbolBy }),
      ...(rest.symbolMap && { symbolMap: rest.symbolMap }),
      colorScheme,
      ...common,
      ...(annotations && annotations.length > 0 && { annotations }),
      ...(series.yExtent && !common.yExtent && { yExtent: series.yExtent }),
      sizeRange: rest.sizeRange || [3, 15],
      pointStyle:
        common.pointStyle ||
        buildScatterPointStyle(data, colorBy, colorScheme, common, rest),
      showLegend: common.showLegend ?? Boolean(colorBy),
    }
  },
}
