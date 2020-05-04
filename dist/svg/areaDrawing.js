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
var d3_contour_1 = require("d3-contour");
var d3_scale_1 = require("d3-scale");
var d3_hexbin_1 = require("d3-hexbin");
var regression_1 = __importDefault(require("regression"));
var d3_shape_1 = require("d3-shape");
var generateLineBounds = function (xydata, basedata, topBoundingAccessor, bottomBoundingAccessor) {
    var tops = xydata.map(function (d, i) { return [
        d[0],
        d[1] + topBoundingAccessor(basedata[i])
    ]; });
    var bottoms = xydata.map(function (d, i) { return [
        d[0],
        d[1] - bottomBoundingAccessor(basedata[i])
    ]; });
    return __spread(tops, bottoms.reverse());
};
function lineBounding(_a) {
    var summaryType = _a.summaryType, data = _a.data, defined = _a.defined;
    var projectedSummaries = [];
    if (!summaryType.type) {
        summaryType = { type: summaryType };
    }
    var boundingAccessor = summaryType.boundingAccessor, _b = summaryType.topBoundingAccessor, topBoundingAccessor = _b === void 0 ? boundingAccessor : _b, _c = summaryType.bottomBoundingAccessor, bottomBoundingAccessor = _c === void 0 ? boundingAccessor : _c;
    data.forEach(function (lineData) {
        var definedData = lineData._baseData.map(defined);
        var currentBaseData = [];
        var currentXYFC = [];
        var boundingPieces = [{
                xyf: currentXYFC,
                base: currentBaseData
            }];
        definedData.forEach(function (d, i) {
            if (d === true) {
                currentBaseData.push(lineData._baseData[i]);
                currentXYFC.push(lineData._xyfCoordinates[i]);
            }
            else if (definedData[i + 1]) {
                currentBaseData = [];
                currentXYFC = [];
                boundingPieces.push({
                    xyf: currentXYFC,
                    base: currentBaseData
                });
            }
        });
        boundingPieces.forEach(function (_a) {
            var xyf = _a.xyf, base = _a.base;
            var boundingProjectedSummary = {
                data: lineData,
                parentSummary: lineData,
                _xyfCoordinates: generateLineBounds(xyf, base, topBoundingAccessor, bottomBoundingAccessor)
            };
            projectedSummaries = __spread(projectedSummaries, [boundingProjectedSummary]);
        });
    });
    return projectedSummaries;
}
exports.lineBounding = lineBounding;
function contouring(_a) {
    var summaryType = _a.summaryType, data = _a.data, finalXExtent = _a.finalXExtent, finalYExtent = _a.finalYExtent;
    var projectedSummaries = [];
    if (!summaryType.type) {
        summaryType = { type: summaryType };
    }
    var _b = summaryType.resolution, resolution = _b === void 0 ? 500 : _b, _c = summaryType.thresholds, thresholds = _c === void 0 ? 10 : _c, _d = summaryType.bandwidth, bandwidth = _d === void 0 ? 20 : _d, neighborhood = summaryType.neighborhood;
    var xScale = d3_scale_1.scaleLinear()
        .domain(finalXExtent)
        .rangeRound([0, resolution])
        .nice();
    var yScale = d3_scale_1.scaleLinear()
        .domain(finalYExtent)
        .rangeRound([resolution, 0])
        .nice();
    data.forEach(function (contourData) {
        var contourProjectedSummaries = d3_contour_1.contourDensity()
            .size([resolution, resolution])
            .x(function (d) { return xScale(d[0]); })
            .y(function (d) { return yScale(d[1]); })
            .thresholds(thresholds)
            .bandwidth(bandwidth)(contourData._xyfCoordinates);
        if (neighborhood) {
            contourProjectedSummaries = [contourProjectedSummaries[0]];
        }
        var max = Math.max.apply(Math, __spread(contourProjectedSummaries.map(function (d) { return d.value; })));
        contourProjectedSummaries.forEach(function (summary) {
            summary.parentSummary = contourData;
            summary.bounds = [];
            summary.percent = summary.value / max;
            summary.coordinates.forEach(function (poly) {
                poly.forEach(function (subpoly, i) {
                    poly[i] = subpoly.map(function (coordpair) {
                        coordpair = [
                            xScale.invert(coordpair[0]),
                            yScale.invert(coordpair[1])
                        ];
                        return coordpair;
                    });
                    //Only push bounds for the main poly, not its interior rings, otherwise you end up labeling interior cutouts
                    if (i === 0) {
                        summary.bounds.push(shapeBounds(poly[i]));
                    }
                });
            });
        });
        projectedSummaries = __spread(projectedSummaries, contourProjectedSummaries);
    });
    return projectedSummaries;
}
exports.contouring = contouring;
function hexbinning(_a) {
    var _b = _a.preprocess, preprocess = _b === void 0 ? true : _b, _c = _a.processedData, processedData = _c === void 0 ? false : _c, summaryType = _a.summaryType, baseData = _a.data, _d = _a.finalXExtent, finalXExtent = _d === void 0 ? [
        Math.min.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.x; }))),
        Math.max.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.x; })))
    ] : _d, _e = _a.finalYExtent, finalYExtent = _e === void 0 ? [
        Math.min.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.y; }))),
        Math.max.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.y; })))
    ] : _e, size = _a.size, _f = _a.xScaleType, xScaleType = _f === void 0 ? d3_scale_1.scaleLinear() : _f, _g = _a.yScaleType, yScaleType = _g === void 0 ? d3_scale_1.scaleLinear() : _g, margin = _a.margin, baseMarkProps = _a.baseMarkProps, styleFn = _a.styleFn, classFn = _a.classFn, renderFn = _a.renderFn, chartSize = _a.chartSize;
    if (processedData) {
        return baseData[0].coordinates;
    }
    var projectedSummaries = [];
    if (!summaryType.type) {
        summaryType = { type: summaryType };
    }
    var 
    //    binGraphic = "hex",
    _h = summaryType.bins, 
    //    binGraphic = "hex",
    bins = _h === void 0 ? 0.05 : _h, cellPx = summaryType.cellPx, _j = summaryType.binValue, binValue = _j === void 0 ? function (d) { return d.length; } : _j, binMax = summaryType.binMax, customMark = summaryType.customMark;
    if (baseData.coordinates && !baseData._xyfCoordinates) {
        baseData._xyfCoordinates = baseData.coordinates.map(function (d) { return [d.x, d.y]; });
    }
    var data = Array.isArray(baseData) ? baseData : [baseData];
    var hexBinXScale = xScaleType.domain(finalXExtent).range([0, size[0]]);
    var hexBinYScale = yScaleType.domain(finalYExtent).range([0, size[1]]);
    var actualResolution = (cellPx && cellPx / 2) || ((bins > 1 ? 1 / bins : bins) * size[0]) / 2;
    var hexbinner = d3_hexbin_1.hexbin()
        .x(function (d) { return hexBinXScale(d._xyfPoint[0]); })
        .y(function (d) { return hexBinYScale(d._xyfPoint[1]); })
        .radius(actualResolution)
        .size(size);
    var hexMax;
    var allHexes = hexbinner.centers();
    data.forEach(function (hexbinData) {
        hexMax = 0;
        var hexes = hexbinner(hexbinData._xyfCoordinates.map(function (d, i) { return (__assign({ _xyfPoint: d }, hexbinData.coordinates[i])); }));
        var centerHash = {};
        hexes.forEach(function (d) {
            centerHash[parseInt(d.x) + "-" + parseInt(d.y)] = true;
        });
        allHexes.forEach(function (hexCenter) {
            if (!centerHash[parseInt(hexCenter[0]) + "-" + parseInt(hexCenter[1])]) {
                var newHex = [];
                newHex.x = hexCenter[0];
                newHex.y = hexCenter[1];
                hexes.push(newHex);
            }
        });
        hexMax = Math.max.apply(Math, __spread(hexes.map(function (d) { return binValue(d); })));
        if (binMax) {
            binMax(hexMax);
        }
        //Option for blank hexe
        var hexBase = [
            [0, -1],
            [0.866, -0.5],
            [0.866, 0.5],
            [0, 1],
            [-0.866, 0.5],
            [-0.866, -0.5]
        ];
        var hexWidth = hexBinXScale.invert(actualResolution) - finalXExtent[0];
        var hexHeight = hexBinYScale.invert(actualResolution) - finalYExtent[0];
        var hexacoordinates = hexBase.map(function (d) { return [
            d[0] * hexWidth,
            d[1] * hexHeight
        ]; });
        var hexbinProjectedSummaries = hexes.map(function (d) {
            var hexValue = binValue(d);
            var gx = d.x;
            var gy = d.y;
            d.x = hexBinXScale.invert(d.x);
            d.y = hexBinYScale.invert(d.y);
            var percent = hexValue / hexMax;
            return {
                customMark: customMark && (React.createElement("g", { transform: "translate(" + gx + "," + (size[1] - gy) + ")" }, customMark({
                    d: __assign(__assign({}, d), { binItems: d, percent: percent, value: hexValue, radius: actualResolution, hexCoordinates: hexBase.map(function (d) { return [
                            d[0] * actualResolution,
                            d[1] * actualResolution
                        ]; }) }),
                    baseMarkProps: baseMarkProps,
                    margin: margin,
                    styleFn: styleFn,
                    classFn: classFn,
                    renderFn: renderFn,
                    chartSize: chartSize,
                    adjustedSize: size
                }))),
                _xyfCoordinates: hexacoordinates.map(function (p) { return [p[0] + d.x, p[1] + d.y]; }),
                value: hexValue,
                percent: percent,
                data: d,
                parentSummary: hexbinData,
                centroid: true
            };
        });
        projectedSummaries = __spread(projectedSummaries, hexbinProjectedSummaries);
    });
    if (preprocess) {
        projectedSummaries.forEach(function (d) {
            d.x = d.data.x;
            d.y = d.data.y;
        });
        return {
            type: "hexbin",
            processedData: true,
            coordinates: projectedSummaries,
            binMax: hexMax
        };
    }
    return projectedSummaries;
}
exports.hexbinning = hexbinning;
// ADD PRECALC AND EXPOSE PRECALC FUNCTION
function heatmapping(_a) {
    var _b = _a.preprocess, preprocess = _b === void 0 ? true : _b, _c = _a.processedData, processedData = _c === void 0 ? false : _c, summaryType = _a.summaryType, baseData = _a.data, _d = _a.finalXExtent, finalXExtent = _d === void 0 ? [
        Math.min.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.x; }))),
        Math.max.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.x; })))
    ] : _d, _e = _a.finalYExtent, finalYExtent = _e === void 0 ? [
        Math.min.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.y; }))),
        Math.max.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.y; })))
    ] : _e, size = _a.size, _f = _a.xScaleType, xScaleType = _f === void 0 ? d3_scale_1.scaleLinear() : _f, _g = _a.yScaleType, yScaleType = _g === void 0 ? d3_scale_1.scaleLinear() : _g, margin = _a.margin, baseMarkProps = _a.baseMarkProps, styleFn = _a.styleFn, classFn = _a.classFn, renderFn = _a.renderFn, chartSize = _a.chartSize;
    if (processedData) {
        return baseData[0].coordinates;
    }
    if (baseData.coordinates && !baseData._xyfCoordinates) {
        baseData._xyfCoordinates = baseData.coordinates.map(function (d) { return [d.x, d.y]; });
    }
    var data = Array.isArray(baseData) ? baseData : [baseData];
    var projectedSummaries = [];
    if (!summaryType.type) {
        summaryType = { type: summaryType };
    }
    var 
    //    binGraphic = "square",
    _h = summaryType.binValue, 
    //    binGraphic = "square",
    binValue = _h === void 0 ? function (d) { return d.length; } : _h, _j = summaryType.xBins, xBins = _j === void 0 ? summaryType.yBins || 0.05 : _j, _k = summaryType.yBins, yBins = _k === void 0 ? xBins : _k, _l = summaryType.xCellPx, xCellPx = _l === void 0 ? !summaryType.xBins && summaryType.yCellPx : _l, _m = summaryType.yCellPx, yCellPx = _m === void 0 ? !summaryType.yBins && xCellPx : _m, customMark = summaryType.customMark, binMax = summaryType.binMax;
    var xBinPercent = xBins < 1 ? xBins : 1 / xBins;
    var yBinPercent = yBins < 1 ? yBins : 1 / yBins;
    var heatmapBinXScale = xScaleType.domain(finalXExtent).range([0, size[0]]);
    var heatmapBinYScale = yScaleType.domain(finalYExtent).range([size[1], 0]);
    var actualResolution = [
        Math.ceil(((xCellPx && xCellPx / size[0]) || xBinPercent) * size[0] * 10) /
            10,
        Math.ceil(((yCellPx && yCellPx / size[1]) || yBinPercent) * size[1] * 10) /
            10
    ];
    var maxValue = -Infinity;
    data.forEach(function (heatmapData) {
        var grid = [];
        var flatGrid = [];
        var cell;
        var gridColumn;
        for (var i = 0; i < size[0]; i += actualResolution[0]) {
            var x = heatmapBinXScale.invert(i);
            var x1 = heatmapBinXScale.invert(i + actualResolution[0]);
            gridColumn = [];
            grid.push(gridColumn);
            for (var j = 0; j < size[1]; j += actualResolution[1]) {
                var y = heatmapBinYScale.invert(j);
                var y1 = heatmapBinYScale.invert(j + actualResolution[1]);
                cell = {
                    gx: i,
                    gy: j,
                    gw: actualResolution[0],
                    gh: actualResolution[1],
                    x: (x + x1) / 2,
                    y: (y + y1) / 2,
                    binItems: [],
                    value: 0,
                    _xyfCoordinates: [[x, y], [x1, y], [x1, y1], [x, y1]],
                    parentSummary: heatmapData
                };
                gridColumn.push(cell);
                flatGrid.push(cell);
            }
            gridColumn.push(cell);
        }
        grid.push(gridColumn);
        heatmapData._xyfCoordinates.forEach(function (d, di) {
            var xCoordinate = Math.floor(heatmapBinXScale(d[0]) / actualResolution[0]);
            var yCoordinate = Math.floor(heatmapBinYScale(d[1]) / actualResolution[1]);
            grid[xCoordinate][yCoordinate].binItems.push(heatmapData.coordinates[di]);
        });
        flatGrid.forEach(function (d) {
            d.value = binValue(d.binItems);
            maxValue = Math.max(maxValue, d.value);
        });
        flatGrid.forEach(function (d) {
            d.percent = d.value / maxValue;
            d.customMark = customMark && (React.createElement("g", { transform: "translate(" + d.gx + "," + d.gy + ")" }, customMark({
                d: d,
                baseMarkProps: baseMarkProps,
                margin: margin,
                styleFn: styleFn,
                classFn: classFn,
                renderFn: renderFn,
                chartSize: chartSize,
                adjustedSize: size
            })));
        });
        projectedSummaries = __spread(projectedSummaries, flatGrid);
    });
    if (binMax) {
        binMax(maxValue);
    }
    if (preprocess) {
        return {
            type: "heatmap",
            processedData: true,
            coordinates: projectedSummaries,
            binMax: maxValue
        };
    }
    return projectedSummaries;
}
exports.heatmapping = heatmapping;
function trendlining(_a) {
    var _b = _a.preprocess, preprocess = _b === void 0 ? false : _b, summaryType = _a.summaryType, baseData = _a.data, _c = _a.finalXExtent, finalXExtent = _c === void 0 ? [
        Math.min.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.x; }))),
        Math.max.apply(Math, __spread(baseData.coordinates.map(function (d) { return d.x; })))
    ] : _c, _d = _a.xScaleType, xScaleType = _d === void 0 ? d3_scale_1.scaleLinear() : _d;
    if (preprocess) {
        return baseData[0].coordinates;
    }
    var projectedSummaries = [];
    if (!summaryType.type) {
        summaryType = { type: summaryType };
    }
    var _e = summaryType.regressionType, baseRegressionType = _e === void 0 ? "linear" : _e, _f = summaryType.order, order = _f === void 0 ? 2 : _f, _g = summaryType.precision, precision = _g === void 0 ? 4 : _g, _h = summaryType.controlPoints, controlPoints = _h === void 0 ? 20 : _h, _j = summaryType.curve, curve = _j === void 0 ? d3_shape_1.curveCardinal : _j;
    var regressionType = baseRegressionType;
    if (finalXExtent[0] < 0 &&
        (baseRegressionType === "logarithmic" ||
            baseRegressionType === "power" ||
            baseRegressionType === "exponential")) {
        console.error("Cannot use this " + baseRegressionType + " regressionType type with value range that goes below 0, defaulting to linear");
        regressionType = "linear";
    }
    if (baseData.coordinates && !baseData._xyfCoordinates) {
        baseData._xyfCoordinates = baseData.coordinates.map(function (d) { return [d.x, d.y]; });
    }
    var data = Array.isArray(baseData) ? baseData : [baseData];
    var xScale = xScaleType.domain([0, 1]).range(finalXExtent);
    projectedSummaries = [];
    data.forEach(function (bdata) {
        var regressionLine = regression_1.default[regressionType](bdata._xyfCoordinates.map(function (d) { return [
            d[0].getTime ? d[0].getTime() : d[0],
            d[1].getTime ? d[1].getTime() : d[1]
        ]; }), {
            order: order,
            precision: precision
        });
        var controlStep = 1 / controlPoints;
        var steps = [0, 1];
        if (regressionType !== "linear") {
            steps = [];
            for (var step = 0; step < 1 + controlStep; step += controlStep) {
                steps.push(step);
            }
        }
        var controlPointArray = [];
        steps.forEach(function (controlPoint) {
            controlPointArray.push(regressionLine.predict(xScale(controlPoint)));
        });
        projectedSummaries.push({
            centroid: false,
            customMark: undefined,
            data: bdata,
            parentSummary: bdata,
            value: regressionLine.string,
            r2: regressionLine.r2,
            curve: curve,
            _xyfCoordinates: controlPointArray
        });
    });
    return projectedSummaries;
}
exports.trendlining = trendlining;
function shapeBounds(coordinates) {
    var left = [Infinity, 0];
    var right = [-Infinity, 0];
    var top = [0, Infinity];
    var bottom = [0, -Infinity];
    coordinates.forEach(function (d) {
        left = d[0] < left[0] ? d : left;
        right = d[0] > right[0] ? d : right;
        bottom = d[1] > bottom[1] ? d : bottom;
        top = d[1] < top[1] ? d : top;
    });
    return { center: [(left[0] + right[0]) / 2, (top[1] + bottom[1]) / 2], top: top, left: left, right: right, bottom: bottom };
}
exports.shapeBounds = shapeBounds;
//# sourceMappingURL=areaDrawing.js.map