import * as React from "react";
import { AxisProps } from "../types/annotationTypes";
import { MarginType, ProjectionTypes, accessorType } from "../types/generalTypes";
import { ScaleLinear } from "d3-scale";
export declare type TitleType = {
    title?: string | Element;
    orient?: string;
};
declare type PieceType = {
    type: string;
    innerRadius?: number;
};
declare type SummaryType = {
    type: string;
};
declare type CalculateMarginTypes = {
    margin?: number | object;
    axes?: Array<AxisProps>;
    title: TitleType;
    oLabel?: boolean | accessorType<string | Element>;
    projection?: ProjectionTypes;
    size?: number[];
};
declare type AdjustedPositionSizeTypes = {
    size: Array<number>;
    position?: Array<number>;
    margin: MarginType;
    projection?: ProjectionTypes;
};
declare type ORFrameConnectionRendererTypes = {
    type: {
        type: Function;
    };
    data: object;
    renderMode: Function;
    eventListenersGenerator: Function;
    styleFn: Function;
    classFn: Function;
    projection: ProjectionTypes;
    canvasRender: Function;
    canvasDrawing: Array<object>;
    baseMarkProps: object;
    pieceType: PieceType;
};
declare type ORFrameSummaryRendererTypes = {
    data: Array<object>;
    type: SummaryType;
    renderMode: Function;
    eventListenersGenerator: Function;
    styleFn: Function;
    classFn: Function;
    projection: ProjectionTypes;
    adjustedSize: Array<number>;
    chartSize: number;
    baseMarkProps: object;
    margin: object;
};
declare type ORFrameAxisGeneratorTypes = {
    projection: ProjectionTypes;
    axis?: Array<AxisProps>;
    adjustedSize: Array<number>;
    size: Array<number>;
    rScale: ScaleLinear<number, number>;
    rScaleType: ScaleLinear<number, number>;
    pieceType: PieceType;
    rExtent: Array<number>;
    data: Array<object>;
    maxColumnValues?: number;
    xyData: Array<{
        value: number;
        data: object;
    }>;
    margin: MarginType;
};
export declare const circlePath: (cx: number, cy: number, r: number) => string;
export declare const drawMarginPath: ({ margin, size, inset }: {
    margin: MarginType;
    size: number[];
    inset: number;
}) => string;
export declare const calculateMargin: ({ margin, axes, title, oLabel, projection, size }: CalculateMarginTypes) => MarginType;
declare type ObjectifyType = {
    type?: string | Function;
};
export declare function objectifyType(type?: string | Function | ObjectifyType): ObjectifyType;
export declare function generateOrdinalFrameEventListeners(customHoverBehavior: Function, customClickBehavior: Function): (d?: object, i?: number) => {
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
};
export declare function keyAndObjectifyBarData({ data, renderKey, oAccessor, rAccessor: baseRAccessor, originalRAccessor, originalOAccessor, multiAxis }: {
    data: Array<object | number>;
    renderKey: Function;
    oAccessor: Array<Function>;
    rAccessor: Array<(d: number | object, i?: number) => number>;
    multiAxis?: boolean;
    originalOAccessor: Array<string | Function>;
    originalRAccessor: Array<string | Function>;
}): {
    allData: Array<object>;
    multiExtents?: Array<Array<number>>;
};
export declare function adjustedPositionSize({ size, position, margin, projection }: AdjustedPositionSizeTypes): {
    adjustedPosition: number[];
    adjustedSize: number[];
};
export declare function generateFrameTitle({ title: rawTitle, size }: {
    title: TitleType;
    size: Array<number>;
}): any;
export declare function orFrameConnectionRenderer({ type, data, renderMode, eventListenersGenerator, styleFn, classFn, projection, canvasRender, canvasDrawing, baseMarkProps, pieceType }: ORFrameConnectionRendererTypes): any[];
export declare function orFrameSummaryRenderer({ data, type, renderMode, eventListenersGenerator, styleFn, classFn, projection, adjustedSize, chartSize, baseMarkProps, margin }: ORFrameSummaryRendererTypes): any;
export declare const orFrameAxisGenerator: ({ projection, axis, adjustedSize, size, rScale, rScaleType, pieceType, rExtent, data, maxColumnValues, xyData, margin }: ORFrameAxisGeneratorTypes) => {
    axis: JSX.Element[];
    axesTickLines: Object[];
};
export declare const canvasEvent: (canvasContext: any, overlayRegions: any, canvasMap: any, e: any) => React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)>;
export {};
