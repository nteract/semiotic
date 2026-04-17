/**
 * Shared sample datasets for ordinal HOC chart tests (BarChart,
 * StackedBarChart, GroupedBarChart). Previously defined locally in each
 * test file with slight variations; this module is the single source of
 * truth so shape changes (new fields, accessor renames) flow through every
 * consumer at once.
 */

// ── Bar chart — simple `{category, value}` shape ───────────────────────────

export interface BarDatum { category: string; value: number }

/** 3-point baseline used by most BarChart rendering tests. */
export const BAR_SAMPLE: readonly BarDatum[] = [
  { category: "A", value: 10 },
  { category: "B", value: 20 },
  { category: "C", value: 15 }
]

/** Smaller 2-point variant for initial-render / update-on-change tests. */
export const BAR_INITIAL: readonly BarDatum[] = [
  { category: "A", value: 10 },
  { category: "B", value: 20 }
]

/** Extended 3-point variant for "data changed" rerender tests. */
export const BAR_EXTENDED: readonly BarDatum[] = [
  { category: "A", value: 10 },
  { category: "B", value: 20 },
  { category: "C", value: 30 }
]

// ── Custom-accessor data — different field names ───────────────────────────

export interface NamedCountDatum { name: string; count: number }

/** `{name, count}` shape for verifying `categoryAccessor` / `valueAccessor` overrides. */
export const NAMED_COUNT_DATA: readonly NamedCountDatum[] = [
  { name: "A", count: 10 },
  { name: "B", count: 20 }
]

// ── Colored bar data — with a third field used for legend grouping ─────────

export interface ColoredBarDatum { category: string; value: number; type: string }

/** Used for `colorBy="type"` legend-behavior tests. */
export const BAR_COLORED: readonly ColoredBarDatum[] = [
  { category: "A", value: 10, type: "X" },
  { category: "B", value: 20, type: "Y" },
  { category: "C", value: 15, type: "X" }
]

// ── Stacked / grouped bar shape ────────────────────────────────────────────

export interface StackedBarDatum { category: string; product: string; value: number }

/**
 * Used by both StackedBarChart and GroupedBarChart tests — same shape, same
 * values; the only difference is whether the consumer passes `stackBy` or
 * `groupBy`. Two categories × two products so stacking/grouping behavior is
 * observable from the scene.
 */
export const STACKED_SAMPLE: readonly StackedBarDatum[] = [
  { category: "Q1", product: "A", value: 100 },
  { category: "Q1", product: "B", value: 150 },
  { category: "Q2", product: "A", value: 120 },
  { category: "Q2", product: "B", value: 180 }
]

// ── Grouped bar with custom accessors ──────────────────────────────────────

export interface GroupSeriesDatum { group: string; series: string; count: number }

export const GROUP_SERIES_CUSTOM: readonly GroupSeriesDatum[] = [
  { group: "X", series: "S1", count: 42 },
  { group: "X", series: "S2", count: 99 }
]
