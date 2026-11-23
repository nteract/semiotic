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
export function sampleDataRecords(data: readonly unknown[], seriesField?: string): Datum[] {
  const sampled =
    data.length <= 3
      ? data
      : [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]]
  const nested = seriesField && Array.isArray(data.find(isDataRecord)?.[seriesField]) ? seriesField : undefined
  const inspect = (rows: readonly unknown[]) => {
    const records = rows.filter(isDataRecord)
    return nested ? records.flatMap(row => Array.isArray(row[nested]) ? sampleDataRecords(row[nested]) : []) : records
  }
  const records = inspect(sampled)
  return records.length ? records : inspect(data)
}

export function recordFields(records: Datum[]): string[] {
  return [...new Set(records.flatMap(Object.keys))]
}

export function seriesCoordinateField(definitions: Record<string, unknown>, props: Datum) {
  if (definitions.lineDataAccessor) {
    return typeof props.lineDataAccessor === "string" ? props.lineDataAccessor : "coordinates"
  }
}
