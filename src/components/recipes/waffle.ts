import type { CustomLayout } from "../stream/customLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"
import { createSafeDatum } from "./recipeUtils"

export interface WaffleConfig {
  /** Number of rows in the grid. @default 10 */
  rows?: number
  /** Number of columns in the grid. @default 10 */
  columns?: number
  /** Pixel gap between cells. @default 2 */
  gutter?: number
  /** Field name (or function) yielding the category for each datum. */
  categoryAccessor?: string | ((d: Datum) => string)
  /** Field name (or function) yielding the cell count per datum. If omitted, each datum counts as 1. */
  valueAccessor?: string | ((d: Datum) => number)
  /**
   * Optional ordering hint. Categories listed here render first, in the
   * order given (duplicates removed). Categories present in the data but
   * not in this list follow in insertion order. Categories listed here
   * but absent from the data are silently skipped.
   */
  categoryOrder?: string[]
}

/**
 * Waffle chart — a grid of cells where each cell represents one share of the
 * total. Categories are filled in row-major order, scaled so the count of
 * cells per category is proportional to its value (rounded to nearest cell).
 *
 * Layouts that don't drive scales (waffle, calendar) ignore them — the grid
 * is sized to the plot rect directly.
 *
 * @example
 * ```tsx
 * import { XYCustomChart } from "semiotic/xy"
 * import { waffleLayout } from "semiotic/recipes"
 *
 * <XYCustomChart
 *   data={[
 *     { region: "AMER", value: 42 },
 *     { region: "EMEA", value: 33 },
 *     { region: "APAC", value: 25 },
 *   ]}
 *   layout={waffleLayout}
 *   layoutConfig={{ rows: 10, columns: 10, categoryAccessor: "region", valueAccessor: "value" }}
 * />
 * ```
 */
export const waffleLayout: CustomLayout<WaffleConfig> = (ctx) => {
  const cfg = ctx.config
  const rows = cfg.rows ?? 10
  const columns = cfg.columns ?? 10
  const gutter = cfg.gutter ?? 2

  const totalCells = rows * columns
  if (rows <= 0 || columns <= 0 || totalCells <= 0) return { nodes: [] }
  const { plot } = ctx.dimensions
  if (plot.width <= 0 || plot.height <= 0) return { nodes: [] }

  // Cell footprint includes one gutter; subtract one extra gutter at the end.
  const cellW = (plot.width - gutter * (columns - 1)) / columns
  const cellH = (plot.height - gutter * (rows - 1)) / rows
  if (cellW <= 0 || cellH <= 0) return { nodes: [] }

  // Build per-category cell allocations.
  const getCategory = resolveStringOrFn(cfg.categoryAccessor) ?? (() => "_default")
  const getValue = resolveNumberOrFn(cfg.valueAccessor) ?? (() => 1)

  const totals = new Map<string, number>()
  const order: string[] = []
  for (const d of ctx.data) {
    const cat = String(getCategory(d))
    const raw = Number(getValue(d))
    // Clamp non-finite/negative values: a waffle cell is a count and can't go below zero.
    const val = Number.isFinite(raw) ? Math.max(0, raw) : 0
    if (!totals.has(cat)) order.push(cat)
    totals.set(cat, (totals.get(cat) ?? 0) + val)
  }

  const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0)
  if (grandTotal <= 0) return { nodes: [] }

  // categoryOrder is an ordering *hint*: hinted categories that exist in the
  // data come first (in user-specified order, de-duplicated), then any
  // remaining categories from the data follow in insertion order. Categories
  // never get silently dropped just because they were omitted from the hint.
  let finalOrder: string[]
  if (cfg.categoryOrder && cfg.categoryOrder.length > 0) {
    const seen = new Set<string>()
    const hinted: string[] = []
    for (const c of cfg.categoryOrder) {
      if (totals.has(c) && !seen.has(c)) {
        seen.add(c)
        hinted.push(c)
      }
    }
    finalOrder = [...hinted, ...order.filter((c) => !seen.has(c))]
  } else {
    finalOrder = order
  }
  if (finalOrder.length === 0) return { nodes: [] }

  // Allocate integer cell counts proportional to category share.
  // Use largest-remainder method to avoid drift from rounding each independently.
  const exactCounts = finalOrder.map((c) => ({ cat: c, exact: ((totals.get(c) ?? 0) / grandTotal) * totalCells }))
  const floored = exactCounts.map((r) => ({ ...r, count: Math.floor(r.exact) }))
  const assigned = floored.reduce((s, r) => s + r.count, 0)
  // Distribute leftover cells to categories with the highest remainder.
  const remainders = floored
    .map((r, i) => ({ i, rem: r.exact - r.count }))
    .sort((a, b) => b.rem - a.rem)
  for (let k = 0; k < totalCells - assigned; k++) {
    floored[remainders[k % remainders.length].i].count += 1
  }

  // Resolve string accessor names once for the datum-emit loop. Each
  // cell's datum surfaces the category and the category's TOTAL value
  // (not the per-cell count) under user-friendly keys so the default
  // tooltip picks them up — without these, the cell datum only carried
  // `_waffleCategory` / `_waffleIndex`, both underscore-prefixed and
  // therefore filtered out as "internal" by the default tooltip's key
  // scanner, producing empty tooltips. Mirrors the marimekko recipe's
  // datum-shaping pattern.
  const categoryKey = typeof cfg.categoryAccessor === "string" ? cfg.categoryAccessor : "category"
  const valueKey = typeof cfg.valueAccessor === "string" ? cfg.valueAccessor : "value"
  const buildCellDatum = (cat: string, cellIndex: number, count: number): Datum =>
    createSafeDatum((set) => {
      // Canonical keys so consumers writing portable tooltips can rely
      // on `data.category` / `data.value` regardless of accessor names.
      set("category", cat)
      set("value", totals.get(cat) ?? 0)
      // User-accessor names (when string-form) so a chart configured
      // with `categoryAccessor: "region"` reads `data.region` in custom
      // tooltips and tickFormats. Skip when the canonical key already
      // matches so we don't double-write.
      if (categoryKey !== "category") set(categoryKey, cat)
      if (valueKey !== "value") set(valueKey, totals.get(cat) ?? 0)
      // The per-category cell count (how many grid cells this category
      // occupies) is occasionally what a custom tooltip wants — pass it
      // through under an explicit name rather than burying it.
      set("cells", count)
      // Internal-by-convention. Preserved for any consumer that was
      // already pattern-matching on these (the waffle layout has been
      // shipped with them since v0).
      set("_waffleCategory", cat)
      set("_waffleIndex", cellIndex)
    })

  const nodes: RectSceneNode[] = []
  let cellIndex = 0
  for (const slot of floored) {
    const color = ctx.resolveColor(slot.cat)
    for (let n = 0; n < slot.count; n++) {
      const r = Math.floor(cellIndex / columns)
      const c = cellIndex % columns
      // Bottom-up fill reads more naturally for proportions.
      const visualRow = rows - 1 - r
      nodes.push({
        type: "rect",
        x: plot.x + c * (cellW + gutter),
        y: plot.y + visualRow * (cellH + gutter),
        w: cellW,
        h: cellH,
        style: { fill: color, stroke: "none" },
        datum: buildCellDatum(slot.cat, cellIndex, slot.count),
        group: slot.cat,
      })
      cellIndex++
    }
  }

  return { nodes }
}

function resolveStringOrFn<T>(a: string | ((d: Datum) => T) | undefined): ((d: Datum) => T) | null {
  if (a == null) return null
  if (typeof a === "function") return a
  return (d: Datum) => d[a] as T
}
function resolveNumberOrFn(a: string | ((d: Datum) => number) | undefined): ((d: Datum) => number) | null {
  if (a == null) return null
  if (typeof a === "function") return a
  return (d: Datum) => Number(d[a])
}
