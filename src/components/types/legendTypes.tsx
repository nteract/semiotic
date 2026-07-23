import type { CSSProperties, ReactElement, ReactNode } from "react"

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

export interface CategoricalLegendConfig {
  legendGroups: LegendGroup[]
  /** Gap in pixels between the legend edge and the plot edge. Default: 10. */
  legendDistance?: number
}

export interface GradientLegendValue {
  gradient: GradientLegendConfig
  /** Gap in pixels between the legend edge and the plot edge. Default: 10. */
  legendDistance?: number
}

/** Public legend slot accepted by stream frames and legend-aware chart HOCs. */
export type LegendValue =
  | ReactNode
  | CategoricalLegendConfig
  | GradientLegendValue

/**
 * Compose inferred and caller-supplied legends without discarding either
 * categorical domain. Configured groups are appended in argument order, so
 * the chart's inferred series remain first and caller context follows.
 * Gradient/custom-node legends remain exclusive slots; the last explicit
 * value wins because those forms cannot be laid out as categorical groups.
 */
export function composeLegendConfigs(
  ...values: Array<LegendValue | null | undefined | false>
): LegendValue | undefined {
  let result: LegendValue | undefined
  for (const value of values) {
    if (!value) continue
    if (isLegendConfig(result) && isLegendConfig(value)) {
      result = {
        legendGroups: [...result.legendGroups, ...value.legendGroups],
        legendDistance: value.legendDistance ?? result.legendDistance,
      }
    } else {
      result = value
    }
  }
  return result
}

/** Type guard: categorical legend config */
export function isLegendConfig(value: unknown): value is CategoricalLegendConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    "legendGroups" in value &&
    Array.isArray((value as CategoricalLegendConfig).legendGroups)
  )
}

/** Type guard: gradient legend config */
export function isGradientLegendConfig(value: unknown): value is GradientLegendValue {
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
