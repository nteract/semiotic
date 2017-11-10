"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.htmlColumnHoverRule = exports.htmlFrameHoverRule = exports.svgRRule = exports.svgEncloseRule = exports.basicReactAnnotationRule = exports.svgORRule = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _semioticMark = require("semiotic-mark");

var _Annotation = require("../Annotation");

var _Annotation2 = _interopRequireDefault(_Annotation);

var _reactAnnotation = require("react-annotation");

var _d3Hierarchy = require("d3-hierarchy");

var _d3Array = require("d3-array");

var _pieceDrawing = require("../svg/pieceDrawing");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var svgORRule = exports.svgORRule = function svgORRule(_ref) {
  var d = _ref.d,
      i = _ref.i,
      screenCoordinates = _ref.screenCoordinates,
      projection = _ref.projection;

  return _react2.default.createElement(
    _semioticMark.Mark,
    {
      markType: "text",
      key: d.label + "annotationtext" + i,
      forceUpdate: true,
      x: screenCoordinates[0] + (projection === "horizontal" ? 10 : 0),
      y: screenCoordinates[1] + (projection === "vertical" ? 10 : 0),
      className: "annotation annotation-or-label " + (d.className || ""),
      textAnchor: "middle"
    },
    d.label
  );
};

var basicReactAnnotationRule = exports.basicReactAnnotationRule = function basicReactAnnotationRule(_ref2) {
  var d = _ref2.d,
      i = _ref2.i,
      screenCoordinates = _ref2.screenCoordinates;

  var noteData = _extends({
    dx: 0,
    dy: 0,
    x: screenCoordinates[0],
    y: screenCoordinates[1],
    note: { label: d.label },
    connector: { end: "arrow" }
  }, d, { type: typeof d.type === "function" ? d.type : undefined });
  return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: noteData });
};

var svgEncloseRule = exports.svgEncloseRule = function svgEncloseRule(_ref3) {
  var d = _ref3.d,
      i = _ref3.i,
      screenCoordinates = _ref3.screenCoordinates;

  var circle = (0, _d3Hierarchy.packEnclose)(screenCoordinates.map(function (p) {
    return { x: p[0], y: p[1], r: 2 };
  }));
  var noteData = _extends({
    dx: 0,
    dy: 0,
    x: circle.x,
    y: circle.y,
    note: { label: d.label },
    connector: { end: "arrow" }
  }, d, {
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
      case "right":
        noteData.dx = circle.r + noteData.rd;
        noteData.dy = 0;
        break;
      default:
        noteData.dx = 0;
        noteData.dy = 0;
    }
  }
  //TODO: Support .ra (setting angle)

  return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: noteData });
};

var svgRRule = exports.svgRRule = function svgRRule(_ref4) {
  var d = _ref4.d,
      i = _ref4.i,
      screenCoordinates = _ref4.screenCoordinates,
      rScale = _ref4.rScale,
      rAccessor = _ref4.rAccessor,
      margin = _ref4.margin,
      adjustedSize = _ref4.adjustedSize,
      adjustedPosition = _ref4.adjustedPosition,
      projection = _ref4.projection;

  var x = void 0,
      y = void 0,
      xPosition = void 0,
      yPosition = void 0,
      subject = void 0,
      dx = void 0,
      dy = void 0;
  if (projection === "radial") {
    return _react2.default.createElement(_Annotation2.default, {
      key: d.key || "annotation-" + i,
      noteData: _extends({
        dx: 50,
        dy: 50,
        note: { label: d.label },
        connector: { end: "arrow" }
      }, d, {
        type: _reactAnnotation.AnnotationCalloutCircle,
        subject: {
          radius: (rScale(rAccessor(d)) - margin.left) / 2,
          radiusPadding: 0
        },
        x: adjustedSize[0] / 2 + margin.left,
        y: adjustedSize[1] / 2 + margin.top
      })
    });
  } else if (projection === "horizontal") {
    dx = 50;
    dy = 50;
    yPosition = d.offset || margin.top + i * 25;
    x = screenCoordinates[0];
    y = yPosition;
    subject = {
      x: x,
      y1: margin.top,
      y2: adjustedSize[1] + adjustedPosition[1] + margin.top
    };
  } else {
    dx = 50;
    dy = -20;
    xPosition = d.offset || margin.left + i * 25;
    y = screenCoordinates[1];
    x = xPosition;
    subject = {
      y: y,
      x1: margin.left,
      x2: adjustedSize[0] + adjustedPosition[0] + margin.left
    };
  }

  var noteData = _extends({
    dx: dx,
    dy: dy,
    note: { label: d.label },
    connector: { end: "arrow" }
  }, d, {
    type: _reactAnnotation.AnnotationXYThreshold,
    x: x,
    y: y,
    subject: subject
  });
  return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: noteData });
};

var htmlFrameHoverRule = exports.htmlFrameHoverRule = function htmlFrameHoverRule(_ref5) {
  var d = _ref5.d,
      i = _ref5.i,
      rAccessor = _ref5.rAccessor,
      oAccessor = _ref5.oAccessor,
      size = _ref5.size,
      projection = _ref5.projection,
      tooltipContent = _ref5.tooltipContent;

  //To string because React gives a DOM error if it gets a date
  var contentFill = void 0;
  if (d.isSummaryData) {
    var summaryLabel = _react2.default.createElement(
      "p",
      { key: "html-annotation-content-2" },
      d.label
    );
    if (d.pieces && d.pieces.length !== 0) {
      if (d.pieces.length === 1) {
        summaryLabel = _react2.default.createElement(
          "p",
          { key: "html-annotation-content-2" },
          rAccessor(d.pieces[0])
        );
      } else {
        var pieceData = (0, _d3Array.extent)(d.pieces.map(rAccessor));
        summaryLabel = _react2.default.createElement(
          "p",
          { key: "html-annotation-content-2" },
          "From ",
          pieceData[0],
          " to ",
          pieceData[1]
        );
      }
    }
    contentFill = [_react2.default.createElement(
      "p",
      { key: "html-annotation-content-1" },
      d.key
    ), summaryLabel, _react2.default.createElement(
      "p",
      { key: "html-annotation-content-3" },
      d.value
    )];
  } else {
    contentFill = [_react2.default.createElement(
      "p",
      { key: "html-annotation-content-1" },
      oAccessor(d).toString()
    ), _react2.default.createElement(
      "p",
      { key: "html-annotation-content-2" },
      rAccessor(d).toString()
    )];
  }
  var content = _react2.default.createElement(
    "div",
    { className: "tooltip-content" },
    contentFill
  );

  if (d.type === "frame-hover" && tooltipContent) {
    content = tooltipContent(d);
  }

  return _react2.default.createElement(
    "div",
    {
      key: "xylabel" + i,
      className: "annotation annotation-or-label tooltip " + projection + " " + (d.className || ""),
      style: {
        position: "absolute",
        bottom: 10 + size[1] - d.y + "px",
        left: d.x + "px"
      }
    },
    content
  );
};

var htmlColumnHoverRule = exports.htmlColumnHoverRule = function htmlColumnHoverRule(_ref6) {
  var d = _ref6.d,
      i = _ref6.i,
      summaryType = _ref6.summaryType,
      oAccessor = _ref6.oAccessor,
      rAccessor = _ref6.rAccessor,
      projectedColumns = _ref6.projectedColumns,
      type = _ref6.type,
      adjustedPosition = _ref6.adjustedPosition,
      adjustedSize = _ref6.adjustedSize,
      margin = _ref6.margin,
      projection = _ref6.projection,
      tooltipContent = _ref6.tooltipContent;

  var maxPiece = (0, _d3Array.max)(d.pieces.map(function (d) {
    return d._orFR;
  }));
  //we need to ignore negative pieces to make sure the hover behavior populates on top of the positive bar
  var sumPiece = (0, _d3Array.sum)(d.pieces.map(function (d) {
    return d._orFR;
  }).filter(function (p) {
    return p > 0;
  }));
  var positionValue = summaryType.type || ["swarm", "point", "clusterbar"].find(function (d) {
    return d === type.type;
  }) ? maxPiece : sumPiece;

  var xPosition = projectedColumns[oAccessor(d.pieces[0])].middle + adjustedPosition[0];
  var yPosition = positionValue;
  yPosition += margin.bottom + margin.top + 10;

  if (projection === "horizontal") {
    yPosition = adjustedSize[1] - projectedColumns[oAccessor(d.pieces[0])].middle + adjustedPosition[0] + margin.top + margin.bottom;
    xPosition = positionValue + adjustedPosition[0] + margin.left;
  } else if (projection === "radial") {
    var _pointOnArcAtAngle = (0, _pieceDrawing.pointOnArcAtAngle)([d.arcAngles.translate[0] - margin.left, d.arcAngles.translate[1] - margin.top], d.arcAngles.midAngle, d.arcAngles.length);

    var _pointOnArcAtAngle2 = _slicedToArray(_pointOnArcAtAngle, 2);

    xPosition = _pointOnArcAtAngle2[0];
    yPosition = _pointOnArcAtAngle2[1];

    yPosition = 10 + adjustedSize[1] - yPosition;
  }

  //To string because React gives a DOM error if it gets a date
  var content = _react2.default.createElement(
    "div",
    { className: "tooltip-content" },
    _react2.default.createElement(
      "p",
      { key: "or-annotation-1" },
      oAccessor(d.pieces[0]).toString()
    ),
    _react2.default.createElement(
      "p",
      { key: "or-annotation-2" },
      sumPiece
    )
  );

  if (d.type === "column-hover" && tooltipContent) {
    content = tooltipContent(d);
  }

  if (d.type === "xy") {
    content = d.label;
  }

  return _react2.default.createElement(
    "div",
    {
      key: "orlabel" + i,
      className: "annotation annotation-or-label tooltip " + projection + " " + (d.className || ""),
      style: {
        position: "absolute",
        bottom: yPosition + "px",
        left: xPosition + "px"
      }
    },
    content
  );
};