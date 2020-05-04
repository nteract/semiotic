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
var AnnotationLayer_1 = __importDefault(require("./AnnotationLayer"));
var InteractionLayer_1 = __importDefault(require("./InteractionLayer"));
var VisualizationLayer_1 = __importDefault(require("./VisualizationLayer"));
var frameFunctions_1 = require("./svg/frameFunctions");
var jsx_1 = require("./constants/jsx");
var SpanOrDiv_1 = require("./SpanOrDiv");
var blankArray = [];
var defaultZeroMargin = { top: 0, bottom: 0, left: 0, right: 0 };
var Frame = /** @class */ (function (_super) {
    __extends(Frame, _super);
    function Frame(props) {
        var _this = _super.call(this, props) || this;
        _this.canvasContext = null;
        _this.setVoronoi = function (d) {
            _this.setState({ voronoiHover: d });
        };
        var matte = props.matte, size = props.size, margin = props.margin, frameKey = props.frameKey, additionalDefs = props.additionalDefs, name = props.name;
        var generatedDefs = jsx_1.generateFinalDefs({ matte: matte, size: size, margin: margin, frameKey: frameKey, additionalDefs: additionalDefs, name: name });
        _this.state = {
            canvasContext: null,
            voronoiHover: undefined,
            finalDefs: generatedDefs.defs,
            matte: generatedDefs.matte,
            SpanOrDiv: SpanOrDiv_1.HOCSpanOrDiv(props.useSpans),
            props: props
        };
        return _this;
    }
    Frame.prototype.componentDidMount = function () {
        this.setState({
            canvasContext: this.canvasContext
        });
    };
    Frame.prototype.componentDidUpdate = function () {
        if (this.canvasContext !== this.state.canvasContext)
            this.setState({
                canvasContext: this.canvasContext
            });
    };
    Frame.getDerivedStateFromProps = function (nextProps, prevState) {
        var lp = prevState.props;
        var matte = nextProps.matte, size = nextProps.size, _a = nextProps.margin, margin = _a === void 0 ? defaultZeroMargin : _a, frameKey = nextProps.frameKey, additionalDefs = nextProps.additionalDefs;
        var lpMargin = lp.margin || defaultZeroMargin;
        if (lp.size[0] !== size[0] || lp.size[1] !== size[1] || lpMargin.top !== margin.top || lpMargin.bottom !== margin.bottom || lpMargin.right !== margin.right || lpMargin.left !== margin.left || lpMargin.top !== margin.top || lp.matte !== nextProps.matte || lp.additionalDefs !== nextProps.additionalDefs) {
            var generatedDefs = jsx_1.generateFinalDefs({ matte: matte, size: size, margin: margin, frameKey: frameKey, additionalDefs: additionalDefs, name: name });
            return { finalDefs: generatedDefs.defs, matte: generatedDefs.matte, props: nextProps };
        }
        return null;
    };
    Frame.prototype.render = function () {
        var _this = this;
        var _a = this.props, axes = _a.axes, axesTickLines = _a.axesTickLines, _b = _a.className, className = _b === void 0 ? "" : _b, _c = _a.name, name = _c === void 0 ? "" : _c, frameKey = _a.frameKey, projectedCoordinateNames = _a.projectedCoordinateNames, renderPipeline = _a.renderPipeline, size = _a.size, _d = _a.adjustedSize, adjustedSize = _d === void 0 ? size : _d, title = _a.title, xScale = _a.xScale, yScale = _a.yScale, dataVersion = _a.dataVersion, annotations = _a.annotations, projectedYMiddle = _a.projectedYMiddle, interaction = _a.interaction, customClickBehavior = _a.customClickBehavior, customHoverBehavior = _a.customHoverBehavior, customDoubleClickBehavior = _a.customDoubleClickBehavior, points = _a.points, _e = _a.margin, margin = _e === void 0 ? defaultZeroMargin : _e, backgroundGraphics = _a.backgroundGraphics, foregroundGraphics = _a.foregroundGraphics, beforeElements = _a.beforeElements, afterElements = _a.afterElements, defaultSVGRule = _a.defaultSVGRule, defaultHTMLRule = _a.defaultHTMLRule, adjustedPosition = _a.adjustedPosition, legendSettings = _a.legendSettings, annotationSettings = _a.annotationSettings, overlay = _a.overlay, columns = _a.columns, rScale = _a.rScale, projection = _a.projection, interactionOverflow = _a.interactionOverflow, canvasPostProcess = _a.canvasPostProcess, baseMarkProps = _a.baseMarkProps, useSpans = _a.useSpans, canvasRendering = _a.canvasRendering, renderOrder = _a.renderOrder, showLinePoints = _a.showLinePoints, _f = _a.disableCanvasInteraction, disableCanvasInteraction = _f === void 0 ? false : _f, sketchyRenderingEngine = _a.sketchyRenderingEngine, disableContext = _a.disableContext, frameRenderOrder = _a.frameRenderOrder, additionalVizElements = _a.additionalVizElements, interactionSettings = _a.interactionSettings;
        var hoverAnnotation = this.props.hoverAnnotation;
        if (!hoverAnnotation && (customClickBehavior || customHoverBehavior || customDoubleClickBehavior)) {
            hoverAnnotation = blankArray;
        }
        var _g = this.state, voronoiHover = _g.voronoiHover, canvasContext = _g.canvasContext, finalDefs = _g.finalDefs, matte = _g.matte, SpanOrDiv = _g.SpanOrDiv;
        var areaAnnotations = [];
        var totalAnnotations = annotations
            ? __spread(annotations, areaAnnotations) : areaAnnotations;
        if (voronoiHover) {
            if (Array.isArray(voronoiHover)) {
                totalAnnotations.push.apply(totalAnnotations, __spread(voronoiHover));
            }
            else {
                totalAnnotations.push(voronoiHover);
            }
        }
        var annotationLayer = ((totalAnnotations &&
            totalAnnotations.length > 0) ||
            legendSettings) && (React.createElement(AnnotationLayer_1.default, { legendSettings: legendSettings, margin: margin, axes: axes, voronoiHover: this.setVoronoi, annotationHandling: annotationSettings, pointSizeFunction: annotationSettings.layout &&
                annotationSettings.layout.pointSizeFunction, labelSizeFunction: annotationSettings.layout &&
                annotationSettings.layout.labelSizeFunction, annotations: totalAnnotations, svgAnnotationRule: function (d, i, thisALayer) {
                return defaultSVGRule(__assign({ d: d,
                    i: i, annotationLayer: thisALayer }, renderPipeline));
            }, htmlAnnotationRule: function (d, i, thisALayer) {
                return defaultHTMLRule(__assign({ d: d,
                    i: i, annotationLayer: thisALayer }, renderPipeline));
            }, useSpans: useSpans, size: adjustedSize, position: [
                adjustedPosition[0] + margin.left,
                adjustedPosition[1] + margin.top
            ] }));
        var generatedTitle = frameFunctions_1.generateFrameTitle({
            title: title,
            size: size
        });
        var finalBackgroundGraphics = typeof backgroundGraphics === "function"
            ? backgroundGraphics({ size: size, margin: margin })
            : backgroundGraphics;
        var finalForegroundGraphics = typeof foregroundGraphics === "function"
            ? foregroundGraphics({ size: size, margin: margin })
            : foregroundGraphics;
        return (React.createElement(SpanOrDiv, { span: useSpans, className: className + " frame " + name, style: {
                background: "none"
            } },
            beforeElements && (React.createElement(SpanOrDiv, { span: useSpans, className: name + " frame-before-elements" }, beforeElements)),
            React.createElement(SpanOrDiv, { span: useSpans, className: "frame-elements", style: { height: size[1] + "px", width: size[0] + "px" } },
                React.createElement(SpanOrDiv, { span: useSpans, className: "visualization-layer", style: { position: "absolute" } },
                    (backgroundGraphics) && (React.createElement("svg", { className: "background-graphics", style: { position: "absolute" }, width: size[0], height: size[1] }, backgroundGraphics && (React.createElement("g", { "aria-hidden": true, className: "background-graphics" }, finalBackgroundGraphics)))),
                    canvasRendering && (React.createElement("canvas", { className: "frame-canvas", ref: function (canvasContextRef) { return (_this.canvasContext = canvasContextRef); }, style: {
                            position: "absolute",
                            left: "0px",
                            top: "0px"
                        }, width: size[0], height: size[1] })),
                    React.createElement("svg", { className: "visualization-layer", style: { position: "absolute" }, width: size[0], height: size[1] },
                        finalDefs,
                        React.createElement(VisualizationLayer_1.default, { disableContext: disableContext, renderPipeline: renderPipeline, position: adjustedPosition, width: adjustedSize[0], height: adjustedSize[1], projectedCoordinateNames: projectedCoordinateNames, xScale: xScale, yScale: yScale, axes: axes, title: title, frameKey: frameKey, canvasContext: canvasContext, dataVersion: dataVersion, matte: matte, margin: margin, canvasPostProcess: canvasPostProcess, baseMarkProps: baseMarkProps, voronoiHover: this.setVoronoi, renderOrder: renderOrder, sketchyRenderingEngine: sketchyRenderingEngine, axesTickLines: axesTickLines, additionalVizElements: additionalVizElements, frameRenderOrder: frameRenderOrder }),
                        generatedTitle && (React.createElement("g", { className: "frame-title" }, generatedTitle)),
                        foregroundGraphics && (React.createElement("g", { "aria-hidden": true, className: "foreground-graphics" }, finalForegroundGraphics)))),
                React.createElement(InteractionLayer_1.default, { useSpans: useSpans, hoverAnnotation: hoverAnnotation, projectedX: projectedCoordinateNames.x, projectedY: projectedCoordinateNames.y, projectedYMiddle: projectedYMiddle, interaction: interaction, voronoiHover: this.setVoronoi, customClickBehavior: customClickBehavior, customHoverBehavior: customHoverBehavior, customDoubleClickBehavior: customDoubleClickBehavior, points: points, showLinePoints: showLinePoints, canvasRendering: canvasRendering, position: adjustedPosition, margin: margin, size: adjustedSize, svgSize: size, xScale: xScale, yScale: yScale, enabled: true, overlay: overlay, oColumns: columns, rScale: rScale, projection: projection, interactionOverflow: interactionOverflow, disableCanvasInteraction: disableCanvasInteraction, renderPipeline: renderPipeline, advancedSettings: interactionSettings }),
                annotationLayer),
            afterElements && (React.createElement(SpanOrDiv, { span: useSpans, className: name + " frame-after-elements" }, afterElements))));
    };
    Frame.defaultProps = {
        annotationSettings: {},
        adjustedPosition: [0, 0],
        projectedCoordinateNames: { x: "x", y: "y" },
        renderOrder: [],
        frameRenderOrder: ["axes-tick-lines", "viz-layer", "matte", "axes-labels", "labels"],
        additionalVizElements: {}
    };
    return Frame;
}(React.Component));
exports.default = Frame;
//# sourceMappingURL=Frame.js.map