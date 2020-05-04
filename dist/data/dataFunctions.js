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
Object.defineProperty(exports, "__esModule", { value: true });
var lineDrawing_1 = require("../svg/lineDrawing");
var coordinateNames_1 = require("../constants/coordinateNames");
var lineDrawing_2 = require("../svg/lineDrawing");
var areaDrawing_1 = require("../svg/areaDrawing");
var d3_array_1 = require("d3-array");
var unflowedFunctions_1 = require("./unflowedFunctions");
var baseDefinedFunction = (function () { return true; });
var whichPointsHashY = {
    top: coordinateNames_1.projectedYTop,
    bottom: coordinateNames_1.projectedYBottom,
    orphan: coordinateNames_1.projectedY
};
var whichPointsHashX = {
    top: coordinateNames_1.projectedXTop,
    bottom: coordinateNames_1.projectedXBottom,
    orphan: coordinateNames_1.projectedX
};
var builtInTransformations = {
    stackedarea: lineDrawing_2.stackedArea,
    "stackedarea-invert": lineDrawing_2.stackedArea,
    stackedpercent: lineDrawing_2.stackedArea,
    "stackedpercent-invert": lineDrawing_2.stackedArea,
    linepercent: lineDrawing_2.stackedArea,
    difference: lineDrawing_2.differenceLine,
    bumparea: lineDrawing_2.bumpChart,
    bumpline: lineDrawing_2.bumpChart,
    "bumparea-invert": lineDrawing_2.bumpChart,
    line: lineDrawing_2.lineChart,
    area: lineDrawing_2.lineChart,
    cumulative: lineDrawing_2.cumulativeLine,
    "cumulative-reverse": lineDrawing_2.cumulativeLine
};
function stringToFn(accessor, defaultAccessor, raw) {
    if (!accessor && defaultAccessor) {
        return defaultAccessor;
    }
    else if (typeof accessor === "object") {
        return function () { return accessor; };
    }
    else if (accessor instanceof Function) {
        return accessor;
    }
    else if (raw === true) {
        var castAccessor_1 = accessor;
        return function () { return castAccessor_1; };
    }
    else if (typeof accessor === "string") {
        return function (d) { return d[accessor]; };
    }
    return function () { return undefined; };
}
exports.stringToFn = stringToFn;
function stringToArrayFn(accessor, defaultAccessor, raw) {
    if (accessor === undefined) {
        return [stringToFn(undefined, defaultAccessor, raw)];
    }
    var arrayOfAccessors = [];
    if (Array.isArray(accessor)) {
        arrayOfAccessors = accessor;
    }
    else {
        arrayOfAccessors = [accessor];
    }
    return arrayOfAccessors.map(function (a) {
        return stringToFn(a, defaultAccessor, raw);
    });
}
exports.stringToArrayFn = stringToArrayFn;
exports.calculateDataExtent = function (_a) {
    var lineDataAccessor = _a.lineDataAccessor, xAccessor = _a.xAccessor, yAccessor = _a.yAccessor, summaries = _a.summaries, points = _a.points, lines = _a.lines, lineType = _a.lineType, showLinePoints = _a.showLinePoints, showSummaryPoints = _a.showSummaryPoints, xExtent = _a.xExtent, yExtent = _a.yExtent, invertX = _a.invertX, invertY = _a.invertY, summaryDataAccessor = _a.summaryDataAccessor, summaryType = _a.summaryType, size = _a.adjustedSize, margin = _a.margin, baseMarkProps = _a.baseMarkProps, summaryStyleFn = _a.summaryStyleFn, summaryClassFn = _a.summaryClassFn, summaryRenderModeFn = _a.summaryRenderModeFn, chartSize = _a.chartSize, filterRenderedLines = _a.filterRenderedLines, filterRenderedSummaries = _a.filterRenderedSummaries, filterRenderedPoints = _a.filterRenderedPoints, _b = _a.defined, defined = _b === void 0 ? baseDefinedFunction : _b, _c = _a.annotations, annotations = _c === void 0 ? [] : _c;
    var fullDataset = [];
    var initialProjectedLines = [];
    var projectedPoints = [], projectedLines = [], projectedSummaries = [];
    if (points) {
        xAccessor.forEach(function (actualXAccessor, xIndex) {
            yAccessor.forEach(function (actualYAccessor, yIndex) {
                points.forEach(function (d, i) {
                    var x = actualXAccessor(d, i);
                    var y = actualYAccessor(d, i);
                    var projectedPoint = { x: x, y: y, data: d, xIndex: xIndex, yIndex: yIndex };
                    if (Array.isArray(y)) {
                        projectedPoint[coordinateNames_1.projectedYBottom] = Math.min.apply(Math, __spread(y));
                        projectedPoint[coordinateNames_1.projectedYTop] = Math.max.apply(Math, __spread(y));
                        projectedPoint[coordinateNames_1.projectedYMiddle] =
                            (projectedPoint[coordinateNames_1.projectedYBottom] +
                                projectedPoint[coordinateNames_1.projectedYTop]) /
                                2;
                    }
                    if (Array.isArray(x)) {
                        projectedPoint[coordinateNames_1.projectedXBottom] = Math.min.apply(Math, __spread(x));
                        projectedPoint[coordinateNames_1.projectedXTop] = Math.max.apply(Math, __spread(x));
                        projectedPoint[coordinateNames_1.projectedXMiddle] =
                            (projectedPoint[coordinateNames_1.projectedXBottom] +
                                projectedPoint[coordinateNames_1.projectedXTop]) /
                                2;
                    }
                    projectedPoints.push(projectedPoint);
                });
            });
        });
        fullDataset = __spread(projectedPoints.map(function (d) {
            var _a;
            return (__assign(__assign({}, d), (_a = {}, _a[coordinateNames_1.projectedX] = d[coordinateNames_1.projectedXTop] || d[coordinateNames_1.projectedXBottom] || d.x, _a[coordinateNames_1.projectedY] = d[coordinateNames_1.projectedYTop] || d[coordinateNames_1.projectedYBottom] || d.y, _a)));
        }));
    }
    if (lines) {
        initialProjectedLines = lineDrawing_1.projectLineData({
            data: lines,
            lineDataAccessor: lineDataAccessor,
            xProp: coordinateNames_1.projectedX,
            xPropTop: coordinateNames_1.projectedXTop,
            xPropBottom: coordinateNames_1.projectedXBottom,
            yProp: coordinateNames_1.projectedY,
            yPropTop: coordinateNames_1.projectedYTop,
            yPropBottom: coordinateNames_1.projectedYBottom,
            xAccessor: xAccessor,
            yAccessor: yAccessor
        });
        var optionsObject = {
            xProp: coordinateNames_1.projectedX,
            yProp: coordinateNames_1.projectedY,
            yPropMiddle: coordinateNames_1.projectedYMiddle,
            yPropTop: coordinateNames_1.projectedYTop,
            yPropBottom: coordinateNames_1.projectedYBottom,
            xPropMiddle: coordinateNames_1.projectedXMiddle,
            xPropTop: coordinateNames_1.projectedXTop,
            xPropBottom: coordinateNames_1.projectedXBottom
        };
        projectedLines = lineTransformation(lineType, optionsObject)(initialProjectedLines);
        projectedLines.forEach(function (d) {
            fullDataset = __spread(fullDataset, d.data
                .filter(function (p, q) { return defined(Object.assign({}, p.data, p), q); })
                .map(function (p) {
                var mappedP = {
                    parentLine: d,
                    y: p.y,
                    x: p.x,
                    xTop: p.xTop,
                    xMiddle: p.xMiddle,
                    xBottom: p.xBottom,
                    yTop: p.yTop,
                    yMiddle: p.yMiddle,
                    yBottom: p.yBottom,
                    data: p.data
                };
                if (p.percent) {
                    mappedP.percent = p.percent;
                }
                return mappedP;
            }));
        });
        if (showLinePoints) {
            var whichPointsX_1 = showLinePoints === true
                ? coordinateNames_1.projectedXMiddle
                : whichPointsHashX[showLinePoints];
            var whichPointsY_1 = showLinePoints === true
                ? coordinateNames_1.projectedYMiddle
                : whichPointsHashY[showLinePoints];
            projectedLines.forEach(function (d) {
                d.data
                    .filter(function (p, q) {
                    var isDefined = defined(Object.assign({}, p.data, p));
                    if (isDefined) {
                        if (showLinePoints === "orphan") {
                            var prePoint = d.data[q - 1];
                            var postPoint = d.data[q + 1];
                            if ((!prePoint ||
                                !defined(Object.assign({}, prePoint.data, prePoint))) &&
                                (!postPoint ||
                                    !defined(Object.assign({}, postPoint.data, postPoint)))) {
                                return true;
                            }
                            else {
                                return false;
                            }
                        }
                        else {
                            return true;
                        }
                    }
                    else {
                        return false;
                    }
                })
                    .forEach(function (p) {
                    var _a;
                    projectedPoints.push(__assign(__assign({}, p), (_a = { parentLine: d }, _a[coordinateNames_1.projectedY] = p[whichPointsY_1] !== undefined
                        ? p[whichPointsY_1]
                        : p[coordinateNames_1.projectedYMiddle] !== undefined
                            ? p[coordinateNames_1.projectedYMiddle]
                            : p[coordinateNames_1.projectedYBottom] !== undefined
                                ? p[coordinateNames_1.projectedYBottom]
                                : p.y, _a[coordinateNames_1.projectedX] = p[whichPointsX_1] !== undefined
                        ? p[whichPointsX_1]
                        : p[coordinateNames_1.projectedXMiddle] !== undefined
                            ? p[coordinateNames_1.projectedXMiddle]
                            : p[coordinateNames_1.projectedXBottom] !== undefined
                                ? p[coordinateNames_1.projectedXBottom]
                                : p.y, _a)));
                });
            });
        }
    }
    if (summaries) {
        projectedSummaries = lineDrawing_1.projectSummaryData({
            data: summaries,
            summaryDataAccessor: summaryDataAccessor,
            xAccessor: xAccessor,
            yAccessor: yAccessor
        });
        projectedSummaries.forEach(function (d) {
            var baseData = d._baseData;
            if (d._xyfCoordinates.length > 0 && d._xyfCoordinates[0][0][0]) {
                d._xyfCoordinates[0].forEach(function (multi) {
                    if (Array.isArray(multi)) {
                        multi
                            .map(function (p, q) {
                            var _a;
                            return Object.assign({ parentSummary: d }, baseData[q], (_a = {},
                                _a[coordinateNames_1.projectedX] = p[0],
                                _a[coordinateNames_1.projectedY] = p[1],
                                _a));
                        })
                            .forEach(function (e) {
                            var _a;
                            if (showSummaryPoints) {
                                projectedPoints.push(__assign(__assign({ x: 0 }, e), (_a = {}, _a[coordinateNames_1.projectedY] = e[coordinateNames_1.projectedYTop] || e[coordinateNames_1.projectedYBottom] || e[coordinateNames_1.projectedY], _a)));
                            }
                            fullDataset.push(__assign({ x: 0, y: 0 }, e));
                        });
                    }
                });
            }
            else if (d._xyfCoordinates.length > 0) {
                if (Array.isArray(d._xyfCoordinates)) {
                    var coordArray = d._xyfCoordinates;
                    coordArray
                        .map(function (p, q) {
                        var _a;
                        return (__assign(__assign({ parentSummary: d }, baseData[q]), (_a = {}, _a[coordinateNames_1.projectedX] = p[0], _a[coordinateNames_1.projectedY] = p[1], _a)));
                    })
                        .forEach(function (e) {
                        var _a;
                        if (showSummaryPoints) {
                            projectedPoints.push(__assign(__assign({ x: 0 }, e), (_a = {}, _a[coordinateNames_1.projectedY] = e[coordinateNames_1.projectedYTop] || e[coordinateNames_1.projectedYBottom] || e[coordinateNames_1.projectedY], _a)));
                        }
                        fullDataset.push(__assign({ x: 0, y: 0 }, e));
                    });
                }
            }
        });
    }
    var suitableXAnnotations = [];
    var suitableYAnnotations = [];
    if (xExtent && !Array.isArray(xExtent) && xExtent.includeAnnotations === true) {
        xAccessor.forEach(function (actualXAccessor) {
            annotations.forEach(function (annotation, annotationIndex) {
                var _a;
                var x = actualXAccessor(annotation, annotationIndex);
                if (isFinite(x)) {
                    suitableXAnnotations.push((_a = {},
                        _a[coordinateNames_1.projectedX] = x,
                        _a));
                }
            });
        });
    }
    if (yExtent && !Array.isArray(yExtent) && yExtent.includeAnnotations === true) {
        yAccessor.forEach(function (actualYAccessor) {
            annotations.forEach(function (annotation, annotationIndex) {
                var _a;
                var y = actualYAccessor(annotation, annotationIndex);
                if (isFinite(y)) {
                    suitableYAnnotations.push((_a = {},
                        _a[coordinateNames_1.projectedY] = y,
                        _a));
                }
            });
        });
    }
    var dataForXExtent = __spread(fullDataset, suitableXAnnotations);
    var dataForYExtent = __spread(fullDataset, suitableYAnnotations);
    var calculatedXExtent = [
        d3_array_1.min(dataForXExtent.map(function (d) {
            return d[coordinateNames_1.projectedXBottom] === undefined
                ? d[coordinateNames_1.projectedX]
                : Math.min(d[coordinateNames_1.projectedXTop], d[coordinateNames_1.projectedXBottom]);
        })),
        d3_array_1.max(dataForXExtent.map(function (d) {
            return d[coordinateNames_1.projectedXTop] === undefined
                ? d[coordinateNames_1.projectedX]
                : Math.max(d[coordinateNames_1.projectedXBottom], d[coordinateNames_1.projectedXTop]);
        }))
    ];
    var calculatedYExtent = [
        d3_array_1.min(dataForYExtent.map(function (d) {
            return d[coordinateNames_1.projectedYBottom] === undefined
                ? d[coordinateNames_1.projectedY]
                : Math.min(d[coordinateNames_1.projectedYTop], d[coordinateNames_1.projectedYBottom]);
        })),
        d3_array_1.max(dataForYExtent.map(function (d) {
            return d[coordinateNames_1.projectedYTop] === undefined
                ? d[coordinateNames_1.projectedY]
                : Math.max(d[coordinateNames_1.projectedYBottom], d[coordinateNames_1.projectedYTop]);
        }))
    ];
    var actualXExtent = unflowedFunctions_1.extentValue(xExtent);
    var actualYExtent = unflowedFunctions_1.extentValue(yExtent);
    var xMin = actualXExtent && actualXExtent[0] !== undefined
        ? actualXExtent[0]
        : calculatedXExtent[0];
    var xMax = actualXExtent && actualXExtent[1] !== undefined
        ? actualXExtent[1]
        : calculatedXExtent[1];
    var yMin = actualYExtent && actualYExtent[0] !== undefined
        ? actualYExtent[0]
        : calculatedYExtent[0];
    var yMax = actualYExtent && actualYExtent[1] !== undefined
        ? actualYExtent[1]
        : calculatedYExtent[1];
    var finalYExtent = [yMin, yMax];
    var finalXExtent = [xMin, xMax];
    if (invertX && !(actualXExtent && actualXExtent.length === 2)) {
        finalXExtent = [finalXExtent[1], finalXExtent[0]];
    }
    if ((lineType.type === "bumpline" || invertY) &&
        !(actualYExtent && actualYExtent.length === 2)) {
        finalYExtent = [finalYExtent[1], finalYExtent[0]];
    }
    if (summaryType.type && summaryType.type === "contour") {
        projectedSummaries = areaDrawing_1.contouring({
            summaryType: summaryType,
            data: projectedSummaries,
            finalXExtent: finalXExtent,
            finalYExtent: finalYExtent
        });
    }
    else if (summaryType.type && summaryType.type === "linebounds") {
        projectedSummaries = areaDrawing_1.lineBounding({
            summaryType: summaryType,
            data: projectedSummaries,
            defined: defined
        });
    }
    else if (summaryType.type && summaryType.type === "hexbin") {
        projectedSummaries = areaDrawing_1.hexbinning({
            summaryType: summaryType,
            data: projectedSummaries,
            processedData: summaries && !!summaries[0].processedData,
            preprocess: false,
            finalXExtent: finalXExtent,
            finalYExtent: finalYExtent,
            size: size,
            margin: margin,
            baseMarkProps: baseMarkProps,
            styleFn: summaryStyleFn,
            classFn: summaryClassFn,
            renderFn: summaryRenderModeFn,
            chartSize: chartSize
        });
        fullDataset = __spread(projectedSummaries.map(function (d) { return (__assign({}, d)); }), fullDataset.filter(function (d) { return !d.parentSummary; }));
    }
    else if (summaryType.type && summaryType.type === "heatmap") {
        projectedSummaries = areaDrawing_1.heatmapping({
            summaryType: summaryType,
            data: projectedSummaries,
            processedData: summaries && !!summaries[0].processedData,
            preprocess: false,
            finalXExtent: finalXExtent,
            finalYExtent: finalYExtent,
            size: size,
            margin: margin,
            baseMarkProps: baseMarkProps,
            styleFn: summaryStyleFn,
            classFn: summaryClassFn,
            renderFn: summaryRenderModeFn,
            chartSize: chartSize
        });
        fullDataset = __spread(projectedSummaries.map(function (d) { return (__assign({}, d)); }), fullDataset.filter(function (d) { return !d.parentSummary; }));
    }
    else if (summaryType.type && summaryType.type === "trendline") {
        projectedSummaries = areaDrawing_1.trendlining({
            summaryType: summaryType,
            data: projectedSummaries,
            preprocess: summaries && !!summaries[0].processedData,
            finalXExtent: finalXExtent
        });
        fullDataset = __spread(projectedSummaries.map(function (d) { return (__assign({}, d)); }), fullDataset.filter(function (d) { return !d.parentSummary; }));
    }
    if (filterRenderedLines) {
        projectedLines = projectedLines.filter(filterRenderedLines);
        fullDataset = fullDataset.filter(function (d, i) {
            return !d.parentLine || filterRenderedLines(d.parentLine, i, []);
        });
    }
    if (filterRenderedPoints) {
        fullDataset = fullDataset.filter(filterRenderedPoints);
    }
    if (filterRenderedSummaries) {
        projectedSummaries = projectedSummaries.filter(filterRenderedSummaries);
        fullDataset = fullDataset.filter(function (d, i) {
            return !d.parentSummary || filterRenderedSummaries(d.parentSummary, i, []);
        });
    }
    return {
        xExtent: finalXExtent,
        yExtent: finalYExtent,
        projectedLines: projectedLines,
        projectedPoints: projectedPoints,
        projectedSummaries: projectedSummaries,
        fullDataset: fullDataset,
        calculatedXExtent: calculatedXExtent,
        calculatedYExtent: calculatedYExtent
    };
};
var differenceCatch = function (olineType, data) {
    return olineType === "difference" && data.length !== 2 ? "line" : olineType;
};
function lineTransformation(lineType, options) {
    return function (data) {
        return builtInTransformations[differenceCatch(lineType.type, data)](__assign(__assign(__assign({}, lineType), options), { data: data }));
    };
}
//# sourceMappingURL=dataFunctions.js.map