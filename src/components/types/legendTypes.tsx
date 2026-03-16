export type SupportedLegendGlyphs = "fill" | "line"

export type ItemType = SupportedLegendGlyphs | Function

export interface LegendItem {
  label: string
}

export interface LegendGroup {
  type?: ItemType
  styleFn: Function
  items: LegendItem[]
  label: string
}

/** Configuration for a gradient (continuous) legend */
export interface GradientLegendConfig {
  /** The color interpolation function: (t: 0→1) => color string */
  colorFn: (t: number) => string
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

export interface LegendProps {
  legendGroups?: LegendGroup[]
  customClickBehavior?: Function
  customHoverBehavior?: (item: LegendItem | null) => void
  /** Set of currently isolated category labels (shown with checkmarks) */
  isolatedCategories?: Set<string>
  /** Whether hover-highlighting is active (dims non-hovered items) */
  highlightedCategory?: string | null
  title?: string
  width?: number
  height?: number
  orientation?: string
  position?: "left" | "right"
}
