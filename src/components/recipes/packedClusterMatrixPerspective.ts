import type { NetworkPerspectiveBound } from "../stream/networkPerspective"
import type { MarkCalloutProps } from "./recipeChrome"

const textWidth = (text: string, size: number) => text.length * size * 0.6

/**
 * What packedClusterMatrix's chrome draws beyond its marks under a
 * `perspective`: ground enclosures, standing column headers (centered), row
 * labels (right-aligned) and callouts (anchored at their mark), so the
 * projection's fit keeps them in the plot.
 */
export function packedMatrixPerspectiveBounds(
  geom: {
    enclosures: ReadonlyArray<{ x: number; y: number; w: number; h: number }>
    colBands: ReadonlyArray<{ col: string; x: number; w: number }>
    rowLabelY: ReadonlyMap<string, number>
  },
  c: {
    showEnclosures: boolean
    showColumnHeaders: boolean
    showRowLabels: boolean
    headerY: number
    labelX: number
    headerFontSize: number
    labelFontSize: number
    columnLabel?: (col: string) => string
    rowLabel?: (row: string) => string
    callouts: readonly MarkCalloutProps[]
  }
): NetworkPerspectiveBound[] {
  const bounds: NetworkPerspectiveBound[] = c.showEnclosures
    ? geom.enclosures.map((b) => ({ x: b.x, y: b.y, width: b.w, height: b.h }))
    : []
  if (c.showColumnHeaders) {
    for (const b of geom.colBands) {
      const half = textWidth((c.columnLabel ?? String)(b.col), c.headerFontSize) / 2
      bounds.push({ x: b.x + b.w / 2, y: c.headerY, z: 0, extent: [half, half, c.headerFontSize, 4] })
    }
  }
  if (c.showRowLabels) {
    for (const [row, y] of geom.rowLabelY) {
      const width = textWidth((c.rowLabel ?? String)(row), c.labelFontSize)
      bounds.push({ x: c.labelX, y, z: 0, extent: [width, 0, c.labelFontSize, c.labelFontSize] })
    }
  }
  for (const co of c.callouts) {
    const half = textWidth(typeof co.label === "string" ? co.label : "", co.fontSize ?? 11) / 2
    const dx = co.labelX - co.markX
    const dy = co.labelY - co.markY
    bounds.push({
      x: co.markX,
      y: co.markY,
      extent: [Math.max(0, half - dx), Math.max(0, dx + half), Math.max(0, 14 - dy), Math.max(0, dy)]
    })
  }
  return bounds
}
