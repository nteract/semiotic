"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components

var MarkContext = function (_React$Component) {
  _inherits(MarkContext, _React$Component);

  function MarkContext(props) {
    _classCallCheck(this, MarkContext);

    var _this = _possibleConstructorReturn(this, (MarkContext.__proto__ || Object.getPrototypeOf(MarkContext)).call(this, props));

    _this.mapElements = _this.mapElements.bind(_this);
    _this.shouldComponentUpdate = _this.shouldComponentUpdate.bind(_this);
    _this.updateContext = _this.updateContext.bind(_this);
    _this.state = { context: {} };
    return _this;
  }

  _createClass(MarkContext, [{
    key: "mapElements",
    value: function mapElements(element, ei) {
      if (!element) return null;

      var props = {
        key: "mc-mark-" + ei
      };

      if (typeof element.type !== "string") {
        props.context = this.state.context;
        props.updateContext = this.updateContext;
      }
      if (Array.isArray(element)) return element.map(this.mapElements);

      return _react2.default.cloneElement(element, props);
    }
  }, {
    key: "shouldComponentUpdate",
    value: function shouldComponentUpdate(nextProps) {
      if (this.props.xyFrameChildren && this.props.renderNumber === nextProps.renderNumber) {
        return false;
      }
      return true;
    }
  }, {
    key: "updateContext",
    value: function updateContext(prop, value) {
      var currentContext = this.state.context;
      currentContext[prop] = value;
      this.setState({ context: currentContext });
    }
  }, {
    key: "render",
    value: function render() {
      var elements = null;

      if (Array.isArray(this.props.children)) elements = this.props.children.map(this.mapElements);else if (_typeof(this.props.children) === "object") elements = this.mapElements(this.props.children);

      var transform = [0, 0];

      transform[0] = this.props.position ? this.props.position[0] : 0;
      transform[1] = this.props.position ? this.props.position[1] : 0;

      return _react2.default.createElement(
        "g",
        { transform: "translate(" + transform.toString() + ")" },
        elements
      );
    }
  }]);

  return MarkContext;
}(_react2.default.Component);

MarkContext.propTypes = {
  position: _propTypes2.default.array,
  xyFrameChildren: _propTypes2.default.bool,
  renderNumber: _propTypes2.default.number
};
exports.default = MarkContext;
module.exports = exports['default'];