import type { Datum } from "../charts/shared/datumTypes"
import { isCategory, vegaLiteFieldType, vegaTimeValue } from "./vegaLiteValidation"
import type { VegaLiteImportError } from "./vegaLiteValidation"
import type { VegaLiteEncoding, VegaLiteSpec } from "./fromVegaLite"
import {
  aggregateRows,
  normalizeAggregate,
  unusedAggregateField
} from "./aggregateRows"
import type { AggregateMeasure } from "./aggregateRows"

/** Quantitative measures accept zero-padded numeric strings. */
function quantitativeValue(raw: unknown) {
  if (typeof raw === "number") return raw
  if (typeof raw === "string" && raw.trim()) return Number(raw)
}

/** Validate before changing rows or accessors, including in strict imports. */
export function vegaLiteAggregationDiagnostics(
  spec: VegaLiteSpec
): VegaLiteImportError[] {
  const encodings = spec.encoding ?? {}
  const diagnostics: VegaLiteImportError[] = []
  for (const [channel, encoding] of Object.entries(encodings)) {
    if (encoding.aggregate === undefined) continue
    const operation = normalizeAggregate(encoding.aggregate)
    let message: string | undefined
    let code = "INVALID_AGGREGATE"
    if (!operation || ((encodings.x?.bin || encodings.y?.bin) && operation !== "count")) {
      code = "UNSUPPORTED_AGGREGATE"
      message = operation ? "Use count with binning." : "Unsupported aggregate."
    } else if (operation !== "count" && !encoding.field) {
      message = "Provide a value field."
    } else if (!spec.data?.values) {
      const mark = typeof spec.mark === "string" ? spec.mark : spec.mark?.type
      const category = channel === "x" ? encodings.y : channel === "y" ? encodings.x : undefined
      if (mark === "bar" && operation === "sum" && encoding.type === "quantitative" &&
          !encoding.bin && isCategory(category?.type) && !category?.aggregate) {
        continue
      }
      message = "Provide data.values."
    }
    if (message)
      diagnostics.push({
        code,
        severity: "error",
        path: `/encoding/${channel}/aggregate`,
        message: `${channel} aggregate "${encoding.aggregate}": ${message}`
      })
  }
  return diagnostics
}

/** Aggregate all requested measures over the complete tuple of dimensions. */
export function aggregateVegaLite(
  spec: VegaLiteSpec,
  warnings: string[]
): {
  data: Datum[] | undefined
  encoding: Record<string, VegaLiteEncoding>
} {
  const encoding = spec.encoding ?? {}
  const data = spec.data?.values
  const diagnostics = vegaLiteAggregationDiagnostics(spec)
  warnings.push(...diagnostics.map(({ message }) => message))
  // Histogram consumes observations itself. Pre-counting would lose repeated
  // values and make the downstream chart count unique values instead of rows.
  if (!data || diagnostics.length || encoding.x?.bin || encoding.y?.bin)
    return { data, encoding }
  const fields = new Set<string>()
  const temporalFields = new Set<string>()
  for (const channel of Object.values(encoding)) {
    if (!channel.field) continue
    if (channel.aggregate === undefined) fields.add(channel.field)
    if (vegaLiteFieldType(channel) === "temporal") temporalFields.add(channel.field)
  }
  const usedFields = new Set(fields)
  const measures: AggregateMeasure[] = []
  const resolved = { ...encoding }
  for (const [channel, value] of Object.entries(encoding)) {
    const operation = normalizeAggregate(value.aggregate)
    if (!operation) continue
    const outputField = unusedAggregateField(usedFields)
    usedFields.add(outputField)
    const type = vegaLiteFieldType(value)
    const readValue = type === "quantitative" ? quantitativeValue : undefined
    measures.push({ field: value.field, operation, outputField, readValue })
    resolved[channel] = { ...value, type, field: outputField, aggregate: undefined }
  }
  if (!measures.length) return { data, encoding }
  const readField = (row: Datum, field: string) => temporalFields.has(field) ? vegaTimeValue(row[field]) : row[field]
  return { data: aggregateRows(data, [...fields], measures, readField), encoding: resolved }
}
