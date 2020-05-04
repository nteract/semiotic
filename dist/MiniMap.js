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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
var XYFrame_1 = __importDefault(require("./XYFrame"));
var MiniMap = function (props) {
    var brushStart = props.brushStart, brush = props.brush, brushEnd = props.brushEnd, xBrushable = props.xBrushable, yBrushable = props.yBrushable, yBrushExtent = props.yBrushExtent, xBrushExtent = props.xBrushExtent, rest = __rest(props, ["brushStart", "brush", "brushEnd", "xBrushable", "yBrushable", "yBrushExtent", "xBrushExtent"]);
    var interactivity = {
        start: brushStart,
        during: brush,
        end: brushEnd
    };
    if (xBrushable && yBrushable) {
        interactivity.brush = "xyBrush";
        if (xBrushExtent || yBrushExtent) {
            interactivity.extent = [[0, 0], __spread(props.size)];
        }
        if (xBrushExtent) {
            interactivity.extent[0] = xBrushExtent;
        }
        if (yBrushExtent) {
            interactivity.extent[1] = yBrushExtent;
        }
    }
    else if (xBrushable) {
        interactivity.brush = "xBrush";
        if (xBrushExtent) {
            interactivity.extent = xBrushExtent;
        }
    }
    else if (yBrushable) {
        interactivity.brush = "yBrush";
        if (yBrushExtent) {
            interactivity.extent = yBrushExtent;
        }
    }
    return React.createElement(XYFrame_1.default, __assign({}, rest, { interaction: interactivity }));
};
exports.default = MiniMap;
//# sourceMappingURL=MiniMap.js.map