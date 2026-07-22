import type { Datum } from "../charts/shared/datumTypes"
import type {
  NumericContracts,
  NumericFieldContract,
} from "./numericContracts"

function nestedAccessor(
  field: NumericFieldContract,
  props: Datum,
): string | undefined {
  const configured = field.nestedDataAccessorProp
    ? props[field.nestedDataAccessorProp]
    : undefined
  return typeof configured === "string"
    ? configured
    : field.defaultNestedDataAccessor
}

/** Resolve a contract's outer or line-object nested row source. */
export function rowsForNumericField(
  field: NumericFieldContract,
  props: Datum,
  data: ReadonlyArray<Datum> | undefined,
): { dataProp: string; rows: ReadonlyArray<Datum> } {
  const dataProp = field.dataProp ?? "data"
  const propRows = props[dataProp]
  const rows = data ?? (Array.isArray(propRows) ? propRows : [])
  const nestedKey = nestedAccessor(field, props)
  if (!nestedKey) return { dataProp, rows }

  const nestedRows: Datum[] = []
  let foundNestedCollection = false
  for (const row of rows) {
    const nested = row?.[nestedKey]
    if (!Array.isArray(nested)) continue
    foundNestedCollection = true
    for (const nestedRow of nested) {
      if (nestedRow && typeof nestedRow === "object") {
        nestedRows.push(nestedRow as Datum)
      }
    }
  }
  return { dataProp, rows: foundNestedCollection ? nestedRows : rows }
}

/** Find explicit empty outer arrays and all-empty declared nested series. */
export function explicitEmptyNumericSources(
  contracts: NumericContracts,
  props: Datum,
  data: ReadonlyArray<Datum> | undefined,
): string[] {
  const sources = new Set<string>()
  for (const field of contracts.fields) {
    const dataProp = field.dataProp ?? "data"
    const rows = data ?? props[dataProp]
    if (!Array.isArray(rows)) continue
    if (rows.length === 0) {
      sources.add(dataProp)
      continue
    }
    const nestedKey = nestedAccessor(field, props)
    if (!nestedKey) continue
    const nestedCollections = rows
      .map((row) => row?.[nestedKey])
      .filter(Array.isArray)
    if (
      nestedCollections.length > 0 &&
      nestedCollections.every((nested) => nested.length === 0)
    ) {
      sources.add(`${dataProp}.${nestedKey}`)
    }
  }
  return [...sources]
}
