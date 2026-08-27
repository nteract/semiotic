import type { Datum } from "../charts/shared/datumTypes"
import {
  makeRuleValueResolver,
  resolveStyleRules,
  type StyleRule
} from "../charts/shared/styleRules"
import {
  createColorScale,
  getColor,
  getSize
} from "../charts/shared/colorUtils"
import { getMinMax } from "../charts/shared/minMax"
import { resolveDefaultFill } from "../charts/shared/hooks"
import { resolveTheme } from "./themeResolver"
import {
  type ChartConfig,
  type ServerAccessor,
  mergeServerRegressionAnnotation
} from "./serverChartConfigShared"
import { normalizeGradient } from "../charts/shared/gradient"
export { likertChart } from "./serverOrdinalLikert"
export { gaugeChart } from "./serverOrdinalGauge"

// ── Ordinal Charts ─────────────────────────────────────────────────────

function normalizeBarGradientFill(gradientFill: unknown): unknown {
  return normalizeGradient(
    gradientFill as Parameters<typeof normalizeGradient>[0]
  )
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
  resolveRuleValue?: (d: Datum, category?: string) => number | undefined
): (d: Datum, category?: string) => Datum {
  const themeCategorical = resolveTheme(
    common.theme as Parameters<typeof resolveTheme>[0]
  ).colors.categorical
  const resolvedColorScheme = colorScheme ?? common.colorScheme
  const rows = Array.isArray(data)
    ? data.filter((d): d is Datum => !!d && typeof d === "object")
    : []
  const colorKey = typeof colorBy === "string" ? colorBy : "__ssrColorBy"
  const colorRows =
    typeof colorBy === "function"
      ? rows.map((d) => ({ ...d, __ssrColorBy: colorBy(d) }))
      : rows
  const colorScale = colorBy
    ? createColorScale(
        colorRows,
        colorKey,
        (resolvedColorScheme ?? themeCategorical) as
          string | string[] | Record<string, string>
      )
    : undefined
  const defaultFill = resolveDefaultFill(
    typeof rest.color === "string" ? rest.color : undefined,
    themeCategorical,
    resolvedColorScheme as
      string | string[] | Record<string, string> | undefined,
    undefined,
    new Map()
  )
  const resolveValue =
    resolveRuleValue ??
    makeRuleValueResolver(
      (rest.valueAccessor ?? "value") as string | ((d: Datum) => unknown)
    )
  const rules = rest.styleRules as StyleRule[] | undefined
  const userPieceStyle = common.pieceStyle as
    ((d: Datum, category?: string) => Datum) | Datum | undefined

  return (d, category) => {
    const base: Datum = {
      fill:
        colorBy && colorScale
          ? getColor(
              d,
              colorBy as string | ((datum: Datum) => string),
              colorScale
            )
          : defaultFill
    }
    if (rules?.length) {
      Object.assign(
        base,
        resolveStyleRules(d, rules, {
          value: resolveValue(d, category),
          category
        })
      )
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
  ruleValueField = "median",
  defaultFillOpacity = 0.8
): (d: Datum, category?: string) => Datum {
  const readValue = makeRuleValueResolver(
    (rest.valueAccessor ?? "value") as string | ((d: Datum) => unknown)
  )
  const base = buildBarPieceStyle(
    data,
    colorBy,
    colorScheme,
    common,
    rest,
    (d) =>
      typeof d[ruleValueField] === "number"
        ? (d[ruleValueField] as number)
        : readValue(d)
  )
  return (d, category) => {
    const style = base(d, category)
    if (style.fillOpacity === undefined) style.fillOpacity = defaultFillOpacity
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
  rest: Datum
): (d: Datum, category?: string) => Datum {
  return buildBoxPlotSummaryStyle(
    data,
    colorBy,
    colorScheme,
    common,
    rest,
    "median",
    0.6
  )
}

function buildDotPlotPieceStyle(
  data: unknown,
  colorBy: ServerAccessor | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum
): (d: Datum, category?: string) => Datum {
  const base = buildBarPieceStyle(data, colorBy, colorScheme, common, rest)
  const radius = typeof rest.dotRadius === "number" ? rest.dotRadius : 5
  return (d, category) => ({
    r: radius,
    fillOpacity: 0.8,
    ...base(d, category)
  })
}

/** SwarmPlot has the ordinary categorical color contract plus circle sizing. */
function buildSwarmPieceStyle(
  data: unknown,
  colorBy: ServerAccessor | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum
): (d: Datum, category?: string) => Datum {
  const base = buildBarPieceStyle(data, colorBy, colorScheme, common, rest)
  const rows = Array.isArray(data)
    ? data.filter((d): d is Datum => !!d && typeof d === "object")
    : []
  const sizeBy = rest.sizeBy as string | ((d: Datum) => number) | undefined
  const sizeRange = Array.isArray(rest.sizeRange)
    ? (rest.sizeRange as [number, number])
    : ([3, 8] as [number, number])
  const sizeValues = sizeBy
    ? rows
        .map((d) =>
          typeof sizeBy === "function" ? sizeBy(d) : Number(d[sizeBy])
        )
        .filter(Number.isFinite)
    : []
  const sizeDomain = sizeValues.length ? getMinMax(sizeValues) : undefined
  const radius = typeof rest.pointRadius === "number" ? rest.pointRadius : 4
  const fillOpacity =
    typeof rest.pointOpacity === "number" ? rest.pointOpacity : 0.7
  return (d, category) => ({
    r: sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : radius,
    fillOpacity,
    ...base(d, category)
  })
}

export const barChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const annotations = mergeServerRegressionAnnotation(
      common.annotations,
      rest.regression
    )
    return {
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
      ...(annotations && { annotations }),
      gradientFill: normalizeBarGradientFill(common.gradientFill),
      pieceStyle: buildBarPieceStyle(data, colorBy, colorScheme, common, rest)
    }
  }
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
      pieceStyle: buildBarPieceStyle(
        data,
        effectiveColorBy,
        colorScheme,
        common,
        rest
      ),
      showLegend: common.showLegend ?? Boolean(effectiveColorBy)
    }
  }
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
      pieceStyle: buildBarPieceStyle(
        data,
        effectiveColorBy,
        colorScheme,
        common,
        rest
      ),
      showLegend: common.showLegend ?? Boolean(effectiveColorBy)
    }
  }
}

export const pieChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const effectiveColorBy = colorBy || rest.categoryAccessor
    const readValue = makeRuleValueResolver(
      (rest.valueAccessor ?? "value") as string | ((d: Datum) => unknown)
    )
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
      pieceStyle: buildBarPieceStyle(
        data,
        effectiveColorBy,
        colorScheme,
        common,
        rest,
        (d) => {
          const value = readValue(d)
          return value == null ? undefined : Math.abs(value)
        }
      ),
      showLegend: common.showLegend ?? Boolean(effectiveColorBy)
    }
  }
}

export const donutChart: ChartConfig = {
  frameType: "ordinal",
  layout: { primarySize: { width: 400, height: 400 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const effectiveColorBy = colorBy || rest.categoryAccessor
    const readValue = makeRuleValueResolver(
      (rest.valueAccessor ?? "value") as string | ((d: Datum) => unknown)
    )
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
      pieceStyle: buildBarPieceStyle(
        data,
        effectiveColorBy,
        colorScheme,
        common,
        rest,
        (d) => {
          const value = readValue(d)
          return value == null ? undefined : Math.abs(value)
        }
      )
    }
  }
}

export const histogram: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const rows = Array.isArray(data)
      ? data.filter((d): d is Datum => !!d && typeof d === "object")
      : []
    const valueAccessor = rest.valueAccessor || "value"
    const valueOf = (d: Datum) =>
      typeof valueAccessor === "function"
        ? Number(valueAccessor(d))
        : Number(d[valueAccessor])
    const values = rows.map(valueOf).filter(Number.isFinite)
    const sharedExtent = values.length
      ? ([Math.min(...values), Math.max(...values)] as [number, number])
      : undefined
    return {
      chartType: "histogram",
      data,
      // The client defaults to a function that folds raw observations into
      // one "All" distribution. A string default silently produced a
      // different set of bins when category was omitted server-side.
      oAccessor:
        rest.categoryAccessor ||
        ((d: Datum) => (d.category == null ? "All" : String(d.category))),
      rAccessor: valueAccessor,
      projection: "horizontal",
      bins: rest.bins ?? 25,
      normalize: rest.relative ?? false,
      colorAccessor: colorBy,
      colorScheme,
      barPadding: rest.categoryPadding ?? 20,
      ...(rest.valueExtent
        ? { rExtent: rest.valueExtent }
        : sharedExtent
          ? { rExtent: sharedExtent }
          : {}),
      ...common,
      // Histogram paints summary/bin marks, not ordinary bar pieces.
      // Reuse the HOC-equivalent opacity + fill-linked stroke resolver.
      summaryStyle: buildBoxPlotSummaryStyle(
        data,
        colorBy,
        colorScheme,
        common,
        rest,
        "count"
      )
    }
  }
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
    summaryStyle: buildBoxPlotSummaryStyle(
      data,
      colorBy,
      colorScheme,
      common,
      rest
    )
  })
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
    summaryStyle: buildViolinSummaryStyle(
      data,
      colorBy,
      colorScheme,
      common,
      rest
    ),
    showLegend: common.showLegend ?? Boolean(colorBy),
    ...(rest.valueExtent && { rExtent: rest.valueExtent })
  })
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
    pieceStyle: buildSwarmPieceStyle(data, colorBy, colorScheme, common, rest),
    showLegend: common.showLegend ?? Boolean(colorBy)
  })
}

export const dotPlot: ChartConfig = {
  frameType: "ordinal",
  layout: { modeDefaults: { showGrid: true } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const annotations = mergeServerRegressionAnnotation(
      common.annotations,
      rest.regression
    )
    return {
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
      ...(annotations && { annotations }),
      pieceStyle: buildDotPlotPieceStyle(
        data,
        colorBy,
        colorScheme,
        common,
        rest
      ),
      showGrid: common.showGrid ?? true,
      showLegend: common.showLegend ?? Boolean(colorBy)
    }
  }
}

export const radarChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const seriesAccessor = rest.seriesAccessor || colorBy || "__radar"
    const colorKey =
      colorBy || (seriesAccessor === "__radar" ? undefined : seriesAccessor)
    const pieceStyle = buildDotPlotPieceStyle(
      data,
      colorKey as ServerAccessor | undefined,
      colorScheme,
      common,
      { ...rest, dotRadius: rest.pointRadius ?? 4 }
    )
    const connectorStyle = (d: Datum) => {
      const piece = pieceStyle(d)
      const fill = typeof piece.fill === "string" ? piece.fill : undefined
      return {
        fill,
        fillOpacity: 0.15,
        stroke: fill,
        strokeWidth: 2,
        opacity: 0.7
      }
    }
    return {
      chartType: "point",
      projection: "radial",
      data,
      oAccessor: rest.categoryAccessor || "attribute",
      rAccessor: rest.valueAccessor || "value",
      colorAccessor: colorKey,
      colorScheme,
      connectorAccessor: seriesAccessor,
      connectorStyle,
      pieceStyle,
      rExtent: rest.valueExtent || [0],
      oLabel: "",
      ...common,
      ...(rest.categoryFormat && { oFormat: rest.categoryFormat }),
      showLegend: common.showLegend ?? Boolean(colorKey)
    }
  }
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
      pieceStyle: buildBarPieceStyle(
        data,
        effectiveColorBy,
        colorScheme,
        common,
        rest
      ),
      showLegend: common.showLegend ?? Boolean(effectiveColorBy),
      barPadding: rest.barPadding ?? 40
    }
  }
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
    summaryStyle: buildBoxPlotSummaryStyle(
      data,
      colorBy,
      colorScheme,
      common,
      rest,
      "median",
      0.5
    ),
    showLegend: common.showLegend ?? Boolean(colorBy)
  })
}

export const funnelChart: ChartConfig = {
  frameType: "ordinal",
  layout: {
    margin: (props, resolved) =>
      props.orientation === "vertical"
        ? { top: resolved.title ? 60 : 40, right: 20, bottom: 60, left: 60 }
        : { top: resolved.title ? 40 : 10, right: 10, bottom: 10, left: 10 }
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
      ...(!isVertical &&
        rest.connectorOpacity != null && {
          connectorOpacity: rest.connectorOpacity
        }),
      barPadding: isVertical ? 40 : 0,
      colorScheme,
      ...common,
      // A vertical funnel normally needs ordinal axes, but the public
      // `showAxes` contract still takes precedence for compact/static use.
      // Horizontal funnels intentionally never draw axes.
      showAxes: isVertical && common.showAxes !== false,
      showGrid: isVertical,
      // A one-series funnel is intentionally monocolor; per-step palette
      // cycling is a frame fallback, not FunnelChart's HOC contract.
      pieceStyle: buildBarPieceStyle(
        data,
        effectiveColorBy,
        colorScheme,
        common,
        rest
      ),
      showLabels: rest.showLabels ?? true
    }
  }
}
