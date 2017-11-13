"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _XYFrame2 = require("./XYFrame");

var _XYFrame3 = _interopRequireDefault(_XYFrame2);

var _MiniMap = require("./MiniMap");

var _MiniMap2 = _interopRequireDefault(_MiniMap);

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components


var MinimapXYFrame = function (_XYFrame) {
  _inherits(MinimapXYFrame, _XYFrame);

  function MinimapXYFrame(props) {
    _classCallCheck(this, MinimapXYFrame);

    var _this = _possibleConstructorReturn(this, (MinimapXYFrame.__proto__ || Object.getPrototypeOf(MinimapXYFrame)).call(this, props));

    _this.generateMinimap = _this.generateMinimap.bind(_this);
    return _this;
  }

  _createClass(MinimapXYFrame, [{
    key: "generateMinimap",
    value: function generateMinimap() {
      var miniDefaults = {
        title: "",
        position: [0, 0],
        size: [this.props.size[0], this.props.size[1] * 0.25],
        xAccessor: this.props.xAccessor,
        yAccessor: this.props.yAccessor,
        points: this.props.points,
        lines: this.props.lines,
        areas: this.props.areas,
        lineDataAccessor: this.props.lineDataAccessor,
        xBrushable: true,
        yBrushable: true,
        brushStart: function brushStart() {},
        brush: function brush() {},
        brushEnd: function brushEnd() {},
        lineType: this.props.lineType
      };

      var combinedOptions = _extends(miniDefaults, this.props.minimap);

      combinedOptions.hoverAnnotation = false;

      return _react2.default.createElement(_MiniMap2.default, combinedOptions);
    }
  }, {
    key: "render",
    value: function render() {
      var miniMap = this.generateMinimap();
      var options = {};
      if (this.props.renderBefore) {
        options.beforeElements = miniMap;
      } else {
        options.afterElements = miniMap;
      }

      return this.renderBody(options);
    }
  }]);

  return MinimapXYFrame;
}(_XYFrame3.default);

MinimapXYFrame.propTypes = {
  size: _propTypes2.default.array,
  xAccessor: _propTypes2.default.func,
  yAccessor: _propTypes2.default.func,
  points: _propTypes2.default.array,
  lines: _propTypes2.default.array,
  areas: _propTypes2.default.array,
  lineDataAccessor: _propTypes2.default.func,
  lineType: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object]),
  minimap: _propTypes2.default.object,
  renderBefore: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object])
};

exports.default = MinimapXYFrame;
module.exports = exports['default'];