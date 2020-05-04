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
var updateVisualizationLayer = function (props, handleKeyDown) {
    var xScale = props.xScale, yScale = props.yScale, dataVersion = props.dataVersion, projectedCoordinateNames = props.projectedCoordinateNames, _a = props.renderPipeline, renderPipeline = _a === void 0 ? {} : _a, _b = props.baseMarkProps, baseMarkProps = _b === void 0 ? {} : _b, _c = props.renderOrder, renderOrder = _c === void 0 ? [] : _c, sketchyRenderingEngine = props.sketchyRenderingEngine;
    var canvasDrawing = [];
    var piecesGroup = {};
    var renderedElements = [];
    var renderVizKeys = Object.keys(renderPipeline);
    var renderKeys = renderOrder.concat(renderVizKeys.filter(function (d) { return renderOrder.indexOf(d) === -1; }));
    renderKeys.forEach(function (k) {
        var pipe = renderPipeline[k];
        if (pipe &&
            ((pipe.data &&
                typeof pipe.data === "object" &&
                !Array.isArray(pipe.data)) ||
                (pipe.data && pipe.data.length > 0))) {
            var additionalMarkProps = {
                sketchyGenerator: sketchyRenderingEngine && sketchyRenderingEngine.generator,
                "aria-label": (pipe.ariaLabel && pipe.ariaLabel.items) || "dataviz-element",
                role: "img",
                tabIndex: -1
            };
            var renderedPipe = pipe.behavior(__assign({ xScale: xScale,
                yScale: yScale,
                canvasDrawing: canvasDrawing,
                projectedCoordinateNames: projectedCoordinateNames, baseMarkProps: __assign(__assign({}, baseMarkProps), additionalMarkProps) }, pipe));
            if (renderedPipe && renderedPipe.length > 0) {
                renderedElements.push(React.createElement("g", { key: k, className: k, role: "group", tabIndex: 0, "aria-label": (pipe.ariaLabel &&
                        renderedPipe.length + " " + pipe.ariaLabel.items + "s in a " + pipe.ariaLabel.chart) ||
                        k, onKeyDown: function (e) { return handleKeyDown(e, k); }, onBlur: function () {
                        props.voronoiHover(undefined);
                    }, ref: function (thisNode) {
                        return thisNode && (piecesGroup[k] = thisNode.childNodes);
                    } }, renderedPipe));
            }
        }
    });
    return {
        renderedElements: renderedElements,
        dataVersion: dataVersion,
        canvasDrawing: canvasDrawing,
        piecesGroup: piecesGroup
    };
};
var VisualizationLayer = /** @class */ (function (_super) {
    __extends(VisualizationLayer, _super);
    function VisualizationLayer(props) {
        var _this = _super.call(this, props) || this;
        _this.handleKeyDown = function (e, vizgroup) {
            // If enter, focus on the first element
            var _a = _this.props, renderPipeline = _a.renderPipeline, voronoiHover = _a.voronoiHover;
            var pushed = e.keyCode;
            if (pushed !== 37 && pushed !== 39 && pushed !== 13)
                return;
            var newPieceIndex = 0;
            var vizGroupSetting = {};
            // If a user pressed enter, highlight the first one
            // Let a user move up and down in stacked bar by getting keys of bars?
            if (_this.state.focusedPieceIndex === null || pushed === 13) {
                vizGroupSetting.focusedVisualizationGroup = vizgroup;
            }
            else if (pushed === 37) {
                newPieceIndex = _this.state.focusedPieceIndex - 1;
            }
            else if (pushed === 39) {
                newPieceIndex = _this.state.focusedPieceIndex + 1;
            }
            newPieceIndex =
                newPieceIndex < 0
                    ? _this.state.piecesGroup[vizgroup].length + newPieceIndex
                    : newPieceIndex % _this.state.piecesGroup[vizgroup].length;
            var piece = renderPipeline[vizgroup].accessibleTransform(renderPipeline[vizgroup].data, newPieceIndex, _this.state.piecesGroup[vizgroup][newPieceIndex]);
            voronoiHover(piece);
            _this.setState(__assign({ focusedPieceIndex: newPieceIndex }, vizGroupSetting));
        };
        _this.state = __assign({ canvasDrawing: [], dataVersion: "", renderedElements: [], focusedPieceIndex: null, focusedVisualizationGroup: null, piecesGroup: {}, props: props, handleKeyDown: _this.handleKeyDown }, updateVisualizationLayer(props, _this.handleKeyDown));
        return _this;
    }
    VisualizationLayer.prototype.componentDidUpdate = function (lp) {
        var np = this.props;
        var propKeys = Object.keys(np);
        var update = false;
        propKeys.forEach(function (key) {
            if (key !== "title" && lp[key] !== np[key]) {
                update = true;
            }
        });
        if (update === false ||
            np.disableContext ||
            !np.canvasContext)
            return;
        var sketchyRenderingEngine = np.sketchyRenderingEngine, width = np.width, height = np.height, margin = np.margin;
        var size = [
            width + margin.left + margin.right,
            height + margin.top + margin.bottom
        ];
        var rc;
        var context = np.canvasContext.getContext("2d");
        context.setTransform(1, 0, 0, 1, margin.left, margin.top);
        context.clearRect(-margin.left, -margin.top, size[0], size[1]);
        this.state.canvasDrawing.forEach(function (piece) {
            var style = piece.styleFn
                ? piece.styleFn(__assign(__assign({}, piece.d), piece.d.data), piece.i) || {}
                : {
                    fill: "black",
                    stroke: "black",
                    opacity: 1,
                    fillOpacity: 1,
                    strokeOpacity: 1,
                    strokeWidth: 1
                };
            var fill = style.fill ? style.fill : "black";
            var stroke = style.stroke ? style.stroke : "black";
            context.setTransform(1, 0, 0, 1, margin.left, margin.top);
            context.translate.apply(context, __spread(np.position));
            context.translate(piece.tx, piece.ty);
            context.fillStyle = fill;
            context.strokeStyle = stroke;
            context.lineWidth = style.strokeWidth ? style.strokeWidth : 0;
            var rcSettings = {};
            var renderObject = piece.markProps.renderMode ||
                (piece.renderFn &&
                    piece.renderFn(__assign(__assign({}, piece.d), piece.d.data), piece.i));
            var actualRenderMode = (renderObject && renderObject.renderMode) || renderObject;
            if (actualRenderMode) {
                if (!sketchyRenderingEngine) {
                    console.error("You cannot render sketchy graphics without specifying a Rough.js-like library as the sketchyRenderingEngine prop of your frame");
                    actualRenderMode = undefined;
                }
                else {
                    var RoughCanvas = sketchyRenderingEngine.canvas;
                    if (!RoughCanvas) {
                        console.error("The sketchyRenderingEngine you specify does not expose a prop `RoughCanvas` and so cannot render sketchy HTML5 Canvas graphics");
                    }
                    else {
                        rc = rc || RoughCanvas(np.canvasContext);
                        var rcExtension = (typeof renderObject === "object" && renderObject) || {};
                        rcSettings = __assign({ fill: fill,
                            stroke: stroke, strokeWidth: context.lineWidth }, rcExtension);
                    }
                }
            }
            if (piece.markProps.markType === "circle" ||
                (piece.markProps.markType === "rect" && piece.markProps.rx > 0)) {
                var vizX = 0, vizY = 0, r = style.r || piece.markProps.r;
                if (piece.markProps.width) {
                    var halfWidth = piece.markProps.width / 2;
                    vizX = piece.markProps.x + halfWidth;
                    vizY = piece.markProps.y + halfWidth;
                    r = halfWidth;
                }
                if (actualRenderMode === "sketchy") {
                    if (context.globalAlpha !== 0)
                        rc.circle(vizX, vizY, r, rcSettings);
                }
                else {
                    context.beginPath();
                    context.arc(vizX, vizY, r, 0, 2 * Math.PI);
                    context.globalAlpha = style.fillOpacity || style.opacity || 1;
                    if (style.fill && style.fill !== "none" && context.globalAlpha !== 0)
                        context.fill();
                    context.globalAlpha = style.strokeOpacity || style.opacity || 1;
                    if (style.stroke &&
                        style.stroke !== "none" &&
                        context.globalAlpha !== 0)
                        context.stroke();
                }
            }
            else if (piece.markProps.markType === "rect") {
                if (actualRenderMode === "sketchy") {
                    context.globalAlpha = style.opacity || 1;
                    if (context.globalAlpha !== 0)
                        rc.rectangle(piece.markProps.x, piece.markProps.y, piece.markProps.width, piece.markProps.height, rcSettings);
                }
                else {
                    context.globalAlpha = style.fillOpacity || style.opacity || 1;
                    if (style.fill && style.fill !== "none" && context.globalAlpha !== 0)
                        context.fillRect(piece.markProps.x, piece.markProps.y, piece.markProps.width, piece.markProps.height);
                    context.globalAlpha = style.strokeOpacity || style.opacity || 1;
                    if (style.stroke &&
                        style.stroke !== "none" &&
                        context.globalAlpha !== 0)
                        context.strokeRect(piece.markProps.x, piece.markProps.y, piece.markProps.width, piece.markProps.height);
                }
            }
            else if (piece.markProps.markType === "path") {
                if (actualRenderMode === "sketchy") {
                    context.globalAlpha = style.opacity || 1;
                    rc.path(piece.markProps.d, rcSettings);
                }
                else {
                    var p = new Path2D(piece.markProps.d);
                    context.globalAlpha = style.strokeOpacity || style.opacity || 1;
                    if (style.stroke &&
                        style.stroke !== "none" &&
                        context.globalAlpha !== 0)
                        context.stroke(p);
                    context.globalAlpha = style.fillOpacity || style.opacity || 1;
                    if (style.fill && style.fill !== "none" && context.globalAlpha !== 0)
                        context.fill(p);
                }
            }
            else {
                console.error("CURRENTLY UNSUPPORTED MARKTYPE FOR CANVAS RENDERING");
            }
        });
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        if (np.canvasPostProcess) {
            np.canvasPostProcess(np.canvasContext, context, size);
        }
        if (this.state.focusedVisualizationGroup !== null &&
            this.state.piecesGroup[this.state.focusedVisualizationGroup] &&
            this.state.focusedPieceIndex !== null) {
            var focusElParent = this.state.piecesGroup[this.state.focusedVisualizationGroup][this.state.focusedPieceIndex];
            var focusEl = (focusElParent &&
                __spread(focusElParent.childNodes).find(function (child) {
                    return child.getAttribute("aria-label");
                })) ||
                focusElParent;
            focusEl && focusEl.focus && focusEl.focus();
        }
    };
    VisualizationLayer.getDerivedStateFromProps = function (nextProps, prevState) {
        var props = prevState.props;
        var lp = props;
        var propKeys = Object.keys(nextProps);
        var update = false;
        propKeys.forEach(function (key) {
            if (key !== "title" && lp[key] !== nextProps[key]) {
                update = true;
            }
        });
        if (update ||
            (nextProps.dataVersion && nextProps.dataVersion !== prevState.dataVersion)) {
            return __assign(__assign({}, updateVisualizationLayer(nextProps, prevState.handleKeyDown)), { props: nextProps });
        }
        return null;
    };
    VisualizationLayer.prototype.render = function () {
        var _a;
        var _b = this.props, matte = _b.matte, matteClip = _b.matteClip, axes = _b.axes, _c = _b.frameKey, frameKey = _c === void 0 ? "" : _c, margin = _b.margin, title = _b.title, ariaTitle = _b.ariaTitle, axesTickLines = _b.axesTickLines, frameRenderOrder = _b.frameRenderOrder, additionalVizElements = _b.additionalVizElements;
        var renderedElements = this.state.renderedElements;
        var renderHash = __assign((_a = {}, _a["axes-tick-lines"] = axesTickLines && (React.createElement("g", { key: "visualization-tick-lines", className: "axis axis-tick-lines", "aria-hidden": true }, axesTickLines)), _a["axes-labels"] = axes && (React.createElement("g", { key: "visualization-axis-labels", className: "axis axis-labels" }, axes)), _a.matte = matte, _a["viz-layer"] = renderedElements && renderedElements.length > 0 ? renderedElements : null, _a), additionalVizElements);
        var ariaLabel = "";
        var finalTitle = (title && ariaTitle) || title
            ? typeof title !== "string" &&
                title.props &&
                typeof title.props.children === "string"
                ? "titled " + title.props.children
                : "with a complex title"
            : "with no title";
        ariaLabel = "Visualization " + finalTitle + ". Use arrow keys to navigate elements.";
        var orderedElements = [];
        frameRenderOrder.forEach(function (r) {
            if (renderHash[r]) {
                orderedElements.push(renderHash[r]);
            }
        });
        var renderedDataVisualization = ((orderedElements.length > 0) && (React.createElement("g", { className: "data-visualization", key: "visualization-clip-path", "aria-label": ariaLabel, role: "group", clipPath: matteClip && matte ? "url(#matte-clip" + frameKey + ")" : undefined, transform: "translate(" + margin.left + "," + margin.top + ")" }, orderedElements))) ||
            null;
        return renderedDataVisualization;
    };
    VisualizationLayer.defaultProps = {
        position: [0, 0],
        margin: { left: 0, top: 0, right: 0, bottom: 0 }
    };
    return VisualizationLayer;
}(React.PureComponent));
exports.default = VisualizationLayer;
//# sourceMappingURL=VisualizationLayer.js.map