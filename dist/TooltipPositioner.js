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
var TooltipPositioner = /** @class */ (function (_super) {
    __extends(TooltipPositioner, _super);
    function TooltipPositioner() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.containerRef = React.createRef();
        _this.state = {
            collision: null,
            tooltipContainerInitialDimensions: null,
            tooltipContentArgsCurrent: null
        };
        // simple heuristics to check if the tooltip container exceeds the viewport
        // if so, capture the suggested offset
        _this.checkPosition = function () {
            var tooltipContainerInitialDimensions = _this.containerRef.current.getBoundingClientRect();
            var right = tooltipContainerInitialDimensions.right, left = tooltipContainerInitialDimensions.left, top = tooltipContainerInitialDimensions.top, bottom = tooltipContainerInitialDimensions.bottom, width = tooltipContainerInitialDimensions.width, height = tooltipContainerInitialDimensions.height;
            // flags to indicate whether the data point + tooltip dimension collides with the viewport
            // on each of the 4 directions/sides
            var collision = {
                left: false,
                right: false,
                top: false,
                bottom: false
            };
            if ((left + width) > window.innerWidth) {
                collision.right = true;
            }
            if ((left - width) < 0) {
                collision.left = true;
            }
            if ((top + height) > window.innerHeight) {
                collision.bottom = true;
            }
            if ((top - height) < 0) {
                collision.top = true;
            }
            _this.setState({
                collision: collision,
                tooltipContainerInitialDimensions: tooltipContainerInitialDimensions,
                tooltipContentArgsCurrent: _this.props.tooltipContentArgs
            });
        };
        return _this;
    }
    TooltipPositioner.prototype.componentDidMount = function () {
        if (this.containerRef.current && !this.state.collision) {
            this.checkPosition();
        }
    };
    TooltipPositioner.prototype.componentDidUpdate = function (pp) {
        // if new args, reset collision state
        if (pp.tooltipContentArgs !== this.props.tooltipContentArgs) {
            this.setState({
                collision: null,
                tooltipContainerInitialDimensions: null
            });
        }
        else if (this.containerRef.current && !this.state.collision) {
            this.checkPosition();
        }
    };
    TooltipPositioner.prototype.render = function () {
        var _a = this.props, tooltipContent = _a.tooltipContent, tooltipContentArgs = _a.tooltipContentArgs;
        var _b = this.state, collision = _b.collision, tooltipContainerInitialDimensions = _b.tooltipContainerInitialDimensions, tooltipContentArgsCurrent = _b.tooltipContentArgsCurrent;
        var containerStyle = {
            //to handle issue when the tooltip content has margins set by client,
            // which results in the tooltip container having smaller height,
            // which in turn causes the css transform to be inaccurate
            // (ref: https://www.w3.org/TR/css-box-3/#collapsing-margins)
            overflow: 'hidden',
            opacity: collision && (tooltipContentArgsCurrent === tooltipContentArgs) ? 1 : 0
        };
        var tooltipContainerAttributes = {
            tooltipContainerInitialDimensions: tooltipContainerInitialDimensions,
        };
        var tooltipContainerClasses = collision ?
            [
                'tooltip-container',
                'tooltip-collision-evaluated',
                collision && collision.top && 'collision-top',
                collision && collision.bottom && 'collision-bottom',
                collision && collision.right && 'collision-right',
                collision && collision.left && 'collision-left',
            ].filter(function (el) { return el; }).join(' ')
            : 'tooltip-container';
        return (React.createElement("div", { ref: this.containerRef, style: containerStyle, className: tooltipContainerClasses }, tooltipContent(__assign(__assign({}, tooltipContentArgs), { tooltipContainerAttributes: tooltipContainerAttributes }))));
    };
    return TooltipPositioner;
}(React.Component));
exports.default = TooltipPositioner;
//# sourceMappingURL=TooltipPositioner.js.map