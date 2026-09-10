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
