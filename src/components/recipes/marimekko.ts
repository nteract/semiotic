import * as React from "react"
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
  /**
   * Render category labels under each bar via SVG overlays. The default
   * ordinal axis can't position labels under variable-width bars (it
   * assumes a uniform band scale), so the recipe handles label
   * placement itself. @default true
   */
  showCategoryLabels?: boolean
  /**
   * Pixel-padding reserved beneath the bars for labels. Subtracted from
   * the plot height when laying out the bars. @default 22 when labels
   * are shown, 0 otherwise.
   */
  labelPadding?: number
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

  // Datum keys that the default ordinal tooltip + most user-supplied
  // tooltips will recognize. When the user's accessors are string field
  // names, we surface the cell's values under those names so the default
  // tooltip's `d[oAccessor]` / `d[rAccessor]` lookups land on real
  // values. We also expose generic `category` / `stack` / `value` fields
  // as a fallback for tooltips that don't know about the original
  // accessors.
  const categoryKey = typeof cfg.categoryAccessor === "string" ? cfg.categoryAccessor : "category"
  const stackKey = typeof cfg.stackBy === "string" ? cfg.stackBy : "stack"
  const valueKey = typeof cfg.valueAccessor === "string" ? cfg.valueAccessor : "value"
  const buildDatum = (cat: string, st: string, cellVal: number): Datum => {
    const out: Datum = { category: cat, stack: st, value: cellVal }
    if (categoryKey !== "category") out[categoryKey] = cat
    if (stackKey !== "stack") out[stackKey] = st
    if (valueKey !== "value") out[valueKey] = cellVal
    return out
  }

  const showLabels = cfg.showCategoryLabels !== false
  const labelPad = cfg.labelPadding ?? (showLabels ? 22 : 0)
  const barAreaH = Math.max(0, plot.height - labelPad)

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
  // Track each bar's screen rect so we can position label overlays
  // afterward without recomputing the cumulative x cursor math.
  const barSlots: { cat: string; x: number; w: number }[] = []
  let xCursor = plot.x
  for (const cat of finalCats) {
    const catTotal = categoryTotals.get(cat) ?? 0
    const barW = (catTotal / grand) * usableW
    if (barW <= 0) continue
    barSlots.push({ cat, x: xCursor, w: barW })

    // Inner stack: segments from top to bottom proportional to stack value.
    const inner = cellTotals.get(cat)!
    let yCursor = plot.y
    for (const st of finalStacks) {
      const cellVal = inner.get(st) ?? 0
      if (cellVal <= 0) continue
      const segH = (cellVal / catTotal) * barAreaH
      nodes.push({
        type: "rect",
        x: xCursor,
        y: yCursor,
        w: barW,
        h: segH,
        style: { fill: ctx.resolveColor(st), stroke: "none" },
        datum: buildDatum(cat, st, cellVal),
        group: st,
      })
      yCursor += segH
    }
    xCursor += barW + gutter
  }

  // Category labels — emitted as SVG overlays so they sit above the
  // canvas. Standard ordinal axes can't position labels under variable-
  // width bars (their band scale assumes uniform widths), so the recipe
  // owns label placement. Each label is centered under its bar; if a
  // label would overflow its slot, it's hidden via a simple width check.
  const overlays = showLabels && barSlots.length > 0
    // CSS variable wins so dark-mode parents (setting `--semiotic-text`
    // on a wrapper) override the default light theme's semantic.text.
    ? renderCategoryLabels(barSlots, plot.y + barAreaH + 4, `var(--semiotic-text, ${ctx.theme.semantic.text ?? "currentColor"})`)
    : null

  return { nodes, overlays }
}

function renderCategoryLabels(
  slots: { cat: string; x: number; w: number }[],
  yTop: number,
  fill: string
): import("react").ReactElement {
  const elements = slots.map((slot, i) => {
    // Approximate label width (≈ 6.5px per character at 12px font). If
    // the bar is narrower than the label, skip it — better to hide than
    // overlap neighbors.
    const approxW = slot.cat.length * 6.5
    if (approxW > slot.w - 4) return null
    return React.createElement("text", {
      key: `marimekko-label-${i}`,
      x: slot.x + slot.w / 2,
      y: yTop + 12,
      textAnchor: "middle",
      fontSize: 12,
      fill,
    }, slot.cat)
  })
  return React.createElement(React.Fragment, null, ...elements)
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
