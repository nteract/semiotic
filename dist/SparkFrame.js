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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var allFrameDefaults = {
    margin: 0
};
function sparkNetworkSettings(originalSettings) {
    if (originalSettings === void 0) { originalSettings = "force"; }
    var finalSettings = {};
    if (originalSettings) {
        finalSettings = originalSettings;
        if (originalSettings === "force")
            finalSettings = { type: "force" };
        return __assign({ edgeStrength: 2, edgeDistance: 5, nodePadding: 1, nodeWidth: 5, groupWidth: 4 }, finalSettings);
    }
    return originalSettings;
}
var createSparkFrame = function (Frame, defaults, frameName) { var _a; return _a = /** @class */ (function (_super) {
        __extends(SparkFrame, _super);
        function SparkFrame(props) {
            var _this = _super.call(this, props) || this;
            _this.node = null;
            _this._onResize = function (width, height) {
                _this.setState({ containerHeight: height, containerWidth: width });
            };
            _this.state = {
                containerHeight: props.size[1],
                containerWidth: props.size[0]
            };
            return _this;
        }
        SparkFrame.prototype.componentDidMount = function () {
            var element = this.node;
            var lineHeight = +window.getComputedStyle(element).lineHeight.split("px")[0] - 5;
            this.setState({
                containerHeight: isNaN(lineHeight) ? element.offsetHeight : lineHeight,
                containerWidth: element.offsetWidth
            });
        };
        SparkFrame.prototype.render = function () {
            var _this = this;
            var _a = this.props, size = _a.size, _b = _a.style, style = _b === void 0 ? {} : _b;
            var _c = this.state.containerHeight, containerHeight = _c === void 0 ? 30 : _c;
            var actualSize = [];
            actualSize[0] =
                typeof size === "number" ? size : size[0] ? size[0] : containerHeight;
            actualSize[1] = containerHeight;
            return (React.createElement("span", { style: Object.assign({
                    width: actualSize[0] + "px",
                    height: actualSize[1] + "px",
                    display: "inline-block",
                    marginLeft: "5px",
                    marginRight: "5px"
                }, style), ref: function (node) { return (_this.node = node); } },
                React.createElement(Frame, __assign({}, defaults(this.props), { size: actualSize, useSpans: true }))));
        };
        return SparkFrame;
    }(React.Component)),
    _a.displayName = frameName,
    _a.defaultProps = {
        size: []
    },
    _a; };
exports.axisDefaults = {
    tickFormat: function () { return ""; },
    baseline: false
};
exports.xyFrameDefaults = function (props) { return (__assign(__assign(__assign({}, allFrameDefaults), props), { hoverAnnotation: props.hoverAnnotation, axes: props.axes
        ? props.axes.map(function (a) { return (__assign(__assign({}, exports.axisDefaults), a)); })
        : props.axes })); };
exports.ordinalFrameDefaults = function (props) { return (__assign(__assign(__assign({}, allFrameDefaults), props), { hoverAnnotation: props.hoverAnnotation, axes: props.axes
        ? props.axes.map(function (a) { return (__assign(__assign({}, exports.axisDefaults), a)); })
        : props.axes })); };
exports.networkFrameDefaults = function (props) { return (__assign(__assign(__assign(__assign({}, allFrameDefaults), { nodeSizeAccessor: 2 }), props), { networkType: sparkNetworkSettings(props.networkType) })); };
exports.default = createSparkFrame;
//# sourceMappingURL=SparkFrame.js.map