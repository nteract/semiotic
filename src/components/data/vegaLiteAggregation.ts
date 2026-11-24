import type { Datum } from "../charts/shared/datumTypes"
import { isCategory, vegaLiteFieldType } from "./vegaLiteValidation"
import type { PortabilityDiagnostic } from "./portability/result"
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
): PortabilityDiagnostic[] {
  const encodings = spec.encoding ?? {}
  const diagnostics: PortabilityDiagnostic[] = []
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
      const mark = typeof spec.mark === "string" ? spec.mark : spec.mark?.type
      const category = channel === "x" ? encodings.y : channel === "y" ? encodings.x : undefined
      if (mark === "bar" && operation === "sum" && encoding.type === "quantitative" &&
          !encoding.bin && isCategory(category?.type) && !category?.aggregate) {
        continue
      }
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
    const type = vegaLiteFieldType(value)
    measures.push({ field: value.field, operation, outputField,
      readValue: type === "quantitative" ? quantitativeValue : undefined })
    resolved[channel] = { ...value, type, field: outputField, aggregate: undefined }
  }
  return measures.length
    ? { data: aggregateRows(data, [...fields], measures), encoding: resolved }
    : { data, encoding }
}
