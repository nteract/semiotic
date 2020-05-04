import * as React from "react";
import { ProjectedPoint, ProjectedSummary, ProjectedLine, GenericObject } from "./types/generalTypes";
import { AnnotationType } from "./types/annotationTypes";
import { XYFrameProps, XYFrameState } from "./types/xyTypes";
import { AnnotationLayerProps } from "./AnnotationLayer";
declare class XYFrame extends React.Component<XYFrameProps, XYFrameState> {
    static defaultProps: {
        annotations: any[];
        foregroundGraphics: any;
        size: number[];
        className: string;
        lineType: string;
        name: string;
        dataVersion: any;
    };
    static displayName: string;
    constructor(props: XYFrameProps);
    componentWillUnmount(): void;
    static getDerivedStateFromProps(nextProps: XYFrameProps, prevState: XYFrameState): {
        lineData: import("./types/generalTypes").RawLine | import("./types/generalTypes").RawLine[];
        pointData: import("./types/generalTypes").RawPoint[];
        summaryData: import("./types/generalTypes").RawSummary | import("./types/generalTypes").RawSummary[];
        dataVersion: string;
        projectedLines: ProjectedLine[];
        projectedPoints: ProjectedPoint[];
        projectedSummaries: ProjectedSummary[];
        canvasDrawing: any[];
        fullDataset: (ProjectedPoint | ProjectedSummary | import("./types/generalTypes").ProjectedBin)[];
        adjustedPosition: number[];
        adjustedSize: number[];
        backgroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
        foregroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
        axesData: import("./types/annotationTypes").AxisProps[];
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
        margin: import("./types/generalTypes").MarginType;
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
                type: import("./types/generalTypes").LineTypeSettings;
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
                axesData: import("./types/annotationTypes").AxisProps[];
                behavior: typeof import("./visualizationLayerBehavior/general").createLines;
            };
            summaries: {
                accessibleTransform: (data: any, i: any) => any;
                data: ProjectedSummary[];
                styleFn: (d?: GenericObject, i?: number) => GenericObject;
                classFn: (d?: GenericObject, i?: number) => string;
                renderMode: (d?: GenericObject, i?: number) => string | GenericObject;
                canvasRender: (d?: GenericObject, i?: number) => boolean;
                customMark: Function;
                type: import("./types/generalTypes").SummaryTypeSettings;
                renderKeyFn: (d?: GenericObject, i?: number) => string;
                behavior: typeof import("./visualizationLayerBehavior/general").createSummaries;
            };
            points: {
                accessibleTransform: (data: any, i: any) => any;
                data: ProjectedPoint[];
                styleFn: (d?: GenericObject, i?: number) => GenericObject;
                classFn: (d?: GenericObject, i?: number) => string;
                renderMode: (d?: GenericObject, i?: number) => string | GenericObject;
                canvasRender: (d?: GenericObject, i?: number) => boolean;
                customMark: object | Function;
                renderKeyFn: (d?: GenericObject, i?: number) => string;
                showLinePoints: string | boolean;
                behavior: typeof import("./visualizationLayerBehavior/general").createPoints;
            };
        };
        size: number[];
        annotatedSettings: {
            xAccessor: ((arg?: GenericObject, index?: number) => number)[];
            yAccessor: ((arg?: GenericObject, index?: number) => number)[];
            summaryDataAccessor: ((arg?: GenericObject, index?: number) => import("./types/generalTypes").RawPoint[])[];
            lineDataAccessor: ((arg?: GenericObject, index?: number) => import("./types/generalTypes").RawPoint[])[];
            renderKeyFn: (d?: GenericObject, i?: number) => string;
            lineType: import("./types/generalTypes").LineTypeSettings;
            summaryType: import("./types/generalTypes").SummaryTypeSettings;
            lineIDAccessor: (d?: GenericObject, i?: number) => string;
            summaries: import("./types/generalTypes").RawSummary[];
            lines: import("./types/generalTypes").RawLine[];
            title: object;
            xExtent: number[];
            yExtent: number[];
        };
        overlay: any;
        props: XYFrameProps;
    };
    defaultXYSVGRule: ({ d: baseD, i, annotationLayer, lines, summaries, points }: {
        d: AnnotationType;
        i: number;
        annotationLayer: AnnotationLayerProps;
        lines: {
            data: [];
        };
        summaries: {
            data: [];
        };
        points: {
            data: [];
            styleFn: (args?: GenericObject, index?: number) => GenericObject;
        };
    }) => any;
    defaultXYHTMLRule: ({ d: baseD, i, lines, summaries, points, annotationLayer }: {
        d: AnnotationType;
        i: number;
        annotationLayer: AnnotationLayerProps;
        lines: {
            data: ProjectedLine[];
        };
        summaries: {
            data: ProjectedSummary[];
        };
        points: {
            data: ProjectedPoint[];
            styleFn: (args?: GenericObject, index?: number) => GenericObject;
        };
    }) => any;
    render(): JSX.Element;
}
export default XYFrame;
