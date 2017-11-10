"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.htmlTooltipAnnotation = exports.svgAreaAnnotation = exports.svgLineAnnotation = exports.svgBoundsAnnotation = exports.svgYAnnotation = exports.svgXAnnotation = exports.svgEncloseAnnotation = exports.basicReactAnnotation = exports.svgXYAnnotation = exports.svgVerticalPointsAnnotation = exports.svgHorizontalPointsAnnotation = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _semioticMark = require("semiotic-mark");

var _Annotation = require("../Annotation");

var _Annotation2 = _interopRequireDefault(_Annotation);

var _reactAnnotation = require("react-annotation");

var _d3Shape = require("d3-shape");

var _d3Hierarchy = require("d3-hierarchy");

var _d3Array = require("d3-array");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var pointsAlong = function pointsAlong(along) {
  return function (_ref) {
    var d = _ref.d,
        lines = _ref.lines,
        points = _ref.points,
        xScale = _ref.xScale,
        yScale = _ref.yScale,
        pointStyle = _ref.pointStyle;

    var alongScale = along === "_xyfX" ? xScale : yScale;
    if (d && d[along]) {
      var _d$threshold = d.threshold,
          threshold = _d$threshold === undefined ? 1 : _d$threshold,
          _d$r = d.r,
          r = _d$r === undefined ? function () {
        return 4;
      } : _d$r,
          _d$styleFn = d.styleFn,
          styleFn = _d$styleFn === undefined ? pointStyle : _d$styleFn;

      var foundPoints = [];

      var halfThreshold = threshold / 2;

      if (lines && lines.length > 0) {
        lines.forEach(function (line) {
          var linePoints = line.data.filter(function (p) {
            var pAlong = alongScale(p[along]);
            var dAlong = alongScale(d[along]);

            return pAlong <= dAlong + halfThreshold && pAlong >= dAlong - halfThreshold;
          });
          foundPoints.push.apply(foundPoints, _toConsumableArray(linePoints));
        });
      }

      if (points && points.length > 0) {
        var pointPoints = points.filter(function (p) {
          var pAlong = alongScale(p[along]);
          var dAlong = alongScale(d[along]);

          return pAlong <= dAlong + halfThreshold && pAlong >= dAlong - halfThreshold;
        });
        foundPoints.push.apply(foundPoints, _toConsumableArray(pointPoints));
      }

      return foundPoints.map(function (p, i) {
        return _react2.default.createElement("circle", {
          key: "found-circle-" + i,
          r: r(p, i),
          style: styleFn(p, i),
          cx: xScale(p._xyfX),
          cy: yScale(p._xyfY)
        });
      });
    }
    return null;
  };
};

var svgHorizontalPointsAnnotation = exports.svgHorizontalPointsAnnotation = pointsAlong("_xyfY");
var svgVerticalPointsAnnotation = exports.svgVerticalPointsAnnotation = pointsAlong("_xyfX");

var svgXYAnnotation = exports.svgXYAnnotation = function svgXYAnnotation(_ref2) {
  var screenCoordinates = _ref2.screenCoordinates,
      i = _ref2.i,
      d = _ref2.d;

  var laLine = _react2.default.createElement(_semioticMark.Mark, {
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
      _semioticMark.Mark,
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
};

var basicReactAnnotation = exports.basicReactAnnotation = function basicReactAnnotation(_ref3) {
  var screenCoordinates = _ref3.screenCoordinates,
      d = _ref3.d,
      i = _ref3.i;

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

  return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: noteData });
};

var svgEncloseAnnotation = exports.svgEncloseAnnotation = function svgEncloseAnnotation(_ref4) {
  var screenCoordinates = _ref4.screenCoordinates,
      d = _ref4.d,
      i = _ref4.i;

  var circle = (0, _d3Hierarchy.packEnclose)(screenCoordinates.map(function (p) {
    return { x: p[0], y: p[1], r: 2 };
  }));
  var noteData = _extends({
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

  if (noteData.rp) {
    switch (noteData.rp) {
      case "top":
        noteData.dx = 0;
        noteData.dy = -circle.r - noteData.rd;
        break;
      case "bottom":
        noteData.dx = 0;
        noteData.dy = circle.r + noteData.rd;
        break;
      case "left":
        noteData.dx = -circle.r - noteData.rd;
        noteData.dy = 0;
        break;
      default:
        noteData.dx = circle.r + noteData.rd;
        noteData.dy = 0;
    }
  }
  //TODO: Support .ra (setting angle)

  return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: noteData });
};

var svgXAnnotation = exports.svgXAnnotation = function svgXAnnotation(_ref5) {
  var screenCoordinates = _ref5.screenCoordinates,
      d = _ref5.d,
      i = _ref5.i,
      annotationLayer = _ref5.annotationLayer,
      adjustedSize = _ref5.adjustedSize,
      margin = _ref5.margin;

  var yPosition = annotationLayer.position[1];

  var noteData = _extends({
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
  return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: noteData });
};

var svgYAnnotation = exports.svgYAnnotation = function svgYAnnotation(_ref6) {
  var screenCoordinates = _ref6.screenCoordinates,
      d = _ref6.d,
      i = _ref6.i,
      annotationLayer = _ref6.annotationLayer,
      adjustedSize = _ref6.adjustedSize,
      adjustedPosition = _ref6.adjustedPosition,
      margin = _ref6.margin;

  var xPosition = margin.left + i * 25;

  var noteData = _extends({
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
  return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: noteData });
};

var svgBoundsAnnotation = exports.svgBoundsAnnotation = function svgBoundsAnnotation(_ref7) {
  var screenCoordinates = _ref7.screenCoordinates,
      d = _ref7.d,
      i = _ref7.i,
      adjustedSize = _ref7.adjustedSize,
      adjustedPosition = _ref7.adjustedPosition,
      xAccessor = _ref7.xAccessor,
      yAccessor = _ref7.yAccessor,
      xScale = _ref7.xScale,
      yScale = _ref7.yScale,
      margin = _ref7.margin;

  var startXValue = xAccessor(d.bounds[0]);
  var startYValue = yAccessor(d.bounds[0]);
  var endXValue = xAccessor(d.bounds[1]);
  var endYValue = yAccessor(d.bounds[1]);

  var x0Position = startXValue ? xScale(startXValue) : margin.left;
  var y0Position = startYValue ? yScale(startYValue) : adjustedSize[1] + margin.top;
  var x1Position = endXValue ? xScale(endXValue) : adjustedSize[0] + margin.left;
  var y1Position = endYValue ? yScale(endYValue) : margin.top;

  var noteData = _extends({
    dx: 250,
    dy: -20,
    note: { label: d.label },
    connector: { end: "arrow" }
  }, d, {
    type: _reactAnnotation.AnnotationCalloutRect,
    x: Math.min(x0Position, x1Position),
    y: Math.min(y0Position, y1Position),
    subject: {
      width: Math.abs(x1Position - x0Position),
      height: Math.abs(y0Position - y1Position)
    }
  });
  return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: noteData });
};

var svgLineAnnotation = exports.svgLineAnnotation = function svgLineAnnotation(_ref8) {
  var d = _ref8.d,
      i = _ref8.i,
      screenCoordinates = _ref8.screenCoordinates;

  var lineGenerator = (0, _d3Shape.line)().x(function (p) {
    return p[0];
  }).y(function (p) {
    return p[1];
  });
  var lineD = lineGenerator(screenCoordinates);
  var laLine = _react2.default.createElement(_semioticMark.Mark, {
    key: d.label + "annotationline" + i,
    markType: "path",
    d: lineD,
    className: "annotation annotation-line " + (d.className || "") + " "
  });

  var laLabel = _react2.default.createElement(
    _semioticMark.Mark,
    {
      markType: "text",
      key: d.label + "annotationlinetext" + i,
      x: (screenCoordinates[0][0] + screenCoordinates[1][0]) / 2,
      y: (screenCoordinates[0][1] + screenCoordinates[1][1]) / 2,
      className: "annotation annotation-line-label " + (d.className || "") + " "
    },
    d.label
  );

  return [laLine, laLabel];
};

var svgAreaAnnotation = exports.svgAreaAnnotation = function svgAreaAnnotation(_ref9) {
  var d = _ref9.d,
      i = _ref9.i,
      screenCoordinates = _ref9.screenCoordinates,
      xScale = _ref9.xScale,
      xAccessor = _ref9.xAccessor,
      yScale = _ref9.yScale,
      yAccessor = _ref9.yAccessor,
      annotationLayer = _ref9.annotationLayer;

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

  var laLine = _react2.default.createElement(_semioticMark.Mark, {
    key: d.label + "annotationarea" + i,
    markType: "path",
    transform: "translate(" + annotationLayer.position + ")",
    d: mappedCoordinates,
    className: "annotation annotation-area " + (d.className || "") + " "
  });

  var laLabel = _react2.default.createElement(
    _semioticMark.Mark,
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

  return [laLine, laLabel];
};

var htmlTooltipAnnotation = exports.htmlTooltipAnnotation = function htmlTooltipAnnotation(_ref10) {
  var content = _ref10.content,
      screenCoordinates = _ref10.screenCoordinates,
      size = _ref10.size,
      i = _ref10.i,
      d = _ref10.d;

  //To string because React gives a DOM error if it gets a date

  return _react2.default.createElement(
    "div",
    {
      key: "xylabel" + i,
      className: "annotation annotation-xy-label " + (d.className || "") + " ",
      style: {
        position: "absolute",
        bottom: size[1] - screenCoordinates[1] + "px",
        left: screenCoordinates[0] + "px"
      }
    },
    content
  );
};