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
var typeHash = {
    fill: function (style) { return React.createElement("rect", { style: style, width: 20, height: 20 }); },
    line: function (style) { return React.createElement("line", { style: style, x1: 0, y1: 0, x2: 20, y2: 20 }); }
};
function renderType(item, i, type, styleFn) {
    var renderedType;
    if (typeof type === "function") {
        renderedType = type(item);
    }
    else {
        var Type = typeHash[type];
        var style = styleFn(item, i);
        renderedType = Type(style);
    }
    return renderedType;
}
var Legend = /** @class */ (function (_super) {
    __extends(Legend, _super);
    function Legend() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Legend.prototype.renderLegendGroup = function (legendGroup) {
        var _a = legendGroup.type, type = _a === void 0 ? "fill" : _a, styleFn = legendGroup.styleFn, items = legendGroup.items;
        var renderedItems = [];
        var itemOffset = 0;
        items.forEach(function (item, i) {
            var renderedType = renderType(item, i, type, styleFn);
            renderedItems.push(React.createElement("g", { key: "legend-item-" + i, transform: "translate(0," + itemOffset + ")" },
                renderedType,
                React.createElement("text", { y: 15, x: 30 }, item.label)));
            itemOffset += 25;
        });
        return renderedItems;
    };
    Legend.prototype.renderLegendGroupHorizontal = function (legendGroup) {
        var _a = legendGroup.type, type = _a === void 0 ? "fill" : _a, styleFn = legendGroup.styleFn, items = legendGroup.items;
        var renderedItems = [];
        var itemOffset = 0;
        items.forEach(function (item, i) {
            var renderedType = renderType(item, i, type, styleFn);
            renderedItems.push(React.createElement("g", { key: "legend-item-" + i, transform: "translate(" + itemOffset + ",0)" },
                renderedType,
                React.createElement("text", { y: 15, x: 25 }, item.label)));
            itemOffset += 35;
            itemOffset += item.label.length * 8;
        });
        return { items: renderedItems, offset: itemOffset };
    };
    Legend.prototype.renderGroup = function (_a) {
        var _this = this;
        var legendGroups = _a.legendGroups, width = _a.width;
        var offset = 30;
        var renderedGroups = [];
        legendGroups.forEach(function (l, i) {
            offset += 5;
            renderedGroups.push(React.createElement("line", { key: "legend-top-line legend-symbol-" + i, stroke: "gray", x1: 0, y1: offset, x2: width, y2: offset }));
            offset += 10;
            if (l.label) {
                offset += 20;
                renderedGroups.push(React.createElement("text", { key: "legend-text-" + i, y: offset, className: "legend-group-label" }, l.label));
                offset += 10;
            }
            renderedGroups.push(React.createElement("g", { key: "legend-group-" + i, className: "legend-item", transform: "translate(0," + offset + ")" }, _this.renderLegendGroup(l)));
            offset += l.items.length * 25 + 10;
        });
        return renderedGroups;
    };
    Legend.prototype.renderHorizontalGroup = function (_a) {
        var _this = this;
        var legendGroups = _a.legendGroups, title = _a.title, height = _a.height;
        var offset = 0;
        var renderedGroups = [];
        var verticalOffset = title === false ? 10 : 40;
        legendGroups.forEach(function (l, i) {
            if (l.label) {
                renderedGroups.push(React.createElement("text", { key: "legend-text-" + i, transform: "translate(" + offset + "," + verticalOffset + ") rotate(90)", textAnchor: "start", className: "legend-group-label" }, l.label));
                offset += 20;
            }
            var renderedItems = _this.renderLegendGroupHorizontal(l);
            renderedGroups.push(React.createElement("g", { key: "legend-group-" + i, className: "legend-item", transform: "translate(" + offset + "," + verticalOffset + ")" }, renderedItems.items));
            offset += renderedItems.offset + 5;
            if (legendGroups[i + 1]) {
                renderedGroups.push(React.createElement("line", { key: "legend-top-line legend-symbol-" + i, stroke: "gray", x1: offset, y1: verticalOffset - 10, x2: offset, y2: height + verticalOffset + 10 }));
            }
            offset += 15;
        });
        return (React.createElement("g", null,
            title !== false && (React.createElement("line", { x1: 0, x2: offset + 10, y1: verticalOffset - 10, y2: verticalOffset - 10, stroke: "gray", className: "title-neatline" })),
            renderedGroups));
    };
    Legend.prototype.render = function () {
        var _a = this.props, legendGroups = _a.legendGroups, _b = _a.title, title = _b === void 0 ? "Legend" : _b, _c = _a.width, width = _c === void 0 ? 100 : _c, _d = _a.height, height = _d === void 0 ? 20 : _d, _e = _a.orientation, orientation = _e === void 0 ? "vertical" : _e;
        var renderedGroups = orientation === "vertical"
            ? this.renderGroup({
                legendGroups: legendGroups,
                width: width
            })
            : this.renderHorizontalGroup({
                legendGroups: legendGroups,
                title: title,
                height: height
            });
        return (React.createElement("g", null,
            title !== undefined && (React.createElement("text", { className: "legend-title", y: 20, x: orientation === "horizontal" ? 0 : width / 2, textAnchor: orientation === "horizontal" ? "start" : "middle" }, title)),
            renderedGroups));
    };
    return Legend;
}(React.Component));
exports.default = Legend;
//# sourceMappingURL=Legend.js.map