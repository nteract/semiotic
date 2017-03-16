'use strict';

// modules

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components

var PropTypes = _react2.default.PropTypes;

var AnnotationLayer = function (_React$Component) {
  _inherits(AnnotationLayer, _React$Component);

  function AnnotationLayer(props) {
    _classCallCheck(this, AnnotationLayer);

    var _this = _possibleConstructorReturn(this, (AnnotationLayer.__proto__ || Object.getPrototypeOf(AnnotationLayer)).call(this, props));

    _this.generateSVGAnnotations = _this.generateSVGAnnotations.bind(_this);
    _this.generateHTMLAnnotations = _this.generateHTMLAnnotations.bind(_this);
    return _this;
  }

  _createClass(AnnotationLayer, [{
    key: 'generateSVGAnnotations',
    value: function generateSVGAnnotations() {
      var _this2 = this;

      var annotations = this.props.annotations.map(function (d, i) {
        return _this2.props.svgAnnotationRule(d, i, _this2.props);
      }).filter(function (d) {
        return d !== null && d !== undefined;
      });

      return annotations;
    }
  }, {
    key: 'generateHTMLAnnotations',
    value: function generateHTMLAnnotations() {
      var _this3 = this;

      var annotations = this.props.annotations.map(function (d, i) {
        return _this3.props.htmlAnnotationRule(d, i, _this3.props);
      }).filter(function (d) {
        return d !== null && d !== undefined;
      });

      return annotations;
    }
  }, {
    key: 'render',
    value: function render() {

      var svgAnnotations = [];
      var htmlAnnotations = [];

      if (this.props.svgAnnotationRule) {
        svgAnnotations = this.generateSVGAnnotations();
      }

      if (this.props.htmlAnnotationRule) {
        htmlAnnotations = this.generateHTMLAnnotations();
      }

      return _react2.default.createElement(
        'div',
        { className: 'xyframe-annotation-layer', style: { position: "absolute", pointerEvents: "none", background: "none" } },
        _react2.default.createElement(
          'div',
          { style: { background: "none", pointerEvents: "none", position: "absolute", height: this.props.size[1] + "px", width: this.props.size[0] + "px" } },
          htmlAnnotations
        ),
        _react2.default.createElement(
          'svg',
          { height: this.props.size[1], width: this.props.size[0], style: { background: "none", pointerEvents: "none" } },
          svgAnnotations
        )
      );
    }
  }]);

  return AnnotationLayer;
}(_react2.default.Component);

AnnotationLayer.propTypes = {
  scale: PropTypes.func,
  orient: PropTypes.string,
  title: PropTypes.string,
  format: PropTypes.string,
  values: PropTypes.array,
  properties: PropTypes.object,
  position: PropTypes.array
};

module.exports = AnnotationLayer;