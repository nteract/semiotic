/// <reference types="react" />
export declare const circleEnclosure: ({ d, i, circle }: {
    d: any;
    i: any;
    circle: any;
}) => JSX.Element;
export declare const rectangleEnclosure: ({ bboxNodes, d, i }: {
    bboxNodes: any;
    d: any;
    i: any;
}) => JSX.Element;
export declare const hullEnclosure: ({ points, d, i }: {
    points: any;
    d: any;
    i: any;
}) => JSX.Element;
export declare const desaturationLayer: ({ style, size, i, key }: {
    style: {
        fill?: string;
        fillOpacity?: number;
    };
    size: number[];
    i?: number;
    key?: string;
}) => JSX.Element;
