"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Shape = require("d3-shape");

var _lineDrawing = require("./svg/lineDrawing");

var _semioticMark = require("semiotic-mark");

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components

var DividedLine = function (_React$Component) {
  _inherits(DividedLine, _React$Component);

  function DividedLine(props) {
    _classCallCheck(this, DividedLine);

    var _this = _possibleConstructorReturn(this, (DividedLine.__proto__ || Object.getPrototypeOf(DividedLine)).call(this, props));

    _this.createLineSegments = _this.createLineSegments.bind(_this);
    return _this;
  }

  _createClass(DividedLine, [{
    key: "createLineSegments",
    value: function createLineSegments() {
      var _this2 = this;

      var params = this.props.parameters;
      var className = this.props.className;
      var interpolate = this.props.interpolate || _d3Shape.curveLinear;

      var data = (0, _lineDrawing.projectLineData)({
        data: this.props.data,
        lineDataAccessor: this.props.lineDataAccessor,
        xProp: "_x",
        yProp: "_y",
        xAccessor: this.props.customAccessors.x,
        yAccessor: this.props.customAccessors.y
      });

      var lines = (0, _lineDrawing.dividedLine)(params, data[0].data, this.props.searchIterations);

      var lineRender = (0, _d3Shape.line)().curve(interpolate).x(function (d) {
        return d._x;
      }).y(function (d) {
        return d._y;
      });

      return lines.map(function (d, i) {
        return _react2.default.createElement(_semioticMark.Mark, _extends({}, _this2.props, {
          className: className,
          markType: "path",
          key: "DividedLine" + i,
          style: d.key,
          d: lineRender(d.points)
        }));
      });
    }
  }, {
    key: "render",
    value: function render() {
      var lines = this.createLineSegments();

      return _react2.default.createElement(
        "g",
        null,
        lines
      );
    }
  }]);

  return DividedLine;
}(_react2.default.Component);

DividedLine.propTypes = {
  parameters: _propTypes2.default.func,
  className: _propTypes2.default.string,
  interpolate: _propTypes2.default.func,
  data: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  lineDataAccessor: _propTypes2.default.func,
  customAccessors: _propTypes2.default.object,
  searchIterations: _propTypes2.default.number
};

exports.default = DividedLine;
module.exports = exports['default'];