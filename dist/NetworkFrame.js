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
var Frame_1 = __importDefault(require("./Frame"));
var dataFunctions_1 = require("./data/dataFunctions");
var frame_props_1 = require("./constants/frame_props");
var networkframeRules_1 = require("./annotationRules/networkframeRules");
var baseRules_1 = require("./annotationRules/baseRules");
var functions_1 = require("./generic_utilities/functions");
var d3_scale_1 = require("d3-scale");
var network_1 = require("./processing/network");
var blankArray = [];
var matrixRenderOrder = ["nodes", "edges"];
var generalRenderOrder = ["edges", "nodes"];
var projectedCoordinateNames = { y: "y", x: "x" };
var xScale = d3_scale_1.scaleLinear();
var yScale = d3_scale_1.scaleLinear();
var NetworkFrame = /** @class */ (function (_super) {
    __extends(NetworkFrame, _super);
    function NetworkFrame(props) {
        var _this = _super.call(this, props) || this;
        _this.defaultNetworkSVGRule = function (_a) {
            var baseD = _a.d, i = _a.i, annotationLayer = _a.annotationLayer;
            var _b = _this.state, projectedNodes = _b.projectedNodes, projectedEdges = _b.projectedEdges, nodeIDAccessor = _b.nodeIDAccessor, nodeSizeAccessor = _b.nodeSizeAccessor, networkFrameRender = _b.networkFrameRender, adjustedSize = _b.adjustedSize, adjustedPosition = _b.adjustedPosition;
            //TODO PASS FRAME STYLE FNs TO HIGHLIGHT
            var svgAnnotationRules = _this.props.svgAnnotationRules;
            var d = baseD.ids
                ? baseD
                : baseD.edge
                    ? __assign(__assign({}, (projectedEdges.find(function (p) {
                        return nodeIDAccessor(p.source) === nodeIDAccessor(baseD.source) &&
                            nodeIDAccessor(p.target) === nodeIDAccessor(baseD.target);
                    }) || {})), baseD) : __assign(__assign({}, (projectedNodes.find(function (p) { return nodeIDAccessor(p) === baseD.id; }) || {})), baseD);
            var voronoiHover = annotationLayer.voronoiHover;
            if (svgAnnotationRules) {
                var customAnnotation = svgAnnotationRules({
                    d: d,
                    i: i,
                    networkFrameProps: _this.props,
                    networkFrameState: _this.state,
                    nodes: projectedNodes,
                    edges: projectedEdges,
                    voronoiHover: voronoiHover,
                    screenCoordinates: [d.x, d.y],
                    adjustedPosition: adjustedPosition,
                    adjustedSize: adjustedSize,
                    annotationLayer: annotationLayer
                });
                if (customAnnotation !== null) {
                    return customAnnotation;
                }
            }
            if (d.type === "node") {
                return networkframeRules_1.svgNodeRule({
                    d: d,
                    i: i,
                    nodeSizeAccessor: nodeSizeAccessor
                });
            }
            else if (d.type === "desaturation-layer") {
                return baseRules_1.desaturationLayer({
                    style: d.style instanceof Function ? d.style(d, i) : d.style,
                    size: adjustedSize,
                    i: i,
                    key: d.key
                });
            }
            else if (d.type === "basic-node-label") {
                return (React.createElement("g", { key: d.key || "basic-" + i, transform: "translate(" + d.x + "," + d.y + ")" }, baseD.element || baseD.label));
            }
            else if (d.type === "react-annotation" || typeof d.type === "function") {
                return networkframeRules_1.svgReactAnnotationRule({
                    d: d,
                    i: i,
                    projectedNodes: projectedNodes,
                    nodeIDAccessor: nodeIDAccessor
                });
            }
            else if (d.type === "enclose") {
                return networkframeRules_1.svgEncloseRule({
                    d: d,
                    i: i,
                    projectedNodes: projectedNodes,
                    nodeIDAccessor: nodeIDAccessor,
                    nodeSizeAccessor: nodeSizeAccessor
                });
            }
            else if (d.type === "enclose-rect") {
                return networkframeRules_1.svgRectEncloseRule({
                    d: d,
                    i: i,
                    projectedNodes: projectedNodes,
                    nodeIDAccessor: nodeIDAccessor,
                    nodeSizeAccessor: nodeSizeAccessor
                });
            }
            else if (d.type === "enclose-hull") {
                return networkframeRules_1.svgHullEncloseRule({
                    d: d,
                    i: i,
                    projectedNodes: projectedNodes,
                    nodeIDAccessor: nodeIDAccessor,
                    nodeSizeAccessor: nodeSizeAccessor
                });
            }
            else if (d.type === "highlight") {
                return networkframeRules_1.svgHighlightRule({
                    d: d,
                    i: i,
                    networkFrameRender: networkFrameRender
                });
            }
            return null;
        };
        _this.defaultNetworkHTMLRule = function (_a) {
            var baseD = _a.d, i = _a.i, annotationLayer = _a.annotationLayer;
            var _b = _this.props, tooltipContent = _b.tooltipContent, optimizeCustomTooltipPosition = _b.optimizeCustomTooltipPosition, htmlAnnotationRules = _b.htmlAnnotationRules, useSpans = _b.useSpans;
            var _c = _this.state, projectedNodes = _c.projectedNodes, projectedEdges = _c.projectedEdges, nodeIDAccessor = _c.nodeIDAccessor, adjustedSize = _c.adjustedSize, adjustedPosition = _c.adjustedPosition;
            var voronoiHover = annotationLayer.voronoiHover;
            var d = baseD.ids
                ? baseD
                : baseD.edge
                    ? __assign(__assign({}, (projectedEdges.find(function (p) {
                        return nodeIDAccessor(p.source) === nodeIDAccessor(baseD.source) &&
                            nodeIDAccessor(p.target) === nodeIDAccessor(baseD.target);
                    }) || {})), baseD) : __assign(__assign({}, (projectedNodes.find(function (p) { return nodeIDAccessor(p) === baseD.id; }) || {})), baseD);
            if (htmlAnnotationRules) {
                var customAnnotation = htmlAnnotationRules({
                    d: d,
                    i: i,
                    networkFrameProps: _this.props,
                    networkFrameState: _this.state,
                    nodes: projectedNodes,
                    edges: projectedEdges,
                    voronoiHover: voronoiHover,
                    screenCoordinates: [d.x, d.y],
                    adjustedPosition: adjustedPosition,
                    adjustedSize: adjustedSize,
                    annotationLayer: annotationLayer
                });
                if (customAnnotation !== null) {
                    return customAnnotation;
                }
            }
            if (d.type === "frame-hover") {
                return networkframeRules_1.htmlFrameHoverRule({
                    d: d,
                    i: i,
                    tooltipContent: tooltipContent,
                    optimizeCustomTooltipPosition: optimizeCustomTooltipPosition,
                    useSpans: useSpans,
                    nodes: projectedNodes,
                    edges: projectedEdges,
                    nodeIDAccessor: nodeIDAccessor
                });
            }
            return null;
        };
        Object.keys(props).forEach(function (propName) {
            if (!frame_props_1.networkframeproptypes[propName]) {
                if (frame_props_1.xyframeproptypes[propName]) {
                    console.error(propName + " is an XYFrame prop are you sure you're using the right frame?");
                }
                else if (frame_props_1.ordinalframeproptypes[propName]) {
                    console.error(propName + " is an OrdinalFrame prop are you sure you're using the right frame?");
                }
                else {
                    console.error(propName + " is not a valid NetworkFrame prop");
                }
            }
        });
        var baseState = {
            dataVersion: undefined,
            nodeData: [],
            edgeData: [],
            adjustedPosition: [],
            adjustedSize: [],
            backgroundGraphics: null,
            foregroundGraphics: null,
            projectedNodes: [],
            projectedEdges: [],
            renderNumber: 0,
            nodeLabelAnnotations: [],
            graphSettings: {
                type: "empty-start",
                nodes: [],
                edges: [],
                nodeHash: new Map(),
                edgeHash: new Map(),
                hierarchicalNetwork: false
            },
            edgeWidthAccessor: dataFunctions_1.stringToFn("weight"),
            legendSettings: undefined,
            margin: { top: 0, left: 0, right: 0, bottom: 0 },
            networkFrameRender: {},
            nodeIDAccessor: dataFunctions_1.stringToFn("id"),
            nodeSizeAccessor: functions_1.genericFunction(5),
            overlay: [],
            projectedXYPoints: [],
            sourceAccessor: dataFunctions_1.stringToFn("source"),
            targetAccessor: dataFunctions_1.stringToFn("target"),
            title: { title: undefined },
            props: props
        };
        _this.state = __assign(__assign({}, baseState), network_1.calculateNetworkFrame(props, baseState));
        return _this;
    }
    NetworkFrame.prototype.componentWillUnmount = function () {
        var onUnmount = this.props.onUnmount;
        if (onUnmount) {
            onUnmount(this.props, this.state);
        }
    };
    NetworkFrame.getDerivedStateFromProps = function (nextProps, prevState) {
        var props = prevState.props;
        if (((prevState.dataVersion &&
            prevState.dataVersion !== nextProps.dataVersion) ||
            (!prevState.projectedNodes && !prevState.projectedEdges)) || (props.size[0] !== nextProps.size[0] ||
            props.size[1] !== nextProps.size[1] ||
            (!prevState.dataVersion &&
                frame_props_1.networkFrameChangeProps.find(function (d) {
                    return props[d] !== nextProps[d];
                })))) {
            return __assign(__assign({}, network_1.calculateNetworkFrame(nextProps, prevState)), { props: nextProps });
        }
        return { props: nextProps };
    };
    NetworkFrame.prototype.onNodeClick = function (d, i) {
        var onNodeClick = this.props.onNodeClick;
        if (onNodeClick) {
            onNodeClick(d, i);
        }
    };
    NetworkFrame.prototype.onNodeEnter = function (d, i) {
        var onNodeEnter = this.props.onNodeEnter;
        if (onNodeEnter) {
            onNodeEnter(d, i);
        }
    };
    NetworkFrame.prototype.onNodeOut = function (d, i) {
        var onNodeOut = this.props.onNodeOut;
        if (onNodeOut) {
            onNodeOut(d, i);
        }
    };
    NetworkFrame.prototype.render = function () {
        var _a = this.props, annotations = _a.annotations, annotationSettings = _a.annotationSettings, className = _a.className, customClickBehavior = _a.customClickBehavior, customDoubleClickBehavior = _a.customDoubleClickBehavior, customHoverBehavior = _a.customHoverBehavior, size = _a.size, matte = _a.matte, hoverAnnotation = _a.hoverAnnotation, beforeElements = _a.beforeElements, afterElements = _a.afterElements, interaction = _a.interaction, disableContext = _a.disableContext, canvasPostProcess = _a.canvasPostProcess, baseMarkProps = _a.baseMarkProps, useSpans = _a.useSpans, canvasNodes = _a.canvasNodes, canvasEdges = _a.canvasEdges, additionalDefs = _a.additionalDefs, _b = _a.renderOrder, renderOrder = _b === void 0 ? this.state.graphSettings &&
            this.state.graphSettings.type === "matrix"
            ? matrixRenderOrder
            : generalRenderOrder : _b, sketchyRenderingEngine = _a.sketchyRenderingEngine, frameRenderOrder = _a.frameRenderOrder, disableCanvasInteraction = _a.disableCanvasInteraction, interactionSettings = _a.interactionSettings;
        var _c = this.state, backgroundGraphics = _c.backgroundGraphics, foregroundGraphics = _c.foregroundGraphics, projectedXYPoints = _c.projectedXYPoints, margin = _c.margin, legendSettings = _c.legendSettings, adjustedPosition = _c.adjustedPosition, adjustedSize = _c.adjustedSize, networkFrameRender = _c.networkFrameRender, nodeLabelAnnotations = _c.nodeLabelAnnotations, overlay = _c.overlay, title = _c.title;
        var formattedOverlay;
        if (overlay && overlay.length > 0) {
            formattedOverlay = overlay;
        }
        var activeHoverAnnotation;
        if (Array.isArray(hoverAnnotation)) {
            activeHoverAnnotation = hoverAnnotation;
        }
        else if (customClickBehavior || customDoubleClickBehavior || customHoverBehavior) {
            activeHoverAnnotation = blankArray;
        }
        else {
            activeHoverAnnotation = !!hoverAnnotation;
        }
        return (React.createElement(Frame_1.default, { name: "networkframe", renderPipeline: networkFrameRender, adjustedPosition: adjustedPosition, adjustedSize: adjustedSize, size: size, xScale: xScale, yScale: yScale, title: title, matte: matte, className: className, additionalDefs: additionalDefs, frameKey: "none", projectedCoordinateNames: projectedCoordinateNames, defaultSVGRule: this.defaultNetworkSVGRule, defaultHTMLRule: this.defaultNetworkHTMLRule, hoverAnnotation: activeHoverAnnotation, annotations: __spread(annotations, nodeLabelAnnotations), annotationSettings: annotationSettings, legendSettings: legendSettings, interaction: interaction, customClickBehavior: customClickBehavior, customHoverBehavior: customHoverBehavior, customDoubleClickBehavior: customDoubleClickBehavior, points: projectedXYPoints, margin: margin, overlay: formattedOverlay, backgroundGraphics: backgroundGraphics, foregroundGraphics: foregroundGraphics, beforeElements: beforeElements, afterElements: afterElements, disableContext: disableContext, canvasPostProcess: canvasPostProcess, baseMarkProps: baseMarkProps, useSpans: !!useSpans, canvasRendering: !!(canvasNodes || canvasEdges), renderOrder: renderOrder, disableCanvasInteraction: disableCanvasInteraction, sketchyRenderingEngine: sketchyRenderingEngine, frameRenderOrder: frameRenderOrder, interactionSettings: interactionSettings }));
    };
    NetworkFrame.defaultProps = {
        annotations: [],
        foregroundGraphics: [],
        annotationSettings: {},
        size: [500, 500],
        className: "",
        name: "networkframe",
        networkType: { type: "force", iterations: 500 },
        filterRenderedNodes: function (d) { return d.id !== "root-generated"; }
    };
    NetworkFrame.displayName = "NetworkFrame";
    return NetworkFrame;
}(React.Component));
exports.default = NetworkFrame;
//# sourceMappingURL=NetworkFrame.js.map