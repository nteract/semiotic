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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
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
var SvgHelper_1 = require("../svg/SvgHelper");
var semiotic_mark_1 = require("semiotic-mark");
var Axis_1 = __importDefault(require("../Axis"));
var summaryLayouts_1 = require("./summaryLayouts");
var axis_1 = require("../visualizationLayerBehavior/axis");
var d3_scale_1 = require("d3-scale");
var extent = function (inputArray) {
    return inputArray.reduce(function (p, c) {
        //      return [Math.min(c, p[0]), Math.max(c, p[1])]
        return [0, Math.max(c, p[1])];
    }, [Infinity, -Infinity]);
};
function roundToTenth(number) {
    return Math.round(number * 10) / 10;
}
exports.circlePath = function (cx, cy, r) {
    return [
        "M",
        roundToTenth(cx - r),
        roundToTenth(cy),
        "a",
        r,
        r,
        0,
        1,
        0,
        r * 2,
        0,
        "a",
        r,
        r,
        0,
        1,
        0,
        -(r * 2),
        0
    ].join(" ") + "Z";
};
exports.drawMarginPath = function (_a) {
    var margin = _a.margin, size = _a.size, _b = _a.inset, inset = _b === void 0 ? 0 : _b;
    var iSize = [size[0] - inset, size[1] - inset];
    return "M0,0 h" + size[0] + " v" + size[1] + " h-" + size[0] + "Z M" + (margin.left -
        inset) + "," + (margin.top - inset) + " v" + (size[1] +
        inset * 2 -
        margin.top -
        margin.bottom) + " h" + (iSize[0] +
        inset * 3 -
        margin.left -
        margin.right) + " v-" + (iSize[1] + inset * 3 - margin.top - margin.bottom) + "Z";
};
exports.calculateMargin = function (_a) {
    var margin = _a.margin, axes = _a.axes, title = _a.title, oLabel = _a.oLabel, projection = _a.projection, size = _a.size;
    if (margin !== undefined) {
        if (typeof margin === "function") {
            margin = margin({ size: size });
        }
        if (typeof margin !== "object") {
            return { top: margin, bottom: margin, left: margin, right: margin };
        }
        else if (typeof margin === "object") {
            return Object.assign({ top: 0, bottom: 0, left: 0, right: 0 }, margin);
        }
    }
    var finalMargin = { top: 0, bottom: 0, left: 0, right: 0 };
    var orient = "left";
    if (axes && projection !== "radial") {
        axes.forEach(function (axisObj) {
            var axisObjAdditionMargin = axisObj.label ? 60 : 50;
            orient = axisObj.orient;
            finalMargin[orient] = axisObjAdditionMargin;
        });
    }
    if (title.title &&
        !(typeof title.title === "string" && title.title.length === 0)) {
        var _b = title.orient, orient_1 = _b === void 0 ? "top" : _b;
        finalMargin[orient_1] += 40;
    }
    if (oLabel && projection !== "radial") {
        if (orient === "bottom" || orient === "top") {
            finalMargin.left += 50;
        }
        else {
            finalMargin.bottom += 50;
        }
    }
    return finalMargin;
};
function objectifyType(type) {
    if (type instanceof Function || typeof type === "string") {
        return { type: type };
    }
    else if (type === undefined) {
        return {};
    }
    return type;
}
exports.objectifyType = objectifyType;
function generateOrdinalFrameEventListeners(customHoverBehavior, customClickBehavior) {
    var eventListenersGenerator = function () { return ({}); };
    if (customHoverBehavior || customClickBehavior) {
        eventListenersGenerator = function (d, i) { return ({
            onMouseEnter: customHoverBehavior
                ? function () { return customHoverBehavior(d, i); }
                : undefined,
            onMouseLeave: customHoverBehavior
                ? function () { return customHoverBehavior(undefined); }
                : undefined,
            onClick: customClickBehavior
                ? function () { return customClickBehavior(d, i); }
                : undefined
        }); };
    }
    return eventListenersGenerator;
}
exports.generateOrdinalFrameEventListeners = generateOrdinalFrameEventListeners;
function keyAndObjectifyBarData(_a) {
    var data = _a.data, _b = _a.renderKey, renderKey = _b === void 0 ? function (d, i) { return i; } : _b, oAccessor = _a.oAccessor, baseRAccessor = _a.rAccessor, originalRAccessor = _a.originalRAccessor, originalOAccessor = _a.originalOAccessor, _c = _a.multiAxis, multiAxis = _c === void 0 ? false : _c;
    var rAccessor;
    var multiExtents;
    if (multiAxis && baseRAccessor.length > 1) {
        multiExtents = baseRAccessor.map(function (accessor) { return extent(data.map(accessor)); });
        var rScales = multiExtents.map(function (ext) {
            return d3_scale_1.scaleLinear()
                .domain(ext)
                .range([0, 1]);
        });
        rAccessor = rScales.map(function (scale, i) { return function (d) {
            return scale(baseRAccessor[i](d));
        }; });
    }
    else {
        rAccessor = baseRAccessor;
    }
    var decoratedData = [];
    oAccessor.forEach(function (actualOAccessor, oIndex) {
        rAccessor.forEach(function (actualRAccessor, rIndex) {
            ;
            (data || []).forEach(function (d) {
                var appliedKey = renderKey(d, decoratedData.length);
                var originalR = originalRAccessor[rIndex];
                var originalO = originalOAccessor[oIndex];
                var rName = typeof originalR === "string" ? originalR : "function-" + rIndex;
                var oName = typeof originalO === "string" ? originalO : "function-" + oIndex;
                if (typeof d !== "object") {
                    var expandedData = { value: d, renderKey: appliedKey };
                    var value = actualRAccessor(expandedData);
                    decoratedData.push({
                        data: expandedData,
                        value: value,
                        rIndex: rIndex,
                        rName: rName,
                        oIndex: oIndex,
                        oName: oName,
                        column: (appliedKey !== undefined &&
                            appliedKey.toString &&
                            appliedKey.toString()) ||
                            appliedKey,
                        renderKey: appliedKey
                    });
                }
                else {
                    var value = actualRAccessor(d);
                    decoratedData.push({
                        renderKey: appliedKey,
                        data: d,
                        rIndex: rIndex,
                        rName: rName,
                        oIndex: oIndex,
                        oName: oName,
                        value: value,
                        column: actualOAccessor(d)
                    });
                }
            });
        });
    });
    return { allData: decoratedData, multiExtents: multiExtents };
}
exports.keyAndObjectifyBarData = keyAndObjectifyBarData;
function adjustedPositionSize(_a) {
    var _b = _a.size, size = _b === void 0 ? [500, 500] : _b, _c = _a.position, position = _c === void 0 ? [0, 0] : _c, margin = _a.margin, projection = _a.projection;
    var heightAdjust = margin.top + margin.bottom;
    var widthAdjust = margin.left + margin.right;
    var adjustedPosition = [position[0], position[1]];
    var adjustedSize = [size[0] - widthAdjust, size[1] - heightAdjust];
    if (projection === "radial") {
        var minSize = Math.min(adjustedSize[0], adjustedSize[1]);
        adjustedSize = [minSize, minSize];
    }
    return { adjustedPosition: adjustedPosition, adjustedSize: adjustedSize };
}
exports.adjustedPositionSize = adjustedPositionSize;
function generateFrameTitle(_a) {
    var _b = _a.title, rawTitle = _b === void 0 ? { title: "", orient: "top" } : _b, size = _a.size;
    var finalTitle = null;
    var title = rawTitle.title, _c = rawTitle.orient, orient = _c === void 0 ? "top" : _c;
    var x = 0, y = 0, transform;
    switch (orient) {
        case "top":
            x = size[0] / 2;
            y = 25;
            break;
        case "bottom":
            x = size[0] / 2;
            y = size[1] - 25;
            break;
        case "left":
            x = 25;
            y = size[1] / 2;
            transform = "rotate(-90)";
            break;
        case "right":
            x = size[0] - 25;
            y = size[1] / 2;
            transform = "rotate(90)";
            break;
    }
    var gTransform = "translate(" + x + "," + y + ")";
    if (typeof title === "string" && title.length > 0) {
        finalTitle = (React.createElement("g", { transform: gTransform },
            React.createElement("text", { className: "frame-title", transform: transform, style: { textAnchor: "middle", pointerEvents: "none" } }, title)));
    }
    else if (title) {
        //assume if defined then its an svg mark of some sort
        finalTitle = React.createElement("g", { transform: gTransform }, title);
    }
    return finalTitle;
}
exports.generateFrameTitle = generateFrameTitle;
function orFrameConnectionRenderer(_a) {
    var e_1, _b;
    var type = _a.type, data = _a.data, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, classFn = _a.classFn, projection = _a.projection, canvasRender = _a.canvasRender, canvasDrawing = _a.canvasDrawing, baseMarkProps = _a.baseMarkProps, pieceType = _a.pieceType;
    if (!type.type) {
        return null;
    }
    var renderedConnectorMarks = [];
    var radarHash = new Map();
    if (typeof type.type === "function") {
        var connectionRule_1 = type.type;
        var keys_1 = Object.keys(data);
        keys_1.forEach(function (key, pieceArrayI) {
            var pieceArray = data[key];
            var nextColumn = data[keys_1[pieceArrayI + 1]];
            if (nextColumn) {
                var matchArray_1 = nextColumn.map(function (d, i) {
                    return connectionRule_1(__assign(__assign({}, d.piece), d.piece.data), i);
                });
                pieceArray.forEach(function (piece, pieceI) {
                    var thisConnectionPiece = connectionRule_1(__assign(__assign({}, piece.piece), piece.piece.data), pieceI);
                    var targetMatch = connectionRule_1(__assign(__assign({}, piece.piece), piece.piece.data), pieceI);
                    var matchingPieceIndex = targetMatch !== undefined &&
                        targetMatch !== false &&
                        matchArray_1.indexOf(targetMatch);
                    if (thisConnectionPiece !== undefined &&
                        thisConnectionPiece !== null &&
                        matchingPieceIndex !== false &&
                        matchingPieceIndex !== -1) {
                        var matchingPiece = nextColumn[matchingPieceIndex];
                        var markD = void 0;
                        if (projection === "radial" && pieceType.type === "point") {
                            if (!radarHash.get(piece)) {
                                radarHash.set(piece, [piece]);
                            }
                            var thisRadar = radarHash.get(piece);
                            if (thisRadar) {
                                thisRadar.push(matchingPiece);
                                radarHash.set(matchingPiece, thisRadar);
                                radarHash.delete(piece);
                            }
                        }
                        else {
                            var xy = piece.xy;
                            var mxy = matchingPiece.xy;
                            var x = xy.x, y = xy.y, _a = xy.height, height = _a === void 0 ? 1 : _a, _b = xy.width, width = _b === void 0 ? 1 : _b;
                            var mx = mxy.x, my = mxy.y, _c = mxy.height, mheight = _c === void 0 ? 1 : _c, _d = mxy.width, mwidth = _d === void 0 ? 1 : _d;
                            if (projection === "vertical") {
                                markD = SvgHelper_1.drawAreaConnector({
                                    x1: x + width,
                                    x2: mx,
                                    y1: y,
                                    y2: my,
                                    sizeX1: 0,
                                    sizeX2: 0,
                                    sizeY1: height,
                                    sizeY2: mheight
                                });
                            }
                            else if (projection === "horizontal") {
                                markD = SvgHelper_1.drawAreaConnector({
                                    x1: x,
                                    x2: mx,
                                    y1: y + height,
                                    y2: my,
                                    sizeX1: width,
                                    sizeX2: mwidth,
                                    sizeY1: 0,
                                    sizeY2: 0
                                });
                            }
                            else if (projection === "radial") {
                                markD = SvgHelper_1.drawAreaConnector({
                                    x1: x,
                                    x2: mx,
                                    y1: y + height,
                                    y2: my,
                                    sizeX1: width,
                                    sizeX2: mwidth,
                                    sizeY1: 0,
                                    sizeY2: 0
                                });
                            }
                            var renderValue = renderMode && renderMode(piece.piece, pieceI);
                            var source = __assign(__assign({}, piece.piece.data), piece.piece.data);
                            var target = __assign(__assign({}, matchingPiece.piece), matchingPiece.piece.data);
                            var calculatedStyle = styleFn({
                                source: source,
                                target: target
                            });
                            var eventListeners = eventListenersGenerator({ source: source, target: target }, pieceI);
                            if (canvasRender && canvasRender(piece.piece) === true) {
                                var canvasConnector = {
                                    baseClass: "xyframe-line",
                                    tx: 0,
                                    ty: 0,
                                    d: {
                                        source: source,
                                        target: target
                                    },
                                    markProps: { d: markD, markType: "path" },
                                    styleFn: styleFn,
                                    renderFn: renderMode,
                                    classFn: classFn
                                };
                                canvasDrawing.push(canvasConnector);
                            }
                            else {
                                renderedConnectorMarks.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, eventListeners, { renderMode: renderValue, markType: "path", d: markD, className: classFn ? classFn(piece.piece.data, pieceI) : "", key: "connector" + piece.piece.renderKey, style: calculatedStyle })));
                            }
                        }
                    }
                });
            }
        });
        if (radarHash.size > 0) {
            try {
                for (var _c = __values(radarHash.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var ring = _d.value;
                    var ringPiece = __assign(__assign({}, ring[0].piece), ring[0].piece.data);
                    var markD = "M" + ring.map(function (d) { return d.xy.x + "," + d.xy.y; }).join("L") + "Z";
                    if (canvasRender && canvasRender(ringPiece)) {
                        var canvasRadar = {
                            baseClass: "ordinal-radar",
                            tx: 0,
                            ty: 0,
                            d: {
                                source: ringPiece
                            },
                            markProps: { d: markD, markType: "path" },
                            styleFn: styleFn,
                            renderFn: renderMode,
                            classFn: classFn
                        };
                        canvasDrawing.push(canvasRadar);
                    }
                    else {
                        renderedConnectorMarks.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode && renderMode(ringPiece), markType: "path", d: markD, className: classFn ? classFn(ringPiece) : "", key: "ordinal-ring-" + ringPiece.renderKey, style: styleFn({
                                source: ringPiece
                            }) })));
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    }
    else if (type.type) {
        console.error("Invalid connectorType - Must be a function that takes a data point and determines if it is connected to a data point in the next column");
    }
    return renderedConnectorMarks;
}
exports.orFrameConnectionRenderer = orFrameConnectionRenderer;
var summaryRenderHash = {
    contour: summaryLayouts_1.contourRenderFn,
    boxplot: summaryLayouts_1.boxplotRenderFn,
    violin: summaryLayouts_1.bucketizedRenderingFn,
    heatmap: summaryLayouts_1.bucketizedRenderingFn,
    ridgeline: summaryLayouts_1.bucketizedRenderingFn,
    histogram: summaryLayouts_1.bucketizedRenderingFn,
    horizon: summaryLayouts_1.bucketizedRenderingFn
};
function orFrameSummaryRenderer(_a) {
    var data = _a.data, type = _a.type, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, classFn = _a.classFn, projection = _a.projection, adjustedSize = _a.adjustedSize, chartSize = _a.chartSize, baseMarkProps = _a.baseMarkProps, margin = _a.margin;
    var summaryRenderFn;
    if (typeof type.type === "function") {
        summaryRenderFn = type.type;
    }
    else if (summaryRenderHash[type.type]) {
        summaryRenderFn = summaryRenderHash[type.type];
    }
    else {
        console.error("Invalid summary type: " + type.type + " - Must be a function or one of the following strings: " + Object.keys(summaryRenderHash).join(", "));
        return {};
    }
    return summaryRenderFn({
        data: data,
        type: type,
        renderMode: renderMode,
        eventListenersGenerator: eventListenersGenerator,
        styleFn: styleFn,
        classFn: classFn,
        projection: projection,
        adjustedSize: adjustedSize,
        chartSize: chartSize,
        baseMarkProps: baseMarkProps,
        margin: margin
    });
}
exports.orFrameSummaryRenderer = orFrameSummaryRenderer;
exports.orFrameAxisGenerator = function (_a) {
    var projection = _a.projection, axis = _a.axis, adjustedSize = _a.adjustedSize, size = _a.size, rScale = _a.rScale, rScaleType = _a.rScaleType, pieceType = _a.pieceType, rExtent = _a.rExtent, data = _a.data, _b = _a.maxColumnValues, maxColumnValues = _b === void 0 ? 1 : _b, xyData = _a.xyData, margin = _a.margin;
    if (!axis)
        return { axis: undefined, axesTickLines: undefined };
    var generatedAxis, axesTickLines;
    if (projection !== "radial" && axis) {
        axesTickLines = [];
        var axisPosition_1 = [0, 0];
        generatedAxis = axis.map(function (d, i) {
            var axisClassname = d.className || "";
            var tickValues;
            var axisDomain = d.extentOverride ? d.extentOverride : rScale.domain();
            var leftRight = ["left", "right"];
            var axisScale = (leftRight.indexOf(d.orient) === -1 && projection !== "vertical") ||
                (leftRight.indexOf(d.orient) !== -1 && projection !== "horizontal")
                ? rScaleType.domain(axisDomain)
                : rScaleType.domain([0, maxColumnValues]);
            var orient = d.orient;
            var axisRange = (leftRight.indexOf(d.orient) === -1 && projection !== "vertical") ||
                (leftRight.indexOf(d.orient) !== -1 && projection !== "horizontal")
                ? rScale.range()
                : [0, projection === "vertical" ? adjustedSize[0] : adjustedSize[1]];
            if (orient === "right") {
                axisScale.range(axisRange.reverse());
                axisClassname += " right y";
            }
            else if (orient === "left") {
                axisClassname += " left y";
                axisScale.range(axisRange.reverse());
            }
            else if (orient === "top") {
                axisClassname += " top x";
                axisScale.range(axisRange);
            }
            else if (orient === "bottom") {
                axisClassname += " bottom x";
                axisScale.range(axisRange);
            }
            if (d.tickValues && Array.isArray(d.tickValues)) {
                tickValues = d.tickValues;
            }
            else if (d.tickValues instanceof Function) {
                //otherwise assume a function
                tickValues = d.tickValues(data, size, rScale);
            }
            var axisParts = axis_1.axisPieces({
                padding: d.padding,
                tickValues: tickValues,
                scale: axisScale,
                ticks: d.ticks,
                orient: orient,
                size: adjustedSize,
                footer: d.footer,
                tickSize: d.tickSize,
                jaggedBase: d.jaggedBase
            });
            var axisTickLines = axis_1.axisLines({
                className: d.className,
                axisParts: axisParts,
                orient: orient,
                baseMarkProps: {},
                tickLineGenerator: d.tickLineGenerator,
                jaggedBase: d.jaggedBase,
                scale: axisScale
            });
            axesTickLines.push(axisTickLines);
            if (d.baseline === "under") {
                axesTickLines.push(axis_1.baselineGenerator(d.orient, adjustedSize, d.className));
            }
            var marginalSummaryType = typeof d.marginalSummaryType === "string"
                ? { type: d.marginalSummaryType }
                : d.marginalSummaryType;
            return (React.createElement(Axis_1.default, __assign({}, d, { key: d.key || "orframe-axis-" + i, axisParts: axisParts, orient: orient, size: adjustedSize, position: axisPosition_1, tickValues: tickValues, scale: axisScale, className: axisClassname, marginalSummaryType: marginalSummaryType, margin: margin, xyPoints: xyData.map(function (d) { return ({
                    x: projection === "vertical" ? 0 : d.value,
                    y: projection === "vertical" ? d.value : 0,
                    data: d.data
                }); }) })));
        });
    }
    else if (projection === "radial" && axis) {
        var _c = pieceType.innerRadius, innerRadius_1 = _c === void 0 ? 0 : _c;
        var ticks_1 = [];
        axis.forEach(function (axisObj) {
            var _a = axisObj.tickValues, baseTickValues = _a === void 0 ? rScale.ticks(Math.max(2, (adjustedSize[0] / 2 - innerRadius_1) / 50)) : _a, label = axisObj.label, _b = axisObj.tickFormat, tickFormat = _b === void 0 ? function (d) { return d; } : _b;
            var tickScale = rScaleType
                .domain(rExtent)
                .range([innerRadius_1, adjustedSize[0] / 2]);
            var tickValues = baseTickValues instanceof Function
                ? baseTickValues({
                    orient: axisObj.orient
                })
                : baseTickValues;
            tickValues.forEach(function (t, i) {
                var tickSize = tickScale(t);
                if (!(innerRadius_1 === 0 && t === 0)) {
                    var axisLabel = void 0;
                    var ref = "";
                    if (label && i === tickValues.length - 1) {
                        var labelSettings = typeof label === "string"
                            ? { name: label, locationDistance: 15 }
                            : label;
                        var _a = labelSettings.locationDistance, locationDistance = _a === void 0 ? 15 : _a;
                        ref = Math.random().toString() + " ";
                        axisLabel = (React.createElement("g", { className: "axis-label radial", transform: "translate(0," + locationDistance + ")" },
                            React.createElement("text", { textAnchor: "middle" },
                                React.createElement("textPath", { startOffset: tickSize * Math.PI * 0.5, xlinkHref: "#" + ref }, label.name))));
                    }
                    ticks_1.push(React.createElement("g", { key: "orframe-radial-axis-element-" + t, className: "axis axis-label axis-tick radial", transform: "translate(0,0)" },
                        React.createElement("path", { id: ref, d: exports.circlePath(0, 0, tickSize), r: tickSize, stroke: "gray", fill: "none" }),
                        React.createElement("text", { y: -tickSize + 5, textAnchor: "middle" }, tickFormat(t)),
                        axisLabel));
                }
                return undefined;
            });
        });
        generatedAxis = [
            React.createElement("g", { key: axis[0].key || "orframe-radial-axis-container", className: "axis-labels", transform: "translate(" + adjustedSize[0] / 2 + "," + adjustedSize[1] / 2 + ")" }, ticks_1)
        ];
    }
    return { axis: generatedAxis, axesTickLines: axesTickLines };
};
exports.canvasEvent = function (canvasContext, overlayRegions, canvasMap, e) {
    var interactionContext = canvasContext.getContext("2d");
    var hoverPoint = interactionContext.getImageData(e.offsetX, e.offsetY, 1, 1);
    var mostCommonRGB = "rgba(" + hoverPoint.data[0] + "," + hoverPoint.data[1] + "," + hoverPoint.data[2] + ",255)";
    var overlay = overlayRegions[canvasMap.get(mostCommonRGB)];
    if (!overlay) {
        var hoverArea = interactionContext.getImageData(e.offsetX - 2, e.offsetY - 2, 5, 5);
        var x = 0;
        while (!overlay && x < 100) {
            overlay =
                overlayRegions[canvasMap.get("rgba(" + hoverArea.data[x] + "," + hoverArea.data[x + 1] + "," + hoverArea.data[x + 2] + ",255)")];
            x += 4;
        }
    }
    return overlay;
};
//# sourceMappingURL=frameFunctions.js.map