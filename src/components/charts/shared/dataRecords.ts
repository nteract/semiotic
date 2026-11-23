import type { Datum } from "./datumTypes"

export function isDataRecord(value: unknown): value is Datum {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof Map) &&
    !(value instanceof Set)
  )
}

/** Sample ordinary rows cheaply; inspect all records when samples are gaps. */
export function sampleDataRecords(data: readonly unknown[]): Datum[] {
  const sampled =
    data.length <= 3
      ? Array.from(data)
      : [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]]
  const records = sampled.filter(isDataRecord)
  if (records.length) return records
  return data.filter(isDataRecord)
}

export function sampledFields(data: readonly unknown[]): string[] {
  return [...new Set(sampleDataRecords(data).flatMap(Object.keys))]
}


/** Positional accessors on a series wrapper read its observation records. */
export function positionalData(data: unknown, nested: boolean, key: unknown) {
  if (!nested || !Array.isArray(data)) return data
  const field = typeof key === "string" ? key : "coordinates"
  if (!Array.isArray(data[0]?.[field])) return data
  const samples = sampleDataRecords(data).flatMap(row =>
    Array.isArray(row[field]) ? sampleDataRecords(row[field]) : []
  )
  if (samples.length) return samples
  for (const row of data) {
    if (Array.isArray(row?.[field])) {
      const records = sampleDataRecords(row[field])
      if (records.length) return records
    }
  }
  return []
}
