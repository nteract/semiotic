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
var d3_force_1 = require("d3-force");
var d3_shape_1 = require("d3-shape");
var svg_path_bounding_box_1 = __importDefault(require("svg-path-bounding-box"));
var semiotic_mark_1 = require("semiotic-mark");
var d3_scale_1 = require("d3-scale");
var SvgHelper_1 = require("./SvgHelper");
var twoPI = Math.PI * 2;
var radialBarFeatureGenerator = function (_a) {
    var type = _a.type, ordset = _a.ordset, adjustedSize = _a.adjustedSize, piece = _a.piece, i = _a.i;
    var innerRadius = type.innerRadius;
    var _b = type.offsetAngle, offsetAngle = _b === void 0 ? 0 : _b, _c = type.angleRange, angleRange = _c === void 0 ? [0, 360] : _c;
    var offsetPct = offsetAngle / 360;
    var rangePct = angleRange.map(function (d) { return d / 360; });
    var rangeMod = rangePct[1] - rangePct[0];
    var adjustedPct = rangeMod < 1
        ? d3_scale_1.scaleLinear()
            .domain([0, 1])
            .range(rangePct)
        : function (d) { return d; };
    var innerSize = type.type === "clusterbar"
        ? 0
        : type.type === "timeline"
            ? piece.scaledValue / 2
            : piece.bottom / 2;
    var outerSize = type.type === "clusterbar"
        ? piece.scaledValue / 2
        : type.type === "timeline"
            ? piece.scaledEndValue / 2
            : piece.scaledValue / 2 + piece.bottom / 2;
    if (innerRadius) {
        innerRadius = parseInt(innerRadius, 10);
        var canvasRadius = adjustedSize[0] / 2;
        var donutMod = (canvasRadius - innerRadius) / canvasRadius;
        innerSize = innerSize * donutMod + innerRadius;
        outerSize = outerSize * donutMod + innerRadius;
    }
    var arcGenerator = d3_shape_1.arc()
        .innerRadius(innerSize)
        .outerRadius(outerSize);
    var angle = (type.type === "clusterbar"
        ? (ordset.pct - ordset.pct_padding) / ordset.pieceData.length
        : ordset.pct) * rangeMod;
    var startAngle = adjustedPct(type.type === "clusterbar"
        ? ordset.pct_start +
            (i / ordset.pieceData.length) * (ordset.pct - ordset.pct_padding)
        : ordset.pct === 1
            ? 0
            : ordset.pct_start + offsetPct);
    var endAngle = ordset.pct === 1
        ? rangePct[1]
        : Math.max(startAngle, startAngle + angle - ordset.pct_padding / 2);
    var startAngleFinal = startAngle * twoPI;
    var endAngleFinal = endAngle * twoPI;
    var markD = arcGenerator({
        startAngle: startAngleFinal,
        endAngle: endAngleFinal
    });
    var centroid = arcGenerator.centroid({
        startAngle: startAngleFinal,
        endAngle: endAngleFinal
    });
    var xOffset = adjustedSize[0] / 2;
    var yOffset = adjustedSize[1] / 2;
    var xPosition = centroid[0] + xOffset;
    var yPosition = centroid[1] + yOffset;
    var outerPoint = pointOnArcAtAngle([0, 0], (startAngle + endAngle) / 2, piece.scaledValue / 2);
    var xy = {
        arcGenerator: arcGenerator,
        startAngle: startAngleFinal,
        endAngle: endAngleFinal,
        dx: outerPoint[0],
        dy: outerPoint[1]
    };
    var translate = "translate(" + xOffset + "," + yOffset + ")";
    return {
        xPosition: xPosition,
        yPosition: yPosition,
        xy: xy,
        translate: translate,
        markProps: {
            markType: "path",
            d: markD,
            tx: xOffset,
            ty: yOffset,
            transform: translate,
            customTween: {
                fn: SvgHelper_1.arcTweener,
                props: {
                    startAngle: startAngleFinal,
                    endAngle: endAngleFinal,
                    innerRadius: innerSize,
                    outerRadius: outerSize
                }
            }
        }
    };
};
var iconBarCustomMark = function (_a) {
    var type = _a.type, projection = _a.projection, finalHeight = _a.finalHeight, finalWidth = _a.finalWidth, styleFn = _a.styleFn, renderValue = _a.renderValue, classFn = _a.classFn;
    return function (piece, i, xy) {
        var iconD = typeof type.icon === "string" ? type.icon : type.icon(piece.data, i);
        var _a = type.iconPadding, iconPadding = _a === void 0 ? 1 : _a, _b = type.resize, resize = _b === void 0 ? "auto" : _b;
        var iconBounds = svg_path_bounding_box_1.default(iconD);
        var iconTranslate = [
            0 - iconBounds.x1 + iconPadding,
            0 - iconBounds.y1 + iconPadding
        ];
        iconBounds.height += iconPadding * 2;
        iconBounds.width += iconPadding * 2;
        var icons = [];
        var stackedIconSize = iconBounds.height;
        var stackedIconNumber = 1;
        var iconScale = 1;
        var spaceToUse = projection === "horizontal" ? finalHeight : finalWidth;
        var sizeToFit = projection === "horizontal" ? iconBounds.height : iconBounds.width;
        var sizeToPad = projection === "horizontal" ? iconBounds.width : iconBounds.height;
        var spaceToFill = projection === "horizontal" ? xy.width : xy.height;
        var spaceToStackFill = projection === "horizontal" ? xy.height : xy.width;
        if (resize === "auto") {
            stackedIconSize = spaceToUse / sizeToFit;
            if (stackedIconSize < 1) {
                iconScale = stackedIconSize;
            }
            else {
                stackedIconNumber = Math.floor(stackedIconSize);
                iconScale = 1 + (stackedIconSize - stackedIconNumber) / stackedIconNumber;
            }
        }
        else if (resize === "fixed") {
            iconScale = spaceToUse / sizeToFit;
        }
        //  const finalIconWidth = iconBounds.width * iconScale;
        var finalIconHeight = iconBounds.height * iconScale;
        var spaceToStep = sizeToPad * iconScale;
        var spaceToStackStep = sizeToFit * iconScale;
        iconTranslate[0] = iconTranslate[0] * iconScale;
        iconTranslate[1] = iconTranslate[1] * iconScale;
        var randoClipID = "iso-clip-" + i + "-" + Math.random();
        var clipPath = "url(#" + randoClipID + ")";
        if (xy.width > 0) {
            icons.push(React.createElement("clipPath", { key: randoClipID, id: randoClipID },
                React.createElement("rect", { x: 0, y: 0, width: xy.width, height: xy.height })));
            var iconPieces = [];
            var stepStart = projection === "horizontal" ? 0 : xy.height - finalIconHeight;
            var stepper = projection === "horizontal" ? spaceToStep : -spaceToStep;
            var stepTest = projection === "horizontal"
                ? function (step, spaceToFillValue) { return step < spaceToFillValue; }
                : function (step, spaceToFillValue, stepperValue) { return step > 0 + stepperValue; };
            for (var step = stepStart; stepTest(step, spaceToFill, stepper); step += stepper) {
                for (var stack = 0; stack < spaceToStackFill; stack += spaceToStackStep) {
                    var stepX = projection === "horizontal" ? step : stack;
                    var stepY = projection === "horizontal" ? stack : step;
                    var paddedX = stepX + iconTranslate[0];
                    var paddedY = stepY + iconTranslate[1];
                    iconPieces.push(React.createElement(semiotic_mark_1.Mark, { forceUpdate: true, markType: "path", key: "icon-" + step + "-" + stack, transform: "translate(" + paddedX + "," + paddedY + ") scale(" + iconScale + ")", vectorEffect: "non-scaling-stroke", d: iconD, style: styleFn(__assign(__assign({}, piece), piece.data), i), renderMode: renderValue, className: classFn(__assign(__assign({}, piece), piece.data), i) }));
                }
            }
            icons.push(React.createElement("g", { key: "clipped-region-" + i, clipPath: clipPath }, iconPieces));
        }
        return icons;
    };
};
function pointOnArcAtAngle(center, angle, distance) {
    var radians = Math.PI * (angle + 0.75) * 2;
    var xPosition = center[0] + distance * Math.cos(radians);
    var yPosition = center[1] + distance * Math.sin(radians);
    return [xPosition, yPosition];
}
exports.pointOnArcAtAngle = pointOnArcAtAngle;
function clusterBarLayout(_a) {
    var type = _a.type, data = _a.data, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, projection = _a.projection, classFn = _a.classFn, adjustedSize = _a.adjustedSize, chartSize = _a.chartSize, margin = _a.margin, baseMarkProps = _a.baseMarkProps, rScale = _a.rScale;
    var allCalculatedPieces = [];
    var keys = Object.keys(data);
    keys.forEach(function (key, ordsetI) {
        var ordset = data[key];
        var barColumnWidth = Math.max(ordset.width, 1);
        var clusterWidth = barColumnWidth / ordset.pieceData.length;
        var currentX = 0;
        var currentY = 0;
        var calculatedPieces = ordset.pieceData.map(function (piece, i) {
            var _a;
            var renderValue = renderMode && renderMode(piece.data, i);
            var xPosition = piece.x;
            var yPosition = piece.base;
            var finalWidth = clusterWidth;
            var finalHeight = piece.scaledValue;
            var xy = { x: 0, y: 0 };
            if (!piece.negative) {
                yPosition -= piece.scaledValue;
            }
            if (projection === "horizontal") {
                //TODO: NEGATIVE FOR HORIZONTAL
                yPosition = piece.x;
                xPosition = piece.base;
                finalHeight = clusterWidth;
                finalWidth = piece.scaledValue;
                xy.x = piece.scaledValue;
                if (piece.negative) {
                    xPosition -= piece.scaledValue;
                    xy.x = xPosition;
                }
            }
            var translate, markProps = {};
            if (projection === "radial") {
                ;
                (_a = radialBarFeatureGenerator({
                    type: type,
                    ordset: ordset,
                    adjustedSize: adjustedSize,
                    piece: piece,
                    i: i
                }), xPosition = _a.xPosition, yPosition = _a.yPosition, markProps = _a.markProps, xy = _a.xy);
                xy.x = xPosition;
            }
            else {
                xPosition += currentX;
                yPosition += currentY;
                markProps = {
                    markType: "rect",
                    x: xPosition,
                    y: yPosition,
                    width: Math.max(0, finalWidth),
                    height: Math.max(0, finalHeight),
                    rx: 0,
                    ry: 0
                };
                if (projection === "vertical") {
                    xy.x = xPosition;
                }
            }
            var eventListeners = eventListenersGenerator(piece, i);
            xy.y = yPosition;
            xy.middle = clusterWidth / 2;
            xy.height = finalHeight;
            xy.width = finalWidth;
            if (type.icon && projection !== "radial") {
                type.customMark = iconBarCustomMark({
                    type: type,
                    projection: projection,
                    finalHeight: finalHeight,
                    finalWidth: finalWidth,
                    styleFn: styleFn,
                    renderValue: renderValue,
                    classFn: classFn
                });
            }
            else if (type.icon && projection === "radial") {
                console.error("Icons are currently unsupported on radial charts");
            }
            var renderElementObject = type.customMark ? (React.createElement("g", { key: "piece-" + piece.renderKey, transform: translate ? translate : "translate(" + xPosition + "," + yPosition + ")" }, type.customMark(__assign(__assign(__assign({}, piece.data), piece), { x: xPosition, y: yPosition }), i, __assign(__assign({}, xy), { baseMarkProps: baseMarkProps,
                renderMode: renderMode,
                styleFn: styleFn,
                classFn: classFn,
                adjustedSize: adjustedSize,
                chartSize: chartSize,
                margin: margin,
                rScale: rScale })))) : (__assign(__assign({ className: classFn(__assign(__assign({}, piece), piece.data), i), renderMode: renderValue, key: "piece-" + piece.renderKey, transform: translate, style: styleFn(__assign(__assign({}, piece), piece.data), ordsetI) }, markProps), eventListeners));
            var calculatedPiece = {
                o: key,
                xy: xy,
                piece: piece,
                renderElement: renderElementObject
            };
            if (projection === "horizontal") {
                currentY += finalHeight;
            }
            else {
                currentX += finalWidth;
            }
            //        currentOffset += pieceSize
            return calculatedPiece;
        });
        allCalculatedPieces = __spread(allCalculatedPieces, calculatedPieces);
    });
    return allCalculatedPieces;
}
exports.clusterBarLayout = clusterBarLayout;
function barLayout(_a) {
    var type = _a.type, data = _a.data, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, projection = _a.projection, classFn = _a.classFn, adjustedSize = _a.adjustedSize, chartSize = _a.chartSize, margin = _a.margin, baseMarkProps = _a.baseMarkProps, rScale = _a.rScale;
    var keys = Object.keys(data);
    var allCalculatedPieces = [];
    keys.forEach(function (key, ordsetI) {
        var ordset = data[key];
        var barColumnWidth = Math.max(ordset.width, 1);
        var calculatedPieces = ordset.pieceData.map(function (piece, i) {
            var _a;
            var pieceSize = piece.scaledValue;
            var renderValue = renderMode && renderMode(piece.data, i);
            var xPosition = piece.x;
            var yPosition = piece.bottom;
            var finalWidth = barColumnWidth;
            var finalHeight = pieceSize;
            var xy = {};
            if (!piece.negative) {
                yPosition -= piece.scaledValue;
            }
            if (projection === "vertical") {
                xy = {
                    x: xPosition,
                    y: yPosition,
                    middle: barColumnWidth / 2,
                    height: finalHeight,
                    width: finalWidth
                };
            }
            else if (projection === "horizontal") {
                yPosition = piece.x;
                xPosition = piece.bottom;
                finalHeight = barColumnWidth;
                finalWidth = pieceSize;
                xy = {
                    x: xPosition + piece.scaledValue,
                    y: yPosition,
                    middle: barColumnWidth / 2,
                    height: finalHeight,
                    width: finalWidth
                };
                if (piece.negative) {
                    xPosition = piece.bottom - piece.scaledValue;
                }
            }
            var markProps;
            if (projection === "radial") {
                ;
                (_a = radialBarFeatureGenerator({
                    type: type,
                    ordset: ordset,
                    adjustedSize: adjustedSize,
                    piece: piece,
                    i: i
                }), markProps = _a.markProps, xPosition = _a.xPosition, yPosition = _a.yPosition);
                finalHeight = undefined;
                finalWidth = undefined;
                xy = {
                    x: xPosition,
                    y: yPosition,
                    middle: barColumnWidth / 2,
                    height: finalHeight,
                    width: finalWidth
                };
            }
            else {
                markProps = {
                    markType: "rect",
                    x: xPosition,
                    y: yPosition,
                    width: Math.max(0, finalWidth),
                    height: Math.max(0, finalHeight),
                    rx: 0,
                    ry: 0
                };
            }
            var eventListeners = eventListenersGenerator(piece, i);
            if (type.icon && projection !== "radial") {
                type.customMark = iconBarCustomMark({
                    type: type,
                    projection: projection,
                    finalHeight: finalHeight,
                    finalWidth: finalWidth,
                    styleFn: styleFn,
                    renderValue: renderValue,
                    classFn: classFn
                });
            }
            else if (type.icon && projection !== "horizontal") {
                console.error("Icons are currently unsupported in radial charts");
            }
            var renderElementObject = type.customMark ? (React.createElement("g", { key: "piece-" + piece.renderKey, transform: "translate(" + xPosition + "," + yPosition + ")", role: "img", tabIndex: -1 }, type.customMark(__assign(__assign(__assign({}, piece.data), piece), { x: xPosition, y: yPosition }), i, __assign(__assign({}, xy), { baseMarkProps: baseMarkProps,
                renderMode: renderMode,
                styleFn: styleFn,
                classFn: classFn,
                adjustedSize: adjustedSize,
                chartSize: chartSize,
                margin: margin,
                rScale: rScale })))) : (__assign(__assign({ className: classFn(__assign(__assign({}, piece), piece.data), i), renderMode: renderValue, key: "piece-" + piece.renderKey, style: styleFn(__assign(__assign({}, piece), piece.data), ordsetI) }, eventListeners), markProps));
            var calculatedPiece = {
                o: key,
                xy: xy,
                piece: piece,
                renderElement: renderElementObject
            };
            return calculatedPiece;
        });
        allCalculatedPieces = __spread(allCalculatedPieces, calculatedPieces);
    });
    return allCalculatedPieces;
}
exports.barLayout = barLayout;
function timelineLayout(_a) {
    var type = _a.type, data = _a.data, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, projection = _a.projection, classFn = _a.classFn, adjustedSize = _a.adjustedSize, chartSize = _a.chartSize, margin = _a.margin, baseMarkProps = _a.baseMarkProps, rScale = _a.rScale;
    var allCalculatedPieces = [];
    var keys = Object.keys(data);
    keys.forEach(function (key, ordsetI) {
        var ordset = data[key];
        var calculatedPieces = [];
        ordset.pieceData.forEach(function (piece, i) {
            var scaledValue, scaledBottom;
            var renderValue = renderMode && renderMode(piece.data, i);
            var xPosition = ordset.x;
            var height = piece.scaledEndValue - piece.scaledValue;
            var yPosition = piece.scaledVerticalValue - height;
            var width = ordset.width;
            var markProps = {
                markType: "rect",
                height: height < 0 ? -height : height,
                width: width,
                x: xPosition,
                y: height < 0 ? yPosition + height : yPosition
            };
            if (projection === "horizontal") {
                yPosition = ordset.x;
                xPosition = piece.scaledValue;
                scaledValue = piece.scaledEndValue - piece.scaledValue;
                scaledBottom = piece.scaledBottom;
                width = piece.scaledEndValue - piece.scaledValue;
                height = ordset.width;
                markProps = {
                    markType: "rect",
                    height: height,
                    width: width < 0 ? -width : width,
                    x: width < 0 ? xPosition + width : xPosition,
                    y: yPosition
                };
            }
            else if (projection === "radial") {
                ;
                (markProps = radialBarFeatureGenerator({
                    piece: piece,
                    type: type,
                    ordset: ordset,
                    adjustedSize: adjustedSize,
                    i: i
                }).markProps);
            }
            //Only return the actual piece if you're rendering points, otherwise you just needed to iterate and calculate the points for the contour summary type
            var eventListeners = eventListenersGenerator(piece, i);
            var xy = {
                x: xPosition,
                y: yPosition,
                scaledValue: scaledValue,
                scaledBottom: scaledBottom,
                height: height
            };
            var renderElementObject = type.customMark ? (React.createElement("g", { key: "piece-" + piece.renderKey, transform: "translate(" + xPosition + "," + (yPosition + height) + ")" }, type.customMark(__assign(__assign(__assign({}, piece.data), piece), { x: xPosition, y: yPosition }), i, __assign(__assign({}, xy), { baseMarkProps: baseMarkProps,
                renderMode: renderMode,
                styleFn: styleFn,
                classFn: classFn,
                adjustedSize: adjustedSize,
                chartSize: chartSize,
                margin: margin,
                rScale: rScale })))) : (__assign(__assign({ className: classFn(__assign(__assign({}, piece), piece.data), i), renderMode: renderValue, key: "piece-" + piece.renderKey, style: styleFn(__assign(__assign({}, piece), piece.data), ordsetI) }, markProps), eventListeners));
            var calculatedPiece = {
                o: key,
                xy: xy,
                piece: piece,
                renderElement: renderElementObject
            };
            calculatedPieces.push(calculatedPiece);
        });
        allCalculatedPieces = __spread(allCalculatedPieces, calculatedPieces);
    });
    return allCalculatedPieces;
}
exports.timelineLayout = timelineLayout;
function pointLayout(_a) {
    var type = _a.type, data = _a.data, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, projection = _a.projection, classFn = _a.classFn, adjustedSize = _a.adjustedSize, chartSize = _a.chartSize, margin = _a.margin, baseMarkProps = _a.baseMarkProps, rScale = _a.rScale;
    var circleRadius = type.r || 3;
    var allCalculatedPieces = [];
    var keys = Object.keys(data);
    keys.forEach(function (key, ordsetI) {
        var ordset = data[key];
        var calculatedPieces = [];
        ordset.pieceData.forEach(function (piece, i) {
            var renderValue = renderMode && renderMode(piece.data, i);
            var xPosition = ordset.middle;
            var yPosition = piece.scaledVerticalValue;
            if (projection === "horizontal") {
                yPosition = ordset.middle;
                xPosition = piece.scaledValue;
            }
            else if (projection === "radial") {
                var angle = ordset.pct_middle;
                var rPosition = piece.scaledValue / 2;
                var baseCentroid = pointOnArcAtAngle([adjustedSize[0] / 2, adjustedSize[1] / 2], angle, rPosition);
                xPosition = baseCentroid[0];
                yPosition = baseCentroid[1];
            }
            //Only return the actual piece if you're rendering points, otherwise you just needed to iterate and calculate the points for the contour summary type
            var actualCircleRadius = typeof circleRadius === "function"
                ? circleRadius(piece, i)
                : circleRadius;
            var eventListeners = eventListenersGenerator(piece, i);
            var renderElementObject = type.customMark ? (React.createElement("g", { key: "piece-" + piece.renderKey, transform: "translate(" + xPosition + "," + yPosition + ")" }, type.customMark(__assign(__assign(__assign({}, piece.data), piece), { x: xPosition, y: yPosition }), i, {
                r: circleRadius,
                x: xPosition,
                y: yPosition,
                baseMarkProps: baseMarkProps,
                renderMode: renderMode,
                styleFn: styleFn,
                classFn: classFn,
                adjustedSize: adjustedSize,
                chartSize: chartSize,
                margin: margin,
                rScale: rScale
            }))) : (__assign({ className: classFn(__assign(__assign({}, piece), piece.data), i), markType: "rect", renderMode: renderValue, key: "piece-" + piece.renderKey, height: actualCircleRadius * 2, width: actualCircleRadius * 2, x: xPosition - actualCircleRadius, y: yPosition - actualCircleRadius, rx: actualCircleRadius, ry: actualCircleRadius, style: styleFn(__assign(__assign({}, piece), piece.data), ordsetI) }, eventListeners));
            var calculatedPiece = {
                o: key,
                xy: {
                    x: xPosition,
                    y: yPosition
                },
                piece: piece,
                renderElement: renderElementObject
            };
            calculatedPieces.push(calculatedPiece);
        });
        allCalculatedPieces = __spread(allCalculatedPieces, calculatedPieces);
    });
    return allCalculatedPieces;
}
exports.pointLayout = pointLayout;
function swarmLayout(_a) {
    var type = _a.type, data = _a.data, renderMode = _a.renderMode, eventListenersGenerator = _a.eventListenersGenerator, styleFn = _a.styleFn, projection = _a.projection, classFn = _a.classFn, adjustedSize = _a.adjustedSize, chartSize = _a.chartSize, margin = _a.margin, baseMarkProps = _a.baseMarkProps, rScale = _a.rScale;
    var allCalculatedPieces = [];
    var iterations = type.iterations || 120;
    var columnKeys = Object.keys(data);
    columnKeys.forEach(function (key, ordsetI) {
        var oColumn = data[key];
        var anglePiece = 1 / columnKeys.length;
        var oData = oColumn.pieceData;
        var adjustedColumnWidth = oColumn.width;
        var circleRadius = type.r ||
            Math.max(2, Math.min(5, (4 * adjustedColumnWidth) / oData.length));
        var simulation = d3_force_1.forceSimulation(oData)
            .force("y", d3_force_1.forceY(function (d) { return d.scaledValue; }).strength(type.strength || 2))
            .force("x", d3_force_1.forceX(oColumn.middle))
            .force("collide", d3_force_1.forceCollide(circleRadius))
            .stop();
        if (projection === "vertical") {
            simulation.force("y", d3_force_1.forceY(function (d) { return d.scaledVerticalValue; }).strength(type.strength || 2));
        }
        for (var i = 0; i < iterations; ++i)
            simulation.tick();
        var calculatedPieces = oData.map(function (piece, i) {
            var renderValue = renderMode && renderMode(piece.data, i);
            var xPosition = piece.x;
            var yPosition = piece.y;
            if (projection === "horizontal") {
                yPosition = piece.x;
                xPosition = piece.y;
            }
            else if (projection === "radial") {
                var angle = oColumn.pct_middle;
                xPosition =
                    ((piece.x - oColumn.middle) / adjustedColumnWidth) * anglePiece;
                var rPosition = piece.scaledValue / 2;
                var xAngle = angle + xPosition;
                var baseCentroid = pointOnArcAtAngle([adjustedSize[0] / 2, adjustedSize[1] / 2], xAngle, rPosition);
                xPosition = baseCentroid[0];
                yPosition = baseCentroid[1];
            }
            var actualCircleRadius = typeof circleRadius === "function"
                ? circleRadius(piece, i)
                : circleRadius;
            var eventListeners = eventListenersGenerator(piece, i);
            var renderElementObject = type.customMark ? (React.createElement("g", { key: "piece-" + piece.renderKey, transform: "translate(" + xPosition + "," + yPosition + ")" }, type.customMark(__assign(__assign(__assign({}, piece.data), piece), { x: xPosition, y: yPosition }), i, {
                x: xPosition,
                y: yPosition,
                r: circleRadius,
                baseMarkProps: baseMarkProps,
                renderMode: renderMode,
                styleFn: styleFn,
                classFn: classFn,
                adjustedSize: adjustedSize,
                chartSize: chartSize,
                margin: margin,
                rScale: rScale
            }))) : (__assign({ className: classFn(__assign(__assign({}, piece), piece.data), i), markType: "rect", renderMode: renderValue, key: "piece-" + piece.renderKey, height: actualCircleRadius * 2, width: actualCircleRadius * 2, x: xPosition - actualCircleRadius, y: yPosition - actualCircleRadius, rx: actualCircleRadius, ry: actualCircleRadius, style: styleFn(__assign(__assign({}, piece), piece.data), ordsetI) }, eventListeners));
            var calculatedPiece = {
                o: key,
                xy: {
                    x: xPosition,
                    y: yPosition
                },
                piece: piece,
                renderElement: renderElementObject
            };
            return calculatedPiece;
        });
        allCalculatedPieces = __spread(allCalculatedPieces, calculatedPieces);
    });
    return allCalculatedPieces;
}
exports.swarmLayout = swarmLayout;
//# sourceMappingURL=pieceLayouts.js.map