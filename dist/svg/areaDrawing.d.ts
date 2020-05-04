export declare function lineBounding({ summaryType, data, defined }: {
    summaryType: any;
    data: any;
    defined: any;
}): any[];
export declare function contouring({ summaryType, data, finalXExtent, finalYExtent }: {
    summaryType: any;
    data: any;
    finalXExtent: any;
    finalYExtent: any;
}): any[];
export declare function hexbinning({ preprocess, processedData, summaryType, data: baseData, finalXExtent, finalYExtent, size, xScaleType, yScaleType, margin, baseMarkProps, styleFn, classFn, renderFn, chartSize }: {
    preprocess?: boolean;
    processedData?: boolean;
    summaryType: any;
    data: any;
    finalXExtent?: number[];
    finalYExtent?: number[];
    size: any;
    xScaleType?: import("d3-scale").ScaleLinear<number, number>;
    yScaleType?: import("d3-scale").ScaleLinear<number, number>;
    margin: any;
    baseMarkProps: any;
    styleFn: any;
    classFn: any;
    renderFn: any;
    chartSize: any;
}): any;
export declare function heatmapping({ preprocess, processedData, summaryType, data: baseData, finalXExtent, finalYExtent, size, xScaleType, yScaleType, margin, baseMarkProps, styleFn, classFn, renderFn, chartSize }: {
    preprocess?: boolean;
    processedData?: boolean;
    summaryType: any;
    data: any;
    finalXExtent?: number[];
    finalYExtent?: number[];
    size: any;
    xScaleType?: import("d3-scale").ScaleLinear<number, number>;
    yScaleType?: import("d3-scale").ScaleLinear<number, number>;
    margin: any;
    baseMarkProps: any;
    styleFn: any;
    classFn: any;
    renderFn: any;
    chartSize: any;
}): any;
export declare function trendlining({ preprocess, summaryType, data: baseData, finalXExtent, xScaleType }: {
    preprocess?: boolean;
    summaryType: any;
    data: any;
    finalXExtent?: number[];
    xScaleType?: import("d3-scale").ScaleLinear<number, number>;
}): any;
export declare function shapeBounds(coordinates: any): {
    center: number[];
    top: number[];
    left: number[];
    right: number[];
    bottom: number[];
};
