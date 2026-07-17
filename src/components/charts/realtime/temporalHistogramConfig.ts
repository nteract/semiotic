import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"

function readNumericValue<TDatum extends Datum>(
  datum: TDatum,
  accessor: ChartAccessor<TDatum, number> | undefined,
  fallback: string,
): number | null {
  const raw: unknown = typeof accessor === "function"
    ? accessor(datum)
    : datum[(accessor ?? fallback) as keyof TDatum]
  if (raw == null) return null
  if (raw instanceof Date) return raw.getTime()
  if (typeof raw === "string" && raw.trim() === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/** Resolve the reversed value domain used by downward temporal histograms. */
export function resolveDownwardHistogramExtent<TDatum extends Datum>({
  data,
  valueAccessor,
  timeAccessor,
  binSize,
  valueExtent,
  extentPadding,
}: {
  data: readonly TDatum[] | undefined
  valueAccessor: ChartAccessor<TDatum, number> | undefined
  timeAccessor: ChartAccessor<TDatum, number> | undefined
  binSize: number
  valueExtent: [number, number] | undefined
  extentPadding: number | undefined
}): [number, number] | undefined {
  if (valueExtent) return [valueExtent[1], valueExtent[0]]
  if (!data || data.length === 0) return undefined

  // Multiple points can land in one bin, so the visible bar domain is based
  // on bin sums in both stacked and unstacked modes.
  const binSums = new Map<number, number>()
  for (const datum of data) {
    const time = readNumericValue(datum, timeAccessor, "time")
    const value = readNumericValue(datum, valueAccessor, "value")
    if (time == null || value == null) continue
    const binStart = Math.floor(time / binSize) * binSize
    binSums.set(binStart, (binSums.get(binStart) ?? 0) + value)
  }
  let maxValue = 0
  for (const sum of binSums.values()) maxValue = Math.max(maxValue, sum)

  const padFactor = extentPadding ?? 0.1
  const upper = maxValue > 0 ? maxValue + maxValue * padFactor : 1
  return [upper, 0]
}
