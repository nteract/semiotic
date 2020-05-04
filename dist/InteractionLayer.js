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
var d3_brush_1 = require("d3-brush");
var d3_selection_1 = require("d3-selection");
// components
var Brush_1 = __importDefault(require("./Brush"));
var SpanOrDiv_1 = require("./SpanOrDiv");
var InteractionItems_1 = require("./processing/InteractionItems");
var InteractionCanvas_1 = __importDefault(require("./interactionLayerBehavior/InteractionCanvas"));
var generateOMappingFn = function (projectedColumns) { return function (d) {
    if (d) {
        var columnValues = Object.values(projectedColumns);
        var foundColumns = columnValues.filter(function (c) {
            return d[1] >= c.x && d[0] <= c.x + c.width;
        });
        return foundColumns;
    }
    return null;
}; };
var generateOEndMappingFn = function (projectedColumns) { return function (d) {
    if (d &&
        d3_selection_1.event.sourceEvent &&
        d3_selection_1.event.sourceEvent.path &&
        d3_selection_1.event.sourceEvent.path[1] &&
        d3_selection_1.event.sourceEvent.path[1].classList.contains("xybrush") &&
        d3_selection_1.event.target.move) {
        var columnValues = Object.values(projectedColumns);
        var foundColumns = columnValues.filter(function (c) { return d[1] >= c.x && d[0] <= c.x + c.width; });
        var firstColumn = foundColumns[0] || {
            x: 0,
            width: 0
        };
        var lastColumn = foundColumns[foundColumns.length - 1] || {
            x: 0,
            width: 0
        };
        var columnPosition = [
            firstColumn.x + Math.min(5, firstColumn.width / 10),
            lastColumn.x + lastColumn.width - Math.min(5, lastColumn.width / 10)
        ];
        d3_selection_1.select(d3_selection_1.event.sourceEvent.path[1])
            .transition(750)
            .call(d3_selection_1.event.target.move, columnPosition);
        return foundColumns;
    }
    return null;
}; };
var InteractionLayer = /** @class */ (function (_super) {
    __extends(InteractionLayer, _super);
    function InteractionLayer(props) {
        var _this = _super.call(this, props) || this;
        _this.createBrush = function (interaction) {
            var semioticBrush, mappingFn, selectedExtent, endMappingFn;
            var _a = _this.props, xScale = _a.xScale, yScale = _a.yScale, size = _a.size, renderPipeline = _a.renderPipeline;
            var brushData = {};
            Object.entries(renderPipeline).forEach(function (_a) {
                var _b = __read(_a, 2), key = _b[0], value = _b[1];
                if (value.data && value.data.length > 0) {
                    brushData[key] = value.data;
                }
            });
            var projection = interaction.projection, projectedColumns = interaction.projectedColumns;
            var actualBrush = interaction.brush === "oBrush"
                ? projection === "horizontal"
                    ? "yBrush"
                    : "xBrush"
                : interaction.brush;
            var _b = interaction.extent, extent = _b === void 0 ? actualBrush === "xyBrush"
                ? [
                    [xScale.invert(0), yScale.invert(0)],
                    [xScale.invert(size[0]), yScale.invert(size[1])]
                ]
                : actualBrush === "xBrush"
                    ? [xScale.invert(0), xScale.invert(size[0])]
                    : [yScale.invert(0), yScale.invert(size[1])] : _b;
            if (extent.indexOf && extent.indexOf(undefined) !== -1) {
                return React.createElement("g", null);
            }
            if (actualBrush === "xBrush") {
                var castExtent = extent;
                mappingFn = function (d) {
                    return !d ? null : [xScale.invert(d[0]), xScale.invert(d[1])];
                };
                semioticBrush = d3_brush_1.brushX();
                selectedExtent = castExtent.map(function (d) { return xScale(d); });
                endMappingFn = mappingFn;
            }
            else if (actualBrush === "yBrush") {
                var castExtent = extent;
                mappingFn = function (d) {
                    return !d
                        ? null
                        : [yScale.invert(d[0]), yScale.invert(d[1])].sort(function (a, b) { return a - b; });
                };
                semioticBrush = d3_brush_1.brushY();
                selectedExtent = castExtent.map(function (d) { return yScale(d); }).sort(function (a, b) { return a - b; });
                endMappingFn = mappingFn;
            }
            else {
                var castExtent = extent;
                if (castExtent.indexOf(undefined) !== -1 ||
                    castExtent[0].indexOf(undefined) !== -1 ||
                    castExtent[1].indexOf(undefined) !== -1) {
                    return React.createElement("g", null);
                }
                semioticBrush = d3_brush_1.brush();
                mappingFn = function (d) {
                    if (!d)
                        return null;
                    var yValues = [yScale.invert(d[0][1]), yScale.invert(d[1][1])].sort(function (a, b) { return a - b; });
                    return [
                        [xScale.invert(d[0][0]), yValues[0]],
                        [xScale.invert(d[1][0]), yValues[1]]
                    ];
                };
                var yValues_1 = [yScale(extent[0][1]), yScale(extent[1][1])].sort(function (a, b) { return a - b; });
                selectedExtent = castExtent.map(function (d, i) { return [xScale(d[0]), yValues_1[i]]; });
                endMappingFn = mappingFn;
            }
            if (interaction.brush === "oBrush") {
                selectedExtent = null;
                if (interaction.extent) {
                    var _c = __read(interaction.extent, 2), leftExtent = _c[0], rightExtent = _c[1];
                    if ((typeof leftExtent === "string" || typeof leftExtent === "number") &&
                        (typeof rightExtent === "string" || typeof rightExtent === "number")) {
                        selectedExtent = [
                            projectedColumns[leftExtent].x,
                            projectedColumns[rightExtent].x +
                                projectedColumns[rightExtent].width
                        ];
                    }
                }
                mappingFn = generateOMappingFn(projectedColumns);
                endMappingFn = generateOEndMappingFn(projectedColumns);
            }
            semioticBrush
                .extent([[0, 0], [size[0], size[1]]])
                .on("start", function () {
                InteractionItems_1.brushStart(mappingFn(d3_selection_1.event.selection), undefined, brushData, undefined, interaction);
            })
                .on("brush", function () {
                InteractionItems_1.brushing(mappingFn(d3_selection_1.event.selection), undefined, brushData, undefined, interaction);
            })
                .on("end", function () {
                InteractionItems_1.brushEnd(endMappingFn(d3_selection_1.event.selection), undefined, brushData, undefined, interaction);
            });
            return (React.createElement("g", { className: "brush" },
                React.createElement(Brush_1.default, { selectedExtent: selectedExtent, extent: extent, svgBrush: semioticBrush })));
        };
        _this.createColumnsBrush = function (interaction) {
            var _a = _this.props, projection = _a.projection, rScale = _a.rScale, oColumns = _a.oColumns, renderPipeline = _a.renderPipeline;
            if (!projection || !rScale || !oColumns)
                return;
            var brushData = {};
            Object.entries(renderPipeline).forEach(function (_a) {
                var _b = __read(_a, 2), key = _b[0], value = _b[1];
                if (value.data && value.data.length > 0) {
                    brushData[key] = value.data;
                }
            });
            var semioticBrush, mappingFn;
            var rScaleReverse = rScale
                .copy()
                .domain(rScale.domain())
                .range(rScale.domain().reverse());
            if (projection && projection === "horizontal") {
                mappingFn = function (d) {
                    return !d ? null : [rScale.invert(d[0]), rScale.invert(d[1])];
                };
            }
            else
                mappingFn = function (d) {
                    return !d
                        ? null
                        : [
                            rScaleReverse(rScale.invert(d[1])),
                            rScaleReverse(rScale.invert(d[0]))
                        ];
                };
            var rRange = rScale.range();
            var columnHash = oColumns;
            var brushPosition, selectedExtent;
            var brushes = Object.keys(columnHash).map(function (c) {
                if (projection && projection === "horizontal") {
                    selectedExtent = interaction.extent[c]
                        ? interaction.extent[c].map(function (d) { return rScale(d); })
                        : interaction.startEmpty ? null : rRange;
                    brushPosition = [0, columnHash[c].x];
                    semioticBrush = d3_brush_1.brushX();
                    semioticBrush
                        .extent([[rRange[0], 0], [rRange[1], columnHash[c].width]])
                        .on("start", function () {
                        InteractionItems_1.brushStart(mappingFn(d3_selection_1.event.selection), c, brushData, columnHash[c], interaction);
                    })
                        .on("brush", function () {
                        InteractionItems_1.brushing(mappingFn(d3_selection_1.event.selection), c, brushData, columnHash[c], interaction);
                    })
                        .on("end", function () {
                        InteractionItems_1.brushEnd(mappingFn(d3_selection_1.event.selection), c, brushData, columnHash[c], interaction);
                    });
                }
                else {
                    selectedExtent = interaction.extent[c]
                        ? interaction.extent[c].map(function (d) { return rRange[1] - rScale(d); }).reverse()
                        : interaction.startEmpty ? null : rRange;
                    brushPosition = [columnHash[c].x, 0];
                    semioticBrush = d3_brush_1.brushY();
                    semioticBrush
                        .extent([[0, rRange[0]], [columnHash[c].width, rRange[1]]])
                        .on("start", function () {
                        InteractionItems_1.brushStart(mappingFn(d3_selection_1.event.selection), c, brushData, columnHash[c], interaction);
                    })
                        .on("brush", function () {
                        InteractionItems_1.brushing(mappingFn(d3_selection_1.event.selection), c, brushData, columnHash[c], interaction);
                    })
                        .on("end", function () {
                        InteractionItems_1.brushEnd(mappingFn(d3_selection_1.event.selection), c, brushData, columnHash[c], interaction);
                    });
                }
                return (React.createElement("g", { key: "column-brush-" + c, className: "brush" },
                    React.createElement(Brush_1.default, { key: "orbrush" + c, selectedExtent: selectedExtent, svgBrush: semioticBrush, position: brushPosition })));
            });
            return brushes;
        };
        var canvasMap = new Map();
        var canvasRendering = props.canvasRendering, useSpans = props.useSpans, svgSize = props.svgSize, margin = props.margin, voronoiHover = props.voronoiHover;
        var initialOverlayRegions = InteractionItems_1.calculateOverlay(props);
        _this.state = {
            overlayRegions: initialOverlayRegions,
            canvasMap: canvasMap,
            interactionCanvas: canvasRendering && React.createElement(InteractionCanvas_1.default, { height: svgSize[1], width: svgSize[0], overlayRegions: initialOverlayRegions, margin: margin, voronoiHover: voronoiHover }),
            props: props,
            SpanOrDiv: SpanOrDiv_1.HOCSpanOrDiv(useSpans)
        };
        return _this;
    }
    InteractionLayer.getDerivedStateFromProps = function (nextProps, prevState) {
        var props = prevState.props;
        if (props.overlay !== nextProps.overlay ||
            nextProps.points !== props.points ||
            props.xScale !== nextProps.xScale ||
            props.yScale !== nextProps.yScale ||
            ((!props.hoverAnnotation && nextProps.hoverAnnotation) || (props.hoverAnnotation && !nextProps.hoverAnnotation))) {
            var disableCanvasInteraction = nextProps.disableCanvasInteraction, canvasRendering = nextProps.canvasRendering, svgSize = nextProps.svgSize, margin = nextProps.margin, voronoiHover = nextProps.voronoiHover;
            var overlayRegions = prevState.overlayRegions;
            var nextOverlay = void 0, interactionCanvas = void 0;
            if (disableCanvasInteraction ||
                !overlayRegions) {
                nextOverlay = null;
                interactionCanvas = null;
            }
            else {
                nextOverlay = InteractionItems_1.calculateOverlay(nextProps);
                if (canvasRendering) {
                    interactionCanvas = React.createElement(InteractionCanvas_1.default, { height: svgSize[1], width: svgSize[0], overlayRegions: nextOverlay, margin: margin, voronoiHover: voronoiHover });
                }
            }
            return {
                overlayRegions: nextOverlay,
                props: nextProps,
                interactionCanvas: interactionCanvas
            };
        }
        return null;
    };
    InteractionLayer.prototype.render = function () {
        var semioticBrush = null;
        var _a = this.props, interaction = _a.interaction, svgSize = _a.svgSize, margin = _a.margin, _b = _a.useSpans, useSpans = _b === void 0 ? false : _b;
        var _c = this.state, overlayRegions = _c.overlayRegions, interactionCanvas = _c.interactionCanvas, SpanOrDiv = _c.SpanOrDiv;
        var enabled = this.props.enabled;
        if (interaction && interaction.brush) {
            enabled = true;
            semioticBrush = this.createBrush(interaction);
        }
        if (interaction && interaction.columnsBrush) {
            enabled = true;
            semioticBrush = this.createColumnsBrush(interaction);
        }
        if (!overlayRegions && !semioticBrush) {
            return null;
        }
        return (React.createElement(SpanOrDiv, { span: useSpans, className: "interaction-layer", style: {
                position: "absolute",
                background: "none",
                pointerEvents: "none"
            } }, interactionCanvas || (React.createElement("svg", { height: svgSize[1], width: svgSize[0], style: { background: "none", pointerEvents: "none" } },
            React.createElement("g", { className: "interaction-overlay", transform: "translate(" + margin.left + "," + margin.top + ")", style: { pointerEvents: enabled ? "all" : "none" } },
                React.createElement("g", { className: "interaction-regions" }, overlayRegions),
                semioticBrush)))));
    };
    InteractionLayer.defaultProps = {
        svgSize: [500, 500]
    };
    return InteractionLayer;
}(React.PureComponent));
exports.default = InteractionLayer;
//# sourceMappingURL=InteractionLayer.js.map