import type { CustomLayout } from "../stream/customLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"
import { createSafeDatum, resolveAccessor, nonNegativeFinite } from "./recipeUtils"
import { recipeNotice, RECIPE_NOTICE_HEIGHT } from "./recipeNotice"

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
 * A visible count discloses categories receiving no cells. Invalid grids or
 * grids whose gutters leave no space for cells disclose that no rows are shown.
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
  const { plot } = ctx.dimensions
  if (plot.width <= 0 || plot.height <= 0) return { nodes: [] }
  const emptyGrid = () => ({ nodes: [], overlays: recipeNotice(plot, 0, ctx.data.length, "rows",
    "The grid needs positive integer dimensions and enough space for its gutters.", { force: true }) })
  const totalCells = rows * columns
  if (!Number.isSafeInteger(rows) || !Number.isSafeInteger(columns) ||
      !Number.isSafeInteger(totalCells) || rows <= 0 || columns <= 0 ||
      !Number.isFinite(gutter) || gutter < 0) return emptyGrid()

  // Cell footprint includes one gutter; subtract one extra gutter at the end.
  const cellW = (plot.width - gutter * (columns - 1)) / columns
  if (cellW <= 0 || plot.height <= gutter * (rows - 1)) return emptyGrid()

  // Build per-category cell allocations.
  const getCategory = cfg.categoryAccessor == null ? () => "_default" : resolveAccessor(cfg.categoryAccessor)
  const getValue = cfg.valueAccessor == null ? () => 1 : resolveAccessor(cfg.valueAccessor)

  const totals = new Map<string, number>()
  for (const d of ctx.data) {
    const cat = String(getCategory(d))
    const raw = Number(getValue(d))
    // Clamp non-finite/negative values: a waffle cell is a count and can't go below zero.
    const val = nonNegativeFinite(raw)
    totals.set(cat, (totals.get(cat) ?? 0) + val)
  }

  const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0)
  if (!(grandTotal > 0) || !Number.isFinite(grandTotal)) return {
    nodes: [], overlays: recipeNotice(plot, 0, totals.size, "categories",
      "Category values must have a finite positive total.")
  }

  // categoryOrder is an ordering *hint*: hinted categories that exist in the
  // data come first (in user-specified order, de-duplicated), then any
  // remaining categories from the data follow in insertion order. Categories
  // never get silently dropped just because they were omitted from the hint.
  const finalOrder = [...new Set([...(cfg.categoryOrder ?? []), ...totals.keys()])]
    .filter((cat) => totals.has(cat))

  // Allocate integer cell counts proportional to category share.
  // Use largest-remainder method to avoid drift from rounding each independently.
  const floored = allocate(
    finalOrder.map((key) => ({ key, weight: totals.get(key) ?? 0 })),
    totalCells, undefined, true
  )
  const shown = floored.filter((slot) => slot.cells > 0).length
  const overlays = recipeNotice(plot, shown, finalOrder.length, "categories",
    "Zero-valued categories and categories rounded to zero cells are omitted.")
  const cellH = (plot.height - (overlays ? RECIPE_NOTICE_HEIGHT : 0) - gutter * (rows - 1)) / rows
  if (cellH <= 0) return emptyGrid()

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
      set("share", (totals.get(cat) ?? 0) / grandTotal)
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
    const color = ctx.resolveColor(slot.key)
    for (let n = 0; n < slot.cells; n++) {
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
        datum: buildCellDatum(slot.key, cellIndex, slot.cells),
        group: slot.key,
        _transitionKey: `waffle-${slot.key}-${n}`,
      })
      cellIndex++
    }
  }

  return { nodes, overlays }
}

export interface CellWeight {
  /** Stable identity for the category (used as the secondary sort tiebreak). */
  key: string
  /** Relative weight — cells are allocated proportional to this. */
  weight: number
}

export interface AllocatedCells extends CellWeight {
  /** The category's exact (fractional) share of `totalCells`. */
  exact: number
  /** The integer cells assigned to this category. */
  cells: number
  /** Fractional leftover (`exact - floor(exact)`), the largest-remainder key. */
  remainder: number
}

/** Allocation metadata while preserving any additional fields from the input. */
export type AllocatedCellsFor<T extends CellWeight = CellWeight> = T & AllocatedCells

export interface AllocateCellsOptions {
  /** Cells guaranteed to every category with a positive weight, when the cell
   *  budget permits. If the requested minimum cannot fit, the largest feasible
   *  common minimum is used. Over-allocation is then clawed back from the
   *  largest categories. @default 0 */
  minPerCategory?: number
}

/**
 * Distribute `totalCells` across weighted categories so each gets a count
 * proportional to its weight, using the **largest-remainder method** (every
 * cell is assigned; no drift from rounding each share independently). The pure
 * allocation math behind a feature-mix / proportional waffle: turn `{kind →
 * count}` into `{kind → grid cells}`.
 *
 * With `minPerCategory` every present category keeps at least that many cells
 * (so small-but-nonzero categories stay visible); the shortfall is reclaimed
 * from the categories holding the most cells. Categories are returned in input
 * order — sort the input first if you want a particular legend/fill order.
 *
 * @example
 * ```ts
 * const alloc = allocateCells(
 *   [{ key: "monument", weight: 7 }, { key: "museum", weight: 2 }, { key: "park", weight: 1 }],
 *   100,
 *   { minPerCategory: 1 },
 * )
 * // → [{ key: "monument", cells: 70, … }, { key: "museum", cells: 20, … }, { key: "park", cells: 10, … }]
 * ```
 */
export function allocateCells<T extends CellWeight>(
  weights: readonly T[],
  totalCells: number,
  opts?: AllocateCellsOptions,
): AllocatedCellsFor<T>[] {
  return allocate(weights, totalCells, opts)
}

// Waffles historically resolve tied remainders in category order. Keep that
// policy while sharing the allocation/zero-weight logic with the public helper.
function allocate<T extends CellWeight>(
  weights: readonly T[],
  totalCells: number,
  opts?: AllocateCellsOptions,
  stableOrder = false
): AllocatedCellsFor<T>[] {
  const cellBudget = Number.isFinite(totalCells) ? Math.max(0, Math.floor(totalCells)) : 0
  const safeWeight = (weight: number) => Number.isFinite(weight) ? Math.max(0, weight) : 0
  const positiveCategoryCount = weights.reduce(
    (count, weight) => count + (safeWeight(weight.weight) > 0 ? 1 : 0),
    0,
  )
  const requestedMin = Math.max(0, Math.floor(opts?.minPerCategory ?? 0))
  const minPer = positiveCategoryCount > 0
    ? Math.min(requestedMin, Math.floor(cellBudget / positiveCategoryCount))
    : 0
  const total = weights.reduce((sum, weight) => sum + safeWeight(weight.weight), 0)
  if (cellBudget <= 0 || total <= 0) {
    return weights.map((w) => ({ ...w, exact: 0, cells: 0, remainder: 0 }))
  }

  const groups: AllocatedCellsFor<T>[] = weights.map((w) => {
    const weight = safeWeight(w.weight)
    const exact = (weight / total) * cellBudget
    return {
      ...w,
      exact,
      cells: weight > 0 ? Math.max(minPer, Math.floor(exact)) : 0,
      remainder: exact - Math.floor(exact),
    }
  })

  let assigned = groups.reduce((sum, g) => sum + g.cells, 0)
  // Over-allocated (the per-category minimum overshot): claw back from the
  // categories holding the most cells, breaking ties toward the smallest remainder.
  while (assigned > cellBudget) {
    const reducible = groups
      .filter((g) => g.cells > minPer)
      .sort((a, b) => b.cells - a.cells || a.remainder - b.remainder || a.key.localeCompare(b.key))[0]
    if (!reducible) break
    reducible.cells--
    assigned--
  }
  // Under-allocated: hand the leftover cells to the largest remainders. The sort
  // keys (remainder/weight/key) don't change as we bump `.cells`, so rank once.
  const ranked = groups
    .filter((group) => safeWeight(group.weight) > 0)
    .sort(
      (a, b) => b.remainder - a.remainder
        || (stableOrder ? 0 : safeWeight(b.weight) - safeWeight(a.weight) || a.key.localeCompare(b.key)),
    )
  for (let i = 0; assigned < cellBudget; i++) {
    ranked[i % ranked.length].cells++
    assigned++
  }

  return groups
}
