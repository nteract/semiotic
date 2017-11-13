"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderLaidOutPieces = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.pointOnArcAtAngle = pointOnArcAtAngle;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _semioticMark = require("semiotic-mark");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function pointOnArcAtAngle(center, angle, distance) {
  var radians = Math.PI * (angle + 0.75) * 2;

  var xPosition = center[0] + distance * Math.cos(radians);
  var yPosition = center[1] + distance * Math.sin(radians);

  return [xPosition, yPosition];
}

var renderLaidOutPieces = exports.renderLaidOutPieces = function renderLaidOutPieces(_ref) {
  var data = _ref.data,
      shouldRender = _ref.shouldRender;
  return !shouldRender ? null : data.map(function (d, i) {
    return _react2.default.isValidElement(d.renderElement || d) ? d.renderElement || d : _react2.default.createElement(_semioticMark.Mark, _extends({
      key: d.renderKey || "piece-render-" + i
    }, d.renderElement || d));
  });
};