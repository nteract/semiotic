import type { Accessor, Datum } from "./datumTypes"

const LINE_OBJECT_SERIES_FIELD = "__lineObjectSeries"

/** Unpack coordinate rows before overlays, retaining authored parent metadata. */
export function normalizeLineChartData(
  data: Datum[],
  lineDataAccessor: string,
  lineBy?: Accessor<string>,
) {
  const isLineObjectFormat = data[0]?.[lineDataAccessor] !== undefined
  if (!isLineObjectFormat) return { rows: data, groupAccessor: lineBy, isLineObjectFormat }
  const rows = data.flatMap((line, lineIndex) => {
    const parentGroup = typeof lineBy === "function" ? lineBy(line) : lineBy ? line[lineBy] : undefined
    const group = parentGroup == null ? `line-${lineIndex}` : String(parentGroup)
    const coordinates = Array.isArray(line[lineDataAccessor]) ? line[lineDataAccessor] as Datum[] : []
    return coordinates.map((coordinate) => ({
      ...coordinate,
      [LINE_OBJECT_SERIES_FIELD]: group,
      parentLine: line,
      ...(typeof lineBy === "string" && line[lineBy] !== undefined ? { [lineBy]: line[lineBy] } : {}),
    }))
  })
  return { rows, groupAccessor: LINE_OBJECT_SERIES_FIELD, isLineObjectFormat }
}
