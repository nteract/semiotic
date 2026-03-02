import type { MarginType } from "../../types/generalTypes"

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
 * Base props shared across all chart components
 */
export interface BaseChartProps {
  /** Chart width in pixels. Default: 600 */
  width?: number
  /** Chart height in pixels. Default: 400 */
  height?: number
  /** Margin around the chart. Can be number (same on all sides) or object specifying each side */
  margin?: MarginType
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
 * Generic accessor type that provides autocomplete when TDatum is specified
 */
export type ChartAccessor<TDatum, T> =
  | (keyof TDatum & string)
  | ((d: TDatum, i?: number) => T)

/**
 * Color configuration
 */
export interface ColorConfig {
  /** Field name or function to determine color */
  colorBy?: Accessor<string>
  /** Color scheme name (e.g., "blues", "category10") */
  colorScheme?: string
  /** Custom color palette */
  colors?: string[]
}

/**
 * Size configuration
 */
export interface SizeConfig {
  /** Field name or function to determine size */
  sizeBy?: Accessor<number>
  /** Min and max size range */
  sizeRange?: [number, number]
}
