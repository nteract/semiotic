import { ProjectedLine, ProjectedPoint, RawLine, RawSummary } from "../types/generalTypes";
import { AnnotationType } from "../types/annotationTypes";
declare type SummaryProjectionTypes = {
    data: Array<RawSummary>;
    summaryDataAccessor: Array<Function>;
    xAccessor: Array<Function>;
    yAccessor: Array<Function>;
};
declare type LineProjectionTypes = {
    data: Array<RawLine>;
    lineDataAccessor: Array<Function>;
    xProp: string;
    xPropTop?: string;
    xPropBottom?: string;
    yProp: string;
    yPropTop?: string;
    yPropBottom?: string;
    xAccessor: Array<Function>;
    yAccessor: Array<Function>;
};
declare type DifferenceLineProps = {
    data: Array<ProjectedLine>;
    yProp: string;
    yPropTop: string;
    yPropBottom: string;
};
declare type StackedAreaTypes = {
    type: string;
    data: Array<ProjectedLine>;
    xProp: string;
    yProp: string;
    yPropMiddle: string;
    sort?: (a: ProjectedLine, b: ProjectedLine) => number;
    yPropTop: string;
    yPropBottom: string;
};
declare type CumulativeLineTypes = {
    type: string;
    data: Array<ProjectedLine>;
    yPropMiddle: string;
    yPropTop: string;
    yPropBottom: string;
    y1?: Function;
};
declare type LineChartTypes = {
    data: Array<ProjectedLine>;
    y1?: Function;
    x1?: Function;
    yPropTop: string;
    yPropMiddle: string;
    yPropBottom: string;
    xPropTop: string;
    xPropMiddle: string;
    xPropBottom: string;
};
declare type RelativeYTypes = {
    point?: ProjectedPoint | AnnotationType;
    projectedYMiddle: string;
    projectedY: string;
    yAccessor: Array<Function>;
    yScale: Function;
    showLinePoints?: boolean | string;
};
declare type RelativeXTypes = {
    point?: ProjectedPoint | AnnotationType;
    projectedXMiddle: string;
    projectedX: string;
    xAccessor: Array<Function>;
    xScale: Function;
};
export declare const projectSummaryData: ({ data, summaryDataAccessor, xAccessor, yAccessor }: SummaryProjectionTypes) => any[];
export declare const projectLineData: ({ data, lineDataAccessor, xProp, xPropTop, xPropBottom, yProp, yPropTop, yPropBottom, xAccessor, yAccessor }: LineProjectionTypes) => ProjectedLine[];
export declare const differenceLine: ({ data, yProp, yPropTop, yPropBottom }: DifferenceLineProps) => ProjectedLine[];
export declare const stackedArea: ({ type, data, xProp, yProp, yPropMiddle, sort, yPropTop, yPropBottom }: StackedAreaTypes) => ProjectedLine[];
export declare const lineChart: ({ data, y1, x1, yPropTop, yPropMiddle, yPropBottom, xPropTop, xPropMiddle, xPropBottom }: LineChartTypes) => ProjectedLine[];
export declare const cumulativeLine: ({ data, y1, yPropTop, yPropMiddle, yPropBottom, type }: CumulativeLineTypes) => ProjectedLine[];
export declare const bumpChart: ({ type, data, xProp, yProp, yPropMiddle, yPropTop, yPropBottom }: StackedAreaTypes) => ProjectedLine[];
export declare const dividedLine: (parameters: Function, points: Object[], searchIterations?: number) => {
    key: any;
    points: any[];
}[];
export declare function funnelize({ data, steps, key }: {
    data: Array<Object>;
    steps: Array<string>;
    key: string;
}): any[];
export declare function relativeY({ point, projectedY, yAccessor, yScale, showLinePoints }: RelativeYTypes): any;
export declare function relativeX({ point, projectedXMiddle, projectedX, xAccessor, xScale }: RelativeXTypes): any;
export declare function findPointByID({ point, idAccessor, lines, xScale, projectedX, xAccessor }: {
    point: ProjectedPoint;
    idAccessor: Function;
    lines: {
        data: ProjectedLine[];
    };
    xScale: Function;
    projectedX: string;
    xAccessor: Array<Function>;
}): ProjectedPoint;
export {};
