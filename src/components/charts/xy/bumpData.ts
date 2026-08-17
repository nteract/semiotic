import type { ChartAccessor } from "../shared/types"
import type { Datum } from "../shared/datumTypes"
import { resolveDefaultFill } from "../shared/hooks"
import { bumpXIdentity } from "./bumpIdentity"

const OTHER_COLOR_GROUP = "Other"

export interface RankedBumpDatum<TDatum extends Datum = Datum> extends Datum {
  x: number
  y: number
  __bumpRaw: TDatum
  __bumpSeries: string
  __bumpColorGroup: string
  __bumpValue: number
  __bumpRank: number
  __bumpXValue: unknown
  __bumpHighlighted: boolean
}

export interface RankedBumpData<TDatum extends Datum = Datum> {
  data: RankedBumpDatum<TDatum>[]
  xValues: unknown[]
  seriesOrder: string[]
  overallOrder: string[]
  valueExtent: [number, number]
}

export interface RankBumpDataOptions<TDatum extends Datum = Datum> {
  xAccessor?: ChartAccessor<TDatum, number | Date | string>
  yAccessor?: ChartAccessor<TDatum, number>
  lineBy?: ChartAccessor<TDatum, string>
  rankDirection?: "descending" | "ascending"
  highlightTop?: number
}

function accessorValue<TDatum extends Datum, TValue>(
  accessor: ChartAccessor<TDatum, TValue>,
  datum: TDatum,
  index: number,
): TValue {
  return typeof accessor === "function"
    ? accessor(datum, index)
    : datum[accessor] as TValue
}

export function mapBumpAnnotations(
  annotations: Datum[] | undefined,
  xValues: unknown[],
): Datum[] | undefined {
  if (!annotations?.length) return undefined
  const xIndexByKey = new Map(
    xValues.map((value, index) => [bumpXIdentity(value), index]),
  )
  return annotations.map(annotation => {
    const mapped = { ...annotation }
    const mapField = (field: "x" | "x0" | "x1" | "value") => {
      if (!(field in annotation)) return
      const index = xIndexByKey.get(bumpXIdentity(annotation[field]))
      if (index !== undefined) mapped[field] = index
    }
    mapField("x")
    mapField("x0")
    mapField("x1")
    if (
      typeof annotation.type === "string"
      && (annotation.type === "x-threshold" || annotation.type === "x")
    ) {
      mapField("value")
    }
    return mapped
  })
}

export function resolveBumpColorScheme(options: {
  seriesOrder: string[]
  overallOrder: string[]
  highlightTop?: number
  color?: string
  colorScheme?: string | string[] | Record<string, string>
  neutralColor?: string
  themeCategorical?: string[]
  themeNeutral?: string
}): string | string[] | Record<string, string> | undefined {
  const {
    seriesOrder,
    overallOrder,
    highlightTop,
    color,
    colorScheme,
    neutralColor,
    themeCategorical,
    themeNeutral,
  } = options
  if (highlightTop == null && color == null) return colorScheme

  const topCount = highlightTop == null
    ? overallOrder.length
    : Math.max(0, Math.floor(highlightTop))
  const highlighted = new Set(overallOrder.slice(0, topCount))
  const categoryIndexMap = new Map<string, number>()
  const resolved: Record<string, string> = {}
  for (const series of seriesOrder) {
    Object.defineProperty(resolved, series, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: color ?? (highlighted.has(series)
        ? resolveDefaultFill(undefined, themeCategorical, colorScheme, series, categoryIndexMap)
        : neutralColor ?? themeNeutral ?? "#b8bec8"),
    })
  }
  return resolved
}

/**
 * Rank every x-column and return the flattened, frame-ready rows used by
 * BumpChart. Ranking is ordinal and deterministic: equal values retain series
 * first-appearance order.
 */
export function rankBumpData<TDatum extends Datum = Datum>(
  input: TDatum[],
  options: RankBumpDataOptions<TDatum> = {},
): RankedBumpData<TDatum> {
  const xAccessor = options.xAccessor ?? ("x" as ChartAccessor<TDatum, number | Date | string>)
  const yAccessor = options.yAccessor ?? ("y" as ChartAccessor<TDatum, number>)
  const lineBy = options.lineBy ?? ("series" as ChartAccessor<TDatum, string>)
  const rankDirection = options.rankDirection ?? "descending"

  const xValues: unknown[] = []
  const xIndexByKey = new Map<string, number>()
  const rowsByX = new Map<number, Array<{ datum: TDatum; inputIndex: number; series: string; value: number }>>()
  const seriesOrder: string[] = []
  const seriesIndex = new Map<string, number>()

  let valueMin = Infinity
  let valueMax = -Infinity

  input.forEach((datum, inputIndex) => {
    const xValue = accessorValue(xAccessor, datum, inputIndex)
    const key = bumpXIdentity(xValue)
    let xIndex = xIndexByKey.get(key)
    if (xIndex == null) {
      xIndex = xValues.length
      xIndexByKey.set(key, xIndex)
      xValues.push(xValue)
      rowsByX.set(xIndex, [])
    }

    const series = String(accessorValue(lineBy, datum, inputIndex))
    if (!seriesIndex.has(series)) {
      seriesIndex.set(series, seriesOrder.length)
      seriesOrder.push(series)
    }

    const value = Number(accessorValue(yAccessor, datum, inputIndex))
    if (!Number.isFinite(value)) return
    valueMin = Math.min(valueMin, value)
    valueMax = Math.max(valueMax, value)
    rowsByX.get(xIndex)?.push({ datum, inputIndex, series, value })
  })

  const rankedRows: Array<{
    datum: TDatum
    xIndex: number
    xValue: unknown
    series: string
    value: number
    rank: number
  }> = []
  const rankTotals = new Map<string, number>()
  const rankCounts = new Map<string, number>()

  for (let xIndex = 0; xIndex < xValues.length; xIndex++) {
    const rows = rowsByX.get(xIndex) ?? []
    rows.sort((a, b) => {
      const valueOrder = rankDirection === "descending"
        ? b.value - a.value
        : a.value - b.value
      return valueOrder || (seriesIndex.get(a.series) ?? 0) - (seriesIndex.get(b.series) ?? 0)
    })

    rows.forEach((row, rankIndex) => {
      const rank = rankIndex + 1
      rankedRows.push({
        datum: row.datum,
        xIndex,
        xValue: xValues[xIndex],
        series: row.series,
        value: row.value,
        rank,
      })
      rankTotals.set(row.series, (rankTotals.get(row.series) ?? 0) + rank)
      rankCounts.set(row.series, (rankCounts.get(row.series) ?? 0) + 1)
    })
  }

  const missingRank = seriesOrder.length + 1
  const overallOrder = [...seriesOrder].sort((a, b) => {
    const aCount = rankCounts.get(a) ?? 0
    const bCount = rankCounts.get(b) ?? 0
    const aAverage = ((rankTotals.get(a) ?? 0) + (xValues.length - aCount) * missingRank)
      / Math.max(1, xValues.length)
    const bAverage = ((rankTotals.get(b) ?? 0) + (xValues.length - bCount) * missingRank)
      / Math.max(1, xValues.length)
    return aAverage - bAverage
      || (seriesIndex.get(a) ?? 0) - (seriesIndex.get(b) ?? 0)
  })

  const topCount = options.highlightTop == null
    ? overallOrder.length
    : Math.max(0, Math.floor(options.highlightTop))
  const highlighted = new Set(overallOrder.slice(0, topCount))

  const data = rankedRows.map((row): RankedBumpDatum<TDatum> => {
    const isHighlighted = highlighted.has(row.series)
    return {
      ...row.datum,
      x: row.xIndex,
      y: row.rank,
      __bumpRaw: row.datum,
      __bumpSeries: row.series,
      __bumpColorGroup: isHighlighted ? row.series : OTHER_COLOR_GROUP,
      __bumpValue: row.value,
      __bumpRank: row.rank,
      __bumpXValue: row.xValue,
      __bumpHighlighted: isHighlighted,
    }
  })

  return {
    data,
    xValues,
    seriesOrder,
    overallOrder,
    valueExtent: valueMin === Infinity ? [0, 0] : [valueMin, valueMax],
  }
}
