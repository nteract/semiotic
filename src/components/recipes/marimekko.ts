import type { OrdinalCustomLayout } from "../stream/ordinalCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"

export interface MarimekkoConfig {
  /** Field (or function) yielding the category for each datum. Categories become x-axis bars. */
  categoryAccessor: string | ((d: Datum) => string)
  /** Field (or function) yielding the value (segment height contribution). */
  valueAccessor: string | ((d: Datum) => number)
  /** Field (or function) yielding the stack key — segments inside each bar. */
  stackBy: string | ((d: Datum) => string)
  /** Pixel gap between adjacent category bars. @default 2 */
  gutter?: number
  /** Optional explicit category order. If omitted, uses data insertion order. */
  categoryOrder?: string[]
  /** Optional explicit stack order. If omitted, uses insertion order. */
  stackOrder?: string[]
}

/**
 * Marimekko (mosaic) chart — variable-width stacked bars where each bar's
 * width encodes its category's contribution to the grand total, and the
 * inner stacked segments encode the within-category breakdown by
 * `stackBy`. Both dimensions are proportional, making it the natural pick
 * for cohort revenue analysis, market share by segment × product, etc.
 *
 * @example
 * ```tsx
 * import { OrdinalCustomChart } from "semiotic/ordinal"
 * import { marimekkoLayout } from "semiotic/recipes"
 *
 * <OrdinalCustomChart
 *   data={salesByRegionAndProduct}
 *   layout={marimekkoLayout}
 *   layoutConfig={{
 *     categoryAccessor: "region",
 *     stackBy: "product",
 *     valueAccessor: "revenue",
 *   }}
 *   width={700}
 *   height={400}
 * />
 * ```
 */
export const marimekkoLayout: OrdinalCustomLayout<MarimekkoConfig> = (ctx) => {
  const cfg = ctx.config
  const { plot } = ctx.dimensions
  if (plot.width <= 0 || plot.height <= 0) return { nodes: [] }

  const getCategory = resolveAccessor(cfg.categoryAccessor) as (d: Datum) => string
  const getStack = resolveAccessor(cfg.stackBy) as (d: Datum) => string
  const getValue = (d: Datum): number => {
    const v = typeof cfg.valueAccessor === "function" ? cfg.valueAccessor(d) : d[cfg.valueAccessor]
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const gutter = cfg.gutter ?? 2

  // First pass: tally per-category totals + per-category-per-stack values.
  const categoryOrder: string[] = []
  const categoryTotals = new Map<string, number>()
  const stackOrder: string[] = []
  const seenStacks = new Set<string>()
  const cellTotals = new Map<string, Map<string, number>>()
  for (const d of ctx.data) {
    const cat = String(getCategory(d))
    const st = String(getStack(d))
    const val = getValue(d)
    if (!categoryTotals.has(cat)) {
      categoryOrder.push(cat)
      categoryTotals.set(cat, 0)
      cellTotals.set(cat, new Map())
    }
    if (!seenStacks.has(st)) {
      seenStacks.add(st)
      stackOrder.push(st)
    }
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + val)
    const inner = cellTotals.get(cat)!
    inner.set(st, (inner.get(st) ?? 0) + val)
  }

  // Apply optional ordering hints — categories/stacks not listed fall back to insertion order.
  const finalCats = cfg.categoryOrder
    ? mergeOrder(cfg.categoryOrder, categoryOrder, (k) => categoryTotals.has(k))
    : categoryOrder
  const finalStacks = cfg.stackOrder
    ? mergeOrder(cfg.stackOrder, stackOrder, () => true)
    : stackOrder

  const grand = finalCats.reduce((s, c) => s + (categoryTotals.get(c) ?? 0), 0)
  if (grand <= 0) return { nodes: [] }

  // Allocate horizontal width proportionally, minus gutters.
  const totalGutter = gutter * Math.max(0, finalCats.length - 1)
  const usableW = Math.max(0, plot.width - totalGutter)

  const nodes: RectSceneNode[] = []
  let xCursor = plot.x
  for (const cat of finalCats) {
    const catTotal = categoryTotals.get(cat) ?? 0
    const barW = (catTotal / grand) * usableW
    if (barW <= 0) continue

    // Inner stack: segments from top to bottom proportional to stack value.
    const inner = cellTotals.get(cat)!
    let yCursor = plot.y
    for (const st of finalStacks) {
      const cellVal = inner.get(st) ?? 0
      if (cellVal <= 0) continue
      const segH = (cellVal / catTotal) * plot.height
      nodes.push({
        type: "rect",
        x: xCursor,
        y: yCursor,
        w: barW,
        h: segH,
        style: { fill: ctx.resolveColor(st), stroke: "none" },
        datum: { _marimekkoCategory: cat, _marimekkoStack: st, _marimekkoValue: cellVal },
        group: st,
      })
      yCursor += segH
    }
    xCursor += barW + gutter
  }

  return { nodes }
}

function resolveAccessor<T = unknown>(a: string | ((d: Datum) => T)): (d: Datum) => T {
  if (typeof a === "function") return a
  return (d: Datum) => d[a] as T
}

function mergeOrder(hint: string[], fallback: string[], existsInData: (k: string) => boolean): string[] {
  // Hinted entries first (deduped, only those that exist), then any
  // remaining entries from `fallback` in insertion order.
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of hint) {
    if (existsInData(k) && !seen.has(k)) {
      seen.add(k)
      out.push(k)
    }
  }
  for (const k of fallback) {
    if (!seen.has(k)) out.push(k)
  }
  return out
}
