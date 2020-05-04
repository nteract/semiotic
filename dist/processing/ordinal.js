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
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var d3_collection_1 = require("d3-collection");
var d3_array_1 = require("d3-array");
var d3_shape_1 = require("d3-shape");
var frameFunctions_1 = require("../svg/frameFunctions");
var pieceDrawing_1 = require("../svg/pieceDrawing");
var summaryLayouts_1 = require("../svg/summaryLayouts");
var pieceLayouts_1 = require("../svg/pieceLayouts");
var dataFunctions_1 = require("../data/dataFunctions");
var functions_1 = require("../generic_utilities/functions");
var d3_scale_1 = require("d3-scale");
var layoutHash = {
    clusterbar: pieceLayouts_1.clusterBarLayout,
    bar: pieceLayouts_1.barLayout,
    point: pieceLayouts_1.pointLayout,
    swarm: pieceLayouts_1.swarmLayout,
    timeline: pieceLayouts_1.timelineLayout
};
var midMod = function (d) { return (d.middle ? d.middle : 0); };
var zeroFunction = functions_1.genericFunction(0);
var twoPI = Math.PI * 2;
var naturalLanguageTypes = {
    bar: { items: "bar", chart: "bar chart" },
    clusterbar: { items: "bar", chart: "grouped bar chart" },
    swarm: { items: "point", chart: "swarm plot" },
    point: { items: "point", chart: "point plot" },
    timeline: { items: "bar", chart: "timeline" }
};
exports.calculateMappedMiddles = function (oScale, middleMax, padding) {
    var oScaleDomainValues = oScale.domain();
    var mappedMiddles = {};
    oScaleDomainValues.forEach(function (p, q) {
        var base = oScale(p) - padding;
        var next = oScaleDomainValues[q + 1]
            ? oScale(oScaleDomainValues[q + 1])
            : middleMax;
        var diff = (next - base) / 2;
        mappedMiddles[p] = base + diff;
    });
    return mappedMiddles;
};
exports.calculateOrdinalFrame = function (currentProps, currentState) {
    var oLabels;
    var projectedColumns = {};
    var _a = currentProps.oPadding, padding = _a === void 0 ? 0 : _a, baseSummaryType = currentProps.summaryType, baseType = currentProps.type, baseConnectorType = currentProps.connectorType, baseOAccessor = currentProps.oAccessor, baseRAccessor = currentProps.rAccessor, baseConnectorStyle = currentProps.connectorStyle, baseStyle = currentProps.style, baseRExtent = currentProps.rExtent, oSort = currentProps.oSort, basePieceClass = currentProps.pieceClass, baseSummaryStyle = currentProps.summaryStyle, baseSummaryClass = currentProps.summaryClass, dynamicColumnWidth = currentProps.dynamicColumnWidth, projection = currentProps.projection, customHoverBehavior = currentProps.customHoverBehavior, customClickBehavior = currentProps.customClickBehavior, customDoubleClickBehavior = currentProps.customDoubleClickBehavior, size = currentProps.size, pixelColumnWidth = currentProps.pixelColumnWidth, baseTitle = currentProps.title, oLabel = currentProps.oLabel, hoverAnnotation = currentProps.hoverAnnotation, pieceHoverAnnotation = currentProps.pieceHoverAnnotation, summaryHoverAnnotation = currentProps.summaryHoverAnnotation, backgroundGraphics = currentProps.backgroundGraphics, foregroundGraphics = currentProps.foregroundGraphics, oScaleType = currentProps.oScaleType, rScaleType = currentProps.rScaleType, legend = currentProps.legend, baseRenderKey = currentProps.renderKey, data = currentProps.data, baseMargin = currentProps.margin, baseOExtent = currentProps.oExtent, baseAxes = currentProps.axes, basePieceIDAccessor = currentProps.pieceIDAccessor, multiAxis = currentProps.multiAxis, _b = currentProps.baseMarkProps, baseMarkProps = _b === void 0 ? {} : _b, annotations = currentProps.annotations, sketchyRenderingEngine = currentProps.sketchyRenderingEngine;
    var summaryType = frameFunctions_1.objectifyType(baseSummaryType);
    var pieceType = frameFunctions_1.objectifyType(baseType);
    var connectorType = frameFunctions_1.objectifyType(baseConnectorType);
    var oAccessor = dataFunctions_1.stringToArrayFn(baseOAccessor, function (d) { return d.renderKey; });
    var rAccessor = dataFunctions_1.stringToArrayFn(baseRAccessor, function (d) { return d.value || 1; });
    var renderKey = dataFunctions_1.stringToFn(baseRenderKey, function (d, i) { return i; });
    var eventListenersGenerator = function () { return ({}); };
    var connectorStyle = dataFunctions_1.stringToFn(baseConnectorStyle, function () { return ({}); }, true);
    var summaryStyle = dataFunctions_1.stringToFn(baseSummaryStyle, function () { return ({}); }, true);
    var pieceStyle = dataFunctions_1.stringToFn(baseStyle, function () { return ({}); }, true);
    var pieceClass = dataFunctions_1.stringToFn(basePieceClass, function () { return ""; }, true);
    var summaryClass = dataFunctions_1.stringToFn(baseSummaryClass, function () { return ""; }, true);
    var title = typeof baseTitle === "object" &&
        !React.isValidElement(baseTitle) &&
        baseTitle !== null
        ? baseTitle
        : { title: baseTitle, orient: "top" };
    var pieceIDAccessor = dataFunctions_1.stringToFn(basePieceIDAccessor, function () { return ""; });
    var originalRAccessor = Array.isArray(baseRAccessor)
        ? baseRAccessor
        : [baseRAccessor];
    var originalOAccessor = Array.isArray(baseOAccessor)
        ? baseOAccessor
        : [baseOAccessor];
    var _c = frameFunctions_1.keyAndObjectifyBarData({
        data: data,
        renderKey: renderKey,
        oAccessor: oAccessor,
        rAccessor: rAccessor,
        originalRAccessor: originalRAccessor,
        originalOAccessor: originalOAccessor,
        multiAxis: multiAxis
    }), allData = _c.allData, multiExtents = _c.multiExtents;
    var columnOverlays;
    var prevProps = currentState.props;
    var shouldRecalculateOverlay = currentProps.data !== prevProps.data
        || currentProps.size[0] !== prevProps.size[0]
        || currentProps.size[1] !== prevProps.size[1]
        || currentProps.margin !== prevProps.margin
        || (!currentState.columnOverlays || currentState.columnOverlays.length === 0);
    var arrayWrappedAxis;
    if (Array.isArray(baseAxes)) {
        arrayWrappedAxis = baseAxes.map(function (axisFnOrObject) {
            return typeof axisFnOrObject === "function"
                ? axisFnOrObject({ size: currentProps.size })
                : axisFnOrObject;
        });
    }
    else if (baseAxes) {
        arrayWrappedAxis = [baseAxes].map(function (axisFnOrObject) {
            return typeof axisFnOrObject === "function"
                ? axisFnOrObject({ size: currentProps.size })
                : axisFnOrObject;
        });
    }
    if (multiExtents && baseAxes) {
        arrayWrappedAxis.forEach(function (d, i) {
            d.extentOverride = multiExtents[i];
        });
    }
    var margin = frameFunctions_1.calculateMargin({
        margin: baseMargin,
        axes: arrayWrappedAxis,
        title: title,
        oLabel: oLabel,
        projection: projection,
        size: size
    });
    var _d = frameFunctions_1.adjustedPositionSize({
        size: size,
        margin: margin,
        projection: projection
    }), adjustedPosition = _d.adjustedPosition, adjustedSize = _d.adjustedSize;
    var oExtentSettings = baseOExtent === undefined || Array.isArray(baseOExtent)
        ? { extent: baseOExtent }
        : baseOExtent;
    var calculatedOExtent = allData.reduce(function (p, c) {
        var baseOValue = c.column;
        var oValue = baseOValue !== undefined ? String(baseOValue) : baseOValue;
        if (p.indexOf(oValue) === -1) {
            p.push(oValue);
        }
        return p;
    }, []);
    var oExtent = oExtentSettings.extent || calculatedOExtent;
    if (pieceType.type === "barpercent") {
        var oExtentSums_1 = oExtent
            .map(function (d) {
            return allData
                .filter(function (p) { return String(p.column) === d; })
                .reduce(function (p, c) { return p + c.value; }, 0);
        })
            .reduce(function (p, c, i) {
            p[oExtent[i]] = c;
            return p;
        }, {});
        allData.forEach(function (d) {
            d.value =
                (oExtentSums_1[d.column] && d.value / oExtentSums_1[d.column]) || 0;
        });
        pieceType.type = "bar";
    }
    if (pixelColumnWidth) {
        if (projection === "radial") {
            console.error("pixelColumnWidth is not honored in radial mode");
        }
        else if (projection === "vertical") {
            adjustedSize[0] = oExtent.length * pixelColumnWidth;
        }
        else {
            adjustedSize[1] = oExtent.length * pixelColumnWidth;
        }
    }
    var oDomain = (projection === "vertical" && [0, adjustedSize[0]]) || [
        0,
        adjustedSize[1]
    ];
    var cwHash = oExtent.reduce(function (p, c) {
        p[c] = (1 / oExtent.length) * oDomain[1];
        p.total += p[c];
        return p;
    }, { total: 0 });
    var castOScaleType = oScaleType;
    var oScale = dynamicColumnWidth ? d3_scale_1.scaleOrdinal() : castOScaleType();
    oScale.domain(oExtent);
    var maxColumnValues;
    if (dynamicColumnWidth) {
        var columnValueCreator_1;
        if (typeof dynamicColumnWidth === "string") {
            columnValueCreator_1 = function (d) { return d3_array_1.sum(d.map(function (p) { return p.data[dynamicColumnWidth]; })); };
        }
        else {
            columnValueCreator_1 = function (d) { return dynamicColumnWidth(d.map(function (p) { return p.data; })); };
        }
        var thresholdDomain_1 = [0];
        maxColumnValues = 0;
        var columnValues_1 = [];
        oExtent.forEach(function (d) {
            var oValues = allData.filter(function (p) { return p.column === d; });
            var columnValue = columnValueCreator_1(oValues);
            columnValues_1.push(columnValue);
            maxColumnValues += columnValue;
        });
        cwHash.total = 0;
        oExtent.forEach(function (d, i) {
            var oValue = columnValues_1[i];
            var stepValue = (oValue / maxColumnValues) * (oDomain[1] - oDomain[0]);
            cwHash[d] = stepValue;
            cwHash.total += stepValue;
            if (i !== oExtent.length - 1) {
                thresholdDomain_1.push(stepValue + thresholdDomain_1[i]);
            }
        });
        oScale.range(thresholdDomain_1);
    }
    else {
        oScale.range(oDomain);
    }
    var rExtentSettings = baseRExtent === undefined || Array.isArray(baseRExtent)
        ? { extent: baseRExtent, onChange: undefined, includeAnnotations: false }
        : baseRExtent;
    var rExtent = rExtentSettings.extent;
    var subZeroRExtent = [0, 0];
    if (pieceType.type === "bar" &&
        summaryType.type &&
        summaryType.type !== "none") {
        pieceType.type = "none";
    }
    var annotationsForExtent = [];
    if (rExtentSettings.includeAnnotations && annotations) {
        rAccessor.forEach(function (actualRAccessor) {
            annotations.forEach(function (annotation, annotationIndex) {
                var r = actualRAccessor(annotation, annotationIndex);
                if (isFinite(r)) {
                    annotationsForExtent.push(r);
                }
            });
        });
    }
    if (pieceType.type === "timeline") {
        var rData = allData.map(function (d) { return d.value; });
        var leftExtent = d3_array_1.extent(rData.map(function (d) { return d[0]; }));
        var rightExtent = d3_array_1.extent(rData.map(function (d) { return d[1]; }));
        rExtent = d3_array_1.extent(__spread(leftExtent, rightExtent, annotationsForExtent));
    }
    else if (pieceType.type !== "bar") {
        rExtent = d3_array_1.extent(__spread(allData.map(function (d) { return d.value; }), annotationsForExtent));
    }
    else {
        var positiveData = allData.filter(function (d) { return d.value >= 0; });
        var negativeData = allData.filter(function (d) { return d.value < 0; });
        var nestedPositiveData = d3_collection_1.nest()
            .key(function (d) { return d.column; })
            .rollup(function (leaves) { return d3_array_1.sum(leaves.map(function (d) { return d.value; })); })
            .entries(positiveData);
        var nestedNegativeData = d3_collection_1.nest()
            .key(function (d) { return d.column; })
            .rollup(function (leaves) { return d3_array_1.sum(leaves.map(function (d) { return d.value; })); })
            .entries(negativeData);
        var positiveAnnotations = annotationsForExtent.filter(function (d) { return d > 0; });
        rExtent = [
            0,
            nestedPositiveData.length === 0 && positiveAnnotations.length === 0
                ? 0
                : Math.max(d3_array_1.max(__spread(nestedPositiveData.map(function (d) { return d.value; }), positiveAnnotations)), 0)
        ];
        var negativeAnnotations = annotationsForExtent.filter(function (d) { return d < 0; });
        subZeroRExtent = [
            0,
            nestedNegativeData.length === 0
                ? 0
                : Math.min(d3_array_1.min(__spread(nestedNegativeData.map(function (d) { return d.value; }), negativeAnnotations)), 0)
        ];
        rExtent = [subZeroRExtent[1], rExtent[1]];
    }
    if ((pieceType.type === "clusterbar" || multiAxis) && rExtent[0] > 0) {
        rExtent[0] = 0;
    }
    var calculatedRExtent = rExtent;
    if (rExtentSettings.extent &&
        rExtentSettings.extent[0] !== undefined &&
        rExtentSettings.extent[1] !== undefined) {
        rExtent = rExtentSettings.extent;
    }
    else {
        if (rExtentSettings.extent &&
            rExtentSettings.extent[1] !== undefined &&
            rExtentSettings.extent[0] === undefined) {
            rExtent[1] = rExtentSettings.extent[1];
        }
        if (rExtentSettings.extent &&
            rExtentSettings.extent[0] !== undefined &&
            rExtentSettings.extent[1] === undefined) {
            rExtent[0] = rExtentSettings.extent[0];
        }
    }
    if (currentProps.invertR ||
        (rExtentSettings.extent &&
            rExtentSettings.extent[0] > rExtentSettings.extent[1])) {
        rExtent = [rExtent[1], rExtent[0]];
    }
    var nestedPieces = {};
    d3_collection_1.nest()
        .key(function (d) { return d.column; })
        .entries(allData)
        .forEach(function (d) {
        nestedPieces[d.key] = d.values;
    });
    if (oSort !== undefined) {
        oExtent = oExtent.sort(function (a, b) {
            return oSort(a, b, nestedPieces[a].map(function (d) { return d.data; }), nestedPieces[b].map(function (d) { return d.data; }));
        });
        oScale.domain(oExtent);
    }
    var rDomain = (projection === "vertical" && [0, adjustedSize[1]]) || [
        0,
        adjustedSize[0]
    ];
    var castRScaleType = rScaleType;
    var instantiatedRScaleType = rScaleType.domain
        ? rScaleType
        : castRScaleType();
    var zeroCheck = instantiatedRScaleType(0);
    if (rExtentSettings.extent &&
        rExtentSettings.extent[0] !== undefined && (isNaN(zeroCheck) || zeroCheck === -Infinity || zeroCheck === Infinity)) {
        rExtent[0] = rExtentSettings.extent[0];
    }
    var rScale = instantiatedRScaleType
        .copy()
        .domain(rExtent)
        .range(rDomain);
    var rScaleReverse = d3_scale_1.scaleLinear()
        .domain(rDomain)
        .range(rDomain.reverse());
    var rScaleVertical = instantiatedRScaleType
        .copy()
        .domain(rExtent)
        .range(rDomain);
    var columnWidth = cwHash ? 0 : oScale.bandwidth();
    var pieceData = [];
    var mappedMiddleSize = adjustedSize[1];
    if (projection === "vertical") {
        mappedMiddleSize = adjustedSize[0];
    }
    var mappedMiddles = exports.calculateMappedMiddles(oScale, mappedMiddleSize, padding);
    pieceData = oExtent.map(function (d) { return (nestedPieces[d] ? nestedPieces[d] : []); });
    var zeroValue = projection === "vertical" ? rScaleReverse(rScale(0)) : rScale(0);
    if ((isNaN(zeroValue) || zeroValue === -Infinity || zeroValue === Infinity) && rExtentSettings.extent &&
        rExtentSettings.extent[0] !== undefined && (zeroCheck === -Infinity || zeroCheck === Infinity)) {
        zeroValue = projection === "vertical" ? rScaleReverse(rScale(rExtentSettings.extent[0])) : rScale(rExtentSettings.extent[0]);
    }
    oExtent.forEach(function (o, i) {
        projectedColumns[o] = {
            name: o,
            padding: padding,
            pieceData: pieceData[i],
            pieces: pieceData[i]
        };
        projectedColumns[o].x = oScale(o) + padding / 2;
        projectedColumns[o].y = 0;
        projectedColumns[o].middle = mappedMiddles[o] + padding / 2;
        var negativeOffset = zeroValue;
        var positiveOffset = zeroValue;
        var negativeBaseValue = 0;
        var positiveBaseValue = 0;
        projectedColumns[o].pieceData.forEach(function (piece) {
            var valPosition;
            if (pieceType.type === "timeline") {
                piece.scaledValue = rScale(piece.value[0]);
                piece.scaledEndValue = rScale(piece.value[1]);
                piece.scaledVerticalValue = rScaleVertical(piece.value[0]);
            }
            else if (pieceType.type !== "bar" &&
                pieceType.type !== "clusterbar") {
                piece.scaledValue = rScale(piece.value);
                piece.scaledVerticalValue = rScaleVertical(piece.value);
            }
            else if (pieceType.type === "clusterbar") {
                valPosition =
                    projection === "vertical"
                        ? rScaleReverse(rScale(piece.value))
                        : rScale(piece.value);
                piece.scaledValue = Math.abs(zeroValue - valPosition);
            }
            piece.x = projectedColumns[o].x;
            if (piece.value >= 0) {
                if (pieceType.type === "bar") {
                    piece.scaledValue =
                        projection === "vertical"
                            ? positiveOffset -
                                rScaleReverse(rScale(positiveBaseValue + piece.value))
                            : rScale(positiveBaseValue + piece.value) - positiveOffset;
                    positiveBaseValue += piece.value;
                }
                piece.base = zeroValue;
                piece.bottom = pieceType.type === "bar" ? positiveOffset : 0;
                piece.middle = piece.scaledValue / 2 + positiveOffset;
                positiveOffset =
                    projection === "vertical"
                        ? positiveOffset - piece.scaledValue
                        : positiveOffset + piece.scaledValue;
                piece.negative = false;
            }
            else {
                if (pieceType.type === "bar") {
                    piece.scaledValue =
                        projection === "vertical"
                            ? Math.abs(rScale(piece.value) - rScale(0))
                            : Math.abs(rScale(piece.value) - zeroValue);
                    negativeBaseValue += piece.value;
                }
                piece.base = zeroValue;
                piece.bottom = pieceType.type === "bar" ? negativeOffset : 0;
                piece.middle = negativeOffset - piece.scaledValue / 2;
                negativeOffset =
                    projection === "vertical"
                        ? negativeOffset + piece.scaledValue
                        : negativeOffset - piece.scaledValue;
                piece.negative = true;
            }
        });
        if (cwHash) {
            projectedColumns[o].width = cwHash[o] - padding;
            if (currentProps.ordinalAlign === "center") {
                if (i === 0) {
                    projectedColumns[o].x =
                        projectedColumns[o].x - projectedColumns[o].width / 2;
                    projectedColumns[o].middle =
                        projectedColumns[o].middle - projectedColumns[o].width / 2;
                }
                else {
                    projectedColumns[o].x =
                        projectedColumns[oExtent[i - 1]].x +
                            projectedColumns[oExtent[i - 1]].width;
                    projectedColumns[o].middle =
                        projectedColumns[o].x + projectedColumns[o].width / 2;
                }
            }
            projectedColumns[o].pct = cwHash[o] / cwHash.total;
            projectedColumns[o].pct_start =
                (projectedColumns[o].x - oDomain[0]) / cwHash.total;
            projectedColumns[o].pct_padding = padding / cwHash.total;
            projectedColumns[o].pct_middle =
                (projectedColumns[o].middle - oDomain[0]) / cwHash.total;
        }
        else {
            projectedColumns[o].width = columnWidth - padding;
            if (currentProps.ordinalAlign === "center") {
                projectedColumns[o].x =
                    projectedColumns[o].x - projectedColumns[o].width / 2;
                projectedColumns[o].middle =
                    projectedColumns[o].middle - projectedColumns[o].width / 2;
            }
            projectedColumns[o].pct = columnWidth / adjustedSize[1];
            projectedColumns[o].pct_start =
                (projectedColumns[o].x - oDomain[0]) / adjustedSize[1];
            projectedColumns[o].pct_padding = padding / adjustedSize[1];
            projectedColumns[o].pct_middle =
                (projectedColumns[o].middle - oDomain[0]) / adjustedSize[1];
        }
    });
    var labelArray = [];
    var pieArcs = [];
    var labelSettings = typeof oLabel === "object"
        ? Object.assign({ label: true, padding: 5 }, oLabel)
        : { orient: "default", label: oLabel, padding: 5 };
    if (oLabel || hoverAnnotation) {
        var offsetPct_1 = (pieceType.offsetAngle && pieceType.offsetAngle / 360) || 0;
        var rangePct = (pieceType.angleRange &&
            pieceType.angleRange.map(function (d) { return d / 360; })) || [0, 1];
        var rangeMod_1 = rangePct[1] - rangePct[0];
        var adjustedPct_1 = rangeMod_1 < 1
            ? d3_scale_1.scaleLinear()
                .domain([0, 1])
                .range(rangePct)
            : function (d) { return d; };
        oExtent.forEach(function (d) {
            var arcGenerator = d3_shape_1.arc()
                .innerRadius(0)
                .outerRadius(rScale.range()[1] / 2);
            var angle = projectedColumns[d].pct * rangeMod_1;
            var startAngle = adjustedPct_1(projectedColumns[d].pct_start + offsetPct_1);
            var endAngle = startAngle + angle;
            var midAngle = startAngle + angle / 2;
            var markD = arcGenerator({
                startAngle: startAngle * twoPI,
                endAngle: endAngle * twoPI
            });
            var translate = [adjustedSize[0] / 2, adjustedSize[1] / 2];
            var centroid = arcGenerator.centroid({
                startAngle: startAngle * twoPI,
                endAngle: endAngle * twoPI
            });
            var addedPadding = centroid[1] > 0 &&
                (!labelSettings.orient ||
                    labelSettings.orient === "default" ||
                    labelSettings.orient === "edge")
                ? 8
                : 0;
            var outerPoint = pieceDrawing_1.pointOnArcAtAngle([0, 0], midAngle, rScale.range()[1] / 2 + labelSettings.padding + addedPadding);
            pieArcs.push({
                startAngle: startAngle,
                endAngle: endAngle,
                midAngle: midAngle,
                markD: markD,
                translate: translate,
                centroid: centroid,
                outerPoint: outerPoint
            });
        });
    }
    if (currentProps.oLabel) {
        var labelingFn_1;
        if (labelSettings.label === true) {
            var labelStyle_1 = {
                textAnchor: "middle"
            };
            if (projection === "horizontal" && labelSettings.orient === "right") {
                labelStyle_1.textAnchor = "start";
            }
            else if (projection === "horizontal") {
                labelStyle_1.textAnchor = "end";
            }
            labelingFn_1 = function (d, p, i) {
                var additionalStyle = {};
                var transformRotate;
                if (projection === "radial" && labelSettings.orient === "stem") {
                    transformRotate = "rotate(" + (pieArcs[i].outerPoint[0] < 0
                        ? pieArcs[i].midAngle * 360 + 90
                        : pieArcs[i].midAngle * 360 - 90) + ")";
                }
                else if (projection === "radial" &&
                    labelSettings.orient !== "center") {
                    transformRotate = "rotate(" + (pieArcs[i].outerPoint[1] < 0
                        ? pieArcs[i].midAngle * 360
                        : pieArcs[i].midAngle * 360 + 180) + ")";
                }
                if (projection === "radial" &&
                    labelSettings.orient === "stem" &&
                    ((pieArcs[i].outerPoint[0] > 0 && labelSettings.padding < 0) ||
                        (pieArcs[i].outerPoint[0] < 0 && labelSettings.padding >= 0))) {
                    additionalStyle.textAnchor = "end";
                }
                else if (projection === "radial" &&
                    labelSettings.orient === "stem") {
                    additionalStyle.textAnchor = "start";
                }
                return (React.createElement("text", __assign({}, labelStyle_1, additionalStyle, { transform: transformRotate }), d));
            };
        }
        else if (typeof labelSettings.label === "function") {
            labelingFn_1 = labelSettings.label;
        }
        oExtent.forEach(function (d, i) {
            var xPosition = projectedColumns[d].middle;
            var yPosition = 0;
            if (projection === "horizontal") {
                yPosition = projectedColumns[d].middle;
                if (labelSettings.orient === "right") {
                    xPosition = adjustedSize[0] + 3;
                }
                else {
                    xPosition = -3;
                }
            }
            else if (projection === "radial") {
                if (labelSettings.orient === "center") {
                    xPosition = pieArcs[i].centroid[0] + pieArcs[i].translate[0];
                    yPosition = pieArcs[i].centroid[1] + pieArcs[i].translate[1];
                }
                else {
                    xPosition = pieArcs[i].outerPoint[0] + pieArcs[i].translate[0];
                    yPosition = pieArcs[i].outerPoint[1] + pieArcs[i].translate[1];
                }
            }
            var label = labelingFn_1(d, projectedColumns[d].pieceData.map(function (d) { return d.data; }), i
            //          ,{ arc: pieArcs[i], data: projectedColumns[d] }
            );
            labelArray.push(React.createElement("g", { key: "olabel-" + i, transform: "translate(" + xPosition + "," + yPosition + ")" }, label));
        });
        if (projection === "vertical") {
            var labelY = void 0;
            if (labelSettings.orient === "top") {
                labelY = -15;
            }
            else {
                labelY = 15 + rScale.range()[1];
            }
            oLabels = (React.createElement("g", { key: "ordinalframe-labels-container", className: "ordinal-labels", transform: "translate(0," + labelY + ")" }, labelArray));
        }
        else if (projection === "horizontal") {
            oLabels = (React.createElement("g", { key: "ordinalframe-labels-container", className: "ordinal-labels" }, labelArray));
        }
        else if (projection === "radial") {
            oLabels = (React.createElement("g", { key: "ordinalframe-labels-container", className: "ordinal-labels" }, labelArray));
        }
    }
    if (!currentProps.pieceHoverAnnotation && !currentProps.summaryHoverAnnotation && (currentProps.hoverAnnotation || currentProps.customClickBehavior || currentProps.customDoubleClickBehavior || currentProps.customHoverBehavior)) {
        if (shouldRecalculateOverlay) {
            columnOverlays = oExtent.map(function (d, i) {
                var barColumnWidth = projectedColumns[d].width;
                var xPosition = projectedColumns[d].x;
                var yPosition = 0;
                var height = rScale.range()[1];
                var width = barColumnWidth + padding;
                if (projection === "horizontal") {
                    yPosition = projectedColumns[d].x;
                    xPosition = 0;
                    width = rScale.range()[1];
                    height = barColumnWidth;
                }
                if (projection === "radial") {
                    var _a = pieArcs[i], markD = _a.markD, centroid = _a.centroid, translate = _a.translate, midAngle = _a.midAngle;
                    var radialMousePackage_1 = {
                        type: "column-hover",
                        column: projectedColumns[d],
                        pieces: projectedColumns[d].pieceData,
                        summary: projectedColumns[d].pieceData,
                        arcAngles: {
                            centroid: centroid,
                            translate: translate,
                            midAngle: midAngle,
                            length: rScale.range()[1] / 2
                        }
                    };
                    return {
                        markType: "path",
                        key: "hover" + d,
                        d: markD,
                        transform: "translate(" + translate.join(",") + ")",
                        style: { opacity: 0 },
                        overlayData: radialMousePackage_1,
                        onDoubleClick: customDoubleClickBehavior &&
                            (function () {
                                customDoubleClickBehavior(radialMousePackage_1);
                            }),
                        onClick: customClickBehavior &&
                            (function () {
                                customClickBehavior(radialMousePackage_1);
                            }),
                        onMouseEnter: customHoverBehavior &&
                            (function () {
                                customHoverBehavior(radialMousePackage_1);
                            }),
                        onMouseLeave: customHoverBehavior &&
                            (function () {
                                customHoverBehavior();
                            })
                    };
                }
                var baseMousePackage = {
                    type: "column-hover",
                    column: projectedColumns[d],
                    pieces: projectedColumns[d].pieceData,
                    summary: projectedColumns[d].pieceData
                };
                return {
                    markType: "rect",
                    key: "hover-" + d,
                    x: xPosition,
                    y: yPosition,
                    height: height,
                    width: width,
                    style: { opacity: 0 },
                    onDoubleClick: customDoubleClickBehavior &&
                        (function () {
                            customDoubleClickBehavior(baseMousePackage);
                        }),
                    onClick: customClickBehavior &&
                        (function () {
                            customClickBehavior(baseMousePackage);
                        }),
                    onMouseEnter: customHoverBehavior &&
                        (function () {
                            customHoverBehavior(baseMousePackage);
                        }),
                    onMouseLeave: function () { return ({}); },
                    overlayData: baseMousePackage
                };
            });
        }
        else {
            columnOverlays = currentState.columnOverlays;
        }
    }
    var renderMode = currentProps.renderMode, canvasSummaries = currentProps.canvasSummaries, summaryRenderMode = currentProps.summaryRenderMode, connectorClass = currentProps.connectorClass, connectorRenderMode = currentProps.connectorRenderMode, canvasConnectors = currentProps.canvasConnectors, canvasPieces = currentProps.canvasPieces;
    var pieceDataXY;
    var pieceRenderMode = dataFunctions_1.stringToFn(renderMode, undefined, true);
    var pieceCanvasRender = dataFunctions_1.stringToFn(canvasPieces, undefined, true);
    var summaryCanvasRender = dataFunctions_1.stringToFn(canvasSummaries, undefined, true);
    var connectorCanvasRender = dataFunctions_1.stringToFn(canvasConnectors, undefined, true);
    var pieceTypeForXY = pieceType.type && pieceType.type !== "none" ? pieceType.type : "point";
    var pieceTypeLayout = typeof pieceTypeForXY === "function"
        ? pieceTypeForXY
        : layoutHash[pieceTypeForXY];
    var calculatedPieceData = pieceTypeLayout({
        type: pieceType,
        data: projectedColumns,
        renderMode: pieceRenderMode,
        eventListenersGenerator: eventListenersGenerator,
        styleFn: pieceStyle,
        projection: projection,
        classFn: pieceClass,
        adjustedSize: adjustedSize,
        chartSize: size,
        margin: margin,
        rScale: rScale,
        baseMarkProps: __assign(__assign({}, baseMarkProps), { sketchyGenerator: sketchyRenderingEngine && sketchyRenderingEngine.generator }),
    });
    var keyedData = calculatedPieceData.reduce(function (p, c) {
        if (c.o) {
            if (!p[c.o]) {
                p[c.o] = [];
            }
            p[c.o].push(c);
        }
        return p;
    }, {});
    Object.keys(projectedColumns).forEach(function (d) {
        projectedColumns[d].xyData = keyedData[d] || [];
    });
    var calculatedSummaries = {};
    if (summaryType.type && summaryType.type !== "none") {
        calculatedSummaries = summaryLayouts_1.drawSummaries({
            data: projectedColumns,
            type: summaryType,
            renderMode: dataFunctions_1.stringToFn(summaryRenderMode, undefined, true),
            styleFn: dataFunctions_1.stringToFn(summaryStyle, function () { return ({}); }, true),
            classFn: dataFunctions_1.stringToFn(summaryClass, function () { return ""; }, true),
            //        canvasRender: stringToFn<boolean>(canvasSummaries, undefined, true),
            projection: projection,
            eventListenersGenerator: eventListenersGenerator,
            adjustedSize: adjustedSize,
            baseMarkProps: __assign(__assign({}, baseMarkProps), { sketchyGenerator: sketchyRenderingEngine && sketchyRenderingEngine.generator }),
            //        chartSize: size,
            margin: margin
        });
        calculatedSummaries.originalData = projectedColumns;
    }
    var yMod = projection === "horizontal" ? midMod : zeroFunction;
    var xMod = projection === "vertical" ? midMod : zeroFunction;
    var basePieceData = calculatedPieceData.map(function (d) {
        if (d.piece && d.xy) {
            return __assign(__assign({}, d.piece), { type: "frame-hover", x: d.xy.x + xMod(d.xy), y: d.xy.y + yMod(d.xy) });
        }
        return null;
    }).filter(function (d) { return d; });
    if ((pieceHoverAnnotation &&
        ["bar", "clusterbar", "timeline"].indexOf(pieceType.type) === -1) ||
        summaryHoverAnnotation) {
        if (summaryHoverAnnotation && calculatedSummaries.xyPoints) {
            pieceDataXY = calculatedSummaries.xyPoints.map(function (d) {
                return Object.assign({}, d, {
                    type: "frame-hover",
                    isSummaryData: true,
                    x: d.x,
                    y: d.y
                });
            });
        }
        else if (pieceHoverAnnotation && calculatedPieceData) {
            pieceDataXY = basePieceData;
        }
    }
    var _e = frameFunctions_1.orFrameAxisGenerator({
        axis: arrayWrappedAxis,
        data: allData,
        projection: projection,
        adjustedSize: adjustedSize,
        size: size,
        rScale: rScale,
        rScaleType: instantiatedRScaleType.copy(),
        pieceType: pieceType,
        rExtent: rExtent,
        maxColumnValues: maxColumnValues,
        xyData: basePieceData,
        margin: margin
    }), axis = _e.axis, axesTickLines = _e.axesTickLines;
    if (pieceHoverAnnotation &&
        ["bar", "clusterbar", "timeline"].indexOf(pieceType.type) !== -1) {
        var yMod_1 = projection === "horizontal" ? midMod : zeroFunction;
        var xMod_1 = projection === "vertical" ? midMod : zeroFunction;
        if (shouldRecalculateOverlay) {
            columnOverlays = calculatedPieceData.map(function (d, i) {
                var mousePackage = __assign(__assign({}, d.piece), { x: d.xy.x + xMod_1(d.xy), y: d.xy.y + yMod_1(d.xy) });
                if (React.isValidElement(d.renderElement)) {
                    return {
                        renderElement: d.renderElement,
                        overlayData: mousePackage
                    };
                }
                return __assign(__assign({}, d.renderElement), { key: "hover-" + i, type: "frame-hover", style: { opacity: 0 }, overlayData: mousePackage, onClick: customClickBehavior &&
                        (function () {
                            customClickBehavior(mousePackage.data);
                        }), onDoubleClick: customDoubleClickBehavior &&
                        (function () {
                            customDoubleClickBehavior(mousePackage.data);
                        }), onMouseEnter: customHoverBehavior &&
                        (function () {
                            customHoverBehavior(mousePackage.data);
                        }), onMouseLeave: customHoverBehavior &&
                        (function () {
                            customHoverBehavior();
                        }) });
            });
        }
        else {
            columnOverlays = currentState.columnOverlays;
        }
    }
    var typeAriaLabel = (pieceType.type !== undefined &&
        typeof pieceType.type !== "function" &&
        naturalLanguageTypes[pieceType.type]) || {
        items: "piece",
        chart: "ordinal chart"
    };
    var orFrameRender = {
        connectors: {
            accessibleTransform: function (data, i) { return data[i]; },
            projection: projection,
            data: keyedData,
            styleFn: dataFunctions_1.stringToFn(connectorStyle, function () { return ({}); }, true),
            classFn: dataFunctions_1.stringToFn(connectorClass, function () { return ""; }, true),
            renderMode: dataFunctions_1.stringToFn(connectorRenderMode, undefined, true),
            canvasRender: connectorCanvasRender,
            behavior: frameFunctions_1.orFrameConnectionRenderer,
            type: connectorType,
            eventListenersGenerator: eventListenersGenerator,
            pieceType: pieceType
        },
        summaries: {
            accessibleTransform: function (data, i) {
                var columnName = oExtent[i];
                var summaryPackage = {
                    type: "column-hover",
                    column: projectedColumns[columnName],
                    pieces: projectedColumns[columnName].pieceData,
                    summary: projectedColumns[columnName].pieceData,
                    oAccessor: oAccessor
                };
                return summaryPackage;
            },
            data: calculatedSummaries.marks,
            behavior: summaryLayouts_1.renderLaidOutSummaries,
            canvasRender: summaryCanvasRender,
            styleFn: dataFunctions_1.stringToFn(summaryStyle, function () { return ({}); }, true),
            classFn: dataFunctions_1.stringToFn(summaryClass, function () { return ""; }, true)
        },
        pieces: {
            accessibleTransform: function (data, i) { return (__assign(__assign({}, (data[i].piece ? __assign(__assign({}, data[i].piece), data[i].xy) : data[i])), { type: "frame-hover" })); },
            shouldRender: pieceType.type && pieceType.type !== "none",
            data: calculatedPieceData,
            behavior: pieceDrawing_1.renderLaidOutPieces,
            canvasRender: pieceCanvasRender,
            styleFn: dataFunctions_1.stringToFn(pieceStyle, function () { return ({}); }, true),
            classFn: dataFunctions_1.stringToFn(pieceClass, function () { return ""; }, true),
            axis: arrayWrappedAxis,
            ariaLabel: typeAriaLabel
        }
    };
    if (rExtentSettings.onChange &&
        (currentState.calculatedRExtent || []).join(",") !==
            (calculatedRExtent || []).join(",")) {
        rExtentSettings.onChange(calculatedRExtent);
    }
    if (oExtentSettings.onChange &&
        (currentState.calculatedOExtent || []).join(",") !==
            (calculatedOExtent || []).join(",")) {
        oExtentSettings.onChange(calculatedOExtent);
    }
    return {
        pieceDataXY: pieceDataXY,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        backgroundGraphics: backgroundGraphics,
        foregroundGraphics: foregroundGraphics,
        axisData: arrayWrappedAxis,
        axes: axis,
        axesTickLines: axesTickLines,
        oLabels: { labels: oLabels },
        title: title,
        columnOverlays: columnOverlays,
        renderNumber: currentState.renderNumber + 1,
        oAccessor: oAccessor,
        rAccessor: rAccessor,
        oScaleType: oScaleType,
        rScaleType: instantiatedRScaleType,
        oExtent: oExtent,
        rExtent: rExtent,
        oScale: oScale,
        rScale: rScale,
        calculatedOExtent: calculatedOExtent,
        calculatedRExtent: calculatedRExtent,
        projectedColumns: projectedColumns,
        margin: margin,
        legendSettings: legend,
        orFrameRender: orFrameRender,
        summaryType: summaryType,
        type: pieceType,
        pieceIDAccessor: pieceIDAccessor,
        props: currentProps
    };
};
//# sourceMappingURL=ordinal.js.map