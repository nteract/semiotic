"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var d3labeler_1 = __importDefault(require("./d3labeler"));
var basicLabelSizeFunction = function (noteData, characterWidth, lineHeight, padding) {
    var text = noteData.note.label || noteData.note.title;
    var textLength = text.length;
    var wrap = noteData.note.wrap || 120;
    var width = Math.min(wrap, textLength * characterWidth) + padding * 2;
    var height = Math.ceil((textLength * characterWidth) / 120) * lineHeight + padding * 2;
    return [width, height];
};
function bumpAnnotations(adjustableNotes, processor, size, propsPointSizeFunction, propsLabelSizeFunction) {
    var _a = processor.padding, padding = _a === void 0 ? 1 : _a, _b = processor.characterWidth, characterWidth = _b === void 0 ? 8 : _b, _c = processor.lineHeight, lineHeight = _c === void 0 ? 20 : _c, _d = processor.iterations, iterations = _d === void 0 ? 500 : _d, _e = processor.pointSizeFunction, pointSizeFunction = _e === void 0 ? propsPointSizeFunction : _e, _f = processor.labelSizeFunction, labelSizeFunction = _f === void 0 ? propsLabelSizeFunction || basicLabelSizeFunction : _f;
    var labels = adjustableNotes.map(function (d, i) {
        var anchorX = (d.props.noteData.x[0] || d.props.noteData.x) +
            (d.props.noteData.dx !== undefined
                ? d.props.noteData.dx
                : ((i % 3) - 1) * -10);
        var anchorY = (d.props.noteData.y[0] || d.props.noteData.y) +
            (d.props.noteData.dy !== undefined
                ? d.props.noteData.dy
                : ((i % 3) - 1) * 10);
        var _a = __read(labelSizeFunction(d.props.noteData, characterWidth, lineHeight, padding), 2), labelWidth = _a[0], labelHeight = _a[1];
        return {
            x: anchorX,
            y: anchorY,
            above: anchorY < d.props.noteData.y,
            left: anchorX < d.props.noteData.x,
            width: labelWidth,
            height: labelHeight,
            type: "label",
            name: "",
            originalNote: d
        };
    });
    var points = adjustableNotes.map(function (d) { return ({
        x: d.props.noteData.x,
        y: d.props.noteData.y,
        fx: d.props.noteData.x,
        fy: d.props.noteData.y,
        r: (pointSizeFunction && pointSizeFunction(d.props.noteData)) || 5,
        type: "point",
        originalNote: d
    }); });
    var instantiatedLabeler = d3labeler_1.default();
    instantiatedLabeler.label(labels);
    instantiatedLabeler.anchor(points);
    instantiatedLabeler.width(size[0]);
    instantiatedLabeler.height(size[1]);
    instantiatedLabeler.start(iterations);
    labels.forEach(function (d) {
        if (d.type === "label") {
            var adjusted = adjustedXY(d.originalNote.props.noteData, d, padding);
            d.originalNote.props.noteData.nx = adjusted[0];
            d.originalNote.props.noteData.ny = adjusted[1];
        }
    });
    return adjustableNotes;
}
exports.bumpAnnotations = bumpAnnotations;
function adjustedXY(note, calculated, padding) {
    if (note.y > calculated.y) {
        //below
        return [
            calculated.x + calculated.width / 2 + padding / 2,
            calculated.y - calculated.height + padding / 2
        ];
    }
    return [calculated.x + calculated.width / 2, calculated.y];
}
//# sourceMappingURL=annotationHandling.js.map