import type { Datum } from "../charts/shared/datumTypes"
/**
 * Apache Arrow → Semiotic rows (v1).
 *
 * Reads an Arrow table (DuckDB-Wasm result set, Arrow IPC, Parquet-via-Arrow)
 * into the plain row objects the chart accessor path expects, so an in-browser
 * analytics engine can feed Semiotic with one call.
 *
 * **Honest scope (v1).** Semiotic's data path is row-oriented and validates the
 * `data` prop with `Array.isArray`, so a chart's `data` must be a real array of
 * row objects. This adapter therefore materializes rows — but leanly: it reads
 * each requested column cell-by-cell into a plain object, avoiding Arrow's own
 * `Table.toArray()` row-proxy machinery, and it supports column projection so
 * you only pay for the fields you chart. The genuinely zero-copy columnar path
 * (a typed-array accessor mode + bulk ring-buffer ingest) is deliberately
 * *not* built here: it touches the ingestion core and waits on a named consumer
 * plus profiling evidence, rather than being built on spec.
 *
 * Pure, dependency-free: the Arrow table is duck-typed, so `apache-arrow` never
 * enters Semiotic's dependencies — you bring the table, this reads it.
 */

/** A column vector, duck-typed to apache-arrow's `Vector`. */
export interface ArrowColumnLike {
  get(index: number): unknown
}

/** A schema field, duck-typed to apache-arrow's `Field`. */
export interface ArrowFieldLike {
  name: string
}

/** A table schema, duck-typed to apache-arrow's `Schema`. */
export interface ArrowSchemaLike {
  fields: ReadonlyArray<ArrowFieldLike>
}

/** An Arrow table, duck-typed to apache-arrow's `Table` (and DuckDB-Wasm results). */
export interface ArrowTableLike {
  numRows: number
  schema: ArrowSchemaLike
  getChild(name: string): ArrowColumnLike | null | undefined
}

export interface FromArrowOptions {
  /** Project a subset of columns. Omit to read every column in the schema. */
  fields?: ReadonlyArray<string>
  /**
   * Convert Arrow int64/uint64 values (returned as `bigint`) to `number`, since
   * the chart scales and `toNumber` coercion work in `number`. Default true.
   * Values outside `Number.MAX_SAFE_INTEGER` are left as `bigint` (and warned).
   */
  coerceBigInt?: boolean
}

/**
 * Materialize an Arrow table into Semiotic row objects. Pass the result
 * straight to a chart's `data` prop: `<LineChart data={fromArrow(table)} … />`.
 */
export function fromArrow(table: ArrowTableLike, options: FromArrowOptions = {}): Datum[] {
  if (!table || typeof table.numRows !== "number" || !table.schema) {
    console.warn("[semiotic/fromArrow] Expected an Arrow table with `numRows` and `schema`. Returning [].")
    return []
  }

  const coerceBigInt = options.coerceBigInt !== false
  const schemaNames = table.schema.fields.map((f) => f.name)
  const requested = options.fields ?? schemaNames

  // Resolve columns once; skip (and warn on) requested fields that don't exist.
  const columns: Array<{ name: string; column: ArrowColumnLike }> = []
  for (const name of requested) {
    const column = table.getChild(name)
    if (!column) {
      console.warn(`[semiotic/fromArrow] Column "${name}" is not in the table schema; skipping it.`)
      continue
    }
    columns.push({ name, column })
  }

  let bigIntTruncationWarned = false
  const rows: Datum[] = new Array(table.numRows)
  for (let i = 0; i < table.numRows; i++) {
    const row: Datum = {}
    for (const { name, column } of columns) {
      let value = column.get(i)
      if (coerceBigInt && typeof value === "bigint") {
        if (value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
          value = Number(value)
        } else if (!bigIntTruncationWarned) {
          bigIntTruncationWarned = true
          console.warn(
            "[semiotic/fromArrow] A 64-bit integer exceeds Number.MAX_SAFE_INTEGER; left as bigint to avoid precision loss.",
          )
        }
      }
      row[name] = value as Datum[string]
    }
    rows[i] = row
  }

  return rows
}
