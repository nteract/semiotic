export declare const arcTweener: (oldProps: any, newProps: any) => (t: any) => any;
export declare const drawAreaConnector: ({ x1, x2, y1, y2, sizeX1, sizeY1, sizeX2, sizeY2 }: {
    x1: any;
    x2: any;
    y1: any;
    y2: any;
    sizeX1: any;
    sizeY1: any;
    sizeX2: any;
    sizeY2: any;
}) => string;
export declare const wrap: (text: any, width: any) => void;
export declare const hexToRgb: (hex: any) => any;
export declare const groupBarMark: ({ bins, binMax, relativeBuckets, columnWidth, projection, adjustedSize, summaryI, summary, renderValue, summaryStyle, type, baseMarkProps }: {
    bins: any;
    binMax: any;
    relativeBuckets: any;
    columnWidth: any;
    projection: any;
    adjustedSize: any;
    summaryI: any;
    summary: any;
    renderValue: any;
    summaryStyle: any;
    type: any;
    baseMarkProps: any;
}) => {
    marks: any[];
    points: any[];
};
export declare function linearRibbon(): {
    (pathData: any): any;
    x(_value: any): (d: any) => any;
    y(_value: any): (d: any) => any;
    r(_value: any): (d: any) => any;
    interpolate(_value: any): any;
};
