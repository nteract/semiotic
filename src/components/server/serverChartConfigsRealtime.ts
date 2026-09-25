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
import { heatmap } from "./serverChartConfigHeatmap"
import { waterfallChart } from "./serverChartConfigsXYExtra"
import { realtimeCategoryColors } from "./serverRealtimeCategoryColors"

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
    const ruledLineStyle = composeStyleRules(
      () => ({ stroke: "#007bff", strokeWidth: 2 }),
      rest.styleRules as StyleRule[] | undefined,
      makeXYRuleContext(accessors.timeAccessor, accessors.valueAccessor)
    )
    return {
      chartType: "line",
      data: rows,
      ...common,
      ...realtimeFrameProps(rows, common, rest),
      ...accessors,
      groupAccessor:
        aggregate && rest.seriesAccessor != null
          ? AGG_SERIES
          : rest.seriesAccessor,
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
        ((datum: Datum) => ({
          ...ruledLineStyle(datum),
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
      return {
        ...temporalHistogram.buildProps(
          rows,
          colorBy,
          colorScheme,
          common,
          rest
        ),
        ...realtimeFrameProps(rows, common, rest)
      }
    }
  } satisfies Pick<ChartConfig, "buildProps">
)

export const realtimeHeatmap: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const rows = Array.isArray(data) ? filterSparseArray(data) : []
    const mapped = heatmap.buildProps(rows, colorBy, colorScheme, common, {
      ...rest,
      xAccessor: rest.timeAccessor || rest.xAccessor || "time",
      yAccessor: rest.valueAccessor || rest.yAccessor || "value",
      heatmapAggregation: rest.aggregation ?? "count",
      cellBorderWidth: 0
    })
    return {
      ...mapped,
      ...realtimeFrameProps(rows, common, rest),
      categoryAccessor: rest.categoryAccessor
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
