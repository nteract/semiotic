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
 * you only pay for the fields you chart. A zero-copy columnar path using typed
 * array accessors and bulk ring-buffer ingestion would require changes to the
 * ingestion core, a named consumer, and profiling evidence.
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
   * A column containing an unsafe integer keeps all its bigint values intact
   * (and warns), so a column never mixes converted numbers and bigints.
   * Use bigint: "number-lossy" to explicitly allow rounded chart values.
   */
  coerceBigInt?: boolean
  /** Explicit conversion policy; takes precedence over coerceBigInt. */
  bigint?: "number-lossy" | "string" | "keep"
}

/**
 * Materialize an Arrow table into Semiotic row objects. Pass the result
 * straight to a chart's `data` prop: `<LineChart data={fromArrow(table)} … />`.
 */
export function fromArrow(table: ArrowTableLike, options: FromArrowOptions = {}): Datum[] {
  if (!table || !Number.isSafeInteger(table.numRows) || table.numRows < 0 || table.numRows > 0xffffffff ||
      !Array.isArray(table.schema?.fields) || Array.from(table.schema.fields).some(field => !field || typeof field.name !== "string") ||
      typeof table.getChild !== "function" || (options.fields !== undefined && (!Array.isArray(options.fields) || Array.from(options.fields).some(field => typeof field !== "string")))) {
    console.warn("[semiotic/fromArrow] Expected an Arrow table with a valid row count, schema fields, and getChild function. Returning [].")
    return []
  }

  const policy = options.bigint ?? (options.coerceBigInt === false ? "keep" : "safe")
  const schemaNames = table.schema.fields.map((f) => f.name)
  const schemaFields = new Set(schemaNames)
  const requested = options.fields ?? schemaNames

  // Resolve columns once; skip (and warn on) requested fields that don't exist.
  const columns: Array<{ name: string; column: ArrowColumnLike }> = []
  for (const name of new Set(requested)) {
    const column = schemaFields.has(name) ? table.getChild(name) : undefined
    if (!schemaFields.has(name) || !column || typeof column.get !== "function") {
      console.warn(`[semiotic/fromArrow] Column "${name}" is not in the table schema; skipping it.`)
      continue
    }
    columns.push({ name, column })
  }

  const unsafeColumns = new Set<string>()
  const bigintColumns = new Set<string>()
  const rows: Datum[] = new Array(table.numRows)
  for (let i = 0; i < table.numRows; i++) {
    const row: Datum = {}
    for (const { name, column } of columns) {
      const value = column.get(i)
      if (typeof value === "bigint") {
        bigintColumns.add(name)
        if (value < -9007199254740991n || value > 9007199254740991n) unsafeColumns.add(name)
      }
      if (name === "__proto__") Object.defineProperty(row, name, { value, enumerable: true, writable: true, configurable: true })
      else row[name] = value
    }
    rows[i] = row
  }

  if (unsafeColumns.size && (policy === "safe" || policy === "number-lossy")) {
    console.warn(policy === "safe"
      ? "[semiotic/fromArrow] A 64-bit integer exceeds Number.MAX_SAFE_INTEGER; its column keeps bigint values to avoid precision loss. Set bigint: \"number-lossy\" or \"string\" explicitly to convert it."
      : "[semiotic/fromArrow] A 64-bit integer exceeds Number.MAX_SAFE_INTEGER; bigint: \"number-lossy\" may round values.")
  }
  if (policy !== "keep") for (const name of bigintColumns) {
    if (policy === "safe" && unsafeColumns.has(name)) continue
    for (const row of rows) {
      if (typeof row[name] === "bigint") row[name] = policy === "string" ? String(row[name]) : Number(row[name])
    }
  }
  return rows
}
