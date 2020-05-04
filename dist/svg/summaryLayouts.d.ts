import { GenericObject } from "../types/generalTypes";
declare type BoxplotFnType = {
    data: GenericObject[];
    type: GenericObject;
    renderMode: Function;
    eventListenersGenerator: Function;
    styleFn: Function;
    classFn: Function;
    projection: "horizontal" | "vertical" | "radial";
    adjustedSize: number[];
    baseMarkProps: GenericObject;
};
export declare function boxplotRenderFn({ data, type, renderMode, eventListenersGenerator, styleFn, classFn, projection, adjustedSize, baseMarkProps }: BoxplotFnType): {
    marks: any[];
    xyPoints: any[];
};
export declare function contourRenderFn({ data, type, renderMode, eventListenersGenerator, styleFn, classFn, adjustedSize, baseMarkProps }: {
    data: any;
    type: any;
    renderMode: any;
    eventListenersGenerator: any;
    styleFn: any;
    classFn: any;
    adjustedSize: any;
    baseMarkProps: any;
}): {
    marks: any[];
    xyPoints: any[];
};
export declare function bucketizedRenderingFn({ data, type, renderMode, eventListenersGenerator, styleFn, classFn, projection, adjustedSize, chartSize, baseMarkProps }: {
    data: any;
    type: any;
    renderMode: any;
    eventListenersGenerator: any;
    styleFn: any;
    classFn: any;
    projection: any;
    adjustedSize: any;
    chartSize: any;
    baseMarkProps: any;
}): {
    marks: any[];
    xyPoints: any[];
};
export declare const drawSummaries: ({ data, type, renderMode, eventListenersGenerator, styleFn, classFn, projection, adjustedSize, margin, baseMarkProps }: {
    data: any;
    type: any;
    renderMode: any;
    eventListenersGenerator: any;
    styleFn: any;
    classFn: any;
    projection: any;
    adjustedSize: any;
    margin: any;
    baseMarkProps: any;
}) => any;
export declare const renderLaidOutSummaries: ({ data }: {
    data: any;
}) => any;
export {};
