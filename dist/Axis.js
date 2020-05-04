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
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var axis_1 = require("./visualizationLayerBehavior/axis");
var summaryLayouts_1 = require("./svg/summaryLayouts");
// components
var marginalPointMapper = function (orient, width, data) {
    var xMod = orient === "left" || orient === "right" ? width / 2 : 0;
    var yMod = orient === "bottom" || orient === "top" ? width / 2 : 0;
    return data.map(function (p) { return [p.xy.x + xMod, p.xy.y + yMod]; });
};
function formatValue(value, props) {
    if (props.tickFormat) {
        return props.tickFormat(value);
    }
    if (value.toString) {
        return value.toString();
    }
    return value;
}
var Axis = /** @class */ (function (_super) {
    __extends(Axis, _super);
    function Axis(props) {
        var _this = _super.call(this, props) || this;
        _this.axisRef = null;
        _this.boundingBoxMax = function () {
            // && this.props.dynamicLabel ???
            if (!_this.axisRef)
                return 30;
            var _a = _this.props.orient, orient = _a === void 0 ? "left" : _a;
            var positionType = orient === "left" || orient === "right" ? "width" : "height";
            var axisLabelMax = Math.max.apply(Math, __spread(__spread(_this.axisRef.querySelectorAll(".axis-label")).map(function (l) {
                return (l.getBBox && l.getBBox()) || { height: 30, width: 30 };
            })
                .map(function (d) { return d[positionType]; }))) + 25;
            return axisLabelMax;
        };
        _this.state = { hoverAnnotation: 0 };
        return _this;
    }
    Axis.prototype.componentDidUpdate = function () {
        var _a = this.props, _b = _a.label, label = _b === void 0 ? { position: false } : _b, dynamicLabelPosition = _a.dynamicLabelPosition;
        var calculatedLabelPosition = this.state.calculatedLabelPosition;
        if (!label.position && dynamicLabelPosition) {
            var newBBMax = this.boundingBoxMax();
            if (newBBMax !== calculatedLabelPosition) {
                this.setState({ calculatedLabelPosition: newBBMax });
            }
        }
    };
    Axis.prototype.componentDidMount = function () {
        var _a = this.props, _b = _a.label, label = _b === void 0 ? { position: false } : _b, dynamicLabelPosition = _a.dynamicLabelPosition;
        if (!label.position && dynamicLabelPosition) {
            var newBBMax = this.boundingBoxMax();
            this.setState({ calculatedLabelPosition: newBBMax });
        }
    };
    Axis.prototype.render = function () {
        var _this = this;
        var _a = this.props, rotate = _a.rotate, label = _a.label, _b = _a.orient, orient = _b === void 0 ? "left" : _b, marginalSummaryType = _a.marginalSummaryType, _c = _a.tickFormat, tickFormat = _c === void 0 ? marginalSummaryType ? function () { return ""; } : function (d) { return d; } : _c, size = _a.size, _d = _a.width, width = _d === void 0 ? (size && size[0]) || 0 : _d, _e = _a.height, height = _e === void 0 ? (size && size[1]) || 0 : _e, className = _a.className, padding = _a.padding, tickValues = _a.tickValues, scale = _a.scale, ticks = _a.ticks, footer = _a.footer, tickSize = _a.tickSize, tickLineGenerator = _a.tickLineGenerator, _f = _a.baseline, baseline = _f === void 0 ? true : _f, _g = _a.margin, margin = _g === void 0 ? { top: 0, bottom: 0, left: 0, right: 0 } : _g, _h = _a.center, center = _h === void 0 ? false : _h, annotationFunction = _a.annotationFunction, glyphFunction = _a.glyphFunction, xyPoints = _a.xyPoints;
        var _j = this.props, axisParts = _j.axisParts, _k = _j.position, position = _k === void 0 ? [0, 0] : _k;
        var axisTickLines;
        if (!axisParts) {
            axisParts = axis_1.axisPieces({
                padding: padding,
                tickValues: tickValues,
                scale: scale,
                ticks: ticks,
                orient: orient,
                size: [width, height],
                footer: footer,
                tickSize: tickSize
            });
            axisTickLines = (React.createElement("g", { className: "axis " + className }, axis_1.axisLines({
                axisParts: axisParts,
                orient: orient,
                tickLineGenerator: tickLineGenerator,
                className: className,
                scale: scale
            })));
        }
        if (axisParts.length === 0) {
            return null;
        }
        var hoverWidth = 50;
        var hoverHeight = height;
        var hoverX = -50;
        var hoverY = 0;
        var baselineX = 0;
        var baselineY = 0;
        var baselineX2 = 0;
        var baselineY2 = height;
        var hoverFunction = function (e) {
            _this.setState({ hoverAnnotation: e.nativeEvent.offsetY });
        };
        var circleX = 25;
        var textX = -25;
        var textY = 18;
        var lineWidth = width + 25;
        var lineHeight = 0;
        var circleY = this.state.hoverAnnotation;
        var annotationOffset = 0;
        var annotationType = "y";
        switch (orient) {
            case "right":
                position = [position[0], position[1]];
                hoverX = width;
                baselineX2 = baselineX = width;
                annotationOffset = margin.top;
                lineWidth = -width - 25;
                textX = 5;
                hoverFunction = function (e) {
                    return _this.setState({
                        hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
                    });
                };
                if (center === true) {
                    baselineX2 = baselineX = width / 2;
                }
                break;
            case "top":
                position = [position[0], 0];
                hoverWidth = width;
                hoverHeight = 50;
                hoverY = -50;
                hoverX = 0;
                annotationOffset = margin.left;
                annotationType = "x";
                baselineX2 = width;
                baselineY2 = 0;
                if (center === true) {
                    baselineY2 = baselineY = height / 2;
                }
                hoverFunction = function (e) {
                    return _this.setState({
                        hoverAnnotation: e.nativeEvent.offsetX - annotationOffset
                    });
                };
                circleX = this.state.hoverAnnotation;
                circleY = 25;
                textX = 0;
                textY = -10;
                lineWidth = 0;
                lineHeight = height + 25;
                break;
            case "bottom":
                position = [position[0], 0];
                hoverWidth = width;
                hoverHeight = 50;
                baselineY = baselineY2 = hoverY = height;
                baselineX = hoverX = 0;
                baselineX2 = width;
                annotationOffset = margin.left;
                hoverFunction = function (e) {
                    return _this.setState({
                        hoverAnnotation: e.nativeEvent.offsetX - annotationOffset
                    });
                };
                circleX = this.state.hoverAnnotation;
                circleY = 25;
                textX = 0;
                textY = 15;
                lineWidth = 0;
                lineHeight = -height - 25;
                annotationType = "x";
                if (center === true) {
                    baselineY2 = baselineY = height / 2;
                }
                break;
            default:
                position = [position[0], position[1]];
                annotationOffset = margin.top;
                if (center === true) {
                    baselineX2 = baselineX = width / 2;
                }
                hoverFunction = function (e) {
                    _this.setState({
                        hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
                    });
                };
        }
        var annotationBrush;
        if (annotationFunction) {
            var formattedValue = formatValue(scale.invert(this.state.hoverAnnotation), this.props);
            var hoverGlyph = glyphFunction ? (glyphFunction({
                lineHeight: lineHeight,
                lineWidth: lineWidth,
                value: scale.invert(this.state.hoverAnnotation)
            })) : (React.createElement("g", null,
                React.isValidElement(formattedValue) ? (React.createElement("g", { transform: "translate(" + textX + "," + textY + ")" }, formattedValue)) : (React.createElement("text", { x: textX, y: textY }, formattedValue)),
                React.createElement("circle", { r: 5 }),
                React.createElement("line", { x1: lineWidth, y1: lineHeight, style: { stroke: "black" } })));
            var annotationSymbol = this.state.hoverAnnotation ? (React.createElement("g", { style: { pointerEvents: "none" }, transform: "translate(" + circleX + "," + circleY + ")" }, hoverGlyph)) : null;
            annotationBrush = (React.createElement("g", { className: "annotation-brush", transform: "translate(" + hoverX + "," + hoverY + ")" },
                React.createElement("rect", { style: { fillOpacity: 0 }, height: hoverHeight, width: hoverWidth, onMouseMove: hoverFunction, onClick: function () {
                        return annotationFunction({
                            className: "dynamic-axis-annotation",
                            type: annotationType,
                            value: scale.invert(_this.state.hoverAnnotation)
                        });
                    }, onMouseOut: function () { return _this.setState({ hoverAnnotation: undefined }); } }),
                annotationSymbol));
        }
        var summaryGraphic;
        if (marginalSummaryType && xyPoints) {
            var summaryWidth = Math.max(margin[orient] - 6, 5);
            var decoratedSummaryType_1 = typeof marginalSummaryType === "string"
                ? { type: marginalSummaryType }
                : marginalSummaryType;
            if (decoratedSummaryType_1.flip === undefined &&
                (orient === "bottom" || orient === "right")) {
                decoratedSummaryType_1.flip = true;
            }
            var summaryStyle = decoratedSummaryType_1.summaryStyle
                ? function () { return decoratedSummaryType_1.summaryStyle; }
                : function () { return ({
                    fill: "black",
                    fillOpacity: 0.5,
                    stroke: "black",
                    strokeDasharray: "0"
                }); };
            var summaryRenderMode = decoratedSummaryType_1.renderMode
                ? function () { return decoratedSummaryType_1.renderMode; }
                : function () { return undefined; };
            var summaryClass = decoratedSummaryType_1.summaryClass
                ? function () { return decoratedSummaryType_1.summaryClass; }
                : function () { return ""; };
            var dataFilter_1 = decoratedSummaryType_1.filter || (function () { return true; });
            var forSummaryData = xyPoints
                .filter(function (p) {
                return p.x !== undefined && p.y !== undefined && dataFilter_1(p.data);
            })
                .map(function (d) { return (__assign(__assign({}, d), { xy: {
                    x: orient === "top" || orient === "bottom" ? scale(d.x) : 0,
                    y: orient === "left" || orient === "right" ? scale(d.y) : 0
                }, piece: {
                    scaledVerticalValue: scale(d.y),
                    scaledValue: scale(d.x)
                }, value: orient === "top" || orient === "bottom" ? scale(d.y) : scale(d.x), scaledValue: scale(d.x), scaledVerticalValue: scale(d.y) })); });
            var renderedSummary = summaryLayouts_1.drawSummaries({
                data: {
                    column: {
                        middle: summaryWidth / 2,
                        pieceData: forSummaryData,
                        width: summaryWidth,
                        xyData: forSummaryData
                    }
                },
                type: decoratedSummaryType_1,
                renderMode: summaryRenderMode,
                eventListenersGenerator: decoratedSummaryType_1.eventListenersGenerator || (function () { return ({}); }),
                styleFn: summaryStyle,
                classFn: summaryClass,
                projection: orient === "top" || orient === "bottom" ? "horizontal" : "vertical",
                adjustedSize: size,
                margin: { top: 0, bottom: 0, left: 0, right: 0 },
                baseMarkProps: {}
            });
            var points = void 0;
            if (decoratedSummaryType_1.showPoints === true) {
                var mappedPoints = marginalPointMapper(orient, summaryWidth, forSummaryData);
                points = mappedPoints.map(function (d, i) { return (React.createElement("circle", { key: "axis-summary-point-" + i, cx: d[0], cy: d[1], r: decoratedSummaryType_1.r || 3, style: decoratedSummaryType_1.pointStyle || {
                        fill: "black",
                        fillOpacity: 0.1
                    } })); });
            }
            var translation = {
                left: [-margin.left + 2, 0],
                right: [size[0] + 2, 0],
                top: [0, -margin.top + 2],
                bottom: [0, size[1] + 2]
            };
            summaryGraphic = (React.createElement("g", { transform: "translate(" + translation[orient] + ")" },
                React.createElement("g", { transform: "translate(" + ((decoratedSummaryType_1.type === "contour" ||
                        decoratedSummaryType_1.type === "boxplot") &&
                        (orient === "left" || orient === "right")
                        ? summaryWidth / 2
                        : 0) + "," + ((decoratedSummaryType_1.type === "contour" ||
                        decoratedSummaryType_1.type === "boxplot") &&
                        (orient === "top" || orient === "bottom")
                        ? summaryWidth / 2
                        : 0) + ")" }, renderedSummary.marks),
                points));
        }
        var axisTitle;
        var axisTickLabels = axis_1.axisLabels({
            tickFormat: tickFormat,
            axisParts: axisParts,
            orient: orient,
            rotate: rotate,
            center: center
        });
        if (label) {
            var labelName = label.name || label;
            var labelPosition = label.position || {};
            var locationMod = labelPosition.location || "outside";
            var anchorMod = labelPosition.anchor || "middle";
            var distance = label.locationDistance || this.state.calculatedLabelPosition;
            var rotateHash = {
                left: -90,
                right: 90,
                top: 0,
                bottom: 0
            };
            var rotation = labelPosition.rotation || rotateHash[orient];
            var positionHash = {
                left: {
                    start: [0, size[1]],
                    middle: [0, size[1] / 2],
                    end: [0, 0],
                    inside: [distance || 15, 0],
                    outside: [-(distance || 45), 0]
                },
                right: {
                    start: [size[0] + 0, size[1]],
                    middle: [size[0] + 0, size[1] / 2],
                    end: [size[0] + 0, 0],
                    inside: [-(distance || 15), 0],
                    outside: [distance || 45, 0]
                },
                top: {
                    start: [0, 0],
                    middle: [0 + size[0] / 2, 0],
                    end: [0 + size[0], 0],
                    inside: [0, distance || 15],
                    outside: [0, -(distance || 40)]
                },
                bottom: {
                    start: [0, size[1]],
                    middle: [0 + size[0] / 2, size[1]],
                    end: [0 + size[0], size[1]],
                    inside: [0, -(distance || 5)],
                    outside: [0, distance || 50]
                }
            };
            var translation = positionHash[orient][anchorMod];
            var location_1 = positionHash[orient][locationMod];
            translation[0] = translation[0] + location_1[0];
            translation[1] = translation[1] + location_1[1];
            if (anchorMod === "start" && orient === "right") {
                anchorMod = "end";
            }
            else if (anchorMod === "end" && orient === "right") {
                anchorMod = "start";
            }
            axisTitle = (React.createElement("g", { className: "axis-title " + className, transform: "translate(" + [
                    translation[0] + position[0],
                    translation[1] + position[1]
                ] + ") rotate(" + rotation + ")" }, React.isValidElement(labelName) ? (labelName) : (React.createElement("text", { textAnchor: anchorMod }, labelName))));
        }
        var axisAriaLabel = orient + " axis " + ((axisParts &&
            axisParts.length > 0 &&
            "from " + tickFormat(axisParts[0].value, 0) + " to " + tickFormat(axisParts[axisParts.length - 1].value, axisParts.length - 1)) ||
            "without ticks");
        return (React.createElement("g", { className: className, "aria-label": axisAriaLabel, ref: function (node) { return (_this.axisRef = node); } },
            annotationBrush,
            axisTickLabels,
            axisTickLines,
            baseline === true ? (React.createElement("line", { key: "baseline", className: "axis-baseline " + className, stroke: "black", strokeLinecap: "square", x1: baselineX, x2: baselineX2, y1: baselineY, y2: baselineY2 })) : null,
            axisTitle,
            summaryGraphic));
    };
    return Axis;
}(React.Component));
exports.default = Axis;
//# sourceMappingURL=Axis.js.map