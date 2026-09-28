import type { Datum } from "../charts/shared/datumTypes"
import type { AxisConfig } from "../charts/shared/types"
import {
  createBumpXFormatter,
  mapBumpAnnotations,
  normalizeBumpColor,
  normalizeBumpCount,
  rankBumpData,
  resolveBumpColorScheme,
} from "../charts/xy/bumpData"
import {
  bumpLayout,
  type BumpLayoutConfig,
} from "../charts/xy/bumpLayout"
import {
  resolveBumpLabelLayout,
  resolveBumpLabelSpace,
  type BumpLabelLayoutInput,
} from "../charts/xy/bumpLabelMargins"
import type { MarginType } from "../types/marginType"
import type { ChartConfig } from "./serverChartConfigShared"
import { resolveTheme } from "./themeResolver"

type BumpRankOptions = Parameters<typeof rankBumpData>[1]

function bumpRows(data: unknown): Datum[] {
  return Array.isArray(data)
    ? data.filter((datum): datum is Datum => !!datum && typeof datum === "object")
    : []
}

function bumpRankOptions(props: Datum): BumpRankOptions {
  return {
    xAccessor: props.xAccessor as string | ((datum: Datum, index?: number) => number | Date | string) | undefined,
    yAccessor: props.yAccessor as string | ((datum: Datum, index?: number) => number) | undefined,
    lineBy: props.lineBy as string | ((datum: Datum, index?: number) => string) | undefined,
    rankDirection: props.rankDirection as "descending" | "ascending" | undefined,
    highlightTop: normalizeBumpCount(props.highlightTop),
  }
}

/** The endpoint-label layout input BumpChart builds in the browser. */
function bumpLabelInput(
  seriesOrder: string[],
  props: Datum,
  width: number,
  showAxes: boolean,
  yLabel: unknown,
  legend: { show: unknown; position: unknown }
): BumpLabelLayoutInput {
  const labelStyle = props.labelStyle as { fontSize?: unknown } | undefined
  const position = legend.position ?? "right"
  return {
    legendSide: legend.show === true && (position === "left" || position === "right") ? position : undefined,
    labels: seriesOrder,
    showLabels: (props.showLabels ?? true) as BumpLabelLayoutInput["showLabels"],
    width,
    showAxes,
    rankCount: seriesOrder.length,
    yLabel: typeof yLabel === "string" ? yLabel : "Rank",
    fontSize: typeof labelStyle === "object" && typeof labelStyle?.fontSize === "number" ? labelStyle.fontSize : 12,
  }
}

/**
 * The static Bump contract is intentionally isolated from the general XY
 * configurations: it ranks data, builds custom layout input, and owns its
 * endpoint-label controls before the common frame renderer sees the result.
 */
export const bumpChart: ChartConfig = {
  frameType: "xy",
  layout: {
    // BumpChart draws its rank grid by default in the browser too.
    modeDefaults: { showGrid: true },
    // Endpoint labels reserve room from their text, as in the browser.
    margin: (props, resolved) => {
      const { seriesOrder } = rankBumpData(bumpRows(props.data), bumpRankOptions(props))
      return resolveBumpLabelLayout(
        bumpLabelInput(seriesOrder, props, resolved.width, resolved.showAxes, props.yLabel, {
          show: props.showLegend,
          position: props.legendPosition,
        })
      ).margin
    },
  },
  buildProps: (data, _colorBy, colorScheme, common, rest) => {
    const ranked = rankBumpData(bumpRows(data), bumpRankOptions(rest))
    const [width] = (common.size as [number, number] | undefined) ?? [600, 400]
    const labelLayout = resolveBumpLabelLayout(
      bumpLabelInput(ranked.seriesOrder, rest, width, common.showAxes !== false, common.yLabel, {
        show: common.showLegend,
        position: common.legendPosition,
      })
    )
    // Labeled sides the caller did not pin keep the label room, including
    // when a hidden axis zeroed that side's default.
    const pinned = new Set(Array.isArray(common.__explicitMarginSides) ? common.__explicitMarginSides : [])
    const baseMargin = common.margin as MarginType
    const margin: MarginType = {
      ...baseMargin,
      ...(labelLayout.hasEnd && !pinned.has("right") && { right: Math.max(baseMargin.right, labelLayout.margin.right) }),
      ...(labelLayout.hasStart && !pinned.has("left") && { left: Math.max(baseMargin.left, labelLayout.margin.left) }),
    }
    const labelSpace = resolveBumpLabelSpace(margin, labelLayout)
    const legendPosition = (common.legendPosition as string | undefined) ?? "right"
    const legendLayout = common.legendLayout as { sideGutter?: number } | undefined
    const legendSideGutter = common.showLegend === true && (legendPosition === "left" || legendPosition === "right")
      ? labelSpace.sideGutter[legendPosition]
      : undefined
    const maxRank = Math.max(1, ranked.seriesOrder.length)
    const resolvedTheme = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0])
    const resolvedColorScheme = resolveBumpColorScheme({
      seriesOrder: ranked.seriesOrder,
      overallOrder: ranked.overallOrder,
      highlightTop: normalizeBumpCount(rest.highlightTop),
      color: normalizeBumpColor(rest.color),
      colorScheme,
      neutralColor: normalizeBumpColor(rest.neutralColor),
      themeCategorical: resolvedTheme.colors.categorical,
      themeNeutral: resolvedTheme.colors.textSecondary,
    })
    const layoutConfig: BumpLayoutConfig = {
      ribbon: rest.ribbon === true,
      curve: rest.curve === "linear" ? "linear" : "smooth",
      samplesPerSegment: typeof rest.samplesPerSegment === "number" ? rest.samplesPerSegment : 12,
      ribbonSizeRange: Array.isArray(rest.ribbonSizeRange)
        ? rest.ribbonSizeRange as [number, number]
        : [4, 28],
      valueExtent: ranked.valueExtent,
      seriesOrder: ranked.seriesOrder,
      lineWidth: typeof rest.lineWidth === "number" ? rest.lineWidth : 3,
      ribbonOpacity: typeof rest.ribbonOpacity === "number" ? rest.ribbonOpacity : 0.82,
      lineOpacity: typeof rest.lineOpacity === "number" ? rest.lineOpacity : 0.9,
      neutralColor: normalizeBumpColor(rest.neutralColor),
      color: normalizeBumpColor(rest.color),
      colorMap: resolvedColorScheme && typeof resolvedColorScheme === "object" && !Array.isArray(resolvedColorScheme)
        ? resolvedColorScheme
        : undefined,
      stroke: typeof rest.stroke === "string" ? rest.stroke : undefined,
      strokeWidth: typeof rest.strokeWidth === "number" ? rest.strokeWidth : undefined,
      opacity: typeof rest.opacity === "number" ? rest.opacity : undefined,
      styleRules: rest.styleRules as BumpLayoutConfig["styleRules"],
      areaStyle: common.areaStyle as BumpLayoutConfig["areaStyle"],
      pointStyle: common.pointStyle as BumpLayoutConfig["pointStyle"],
      labelStyle: rest.labelStyle as BumpLayoutConfig["labelStyle"],
      showPoints: rest.showPoints === true,
      pointRadius: typeof rest.pointRadius === "number" ? rest.pointRadius : 3,
      showLabels: (rest.showLabels ?? true) as BumpLayoutConfig["showLabels"],
      labelPriorityAccessor: rest.labelPriorityAccessor as BumpLayoutConfig["labelPriorityAccessor"],
      maxLabels: typeof rest.maxLabels === "number" ? rest.maxLabels : undefined,
      startLabelOffset: labelLayout.startLabelOffset,
      labelBudget: labelSpace.budget,
      labelFontSize: labelLayout.fontSize,
    }
    const formatX = createBumpXFormatter(ranked.xValues, common.xFormat as AxisConfig["xFormat"])
    const xTickValues = ranked.xValues.map((_, index) => index)
    const yTickValues = Array.from({ length: maxRank }, (_, index) => index + 1)
    const axes = common.axes ?? [
      {
        orient: "left",
        tickValues: yTickValues,
        tickFormat: (value: string | number | Date) => String(value),
        label: common.yLabel ?? "Rank",
        baseline: false,
      },
      {
        orient: "bottom",
        tickValues: xTickValues,
        tickFormat: formatX,
        label: common.xLabel,
        tickAnchor: "edges",
      },
    ]

    return {
      ...common,
      margin,
      ...(legendSideGutter != null && legendLayout?.sideGutter == null && {
        legendLayout: { ...legendLayout, sideGutter: legendSideGutter },
      }),
      chartType: "custom",
      data: ranked.data,
      xAccessor: "x",
      yAccessor: "y",
      xExtent: [0, Math.max(1, ranked.xValues.length - 1)],
      yExtent: [maxRank + 0.5, 0.5],
      customLayout: bumpLayout,
      layoutConfig,
      colorAccessor: "__bumpSeries",
      colorScheme: resolvedColorScheme,
      xFormat: formatX,
      axes,
      axisExtent: "exact",
      showAxes: common.showAxes ?? true,
      showLegend: common.showLegend ?? false,
      annotations: mapBumpAnnotations(common.annotations as Datum[] | undefined, ranked.xValues),
    }
  },
}
