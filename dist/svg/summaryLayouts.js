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
var Axis_1 = __importDefault(require("../Axis"));
var semiotic_mark_1 = require("semiotic-mark");
var areaDrawing_1 = require("../svg/areaDrawing");
var d3_array_1 = require("d3-array");
var d3_array_2 = require("d3-array");
var SvgHelper_1 = require("../svg/SvgHelper");
var d3_shape_1 = require("d3-shape");
var pieceDrawing_1 = require("./pieceDrawing");
var frameFunctions_1 = require("./frameFunctions");
var d3_scale_1 = require("d3-scale");
var general_1 = require("../visualizationLayerBehavior/general");
var d3_array_3 = require("d3-array");
var contourMap = function (d) { return [d.xy.x, d.xy.y]; };
var verticalXYSorting = function (a, b) { return a.xy.y - b.xy.y; };
var horizontalXYSorting = function (a, b) { return b.xy.x - a.xy.x; };
var emptyObjectReturnFn = function () { return ({}); };
function createSummaryAxis(_a) {
    var summary = _a.summary, summaryI = _a.summaryI, axisSettings = _a.axisSettings, axisCreator = _a.axisCreator, projection = _a.projection, actualMax = _a.actualMax, adjustedSize = _a.adjustedSize, columnWidth = _a.columnWidth;
    var axisTranslate = "translate(" + summary.x + ",0)";
    var axisDomain = [0, actualMax];
    if (projection === "horizontal") {
        axisTranslate = "translate(" + 0 + "," + summary.x + ")";
        axisDomain = [actualMax, 0];
    }
    else if (projection === "radial") {
        axisTranslate = "translate(0, 0)";
    }
    var axisWidth = projection === "horizontal" ? adjustedSize[0] : columnWidth;
    var axisHeight = projection === "vertical" ? adjustedSize[1] : columnWidth;
    axisSettings.size = [axisWidth, axisHeight];
    var axisScale = d3_scale_1.scaleLinear()
        .domain(axisDomain)
        .range([0, columnWidth]);
    var renderedSummaryAxis = axisCreator(axisSettings, summaryI, axisScale);
    return (React.createElement("g", { className: "summary-axis", key: "summaryPiece-axis-" + summaryI, transform: axisTranslate }, renderedSummaryAxis));
}
function boxplotRenderFn(_a) {
    var data = _a.data, type = _a.type, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, classFn = _a.classFn, projection = _a.projection, adjustedSize = _a.adjustedSize, baseMarkProps = _a.baseMarkProps;
    var summaryElementStylingFn = type.elementStyleFn || emptyObjectReturnFn;
    var keys = Object.keys(data);
    var renderedSummaryMarks = [];
    var summaryXYCoords = [];
    keys.forEach(function (key, summaryI) {
        var summary = data[key];
        var eventListeners = eventListenersGenerator(summary, summaryI);
        var columnWidth = summary.width;
        var thisSummaryData = summary.pieceData;
        var calculatedSummaryStyle = styleFn(thisSummaryData[0].data, summaryI);
        var calculatedSummaryClass = classFn(thisSummaryData[0].data, summaryI);
        var summaryPositionNest, summaryValueNest, translate, extentlineX1, extentlineX2, extentlineY1, extentlineY2, topLineX1, topLineX2, midLineX1, midLineX2, bottomLineX1, bottomLineX2, rectTopWidth, rectTopHeight, rectTopY, rectTopX, rectBottomWidth, rectBottomHeight, rectBottomY, rectBottomX, rectWholeWidth, rectWholeHeight, rectWholeY, rectWholeX, topLineY1, topLineY2, bottomLineY1, bottomLineY2, midLineY1, midLineY2;
        var renderValue = renderMode ? renderMode(summary, summaryI) : undefined;
        summaryValueNest = thisSummaryData.map(function (p) { return p.value; }).sort(function (a, b) { return a - b; });
        summaryValueNest = [
            d3_array_1.quantile(summaryValueNest, 0.0),
            d3_array_1.quantile(summaryValueNest, 0.25),
            d3_array_1.quantile(summaryValueNest, 0.5),
            d3_array_1.quantile(summaryValueNest, 0.75),
            d3_array_1.quantile(summaryValueNest, 1.0)
        ];
        //translate
        if (projection === "vertical") {
            summaryPositionNest = thisSummaryData
                .map(function (p) { return p.scaledVerticalValue; })
                .sort(function (a, b) { return b - a; });
            translate = "translate(" + (summary.x + summary.padding) + ",0)";
            summaryPositionNest = [
                d3_array_1.quantile(summaryPositionNest, 0.0),
                d3_array_1.quantile(summaryPositionNest, 0.25),
                d3_array_1.quantile(summaryPositionNest, 0.5),
                d3_array_1.quantile(summaryPositionNest, 0.75),
                d3_array_1.quantile(summaryPositionNest, 1.0)
            ];
            extentlineX1 = 0;
            extentlineX2 = 0;
            extentlineY1 = summaryPositionNest[0];
            extentlineY2 = summaryPositionNest[4];
            topLineX1 = -columnWidth / 2;
            topLineX2 = columnWidth / 2;
            midLineX1 = -columnWidth / 2;
            midLineX2 = columnWidth / 2;
            bottomLineX1 = -columnWidth / 2;
            bottomLineX2 = columnWidth / 2;
            rectBottomWidth = columnWidth;
            rectBottomHeight = summaryPositionNest[1] - summaryPositionNest[2];
            rectBottomY = summaryPositionNest[2];
            rectBottomX = -columnWidth / 2;
            rectTopWidth = columnWidth;
            rectTopHeight = summaryPositionNest[2] - summaryPositionNest[3];
            rectWholeWidth = columnWidth;
            rectWholeHeight = summaryPositionNest[1] - summaryPositionNest[3];
            rectWholeY = summaryPositionNest[3];
            rectWholeX = -columnWidth / 2;
            rectTopY = summaryPositionNest[3];
            rectTopX = -columnWidth / 2;
            topLineY1 = summaryPositionNest[0];
            topLineY2 = summaryPositionNest[0];
            bottomLineY1 = summaryPositionNest[4];
            bottomLineY2 = summaryPositionNest[4];
            midLineY1 = summaryPositionNest[2];
            midLineY2 = summaryPositionNest[2];
            summaryXYCoords.push({
                label: "Maximum",
                key: key,
                summaryPieceName: "max",
                x: 0,
                y: summaryPositionNest[4],
                value: summaryValueNest[4]
            }, {
                label: "3rd Quartile",
                key: key,
                summaryPieceName: "q3area",
                x: 0,
                y: summaryPositionNest[3],
                value: summaryValueNest[3]
            }, {
                label: "Median",
                key: key,
                summaryPieceName: "median",
                x: 0,
                y: summaryPositionNest[2],
                value: summaryValueNest[2]
            }, {
                label: "1st Quartile",
                key: key,
                summaryPieceName: "q1area",
                x: 0,
                y: summaryPositionNest[1],
                value: summaryValueNest[1]
            }, {
                label: "Minimum",
                key: key,
                summaryPieceName: "min",
                x: 0,
                y: summaryPositionNest[0],
                value: summaryValueNest[0]
            });
        }
        else if (projection === "horizontal") {
            summaryPositionNest = thisSummaryData
                .map(function (p) { return p.scaledValue; })
                .sort(function (a, b) { return a - b; });
            translate = "translate(0," + (summary.x + summary.padding) + ")";
            summaryPositionNest = [
                d3_array_1.quantile(summaryPositionNest, 0.0),
                d3_array_1.quantile(summaryPositionNest, 0.25),
                d3_array_1.quantile(summaryPositionNest, 0.5),
                d3_array_1.quantile(summaryPositionNest, 0.75),
                d3_array_1.quantile(summaryPositionNest, 1.0)
            ];
            extentlineY1 = 0;
            extentlineY2 = 0;
            extentlineX1 = summaryPositionNest[0];
            extentlineX2 = summaryPositionNest[4];
            topLineY1 = -columnWidth / 2;
            topLineY2 = columnWidth / 2;
            midLineY1 = -columnWidth / 2;
            midLineY2 = columnWidth / 2;
            bottomLineY1 = -columnWidth / 2;
            bottomLineY2 = columnWidth / 2;
            rectTopHeight = columnWidth;
            rectTopWidth = summaryPositionNest[3] - summaryPositionNest[2];
            rectTopX = summaryPositionNest[2];
            rectTopY = -columnWidth / 2;
            rectBottomHeight = columnWidth;
            rectBottomWidth = summaryPositionNest[2] - summaryPositionNest[1];
            rectBottomX = summaryPositionNest[1];
            rectBottomY = -columnWidth / 2;
            rectWholeHeight = columnWidth;
            rectWholeWidth = summaryPositionNest[3] - summaryPositionNest[1];
            rectWholeX = summaryPositionNest[1];
            rectWholeY = -columnWidth / 2;
            topLineX1 = summaryPositionNest[0];
            topLineX2 = summaryPositionNest[0];
            bottomLineX1 = summaryPositionNest[4];
            bottomLineX2 = summaryPositionNest[4];
            midLineX1 = summaryPositionNest[2];
            midLineX2 = summaryPositionNest[2];
            summaryXYCoords.push({
                label: "Maximum",
                key: key,
                summaryPieceName: "max",
                x: summaryPositionNest[4],
                y: 0,
                value: summaryValueNest[4]
            }, {
                label: "3rd Quartile",
                key: key,
                summaryPieceName: "q3area",
                x: summaryPositionNest[3],
                y: 0,
                value: summaryValueNest[3]
            }, {
                label: "Median",
                key: key,
                summaryPieceName: "median",
                x: summaryPositionNest[2],
                y: 0,
                value: summaryValueNest[2]
            }, {
                label: "1st Quartile",
                key: key,
                summaryPieceName: "q1area",
                x: summaryPositionNest[1],
                y: 0,
                value: summaryValueNest[1]
            }, {
                label: "Minimum",
                key: key,
                summaryPieceName: "min",
                x: summaryPositionNest[0],
                y: 0,
                value: summaryValueNest[0]
            });
        }
        if (projection === "radial") {
            summaryPositionNest = thisSummaryData
                .map(function (p) { return p.scaledValue; })
                .sort(function (a, b) { return a - b; });
            summaryPositionNest = [
                d3_array_1.quantile(summaryPositionNest, 0.0),
                d3_array_1.quantile(summaryPositionNest, 0.25),
                d3_array_1.quantile(summaryPositionNest, 0.5),
                d3_array_1.quantile(summaryPositionNest, 0.75),
                d3_array_1.quantile(summaryPositionNest, 1.0)
            ];
            extentlineX1 = 0;
            extentlineX2 = 0;
            extentlineY1 = summaryPositionNest[0];
            extentlineY2 = summaryPositionNest[4];
            topLineX1 = -columnWidth / 2;
            topLineX2 = columnWidth / 2;
            midLineX1 = -columnWidth / 2;
            midLineX2 = columnWidth / 2;
            bottomLineX1 = -columnWidth / 2;
            bottomLineX2 = columnWidth / 2;
            rectTopWidth = columnWidth;
            rectTopHeight = summaryPositionNest[1] - summaryPositionNest[3];
            rectTopY = summaryPositionNest[3];
            rectTopX = -columnWidth / 2;
            rectBottomWidth = columnWidth;
            rectBottomHeight = summaryPositionNest[1] - summaryPositionNest[3];
            rectBottomY = summaryPositionNest[3];
            rectBottomX = -columnWidth / 2;
            topLineY1 = summaryPositionNest[0];
            topLineY2 = summaryPositionNest[0];
            bottomLineY1 = summaryPositionNest[4];
            bottomLineY2 = summaryPositionNest[4];
            midLineY1 = summaryPositionNest[2];
            midLineY2 = summaryPositionNest[2];
            var twoPI = Math.PI * 2;
            var bottomLineArcGenerator = d3_shape_1.arc()
                .innerRadius(bottomLineY1 / 2)
                .outerRadius(bottomLineY1 / 2);
            //        .padAngle(summary.pct_padding * twoPI);
            var topLineArcGenerator = d3_shape_1.arc()
                .innerRadius(topLineY1 / 2)
                .outerRadius(topLineY1 / 2);
            //        .padAngle(summary.pct_padding * twoPI);
            var midLineArcGenerator = d3_shape_1.arc()
                .innerRadius(midLineY1 / 2)
                .outerRadius(midLineY1 / 2);
            //        .padAngle(summary.pct_padding * twoPI);
            var bodyArcTopGenerator = d3_shape_1.arc()
                .innerRadius(summaryPositionNest[1] / 2)
                .outerRadius(midLineY1 / 2);
            //        .padAngle(summary.pct_padding * twoPI);
            var bodyArcBottomGenerator = d3_shape_1.arc()
                .innerRadius(midLineY1 / 2)
                .outerRadius(summaryPositionNest[3] / 2);
            //        .padAngle(summary.pct_padding * twoPI);
            var bodyArcWholeGenerator = d3_shape_1.arc()
                .innerRadius(summaryPositionNest[1] / 2)
                .outerRadius(summaryPositionNest[3] / 2);
            //        .padAngle(summary.pct_padding * twoPI);
            var startAngle = summary.pct_start + summary.pct_padding / 2;
            var endAngle = summary.pct + summary.pct_start - summary.pct_padding / 2;
            var midAngle = summary.pct / 2 + summary.pct_start;
            startAngle *= twoPI;
            endAngle *= twoPI;
            var radialAdjustX = adjustedSize[0] / 2;
            var radialAdjustY = adjustedSize[1] / 2;
            //        const bottomPoint = bottomLineArcGenerator.centroid({ startAngle, endAngle })
            //        const topPoint = topLineArcGenerator.centroid({ startAngle, endAngle })
            var bottomPoint = pieceDrawing_1.pointOnArcAtAngle([0, 0], midAngle, summaryPositionNest[4] / 2);
            var topPoint = pieceDrawing_1.pointOnArcAtAngle([0, 0], midAngle, summaryPositionNest[0] / 2);
            var thirdPoint = pieceDrawing_1.pointOnArcAtAngle([0, 0], midAngle, summaryPositionNest[3] / 2);
            var midPoint = pieceDrawing_1.pointOnArcAtAngle([0, 0], midAngle, summaryPositionNest[2] / 2);
            var firstPoint = pieceDrawing_1.pointOnArcAtAngle([0, 0], midAngle, summaryPositionNest[1] / 2);
            summaryXYCoords.push({
                label: "Minimum",
                key: key,
                summaryPieceName: "min",
                x: topPoint[0] + radialAdjustX,
                y: topPoint[1] + radialAdjustY,
                value: summaryValueNest[0]
            }, {
                label: "1st Quartile",
                key: key,
                summaryPieceName: "q3area",
                x: firstPoint[0] + radialAdjustX,
                y: firstPoint[1] + radialAdjustY,
                value: summaryValueNest[1]
            }, {
                label: "Median",
                key: key,
                summaryPieceName: "median",
                x: midPoint[0] + radialAdjustX,
                y: midPoint[1] + radialAdjustY,
                value: summaryValueNest[2]
            }, {
                label: "3rd Quartile",
                key: key,
                summaryPieceName: "q1area",
                x: thirdPoint[0] + radialAdjustX,
                y: thirdPoint[1] + radialAdjustY,
                value: summaryValueNest[3]
            }, {
                label: "Maximum",
                key: key,
                summaryPieceName: "max",
                x: bottomPoint[0] + radialAdjustX,
                y: bottomPoint[1] + radialAdjustY,
                value: summaryValueNest[4]
            });
            translate = "translate(" + radialAdjustX + "," + radialAdjustY + ")";
            renderedSummaryMarks.push(React.createElement("g", __assign({}, eventListeners, { className: calculatedSummaryClass, transform: translate, key: "summaryPiece-" + summaryI, role: "img", tabIndex: -1, "data-o": key, "aria-label": key + " boxplot showing " + summaryXYCoords
                    .filter(function (d) { return d.key === key; })
                    .map(function (d) { return d.label + " " + d.value; }) }),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "line", x1: bottomPoint[0], x2: topPoint[0], y1: bottomPoint[1], y2: topPoint[1], style: Object.assign({ strokeWidth: 2 }, calculatedSummaryStyle, summaryElementStylingFn("whisker")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "path", d: topLineArcGenerator({ startAngle: startAngle, endAngle: endAngle }), style: Object.assign({ strokeWidth: 4 }, calculatedSummaryStyle, { fill: "none" }, summaryElementStylingFn("max")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "path", d: midLineArcGenerator({ startAngle: startAngle, endAngle: endAngle }), style: Object.assign({ strokeWidth: 4 }, calculatedSummaryStyle, { fill: "none" }, summaryElementStylingFn("median")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "path", d: bottomLineArcGenerator({ startAngle: startAngle, endAngle: endAngle }), style: Object.assign({ strokeWidth: 4 }, calculatedSummaryStyle, { fill: "none" }, summaryElementStylingFn("min")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "path", d: bodyArcWholeGenerator({ startAngle: startAngle, endAngle: endAngle }), style: Object.assign({ strokeWidth: 4 }, calculatedSummaryStyle, summaryElementStylingFn("iqrarea")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "path", d: bodyArcTopGenerator({ startAngle: startAngle, endAngle: endAngle }), style: Object.assign({}, calculatedSummaryStyle, { fill: "none", stroke: "none" }, summaryElementStylingFn("q3area")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "path", d: bodyArcBottomGenerator({ startAngle: startAngle, endAngle: endAngle }), style: Object.assign({}, calculatedSummaryStyle, { fill: "none", stroke: "none" }, summaryElementStylingFn("q1area")) }))));
        }
        else {
            renderedSummaryMarks.push(React.createElement("g", __assign({}, eventListeners, { className: calculatedSummaryClass, transform: translate, key: "summaryPiece-" + summaryI, role: "img", tabIndex: -1, "data-o": key, "aria-label": key + " boxplot showing " + summaryXYCoords
                    .filter(function (d) { return d.key === key; })
                    .map(function (d) { return d.label + " " + d.value; })
                    .join(", ") }),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "line", x1: extentlineX1, x2: extentlineX2, y1: extentlineY1, y2: extentlineY2, style: Object.assign({ strokeWidth: "2px" }, calculatedSummaryStyle, summaryElementStylingFn("whisker")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "line", x1: topLineX1, x2: topLineX2, y1: topLineY1, y2: topLineY2, style: Object.assign({ strokeWidth: "2px" }, calculatedSummaryStyle, summaryElementStylingFn("min")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "line", x1: bottomLineX1, x2: bottomLineX2, y1: bottomLineY1, y2: bottomLineY2, style: Object.assign({ strokeWidth: "2px" }, calculatedSummaryStyle, summaryElementStylingFn("max")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "rect", x: rectWholeX, width: rectWholeWidth, y: rectWholeY, height: rectWholeHeight, style: Object.assign({ strokeWidth: "1px" }, calculatedSummaryStyle, summaryElementStylingFn("iqrarea")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "rect", x: rectTopX, width: rectTopWidth, y: rectTopY, height: rectTopHeight, style: Object.assign({}, calculatedSummaryStyle, { fill: "none", stroke: "none" }, summaryElementStylingFn("q3area")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "rect", x: rectBottomX, width: rectBottomWidth, y: rectBottomY, height: rectBottomHeight, style: Object.assign({}, calculatedSummaryStyle, { fill: "none", stroke: "none" }, summaryElementStylingFn("q1area")) })),
                React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderValue, markType: "line", x1: midLineX1, x2: midLineX2, y1: midLineY1, y2: midLineY2, style: Object.assign({ strokeWidth: "2px" }, calculatedSummaryStyle, summaryElementStylingFn("median")) }))));
        }
    });
    return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords };
}
exports.boxplotRenderFn = boxplotRenderFn;
function contourRenderFn(_a) {
    var data = _a.data, type = _a.type, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, classFn = _a.classFn, adjustedSize = _a.adjustedSize, baseMarkProps = _a.baseMarkProps;
    var keys = Object.keys(data);
    var renderedSummaryMarks = [];
    var summaryXYCoords = [];
    keys.forEach(function (key, ordsetI) {
        var ordset = data[key];
        var renderValue = renderMode && renderMode(ordset, ordsetI);
        type.thresholds = type.thresholds || 8;
        type.bandwidth = type.bandwidth || 12;
        type.resolution = type.resolution || 1000;
        var projectedOrd = [
            { id: ordset, _xyfCoordinates: ordset.xyData.map(contourMap) }
        ];
        var oContours = areaDrawing_1.contouring({
            summaryType: type,
            data: projectedOrd,
            finalXExtent: [0, adjustedSize[0]],
            finalYExtent: [0, adjustedSize[1]]
        });
        var contourMarks = [];
        oContours.forEach(function (d, i) {
            d.coordinates.forEach(function (coords, ii) {
                var eventListeners = eventListenersGenerator(d, i);
                contourMarks.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, eventListeners, { renderMode: renderValue, simpleInterpolate: true, key: i + "-" + ii, style: styleFn(ordset.pieceData[0].data, ordsetI), className: classFn(ordset.pieceData[0].data, ordsetI), markType: "path", d: "M" + d.coordinates[0].map(function (p) { return p.join(","); }).join("L") + "Z" })));
            });
        });
        renderedSummaryMarks.push(React.createElement("g", { key: "contour-container-" + ordsetI, role: "img", tabIndex: -1, "data-o": key, "aria-label": key + " Contour plot" }, contourMarks));
    });
    return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords };
}
exports.contourRenderFn = contourRenderFn;
function axisGenerator(axisProps, i, axisScale) {
    return (React.createElement(Axis_1.default, { label: axisProps.label, key: axisProps.key || "orframe-summary-axis-" + i, orient: axisProps.orient, size: axisProps.size, ticks: axisProps.ticks, tickSize: axisProps.tickSize, tickFormat: axisProps.tickFormat, tickValues: axisProps.tickValues, rotate: axisProps.rotate, scale: axisScale, className: axisProps.className }));
}
function bucketizedRenderingFn(_a) {
    var data = _a.data, type = _a.type, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, classFn = _a.classFn, projection = _a.projection, adjustedSize = _a.adjustedSize, chartSize = _a.chartSize, baseMarkProps = _a.baseMarkProps;
    var renderedSummaryMarks = [];
    var summaryXYCoords = [];
    var buckets = type.bins || 25;
    var relativeBuckets = type.relative ? {} : false;
    var summaryValueAccessor = type.binValue || (function (d) { return d.length; });
    var axisCreator;
    if (type.axis) {
        type.axis.orient =
            projection === "horizontal" &&
                ["left", "right"].indexOf(type.axis.orient) === -1
                ? "left"
                : type.axis.orient;
        type.axis.orient =
            projection === "vertical" &&
                ["bottom", "top"].indexOf(type.axis.orient) === -1
                ? "bottom"
                : type.axis.orient;
        axisCreator = axisGenerator;
        if (projection === "radial") {
            console.error("Summary axes cannot be drawn for radial histograms");
            axisCreator = function () { return null; };
        }
    }
    var bucketSize = chartSize / buckets;
    var keys = Object.keys(data);
    var binMax = 0;
    var calculatedBins = keys.map(function (key, summaryI) {
        var summary = data[key];
        var thisSummaryData = summary.xyData;
        var xySorting = projection === "vertical" ? verticalXYSorting : horizontalXYSorting;
        var summaryPositionNest = thisSummaryData.sort(xySorting);
        var violinHist = d3_array_2.histogram();
        var binDomain = projection === "vertical" ? [0, chartSize] : [0, chartSize];
        var binOffset = 0;
        var binBuckets = [];
        for (var x = 0; x < buckets; x++) {
            binBuckets.push(binDomain[0] + (x / buckets) * (chartSize - binOffset));
        }
        //    binBuckets.push(binDomain[1]);
        var xyValue = projection === "vertical"
            ? function (p) { return p.piece.scaledVerticalValue; }
            : function (p) { return p.piece.scaledValue; };
        var keyBins;
        if (type.useBins === false) {
            var calculatedValues_1 = summaryPositionNest.map(function (value) { return xyValue(value); });
            keyBins = summaryPositionNest
                .map(function (value, i) {
                var bucketArray = [];
                bucketArray.x0 = calculatedValues_1[i] - 1;
                bucketArray.x1 = calculatedValues_1[i] + 1;
                bucketArray.push(value);
                return bucketArray;
            })
                .sort(function (a, b) { return a.x0 - b.x0; });
            bucketSize = chartSize / keyBins.length;
        }
        else {
            keyBins = violinHist
                .domain(binDomain)
                .thresholds(binBuckets)
                .value(xyValue)(summaryPositionNest);
        }
        keyBins = keyBins.map(function (d) { return ({
            y: d.x0,
            y1: d.x1 - d.x0,
            pieces: d,
            value: summaryValueAccessor(d.map(function (p) { return p.piece.data; }))
        }); });
        if (type.type === "histogram" || type.type === "heatmap") {
            keyBins = keyBins.filter(function (d) { return d.value !== 0; });
        }
        var relativeMax = keyBins.length === 0 ? 0 : d3_array_2.max(keyBins.map(function (d) { return d.value; }));
        if (relativeBuckets) {
            relativeBuckets[key] = relativeMax;
        }
        binMax = Math.max(binMax, relativeMax);
        return { bins: keyBins, summary: summary, summaryI: summaryI, thisSummaryData: thisSummaryData };
    });
    var numHorizons = type.horizon ? binMax / type.horizon : type.numHorizons || 4;
    var horizon = type.horizon || binMax / numHorizons;
    calculatedBins.forEach(function (_a) {
        var bins = _a.bins, summary = _a.summary, summaryI = _a.summaryI, thisSummaryData = _a.thisSummaryData;
        var eventListeners = eventListenersGenerator(summary, summaryI);
        var columnWidth = summary.width;
        var renderValue = renderMode && renderMode(summary, summaryI);
        var calculatedSummaryStyle = thisSummaryData[0]
            ? styleFn(thisSummaryData[0].piece.data, summaryI)
            : {};
        var calculatedSummaryClass = thisSummaryData[0]
            ? classFn(thisSummaryData[0].piece.data, summaryI)
            : "";
        var translate = [summary.middle, 0];
        if (projection === "horizontal") {
            translate = [bucketSize, summary.middle];
        }
        else if (projection === "radial") {
            translate = [adjustedSize[0] / 2, adjustedSize[1] / 2];
        }
        var actualMax = (relativeBuckets && relativeBuckets[summary.name]) || binMax;
        if (type.type === "heatmap" || type.type === "histogram") {
            var mappedBars = SvgHelper_1.groupBarMark({
                bins: bins,
                binMax: binMax,
                relativeBuckets: relativeBuckets,
                columnWidth: columnWidth,
                projection: projection,
                adjustedSize: adjustedSize,
                summaryI: summaryI,
                summary: summary,
                renderValue: renderValue,
                summaryStyle: calculatedSummaryStyle,
                type: type,
                baseMarkProps: baseMarkProps
            });
            var tiles = mappedBars.marks;
            if (projection === "radial") {
                translate = [0, 0];
            }
            if (type.axis && type.type === "histogram") {
                renderedSummaryMarks.push(createSummaryAxis({
                    summary: summary,
                    summaryI: summaryI,
                    axisSettings: type.axis,
                    axisCreator: axisCreator,
                    projection: projection,
                    actualMax: actualMax,
                    adjustedSize: adjustedSize,
                    columnWidth: columnWidth
                }));
            }
            mappedBars.points.forEach(function (d) {
                d.x += translate[0];
                d.y += translate[1];
            });
            summaryXYCoords.push.apply(summaryXYCoords, __spread(mappedBars.points));
            renderedSummaryMarks.push(React.createElement("g", __assign({}, eventListeners, { transform: "translate(" + translate + ")", key: "summaryPiece-" + summaryI, role: "img", tabIndex: -1, "data-o": summary.name, "aria-label": summary.name + " " + type.type }), tiles));
        }
        else if (type.type === "violin") {
            var subsets = type.subsets || [false];
            bins[0].y = bins[0].y - bucketSize / 2;
            bins[bins.length - 1].y = bins[bins.length - 1].y + bucketSize / 2;
            subsets.forEach(function (subsettingFn, subsettingIndex) {
                var actualBins = bins;
                if (subsettingFn) {
                    calculatedSummaryStyle = thisSummaryData[0]
                        ? styleFn(thisSummaryData[0].piece.data, summaryI, subsettingIndex)
                        : {};
                    calculatedSummaryClass = thisSummaryData[0]
                        ? classFn(thisSummaryData[0].piece.data, summaryI, subsettingIndex)
                        : "";
                    actualBins = bins.map(function (d) {
                        var actualPieces = d.pieces.filter(function (p, pi) { return subsettingFn(p.piece, pi); }).map(function (d) { return d; });
                        var actualValue = summaryValueAccessor(actualPieces);
                        return (__assign(__assign({}, d), { pieces: actualPieces, value: actualValue }));
                    });
                }
                var violinArea = d3_shape_1.area().curve(type.curve || d3_shape_1.curveCatmullRom);
                var violinPoints = [];
                if (projection === "horizontal") {
                    actualBins.forEach(function (summaryPoint) {
                        var xValue = summaryPoint.y - bucketSize / 2;
                        var yValue = ((summaryPoint.value / actualMax) * columnWidth) / 2;
                        violinPoints.push({
                            x: xValue,
                            y0: -yValue,
                            y1: yValue
                        });
                        summaryXYCoords.push({
                            key: summary.name,
                            x: xValue + translate[0],
                            y: yValue + translate[1],
                            pieces: summaryPoint.pieces.map(function (d) { return d.piece; }),
                            value: summaryPoint.value
                        });
                    });
                    violinArea
                        .x(function (d) { return d.x; })
                        .y0(function (d) { return d.y0; })
                        .y1(function (d) { return d.y1; })
                        .defined(function (d, i) {
                        return d.y0 !== 0 ||
                            ((violinPoints[i - 1] && violinPoints[i - 1].y0 !== 0) ||
                                (violinPoints[i + 1] && violinPoints[i + 1].y0 !== 0));
                    });
                }
                else if (projection === "vertical") {
                    actualBins.forEach(function (summaryPoint) {
                        var yValue = summaryPoint.y + bucketSize / 2;
                        var xValue = ((summaryPoint.value / actualMax) * columnWidth) / 2;
                        violinPoints.push({
                            y: yValue,
                            x0: -xValue,
                            x1: xValue
                        });
                        summaryXYCoords.push({
                            key: summary.name,
                            x: xValue + translate[0],
                            y: yValue + translate[1],
                            pieces: summaryPoint.pieces.map(function (d) { return d.piece; }),
                            value: summaryPoint.value
                        });
                    });
                    violinArea
                        .y(function (d) { return d.y; })
                        .x0(function (d) { return d.x0; })
                        .x1(function (d) { return d.x1; })
                        .defined(function (d, i) {
                        return d.x0 !== 0 ||
                            ((violinPoints[i - 1] && violinPoints[i - 1].x0 !== 0) ||
                                (violinPoints[i + 1] && violinPoints[i + 1].x0 !== 0));
                    });
                }
                else if (projection === "radial") {
                    var angle_1 = summary.pct - summary.pct_padding / 2;
                    var midAngle_1 = summary.pct_middle;
                    violinPoints = actualBins;
                    violinArea = function (inbins) {
                        var forward = [];
                        var backward = [];
                        inbins.forEach(function (bin) {
                            var outsidePoint = pieceDrawing_1.pointOnArcAtAngle([0, 0], midAngle_1 + (angle_1 * bin.value) / actualMax / 2, (bin.y + bin.y1 - bucketSize / 2) / 2);
                            var insidePoint = pieceDrawing_1.pointOnArcAtAngle([0, 0], midAngle_1 - (angle_1 * bin.value) / actualMax / 2, (bin.y + bin.y1 - bucketSize / 2) / 2);
                            //Ugh a terrible side effect has appeared
                            summaryXYCoords.push({
                                key: summary.name,
                                x: insidePoint[0] + translate[0],
                                y: insidePoint[1] + translate[1],
                                pieces: bin.pieces.map(function (d) { return d.piece; }),
                                value: bin.value
                            });
                            summaryXYCoords.push({
                                key: summary.name,
                                x: outsidePoint[0] + translate[0],
                                y: outsidePoint[1] + translate[1],
                                pieces: bin.pieces.map(function (d) { return d.piece; }),
                                value: bin.value
                            });
                            forward.push(outsidePoint);
                            backward.push(insidePoint);
                        });
                        return "M" + forward.map(function (d) { return d.join(","); }).join("L") + "L" + backward
                            .reverse()
                            .map(function (d) { return d.join(","); })
                            .join("L") + "Z";
                    };
                }
                renderedSummaryMarks.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { transform: "translate(" + translate + ")", key: "summaryPiece-" + summaryI + "-" + subsettingIndex }, eventListeners, { renderMode: renderValue, markType: "path", className: calculatedSummaryClass, style: calculatedSummaryStyle, d: violinArea(violinPoints), role: "img", tabIndex: -1, "data-o": summary.name, "aria-label": summary.name + " distribution" })));
            });
        }
        else if (type.type === "ridgeline") {
            var zeroedStart = Object.assign({}, bins[0], { value: 0 });
            var zeroedEnd = Object.assign({}, bins[bins.length - 1], { value: 0 });
            //Ridgeline plots need to visually signify the zero baseline with their start and end position
            zeroedStart.y = zeroedStart.y - bucketSize / 2;
            zeroedEnd.y = zeroedEnd.y + bucketSize / 2;
            var joyBins_1 = __spread([zeroedStart], bins, [zeroedEnd]);
            var joyPoints_1 = [];
            var interpolatorSetting = type.curve || type.interpolator;
            var actualInterpolator = typeof interpolatorSetting === "string"
                ? general_1.curveHash[interpolatorSetting]
                : interpolatorSetting;
            var joyArea = d3_shape_1.line()
                .curve(actualInterpolator || d3_shape_1.curveCatmullRom)
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; });
            var joyHeight_1 = type.amplitude || 0;
            if (type.axis && type.type === "histogram") {
                renderedSummaryMarks.push(createSummaryAxis({
                    summary: summary,
                    summaryI: summaryI,
                    axisSettings: __assign({ baseline: false }, type.axis),
                    axisCreator: axisCreator,
                    projection: projection,
                    actualMax: actualMax,
                    adjustedSize: adjustedSize,
                    columnWidth: columnWidth
                }));
            }
            if (projection === "horizontal") {
                joyBins_1.forEach(function (summaryPoint, i) {
                    var xValue = summaryPoint.y - bucketSize / 2;
                    var yValue = type.flip
                        ? (summaryPoint.value / actualMax) * (columnWidth + joyHeight_1) -
                            columnWidth / 2
                        : (-summaryPoint.value / actualMax) * (columnWidth + joyHeight_1) +
                            columnWidth / 2;
                    joyPoints_1.push({
                        y: yValue,
                        x: xValue
                    });
                    //Don't make an interaction point for the first or last
                    if (i !== 0 && i !== joyBins_1.length - 1) {
                        summaryXYCoords.push({
                            key: summary.name,
                            x: xValue + translate[0],
                            y: yValue + translate[1],
                            pieces: summaryPoint.pieces.map(function (d) { return d.piece; }),
                            value: summaryPoint.value
                        });
                    }
                });
            }
            else if (projection === "vertical") {
                joyBins_1.forEach(function (summaryPoint) {
                    var yValue = summaryPoint.y + bucketSize / 2;
                    var xValue = type.flip === true
                        ? (summaryPoint.value / actualMax) * (columnWidth + joyHeight_1) -
                            columnWidth / 2
                        : (-summaryPoint.value / actualMax) * (columnWidth + joyHeight_1) +
                            columnWidth / 2;
                    joyPoints_1.push({
                        y: yValue,
                        x: xValue
                    });
                    summaryXYCoords.push({
                        key: summary.name,
                        x: xValue + translate[0],
                        y: yValue + translate[1],
                        pieces: summaryPoint.pieces.map(function (d) { return d.piece; }),
                        value: summaryPoint.value
                    });
                });
            }
            else if (projection === "radial") {
                var angle_2 = summary.pct - summary.pct_padding / 2;
                var midAngle_2 = summary.pct_start + summary.pct_padding / 2;
                translate = [0, 0];
                joyPoints_1 = joyBins_1;
                joyArea = function (inbins) {
                    var forward = [];
                    inbins.forEach(function (bin) {
                        var outsidePoint = pieceDrawing_1.pointOnArcAtAngle([adjustedSize[0] / 2, adjustedSize[1] / 2], midAngle_2 + (angle_2 * bin.value) / actualMax, (bin.y + bin.y1 - bucketSize / 2) / 2);
                        //Ugh a terrible side effect has appeared
                        summaryXYCoords.push({
                            key: summary.name,
                            x: outsidePoint[0] + translate[0],
                            y: outsidePoint[1] + translate[1],
                            pieces: bin.pieces.map(function (d) { return d.piece; }),
                            value: bin.value
                        });
                        forward.push(outsidePoint);
                    });
                    return "M" + forward.map(function (d) { return d.join(","); }).join("L") + "Z";
                };
            }
            if (type.axis) {
                renderedSummaryMarks.push(createSummaryAxis({
                    summary: summary,
                    summaryI: summaryI,
                    axisSettings: type.axis,
                    axisCreator: axisCreator,
                    projection: projection,
                    actualMax: actualMax,
                    adjustedSize: adjustedSize,
                    columnWidth: columnWidth
                }));
            }
            renderedSummaryMarks.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { transform: "translate(" + translate + ")", key: "summaryPiece-" + summaryI }, eventListeners, { renderMode: renderValue, markType: "path", className: calculatedSummaryClass, style: calculatedSummaryStyle, d: joyArea(joyPoints_1), role: "img", tabIndex: -1, "data-o": summary.name, "aria-label": summary.name + " distribution" })));
        }
        else if (type.type === "horizon") {
            var zeroedStart = Object.assign({}, bins[0], { value: 0 });
            var zeroedEnd = Object.assign({}, bins[bins.length - 1], { value: 0 });
            zeroedStart.y = zeroedStart.y - bucketSize / 2;
            zeroedEnd.y = zeroedEnd.y + bucketSize / 2;
            var horizonBins_1 = __spread([zeroedStart], bins, [zeroedEnd]);
            var horizonStyle_1 = type.elementStyleFn || (function () { return ({}); });
            var multiBins = [];
            var remainingPieces = true;
            var currentHorizon_1 = 0;
            while (remainingPieces === true) {
                var currentStrip = horizonBins_1.map(function (d) { return (__assign(__assign({}, d), { value: Math.max(0, Math.min(d.value - currentHorizon_1, horizon)) })); });
                multiBins.push(currentStrip.map(function (d) { return (__assign(__assign({}, d), { value: d.value * numHorizons })); }));
                currentHorizon_1 += horizon;
                if (d3_array_2.max(currentStrip.map(function (d) { return d.value; })) < horizon) {
                    remainingPieces = false;
                }
            }
            multiBins = multiBins.filter(function (d) { return d3_array_3.sum(d.map(function (p) { return p.value; })) > 0; });
            horizonBins_1.forEach(function (summaryPoint, i) {
                if (i !== 0 && i !== horizonBins_1.length - 1) {
                    if (projection === "horizontal") {
                        var xValue = summaryPoint.y - bucketSize / 2;
                        var yValue = (-summaryPoint.value / actualMax) * (columnWidth) +
                            columnWidth / 2;
                        summaryXYCoords.push({
                            key: summary.name,
                            x: xValue + translate[0],
                            y: yValue + translate[1],
                            pieces: summaryPoint.pieces.map(function (d) { return d.piece; }),
                            value: summaryPoint.value
                        });
                    }
                    else if (projection === "vertical") {
                        var yValue = summaryPoint.y + bucketSize / 2;
                        var xValue = type.flip === true
                            ? (summaryPoint.value / actualMax) * (columnWidth) -
                                columnWidth / 2
                            : (-summaryPoint.value / actualMax) * (columnWidth) +
                                columnWidth / 2;
                        summaryXYCoords.push({
                            key: summary.name,
                            x: xValue + translate[0],
                            y: yValue + translate[1],
                            pieces: summaryPoint.pieces.map(function (d) { return d.piece; }),
                            value: summaryPoint.value
                        });
                    }
                }
            });
            var multiBinMarks = multiBins.map(function (multiBin, multiBinI) {
                var horizonPoints = [];
                var interpolatorSetting = type.curve || type.interpolator;
                var actualInterpolator = typeof interpolatorSetting === "string"
                    ? general_1.curveHash[interpolatorSetting]
                    : interpolatorSetting;
                var horizonArea = d3_shape_1.line()
                    .curve(actualInterpolator || d3_shape_1.curveLinear)
                    .x(function (d) { return d.x; })
                    .y(function (d) { return d.y; });
                if (projection === "horizontal") {
                    multiBin.forEach(function (summaryPoint) {
                        var xValue = summaryPoint.y - bucketSize / 2;
                        var yValue = (-summaryPoint.value / actualMax) * (columnWidth) +
                            columnWidth / 2;
                        horizonPoints.push({
                            y: yValue,
                            x: xValue
                        });
                        //Don't make an interaction point for the first or last
                    });
                }
                else if (projection === "vertical") {
                    multiBin.forEach(function (summaryPoint) {
                        var yValue = summaryPoint.y + bucketSize / 2;
                        var xValue = type.flip === true
                            ? (summaryPoint.value / actualMax) * (columnWidth) -
                                columnWidth / 2
                            : (-summaryPoint.value / actualMax) * (columnWidth) +
                                columnWidth / 2;
                        horizonPoints.push({
                            y: yValue,
                            x: xValue
                        });
                    });
                }
                else if (projection === "radial") {
                    var angle_3 = summary.pct - summary.pct_padding / 2;
                    var midAngle_3 = summary.pct_start + summary.pct_padding / 2;
                    translate = [0, 0];
                    horizonPoints = multiBin;
                    horizonArea = function (inbins) {
                        var forward = [];
                        inbins.forEach(function (bin) {
                            var outsidePoint = pieceDrawing_1.pointOnArcAtAngle([adjustedSize[0] / 2, adjustedSize[1] / 2], midAngle_3 + (angle_3 * bin.value) / actualMax, (bin.y + bin.y1 - bucketSize / 2) / 2);
                            forward.push(outsidePoint);
                        });
                        return "M" + forward.map(function (d) { return d.join(","); }).join("L") + "Z";
                    };
                }
                return React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { transform: "translate(" + translate + ")", key: "summaryPiece-" + summaryI + "-" + multiBinI }, eventListeners, { renderMode: renderValue, markType: "path", className: calculatedSummaryClass, style: __assign(__assign({}, calculatedSummaryStyle), horizonStyle_1(multiBin, multiBinI)), d: horizonArea(horizonPoints), role: "img", tabIndex: -1, "data-o": summary.name, "aria-label": summary.name + " distribution" }));
            });
            if (type.axis) {
                renderedSummaryMarks.push(createSummaryAxis({
                    summary: summary,
                    summaryI: summaryI,
                    axisSettings: type.axis,
                    axisCreator: axisCreator,
                    projection: projection,
                    actualMax: actualMax,
                    adjustedSize: adjustedSize,
                    columnWidth: columnWidth
                }));
            }
            renderedSummaryMarks.push(React.createElement("g", null, multiBinMarks));
        }
    });
    return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords };
}
exports.bucketizedRenderingFn = bucketizedRenderingFn;
exports.drawSummaries = function (_a) {
    var data = _a.data, type = _a.type, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, classFn = _a.classFn, projection = _a.projection, adjustedSize = _a.adjustedSize, margin = _a.margin, baseMarkProps = _a.baseMarkProps;
    if (!type || !type.type)
        return;
    type = typeof type === "string" ? { type: type } : type;
    var chartSize = projection === "vertical" ? adjustedSize[1] : adjustedSize[0];
    return frameFunctions_1.orFrameSummaryRenderer({
        data: data,
        type: type,
        renderMode: renderMode,
        eventListenersGenerator: eventListenersGenerator,
        styleFn: styleFn,
        classFn: classFn,
        projection: projection,
        adjustedSize: adjustedSize,
        chartSize: chartSize,
        margin: margin,
        baseMarkProps: baseMarkProps
    });
};
exports.renderLaidOutSummaries = function (_a) {
    var data = _a.data;
    return data;
};
//# sourceMappingURL=summaryLayouts.js.map