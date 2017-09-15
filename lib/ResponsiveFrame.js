"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ResponsiveMinimapXYFrame = exports.ResponsiveSmartFrame = exports.ResponsiveNetworkFrame = exports.ResponsiveORFrame = exports.ResponsiveXYFrame = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _reactDimensions = require("react-dimensions");

var _reactDimensions2 = _interopRequireDefault(_reactDimensions);

var _XYFrame = require("./XYFrame");

var _XYFrame2 = _interopRequireDefault(_XYFrame);

var _ORFrame = require("./ORFrame");

var _ORFrame2 = _interopRequireDefault(_ORFrame);

var _NetworkFrame = require("./NetworkFrame");

var _NetworkFrame2 = _interopRequireDefault(_NetworkFrame);

var _SmartFrame = require("./SmartFrame");

var _SmartFrame2 = _interopRequireDefault(_SmartFrame);

var _MinimapXYFrame = require("./MinimapXYFrame");

var _MinimapXYFrame2 = _interopRequireDefault(_MinimapXYFrame);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var createResponsiveFrame = function createResponsiveFrame(Frame) {
  return (0, _reactDimensions2.default)()(function (_React$Component) {
    _inherits(ResponsiveFrame, _React$Component);

    function ResponsiveFrame() {
      _classCallCheck(this, ResponsiveFrame);

      return _possibleConstructorReturn(this, (ResponsiveFrame.__proto__ || Object.getPrototypeOf(ResponsiveFrame)).apply(this, arguments));
    }

    _createClass(ResponsiveFrame, [{
      key: "render",
      value: function render() {
        var _props = this.props,
            responsiveWidth = _props.responsiveWidth,
            responsiveHeight = _props.responsiveHeight,
            size = _props.size,
            containerHeight = _props.containerHeight,
            containerWidth = _props.containerWidth,
            dataVersion = _props.dataVersion;


        if (responsiveWidth) {
          size[0] = containerWidth;
        }

        if (responsiveHeight) {
          size[1] = containerHeight;
        }

        var dataVersionWithSize = dataVersion + size.toString();

        return _react2.default.createElement(Frame, _extends({}, this.props, {
          size: size,
          dataVersion: dataVersion ? dataVersionWithSize : undefined
        }));
      }
    }]);

    return ResponsiveFrame;
  }(_react2.default.Component));
};

var ResponsiveXYFrame = exports.ResponsiveXYFrame = createResponsiveFrame(_XYFrame2.default);
var ResponsiveORFrame = exports.ResponsiveORFrame = createResponsiveFrame(_ORFrame2.default);
var ResponsiveNetworkFrame = exports.ResponsiveNetworkFrame = createResponsiveFrame(_NetworkFrame2.default);
var ResponsiveSmartFrame = exports.ResponsiveSmartFrame = createResponsiveFrame(_SmartFrame2.default);
var ResponsiveMinimapXYFrame = exports.ResponsiveMinimapXYFrame = createResponsiveFrame(_MinimapXYFrame2.default);