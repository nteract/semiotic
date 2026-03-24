import type { MarginType } from "../../types/generalTypes"
import type { OnObservationCallback } from "../../store/ObservationStore"

/**
 * Selection consumption config — makes this chart react to a named selection
 */
export interface SelectionConfig {
  /** Name of the selection to consume */
  name: string
  /** Opacity for unselected elements (default 0.2) */
  unselectedOpacity?: number
  /** Style overrides for unselected elements */
  unselectedStyle?: Record<string, any>
  /** Style overrides for selected elements */
  selectedStyle?: Record<string, any>
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
  | { name?: string; fields: string[] }

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
  /** Margin around the chart. Can be number (same on all sides) or object specifying each side */
  margin?: MarginType
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

  /** Visual emphasis level for dashboard hierarchy. "primary" spans two columns in ChartGrid. */
  emphasis?: "primary" | "secondary"

  /** Enable declarative bounded animation (enter/exit/update transitions).
   * `true` uses defaults (300ms ease-out). Object form allows customization. */
  animate?: boolean | { duration?: number; easing?: "linear" | "ease-out" }
}

/**
 * Axis configuration props
 */
export interface AxisConfig {
  /** Label for the x-axis */
  xLabel?: string
  /** Label for the y-axis */
  yLabel?: string
  /** Format function for x-axis tick labels */
  xFormat?: (d: any) => string
  /** Format function for y-axis tick labels */
  yFormat?: (d: any) => string
}

/**
 * Accessor type - can be a property name or a function
 * @deprecated Use DataAccessor from generalTypes for generic type safety
 */
export type Accessor<T = any> = string | ((d: any, i?: number) => T)

/**
 * Generic accessor type that provides autocomplete when TDatum is specified.
 * Uses Record<string, any> in the function param so HOC charts can pass
 * accessors to Stream Frames without contravariance errors under strict mode.
 */
export type ChartAccessor<TDatum, T> =
  | (keyof TDatum & string)
  | ((d: Record<string, any>, i?: number) => T)

/**
 * Color configuration
 */
export interface ColorConfig<TDatum = Record<string, any>> {
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
export interface SizeConfig<TDatum = Record<string, any>> {
  /** Field name or function to determine size */
  sizeBy?: ChartAccessor<TDatum, number>
  /** Min and max size range */
  sizeRange?: [number, number]
}

