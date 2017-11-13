"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filterDefs = undefined;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var filterDefs = exports.filterDefs = function filterDefs(_ref) {
  var matte = _ref.matte,
      key = _ref.key,
      additionalDefs = _ref.additionalDefs;
  return _react2.default.createElement(
    "defs",
    null,
    _react2.default.createElement(
      "filter",
      { id: "paintyFilterHeavy" },
      _react2.default.createElement("feGaussianBlur", {
        id: "gaussblurrer",
        "in": "SourceGraphic",
        stdDeviation: 4,
        colorInterpolationFilters: "sRGB",
        result: "blur"
      }),
      _react2.default.createElement("feColorMatrix", {
        "in": "blur",
        mode: "matrix",
        values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7",
        result: "gooey"
      })
    ),
    _react2.default.createElement(
      "filter",
      { id: "paintyFilterLight" },
      _react2.default.createElement("feGaussianBlur", {
        id: "gaussblurrer",
        "in": "SourceGraphic",
        stdDeviation: 2,
        colorInterpolationFilters: "sRGB",
        result: "blur"
      }),
      _react2.default.createElement("feColorMatrix", {
        "in": "blur",
        mode: "matrix",
        values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7",
        result: "gooey"
      })
    ),
    _react2.default.createElement(
      "clipPath",
      { id: "matte-clip" + key },
      matte
    ),
    additionalDefs
  );
};