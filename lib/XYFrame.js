"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

// components


var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Array = require("d3-array");

var _d3Scale = require("d3-scale");

var _axis = require("./visualizationLayerBehavior/axis");

var _Mark = require("./Mark");

var _Mark2 = _interopRequireDefault(_Mark);

var _Annotation = require("./Annotation");

var _Annotation2 = _interopRequireDefault(_Annotation);

var _Axis = require("./Axis");

var _Axis2 = _interopRequireDefault(_Axis);

var _DownloadButton = require("./DownloadButton");

var _DownloadButton2 = _interopRequireDefault(_DownloadButton);

var _Frame = require("./Frame");

var _Frame2 = _interopRequireDefault(_Frame);

var _general = require("./visualizationLayerBehavior/general");

var _d3Shape = require("d3-shape");

var _lineDrawing = require("./svg/lineDrawing");

var _reactAnnotation = require("react-annotation");

var _frameFunctions = require("./svg/frameFunctions");

var _d3Hierarchy = require("d3-hierarchy");

var _downloadDataMapping = require("./downloadDataMapping");

var _coordinateNames = require("./constants/coordinateNames");

var _dataFunctions = require("./data/dataFunctions");

var _jsx = require("./constants/jsx");

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
}function linetypeChange(oldProps, newProps) {
  var oLT = oldProps.lineType || oldProps.customLineType;
  var nLT = newProps.lineType || newProps.customLineType;
  if (!oLT && !nLT) {
    return false;
  } else if (typeof oLT === "string" && oLT === nLT) {
    return false;
  } else if (oLT && nLT && oLT.type && nLT.type && oLT.type === nLT.type) {
    return false;
  }
  return true;
}

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

var XYFrame = function (_React$Component) {
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
      if (!this.state.dataVersion || !this.state.fullDataset) {
        this.calculateXYFrame(nextProps);
      } else if (linetypeChange(this.props, nextProps) || this.state.dataVersion !== nextProps.dataVersion || this.props.xExtent && !nextProps.xExtent || this.props.yExtent && !nextProps.yExtent || !this.props.xExtent && nextProps.xExtent || !this.props.yExtent && nextProps.yExtent || this.props.xExtent && nextProps.xExtent && (this.props.xExtent[0] !== nextProps.xExtent[0] || this.props.xExtent[1] !== nextProps.xExtent[1]) || this.props.yExtent && nextProps.yExtent && (this.props.yExtent[0] !== nextProps.yExtent[0] || this.props.yExtent[1] !== nextProps.yExtent[1]) || this.props.name !== nextProps.name || this.props.size[0] !== nextProps.size[0] || this.props.size[1] !== nextProps.size[1]) {
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
          _currentProps$lineTyp = currentProps.lineType,
          lineType = _currentProps$lineTyp === undefined ? "line" : _currentProps$lineTyp,
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
          defined = currentProps.defined;


      var xAccessor = (0, _dataFunctions.stringToFn)(currentProps.xAccessor);
      var yAccessor = (0, _dataFunctions.stringToFn)(currentProps.yAccessor);
      var lineIDAccessor = (0, _dataFunctions.stringToFn)(currentProps.lineIDAccessor, function (l) {
        return l.id;
      });

      if (!currentProps.dataVersion || currentProps.dataVersion && currentProps.dataVersion !== this.state.dataVersion) {
        if (!xExtent || !yExtent || !fullDataset || !projectedLines && !projectedPoints && !projectedAreas) {
          ;
          var _calculateDataExtent = (0, _dataFunctions.calculateDataExtent)(currentProps);

          xExtent = _calculateDataExtent.xExtent;
          yExtent = _calculateDataExtent.yExtent;
          projectedLines = _calculateDataExtent.projectedLines;
          projectedPoints = _calculateDataExtent.projectedPoints;
          projectedAreas = _calculateDataExtent.projectedAreas;
          fullDataset = _calculateDataExtent.fullDataset;
        }
      } else {
        ;var _state = this.state;
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
            size: currentProps.size,
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
          behavior: _general.createLines
        },
        areas: {
          data: projectedAreas,
          styleFn: (0, _dataFunctions.stringToFn)(areaStyle, function () {}, true),
          classFn: (0, _dataFunctions.stringToFn)(areaClass, function () {}, true),
          renderMode: (0, _dataFunctions.stringToFn)(areaRenderMode, undefined, true),
          canvasRender: (0, _dataFunctions.stringToFn)(canvasAreas, undefined, true),
          type: areaType,
          behavior: _general.createAreas
        },
        points: {
          data: projectedPoints,
          styleFn: (0, _dataFunctions.stringToFn)(pointStyle, function () {}, true),
          classFn: (0, _dataFunctions.stringToFn)(pointClass, function () {}, true),
          renderMode: (0, _dataFunctions.stringToFn)(pointRenderMode, undefined, true),
          canvasRender: (0, _dataFunctions.stringToFn)(canvasPoints, undefined, true),
          customMark: (0, _dataFunctions.stringToFn)(customPointMark, undefined, true),
          behavior: _general.createPoints
        }
      };

      this.setState({
        voronoiHover: null,
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
        xyFrameRender: xyFrameRender
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
      var idAccessor = this.props.lineIDAccessor || function (l) {
        return l.id;
      };

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
        var laLine = _react2.default.createElement(_Mark2.default, {
          className: "annotation " + d.type + " " + (d.className || "") + " ",
          key: "annotationpoint" + i,
          markType: "circle",
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
              markType: "text",
              key: d.label + "annotationtext" + i,
              forceUpdate: true,
              x: screenCoordinates[0],
              y: 10 + screenCoordinates[1],
              className: "annotation annotation-xy-label " + (d.className || "") + " "
            },
            d.label
          );
        }

        return [laLine, laLabel];
      } else if (d.type === "react-annotation" || typeof d.type === "function") {
        var noteData = _extends({
          dx: 0,
          dy: 0,
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, {
          type: d.type
        });

        noteData.x = noteData.x ? noteData.x : screenCoordinates[0];
        noteData.y = noteData.y ? noteData.y : screenCoordinates[1];

        return _react2.default.createElement(_Annotation2.default, { key: i, noteData: noteData });
      } else if (d.type === "enclose") {
        var circle = (0, _d3Hierarchy.packEnclose)(screenCoordinates.map(function (p) {
          return { x: p[0], y: p[1], r: 2 };
        }));
        var _noteData = _extends({
          dx: 0,
          dy: 0,
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, {
          x: circle.x,
          y: circle.y,
          type: _reactAnnotation.AnnotationCalloutCircle,
          subject: {
            radius: circle.r,
            radiusPadding: 5 || d.radiusPadding
          }
        });

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
            default:
              _noteData.dx = circle.r + _noteData.rd;
              _noteData.dy = 0;
          }
        }
        //TODO: Support .ra (setting angle)

        return _react2.default.createElement(_Annotation2.default, { key: i, noteData: _noteData });
      } else if (d.type === "x") {
        var yPosition = annotationLayer.position[1];

        var _noteData2 = _extends({
          dx: 50,
          dy: 20,
          y: yPosition,
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, {
          type: _reactAnnotation.AnnotationXYThreshold,
          x: screenCoordinates[0],
          subject: {
            x: screenCoordinates[0],
            y1: yPosition,
            y2: adjustedSize[1] + margin.top
          }
        });
        return _react2.default.createElement(_Annotation2.default, { key: i, noteData: _noteData2 });
      } else if (d.type === "y") {
        var xPosition = margin.left + i * 25;

        var _noteData3 = _extends({
          dx: 50,
          dy: -20,
          x: xPosition,
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, {
          type: _reactAnnotation.AnnotationXYThreshold,
          y: screenCoordinates[1],
          subject: {
            y: screenCoordinates[1],
            x1: margin.left,
            x2: adjustedSize[0] + adjustedPosition[0] + margin.left
          }
        });
        return _react2.default.createElement(_Annotation2.default, { key: i, noteData: _noteData3 });
      } else if (d.type === "bounds") {
        var x0Position = xScale(xAccessor(d.bounds[0])) + annotationLayer.position[0];
        var y0Position = yScale(yAccessor(d.bounds[0])) + annotationLayer.position[1];
        var x1Position = xScale(xAccessor(d.bounds[1])) + annotationLayer.position[0];
        var y1Position = yScale(yAccessor(d.bounds[1])) + annotationLayer.position[1];

        var _laLine = _react2.default.createElement(_Mark2.default, {
          key: d.label + "annotationbounds" + i,
          markType: "path",
          d: "M" + x0Position + "," + y0Position + "L" + x1Position + "," + y0Position + "L" + x1Position + "," + y1Position + "L" + x0Position + "," + y1Position + "Z",
          className: "annotation annotation-bounds " + (d.className || "") + " "
        });

        var _laLabel = _react2.default.createElement(
          _Mark2.default,
          {
            markType: "text",
            key: d.label + "annotationtext" + i,
            forceUpdate: true,
            x: 5 + x0Position,
            y: -5 + y0Position,
            className: "annotation annotation-bounds-label " + (d.className || "") + " "
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
          markType: "path",
          d: lineD,
          className: "annotation annotation-line " + (d.className || "") + " "
        });

        var _laLabel2 = _react2.default.createElement(
          _Mark2.default,
          {
            markType: "text",
            key: d.label + "annotationlinetext" + i,
            x: (screenCoordinates[0][0] + screenCoordinates[1][0]) / 2,
            y: (screenCoordinates[0][1] + screenCoordinates[1][1]) / 2,
            className: "annotation annotation-line-label " + (d.className || "") + " "
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
          markType: "path",
          transform: "translate(" + annotationLayer.position + ")",
          d: mappedCoordinates,
          className: "annotation annotation-area " + (d.className || "") + " "
        });

        var _laLabel3 = _react2.default.createElement(
          _Mark2.default,
          {
            markType: "text",
            key: d.label + "annotationtext" + i,
            forceUpdate: true,
            x: xCenter,
            y: yCenter,
            transform: "translate(" + annotationLayer.position + ")",
            className: "annotation annotation-area-label " + (d.className || "") + " ",
            style: { textAnchor: "middle" }
          },
          d.label
        );

        return [_laLine3, _laLabel3];
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

      var idAccessor = this.props.lineIDAccessor || function (l) {
        return l.id;
      };
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
        //To string because React gives a DOM error if it gets a date
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

        return _react2.default.createElement(
          "div",
          {
            key: "xylabel" + i,
            className: "annotation annotation-xy-label " + (d.className || "") + " ",
            style: {
              position: "absolute",
              bottom: this.props.size[1] - screenCoordinates[1] + "px",
              left: screenCoordinates[0] + "px"
            }
          },
          content
        );
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
          _props$name = _props.name,
          name = _props$name === undefined ? "xyframe" : _props$name,
          download = _props.download,
          size = _props.size,
          _props$className = _props.className,
          className = _props$className === undefined ? "" : _props$className,
          _props$annotationSett = _props.annotationSettings,
          annotationSettings = _props$annotationSett === undefined ? {} : _props$annotationSett,
          _props$annotations = _props.annotations,
          annotations = _props$annotations === undefined ? [] : _props$annotations,
          additionalDefs = _props.additionalDefs,
          hoverAnnotation = _props.hoverAnnotation,
          interaction = _props.interaction,
          customClickBehavior = _props.customClickBehavior,
          customHoverBehavior = _props.customHoverBehavior,
          customDoubleClickBehavior = _props.customDoubleClickBehavior,
          renderKey = _props.renderKey;
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
        projectedCoordinateNames: {
          y: _coordinateNames.projectedY,
          x: _coordinateNames.projectedX,
          yMiddle: _coordinateNames.projectedYMiddle,
          yTop: _coordinateNames.projectedYTop,
          yBottom: _coordinateNames.projectedYBottom
        },
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
        renderKeyFn: renderKey,
        hoverAnnotation: hoverAnnotation,
        defaultSVGRule: this.defaultXYSVGRule.bind(this),
        defaultHTMLRule: this.defaultXYHTMLRule.bind(this),
        annotations: [].concat(_toConsumableArray(annotations), _toConsumableArray(areaAnnotations)),
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
        downloadButton: downloadButton
      });
    }
  }]);

  return XYFrame;
}(_react2.default.Component);

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
  size: _propTypes2.default.array.isRequired,
  position: _propTypes2.default.array,
  xScaleType: _propTypes2.default.func,
  yScaleType: _propTypes2.default.func,
  xExtent: _propTypes2.default.array,
  yExtent: _propTypes2.default.array,
  invertX: _propTypes2.default.bool,
  invertY: _propTypes2.default.bool,
  xAccessor: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  yAccessor: _propTypes2.default.oneOfType([_propTypes2.default.func, _propTypes2.default.string]),
  hoverAnnotation: _propTypes2.default.bool,
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

module.exports = XYFrame;