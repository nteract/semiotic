import type { Datum } from "../charts/shared/datumTypes"
import type { PortabilityDiagnostic } from "./portability/result"
import type { VegaLiteEncoding, VegaLiteSpec } from "./fromVegaLite"
import {
  aggregateRows,
  normalizeAggregate,
  unusedAggregateField
} from "./aggregateRows"
import type { AggregateMeasure } from "./aggregateRows"

/** Validate before changing rows or accessors, including in strict imports. */
export function vegaLiteAggregationDiagnostics(
  spec: VegaLiteSpec
): PortabilityDiagnostic[] {
  const encodings = spec.encoding ?? {}
  const diagnostics: PortabilityDiagnostic[] = []
  if (
    Object.values(encodings).some(
      (encoding) => encoding.aggregate !== undefined
    ) &&
    spec.data?.values !== undefined
  ) {
    const rows = spec.data.values
    if (
      !Array.isArray(rows) ||
      rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))
    ) {
      diagnostics.push({
        code: "INVALID_AGGREGATE_DATA",
        severity: "error",
        path: "/data/values",
        message:
          "Aggregation requires data.values to be an array of row objects."
      })
    }
  }
  for (const [channel, encoding] of Object.entries(encodings)) {
    if (encoding.aggregate === undefined) continue
    const operation = normalizeAggregate(encoding.aggregate)
    let message: string | undefined
    let code = "UNSUPPORTED_AGGREGATE"
    if (!operation) {
      message = `Unsupported aggregate "${encoding.aggregate}" on ${channel}; data was not aggregated.`
    } else if (
      (encodings.x?.bin || encodings.y?.bin) &&
      operation !== "count"
    ) {
      message = `Binned aggregate "${encoding.aggregate}" on ${channel} is not supported; Histogram counts source rows.`
    } else if (operation !== "count" && !encoding.field) {
      code = "INVALID_AGGREGATE"
      message = `aggregate: "${encoding.aggregate}" on ${channel} requires an encoded value field.`
    } else if (!spec.data?.values) {
      code = "INVALID_AGGREGATE"
      message = `aggregate: "${encoding.aggregate}" on ${channel} requires inline data.values; accessors remain unchanged.`
    }
    if (message)
      diagnostics.push({
        code,
        severity: "error",
        path: `/encoding/${channel}/aggregate`,
        message
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
  const fields = new Set(
    Object.values(encoding)
      .filter((channel) => channel.aggregate === undefined && channel.field)
      .map((channel) => channel.field!)
  )
  const usedFields = new Set(fields)
  const measures: AggregateMeasure[] = []
  const resolved = { ...encoding }
  for (const [channel, value] of Object.entries(encoding)) {
    const operation = normalizeAggregate(value.aggregate)
    if (!operation) continue
    const outputField = unusedAggregateField(usedFields)
    usedFields.add(outputField)
    measures.push({ field: value.field, operation, outputField })
    resolved[channel] = { ...value, field: outputField, aggregate: undefined }
  }
  return measures.length
    ? { data: aggregateRows(data, [...fields], measures), encoding: resolved }
    : { data, encoding }
}
