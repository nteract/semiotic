"use strict";
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
var semiotic_mark_1 = require("semiotic-mark");
function pointOnArcAtAngle(center, angle, distance) {
    var radians = Math.PI * (angle + 0.75) * 2;
    var xPosition = center[0] + distance * Math.cos(radians);
    var yPosition = center[1] + distance * Math.sin(radians);
    return [xPosition, yPosition];
}
exports.pointOnArcAtAngle = pointOnArcAtAngle;
exports.renderLaidOutPieces = function (_a) {
    var data = _a.data, shouldRender = _a.shouldRender, canvasRender = _a.canvasRender, canvasDrawing = _a.canvasDrawing, styleFn = _a.styleFn, classFn = _a.classFn, baseMarkProps = _a.baseMarkProps, renderKeyFn = _a.renderKeyFn, ariaLabel = _a.ariaLabel, axis = _a.axis;
    var valueFormat = axis && axis[0] && axis[0].tickFormat;
    if (!shouldRender)
        return null;
    var renderedPieces = [];
    data.forEach(function (d, i) {
        if (canvasRender && canvasRender(d) === true) {
            var canvasPiece = {
                baseClass: "orframe-piece",
                tx: d.renderElement.tx || 0,
                ty: d.renderElement.ty || 0,
                d: d.piece,
                i: i,
                markProps: d.renderElement || d,
                styleFn: styleFn,
                classFn: classFn
            };
            canvasDrawing.push(canvasPiece);
        }
        else {
            if (React.isValidElement(d.renderElement || d)) {
                renderedPieces.push(d.renderElement || d);
            }
            else {
                /*ariaLabel.items*/
                var pieceAriaLabel = d.o + " " + ariaLabel.items + " value " + ((valueFormat && valueFormat(d.piece.value)) || d.piece.value);
                renderedPieces.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { key: renderKeyFn
                        ? renderKeyFn(d.piece)
                        : d.renderKey || "piece-render-" + i }, d.renderElement || d, { "aria-label": pieceAriaLabel })));
            }
        }
    });
    return renderedPieces;
};
//# sourceMappingURL=pieceDrawing.js.map