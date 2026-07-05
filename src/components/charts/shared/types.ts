import type React from "react"
import type { PartialMargin } from "../../types/marginType"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { AnimateProp } from "../../stream/pipelineTransitionUtils"
import type { Datum } from "./datumTypes"
import type { AutoPlaceAnnotations } from "../../recipes/annotationLayout"
import type { ResponsiveRule } from "./responsiveRules"
import type { MobileVisualizationContract } from "./auditMobileVisualization"

/**
 * Selection consumption config — makes this chart react to a named selection
 */
export interface SelectionConfig {
  /** Name of the selection to consume */
  name: string
  /** Opacity for unselected elements (default 0.2) */
  unselectedOpacity?: number
  /** Style overrides for unselected elements */
  unselectedStyle?: Datum
  /** Style overrides for selected elements */
  selectedStyle?: Datum
}

/**
 * Linked hover config
 * - `true` → auto-detect fields, selection name "hover"
 * - `"myName"` → custom selection name, auto-detect fields
 * - `{ name, fields }` → explicit config
 */
export type LinkedHoverProp =
  | boolean
  | string
  // `mode: "series"` keys the linked selection off the chart's series-identity
  // field (colorBy/lineBy/areaBy/stackBy/groupBy), resolved automatically, so a
  // bar ↔ line "highlight that series" link needs no hand-wired `fields`. Pass
  // `seriesField` to override the resolved field (e.g. to align two charts
  // whose series live under different prop names).
  | { name?: string; fields?: string[]; mode?: "field" | "x-position" | "series"; xField?: string; seriesField?: string }

/**
 * Linked brush config
 * - `"selectionName"` → basic brush
 * - `{ name, xField?, yField? }` → explicit field mapping
 */
export type LinkedBrushProp =
  | string
  | { name: string; xField?: string; yField?: string }

/**
 * Chart display mode — controls default chrome, size, and interaction.
 * User-provided props always override mode defaults.
 */
export type ChartMode = "primary" | "context" | "sparkline" | "mobile"

/**
 * Hover highlighting mode.
 * `true` and `"series"` both dim non-hovered series/categories; the string
 * form is accepted for compatibility with wrapper libraries that expose a
 * more explicit per-series mode.
 */
export type HoverHighlightMode = boolean | "series"

export type MobileClearSelectionBehavior = "backgroundTap" | "none"

export type MobileSnapBehavior = "nearestDatum" | "none"

export type MobileStandardControlKind = "brush" | "zoom" | "legend"

export type MobileStandardControlsMode =
  | boolean
  | "all"
  | MobileStandardControlKind
  | MobileStandardControlKind[]

/**
 * Touch-first interaction policy for phone-sized chart slots.
 *
 * This is intentionally shared by built-in charts, custom charts, audits, and
 * generated/interoperable chart manifests so mobile behavior is not a
 * second-class per-component escape hatch.
 */
export interface MobileInteractionConfig {
  /** Explicitly enable or disable mobile interaction for an object config. */
  enabled?: boolean
  /** Convert tap/click on a datum into a persistent selection when possible. */
  tapToSelect?: boolean
  /** Convert hover-linked detail into a tap-lockable state on touch devices. */
  tapToLockTooltip?: boolean
  /** Clear the mobile interaction state when the frame reports a background tap. */
  clearSelection?: MobileClearSelectionBehavior
  /** Comfortable touch target in CSS pixels. Defaults to 44 when mobile is active. */
  targetSize?: number
  /** Hit-testing strategy for imprecise touch input. */
  snap?: MobileSnapBehavior
  /** Preferred brush handle size in CSS pixels for mobile brush affordances. */
  brushHandleSize?: number
  /** Signals that a brush/zoom/legend gesture has a standard-control alternative. */
  standardControls?: MobileStandardControlsMode
}

export type MobileInteractionProp = boolean | MobileInteractionConfig

export interface ResolvedMobileInteractionConfig {
  enabled: boolean
  tapToSelect: boolean
  tapToLockTooltip: boolean
  clearSelection: MobileClearSelectionBehavior
  targetSize: number
  snap: MobileSnapBehavior
  brushHandleSize: number
  standardControls: MobileStandardControlsMode
}

/**
 * Base props shared across all chart components
 */
export interface BaseChartProps {
  /** Display mode: "primary" (full chrome), "context" (compact), "sparkline" (inline) */
  mode?: ChartMode
  /** Chart width in pixels. Default: 600 */
  width?: number
  /** Chart height in pixels. Default: 400 */
  height?: number
  /** Margin around the chart. Accepts a number (same on all sides) or an object
   *  with any subset of `top`/`bottom`/`left`/`right`. Missing sides fall back
   *  to the chart-mode defaults. Use `"auto"` or `null` for a side to explicitly
   *  allow chart auto-reservation, e.g. `margin={{ right: "auto" }}` with a
   *  right-side legend. */
  margin?: PartialMargin
  /** Auto-match width to parent container. Default: false */
  responsiveWidth?: boolean
  /** Auto-match height to parent container (requires parent with explicit height). Default: false */
  responsiveHeight?: boolean
  /** Semantic responsive transformations keyed by measured chart slot, not CSS alone. */
  responsiveRules?: ResponsiveRule[]
  /** Phone/mobile contract consumed by audits, recipes, adapters, and agents. */
  mobileSemantics?: MobileVisualizationContract
  /** Touch-first interaction policy for phone-sized chart slots. */
  mobileInteraction?: MobileInteractionProp
  /** CSS class name for the chart container */
  className?: string
  /** Chart title displayed at the top */
  title?: string
  /** Consume a named selection — dims unselected elements */
  selection?: SelectionConfig
  /** Produce hover-based selections for cross-highlighting */
  linkedHover?: LinkedHoverProp
  /** Produce brush-based selections for cross-filtering */
  linkedBrush?: LinkedBrushProp
  /** Callback emitting structured observation events on user interaction.
   * Used by AI agent systems to observe user behavior for insight generation. */
  onObservation?: OnObservationCallback
  /** Identifier for this chart instance, included in observation events */
  chartId?: string

  /** Show a loading skeleton placeholder */
  loading?: boolean
  /** Custom content to render in place of the default skeleton when `loading` is `true`.
   *  Sibling to `emptyContent` — use for branded loading states or progress UI.
   *  When omitted, the built-in shimmer-bar skeleton renders.
   *  Pass `false` to suppress the loading UI entirely (an outer wrapper's
   *  loading state takes over). */
  loadingContent?: React.ReactNode | false
  /** Custom content to render when data is empty. Set to `false` to disable empty state. */
  emptyContent?: React.ReactNode | false

  /** Uniform fill color for all data marks. Overrides colorScheme and theme categorical.
   * For per-category coloring, use `colorBy` + `colorScheme` instead. */
  color?: string

  // ── Primitive styling (Phase B — designer-facing top-level props) ──
  //
  // These apply to whatever shape the chart draws — bars, circles, lines,
  // rects, arcs — following the "any shape uses the same props" lens.
  // Precedence: top-level prop > `frameProps.*Style` function return >
  // HOC base style > theme fallback.
  //
  // Pass a CSS variable for theme-awareness:
  //   <BarChart stroke="var(--semiotic-border)" strokeWidth={1} />
  // CSS cascade works too — override `--semiotic-border` on any ancestor DOM
  // node and every chart beneath picks up the new value, canvas included.

  /** Uniform stroke color for all data marks. Accepts a CSS variable. */
  stroke?: string
  /** Uniform stroke width in pixels. */
  strokeWidth?: number
  /** Uniform opacity for all data marks (0–1). Distinct from `--semiotic-selection-opacity` which only dims non-selected marks. */
  opacity?: number

  /** Accessible description overriding the auto-generated aria-label on the chart container.
   * Should describe the chart's purpose or content for screen reader users. */
  description?: string
  /** Accessible summary rendered as a screen-reader-only note.
   * Use for trend descriptions or key takeaways that supplement the visual. */
  summary?: string

  /** Enable accessible data table below the chart canvas. Default: true (via frame). */
  accessibleTable?: boolean

  /** Callback when a data element is clicked. Receives the original datum and pixel coordinates.
   * For lines, receives the line data; for bars, the bar datum; for pie slices, the slice datum. */
  onClick?: (datum: any, event: { x: number; y: number }) => void

  /** Dim non-hovered series when hovering a data mark. Requires `colorBy`. */
  hoverHighlight?: HoverHighlightMode

  /** Max pixel distance for hover/click hit testing. Default 30. Increase for sparse charts, decrease for dense ones. */
  hoverRadius?: number

  /** ID accessor for remove()/update() on XY charts. Extracts a unique identifier from each datum. */
  pointIdAccessor?: string | ((d: Datum) => string)
  /** ID accessor for remove()/update() on ordinal charts. Extracts a unique identifier from each datum. */
  dataIdAccessor?: string | ((d: Datum) => string)

  /** Visual emphasis level for dashboard hierarchy. "primary" spans two columns in ChartGrid. */
  emphasis?: "primary" | "secondary"

  /** Opt into annotation placement assistance. Preserves authored dx/dy by default. */
  autoPlaceAnnotations?: AutoPlaceAnnotations

  /** Enable declarative bounded animation (enter/exit/update transitions + intro).
   * `true` uses defaults (300ms ease-out, intro enabled). Object form allows customization.
   * Set `{ intro: false }` to disable the animated intro on first render. */
  animate?: AnimateProp

  /** Axis extent mode. `"nice"` (default) uses d3-scale's rounded
   *  tick generator — labels stay round but ticks may sit inside the
   *  data domain. `"exact"` pins the first and last tick to the
   *  actual data min and max with equidistant intermediate ticks.
   *  Useful when a fixed scale (gauge, score band, KPI dial) needs
   *  endpoints to read as the actual boundaries.
   *
   *  Applies to:
   *  - XY charts: both x and y axes (linear, time, log).
   *  - Ordinal charts: the value (r) axis only — the categorical
   *    axis is a band scale and doesn't have a numeric tick set.
   *  - Network / geo / hierarchy charts: no-op (no continuous axis). */
  axisExtent?: import("./axisExtent").AxisExtentMode
}

/**
 * Axis configuration props
 */
export interface AxisConfig {
  /** Label for the x-axis */
  xLabel?: string
  /** Label for the y-axis */
  yLabel?: string
  /** Format function for x-axis tick labels. Return string or ReactNode for custom rendering. */
  xFormat?: (d: number | Date | string, index?: number, allTicks?: number[]) => string | React.ReactNode
  /** Format function for y-axis tick labels. Return string or ReactNode for custom rendering. */
  yFormat?: (d: number | Date | string) => string | React.ReactNode
}

/**
 * Category formatting for ordinal chart tick labels.
 * Receives the category value and its index, returns a formatted string.
 */
export type CategoryFormatFn = (label: string, index?: number) => string | React.ReactNode

/**
 * Accessor type - can be a property name or a function
 * @deprecated Use DataAccessor from generalTypes for generic type safety
 */
export type Accessor<T = any> = string | ((d: any, i?: number) => T)

/**
 * Generic accessor type that provides autocomplete when TDatum is specified.
 * Uses Datum in the function param so HOC charts can pass
 * accessors to Stream Frames without contravariance errors under strict mode.
 */
export type ChartAccessor<TDatum, T> =
  | (keyof TDatum & string)
  | ((d: Datum, i?: number) => T)

/**
 * Color configuration
 */
export interface ColorConfig<TDatum = Datum> {
  /** Field name or function to determine color */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme name (e.g., "blues", "category10") */
  colorScheme?: string
  /** Custom color palette */
  colors?: string[]
}

/**
 * Size configuration
 */
export interface SizeConfig<TDatum = Datum> {
  /** Field name or function to determine size */
  sizeBy?: ChartAccessor<TDatum, number>
  /** Min and max size range */
  sizeRange?: [number, number]
}
