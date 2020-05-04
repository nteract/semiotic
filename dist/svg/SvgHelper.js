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
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var d3_selection_1 = require("d3-selection");
var d3_shape_1 = require("d3-shape");
var semiotic_mark_1 = require("semiotic-mark");
var d3_interpolate_1 = require("d3-interpolate");
var emptyObjectReturnFn = function () { return ({}); };
var twoPI = Math.PI * 2;
var dedupeRibbonPoints = function (weight) {
    if (weight === void 0) { weight = 1; }
    return function (p, c) {
        var l = p[p.length - 1];
        if (!l ||
            Math.round(l.x / weight) !== Math.round(c.x / weight) ||
            Math.round(l.y / weight) !== Math.round(c.y / weight)) {
            p.push(c);
        }
        return p;
    };
};
exports.arcTweener = function (oldProps, newProps) {
    var innerRadiusInterpolator = d3_interpolate_1.interpolateNumber(oldProps.innerRadius, newProps.innerRadius);
    var outerRadiusInterpolator = d3_interpolate_1.interpolateNumber(oldProps.outerRadius, newProps.outerRadius);
    var startAngleInterpolator = d3_interpolate_1.interpolateNumber(oldProps.startAngle, newProps.startAngle);
    var endAngleInterpolator = d3_interpolate_1.interpolateNumber(oldProps.endAngle, newProps.endAngle);
    return function (t) {
        var sliceGenerator = d3_shape_1.arc()
            .innerRadius(innerRadiusInterpolator(t))
            .outerRadius(outerRadiusInterpolator(t));
        return sliceGenerator({
            startAngle: startAngleInterpolator(t),
            endAngle: endAngleInterpolator(t)
        });
    };
};
exports.drawAreaConnector = function (_a) {
    var x1 = _a.x1, x2 = _a.x2, y1 = _a.y1, y2 = _a.y2, sizeX1 = _a.sizeX1, sizeY1 = _a.sizeY1, sizeX2 = _a.sizeX2, sizeY2 = _a.sizeY2;
    return "M" + x1 + "," + y1 + "L" + x2 + "," + y2 + "L" + (x2 + sizeX2) + "," + (y2 + sizeY2) + "L" + (x1 +
        sizeX1) + "," + (y1 + sizeY1) + "Z";
};
exports.wrap = function (text, width) {
    text.each(function () {
        var textNode = d3_selection_1.select(this), words = textNode
            .text()
            .split(/\s+/)
            .reverse(), lineHeight = 1.1, // ems
        y = textNode.attr("y"), dy = parseFloat(textNode.attr("dy"));
        var word, wordline = [], lineNumber = 0, tspan = textNode
            .text(null)
            .append("tspan")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", dy + "em");
        while (words.length > 0) {
            word = words.pop();
            wordline.push(word);
            tspan.text(wordline.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                wordline.pop();
                tspan.text(wordline.join(" "));
                wordline = [word];
                tspan = text
                    .append("tspan")
                    .attr("x", 0)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .text(word);
            }
        }
    });
};
exports.hexToRgb = function (hex) {
    if (hex.substr(0, 2).toLowerCase() === "rg") {
        return hex
            .split("(")[1]
            .split(")")[0]
            .split(",");
    }
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ]
        : [0, 0, 0];
};
exports.groupBarMark = function (_a) {
    var bins = _a.bins, binMax = _a.binMax, relativeBuckets = _a.relativeBuckets, columnWidth = _a.columnWidth, projection = _a.projection, adjustedSize = _a.adjustedSize, summaryI = _a.summaryI, summary = _a.summary, renderValue = _a.renderValue, summaryStyle = _a.summaryStyle, type = _a.type, baseMarkProps = _a.baseMarkProps;
    var mappedBins = [];
    var mappedPoints = [];
    var actualMax = (relativeBuckets && relativeBuckets[summary.name]) || binMax;
    var summaryElementStylingFn = type.elementStyleFn || emptyObjectReturnFn;
    var barPadding = type.padding || 0;
    bins.forEach(function (d, i) {
        var opacity = d.value / actualMax;
        var additionalStyle = summaryElementStylingFn(d.value, opacity, d.pieces);
        var finalStyle = type.type === "heatmap"
            ? __assign({ opacity: opacity, fill: summaryStyle.fill }, additionalStyle) : __assign(__assign({}, summaryStyle), additionalStyle);
        var thickness = Math.max(1, d.y1 - barPadding * 2);
        var finalColumnWidth = type.type === "heatmap" ? columnWidth : columnWidth * opacity;
        var yProp = d.y + barPadding;
        var xProp = type.type === "heatmap" || type.flip
            ? -columnWidth / 2
            : columnWidth / 2 - finalColumnWidth;
        var height = thickness;
        var width = finalColumnWidth;
        var xOffset = type.type === "heatmap" ? finalColumnWidth / 2 : finalColumnWidth;
        var yOffset = d.y1 / 2;
        if (projection === "horizontal") {
            yProp =
                type.type === "heatmap"
                    ? -columnWidth / 2
                    : type.flip
                        ? -columnWidth / 2
                        : columnWidth / 2 - finalColumnWidth;
            xProp = d.y - d.y1 + barPadding;
            height = finalColumnWidth;
            width = thickness;
            yOffset =
                type.type === "heatmap" ? finalColumnWidth / 2 : finalColumnWidth;
            xOffset = d.y1 / 2;
        }
        else if (projection === "radial") {
            var arcGenerator = d3_shape_1.arc()
                .innerRadius(d.y / 2)
                .outerRadius((d.y + d.y1) / 2);
            var angle = summary.pct - summary.pct_padding;
            var startAngle = summary.pct_middle - summary.pct_padding;
            var endAngle = type.type === "heatmap"
                ? startAngle + angle
                : startAngle + angle * opacity;
            startAngle *= twoPI;
            endAngle *= twoPI;
            var arcAdjustX = adjustedSize[0] / 2;
            var arcAdjustY = adjustedSize[1] / 2;
            var arcTranslate = "translate(" + arcAdjustX + "," + arcAdjustY + ")";
            var arcCenter = arcGenerator.centroid({ startAngle: startAngle, endAngle: endAngle });
            mappedPoints.push({
                key: summary.name,
                value: d.value,
                pieces: d.pieces.map(function (p) { return p.piece; }),
                label: "Heatmap",
                x: arcCenter[0] + arcAdjustX,
                y: arcCenter[1] + arcAdjustY
            });
            mappedBins.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { markType: "path", transform: arcTranslate, renderMode: renderValue, key: "groupIcon-" + summaryI + "-" + i, d: arcGenerator({ startAngle: startAngle, endAngle: endAngle }), style: finalStyle })));
        }
        if (projection !== "radial") {
            mappedPoints.push({
                key: summary.name,
                value: d.value,
                pieces: d.pieces.map(function (p) { return p.piece; }),
                label: "Heatmap",
                x: xProp + xOffset,
                y: yProp + yOffset
            });
            mappedBins.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { markType: "rect", renderMode: renderValue, key: "groupIcon-" + summaryI + "-" + i, x: xProp, y: yProp, height: height, width: width, style: finalStyle })));
        }
    });
    return { marks: mappedBins, points: mappedPoints };
};
// FROM d3-svg-ribbon
function linearRibbon() {
    var _lineConstructor = d3_shape_1.line();
    var _xAccessor = function (d) {
        return d.x;
    };
    var _yAccessor = function (d) {
        return d.y;
    };
    var _rAccessor = function (d) {
        return d.r;
    };
    var _interpolator = d3_shape_1.curveLinearClosed;
    function _ribbon(pathData) {
        if (pathData.multiple) {
            var original_r = _rAccessor;
            var parallelTotal_1 = pathData.multiple.reduce(function (p, c) { return p + c.weight; }, 0);
            _rAccessor = function () { return parallelTotal_1; };
            var totalPoints = buildRibbon(pathData.points);
            var currentPoints_1 = totalPoints
                .filter(function (d) { return d.direction === "forward"; })
                .reduce(dedupeRibbonPoints(), []);
            var allRibbons_1 = [];
            pathData.multiple.forEach(function (siblingPath, siblingI) {
                _rAccessor = function () { return siblingPath.weight; };
                var currentRibbon = buildRibbon(currentPoints_1);
                allRibbons_1.push(currentRibbon);
                var nextSibling = pathData.multiple[siblingI + 1];
                if (nextSibling) {
                    var currentLeftSide = currentRibbon
                        .reverse()
                        .filter(function (d) { return d.direction === "back"; })
                        .reduce(dedupeRibbonPoints(), []);
                    _rAccessor = function () { return nextSibling.weight; };
                    var leftHandInflatedRibbon = buildRibbon(currentLeftSide);
                    currentPoints_1 = leftHandInflatedRibbon
                        .reverse()
                        .filter(function (d) { return d.direction === "back"; })
                        .reduce(dedupeRibbonPoints(), []);
                }
            });
            _rAccessor = original_r;
            return allRibbons_1.map(function (d) {
                return _lineConstructor
                    .x(_xAccessor)
                    .y(_yAccessor)
                    .curve(_interpolator)(d);
            });
        }
        var bothPoints = buildRibbon(pathData).reduce(dedupeRibbonPoints(), []);
        return _lineConstructor
            .x(_xAccessor)
            .y(_yAccessor)
            .curve(_interpolator)(bothPoints);
    }
    _ribbon.x = function (_value) {
        if (!arguments.length)
            return _xAccessor;
        _xAccessor = _value;
        return _ribbon;
    };
    _ribbon.y = function (_value) {
        if (!arguments.length)
            return _yAccessor;
        _yAccessor = _value;
        return _ribbon;
    };
    _ribbon.r = function (_value) {
        if (!arguments.length)
            return _rAccessor;
        _rAccessor = _value;
        return _ribbon;
    };
    _ribbon.interpolate = function (_value) {
        if (!arguments.length)
            return _interpolator;
        _interpolator = _value;
        return _ribbon;
    };
    return _ribbon;
    function offsetEdge(d) {
        var diffX = _yAccessor(d.target) - _yAccessor(d.source);
        var diffY = _xAccessor(d.target) - _xAccessor(d.source);
        var angle0 = Math.atan2(diffY, diffX) + Math.PI / 2;
        var angle1 = angle0 + Math.PI * 0.5;
        var angle2 = angle0 + Math.PI * 0.5;
        var x1 = _xAccessor(d.source) + _rAccessor(d.source) * Math.cos(angle1);
        var y1 = _yAccessor(d.source) - _rAccessor(d.source) * Math.sin(angle1);
        var x2 = _xAccessor(d.target) + _rAccessor(d.target) * Math.cos(angle2);
        var y2 = _yAccessor(d.target) - _rAccessor(d.target) * Math.sin(angle2);
        return { x1: x1, y1: y1, x2: x2, y2: y2 };
    }
    function buildRibbon(points) {
        var bothCode = [];
        var x = 0;
        var transformedPoints = { x1: 0, y1: 0, x2: 0, y2: 0 };
        while (x < points.length) {
            if (x !== points.length - 1) {
                transformedPoints = offsetEdge({
                    source: points[x],
                    target: points[x + 1]
                });
                var p1 = {
                    x: transformedPoints.x1,
                    y: transformedPoints.y1,
                    direction: "forward"
                };
                var p2 = {
                    x: transformedPoints.x2,
                    y: transformedPoints.y2,
                    direction: "forward"
                };
                bothCode.push(p1, p2);
                if (bothCode.length > 3) {
                    var l = bothCode.length - 1;
                    var lineA = { a: bothCode[l - 3], b: bothCode[l - 2] };
                    var lineB = { a: bothCode[l - 1], b: bothCode[l] };
                    var intersect = findIntersect(lineA.a.x, lineA.a.y, lineA.b.x, lineA.b.y, lineB.a.x, lineB.a.y, lineB.b.x, lineB.b.y);
                    if (intersect.found === true) {
                        lineA.b.x = intersect.x;
                        lineA.b.y = intersect.y;
                        lineB.a.x = intersect.x;
                        lineB.a.y = intersect.y;
                    }
                }
            }
            x++;
        }
        x--;
        //Back
        while (x >= 0) {
            if (x !== 0) {
                transformedPoints = offsetEdge({
                    source: points[x],
                    target: points[x - 1]
                });
                var p1 = {
                    x: transformedPoints.x1,
                    y: transformedPoints.y1,
                    direction: "back"
                };
                var p2 = {
                    x: transformedPoints.x2,
                    y: transformedPoints.y2,
                    direction: "back"
                };
                bothCode.push(p1, p2);
                if (bothCode.length > 3) {
                    var l = bothCode.length - 1;
                    var lineA = { a: bothCode[l - 3], b: bothCode[l - 2] };
                    var lineB = { a: bothCode[l - 1], b: bothCode[l] };
                    var intersect = findIntersect(lineA.a.x, lineA.a.y, lineA.b.x, lineA.b.y, lineB.a.x, lineB.a.y, lineB.b.x, lineB.b.y);
                    if (intersect.found === true) {
                        lineA.b.x = intersect.x;
                        lineA.b.y = intersect.y;
                        lineB.a.x = intersect.x;
                        lineB.a.y = intersect.y;
                    }
                }
            }
            x--;
        }
        return bothCode;
    }
    function findIntersect(l1x1, l1y1, l1x2, l1y2, l2x1, l2y1, l2x2, l2y2) {
        var a, b;
        var result = {
            x: null,
            y: null,
            found: false
        };
        var d = (l2y2 - l2y1) * (l1x2 - l1x1) - (l2x2 - l2x1) * (l1y2 - l1y1);
        if (d === 0) {
            return result;
        }
        a = l1y1 - l2y1;
        b = l1x1 - l2x1;
        var n1 = (l2x2 - l2x1) * a - (l2y2 - l2y1) * b;
        var n2 = (l1x2 - l1x1) * a - (l1y2 - l1y1) * b;
        a = n1 / d;
        b = n2 / d;
        result.x = l1x1 + a * (l1x2 - l1x1);
        result.y = l1y1 + a * (l1y2 - l1y1);
        if (a > 0 && a < 1 && (b > 0 && b < 1)) {
            result.found = true;
        }
        return result;
    }
}
exports.linearRibbon = linearRibbon;
//# sourceMappingURL=SvgHelper.js.map