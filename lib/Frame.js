"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _AnnotationLayer = require("./AnnotationLayer");

var _AnnotationLayer2 = _interopRequireDefault(_AnnotationLayer);

var _InteractionLayer = require("./InteractionLayer");

var _InteractionLayer2 = _interopRequireDefault(_InteractionLayer);

var _VisualizationLayer = require("./VisualizationLayer");

var _VisualizationLayer2 = _interopRequireDefault(_VisualizationLayer);

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Frame = function (_React$Component) {
  _inherits(Frame, _React$Component);

  function Frame(props) {
    _classCallCheck(this, Frame);

    var _this = _possibleConstructorReturn(this, (Frame.__proto__ || Object.getPrototypeOf(Frame)).call(this, props));

    _this.state = {
      canvasContext: null,
      voronoiHover: undefined
    };
    return _this;
  }

  _createClass(Frame, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      this.setState({ canvasContext: this.canvasContext });
    }
  }, {
    key: "render",
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          name = _props.name,
          renderPipeline = _props.renderPipeline,
          size = _props.size,
          extent = _props.extent,
          projectedCoordinateNames = _props.projectedCoordinateNames,
          xScale = _props.xScale,
          yScale = _props.yScale,
          axes = _props.axes,
          axesTickLines = _props.axesTickLines,
          title = _props.title,
          matte = _props.matte,
          className = _props.className,
          adjustedSize = _props.adjustedSize,
          finalFilterDefs = _props.finalFilterDefs,
          frameKey = _props.frameKey,
          dataVersion = _props.dataVersion,
          annotations = _props.annotations,
          hoverAnnotation = _props.hoverAnnotation,
          projectedYMiddle = _props.projectedYMiddle,
          interaction = _props.interaction,
          customClickBehavior = _props.customClickBehavior,
          customHoverBehavior = _props.customHoverBehavior,
          customDoubleClickBehavior = _props.customDoubleClickBehavior,
          points = _props.points,
          _props$margin = _props.margin,
          margin = _props$margin === undefined ? { top: 0, bottom: 0, left: 0, right: 0 } : _props$margin,
          backgroundGraphics = _props.backgroundGraphics,
          foregroundGraphics = _props.foregroundGraphics,
          beforeElements = _props.beforeElements,
          afterElements = _props.afterElements,
          downloadButton = _props.downloadButton,
          defaultSVGRule = _props.defaultSVGRule,
          defaultHTMLRule = _props.defaultHTMLRule,
          adjustedPosition = _props.adjustedPosition,
          legendSettings = _props.legendSettings,
          annotationSettings = _props.annotationSettings,
          overlay = _props.overlay,
          columns = _props.columns,
          rScale = _props.rScale,
          projection = _props.projection;
      var voronoiHover = this.state.voronoiHover;


      var areaAnnotations = [];
      var annotationLayer = null;

      var totalAnnotations = annotations ? [].concat(_toConsumableArray(annotations), areaAnnotations) : areaAnnotations;

      if (voronoiHover) {
        totalAnnotations.push(voronoiHover);
      }

      if (totalAnnotations || legendSettings) {
        annotationLayer = _react2.default.createElement(_AnnotationLayer2.default, {
          legendSettings: legendSettings,
          margin: margin,
          axes: axes,
          annotationHandling: annotationSettings.layout,
          pointSizeFunction: annotationSettings.pointSizeFunction,
          labelSizeFunction: annotationSettings.labelSizeFunction,
          annotations: totalAnnotations,
          svgAnnotationRule: function svgAnnotationRule(d, i, thisALayer) {
            return defaultSVGRule(_extends({
              d: d,
              i: i,
              annotationLayer: thisALayer
            }, renderPipeline));
          },
          htmlAnnotationRule: function htmlAnnotationRule(d, i, thisALayer) {
            return defaultHTMLRule(_extends({
              d: d,
              i: i,
              annotationLayer: thisALayer
            }, renderPipeline));
          },
          size: size,
          position: [adjustedPosition[0] + margin.left, adjustedPosition[1] + margin.top]
        });
      }

      return _react2.default.createElement(
        "div",
        { className: className + " frame", style: { background: "none" } },
        _react2.default.createElement(
          "div",
          { className: name + " frame-before-elements" },
          beforeElements
        ),
        _react2.default.createElement(
          "div",
          { className: "frame-elements", style: { height: size[1] + "px" } },
          _react2.default.createElement("canvas", {
            className: "frame-canvas",
            ref: function ref(canvasContext) {
              return _this2.canvasContext = canvasContext;
            },
            style: { position: "absolute" },
            width: size[0],
            height: size[1]
          }),
          _react2.default.createElement(
            "svg",
            {
              className: "visualization-layer",
              style: { position: "absolute" },
              width: size[0],
              height: size[1]
            },
            finalFilterDefs,
            _react2.default.createElement(
              "g",
              null,
              backgroundGraphics
            ),
            _react2.default.createElement(_VisualizationLayer2.default, {
              renderPipeline: renderPipeline,
              position: adjustedPosition,
              size: adjustedSize,
              extent: extent,
              projectedCoordinateNames: projectedCoordinateNames,
              xScale: xScale,
              yScale: yScale,
              axes: axes,
              axesTickLines: axesTickLines,
              title: title,
              frameKey: frameKey,
              canvasContext: this.state.canvasContext,
              dataVersion: dataVersion,
              matte: matte
            }),
            _react2.default.createElement(
              "g",
              null,
              title,
              foregroundGraphics
            )
          ),
          _react2.default.createElement(_InteractionLayer2.default, {
            hoverAnnotation: hoverAnnotation,
            projectedX: projectedCoordinateNames.x,
            projectedY: projectedCoordinateNames.y,
            projectedYMiddle: projectedYMiddle,
            interaction: interaction,
            voronoiHover: function voronoiHover(d) {
              return _this2.setState({ voronoiHover: d });
            },
            customClickBehavior: customClickBehavior,
            customHoverBehavior: customHoverBehavior,
            customDoubleClickBehavior: customDoubleClickBehavior,
            points: points,
            position: adjustedPosition,
            margin: margin,
            size: adjustedSize,
            svgSize: size,
            xScale: xScale,
            yScale: yScale,
            enabled: true,
            overlay: overlay,
            oColumns: columns,
            rScale: rScale,
            projection: projection
          }),
          annotationLayer
        ),
        _react2.default.createElement(
          "div",
          { className: name + " frame-after-elements" },
          downloadButton,
          afterElements
        )
      );
    }
  }]);

  return Frame;
}(_react2.default.Component);

Frame.propTypes = {
  name: _propTypes2.default.string,
  title: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object]),
  margin: _propTypes2.default.oneOfType([_propTypes2.default.number, _propTypes2.default.object]),
  size: _propTypes2.default.array.isRequired,
  position: _propTypes2.default.array,
  annotations: _propTypes2.default.array,
  customHoverBehavior: _propTypes2.default.func,
  customClickBehavior: _propTypes2.default.func,
  customDoubleClickBehavior: _propTypes2.default.func,
  htmlAnnotationRules: _propTypes2.default.func,
  tooltipContent: _propTypes2.default.func,
  className: _propTypes2.default.string,
  additionalDefs: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  interaction: _propTypes2.default.object,
  renderFn: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  hoverAnnotation: _propTypes2.default.bool,
  backgroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array]),
  foregroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array])
};

module.exports = Frame;