import { buildGaugeArcModel } from "../charts/shared/gaugeGradient"
import { styleRulesToPieceStyle } from "../charts/shared/styleRules"
import { type ChartConfig } from "./serverChartConfigShared"

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
    // Resolve declarative styleRules into a pieceStyle (bypassed the HOC hook
    // on this path). Spread after `common` so it composes over any user pieceStyle.
    ...(rest.styleRules && {
      pieceStyle: styleRulesToPieceStyle(rest.styleRules, rest.valueAccessor || "value", common.pieceStyle),
    }),
  }),
}

export const stackedBarChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "bar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    stackBy: rest.stackBy,
    colorAccessor: colorBy || rest.stackBy,
    colorScheme,
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    normalize: rest.normalize,
    oSort: rest.sort ?? false,
    barPadding: rest.barPadding,
    ...(rest.roundedTop != null && { roundedTop: rest.roundedTop }),
    ...common,
    gradientFill: normalizeBarGradientFill(common.gradientFill),
    ...(rest.styleRules && {
      pieceStyle: styleRulesToPieceStyle(rest.styleRules, rest.valueAccessor || "value", common.pieceStyle),
    }),
  }),
}

export const groupedBarChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "clusterbar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    groupBy: rest.groupBy,
    colorAccessor: colorBy || rest.groupBy,
    colorScheme,
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    oSort: rest.sort ?? false,
    barPadding: rest.barPadding,
    ...(rest.roundedTop != null && { roundedTop: rest.roundedTop }),
    ...common,
    gradientFill: normalizeBarGradientFill(common.gradientFill),
    ...(rest.styleRules && {
      pieceStyle: styleRulesToPieceStyle(rest.styleRules, rest.valueAccessor || "value", common.pieceStyle),
    }),
  }),
}

export const pieChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "pie",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    projection: "radial",
    colorAccessor: colorBy || rest.categoryAccessor,
    colorScheme,
    ...(rest.cornerRadius != null && { cornerRadius: rest.cornerRadius }),
    ...common,
  }),
}

export const donutChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "donut",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    projection: "radial",
    innerRadius: rest.innerRadius || 60,
    colorAccessor: colorBy || rest.categoryAccessor,
    colorScheme,
    ...(rest.cornerRadius != null && { cornerRadius: rest.cornerRadius }),
    ...common,
  }),
}

export const histogram: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "histogram",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    projection: "horizontal",
    bins: rest.bins,
    colorAccessor: colorBy,
    colorScheme,
    ...common,
  }),
}

export const boxPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "boxplot",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorScheme,
    ...common,
  }),
}

export const violinPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "violin",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    bins: rest.bins,
    colorScheme,
    ...common,
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
    colorScheme,
    ...common,
  }),
}

export const dotPlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "point",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    colorAccessor: colorBy,
    colorScheme,
    ...common,
    showGrid: common.showGrid ?? true,
  }),
}

export const swimlaneChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "swimlane",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    stackBy: rest.subcategoryAccessor,
    colorAccessor: colorBy || rest.subcategoryAccessor,
    categoryAccessor: rest.categoryAccessor,
    subcategoryAccessor: rest.subcategoryAccessor,
    colorScheme,
    projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
    ...common,
  }),
}

export const ridgelinePlot: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "ridgeline",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    bins: rest.bins,
    amplitude: rest.amplitude,
    ...common,
  }),
}

export const likertChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "bar",
    data,
    oAccessor: rest.categoryAccessor || "category",
    rAccessor: rest.valueAccessor || "value",
    stackBy: rest.levelAccessor || "level",
    colorAccessor: colorBy || rest.levelAccessor || "level",
    colorScheme,
    normalize: true,
    projection: rest.orientation === "vertical" ? "vertical" : "horizontal",
    ...common,
  }),
}

export const funnelChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const isVertical = rest.orientation === "vertical"
    return {
      chartType: isVertical ? "bar-funnel" : "funnel",
      data,
      oAccessor: rest.stepAccessor || "step",
      rAccessor: rest.valueAccessor || "value",
      colorAccessor: colorBy || rest.categoryAccessor,
      categoryAccessor: rest.categoryAccessor,
      projection: isVertical ? "vertical" : "horizontal",
      connectorAccessor: rest.connectorAccessor,
      connectorStyle: rest.connectorStyle,
      barPadding: isVertical ? 40 : 0,
      showAxes: isVertical,
      showGrid: isVertical,
      colorScheme,
      ...common,
    }
  },
}

// GaugeChart is special — it computes needle geometry
export const gaugeChart: ChartConfig = {
  frameType: "ordinal",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const gMin = rest.min ?? 0
    const gMax = rest.max ?? 100
    const sweep = rest.sweep ?? 240
    const arcWidth = rest.arcWidth ?? 0.3
    const fillZones = rest.fillZones !== false
    const gapDeg = 360 - sweep
    const startAngleDeg = 180 + gapDeg / 2

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

    // Compute innerRadius from arcWidth fraction, matching renderOrdinalFrame's layout
    const m = common.margin || { top: 20, right: 20, bottom: 30, left: 40 }
    const [w, h] = common.size || [300, 300]
    const innerW = w - (m.left || 0) - (m.right || 0)
    const innerH = h - (m.top || 0) - (m.bottom || 0)
    const chartSize = Math.min(innerW, innerH)
    const computedInnerRadius = Math.max(10, (chartSize / 2) * (1 - arcWidth))

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
      showAxes: false,
      // Pass gauge-specific fields through for needle rendering
      annotations: [...(Array.isArray(common.annotations) ? common.annotations : []), ...gaugeModel.gaugeAnnotations],
      __gauge: { gMin, gMax, sweep, arcWidth, value: rest.value, startAngleDeg, thresholds },
    }
  },
}

