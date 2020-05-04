"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var d3_shape_1 = require("d3-shape");
var lineDrawing_1 = require("./svg/lineDrawing");
// components
var semiotic_mark_1 = require("semiotic-mark");
var DividedLine = /** @class */ (function (_super) {
    __extends(DividedLine, _super);
    function DividedLine(props) {
        var _this = _super.call(this, props) || this;
        _this.createLineSegments = _this.createLineSegments.bind(_this);
        return _this;
    }
    DividedLine.prototype.createLineSegments = function () {
        var _a = this.props, parameters = _a.parameters, className = _a.className, _b = _a.interpolate, interpolate = _b === void 0 ? d3_shape_1.curveLinear : _b, customAccessors = _a.customAccessors, lineDataAccessor = _a.lineDataAccessor, data = _a.data, searchIterations = _a.searchIterations, rest = __rest(_a, ["parameters", "className", "interpolate", "customAccessors", "lineDataAccessor", "data", "searchIterations"]);
        var x = customAccessors.x, y = customAccessors.y;
        var lineData = lineDrawing_1.projectLineData({
            data: data,
            lineDataAccessor: [lineDataAccessor],
            xProp: "x",
            yProp: "y",
            xAccessor: [x],
            yAccessor: [y]
        });
        //Compatibility before Semiotic 2
        lineData.forEach(function (projectedD) {
            projectedD.data = projectedD.data.map(function (d) { return (__assign(__assign({}, d.data), d)); });
        });
        var lines = lineDrawing_1.dividedLine(parameters, lineData[0].data, searchIterations);
        var lineRender = d3_shape_1.line()
            .curve(interpolate)
            .x(function (d) { return d.x; })
            .y(function (d) { return d.y; });
        return lines.map(function (d, i) { return (React.createElement(semiotic_mark_1.Mark, __assign({}, rest, { className: className, markType: "path", key: "DividedLine-" + i, style: d.key, d: lineRender(d.points) }))); });
    };
    DividedLine.prototype.render = function () {
        var lines = this.createLineSegments();
        return React.createElement("g", null, lines);
    };
    return DividedLine;
}(React.Component));
exports.default = DividedLine;
//# sourceMappingURL=DividedLine.js.map