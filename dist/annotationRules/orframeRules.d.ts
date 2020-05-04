/// <reference types="react" />
export declare const getColumnScreenCoordinates: ({ d, projectedColumns, oAccessor, summaryType, type, projection, adjustedPosition, adjustedSize }: {
    d: any;
    projectedColumns: any;
    oAccessor: any;
    summaryType: any;
    type: any;
    projection: any;
    adjustedPosition: any;
    adjustedSize: any;
}) => {
    coordinates: any[];
    pieces: any;
    column: any;
};
export declare const svgHighlightRule: ({ d, pieceIDAccessor, orFrameRender, oAccessor }: {
    d: any;
    pieceIDAccessor: any;
    orFrameRender: any;
    oAccessor: any;
}) => any[];
export declare const findIDPiece: (pieceIDAccessor: any, oColumn: any, d: any) => any;
export declare const screenProject: ({ p, adjustedSize, rScale, oColumn, rAccessor, idPiece, projection, rScaleType }: {
    p: any;
    adjustedSize: any;
    rScale: any;
    oColumn: any;
    rAccessor: any;
    idPiece: any;
    projection: any;
    rScaleType: any;
}) => any[];
export declare const svgORRule: ({ d, i, screenCoordinates, projection }: {
    d: any;
    i: any;
    screenCoordinates: any;
    projection: any;
}) => JSX.Element;
export declare const basicReactAnnotationRule: ({ d, i, screenCoordinates }: {
    d: any;
    i: any;
    screenCoordinates: any;
}) => JSX.Element;
export declare const svgEncloseRule: ({ d, i, screenCoordinates }: {
    d: any;
    i: any;
    screenCoordinates: any;
}) => JSX.Element;
export declare const svgRRule: ({ d, i, screenCoordinates, rScale, rAccessor, adjustedSize, adjustedPosition, projection }: {
    d: any;
    i: any;
    screenCoordinates: any;
    rScale: any;
    rAccessor: any;
    adjustedSize: any;
    adjustedPosition: any;
    projection: any;
}) => JSX.Element;
export declare const svgCategoryRule: ({ projection, d, i, categories, adjustedSize }: {
    projection: any;
    d: any;
    i: any;
    categories: any;
    adjustedSize: any;
}) => JSX.Element;
export declare const htmlFrameHoverRule: ({ d, i, rAccessor, oAccessor, projection, tooltipContent, optimizeCustomTooltipPosition, useSpans, pieceIDAccessor, projectedColumns, adjustedSize, rScale, type, rScaleType }: {
    d: any;
    i: any;
    rAccessor: any;
    oAccessor: any;
    projection: any;
    tooltipContent: any;
    optimizeCustomTooltipPosition: any;
    useSpans: any;
    pieceIDAccessor: any;
    projectedColumns: any;
    adjustedSize: any;
    rScale: any;
    type: any;
    rScaleType: any;
}) => JSX.Element;
export declare const htmlColumnHoverRule: ({ d, i, summaryType, oAccessor, type, adjustedPosition, adjustedSize, projection, tooltipContent, optimizeCustomTooltipPosition, useSpans, projectedColumns }: {
    d: any;
    i: any;
    summaryType: any;
    oAccessor: any;
    type: any;
    adjustedPosition: any;
    adjustedSize: any;
    projection: any;
    tooltipContent: any;
    optimizeCustomTooltipPosition: any;
    useSpans: any;
    projectedColumns: any;
}) => JSX.Element;
export declare const svgRectEncloseRule: ({ d, i, screenCoordinates }: {
    d: any;
    i: any;
    screenCoordinates: any;
}) => JSX.Element;
export declare const svgOrdinalLine: ({ screenCoordinates, d, voronoiHover }: {
    screenCoordinates: any;
    d: any;
    voronoiHover: any;
}) => JSX.Element;
