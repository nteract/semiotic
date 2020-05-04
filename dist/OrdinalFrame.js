"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var d3_scale_1 = require("d3-scale");
var frame_props_1 = require("./constants/frame_props");
var orframeRules_1 = require("./annotationRules/orframeRules");
var baseRules_1 = require("./annotationRules/baseRules");
var multiAccessorUtils_1 = require("./data/multiAccessorUtils");
var Frame_1 = __importDefault(require("./Frame"));
var dataFunctions_1 = require("./data/dataFunctions");
var ordinal_1 = require("./processing/ordinal");
var xScale = d3_scale_1.scaleLinear();
var yScale = d3_scale_1.scaleLinear();
var projectedCoordinatesObject = { y: "y", x: "x" };
var defaultOverflow = { top: 0, bottom: 0, left: 0, right: 0 };
var OrdinalFrame = /** @class */ (function (_super) {
    __extends(OrdinalFrame, _super);
    function OrdinalFrame(props) {
        var _this = _super.call(this, props) || this;
        _this.defaultORSVGRule = function (_a) {
            var d = _a.d, i = _a.i, annotationLayer = _a.annotationLayer;
            var _b = _this.props, projection = _b.projection, svgAnnotationRules = _b.svgAnnotationRules;
            var _c = _this.state, adjustedPosition = _c.adjustedPosition, adjustedSize = _c.adjustedSize, oAccessor = _c.oAccessor, rAccessor = _c.rAccessor, oScale = _c.oScale, rScale = _c.rScale, projectedColumns = _c.projectedColumns, orFrameRender = _c.orFrameRender, pieceIDAccessor = _c.pieceIDAccessor, rScaleType = _c.rScaleType;
            var screenCoordinates = [0, 0];
            //TODO: Support radial??
            if (d.coordinates || (d.type === "enclose" && d.neighbors)) {
                screenCoordinates = (d.coordinates || d.neighbors).map(function (p) {
                    var pO = multiAccessorUtils_1.findFirstAccessorValue(oAccessor, p) || p.column;
                    var oColumn = projectedColumns[pO];
                    var idPiece = orframeRules_1.findIDPiece(pieceIDAccessor, oColumn, p);
                    return orframeRules_1.screenProject({
                        p: p,
                        adjustedSize: adjustedSize,
                        rScale: rScale,
                        rAccessor: rAccessor,
                        idPiece: idPiece,
                        projection: projection,
                        oColumn: oColumn,
                        rScaleType: rScaleType
                    });
                });
            }
            else {
                var pO = multiAccessorUtils_1.findFirstAccessorValue(oAccessor, d) || d.column;
                var oColumn = projectedColumns[pO];
                var idPiece = orframeRules_1.findIDPiece(pieceIDAccessor, oColumn, d);
                screenCoordinates = orframeRules_1.screenProject({
                    p: d,
                    adjustedSize: adjustedSize,
                    rScale: rScale,
                    rAccessor: rAccessor,
                    idPiece: idPiece,
                    projection: projection,
                    oColumn: oColumn,
                    rScaleType: rScaleType
                });
            }
            var voronoiHover = annotationLayer.voronoiHover;
            //TODO: Process your rules first
            var customAnnotation = svgAnnotationRules &&
                svgAnnotationRules({
                    d: d,
                    i: i,
                    oScale: oScale,
                    rScale: rScale,
                    oAccessor: oAccessor,
                    rAccessor: rAccessor,
                    orFrameProps: _this.props,
                    orFrameState: _this.state,
                    screenCoordinates: screenCoordinates,
                    adjustedPosition: adjustedPosition,
                    adjustedSize: adjustedSize,
                    annotationLayer: annotationLayer,
                    categories: projectedColumns,
                    voronoiHover: voronoiHover
                });
            if (svgAnnotationRules && customAnnotation !== null) {
                return customAnnotation;
            }
            else if (d.type === "desaturation-layer") {
                return baseRules_1.desaturationLayer({
                    style: d.style instanceof Function ? d.style(d, i) : d.style,
                    size: adjustedSize,
                    i: i,
                    key: d.key
                });
            }
            else if (d.type === "ordinal-line") {
                return orframeRules_1.svgOrdinalLine({ d: d, screenCoordinates: screenCoordinates, voronoiHover: voronoiHover });
            }
            else if (d.type === "or") {
                return orframeRules_1.svgORRule({ d: d, i: i, screenCoordinates: screenCoordinates, projection: projection });
            }
            else if (d.type === "highlight") {
                return orframeRules_1.svgHighlightRule({
                    d: d,
                    pieceIDAccessor: pieceIDAccessor,
                    orFrameRender: orFrameRender,
                    oAccessor: oAccessor
                });
            }
            else if (d.type === "react-annotation" || typeof d.type === "function") {
                return orframeRules_1.basicReactAnnotationRule({ d: d, i: i, screenCoordinates: screenCoordinates });
            }
            else if (d.type === "enclose") {
                return orframeRules_1.svgEncloseRule({ d: d, i: i, screenCoordinates: screenCoordinates });
            }
            else if (d.type === "enclose-rect") {
                return orframeRules_1.svgRectEncloseRule({ d: d, screenCoordinates: screenCoordinates, i: i });
            }
            else if (d.type === "r") {
                return orframeRules_1.svgRRule({
                    d: d,
                    i: i,
                    screenCoordinates: screenCoordinates,
                    rScale: rScale,
                    rAccessor: rAccessor,
                    projection: projection,
                    adjustedSize: adjustedSize,
                    adjustedPosition: adjustedPosition
                });
            }
            else if (d.type === "category") {
                return orframeRules_1.svgCategoryRule({
                    projection: projection,
                    d: d,
                    i: i,
                    categories: _this.state.projectedColumns,
                    adjustedSize: adjustedSize
                });
            }
            return null;
        };
        _this.defaultORHTMLRule = function (_a) {
            var d = _a.d, i = _a.i, annotationLayer = _a.annotationLayer;
            var _b = _this.state, adjustedPosition = _b.adjustedPosition, adjustedSize = _b.adjustedSize, oAccessor = _b.oAccessor, rAccessor = _b.rAccessor, oScale = _b.oScale, rScale = _b.rScale, projectedColumns = _b.projectedColumns, summaryType = _b.summaryType, type = _b.type, pieceIDAccessor = _b.pieceIDAccessor, rScaleType = _b.rScaleType;
            var _c = _this.props, htmlAnnotationRules = _c.htmlAnnotationRules, tooltipContent = _c.tooltipContent, optimizeCustomTooltipPosition = _c.optimizeCustomTooltipPosition, projection = _c.projection, size = _c.size, useSpans = _c.useSpans;
            var screenCoordinates = [0, 0];
            var voronoiHover = annotationLayer.voronoiHover;
            if (d.coordinates || (d.type === "enclose" && d.neighbors)) {
                screenCoordinates = (d.coordinates || d.neighbors).map(function (p) {
                    var pO = multiAccessorUtils_1.findFirstAccessorValue(oAccessor, p) || p.column;
                    var oColumn = projectedColumns[pO];
                    var idPiece = orframeRules_1.findIDPiece(pieceIDAccessor, oColumn, p);
                    return orframeRules_1.screenProject({
                        p: p,
                        adjustedSize: adjustedSize,
                        rScale: rScale,
                        rAccessor: rAccessor,
                        idPiece: idPiece,
                        projection: projection,
                        oColumn: oColumn,
                        rScaleType: rScaleType
                    });
                });
            }
            else if (d.type === "column-hover") {
                var _d = __read(orframeRules_1.getColumnScreenCoordinates({
                    d: d,
                    projectedColumns: projectedColumns,
                    oAccessor: oAccessor,
                    summaryType: summaryType,
                    type: type,
                    projection: projection,
                    adjustedPosition: adjustedPosition,
                    adjustedSize: adjustedSize
                }).coordinates, 2), xPosition = _d[0], yPosition = _d[1];
                screenCoordinates = [xPosition, yPosition];
            }
            else {
                var pO = multiAccessorUtils_1.findFirstAccessorValue(oAccessor, d) || d.column;
                var oColumn = projectedColumns[pO];
                var idPiece = orframeRules_1.findIDPiece(pieceIDAccessor, oColumn, d);
                screenCoordinates = orframeRules_1.screenProject({
                    p: d,
                    adjustedSize: adjustedSize,
                    rScale: rScale,
                    rAccessor: rAccessor,
                    idPiece: idPiece,
                    projection: projection,
                    oColumn: oColumn,
                    rScaleType: rScaleType
                });
            }
            var flippedRScale = projection === "vertical"
                ? rScaleType.domain(rScale.domain()).range(rScale.range().reverse())
                : rScale;
            //TODO: Process your rules first
            var customAnnotation = htmlAnnotationRules &&
                htmlAnnotationRules({
                    d: d,
                    i: i,
                    oScale: oScale,
                    rScale: flippedRScale,
                    oAccessor: oAccessor,
                    rAccessor: rAccessor,
                    orFrameProps: _this.props,
                    screenCoordinates: screenCoordinates,
                    adjustedPosition: adjustedPosition,
                    adjustedSize: adjustedSize,
                    annotationLayer: annotationLayer,
                    orFrameState: _this.state,
                    categories: _this.state.projectedColumns,
                    voronoiHover: voronoiHover
                });
            if (htmlAnnotationRules && customAnnotation !== null) {
                return customAnnotation;
            }
            if (d.type === "frame-hover") {
                return orframeRules_1.htmlFrameHoverRule({
                    d: d,
                    i: i,
                    rAccessor: rAccessor,
                    oAccessor: oAccessor,
                    projection: projection,
                    tooltipContent: tooltipContent,
                    optimizeCustomTooltipPosition: optimizeCustomTooltipPosition,
                    projectedColumns: projectedColumns,
                    useSpans: useSpans,
                    pieceIDAccessor: pieceIDAccessor,
                    adjustedSize: adjustedSize,
                    rScale: rScale,
                    type: type,
                    rScaleType: rScaleType
                });
            }
            else if (d.type === "column-hover") {
                return orframeRules_1.htmlColumnHoverRule({
                    d: d,
                    i: i,
                    summaryType: summaryType,
                    oAccessor: oAccessor,
                    projectedColumns: projectedColumns,
                    type: type,
                    adjustedPosition: adjustedPosition,
                    adjustedSize: adjustedSize,
                    projection: projection,
                    tooltipContent: tooltipContent,
                    optimizeCustomTooltipPosition: optimizeCustomTooltipPosition,
                    useSpans: useSpans
                });
            }
            return null;
        };
        var baseState = {
            adjustedPosition: [],
            adjustedSize: [],
            backgroundGraphics: undefined,
            foregroundGraphics: undefined,
            axisData: undefined,
            renderNumber: 0,
            oLabels: { labels: [] },
            oAccessor: dataFunctions_1.stringToArrayFn("renderKey"),
            rAccessor: dataFunctions_1.stringToArrayFn("value"),
            oScale: d3_scale_1.scaleBand(),
            rScale: d3_scale_1.scaleLinear(),
            axes: undefined,
            calculatedOExtent: [],
            calculatedRExtent: [0, 1],
            columnOverlays: [],
            dataVersion: undefined,
            legendSettings: undefined,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            oExtent: [],
            oScaleType: d3_scale_1.scaleBand(),
            orFrameRender: {},
            pieceDataXY: [],
            pieceIDAccessor: dataFunctions_1.stringToFn("semioticPieceID"),
            projectedColumns: {},
            rExtent: [],
            rScaleType: d3_scale_1.scaleLinear(),
            summaryType: { type: "none" },
            title: {},
            type: { type: "none" },
            props: props
        };
        _this.state = __assign(__assign({}, baseState), ordinal_1.calculateOrdinalFrame(props, baseState));
        Object.keys(props).forEach(function (d) {
            if (!frame_props_1.ordinalframeproptypes[d]) {
                if (frame_props_1.xyframeproptypes[d]) {
                    console.error(d + " is an XYFrame prop are you sure you're using the right frame?");
                }
                else if (frame_props_1.networkframeproptypes[d]) {
                    console.error(d + " is a NetworkFrame prop are you sure you're using the right frame?");
                }
                else {
                    console.error(d + " is not a valid OrdinalFrame prop");
                }
            }
        });
        return _this;
    }
    OrdinalFrame.prototype.componentWillUnmount = function () {
        var onUnmount = this.props.onUnmount;
        if (onUnmount) {
            onUnmount(this.props, this.state);
        }
    };
    OrdinalFrame.getDerivedStateFromProps = function (nextProps, prevState) {
        var props = prevState.props;
        if ((((prevState.dataVersion &&
            prevState.dataVersion !== nextProps.dataVersion) ||
            !prevState.projectedColumns) || (props.size[0] !== nextProps.size[0] ||
            props.size[1] !== nextProps.size[1] ||
            (!prevState.dataVersion &&
                frame_props_1.orFrameChangeProps.find(function (d) {
                    return props[d] !== nextProps[d];
                }))))) {
            return __assign(__assign({}, ordinal_1.calculateOrdinalFrame(nextProps, prevState)), { props: nextProps });
        }
        else {
            return { props: nextProps };
        }
    };
    OrdinalFrame.prototype.render = function () {
        var _a = this.props, className = _a.className, annotationSettings = _a.annotationSettings, annotations = _a.annotations, matte = _a.matte, renderKey = _a.renderKey, interaction = _a.interaction, customClickBehavior = _a.customClickBehavior, customHoverBehavior = _a.customHoverBehavior, customDoubleClickBehavior = _a.customDoubleClickBehavior, projection = _a.projection, backgroundGraphics = _a.backgroundGraphics, foregroundGraphics = _a.foregroundGraphics, afterElements = _a.afterElements, beforeElements = _a.beforeElements, disableContext = _a.disableContext, summaryType = _a.summaryType, summaryHoverAnnotation = _a.summaryHoverAnnotation, pieceHoverAnnotation = _a.pieceHoverAnnotation, hoverAnnotation = _a.hoverAnnotation, canvasPostProcess = _a.canvasPostProcess, baseMarkProps = _a.baseMarkProps, useSpans = _a.useSpans, canvasPieces = _a.canvasPieces, canvasSummaries = _a.canvasSummaries, canvasConnectors = _a.canvasConnectors, renderOrder = _a.renderOrder, additionalDefs = _a.additionalDefs, sketchyRenderingEngine = _a.sketchyRenderingEngine, frameRenderOrder = _a.frameRenderOrder, disableCanvasInteraction = _a.disableCanvasInteraction;
        var _b = this.state, orFrameRender = _b.orFrameRender, projectedColumns = _b.projectedColumns, adjustedPosition = _b.adjustedPosition, adjustedSize = _b.adjustedSize, legendSettings = _b.legendSettings, columnOverlays = _b.columnOverlays, axesTickLines = _b.axesTickLines, axes = _b.axes, margin = _b.margin, pieceDataXY = _b.pieceDataXY, oLabels = _b.oLabels, title = _b.title;
        var size = [
            adjustedSize[0] + margin.left + margin.right,
            adjustedSize[1] + margin.top + margin.bottom
        ];
        var interactionOverflow;
        if (summaryType && summaryType.amplitude) {
            if (projection === "horizontal") {
                interactionOverflow = {
                    top: summaryType.amplitude,
                    bottom: 0,
                    left: 0,
                    right: 0
                };
            }
            else if (projection === "radial") {
                interactionOverflow = defaultOverflow;
            }
            else {
                interactionOverflow = {
                    top: 0,
                    bottom: 0,
                    left: summaryType.amplitude,
                    right: 0
                };
            }
        }
        var renderedForegroundGraphics = typeof foregroundGraphics === "function"
            ? foregroundGraphics({ size: size, margin: margin })
            : foregroundGraphics;
        return (React.createElement(Frame_1.default, { name: "ordinalframe", renderPipeline: orFrameRender, adjustedPosition: adjustedPosition, adjustedSize: adjustedSize, size: size, xScale: xScale, yScale: yScale, axes: axes, useSpans: useSpans, axesTickLines: axesTickLines, title: title, matte: matte, additionalDefs: additionalDefs, className: className + " " + projection, frameKey: "none", renderFn: renderKey, projectedCoordinateNames: projectedCoordinatesObject, defaultSVGRule: this.defaultORSVGRule.bind(this), defaultHTMLRule: this.defaultORHTMLRule.bind(this), hoverAnnotation: summaryHoverAnnotation || pieceHoverAnnotation || hoverAnnotation, annotations: annotations, annotationSettings: annotationSettings, legendSettings: legendSettings, interaction: interaction && __assign(__assign({}, interaction), { brush: interaction.columnsBrush !== true && "oBrush", projection: projection,
                projectedColumns: projectedColumns }), customClickBehavior: customClickBehavior, customHoverBehavior: customHoverBehavior, customDoubleClickBehavior: customDoubleClickBehavior, points: pieceDataXY, margin: margin, columns: projectedColumns, backgroundGraphics: backgroundGraphics, foregroundGraphics: renderedForegroundGraphics, beforeElements: beforeElements, afterElements: afterElements, overlay: columnOverlays, rScale: this.state.rScale, projection: projection, disableContext: disableContext, interactionOverflow: interactionOverflow, canvasPostProcess: canvasPostProcess, baseMarkProps: baseMarkProps, canvasRendering: !!(canvasPieces || canvasSummaries || canvasConnectors), renderOrder: renderOrder, disableCanvasInteraction: disableCanvasInteraction, sketchyRenderingEngine: sketchyRenderingEngine, frameRenderOrder: frameRenderOrder, additionalVizElements: oLabels }));
    };
    OrdinalFrame.defaultProps = {
        annotations: [],
        foregroundGraphics: [],
        annotationSettings: {},
        projection: "vertical",
        size: [500, 500],
        className: "",
        data: [],
        oScaleType: d3_scale_1.scaleBand,
        rScaleType: d3_scale_1.scaleLinear,
        type: "none",
        summaryType: "none",
        useSpans: false,
        optimizeCustomTooltipPosition: false
    };
    OrdinalFrame.displayName = "OrdinalFrame";
    return OrdinalFrame;
}(React.Component));
exports.default = OrdinalFrame;
//# sourceMappingURL=OrdinalFrame.js.map