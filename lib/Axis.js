"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _numeral = require("numeral");

var _numeral2 = _interopRequireDefault(_numeral);

var _axis = require("./visualizationLayerBehavior/axis");

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
//import { wrap } from '../svg/SvgHelper';

// components

function formatValue(value, props) {
  if (props.tickFormat) {
    return props.tickFormat(value);
  }
  if (props.format) {
    return (0, _numeral2.default)(value).format(props.format);
  }
  if (value.toString) {
    return value.toString();
  }
  return value;
}

var Axis = function (_React$Component) {
  _inherits(Axis, _React$Component);

  function Axis(props) {
    _classCallCheck(this, Axis);

    var _this = _possibleConstructorReturn(this, (Axis.__proto__ || Object.getPrototypeOf(Axis)).call(this, props));

    _this.state = { hoverAnnotation: 0 };
    return _this;
  }

  _createClass(Axis, [{
    key: "render",
    value: function render() {
      var _this2 = this;

      var position = this.props.position || [0, 0];
      var _props = this.props,
          rotate = _props.rotate,
          label = _props.label,
          _props$orient = _props.orient,
          orient = _props$orient === undefined ? "left" : _props$orient,
          format = _props.format,
          _props$tickFormat = _props.tickFormat,
          tickFormat = _props$tickFormat === undefined ? format ? function (d) {
        return (0, _numeral2.default)(d).format(format);
      } : function (d) {
        return d;
      } : _props$tickFormat,
          size = _props.size,
          _props$width = _props.width,
          width = _props$width === undefined ? size[0] || 0 : _props$width,
          _props$height = _props.height,
          height = _props$height === undefined ? size[1] || 0 : _props$height,
          _props$margin = _props.margin,
          margin = _props$margin === undefined ? { left: 0, right: 0, top: 0, bottom: 0 } : _props$margin,
          className = _props.className,
          padding = _props.padding,
          tickValues = _props.tickValues,
          scale = _props.scale,
          ticks = _props.ticks,
          footer = _props.footer;


      var axisTickLines = void 0;
      var axisParts = this.props.axisParts;

      if (!axisParts) {
        axisParts = (0, _axis.axisPieces)({
          padding: padding,
          tickValues: tickValues,
          scale: scale,
          ticks: ticks,
          orient: orient,
          size: size,
          margin: margin,
          footer: footer
        });
        axisTickLines = _react2.default.createElement(
          "g",
          { className: "axis " + className },
          (0, _axis.axisLines)({ axisParts: axisParts, orient: orient })
        );
      }
      if (axisParts.length === 0) {
        return null;
      }

      var hoverWidth = 50;
      var hoverHeight = height;
      var hoverX = 0;
      var hoverY = margin.top;
      var hoverFunction = function hoverFunction(e) {
        return _this2.setState({ hoverAnnotation: e.nativeEvent.offsetY - margin.top });
      };
      var circleX = 25;
      var textX = -25;
      var textY = 18;
      var lineWidth = width + 25;
      var lineHeight = 0;
      var circleY = this.state.hoverAnnotation;
      var annotationOffset = margin.left;
      var annotationType = "y";

      switch (orient) {
        case "right":
          position = [position[0], position[1]];
          hoverX = width;
          annotationOffset = margin.top;
          lineWidth = -width - 25;
          textX = 5;
          hoverFunction = function hoverFunction(e) {
            return _this2.setState({
              hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
            });
          };
          break;
        case "top":
          position = [position[0], 0];
          hoverWidth = width;
          hoverHeight = 50;
          hoverY = 0;
          annotationType = "x";
          hoverX = margin.left;
          hoverFunction = function hoverFunction(e) {
            return _this2.setState({
              hoverAnnotation: e.nativeEvent.offsetX - annotationOffset
            });
          };
          circleX = this.state.hoverAnnotation;
          circleY = 25;
          textX = 0;
          textY = -10;
          lineWidth = 0;
          lineHeight = height + 25;
          break;
        case "bottom":
          position = [position[0], position[1] - margin.top];
          position = [position[0], 0];
          hoverWidth = width;
          hoverHeight = 50;
          hoverY = height + margin.top;
          hoverX = margin.left;
          hoverFunction = function hoverFunction(e) {
            return _this2.setState({
              hoverAnnotation: e.nativeEvent.offsetX - annotationOffset
            });
          };
          circleX = this.state.hoverAnnotation;
          circleY = 25;
          textX = 0;
          textY = 15;
          lineWidth = 0;
          lineHeight = -height - 25;
          annotationType = "x";
          break;
        default:
          position = [position[0] - margin.left, position[1]];
          annotationOffset = margin.top;
          hoverFunction = function hoverFunction(e) {
            return _this2.setState({
              hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
            });
          };
      }

      var annotationBrush = void 0;

      if (this.props.annotationFunction) {
        var hoverGlyph = this.props.glyphFunction ? this.props.glyphFunction({
          lineHeight: lineHeight,
          lineWidth: lineWidth,
          value: this.props.scale.invert(this.state.hoverAnnotation + annotationOffset)
        }) : _react2.default.createElement(
          "g",
          null,
          _react2.default.createElement(
            "text",
            { x: textX, y: textY },
            formatValue(this.props.scale.invert(this.state.hoverAnnotation + annotationOffset), this.props)
          ),
          _react2.default.createElement("circle", { r: 5 }),
          _react2.default.createElement("line", { x1: lineWidth, y1: lineHeight, style: { stroke: "black" } })
        );
        var annotationSymbol = this.state.hoverAnnotation ? _react2.default.createElement(
          "g",
          {
            style: { pointerEvents: "none" },
            transform: "translate(" + circleX + "," + circleY + ")"
          },
          hoverGlyph
        ) : null;
        annotationBrush = _react2.default.createElement(
          "g",
          {
            className: "annotation-brush",
            transform: "translate(" + hoverX + "," + hoverY + ")"
          },
          _react2.default.createElement("rect", {
            style: { fillOpacity: 0 },
            height: hoverHeight,
            width: hoverWidth,
            onMouseMove: hoverFunction,
            onClick: function onClick() {
              return _this2.props.annotationFunction({
                className: "dynamic-axis-annotation",
                type: annotationType,
                value: _this2.props.scale.invert(_this2.state.hoverAnnotation + annotationOffset)
              });
            },
            onMouseOut: function onMouseOut() {
              return _this2.setState({ hoverAnnotation: undefined });
            }
          }),
          annotationSymbol
        );
      }

      var axisTitle = void 0;

      var axisTickLabels = (0, _axis.axisLabels)({
        tickFormat: tickFormat,
        axisParts: axisParts,
        orient: orient,
        rotate: rotate
      });
      if (label) {
        var labelName = label.name || label;
        var labelPosition = label.position || {};
        var locationMod = labelPosition.location || "outside";
        var anchorMod = labelPosition.anchor || "middle";
        var distance = label.locationDistance;

        var rotateHash = {
          left: -90,
          right: 90,
          top: 0,
          bottom: 0
        };

        var rotation = labelPosition.rotation || rotateHash[orient];

        var positionHash = {
          left: {
            start: [margin.left, size[1] + margin.top],
            middle: [margin.left, size[1] / 2 + margin.top],
            end: [margin.left, margin.top],
            inside: [distance || 15, 0],
            outside: [-(distance || 45), 0]
          },
          right: {
            start: [size[0] + margin.left, size[1] + margin.top],
            middle: [size[0] + margin.left, size[1] / 2 + margin.top],
            end: [size[0] + margin.left, margin.top],
            inside: [-(distance || 15), 0],
            outside: [distance || 45, 0]
          },
          top: {
            start: [margin.left, margin.top],
            middle: [margin.left + size[0] / 2, margin.top],
            end: [margin.left + size[0], margin.top],
            inside: [0, distance || 15],
            outside: [0, -(distance || 40)]
          },
          bottom: {
            start: [margin.left, size[1] + margin.top],
            middle: [margin.left + size[0] / 2, size[1] + margin.top],
            end: [margin.left + size[0], size[1] + margin.top],
            inside: [0, -(distance || 5)],
            outside: [0, distance || 50]
          }
        };

        var translation = positionHash[orient][anchorMod];
        var location = positionHash[orient][locationMod];

        translation[0] = translation[0] + location[0];
        translation[1] = translation[1] + location[1];

        if (anchorMod === "start" && orient === "right") {
          anchorMod = "end";
        } else if (anchorMod === "end" && orient === "right") {
          anchorMod = "start";
        }

        axisTitle = _react2.default.createElement(
          "g",
          {
            className: "axis-title",
            transform: "translate(" + [translation[0] + position[0], translation[1] + position[1]] + ") rotate(" + rotation + ")"
          },
          _react2.default.createElement(
            "text",
            { textAnchor: anchorMod },
            labelName
          )
        );
      }
      return _react2.default.createElement(
        "g",
        { className: className },
        annotationBrush,
        axisTickLabels,
        axisTickLines,
        axisTitle
      );
    }
  }]);

  return Axis;
}(_react2.default.Component);

Axis.propTypes = {
  name: _propTypes2.default.string,
  className: _propTypes2.default.string,
  orient: _propTypes2.default.string,
  position: _propTypes2.default.array,
  size: _propTypes2.default.array,
  rotate: _propTypes2.default.number,
  scale: _propTypes2.default.func,
  margin: _propTypes2.default.object,
  annotationFunction: _propTypes2.default.func,
  format: _propTypes2.default.string,
  tickFormat: _propTypes2.default.func,
  tickValues: _propTypes2.default.array,
  padding: _propTypes2.default.number,
  ticks: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.number])
};

module.exports = Axis;