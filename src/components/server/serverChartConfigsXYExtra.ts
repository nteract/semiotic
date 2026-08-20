import type { Datum } from "../charts/shared/datumTypes"
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
      extent?: [number, number]
    }> : []
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
    const axes = isDual
      ? [
          {
            orient: "left" as const,
            label: series[0].label,
            tickFormat: (v: number) => {
              const orig = extents[0][0] + v * (extents[0][1] - extents[0][0])
              return Number.isInteger(orig) ? String(orig) : orig.toFixed(1)
            },
          },
          {
            orient: "right" as const,
            label: series[1].label,
            tickFormat: (v: number) => {
              const orig = extents[1][0] + v * (extents[1][1] - extents[1][0])
              return Number.isInteger(orig) ? String(orig) : orig.toFixed(1)
            },
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
      colorScheme,
      ...(axes && { axes }),
      ...common,
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
      ...(needsIndex && {
        xFormat: (v: number) => String(rows[Number(v)] ? readX(rows[Number(v)]) : v),
      }),
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
    }
  },
}
