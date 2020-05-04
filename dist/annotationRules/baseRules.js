"use strict";
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
var AnnotationCalloutCircle_1 = __importDefault(require("react-annotation/lib/Types/AnnotationCalloutCircle"));
var AnnotationCalloutRect_1 = __importDefault(require("react-annotation/lib/Types/AnnotationCalloutRect"));
var AnnotationCalloutCustom_1 = __importDefault(require("react-annotation/lib/Types/AnnotationCalloutCustom"));
var Annotation_1 = __importDefault(require("../Annotation"));
var d3_polygon_1 = require("d3-polygon");
var polygon_offset_1 = __importDefault(require("polygon-offset"));
exports.circleEnclosure = function (_a) {
    var d = _a.d, i = _a.i, circle = _a.circle;
    var _b = d.padding, padding = _b === void 0 ? 2 : _b, _c = d.radiusPadding, radiusPadding = _c === void 0 ? padding : _c, label = d.label;
    var noteData = Object.assign({
        dx: 0,
        dy: 0,
        note: { label: label },
        connector: { end: "arrow" }
    }, d, {
        coordinates: undefined,
        x: circle.x,
        y: circle.y,
        type: AnnotationCalloutCircle_1.default,
        subject: {
            radius: circle.r,
            radiusPadding: radiusPadding
        },
        i: i
    });
    if (noteData.rp) {
        switch (noteData.rp) {
            case "top":
                noteData.dx = 0;
                noteData.dy = -circle.r - noteData.rd;
                break;
            case "bottom":
                noteData.dx = 0;
                noteData.dy = circle.r + noteData.rd;
                break;
            case "left":
                noteData.dx = -circle.r - noteData.rd;
                noteData.dy = 0;
                break;
            default:
                noteData.dx = circle.r + noteData.rd;
                noteData.dy = 0;
        }
    }
    //TODO: Support .ra (setting angle)
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.rectangleEnclosure = function (_a) {
    var bboxNodes = _a.bboxNodes, d = _a.d, i = _a.i;
    var _b = d.padding, padding = _b === void 0 ? 0 : _b, _c = d.dx, dx = _c === void 0 ? -25 : _c, _d = d.dy, dy = _d === void 0 ? -25 : _d, label = d.label;
    var bbox = [
        [
            Math.min.apply(Math, __spread(bboxNodes.map(function (p) { return p.x0; }))) - padding,
            Math.min.apply(Math, __spread(bboxNodes.map(function (p) { return p.y0; }))) - padding
        ],
        [
            Math.max.apply(Math, __spread(bboxNodes.map(function (p) { return p.x1; }))) + padding,
            Math.max.apply(Math, __spread(bboxNodes.map(function (p) { return p.y1; }))) + padding
        ]
    ];
    var noteData = Object.assign({
        dx: dx,
        dy: dy,
        note: { label: label },
        connector: { end: "arrow" }
    }, d, {
        type: AnnotationCalloutRect_1.default,
        x: bbox[0][0],
        y: bbox[0][1],
        subject: {
            width: bbox[1][0] - bbox[0][0],
            height: bbox[1][1] - bbox[0][1]
        }
    });
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.hullEnclosure = function (_a) {
    var points = _a.points, d = _a.d, i = _a.i;
    var _b = d.color, color = _b === void 0 ? "black" : _b, _c = d.dx, dx = _c === void 0 ? -25 : _c, _d = d.dy, dy = _d === void 0 ? -25 : _d, label = d.label, _e = d.padding, padding = _e === void 0 ? 10 : _e, _f = d.buffer, buffer = _f === void 0 ? padding : _f, _g = d.strokeWidth, strokeWidth = _g === void 0 ? 10 : _g;
    var hullPoints = d3_polygon_1.polygonHull(points);
    var offset = new polygon_offset_1.default();
    var bufferedHull = offset
        .data(__spread(hullPoints, [hullPoints[0]]))
        .margin(buffer)[0];
    var hullD = "M" + bufferedHull.map(function (d) { return d.join(","); }).join("L") + "Z";
    var firstCoord = bufferedHull[0];
    var _h = d.nx, nx = _h === void 0 ? firstCoord[0] + dx : _h, _j = d.ny, ny = _j === void 0 ? firstCoord[1] + dy : _j;
    var closestCoordinates = bufferedHull.reduce(function (p, c) {
        if (Math.hypot(nx - p[0], ny - p[1]) > Math.hypot(nx - c[0], ny - c[1])) {
            p = c;
        }
        return p;
    }, firstCoord);
    var noteData = Object.assign({
        dx: dx,
        dy: dy,
        note: { label: label },
        connector: { end: "arrow" }
    }, d, {
        type: AnnotationCalloutCustom_1.default,
        x: closestCoordinates[0],
        y: closestCoordinates[1],
        subject: {
            custom: [
                React.createElement("path", { key: "hull-drawing", d: hullD, strokeWidth: strokeWidth, strokeMiterlimit: "10", strokeLinejoin: "miter", strokeLinecap: "butt", fill: "none", stroke: color, transform: "translate(" + -closestCoordinates[0] + "," + -closestCoordinates[1] + ")" })
            ],
            customID: "hull-annotation"
        }
    });
    return React.createElement(Annotation_1.default, { key: d.key || "annotation-" + i, noteData: noteData });
};
exports.desaturationLayer = function (_a) {
    var _b = _a.style, style = _b === void 0 ? { fill: "white", fillOpacity: 0.5 } : _b, size = _a.size, i = _a.i, key = _a.key;
    return (React.createElement("rect", { key: key || "desaturation-" + i, x: -5, y: -5, width: size[0] + 10, height: size[1] + 10, style: style }));
};
//# sourceMappingURL=baseRules.js.map