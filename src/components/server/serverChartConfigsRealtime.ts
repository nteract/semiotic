import type { ChartConfig } from "./serverChartConfigShared"
import type { Datum } from "../charts/shared/datumTypes"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { primitiveStyleOverrides } from "./serverChartConfigShared"
import { readRealtimeNumber, readRealtimeTime } from "../charts/realtime/realtimeAccessors"
import {
  RealtimeAccumulator,
  AGG_SERIES
} from "../charts/realtime/RealtimeAccumulator"
import { resolveRealtimeWindowSize } from "../charts/realtime/resolveWindowSize"
import {
  composeStyleRules,
  makeXYRuleContext,
  type StyleRule
} from "../charts/shared/styleRules"
import {
  AGG_LOWER,
  AGG_UPPER,
  hasBand,
  type AggregateConfig
} from "../charts/realtime/aggregate"
import { temporalHistogram } from "./serverChartConfigsXY"
import { heatmap, heatmapGradientLegend } from "./serverChartConfigHeatmap"
import { resolveTheme } from "./themeResolver"
import { waterfallChart } from "./serverChartConfigsXYExtra"
import { realtimeCategoryColors } from "./serverRealtimeCategoryColors"
import { resolveStringAccessor } from "../stream/accessorUtils"

function prepareRealtimeRows(data: unknown, rest: Datum): Datum[] {
  const rows = Array.isArray(data) ? filterSparseArray(data) : []
  const aggregate = rest.aggregate as AggregateConfig | undefined
  if (!aggregate) return rows
  const acc = new RealtimeAccumulator(aggregate, rest.seriesAccessor)
  for (const row of rows) {
    acc.push(row, rest.timeAccessor, rest.valueAccessor)
  }
  return acc.emit(aggregate)
}

function realtimeAccessors(rest: Datum) {
  const timeAccessor = rest.timeAccessor || "time"
  const valueAccessor = rest.valueAccessor || "value"
  return {
    timeAccessor: (datum: Datum) =>
      readRealtimeTime(datum, timeAccessor, "time") ?? NaN,
    valueAccessor: (datum: Datum) =>
      readRealtimeNumber(datum, valueAccessor, "value") ?? NaN
  }
}

function realtimeFrameProps(rows: Datum[], common: Datum, rest: Datum): Datum {
  return {
    runtimeMode: "streaming",
    windowMode: rest.windowMode ?? rest.capacityMode ?? "sliding",
    windowSize: resolveRealtimeWindowSize(rest.windowSize, rows, rest.capacity),
    arrowOfTime: rest.arrowOfTime ?? "right",
    ...realtimeAccessors(rest),
    xExtent: rest.timeExtent ?? common.xExtent,
    yExtent: rest.valueExtent ?? common.yExtent,
    extentPadding: rest.extentPadding ?? common.extentPadding,
    tickFormatTime: rest.tickFormatTime,
    tickFormatValue: rest.tickFormatValue
  }
}

export const realtimeLineChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const rows = prepareRealtimeRows(data, rest)
    const aggregate = rest.aggregate as AggregateConfig | undefined
    const accessors = rest.aggregate
      ? { timeAccessor: "time", valueAccessor: "value" }
      : realtimeAccessors(rest)
    const groupAccessor =
      aggregate && rest.seriesAccessor != null
        ? AGG_SERIES
        : rest.seriesAccessor
    // Mirror the client: one palette colour per series (unless an explicit
    // `stroke` paints them all) and an automatic series legend.
    const seriesColors = realtimeCategoryColors(
      rows,
      common,
      { categoryAccessor: groupAccessor },
      "discovery"
    )
    const readSeries = resolveStringAccessor(groupAccessor)
    const ruledLineStyle = composeStyleRules(
      (datum: Datum, group?: string) => ({
        stroke:
          (seriesColors &&
            seriesColors[group ?? readSeries?.(datum) ?? ""]) ||
          "#007bff",
        strokeWidth: 2
      }),
      rest.styleRules as StyleRule[] | undefined,
      makeXYRuleContext(accessors.timeAccessor, accessors.valueAccessor)
    )
    return {
      chartType: "line",
      data: rows,
      ...common,
      ...realtimeFrameProps(rows, common, rest),
      ...accessors,
      groupAccessor,
      ...(seriesColors && {
        colorAccessor: groupAccessor,
        colorScheme:
          typeof rest.stroke === "string"
            ? Object.fromEntries(
                Object.keys(seriesColors).map((key) => [key, rest.stroke])
              )
            : seriesColors,
        showLegend: common.showLegend ?? true
      }),
      ...(aggregate && {
        windowMode: "growing",
        windowSize: Math.max(1, aggregate.retain ?? Math.max(rows.length, 600)),
        band: hasBand(aggregate)
          ? {
              y0Accessor: AGG_LOWER,
              y1Accessor: AGG_UPPER,
              perSeries: rest.seriesAccessor != null
            }
          : undefined
      }),
      lineStyle:
        common.lineStyle ||
        ((datum: Datum, group?: string) => ({
          ...ruledLineStyle(datum, group),
          ...primitiveStyleOverrides(rest),
          ...(rest.strokeDasharray != null && {
            strokeDasharray: rest.strokeDasharray
          }),
          ...(rest.cursor != null && { cursor: rest.cursor })
        }))
    }
  }
}

// This copies a plain config without side effects; unused SSR catalogs can drop it.
export const realtimeHistogram: ChartConfig = /* @__PURE__ */ Object.assign(
  {},
  temporalHistogram,
  {
    buildProps: (data, colorBy, colorScheme, common, rest) => {
      const rows = Array.isArray(data) ? filterSparseArray(data) : []
      const mapped = temporalHistogram.buildProps(
        rows,
        colorBy,
        colorScheme,
        common,
        rest
      )
      return {
        ...mapped,
        ...realtimeFrameProps(rows, common, rest),
        // Histogram aggregation owns the measure: count mode ignores values.
        valueAccessor: mapped.valueAccessor
      }
    }
  } satisfies Pick<ChartConfig, "buildProps">
)

export const realtimeHeatmap: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const rows = Array.isArray(data) ? filterSparseArray(data) : []
    const theme = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0])
    const aggregation = rest.aggregation ?? "count"
    const mapped = heatmap.buildProps(rows, colorBy, colorScheme, common, {
      ...rest,
      xAccessor: rest.timeAccessor || rest.xAccessor || "time",
      yAccessor: rest.valueAccessor || rest.yAccessor || "value",
      heatmapAggregation: aggregation,
      // The canvas paints a 1px surface-coloured separator around each cell.
      cellBorderColor: theme.colors.surface || theme.colors.background,
      cellBorderWidth: 1
    })
    return {
      ...mapped,
      ...realtimeFrameProps(rows, common, rest),
      categoryAccessor: rest.categoryAccessor,
      // Like the client, the legend is sized before data reports a domain;
      // the renderer then reads it from the drawn cells.
      ...(common.showLegend && {
        legend: heatmapGradientLegend({
          domain: [0, 1],
          label: aggregation,
          colorScheme: mapped.colorScheme,
          colorScale: mapped.heatmapColorScale
        })
      })
    }
  }
}

export const realtimeSwarmChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, colorScheme, common, rest) => {
    const rows = Array.isArray(data) ? filterSparseArray(data) : []
    const colors = realtimeCategoryColors(rows, common, rest, "discovery")
    const ruledPointStyle = composeStyleRules(
      undefined,
      rest.styleRules as StyleRule[] | undefined,
      makeXYRuleContext(
        rest.timeAccessor ?? "time",
        rest.valueAccessor ?? "value"
      )
    )
    return {
      chartType: "swarm",
      data: rows,
      ...common,
      ...realtimeFrameProps(rows, common, rest),
      categoryAccessor: rest.categoryAccessor,
      colorScheme: colors || colorScheme || common.colorScheme,
      barColors: colors,
      yScaleType: rest.yScaleType,
      swarmStyle: {
        ...primitiveStyleOverrides(rest),
        fill: rest.fill,
        radius: rest.radius,
        cursor: rest.cursor
      },
      pointStyle: (datum: Datum) => ({
        ...ruledPointStyle(datum),
        ...(typeof rest.pointStyle === "function"
          ? rest.pointStyle(datum)
          : {}),
        ...(typeof common.pointStyle === "function"
          ? common.pointStyle(datum)
          : common.pointStyle)
      })
    }
  }
}

export const realtimeWaterfallChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const rows = Array.isArray(data) ? filterSparseArray(data) : []
    const mapped = waterfallChart.buildProps(
      rows,
      colorBy,
      colorScheme,
      common,
      {
        ...rest,
        xAccessor: rest.timeAccessor || rest.xAccessor || "time",
        yAccessor: rest.valueAccessor || rest.yAccessor || "value"
      }
    )
    return {
      ...mapped,
      ...realtimeFrameProps(rows, common, rest),
      waterfallStyle: { ...mapped.waterfallStyle, cursor: rest.cursor }
    }
  }
}
