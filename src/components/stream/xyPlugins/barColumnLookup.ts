import type { Datum } from "../../charts/shared/datumTypes"
import type { SceneNode } from "../types"
import type { XYMultiHover } from "./registry"
import { buildHoverData, resolveHistogramHoverXValue } from "../hoverUtils"
import {
  attachSelectionProvenance,
  getSelectionProvenance
} from "../../store/selectionProvenance"

/** Every bar in the column at one data-space x, bottom to top. */
export interface BarColumnHit {
  series: Array<{ datum: Datum; group: string; value: number; color?: string }>
  /** Hover datum for the column when no bar sits under the pointer. */
  datum: Datum
  /** Pixel x of the column center. */
  xPx: number
}

/**
 * Histogram bars in the bin containing data-space `x` (`binStart <= x <
 * binEnd`), bottom to top. Matching in data space covers the gaps between
 * bars, the space above a short stack, and bins clipped at the domain edge.
 * A bin without bars returns null: an empty bin has nothing to list.
 */
export function findBarColumnAtX(scene: SceneNode[], x: number): BarColumnHit | null {
  const series: BarColumnHit["series"] = []
  let center: number | undefined
  let binDatum: Datum | undefined
  for (const node of scene) {
    if (node.type !== "rect") continue
    const datum = node.datum as Datum | undefined
    if (typeof datum?.binStart !== "number" || typeof datum.binEnd !== "number") continue
    if (x < datum.binStart || x >= datum.binEnd) continue
    if (!binDatum) {
      center = node.x + node.w / 2
      const { binStart, binEnd, total, categories } = datum
      binDatum = categories
        ? attachSelectionProvenance({ binStart, binEnd, total, categories }, getSelectionProvenance(categories))
        : datum
    }
    series.push({
      datum,
      group: datum.category ?? "",
      value: datum.categoryValue ?? datum.total,
      color: typeof node.style.fill === "string" ? node.style.fill : undefined,
    })
  }
  return binDatum && center !== undefined ? { series, datum: binDatum, xPx: center } : null
}

/**
 * Multi-series hover for histograms: every bar in the column under `px`.
 * Without a bar under the pointer, the hover datum is the bin's own. Rows
 * have no `valuePx`, so the crosshair draws the column line without dots.
 */
export const attachBarColumnHover: XYMultiHover = (hover, store, px, options) => {
  const invert = store.scales?.x.invert
  if (typeof invert !== "function") return hover
  const raw: unknown = invert(px)
  const x = raw instanceof Date ? raw.getTime() : Number(raw)
  const column = Number.isFinite(x) ? findBarColumnAtX(store.scene, x) : null
  if (!column) return hover
  const xValue = resolveHistogramHoverXValue(column.datum, invert(column.xPx))
  const next = options.hasHit
    ? { ...hover, xValue, xPx: column.xPx }
    : buildHoverData(column.datum, hover.x, hover.y, { xValue, xPx: column.xPx })
  next.allSeries = column.series.map(s => ({
    group: s.group,
    value: s.value,
    color: s.color || options.fallbackColor,
    datum: s.datum,
  }))
  return next
}
