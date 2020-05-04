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
var semiotic_mark_1 = require("semiotic-mark");
var d3_shape_1 = require("d3-shape");
var areaDrawing_1 = require("../svg/areaDrawing");
exports.curveHash = {
    step: d3_shape_1.curveStep,
    stepbefore: d3_shape_1.curveStepBefore,
    stepafter: d3_shape_1.curveStepAfter,
    cardinal: d3_shape_1.curveCardinal,
    basis: d3_shape_1.curveBasis,
    linear: d3_shape_1.curveLinear,
    catmullrom: d3_shape_1.curveCatmullRom,
    monotone: d3_shape_1.curveMonotoneY,
    monotonex: d3_shape_1.curveMonotoneX,
    monotoney: d3_shape_1.curveMonotoneY,
    natural: d3_shape_1.curveNatural
};
function lineGeneratorDecorator(_a) {
    var generator = _a.generator, projectedCoordinateNames = _a.projectedCoordinateNames, defined = _a.defined, xScale = _a.xScale, yScale = _a.yScale, interpolator = _a.interpolator, simpleLine = _a.simpleLine;
    var x = projectedCoordinateNames.x, y = projectedCoordinateNames.y, yTop = projectedCoordinateNames.yTop, yBottom = projectedCoordinateNames.yBottom, xBottom = projectedCoordinateNames.xBottom, xTop = projectedCoordinateNames.xTop;
    generator.x(function (d) { return xScale(d[x]); }).curve(interpolator);
    if (simpleLine) {
        generator.y(function (d) { return yScale(d[y]); });
    }
    else {
        generator.y0(function (d) { return yScale(d[yBottom]); }).y1(function (d) { return yScale(d[yTop]); });
        generator.x0(function (d) { return xScale(d[xBottom]); }).x1(function (d) { return xScale(d[xTop]); });
    }
    if (defined) {
        generator.defined(function (p, q) { return defined(p, q); });
    }
    else {
        generator.defined(function (p) { return !p._xyFrameUndefined; });
    }
}
exports.lineGeneratorDecorator = lineGeneratorDecorator;
function createPoints(_a) {
    var xScale = _a.xScale, yScale = _a.yScale, canvasDrawing = _a.canvasDrawing, data = _a.data, projectedCoordinateNames = _a.projectedCoordinateNames, customMark = _a.customMark, canvasRender = _a.canvasRender, styleFn = _a.styleFn, classFn = _a.classFn, renderKeyFn = _a.renderKeyFn, renderMode = _a.renderMode, baseMarkProps = _a.baseMarkProps, baseShowLinePoints = _a.showLinePoints;
    var y = projectedCoordinateNames.y, x = projectedCoordinateNames.x, xMiddle = projectedCoordinateNames.xMiddle, yMiddle = projectedCoordinateNames.yMiddle, yTop = projectedCoordinateNames.yTop, yBottom = projectedCoordinateNames.yBottom;
    var showLinePoints = baseShowLinePoints === true ? undefined : baseShowLinePoints;
    var whichPoints = {
        top: yTop,
        bottom: yBottom
    };
    var whichWay = whichPoints[showLinePoints];
    var mappedPoints = [];
    data.forEach(function (d, i) {
        var dX = xScale(d[xMiddle] !== undefined ? d[xMiddle] : d[x]);
        var dY = yScale(d[whichWay] !== undefined
            ? d[whichWay]
            : d[yMiddle] !== undefined
                ? d[yMiddle]
                : d[y]);
        var pointAriaLabel = "Point at x " + d.x + " and y " + d.y;
        // CUSTOM MARK IMPLEMENTATION
        var renderedCustomMark = !customMark
            ? undefined
            : React.isValidElement(customMark)
                ? customMark
                : customMark({ d: d.data, xy: d, i: i, xScale: xScale, yScale: yScale });
        var markProps = customMark
            ? Object.assign(baseMarkProps, renderedCustomMark.props, {
                "aria-label": pointAriaLabel
            })
            : __assign(__assign({}, baseMarkProps), { key: "piece-" + i, markType: "circle", r: 2, "aria-label": pointAriaLabel });
        if (renderedCustomMark &&
            renderedCustomMark.props &&
            !renderedCustomMark.props.markType &&
            (!canvasRender || canvasRender(d.data, i) !== true)) {
            mappedPoints.push(React.createElement("g", { transform: "translate(" + dX + "," + dY + ")", key: renderKeyFn ? renderKeyFn(d.data, i) : "custom-point-mark-" + i, style: styleFn ? styleFn(d.data, i) : {}, className: classFn ? classFn(d.data, i) : "" }, renderedCustomMark));
        }
        else {
            if (canvasRender && canvasRender(d.data, i) === true) {
                var canvasPoint = {
                    type: "point",
                    baseClass: "frame-piece",
                    tx: dX,
                    ty: dY,
                    d: d,
                    i: i,
                    markProps: markProps,
                    styleFn: styleFn,
                    renderFn: renderMode,
                    classFn: classFn
                };
                canvasDrawing.push(canvasPoint);
            }
            else {
                var yCoordinates = Array.isArray(d[y])
                    ? d[y].map(function (p) { return yScale(p); })
                    : [dY];
                yCoordinates.forEach(function (yc, yi) {
                    var xCoordinates = Array.isArray(d[x])
                        ? d[x].map(function (p) { return xScale(p); })
                        : [dX];
                    xCoordinates.forEach(function (xc, xi) {
                        mappedPoints.push(clonedAppliedElement({
                            baseClass: "frame-piece",
                            tx: xc,
                            ty: yc,
                            d: (d.data && __assign(__assign({}, d), d.data)) || d,
                            i: yi === 0 && xi === 0 ? i : i + "-" + yi + "-" + xi,
                            markProps: markProps,
                            styleFn: styleFn,
                            renderFn: renderMode,
                            renderKeyFn: renderKeyFn,
                            classFn: classFn,
                            yi: yi
                        }));
                    });
                });
            }
        }
    });
    return mappedPoints;
}
exports.createPoints = createPoints;
function createLines(_a) {
    var xScale = _a.xScale, yScale = _a.yScale, canvasDrawing = _a.canvasDrawing, data = _a.data, projectedCoordinateNames = _a.projectedCoordinateNames, customMark = _a.customMark, canvasRender = _a.canvasRender, styleFn = _a.styleFn, classFn = _a.classFn, renderMode = _a.renderMode, renderKeyFn = _a.renderKeyFn, type = _a.type, defined = _a.defined, baseMarkProps = _a.baseMarkProps, ariaLabel = _a.ariaLabel, _b = _a.axesData, axesData = _b === void 0 ? [] : _b;
    var xAxis = axesData.find(function (d) { return d.orient === "bottom" || d.orient === "top"; });
    var yAxis = axesData.find(function (d) { return d.orient === "left" || d.orient === "right"; });
    var xAxisFormatter = (xAxis && xAxis.tickFormat) || (function (d) { return d; });
    var yAxisFormatter = (yAxis && yAxis.tickFormat) || (function (d) { return d; });
    var customLine = typeof type === "object" ? type : { type: type };
    var interpolator = typeof customLine.interpolator === "string"
        ? exports.curveHash[customLine.interpolator]
        : customLine.interpolator || d3_shape_1.curveLinear;
    var lineGenerator = customLine.simpleLine ? d3_shape_1.line() : d3_shape_1.area();
    lineGeneratorDecorator({
        projectedCoordinateNames: projectedCoordinateNames,
        defined: defined,
        interpolator: interpolator,
        generator: lineGenerator,
        xScale: xScale,
        yScale: yScale,
        simpleLine: customLine.simpleLine
    });
    var dynamicLineGenerator = (interpolator.dynamicInterpolator &&
        (function (d, i) {
            var dynLineGenerator = d3_shape_1.area();
            lineGeneratorDecorator({
                projectedCoordinateNames: projectedCoordinateNames,
                defined: defined,
                interpolator: interpolator.dynamicInterpolator(d, i),
                generator: dynLineGenerator,
                xScale: xScale,
                yScale: yScale,
                simpleLine: customLine.simpleLine
            });
            return dynLineGenerator;
        })) ||
        (function () { return lineGenerator; });
    var mappedLines = [];
    data.forEach(function (d, i) {
        if (customMark && typeof customMark === "function") {
            //shim to make customLineMark work until Semiotic 2
            var compatibleData = __assign(__assign({}, d), { data: d.data.map(function (p) { return (__assign(__assign({}, p.data), p)); }) });
            mappedLines.push(customMark({ d: compatibleData, i: i, xScale: xScale, yScale: yScale, canvasDrawing: canvasDrawing }));
        }
        else {
            var builtInDisplayProps = {};
            if (customLine.simpleLine) {
                builtInDisplayProps.fill = "none";
                builtInDisplayProps.stroke = "black";
            }
            var pathString = dynamicLineGenerator(d, i)(d.data.map(function (p) { return Object.assign({}, p.data, p); }));
            var markProps = __assign(__assign(__assign({}, builtInDisplayProps), baseMarkProps), { markType: "path", d: pathString, "aria-label": d.data &&
                    d.data.length > 0 &&
                    d.data.length + " point " + ariaLabel.items + " starting value " + yAxisFormatter(d.data[0].y) + " at " + xAxisFormatter(d.data[0].x) + " ending value " + yAxisFormatter(d.data[d.data.length - 1].y) + " at " + xAxisFormatter(d.data[d.data.length - 1].x) });
            if (canvasRender && canvasRender(d, i) === true) {
                var canvasLine = {
                    type: "line",
                    baseClass: "xyframe-line",
                    tx: 0,
                    ty: 0,
                    d: d,
                    i: i,
                    markProps: markProps,
                    styleFn: styleFn,
                    renderFn: renderMode,
                    classFn: classFn
                };
                canvasDrawing.push(canvasLine);
            }
            else {
                mappedLines.push(clonedAppliedElement({
                    baseClass: "xyframe-line",
                    d: d,
                    i: i,
                    markProps: markProps,
                    styleFn: styleFn,
                    renderFn: renderMode,
                    renderKeyFn: renderKeyFn,
                    classFn: classFn
                }));
            }
        }
    });
    if (customLine.type === "difference" && data.length === 2) {
        //Create the overlay line for the difference chart
        var diffdataA = data[0].data.map(function (basedata, baseI) {
            var linePoint = basedata.yTop > data[1].data[baseI].yTop
                ? basedata.yTop
                : basedata.yBottom;
            return {
                x: basedata.x,
                y: linePoint,
                yBottom: linePoint,
                yTop: linePoint
            };
        });
        var diffdataB = data[0].data.map(function (basedata, baseI) {
            var linePoint = data[1].data[baseI].yTop > basedata.yTop
                ? data[1].data[baseI].yTop
                : data[1].data[baseI].yBottom;
            return {
                x: basedata.x,
                y: linePoint,
                yBottom: linePoint,
                yTop: linePoint
            };
        });
        var doClassname = classFn
            ? "xyframe-line " + classFn(diffdataA)
            : "xyframe-line";
        var overLine = d3_shape_1.line();
        lineGeneratorDecorator({
            projectedCoordinateNames: projectedCoordinateNames,
            defined: defined,
            interpolator: interpolator,
            generator: overLine,
            xScale: xScale,
            yScale: yScale,
            simpleLine: true
        });
        //      let baseStyle = props.lineStyle ? props.lineStyle(diffdata, 0) : {}
        var diffOverlayA = (React.createElement(semiotic_mark_1.Mark, { key: "xyline-diff-a", className: doClassname + " difference-overlay-a", markType: "path", d: overLine(diffdataA), style: { fill: "none", pointerEvents: "none" } }));
        mappedLines.push(diffOverlayA);
        var diffOverlayB = (React.createElement(semiotic_mark_1.Mark, { key: "xyline-diff-b", className: doClassname + " difference-overlay-b", markType: "path", d: overLine(diffdataB), style: { fill: "none", pointerEvents: "none" } }));
        mappedLines.push(diffOverlayB);
    }
    return mappedLines;
}
exports.createLines = createLines;
function createSummaries(_a) {
    var xScale = _a.xScale, yScale = _a.yScale, canvasDrawing = _a.canvasDrawing, data = _a.data, canvasRender = _a.canvasRender, styleFn = _a.styleFn, classFn = _a.classFn, renderKeyFn = _a.renderKeyFn, renderMode = _a.renderMode, baseMarkProps = _a.baseMarkProps, customMark = _a.customMark;
    var summaryClass = classFn || (function () { return ""; });
    var summaryStyle = styleFn || (function () { return ({}); });
    var renderFn = renderMode;
    if (!Array.isArray(data)) {
        data = [data];
    }
    var renderedSummaries = [];
    data.forEach(function (d, i) {
        var className = "xyframe-summary";
        if (summaryClass) {
            className = "xyframe-summary " + summaryClass(d);
        }
        var drawD = "";
        var shouldBeValid = false;
        if (typeof d.customMark === "string" ||
            React.isValidElement(d.customMark)) {
            drawD = d.customMark;
            shouldBeValid = true;
        }
        else if (d.type === "MultiPolygon") {
            var polycoords = d.coordinates;
            polycoords.forEach(function (coord) {
                coord.forEach(function (c) {
                    drawD += "M" + c
                        .map(function (p) { return xScale(p[0]) + "," + yScale(p[1]); })
                        .join("L") + "Z ";
                });
            });
        }
        else if (customMark) {
            var xyfCoords = d._xyfCoordinates;
            var projectedCoordinates = xyfCoords.map(function (p) { return [
                xScale(p[0]),
                yScale(p[1])
            ]; });
            // CUSTOM MARK IMPLEMENTATION
            drawD = customMark({
                d: d,
                i: i,
                classFn: summaryClass,
                styleFn: summaryStyle,
                renderFn: renderFn,
                projectedCoordinates: projectedCoordinates,
                xScale: xScale,
                yScale: yScale,
                bounds: areaDrawing_1.shapeBounds(projectedCoordinates)
            });
            shouldBeValid = true;
        }
        else {
            var xyfCoords = d._xyfCoordinates;
            if (d.curve) {
                var lineDrawing = d3_shape_1.line()
                    .x(function (d) { return xScale(d[0]); })
                    .y(function (d) { return yScale(d[1]); })
                    .curve(d.curve);
                drawD = lineDrawing(xyfCoords);
            }
            else {
                drawD = "M" + xyfCoords
                    .map(function (p) { return xScale(p[0]) + "," + yScale(p[1]); })
                    .join("L") + "Z";
            }
        }
        var renderKey = renderKeyFn ? renderKeyFn(d, i) : "summary-" + i;
        if (shouldBeValid && React.isValidElement(drawD)) {
            renderedSummaries.push(drawD);
        }
        else if (canvasRender && canvasRender(d, i) === true) {
            var canvasSummary = {
                type: "summary",
                baseClass: "xyframe-summary",
                tx: 0,
                ty: 0,
                d: d,
                i: i,
                markProps: { markType: "path", d: drawD },
                styleFn: summaryStyle,
                renderFn: renderFn,
                classFn: function () { return className; }
            };
            canvasDrawing.push(canvasSummary);
        }
        else {
            renderedSummaries.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { key: renderKey, forceUpdate: true, renderMode: renderFn ? renderFn(d, i) : undefined, className: className, markType: "path", d: drawD, style: summaryStyle(d, i) })));
        }
    });
    return renderedSummaries;
}
exports.createSummaries = createSummaries;
function clonedAppliedElement(_a) {
    var tx = _a.tx, ty = _a.ty, d = _a.d, i = _a.i, markProps = _a.markProps, styleFn = _a.styleFn, renderFn = _a.renderFn, classFn = _a.classFn, renderKeyFn = _a.renderKeyFn, baseClass = _a.baseClass, yi = _a.yi;
    markProps.style = styleFn ? styleFn(d, i, yi) : {};
    markProps.className = baseClass;
    markProps.key = renderKeyFn
        ? renderKeyFn(d, i, yi)
        : baseClass + "-" + (d.key === undefined ? i : d.key);
    if (tx || ty) {
        markProps.transform = "translate(" + (tx || 0) + "," + (ty || 0) + ")";
    }
    if (classFn) {
        markProps.className = baseClass + " " + classFn(d, i, yi);
    }
    if (markProps.style.r) {
        markProps.r = markProps.style.r;
    }
    if (!markProps.markType) {
        var RenderableMark = markProps;
        return React.createElement(RenderableMark);
    }
    markProps.renderMode = renderFn ? renderFn(d, i, yi) : undefined;
    return React.createElement(semiotic_mark_1.Mark, __assign({}, markProps));
}
exports.clonedAppliedElement = clonedAppliedElement;
//# sourceMappingURL=general.js.map