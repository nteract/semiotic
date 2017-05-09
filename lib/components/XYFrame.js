'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _d3Voronoi = require('d3-voronoi');

var _lodash = require('lodash');

var _d3Array = require('d3-array');

var _d3Scale = require('d3-scale');

var _Mark = require('./Mark');

var _Mark2 = _interopRequireDefault(_Mark);

var _Annotation = require('./Annotation');

var _Annotation2 = _interopRequireDefault(_Annotation);

var _AnnotationLayer = require('./AnnotationLayer');

var _AnnotationLayer2 = _interopRequireDefault(_AnnotationLayer);

var _InteractionLayer = require('./InteractionLayer');

var _InteractionLayer2 = _interopRequireDefault(_InteractionLayer);

var _Axis = require('./Axis');

var _Axis2 = _interopRequireDefault(_Axis);

var _VisualizationLayer = require('./VisualizationLayer');

var _VisualizationLayer2 = _interopRequireDefault(_VisualizationLayer);

var _DownloadButton = require('./DownloadButton');

var _DownloadButton2 = _interopRequireDefault(_DownloadButton);

var _d3Shape = require('d3-shape');

var _lineDrawing = require('../svg/lineDrawing');

var _d3SvgAnnotation = require('d3-svg-annotation');

var _frameFunctions = require('../svg/frameFunctions');

var _d3Hierarchy = require('d3-hierarchy');

var _downloadDataMapping = require('../downloadDataMapping');

var _coordinateNames = require('../constants/coordinateNames');

var _dataFunctions = require('../data/dataFunctions');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components


var PropTypes = _react2.default.PropTypes;

var xyframeKey = '';
var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
for (var i = 32; i > 0; --i) {
  xyframeKey += chars[Math.floor(Math.random() * chars.length)];
}function linetypeChange(oldProps, newProps) {
  if (!oldProps.customLineType && !newProps.customLineType) {
    return false;
  } else if (typeof oldProps.customLineType === "string" && oldProps.customLineType === newProps.customLineType) {
    return false;
  } else if (oldProps.customLineType && newProps.customLineType && oldProps.customLineType.type && newProps.customLineType.type && oldProps.customLineType.type === newProps.customLineType.type) {
    return false;
  }
  return true;
}

var XYFrame = function (_React$Component) {
  _inherits(XYFrame, _React$Component);

  function XYFrame(props) {
    _classCallCheck(this, XYFrame);

    var _this = _possibleConstructorReturn(this, (XYFrame.__proto__ || Object.getPrototypeOf(XYFrame)).call(this, props));

    _this.calculateXYFrame = _this.calculateXYFrame.bind(_this);

    _this.defaultXYHTMLRule = _this.defaultXYHTMLRule.bind(_this);
    _this.defaultXYSVGRule = _this.defaultXYSVGRule.bind(_this);

    _this.setCanvasContext = _this.setCanvasContext.bind(_this);

    _this.changeVoronoi = _this.changeVoronoi.bind(_this);
    _this.doubleclickVoronoi = _this.doubleclickVoronoi.bind(_this);
    _this.clickVoronoi = _this.clickVoronoi.bind(_this);

    _this.renderBody = _this.renderBody.bind(_this);

    _this.state = {
      voronoiHover: null,
      lineData: null,
      pointData: null,
      areaData: null,
      projectedLines: null,
      projectedPoints: null,
      projectedAreas: null,
      fullDataset: null,
      adjustedPosition: null,
      adjustedSize: null,
      voronoiPolygons: null,
      backgroundGraphics: null,
      foregroundGraphics: null,
      axesData: null,
      axes: null,
      renderNumber: 0,
      canvasContext: null,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    };

    _this.xAccessor = null;
    _this.yAccessor = null;
    _this.xScale = null;
    _this.yScale = null;

    return _this;
  }

  _createClass(XYFrame, [{
    key: 'setCanvasContext',
    value: function setCanvasContext(actualContext) {
      this.setState({ canvasContext: actualContext });
    }
  }, {
    key: 'screenScales',
    value: function screenScales(_ref) {
      var xExtent = _ref.xExtent,
          yExtent = _ref.yExtent,
          currentProps = _ref.currentProps,
          margin = _ref.margin,
          adjustedSize = _ref.adjustedSize;

      var xDomain = [margin.left, adjustedSize[0] + margin.left];
      var yDomain = [adjustedSize[1] + margin.top, margin.top];

      var xScaleType = currentProps.xScaleType || (0, _d3Scale.scaleLinear)();
      var yScaleType = currentProps.yScaleType || (0, _d3Scale.scaleLinear)();

      var xScale = xScaleType.domain(xExtent).range(xDomain);
      var yScale = yScaleType.domain(yExtent).range(yDomain);

      return { xScale: xScale, yScale: yScale };
    }
  }, {
    key: 'calculateXYFrame',
    value: function calculateXYFrame(currentProps) {
      var _this2 = this;

      var margin = (0, _frameFunctions.calculateMargin)(currentProps);

      var _adjustedPositionSize = this.adjustedPositionSize(currentProps),
          adjustedPosition = _adjustedPositionSize.adjustedPosition,
          adjustedSize = _adjustedPositionSize.adjustedSize;

      var xExtent = currentProps.xExtent,
          yExtent = currentProps.yExtent,
          projectedLines = currentProps.projectedLines,
          projectedPoints = currentProps.projectedPoints,
          fullDataset = currentProps.fullDataset;


      if (!currentProps.dataVersion || currentProps.dataVersion && currentProps.dataVersion !== this.state.dataVersion) {
        if (!xExtent || !yExtent || !fullDataset || !projectedLines && !projectedPoints) {
          var _calculateDataExtent = (0, _dataFunctions.calculateDataExtent)(currentProps);

          xExtent = _calculateDataExtent.xExtent;
          yExtent = _calculateDataExtent.yExtent;
          projectedLines = _calculateDataExtent.projectedLines;
          projectedPoints = _calculateDataExtent.projectedPoints;
          fullDataset = _calculateDataExtent.fullDataset;
        }
      } else {
        var _state = this.state;
        xExtent = _state.xExtent;
        yExtent = _state.yExtent;
        projectedLines = _state.projectedLines;
        projectedPoints = _state.projectedPoints;
        fullDataset = _state.fullDataset;
      }

      var _screenScales = this.screenScales({ xExtent: xExtent, yExtent: yExtent, currentProps: currentProps, margin: margin, adjustedSize: adjustedSize }),
          xScale = _screenScales.xScale,
          yScale = _screenScales.yScale;

      var canvasDrawing = [];

      var title = null;
      if (typeof currentProps.title === "string" && currentProps.title.length > 0) {
        title = _react2.default.createElement(
          'text',
          { x: currentProps.size[0] / 2, y: 25, className: "frame-title", style: { textAnchor: "middle", pointerEvents: "none" } },
          currentProps.title
        );
      }
      //assume if defined then its an svg mark of some sort
      else if (currentProps.title) {
          title = currentProps.title;
        }

      //TODO: blow this shit up
      this.xScale = xScale;
      this.yScale = yScale;
      this.xAccessor = currentProps.xAccessor;
      this.yAccessor = currentProps.yAccessor;

      var voronoiPaths = [];
      var ignoredVoronoiPoints = [];

      if (currentProps.hoverAnnotation) {
        var voronoiDiagram = (0, _d3Voronoi.voronoi)().extent([[margin.left, margin.top], [adjustedSize[0] + margin.left, adjustedSize[1] + margin.top]]).x(function (d) {
          return xScale(d[_coordinateNames.projectedX]);
        }).y(function (d) {
          return yScale(d[_coordinateNames.projectedYMiddle] || d[_coordinateNames.projectedY]);
        });

        var voronoiDataset = [];
        var voronoiUniqueHash = {};

        fullDataset.forEach(function (d) {
          var xValue = parseInt(xScale(d[_coordinateNames.projectedX]));
          var yValue = parseInt(yScale(d[_coordinateNames.projectedYMiddle] || d[_coordinateNames.projectedY]));
          if (xValue && yValue && isNaN(xValue) === false && isNaN(yValue) === false) {
            var pointKey = xValue + "," + yValue;
            if (!voronoiUniqueHash[pointKey]) {
              voronoiDataset.push(d);
              voronoiUniqueHash[pointKey] = [d];
            } else {
              //replace with real error
              voronoiUniqueHash[pointKey].push(d);
            }
          }
        });

        var voronoiData = voronoiDiagram.polygons(voronoiDataset);

        voronoiPaths = voronoiData.map(function (d, i) {
          return _react2.default.createElement('path', {
            onClick: function onClick() {
              _this2.clickVoronoi(voronoiDataset[i]);
            },
            onDoubleClick: function onDoubleClick() {
              _this2.doubleclickVoronoi(voronoiDataset[i], xExtent, yExtent);
            },
            onMouseEnter: function onMouseEnter() {
              _this2.changeVoronoi(voronoiDataset[i]);
            },
            onMouseLeave: function onMouseLeave() {
              _this2.changeVoronoi();
            },
            key: "interactionVoronoi" + i,
            d: "M" + d.join("L") + "Z",
            style: { fillOpacity: 0 } });
        }, this);
      }

      var axes = null;

      if (currentProps.axes) {
        axes = currentProps.axes.map(function (d) {
          var axisScale = yScale;
          if (d.orient === "top" || d.orient === "bottom") {
            axisScale = xScale;
          }

          var tickValues = void 0;
          if (d.tickValues && Array.isArray(d.tickValues)) {
            tickValues = d.tickValues;
          }
          //otherwise assume a function
          else if (d.tickValues) {
              tickValues = d.tickValues(fullDataset, currentProps.size, axisScale);
            }
          var axisSize = [adjustedSize[0], adjustedSize[1]];
          var axisPosition = [margin.left, 0];

          if (d.orient === "top") {
            axisPosition = [0, 0];
          } else if (d.orient === "bottom") {
            axisPosition = [0, margin.top];
          } else if (d.orient === "right") {
            axisPosition = [0, 0];
          }

          return _react2.default.createElement(_Axis2.default, {
            key: d.key,
            orient: d.orient,
            size: axisSize,
            position: axisPosition,
            margin: margin,
            ticks: d.ticks,
            tickSize: d.tickSize,
            tickFormat: d.tickFormat,
            tickValues: tickValues,
            format: d.format,
            scale: axisScale,
            className: d.className,
            name: d.name,
            annotationFunction: currentProps.axisAnnotationFunction });
        });
      }

      var marginGraphic = void 0;
      if (currentProps.matte) {
        marginGraphic = _react2.default.createElement('path', { style: { fill: "blue", opacity: 0.25 }, d: (0, _frameFunctions.drawMarginPath)(margin, currentProps.size), className: 'xyframe-matte' });
      }

      this.setState({
        voronoiHover: null,
        lineData: currentProps.lines,
        pointData: currentProps.points,
        areaData: currentProps.areas,
        dataVersion: currentProps.dataVersion,
        projectedLines: projectedLines,
        projectedPoints: projectedPoints,
        projectedAreas: null,
        canvasDrawing: canvasDrawing,
        fullDataset: fullDataset,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        voronoiPolygons: voronoiPaths,
        ignoredVoronoiPoints: ignoredVoronoiPoints,
        backgroundGraphics: currentProps.backgroundGraphics,
        foregroundGraphics: currentProps.foregroundGraphics,
        axesData: currentProps.axes,
        axes: axes,
        title: title,
        updatedFrame: undefined,
        renderNumber: this.state.renderNumber + 1,
        xScale: xScale,
        yScale: yScale,
        xExtent: xExtent,
        yExtent: yExtent,
        margin: margin,
        matte: marginGraphic

      });
    }
  }, {
    key: 'componentWillMount',
    value: function componentWillMount() {
      this.calculateXYFrame(this.props);
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (!this.state.dataVersion || !this.state.fullDataset) {
        this.calculateXYFrame(nextProps);
      } else if (linetypeChange(this.props, nextProps) || this.state.dataVersion !== nextProps.dataVersion || this.props.xExtent && !nextProps.xExtent || this.props.yExtent && !nextProps.yExtent || !this.props.xExtent && nextProps.xExtent || !this.props.yExtent && nextProps.yExtent || this.props.xExtent && nextProps.xExtent && (this.props.xExtent[0] !== nextProps.xExtent[0] || this.props.xExtent[1] !== nextProps.xExtent[1]) || this.props.yExtent && nextProps.yExtent && (this.props.yExtent[0] !== nextProps.yExtent[0] || this.props.yExtent[1] !== nextProps.yExtent[1]) || this.props.name !== nextProps.name || this.props.size[0] !== nextProps.size[0] || this.props.size[1] !== nextProps.size[1]) {
        this.calculateXYFrame(nextProps);
      }
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.setState({ canvasContext: this.canvasContext });
    }
  }, {
    key: 'changeVoronoi',
    value: function changeVoronoi(d) {
      if (this.props.customHoverBehavior) {
        this.props.customHoverBehavior(d);
      }
      if (!d) {
        this.setState({ voronoiHover: null });
      } else {
        var vorD = (0, _lodash.clone)(d);
        vorD.type = "frame-hover";
        this.setState({ voronoiHover: vorD });
      }
    }
  }, {
    key: 'clickVoronoi',
    value: function clickVoronoi(d) {
      if (this.props.customClickBehavior) {
        this.props.customClickBehavior(d);
      }
    }
  }, {
    key: 'doubleclickVoronoi',
    value: function doubleclickVoronoi(d) {
      if (this.props.customDoubleClickBehavior) {
        this.props.customClickBehavior(d);
      }
    }
  }, {
    key: 'defaultXYSVGRule',
    value: function defaultXYSVGRule(_ref2) {
      var d = _ref2.d,
          i = _ref2.i,
          annotationLayer = _ref2.annotationLayer,
          lines = _ref2.lines,
          areas = _ref2.areas,
          points = _ref2.points;

      var xAccessor = this.xAccessor;
      var yAccessor = this.yAccessor;

      var xScale = this.xScale;
      var yScale = this.yScale;

      var screenCoordinates = [];
      var idAccessor = this.props.lineIDAccessor || function (l) {
        return l.id;
      };

      var _adjustedPositionSize2 = this.adjustedPositionSize(this.props),
          adjustedPosition = _adjustedPositionSize2.adjustedPosition,
          adjustedSize = _adjustedPositionSize2.adjustedSize;

      if (!d.coordinates) {
        var xCoord = d[_coordinateNames.projectedX] || xAccessor(d);
        screenCoordinates = [xScale(xCoord), (0, _lineDrawing.relativeY)({ point: d, lines: lines, projectedYMiddle: _coordinateNames.projectedYMiddle, projectedY: _coordinateNames.projectedY, projectedX: _coordinateNames.projectedX, xAccessor: xAccessor, yAccessor: yAccessor, yScale: yScale, xScale: xScale, idAccessor: idAccessor })];
        if (screenCoordinates[0] === undefined || screenCoordinates[1] === undefined || screenCoordinates[0] === null || screenCoordinates[1] === null) {
          //NO ANNOTATION IF INVALID SCREEN COORDINATES
          return null;
        }
        screenCoordinates[0] + adjustedPosition[0];
        screenCoordinates[1] + adjustedPosition[1];
      } else {
        screenCoordinates = d.coordinates.map(function (p) {
          return [xScale(xAccessor(p)) + adjustedPosition[0], (0, _lineDrawing.relativeY)({ point: p, lines: lines, projectedYMiddle: _coordinateNames.projectedYMiddle, projectedY: _coordinateNames.projectedY, projectedX: _coordinateNames.projectedX, xAccessor: xAccessor, yAccessor: yAccessor, yScale: yScale, xScale: xScale, idAccessor: idAccessor }) + adjustedPosition[1]];
        });
      }

      var margin = (0, _frameFunctions.calculateMargin)(this.props);

      //point xy
      //y
      //area

      //TODO: Process your rules first
      if (this.props.svgAnnotationRules && this.props.svgAnnotationRules({ d: d, i: i, screenCoordinates: screenCoordinates, xScale: xScale, yScale: yScale, xAccessor: xAccessor, yAccessor: yAccessor, xyFrameProps: this.props, xyFrameState: this.state, areas: areas, points: points, lines: lines }) !== null) {
        return this.props.svgAnnotationRules({ d: d, i: i, screenCoordinates: screenCoordinates, xScale: xScale, yScale: yScale, xAccessor: xAccessor, yAccessor: yAccessor, xyFrameProps: this.props, xyFrameState: this.state, areas: areas, points: points, lines: lines });
      } else if (d.type === "xy" || d.type === "frame-hover") {
        var laLine = _react2.default.createElement(_Mark2.default, {
          className: "annotation " + d.type,
          key: "annotationpoint" + i,
          markType: 'circle',
          cx: screenCoordinates[0],
          cy: screenCoordinates[1],
          forceUpdate: true,
          r: 5
        });
        var laLabel = void 0;
        if (d.type === "xy") {
          laLabel = _react2.default.createElement(
            _Mark2.default,
            {
              markType: 'text',
              key: d.label + "annotationtext" + i,
              forceUpdate: true,
              x: screenCoordinates[0],
              y: 10 + screenCoordinates[1],
              className: 'annotation annotation-xy-label'
            },
            d.label
          );
        }

        return [laLine, laLabel];
      } else if (d.type === "d3-annotation" || typeof d.type === "function") {
        var noteData = _extends({
          dx: 0,
          dy: 0,
          x: screenCoordinates[0],
          y: screenCoordinates[1],
          note: { "label": d.label },
          connector: { end: "arrow" }
        }, d, { type: typeof d.type === "function" ? d.type : undefined });
        return _react2.default.createElement(_Annotation2.default, {
          key: i,
          noteData: noteData
        });
      } else if (d.type === "enclose") {
        var circle = (0, _d3Hierarchy.packEnclose)(screenCoordinates.map(function (p) {
          return { x: p[0], y: p[1], r: 2 };
        }));
        var _noteData = _extends({
          dx: 0,
          dy: 0,
          x: circle.x,
          y: circle.y,
          note: { "label": d.label },
          connector: { end: "arrow" }
        }, d, { type: _d3SvgAnnotation.annotationCalloutCircle, subject: {
            radius: circle.r,
            radiusPadding: 5 || d.radiusPadding
          } });

        if (_noteData.rp) {
          switch (_noteData.rp) {
            case "top":
              _noteData.dx = 0;
              _noteData.dy = -circle.r - _noteData.rd;
              break;
            case "bottom":
              _noteData.dx = 0;
              _noteData.dy = circle.r + _noteData.rd;
              break;
            case "left":
              _noteData.dx = -circle.r - _noteData.rd;
              _noteData.dy = 0;
              break;
            case "right":
              _noteData.dx = circle.r + _noteData.rd;
              _noteData.dy = 0;
              break;
          }
        }
        //TODO: Support .ra (setting angle)

        return _react2.default.createElement(_Annotation2.default, {
          key: i,
          noteData: _noteData
        });
      } else if (d.type === "x") {

        var yPosition = annotationLayer.position[1];

        var _noteData2 = _extends({
          dx: 50,
          dy: 20,
          y: yPosition,
          note: { "label": d.label },
          connector: { end: "arrow" }
        }, d, { type: _d3SvgAnnotation.annotationXYThreshold,
          x: screenCoordinates[0],
          "subject": {
            "x": screenCoordinates[0],
            "y1": yPosition, "y2": adjustedSize[1] + margin.top
          }
        });
        return _react2.default.createElement(_Annotation2.default, {
          key: i,
          noteData: _noteData2
        });
      } else if (d.type === "y") {
        var xPosition = margin.left + i * 25;

        var _noteData3 = _extends({
          dx: 50,
          dy: -20,
          x: xPosition,
          note: { "label": d.label },
          connector: { end: "arrow" }
        }, d, { type: _d3SvgAnnotation.annotationXYThreshold,
          y: screenCoordinates[1],
          "subject": {
            "y": screenCoordinates[1],
            "x1": margin.left, "x2": adjustedSize[0] + adjustedPosition[0]
          }
        });
        return _react2.default.createElement(_Annotation2.default, {
          key: i,
          noteData: _noteData3
        });
      } else if (d.type === "bounds") {
        var x0Position = xScale(xAccessor(d.bounds[0])) + annotationLayer.position[0];
        var y0Position = yScale(yAccessor(d.bounds[0])) + annotationLayer.position[1];
        var x1Position = xScale(xAccessor(d.bounds[1])) + annotationLayer.position[0];
        var y1Position = yScale(yAccessor(d.bounds[1])) + annotationLayer.position[1];

        var _laLine = _react2.default.createElement(_Mark2.default, {
          key: d.label + "annotationbounds" + i,
          markType: 'path',
          d: "M" + x0Position + "," + y0Position + "L" + x1Position + "," + y0Position + "L" + x1Position + "," + y1Position + "L" + x0Position + "," + y1Position + "Z",
          className: 'annotation annotation-bounds'
        });

        var _laLabel = _react2.default.createElement(
          _Mark2.default,
          {
            markType: 'text',
            key: d.label + "annotationtext" + i,
            forceUpdate: true,
            x: 5 + x0Position,
            y: -5 + y0Position,
            className: 'annotation annotation annotation-bounds-label'
          },
          d.label
        );

        return [_laLine, _laLabel];
      } else if (d.type === "line") {
        var lineGenerator = (0, _d3Shape.line)().x(function (p) {
          return p[0];
        }).y(function (p) {
          return p[1];
        });
        var lineD = lineGenerator(screenCoordinates);
        var _laLine2 = _react2.default.createElement(_Mark2.default, {
          key: d.label + "annotationline" + i,
          markType: 'path',
          d: lineD,
          className: 'annotation annotation-line'
        });

        var _laLabel2 = _react2.default.createElement(
          _Mark2.default,
          {
            markType: 'text',
            key: d.label + "annotationlinetext" + i,
            x: (screenCoordinates[0][0] + screenCoordinates[1][0]) / 2,
            y: (screenCoordinates[0][1] + screenCoordinates[1][1]) / 2,
            className: 'annotation annotation-line-label'
          },
          d.label
        );

        return [_laLine2, _laLabel2];
      } else if (d.type === "area") {

        var mappedCoordinates = "M" + d.coordinates.map(function (p) {
          return [xScale(xAccessor(p)), yScale(yAccessor(p))];
        }).join("L") + "Z";
        var xBounds = (0, _d3Array.extent)(d.coordinates.map(function (p) {
          return xScale(xAccessor(p));
        }));
        var yBounds = (0, _d3Array.extent)(d.coordinates.map(function (p) {
          return yScale(yAccessor(p));
        }));
        var xCenter = (xBounds[0] + xBounds[1]) / 2;
        var yCenter = (yBounds[0] + yBounds[1]) / 2;

        var _laLine3 = _react2.default.createElement(_Mark2.default, {
          key: d.label + "annotationarea" + i,
          markType: 'path',
          transform: "translate(" + annotationLayer.position + ")",
          d: mappedCoordinates,
          className: 'annotation annotation-area'
        });

        var _laLabel3 = _react2.default.createElement(
          _Mark2.default,
          {
            markType: 'text',
            key: d.label + "annotationtext" + i,
            forceUpdate: true,
            x: xCenter,
            y: yCenter,
            transform: "translate(" + annotationLayer.position + ")",
            className: 'annotation annotation-area-label',
            style: { textAnchor: "middle" }
          },
          d.label
        );

        return [_laLine3, _laLabel3];
      }
      return null;
    }
  }, {
    key: 'defaultXYHTMLRule',
    value: function defaultXYHTMLRule(_ref3) {
      var d = _ref3.d,
          i = _ref3.i,
          lines = _ref3.lines,
          areas = _ref3.areas,
          points = _ref3.points;


      var xAccessor = this.xAccessor;
      var yAccessor = this.yAccessor;

      var xScale = this.xScale;
      var yScale = this.yScale;
      //y
      //area

      var screenCoordinates = [];

      var idAccessor = this.props.lineIDAccessor || function (l) {
        return l.id;
      };

      var _adjustedPositionSize3 = this.adjustedPositionSize(this.props),
          adjustedPosition = _adjustedPositionSize3.adjustedPosition;

      if (!d.coordinates) {
        var xCoord = d[_coordinateNames.projectedX] || xAccessor(d);
        screenCoordinates = [xScale(xCoord), (0, _lineDrawing.relativeY)({ point: d, lines: lines, projectedYMiddle: _coordinateNames.projectedYMiddle, projectedY: _coordinateNames.projectedY, projectedX: _coordinateNames.projectedX, xAccessor: xAccessor, yAccessor: yAccessor, yScale: yScale, xScale: xScale, idAccessor: idAccessor })];
        if (screenCoordinates[0] === undefined || screenCoordinates[1] === undefined || screenCoordinates[0] === null || screenCoordinates[1] === null) {
          //NO ANNOTATION IF INVALID SCREEN COORDINATES
          return null;
        }
        screenCoordinates[0] + adjustedPosition[0];
        screenCoordinates[1] + adjustedPosition[1];
      } else {
        screenCoordinates = d.coordinates.map(function (p) {
          return [xScale(xAccessor(p)) + adjustedPosition[0], (0, _lineDrawing.relativeY)({ point: p, lines: lines, projectedYMiddle: _coordinateNames.projectedYMiddle, projectedY: _coordinateNames.projectedY, projectedX: _coordinateNames.projectedX, xAccessor: xAccessor, yAccessor: yAccessor, yScale: yScale, xScale: xScale, idAccessor: idAccessor }) + adjustedPosition[1]];
        });
      }

      if (this.props.htmlAnnotationRules && this.props.htmlAnnotationRules({ d: d, i: i, screenCoordinates: screenCoordinates, xScale: xScale, yScale: yScale, xAccessor: xAccessor, yAccessor: yAccessor, xyFrameProps: this.props, xyFrameState: this.state, areas: areas, points: points, lines: lines }) !== null) {
        return this.props.htmlAnnotationRules({ d: d, i: i, screenCoordinates: screenCoordinates, xScale: xScale, yScale: yScale, xAccessor: xAccessor, yAccessor: yAccessor, xyFrameProps: this.props, xyFrameState: this.state, areas: areas, points: points, lines: lines });
      }

      if (d.type === "frame-hover") {

        //To string because React gives a DOM error if it gets a date
        var content = [_react2.default.createElement(
          'p',
          { key: 'html-annotation-content-1' },
          xAccessor(d).toString()
        ), _react2.default.createElement(
          'p',
          { key: 'html-annotation-content-2' },
          yAccessor(d).toString()
        )];

        if (d.type === "frame-hover" && this.props.tooltipContent) {
          content = this.props.tooltipContent(d);
        }

        return _react2.default.createElement(
          'div',
          {
            key: "xylabel" + i,
            className: 'annotation annotation-xy-label',
            style: { position: "absolute",
              bottom: this.props.size[1] - screenCoordinates[1] + 20 + "px",
              left: screenCoordinates[0] - 75 + "px",
              width: "150px" } },
          content
        );
      }
      return null;
    }
  }, {
    key: 'adjustedPositionSize',
    value: function adjustedPositionSize(props) {
      var margin = (0, _frameFunctions.calculateMargin)(props);

      var position = props.position || [0, 0];
      var heightAdjust = margin.top + margin.bottom;
      var widthAdjust = margin.left + margin.right;

      var adjustedPosition = [position[0], position[1]];
      var adjustedSize = [props.size[0] - widthAdjust, props.size[1] - heightAdjust];

      return { adjustedPosition: adjustedPosition, adjustedSize: adjustedSize };
    }
  }, {
    key: 'render',
    value: function render() {
      return this.renderBody({});
    }
  }, {
    key: 'renderBody',
    value: function renderBody(_ref4) {
      var _this3 = this;

      var afterElements = _ref4.afterElements,
          beforeElements = _ref4.beforeElements;


      var annotationLayer = null;

      var totalAnnotations = (0, _lodash.clone)(this.props.annotations);

      if (this.state.voronoiHover) {
        if (totalAnnotations) {
          totalAnnotations.push(this.state.voronoiHover);
        } else {
          totalAnnotations = [this.state.voronoiHover];
        }
      }

      if (totalAnnotations) {
        annotationLayer = _react2.default.createElement(_AnnotationLayer2.default, {
          annotations: totalAnnotations,
          svgAnnotationRule: function svgAnnotationRule(d, i, thisALayer) {
            return _this3.defaultXYSVGRule({ d: d, i: i, annotationLayer: thisALayer, lines: _this3.state.projectedLines, areas: _this3.state.projectedAreas, points: _this3.state.projectedPoints });
          },
          htmlAnnotationRule: function htmlAnnotationRule(d, i, thisALayer) {
            return _this3.defaultXYHTMLRule({ d: d, i: i, annotationLayer: thisALayer, lines: _this3.state.projectedLines, areas: _this3.state.projectedAreas, points: _this3.state.projectedPoints });
          },
          size: this.props.size,
          position: [this.state.adjustedPosition[0] + this.state.margin.left, this.state.adjustedPosition[1] + this.state.margin.top]
        });
      }

      var downloadButton = void 0;
      if (this.props.download) {
        downloadButton = _react2.default.createElement(_DownloadButton2.default, {
          csvName: this.props.name + '-' + new Date().toJSON(),
          width: this.props.size[0],
          data: (0, _downloadDataMapping.xyDownloadMapping)({
            data: this.props.lines || this.props.points,
            xAccessor: this.props.xAccessor,
            yAccessor: this.props.yAccessor,

            dataAccessor: this.props.lineDataAccessor, // || this.props.points?,
            fields: this.props.downloadFields
          })
        });
      }

      return _react2.default.createElement(
        'div',
        { className: this.props.className + " frame", style: { background: "none" } },
        _react2.default.createElement(
          'div',
          { className: 'xyframe-before-elements' },
          beforeElements
        ),
        _react2.default.createElement(
          'div',
          { className: 'frame-elements', style: { height: this.props.size[1] + "px" } },
          _react2.default.createElement('canvas', { ref: function ref(canvasContext) {
              return _this3.canvasContext = canvasContext;
            }, style: { position: "absolute" }, width: this.props.size[0], height: this.props.size[1] }),
          _react2.default.createElement(
            'svg',
            { style: { position: "absolute" }, width: this.props.size[0], height: this.props.size[1] },
            _react2.default.createElement(
              'defs',
              null,
              _react2.default.createElement(
                'filter',
                { id: 'paintyFilterHeavy' },
                _react2.default.createElement('feGaussianBlur', { id: 'gaussblurrer', 'in': 'SourceGraphic',
                  stdDeviation: 4,
                  colorInterpolationFilters: 'sRGB',
                  result: 'blur'
                }),
                _react2.default.createElement('feColorMatrix', { 'in': 'blur',
                  mode: 'matrix',
                  values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7',
                  result: 'gooey'
                })
              ),
              _react2.default.createElement(
                'filter',
                { id: 'paintyFilterLight' },
                _react2.default.createElement('feGaussianBlur', { id: 'gaussblurrer', 'in': 'SourceGraphic',
                  stdDeviation: 2,
                  colorInterpolationFilters: 'sRGB',
                  result: 'blur'
                }),
                _react2.default.createElement('feColorMatrix', { 'in': 'blur',
                  mode: 'matrix',
                  values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7',
                  result: 'gooey'
                })
              ),
              _react2.default.createElement(
                'clipPath',
                { id: "matte-clip" + xyframeKey },
                this.state.matte
              ),
              this.props.additionalDefs
            ),
            _react2.default.createElement(
              'g',
              null,
              this.state.title,
              this.state.backgroundGraphics
            ),
            _react2.default.createElement(_VisualizationLayer2.default, {
              customLineType: this.props.customLineType,
              customLineMark: this.props.customLineMark,
              customPointMark: this.props.customPointMark,
              lineStyle: this.props.lineStyle,
              lineRenderMode: this.props.lineRenderMode,
              lineClass: this.props.lineClass,
              canvasLines: this.props.canvasLines,
              pointStyle: this.props.pointStyle,
              pointRenderMode: this.props.pointRenderMode,
              pointClass: this.props.pointClass,
              canvasPoints: this.props.canvasPoints,
              defined: this.props.defined,
              position: this.state.adjustedPosition,
              size: this.state.adjustedSize,
              extent: this.state.extent,
              projectedCoordinateNames: { y: _coordinateNames.projectedY, x: _coordinateNames.projectedX, yMiddle: _coordinateNames.projectedYMiddle, yTop: _coordinateNames.projectedYTop, yBottom: _coordinateNames.projectedYBottom },
              xScale: this.state.xScale,
              yScale: this.state.yScale,
              lineData: this.state.projectedLines,
              pointData: this.state.projectedPoints,
              areaData: this.state.projectedAreas,
              axes: this.state.axes,
              title: this.state.title,
              xyframeKey: this.state.xyframeKey,
              canvasContext: this.state.canvasContext,
              dataVersion: this.state.dataVersion
            }),
            _react2.default.createElement(
              'g',
              null,
              this.state.foregroundGraphics
            )
          ),
          _react2.default.createElement(_InteractionLayer2.default, {
            interaction: this.props.interaction,
            position: this.state.adjustedPosition,
            margin: this.state.margin,
            size: this.state.adjustedSize,
            svgSize: this.props.size,
            xScale: this.xScale,
            yScale: this.yScale,
            overlay: _react2.default.createElement(
              'g',
              { className: 'voronoi-click' },
              this.state.voronoiPolygons
            ),
            enabled: true
          }),
          annotationLayer
        ),
        _react2.default.createElement(
          'div',
          { className: 'xyframe-after-elements' },
          downloadButton,
          afterElements
        )
      );
    }
  }]);

  return XYFrame;
}(_react2.default.Component);

//Do lines, points, and areas need to be added here?   downloadCSV(fields){


XYFrame.propTypes = {
  name: PropTypes.string,
  orient: PropTypes.string,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  margin: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  dataVersion: PropTypes.string,
  format: PropTypes.string,
  properties: PropTypes.object,
  size: PropTypes.array.isRequired,
  position: PropTypes.array,
  xScaleType: PropTypes.func,
  yScaleType: PropTypes.func,
  xExtent: PropTypes.array,
  yExtent: PropTypes.array,
  invertX: PropTypes.bool,
  invertY: PropTypes.bool,
  xAccessor: PropTypes.func.isRequired,
  x1Accessor: PropTypes.func,
  yAccessor: PropTypes.func.isRequired,
  y1Accessor: PropTypes.func,
  lineDataAccessor: PropTypes.func, //are you missing a point data accessor? 
  areaDataAccessor: PropTypes.func,
  annotations: PropTypes.array,
  download: PropTypes.bool, //add a download button for graphs data as csv
  downloadFields: PropTypes.array //additional fields aside from x,y to add to the csv
};

module.exports = XYFrame;