import type { Datum } from "../charts/shared/datumTypes"
import { parseNumericValue } from "./numericValue"

const OPERATIONS = ["sum", "mean", "count", "min", "max"] as const
export type AggregateOperation = (typeof OPERATIONS)[number]

export interface AggregateMeasure {
  field?: string
  operation: AggregateOperation
  outputField: string
  readValue?: (raw: unknown) => number | undefined
}

export function isDataField(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

export function normalizeAggregate(
  value: unknown
): AggregateOperation | undefined {
  if (value === "average") return "mean"
  return OPERATIONS.includes(value as AggregateOperation)
    ? value as AggregateOperation : undefined
}

/** Choose an output name without overwriting a retained dimension or measure. */
export function unusedAggregateField(fields: ReadonlySet<string>): string {
  let name = "value"
  let suffix = 0
  while (fields.has(name)) name = `value_${++suffix}`
  return name
}

interface Group {
  keys: [string, unknown][]
  count: number
  measures: Array<{ total: number; count: number }>
}

interface GroupIndex {
  values?: Map<unknown, GroupIndex>
  dates?: Map<number, GroupIndex>
  group?: Group
}

/**
 * Shared aggregation for transforms and importers. Tuple keys retain their
 * types; Dates group by epoch time, other objects by identity. The index stores
 * no source-row arrays, so working storage depends on groups and measures.
 */
export function aggregateRows(
  data: readonly Datum[],
  groupFields: readonly string[],
  measures: readonly AggregateMeasure[],
  readField: (row: Datum, field: string) => unknown = (row, field) => row[field]
): Datum[] {
  if (!Array.isArray(data))
    throw new TypeError("aggregate data must be an array of rows")
  if (!groupFields.every(isDataField)) {
    throw new TypeError("groupBy must contain nonempty field names")
  }
  const fields = [...new Set(groupFields)]
  const usedFields = new Set(fields)
  for (const measure of measures) {
    if (!OPERATIONS.includes(measure.operation)) {
      throw new TypeError("Unsupported aggregate operation")
    }
    if (
      !isDataField(measure.outputField) ||
      usedFields.has(measure.outputField)
    ) {
      throw new TypeError(
        "outputField must be a new, nonempty field name"
      )
    }
    if (
      measure.operation !== "count" &&
      !isDataField(measure.field)
    ) {
      throw new TypeError("A value field is required for this aggregate")
    }
    usedFields.add(measure.outputField)
  }

  const root: GroupIndex = {}
  const groups: Group[] = []
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex]
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError(`aggregate data row ${rowIndex} must be an object`)
    }
    let node = root
    for (const field of fields) {
      const raw = readField(row, field)
      // A Date and a number with the same epoch remain distinct dimensions.
      const values =
        raw instanceof Date
          ? (node.dates ??= new Map())
          : (node.values ??= new Map())
      const key = raw instanceof Date ? raw.getTime() : raw
      let next = values.get(key)
      if (!next) {
        next = {}
        values.set(key, next)
      }
      node = next
    }
    if (!node.group) {
      node.group = {
        keys: fields.map(field => [field, readField(row, field)]),
        count: 0,
        measures: measures.map(() => ({ total: 0, count: 0 }))
      }
      groups.push(node.group)
    }
    const group = node.group
    group.count++
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i]
      if (measure.operation === "count") continue
      const value = (measure.readValue ?? parseNumericValue)(readField(row, measure.field!))
      if (value === undefined || !Number.isFinite(value)) continue
      const state = group.measures[i]
      if (measure.operation === "min" || measure.operation === "max") {
        if (
          !state.count ||
          (measure.operation === "min"
            ? value < state.total
            : value > state.total)
        ) {
          state.total = value
        }
      } else {
        state.total += value
      }
      state.count++
    }
  }

  return groups.map((group) =>
    Object.fromEntries([
      ...group.keys,
      ...measures.map((measure, i) => {
        const state = group.measures[i]
        const value =
          measure.operation === "count"
            ? group.count
            : !state.count
              ? null
              : measure.operation === "mean"
                ? state.total / state.count
                : state.total
        return [measure.outputField, value]
      })
    ])
  )
}
