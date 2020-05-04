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
var element_resize_event_1 = __importDefault(require("element-resize-event"));
var createResponsiveFrame = function (ParticularFrame) { var _a; return _a = /** @class */ (function (_super) {
        __extends(ResponsiveFrame, _super);
        function ResponsiveFrame(props) {
            var _this = _super.call(this, props) || this;
            _this.node = null;
            _this.isResizing = undefined;
            _this._onResize = function (width, height) {
                _this.setState({ containerHeight: height, containerWidth: width });
            };
            _this.state = {
                containerHeight: undefined,
                containerWidth: undefined
            };
            return _this;
        }
        ResponsiveFrame.prototype.componentDidMount = function () {
            var _this = this;
            var element = this.node;
            var debounce = this.props.debounce;
            var actualElementResizeEvent = this.props.elementResizeEvent || element_resize_event_1.default;
            actualElementResizeEvent(element, function () {
                window.clearTimeout(_this.isResizing);
                _this.isResizing = setTimeout(function () {
                    _this.isResizing = false;
                    _this.setState({
                        containerHeight: element.offsetHeight,
                        containerWidth: element.offsetWidth
                    });
                }, debounce);
            });
            this.setState({
                containerHeight: element.offsetHeight,
                containerWidth: element.offsetWidth
            });
        };
        ResponsiveFrame.prototype.render = function () {
            var _this = this;
            var _a = this.props, responsiveWidth = _a.responsiveWidth, responsiveHeight = _a.responsiveHeight, size = _a.size, dataVersion = _a.dataVersion, debounce = _a.debounce, gridDisplay = _a.gridDisplay, rest = __rest(_a, ["responsiveWidth", "responsiveHeight", "size", "dataVersion", "debounce", "gridDisplay"]);
            var _b = this.state, containerHeight = _b.containerHeight, containerWidth = _b.containerWidth;
            var actualSize = __spread(size);
            var returnEmpty = false;
            if (responsiveWidth) {
                if (!containerWidth)
                    returnEmpty = true;
                actualSize[0] = containerWidth;
            }
            if (responsiveHeight) {
                if (!containerHeight)
                    returnEmpty = true;
                actualSize[1] = containerHeight;
            }
            var dataVersionWithSize = dataVersion + actualSize.toString() + debounce;
            return (React.createElement("div", { className: "responsive-container", style: gridDisplay
                    ? { minWidth: "0px", minHeight: "0px" }
                    : { height: "100%", width: "100%" }, ref: function (node) { return (_this.node = node); } }, !returnEmpty && (React.createElement(ParticularFrame, __assign({}, rest, { size: actualSize, dataVersion: dataVersion ? dataVersionWithSize : undefined })))));
        };
        return ResponsiveFrame;
    }(React.Component)),
    _a.defaultProps = {
        size: [500, 500],
        debounce: 200
    },
    _a.displayName = "Responsive" + ParticularFrame.displayName,
    _a; };
exports.default = createResponsiveFrame;
//# sourceMappingURL=ResponsiveFrame.js.map