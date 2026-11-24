import type { Datum } from "../charts/shared/datumTypes"
import { isCategory, pointerSegment, repeatedCategories, vegaLiteFieldType, vegaTimeValue } from "./vegaLiteValidation"
import type { VegaLiteImportError } from "./vegaLiteValidation"
import type { VegaLiteEncoding, VegaLiteSpec } from "./fromVegaLite"
import {
  aggregateRows,
  normalizeAggregate,
  unusedAggregateField
} from "./aggregateRows"
import type { AggregateMeasure } from "./aggregateRows"

/** Vega treats only nullish values and the empty string as missing. */
function quantitativeValue(raw: unknown) {
  if (raw == null || raw === "") return
  try {
    return Number(raw)
  } catch {
    return NaN
  }
}

/** Validate before changing rows or accessors, including in strict imports. */
export function vegaLiteAggregationDiagnostics(
  spec: VegaLiteSpec
): VegaLiteImportError[] {
  const encodings = spec.encoding ?? {}
  const diagnostics: VegaLiteImportError[] = []
  const binned = encodings.x?.bin || encodings.y?.bin
  for (const [channel, encoding] of Object.entries(encodings)) {
    const { aggregate } = encoding
    if (aggregate === undefined) continue
    const operation = normalizeAggregate(aggregate)
    let message: string | undefined
    let code = "INVALID_AGGREGATE"
    if (!operation || (binned && operation !== "count")) {
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
        message: `${channel} aggregate "${aggregate}": ${message}`
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
  return { data: aggregateRows(data, [...fields], measures, readField, true), encoding: resolved }
}

export function vegaLiteDataLosses(spec: VegaLiteSpec, base: string) {
  const losses: Array<{ code: string; path: string; message: string }> = []
  const rows = spec.data?.values
  if (!rows) return losses
  const mark = typeof spec.mark === "string" ? spec.mark : spec.mark?.type
  const { x, y, color } = spec.encoding ?? {}
  if (mark === "rect" && x?.field && y?.field && color && !color.aggregate && repeatedCategories(rows, [x.field, y.field])) {
    losses.push({ code: "OVERLAPPING_HEATMAP_CELLS", path: "/encoding/color",
      message: "Semiotic uses the last value at each heatmap cell. Vega-Lite includes every row in the color domain." })
  }
  let materialized: ReturnType<typeof aggregateVegaLite> | undefined
  for (const [name, channel] of Object.entries(spec.encoding ?? {})) {
    const { field, aggregate } = channel
    if (!field || vegaLiteFieldType(channel) !== "quantitative" || aggregate === "count") continue
    if (mark === "line" && name === "y" && !aggregate) continue
    let path: string
    if (aggregate) {
      materialized ??= aggregateVegaLite(spec, [])
      const result = materialized.encoding[name]
      const output = result?.field
      if (!output || result.aggregate) continue
      const invalidTotal = ["sum", "mean", "average"].includes(aggregate) && rows.some(row => {
        const value = quantitativeValue(row[field])
        return value !== undefined && !Number.isFinite(value)
      })
      if (!invalidTotal && !materialized.data?.some(row => row[output] == null)) continue
      path = `/encoding/${pointerSegment(name)}/aggregate`
    } else {
      // Vega parses a path's quantitative x before sorting its observations.
      const pathX = name === "x" && (mark === "line" || mark === "area")
      const index = rows.findIndex(row => row[field] == null || (pathX && row[field] === ""))
      if (index < 0) continue
      path = `${base}/${index}/${pointerSegment(field)}`
    }
    losses.push({ code: "MISSING_MEASURE", path, message: `${path} changes a missing quantitative mark or its aggregate value.` })
  }
  return losses
}
