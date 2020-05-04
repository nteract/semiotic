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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// modules
var React = __importStar(require("react"));
var annotationHandling_1 = require("./annotationLayerBehavior/annotationHandling");
var Legend_1 = __importDefault(require("./Legend"));
var Annotation_1 = __importDefault(require("./Annotation"));
var labella = __importStar(require("labella"));
var SpanOrDiv_1 = require("./SpanOrDiv");
function marginOffsetFn(orient, axisSettings, marginOffset) {
    if (typeof marginOffset === "number") {
        return marginOffset;
    }
    if (axisSettings && axisSettings.find(function (d) { return d.props.orient === orient; })) {
        return 50;
    }
    return 10;
}
function adjustedAnnotationKeyMapper(d) {
    var _a = d.props.noteData.note, note = _a === void 0 ? {} : _a;
    var label = note.label;
    var id = d.props.noteData.id || d.props.noteData.x + "-" + d.props.noteData.y;
    return id + "-" + label;
}
function noteDataWidth(noteData, charWidth, layoutNoteWidth) {
    if (charWidth === void 0) { charWidth = 8; }
    var _a = noteData.noteWidth, noteWidth = _a === void 0 ? layoutNoteWidth : _a;
    var noteWidthFn = noteWidth;
    if (typeof (noteWidth) === "number") {
        noteWidthFn = function () { return noteWidth; };
    }
    var wrap = (noteData.note && noteData.note.wrap) || 120;
    var noteText = noteData.note.label || noteData.note.label || "";
    var width = noteWidth && noteWidthFn(noteData) || (React.isValidElement(noteData.note) ? 100 : Math.min(wrap, noteText.length * charWidth));
    return width;
}
function noteDataHeight(noteData, charWidth, lineHeight, layoutNoteHeight) {
    if (charWidth === void 0) { charWidth = 8; }
    if (lineHeight === void 0) { lineHeight = 20; }
    var _a = noteData.noteHeight, noteHeight = _a === void 0 ? layoutNoteHeight : _a;
    var noteHeightFn = noteHeight;
    if (typeof (noteHeight) === "number") {
        noteHeightFn = function () { return noteHeight; };
    }
    var wrap = (noteData.note && noteData.note.wrap) || 120;
    var text = noteData.note.label || noteData.note.title || "";
    var height = noteHeight && noteHeightFn(noteData) || (React.isValidElement(noteData.note) ? 30 : Math.ceil((text.length * charWidth) / wrap) * lineHeight +
        (noteData.note.label && noteData.note.title ? lineHeight : 0));
    return (height);
}
var processAnnotations = function (adjustableAnnotations, annotationProcessor, props) {
    var _a = annotationProcessor.layout, layout = _a === void 0 ? { type: false, noteHeight: undefined, noteWidth: undefined } : _a;
    if (layout.type === false) {
        return adjustableAnnotations;
    }
    var layoutNoteHeight = layout.noteWidth, layoutNoteWidth = layout.noteHeight;
    var _b = props.margin, margin = _b === void 0 ? { top: 0, bottom: 0, left: 0, right: 0 } : _b;
    var size = props.size, _c = props.axes, axes = _c === void 0 ? [] : _c;
    margin =
        typeof margin === "number"
            ? { top: margin, left: margin, right: margin, bottom: margin }
            : margin;
    if (layout.type === "bump") {
        var adjustedAnnotations = annotationHandling_1.bumpAnnotations(adjustableAnnotations, layout, size, props.pointSizeFunction, props.labelSizeFunction);
        return adjustedAnnotations;
    }
    else if (layout.type === "marginalia") {
        var marginOffset_1 = layout.marginOffset, _d = layout.orient, orient = _d === void 0 ? "nearest" : _d, _e = layout.characterWidth, characterWidth_1 = _e === void 0 ? 8 : _e, _f = layout.lineHeight, lineHeight_1 = _f === void 0 ? 20 : _f, _g = layout.padding, padding_1 = _g === void 0 ? 2 : _g, _h = layout.axisMarginOverride, axisMarginOverride = _h === void 0 ? {} : _h;
        var finalOrientation = orient === "nearest"
            ? ["left", "right", "top", "bottom"]
            : Array.isArray(orient)
                ? orient
                : [orient];
        var leftOn_1 = finalOrientation.find(function (d) { return d === "left"; });
        var rightOn_1 = finalOrientation.find(function (d) { return d === "right"; });
        var topOn_1 = finalOrientation.find(function (d) { return d === "top"; });
        var bottomOn_1 = finalOrientation.find(function (d) { return d === "bottom"; });
        var leftNodes_1 = [];
        var rightNodes_1 = [];
        var topNodes_1 = [];
        var bottomNodes_1 = [];
        adjustableAnnotations.forEach(function (aNote) {
            var noteData = aNote.props.noteData;
            var noteX = noteData.x[0] || noteData.x;
            var noteY = noteData.y[0] || noteData.y;
            var leftDist = leftOn_1 ? noteX : Infinity;
            var rightDist = rightOn_1 ? size[0] - noteX : Infinity;
            var topDist = topOn_1 ? noteY : Infinity;
            var bottomDist = bottomOn_1 ? size[1] - noteY : Infinity;
            var minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
            if (leftDist === minDist) {
                leftNodes_1.push(aNote);
            }
            else if (rightDist === minDist) {
                rightNodes_1.push(aNote);
            }
            else if (topDist === minDist) {
                topNodes_1.push(aNote);
            }
            else {
                bottomNodes_1.push(aNote);
            }
        });
        //Adjust the margins based on which regions are active
        var leftForce = new labella.Force({
            minPos: axisMarginOverride.top !== undefined
                ? 0 + axisMarginOverride.top
                : 0 - margin.top,
            maxPos: axisMarginOverride.bottom !== undefined
                ? size[1] - axisMarginOverride.bottom
                : bottomOn_1
                    ? size[1]
                    : size[1] + margin.bottom
        })
            .nodes(leftNodes_1.map(function (d) {
            var noteY = d.props.noteData.y[0] || d.props.noteData.y;
            return new labella.Node(noteY, noteDataHeight(d.props.noteData, characterWidth_1, lineHeight_1, layoutNoteHeight) +
                padding_1);
        }))
            .compute();
        var rightForce = new labella.Force({
            minPos: axisMarginOverride.top !== undefined
                ? 0 + axisMarginOverride.top
                : topOn_1
                    ? 0
                    : 0 - margin.top,
            maxPos: axisMarginOverride.bottom !== undefined
                ? size[1] - axisMarginOverride.bottom
                : size[1] + margin.bottom
        })
            .nodes(rightNodes_1.map(function (d) {
            var noteY = d.props.noteData.y[0] || d.props.noteData.y;
            return new labella.Node(noteY, noteDataHeight(d.props.noteData, characterWidth_1, lineHeight_1, layoutNoteHeight) +
                padding_1);
        }))
            .compute();
        var topForce = new labella.Force({
            minPos: axisMarginOverride.left !== undefined
                ? 0 + axisMarginOverride.left
                : leftOn_1
                    ? 0
                    : 0 - margin.left,
            maxPos: axisMarginOverride.right !== undefined
                ? size[0] - axisMarginOverride.right
                : size[0] + margin.right
        })
            .nodes(topNodes_1.map(function (d) {
            var noteX = d.props.noteData.x[0] || d.props.noteData.x;
            return new labella.Node(noteX, noteDataWidth(d.props.noteData, characterWidth_1, layoutNoteWidth) + padding_1);
        }))
            .compute();
        var bottomForce = new labella.Force({
            minPos: axisMarginOverride.left !== undefined
                ? 0 + axisMarginOverride.left
                : 0 - margin.left,
            maxPos: axisMarginOverride.right !== undefined
                ? size[0] - axisMarginOverride.right
                : rightOn_1
                    ? size[0]
                    : size[0] + margin.right
        })
            .nodes(bottomNodes_1.map(function (d) {
            var noteX = d.props.noteData.x[0] || d.props.noteData.x;
            return new labella.Node(noteX, noteDataWidth(d.props.noteData, characterWidth_1, layoutNoteWidth) + padding_1);
        }))
            .compute();
        var bottomOffset_1 = Math.max.apply(Math, __spread(bottomNodes_1.map(function (d) {
            return noteDataHeight(d.props.noteData, characterWidth_1, lineHeight_1, layoutNoteHeight) +
                padding_1;
        })));
        var topOffset_1 = Math.max.apply(Math, __spread(topNodes_1.map(function (d) {
            return noteDataHeight(d.props.noteData, characterWidth_1, lineHeight_1, layoutNoteHeight) +
                padding_1;
        })));
        var leftOffset_1 = Math.max.apply(Math, __spread(leftNodes_1.map(function (d) { return noteDataWidth(d.props.noteData, characterWidth_1, layoutNoteWidth) + padding_1; })));
        var rightOffset_1 = Math.max.apply(Math, __spread(rightNodes_1.map(function (d) { return noteDataWidth(d.props.noteData, characterWidth_1, layoutNoteWidth) + padding_1; })));
        //      const nodeOffsetHeight = Math.max()
        var leftSortedNodes_1 = leftForce.nodes();
        var rightSortedNodes_1 = rightForce.nodes();
        var topSortedNodes_1 = topForce.nodes();
        var bottomSortedNodes_1 = bottomForce.nodes();
        leftNodes_1.forEach(function (note, i) {
            var x = 0 -
                leftSortedNodes_1[i].layerIndex * leftOffset_1 -
                marginOffsetFn("left", axes, marginOffset_1);
            var y = leftSortedNodes_1[i].currentPos;
            note.props.noteData.nx = x;
            note.props.noteData.ny = y;
            if (note.props.noteData.note && !React.isValidElement(note)) {
                note.props.noteData.note.orientation =
                    note.props.noteData.note.orientation || "leftRight";
                note.props.noteData.note.align =
                    note.props.noteData.note.align || "right";
            }
        });
        rightNodes_1.forEach(function (note, i) {
            var x = size[0] +
                rightSortedNodes_1[i].layerIndex * rightOffset_1 +
                marginOffsetFn("right", axes, marginOffset_1);
            var y = rightSortedNodes_1[i].currentPos;
            note.props.noteData.nx = x;
            note.props.noteData.ny = y;
            if (note.props.noteData.note && !React.isValidElement(note)) {
                note.props.noteData.note.orientation =
                    note.props.noteData.note.orientation || "leftRight";
                note.props.noteData.note.align =
                    note.props.noteData.note.align || "left";
            }
        });
        topNodes_1.forEach(function (note, i) {
            var x = topSortedNodes_1[i].currentPos;
            var y = 0 -
                topSortedNodes_1[i].layerIndex * topOffset_1 -
                marginOffsetFn("top", axes, marginOffset_1);
            note.props.noteData.nx = x;
            note.props.noteData.ny = y;
        });
        bottomNodes_1.forEach(function (note, i) {
            var x = bottomSortedNodes_1[i].currentPos;
            var y = size[1] +
                bottomSortedNodes_1[i].layerIndex * bottomOffset_1 +
                marginOffsetFn("bottom", axes, marginOffset_1);
            note.props.noteData.nx = x;
            note.props.noteData.ny = y;
        });
        return adjustableAnnotations;
    }
    return adjustableAnnotations;
};
var generateSVGAnnotations = function (props, annotations) {
    var renderedAnnotations = annotations
        .map(function (d, i) { return props.svgAnnotationRule(d, i, props); })
        .filter(function (d) { return d !== null && d !== undefined; });
    return renderedAnnotations;
};
var generateHTMLAnnotations = function (props, annotations) {
    var renderedAnnotations = annotations
        .map(function (d, i) { return props.htmlAnnotationRule(d, i, props); })
        .filter(function (d) { return d !== null && d !== undefined; });
    return renderedAnnotations;
};
var createAnnotations = function (props, state) {
    var renderedSVGAnnotations = state.svgAnnotations, renderedHTMLAnnotations = [], adjustedAnnotations = state.adjustedAnnotations, adjustableAnnotationsKey = state.adjustedAnnotationsKey;
    var adjustedAnnotationsKey = state.adjustedAnnotationsKey, adjustedAnnotationsDataVersion = state.adjustedAnnotationsDataVersion;
    var annotations = props.annotations, _a = props.annotationHandling, annotationHandling = _a === void 0 ? false : _a, size = props.size, svgAnnotationRule = props.svgAnnotationRule, htmlAnnotationRule = props.htmlAnnotationRule;
    var annotationProcessor = typeof annotationHandling === "object"
        ? annotationHandling
        : { layout: { type: annotationHandling }, dataVersion: "" };
    var _b = annotationProcessor.dataVersion, dataVersion = _b === void 0 ? "" : _b;
    if (svgAnnotationRule) {
        var initialSVGAnnotations = generateSVGAnnotations(props, annotations);
        var adjustableAnnotations_1 = initialSVGAnnotations.filter(function (d) { return d.props && d.props.noteData && !d.props.noteData.fixedPosition; });
        var fixedAnnotations = initialSVGAnnotations.filter(function (d) { return !d.props || !d.props.noteData || d.props.noteData.fixedPosition; });
        adjustableAnnotationsKey = "" + adjustableAnnotations_1
            .map(adjustedAnnotationKeyMapper)
            .join(",") + JSON.stringify(annotationProcessor) + size.join(",");
        if (annotationHandling === false) {
            adjustedAnnotations = adjustableAnnotations_1;
        }
        if (adjustedAnnotations.length !== adjustableAnnotations_1.length ||
            adjustedAnnotationsKey !== adjustableAnnotationsKey ||
            adjustedAnnotationsDataVersion !== dataVersion) {
            adjustedAnnotations = processAnnotations(adjustableAnnotations_1, annotationProcessor, props);
        }
        else {
            //Handle when style or other attributes change
            adjustedAnnotations = adjustedAnnotations.map(function (d, i) {
                var newNoteData = Object.assign(adjustableAnnotations_1[i].props.noteData, {
                    nx: d.props.noteData.nx,
                    ny: d.props.noteData.ny,
                    note: d.props.noteData.note
                });
                return React.createElement(Annotation_1.default, { key: d.key, noteData: newNoteData });
            });
        }
        renderedSVGAnnotations = __spread(adjustedAnnotations, fixedAnnotations);
    }
    if (htmlAnnotationRule) {
        renderedHTMLAnnotations = generateHTMLAnnotations(props, annotations);
    }
    return {
        svgAnnotations: renderedSVGAnnotations,
        htmlAnnotations: renderedHTMLAnnotations,
        adjustedAnnotations: adjustedAnnotations,
        adjustedAnnotationsKey: adjustableAnnotationsKey,
        adjustedAnnotationsDataVersion: dataVersion
    };
};
var AnnotationLayer = /** @class */ (function (_super) {
    __extends(AnnotationLayer, _super);
    function AnnotationLayer(props) {
        var _this = _super.call(this, props) || this;
        var baseState = {
            svgAnnotations: [],
            htmlAnnotations: [],
            adjustedAnnotations: [],
            adjustedAnnotationsKey: "",
            adjustedAnnotationsDataVersion: "",
            SpanOrDiv: SpanOrDiv_1.HOCSpanOrDiv(props.useSpans)
        };
        _this.state = __assign(__assign({}, baseState), createAnnotations(props, baseState));
        return _this;
    }
    AnnotationLayer.getDerivedStateFromProps = function (nextProps, prevState) {
        return createAnnotations(nextProps, prevState);
    };
    AnnotationLayer.prototype.render = function () {
        var _a = this.state, svgAnnotations = _a.svgAnnotations, htmlAnnotations = _a.htmlAnnotations, SpanOrDiv = _a.SpanOrDiv;
        var _b = this.props, legendSettings = _b.legendSettings, margin = _b.margin, size = _b.size;
        var renderedLegend;
        if (legendSettings) {
            var positionHash = {
                left: [15, 15],
                right: [size[0] + 15, 15]
            };
            var _c = legendSettings.position, position = _c === void 0 ? "right" : _c, _d = legendSettings.title, title = _d === void 0 ? "Legend" : _d;
            var legendPosition = positionHash[position];
            renderedLegend = (React.createElement("g", { transform: "translate(" + legendPosition.join(",") + ")" },
                React.createElement(Legend_1.default, __assign({}, legendSettings, { title: title, position: position }))));
        }
        return (React.createElement(SpanOrDiv, { className: "annotation-layer", style: {
                position: "absolute",
                pointerEvents: "none",
                background: "none"
            } },
            React.createElement("svg", { className: "annotation-layer-svg", height: size[1], width: size[0], style: {
                    background: "none",
                    pointerEvents: "none",
                    position: "absolute",
                    left: margin.left + "px",
                    top: margin.top + "px",
                    overflow: "visible"
                } },
                React.createElement("g", null,
                    renderedLegend,
                    svgAnnotations)),
            React.createElement(SpanOrDiv, { className: "annotation-layer-html", style: {
                    background: "none",
                    pointerEvents: "none",
                    position: "absolute",
                    height: size[1] + "px",
                    width: size[0] + "px",
                    left: margin.left + "px",
                    top: margin.top + "px"
                } }, htmlAnnotations)));
    };
    return AnnotationLayer;
}(React.Component));
exports.default = AnnotationLayer;
//# sourceMappingURL=AnnotationLayer.js.map