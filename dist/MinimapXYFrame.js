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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
// components
var XYFrame_1 = __importDefault(require("./XYFrame"));
var MiniMap_1 = __importDefault(require("./MiniMap"));
var MinimapXYFrame = /** @class */ (function (_super) {
    __extends(MinimapXYFrame, _super);
    function MinimapXYFrame(props) {
        var _this = _super.call(this, props) || this;
        _this.generateMinimap = _this.generateMinimap.bind(_this);
        return _this;
    }
    MinimapXYFrame.prototype.generateMinimap = function () {
        var _a = this.props, xAccessor = _a.xAccessor, yAccessor = _a.yAccessor, points = _a.points, lines = _a.lines, minimap = _a.minimap, summaries = _a.summaries, size = _a.size, lineDataAccessor = _a.lineDataAccessor, lineType = _a.lineType, lineStyle = _a.lineStyle, summaryStyle = _a.summaryStyle, pointStyle = _a.pointStyle, lineClass = _a.lineClass, summaryClass = _a.summaryClass, pointClass = _a.pointClass, lineRenderMode = _a.lineRenderMode, pointRenderMode = _a.pointRenderMode, summaryRenderMode = _a.summaryRenderMode, canvasLines = _a.canvasLines, canvasPoints = _a.canvasPoints, canvasSummaries = _a.canvasSummaries, axes = _a.axes, margin = _a.margin, useSpans = _a.useSpans, name = _a.name, annotations = _a.annotations, summaryType = _a.summaryType, interactionSettings = _a.interactionSettings;
        var miniDefaults = {
            position: [0, 0],
            size: [size[0], size[1] * 0.25],
            xAccessor: xAccessor,
            yAccessor: yAccessor,
            points: points,
            lines: lines,
            summaries: summaries,
            lineDataAccessor: lineDataAccessor,
            xBrushable: true,
            yBrushable: true,
            brushStart: function () { },
            brush: function () { },
            brushEnd: function () { },
            lineType: lineType,
            lineStyle: lineStyle,
            summaryStyle: summaryStyle,
            pointStyle: pointStyle,
            lineClass: lineClass,
            summaryClass: summaryClass,
            pointClass: pointClass,
            lineRenderMode: lineRenderMode,
            pointRenderMode: pointRenderMode,
            summaryRenderMode: summaryRenderMode,
            canvasLines: canvasLines,
            canvasPoints: canvasPoints,
            canvasSummaries: canvasSummaries,
            axes: axes,
            margin: margin,
            useSpans: useSpans,
            name: name,
            annotations: annotations,
            summaryType: summaryType,
            interactionSettings: interactionSettings
        };
        var combinedOptions = __assign(__assign(__assign({}, miniDefaults), minimap), { hoverAnnotation: false });
        return React.createElement(MiniMap_1.default, __assign({}, combinedOptions));
    };
    MinimapXYFrame.prototype.render = function () {
        var miniMap = this.generateMinimap();
        var options = {};
        var _a = this.props, minimap = _a.minimap, renderBefore = _a.renderBefore, rest = __rest(_a, ["minimap", "renderBefore"]);
        if (renderBefore) {
            options.beforeElements = miniMap;
        }
        else {
            options.afterElements = miniMap;
        }
        return React.createElement(XYFrame_1.default, __assign({}, rest, options));
    };
    MinimapXYFrame.displayName = "MinimapXYFrame";
    return MinimapXYFrame;
}(React.Component));
exports.default = MinimapXYFrame;
//# sourceMappingURL=MinimapXYFrame.js.map