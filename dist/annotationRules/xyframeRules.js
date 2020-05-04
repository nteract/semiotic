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
var semiotic_mark_1 = require("semiotic-mark");
var Annotation_1 = __importDefault(require("../Annotation"));
var AnnotationCalloutRect_1 = __importDefault(require("react-annotation/lib/Types/AnnotationCalloutRect"));
var AnnotationXYThreshold_1 = __importDefault(require("react-annotation/lib/Types/AnnotationXYThreshold"));
var d3_shape_1 = require("d3-shape");
var d3_hierarchy_1 = require("d3-hierarchy");
var d3_array_1 = require("d3-array");
var baseRules_1 = require("./baseRules");
var SpanOrDiv_1 = __importDefault(require("../SpanOrDiv"));
var multiAccessorUtils_1 = require("../data/multiAccessorUtils");
var general_1 = require("../visualizationLayerBehavior/general");
var pointsAlong = function (along) { return function (_a) {
    var d = _a.d, lines = _a.lines, points = _a.points, xScale = _a.xScale, yScale = _a.yScale, pointStyle = _a.pointStyle;
    var alongScale = along === "x" ? xScale : yScale;
    along = along === "yTop" && d.yMiddle ? "yMiddle" : along;
    if (d && d[along]) {
        var _b = d.threshold, threshold = _b === void 0 ? 1 : _b, _c = d.r, r_1 = _c === void 0 ? function () { return 4; } : _c, _d = d.styleFn, styleFn_1 = _d === void 0 ? pointStyle : _d;
        var foundPoints_1 = [];
        var halfThreshold_1 = threshold / 2;
        if (lines && lines.length > 0) {
            lines.forEach(function (linedata) {
                var linePoints = linedata.data.filter(function (p) {
                    var pAlong = alongScale(p[along]);
                    var dAlong = alongScale(d[along]);
                    return (pAlong <= dAlong + halfThreshold_1 && pAlong >= dAlong - halfThreshold_1);
                });
                foundPoints_1.push.apply(foundPoints_1, __spread(linePoints));
            });
        }
        if (points && points.length > 0) {
            var pointPoints = points.filter(function (p) {
                var pAlong = alongScale(p[along]);
                var dAlong = alongScale(d[along]);
                return (pAlong <= dAlong + halfThreshold_1 && pAlong >= dAlong - halfThreshold_1);
            });
            foundPoints_1.push.apply(foundPoints_1, __spread(pointPoints));
        }
        return foundPoints_1.map(function (p, i) { return (React.createElement("circle", { key: "found-circle-" + i, r: r_1(p, i), style: styleFn_1(p, i), cx: xScale(p.xMiddle || p.x), cy: yScale(p.yMiddle || p.yTop) })); });
    }
    return null;
}; };
exports.svgHorizontalPointsAnnotation = pointsAlong("yTop");
exports.svgVerticalPointsAnnotation = pointsAlong("x");
exports.svgHighlight = function (_a) {
    var d = _a.d, i = _a.i, _b = _a.points, points = _b === void 0 ? { data: [] } : _b, _c = _a.lines, lines = _c === void 0 ? { data: [], type: {} } : _c, _d = _a.summaries, summaries = _d === void 0 ? { data: [] } : _d, idAccessor = _a.idAccessor, xScale = _a.xScale, yScale = _a.yScale, xyFrameRender = _a.xyFrameRender, defined = _a.defined;
    var dID;
    var baseID = idAccessor(__assign(__assign({}, d), d.data), i);
    if (baseID !== undefined) {
        dID = baseID;
    }
    else if (d.parentLine && idAccessor(d.parentLine, i) !== undefined) {
        dID = idAccessor(d.parentLine, i);
    }
    else if (d.parentSummary && idAccessor(d.parentSummary, i) !== undefined) {
        dID = idAccessor(d.parentSummary, i);
    }
    var foundPoints = points.data
        .filter(function (p, q) { return idAccessor(__assign(__assign({}, p), p.data), q) === dID; })
        .map(function (p, q) {
        var baseStyle = xyFrameRender.points.styleFn(__assign(__assign({}, p), p.data));
        var highlightStyle = typeof d.style === "function"
            ? d.style(__assign(__assign({}, p), p.data), q)
            : d.style || {};
        return (React.createElement("circle", { key: "highlight-point-" + q, cx: xScale(p.x), cy: yScale(p.y), r: 5, fill: "none", stroke: "black", strokeWidth: 2, style: __assign(__assign({}, baseStyle), highlightStyle), className: "highlight-annotation " + ((d.class &&
                typeof d.class === "function" &&
                d.class(__assign(__assign({}, p), p.data), q)) ||
                (d.class && d.class) ||
                "") }));
    });
    var lineGenerator = d3_shape_1.area()
        .x(function (p) { return xScale(p.x); })
        .y0(function (p) { return yScale(p.yBottom); })
        .y1(function (p) { return yScale(p.yTop); });
    var interpolatorSetting = lines.type.interpolator || lines.type.curve;
    var actualInterpolator = typeof interpolatorSetting === "string"
        ? general_1.curveHash[interpolatorSetting]
        : interpolatorSetting;
    if (actualInterpolator) {
        lineGenerator.curve(actualInterpolator);
    }
    if (defined) {
        lineGenerator.defined(function (p, q) { return defined(p.data, q); });
    }
    var foundLines = lines.data
        .filter(function (p, q) { return idAccessor(p, q) === dID; })
        .map(function (p, q) {
        var baseStyle = xyFrameRender.lines.styleFn(p, q);
        var highlightStyle = typeof d.style === "function" ? d.style(p, q) : d.style || {};
        return (React.createElement("path", { className: "highlight-annotation " + ((d.class &&
                typeof d.class === "function" &&
                d.class(p, q)) ||
                (d.class && d.class) ||
                ""), key: "highlight-summary-" + q, d: lineGenerator(p.data), fill: "none", stroke: "black", strokeWidth: 1, style: __assign(__assign({}, baseStyle), highlightStyle) }));
    });
    var foundSummaries = summaries.data
        .filter(function (p, q) { return idAccessor(p, q) === dID; })
        .map(function (p, q) {
        var baseStyle = xyFrameRender.summaries.styleFn(p, q);
        var highlightStyle = typeof d.style === "function" ? d.style(p, q) : d.style || {};
        return (React.createElement("path", { className: "highlight-annotation " + ((d.class &&
                typeof d.class === "function" &&
                d.class(p, q)) ||
                (d.class && d.class) ||
                ""), key: "highlight-summary-" + q, d: "M" + p.coordinates.join("L"), fill: "none", stroke: "black", strokeWidth: 1, style: __assign(__assign({}, baseStyle), highlightStyle) }));
    });
    return __spread(foundSummaries, foundLines, foundPoints);
};
exports.svgXYAnnotation = function (_a) {
    var screenCoordinates = _a.screenCoordinates, i = _a.i, d = _a.d;
    var inlineStyle;
    if (d.color)
        inlineStyle = { fill: d.color };
    var laLine = (React.createElement(semiotic_mark_1.Mark, { className: "annotation " + d.type + " " + (d.className || "") + " ", key: "annotationpoint" + i, markType: "circle", cx: screenCoordinates[0], cy: screenCoordinates[1], forceUpdate: true, style: inlineStyle, fill: "none", stroke: "black", r: 5 }));
    var laLabel;
    if (d.type === "xy") {
        laLabel = (React.createElement(semiotic_mark_1.Mark, { markType: "text", key: d.label + "annotationtext" + i, forceUpdate: true, x: screenCoordinates[0], y: 10 + screenCoordinates[1], className: "annotation annotation-xy-label " + (d.className || "") + " " }, d.label));
    }
    return [laLine, laLabel];
};
exports.basicReactAnnotation = function (_a) {
    var screenCoordinates = _a.screenCoordinates, d = _a.d, i = _a.i;
    var noteData = Object.assign({
        dx: 0,
        dy: 0,
        note: { label: d.label, orientation: d.orientation, align: d.align },
        connector: { end: "arrow" }
    }, d, {
        type: d.type,
        screenCoordinates: screenCoordinates,
        i: i
    });
    noteData.x = noteData.fixedX ? noteData.fixedX : screenCoordinates[0];
    noteData.y = noteData.fixedY ? noteData.fixedY : screenCoordinates[1];
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.svgXAnnotation = function (_a) {
    var screenCoordinates = _a.screenCoordinates, d = _a.d, i = _a.i, adjustedSize = _a.adjustedSize;
    var noteData = Object.assign({
        dx: 50,
        dy: 20,
        y: 0,
        note: { label: d.label },
        connector: { end: "arrow" }
    }, d, {
        type: AnnotationXYThreshold_1.default,
        x: screenCoordinates[0],
        subject: {
            x: screenCoordinates[0],
            y1: 0,
            y2: adjustedSize[1]
        },
        i: i
    });
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.svgYAnnotation = function (_a) {
    var screenCoordinates = _a.screenCoordinates, d = _a.d, i = _a.i, adjustedSize = _a.adjustedSize, adjustedPosition = _a.adjustedPosition;
    var xPosition = i * 25;
    var noteData = Object.assign({
        dx: 50,
        dy: -20,
        x: xPosition,
        note: { label: d.label },
        connector: { end: "arrow" }
    }, d, {
        type: AnnotationXYThreshold_1.default,
        y: screenCoordinates[1],
        subject: {
            y: screenCoordinates[1],
            x1: 0,
            x2: adjustedSize[0] + adjustedPosition[0]
        },
        i: i
    });
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.svgBoundsAnnotation = function (_a) {
    var d = _a.d, i = _a.i, adjustedSize = _a.adjustedSize, xAccessor = _a.xAccessor, yAccessor = _a.yAccessor, xScale = _a.xScale, yScale = _a.yScale;
    var startXValue = multiAccessorUtils_1.findFirstAccessorValue(xAccessor, d.bounds[0]);
    var startYValue = multiAccessorUtils_1.findFirstAccessorValue(yAccessor, d.bounds[0]);
    var endXValue = multiAccessorUtils_1.findFirstAccessorValue(xAccessor, d.bounds[1]);
    var endYValue = multiAccessorUtils_1.findFirstAccessorValue(yAccessor, d.bounds[1]);
    var x0Position = startXValue ? xScale(startXValue) : 0;
    var y0Position = startYValue ? yScale(startYValue) : adjustedSize[1];
    var x1Position = endXValue ? xScale(endXValue) : adjustedSize[0];
    var y1Position = endYValue ? yScale(endYValue) : 0;
    var noteData = Object.assign({
        dx: 250,
        dy: -20,
        note: { label: d.label },
        connector: { end: "arrow" }
    }, d, {
        type: AnnotationCalloutRect_1.default,
        x: Math.min(x0Position, x1Position),
        y: Math.min(y0Position, y1Position),
        subject: {
            width: Math.abs(x1Position - x0Position),
            height: Math.abs(y0Position - y1Position)
        },
        i: i
    });
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.svgLineAnnotation = function (_a) {
    var d = _a.d, i = _a.i, screenCoordinates = _a.screenCoordinates;
    var lineGenerator = d3_shape_1.line()
        .x(function (p) { return p[0]; })
        .y(function (p) { return p[1]; });
    var lineD = lineGenerator(screenCoordinates);
    var laLine = (React.createElement(semiotic_mark_1.Mark, { key: d.label + "annotationline" + i, markType: "path", d: lineD, className: "annotation annotation-line " + (d.className || "") + " " }));
    var laLabel = (React.createElement(semiotic_mark_1.Mark, { markType: "text", key: d.label + "annotationlinetext" + i, x: (screenCoordinates[0][0] + screenCoordinates[1][0]) / 2, y: (screenCoordinates[0][1] + screenCoordinates[1][1]) / 2, className: "annotation annotation-line-label " + (d.className || "") + " " }, d.label));
    return [laLine, laLabel];
};
exports.svgAreaAnnotation = function (_a) {
    var d = _a.d, i = _a.i, xScale = _a.xScale, xAccessor = _a.xAccessor, yScale = _a.yScale, yAccessor = _a.yAccessor, annotationLayer = _a.annotationLayer;
    var mappedCoordinates = "M" + d.coordinates
        .map(function (p) { return [
        xScale(multiAccessorUtils_1.findFirstAccessorValue(xAccessor, p)),
        yScale(multiAccessorUtils_1.findFirstAccessorValue(yAccessor, p))
    ]; })
        .join("L") + "Z";
    var xBounds = d3_array_1.extent(d.coordinates.map(function (p) { return xScale(multiAccessorUtils_1.findFirstAccessorValue(xAccessor, p)); }));
    var yBounds = d3_array_1.extent(d.coordinates.map(function (p) { return yScale(multiAccessorUtils_1.findFirstAccessorValue(yAccessor, p)); }));
    var xCenter = (xBounds[0] + xBounds[1]) / 2;
    var yCenter = (yBounds[0] + yBounds[1]) / 2;
    var laLine = (React.createElement(semiotic_mark_1.Mark, { key: d.label + "-annotation-area-" + i, markType: "path", d: mappedCoordinates, className: "annotation annotation-area " + (d.className || "") + " " }));
    var laLabel = (React.createElement(semiotic_mark_1.Mark, { markType: "text", key: d.label + "-annotationtext-" + i, forceUpdate: true, x: xCenter, y: yCenter, transform: "translate(" + annotationLayer.position + ")", className: "annotation annotation-area-label " + (d.className || "") + " ", style: { textAnchor: "middle" } }, d.label));
    return [laLine, laLabel];
};
exports.htmlTooltipAnnotation = function (_a) {
    //To string because React gives a DOM error if it gets a date
    var content = _a.content, screenCoordinates = _a.screenCoordinates, i = _a.i, d = _a.d, useSpans = _a.useSpans;
    return (React.createElement(SpanOrDiv_1.default, { span: useSpans, key: "xylabel-" + i, className: "annotation annotation-xy-label " + (d.className || "") + " ", style: {
            position: "absolute",
            top: screenCoordinates[1] + "px",
            left: screenCoordinates[0] + "px"
        } }, content));
};
exports.svgRectEncloseAnnotation = function (_a) {
    var d = _a.d, i = _a.i, screenCoordinates = _a.screenCoordinates;
    var bboxNodes = screenCoordinates.map(function (p) {
        return {
            x0: p.x0 = p[0],
            x1: p.x1 = p[0],
            y0: p.y0 = p[1],
            y1: p.y1 = p[1]
        };
    });
    return baseRules_1.rectangleEnclosure({ bboxNodes: bboxNodes, d: d, i: i });
};
exports.svgEncloseAnnotation = function (_a) {
    var screenCoordinates = _a.screenCoordinates, d = _a.d, i = _a.i;
    var circle = d3_hierarchy_1.packEnclose(screenCoordinates.map(function (p) { return ({ x: p[0], y: p[1], r: 2 }); }));
    return baseRules_1.circleEnclosure({ d: d, circle: circle, i: i });
};
exports.svgHullEncloseAnnotation = function (_a) {
    var screenCoordinates = _a.screenCoordinates, d = _a.d, i = _a.i;
    return baseRules_1.hullEnclosure({ points: screenCoordinates, d: d, i: i });
};
//# sourceMappingURL=xyframeRules.js.map