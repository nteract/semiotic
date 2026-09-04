import type { Datum } from "../charts/shared/datumTypes"
import type { StreamScales } from "./types"

/**
 * Project, filter, and sort vertices with their source rows as one operation.
 * Lines, areas, and ribbons must share this invariant: datum[i] describes the
 * same observation as path[i], including with descending scales.
 */
export function buildSeriesGeometry(
  data: Datum[],
  scales: StreamScales,
  xGet: (d: Datum) => number,
  yGet: (d: Datum) => number,
  bottomGet?: (d: Datum) => number
): {
  topPath: [number, number][]
  bottomPath: [number, number][]
  rawValues: number[]
  datum: Datum[]
} {
  const entries: {
    x: number
    y: number
    bottom: number
    raw: number
    datum: Datum
  }[] = []
  for (const datum of data) {
    const x = xGet(datum)
    const y = yGet(datum)
    const bottom = bottomGet ? bottomGet(datum) : 0
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(bottom))
      continue
    const px = scales.x(x)
    const py = scales.y(y)
    const pb = bottomGet ? scales.y(bottom) : 0
    if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pb))
      continue
    entries.push({ x: px, y: py, bottom: pb, raw: y, datum })
  }
  entries.sort((a, b) => a.x - b.x)
  const topPath: [number, number][] = new Array(entries.length)
  const bottomPath: [number, number][] = bottomGet
    ? new Array(entries.length)
    : []
  const rawValues: number[] = new Array(entries.length)
  const datum: Datum[] = new Array(entries.length)
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    topPath[i] = [entry.x, entry.y]
    if (bottomGet) bottomPath[i] = [entry.x, entry.bottom]
    rawValues[i] = entry.raw
    datum[i] = entry.datum
  }
  return { topPath, bottomPath, rawValues, datum }
}
