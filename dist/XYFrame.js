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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
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
// components
var Frame_1 = __importDefault(require("./Frame"));
var TooltipPositioner_1 = __importDefault(require("./TooltipPositioner"));
var xyframeRules_1 = require("./annotationRules/xyframeRules");
var baseRules_1 = require("./annotationRules/baseRules");
var lineDrawing_1 = require("./svg/lineDrawing");
var frameFunctions_1 = require("./svg/frameFunctions");
var coordinateNames_1 = require("./constants/coordinateNames");
var unflowedFunctions_1 = require("./data/unflowedFunctions");
var diffing_1 = require("./processing/diffing");
var multiAccessorUtils_1 = require("./data/multiAccessorUtils");
var xyDrawing_1 = require("./processing/xyDrawing");
var frame_props_1 = require("./constants/frame_props");
var SpanOrDiv_1 = require("./SpanOrDiv");
var xyframeKey = "";
var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
for (var i = 32; i > 0; --i)
    xyframeKey += chars[Math.floor(Math.random() * chars.length)];
var projectedCoordinateNames = {
    y: coordinateNames_1.projectedY,
    x: coordinateNames_1.projectedX,
    yMiddle: coordinateNames_1.projectedYMiddle,
    yTop: coordinateNames_1.projectedYTop,
    yBottom: coordinateNames_1.projectedYBottom,
    xMiddle: coordinateNames_1.projectedXMiddle,
    xTop: coordinateNames_1.projectedXTop,
    xBottom: coordinateNames_1.projectedXBottom
};
var XYFrame = /** @class */ (function (_super) {
    __extends(XYFrame, _super);
    function XYFrame(props) {
        var _this = _super.call(this, props) || this;
        _this.defaultXYSVGRule = function (_a) {
            var baseD = _a.d, i = _a.i, annotationLayer = _a.annotationLayer, lines = _a.lines, summaries = _a.summaries, points = _a.points;
            var _b = _this.props, showLinePoints = _b.showLinePoints, defined = _b.defined, baseMargin = _b.margin, size = _b.size, svgAnnotationRules = _b.svgAnnotationRules;
            var _c = _this.state, xyFrameRender = _c.xyFrameRender, xScale = _c.xScale, yScale = _c.yScale, xAccessor = _c.xAccessor, yAccessor = _c.yAccessor, axesData = _c.axesData, annotatedSettings = _c.annotatedSettings;
            var screenCoordinates = [];
            var idAccessor = annotatedSettings.lineIDAccessor;
            if (baseD.type === "highlight") {
                return xyframeRules_1.svgHighlight({
                    d: baseD,
                    i: i,
                    idAccessor: idAccessor,
                    lines: lines,
                    summaries: summaries,
                    points: points,
                    xScale: xScale,
                    yScale: yScale,
                    xyFrameRender: xyFrameRender,
                    defined: defined
                });
            }
            var d = baseD.coordinates
                ? baseD
                : lineDrawing_1.findPointByID({
                    point: baseD,
                    idAccessor: idAccessor,
                    lines: lines,
                    xScale: xScale,
                    projectedX: coordinateNames_1.projectedX,
                    xAccessor: xAccessor
                });
            if (!d)
                return null;
            var margin = frameFunctions_1.calculateMargin({
                margin: baseMargin,
                axes: axesData,
                title: annotatedSettings.title,
                size: size
            });
            var _d = frameFunctions_1.adjustedPositionSize({
                size: size,
                margin: margin
            }), adjustedPosition = _d.adjustedPosition, adjustedSize = _d.adjustedSize;
            if (!d.coordinates && !d.bounds) {
                screenCoordinates = [
                    lineDrawing_1.relativeX({
                        point: d,
                        projectedXMiddle: coordinateNames_1.projectedXMiddle,
                        projectedX: coordinateNames_1.projectedX,
                        xAccessor: xAccessor,
                        xScale: xScale
                    }) || 0,
                    lineDrawing_1.relativeY({
                        point: d,
                        projectedYMiddle: coordinateNames_1.projectedYMiddle,
                        projectedY: coordinateNames_1.projectedY,
                        yAccessor: yAccessor,
                        yScale: yScale,
                        showLinePoints: showLinePoints
                    }) || 0
                ];
            }
            else if (!d.bounds) {
                screenCoordinates = d.coordinates.reduce(function (coords, p) {
                    var xCoordinate = lineDrawing_1.relativeX({
                        point: p,
                        projectedXMiddle: coordinateNames_1.projectedXMiddle,
                        projectedX: coordinateNames_1.projectedX,
                        xAccessor: xAccessor,
                        xScale: xScale
                    });
                    var yCoordinate = lineDrawing_1.relativeY({
                        point: p,
                        projectedYMiddle: coordinateNames_1.projectedYMiddle,
                        projectedY: coordinateNames_1.projectedY,
                        yAccessor: yAccessor,
                        yScale: yScale
                    });
                    if (Array.isArray(yCoordinate)) {
                        return __spread(coords, [
                            [xCoordinate, Math.min.apply(Math, __spread(yCoordinate))],
                            [xCoordinate, Math.max.apply(Math, __spread(yCoordinate))]
                        ]);
                    }
                    else if (Array.isArray(xCoordinate)) {
                        return __spread(coords, [
                            [Math.min.apply(Math, __spread(xCoordinate)), yCoordinate],
                            [Math.max.apply(Math, __spread(xCoordinate)), yCoordinate]
                        ]);
                    }
                    else {
                        return __spread(coords, [[xCoordinate, yCoordinate]]);
                    }
                }, []);
            }
            var voronoiHover = annotationLayer.voronoiHover;
            var customSVG = svgAnnotationRules &&
                svgAnnotationRules({
                    d: d,
                    i: i,
                    screenCoordinates: screenCoordinates,
                    xScale: xScale,
                    yScale: yScale,
                    xAccessor: xAccessor,
                    yAccessor: yAccessor,
                    xyFrameProps: _this.props,
                    xyFrameState: _this.state,
                    summaries: summaries,
                    points: points,
                    lines: lines,
                    voronoiHover: voronoiHover,
                    adjustedPosition: adjustedPosition,
                    adjustedSize: adjustedSize,
                    annotationLayer: annotationLayer
                });
            if (svgAnnotationRules !== undefined && customSVG !== null) {
                return customSVG;
            }
            else if (d.type === "desaturation-layer") {
                return baseRules_1.desaturationLayer({
                    style: d.style instanceof Function ? d.style(d, i) : d.style,
                    size: adjustedSize,
                    i: i,
                    key: d.key
                });
            }
            else if (d.type === "xy" || d.type === "frame-hover") {
                return xyframeRules_1.svgXYAnnotation({ d: d, i: i, screenCoordinates: screenCoordinates });
            }
            else if (d.type === "react-annotation" || typeof d.type === "function") {
                return xyframeRules_1.basicReactAnnotation({ d: d, screenCoordinates: screenCoordinates, i: i });
            }
            else if (d.type === "enclose") {
                return xyframeRules_1.svgEncloseAnnotation({ d: d, screenCoordinates: screenCoordinates, i: i });
            }
            else if (d.type === "enclose-rect") {
                return xyframeRules_1.svgRectEncloseAnnotation({ d: d, screenCoordinates: screenCoordinates, i: i });
            }
            else if (d.type === "enclose-hull") {
                return xyframeRules_1.svgHullEncloseAnnotation({ d: d, screenCoordinates: screenCoordinates, i: i });
            }
            else if (d.type === "x") {
                return xyframeRules_1.svgXAnnotation({
                    d: d,
                    screenCoordinates: screenCoordinates,
                    i: i,
                    adjustedSize: adjustedSize
                });
            }
            else if (d.type === "y") {
                return xyframeRules_1.svgYAnnotation({
                    d: d,
                    screenCoordinates: screenCoordinates,
                    i: i,
                    adjustedSize: adjustedSize,
                    adjustedPosition: adjustedPosition
                });
            }
            else if (d.type === "bounds") {
                return xyframeRules_1.svgBoundsAnnotation({
                    d: d,
                    i: i,
                    adjustedSize: adjustedSize,
                    xAccessor: xAccessor,
                    yAccessor: yAccessor,
                    xScale: xScale,
                    yScale: yScale
                });
            }
            else if (d.type === "line") {
                return xyframeRules_1.svgLineAnnotation({ d: d, i: i, screenCoordinates: screenCoordinates });
            }
            else if (d.type === "area") {
                return xyframeRules_1.svgAreaAnnotation({
                    d: d,
                    i: i,
                    xScale: xScale,
                    xAccessor: xAccessor,
                    yScale: yScale,
                    yAccessor: yAccessor,
                    annotationLayer: annotationLayer
                });
            }
            else if (d.type === "horizontal-points") {
                return xyframeRules_1.svgHorizontalPointsAnnotation({
                    d: d,
                    lines: lines.data,
                    points: points.data,
                    xScale: xScale,
                    yScale: yScale,
                    pointStyle: points.styleFn
                });
            }
            else if (d.type === "vertical-points") {
                return xyframeRules_1.svgVerticalPointsAnnotation({
                    d: d,
                    lines: lines.data,
                    points: points.data,
                    xScale: xScale,
                    yScale: yScale,
                    pointStyle: points.styleFn
                });
            }
            return null;
        };
        _this.defaultXYHTMLRule = function (_a) {
            var baseD = _a.d, i = _a.i, lines = _a.lines, summaries = _a.summaries, points = _a.points, annotationLayer = _a.annotationLayer;
            var _b = _this.state, xAccessor = _b.xAccessor, yAccessor = _b.yAccessor, xScale = _b.xScale, yScale = _b.yScale, SpanOrDiv = _b.SpanOrDiv, annotatedSettings = _b.annotatedSettings, axesData = _b.axesData;
            var voronoiHover = annotationLayer.voronoiHover;
            var screenCoordinates = [];
            var _c = _this.props, useSpans = _c.useSpans, tooltipContent = _c.tooltipContent, optimizeCustomTooltipPosition = _c.optimizeCustomTooltipPosition, htmlAnnotationRules = _c.htmlAnnotationRules, size = _c.size, showLinePoints = _c.showLinePoints, baseMargin = _c.margin;
            var idAccessor = annotatedSettings.lineIDAccessor;
            var d = lineDrawing_1.findPointByID({
                point: baseD,
                idAccessor: idAccessor,
                lines: lines,
                xScale: xScale,
                projectedX: coordinateNames_1.projectedX,
                xAccessor: xAccessor
            });
            if (!d) {
                return null;
            }
            var xCoord = d[coordinateNames_1.projectedXMiddle] ||
                d[coordinateNames_1.projectedX] ||
                multiAccessorUtils_1.findFirstAccessorValue(xAccessor, d);
            var yCoord = d[coordinateNames_1.projectedYMiddle] ||
                d[coordinateNames_1.projectedY] ||
                multiAccessorUtils_1.findFirstAccessorValue(yAccessor, d);
            var xString = xCoord && xCoord.toString ? xCoord.toString() : xCoord;
            var yString = yCoord && yCoord.toString ? yCoord.toString() : yCoord;
            var margin = frameFunctions_1.calculateMargin({
                margin: baseMargin,
                axes: axesData,
                title: annotatedSettings.title,
                size: size
            });
            var _d = frameFunctions_1.adjustedPositionSize({
                size: size,
                margin: margin
            }), adjustedPosition = _d.adjustedPosition, adjustedSize = _d.adjustedSize;
            if (!d.coordinates) {
                screenCoordinates = [
                    xScale(xCoord) || 0,
                    lineDrawing_1.relativeY({
                        point: d,
                        projectedYMiddle: coordinateNames_1.projectedYMiddle,
                        projectedY: coordinateNames_1.projectedY,
                        showLinePoints: showLinePoints,
                        yAccessor: yAccessor,
                        yScale: yScale
                    }) || 0
                ];
            }
            else {
                screenCoordinates = d.coordinates.map(function (p) {
                    var foundP = lineDrawing_1.findPointByID({
                        point: __assign({ x: 0, y: 0 }, p),
                        idAccessor: idAccessor,
                        lines: lines,
                        xScale: xScale,
                        projectedX: coordinateNames_1.projectedX,
                        xAccessor: xAccessor
                    });
                    return [
                        (xScale(multiAccessorUtils_1.findFirstAccessorValue(xAccessor, d)) || 0) +
                            adjustedPosition[0],
                        (lineDrawing_1.relativeY({
                            point: foundP,
                            projectedYMiddle: coordinateNames_1.projectedYMiddle,
                            projectedY: coordinateNames_1.projectedY,
                            yAccessor: yAccessor,
                            yScale: yScale
                        }) || 0) + adjustedPosition[1]
                    ];
                });
            }
            var customAnnotation = htmlAnnotationRules &&
                htmlAnnotationRules({
                    d: d,
                    i: i,
                    screenCoordinates: screenCoordinates,
                    xScale: xScale,
                    yScale: yScale,
                    xAccessor: xAccessor,
                    yAccessor: yAccessor,
                    xyFrameProps: _this.props,
                    xyFrameState: _this.state,
                    summaries: summaries,
                    points: points,
                    lines: lines,
                    voronoiHover: voronoiHover,
                    adjustedPosition: adjustedPosition,
                    adjustedSize: adjustedSize,
                    annotationLayer: annotationLayer
                });
            if (htmlAnnotationRules && customAnnotation !== null) {
                return customAnnotation;
            }
            if (d.type === "frame-hover") {
                var content = (React.createElement(SpanOrDiv, { span: useSpans, className: "tooltip-content" },
                    React.createElement("p", { key: "html-annotation-content-1" }, xString),
                    React.createElement("p", { key: "html-annotation-content-2" }, yString),
                    d.percent ? (React.createElement("p", { key: "html-annotation-content-3" },
                        Math.floor(d.percent * 1000) / 10,
                        "%")) : null));
                if (d.type === "frame-hover" && tooltipContent) {
                    content = optimizeCustomTooltipPosition ? (React.createElement(TooltipPositioner_1.default, { tooltipContent: tooltipContent, tooltipContentArgs: d })) : tooltipContent(d);
                }
                return xyframeRules_1.htmlTooltipAnnotation({
                    content: content,
                    screenCoordinates: screenCoordinates,
                    i: i,
                    d: d,
                    useSpans: useSpans
                });
            }
            return null;
        };
        Object.keys(props).forEach(function (d) {
            if (!frame_props_1.xyframeproptypes[d]) {
                if (frame_props_1.ordinalframeproptypes[d]) {
                    console.error(d + " is an OrdinalFrame prop are you sure you're using the right frame?");
                }
                else if (frame_props_1.networkframeproptypes[d]) {
                    console.error(d + " is a NetworkFrame prop are you sure you're using the right frame?");
                }
                else {
                    console.error(d + " is not a valid XYFrame prop");
                }
            }
        });
        var baseState = {
            SpanOrDiv: SpanOrDiv_1.HOCSpanOrDiv(props.useSpans),
            size: [500, 500],
            dataVersion: undefined,
            lineData: undefined,
            pointData: undefined,
            summaryData: undefined,
            projectedLines: undefined,
            projectedPoints: undefined,
            projectedSummaries: undefined,
            fullDataset: [],
            adjustedPosition: [0, 0],
            adjustedSize: [500, 500],
            backgroundGraphics: null,
            foregroundGraphics: null,
            axesData: undefined,
            axes: undefined,
            axesTickLines: undefined,
            renderNumber: 0,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            calculatedXExtent: [0, 0],
            calculatedYExtent: [0, 0],
            xAccessor: [function (d) { return d.x; }],
            yAccessor: [function (d) { return d.y; }],
            xExtent: [0, 0],
            yExtent: [0, 0],
            areaAnnotations: [],
            xScale: d3_scale_1.scaleLinear(),
            yScale: d3_scale_1.scaleLinear(),
            title: null,
            legendSettings: undefined,
            xyFrameRender: {},
            canvasDrawing: [],
            annotatedSettings: {
                xAccessor: undefined,
                yAccessor: undefined,
                summaryDataAccessor: undefined,
                lineDataAccessor: undefined,
                renderKeyFn: undefined,
                lineType: undefined,
                summaryType: undefined,
                lineIDAccessor: undefined,
                summaries: undefined,
                lines: undefined,
                title: undefined,
                xExtent: undefined,
                yExtent: undefined
            },
            overlay: undefined,
            props: props
        };
        _this.state = __assign(__assign({}, baseState), xyDrawing_1.calculateXYFrame(props, baseState, true));
        return _this;
    }
    XYFrame.prototype.componentWillUnmount = function () {
        var onUnmount = this.props.onUnmount;
        if (onUnmount) {
            onUnmount(this.props, this.state);
        }
    };
    XYFrame.getDerivedStateFromProps = function (nextProps, prevState) {
        var props = prevState.props;
        var _a = prevState.xExtent, oldXExtent = _a === void 0 ? [] : _a, _b = prevState.yExtent, oldYExtent = _b === void 0 ? [] : _b, oldSize = prevState.size, oldDataVersion = prevState.dataVersion, lineData = prevState.lineData, summaryData = prevState.summaryData, pointData = prevState.pointData;
        var baseNewXExtent = nextProps.xExtent, baseNewYExtent = nextProps.yExtent, newSize = nextProps.size, newDataVersion = nextProps.dataVersion, newLines = nextProps.lines, newSummaries = nextProps.summaries, newPoints = nextProps.points;
        var newXExtent = unflowedFunctions_1.extentValue(baseNewXExtent);
        var newYExtent = unflowedFunctions_1.extentValue(baseNewYExtent);
        var extentChange = (oldXExtent[0] !== newXExtent[0] && newXExtent[0] !== undefined) ||
            (oldYExtent[0] !== newYExtent[0] && newYExtent[0] !== undefined) ||
            (oldXExtent[1] !== newXExtent[1] && newXExtent[1] !== undefined) ||
            (oldYExtent[1] !== newYExtent[1] && newYExtent[1] !== undefined);
        var lineChange = diffing_1.basicDataChangeCheck(lineData, newLines);
        var summaryChange = diffing_1.basicDataChangeCheck(summaryData, newSummaries);
        var pointChange = diffing_1.basicDataChangeCheck(pointData, newPoints);
        if ((oldDataVersion && oldDataVersion !== newDataVersion) ||
            !prevState.fullDataset) {
            return xyDrawing_1.calculateXYFrame(nextProps, prevState, true);
        }
        else if (lineChange ||
            summaryChange ||
            pointChange ||
            oldSize[0] !== newSize[0] ||
            oldSize[1] !== newSize[1] ||
            extentChange ||
            (!oldDataVersion &&
                frame_props_1.xyFrameChangeProps.find(function (d) { return props[d] !== nextProps[d]; }))) {
            var dataChanged = lineChange ||
                summaryChange ||
                pointChange ||
                extentChange ||
                !!frame_props_1.xyFrameDataProps.find(function (d) { return diffing_1.basicPropDiffing(props[d], nextProps[d]); });
            return xyDrawing_1.calculateXYFrame(nextProps, prevState, dataChanged);
        }
        return null;
    };
    XYFrame.prototype.render = function () {
        var _a = this.props, size = _a.size, className = _a.className, annotationSettings = _a.annotationSettings, annotations = _a.annotations, additionalDefs = _a.additionalDefs, hoverAnnotation = _a.hoverAnnotation, interaction = _a.interaction, customClickBehavior = _a.customClickBehavior, customHoverBehavior = _a.customHoverBehavior, customDoubleClickBehavior = _a.customDoubleClickBehavior, canvasPostProcess = _a.canvasPostProcess, baseMarkProps = _a.baseMarkProps, useSpans = _a.useSpans, canvasSummaries = _a.canvasSummaries, canvasPoints = _a.canvasPoints, canvasLines = _a.canvasLines, afterElements = _a.afterElements, beforeElements = _a.beforeElements, renderOrder = _a.renderOrder, matte = _a.matte, frameKey = _a.frameKey, showLinePoints = _a.showLinePoints, sketchyRenderingEngine = _a.sketchyRenderingEngine, disableContext = _a.disableContext, frameRenderOrder = _a.frameRenderOrder, disableCanvasInteraction = _a.disableCanvasInteraction, interactionSettings = _a.interactionSettings;
        var _b = this.state, backgroundGraphics = _b.backgroundGraphics, foregroundGraphics = _b.foregroundGraphics, adjustedPosition = _b.adjustedPosition, adjustedSize = _b.adjustedSize, margin = _b.margin, axes = _b.axes, axesTickLines = _b.axesTickLines, xScale = _b.xScale, yScale = _b.yScale, fullDataset = _b.fullDataset, dataVersion = _b.dataVersion, areaAnnotations = _b.areaAnnotations, legendSettings = _b.legendSettings, xyFrameRender = _b.xyFrameRender, annotatedSettings = _b.annotatedSettings, overlay = _b.overlay;
        return (React.createElement(Frame_1.default, { name: "xyframe", renderPipeline: xyFrameRender, adjustedPosition: adjustedPosition, size: size, projectedCoordinateNames: projectedCoordinateNames, xScale: xScale, yScale: yScale, axes: axes, axesTickLines: axesTickLines, title: annotatedSettings.title, dataVersion: dataVersion, matte: matte, className: className, adjustedSize: adjustedSize, frameKey: frameKey || xyframeKey, additionalDefs: additionalDefs, hoverAnnotation: hoverAnnotation, defaultSVGRule: this.defaultXYSVGRule, defaultHTMLRule: this.defaultXYHTMLRule, annotations: areaAnnotations.length > 0
                ? __spread(annotations, areaAnnotations) : annotations, annotationSettings: annotationSettings, legendSettings: legendSettings, projectedYMiddle: coordinateNames_1.projectedYMiddle, interaction: interaction, customClickBehavior: customClickBehavior, customHoverBehavior: customHoverBehavior, customDoubleClickBehavior: customDoubleClickBehavior, points: fullDataset, showLinePoints: typeof showLinePoints === "string" ? showLinePoints : undefined, margin: margin, backgroundGraphics: backgroundGraphics, foregroundGraphics: foregroundGraphics, beforeElements: beforeElements, afterElements: afterElements, disableContext: disableContext, canvasPostProcess: canvasPostProcess, baseMarkProps: baseMarkProps, useSpans: useSpans, canvasRendering: !!(canvasSummaries || canvasPoints || canvasLines), renderOrder: renderOrder, overlay: overlay, sketchyRenderingEngine: sketchyRenderingEngine, frameRenderOrder: frameRenderOrder, disableCanvasInteraction: disableCanvasInteraction, interactionSettings: interactionSettings }));
    };
    XYFrame.defaultProps = {
        annotations: [],
        foregroundGraphics: undefined,
        size: [500, 500],
        className: "",
        lineType: "line",
        name: "xyframe",
        dataVersion: undefined
    };
    XYFrame.displayName = "XYFrame";
    return XYFrame;
}(React.Component));
exports.default = XYFrame;
//# sourceMappingURL=XYFrame.js.map