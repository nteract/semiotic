import * as React from "react";
import { orFrameConnectionRenderer } from "../svg/frameFunctions";
import { OrdinalFrameProps, OrdinalFrameState, PieceTypeSettings } from "../types/ordinalTypes";
import { AxisProps } from "../types/annotationTypes";
import { GenericObject } from "../types/generalTypes";
import { ScaleBand } from "d3-scale";
export declare const calculateMappedMiddles: (oScale: ScaleBand<string>, middleMax: number, padding: number) => {};
export declare const calculateOrdinalFrame: (currentProps: OrdinalFrameProps, currentState: OrdinalFrameState) => {
    pieceDataXY: any;
    adjustedPosition: number[];
    adjustedSize: number[];
    backgroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
    foregroundGraphics: string | number | boolean | {} | Function | React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)>) | (new (props: any) => React.Component<any, any, any>)> | React.ReactNodeArray | React.ReactPortal;
    axisData: AxisProps[];
    axes: JSX.Element[];
    axesTickLines: Object[];
    oLabels: {
        labels: any;
    };
    title: {};
    columnOverlays: any;
    renderNumber: number;
    oAccessor: ((arg?: GenericObject, index?: number) => string | number)[];
    rAccessor: ((arg?: GenericObject, index?: number) => number)[];
    oScaleType: ScaleBand<string>;
    rScaleType: any;
    oExtent: string[];
    rExtent: number[];
    oScale: any;
    rScale: any;
    calculatedOExtent: string[];
    calculatedRExtent: number[];
    projectedColumns: {};
    margin: import("../types/generalTypes").MarginType;
    legendSettings: object;
    orFrameRender: {
        connectors: {
            accessibleTransform: (data: any, i: any) => any;
            projection: "horizontal" | "vertical" | "radial";
            data: any;
            styleFn: (d?: GenericObject, i?: number) => GenericObject;
            classFn: (d?: GenericObject, i?: number) => string;
            renderMode: (d?: GenericObject, i?: number) => string | GenericObject;
            canvasRender: (d?: GenericObject, i?: number) => boolean;
            behavior: typeof orFrameConnectionRenderer;
            type: {
                type?: TimerHandler;
            };
            eventListenersGenerator: () => {};
            pieceType: PieceTypeSettings;
        };
        summaries: {
            accessibleTransform: (data: any, i: any) => {
                type: string;
                column: any;
                pieces: any;
                summary: any;
                oAccessor: ((arg?: GenericObject, index?: number) => string | number)[];
            };
            data: object[];
            behavior: ({ data }: {
                data: any;
            }) => any;
            canvasRender: (d?: GenericObject, i?: number) => boolean;
            styleFn: (d?: GenericObject, i?: number) => GenericObject;
            classFn: (d?: GenericObject, i?: number) => string;
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
            canvasRender: (d?: GenericObject, i?: number) => boolean;
            styleFn: (d?: GenericObject, i?: number) => GenericObject;
            classFn: (d?: GenericObject, i?: number) => string;
            axis: AxisProps[];
            ariaLabel: any;
        };
    };
    summaryType: {
        type?: TimerHandler;
    };
    type: PieceTypeSettings;
    pieceIDAccessor: (d?: GenericObject, i?: number) => string;
    props: OrdinalFrameProps;
};
