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
var frameFunctions_1 = require("../svg/frameFunctions");
var InteractionCanvas = /** @class */ (function (_super) {
    __extends(InteractionCanvas, _super);
    function InteractionCanvas(props) {
        var _this = _super.call(this, props) || this;
        _this.canvasMap = new Map();
        _this.canvasRendering = function () {
            var canvasMap = _this.canvasMap;
            var interactionContext = _this.state.interactionContext;
            var _a = _this.props, voronoiHover = _a.voronoiHover, height = _a.height, width = _a.width, overlayRegions = _a.overlayRegions, margin = _a.margin;
            if (interactionContext === null || !overlayRegions)
                return;
            var boundCanvasEvent = frameFunctions_1.canvasEvent.bind(null, interactionContext, overlayRegions, _this.canvasMap);
            interactionContext.onmousemove = function (e) {
                var overlay = boundCanvasEvent(e);
                if (overlay && overlay.props) {
                    overlay.props.onMouseEnter();
                }
                else {
                    voronoiHover(null);
                }
            };
            interactionContext.onclick = function (e) {
                var overlay = boundCanvasEvent(e);
                if (overlay && overlay.props) {
                    overlay.props.onClick();
                }
            };
            interactionContext.ondblclick = function (e) {
                var overlay = boundCanvasEvent(e);
                if (overlay && overlay.props) {
                    overlay.props.onDoubleClick();
                }
            };
            canvasMap.clear();
            var interactionContext2D = interactionContext.getContext("2d");
            interactionContext2D.imageSmoothingEnabled = false;
            interactionContext2D.setTransform(1, 0, 0, 1, margin.left, margin.top);
            interactionContext2D.clearRect(-margin.left, -margin.top, width, height);
            interactionContext2D.lineWidth = 1;
            overlayRegions.forEach(function (overlay, oi) {
                var interactionRGBA = "rgba(" + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + ",255)";
                canvasMap.set(interactionRGBA, oi);
                interactionContext2D.fillStyle = interactionRGBA;
                interactionContext2D.strokeStyle = interactionRGBA;
                var p = new Path2D(overlay.props.d);
                interactionContext2D.stroke(p);
                interactionContext2D.fill(p);
            });
        };
        _this.state = {
            ref: null,
            interactionContext: null
        };
        return _this;
    }
    InteractionCanvas.prototype.componentDidMount = function () {
        this.canvasRendering();
    };
    InteractionCanvas.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (prevProps.width !== this.props.width || prevProps.height !== this.props.height || this.props.overlayRegions !== prevProps.overlayRegions || !prevState.interactionContext && this.state.interactionContext) {
            this.canvasRendering();
        }
    };
    InteractionCanvas.prototype.render = function () {
        var _this = this;
        var _a = this.props, width = _a.width, height = _a.height;
        return React.createElement("canvas", { className: "frame-canvas-interaction", ref: function (canvasContext) {
                if (canvasContext && _this.state.interactionContext !== canvasContext) {
                    _this.setState({ interactionContext: canvasContext });
                }
            }, style: {
                position: "absolute",
                left: "0px",
                top: "0px",
                imageRendering: "pixelated",
                pointerEvents: "all",
                opacity: 0
            }, width: width, height: height });
    };
    return InteractionCanvas;
}(React.Component));
exports.default = InteractionCanvas;
//# sourceMappingURL=InteractionCanvas.js.map