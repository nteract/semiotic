"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Selection = require("d3-selection");

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components

var Brush = function (_React$Component) {
  _inherits(Brush, _React$Component);

  function Brush(props) {
    _classCallCheck(this, Brush);

    var _this = _possibleConstructorReturn(this, (Brush.__proto__ || Object.getPrototypeOf(Brush)).call(this, props));

    _this.createBrush = _this.createBrush.bind(_this);
    return _this;
  }

  _createClass(Brush, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      this.createBrush();
    }
  }, {
    key: "createBrush",
    value: function createBrush() {
      var node = this.node;
      var brush = this.props.svgBrush;
      (0, _d3Selection.select)(node).call(brush);
      if (this.props.selectedExtent) {
        (0, _d3Selection.select)(node).call(brush.move, this.props.selectedExtent);
      }
    }
  }, {
    key: "render",
    value: function render() {
      var _this2 = this;

      return _react2.default.createElement("g", {
        ref: function ref(node) {
          return _this2.node = node;
        },
        transform: "translate(" + (this.props.position || [0, 0]) + ")",
        className: "xybrush"
      });
    }
  }]);

  return Brush;
}(_react2.default.Component);

Brush.propTypes = {
  size: _propTypes2.default.array,
  position: _propTypes2.default.array,
  selectedExtent: _propTypes2.default.array,
  svgBrush: _propTypes2.default.func
};

exports.default = Brush;
module.exports = exports['default'];