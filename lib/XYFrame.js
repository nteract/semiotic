"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class, _temp;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

// components

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Scale = require("d3-scale");

var _axis = require("./visualizationLayerBehavior/axis");

var _Axis = require("./Axis");

var _Axis2 = _interopRequireDefault(_Axis);

var _DownloadButton = require("./DownloadButton");

var _DownloadButton2 = _interopRequireDefault(_DownloadButton);

var _Frame = require("./Frame");

var _Frame2 = _interopRequireDefault(_Frame);

var _xyframeRules = require("./annotationRules/xyframeRules");

var _general = require("./visualizationLayerBehavior/general");

var _lineDrawing = require("./svg/lineDrawing");

var _reactAnnotation = require("react-annotation");

var _frameFunctions = require("./svg/frameFunctions");

var _downloadDataMapping = require("./downloadDataMapping");

var _coordinateNames = require("./constants/coordinateNames");

var _dataFunctions = require("./data/dataFunctions");

var _jsx = require("./constants/jsx");

var _frame_props = require("./constants/frame_props");

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var xyframeKey = "";
var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
for (var i = 32; i > 0; --i) {
  xyframeKey += chars[Math.floor(Math.random() * chars.length)];
}var xyframeSettings = ["margin"];

var projectedCoordinateNames = {
  y: _coordinateNames.projectedY,
  x: _coordinateNames.projectedX,
  yMiddle: _coordinateNames.projectedYMiddle,
  yTop: _coordinateNames.projectedYTop,
  yBottom: _coordinateNames.projectedYBottom
};

function mapParentsToPoints(fullDataset) {
  return fullDataset.map(function (d) {
    if (d.parentLine) {
      return _extends({}, d, d.parentLine);
    }
    if (d.parentArea) {
      return _extends({}, d, d.parentArea);
    }
    return d;
  });
}

var XYFrame = (_temp = _class = function (_React$Component) {
  _inherits(XYFrame, _React$Component);

  function XYFrame(props) {
    _classCallCheck(this, XYFrame);

    var _this = _possibleConstructorReturn(this, (XYFrame.__proto__ || Object.getPrototypeOf(XYFrame)).call(this, props));

    _this.calculateXYFrame = _this.calculateXYFrame.bind(_this);

    _this.renderBody = _this.renderBody.bind(_this);

    _this.state = {
      lineData: null,
      pointData: null,
      areaData: null,
      projectedLines: null,
      projectedPoints: null,
      projectedAreas: null,
      fullDataset: null,
      adjustedPosition: null,
      adjustedSize: null,
      backgroundGraphics: null,
      foregroundGraphics: null,
      axesData: null,
      axes: null,
      renderNumber: 0,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    };

    _this.xAccessor = null;
    _this.yAccessor = null;
    _this.xScale = null;
    _this.yScale = null;

    _this.settingsMap = new Map();
    xyframeSettings.forEach(function (d) {
      _this.settingsMap.set(d, new Map());
    });
    return _this;
  }

  _createClass(XYFrame, [{
    key: "componentWillMount",
    value: function componentWillMount() {
      this.calculateXYFrame(this.props);
    }
  }, {
    key: "componentWillReceiveProps",
    value: function componentWillReceiveProps(nextProps) {
      var _this2 = this;

      if (this.state.dataVersion && this.state.dataVersion !== nextProps.dataVersion || !this.state.fullDataset) {
        this.calculateXYFrame(nextProps);
      } else if (this.state.size[0] !== nextProps.size[0] || this.state.size[1] !== nextProps.size[1] || !this.state.dataVersion && _frame_props.xyFrameChangeProps.find(function (d) {
        return _this2.props[d] !== nextProps[d];
      })) {
        this.calculateXYFrame(nextProps);
      }
    }
  }, {
    key: "screenScales",
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

      var xScale = xScaleType;
      var yScale = yScaleType;

      if (xScaleType.domain) {
        xScaleType.domain(xExtent);
      }
      if (yScaleType.domain) {
        yScaleType.domain(yExtent);
      }
      xScaleType.range(xDomain);
      yScaleType.range(yDomain);

      return { xScale: xScale, yScale: yScale };
    }
  }, {
    key: "calculateXYFrame",
    value: function calculateXYFrame(currentProps) {
      var margin = (0, _frameFunctions.calculateMargin)(currentProps);

      var _adjustedPositionSize = (0, _frameFunctions.adjustedPositionSize)(currentProps),
          adjustedPosition = _adjustedPositionSize.adjustedPosition,
          adjustedSize = _adjustedPositionSize.adjustedSize;

      var xExtent = currentProps.xExtent,
          yExtent = currentProps.yExtent,
          projectedLines = currentProps.projectedLines,
          projectedPoints = currentProps.projectedPoints,
          projectedAreas = currentProps.projectedAreas,
          fullDataset = currentProps.fullDataset,
          lineType = currentProps.lineType,
          customLineMark = currentProps.customLineMark,
          customPointMark = currentProps.customPointMark,
          areaStyle = currentProps.areaStyle,
          areaRenderMode = currentProps.areaRenderMode,
          lineStyle = currentProps.lineStyle,
          lineRenderMode = currentProps.lineRenderMode,
          lineClass = currentProps.lineClass,
          pointStyle = currentProps.pointStyle,
          pointRenderMode = currentProps.pointRenderMode,
          pointClass = currentProps.pointClass,
          areaClass = currentProps.areaClass,
          canvasLines = currentProps.canvasLines,
          canvasPoints = currentProps.canvasPoints,
          canvasAreas = currentProps.canvasAreas,
          defined = currentProps.defined,
          size = currentProps.size,
          renderKey = currentProps.renderKey;


      var xAccessor = (0, _dataFunctions.stringToFn)(currentProps.xAccessor);
      var yAccessor = (0, _dataFunctions.stringToFn)(currentProps.yAccessor);
      var lineIDAccessor = (0, _dataFunctions.stringToFn)(currentProps.lineIDAccessor, function (l) {
        return l.id;
      });

      if (!currentProps.dataVersion || currentProps.dataVersion && currentProps.dataVersion !== this.state.dataVersion) {
        if (!xExtent || !yExtent || !fullDataset || !projectedLines && !projectedPoints && !projectedAreas) {
          var _calculateDataExtent = (0, _dataFunctions.calculateDataExtent)(currentProps);

          xExtent = _calculateDataExtent.xExtent;
          yExtent = _calculateDataExtent.yExtent;
          projectedLines = _calculateDataExtent.projectedLines;
          projectedPoints = _calculateDataExtent.projectedPoints;
          projectedAreas = _calculateDataExtent.projectedAreas;
          fullDataset = _calculateDataExtent.fullDataset;
        }
      } else {
        var _state = this.state;
        xExtent = _state.xExtent;
        yExtent = _state.yExtent;
        projectedLines = _state.projectedLines;
        projectedPoints = _state.projectedPoints;
        projectedAreas = _state.projectedAreas;
        fullDataset = _state.fullDataset;
      }

      var _screenScales = this.screenScales({
        xExtent: xExtent,
        yExtent: yExtent,
        currentProps: currentProps,
        margin: margin,
        adjustedSize: adjustedSize
      }),
          xScale = _screenScales.xScale,
          yScale = _screenScales.yScale;

      var canvasDrawing = [];

      var title = (0, _frameFunctions.generateFrameTitle)(currentProps);

      //TODO: blow this shit up
      this.xScale = xScale;
      this.yScale = yScale;
      this.xAccessor = xAccessor;
      this.yAccessor = yAccessor;

      var axes = null;
      var axesTickLines = null;

      if (currentProps.axes) {
        axesTickLines = [];
        axes = currentProps.axes.map(function (d, i) {
          var axisScale = yScale;
          if (d.orient === "top" || d.orient === "bottom") {
            axisScale = xScale;
          }

          var tickValues = void 0;
          if (d.tickValues && Array.isArray(d.tickValues)) {
            tickValues = d.tickValues;
          } else if (d.tickValues) {
            //otherwise assume a function
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
          var axisParts = (0, _axis.axisPieces)({
            padding: d.padding,
            tickValues: tickValues,
            scale: axisScale,
            ticks: d.ticks,
            orient: d.orient,
            size: axisSize,
            margin: margin,
            footer: d.footer
          });
          var axisTickLines = _react2.default.createElement(
            "g",
            { key: "axes-tick-lines-" + i, className: "axis " + d.className },
            (0, _axis.axisLines)({ axisParts: axisParts, orient: d.orient })
          );
          axesTickLines.push(axisTickLines);
          return _react2.default.createElement(_Axis2.default, {
            label: d.label,
            axisParts: axisParts,
            key: d.key || "axis-" + i,
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
            className: d.className || "",
            name: d.name,
            padding: d.padding,
            rotate: d.rotate,
            annotationFunction: d.axisAnnotationFunction,
            glyphFunction: d.glyphFunction
          });
        });
      }

      var marginGraphic = void 0;
      if (currentProps.matte) {
        marginGraphic = _react2.default.createElement("path", {
          fill: "white",
          d: (0, _frameFunctions.drawMarginPath)({
            margin: margin,
            size: size,
            inset: currentProps.matte.inset
          }),
          className: "xyframe-matte"
        });
      }

      var legendSettings = void 0;

      if (currentProps.legend) {
        legendSettings = currentProps.legend === true ? {} : currentProps.legend;
        if (currentProps.lines && !legendSettings.legendGroups) {
          var _lineType = currentProps.lineType || currentProps.customLineType;
          var typeString = _lineType && _lineType.type ? _lineType.type : _lineType;
          var type = ["stackedarea", "stackedpercent", "bumparea"].indexOf(typeString) === -1 ? "line" : "fill";
          var legendGroups = [{
            styleFn: currentProps.lineStyle,
            type: type,
            items: currentProps.lines.map(function (d) {
              return _extends({ label: lineIDAccessor(d) }, d);
            })
          }];
          legendSettings.legendGroups = legendGroups;
        }
      }
      var areaAnnotations = [];
      var areaType = currentProps.areaType;
      if (areaType && areaType.label && projectedAreas) {
        projectedAreas.forEach(function (d, i) {
          if (d.bounds) {
            var bounds = Array.isArray(d.bounds) ? d.bounds : [d.bounds];
            bounds.forEach(function (labelBounds) {
              var label = typeof areaType.label === "function" ? areaType.label(d) : areaType.label;
              if (label && label !== null) {
                var labelPosition = label.position || "center";
                var labelCenter = [xScale(labelBounds[labelPosition][0]), yScale(labelBounds[labelPosition][1])] || [xScale(d._xyfCoordinates[0]), yScale(d._xyfCoordinates[1])];
                var labelContent = label.content || function (p) {
                  return p.value || p.id || i;
                };

                areaAnnotations.push({
                  x: labelCenter[0],
                  y: labelCenter[1],
                  dx: label.dx,
                  dy: label.dy,
                  className: label.className,
                  type: label.type || _reactAnnotation.AnnotationCallout,
                  note: label.note || { title: labelContent(d) },
                  subject: label.subject || { text: labelContent(d) },
                  connector: label.connector
                });
              }
            });
          }
        });
      }

      var xyFrameRender = {
        lines: {
          data: projectedLines,
          styleFn: (0, _dataFunctions.stringToFn)(lineStyle, function () {}, true),
          classFn: (0, _dataFunctions.stringToFn)(lineClass, function () {
            return "";
          }, true),
          renderMode: (0, _dataFunctions.stringToFn)(lineRenderMode, undefined, true),
          canvasRender: (0, _dataFunctions.stringToFn)(canvasLines, undefined, true),
          customMark: customLineMark,
          type: lineType,
          defined: defined,
          renderKeyFn: (0, _dataFunctions.stringToFn)(renderKey, function (d, i) {
            return "line-" + i;
          }, true),
          behavior: _general.createLines
        },
        areas: {
          data: projectedAreas,
          styleFn: (0, _dataFunctions.stringToFn)(areaStyle, function () {}, true),
          classFn: (0, _dataFunctions.stringToFn)(areaClass, function () {}, true),
          renderMode: (0, _dataFunctions.stringToFn)(areaRenderMode, undefined, true),
          canvasRender: (0, _dataFunctions.stringToFn)(canvasAreas, undefined, true),
          type: areaType,
          renderKeyFn: (0, _dataFunctions.stringToFn)(renderKey, function (d, i) {
            return "area-" + i;
          }, true),
          behavior: _general.createAreas
        },
        points: {
          data: projectedPoints,
          styleFn: (0, _dataFunctions.stringToFn)(pointStyle, function () {}, true),
          classFn: (0, _dataFunctions.stringToFn)(pointClass, function () {}, true),
          renderMode: (0, _dataFunctions.stringToFn)(pointRenderMode, undefined, true),
          canvasRender: (0, _dataFunctions.stringToFn)(canvasPoints, undefined, true),
          customMark: (0, _dataFunctions.stringToFn)(customPointMark, undefined, true),
          renderKeyFn: (0, _dataFunctions.stringToFn)(renderKey, function (d, i) {
            return "point-" + i;
          }, true),
          behavior: _general.createPoints
        }
      };

      this.setState({
        lineData: currentProps.lines,
        pointData: currentProps.points,
        areaData: currentProps.areas,
        dataVersion: currentProps.dataVersion,
        projectedLines: projectedLines,
        projectedPoints: projectedPoints,
        projectedAreas: projectedAreas,
        canvasDrawing: canvasDrawing,
        fullDataset: fullDataset,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        backgroundGraphics: currentProps.backgroundGraphics,
        foregroundGraphics: currentProps.foregroundGraphics,
        axesData: currentProps.axes,
        axes: axes,
        axesTickLines: axesTickLines,
        title: title,
        updatedFrame: undefined,
        renderNumber: this.state.renderNumber + 1,
        xScale: xScale,
        yScale: yScale,
        xExtent: xExtent,
        yExtent: yExtent,
        margin: margin,
        legendSettings: legendSettings,
        matte: marginGraphic,
        areaAnnotations: areaAnnotations,
        xyFrameRender: xyFrameRender,
        size: size
      });
    }
  }, {
    key: "defaultXYSVGRule",
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
      var idAccessor = (0, _dataFunctions.stringToFn)(this.props.lineIDAccessor, function (l) {
        return l.id;
      });

      var _adjustedPositionSize2 = (0, _frameFunctions.adjustedPositionSize)(this.props),
          adjustedPosition = _adjustedPositionSize2.adjustedPosition,
          adjustedSize = _adjustedPositionSize2.adjustedSize;

      if (!d.coordinates) {
        var xCoord = d[_coordinateNames.projectedX] || xAccessor(d);
        screenCoordinates = [xScale(xCoord), (0, _lineDrawing.relativeY)({
          point: d,
          lines: lines,
          projectedYMiddle: _coordinateNames.projectedYMiddle,
          projectedY: _coordinateNames.projectedY,
          projectedX: _coordinateNames.projectedX,
          xAccessor: xAccessor,
          yAccessor: yAccessor,
          yScale: yScale,
          xScale: xScale,
          idAccessor: idAccessor
        })];
        if (screenCoordinates[0] === undefined || screenCoordinates[1] === undefined || screenCoordinates[0] === null || screenCoordinates[1] === null) {
          //NO ANNOTATION IF INVALID SCREEN COORDINATES
          return null;
        }
      } else if (!d.bounds) {
        screenCoordinates = d.coordinates.map(function (p) {
          return [xScale(xAccessor(p)) + adjustedPosition[0], (0, _lineDrawing.relativeY)({
            point: p,
            lines: lines,
            projectedYMiddle: _coordinateNames.projectedYMiddle,
            projectedY: _coordinateNames.projectedY,
            projectedX: _coordinateNames.projectedX,
            xAccessor: xAccessor,
            yAccessor: yAccessor,
            yScale: yScale,
            xScale: xScale,
            idAccessor: idAccessor
          }) + adjustedPosition[1]];
        });
      }

      var margin = (0, _frameFunctions.calculateMargin)(this.props);

      //point xy
      //y
      //area

      //TODO: Process your rules first
      if (this.props.svgAnnotationRules && this.props.svgAnnotationRules({
        d: d,
        i: i,
        screenCoordinates: screenCoordinates,
        xScale: xScale,
        yScale: yScale,
        xAccessor: xAccessor,
        yAccessor: yAccessor,
        xyFrameProps: this.props,
        xyFrameState: this.state,
        areas: areas,
        points: points,
        lines: lines
      }) !== null) {
        return this.props.svgAnnotationRules({
          d: d,
          i: i,
          screenCoordinates: screenCoordinates,
          xScale: xScale,
          yScale: yScale,
          xAccessor: xAccessor,
          yAccessor: yAccessor,
          xyFrameProps: this.props,
          xyFrameState: this.state,
          areas: areas,
          points: points,
          lines: lines
        });
      } else if (d.type === "xy" || d.type === "frame-hover") {
        return (0, _xyframeRules.svgXYAnnotation)({ d: d, screenCoordinates: screenCoordinates, i: i });
      } else if (d.type === "react-annotation" || typeof d.type === "function") {
        return (0, _xyframeRules.basicReactAnnotation)({ d: d, screenCoordinates: screenCoordinates, i: i });
      } else if (d.type === "enclose") {
        return (0, _xyframeRules.svgEncloseAnnotation)({ d: d, screenCoordinates: screenCoordinates, i: i });
      } else if (d.type === "x") {
        return (0, _xyframeRules.svgXAnnotation)({
          d: d,
          screenCoordinates: screenCoordinates,
          i: i,
          annotationLayer: annotationLayer,
          adjustedSize: adjustedSize,
          margin: margin
        });
      } else if (d.type === "y") {
        return (0, _xyframeRules.svgYAnnotation)({
          d: d,
          screenCoordinates: screenCoordinates,
          i: i,
          annotationLayer: annotationLayer,
          adjustedSize: adjustedSize,
          adjustedPosition: adjustedPosition,
          margin: margin
        });
      } else if (d.type === "bounds") {
        return (0, _xyframeRules.svgBoundsAnnotation)({
          screenCoordinates: screenCoordinates,
          d: d,
          i: i,
          adjustedSize: adjustedSize,
          adjustedPosition: adjustedPosition,
          xAccessor: xAccessor,
          yAccessor: yAccessor,
          xScale: xScale,
          yScale: yScale,
          margin: margin
        });
      } else if (d.type === "line") {
        return (0, _xyframeRules.svgLineAnnotation)({ d: d, i: i, screenCoordinates: screenCoordinates });
      } else if (d.type === "area") {
        return (0, _xyframeRules.svgAreaAnnotation)({
          d: d,
          i: i,
          screenCoordinates: screenCoordinates,
          xScale: xScale,
          xAccessor: xAccessor,
          yScale: yScale,
          yAccessor: yAccessor,
          annotationLayer: annotationLayer
        });
      } else if (d.type === "horizontal-points") {
        return (0, _xyframeRules.svgHorizontalPointsAnnotation)({
          d: d,
          lines: lines.data,
          points: points.data,
          xScale: xScale,
          yScale: yScale,
          pointStyle: points.styleFn
        });
      } else if (d.type === "vertical-points") {
        return (0, _xyframeRules.svgVerticalPointsAnnotation)({
          d: d,
          lines: lines.data,
          points: points.data,
          xScale: xScale,
          yScale: yScale,
          pointStyle: points.styleFn
        });
      }
      return null;
    }
  }, {
    key: "defaultXYHTMLRule",
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

      var size = this.props.size;


      var idAccessor = (0, _dataFunctions.stringToFn)(this.props.lineIDAccessor, function (l) {
        return l.id;
      });
      var xCoord = d[_coordinateNames.projectedX] || xAccessor(d);
      var yCoord = d[_coordinateNames.projectedY] || yAccessor(d);

      var xString = xCoord && xCoord.toString ? xCoord.toString() : xCoord;
      var yString = yCoord && yCoord.toString ? yCoord.toString() : yCoord;

      var _adjustedPositionSize3 = (0, _frameFunctions.adjustedPositionSize)(this.props),
          adjustedPosition = _adjustedPositionSize3.adjustedPosition;

      if (!d.coordinates) {
        screenCoordinates = [xScale(xCoord), (0, _lineDrawing.relativeY)({
          point: d,
          lines: lines,
          projectedYMiddle: _coordinateNames.projectedYMiddle,
          projectedY: _coordinateNames.projectedY,
          projectedX: _coordinateNames.projectedX,
          xAccessor: xAccessor,
          yAccessor: yAccessor,
          yScale: yScale,
          xScale: xScale,
          idAccessor: idAccessor
        })];
        if (screenCoordinates[0] === undefined || screenCoordinates[1] === undefined || screenCoordinates[0] === null || screenCoordinates[1] === null) {
          //NO ANNOTATION IF INVALID SCREEN COORDINATES
          return null;
        }
      } else {
        screenCoordinates = d.coordinates.map(function (p) {
          return [xScale(xAccessor(p)) + adjustedPosition[0], (0, _lineDrawing.relativeY)({
            point: p,
            lines: lines,
            projectedYMiddle: _coordinateNames.projectedYMiddle,
            projectedY: _coordinateNames.projectedY,
            projectedX: _coordinateNames.projectedX,
            xAccessor: xAccessor,
            yAccessor: yAccessor,
            yScale: yScale,
            xScale: xScale,
            idAccessor: idAccessor
          }) + adjustedPosition[1]];
        });
      }

      if (this.props.htmlAnnotationRules && this.props.htmlAnnotationRules({
        d: d,
        i: i,
        screenCoordinates: screenCoordinates,
        xScale: xScale,
        yScale: yScale,
        xAccessor: xAccessor,
        yAccessor: yAccessor,
        xyFrameProps: this.props,
        xyFrameState: this.state,
        areas: areas,
        points: points,
        lines: lines
      }) !== null) {
        return this.props.htmlAnnotationRules({
          d: d,
          i: i,
          screenCoordinates: screenCoordinates,
          xScale: xScale,
          yScale: yScale,
          xAccessor: xAccessor,
          yAccessor: yAccessor,
          xyFrameProps: this.props,
          xyFrameState: this.state,
          areas: areas,
          points: points,
          lines: lines
        });
      }

      if (d.type === "frame-hover") {
        var content = _react2.default.createElement(
          "div",
          { className: "tooltip-content" },
          _react2.default.createElement(
            "p",
            { key: "html-annotation-content-1" },
            xString
          ),
          _react2.default.createElement(
            "p",
            { key: "html-annotation-content-2" },
            yString
          )
        );

        if (d.type === "frame-hover" && this.props.tooltipContent) {
          content = this.props.tooltipContent(d);
        }
        return (0, _xyframeRules.htmlTooltipAnnotation)({
          content: content,
          screenCoordinates: screenCoordinates,
          size: size,
          i: i,
          d: d
        });
      }
      return null;
    }
  }, {
    key: "render",
    value: function render() {
      return this.renderBody({});
    }
  }, {
    key: "renderBody",
    value: function renderBody(_ref4) {
      var afterElements = _ref4.afterElements,
          beforeElements = _ref4.beforeElements;
      var _props = this.props,
          downloadFields = _props.downloadFields,
          xAccessor = _props.xAccessor,
          yAccessor = _props.yAccessor,
          lines = _props.lines,
          points = _props.points,
          areas = _props.areas,
          name = _props.name,
          download = _props.download,
          size = _props.size,
          className = _props.className,
          annotationSettings = _props.annotationSettings,
          annotations = _props.annotations,
          additionalDefs = _props.additionalDefs,
          hoverAnnotation = _props.hoverAnnotation,
          interaction = _props.interaction,
          customClickBehavior = _props.customClickBehavior,
          customHoverBehavior = _props.customHoverBehavior,
          customDoubleClickBehavior = _props.customDoubleClickBehavior;
      var _state2 = this.state,
          title = _state2.title,
          backgroundGraphics = _state2.backgroundGraphics,
          foregroundGraphics = _state2.foregroundGraphics,
          adjustedPosition = _state2.adjustedPosition,
          adjustedSize = _state2.adjustedSize,
          margin = _state2.margin,
          matte = _state2.matte,
          axes = _state2.axes,
          axesTickLines = _state2.axesTickLines,
          extent = _state2.extent,
          xScale = _state2.xScale,
          yScale = _state2.yScale,
          dataVersion = _state2.dataVersion,
          fullDataset = _state2.fullDataset,
          areaAnnotations = _state2.areaAnnotations,
          legendSettings = _state2.legendSettings,
          xyFrameRender = _state2.xyFrameRender;


      var downloadButton = void 0;
      if (download) {
        var downloadData = download === "points" ? mapParentsToPoints(fullDataset) : points || lines || areas;
        downloadButton = _react2.default.createElement(_DownloadButton2.default, {
          csvName: name + "-" + new Date().toJSON(),
          width: parseInt(size[0]),
          data: (0, _downloadDataMapping.xyDownloadMapping)({
            data: downloadData,
            xAccessor: download === "points" || points ? (0, _dataFunctions.stringToFn)(xAccessor) : undefined,
            yAccessor: download === "points" || points ? (0, _dataFunctions.stringToFn)(yAccessor) : undefined,
            fields: downloadFields
          })
        });
      }

      var finalFilterDefs = (0, _jsx.filterDefs)({
        matte: matte,
        key: xyframeKey,
        additionalDefs: additionalDefs
      });

      // foreground and background graphics should handle either JSX or a function that passes size & margin and returns JSX
      return _react2.default.createElement(_Frame2.default, {
        name: "xyframe",
        renderPipeline: xyFrameRender,
        adjustedPosition: adjustedPosition,
        size: size,
        extent: extent,
        projectedCoordinateNames: projectedCoordinateNames,
        xScale: xScale,
        yScale: yScale,
        axes: axes,
        axesTickLines: axesTickLines,
        title: title,
        dataVersion: dataVersion,
        matte: matte,
        className: className,
        adjustedSize: adjustedSize,
        finalFilterDefs: finalFilterDefs,
        frameKey: xyframeKey,
        hoverAnnotation: hoverAnnotation,
        defaultSVGRule: this.defaultXYSVGRule.bind(this),
        defaultHTMLRule: this.defaultXYHTMLRule.bind(this),
        annotations: areaAnnotations.length > 0 ? [].concat(_toConsumableArray(annotations), _toConsumableArray(areaAnnotations)) : annotations,
        annotationSettings: annotationSettings,
        legendSettings: legendSettings,
        projectedYMiddle: _coordinateNames.projectedYMiddle,
        interaction: interaction,
        customClickBehavior: customClickBehavior,
        customHoverBehavior: customHoverBehavior,
        customDoubleClickBehavior: customDoubleClickBehavior,
        points: fullDataset,
        margin: margin,
        backgroundGraphics: backgroundGraphics,
        foregroundGraphics: foregroundGraphics,
        beforeElements: beforeElements,
        afterElements: afterElements,
        downloadButton: downloadButton,
        disableContext: this.props.disableContext
      });
    }
  }]);

  return XYFrame;
}(_react2.default.Component), _class.defaultProps = {
  annotations: [],
  foregroundGraphics: [],
  annotationSettings: {},
  size: [500, 500],
  className: "",
  lineType: "line",
  name: "xyframe"
}, _temp);


XYFrame.propTypes = {
  name: _propTypes2.default.string,
  lines: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  points: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  areas: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  title: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object]),
  margin: _propTypes2.default.oneOfType([_propTypes2.default.number, _propTypes2.default.object]),
  dataVersion: _propTypes2.default.string,
  axes: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  matte: _propTypes2.default.oneOfType([_propTypes2.default.bool, _propTypes2.default.object]),
  size: _propTypes2.default.array,
  position: _propTypes2.default.array,
  xScaleType: _propTypes2.default.func,
  yScaleType: _propTypes2.default.func,
  xExtent: _propTypes2.default.array,
  yExtent: _propTypes2.default.array,
  invertX: _propTypes2.default.bool,
  invertY: _propTypes2.default.bool,
  xAccessor: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  yAccessor: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  lineDataAccessor: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  areaDataAccessor: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  backgroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  foregroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  additionalDefs: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  customHoverBehavior: _propTypes2.default.func,
  customClickBehavior: _propTypes2.default.func,
  customDoubleclickBehavior: _propTypes2.default.func,
  lineType: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object]),
  showLinePoints: _propTypes2.default.bool,
  defined: _propTypes2.default.func,
  lineStyle: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.object]),
  pointStyle: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.object]),
  areaStyle: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.object]),
  lineClass: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  pointClass: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  areaClass: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  canvasPoints: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.bool]),
  customPointMark: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.object]),
  hoverAnnotation: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array, _propTypes2.default.func, _propTypes2.default.bool]),
  customLineMark: _propTypes2.default.func,
  lineIDAccessor: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  svgAnnotationRules: _propTypes2.default.func,
  htmlAnnotationRules: _propTypes2.default.func,
  tooltipContent: _propTypes2.default.func,
  annotations: _propTypes2.default.array,
  interaction: _propTypes2.default.object,
  download: _propTypes2.default.oneOfType([_propTypes2.default.bool, _propTypes2.default.string]), //add a download button for graphs data as csv
  downloadFields: _propTypes2.default.array //additional fields aside from x,y to add to the csv
};

exports.default = XYFrame;
module.exports = exports['default'];