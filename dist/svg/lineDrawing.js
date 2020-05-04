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
Object.defineProperty(exports, "__esModule", { value: true });
var d3_array_1 = require("d3-array");
var multiAccessorUtils_1 = require("../data/multiAccessorUtils");
var datesForUnique = function (d) { return (d instanceof Date ? d.getTime() : d); };
exports.projectSummaryData = function (_a) {
    var data = _a.data, summaryDataAccessor = _a.summaryDataAccessor, xAccessor = _a.xAccessor, yAccessor = _a.yAccessor;
    var projectedData = [];
    summaryDataAccessor.forEach(function (actualSummaryAccessor) {
        xAccessor.forEach(function (actualXAccessor) {
            yAccessor.forEach(function (actualYAccessor) {
                var projection = function (d) {
                    return actualSummaryAccessor(d).map(function (p, q) { return [
                        actualXAccessor(p, q),
                        actualYAccessor(p, q)
                    ]; });
                };
                data.forEach(function (d) {
                    projectedData.push(__assign(__assign({}, d), { _baseData: actualSummaryAccessor(d), _xyfCoordinates: projection(d) }));
                });
            });
        });
    });
    return projectedData;
};
exports.projectLineData = function (_a) {
    var data = _a.data, lineDataAccessor = _a.lineDataAccessor, xProp = _a.xProp, xPropTop = _a.xPropTop, xPropBottom = _a.xPropBottom, yProp = _a.yProp, yPropTop = _a.yPropTop, yPropBottom = _a.yPropBottom, xAccessor = _a.xAccessor, yAccessor = _a.yAccessor;
    if (!Array.isArray(data)) {
        data = [data];
    }
    var projectedLine = [];
    lineDataAccessor.forEach(function (actualLineAccessor, lineIndex) {
        xAccessor.forEach(function (actualXAccessor, xIndex) {
            yAccessor.forEach(function (actualYAccessor, yIndex) {
                data.forEach(function (d) {
                    var originalLineData = __assign(__assign({}, d), { xIndex: xIndex, yIndex: yIndex, lineIndex: lineIndex });
                    originalLineData.data = actualLineAccessor(d).map(function (p, q) {
                        var originalCoords = { data: p };
                        originalCoords[xProp] = actualXAccessor(p, q);
                        originalCoords[xPropTop] = originalCoords[xProp];
                        originalCoords[xPropBottom] = originalCoords[xProp];
                        originalCoords[yProp] = actualYAccessor(p, q);
                        originalCoords[yPropTop] = originalCoords[yProp];
                        originalCoords[yPropBottom] = originalCoords[yProp];
                        return originalCoords;
                    });
                    originalLineData.key = originalLineData.key || projectedLine.length;
                    projectedLine.push(originalLineData);
                });
            });
        });
    });
    return projectedLine;
};
exports.differenceLine = function (_a) {
    var data = _a.data, yProp = _a.yProp, yPropTop = _a.yPropTop, yPropBottom = _a.yPropBottom;
    data.forEach(function (l, i) {
        l.data.forEach(function (point, q) {
            var otherLine = i === 0 ? 1 : 0;
            if (point[yProp] > data[otherLine].data[q][yProp]) {
                point[yPropBottom] = data[otherLine].data[q][yProp];
                point[yPropTop] = point[yProp];
            }
            else {
                point[yPropTop] = point[yProp];
                point[yPropBottom] = point[yProp];
            }
        });
    });
    return data;
};
exports.stackedArea = function (_a) {
    var _b = _a.type, type = _b === void 0 ? "stackedarea" : _b, data = _a.data, xProp = _a.xProp, yProp = _a.yProp, yPropMiddle = _a.yPropMiddle, sort = _a.sort, yPropTop = _a.yPropTop, yPropBottom = _a.yPropBottom;
    var uniqXValues = data
        .map(function (d) { return d.data.map(function (p) { return datesForUnique(p[xProp]); }); })
        .reduce(function (a, b) { return a.concat(b); }, [])
        .reduce(function (p, c) {
        if (p.indexOf(c) === -1) {
            p.push(c);
        }
        return p;
    }, []);
    var stackSort = function (a, b) {
        return d3_array_1.sum(b.data.map(function (p) { return p[yProp]; })) - d3_array_1.sum(a.data.map(function (p) { return p[yProp]; }));
    };
    if (type === "stackedpercent-invert" || type === "stackedarea-invert") {
        stackSort = function (a, b) {
            return d3_array_1.sum(a.data.map(function (p) { return p[yProp]; })) - d3_array_1.sum(b.data.map(function (p) { return p[yProp]; }));
        };
    }
    sort = sort === undefined ? stackSort : sort;
    if (sort !== null) {
        data = data.sort(sort);
    }
    uniqXValues.forEach(function (xValue) {
        var negativeOffset = 0;
        var positiveOffset = 0;
        var stepValues = data
            .map(function (d) { return d.data.filter(function (p) { return datesForUnique(p[xProp]) === xValue; }); })
            .reduce(function (a, b) { return a.concat(b); }, []);
        var positiveStepTotal = d3_array_1.sum(stepValues.map(function (d) { return (d[yProp] > 0 ? d[yProp] : 0); }));
        var negativeStepTotal = d3_array_1.sum(stepValues.map(function (d) { return (d[yProp] < 0 ? d[yProp] : 0); }));
        stepValues.forEach(function (l) {
            if (l[yProp] < 0) {
                if (type === "linepercent" ||
                    type === "stackedpercent" ||
                    type === "stackedpercent-invert") {
                    var percent = l[yProp] / negativeStepTotal;
                    l.percent = percent;
                    if (type === "linepercent") {
                        l[yPropBottom] = l[yPropBottom] = l[yPropTop] = l[yPropMiddle] = percent;
                    }
                    else {
                        var adjustment = negativeStepTotal >= 0 ? 0 : percent;
                        l[yPropBottom] =
                            negativeStepTotal === 0
                                ? 0
                                : -(negativeOffset / negativeStepTotal);
                        l[yPropTop] = l[yPropBottom] - adjustment;
                        l[yPropMiddle] = l[yPropBottom] - adjustment / 2;
                    }
                }
                else {
                    l[yPropBottom] = negativeOffset;
                    l[yPropTop] = negativeOffset + l[yProp];
                    l[yPropMiddle] = negativeOffset + l[yProp] / 2;
                }
                negativeOffset += l[yProp];
            }
            else {
                if (type === "linepercent" ||
                    type === "stackedpercent" ||
                    type === "stackedpercent-invert") {
                    var percent = l[yProp] / positiveStepTotal;
                    l.percent = percent;
                    if (type === "linepercent") {
                        l[yPropBottom] = l[yPropTop] = l[yPropMiddle] = percent;
                    }
                    else {
                        var adjustment = positiveStepTotal <= 0 ? 0 : percent;
                        l[yPropBottom] =
                            positiveStepTotal === 0 ? 0 : positiveOffset / positiveStepTotal;
                        l[yPropTop] = l[yPropBottom] + adjustment;
                        l[yPropMiddle] = l[yPropBottom] + adjustment / 2;
                    }
                }
                else {
                    l[yPropBottom] = positiveOffset;
                    l[yPropTop] = positiveOffset + l[yProp];
                    l[yPropMiddle] = positiveOffset + l[yProp] / 2;
                }
                positiveOffset += l[yProp];
            }
        });
    });
    return data;
};
exports.lineChart = function (_a) {
    var data = _a.data, y1 = _a.y1, x1 = _a.x1, yPropTop = _a.yPropTop, yPropMiddle = _a.yPropMiddle, yPropBottom = _a.yPropBottom, xPropTop = _a.xPropTop, xPropMiddle = _a.xPropMiddle, xPropBottom = _a.xPropBottom;
    if (y1) {
        data.forEach(function (d) {
            d.data.forEach(function (p) {
                p[yPropBottom] = y1(p);
                p[yPropMiddle] = (p[yPropBottom] + p[yPropTop]) / 2;
            });
        });
    }
    if (x1) {
        data.forEach(function (d) {
            d.data.forEach(function (p) {
                p[xPropBottom] = x1(p);
                p[xPropMiddle] = (p[xPropBottom] + p[xPropTop]) / 2;
            });
        });
    }
    return data;
};
exports.cumulativeLine = function (_a) {
    var data = _a.data, y1 = _a.y1, yPropTop = _a.yPropTop, yPropMiddle = _a.yPropMiddle, yPropBottom = _a.yPropBottom, _b = _a.type, type = _b === void 0 ? "cumulative" : _b;
    data.forEach(function (d) {
        var cumulativeValue = 0;
        var dataArray = type === "cumulative-reverse" ? d.data.reverse() : d.data;
        dataArray.forEach(function (p) {
            cumulativeValue += p[yPropTop];
            p[yPropBottom] = p[yPropTop] = p[yPropMiddle] = cumulativeValue;
            if (y1) {
                p[yPropBottom] = y1(p);
                p[yPropMiddle] = p[yPropBottom] + p[yPropTop] / 2;
            }
        });
    });
    return data;
};
exports.bumpChart = function (_a) {
    var _b = _a.type, type = _b === void 0 ? "bumpline" : _b, data = _a.data, xProp = _a.xProp, yProp = _a.yProp, yPropMiddle = _a.yPropMiddle, yPropTop = _a.yPropTop, yPropBottom = _a.yPropBottom;
    var uniqXValues = data
        .map(function (d) { return d.data.map(function (p) { return datesForUnique(p[xProp]); }); })
        .reduce(function (a, b) { return a.concat(b); }, [])
        .reduce(function (p, c) {
        if (p.indexOf(c) === -1) {
            p.push(c);
        }
        return p;
    }, []);
    var bumpSort = function (a, b) {
        if (a[yProp] > b[yProp]) {
            return 1;
        }
        if (a[yProp] < b[yProp]) {
            return -1;
        }
        return -1;
    };
    if (type === "bumparea-invert" || type === "bumpline-invert") {
        bumpSort = function (a, b) {
            if (a[yProp] < b[yProp]) {
                return 1;
            }
            if (a[yProp] > b[yProp]) {
                return -1;
            }
            return -1;
        };
    }
    uniqXValues.forEach(function (xValue) {
        var negativeOffset = 0;
        var positiveOffset = 0;
        data
            .map(function (d) { return d.data.filter(function (p) { return datesForUnique(p[xProp]) === xValue; }); })
            .reduce(function (a, b) { return a.concat(b); }, [])
            .sort(bumpSort)
            .forEach(function (l, rank) {
            //determine ranking and offset by the number of less than this one at each step
            l._XYFrameRank = rank + 1;
            if (type === "bumparea" || type === "bumparea-invert") {
                if (l[yProp] < 0) {
                    l[yPropTop] = negativeOffset + l[yProp];
                    l[yPropMiddle] = negativeOffset + l[yProp] / 2;
                    l[yPropBottom] = negativeOffset;
                    negativeOffset += l[yProp];
                }
                else {
                    l[yPropTop] = positiveOffset + l[yProp];
                    l[yPropMiddle] = positiveOffset + l[yProp] / 2;
                    l[yPropBottom] = positiveOffset;
                    positiveOffset += l[yProp];
                }
            }
            else {
                l[yProp] = rank + 1;
                l[yPropTop] = rank + 1;
                l[yPropBottom] = rank + 1;
            }
        });
    });
    return data;
};
exports.dividedLine = function (parameters, points, searchIterations) {
    if (searchIterations === void 0) { searchIterations = 10; }
    var currentParameters = parameters(points[0], 0);
    var currentPointsArray = [];
    var dividedLinesData = [
        { key: currentParameters, points: currentPointsArray }
    ];
    points.forEach(function (point, pointI) {
        var newParameters = parameters(point, pointI);
        var matchingParams = newParameters === currentParameters;
        var stringNewParams = JSON.stringify(newParameters);
        var stringCurrentParams = JSON.stringify(currentParameters);
        if (typeof currentParameters === "object") {
            matchingParams = stringNewParams === stringCurrentParams;
        }
        if (matchingParams) {
            currentPointsArray.push(point);
        }
        else {
            var lastPoint = currentPointsArray[currentPointsArray.length - 1];
            var pointA = lastPoint;
            var pointB = point;
            var stringBParams = stringNewParams;
            var x = 0;
            while (x < searchIterations && stringNewParams === stringBParams) {
                var keys = Object.keys(pointA);
                var findPoints = simpleSearchFunction({
                    pointA: pointA,
                    pointB: pointB,
                    currentParameters: currentParameters,
                    parameters: parameters,
                    keys: keys
                });
                pointA = findPoints[0];
                pointB = findPoints[1];
                stringBParams = JSON.stringify(parameters(pointB));
                x++;
            }
            currentPointsArray.push(pointB);
            currentPointsArray = [pointB, point];
            dividedLinesData.push({ key: newParameters, points: currentPointsArray });
            currentParameters = newParameters;
        }
    });
    return dividedLinesData;
};
function simpleSearchFunction(_a) {
    var pointA = _a.pointA, pointB = _a.pointB, currentParameters = _a.currentParameters, parameters = _a.parameters, keys = _a.keys;
    var betweenPoint = {};
    keys.forEach(function (key) {
        betweenPoint[key] =
            typeof pointA[key] === "number"
                ? (pointA[key] + pointB[key]) / 2
                : undefined;
    });
    var stringBetween = JSON.stringify(parameters(betweenPoint));
    var stringCurrent = JSON.stringify(currentParameters);
    if (stringBetween === stringCurrent) {
        return [betweenPoint, pointB];
    }
    return [pointA, betweenPoint];
}
function funnelize(_a) {
    var data = _a.data, steps = _a.steps, key = _a.key;
    var funnelData = [];
    if (!Array.isArray(data)) {
        data = [data];
    }
    if (!steps) {
        steps = data.map(function (d) { return Object.keys(d); }).reduce(function (a, b) { return a.concat(b); }, []);
    }
    data.forEach(function (datum, i) {
        var datumKey = key ? datum[key] : i;
        steps.forEach(function (step) {
            var funnelDatum = { funnelKey: datumKey, stepName: "", stepValue: 0 };
            funnelDatum.stepName = step;
            funnelDatum.stepValue = datum[step] ? datum[step] : 0;
            funnelData.push(funnelDatum);
        });
    });
    return funnelData;
}
exports.funnelize = funnelize;
var whichPoint = {
    bottom: "yBottom",
    top: "yTop"
};
function relativeY(_a) {
    var point = _a.point, projectedY = _a.projectedY, yAccessor = _a.yAccessor, yScale = _a.yScale, showLinePoints = _a.showLinePoints;
    var baseData = point &&
        (showLinePoints &&
            showLinePoints !== true &&
            point[whichPoint[showLinePoints]] !== undefined
            ? point[whichPoint[showLinePoints]]
            : point.yMiddle !== undefined
                ? point.yMiddle
                : point[projectedY] !== undefined
                    ? point[projectedY]
                    : multiAccessorUtils_1.findFirstAccessorValue(yAccessor, point));
    if (Array.isArray(baseData)) {
        return baseData.map(function (d) { return yScale(d); });
    }
    return baseData !== undefined ? yScale(baseData) : 0;
}
exports.relativeY = relativeY;
function relativeX(_a) {
    var point = _a.point, projectedXMiddle = _a.projectedXMiddle, projectedX = _a.projectedX, xAccessor = _a.xAccessor, xScale = _a.xScale;
    var baseData = point &&
        (point[projectedXMiddle] !== undefined
            ? point[projectedXMiddle]
            : point[projectedX] !== undefined
                ? point[projectedX]
                : multiAccessorUtils_1.findFirstAccessorValue(xAccessor, point));
    if (Array.isArray(baseData)) {
        return baseData.map(function (d) { return xScale(d); });
    }
    return baseData !== undefined ? xScale(baseData) : 0;
}
exports.relativeX = relativeX;
function findPointByID(_a) {
    var point = _a.point, idAccessor = _a.idAccessor, lines = _a.lines, xScale = _a.xScale, projectedX = _a.projectedX, xAccessor = _a.xAccessor;
    var pointID = idAccessor(point.parentLine || point);
    if (pointID) {
        var thisLine = lines.data.find(function (l) { return idAccessor(l) === pointID; });
        if (!thisLine) {
            return null;
        }
        var pointX_1 = xScale(multiAccessorUtils_1.findFirstAccessorValue(xAccessor, point));
        var thisPoint = thisLine.data.find(function (p) { return xScale(p[projectedX]) === pointX_1; });
        if (!thisPoint) {
            return null;
        }
        var newPoint_1 = __assign(__assign(__assign(__assign({}, point), thisPoint), thisPoint.data), { parentLine: thisLine });
        var reactAnnotationProps = [
            "type",
            "label",
            "note",
            "connector",
            "disabled",
            "color",
            "subject"
        ];
        reactAnnotationProps.forEach(function (prop) {
            if (point[prop])
                newPoint_1[prop] = point[prop];
        });
        return newPoint_1;
    }
    return point;
}
exports.findPointByID = findPointByID;
//# sourceMappingURL=lineDrawing.js.map