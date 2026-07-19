import { buildGaugeArcModel } from "../charts/shared/gaugeGradient"
import { renderServerGaugeOverlay } from "./serverGaugeOverlay"
import { computeArcBoundingBox, sweepToAngles } from "../charts/shared/radialGeometry"
import {
  aggregateData,
  defaultDivergingScheme,
  NEUTRAL_NEG,
  NEUTRAL_POS,
  orderForDiverging,
  resolveAccessorFn,
  toDivergingValues,
} from "../charts/shared/useLikertAggregation"
import type { Datum } from "../charts/shared/datumTypes"
import { makeRuleValueResolver, resolveStyleRules, type StyleRule } from "../charts/shared/styleRules"
import { createColorScale, getColor, getSize } from "../charts/shared/colorUtils"
import { getMinMax } from "../charts/shared/minMax"
import { resolveDefaultFill } from "../charts/shared/hooks"
import { composeLegendConfigs } from "../types/legendTypes"
import { resolveTheme } from "./themeResolver"
import { type ChartConfig, type ServerAccessor } from "./serverChartConfigShared"
import * as React from "react"

// ── Ordinal Charts ─────────────────────────────────────────────────────

// `gradientFill === true` is the HOC's shorthand for the default top/bottom
// opacity stops; the scene builders only accept the object form, so we
// normalize it the same way the client frame (and staticXY.tsx) do.
function normalizeBarGradientFill(gradientFill: unknown): unknown {
  return gradientFill === true
    ? { topOpacity: 0.8, bottomOpacity: 0.05 }
    : gradientFill === false
      ? undefined
      : gradientFill
}

/**
 * The ordinal frame's fallback style cycles the palette by its `category`
 * argument. That is useful for radial slices, but it is not BarChart's HOC
 * behavior: an uncoloured bar chart deliberately uses one fill. Build the
 * same resolved style function as the bar HOCs so `renderChart()` does not
 * fall back to the frame-level categorical default.
 */
function buildBarPieceStyle(
  data: unknown,
  colorBy: ServerAccessor | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): (d: Datum, category?: string) => Datum {
  const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
  const resolvedColorScheme = colorScheme ?? common.colorScheme
  const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrColorBy"
  const colorRows = typeof colorBy === "function"
    ? rows.map(d => ({ ...d, __ssrColorBy: colorBy(d) }))
    : rows
  const colorScale = colorBy
    ? createColorScale(colorRows, colorKey, (resolvedColorScheme ?? themeCategorical) as string | string[] | Record<string, string>)
    : undefined
  const defaultFill = resolveDefaultFill(
    typeof rest.color === "string" ? rest.color : undefined,
    themeCategorical,
    resolvedColorScheme as string | string[] | Record<string, string> | undefined,
    undefined,
    new Map(),
  )
  const resolveValue = makeRuleValueResolver(rest.valueAccessor as string | ((d: Datum) => unknown) | undefined)
  const rules = rest.styleRules as StyleRule[] | undefined
  const userPieceStyle = common.pieceStyle as
    | ((d: Datum, category?: string) => Datum)
    | Datum
    | undefined

  return (d, category) => {
    const base: Datum = {
      fill: colorBy && colorScale
        ? getColor(d, colorBy as string | ((datum: Datum) => string), colorScale)
        : defaultFill,
    }
    if (rules?.length) {
      Object.assign(base, resolveStyleRules(d, rules, { value: resolveValue(d), category }))
    }
    if (typeof userPieceStyle === "function") {
      Object.assign(base, userPieceStyle(d, category) || {})
    } else if (userPieceStyle && typeof userPieceStyle === "object") {
      Object.assign(base, userPieceStyle)
    }
    if (rest.stroke !== undefined) base.stroke = rest.stroke
    if (rest.strokeWidth !== undefined) base.strokeWidth = rest.strokeWidth
    if (rest.opacity !== undefined) base.opacity = rest.opacity
    return base
  }
}

/** BoxPlot uses the same color resolution as an ordinal HOC, plus its
 * characteristic 80% fill and a box outline that follows the fill. */
function buildBoxPlotSummaryStyle(
  data: unknown,
  colorBy: ServerAccessor | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): (d: Datum, category?: string) => Datum {
  const base = buildBarPieceStyle(data, colorBy, colorScheme, common, rest)
  return (d, category) => {
    const style = base(d, category)
    if (style.fillOpacity === undefined) style.fillOpacity = 0.8
    if (style.stroke === undefined) style.stroke = style.fill
    return style
  }
}

/** ViolinPlot's HOC resolves a uniform default fill and links its outline. */
function buildViolinSummaryStyle(
  data: unknown,
  colorBy: ServerAccessor | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): (d: Datum, category?: string) => Datum {
  const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrViolinColorBy"
  const colorRows = typeof colorBy === "function"
    ? rows.map(d => ({ ...d, __ssrViolinColorBy: colorBy(d) }))
    : rows
  const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
  const resolvedColorScheme = colorScheme ?? common.colorScheme
  // The HOC's useColorScale resolves through the active theme before its
  // palette fallback. Keep the SSR scale and the ungrouped default fill on
  // that same path so the violin body and its IQR use one resolved color.
  const colorScale = colorBy
    ? createColorScale(colorRows, colorKey, (resolvedColorScheme ?? themeCategorical) as string | string[] | Record<string, string>)
    : undefined
  const fallbackFill = resolveDefaultFill(
    typeof rest.color === "string" ? rest.color : undefined,
    themeCategorical,
    resolvedColorScheme as string | string[] | Record<string, string> | undefined,
    undefined,
    new Map(),
  )

  return (d) => {
    const fill = colorBy && colorScale
      ? getColor(d, colorBy as string | ((datum: Datum) => string), colorScale)
      : fallbackFill
    return {
      fill,
      fillOpacity: 0.6,
      stroke: rest.stroke ?? fill,
      ...(rest.strokeWidth !== undefined && { strokeWidth: rest.strokeWidth }),
      ...(rest.opacity !== undefined && { opacity: rest.opacity }),
    }
  }
}

function buildDotPlotPieceStyle(
  data: unknown,
  colorBy: ServerAccessor | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): (d: Datum, category?: string) => Datum {
  const base = buildBarPieceStyle(data, colorBy, colorScheme, common, rest)
  const radius = typeof rest.dotRadius === "number" ? rest.dotRadius : 5
  return (d, category) => ({
    r: radius,
    fillOpacity: 0.8,
    ...base(d, category),
  })
}

/** SwarmPlot has the ordinary categorical color contract plus circle sizing. */
function buildSwarmPieceStyle(
  data: unknown,
  colorBy: ServerAccessor | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum,
): (d: Datum, category?: string) => Datum {
  const base = buildBarPieceStyle(data, colorBy, colorScheme, common, rest)
  const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
  const sizeBy = rest.sizeBy as string | ((d: Datum) => number) | undefined
  const sizeRange = Array.isArray(rest.sizeRange) ? rest.sizeRange as [number, number] : [3, 8] as [number, number]
  const sizeValues = sizeBy
    ? rows.map(d => typeof sizeBy === "function" ? sizeBy(d) : Number(d[sizeBy])).filter(Number.isFinite)
    : []
  const sizeDomain = sizeValues.length ? getMinMax(sizeValues) : undefined
  const radius = typeof rest.pointRadius === "number" ? rest.pointRadius : 4
  const fillOpacity = typeof rest.pointOpacity === "number" ? rest.pointOpacity : 0.7
  return (d, category) => ({
    r: sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : radius,
    fillOpacity,
    ...base(d, category),
  })
}

export const barChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "bar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    oSort: rest.sort ?? false,
    colorAccessor: colorBy,
    colorScheme,
    barPadding: rest.barPadding,
    ...(rest.roundedTop != null && { roundedTop: rest.roundedTop }),
    ...common,
    gradientFill: normalizeBarGradientFill(common.gradientFill),
    pieceStyle: buildBarPieceStyle(data, colorBy, colorScheme, common, rest),
  }),
}

export const stackedBarChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const effectiveColorBy = colorBy || rest.stackBy
    return {
    chartType: "bar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    stackBy: rest.stackBy,
    colorAccessor: effectiveColorBy,
    colorScheme,
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    normalize: rest.normalize,
    oSort: rest.sort ?? false,
    barPadding: rest.barPadding,
    ...(rest.roundedTop != null && { roundedTop: rest.roundedTop }),
    ...common,
    gradientFill: normalizeBarGradientFill(common.gradientFill),
    pieceStyle: buildBarPieceStyle(data, effectiveColorBy, colorScheme, common, rest),
    showLegend: common.showLegend ?? Boolean(effectiveColorBy),
    }
  },
}

export const groupedBarChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const effectiveColorBy = colorBy || rest.groupBy
    return {
    chartType: "clusterbar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    groupBy: rest.groupBy,
    colorAccessor: effectiveColorBy,
    colorScheme,
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    oSort: rest.sort ?? false,
    barPadding: rest.barPadding,
    ...(rest.roundedTop != null && { roundedTop: rest.roundedTop }),
    ...common,
    gradientFill: normalizeBarGradientFill(common.gradientFill),
    pieceStyle: buildBarPieceStyle(data, effectiveColorBy, colorScheme, common, rest),
    showLegend: common.showLegend ?? Boolean(effectiveColorBy),
    }
  },
}

export const pieChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const effectiveColorBy = colorBy || rest.categoryAccessor
    return {
      chartType: "pie",
      data,
      oAccessor: rest.categoryAccessor || "category",
      rAccessor: rest.valueAccessor || "value",
      projection: "radial",
      colorAccessor: effectiveColorBy,
      colorScheme,
      ...(rest.cornerRadius != null && { cornerRadius: rest.cornerRadius }),
      // startAngle rotates the first wedge (mirrors PieChart.tsx). Dropped by
      // the SSR path before this mapping, so SSR always started at 12 o'clock.
      ...(rest.startAngle != null && { startAngle: rest.startAngle }),
      ...common,
      pieceStyle: buildBarPieceStyle(data, effectiveColorBy, colorScheme, common, rest),
      showLegend: common.showLegend ?? Boolean(effectiveColorBy),
    }
  },
}

export const donutChart: ChartConfig = {
  frameType: "ordinal",
  layout: { primarySize: { width: 400, height: 400 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const effectiveColorBy = colorBy || rest.categoryAccessor
    return {
      chartType: "donut",
      data,
      oAccessor: rest.categoryAccessor || "category",
      rAccessor: rest.valueAccessor || "value",
      projection: "radial",
    // Mirror DonutChart's primary-mode layout defaults. Without this the
    // standalone SSR path uses staticOrdinal's generic 20/20/30/40 margin,
    // making an otherwise identical donut visibly larger than its CSR HOC.
    margin: common.margin ?? { top: 50, right: 40, bottom: 60, left: 70 },
    innerRadius: rest.innerRadius ?? 60,
      colorAccessor: effectiveColorBy,
      colorScheme,
      ...(rest.cornerRadius != null && { cornerRadius: rest.cornerRadius }),
      // startAngle rotates the first wedge (mirrors DonutChart.tsx). Dropped by
      // the SSR path before this mapping, so SSR always started at 12 o'clock.
      ...(rest.startAngle != null && { startAngle: rest.startAngle }),
      ...common,
      // Bind fills to category values through the same ordinal color scale as
      // DonutChart, rather than assigning palette slots while wedges happen
      // to be emitted (which can be a different order after radial layout).
      pieceStyle: buildBarPieceStyle(data, effectiveColorBy, colorScheme, common, rest),
    }
  },
}

export const histogram: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
    const valueAccessor = rest.valueAccessor || "value"
    const valueOf = (d: Datum) => typeof valueAccessor === "function"
      ? Number(valueAccessor(d))
      : Number(d[valueAccessor])
    const values = rows.map(valueOf).filter(Number.isFinite)
    const sharedExtent = values.length ? [Math.min(...values), Math.max(...values)] as [number, number] : undefined
    return {
      chartType: "histogram",
      data,
      // The client defaults to a function that folds raw observations into
      // one "All" distribution. A string default silently produced a
      // different set of bins when category was omitted server-side.
      oAccessor: rest.categoryAccessor || ((d: Datum) => d.category == null ? "All" : String(d.category)),
      rAccessor: valueAccessor,
      projection: "horizontal",
      bins: rest.bins ?? 25,
      normalize: rest.relative ?? false,
      colorAccessor: colorBy,
      colorScheme,
      barPadding: rest.categoryPadding ?? 20,
      ...(rest.valueExtent ? { rExtent: rest.valueExtent } : sharedExtent ? { rExtent: sharedExtent } : {}),
      ...common,
      // Histogram paints summary/bin marks, not ordinary bar pieces.
      // Reuse the HOC-equivalent opacity + fill-linked stroke resolver.
      summaryStyle: buildBoxPlotSummaryStyle(data, colorBy, colorScheme, common, rest),
    }
  },
}

export const boxPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "boxplot",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorAccessor: colorBy,
    colorScheme,
    // staticOrdinal can pass showOutliers into the pipeline; without this
    // mapping showOutliers:false silently no-ops (default keeps outliers).
    ...(rest.showOutliers != null && { showOutliers: rest.showOutliers }),
    ...(rest.outlierRadius != null && { outlierRadius: rest.outlierRadius }),
    ...common,
    summaryStyle: common.summaryStyle || buildBoxPlotSummaryStyle(data, colorBy, colorScheme, common, rest),
  }),
}

export const violinPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "violin",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorAccessor: colorBy,
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    bins: rest.bins ?? 25,
    showIQR: rest.showIQR ?? true,
    barPadding: rest.categoryPadding ?? 20,
    colorScheme,
    ...common,
    summaryStyle: common.summaryStyle || buildViolinSummaryStyle(data, colorBy, colorScheme, common, rest),
    showLegend: common.showLegend ?? Boolean(colorBy),
    ...(rest.valueExtent && { rExtent: rest.valueExtent }),
  }),
}

export const swarmPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "swarm",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorAccessor: colorBy,
    // symbolBy → symbolAccessor is the HOC-level rename (mirrors SwarmPlot.tsx):
    // the field whose values become glyph shapes. Without this the SSR path
    // drops symbolBy and every point renders as a circle.
    ...(rest.symbolBy && { symbolAccessor: rest.symbolBy }),
    ...(rest.symbolMap && { symbolMap: rest.symbolMap }),
    colorScheme,
    ...common,
    sizeRange: rest.sizeRange || [3, 8],
    pieceStyle: common.pieceStyle || buildSwarmPieceStyle(data, colorBy, colorScheme, common, rest),
    showLegend: common.showLegend ?? Boolean(colorBy),
  }),
}

export const dotPlot: ChartConfig = {
  frameType: "ordinal",
  layout: { modeDefaults: { showGrid: true } },
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "point",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorAccessor: colorBy,
    colorScheme,
    projection: rest.orientation === "vertical" ? "vertical" : "horizontal",
    oSort: rest.sort ?? "auto",
    barPadding: rest.categoryPadding ?? 10,
    ...common,
    pieceStyle: buildDotPlotPieceStyle(data, colorBy, colorScheme, common, rest),
    showGrid: common.showGrid ?? true,
    showLegend: common.showLegend ?? Boolean(colorBy),
  }),
}

export const swimlaneChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const effectiveColorBy = colorBy || rest.subcategoryAccessor
    return {
    chartType: "swimlane",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    stackBy: rest.subcategoryAccessor,
    colorAccessor: effectiveColorBy,
    categoryAccessor: rest.categoryAccessor,
    subcategoryAccessor: rest.subcategoryAccessor,
    colorScheme,
    projection: rest.orientation === "vertical" ? "vertical" : "horizontal",
    // trackFill paints the lane background behind each swimlane (mirrors
    // SwimlaneChart.tsx). Dropped by the SSR path before this mapping.
    ...(rest.trackFill != null && { trackFill: rest.trackFill }),
    // valueExtent → rExtent pins the value axis so a lane whose segments do
    // not sum to the extent max (e.g. a ThresholdBar showing 40 of 100) fills
    // the correct fraction instead of auto-scaling to the data max. The
    // SwimlaneChart HOC maps this the same way; SSR dropped it (same class of
    // bug as gradientFill/trackFill).
    ...(rest.valueExtent && { rExtent: rest.valueExtent }),
    // roundedTop rounds the outer ends of each lane (mirrors SwimlaneChart.tsx).
    ...(rest.roundedTop != null && { roundedTop: rest.roundedTop }),
    ...common,
    gradientFill: normalizeBarGradientFill(common.gradientFill),
    pieceStyle: common.pieceStyle || buildBarPieceStyle(data, effectiveColorBy, colorScheme, common, rest),
    showLegend: common.showLegend ?? Boolean(effectiveColorBy),
    barPadding: rest.barPadding ?? 40,
    }
  },
}

export const ridgelinePlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "ridgeline",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorAccessor: colorBy,
    colorScheme,
    projection: rest.orientation === "vertical" ? "vertical" : "horizontal",
    bins: rest.bins ?? 20,
    amplitude: rest.amplitude ?? 1.5,
    barPadding: rest.categoryPadding ?? 5,
    // RidgelinePlot preserves input category order. The ordinal frame sorts
    // by default, which made static output reorder the same rows rendered by
    // the client HOC.
    oSort: rest.oSort ?? false,
    ...common,
    summaryStyle: common.summaryStyle || ((d: Datum, category?: string) => ({ fillOpacity: 0.5, ...buildBarPieceStyle(data, colorBy, colorScheme, common, rest)(d, category) })),
    showLegend: common.showLegend ?? Boolean(colorBy),
  }),
}

export const likertChart: ChartConfig = {
  frameType: "ordinal",
  layout: {
    margin: (props, resolved) => ({
      ...resolved.marginDefaults,
      left: props.orientation === "vertical"
        ? resolved.marginDefaults.left
        : Math.max(100, resolved.marginDefaults.left),
    }),
  },
  buildProps: (data, _colorBy, colorScheme, common, rest) => {
    const levels = Array.isArray(rest.levels) && rest.levels.length >= 2
      ? rest.levels as string[]
      : ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]
    const isDiverging = rest.orientation !== "vertical"
    const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
    const getCategory = resolveAccessorFn<string>(rest.categoryAccessor, "question")
    const getScore = rest.levelAccessor
      ? null
      : resolveAccessorFn<number>(rest.valueAccessor, "score")
    const getLevel = rest.levelAccessor
      ? resolveAccessorFn<string>(rest.levelAccessor, "level")
      : null
    const getCount = rest.levelAccessor
      ? resolveAccessorFn<number>(rest.countAccessor, "count")
      : null
    let processed = aggregateData(rows, levels, getCategory, getScore, getLevel, getCount)
    if (isDiverging) processed = orderForDiverging(toDivergingValues(processed, levels), levels)
    const themeDiverging = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.diverging
    const palette = Array.isArray(colorScheme) && colorScheme.length >= levels.length
      ? colorScheme
      : defaultDivergingScheme(levels.length, themeDiverging)
    const levelColors = new Map(levels.map((level, index) => [level, palette[index] || "#888"]))
    const neutralColor = levels.length % 2 ? levelColors.get(levels[Math.floor(levels.length / 2)]) || "#888" : "#888"
    const valueFormat = typeof rest.valueFormat === "function"
      ? rest.valueFormat
      : (value: number | string) => `${Math.abs(Number(value)).toFixed(0)}%`
    const chartLegend = common.showLegend === false
      ? undefined
      : {
          legendGroups: [{
            label: "",
            items: levels.map(label => ({ label })),
            styleFn: (item: { label: string }) => ({ fill: levelColors.get(item.label) || "#888" }),
          }],
        }
    const legend = composeLegendConfigs(chartLegend, common.legend)
    return {
      chartType: "bar",
      data: processed,
      oAccessor: "__likertCategory",
      rAccessor: "__likertPct",
      stackBy: "__likertLevel",
      normalize: false,
      projection: isDiverging ? "horizontal" : "vertical",
      barPadding: rest.barPadding,
      showGrid: common.showGrid,
      oLabel: rest.categoryLabel,
      rLabel: rest.valueLabel || (isDiverging ? undefined : "Percentage"),
      rFormat: valueFormat,
      ...(rest.categoryFormat && { oFormat: rest.categoryFormat }),
      ...(rest.valueExtent && { rExtent: rest.valueExtent }),
      ...common,
      // Likert uses a level-keyed diverging palette rather than the normal
      // ordinal color scale. Preserve the neutral split's shared color.
      pieceStyle: (d: Datum) => {
        const level = d.__likertLevel || d.data?.__likertLevel
        const label = d.__likertLevelLabel || d.data?.__likertLevelLabel
        return { fill: level === NEUTRAL_NEG || level === NEUTRAL_POS
          ? neutralColor
          : levelColors.get(String(label || level)) || "#888" }
      },
      showLegend: common.showLegend ?? true,
      // setup.legendPosition defaults to right in the client HOC. The
      // bottom fallback here was an SSR-only override.
      legendPosition: common.legendPosition || "right",
      ...(legend && { legend }),
      // The level legend above is the complete automatic legend. Asking the
      // static frame to infer another one from processed rows exposes
      // internal __likert neutral-split buckets and duplicates real levels.
      __legendIncludesAutomatic: true,
    }
  },
}

export const funnelChart: ChartConfig = {
  frameType: "ordinal",
  layout: {
    margin: (props, resolved) => props.orientation === "vertical"
      ? { top: resolved.title ? 60 : 40, right: 20, bottom: 60, left: 60 }
      : { top: resolved.title ? 40 : 10, right: 10, bottom: 10, left: 10 },
  },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const isVertical = rest.orientation === "vertical"
    const effectiveColorBy = colorBy || rest.categoryAccessor
    return {
      chartType: isVertical ? "bar-funnel" : "funnel",
      data,
      oAccessor: rest.stepAccessor || "step",
      rAccessor: rest.valueAccessor || "value",
      colorAccessor: effectiveColorBy,
      categoryAccessor: rest.categoryAccessor,
      projection: isVertical ? "vertical" : "horizontal",
      connectorAccessor: rest.connectorAccessor,
      connectorStyle: rest.connectorStyle,
      // connectorOpacity styles the horizontal funnel's between-step connectors
      // (mirrors FunnelChart.tsx, which only forwards it for horizontal funnels;
      // the vertical bar-funnel has no connectors). Dropped by SSR before this.
      ...(!isVertical && rest.connectorOpacity != null && { connectorOpacity: rest.connectorOpacity }),
      barPadding: isVertical ? 40 : 0,
      colorScheme,
      ...common,
      showAxes: isVertical,
      showGrid: isVertical,
      // A one-series funnel is intentionally monocolor; per-step palette
      // cycling is a frame fallback, not FunnelChart's HOC contract.
      pieceStyle: buildBarPieceStyle(data, effectiveColorBy, colorScheme, common, rest),
      showLabels: rest.showLabels ?? true,
    }
  },
}

// GaugeChart is special — it computes needle geometry
export const gaugeChart: ChartConfig = {
  frameType: "ordinal",
  layout: { primarySize: { width: 300, height: 250 } },
  renderOverlay: renderServerGaugeOverlay,
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const gMin = rest.min ?? 0
    const gMax = rest.max ?? 100
    const sweep = rest.sweep ?? 240
    const arcWidth = rest.arcWidth ?? 0.3
    const showNeedle = rest.showNeedle !== false
    const fillZones = rest.fillZones !== false
    const { startAngleDeg } = sweepToAngles(sweep)

    const thresholds = rest.thresholds || [{ value: gMax, color: rest.color || "#4e79a7" }]
    const gradientFillValue = common.gradientFill as unknown
    const gradientFill =
      gradientFillValue && typeof gradientFillValue === "object" && "colorStops" in gradientFillValue
        ? gradientFillValue as { colorStops: Array<{ offset: number; color: string }> }
        : undefined
    const gaugeModel = buildGaugeArcModel({
      min: gMin,
      max: gMax,
      value: rest.value,
      thresholds,
      fillColor: rest.color,
      backgroundColor: rest.backgroundColor || "#e0e0e0",
      fillZones,
      showScaleLabels: rest.showScaleLabels !== false,
      gradientFill,
    })

    // Match GaugeChart's partial-arc layout. A generic ordinal frame centers
    // a full circle, leaving a half/partial gauge undersized and vertically
    // misplaced. Size the square scene from the visible arc bounding box and
    // offset its center so the painted sweep is centered in the widget.
    const [width, height] = (common.size as [number, number] | undefined) || [300, 250]
    const arcBBox = computeArcBoundingBox(sweep)
    const pad = Math.min(10, Math.max(1, Math.min(width, height) / 12))
    const radius = Math.max(4, Math.min(
      (width - 2 * pad) / arcBBox.width,
      (height - 2 * pad) / arcBBox.height,
    ) - 2)
    const computedInnerRadius = Math.max(0, Math.min(radius - 1.5, radius * (1 - arcWidth)))
    const frameCenterX = width / 2 - arcBBox.cx * radius
    const frameCenterY = height / 2 - arcBBox.cy * radius
    const sceneSize = 2 * (radius + 4)
    const value = Math.max(gMin, Math.min(gMax, rest.value ?? gMin))
    const formattedValue = typeof rest.valueFormat === "function"
      ? rest.valueFormat(value)
      : String(Math.round(value))
    const suppliedCenterContent = rest.centerContent ?? common.centerContent
    const centerContent = suppliedCenterContent != null
      ? typeof suppliedCenterContent === "function"
        ? suppliedCenterContent(value, gMin, gMax)
        : suppliedCenterContent
      : rest.mode === "sparkline" || rest.mode === "context"
        ? undefined
        : React.createElement(
            "div",
            { style: { textAlign: "center", lineHeight: 1.2 } },
            React.createElement(
              "div",
              { style: { fontSize: Math.max(16, radius * 0.3), fontWeight: 700, color: "var(--semiotic-text, #333)" } },
              formattedValue,
            ),
            rest.showScaleLabels !== false && React.createElement(
              "div",
              { style: { fontSize: 11, color: "var(--semiotic-text-secondary, #666)" } },
              `${gMin} – ${gMax}`,
            ),
          )

    return {
      chartType: "donut",
      data: gaugeModel.gaugeData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "radial",
      innerRadius: computedInnerRadius,
      sweepAngle: sweep,
      startAngle: startAngleDeg,
      oSort: false,
      pieceStyle: gaugeModel.pieceStyle,
      ...(rest.cornerRadius != null && { cornerRadius: rest.cornerRadius }),
      ...common,
      size: [width, height],
      margin: {
        top: frameCenterY - sceneSize / 2,
        bottom: height - frameCenterY - sceneSize / 2,
        left: frameCenterX - sceneSize / 2,
        right: width - frameCenterX - sceneSize / 2,
      },
      ...(centerContent != null && { centerContent }),
      showAxes: false,
      // Pass gauge-specific fields through for needle rendering
      annotations: [...(Array.isArray(common.annotations) ? common.annotations : []), ...gaugeModel.gaugeAnnotations],
      __gauge: {
        gMin, gMax, sweep, arcWidth, value, startAngleDeg, thresholds,
        centerX: frameCenterX, centerY: frameCenterY,
        radius,
        innerRadius: computedInnerRadius,
        showScaleLabels: rest.showScaleLabels !== false,
        needleLength: computedInnerRadius > 20 ? computedInnerRadius - 8 : radius - 1,
        showNeedle,
        needleColor: rest.needleColor,
        ...(rest.mode === "context" && suppliedCenterContent == null && {
          contextValue: formattedValue,
          contextValueY: frameCenterY - computedInnerRadius * 0.2,
          valueFontSize: Math.max(12, Math.min(22, radius * 0.28)),
        }),
      },
    }
  },
}
