/**
 * BigNumber and (forward-looking) SingleValueFrame types.
 *
 * BigNumber ships today as a plain React component under
 * `semiotic/value`. The type vocabulary here is intentionally a bit
 * broader than the v1 component uses — it sketches the contract a
 * future `SingleValueFrame`  would own,
 * so adopters can write against types that survive the migration.
 */

import type * as React from "react"
import type { Datum } from "../shared/datumTypes"

/**
 * Layout mode — chrome envelope around the focal value.
 *
 * - `tile` — dashboard cell. Label + value + comparison/target row + optional sparkline.
 * - `presentation` — large centered value for a slide or hero card.
 * - `inline` — value + optional delta indicator, no card chrome; flows in prose.
 * - `thumbnail` — value only, no chrome, fixed-height. For embedding in dense grids.
 */
export type BigNumberMode = "tile" | "presentation" | "inline" | "thumbnail"

/**
 * Status level mapped to a semantic CSS variable
 * (`--semiotic-success`, `--semiotic-warning`, `--semiotic-danger`,
 * `--semiotic-info`, falls through to `--semiotic-text` for `neutral`).
 */
export type BigNumberLevel =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"

/**
 * Whether a higher value is "better" semantically. Drives the
 * sentiment of a delta — a `+5` delta is positive sentiment under
 * "higher-is-better", negative under "lower-is-better", neutral when
 * the direction isn't loaded.
 */
export type BigNumberDirection =
  | "higher-is-better"
  | "lower-is-better"
  | "neutral"

/**
 * Resolved sentiment for a delta or value-vs-target. Controls whether
 * a delta renders in success-coloured or danger-coloured ink.
 * `"auto"` lets the component infer from `direction` + the sign of the delta.
 */
export type BigNumberSentiment = "auto" | "positive" | "negative" | "neutral"

/**
 * Number-format shortcut. `(value) => string` lets you plug in d3-format,
 * Intl.NumberFormat, or any custom formatter.
 *
 * Built-in shortcuts read locale + currency + precision off the props:
 *
 * - `"number"`   — Intl.NumberFormat with grouping.
 * - `"currency"` — currency style; needs `currency` prop (default USD).
 * - `"percent"`  — multiplies × 100, suffixes "%".
 * - `"compact"`  — Intl compact notation: 1.2M, 3.4K.
 * - `"duration"` — formats a millisecond duration as `1h 23m 4s`.
 */
export type BigNumberFormat =
  | "number"
  | "currency"
  | "percent"
  | "compact"
  | "duration"
  | ((value: number) => string)

/**
 * Threshold zone — a lower bound + status level. Zones must be sorted
 * ascending by `at` and resolved by "highest `at` ≤ value".
 *
 * @example
 * ```ts
 * thresholds={[
 *   { at: -Infinity, level: "danger" },
 *   { at: 50,        level: "warning" },
 *   { at: 80,        level: "success" },
 * ]}
 * ```
 */
export interface BigNumberThreshold {
  /** Lower bound (inclusive) for this zone. `-Infinity` covers everything below. */
  at: number
  /** Status level. Maps to a semantic CSS variable on the value text. */
  level: BigNumberLevel
  /** Explicit colour override; otherwise `var(--semiotic-{level})`. */
  color?: string
  /** Optional label surfaced in tooltips, the ARIA sentence, and capability output. */
  label?: string
}

/**
 * Comparison value (vs. prior period, vs. last quarter, etc.). The
 * delta is derived as `value - comparison.value` unless `delta` is set
 * explicitly on the parent.
 */
export interface BigNumberComparison {
  /** Prior-period value used to compute the delta. */
  value: number
  /** Descriptor — e.g. `"vs last quarter"`. */
  label?: string
  /** Inherit `format`/`locale`/`currency` if omitted. */
  format?: BigNumberFormat
  /** Whether higher is better. Defaults to the top-level `direction`. */
  direction?: BigNumberDirection
}

/**
 * Target / goal value. Renders as `… of {target.value}` with optional
 * progress framing (the value's distance to target).
 */
export interface BigNumberTarget {
  /** Goal value. */
  value: number
  /** Descriptor — e.g. `"of Q3 target"`. */
  label?: string
  /** Inherit `format`/`locale`/`currency` if omitted. */
  format?: BigNumberFormat
  /** Whether higher is better. Defaults to the top-level `direction`. */
  direction?: BigNumberDirection
}

// `BigNumber` ships no built-in chart renderer — embed charts via slots
// (`trendSlot` for wide / rectangular charts, `chartSlot` for square
// charts). The slot value can be a ReactNode or a function receiving
// the `BigNumberSlotContext` so the embedded chart can pick up the
// resolved threshold colour / sentiment / push buffer for cohesive
// theming.

/** Imperative ref handle for streaming/push usage. */
export interface BigNumberHandle {
  /** Append a new datapoint; updates the focal value + extends the trend. */
  push(input: number | BigNumberPushInput): void
  /** Append many in one pass. */
  pushMany(inputs: ReadonlyArray<number | BigNumberPushInput>): void
  /** Reset trend buffer and focal value. */
  clear(): void
  /** Current focal value. Returns the most-recently-pushed value when the
   *  push API has been used; otherwise falls back to the `value` prop. Returns
   *  `null` only when no push has landed AND the prop value is not finite. */
  getValue(): number | null
  /** Trend buffer snapshot (most-recent-last). */
  getData(): ReadonlyArray<BigNumberPushInput>
}

export interface BigNumberPushInput {
  value: number
  time?: number | Date
  /** Override the comparison value at this tick. */
  comparison?: number
}

/**
 * Render slots — drop-ins for any slot in the layout. ReactNode form
 * is rendered as-is; the function form receives the resolved context
 * so the slot can read formatted strings without re-deriving them.
 */
export interface BigNumberSlotContext {
  value: number | null
  formattedValue: string
  level: BigNumberLevel
  /** Resolved colour for the focal value, ready to drop into a `color` /
   *  `stroke` / `fill` prop on an embedded Semiotic chart so its marks
   *  match the BigNumber's threshold level. Either a hex / rgb string
   *  or a `var(--semiotic-{level})` reference. */
  color: string
  delta: number | null
  deltaFormatted: string | null
  /** Formatted percent change string (e.g. `"+20%"`), or null when undefined. */
  deltaPercent: string | null
  sentiment: "positive" | "negative" | "neutral"
  isStale: boolean
  /** Live push-API buffer (most-recent-last). Useful when a slot chart
   *  should redraw on every ingest — read from this in the function
   *  form so the chart re-renders alongside the focal value. */
  pushBuffer: ReadonlyArray<BigNumberPushInput>
}

export type BigNumberSlot =
  | React.ReactNode
  | ((ctx: BigNumberSlotContext) => React.ReactNode)

/**
 * The full prop surface. Intentionally broad — every block here maps
 * to a documented `SingleValueFrame` capability so users targeting
 * the v1 component can roll forward unchanged when (if) the frame ships.
 *
 * Does NOT extend `BaseChartProps` because most of those (axisExtent,
 * pointIdAccessor, linkedHover, linkedBrush, hoverHighlight, ...) are
 * irrelevant for a single value. The contract is documented per-prop.
 */
export interface BigNumberProps<TDatum extends Datum = Datum> {
  // ── Focal value ─────────────────────────────────────────────────
  /** The number this card exists to display. `null` / `undefined` / `NaN`
   *  routes the card into its empty state (see `emptyContent`); this lets
   *  consumers pass `data?.revenue` style optional values without a
   *  conditional. */
  value: number | null | undefined
  /** Top-line descriptor — e.g. `"Q3 Revenue"`. Rendered above the value. */
  label?: string
  /** Secondary descriptor, smaller, below the label. */
  caption?: string

  // ── Formatting ─────────────────────────────────────────────────
  /** Format the focal value. Default `"number"`. */
  format?: BigNumberFormat
  /** BCP-47 locale tag for built-in formats. Default `"en-US"`. */
  locale?: string
  /** ISO 4217 code; required for `format: "currency"`. Default `"USD"`. */
  currency?: string
  /** `Intl.NumberFormat` `maximumFractionDigits`. Default 0 for compact, 2 for currency, 0 elsewhere. */
  precision?: number
  /** Prepend to the formatted value. */
  prefix?: string
  /** Append to the formatted value. */
  suffix?: string
  /** Unit label rendered after the value as small text — e.g. `"USD"`, `"req/s"`. */
  unit?: string

  // ── Comparison / target / delta ─────────────────────────────────
  /** Comparison value (vs prior period). Drives delta if `delta` is not explicit. */
  comparison?: BigNumberComparison
  /** Goal value; renders alongside the comparison row. */
  target?: BigNumberTarget
  /** Explicit delta override; bypasses comparison.value subtraction. */
  delta?: number
  /** Format the delta; defaults to `format` (inherits currency/locale). */
  deltaFormat?: BigNumberFormat
  /** Also render the percent change next to the absolute delta. Default true when a comparison is present. */
  showDeltaPercent?: boolean
  /** Default direction for sentiment inference. Per-comparison/target wins. */
  direction?: BigNumberDirection
  /** Force sentiment classification. `"auto"` infers from `direction` + sign. Default `"auto"`. */
  sentiment?: BigNumberSentiment

  // ── Thresholds ─────────────────────────────────────────────────
  /** Threshold zones — ordered ascending by `at`. Defines the level
   *  applied to the value text via a semantic CSS variable. */
  thresholds?: ReadonlyArray<BigNumberThreshold>

  // ── Embedded charts (slot-driven) ───────────────────────────────
  // BigNumber renders no charts of its own — `trendSlot` and
  // `chartSlot` accept user-composed Semiotic charts (or any ReactNode).
  // The slot's function form receives `BigNumberSlotContext` so the
  // chart can read the resolved threshold level / colour / sentiment /
  // push buffer for cohesive theming.
  /** Cap the push buffer surfaced via `getData()` / `slotCtx.pushBuffer`. Default 60. */
  windowSize?: number

  // ── Layout ─────────────────────────────────────────────────────
  /** Layout mode. Default `"tile"`. */
  mode?: BigNumberMode
  /** Horizontal alignment within the card. Default `"start"` for tile,
   *  `"center"` for presentation / thumbnail, `"inherit"` for inline. */
  align?: "start" | "center" | "end"
  /** Reserve width. Default 280 (tile), 540 (presentation), unset (inline/thumbnail). */
  width?: number | string
  /** Reserve height. Default 160 (tile), 320 (presentation), unset (inline/thumbnail). */
  height?: number | string
  /** Inner padding; number or `{top, right, bottom, left}`. */
  padding?:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number }
  /** Visual emphasis hint — dashboards can use this to span columns. */
  emphasis?: "primary" | "secondary"

  // ── Styling ────────────────────────────────────────────────────
  /** Override the value text colour. CSS variables work. */
  color?: string
  /** Card background. CSS variables work; transparent by default in inline/thumbnail. */
  background?: string
  /** Border colour. Defaults to `--semiotic-border`. */
  borderColor?: string
  /** Border radius (px or any CSS length). Defaults to theme `--semiotic-border-radius`. */
  borderRadius?: number | string
  /** Optional class for the outer container. */
  className?: string
  /** Optional inline style — composed with the layout defaults. */
  style?: React.CSSProperties

  // ── Animation / streaming ──────────────────────────────────────
  /** Tween between value changes. `true` = 300ms ease-out + intro. */
  animate?:
    | boolean
    | { duration?: number; easing?: "linear" | "ease-out"; intro?: boolean }
  /** Mark the card stale (dimmed) when no push occurs for this many ms. */
  stalenessThreshold?: number
  /** Custom stale label appended to the ARIA sentence. Default `"stale"`. */
  staleLabel?: string

  // ── Slot overrides ─────────────────────────────────────────────
  /** Replace the entire header (label + caption) slot. */
  headerSlot?: BigNumberSlot
  /** Replace the focal value slot. */
  valueSlot?: BigNumberSlot
  /** Replace the delta / comparison / target row. */
  deltaSlot?: BigNumberSlot
  /** **Wide / rectangular** chart embedded beneath the value — e.g. a
   *  `LineChart` / `AreaChart` in `mode="sparkline"`. The card stays
   *  full-width and stacks the chart at full card width under the delta
   *  row. */
  trendSlot?: BigNumberSlot
  /** **Square** chart embedded beside the value — e.g. a `DonutChart` /
   *  `PieChart` / `Scatterplot` / `Treemap`. When set, the card splits
   *  into a left column (header + value + delta) and a right column
   *  (the square chart). Compose with `trendSlot` to get both
   *  (square chart on the right, wide trend along the bottom). */
  chartSlot?: BigNumberSlot
  /** Reserved pixel size (square) for `chartSlot`. Defaults are
   *  mode-keyed for sparkline scale — 44 px for `tile`, 80 px for
   *  `presentation` — so the embedded chart reads as a corner
   *  decoration. Pass a larger value for a hero-style anchor. */
  chartSize?: number
  /** Free-form footer below the trend. */
  footerSlot?: BigNumberSlot

  // ── Events ─────────────────────────────────────────────────────
  /** Card click. */
  onClick?: (
    datum: { value: number; level: BigNumberLevel; delta: number | null },
    event: { x: number; y: number }
  ) => void
  /** Generic observation hook — fires on click today; future SingleValueFrame work
   *  may extend this to value-update / hover events. */
  onObservation?: import("../../store/ObservationStore").OnObservationCallback
  /** Identifier surfaced on every observation event. */
  chartId?: string

  // ── Accessibility ──────────────────────────────────────────────
  /** Override the auto-generated aria-label sentence. */
  description?: string
  /** Sr-only supplement appended below the auto sentence. */
  summary?: string

  // ── State ──────────────────────────────────────────────────────
  /** Loading skeleton overlay. */
  loading?: boolean
  /** Replace the default skeleton; `false` suppresses it entirely. */
  loadingContent?: React.ReactNode | false
  /** Empty-state placeholder rendered when `value` is `null`/`undefined`/`NaN`. */
  emptyContent?: React.ReactNode | false
}
