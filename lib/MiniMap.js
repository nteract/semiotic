"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _XYFrame = require("./XYFrame");

var _XYFrame2 = _interopRequireDefault(_XYFrame);

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components

var MiniMap = function (_React$Component) {
  _inherits(MiniMap, _React$Component);

  function MiniMap() {
    _classCallCheck(this, MiniMap);

    return _possibleConstructorReturn(this, (MiniMap.__proto__ || Object.getPrototypeOf(MiniMap)).apply(this, arguments));
  }

  _createClass(MiniMap, [{
    key: "render",
    value: function render() {
      var interactivity = {
        start: this.props.brushStart,
        during: this.props.brush,
        end: this.props.brushEnd
      };

      if (this.props.xBrushable && this.props.yBrushable) {
        interactivity.brush = "xyBrush";
        interactivity.extent = [[], []];
        if (this.props.xBrushExtent) {
          interactivity.extent[0] = this.props.xBrushExtent;
        }
        if (this.props.yBrushExtent) {
          interactivity.extent[1] = this.props.yBrushExtent;
        }
      } else if (this.props.xBrushable) {
        interactivity.brush = "xBrush";
        if (this.props.xBrushExtent) {
          interactivity.extent = this.props.xBrushExtent;
        }
      } else if (this.props.yBrushable) {
        interactivity.brush = "yBrush";
        if (this.props.yBrushExtent) {
          interactivity.extent = this.props.yBrushExtent;
        }
      }

      return _react2.default.createElement(_XYFrame2.default, _extends({}, this.props, { interaction: interactivity }));
    }
  }]);

  return MiniMap;
}(_react2.default.Component);

MiniMap.propTypes = {
  brushStart: _propTypes2.default.func,
  brush: _propTypes2.default.func,
  brushEnd: _propTypes2.default.func,
  xBrushExtent: _propTypes2.default.array,
  yBrushExtent: _propTypes2.default.array,
  xBrushable: _propTypes2.default.bool,
  yBrushable: _propTypes2.default.bool
};

exports.default = MiniMap;
module.exports = exports['default'];