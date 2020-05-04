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
var semiotic_mark_1 = require("semiotic-mark");
var Annotation_1 = __importDefault(require("../Annotation"));
var AnnotationCalloutCircle_1 = __importDefault(require("react-annotation/lib/Types/AnnotationCalloutCircle"));
var AnnotationBracket_1 = __importDefault(require("react-annotation/lib/Types/AnnotationBracket"));
var AnnotationXYThreshold_1 = __importDefault(require("react-annotation/lib/Types/AnnotationXYThreshold"));
var d3_hierarchy_1 = require("d3-hierarchy");
var d3_array_1 = require("d3-array");
var pieceDrawing_1 = require("../svg/pieceDrawing");
var baseRules_1 = require("./baseRules");
var SpanOrDiv_1 = __importDefault(require("../SpanOrDiv"));
var multiAccessorUtils_1 = require("../data/multiAccessorUtils");
var d3_shape_1 = require("d3-shape");
var general_1 = require("../visualizationLayerBehavior/general");
var TooltipPositioner_1 = __importDefault(require("../TooltipPositioner"));
var derivePieceValue = function (accessor, piece) {
    var pieceVal = accessor(piece);
    return pieceVal && pieceVal.toString && pieceVal.toString() || pieceVal;
};
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
    };
}
function pieContentGenerator(_a) {
    var column = _a.column, useSpans = _a.useSpans;
    return (React.createElement(SpanOrDiv_1.default, { span: useSpans, className: "tooltip-content" },
        React.createElement("p", { key: "or-annotation-1" }, column.name),
        React.createElement("p", { key: "or-annotation-2" }, (column.pct * 100).toFixed(0) + "%")));
}
function arcBracket(_a) {
    var x = _a.x, y = _a.y, radius = _a.radius, startAngle = _a.startAngle, endAngle = _a.endAngle, inset = _a.inset, outset = _a.outset, _b = _a.curly, curly = _b === void 0 ? true : _b;
    var start = polarToCartesian(x, y, radius + outset, endAngle);
    var end = polarToCartesian(x, y, radius + outset, startAngle);
    var innerStart = polarToCartesian(x, y, radius + outset - inset, endAngle);
    var innerEnd = polarToCartesian(x, y, radius + outset - inset, startAngle);
    var angleSize = endAngle - startAngle;
    var largeArcFlag = angleSize <= 180 ? "0" : "1";
    var d;
    if (curly) {
        var curlyOffset = Math.min(10, angleSize / 4);
        var middleLeft = polarToCartesian(x, y, radius + outset, (startAngle + endAngle) / 2 + curlyOffset);
        var middle = polarToCartesian(x, y, radius + outset + 10, (startAngle + endAngle) / 2);
        var middleRight = polarToCartesian(x, y, radius + outset, (startAngle + endAngle) / 2 - curlyOffset);
        d = [
            "M",
            innerStart.x,
            innerStart.y,
            "L",
            start.x,
            start.y,
            "A",
            radius + outset,
            radius + outset,
            0,
            0,
            0,
            middleLeft.x,
            middleLeft.y,
            "A",
            radius + outset,
            radius + outset,
            1,
            0,
            1,
            middle.x,
            middle.y,
            "A",
            radius + outset,
            radius + outset,
            1,
            0,
            1,
            middleRight.x,
            middleRight.y,
            "A",
            radius + outset,
            radius + outset,
            0,
            0,
            0,
            end.x,
            end.y,
            "L",
            innerEnd.x,
            innerEnd.y
        ].join(" ");
    }
    else {
        d = [
            "M",
            innerStart.x,
            innerStart.y,
            "L",
            start.x,
            start.y,
            "A",
            radius + outset,
            radius + outset,
            0,
            largeArcFlag,
            0,
            end.x,
            end.y,
            "L",
            innerEnd.x,
            innerEnd.y
        ].join(" ");
    }
    var midAngle = (startAngle + endAngle) / 2;
    var textOffset, largeTextArcFlag, finalTextEnd, finalTextStart, arcFlip;
    var lowerArc = midAngle > 90 && midAngle < 270;
    if (lowerArc) {
        textOffset = 12;
        largeTextArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        arcFlip = 0;
    }
    else {
        largeTextArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        textOffset = 5;
        arcFlip = 1;
    }
    textOffset += curly ? 10 : 0;
    var textStart = polarToCartesian(x, y, radius + outset + textOffset, endAngle);
    var textEnd = polarToCartesian(x, y, radius + outset + textOffset, startAngle);
    if (lowerArc) {
        finalTextStart = textStart;
        finalTextEnd = textEnd;
    }
    else {
        finalTextStart = textEnd;
        finalTextEnd = textStart;
    }
    var textD = [
        "M",
        finalTextStart.x,
        finalTextStart.y,
        "A",
        radius + outset + textOffset,
        radius + outset + textOffset,
        arcFlip,
        largeTextArcFlag,
        arcFlip,
        finalTextEnd.x,
        finalTextEnd.y
    ].join(" ");
    return { arcPath: d, textArcPath: textD };
}
exports.getColumnScreenCoordinates = function (_a) {
    var _b;
    var d = _a.d, projectedColumns = _a.projectedColumns, oAccessor = _a.oAccessor, summaryType = _a.summaryType, type = _a.type, projection = _a.projection, adjustedPosition = _a.adjustedPosition, adjustedSize = _a.adjustedSize;
    var column = typeof d.column === "object" ? d.column :
        projectedColumns[d.facetColumn] ||
            projectedColumns[multiAccessorUtils_1.findFirstAccessorValue(oAccessor, d)];
    if (!column) {
        return { coordinates: [0, 0], pieces: undefined, column: undefined };
    }
    var pieces = column.pieceData || column.pieces;
    var positionValue = (summaryType.type && summaryType.type !== "none") ||
        ["swarm", "point", "clusterbar", "timeline"].find(function (p) { return p === type.type; })
        ? d3_array_1.max(pieces.map(function (p) { return p.scaledValue; }))
        : projection === "horizontal"
            ? d3_array_1.max(pieces.map(function (p) { return p.value >= 0 ? p.scaledValue + p.bottom : p.bottom; }))
            : d3_array_1.min(pieces.map(function (p) { return p.value >= 0 ? p.bottom - p.scaledValue : p.bottom; }));
    var xPosition = column.middle + adjustedPosition[0];
    var yPosition = projection === "horizontal"
        ? adjustedSize[0] - positionValue
        : (summaryType.type && summaryType.type !== "none") ||
            ["swarm", "point", "clusterbar", , "timeline"].find(function (p) { return p === type.type; })
            ? adjustedSize[1] - positionValue
            : positionValue;
    yPosition += 10;
    if (projection === "horizontal") {
        yPosition = column.middle;
        xPosition = positionValue + adjustedPosition[0];
    }
    else if (projection === "radial") {
        ;
        _b = __read(pieceDrawing_1.pointOnArcAtAngle([d.arcAngles.translate[0], d.arcAngles.translate[1]], d.arcAngles.midAngle, d.arcAngles.length), 2), xPosition = _b[0], yPosition = _b[1];
        yPosition += 10;
    }
    return { coordinates: [xPosition, yPosition], pieces: pieces, column: column };
};
exports.svgHighlightRule = function (_a) {
    var d = _a.d, pieceIDAccessor = _a.pieceIDAccessor, orFrameRender = _a.orFrameRender, oAccessor = _a.oAccessor;
    var thisID = pieceIDAccessor(d);
    var thisO = multiAccessorUtils_1.findFirstAccessorValue(oAccessor, d);
    var pieces = orFrameRender.pieces;
    var styleFn = pieces.styleFn;
    var foundPieces = (pieces &&
        pieces.data
            .filter(function (p) {
            return ((thisID === undefined ||
                pieceIDAccessor(__assign(__assign({}, p.piece), p.piece.data)) === thisID) &&
                (thisO === undefined ||
                    multiAccessorUtils_1.findFirstAccessorValue(oAccessor, p.piece.data) === thisO));
        })
            .map(function (p, q) {
            var styleObject = {
                style: styleFn(__assign(__assign({}, p.piece), p.piece.data))
            };
            if (d.style && typeof d.style === "function") {
                styleObject = {
                    style: __assign(__assign({}, styleObject), d.style(__assign(__assign({}, p.piece), p.piece.data)))
                };
            }
            else if (d.style) {
                styleObject = { style: __assign(__assign({}, styleObject), d.style) };
            }
            var styledD = __assign(__assign({}, p.renderElement), styleObject);
            var className = "highlight-annotation " + ((d.class &&
                typeof d.class === "function" &&
                d.class(p.piece.data, q)) ||
                (d.class && d.class) ||
                "");
            if (React.isValidElement(p.renderElement)) {
                return React.cloneElement(p.renderElement, __assign(__assign({}, styleObject), { className: className }));
            }
            return (React.createElement(semiotic_mark_1.Mark, __assign({ fill: "none", stroke: "black", strokeWidth: "2px", key: "highlight-piece-" + q }, styledD, { className: className })));
        })) ||
        [];
    return __spread(foundPieces);
};
exports.findIDPiece = function (pieceIDAccessor, oColumn, d) {
    var foundIDValue = pieceIDAccessor(d);
    var pieceID = foundIDValue === "" && d.rName ? d.rName : foundIDValue;
    var basePieces = oColumn &&
        oColumn.pieceData.filter(function (r) { return r.rName === pieceID || pieceIDAccessor(r.data) === pieceID; });
    if (pieceID === "" ||
        basePieces === undefined ||
        basePieces === false ||
        basePieces.length !== 1)
        return d;
    var basePiece = basePieces[0];
    var reactAnnotationProps = [
        "type",
        "label",
        "note",
        "connector",
        "disabled",
        "color",
        "subject"
    ];
    if (basePiece) {
        reactAnnotationProps.forEach(function (prop) {
            if (d[prop])
                basePiece[prop] = d[prop];
        });
    }
    return basePiece;
};
exports.screenProject = function (_a) {
    var p = _a.p, adjustedSize = _a.adjustedSize, rScale = _a.rScale, oColumn = _a.oColumn, rAccessor = _a.rAccessor, idPiece = _a.idPiece, projection = _a.projection, rScaleType = _a.rScaleType;
    var basePValue = multiAccessorUtils_1.findFirstAccessorValue(rAccessor, p) || p.value;
    var pValue = Array.isArray(basePValue) ? Math.max.apply(Math, __spread(basePValue)) : basePValue;
    var o;
    if (oColumn) {
        o = oColumn.middle;
    }
    else {
        o = 0;
    }
    if (oColumn && projection === "radial") {
        return pieceDrawing_1.pointOnArcAtAngle([adjustedSize[0] / 2, adjustedSize[1] / 2], oColumn.pct_middle, idPiece && (idPiece.x || idPiece.scaledValue)
            ? idPiece.x / 2 || (idPiece.bottom + idPiece.scaledValue / 2) / 2
            : pValue / 2);
    }
    if (projection === "horizontal") {
        return [
            idPiece && idPiece.scaledEndValue ? idPiece.scaledEndValue :
                idPiece && idPiece.scaledValue
                    ? (idPiece.value >= 0 ? idPiece.bottom + idPiece.scaledValue : idPiece.bottom)
                    : rScale(pValue),
            o
        ];
    }
    var newScale = rScaleType
        .copy()
        .domain(rScale.domain())
        .range(rScale.range().reverse());
    return [
        o,
        idPiece && (idPiece.x || idPiece.scaledValue)
            ? idPiece.y === undefined
                ? (idPiece.value >= 0 ? idPiece.bottom - idPiece.scaledValue
                    : idPiece.bottom)
                : idPiece.y
            : newScale(pValue)
    ];
};
exports.svgORRule = function (_a) {
    var d = _a.d, i = _a.i, screenCoordinates = _a.screenCoordinates, projection = _a.projection;
    return (React.createElement(semiotic_mark_1.Mark, { markType: "text", key: d.label + "annotationtext" + i, forceUpdate: true, x: screenCoordinates[0] + (projection === "horizontal" ? 10 : 0), y: screenCoordinates[1] + (projection === "vertical" ? 10 : 0), className: "annotation annotation-or-label " + (d.className || ""), textAnchor: "middle" }, d.label));
};
exports.basicReactAnnotationRule = function (_a) {
    var d = _a.d, i = _a.i, screenCoordinates = _a.screenCoordinates;
    var noteData = Object.assign({
        dx: 0,
        dy: 0,
        note: { label: d.label, orientation: d.orientation, align: d.align },
        connector: { end: "arrow" }
    }, d, {
        x: screenCoordinates[0],
        y: screenCoordinates[1],
        type: typeof d.type === "function" ? d.type : undefined,
        screenCoordinates: screenCoordinates
    });
    if (d.fixedX)
        noteData.x = d.fixedX;
    if (d.fixedY)
        noteData.y = d.fixedY;
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.svgEncloseRule = function (_a) {
    var d = _a.d, i = _a.i, screenCoordinates = _a.screenCoordinates;
    var circle = d3_hierarchy_1.packEnclose(screenCoordinates.map(function (p) { return ({ x: p[0], y: p[1], r: 2 }); }));
    return baseRules_1.circleEnclosure({ d: d, i: i, circle: circle });
};
exports.svgRRule = function (_a) {
    var d = _a.d, i = _a.i, screenCoordinates = _a.screenCoordinates, rScale = _a.rScale, rAccessor = _a.rAccessor, adjustedSize = _a.adjustedSize, adjustedPosition = _a.adjustedPosition, projection = _a.projection;
    var x, y, xPosition, yPosition, subject, dx, dy;
    if (projection === "radial") {
        return (React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: Object.assign({
                dx: 50,
                dy: 50,
                note: { label: d.label },
                connector: { end: "arrow" }
            }, d, {
                type: AnnotationCalloutCircle_1.default,
                subject: {
                    radius: rScale(multiAccessorUtils_1.findFirstAccessorValue(rAccessor, d)) / 2,
                    radiusPadding: 0
                },
                x: adjustedSize[0] / 2,
                y: adjustedSize[1] / 2
            }) }));
    }
    else if (projection === "horizontal") {
        dx = 50;
        dy = 50;
        yPosition = d.offset || i * 25;
        x = screenCoordinates[0];
        y = yPosition;
        subject = {
            x: x,
            y1: 0,
            y2: adjustedSize[1] + adjustedPosition[1]
        };
    }
    else {
        dx = 50;
        dy = -20;
        xPosition = d.offset || i * 25;
        y = screenCoordinates[1];
        x = xPosition;
        subject = {
            y: y,
            x1: 0,
            x2: adjustedSize[0] + adjustedPosition[0]
        };
    }
    var noteData = Object.assign({
        dx: dx,
        dy: dy,
        note: { label: d.label },
        connector: { end: "arrow" }
    }, d, {
        type: AnnotationXYThreshold_1.default,
        x: x,
        y: y,
        subject: subject
    });
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.svgCategoryRule = function (_a) {
    var projection = _a.projection, d = _a.d, i = _a.i, categories = _a.categories, adjustedSize = _a.adjustedSize;
    var _b = d.bracketType, bracketType = _b === void 0 ? "curly" : _b, _c = d.position, position = _c === void 0 ? projection === "vertical" ? "top" : "left" : _c, _d = d.depth, depth = _d === void 0 ? 30 : _d, _e = d.offset, offset = _e === void 0 ? 0 : _e, _f = d.padding, padding = _f === void 0 ? 0 : _f;
    var actualCategories = Array.isArray(d.categories)
        ? d.categories
        : [d.categories];
    var cats = actualCategories.map(function (c) { return categories[c]; });
    if (projection === "radial") {
        var arcPadding_1 = padding / adjustedSize[1];
        var leftX = d3_array_1.min(cats.map(function (p) { return p.pct_start + p.pct_padding / 2 + arcPadding_1 / 2; }));
        var rightX = d3_array_1.max(cats.map(function (p) { return p.pct_start + p.pct - p.pct_padding / 2 - arcPadding_1 / 2; }));
        var chartSize = Math.min(adjustedSize[0], adjustedSize[1]) / 2;
        var centerX = adjustedSize[0] / 2;
        var centerY = adjustedSize[1] / 2;
        var _g = arcBracket({
            x: 0,
            y: 0,
            radius: chartSize,
            startAngle: leftX * 360,
            endAngle: rightX * 360,
            inset: depth,
            outset: offset,
            curly: bracketType === "curly"
        }), arcPath = _g.arcPath, textArcPath = _g.textArcPath;
        var textPathID = "text-path-" + i + "-" + Math.random();
        return (React.createElement("g", { className: "category-annotation annotation", transform: "translate(" + centerX + "," + centerY + ")" },
            React.createElement("path", { d: arcPath, fill: "none", stroke: "black" }),
            React.createElement("path", { id: textPathID, d: textArcPath, style: { display: "none" } }),
            React.createElement("text", { "font-size": "12.5" },
                React.createElement("textPath", { startOffset: "50%", textAnchor: "middle", xlinkHref: "#" + textPathID }, d.label))));
    }
    else {
        var leftX = d3_array_1.min(cats.map(function (p) { return p.x; }));
        var rightX = d3_array_1.max(cats.map(function (p) { return p.x + p.width; }));
        if (projection === "vertical") {
            var yPosition = position === "top" ? 0 : adjustedSize[1];
            yPosition += position === "top" ? -offset : offset;
            var noteData = {
                type: AnnotationBracket_1.default,
                y: yPosition,
                x: leftX - padding,
                note: {
                    title: d.title || d.label,
                    label: d.title ? d.label : undefined
                },
                subject: {
                    type: bracketType,
                    width: rightX - leftX + padding * 2,
                    depth: position === "top" ? -depth : depth
                }
            };
            return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
        }
        else if (projection === "horizontal") {
            var yPosition = position === "left" ? 0 : adjustedSize[0];
            yPosition += position === "left" ? -offset : offset;
            var noteData = {
                type: AnnotationBracket_1.default,
                x: yPosition,
                y: leftX - padding,
                note: {
                    title: d.title || d.label,
                    label: d.title ? d.label : undefined
                },
                subject: {
                    type: bracketType,
                    height: rightX - leftX + padding * 2,
                    depth: position === "left" ? -depth : depth
                }
            };
            return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
        }
    }
};
exports.htmlFrameHoverRule = function (_a) {
    var d = _a.d, i = _a.i, rAccessor = _a.rAccessor, oAccessor = _a.oAccessor, projection = _a.projection, tooltipContent = _a.tooltipContent, optimizeCustomTooltipPosition = _a.optimizeCustomTooltipPosition, useSpans = _a.useSpans, pieceIDAccessor = _a.pieceIDAccessor, projectedColumns = _a.projectedColumns, adjustedSize = _a.adjustedSize, rScale = _a.rScale, type = _a.type, rScaleType = _a.rScaleType;
    tooltipContent =
        tooltipContent === "pie"
            ? function () {
                return pieContentGenerator({
                    column: d.column,
                    useSpans: useSpans
                });
            }
            : tooltipContent;
    //To string because React gives a DOM error if it gets a date
    var contentFill;
    var pO = multiAccessorUtils_1.findFirstAccessorValue(oAccessor, d) || d.column;
    var oColumn = projectedColumns[pO];
    var idPiece = exports.findIDPiece(pieceIDAccessor, oColumn, d);
    if (!idPiece) {
        return null;
    }
    var screenCoordinates = ((type.type === "clusterbar" ||
        type.type === "point" ||
        type.type === "swarm") &&
        d.x !== undefined &&
        d.y !== undefined) ||
        d.isSummaryData
        ? [d.x, d.y]
        : exports.screenProject({
            p: d,
            adjustedSize: adjustedSize,
            rScale: rScale,
            oColumn: oColumn,
            rAccessor: rAccessor,
            idPiece: idPiece,
            projection: projection,
            rScaleType: rScaleType
        });
    if (d.isSummaryData) {
        var summaryContent_1 = d.label;
        if (d.pieces && d.pieces.length !== 0) {
            if (d.pieces.length === 1) {
                summaryContent_1 = [];
                rAccessor.forEach(function (actualRAccessor) {
                    summaryContent_1.push(actualRAccessor(d.pieces[0].data));
                });
            }
            else {
                summaryContent_1 = [];
                rAccessor.forEach(function (actualRAccessor) {
                    var pieceData = d3_array_1.extent(d.pieces.map(function (p) { return p.data; }).map(actualRAccessor));
                    summaryContent_1.push("From " + pieceData[0] + " to " + pieceData[1]);
                });
            }
        }
        var summaryLabel = React.createElement("p", { key: "html-annotation-content-2" }, summaryContent_1);
        contentFill = [
            React.createElement("p", { key: "html-annotation-content-1" }, d.key),
            summaryLabel,
            React.createElement("p", { key: "html-annotation-content-3" }, d.value)
        ];
    }
    else if (d.data) {
        contentFill = [];
        oAccessor.forEach(function (actualOAccessor, i) {
            if (idPiece.data) {
                var pieceOVal = derivePieceValue(actualOAccessor, idPiece.data);
                contentFill.push(React.createElement("p", { key: "html-annotation-content-o-" + i }, pieceOVal));
            }
        });
        rAccessor.forEach(function (actualRAccessor, i) {
            if (idPiece.data) {
                var pieceRVal = derivePieceValue(actualRAccessor, idPiece.data);
                contentFill.push(React.createElement("p", { key: "html-annotation-content-r-" + i }, pieceRVal));
            }
        });
    }
    else if (d.label) {
        contentFill = d.label;
    }
    var content = (React.createElement(SpanOrDiv_1.default, { span: useSpans, className: "tooltip-content" }, contentFill));
    if (d.type === "frame-hover" && tooltipContent && idPiece) {
        var tooltipContentArgs = __assign(__assign({}, idPiece), idPiece.data);
        content = optimizeCustomTooltipPosition ? (React.createElement(TooltipPositioner_1.default, { tooltipContent: tooltipContent, tooltipContentArgs: tooltipContentArgs })) : tooltipContent(tooltipContentArgs);
    }
    return (React.createElement(SpanOrDiv_1.default, { span: useSpans, key: "xylabel-" + i, className: "annotation annotation-or-label " + projection + " " + (d.className ||
            ""), style: {
            position: "absolute",
            top: screenCoordinates[1] + "px",
            left: screenCoordinates[0] + "px"
        } }, content));
};
exports.htmlColumnHoverRule = function (_a) {
    var d = _a.d, i = _a.i, summaryType = _a.summaryType, oAccessor = _a.oAccessor, type = _a.type, adjustedPosition = _a.adjustedPosition, adjustedSize = _a.adjustedSize, projection = _a.projection, tooltipContent = _a.tooltipContent, optimizeCustomTooltipPosition = _a.optimizeCustomTooltipPosition, useSpans = _a.useSpans, projectedColumns = _a.projectedColumns;
    //we need to ignore negative pieces to make sure the hover behavior populates on top of the positive bar
    var _b = exports.getColumnScreenCoordinates({
        d: d,
        projectedColumns: projectedColumns,
        oAccessor: oAccessor,
        summaryType: summaryType,
        type: type,
        projection: projection,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize
    }), _c = __read(_b.coordinates, 2), xPosition = _c[0], yPosition = _c[1], pieces = _b.pieces, column = _b.column;
    if (column === undefined) {
        return null;
    }
    //To string because React gives a DOM error if it gets a date
    var oContent = [];
    oAccessor.forEach(function (actualOAccessor, i) {
        if (pieces[0].data) {
            var pieceOVal = derivePieceValue(actualOAccessor, pieces[0].data);
            oContent.push(React.createElement("p", { key: "or-annotation-o-" + i }, pieceOVal));
        }
    });
    var content = (React.createElement(SpanOrDiv_1.default, { span: useSpans, className: "tooltip-content" },
        oContent,
        React.createElement("p", { key: "or-annotation-2" }, d3_array_1.sum(pieces.map(function (p) { return p.value; }).filter(function (p) { return p > 0; })))));
    if (d.type === "column-hover" && tooltipContent) {
        if (tooltipContent === "pie") {
            tooltipContent = pieContentGenerator;
        }
        var tooltipContentArgs = __assign(__assign({}, d), { pieces: pieces.map(function (p) { return p.data; }), column: column,
            oAccessor: oAccessor });
        content = optimizeCustomTooltipPosition ? (React.createElement(TooltipPositioner_1.default, { tooltipContent: tooltipContent, tooltipContentArgs: tooltipContentArgs })) : tooltipContent(tooltipContentArgs);
    }
    else if (d.label) {
        content = (React.createElement(SpanOrDiv_1.default, { span: useSpans, className: "tooltip-content" }, d.label));
    }
    return (React.createElement(SpanOrDiv_1.default, { span: useSpans, key: "orlabel-" + i, className: "annotation annotation-or-label " + projection + " " + (d.className ||
            ""), style: {
            position: "absolute",
            top: yPosition + "px",
            left: xPosition + "px"
        } }, content));
};
exports.svgRectEncloseRule = function (_a) {
    var d = _a.d, i = _a.i, screenCoordinates = _a.screenCoordinates;
    var bboxNodes = screenCoordinates.map(function (p) {
        return {
            x0: p.x0 = p[0],
            x1: p.x1 = p[0],
            y0: p.y0 = p[1],
            y1: p.y1 = p[1]
        };
    });
    return baseRules_1.rectangleEnclosure({ bboxNodes: bboxNodes, d: d, i: i });
};
exports.svgOrdinalLine = function (_a) {
    var screenCoordinates = _a.screenCoordinates, d = _a.d, voronoiHover = _a.voronoiHover;
    var lineGenerator = d3_shape_1.line()
        .x(function (d) { return d[0]; })
        .y(function (d) { return d[1]; });
    if (d.curve) {
        var interpolator = general_1.curveHash[d.curve] || d.curve;
        lineGenerator.curve(interpolator);
    }
    var lineStyle = typeof d.lineStyle === "function" ? d.lineStyle(d) : d.lineStyle || {};
    return (React.createElement("g", { key: "ordinal-line-annotation" },
        React.createElement("path", { stroke: "black", fill: "none", style: lineStyle, d: lineGenerator(screenCoordinates) }),
        (d.points || d.interactive) &&
            screenCoordinates.map(function (p, q) {
                var pointStyle = typeof d.pointStyle === "function"
                    ? d.pointStyle(d.coordinates[q], q)
                    : d.pointStyle || {};
                return (React.createElement("g", { transform: "translate(" + p[0] + "," + p[1] + ")", key: "ordinal-line-point-" + q },
                    d.points && (React.createElement("circle", { style: pointStyle, r: d.radius || 5, fill: "black" })),
                    d.interactive && (React.createElement("circle", { style: { pointerEvents: "all" }, r: d.hoverRadius || 15, opacity: 0, onMouseEnter: function () {
                            return voronoiHover(__assign(__assign({ type: "frame-hover" }, d.coordinates[q]), { data: d.coordinates[q] }));
                        }, onMouseOut: function () { return voronoiHover(); } })),
                    "}"));
            })));
};
//# sourceMappingURL=orframeRules.js.map