import type { AxisConfig, ChartAccessor } from "../shared/types"
import type { Datum } from "../shared/datumTypes"
import { resolveDefaultFill } from "../shared/hooks"
import { resolveCategoricalPalette } from "../shared/colorUtils"
import { bumpXIdentity } from "./bumpIdentity"
import { formatDateMonthDay, makeDateTickFormatter } from "../../stream/xyDateTicks"

const OTHER_COLOR_GROUP = "Other"

/**
 * Axis and tooltip formatter over BumpChart's index-based x scale: maps a tick
 * position to its authored x value. When every x value is a number or Date,
 * index-aware formatters such as `adaptiveTimeTicks` also receive the
 * rendered ticks as authored epoch values.
 */
export function createBumpXFormatter(
  xValues: readonly unknown[],
  xFormat: AxisConfig["xFormat"] | undefined
): NonNullable<AxisConfig["xFormat"]> {
  const rawAt = (value: number | Date | string) =>
    xValues[Math.max(0, Math.min(xValues.length - 1, Math.round(Number(value))))] as number | Date | string
  const temporal = xValues.every((value) => typeof value === "number" || value instanceof Date)
  const formatDate = xFormat ? undefined : bumpDateFormatter(xValues)
  return (value, index, allTicks) => {
    if (xValues.length === 0) return ""
    const raw = rawAt(value)
    if (!xFormat) return raw instanceof Date && formatDate ? formatDate(raw) : String(raw)
    return xFormat(raw, index, allTicks && temporal ? allTicks.map((tick) => Number(rawAt(tick).valueOf())) : undefined)
  }
}

/**
 * Default label for Date x values, in UTC so the browser and renderChart
 * agree whatever the machine's locale or time zone. The periods' alignment
 * picks the detail: `2024` when every period starts a year, `Mar 2024` a
 * month, `Mar 1` a day (`Mar 1, 2024` when the periods span years),
 * otherwise the span-based labels other XY date axes use.
 */
function bumpDateFormatter(xValues: readonly unknown[]): ((value: Date) => string) | undefined {
  const dates = xValues.filter((value): value is Date => value instanceof Date && Number.isFinite(value.valueOf()))
  if (dates.length === 0) return undefined
  const midnight = dates.every((d) => d.valueOf() % 864e5 === 0)
  const monthStart = midnight && dates.every((d) => d.getUTCDate() === 1)
  if (monthStart && dates.every((d) => d.getUTCMonth() === 0)) return (d) => String(d.getUTCFullYear())
  if (monthStart) return (d) => `${formatDateMonthDay(d).split(" ")[0]} ${d.getUTCFullYear()}`
  const times = dates.map((d) => d.valueOf())
  const domain: [number, number] = [Math.min(...times), Math.max(...times)]
  if (midnight) {
    const oneYear = new Date(domain[0]).getUTCFullYear() === new Date(domain[1]).getUTCFullYear()
    return (d) => oneYear ? formatDateMonthDay(d) : `${formatDateMonthDay(d)}, ${d.getUTCFullYear()}`
  }
  return makeDateTickFormatter(domain)
}

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

/** A non-negative whole count from a number or numeric string (`highlightTop`), else undefined. */
export function normalizeBumpCount(value: unknown): number | undefined {
  const n = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : undefined
}

/** A non-empty color string, else undefined. */
export function normalizeBumpColor(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined
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
  // A named scheme is an explicit choice here, not a prop default, so resolve
  // it to its palette: highlighted series take its colors over the theme's.
  const palette = typeof colorScheme === "string"
    ? [...resolveCategoricalPalette(colorScheme, themeCategorical)]
    : colorScheme

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
        ? resolveDefaultFill(undefined, themeCategorical, palette, series, categoryIndexMap)
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
