/// <reference types="react" />
import { ScaleLinear } from "d3-scale";
import { ProjectedPoint } from "../types/generalTypes";
export declare const svgHorizontalPointsAnnotation: ({ d, lines, points, xScale, yScale, pointStyle }: {
    d: any;
    lines: any;
    points: any;
    xScale: any;
    yScale: any;
    pointStyle: any;
}) => JSX.Element[];
export declare const svgVerticalPointsAnnotation: ({ d, lines, points, xScale, yScale, pointStyle }: {
    d: any;
    lines: any;
    points: any;
    xScale: any;
    yScale: any;
    pointStyle: any;
}) => JSX.Element[];
export declare const svgHighlight: ({ d, i, points, lines, summaries, idAccessor, xScale, yScale, xyFrameRender, defined }: {
    d: ProjectedPoint;
    i?: number;
    points: {
        data: [];
    };
    lines: {
        data: [];
        type?: {
            interpolator?: TimerHandler;
            curve?: TimerHandler;
        };
    };
    summaries: {
        data: [];
    };
    idAccessor: Function;
    xScale: ScaleLinear<number, number>;
    yScale: ScaleLinear<number, number>;
    xyFrameRender: any;
    defined: Function;
}) => JSX.Element[];
export declare const svgXYAnnotation: ({ screenCoordinates, i, d }: {
    screenCoordinates: any;
    i: any;
    d: any;
}) => any[];
export declare const basicReactAnnotation: ({ screenCoordinates, d, i }: {
    screenCoordinates: any;
    d: any;
    i: any;
}) => JSX.Element;
export declare const svgXAnnotation: ({ screenCoordinates, d, i, adjustedSize }: {
    screenCoordinates: any;
    d: any;
    i: any;
    adjustedSize: any;
}) => JSX.Element;
export declare const svgYAnnotation: ({ screenCoordinates, d, i, adjustedSize, adjustedPosition }: {
    screenCoordinates: any;
    d: any;
    i: any;
    adjustedSize: any;
    adjustedPosition: any;
}) => JSX.Element;
export declare const svgBoundsAnnotation: ({ d, i, adjustedSize, xAccessor, yAccessor, xScale, yScale }: {
    d: any;
    i: any;
    adjustedSize: any;
    xAccessor: any;
    yAccessor: any;
    xScale: any;
    yScale: any;
}) => JSX.Element;
export declare const svgLineAnnotation: ({ d, i, screenCoordinates }: {
    d: any;
    i: any;
    screenCoordinates: any;
}) => JSX.Element[];
export declare const svgAreaAnnotation: ({ d, i, xScale, xAccessor, yScale, yAccessor, annotationLayer }: {
    d: any;
    i: any;
    xScale: any;
    xAccessor: any;
    yScale: any;
    yAccessor: any;
    annotationLayer: any;
}) => JSX.Element[];
export declare const htmlTooltipAnnotation: ({ content, screenCoordinates, i, d, useSpans }: {
    content: any;
    screenCoordinates: any;
    i: any;
    d: any;
    useSpans: any;
}) => JSX.Element;
export declare const svgRectEncloseAnnotation: ({ d, i, screenCoordinates }: {
    d: any;
    i: any;
    screenCoordinates: any;
}) => JSX.Element;
export declare const svgEncloseAnnotation: ({ screenCoordinates, d, i }: {
    screenCoordinates: any;
    d: any;
    i: any;
}) => JSX.Element;
export declare const svgHullEncloseAnnotation: ({ screenCoordinates, d, i }: {
    screenCoordinates: any;
    d: any;
    i: any;
}) => JSX.Element;
