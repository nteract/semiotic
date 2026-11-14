import { groupBy } from "./recipeUtils"
import { packCell } from "./packedClusterMatrixPacking"

interface Mark {
  id: string
  col: string
  row: string
  packR: number
}
interface Rect {
  x: number
  y: number
  w: number
  h: number
}
interface Cell extends Rect {
  row: string
  marks: Mark[]
}

export interface Geom {
  positions: Map<string, { px: number; py: number }>
  enclosures: Rect[]
  colBands: { col: string; x: number; w: number }[]
  rowLabelY: Map<string, number>
  /** One radius factor for every cell, preserving the shared size encoding. */
  scale: number
}

interface BuildOpts {
  columnOrder: string[]
  rowOrder: string[]
  innerX: number
  innerY: number
  innerW: number
  innerH: number
  rowMode: "banded" | "stacked"
  cellSizing: "proportional" | "uniform"
  proportionExponent: number
  columnGap: number
  rowGap: number
  packPadding: number
  iterations: number
  maxAreaFraction: number
}

// Reserve space for cells even when requested gaps exceed the available plot.
function gap(requested: number, size: number, count: number): number {
  return Math.min(requested, size / Math.max(1, count * 2))
}

function spans(
  counts: number[],
  size: number,
  spacing: number,
  o: BuildOpts
): number[] {
  const weights = counts.map((n) =>
    o.cellSizing === "uniform" ? 1 : Math.pow(n, o.proportionExponent)
  )
  const total = weights.reduce((a, b) => a + b, 0)
  const available = size - spacing * Math.max(0, counts.length - 1)
  return weights.map((w) => (available * w) / total)
}

export function buildGeometry(raw: Mark[], o: BuildOpts): Geom {
  const byCol = groupBy(raw, (m) => m.col)
  const colGap = gap(o.columnGap, o.innerW, o.columnOrder.length)
  const widths = spans(
    o.columnOrder.map((c) => byCol.get(c)!.length),
    o.innerW,
    colGap,
    o
  )
  let x = o.innerX
  const colBands = o.columnOrder.map((col, i) => {
    const band = { col, x, w: widths[i] }
    x += widths[i] + colGap
    return band
  })
  const cells: Cell[] = []
  const rowLabelY = new Map<string, number>()
  if (o.rowMode === "banded") {
    const byRow = groupBy(raw, (m) => m.row)
    const rowGap = gap(o.rowGap, o.innerH, o.rowOrder.length)
    const heights = spans(
      o.rowOrder.map((r) => byRow.get(r)!.length),
      o.innerH,
      rowGap,
      o
    )
    let y = o.innerY + o.innerH
    const bands = new Map(
      o.rowOrder.map((row, i) => {
        y -= heights[i]
        const band = { y, h: heights[i] }
        rowLabelY.set(row, y + heights[i] / 2)
        y -= rowGap
        return [row, band]
      })
    )
    for (const col of colBands) {
      for (const [row, marks] of groupBy(byCol.get(col.col)!, (m) => m.row)) {
        cells.push({ ...col, ...bands.get(row)!, row, marks })
      }
    }
  } else {
    for (const col of colBands) {
      const byRow = groupBy(byCol.get(col.col)!, (m) => m.row)
      const rows = o.rowOrder.filter((r) => byRow.has(r))
      const rowGap = gap(o.rowGap, o.innerH, rows.length)
      const heights = spans(
        rows.map((r) => byRow.get(r)!.length),
        o.innerH,
        rowGap,
        o
      )
      let y = o.innerY + o.innerH
      rows.forEach((row, i) => {
        y -= heights[i]
        cells.push({ ...col, y, h: heights[i], row, marks: byRow.get(row)! })
        y -= rowGap
      })
    }
  }

  // Marginal row/column counts do not predict occupancy in a correlated cell.
  // Cap each actual cell, including padding and narrow-cell bounds, then use
  // the smallest factor everywhere so equal values retain equal glyph areas.
  let scale = 1
  for (const cell of cells) {
    let area = 0,
      maxRadius = 0
    for (const m of cell.marks) {
      const r = m.packR + o.packPadding
      area += Math.PI * r * r
      maxRadius = Math.max(maxRadius, r)
    }
    if (area > 0)
      scale = Math.min(
        scale,
        Math.sqrt((o.maxAreaFraction * cell.w * cell.h) / area)
      )
    if (maxRadius > 0)
      scale = Math.min(scale, Math.min(cell.w, cell.h) / (2 * maxRadius))
  }
  const positions: Geom["positions"] = new Map()
  let fit = 1
  cells.forEach((cell, i) => {
    const packed = packCell(
      cell.marks.map((m) => ({ id: m.id, r: m.packR * scale })),
      cell.x,
      cell.y,
      cell.w,
      cell.h,
      o.packPadding * scale,
      o.iterations,
      i + 1
    )
    for (const [id, p] of packed.positions) positions.set(id, p)
    fit = Math.min(fit, packed.scale)
  })
  scale *= fit

  // Derive chrome from the final glyph sizes, including the post-relaxation fit.
  const bounds = new Map<
    string | Cell,
    { minX: number; minY: number; maxX: number; maxY: number }
  >()
  const rowCenters = new Map<string, number[]>()
  for (const cell of cells) {
    const key = o.rowMode === "banded" ? cell.row : cell
    const box = bounds.get(key) ?? {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    }
    for (const m of cell.marks) {
      const p = positions.get(m.id)!,
        r = m.packR * scale
      box.minX = Math.min(box.minX, p.px - r)
      box.maxX = Math.max(box.maxX, p.px + r)
      box.minY = Math.min(box.minY, p.py - r)
      box.maxY = Math.max(box.maxY, p.py + r)
    }
    bounds.set(key, box)
    if (o.rowMode === "stacked") {
      const centers = rowCenters.get(cell.row) ?? []
      centers.push((box.minY + box.maxY) / 2)
      rowCenters.set(cell.row, centers)
    }
  }
  for (const [row, centers] of rowCenters)
    rowLabelY.set(row, centers.reduce((a, b) => a + b, 0) / centers.length)
  const enclosures = Array.from(bounds.values(), (b) => ({
    x: b.minX - 4,
    y: b.minY - 4,
    w: b.maxX - b.minX + 8,
    h: b.maxY - b.minY + 8
  }))
  return { positions, enclosures, colBands, rowLabelY, scale }
}
