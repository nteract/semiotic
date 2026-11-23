import type { Datum } from "./datumTypes"
import { isDataRecord, sampleDataRecords } from "./dataRecords"

/** Line-object charts read positional accessors from each series' coordinates. */
export function sampleConfigRecords(definitions: Record<string, unknown>, props: Datum): Datum[] {
  const data = props.data
  if (!Array.isArray(data)) return []
  const records = sampleDataRecords(data)
  if (!definitions.lineDataAccessor) return records
  const field = typeof props.lineDataAccessor === "string" ? props.lineDataAccessor : "coordinates"
  if (!Array.isArray(data.find(isDataRecord)?.[field])) return records
  const coordinates = (row: unknown) =>
    isDataRecord(row) && Array.isArray(row[field]) ? sampleDataRecords(row[field]) : []
  const points = records.flatMap(coordinates)
  return points.length ? points : data.flatMap(coordinates)
}
