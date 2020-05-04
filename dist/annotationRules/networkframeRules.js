"use strict";
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
var Annotation_1 = __importDefault(require("../Annotation"));
var AnnotationCalloutCircle_1 = __importDefault(require("react-annotation/lib/Types/AnnotationCalloutCircle"));
var d3_hierarchy_1 = require("d3-hierarchy");
var baseRules_1 = require("./baseRules");
var SpanOrDiv_1 = __importDefault(require("../SpanOrDiv"));
var TooltipPositioner_1 = __importDefault(require("../TooltipPositioner"));
exports.htmlFrameHoverRule = function (_a) {
    var baseD = _a.d, i = _a.i, tooltipContent = _a.tooltipContent, optimizeCustomTooltipPosition = _a.optimizeCustomTooltipPosition, useSpans = _a.useSpans, nodes = _a.nodes, edges = _a.edges, nodeIDAccessor = _a.nodeIDAccessor;
    var d = baseD.x && baseD.y
        ? baseD
        : baseD.edge
            ? __assign(__assign({}, (edges.find(function (p) {
                return nodeIDAccessor(p.source) === nodeIDAccessor(baseD.source) &&
                    nodeIDAccessor(p.target) === nodeIDAccessor(baseD.target);
            }) || {})), baseD) : nodes.find(function (p) { return nodeIDAccessor(p) === baseD.id; });
    if (!d)
        return null;
    var content = d.edge ? (React.createElement(SpanOrDiv_1.default, { span: useSpans, className: "tooltip-content" },
        React.createElement("p", { key: "html-annotation-content-1" },
            (d.source || d.edge.source).id,
            " to ",
            (d.target || d.edge.target).id))) : (React.createElement(SpanOrDiv_1.default, { span: useSpans, className: "tooltip-content" },
        React.createElement("p", { key: "html-annotation-content-1" }, d.id),
        React.createElement("p", { key: "html-annotation-content-2" },
            "Degree: ",
            d.degree)));
    if (d.type === "frame-hover" && tooltipContent) {
        content = optimizeCustomTooltipPosition ? (React.createElement(TooltipPositioner_1.default, { tooltipContent: tooltipContent, tooltipContentArgs: d })) : tooltipContent(d);
    }
    return (React.createElement(SpanOrDiv_1.default, { span: useSpans, key: "network-annotation-label-" + i, className: "annotation annotation-network-label " + (d.className || ""), style: {
            position: "absolute",
            top: d.y + "px",
            left: d.x + "px"
        } }, content));
};
exports.svgNodeRule = function (_a) {
    var d = _a.d, i = _a.i, nodeSizeAccessor = _a.nodeSizeAccessor;
    if (!d) {
        return null;
    }
    var noteData = Object.assign({
        dx: d.dx || -25,
        dy: d.dy || -25,
        x: d.x,
        y: d.y,
        note: { label: d.label, orientation: d.orientation, align: d.align },
        connector: { end: "arrow" }
    }, d, {
        type: AnnotationCalloutCircle_1.default,
        subject: {
            radius: d.radius || d.radius || nodeSizeAccessor(d)
        }
    });
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.svgReactAnnotationRule = function (_a) {
    var d = _a.d, i = _a.i, projectedNodes = _a.projectedNodes, nodeIDAccessor = _a.nodeIDAccessor;
    var selectedNode = d.x && d.y ? d : projectedNodes.find(function (p) { return nodeIDAccessor(p) === d.id; });
    if (!selectedNode) {
        return null;
    }
    var noteData = Object.assign({
        dx: 0,
        dy: 0,
        x: selectedNode.x,
        y: selectedNode.y,
        note: { label: d.label },
        connector: { end: "arrow" }
    }, d, { type: typeof d.type === "function" ? d.type : undefined });
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.svgEncloseRule = function (_a) {
    var d = _a.d, i = _a.i, projectedNodes = _a.projectedNodes, nodeIDAccessor = _a.nodeIDAccessor, nodeSizeAccessor = _a.nodeSizeAccessor;
    var selectedNodes = projectedNodes.filter(function (p) { return d.ids.indexOf(nodeIDAccessor(p)) !== -1; });
    if (selectedNodes.length === 0) {
        return null;
    }
    var circle = d3_hierarchy_1.packEnclose(selectedNodes.map(function (p) { return ({ x: p.x, y: p.y, r: nodeSizeAccessor(p) }); }));
    return baseRules_1.circleEnclosure({ circle: circle, d: d, i: i });
};
exports.svgRectEncloseRule = function (_a) {
    var d = _a.d, i = _a.i, projectedNodes = _a.projectedNodes, nodeIDAccessor = _a.nodeIDAccessor, nodeSizeAccessor = _a.nodeSizeAccessor;
    var selectedNodes = projectedNodes.filter(function (p) { return d.ids.indexOf(nodeIDAccessor(p)) !== -1; });
    if (selectedNodes.length === 0) {
        return null;
    }
    var bboxNodes = selectedNodes.map(function (p) {
        if (p.shapeNode) {
            return {
                x0: p.x0,
                x1: p.x1,
                y0: p.y0,
                y1: p.y1
            };
        }
        var nodeSize = nodeSizeAccessor(p);
        return {
            x0: p.x - nodeSize,
            x1: p.x + nodeSize,
            y0: p.y - nodeSize,
            y1: p.y + nodeSize
        };
    });
    return baseRules_1.rectangleEnclosure({ bboxNodes: bboxNodes, d: d, i: i });
};
exports.svgHullEncloseRule = function (_a) {
    var d = _a.d, i = _a.i, projectedNodes = _a.projectedNodes, nodeIDAccessor = _a.nodeIDAccessor, nodeSizeAccessor = _a.nodeSizeAccessor;
    var selectedNodes = projectedNodes.filter(function (p) { return d.ids.indexOf(nodeIDAccessor(p)) !== -1; });
    if (selectedNodes.length === 0) {
        return null;
    }
    var projectedPoints = [];
    selectedNodes.forEach(function (p) {
        if (p.shapeNode) {
            projectedPoints.push({ x: p.x0, y: p.y0 });
            projectedPoints.push({ x: p.x0, y: p.y1 });
            projectedPoints.push({ x: p.x1, y: p.y0 });
            projectedPoints.push({ x: p.x1, y: p.y1 });
        }
        else {
            var nodeSize = nodeSizeAccessor(p);
            projectedPoints.push({ x: p.x - nodeSize, y: p.y - nodeSize });
            projectedPoints.push({ x: p.x + nodeSize, y: p.y - nodeSize });
            projectedPoints.push({ x: p.x - nodeSize, y: p.y + nodeSize });
            projectedPoints.push({ x: p.x + nodeSize, y: p.y + nodeSize });
        }
    });
    return baseRules_1.hullEnclosure({ points: projectedPoints.map(function (d) { return [d.x, d.y]; }), d: d, i: i });
};
exports.svgHighlightRule = function (_a) {
    var d = _a.d, i = _a.i, networkFrameRender = _a.networkFrameRender;
    var nodes = networkFrameRender.nodes;
    var customMark = nodes.customMark, baseStyle = nodes.styleFn;
    var styleFn = baseStyle;
    if (d.style && typeof d.style === "function") {
        styleFn = function (d) { return (__assign(__assign({}, baseStyle(d)), d.style(d))); };
    }
    else if (d.style) {
        styleFn = function (d) { return (__assign(__assign({}, baseStyle(d)), d.style)); };
    }
    var transform = "translate(" + d.x + "," + d.y + ")";
    var baseMarkProps = { forceUpdate: true };
    var HighlightMark = customMark({ d: d, styleFn: styleFn, transform: transform, baseMarkProps: baseMarkProps, key: "highlight-" + i });
    return HighlightMark;
};
//# sourceMappingURL=networkframeRules.js.map