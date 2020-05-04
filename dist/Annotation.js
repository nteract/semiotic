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
var AnnotationLabel_1 = __importDefault(require("react-annotation/lib/Types/AnnotationLabel"));
var interactivityFns = ["onDragEnd", "onDragStart", "onDrag"];
var SemioticAnnotation = /** @class */ (function (_super) {
    __extends(SemioticAnnotation, _super);
    function SemioticAnnotation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SemioticAnnotation.prototype.render = function () {
        var baseNoteData = this.props.noteData;
        var screenCoordinates = baseNoteData.screenCoordinates;
        var noteData = __assign({}, baseNoteData);
        interactivityFns.forEach(function (d) {
            if (baseNoteData[d]) {
                delete noteData[d];
                var originalFn_1 = baseNoteData[d];
                noteData[d] = function (updatedSettingsFromRA) {
                    originalFn_1({
                        originalSettings: baseNoteData,
                        updatedSettings: updatedSettingsFromRA,
                        noteIndex: baseNoteData.i
                    });
                };
            }
        });
        var AnnotationType = typeof noteData.type === "function" ? noteData.type : AnnotationLabel_1.default;
        var eventListeners = noteData.eventListeners || noteData.events || {};
        var finalStyle = {};
        if (noteData.events || noteData.eventListeners || noteData.editMode) {
            finalStyle.pointerEvents = "all";
        }
        if (noteData.coordinates && screenCoordinates) {
            //Multisubject annotation
            var setNX_1 = noteData.nx || screenCoordinates[0][0] + noteData.dx;
            var setNY_1 = noteData.ny || screenCoordinates[0][1] + noteData.dy;
            var notes = screenCoordinates.map(function (d, i) {
                var subjectNote = Object.assign({}, noteData, {
                    note: i === 0 ? noteData.note : { label: "" },
                    x: d[0],
                    y: d[1],
                    nx: setNX_1,
                    ny: setNY_1
                });
                return React.createElement(AnnotationType, __assign({ key: "multi-annotation-" + i }, subjectNote));
            });
            return (React.createElement("g", __assign({}, eventListeners, { style: finalStyle }), notes));
        }
        var finalAnnotation = (React.createElement(AnnotationType, __assign({ events: eventListeners }, noteData)));
        if (finalStyle.pointerEvents) {
            return React.createElement("g", { style: finalStyle }, finalAnnotation);
        }
        return finalAnnotation;
    };
    return SemioticAnnotation;
}(React.Component));
exports.default = SemioticAnnotation;
//# sourceMappingURL=Annotation.js.map