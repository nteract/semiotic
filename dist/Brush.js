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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var d3_selection_1 = require("d3-selection");
var flatten = function (list) {
    return list.reduce(function (a, b) { return a.concat(Array.isArray(b) ? flatten(b.sort(function (a, b) { return a - b; })) : b); }, []);
};
function flatShortArray(array) {
    if (!Array.isArray(array))
        return "not-array";
    if (!Array.isArray(array[0])) {
        array = array.sort(function (a, b) { return a - b; });
    }
    var flat = flatten(array);
    var stringifiedFlattened = flat
        .map(function (d) {
        return (d instanceof Date && d.toString()) ||
            (d !== undefined && d.toFixed && d.toFixed(2)) ||
            "empty";
    })
        .toString();
    return stringifiedFlattened;
}
var Brush = /** @class */ (function (_super) {
    __extends(Brush, _super);
    function Brush(props) {
        var _this = _super.call(this, props) || this;
        _this.node = null;
        _this.createBrush = _this.createBrush.bind(_this);
        return _this;
    }
    Brush.prototype.componentDidMount = function () {
        this.createBrush();
    };
    Brush.prototype.componentDidUpdate = function (lastProps) {
        var _a = this.props, extent = _a.extent, selectedExtent = _a.selectedExtent;
        if ((lastProps.extent &&
            extent &&
            flatShortArray(lastProps.extent) !==
                flatShortArray(extent)) ||
            ((lastProps.selectedExtent &&
                selectedExtent &&
                flatShortArray(lastProps.selectedExtent) !==
                    flatShortArray(selectedExtent)) ||
                (!lastProps.selectedExtent && selectedExtent) ||
                (lastProps.selectedExtent && !selectedExtent))) {
            this.createBrush();
        }
    };
    Brush.prototype.createBrush = function () {
        var node = this.node;
        var _a = this.props, brush = _a.svgBrush, baseSelectedExtent = _a.selectedExtent;
        d3_selection_1.select(node).call(brush);
        if (baseSelectedExtent) {
            var selectedExtent = baseSelectedExtent;
            if (Array.isArray(baseSelectedExtent[0])) {
                var sortedY = [selectedExtent[0][1], selectedExtent[1][1]].sort(function (a, b) { return a - b; });
                selectedExtent = [
                    [selectedExtent[0][0], sortedY[0]],
                    [selectedExtent[1][0], sortedY[1]]
                ];
            }
            d3_selection_1.select(node).call(brush.move, selectedExtent);
        }
    };
    Brush.prototype.render = function () {
        var _this = this;
        var _a = this.props.position, position = _a === void 0 ? [0, 0] : _a;
        return (React.createElement("g", { transform: "translate(" + position + ")", ref: function (node) { return (_this.node = node); }, className: "xybrush" }));
    };
    return Brush;
}(React.Component));
exports.default = Brush;
//# sourceMappingURL=Brush.js.map