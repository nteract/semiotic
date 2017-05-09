'use strict';

// modules

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _d3Axis = require('d3-axis');

var _d3Selection = require('d3-selection');

var _numeral = require('numeral');

var _numeral2 = _interopRequireDefault(_numeral);

var _SvgHelper = require('../svg/SvgHelper');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components

var PropTypes = _react2.default.PropTypes;

var Axis = function (_React$Component) {
  _inherits(Axis, _React$Component);

  function Axis(props) {
    _classCallCheck(this, Axis);

    var _this = _possibleConstructorReturn(this, (Axis.__proto__ || Object.getPrototypeOf(Axis)).call(this, props));

    _this.drawAxis = _this.drawAxis.bind(_this);
    _this.state = { hoverAnnotation: 0 };
    return _this;
  }

  _createClass(Axis, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.drawAxis();
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      //TODO: DON'T UPDATE WITH JUST HOVERANNOTATION CHANGE
      this.drawAxis();
    }
  }, {
    key: 'drawAxis',
    value: function drawAxis() {
      var axisGenerator = _d3Axis.axisTop;
      var node = this.node;
      //      let position = this.props.position || [ 0,0 ]
      var width = this.props.size ? this.props.size[0] : 0;
      var height = this.props.size ? this.props.size[1] : 0;

      if (this.props.orient === "left") {
        axisGenerator = _d3Axis.axisLeft;
      } else if (this.props.orient === "right") {
        axisGenerator = _d3Axis.axisRight;
      } else if (this.props.orient === "bottom") {
        axisGenerator = _d3Axis.axisBottom;
      }

      var tickSize = height;

      if (this.props.orient === "left" || this.props.orient === "right" || this.props.orient === "midvert") {
        tickSize = width;
      }

      if (this.props.tickSize) {
        tickSize = this.props.tickSize;
      }

      var format = this.props.format;

      var axis = axisGenerator().scale(this.props.scale).tickSize(tickSize);

      if (this.props.ticks) {
        axis.ticks(this.props.ticks);
      }

      if (this.props.tickValues) {
        axis.tickValues(this.props.tickValues);
      }

      if (this.props.tickFormat) {
        axis.tickFormat(this.props.tickFormat);
      } else if (format) {
        axis.tickFormat(function (d) {
          return (0, _numeral2.default)(d).format(format);
        });
      }

      (0, _d3Selection.select)(node).call(axis);

      if (this.props.textWrap) {
        (0, _d3Selection.select)(node).selectAll('.tick text').call(_SvgHelper.wrap, this.props.wrapWidth || 100);
      }

      if (this.props.rotate) {
        (0, _d3Selection.select)(node).selectAll("text").style("text-anchor", "start").attr("dx", "-.8em").attr("dy", ".15em").attr("transform", "translate(180,120) rotate(" + this.props.rotate + ")");
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var position = this.props.position || [0, 0];
      var width = this.props.size[0] || 0;
      var height = this.props.size[1] || 0;
      var margin = this.props.margin || { left: 0, right: 0, top: 0, bottom: 0 };
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

      if (this.props.orient === "left") {
        position = [width + position[0], position[1]];
      }

      if (this.props.orient === "right") {
        position = [position[0], position[1]];
        hoverX = width;
      }

      if (this.props.orient === "top") {
        position = [position[0], height + position[1]];
        hoverWidth = width;
        hoverHeight = 50;
        hoverY = 0;
        annotationType = "x";
      }

      if (this.props.orient === "bottom") {
        position = [position[0], position[1]];
        hoverWidth = width;
        hoverHeight = 50;
        hoverY = height + 50;
        hoverX = margin.left;
        hoverFunction = function hoverFunction(e) {
          return _this2.setState({ hoverAnnotation: e.nativeEvent.offsetX - margin.left });
        };
        circleX = this.state.hoverAnnotation;
        circleY = 25;
        textX = 10;
        textY = 5;
        lineWidth = 0;
        lineHeight = -height - 25;
        annotationOffset = margin.top;
        annotationType = "x";
      }
      var annotationBrush = void 0;
      if (this.props.annotationFunction) {
        var annotationSymbol = this.state.hoverAnnotation ? _react2.default.createElement(
          'g',
          {
            style: { pointerEvents: "none" },
            transform: 'translate(' + circleX + ',' + circleY + ')' },
          _react2.default.createElement(
            'text',
            { x: textX, y: textY },
            (0, _numeral2.default)(this.props.scale.invert(this.state.hoverAnnotation + annotationOffset)).format(this.props.format)
          ),
          _react2.default.createElement('circle', { r: 5 }),
          _react2.default.createElement('line', { x1: lineWidth, y1: lineHeight,
            style: { stroke: "black" } })
        ) : null;
        annotationBrush = _react2.default.createElement(
          'g',
          { className: 'annotation-brush', transform: 'translate(' + hoverX + ',' + hoverY + ')' },
          _react2.default.createElement('rect', { style: { fillOpacity: 0 }, height: hoverHeight, width: hoverWidth,
            onMouseMove: hoverFunction /*this.setState()*/,
            onClick: function onClick() {
              return _this2.props.annotationFunction({ type: annotationType, value: _this2.props.scale.invert(_this2.state.hoverAnnotation + annotationOffset) });
            },
            onMouseOut: function onMouseOut() {
              return _this2.setState({ hoverAnnotation: undefined });
            }
          }),
          annotationSymbol
        );
      }

      return _react2.default.createElement(
        'g',
        null,
        _react2.default.createElement('g', { transform: 'translate(' + position + ')', ref: function ref(node) {
            return _this2.node = node;
          }, className: this.props.className }),
        annotationBrush
      );
    }
  }]);

  return Axis;
}(_react2.default.Component);

Axis.propTypes = {
  name: PropTypes.string,
  scale: PropTypes.func,
  orient: PropTypes.string,
  title: PropTypes.string,
  format: PropTypes.string,
  values: PropTypes.array,
  properties: PropTypes.object,
  position: PropTypes.array
};

module.exports = Axis;