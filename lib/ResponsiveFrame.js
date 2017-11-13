"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ResponsiveMinimapXYFrame = exports.ResponsiveSmartFrame = exports.ResponsiveNetworkFrame = exports.ResponsiveORFrame = exports.ResponsiveXYFrame = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

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

var _elementResizeEvent = require("element-resize-event");

var _elementResizeEvent2 = _interopRequireDefault(_elementResizeEvent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var createResponsiveFrame = function createResponsiveFrame(Frame) {
  var _class, _temp;

  return _temp = _class = function (_React$Component) {
    _inherits(ResponsiveFrame, _React$Component);

    function ResponsiveFrame(props) {
      _classCallCheck(this, ResponsiveFrame);

      var _this = _possibleConstructorReturn(this, (ResponsiveFrame.__proto__ || Object.getPrototypeOf(ResponsiveFrame)).call(this, props));

      _this._onResize = function (width, height) {
        _this.setState({ containerHeight: height, containerWidth: width });
      };

      _this.state = {
        containerHeight: props.size[1],
        containerWidth: props.size[0]
      };
      return _this;
    }

    _createClass(ResponsiveFrame, [{
      key: "componentDidMount",
      value: function componentDidMount() {
        var _this2 = this;

        var element = this.node;
        (0, _elementResizeEvent2.default)(element, function () {
          _this2.setState({
            containerHeight: element.offsetHeight,
            containerWidth: element.offsetWidth
          });
        });
        this.setState({
          containerHeight: element.offsetHeight,
          containerWidth: element.offsetWidth
        });
      }
    }, {
      key: "render",
      value: function render() {
        var _this3 = this;

        var _props = this.props,
            responsiveWidth = _props.responsiveWidth,
            responsiveHeight = _props.responsiveHeight,
            size = _props.size,
            dataVersion = _props.dataVersion,
            _props$style = _props.style,
            style = _props$style === undefined ? {} : _props$style;
        var _state = this.state,
            containerHeight = _state.containerHeight,
            containerWidth = _state.containerWidth;


        var actualSize = [].concat(_toConsumableArray(size));

        if (responsiveWidth) {
          actualSize[0] = containerWidth;
        }

        if (responsiveHeight) {
          actualSize[1] = containerHeight;
        }

        var dataVersionWithSize = dataVersion + actualSize.toString();

        return _react2.default.createElement(
          "div",
          {
            className: "responsive-container",
            style: _extends({ height: "100%", width: "100%" }, style),
            ref: function ref(node) {
              return _this3.node = node;
            }
          },
          _react2.default.createElement(Frame, _extends({}, this.props, {
            size: actualSize,
            dataVersion: dataVersion ? dataVersionWithSize : undefined
          }))
        );
      }
    }]);

    return ResponsiveFrame;
  }(_react2.default.Component), _class.propTypes = {
    size: _propTypes2.default.array
  }, _class.defaultProps = {
    size: [500, 500]
  }, _temp;
};

var ResponsiveXYFrame = exports.ResponsiveXYFrame = createResponsiveFrame(_XYFrame2.default);
var ResponsiveORFrame = exports.ResponsiveORFrame = createResponsiveFrame(_ORFrame2.default);
var ResponsiveNetworkFrame = exports.ResponsiveNetworkFrame = createResponsiveFrame(_NetworkFrame2.default);
var ResponsiveSmartFrame = exports.ResponsiveSmartFrame = createResponsiveFrame(_SmartFrame2.default);
var ResponsiveMinimapXYFrame = exports.ResponsiveMinimapXYFrame = createResponsiveFrame(_MinimapXYFrame2.default);