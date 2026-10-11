import type { Datum } from "../charts/shared/datumTypes"
import { resolveRawAccessor } from "../stream/accessorUtils"

/** AI summaries retain valid row objects and omit absent/non-record rows. */
export function aiDataRows(value: unknown): Datum[] {
  if (!Array.isArray(value)) return []
  const valid = (row: unknown): row is Datum =>
    row !== null &&
    typeof row === "object" &&
    !Array.isArray(row) &&
    !(row instanceof Date) &&
    !(row instanceof Map) &&
    !(row instanceof Set)
  for (const row of value) if (!valid(row)) return value.filter(valid)
  return value
}

/** Preserve props and datum identity when the input already contains records. */
export function aiChartProps(props: Datum): Datum {
  let result = props
  for (const key of [
    "data",
    "nodes",
    "edges",
    "points",
    "areas",
    "flows",
    "spawns",
    "projectionRows",
    "annotations"
  ]) {
    if (!Array.isArray(props[key])) continue
    const rows = aiDataRows(props[key])
    if (rows !== props[key]) {
      if (result === props) result = { ...props }
      result[key] = rows
    }
  }
  return result
}

/** Numeric accessors never coerce BigInt, Symbol, or arbitrary objects. */
export function aiNumericValue(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim() !== "") return Number(value)
  return NaN
}

export function aiNumericAccessor(
  accessor: string | ((datum: Datum) => unknown) | undefined,
  fallback: string
): (datum: Datum) => number {
  const read = resolveRawAccessor(accessor, fallback)
  return (datum) => aiNumericValue(read(datum))
}
