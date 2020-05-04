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
var d3_scale_1 = require("d3-scale");
var Axis_1 = __importDefault(require("../Axis"));
var axis_1 = require("../visualizationLayerBehavior/axis");
var dataFunctions_1 = require("../data/dataFunctions");
var AnnotationCallout_1 = __importDefault(require("react-annotation/lib/Types/AnnotationCallout"));
var general_1 = require("../visualizationLayerBehavior/general");
var frameFunctions_1 = require("../svg/frameFunctions");
var screenScales = function (_a) {
    var xExtent = _a.xExtent, yExtent = _a.yExtent, adjustedSize = _a.adjustedSize, xScaleType = _a.xScaleType, yScaleType = _a.yScaleType;
    var xDomain = [0, adjustedSize[0]];
    var yDomain = [adjustedSize[1], 0];
    var xScale = xScaleType;
    var yScale = yScaleType;
    if (xScaleType.domain) {
        xScaleType.domain(xExtent);
    }
    if (yScaleType.domain) {
        yScaleType.domain(yExtent);
    }
    xScaleType.range(xDomain);
    yScaleType.range(yDomain);
    return { xScale: xScale, yScale: yScale };
};
var naturalLanguageLineType = {
    line: { items: "line", chart: "line chart" },
    area: { items: "summary", chart: "summary chart" },
    summary: { items: "summary", chart: "summary chart" },
    cumulative: { items: "line", chart: "cumulative chart" },
    "cumulative-reverse": { items: "line", chart: "cumulative chart" },
    linepercent: { items: "line", chart: "line chart" },
    stackedarea: { items: "stacked area", chart: "stacked area chart" },
    "stackedarea-invert": { items: "stacked area", chart: "stacked area chart" },
    stackedpercent: { items: "stacked area", chart: "stacked area chart" },
    "stackedpercent-invert": {
        items: "stacked area",
        chart: "stacked area chart"
    },
    bumparea: { items: "ranked area", chart: "ranked area chart" },
    "bumparea-invert": { items: "ranked area", chart: "ranked area chart" },
    bumpline: { items: "ranked line", chart: "ranked line chart" },
    difference: {
        items: "line",
        chart: "difference chart"
    }
};
var emptyObjectReturnFunction = function () { return ({}); };
var emptyStringReturnFunction = function () { return ""; };
exports.calculateXYFrame = function (currentProps, prevState, updateData) {
    var _a, _b, _c;
    var legend = currentProps.legend, lines = currentProps.lines, lineClass = currentProps.lineClass, pointStyle = currentProps.pointStyle, pointRenderMode = currentProps.pointRenderMode, pointClass = currentProps.pointClass, summaryClass = currentProps.summaryClass, canvasLines = currentProps.canvasLines, canvasPoints = currentProps.canvasPoints, canvasSummaries = currentProps.canvasSummaries, defined = currentProps.defined, size = currentProps.size, renderKey = currentProps.renderKey, lineType = currentProps.lineType, summaryType = currentProps.summaryType, customLineMark = currentProps.customLineMark, customPointMark = currentProps.customPointMark, customSummaryMark = currentProps.customSummaryMark, summaryStyle = currentProps.summaryStyle, summaryRenderMode = currentProps.summaryRenderMode, lineStyle = currentProps.lineStyle, lineRenderMode = currentProps.lineRenderMode, baseXExtent = currentProps.xExtent, baseYExtent = currentProps.yExtent, title = currentProps.title, _d = currentProps.xScaleType, baseXScaleType = _d === void 0 ? d3_scale_1.scaleLinear() : _d, _e = currentProps.yScaleType, baseYScaleType = _e === void 0 ? d3_scale_1.scaleLinear() : _e, lineIDAccessor = currentProps.lineIDAccessor, invertX = currentProps.invertX, invertY = currentProps.invertY, showLinePoints = currentProps.showLinePoints, showSummaryPoints = currentProps.showSummaryPoints, points = currentProps.points, lineDataAccessor = currentProps.lineDataAccessor, summaryDataAccessor = currentProps.summaryDataAccessor, yAccessor = currentProps.yAccessor, xAccessor = currentProps.xAccessor, useSummariesAsInteractionLayer = currentProps.useSummariesAsInteractionLayer, baseMarkProps = currentProps.baseMarkProps, filterRenderedLines = currentProps.filterRenderedLines, filterRenderedSummaries = currentProps.filterRenderedSummaries, filterRenderedPoints = currentProps.filterRenderedPoints, annotations = currentProps.annotations;
    var projectedLines = currentProps.projectedLines, projectedPoints = currentProps.projectedPoints, projectedSummaries = currentProps.projectedSummaries, summaries = currentProps.summaries, fullDataset = currentProps.fullDataset;
    if (summaryType && points && !summaries) {
        summaries = [{ coordinates: points }];
    }
    else if (summaryType && summaryType.type === "linebounds" && lines && !summaries) {
        summaries = lines;
    }
    var castXScaleType = baseXScaleType;
    var xScaleType = baseXScaleType.domain ? baseXScaleType : castXScaleType();
    var castYScaleType = baseYScaleType;
    var yScaleType = baseYScaleType.domain ? baseYScaleType : castYScaleType();
    var annotatedSettings = {
        xAccessor: dataFunctions_1.stringToArrayFn(xAccessor, function (d) { return d[0]; }),
        yAccessor: dataFunctions_1.stringToArrayFn(yAccessor, function (d) { return d[1]; }),
        summaryDataAccessor: dataFunctions_1.stringToArrayFn(summaryDataAccessor, function (d) { return (Array.isArray(d) ? d : d.coordinates); }),
        lineDataAccessor: dataFunctions_1.stringToArrayFn(lineDataAccessor, function (d) { return (Array.isArray(d) ? d : d.coordinates); }),
        renderKeyFn: dataFunctions_1.stringToFn(renderKey, function (d, i) { return "line-" + i; }, true),
        lineType: frameFunctions_1.objectifyType(lineType),
        summaryType: frameFunctions_1.objectifyType(summaryType),
        lineIDAccessor: dataFunctions_1.stringToFn(lineIDAccessor, function (l) { return l.semioticLineID; }),
        summaries: !summaries || (Array.isArray(summaries) && summaries.length === 0)
            ? undefined
            : !Array.isArray(summaries)
                ? [summaries]
                : !summaryDataAccessor && !summaries[0].coordinates
                    ? [{ coordinates: summaries }]
                    : summaries,
        lines: !lines || (Array.isArray(lines) && lines.length === 0)
            ? undefined
            : !Array.isArray(lines)
                ? [lines]
                : !lineDataAccessor && !lines[0].coordinates
                    ? [{ coordinates: lines }]
                    : lines,
        title: typeof title === "object" &&
            !React.isValidElement(title) &&
            title !== null
            ? title
            : { title: title, orient: "top" },
        xExtent: Array.isArray(baseXExtent)
            ? baseXExtent
            : !baseXExtent
                ? undefined
                : baseXExtent.extent,
        yExtent: Array.isArray(baseYExtent)
            ? baseYExtent
            : !baseYExtent
                ? undefined
                : baseYExtent.extent
    };
    if (annotatedSettings.lineType.type === "area") {
        annotatedSettings.lineType.y1 = function () { return 0; };
        annotatedSettings.lineType.simpleLine = false;
    }
    var summaryStyleFn = dataFunctions_1.stringToFn(summaryStyle, emptyObjectReturnFunction, true);
    var summaryClassFn = dataFunctions_1.stringToFn(summaryClass, emptyStringReturnFunction, true);
    var summaryRenderModeFn = dataFunctions_1.stringToFn(summaryRenderMode, undefined, true);
    var generatedAxes = currentProps.axes &&
        currentProps.axes.map(function (axisFnOrObject) {
            return typeof axisFnOrObject === "function"
                ? axisFnOrObject({ size: currentProps.size })
                : axisFnOrObject;
        });
    var margin = frameFunctions_1.calculateMargin({
        margin: currentProps.margin,
        axes: generatedAxes,
        title: annotatedSettings.title,
        size: currentProps.size
    });
    var _f = frameFunctions_1.adjustedPositionSize({
        size: currentProps.size,
        margin: margin
    }), adjustedPosition = _f.adjustedPosition, adjustedSize = _f.adjustedSize;
    var calculatedXExtent = [], calculatedYExtent = [], yExtent, xExtent, xExtentSettings, yExtentSettings;
    if (typeof baseXExtent === "object") {
        xExtentSettings = baseXExtent;
    }
    else {
        xExtentSettings = { extent: baseXExtent };
    }
    if (typeof baseYExtent === "object") {
        yExtentSettings = baseYExtent;
    }
    else {
        yExtentSettings = { extent: baseYExtent };
    }
    var xScale, yScale;
    if (updateData ||
        (currentProps.dataVersion &&
            currentProps.dataVersion !== prevState.dataVersion)) {
        //This will always fire at this point because xExtent/yExtent are just defined up there so revisit this logic
        if (!xExtent ||
            !yExtent ||
            !fullDataset ||
            (!projectedLines && !projectedPoints && !projectedSummaries)) {
            ;
            (_a = dataFunctions_1.calculateDataExtent({
                lineDataAccessor: annotatedSettings.lineDataAccessor,
                summaryDataAccessor: annotatedSettings.summaryDataAccessor,
                xAccessor: annotatedSettings.xAccessor,
                yAccessor: annotatedSettings.yAccessor,
                lineType: annotatedSettings.lineType,
                summaryType: annotatedSettings.summaryType,
                summaries: annotatedSettings.summaries,
                points: points,
                lines: annotatedSettings.lines,
                showLinePoints: showLinePoints,
                showSummaryPoints: showSummaryPoints,
                xExtent: baseXExtent,
                yExtent: baseYExtent,
                invertX: invertX,
                invertY: invertY,
                adjustedSize: adjustedSize,
                margin: margin,
                baseMarkProps: baseMarkProps,
                summaryStyleFn: summaryStyleFn,
                summaryClassFn: summaryClassFn,
                summaryRenderModeFn: summaryRenderModeFn,
                chartSize: size,
                xScaleType: xScaleType,
                yScaleType: yScaleType,
                defined: defined,
                filterRenderedLines: filterRenderedLines,
                filterRenderedSummaries: filterRenderedSummaries,
                filterRenderedPoints: filterRenderedPoints,
                annotations: annotations
            }), xExtent = _a.xExtent, yExtent = _a.yExtent, projectedLines = _a.projectedLines, projectedPoints = _a.projectedPoints, projectedSummaries = _a.projectedSummaries, fullDataset = _a.fullDataset, calculatedXExtent = _a.calculatedXExtent, calculatedYExtent = _a.calculatedYExtent);
        }
        ;
        (_b = screenScales({
            xExtent: xExtent,
            yExtent: yExtent,
            adjustedSize: adjustedSize,
            xScaleType: xScaleType.copy(),
            yScaleType: yScaleType.copy()
        }), xScale = _b.xScale, yScale = _b.yScale);
    }
    else {
        ;
        (xExtent = prevState.xExtent, yExtent = prevState.yExtent, projectedLines = prevState.projectedLines, projectedPoints = prevState.projectedPoints, projectedSummaries = prevState.projectedSummaries, fullDataset = prevState.fullDataset, calculatedXExtent = prevState.calculatedXExtent, calculatedYExtent = prevState.calculatedYExtent);
        if (adjustedSize[0] === prevState.adjustedSize[0] &&
            adjustedSize[1] === prevState.adjustedSize[1]) {
            xScale = prevState.xScale;
            yScale = prevState.yScale;
        }
        else {
            ;
            (_c = screenScales({
                xExtent: xExtent,
                yExtent: yExtent,
                adjustedSize: adjustedSize,
                xScaleType: xScaleType,
                yScaleType: yScaleType
            }), xScale = _c.xScale, yScale = _c.yScale);
        }
    }
    xExtent =
        Array.isArray(xExtentSettings.extent) &&
            xExtentSettings.extent.length === 2
            ? xExtentSettings.extent
            : xExtent;
    yExtent =
        Array.isArray(yExtentSettings.extent) &&
            yExtentSettings.extent.length === 2
            ? yExtentSettings.extent
            : yExtent;
    var canvasDrawing = [];
    var axes;
    var axesTickLines;
    var existingBaselines = {};
    if (generatedAxes) {
        axesTickLines = [];
        axes = generatedAxes.map(function (d, i) {
            var axisClassname = d.className || "";
            axisClassname += " axis";
            var axisScale = yScale;
            if (existingBaselines[d.orient]) {
                d.baseline = d.baseline || false;
            }
            existingBaselines[d.orient] = true;
            if (d.orient === "top" || d.orient === "bottom") {
                axisClassname += " x";
                axisScale = xScale;
            }
            else {
                axisClassname += " y";
            }
            axisClassname += " " + d.orient;
            var tickValues;
            if (d.tickValues && Array.isArray(d.tickValues)) {
                tickValues = d.tickValues;
            }
            else if (d.tickValues instanceof Function) {
                //otherwise assume a function
                tickValues = d.tickValues(fullDataset, currentProps.size, axisScale);
            }
            var axisSize = [adjustedSize[0], adjustedSize[1]];
            var axisParts = axis_1.axisPieces({
                padding: d.padding,
                tickValues: tickValues,
                scale: axisScale,
                ticks: d.ticks,
                orient: d.orient,
                size: axisSize,
                footer: d.footer,
                tickSize: d.tickSize,
                jaggedBase: d.jaggedBase
            });
            var axisTickLines = (React.createElement("g", { key: "axes-tick-lines-" + i, className: "axis " + axisClassname },
                axis_1.axisLines({
                    axisParts: axisParts,
                    orient: d.orient,
                    tickLineGenerator: d.tickLineGenerator,
                    baseMarkProps: baseMarkProps,
                    className: axisClassname,
                    jaggedBase: d.jaggedBase,
                    scale: axisScale
                }),
                d.baseline === "under" &&
                    axis_1.baselineGenerator(d.orient, adjustedSize, d.className)));
            axesTickLines.push(axisTickLines);
            return (React.createElement(Axis_1.default, __assign({}, d, { key: d.key || "axis-" + i, annotationFunction: d.axisAnnotationFunction, axisParts: axisParts, size: axisSize, margin: margin, tickValues: tickValues, scale: axisScale, className: axisClassname, xyPoints: fullDataset })));
        });
    }
    var legendSettings;
    if (legend) {
        legendSettings = legend === true ? {} : legend;
        if (projectedLines && !legendSettings.legendGroups) {
            var typeString = annotatedSettings.lineType.type;
            var type = typeof typeString === "string" &&
                ["stackedarea", "stackedpercent", "bumparea"].indexOf(typeString) ===
                    -1
                ? "line"
                : "fill";
            var legendGroups = [
                {
                    styleFn: currentProps.lineStyle,
                    type: type,
                    items: projectedLines.map(function (d) {
                        return Object.assign({ label: annotatedSettings.lineIDAccessor(d) }, d);
                    })
                }
            ];
            legendSettings.legendGroups = legendGroups;
        }
    }
    var areaAnnotations = [];
    if (annotatedSettings.summaryType.label && projectedSummaries) {
        projectedSummaries.forEach(function (d, i) {
            if (d.bounds) {
                var bounds = Array.isArray(d.bounds) ? d.bounds : [d.bounds];
                bounds.forEach(function (labelBounds) {
                    var label = typeof annotatedSettings.summaryType.label === "function"
                        ? annotatedSettings.summaryType.label(d)
                        : annotatedSettings.summaryType.label;
                    if (label && label !== null) {
                        var labelPosition = label.position || "center";
                        var labelCenter = [
                            xScale(labelBounds[labelPosition][0]),
                            yScale(labelBounds[labelPosition][1])
                        ] || [xScale(d._xyfCoordinates[0]), yScale(d._xyfCoordinates[1])];
                        var labelContent = label.content || (function (p) { return p.value || p.id || i; });
                        areaAnnotations.push({
                            x: labelCenter[0],
                            y: labelCenter[1],
                            dx: label.dx,
                            dy: label.dy,
                            className: label.className,
                            type: label.type || AnnotationCallout_1.default,
                            note: label.note || { title: labelContent(d) },
                            subject: label.subject || { text: labelContent(d) },
                            connector: label.connector
                        });
                    }
                });
            }
        });
    }
    var lineAriaLabel = annotatedSettings.lineType.type !== undefined &&
        typeof annotatedSettings.lineType.type === "string" &&
        naturalLanguageLineType[annotatedSettings.lineType.type];
    var xyFrameRender = {
        lines: {
            accessibleTransform: function (data, i) { return (__assign(__assign({}, data[i].data[data[i].data.length - 1]), { type: "frame-hover" })); },
            data: projectedLines,
            styleFn: dataFunctions_1.stringToFn(lineStyle, emptyObjectReturnFunction, true),
            classFn: dataFunctions_1.stringToFn(lineClass, emptyStringReturnFunction, true),
            renderMode: dataFunctions_1.stringToFn(lineRenderMode, undefined, true),
            canvasRender: dataFunctions_1.stringToFn(canvasLines, undefined, true),
            customMark: customLineMark,
            type: annotatedSettings.lineType,
            defined: defined,
            renderKeyFn: annotatedSettings.renderKeyFn,
            ariaLabel: lineAriaLabel,
            axesData: generatedAxes,
            behavior: general_1.createLines
        },
        summaries: {
            accessibleTransform: function (data, i) { return (__assign(__assign({}, data[i]), { type: "frame-hover" })); },
            data: projectedSummaries,
            styleFn: summaryStyleFn,
            classFn: summaryClassFn,
            renderMode: summaryRenderModeFn,
            canvasRender: dataFunctions_1.stringToFn(canvasSummaries, undefined, true),
            customMark: customSummaryMark,
            type: annotatedSettings.summaryType,
            renderKeyFn: annotatedSettings.renderKeyFn,
            behavior: general_1.createSummaries
        },
        points: {
            accessibleTransform: function (data, i) { return (__assign({ type: "frame-hover" }, (data[i].data || data[i]))); },
            data: projectedPoints,
            styleFn: dataFunctions_1.stringToFn(pointStyle, emptyObjectReturnFunction, true),
            classFn: dataFunctions_1.stringToFn(pointClass, emptyStringReturnFunction, true),
            renderMode: dataFunctions_1.stringToFn(pointRenderMode, undefined, true),
            canvasRender: dataFunctions_1.stringToFn(canvasPoints, undefined, true),
            customMark: customPointMark,
            renderKeyFn: annotatedSettings.renderKeyFn,
            showLinePoints: showLinePoints,
            behavior: general_1.createPoints
        }
    };
    if (xExtentSettings.onChange &&
        prevState.calculatedXExtent.join(",") !== calculatedXExtent.join(",")) {
        xExtentSettings.onChange(calculatedXExtent);
    }
    if (yExtentSettings.onChange &&
        prevState.calculatedYExtent.join(",") !== calculatedYExtent.join(",")) {
        yExtentSettings.onChange(calculatedYExtent);
    }
    var overlay = undefined;
    if (useSummariesAsInteractionLayer && projectedSummaries) {
        overlay = general_1.createSummaries({
            xScale: xScale,
            yScale: yScale,
            data: projectedSummaries
        }).map(function (m, i) { return (__assign(__assign({}, m.props), { style: { fillOpacity: 0 }, overlayData: projectedSummaries && projectedSummaries[i] // luckily createSummaries is a map fn
         })); });
    }
    return {
        lineData: currentProps.lines,
        pointData: currentProps.points,
        summaryData: currentProps.summaries,
        dataVersion: currentProps.dataVersion,
        projectedLines: projectedLines,
        projectedPoints: projectedPoints,
        projectedSummaries: projectedSummaries,
        canvasDrawing: canvasDrawing,
        fullDataset: fullDataset,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        backgroundGraphics: currentProps.backgroundGraphics,
        foregroundGraphics: currentProps.foregroundGraphics,
        axesData: generatedAxes,
        axes: axes,
        axesTickLines: axesTickLines,
        renderNumber: prevState.renderNumber + 1,
        xScale: xScale,
        yScale: yScale,
        xAccessor: annotatedSettings.xAccessor,
        yAccessor: annotatedSettings.yAccessor,
        xExtent: [
            xExtent[0] === undefined ? calculatedXExtent[0] : xExtent[0],
            xExtent[1] === undefined ? calculatedXExtent[1] : xExtent[1]
        ],
        yExtent: [
            yExtent[0] === undefined ? calculatedYExtent[0] : yExtent[0],
            yExtent[1] === undefined ? calculatedYExtent[1] : yExtent[1]
        ],
        calculatedXExtent: calculatedXExtent,
        calculatedYExtent: calculatedYExtent,
        margin: margin,
        legendSettings: legendSettings,
        areaAnnotations: areaAnnotations,
        xyFrameRender: xyFrameRender,
        size: size,
        annotatedSettings: annotatedSettings,
        overlay: overlay,
        props: currentProps
    };
};
//# sourceMappingURL=xyDrawing.js.map