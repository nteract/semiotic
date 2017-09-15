"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateMargin = exports.trueAxis = exports.drawMarginPath = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.objectifyType = objectifyType;
exports.generateORFrameEventListeners = generateORFrameEventListeners;
exports.keyAndObjectifyBarData = keyAndObjectifyBarData;
exports.adjustedPositionSize = adjustedPositionSize;
exports.generateFrameTitle = generateFrameTitle;
exports.orFramePieceRenderer = orFramePieceRenderer;
exports.orFrameConnectionRenderer = orFrameConnectionRenderer;
exports.orFrameSummaryRenderer = orFrameSummaryRenderer;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _SvgHelper = require("../svg/SvgHelper");

var _Mark = require("../Mark");

var _Mark2 = _interopRequireDefault(_Mark);

var _pieceDrawing = require("../svg/pieceDrawing");

var _summaryDrawing = require("../svg/summaryDrawing");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var drawMarginPath = exports.drawMarginPath = function drawMarginPath(_ref) {
  var margin = _ref.margin,
      size = _ref.size,
      _ref$inset = _ref.inset,
      inset = _ref$inset === undefined ? 5 : _ref$inset;

  var iSize = [size[0] - inset, size[1] - inset];
  return "M0,0 h" + size[0] + " v" + size[1] + " h-" + size[0] + "Z M" + (margin.left - inset) + "," + (margin.top - inset) + " v" + (size[1] + inset * 2 - margin.top - margin.bottom) + " h" + (iSize[0] + inset * 3 - margin.left - margin.right) + " v-" + (iSize[1] + inset * 3 - margin.top - margin.bottom) + "Z";
};

var trueAxis = exports.trueAxis = function trueAxis(orient, projection) {
  if (projection === "horizontal" && ["top", "bottom"].indexOf(orient) === -1) {
    return "bottom";
  } else if ((!projection || projection === "vertical") && ["left", "right"].indexOf(orient) === -1) {
    return "left";
  } else if (!orient && projection === "horizontal") {
    return "bottom";
  } else if (!orient) {
    return "left";
  }
  return orient;
};

var calculateMargin = exports.calculateMargin = function calculateMargin(_ref2) {
  var margin = _ref2.margin,
      axis = _ref2.axis,
      axes = _ref2.axes,
      title = _ref2.title,
      oLabel = _ref2.oLabel,
      projection = _ref2.projection;

  if (margin) {
    if ((typeof margin === "undefined" ? "undefined" : _typeof(margin)) !== "object") {
      return { top: margin, bottom: margin, left: margin, right: margin };
    }
    return _extends({ top: 0, bottom: 0, left: 0, right: 0 }, margin);
  }
  var finalMargin = { top: 0, bottom: 0, left: 0, right: 0 };
  if (title && title.length !== 0) {
    finalMargin.top = 30;
  }
  var orient = trueAxis(null, projection);
  if (axis && projection !== "radial") {
    orient = trueAxis(axis.orient, projection);
    finalMargin[orient] += 50;
  }
  if (axes) {
    axes.forEach(function (axisObj) {
      orient = axisObj.orient;
      finalMargin[orient] += 50;
    });
  }
  if (oLabel) {
    if (orient === "bottom" || orient === "top") {
      finalMargin.left += 50;
    } else {
      finalMargin.bottom += 50;
    }
  }
  return finalMargin;
};

function objectifyType(type) {
  return (typeof type === "undefined" ? "undefined" : _typeof(type)) === "object" && type !== null ? type : { type: type };
}

function generateORFrameEventListeners(customHoverBehavior, customClickBehavior) {
  var eventListenersGenerator = function eventListenersGenerator() {
    return {};
  };

  if (customHoverBehavior || customClickBehavior) {
    eventListenersGenerator = function eventListenersGenerator(d, i) {
      return {
        onMouseEnter: customHoverBehavior ? function () {
          return customHoverBehavior(d, i);
        } : undefined,
        onMouseLeave: customHoverBehavior ? function () {
          return customHoverBehavior(undefined);
        } : undefined,
        onClick: customClickBehavior ? function () {
          return customClickBehavior(d, i);
        } : undefined
      };
    };
  }
  return eventListenersGenerator;
}

function keyAndObjectifyBarData(_ref3) {
  var data = _ref3.data,
      _ref3$renderKey = _ref3.renderKey,
      renderKey = _ref3$renderKey === undefined ? function (d, i) {
    return i;
  } : _ref3$renderKey;

  return data ? data.map(function (d, i) {
    var appliedKey = renderKey(d, i);
    if ((typeof d === "undefined" ? "undefined" : _typeof(d)) !== "object") {
      return { value: d, renderKey: appliedKey };
    }
    return _extends(d, { renderKey: appliedKey });
  }) : [];
}

function adjustedPositionSize(_ref4) {
  var size = _ref4.size,
      _ref4$position = _ref4.position,
      position = _ref4$position === undefined ? [0, 0] : _ref4$position,
      margin = _ref4.margin,
      axis = _ref4.axis,
      axes = _ref4.axes,
      title = _ref4.title,
      oLabel = _ref4.oLabel,
      projection = _ref4.projection;

  var finalMargin = calculateMargin({
    margin: margin,
    axis: axis,
    axes: axes,
    title: title,
    oLabel: oLabel,
    projection: projection
  });

  var heightAdjust = finalMargin.top + finalMargin.bottom;
  var widthAdjust = finalMargin.left + finalMargin.right;

  var adjustedPosition = [position[0], position[1]];
  var adjustedSize = [size[0] - widthAdjust, size[1] - heightAdjust];

  return { adjustedPosition: adjustedPosition, adjustedSize: adjustedSize };
}

function generateFrameTitle(_ref5) {
  var title = _ref5.title,
      size = _ref5.size;

  var finalTitle = null;
  if (typeof title === "string" && title.length > 0) {
    finalTitle = _react2.default.createElement(
      "text",
      {
        x: size[0] / 2,
        y: 25,
        className: "frame-title",
        style: { textAnchor: "middle", pointerEvents: "none" }
      },
      title
    );
  } else if (title) {
    //assume if defined then its an svg mark of some sort
    finalTitle = title;
  }
  return finalTitle;
}

var pieceRenderHash = {
  swarm: _pieceDrawing.swarmRenderFn,
  bar: _pieceDrawing.barRenderFn,
  clusterbar: _pieceDrawing.clusterBarRenderFn,
  point: _pieceDrawing.pointRenderFn
};

function orFramePieceRenderer(_ref6) {
  var type = _ref6.type,
      data = _ref6.data,
      renderMode = _ref6.renderMode,
      eventListenersGenerator = _ref6.eventListenersGenerator,
      styleFn = _ref6.styleFn,
      projection = _ref6.projection,
      classFn = _ref6.classFn,
      adjustedSize = _ref6.adjustedSize,
      margin = _ref6.margin;

  var pieceRenderFn = null;
  if (typeof type.type === "function") {
    pieceRenderFn = type;
  } else if (pieceRenderHash[type.type]) {
    pieceRenderFn = pieceRenderHash[type.type];
  } else {
    console.error("Invalid piece type: " + type.type + " - Must be a function or one of the following strings: none, " + Object.keys(pieceRenderHash));
    return;
  }
  return pieceRenderFn({
    type: type,
    data: data,
    renderMode: renderMode,
    eventListenersGenerator: eventListenersGenerator,
    styleFn: styleFn,
    projection: projection,
    classFn: classFn,
    adjustedSize: adjustedSize,
    margin: margin
  });
}

function orFrameConnectionRenderer(_ref7) {
  var type = _ref7.type,
      data = _ref7.data,
      renderMode = _ref7.renderMode,
      eventListenersGenerator = _ref7.eventListenersGenerator,
      styleFn = _ref7.styleFn,
      classFn = _ref7.classFn,
      projection = _ref7.projection;

  if (!type.type) {
    return null;
  }
  var renderedConnectorMarks = [];
  if (typeof type.type === "function") {
    var connectionRule = type.type;
    var keys = Object.keys(data);

    keys.forEach(function (key, pieceArrayI) {
      var pieceArray = data[key];
      var nextColumn = data[keys[pieceArrayI + 1]];
      if (nextColumn) {
        var matchArray = nextColumn.map(function (d, i) {
          return connectionRule(d.piece, i);
        });
        pieceArray.forEach(function (piece, pieceI) {
          var matchingPieceIndex = matchArray.indexOf(connectionRule(piece.piece, pieceI));
          if (matchingPieceIndex !== -1) {
            var matchingPiece = nextColumn[matchingPieceIndex];
            var markD = void 0;
            var xy = piece.xy;
            var mxy = matchingPiece.xy;
            var x = xy.x,
                y = xy.y,
                _xy$height = xy.height,
                height = _xy$height === undefined ? 1 : _xy$height,
                _xy$width = xy.width,
                width = _xy$width === undefined ? 1 : _xy$width;
            var mx = mxy.x,
                my = mxy.y,
                _mxy$height = mxy.height,
                mheight = _mxy$height === undefined ? 1 : _mxy$height,
                _mxy$width = mxy.width,
                mwidth = _mxy$width === undefined ? 1 : _mxy$width;

            if (projection === "vertical") {
              markD = (0, _SvgHelper.drawAreaConnector)({
                x1: x + width,
                x2: mx,
                y1: y,
                y2: my,
                sizeX1: 0,
                sizeX2: 0,
                sizeY1: height,
                sizeY2: mheight
              });
            } else if (projection === "horizontal") {
              markD = (0, _SvgHelper.drawAreaConnector)({
                x1: x,
                x2: mx,
                y1: y + height,
                y2: my,
                sizeX1: width,
                sizeX2: mwidth,
                sizeY1: 0,
                sizeY2: 0
              });
            } else if (projection === "radial") {
              markD = (0, _SvgHelper.drawAreaConnector)({
                x1: x,
                x2: mx,
                y1: y + height,
                y2: my,
                sizeX1: width,
                sizeX2: mwidth,
                sizeY1: 0,
                sizeY2: 0
              });
            }
            var renderValue = renderMode && renderMode(piece.piece, pieceI);

            var calculatedStyle = styleFn({
              source: piece.piece,
              target: matchingPiece.piece
            });

            var eventListeners = eventListenersGenerator({ source: piece.piece, target: matchingPiece.piece }, pieceI);

            renderedConnectorMarks.push(_react2.default.createElement(_Mark2.default, _extends({}, eventListeners, {
              renderMode: renderValue,
              markType: "path",
              d: markD,
              className: classFn ? classFn(piece.piece, pieceI) : "",
              key: "connector" + piece.piece.renderKey,
              style: calculatedStyle
            })));
          }
        });
      }
    });
  } else if (type.type) {
    console.error("Invalid connectorType - Must be a function that takes a data point and determines if it is connected to a data point in the next column");
  }
  return renderedConnectorMarks;
}

var summaryRenderHash = {
  contour: _summaryDrawing.contourRenderFn,
  boxplot: _summaryDrawing.boxplotRenderFn,
  violin: _summaryDrawing.bucketizedRenderingFn,
  heatmap: _summaryDrawing.bucketizedRenderingFn,
  joy: _summaryDrawing.bucketizedRenderingFn,
  histogram: _summaryDrawing.bucketizedRenderingFn
};

function orFrameSummaryRenderer(_ref8) {
  var data = _ref8.data,
      type = _ref8.type,
      renderMode = _ref8.renderMode,
      eventListenersGenerator = _ref8.eventListenersGenerator,
      styleFn = _ref8.styleFn,
      classFn = _ref8.classFn,
      positionFn = _ref8.positionFn,
      projection = _ref8.projection,
      adjustedSize = _ref8.adjustedSize,
      margin = _ref8.margin,
      chartSize = _ref8.chartSize;

  var summaryRenderFn = void 0;
  if (typeof type.type === "function") {
    summaryRenderFn = type.type;
  } else if (summaryRenderHash[type.type]) {
    summaryRenderFn = summaryRenderHash[type.type];
  } else {
    console.error("Invalid summary type: " + type.type + " - Must be a function or one of the following strings: " + Object.keys(summaryRenderHash));
    return;
  }
  return summaryRenderFn({
    data: data,
    type: type,
    renderMode: renderMode,
    eventListenersGenerator: eventListenersGenerator,
    styleFn: styleFn,
    classFn: classFn,
    positionFn: positionFn,
    projection: projection,
    adjustedSize: adjustedSize,
    margin: margin,
    chartSize: chartSize
  });
}