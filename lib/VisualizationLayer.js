"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class, _temp2;
//import ReactDOM from 'react-dom'

//import MarkContext from './MarkContext'


//import Rx from 'rxjs/Rx'

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _SvgHelper = require("./svg/SvgHelper");

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var VisualizationLayer = (_temp2 = _class = function (_React$PureComponent) {
  _inherits(VisualizationLayer, _React$PureComponent);

  function VisualizationLayer() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, VisualizationLayer);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = VisualizationLayer.__proto__ || Object.getPrototypeOf(VisualizationLayer)).call.apply(_ref, [this].concat(args))), _this), _this.canvasDrawing = [], _this.state = {
      canvasDrawing: [],
      dataVersion: "",
      renderedElements: []
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(VisualizationLayer, [{
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var _this2 = this;

      if (this.props.disableContext || !this.props.canvasContext || !this.canvasDrawing.length) return;

      var context = this.props.canvasContext.getContext("2d");
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, this.props.size[0] * 2, this.props.size[1] * 2);

      this.canvasDrawing.forEach(function (piece) {
        var style = piece.styleFn ? piece.styleFn(piece.d, piece.i) : "black";
        var fill = style.fill ? style.fill : "black";
        var stroke = style.stroke ? style.stroke : "black";
        fill = !style.fillOpacity ? fill : "rgba(" + [].concat(_toConsumableArray((0, _SvgHelper.hexToRgb)(fill)), [style.fillOpacity]) + ")";
        stroke = !style.strokeOpacity ? stroke : "rgba(" + [].concat(_toConsumableArray((0, _SvgHelper.hexToRgb)(stroke)), [style.strokeOpacity]) + ")";
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.translate.apply(context, _toConsumableArray(_this2.props.position));
        context.translate(piece.tx, piece.ty);
        context.fillStyle = fill;
        context.strokeStyle = stroke;
        context.lineWidth = style.strokeWidth ? style.strokeWidth : "black";
        if (piece.markProps.markType === "circle") {
          context.beginPath();
          context.arc(0, 0, piece.markProps.r, 0, 2 * Math.PI);
          context.stroke();
          context.fill();
        } else if (piece.markProps.markType === "rect") {
          context.fillRect(piece.markProps.x, piece.markProps.y, piece.markProps.width, piece.markProps.height);
          context.strokeRect(piece.markProps.x, piece.markProps.y, piece.markProps.width, piece.markProps.height);
        } else if (piece.markProps.markType === "path") {
          var p = new Path2D(piece.markProps.d);
          context.stroke(p);
          context.fill(p);
        } else {
          console.error("CURRENTLY UNSUPPORTED MARKTYPE FOR CANVAS RENDERING");
        }
      });
    }
  }, {
    key: "componentWillReceiveProps",
    value: function componentWillReceiveProps(np) {
      var lp = this.props;
      var propKeys = Object.keys(np);

      var update = false;
      propKeys.forEach(function (key) {
        if (lp[key] !== np[key]) {
          update = true;
        }
      });

      if (update === true && (!np.dataVersion || np.dataVersion && np.dataVersion !== this.state.dataVersion)) {
        var xScale = np.xScale,
            yScale = np.yScale,
            dataVersion = np.dataVersion,
            projectedCoordinateNames = np.projectedCoordinateNames,
            renderKeyFn = np.renderKeyFn,
            renderPipeline = np.renderPipeline;

        this.canvasDrawing = [];
        var canvasDrawing = this.canvasDrawing;

        var renderedElements = [];
        Object.keys(renderPipeline).forEach(function (k) {
          var pipe = renderPipeline[k];
          if (pipe.data && _typeof(pipe.data) === "object" || pipe.data && pipe.data.length > 0) {
            var renderedPipe = pipe.behavior(_extends({
              xScale: xScale,
              yScale: yScale,
              canvasDrawing: canvasDrawing,
              projectedCoordinateNames: projectedCoordinateNames,
              renderKeyFn: renderKeyFn
            }, pipe));
            renderedElements.push(_react2.default.createElement(
              "g",
              { key: k, className: k },
              renderedPipe
            ));
          }
        });

        this.setState({
          renderedElements: renderedElements,
          dataVersion: dataVersion
        });
      }
    }
  }, {
    key: "render",
    value: function render() {
      var props = this.props;
      var matte = props.matte,
          matteClip = props.matteClip,
          axes = props.axes,
          axesTickLines = props.axesTickLines,
          frameKey = props.frameKey,
          position = props.position;
      var renderedElements = this.state.renderedElements;


      return _react2.default.createElement(
        "g",
        { transform: "translate(" + position + ")" },
        _react2.default.createElement(
          "g",
          { className: "axis axis-tick-lines" },
          axesTickLines
        ),
        _react2.default.createElement(
          "g",
          {
            className: "data-visualization",
            key: "visualization-clip-path",
            clipPath: matteClip && matte ? "url(#matte-clip" + frameKey + ")" : undefined
          },
          renderedElements
        ),
        matte,
        _react2.default.createElement(
          "g",
          { className: "axis axis-labels" },
          axes
        )
      );
    }
  }]);

  return VisualizationLayer;
}(_react2.default.PureComponent), _class.defaultProps = { position: [0, 0] }, _temp2);


VisualizationLayer.propTypes = {
  axes: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  frameKey: _propTypes2.default.string,
  xScale: _propTypes2.default.func,
  yScale: _propTypes2.default.func,
  pointData: _propTypes2.default.array,
  lineData: _propTypes2.default.array,
  areaData: _propTypes2.default.array,
  dataVersion: _propTypes2.default.string,
  canvasContext: _propTypes2.default.object,
  size: _propTypes2.default.array
};

exports.default = VisualizationLayer;
module.exports = exports['default'];