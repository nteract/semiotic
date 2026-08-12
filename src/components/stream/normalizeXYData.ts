import type { Datum } from "../charts/shared/datumTypes"

/**
 * Normalize the grouped line shape accepted by the XY frame into the flat
 * datum stream consumed by PipelineStore. Keeping this at the frame boundary
 * makes controlled CSR, direct React SSR, and the static renderer agree.
 */
export function normalizeXYData(
  data: Datum[],
  lineDataAccessor?: string
): Datum[] {
  if (!lineDataAccessor || data.length === 0) return data

  const grouped = data.some((line) =>
    line != null && typeof line === "object" && Array.isArray(line[lineDataAccessor])
  )
  if (!grouped) return data

  const flat: Datum[] = []
  for (const line of data) {
    if (line == null || typeof line !== "object") continue
    const coordinates = line[lineDataAccessor]
    if (!Array.isArray(coordinates)) continue

    const groupKey = line.label ?? line.id ?? line.key
    for (const coordinate of coordinates) {
      if (coordinate == null || typeof coordinate !== "object") continue
      flat.push(groupKey == null
        ? coordinate as Datum
        : { ...coordinate, _lineGroup: groupKey })
    }
  }

  return flat
}
