import type { ChartConfig } from "./serverChartConfigShared"
import type { Datum } from "../charts/shared/datumTypes"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { primitiveStyleOverrides } from "./serverChartConfigShared"
import { readRealtimeNumber } from "../charts/realtime/realtimeAccessors"
import {
  createAccumulator,
  aggregatedRows,
  type AggregateConfig,
} from "../charts/realtime/aggregate"
import { temporalHistogram } from "./serverChartConfigsXY"
import { heatmap } from "./serverChartConfigHeatmap"
import { waterfallChart } from "./serverChartConfigsXYExtra"

function prepareRealtimeRows(data: unknown, rest: Datum): Datum[] {
  const rows = Array.isArray(data) ? filterSparseArray(data) : []
  const aggregate = rest.aggregate as AggregateConfig | undefined
  if (!aggregate) return rows
  const acc = createAccumulator(aggregate)
  if (!acc) return rows
  const timeAccessor = (rest.timeAccessor as string | undefined) || "time"
  const valueAccessor = (rest.valueAccessor as string | undefined) || "value"
  for (const row of rows) {
    const time = readRealtimeNumber(row, timeAccessor, "time")
    const value = readRealtimeNumber(row, valueAccessor, "value")
    if (time == null || value == null) continue
    acc.push(time, value)
  }
  return aggregatedRows(acc, aggregate)
}

function realtimeAccessors(rest: Datum) {
  const timeAccessor = rest.timeAccessor || "time"
  const valueAccessor = rest.valueAccessor || "value"
  return {
    timeAccessor: (datum: Datum) => readRealtimeNumber(datum, timeAccessor, "time") ?? NaN,
    valueAccessor: (datum: Datum) => readRealtimeNumber(datum, valueAccessor, "value") ?? NaN,
  }
}

export const realtimeLineChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const rows = prepareRealtimeRows(data, rest)
    const accessors = rest.aggregate ? { timeAccessor: "time", valueAccessor: "value" } : realtimeAccessors(rest)
    return {
      chartType: "line",
      data: rows,
      ...common,
      runtimeMode: "streaming",
      windowMode: rest.windowMode ?? rest.capacityMode ?? "growing",
      windowSize: rest.windowSize ?? rest.capacity ?? Math.max(1, rows.length),
      arrowOfTime: rest.arrowOfTime || "right",
      ...accessors,
      groupAccessor: rest.seriesAccessor,
      xExtent: rest.timeExtent || common.xExtent,
      yExtent: rest.valueExtent || common.yExtent,
      extentPadding: rest.extentPadding ?? common.extentPadding,
      lineStyle: common.lineStyle || {
        ...primitiveStyleOverrides(rest),
        stroke: rest.stroke,
        strokeWidth: rest.strokeWidth,
        strokeDasharray: rest.strokeDasharray,
      },
    }
  },
}

export const realtimeHistogram: ChartConfig = {
  ...temporalHistogram,
}

export const realtimeHeatmap: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const rows = prepareRealtimeRows(data, rest)
    const mapped = heatmap.buildProps(rows, colorBy, colorScheme, common, {
      ...rest,
      xAccessor: rest.timeAccessor || rest.xAccessor || "time",
      yAccessor: rest.valueAccessor || rest.yAccessor || "value",
    })
    return {
      ...mapped,
      runtimeMode: "streaming",
      timeAccessor: rest.timeAccessor || "time",
      valueAccessor: rest.valueAccessor || "value",
    }
  },
}

export const realtimeSwarmChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, colorScheme, common, rest) => {
    const rows = prepareRealtimeRows(data, rest)
    return {
      chartType: "swarm",
      data: rows,
      ...common,
      runtimeMode: "streaming",
      windowMode: rest.windowMode ?? rest.capacityMode ?? "growing",
      windowSize: rest.windowSize ?? rest.capacity ?? Math.max(1, rows.length),
      arrowOfTime: rest.arrowOfTime || "right",
      ...realtimeAccessors(rest),
      categoryAccessor: rest.categoryAccessor,
      colorScheme: rest.colors || colorScheme || common.colorScheme,
      xExtent: rest.timeExtent || common.xExtent,
      yExtent: rest.valueExtent || common.yExtent,
    }
  },
}

export const realtimeWaterfallChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const rows = prepareRealtimeRows(data, rest)
    return waterfallChart.buildProps(rows, colorBy, colorScheme, common, {
      ...rest,
      xAccessor: rest.timeAccessor || rest.xAccessor || "time",
      yAccessor: rest.valueAccessor || rest.yAccessor || "value",
    })
  },
}
