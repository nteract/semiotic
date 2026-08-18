import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import {
  mapBumpAnnotations,
  rankBumpData,
  resolveBumpColorScheme,
} from "../charts/xy/bumpData"
import {
  bumpLayout,
  type BumpLayoutConfig,
} from "../charts/xy/bumpLayout"
import type { ChartConfig } from "./serverChartConfigShared"
import { resolveTheme } from "./themeResolver"

/**
 * The static Bump contract is intentionally isolated from the general XY
 * configurations: it ranks data, builds custom layout input, and owns its
 * endpoint-label controls before the common frame renderer sees the result.
 */
export const bumpChart: ChartConfig = {
  frameType: "xy",
  layout: {
    margin: (props) => ({
      top: 20,
      right: props.showLabels === false ? 24 : 110,
      bottom: 48,
      left: 48,
    }),
  },
  buildProps: (data, _colorBy, colorScheme, common, rest) => {
    const rows = Array.isArray(data)
      ? data.filter((datum): datum is Datum => !!datum && typeof datum === "object")
      : []
    const ranked = rankBumpData(rows, {
      xAccessor: rest.xAccessor as string | ((datum: Datum, index?: number) => number | Date | string) | undefined,
      yAccessor: rest.yAccessor as string | ((datum: Datum, index?: number) => number) | undefined,
      lineBy: rest.lineBy as string | ((datum: Datum, index?: number) => string) | undefined,
      rankDirection: rest.rankDirection as "descending" | "ascending" | undefined,
      highlightTop: typeof rest.highlightTop === "number" ? rest.highlightTop : undefined,
    })
    const maxRank = Math.max(1, ranked.seriesOrder.length)
    const resolvedTheme = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0])
    const resolvedColorScheme = resolveBumpColorScheme({
      seriesOrder: ranked.seriesOrder,
      overallOrder: ranked.overallOrder,
      highlightTop: typeof rest.highlightTop === "number" ? rest.highlightTop : undefined,
      color: typeof rest.color === "string" ? rest.color : undefined,
      colorScheme,
      neutralColor: typeof rest.neutralColor === "string" ? rest.neutralColor : undefined,
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
      neutralColor: typeof rest.neutralColor === "string" ? rest.neutralColor : undefined,
      color: typeof rest.color === "string" ? rest.color : undefined,
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
    }
    const userXFormat = common.xFormat as ((value: number | Date | string, index?: number) => React.ReactNode) | undefined
    const formatX = (value: number | Date | string, index?: number) => {
      if (ranked.xValues.length === 0) return ""
      const numericIndex = Math.max(0, Math.min(ranked.xValues.length - 1, Math.round(Number(value))))
      const raw = ranked.xValues[numericIndex] as number | Date | string
      return userXFormat
        ? userXFormat(raw, index)
        : String(raw instanceof Date ? raw.toLocaleDateString() : raw)
    }
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
