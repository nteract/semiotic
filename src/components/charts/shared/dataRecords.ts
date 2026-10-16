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
