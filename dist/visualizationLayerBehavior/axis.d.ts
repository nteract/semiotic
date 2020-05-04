import * as React from "react";
import { GenericObject } from "../types/generalTypes";
import { ScaleLinear } from "d3-scale";
declare type RenderModeFnType = (d: number, i: number) => string | GenericObject;
declare type AxisPiecesFnType = {
    renderMode?: RenderModeFnType;
    padding: number;
    scale: ScaleLinear<number, number>;
    ticks: number;
    tickValues: number[] | Function;
    orient: "left" | "right" | "top" | "bottom";
    size: number[];
    footer: boolean;
    tickSize: number;
    baseline?: boolean | "under";
    jaggedBase?: boolean;
};
export declare function generateTickValues(tickValues: any, ticks: any, scale: any): any;
export declare function axisPieces({ renderMode, padding, scale, ticks, tickValues, orient, size, footer, tickSize, jaggedBase }: AxisPiecesFnType): any;
export declare const axisLabels: ({ axisParts, tickFormat, rotate, center, orient }: {
    axisParts: any;
    tickFormat: any;
    rotate?: number;
    center?: boolean;
    orient: any;
}) => any;
export declare const baselineGenerator: (orient: any, size: any, className: any) => JSX.Element;
export declare const axisLines: ({ axisParts, orient, tickLineGenerator, baseMarkProps, className, jaggedBase, scale }: {
    axisParts: object[];
    orient: string;
    tickLineGenerator: Function;
    baseMarkProps?: GenericObject;
    className: string;
    jaggedBase?: boolean;
    scale: ScaleLinear<number, number>;
}) => React.ReactNode;
export {};
