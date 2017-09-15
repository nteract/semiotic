"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (props) {
  var shouldRender = typeof props.shouldRender !== "undefined" ? props.shouldRender : process.env.NODE_ENV !== "production";

  if (!shouldRender) return null;

  return _react2.default.createElement(
    "div",
    { "class": "abacus-debug" },
    props.children
  );
};

module.exports = exports['default'];