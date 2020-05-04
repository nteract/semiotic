export declare type SupportedLegendGlyphs = "fill" | "line";
export declare type ItemType = SupportedLegendGlyphs | Function;
export interface LegendItem {
    label: string;
}
export interface LegendGroup {
    type?: ItemType;
    styleFn: Function;
    items: LegendItem[];
    label: string;
}
export interface LegendProps {
    legendGroups?: LegendGroup[];
    title?: string;
    width?: number;
    height?: number;
    orientation?: string;
    position?: "left" | "right";
}
