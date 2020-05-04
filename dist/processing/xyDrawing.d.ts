import * as React from "react";
import { XYFrameProps, XYFrameState } from "../types/xyTypes";
import { createPoints, createLines, createSummaries } from "../visualizationLayerBehavior/general";
import { ProjectedLine, GenericObject, LineTypeSettings, SummaryTypeSettings, RawSummary, RawPoint } from "../types/generalTypes";
export declare const calculateXYFrame: (currentProps: XYFrameProps, prevState: XYFrameState, updateData: boolean) => {
    lineData: import("../types/generalTypes").RawLine | import("../types/generalTypes").RawLine[];
    pointData: RawPoint[];
    summaryData: RawSummary | RawSummary[];
    dataVersion: string;
    projectedLines: ProjectedLine[];
    projectedPoints: import("../types/generalTypes").ProjectedPoint[];
    projectedSummaries: import("../types/generalTypes").ProjectedSummary[];
    canvasDrawing: any[];
    fullDataset: (import("../types/generalTypes").ProjectedPoint | import("../types/generalTypes").ProjectedSummary | import("../types/generalTypes").ProjectedBin)[];
    adjustedPosition: number[];
    adjustedSize: number[];
    backgroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
    foregroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
    axesData: import("../types/annotationTypes").AxisProps[];
    axes: any;
    axesTickLines: any;
    renderNumber: number;
    xScale: any;
    yScale: any;
    xAccessor: ((arg?: GenericObject, index?: number) => number)[];
    yAccessor: ((arg?: GenericObject, index?: number) => number)[];
    xExtent: any[];
    yExtent: any[];
    calculatedXExtent: any[];
    calculatedYExtent: any[];
    margin: import("../types/generalTypes").MarginType;
    legendSettings: any;
    areaAnnotations: any[];
    xyFrameRender: {
        lines: {
            accessibleTransform: (data: any, i: any) => any;
            data: ProjectedLine[];
            styleFn: (d?: GenericObject, i?: number) => GenericObject;
            classFn: (d?: GenericObject, i?: number) => string;
            renderMode: (d?: GenericObject, i?: number) => string | GenericObject;
            canvasRender: (d?: GenericObject, i?: number) => boolean;
            customMark: Function;
            type: LineTypeSettings;
            defined: Function;
            renderKeyFn: (d?: GenericObject, i?: number) => string;
            ariaLabel: {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            } | {
                items: string;
                chart: string;
            };
            axesData: import("../types/annotationTypes").AxisProps[];
            behavior: typeof createLines;
        };
        summaries: {
            accessibleTransform: (data: any, i: any) => any;
            data: import("../types/generalTypes").ProjectedSummary[];
            styleFn: (d?: GenericObject, i?: number) => GenericObject;
            classFn: (d?: GenericObject, i?: number) => string;
            renderMode: (d?: GenericObject, i?: number) => string | GenericObject;
            canvasRender: (d?: GenericObject, i?: number) => boolean;
            customMark: Function;
            type: SummaryTypeSettings;
            renderKeyFn: (d?: GenericObject, i?: number) => string;
            behavior: typeof createSummaries;
        };
        points: {
            accessibleTransform: (data: any, i: any) => any;
            data: import("../types/generalTypes").ProjectedPoint[];
            styleFn: (d?: GenericObject, i?: number) => GenericObject;
            classFn: (d?: GenericObject, i?: number) => string;
            renderMode: (d?: GenericObject, i?: number) => string | GenericObject;
            canvasRender: (d?: GenericObject, i?: number) => boolean;
            customMark: object | Function;
            renderKeyFn: (d?: GenericObject, i?: number) => string;
            showLinePoints: string | boolean;
            behavior: typeof createPoints;
        };
    };
    size: number[];
    annotatedSettings: {
        xAccessor: ((arg?: GenericObject, index?: number) => number)[];
        yAccessor: ((arg?: GenericObject, index?: number) => number)[];
        summaryDataAccessor: ((arg?: GenericObject, index?: number) => RawPoint[])[];
        lineDataAccessor: ((arg?: GenericObject, index?: number) => RawPoint[])[];
        renderKeyFn: (d?: GenericObject, i?: number) => string;
        lineType: LineTypeSettings;
        summaryType: SummaryTypeSettings;
        lineIDAccessor: (d?: GenericObject, i?: number) => string;
        summaries: RawSummary[];
        lines: import("../types/generalTypes").RawLine[];
        title: object;
        xExtent: number[];
        yExtent: number[];
    };
    overlay: any;
    props: XYFrameProps;
};
