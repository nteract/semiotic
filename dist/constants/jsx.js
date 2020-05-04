"use strict";
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
exports.filterDefs = function (_a) {
    var matte = _a.matte, key = _a.key, additionalDefs = _a.additionalDefs;
    return (React.createElement("defs", null,
        React.createElement("filter", { id: "paintyFilterHeavy" },
            React.createElement("feGaussianBlur", { id: "gaussblurrer", in: "SourceGraphic", stdDeviation: 4, colorInterpolationFilters: "sRGB", result: "blur" }),
            React.createElement("feColorMatrix", { in: "blur", mode: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7", result: "gooey" })),
        React.createElement("filter", { id: "paintyFilterLight" },
            React.createElement("feGaussianBlur", { id: "gaussblurrer", in: "SourceGraphic", stdDeviation: 2, colorInterpolationFilters: "sRGB", result: "blur" }),
            React.createElement("feColorMatrix", { in: "blur", mode: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7", result: "gooey" })),
        React.createElement("clipPath", { id: "matte-clip-" + key }, matte),
        additionalDefs));
};
exports.generateFinalDefs = function (_a) {
    var matte = _a.matte, size = _a.size, margin = _a.margin, frameKey = _a.frameKey, additionalDefs = _a.additionalDefs, name = _a.name;
    var marginGraphic;
    if (typeof matte === "function") {
        marginGraphic = matte({ size: size, margin: margin });
    }
    else if (React.isValidElement(matte)) {
        marginGraphic = matte;
    }
    else if (matte === true) {
        marginGraphic = (React.createElement("path", { fill: "white", transform: "translate(" + -margin.left + "," + -margin.top + ")", d: frameFunctions_1.drawMarginPath({
                margin: margin,
                size: size,
                inset: 0
            }), className: name + "-matte" }));
    }
    var finalFilterDefs = exports.filterDefs({
        matte: marginGraphic,
        key: matte && (frameKey || name),
        additionalDefs: additionalDefs
    });
    return { defs: finalFilterDefs, matte: marginGraphic };
};
//# sourceMappingURL=jsx.js.map