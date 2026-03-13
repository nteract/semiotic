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
