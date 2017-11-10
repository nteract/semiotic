"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _annotationHandling = require("./annotationLayerBehavior/annotationHandling");

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

var _Legend = require("./Legend");

var _Legend2 = _interopRequireDefault(_Legend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // modules

//import { load } from 'opentype.js'


function adjustedAnnotationKeyMapper(d) {
  return d.props.noteData.id || d.props.noteData.x + "-" + d.props.noteData.y;
}

function objectStringKey(object) {
  var finalKey = "";
  Object.keys(object).forEach(function (key) {
    finalKey += !object[key] || !object[key].toString ? object[key] : object[key].toString();
  });

  return finalKey;
}

var AnnotationLayer = function (_React$Component) {
  _inherits(AnnotationLayer, _React$Component);

  function AnnotationLayer(props) {
    _classCallCheck(this, AnnotationLayer);

    var _this = _possibleConstructorReturn(this, (AnnotationLayer.__proto__ || Object.getPrototypeOf(AnnotationLayer)).call(this, props));

    _this.generateSVGAnnotations = _this.generateSVGAnnotations.bind(_this);
    _this.generateHTMLAnnotations = _this.generateHTMLAnnotations.bind(_this);

    _this.state = {
      font: undefined,
      svgAnnotations: [],
      htmlAnnotations: [],
      adjustedAnnotations: 0,
      adjustedAnnotationsKey: ""
    };
    return _this;
  }

  /*    componentWillMount() {
      const fontLocation = this.props.fontLocation
       if (fontLocation) {
        load(fontLocation, function(err, font) {
            if (err) {
                return null
            } else {
                this.setState({ font });
            }
        });
      }
    } */

  _createClass(AnnotationLayer, [{
    key: "generateSVGAnnotations",
    value: function generateSVGAnnotations(props, annotations) {
      var renderedAnnotations = annotations.map(function (d, i) {
        return props.svgAnnotationRule(d, i, props);
      }).filter(function (d) {
        return d !== null && d !== undefined;
      });

      return renderedAnnotations;
    }
  }, {
    key: "generateHTMLAnnotations",
    value: function generateHTMLAnnotations(props, annotations) {
      var renderedAnnotations = annotations.map(function (d, i) {
        return props.htmlAnnotationRule(d, i, props);
      }).filter(function (d) {
        return d !== null && d !== undefined;
      });

      return renderedAnnotations;
    }
  }, {
    key: "processAnnotations",
    value: function processAnnotations(adjustableAnnotations, annotationProcessor, props) {
      if (annotationProcessor.type === false) {
        return adjustableAnnotations;
      }

      var _props$margin = props.margin,
          margin = _props$margin === undefined ? { top: 0, bottom: 0, left: 0, right: 0 } : _props$margin,
          size = props.size,
          axes = props.axes;


      margin = typeof margin === "number" ? { top: margin, left: margin, right: margin, bottom: margin } : margin;

      if (annotationProcessor.type === "bump") {
        var adjustedAnnotations = (0, _annotationHandling.bumpAnnotations)(adjustableAnnotations, props);
        return adjustedAnnotations;
      } else if (annotationProcessor.type === "marginalia") {
        adjustableAnnotations.sort(function (a, b) {
          return a.props.noteData.y - b.props.noteData.y;
        });
        var _adjustedAnnotations = [];
        if (annotationProcessor.orient === "nearest") {
          var adjustedAnnotationsLeft = (0, _annotationHandling.basicVerticalSorting)({
            annotationLayout: annotationProcessor.type,
            adjustableAnnotations: adjustableAnnotations.filter(function (d) {
              return Math.abs(margin.left - d.props.noteData.x) <= Math.abs(size[0] - margin.right - d.props.noteData.x);
            }),
            margin: margin,
            size: size,
            axes: axes,
            orient: "left",
            textHeight: annotationProcessor.textHeight,
            textPadding: annotationProcessor.textPadding,
            textMargin: annotationProcessor.margin
          });

          var adjustedAnnotationsRight = (0, _annotationHandling.basicVerticalSorting)({
            annotationLayout: annotationProcessor.type,
            adjustableAnnotations: adjustableAnnotations.filter(function (d) {
              return Math.abs(margin.left - d.props.noteData.x) > Math.abs(size[0] - margin.right - d.props.noteData.x);
            }),
            margin: margin,
            size: size,
            axes: axes,
            orient: "right",
            textHeight: annotationProcessor.textHeight,
            textPadding: annotationProcessor.textPadding,
            textMargin: annotationProcessor.margin
          });
          _adjustedAnnotations = [].concat(_toConsumableArray(adjustedAnnotationsLeft), _toConsumableArray(adjustedAnnotationsRight));
        } else {
          _adjustedAnnotations = (0, _annotationHandling.basicVerticalSorting)({
            annotationLayout: annotationProcessor.type,
            adjustableAnnotations: adjustableAnnotations,
            margin: margin,
            size: size,
            axes: axes,
            orient: annotationProcessor.orient,
            textHeight: annotationProcessor.textHeight,
            textPadding: annotationProcessor.textPadding,
            textMargin: annotationProcessor.margin
          });
        }
        return _adjustedAnnotations;
      }

      console.error("Unknown annotation handling function: Must be of a string 'bump' or 'marginalia' or a an object with type of those strings or a function that takes adjustable annotations and returns adjusted annotations");
    }
  }, {
    key: "createAnnotations",
    value: function createAnnotations(props) {
      var renderedSVGAnnotations = this.state.svgAnnotations,
          renderedHTMLAnnotations = [],
          adjustedAnnotations = this.state.adjustedAnnotations,
          adjustableAnnotationsKey = this.state.adjustedAnnotationsKey,
          adjustedAnnotationsKey = this.state.adjustedAnnotationsKey;

      var annotations = props.annotations,
          _props$annotationHand = props.annotationHandling,
          annotationHandling = _props$annotationHand === undefined ? false : _props$annotationHand;

      var annotationProcessor = (typeof annotationHandling === "undefined" ? "undefined" : _typeof(annotationHandling)) !== "object" ? { type: annotationHandling } : annotationHandling;

      if (this.props.svgAnnotationRule) {
        var initialSVGAnnotations = this.generateSVGAnnotations(props, annotations);
        var adjustableAnnotations = initialSVGAnnotations.filter(function (d) {
          return d.props && d.props.noteData && !d.props.noteData.fixedPosition;
        });
        var fixedAnnotations = initialSVGAnnotations.filter(function (d) {
          return !d.props || !d.props.noteData || d.props.noteData.fixedPosition;
        });
        adjustableAnnotationsKey = adjustableAnnotations.map(adjustedAnnotationKeyMapper).join(",") + objectStringKey(_extends(annotationProcessor, {
          point: props.pointSizeFunction,
          label: props.labelSizeFunction
        }));

        if (annotationProcessor.type === false) {
          adjustedAnnotations = adjustableAnnotations;
        }

        if (adjustedAnnotations.length !== adjustableAnnotations.length || adjustedAnnotationsKey !== adjustableAnnotationsKey) {
          adjustedAnnotations = this.processAnnotations(adjustableAnnotations, annotationProcessor, props);
        }

        renderedSVGAnnotations = [].concat(_toConsumableArray(adjustedAnnotations), _toConsumableArray(fixedAnnotations));
      }

      if (this.props.htmlAnnotationRule) {
        renderedHTMLAnnotations = this.generateHTMLAnnotations(props, annotations);
      }

      this.setState({
        svgAnnotations: renderedSVGAnnotations,
        htmlAnnotations: renderedHTMLAnnotations,
        adjustedAnnotations: adjustedAnnotations,
        adjustedAnnotationsKey: adjustableAnnotationsKey
      });
    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
      this.createAnnotations(this.props);
    }
  }, {
    key: "componentWillReceiveProps",
    value: function componentWillReceiveProps(nextProps) {
      this.createAnnotations(nextProps);
    }
  }, {
    key: "render",
    value: function render() {
      var _state = this.state,
          svgAnnotations = _state.svgAnnotations,
          htmlAnnotations = _state.htmlAnnotations;


      var renderedLegend = void 0;
      if (this.props.legendSettings) {
        var _props$legendSettings = this.props.legendSettings.width,
            width = _props$legendSettings === undefined ? 100 : _props$legendSettings;

        var positionHash = {
          left: [15, 15],
          right: [this.props.size[0] - width - 15, 15]
        };
        var _props$legendSettings2 = this.props.legendSettings,
            _props$legendSettings3 = _props$legendSettings2.position,
            position = _props$legendSettings3 === undefined ? "right" : _props$legendSettings3,
            _props$legendSettings4 = _props$legendSettings2.title,
            title = _props$legendSettings4 === undefined ? "Legend" : _props$legendSettings4;

        var legendPosition = positionHash[position] || position;
        renderedLegend = _react2.default.createElement(
          "g",
          { transform: "translate(" + legendPosition + ")" },
          _react2.default.createElement(_Legend2.default, _extends({}, this.props.legendSettings, {
            title: title,
            position: position
          }))
        );
      }

      return _react2.default.createElement(
        "div",
        {
          className: "annotation-layer",
          style: {
            position: "absolute",
            pointerEvents: "none",
            background: "none"
          }
        },
        _react2.default.createElement(
          "div",
          {
            className: "annotation-layer-html",
            style: {
              background: "none",
              pointerEvents: "none",
              position: "absolute",
              height: this.props.size[1] + "px",
              width: this.props.size[0] + "px"
            }
          },
          htmlAnnotations
        ),
        _react2.default.createElement(
          "svg",
          {
            className: "annotation-layer-svg",
            height: this.props.size[1],
            width: this.props.size[0],
            style: { background: "none", pointerEvents: "none" }
          },
          renderedLegend,
          svgAnnotations
        )
      );
    }
  }]);

  return AnnotationLayer;
}(_react2.default.Component);

AnnotationLayer.propTypes = {
  scale: _propTypes2.default.func,
  orient: _propTypes2.default.string,
  title: _propTypes2.default.string,
  format: _propTypes2.default.string,
  values: _propTypes2.default.array,
  properties: _propTypes2.default.object,
  position: _propTypes2.default.array
};

exports.default = AnnotationLayer;
module.exports = exports['default'];