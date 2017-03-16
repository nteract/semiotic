'use strict';

// modules

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _SvgHelper = require('../svg/SvgHelper');

var _general = require('../visualizationLayerBehavior/general');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
//import ReactDOM from 'react-dom'

//import MarkContext from './MarkContext'


//import Rx from 'rxjs/Rx'

var PropTypes = _react2.default.PropTypes;

var VisualizationLayer = function (_React$Component) {
  _inherits(VisualizationLayer, _React$Component);

  function VisualizationLayer(props) {
    _classCallCheck(this, VisualizationLayer);

    var _this = _possibleConstructorReturn(this, (VisualizationLayer.__proto__ || Object.getPrototypeOf(VisualizationLayer)).call(this, props));

    _this.canvasDrawing = [];

    _this.state = {
      canvasDrawing: [],
      dataVersion: "",
      lines: [],
      points: [],
      areas: []
    };
    return _this;
  }

  _createClass(VisualizationLayer, [{
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      var _this2 = this;

      var adjustedPosition = this.props.position || [0, 0];
      if (this.props.canvasContext && this.canvasDrawing.length > 0) {
        (function () {
          var context = _this2.props.canvasContext.getContext("2d");

          context.setTransform(1, 0, 0, 1, 0, 0);
          context.clearRect(0, 0, _this2.props.size[0] * 2, _this2.props.size[1] * 2);

          _this2.canvasDrawing.forEach(function (piece) {
            var style = piece.styleFn ? piece.styleFn(piece.d, piece.i) : "black";
            var fill = style.fill ? style.fill : "black";
            var stroke = style.stroke ? style.stroke : "black";
            fill = !style.fillOpacity ? fill : "rgba(" + [].concat(_toConsumableArray((0, _SvgHelper.hexToRgb)(fill)), [style.fillOpacity]) + ")";
            stroke = !style.strokeOpacity ? stroke : "rgba(" + [].concat(_toConsumableArray((0, _SvgHelper.hexToRgb)(stroke)), [style.strokeOpacity]) + ")";
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.translate.apply(context, _toConsumableArray(adjustedPosition));
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
              console.log("CURRENTLY UNSUPPORTED MARKTYPE");
            }
          });
        })();
      }
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (!nextProps.dataVersion || nextProps.dataVersion && nextProps.dataVersion !== this.state.dataVersion) {
        var lines = void 0,
            points = void 0,
            areas = void 0;
        var dataVersion = nextProps.dataVersion;
        this.canvasDrawing = [];
        var canvasDrawing = this.canvasDrawing;

        var xScale = nextProps.xScale,
            yScale = nextProps.yScale,
            pointData = nextProps.pointData,
            lineData = nextProps.lineData,
            areaData = nextProps.areaData;

        if (pointData && pointData.length > 0) {
          points = (0, _general.createPoints)({ xScale: xScale, yScale: yScale, props: nextProps, canvasDrawing: canvasDrawing, data: pointData });
        }
        if (lineData && lineData.length > 0) {
          lines = (0, _general.createLines)({ xScale: xScale, yScale: yScale, props: nextProps, canvasDrawing: canvasDrawing, lineData: lineData });
        }
        if (areaData && areaData.length > 0) {
          areas = (0, _general.createAreas)(xScale, yScale, nextProps, canvasDrawing);
        }
        this.setState({
          lines: lines,
          points: points,
          areas: areas,
          dataVersion: dataVersion
        });
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var props = this.props;
      var axes = props.axes,
          xyframeKey = props.xyframeKey,
          _props$adjustedPositi = props.adjustedPosition,
          adjustedPosition = _props$adjustedPositi === undefined ? [0, 0] : _props$adjustedPositi;
      var _state = this.state,
          points = _state.points,
          lines = _state.lines,
          areas = _state.areas;


      return _react2.default.createElement(
        'g',
        { transform: "translate(" + adjustedPosition + ")" },
        axes,
        _react2.default.createElement(
          'g',
          { clipPath: this.props.zoomable ? "url(#matte-clip" + xyframeKey + ")" : undefined },
          lines,
          points,
          areas
        )
      );

      /*        return <MarkContext
                position={this.props.adjustedPosition}
                size={this.props.adjustedSize}
                xyFrameChildren={true}
                renderNumber={this.props.renderNumber}
                canvasContext={this.props.canvasContext}
              >
              </MarkContext> */
    }
  }]);

  return VisualizationLayer;
}(_react2.default.Component);

VisualizationLayer.propTypes = {
  position: PropTypes.array,
  size: PropTypes.array
};

exports.default = VisualizationLayer;
module.exports = exports['default'];