/// <reference types="react" />
export declare const radialCurveGenerator: (size: any) => ({ d, i, styleFn, renderMode, key, className, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const circleNodeGenerator: ({ d, i, styleFn, renderMode, key, className, transform, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    transform: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const matrixEdgeGenerator: (size: any, nodes: any) => ({ d, i, styleFn, renderMode, key, className, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const arcEdgeGenerator: (size: any) => ({ d, i, styleFn, renderMode, key, className, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const chordEdgeGenerator: (size: any) => ({ d, i, styleFn, renderMode, key, className, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const dagreEdgeGenerator: (direction: any) => ({ d, i, styleFn, renderMode, key, className, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const sankeyNodeGenerator: ({ d, i, styleFn, renderMode, key, className, transform, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    transform: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const chordNodeGenerator: (size: any) => ({ d, i, styleFn, renderMode, key, className, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const matrixNodeGenerator: (size: any, nodes: any) => ({ d, i, styleFn, renderMode, key, className, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const radialRectNodeGenerator: (size: any, center: any, type: any) => ({ d, i, styleFn, renderMode, key, className, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const radialLabelGenerator: (node: any, nodei: any, nodeIDAccessor: any, size: any) => JSX.Element;
export declare const hierarchicalRectNodeGenerator: ({ d, i, styleFn, renderMode, key, className, baseMarkProps }: {
    d: any;
    i: any;
    styleFn: any;
    renderMode: any;
    key: any;
    className: any;
    baseMarkProps: any;
}) => JSX.Element;
export declare const drawNodes: ({ data, renderKeyFn, customMark, styleFn, classFn, renderMode, canvasDrawing, canvasRenderFn, baseMarkProps }: {
    data: any;
    renderKeyFn: any;
    customMark: any;
    styleFn: any;
    classFn: any;
    renderMode: any;
    canvasDrawing: any;
    canvasRenderFn: any;
    baseMarkProps: any;
}) => any[];
export declare const drawEdges: ({ data: baseData, renderKeyFn, customMark, styleFn, classFn, renderMode, canvasRenderFn, canvasDrawing, type, baseMarkProps, networkSettings, projection }: {
    data: any;
    renderKeyFn: any;
    customMark: any;
    styleFn: any;
    classFn: any;
    renderMode: any;
    canvasRenderFn: any;
    canvasDrawing: any;
    type: any;
    baseMarkProps: any;
    networkSettings: any;
    projection: any;
}) => any[];
export declare function topologicalSort(nodesArray: any, edgesArray: any): any[];
export declare const ribbonLink: (d: any) => any;
export declare const areaLink: (d: any) => string;
export declare function circularAreaLink(link: any): any;
export declare const softStack: (edges: any, nodes: any, sourceAccessor: any, targetAccessor: any, nodeIDAccessor: any) => {
    hierarchy: {
        id: string;
        children: any[];
        childHash: {};
    };
    isHierarchical: boolean;
    hasLogicalRoot: boolean;
} | {
    hierarchy: {};
    isHierarchical: boolean;
    hasLogicalRoot: boolean;
};
