import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import { prepareAreaSeriesData } from "../charts/shared/areaSeriesData"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { createColorScale, DEFAULT_COLOR, getColor, getSize } from "../charts/shared/colorUtils"
import { getMinMax } from "../charts/shared/minMax"
import { mergeShapeStyle } from "../charts/shared/mergeShapeStyle"
import { makeRuleValueResolver, makeXYRuleContext, resolveStyleRules, styleRulesToXYStyle, type StyleRule } from "../charts/shared/styleRules"
import { buildXYLineBaseStyle } from "../charts/shared/xyLineStyle"
import { computeDifferenceSegments } from "../charts/xy/differenceSegments"
import { semanticGradientToColorStops } from "../charts/xy/AreaChart"
import type { SemanticGradientStop } from "../charts/xy/AreaChart"
import {
  type ChartConfig,
  accessorValue,
  numericValue,
  prepareConnectedScatterplotData,
  viridisColor,
} from "./serverChartConfigShared"
import { resolveTheme } from "./themeResolver"
import { resolveDownwardHistogramExtent } from "../charts/realtime/temporalHistogramConfig"
import { prepareLineSeriesForSsr } from "../charts/shared/lineSeriesSsr"
import type { AnomalyConfig, ForecastConfig } from "../charts/shared/statisticalOverlays"

// ── XY Charts ──────────────────────────────────────────────────────────

/** Mirror LineChart's shared pure data-to-style contract on the server path. */
function buildLineStyle(
  data: unknown,
  colorBy: string | ((d: Datum) => unknown) | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): (d: Datum, group?: string) => Datum {
  const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
  const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
  const resolvedColorScheme = colorScheme ?? common.colorScheme ?? themeCategorical
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrLineColorBy"
  const colorRows = typeof colorBy === "function"
    ? rows.map(d => ({ ...d, __ssrLineColorBy: colorBy(d) }))
    : rows
  const colorScale = colorBy
    ? createColorScale(colorRows, colorKey, resolvedColorScheme as string | string[] | Record<string, string>)
    : undefined
  const ruleContext = makeXYRuleContext(
    rest.xAccessor as string | ((d: Datum) => unknown) | undefined,
    rest.yAccessor as string | ((d: Datum) => unknown) | undefined,
  )
  const base = buildXYLineBaseStyle({
    lineWidth: typeof rest.lineWidth === "number" ? rest.lineWidth : 2,
    colorBy: colorBy as string | ((d: Datum) => string) | undefined,
    colorScale,
    color: typeof rest.color === "string" ? rest.color : undefined,
    fillArea: rest.fillArea as boolean | string[] | undefined,
    areaOpacity: typeof rest.areaOpacity === "number" ? rest.areaOpacity : 0.3,
    styleRules: rest.styleRules as StyleRule[] | undefined,
    ruleContext,
  })
  return mergeShapeStyle(base, {
    stroke: typeof rest.stroke === "string" ? rest.stroke : undefined,
    strokeWidth: typeof rest.strokeWidth === "number" ? rest.strokeWidth : undefined,
    opacity: typeof rest.opacity === "number" ? rest.opacity : undefined,
  })
}

/** Mirror AreaChart's HOC-level fill/top-line style on the server path. */
function buildAreaLineStyle(
  data: unknown,
  colorBy: string | ((d: Datum) => unknown) | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): (d: Datum, group?: string) => Datum {
  const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
  const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
  const resolvedColorScheme = colorScheme ?? common.colorScheme ?? themeCategorical
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrAreaColorBy"
  const colorRows = typeof colorBy === "function"
    ? rows.map(d => ({ ...d, __ssrAreaColorBy: colorBy(d) }))
    : rows
  const colorScale = colorBy
    ? createColorScale(colorRows, colorKey, resolvedColorScheme as string | string[] | Record<string, string>)
    : undefined
  const showLine = rest.showLine !== false
  const lineWidth = typeof rest.lineWidth === "number" ? rest.lineWidth : 2
  const areaOpacity = typeof rest.areaOpacity === "number" ? rest.areaOpacity : 0.7
  const resolveValue = makeRuleValueResolver(rest.yAccessor as string | ((d: Datum) => unknown) | undefined)
  const rules = rest.styleRules as StyleRule[] | undefined

  return (d, group) => {
    const color = colorBy && colorScale
      ? getColor(d, colorBy as string | ((datum: Datum) => string), colorScale)
      : typeof rest.color === "string" ? rest.color : DEFAULT_COLOR
    const style: Datum = {
      fill: color,
      fillOpacity: areaOpacity,
      stroke: showLine ? color : "none",
      ...(showLine && { strokeWidth: lineWidth }),
    }
    if (rules?.length) {
      Object.assign(style, resolveStyleRules(d, rules, { value: resolveValue(d), category: group }))
    }
    if (rest.stroke !== undefined) style.stroke = rest.stroke
    if (rest.strokeWidth !== undefined) style.strokeWidth = rest.strokeWidth
    if (rest.opacity !== undefined) style.opacity = rest.opacity
    return style
  }
}

function buildBubblePointStyle(
  data: unknown,
  colorBy: string | ((d: Datum) => unknown) | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): (d: Datum) => Datum {
  const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
  const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
  const resolvedColorScheme = colorScheme ?? common.colorScheme ?? themeCategorical
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrBubbleColorBy"
  const colorRows = typeof colorBy === "function"
    ? rows.map(d => ({ ...d, __ssrBubbleColorBy: colorBy(d) }))
    : rows
  const colorScale = colorBy
    ? createColorScale(colorRows, colorKey, resolvedColorScheme as string | string[] | Record<string, string>)
    : undefined
  const sizeBy = rest.sizeBy as string | ((d: Datum) => number) | undefined
  const sizeRange = Array.isArray(rest.sizeRange) ? rest.sizeRange as [number, number] : [5, 40] as [number, number]
  const sizeValues = sizeBy
    ? rows.map(d => typeof sizeBy === "function" ? sizeBy(d) : Number(d[sizeBy])).filter(Number.isFinite)
    : []
  const sizeDomain = sizeValues.length ? getMinMax(sizeValues) : undefined

  return (d) => ({
    fill: colorBy && colorScale
      ? getColor(d, colorBy as string | ((datum: Datum) => string), colorScale)
      : typeof rest.color === "string" ? rest.color : DEFAULT_COLOR,
    fillOpacity: typeof rest.bubbleOpacity === "number" ? rest.bubbleOpacity : 0.6,
    r: sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : sizeRange[0],
    stroke: rest.stroke ?? rest.bubbleStrokeColor ?? "white",
    strokeWidth: rest.strokeWidth ?? rest.bubbleStrokeWidth ?? 1,
    ...(rest.opacity !== undefined && { opacity: rest.opacity }),
  })
}

/** Resolve Scatterplot/QuadrantChart's HOC-level point encoding for SSR. */
function buildScatterPointStyle(
  data: unknown,
  colorBy: string | ((d: Datum) => unknown) | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): (d: Datum) => Datum {
  const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
  const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
  const resolvedColorScheme = colorScheme ?? common.colorScheme ?? themeCategorical
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrScatterColorBy"
  const colorRows = typeof colorBy === "function"
    ? rows.map(d => ({ ...d, __ssrScatterColorBy: colorBy(d) }))
    : rows
  const colorScale = colorBy
    ? createColorScale(colorRows, colorKey, resolvedColorScheme as string | string[] | Record<string, string>)
    : undefined
  const sizeBy = rest.sizeBy as string | ((d: Datum) => number) | undefined
  const sizeRange = Array.isArray(rest.sizeRange) ? rest.sizeRange as [number, number] : [3, 15] as [number, number]
  const sizeValues = sizeBy
    ? rows.map(d => typeof sizeBy === "function" ? sizeBy(d) : Number(d[sizeBy])).filter(Number.isFinite)
    : []
  const sizeDomain = sizeValues.length ? getMinMax(sizeValues) : undefined
  const ruleContext = makeXYRuleContext(
    rest.xAccessor as string | ((d: Datum) => unknown) | undefined,
    rest.yAccessor as string | ((d: Datum) => unknown) | undefined,
  )
  const rules = rest.styleRules as StyleRule[] | undefined

  return (d) => {
    const style: Datum = {
      fill: colorBy && colorScale
        ? getColor(d, colorBy as string | ((datum: Datum) => string), colorScale)
        : typeof rest.color === "string" ? rest.color : DEFAULT_COLOR,
      fillOpacity: typeof rest.pointOpacity === "number" ? rest.pointOpacity : 0.8,
      r: sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : (typeof rest.pointRadius === "number" ? rest.pointRadius : 5),
    }
    if (rules?.length) Object.assign(style, resolveStyleRules(d, rules, ruleContext(d)))
    if (rest.stroke !== undefined) style.stroke = rest.stroke
    if (rest.strokeWidth !== undefined) style.strokeWidth = rest.strokeWidth
    if (rest.opacity !== undefined) style.opacity = rest.opacity
    return style
  }
}

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
    pointStyle: common.pointStyle || buildBubblePointStyle(data, colorBy, colorScheme, common, rest),
    showLegend: common.showLegend ?? Boolean(colorBy),
  }),
}

export const sparkline: ChartConfig = {
  frameType: "xy",
  layout: { mode: "sparkline" },
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "line",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    groupAccessor: rest.lineBy || colorBy,
    colorAccessor: colorBy,
    ...common,
    // Sparkline-specific overrides — always applied regardless of frameProps
    showAxes: false,
    margin: common.margin,
    showLegend: false,
    showGrid: false,
    title: undefined,
  }),
}

/** Build pointStyle when showPoints is true (mirrors LineChart/AreaChart HOC). */
function buildShowPointsStyle(
  data: unknown,
  colorBy: string | ((d: Datum) => unknown) | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): ((d: Datum) => Datum) | undefined {
  if (!rest.showPoints) return undefined
  const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
  const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
  const resolvedColorScheme = colorScheme ?? common.colorScheme ?? themeCategorical
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrPointColorBy"
  const colorRows = typeof colorBy === "function"
    ? rows.map(d => ({ ...d, __ssrPointColorBy: colorBy(d) }))
    : rows
  const colorScale = colorBy
    ? createColorScale(colorRows, colorKey, resolvedColorScheme as string | string[] | Record<string, string>)
    : undefined
  const r = typeof rest.pointRadius === "number" ? rest.pointRadius : 3
  return (d: Datum) => {
    const color = colorBy && colorScale
      ? getColor(d, colorBy as string | ((datum: Datum) => string), colorScale)
      : typeof rest.color === "string" ? rest.color : DEFAULT_COLOR
    return { r, fill: color, stroke: "none" }
  }
}

export const lineChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const effectiveColorBy = colorBy || rest.lineBy
    // Mirror LineChart.tsx: `fillArea` selects the frame chartType and, in the
    // array form, names which groups fill (mixed line+area — how ComposedChart
    // draws an area series alongside a line series). Without this the SSR path
    // rendered every series as a bare line, dropping the area fill + its
    // gradient entirely (same class of bug as gradientFill/valueExtent).
    const fillArea = rest.fillArea as boolean | string[] | undefined
    const chartType = Array.isArray(fillArea) ? "mixed" : fillArea ? "area" : "line"
    const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
    const baseLineStyle = buildLineStyle(data, effectiveColorBy, colorScheme, common, rest)

    // forecast / anomaly / gapStrategy / directLabel — pure prep shared with
    // the client HOC's useSeriesFeatures + gap/direct-label paths.
    const series = prepareLineSeriesForSsr({
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      lineBy: rest.lineBy as string | ((d: Datum) => unknown) | undefined,
      colorBy: effectiveColorBy as string | ((d: Datum) => unknown) | undefined,
      colorScheme,
      color: typeof rest.color === "string" ? rest.color : undefined,
      forecast: rest.forecast as ForecastConfig | undefined,
      anomaly: rest.anomaly as AnomalyConfig | undefined,
      gapStrategy: rest.gapStrategy as "break" | "interpolate" | "zero" | undefined,
      directLabel: rest.directLabel as boolean | { position?: "start" | "end"; fontSize?: number } | undefined,
      annotations: common.annotations as Datum[] | undefined,
      themeCategorical,
      baseLineStyle,
    })

    const pointStyle = common.pointStyle || buildShowPointsStyle(
      series.data,
      series.colorAccessor,
      colorScheme,
      common,
      rest,
    )

    // Direct-label margin expansion (right/left).
    let margin = common.margin as { top?: number; right?: number; bottom?: number; left?: number } | number | undefined
    if (series.marginExtra && margin && typeof margin === "object") {
      margin = {
        ...margin,
        ...(series.marginExtra.right != null && {
          right: Math.max(Number(margin.right) || 0, series.marginExtra.right),
        }),
        ...(series.marginExtra.left != null && {
          left: Math.max(Number(margin.left) || 0, series.marginExtra.left),
        }),
      }
    } else if (series.marginExtra && margin == null) {
      margin = {
        top: 20,
        right: series.marginExtra.right ?? 20,
        bottom: 30,
        left: series.marginExtra.left ?? 40,
      }
    }

    // Suppress legend when directLabel is on (matches HOC) unless caller set showLegend.
    const showLegend = rest.directLabel && common.showLegend === undefined
      ? false
      : (common.showLegend ?? Boolean(series.colorAccessor))

    return {
      chartType,
      data: series.data,
      xAccessor: series.xAccessor,
      yAccessor: series.yAccessor,
      groupAccessor: series.groupAccessor,
      colorAccessor: series.colorAccessor,
      colorScheme,
      lineStyle: series.lineStyle || baseLineStyle,
      ...(Array.isArray(fillArea) && { areaGroups: fillArea }),
      ...(fillArea && rest.areaOpacity != null && { areaOpacity: rest.areaOpacity }),
      // `band` ({y0Accessor,y1Accessor} or array) draws the shaded envelope
      // under the line(s). Mirrors LineChart.tsx; SSR dropped it so the band
      // never painted server-side.
      ...(rest.band != null && { band: rest.band }),
      ...common,
      ...(margin !== undefined && { margin }),
      annotations: series.annotations,
      ...(series.yExtent && !common.yExtent && { yExtent: series.yExtent }),
      ...(pointStyle && { pointStyle }),
      showLegend,
    }
  },
}

/** Static-data TemporalHistogram mapped onto the shared time-binned XY pipeline. */
export const temporalHistogram: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const rows = Array.isArray(data) ? filterSparseArray(data) : []
    const timeAccessor = rest.timeAccessor || "time"
    const valueAccessor = rest.valueAccessor || "value"
    const categoryAccessor = rest.categoryAccessor
    const valueExtent = rest.valueExtent || common.yExtent
    const resolvedValueExtent = rest.direction === "down"
      ? resolveDownwardHistogramExtent({
          data: rows,
          timeAccessor,
          valueAccessor,
          binSize: Number(rest.binSize),
          valueExtent,
          extentPadding: rest.extentPadding,
        })
      : valueExtent
    const barStyle = {
      ...(rest.fill !== undefined && { fill: rest.fill }),
      ...(rest.stroke !== undefined && { stroke: rest.stroke }),
      ...(rest.strokeWidth !== undefined && { strokeWidth: rest.strokeWidth }),
      ...(rest.opacity !== undefined && { opacity: rest.opacity }),
      ...(rest.gap !== undefined && { gap: rest.gap }),
    }
    return {
      chartType: "bar",
      data: rows,
      ...common,
      runtimeMode: "streaming",
      windowMode: "growing",
      windowSize: Math.max(1, rows.length),
      arrowOfTime: rest.arrowOfTime || "right",
      timeAccessor,
      valueAccessor,
      xExtent: rest.timeExtent || common.xExtent,
      yExtent: resolvedValueExtent,
      extentPadding: rest.extentPadding ?? common.extentPadding,
      binSize: rest.binSize,
      categoryAccessor,
      barColors: rest.colors || common.barColors,
      colorScheme: rest.colors || common.colorScheme,
      barStyle: common.barStyle || barStyle,
      showLegend: common.showLegend ?? Boolean(categoryAccessor),
    }
  },
}

export const areaChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const effectiveColorBy = colorBy || rest.areaBy
    const safeData = Array.isArray(data) ? filterSparseArray(data) : []
    const preparedData = prepareAreaSeriesData({
      data,
      safeData,
      areaBy: rest.areaBy,
      lineDataAccessor: rest.lineDataAccessor || "coordinates",
    })
    // Mirror AreaChart.tsx: a value-anchored `semanticGradient` resolves to a
    // `gradientFill.colorStops` before reaching the frame. Without this the SSR
    // path dropped it and painted a flat area (same class as gradientFill).
    const semanticGradient = rest.semanticGradient as SemanticGradientStop[] | undefined
    const resolvedGradientFill = semanticGradient && semanticGradient.length > 0
      ? { colorStops: semanticGradientToColorStops(semanticGradient) }
      : common.gradientFill
    const pointStyle = common.pointStyle || buildShowPointsStyle(preparedData, effectiveColorBy, colorScheme, common, rest)
    return {
      chartType: "area",
      data: preparedData,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      y0Accessor: rest.y0Accessor,
      groupAccessor: rest.areaBy || undefined,
      colorAccessor: effectiveColorBy,
      colorScheme,
      ...common,
      ...(resolvedGradientFill !== undefined && { gradientFill: resolvedGradientFill }),
      // `frameProps.lineStyle` is the public escape hatch and wins exactly
      // as it does in AreaChart; otherwise resolve the HOC defaults here.
      lineStyle: common.lineStyle || buildAreaLineStyle(preparedData, effectiveColorBy, colorScheme, common, rest),
      ...(pointStyle && { pointStyle }),
    }
  },
}

export const differenceChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    // Mirror the client HOC: compute crossover-segmented area data plus
    // parallel overlay lines, then hand off to the mixed-frame path so
    // the same SVG converters paint server-side as canvas paints client-side.
    const xKey = rest.xAccessor || "x"
    const aKey = rest.seriesAAccessor || "a"
    const bKey = rest.seriesBAccessor || "b"
    const getX = (d: Datum) => numericValue(accessorValue(xKey, "x", d))
    const getA = (d: Datum) => numericValue(accessorValue(aKey, "a", d))
    const getB = (d: Datum) => numericValue(accessorValue(bKey, "b", d))
    const seriesAColor = rest.seriesAColor || "var(--semiotic-danger, #dc2626)"
    const seriesBColor = rest.seriesBColor || "var(--semiotic-info, #2563eb)"
    const areaOpacity = rest.areaOpacity ?? 0.6
    const lineWidth = rest.lineWidth ?? 1.5
    const showLines = rest.showLines !== false
    const showLegend = common.showLegend !== false
    const seriesALabel = rest.seriesALabel || "A"
    const seriesBLabel = rest.seriesBLabel || "B"
    const legendPosition = common.legendPosition || "right"

    const segmented = computeDifferenceSegments(Array.isArray(data) ? data : [], getX, getA, getB)
    const overlay: Datum[] = []
    if (showLines && Array.isArray(data)) {
      // Filter non-finite x BEFORE sorting. `Array.sort`'s comparator
      // returns NaN for NaN-NaN, which V8 treats like 0 (equal), so
      // surrounding finite-x rows can land out of order. The downstream
      // emission already skips non-finite-x rows; doing it first keeps
      // the sort total-ordered.
      const finite = data.filter(d => Number.isFinite(getX(d)))
      const sorted = finite.sort((p, q) => getX(p) - getX(q))
      for (const d of sorted) {
        const x = getX(d), a = getA(d), b = getB(d)
        if (Number.isFinite(a)) overlay.push({ __x: x, __y: a, __diffSegment: "line-A" })
        if (Number.isFinite(b)) overlay.push({ __x: x, __y: b, __diffSegment: "line-B" })
      }
    }
    const combined = [...segmented, ...overlay] as Datum[]
    const areaGroups = Array.from(new Set(segmented.map(r => r.__diffSegment)))

    return {
      chartType: "mixed",
      data: combined,
      xAccessor: "__x",
      yAccessor: "__y",
      y0Accessor: "__y0",
      groupAccessor: "__diffSegment",
      areaGroups,
      areaStyle: (d: Datum) => {
        const key = d.__diffSegment as string
        const winner = key?.endsWith("-A") ? "A" : "B"
        return {
          fill: winner === "A" ? seriesAColor : seriesBColor,
          stroke: "none",
          fillOpacity: areaOpacity,
        }
      },
      lineStyle: (d: Datum) => {
        const key = d.__diffSegment as string
        const winner = key === "line-A" ? "A" : "B"
        return {
          stroke: winner === "A" ? seriesAColor : seriesBColor,
          strokeWidth: lineWidth,
          fill: "none",
        }
      },
      curve: rest.curve || "linear",
      ...common,
      ...(showLegend && {
        legend: {
          legendGroups: [{
            label: "",
            type: "fill" as const,
            styleFn: (item: { color?: string }) => ({ fill: item.color || "currentColor" }),
            items: [
              { label: seriesALabel, color: seriesAColor },
              { label: seriesBLabel, color: seriesBColor },
            ],
          }],
        },
        legendPosition,
      }),
    }
  },
}

export const stackedAreaChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const colorAccessor = colorBy || rest.areaBy
    const colorScale =
      typeof colorAccessor === "string" && Array.isArray(data)
        ? createColorScale(data, colorAccessor, colorScheme)
        : undefined
    const areaOpacity = typeof rest.areaOpacity === "number" ? rest.areaOpacity : 0.7
    // Always build a base lineStyle so styleRules/color/opacity apply even
    // when areaOpacity is left at the HOC default (previously only when
    // rest.areaOpacity was set, styleRules no-op'd on SSR).
    const lineStyle = common.lineStyle || ((d: Datum) => {
      const color =
        colorAccessor == null ? undefined : getColor(d, colorAccessor, colorScale)
      const showLine = rest.showLine ?? true
      const stroke = rest.stroke ?? color
      const strokeWidth = rest.strokeWidth ?? rest.lineWidth ?? 2
      const style: Datum = {
        fill: rest.color ?? color,
        stroke: showLine ? stroke : "none",
        ...(showLine ? { strokeWidth } : {}),
        fillOpacity: areaOpacity,
        ...(rest.opacity == null ? {} : { opacity: rest.opacity }),
      }
      const rules = rest.styleRules as StyleRule[] | undefined
      if (rules?.length) {
        const resolveValue = makeRuleValueResolver(rest.yAccessor as string | ((d: Datum) => unknown) | undefined)
        const group = colorAccessor
          ? (typeof colorAccessor === "function"
              ? String(colorAccessor(d) ?? "")
              : String(d[colorAccessor as string] ?? ""))
          : undefined
        Object.assign(style, resolveStyleRules(d, rules, { value: resolveValue(d), category: group }))
      }
      return style
    })
    // Mirror StackedAreaChart HOC: normalize forces zero baseline.
    const baseline = rest.normalize ? "zero" : (rest.baseline ?? "zero")
    const pointStyle = common.pointStyle || buildShowPointsStyle(data, colorAccessor as string | ((d: Datum) => unknown) | undefined, colorScheme, common, rest)

    return {
      chartType: "stackedarea",
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      groupAccessor: rest.areaBy,
      colorAccessor,
      colorScheme,
      normalize: rest.normalize,
      baseline,
      stackOrder: rest.stackOrder,
      lineStyle,
      ...common,
      ...(pointStyle && { pointStyle }),
      // StackedAreaChart's visual default is smooth; the static scene
      // serializer otherwise falls through to its linear path generator.
      curve: common.curve ?? rest.curve ?? "monotoneX",
      showLegend: common.showLegend ?? Boolean(colorAccessor),
    }
  },
}

export const candlestickChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const [width] = (common.size as [number, number]) ?? [600, 400]
    return {
      chartType: "candlestick",
      data,
      xAccessor: rest.xAccessor || "x",
      // yAccessor drives the scale extent; the scene builder reads high/low/
      // open/close directly. High is the natural upper bound for the axis.
      yAccessor: rest.highAccessor || "high",
      highAccessor: rest.highAccessor || "high",
      lowAccessor: rest.lowAccessor || "low",
      // Open/close are optional — PipelineStore detects range mode when both
      // are absent, so don't synthesize defaults here.
      openAccessor: rest.openAccessor,
      closeAccessor: rest.closeAccessor,
      candlestickStyle: rest.candlestickStyle,
      ...common,
      // CandlestickChart deliberately insets the x scale so bodies don't
      // touch the chart edges. This HOC-level calculation was absent from
      // renderChart(), making SSR candles visibly wider/outset than CSR.
      scalePadding: common.scalePadding ?? Math.max(2, Math.min(12, Math.round(width / 40))),
      extentPadding: common.extentPadding ?? (width <= 200 ? 0.02 : 0.1),
    }
  },
}

export const scatterplot: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const basePointStyle = common.pointStyle || buildScatterPointStyle(data, colorBy, colorScheme, common, rest)
    const ruleStyle = styleRulesToXYStyle(rest.styleRules, rest.xAccessor || "x", rest.yAccessor || "y")
    const pointStyle = ruleStyle
      ? (d: Datum) => ({
          ...(typeof basePointStyle === "function" ? basePointStyle(d) : basePointStyle),
          ...ruleStyle(d),
        })
      : basePointStyle
    return {
    chartType: "scatter",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    colorAccessor: colorBy,
    sizeAccessor: rest.sizeBy,
    // symbolBy → symbolAccessor is the HOC-level rename (mirrors Scatterplot.tsx):
    // the categorical field whose values become d3-shape glyphs. Without this
    // the SSR path drops symbolBy and every mark renders as a circle.
    ...(rest.symbolBy && { symbolAccessor: rest.symbolBy }),
    ...(rest.symbolMap && { symbolMap: rest.symbolMap }),
    colorScheme,
    ...common,
    sizeRange: rest.sizeRange || [3, 15],
    pointStyle,
    showLegend: common.showLegend ?? Boolean(colorBy),
    }
  },
}

export const quadrantChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    // Build the four quadrant rects + centerlines + corner labels as
    // an svgPreRenderer closure so it gets painted UNDER the scatter
    // marks, matching the client HOC's z-order. The closure receives
    // the scene, scales, and layout at render time, so it can
    // translate data-space xCenter/yCenter into pixel coordinates the
    // same way the client does.
    const xCenter = rest.xCenter
    const yCenter = rest.yCenter
    const quadrants = rest.quadrants
    const centerlineStyle = rest.centerlineStyle || {}
    const showLabels = rest.showQuadrantLabels !== false
    const labelSize = rest.quadrantLabelSize ?? 12

    const stroke = centerlineStyle.stroke || "#999"
    const strokeWidth = centerlineStyle.strokeWidth ?? 1
    const dashArray = Array.isArray(centerlineStyle.strokeDasharray)
      ? centerlineStyle.strokeDasharray.join(",")
      : centerlineStyle.strokeDasharray
    const padding = 8

    const h_ = React.createElement
    const svgPreRenderers = quadrants ? [
      (_nodes: unknown, scales: { x: (v: number) => number; y: (v: number) => number } | null, layout: { width: number; height: number }) => {
        if (!scales?.x || !scales?.y) return null
        const w = layout.width, h = layout.height
        const rawCx = xCenter != null ? scales.x(xCenter) : w / 2
        const rawCy = yCenter != null ? scales.y(yCenter) : h / 2
        if (xCenter != null && !Number.isFinite(rawCx)) return null
        if (yCenter != null && !Number.isFinite(rawCy)) return null
        const cx = Math.max(0, Math.min(w, rawCx))
        const cy = Math.max(0, Math.min(h, rawCy))
        const quads = [
          { c: quadrants.topLeft,     x: 0,  y: 0,  w: cx,     h: cy     },
          { c: quadrants.topRight,    x: cx, y: 0,  w: w - cx, h: cy     },
          { c: quadrants.bottomLeft,  x: 0,  y: cy, w: cx,     h: h - cy },
          { c: quadrants.bottomRight, x: cx, y: cy, w: w - cx, h: h - cy },
        ]
        const labelEls = showLabels ? [
          h_("text", { key: "ltl", x: padding,     y: padding + labelSize, fill: quadrants.topLeft.color,     fontWeight: 600, fontSize: labelSize, opacity: 0.5 }, quadrants.topLeft.label),
          h_("text", { key: "ltr", x: w - padding, y: padding + labelSize, fill: quadrants.topRight.color,    fontWeight: 600, fontSize: labelSize, opacity: 0.5, textAnchor: "end" }, quadrants.topRight.label),
          h_("text", { key: "lbl", x: padding,     y: h - padding,         fill: quadrants.bottomLeft.color,  fontWeight: 600, fontSize: labelSize, opacity: 0.5 }, quadrants.bottomLeft.label),
          h_("text", { key: "lbr", x: w - padding, y: h - padding,         fill: quadrants.bottomRight.color, fontWeight: 600, fontSize: labelSize, opacity: 0.5, textAnchor: "end" }, quadrants.bottomRight.label),
        ] : []
        return h_(React.Fragment, null,
          ...quads.map((q, i) => (q.w > 0 && q.h > 0)
            ? h_("rect", { key: `qf-${i}`, x: q.x, y: q.y, width: q.w, height: q.h, fill: q.c.color, opacity: q.c.opacity ?? 0.08 })
            : null),
          h_("line", { key: "vc", x1: cx, y1: 0,  x2: cx, y2: h,  stroke, strokeWidth, strokeDasharray: dashArray }),
          h_("line", { key: "hc", x1: 0,  y1: cy, x2: w,  y2: cy, stroke, strokeWidth, strokeDasharray: dashArray }),
          ...labelEls,
        )
      }
    ] : undefined

    return {
      chartType: "scatter",
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      colorAccessor: colorBy,
      sizeAccessor: rest.sizeBy,
      sizeRange: rest.sizeRange || [3, 15],
      colorScheme,
      pointStyle: common.pointStyle || rest.pointStyle || buildScatterPointStyle(data, colorBy, colorScheme, common, rest),
      ...common,
      showLegend: common.showLegend ?? Boolean(colorBy),
      ...(svgPreRenderers && { svgPreRenderers }),
    }
  },
}

export const connectedScatterplot: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const prepared = prepareConnectedScatterplotData(data, rest)
    const pointRadius = rest.pointRadius ?? 4
    const svgPreRenderers = [
      (nodes: Array<{ type?: string; x?: number; y?: number }>) => {
        const points = nodes.filter((n): n is { type: "point"; x: number; y: number } =>
          n.type === "point" && typeof n.x === "number" && typeof n.y === "number",
        )
        if (points.length < 2) return null
        const elements: React.ReactElement[] = []
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i]
          const p1 = points[i + 1]
          const color = viridisColor(i, points.length)
          // Match ConnectedScatterplot's small-data halo + viridis segment.
          if (points.length < 100) {
            elements.push(React.createElement("line", {
              key: `halo-${i}`, x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y,
              stroke: "white", strokeWidth: pointRadius + 2, strokeLinecap: "round", opacity: 0.5,
            }))
          }
          elements.push(React.createElement("line", {
            key: `segment-${i}`, x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y,
            stroke: color, strokeWidth: pointRadius, strokeLinecap: "round",
          }))
        }
        return React.createElement(React.Fragment, null, ...elements)
      },
    ]
    return {
      // ConnectedScatterplot is a scatter scene plus viridis-colored line
      // segments, not a uniform-stroke LineChart.
      chartType: "scatter",
      data: prepared.data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      colorAccessor: colorBy,
      colorScheme,
      pointStyle: (d: Datum) => {
        const order = prepared.orderMap.get(d)
        const i = order?.idx ?? 0
        const n = order?.total ?? 1
        return {
          fill: n > 0 ? viridisColor(i, n) : "#6366f1",
          stroke: "white",
          strokeWidth: 1,
          r: pointRadius,
          fillOpacity: 1,
        }
      },
      ...common,
      svgPreRenderers,
    }
  },
}

export const heatmap: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "heatmap",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    valueAccessor: rest.valueAccessor,
    colorScheme: colorScheme || rest.colorScheme || "blues",
    showValues: rest.showValues,
    heatmapValueFormat: rest.valueFormat,
    cellBorderColor: rest.cellBorderColor,
    ...common,
  }),
}
