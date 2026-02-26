import type { MarginType } from "../../types/generalTypes"

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
 */
export type Accessor<T = any> = string | ((d: any, i?: number) => T)

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
