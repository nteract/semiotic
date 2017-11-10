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

var _ORFrame = require("./ORFrame");

var _ORFrame2 = _interopRequireDefault(_ORFrame);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components

// import PropTypes from 'prop-types'

var SmartFrame = function (_React$Component) {
  _inherits(SmartFrame, _React$Component);

  function SmartFrame() {
    _classCallCheck(this, SmartFrame);

    return _possibleConstructorReturn(this, (SmartFrame.__proto__ || Object.getPrototypeOf(SmartFrame)).apply(this, arguments));
  }

  _createClass(SmartFrame, [{
    key: "render",
    value: function render() {
      if (this.props.frameType === "orFrame") {
        return _react2.default.createElement(_ORFrame2.default, _extends({}, this.props, {
          oAccessor: this.props.xAccessor,
          rAccessor: this.props.yAccessor,
          data: this.props.pieceData,
          groupData: this.props.aggData,
          groupDataAccessor: this.props.aggDataAccessor,
          dataAccessor: this.props.pieceDataAccessor,
          groupType: this.props.customAggType,
          groupStyle: this.props.aggStyle,
          style: this.props.pieceStyle,
          type: this.props.customPieceType
        }));
      }
      return _react2.default.createElement(_XYFrame2.default, _extends({}, this.props, {
        points: this.props.pieceData,
        lines: this.props.aggData,
        lineDataAccessor: this.props.aggDataAccessor,
        pointDataAccessor: this.props.pieceDataAccessor,
        lineType: this.props.customAggType,
        lineStyle: this.props.aggStyle,
        pointStyle: this.props.pieceStyle
      }));
    }
  }]);

  return SmartFrame;
}(_react2.default.Component);

exports.default = SmartFrame;
module.exports = exports['default'];