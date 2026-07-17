import type { Datum } from "./datumTypes"

export interface PrepareAreaSeriesDataOptions<TDatum extends Datum = Datum> {
  /** Original prop value; null/undefined means the chart has no bounded data. */
  data: unknown
  /** Sparse-filtered rows used by the chart setup pipeline. */
  safeData: TDatum[]
  areaBy?: string | ((datum: TDatum) => unknown)
  lineDataAccessor: string
}

/**
 * Normalize AreaChart's two public data shapes into frame-ready point rows.
 * Kept independent of React so the HOC and synchronous server renderer use
 * exactly the same grouping/flattening semantics.
 */
export function prepareAreaSeriesData<TDatum extends Datum = Datum>({
  data,
  safeData,
  areaBy,
  lineDataAccessor,
}: PrepareAreaSeriesDataOptions<TDatum>): TDatum[] {
  if (data == null) return []
  const isAreaObjectFormat = safeData[0]?.[lineDataAccessor] !== undefined
  if (!isAreaObjectFormat && !areaBy) return safeData

  let groupedAreas: Datum[]
  if (isAreaObjectFormat) {
    groupedAreas = safeData
  } else {
    const grouped = safeData.reduce<Record<string, Datum>>((acc, datum) => {
      const rawKey = typeof areaBy === "function" ? areaBy(datum) : datum[areaBy as string]
      const key = String(rawKey)
      if (!acc[key]) {
        const area: Datum = { [lineDataAccessor]: [] }
        if (typeof areaBy === "string") area[areaBy] = rawKey
        acc[key] = area
      }
      acc[key][lineDataAccessor].push(datum)
      return acc
    }, {})
    groupedAreas = Object.values(grouped)
  }

  return groupedAreas.flatMap((area) => {
    const coordinates: TDatum[] = Array.isArray(area[lineDataAccessor])
      ? area[lineDataAccessor]
      : []
    if (typeof areaBy === "string") {
      return coordinates.map((coordinate) => ({
        ...coordinate,
        [areaBy]: coordinate[areaBy] ?? area[areaBy],
      })) as TDatum[]
    }
    return coordinates
  })
}
