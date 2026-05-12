import type React from "react"
import type { PartialMargin } from "../../types/marginType"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { AnimateProp } from "../../stream/pipelineTransitionUtils"
import type { Datum } from "./datumTypes"

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
  | { name?: string; fields?: string[]; mode?: "field" | "x-position"; xField?: string }

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
export type ChartMode = "primary" | "context" | "sparkline"

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
   *  to the chart-mode defaults. */
  margin?: PartialMargin
  /** Auto-match width to parent container. Default: false */
  responsiveWidth?: boolean
  /** Auto-match height to parent container (requires parent with explicit height). Default: false */
  responsiveHeight?: boolean
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
  hoverHighlight?: boolean

  /** Max pixel distance for hover/click hit testing. Default 30. Increase for sparse charts, decrease for dense ones. */
  hoverRadius?: number

  /** ID accessor for remove()/update() on XY charts. Extracts a unique identifier from each datum. */
  pointIdAccessor?: string | ((d: Datum) => string)
  /** ID accessor for remove()/update() on ordinal charts. Extracts a unique identifier from each datum. */
  dataIdAccessor?: string | ((d: Datum) => string)

  /** Visual emphasis level for dashboard hierarchy. "primary" spans two columns in ChartGrid. */
  emphasis?: "primary" | "secondary"

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

