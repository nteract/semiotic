import type { Datum } from "../charts/shared/datumTypes"
import { DEFAULT_COLORS } from "../charts/shared/colorUtils"
import { type ChartConfig } from "./serverChartConfigShared"

const MA_UNITIZED = "__ma_unitized"
const MA_SERIES = "__ma_series"

function multiAxisExtent(data: Datum[], accessor: string | ((d: Datum) => number) | undefined): [number, number] {
  const fn = typeof accessor === "function" ? accessor : (d: Datum) => Number(d[accessor || "y"])
  let min = Infinity
  let max = -Infinity
  for (const d of data) {
    const v = fn(d)
    if (typeof v === "number" && Number.isFinite(v)) {
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1
    return [min - pad, max + pad]
  }
  return [min, max]
}

export const multiAxisLineChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, colorScheme, common, rest) => {
    const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
    const series = Array.isArray(rest.series) ? rest.series as Array<{
      yAccessor?: string | ((d: Datum) => number)
      label?: string
      color?: string
      format?: (d: number) => string
      extent?: [number, number]
    }> : []
    const palette = Array.isArray(colorScheme) ? colorScheme as string[] : [...DEFAULT_COLORS]
    const seriesColorScheme = series.some((s) => typeof s.color === "string")
      ? series.map((s, i) => s.color || palette[i % palette.length])
      : colorScheme
    const isDual = series.length === 2
    const extents = series.map((s) => s.extent || multiAxisExtent(rows, s.yAccessor))
    const unitized: Datum[] = []
    for (const d of rows) {
      series.forEach((s, i) => {
        const fn = typeof s.yAccessor === "function" ? s.yAccessor : (row: Datum) => row[s.yAccessor as string]
        const val = fn(d)
        if (val == null || !Number.isFinite(Number(val))) return
        const numeric = Number(val)
        const extent = extents[i]
        const range = extent[1] - extent[0] || 1
        unitized.push({
          ...d,
          [MA_UNITIZED]: isDual ? (numeric - extent[0]) / range : numeric,
          [MA_SERIES]: s.label || `Series ${i + 1}`,
        })
      })
    }
    const formatAxisTick = (extent: [number, number], format?: (d: number) => string) =>
      (v: number) => {
        const orig = extent[0] + v * (extent[1] - extent[0])
        if (typeof format === "function") return format(orig)
        return Number.isInteger(orig) ? String(orig) : orig.toFixed(1)
      }
    const axes = isDual
      ? [
          {
            orient: "left" as const,
            label: series[0].label,
            tickFormat: formatAxisTick(extents[0], series[0].format),
          },
          {
            orient: "right" as const,
            label: series[1].label,
            tickFormat: formatAxisTick(extents[1], series[1].format),
          },
          { orient: "bottom" as const },
        ]
      : undefined
    return {
      chartType: "line",
      data: unitized,
      xAccessor: rest.xAccessor || "x",
      yAccessor: MA_UNITIZED,
      groupAccessor: MA_SERIES,
      colorAccessor: MA_SERIES,
      colorScheme: seriesColorScheme,
      ...(axes && { axes }),
      ...(isDual && { yExtent: [0, 1] as [number, number] }),
      ...common,
      // HOC defaults; `...common` last would otherwise drop them when omitted.
      curve: rest.curve || common.curve || "monotoneX",
      showLegend: common.showLegend ?? true,
    }
  },
}

export const waterfallChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const rows = Array.isArray(data) ? data.filter((d): d is Datum => !!d && typeof d === "object") : []
    const xAcc = rest.xAccessor || "x"
    const readX = typeof xAcc === "function" ? xAcc as (d: Datum) => unknown : (d: Datum) => d[xAcc as string]
    const needsIndex = rows.some((d) => {
      const raw = readX(d)
      return !(typeof raw === "number" && Number.isFinite(raw)) && !(raw instanceof Date)
    })
    const plotData = needsIndex
      ? rows.map((d, i) => ({ ...d, __waterfallX: i, __waterfallTick: String(readX(d) ?? i) }))
      : rows
    return {
      chartType: "waterfall",
      data: plotData,
      xAccessor: needsIndex ? "__waterfallX" : xAcc,
      yAccessor: rest.yAccessor || "y",
      waterfallStyle: {
        positiveColor: rest.positiveColor,
        negativeColor: rest.negativeColor,
        connectorStroke: rest.connectorStroke,
        connectorWidth: rest.connectorWidth,
        gap: rest.gap,
        stroke: rest.stroke,
        strokeWidth: rest.strokeWidth,
        opacity: rest.opacity,
      },
      ...common,
      ...(needsIndex && {
        xFormat: (v: number) => {
          const original = rows[Number(v)] ? readX(rows[Number(v)]) : v
          const fmt = rest.xFormat ?? common.xFormat
          return typeof fmt === "function" ? fmt(original) : String(original ?? v)
        },
      }),
    }
  },
}
