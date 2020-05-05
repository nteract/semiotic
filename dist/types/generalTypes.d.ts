/// <reference types="react" />
export declare type GenericObject = {
    [key: string]: any;
};
export interface MarginType {
    top: number;
    bottom: number;
    left: number;
    right: number;
}
export declare type ProjectionTypes = "vertical" | "horizontal" | "radial";
export declare type ExtentType = number[] | {
    extent?: number[];
    onChange?: Function;
    includeAnnotations?: boolean;
};
export interface ProjectedPoint {
    x?: number;
    y?: number;
    xTop?: number;
    xMiddle?: number;
    xBottom?: number;
    yTop?: number;
    yMiddle?: number;
    yBottom?: number;
    parentSummary?: ProjectedSummary;
    parentLine?: ProjectedLine;
    percent?: number;
    data?: object;
    _XYFrameRank?: number;
    style?: Function | object;
    class?: Function | string;
    coordinates?: object[];
}
export declare type PieceLayoutType = (args: {
    type: any;
    data: any;
    renderMode: any;
    eventListenersGenerator: any;
    styleFn: any;
    projection: any;
    classFn: any;
    adjustedSize: any;
    chartSize: any;
    margin: any;
    rScale?: any;
    baseMarkProps: any;
}) => GenericObject[];
export interface ProjectedLine {
    data: ProjectedPoint[];
    key: string | number;
    coordinates: object[];
}
export interface ProjectedSummary {
    _baseData: object[];
    _xyfCoordinates: object[][][] | object[][] | number[][];
    coordinates: object[];
    data: object[];
    y: number;
    x: number;
    parentSummary?: GenericObject;
    bounds: object[] | number[];
    customMark: Function;
    type?: string;
    curve?: Function;
}
export declare type RoughType = {
    canvas: Function;
    generator: Function;
};
export declare type CanvasPostProcessTypes = Function;
export declare type ExtentSettingsType = {
    extent?: Array<number>;
    onChange?: Function;
};
export declare type accessorType<ReturnValue> = string | ((args?: unknown, index?: number) => ReturnValue);
export interface AccessorFnType {
    <T>(arg: GenericObject): T;
}
export declare type BasicLineTypes = "line" | "area" | "summary" | "cumulative" | "cumulative-reverse" | "linepercent" | "stackedarea" | "stackedarea-invert" | "stackedpercent" | "bumparea" | "bumparea-invert" | "bumpline" | "stackedpercent-invert" | "difference";
export interface LineTypeSettings {
    type: BasicLineTypes | Function;
    simpleLine?: boolean;
    y1?: (d?: ProjectedPoint, index?: number) => number;
}
export declare type BasicSummaryTypes = "basic" | "contour" | "hexbin" | "heatmap" | "trendline" | "linebounds";
export interface SummaryTypeSettings {
    type: BasicSummaryTypes | Function;
    label?: string | Function;
}
export interface RawLine {
    coordinates?: object[];
}
export interface RawSummary {
    processedData?: object[];
    coordinates?: object[];
    preprocess?: boolean;
}
export interface RawPoint {
}
export interface CustomAreaMarkProps {
    d: object;
    baseMarkProps: object;
    margin: object;
    styleFn: Function;
    classFn: Function;
    renderFn: Function;
    chartSize: Function;
    adjustedSize: number[];
}
export interface ProjectedBin {
    x: number;
    y: number;
    binItems: object[];
    customMark?: (props: CustomAreaMarkProps) => JSX.Element;
    _xyfCoordinates: Array<number[]>;
    value: number;
    percent: number;
    data: object;
    parentSummary: object;
    centroid: boolean;
}
export declare type GenericAccessor<GenericValue> = (args?: GenericObject, index?: number) => GenericValue;
export declare type VizLayerTypes = "pieces" | "summaries" | "connectors" | "edges" | "nodes" | "lines" | "points";
export declare type RenderPipelineType = {
    [key in VizLayerTypes]?: {
        data?: object[];
        ariaLabel?: {
            chart?: string;
            items?: string;
        };
        behavior?: Function;
    };
};
export declare type OrdinalSummaryTypes = "none" | "histogram" | "heatmap" | "violin" | "joy" | "ridgeline" | "boxplot" | "contour";
export declare type OrdinalSummaryTypeSettings = {
    type: OrdinalSummaryTypes;
    amplitude?: number;
    eventListenersGenerator?: Function;
    flip?: boolean;
};
export interface AxisSummaryTypeSettings extends OrdinalSummaryTypeSettings {
    summaryStyle?: object;
    pointStyle?: object;
    renderMode?: object | string;
    summaryClass?: string;
    r?: number;
    showPoints?: boolean;
    filter?: Function;
}
