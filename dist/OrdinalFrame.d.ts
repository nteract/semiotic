import * as React from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import { AnnotationType } from "./types/annotationTypes";
import { AnnotationLayerProps } from "./AnnotationLayer";
import { OrdinalFrameProps, OrdinalFrameState } from "./types/ordinalTypes";
declare class OrdinalFrame extends React.Component<OrdinalFrameProps, OrdinalFrameState> {
    static defaultProps: {
        annotations: any[];
        foregroundGraphics: any[];
        annotationSettings: {};
        projection: string;
        size: number[];
        className: string;
        data: any[];
        oScaleType: typeof scaleBand;
        rScaleType: typeof scaleLinear;
        type: string;
        summaryType: string;
        useSpans: boolean;
        optimizeCustomTooltipPosition: boolean;
    };
    static displayName: string;
    constructor(props: OrdinalFrameProps);
    componentWillUnmount(): void;
    static getDerivedStateFromProps(nextProps: OrdinalFrameProps, prevState: OrdinalFrameState): {
        props: OrdinalFrameProps;
        pieceDataXY: any;
        adjustedPosition: number[];
        adjustedSize: number[];
        backgroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
        foregroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
        axisData: import("./types/annotationTypes").AxisProps[];
        axes: JSX.Element[];
        axesTickLines: Object[];
        oLabels: {
            labels: any;
        };
        title: {};
        columnOverlays: any;
        renderNumber: number;
        oAccessor: ((arg?: import("./types/generalTypes").GenericObject, index?: number) => string | number)[];
        rAccessor: ((arg?: import("./types/generalTypes").GenericObject, index?: number) => number)[];
        oScaleType: import("d3-scale").ScaleBand<string>;
        rScaleType: any;
        oExtent: string[];
        rExtent: number[];
        oScale: any;
        rScale: any;
        calculatedOExtent: string[];
        calculatedRExtent: number[];
        projectedColumns: {};
        margin: import("./types/generalTypes").MarginType;
        legendSettings: object;
        orFrameRender: {
            connectors: {
                accessibleTransform: (data: any, i: any) => any;
                projection: "horizontal" | "vertical" | "radial";
                data: any;
                styleFn: (d?: import("./types/generalTypes").GenericObject, i?: number) => import("./types/generalTypes").GenericObject;
                classFn: (d?: import("./types/generalTypes").GenericObject, i?: number) => string;
                renderMode: (d?: import("./types/generalTypes").GenericObject, i?: number) => string | import("./types/generalTypes").GenericObject;
                canvasRender: (d?: import("./types/generalTypes").GenericObject, i?: number) => boolean;
                behavior: typeof import("./svg/frameFunctions").orFrameConnectionRenderer;
                type: {
                    type?: TimerHandler;
                };
                eventListenersGenerator: () => {};
                pieceType: import("./types/ordinalTypes").PieceTypeSettings;
            };
            summaries: {
                accessibleTransform: (data: any, i: any) => {
                    type: string;
                    column: any;
                    pieces: any;
                    summary: any;
                    oAccessor: ((arg?: import("./types/generalTypes").GenericObject, index?: number) => string | number)[];
                };
                data: object[];
                behavior: ({ data }: {
                    data: any;
                }) => any;
                canvasRender: (d?: import("./types/generalTypes").GenericObject, i?: number) => boolean;
                styleFn: (d?: import("./types/generalTypes").GenericObject, i?: number) => import("./types/generalTypes").GenericObject;
                classFn: (d?: import("./types/generalTypes").GenericObject, i?: number) => string;
            };
            pieces: {
                accessibleTransform: (data: any, i: any) => any;
                shouldRender: boolean;
                data: any[];
                behavior: ({ data, shouldRender, canvasRender, canvasDrawing, styleFn, classFn, baseMarkProps, renderKeyFn, ariaLabel, axis }: {
                    data: any;
                    shouldRender: any;
                    canvasRender: any;
                    canvasDrawing: any;
                    styleFn: any;
                    classFn: any;
                    baseMarkProps: any;
                    renderKeyFn: any;
                    ariaLabel: any;
                    axis: any;
                }) => any[];
                canvasRender: (d?: import("./types/generalTypes").GenericObject, i?: number) => boolean;
                styleFn: (d?: import("./types/generalTypes").GenericObject, i?: number) => import("./types/generalTypes").GenericObject;
                classFn: (d?: import("./types/generalTypes").GenericObject, i?: number) => string;
                axis: import("./types/annotationTypes").AxisProps[];
                ariaLabel: any;
            };
        };
        summaryType: {
            type?: TimerHandler;
        };
        type: import("./types/ordinalTypes").PieceTypeSettings;
        pieceIDAccessor: (d?: import("./types/generalTypes").GenericObject, i?: number) => string;
    } | {
        props: OrdinalFrameProps;
    };
    defaultORSVGRule: ({ d, i, annotationLayer }: {
        d: AnnotationType;
        i: number;
        annotationLayer: AnnotationLayerProps;
    }) => any;
    defaultORHTMLRule: ({ d, i, annotationLayer }: {
        d: AnnotationType;
        i: number;
        annotationLayer: AnnotationLayerProps;
    }) => any;
    render(): JSX.Element;
}
export default OrdinalFrame;
