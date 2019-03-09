export type SupportedLegendGlyphs = "fill" | "line"

export type ItemType = SupportedLegendGlyphs | Function

export interface LegendItem {
  label: string;
}

export interface LegendGroup {
  type?: ItemType;
  styleFn: Function;
  items: LegendItem[];
  label: string;
}
