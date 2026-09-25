import type { CoercibleNumber } from "../../stream/accessorUtils"
import { parseDateLikeString } from "../shared/temporalStrings"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"

/** Resolve authored numeric values without treating missing cells as zero. */
export function readRealtimeNumber<TDatum extends Datum>(
  datum: Datum,
  accessor: ChartAccessor<TDatum, number> | undefined,
  fallback: string
): number | null {
  const raw: unknown = typeof accessor === "function"
    ? accessor(datum as TDatum)
    : datum[String(accessor ?? fallback)]
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/** Preserve date identity for the frame's temporal detection while rejecting missing times. */
export function readRealtimeTime<TDatum extends Datum>(
  datum: Datum,
  accessor: ChartAccessor<TDatum, CoercibleNumber> | undefined,
  fallback: string
): number | Date | null {
  const raw: unknown = typeof accessor === "function"
    ? accessor(datum as TDatum)
    : datum[String(accessor ?? fallback)]
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) return null
  if (raw instanceof Date) return Number.isFinite(raw.getTime()) ? raw : null
  if (typeof raw === "string") {
    const parsed = parseDateLikeString(raw)
    if (Number.isFinite(parsed)) return new Date(parsed)
  }
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}
