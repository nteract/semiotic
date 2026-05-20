import type { CSSProperties, ReactElement } from "react"

export type SupportedLegendGlyphs = "fill" | "line"

export type ItemType = SupportedLegendGlyphs | ((item: LegendItem) => ReactElement)

export interface LegendItem {
  label: string
  color?: string
  [key: string]: unknown
}

export interface LegendGroup {
  type?: ItemType
  styleFn: (item: LegendItem, index: number) => CSSProperties
  items: LegendItem[]
  label: string
}

/** Configuration for a gradient (continuous) legend */
export interface GradientLegendConfig {
  /** Color function: receives a value in `domain` range and returns a color string */
  colorFn: (value: number) => string
  /** Data domain [min, max] */
  domain: [number, number]
  /** Optional label for the gradient */
  label?: string
  /** Optional format function for tick labels */
  format?: (v: number) => string
}

/** Type guard: categorical legend config */
export function isLegendConfig(value: unknown): value is { legendGroups: LegendGroup[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "legendGroups" in value
  )
}

/** Type guard: gradient legend config */
export function isGradientLegendConfig(value: unknown): value is { gradient: GradientLegendConfig } {
  return (
    typeof value === "object" &&
    value !== null &&
    "gradient" in value
  )
}

export interface LegendLayout {
  /** Horizontal alignment for top/bottom legends within the plot width */
  align?: "start" | "center" | "end" | "left" | "right"
  /** Width/height of categorical swatches in pixels */
  swatchSize?: number
  /** Gap between a swatch and its label in pixels */
  labelGap?: number
  /** Gap between horizontal legend items in pixels */
  itemGap?: number
  /** Vertical row height for stacked legend items in pixels */
  rowHeight?: number
  /** Override the alignment width used for top/bottom legends */
  maxWidth?: number
}

export interface LegendProps {
  legendGroups?: LegendGroup[]
  customClickBehavior?: (item: LegendItem) => void
  customHoverBehavior?: (item: LegendItem | null) => void
  /** Set of currently isolated category labels (shown with checkmarks) */
  isolatedCategories?: Set<string>
  /** Whether hover-highlighting is active (dims non-hovered items) */
  highlightedCategory?: string | null
  /** Legend interaction mode — used to set aria-multiselectable on the listbox */
  legendInteraction?: string
  title?: string | boolean
  width?: number
  height?: number
  orientation?: string
  position?: "left" | "right"
  legendLayout?: LegendLayout
}
