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
var SpanOrDiv = /** @class */ (function (_super) {
    __extends(SpanOrDiv, _super);
    function SpanOrDiv() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SpanOrDiv.prototype.render = function () {
        var _a = this.props, style = _a.style, className = _a.className, span = _a.span, children = _a.children;
        if (span)
            return (React.createElement("span", { className: className, style: __assign({ display: "block" }, style) }, children));
        return (React.createElement("div", { className: className, style: style }, children));
    };
    return SpanOrDiv;
}(React.PureComponent));
exports.HOCSpanOrDiv = function (span) {
    if (span) {
        return function (props) {
            var className = props.className, style = props.style, children = props.children;
            return (React.createElement("span", { className: className, style: __assign({ display: "block" }, style) }, children));
        };
    }
    return function (props) {
        var className = props.className, style = props.style, children = props.children;
        return (React.createElement("div", { className: className, style: style }, children));
    };
};
exports.default = SpanOrDiv;
//# sourceMappingURL=SpanOrDiv.js.map