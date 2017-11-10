"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.orFrameAxisGenerator = exports.calculateMargin = exports.trueAxis = exports.drawMarginPath = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.objectifyType = objectifyType;
exports.generateORFrameEventListeners = generateORFrameEventListeners;
exports.keyAndObjectifyBarData = keyAndObjectifyBarData;
exports.adjustedPositionSize = adjustedPositionSize;
exports.generateFrameTitle = generateFrameTitle;
exports.orFrameConnectionRenderer = orFrameConnectionRenderer;
exports.orFrameSummaryRenderer = orFrameSummaryRenderer;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _SvgHelper = require("../svg/SvgHelper");

var _semioticMark = require("semiotic-mark");

var _Axis = require("../Axis");

var _Axis2 = _interopRequireDefault(_Axis);

var _summaryLayouts = require("./summaryLayouts");

var _axis = require("../visualizationLayerBehavior/axis");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function roundToTenth(number) {
  return Math.round(number * 10) / 10;
}

var circlePath = function circlePath(cx, cy, r) {
  return ["M", roundToTenth(cx - r), roundToTenth(cy), "a", r, r, 0, 1, 0, r * 2, 0, "a", r, r, 0, 1, 0, -(r * 2), 0].join(" ") + "Z";
};

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
    var tempMargin = void 0;
    if ((typeof margin === "undefined" ? "undefined" : _typeof(margin)) !== "object") {
      tempMargin = { top: margin, bottom: margin, left: margin, right: margin };
    }
    tempMargin = _extends({ top: 0, bottom: 0, left: 0, right: 0 }, margin);

    return tempMargin;
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
  if (oLabel && projection !== "radial") {
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
  var _ref4$size = _ref4.size,
      size = _ref4$size === undefined ? [500, 500] : _ref4$size,
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
  if (projection === "radial") {
    var minSize = Math.min(adjustedSize[0], adjustedSize[1]);
    adjustedSize = [minSize, minSize];
  }

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

function orFrameConnectionRenderer(_ref6) {
  var type = _ref6.type,
      data = _ref6.data,
      renderMode = _ref6.renderMode,
      eventListenersGenerator = _ref6.eventListenersGenerator,
      styleFn = _ref6.styleFn,
      classFn = _ref6.classFn,
      projection = _ref6.projection;

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
          var thisConnectionPiece = connectionRule(piece.piece, pieceI);
          var matchingPieceIndex = matchArray.indexOf(connectionRule(piece.piece, pieceI));
          if (thisConnectionPiece !== undefined && thisConnectionPiece !== null && matchingPieceIndex !== -1) {
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

            renderedConnectorMarks.push(_react2.default.createElement(_semioticMark.Mark, _extends({}, eventListeners, {
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
  contour: _summaryLayouts.contourRenderFn,
  boxplot: _summaryLayouts.boxplotRenderFn,
  violin: _summaryLayouts.bucketizedRenderingFn,
  heatmap: _summaryLayouts.bucketizedRenderingFn,
  joy: _summaryLayouts.bucketizedRenderingFn,
  histogram: _summaryLayouts.bucketizedRenderingFn
};

function orFrameSummaryRenderer(_ref7) {
  var data = _ref7.data,
      type = _ref7.type,
      renderMode = _ref7.renderMode,
      eventListenersGenerator = _ref7.eventListenersGenerator,
      styleFn = _ref7.styleFn,
      classFn = _ref7.classFn,
      positionFn = _ref7.positionFn,
      projection = _ref7.projection,
      adjustedSize = _ref7.adjustedSize,
      margin = _ref7.margin,
      chartSize = _ref7.chartSize;

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

var orFrameAxisGenerator = exports.orFrameAxisGenerator = function orFrameAxisGenerator(_ref8) {
  var projection = _ref8.projection,
      axis = _ref8.axis,
      adjustedSize = _ref8.adjustedSize,
      size = _ref8.size,
      rScale = _ref8.rScale,
      rScaleType = _ref8.rScaleType,
      margin = _ref8.margin,
      pieceType = _ref8.pieceType,
      rExtent = _ref8.rExtent,
      data = _ref8.data;

  var generatedAxis = void 0,
      axesTickLines = void 0;
  if (projection !== "radial" && axis) {
    axesTickLines = [];
    var axisPosition = [0, 0];
    var axes = Array.isArray(axis) ? axis : [axis];
    generatedAxis = axes.map(function (d, i) {
      var tickValues = void 0;
      var axisScale = rScaleType().domain(rScale.domain());

      var orient = trueAxis(d.orient, projection);

      if (orient === "right") {
        axisScale.range([rScale.range()[1], rScale.range()[0]]);
      } else if (orient === "left") {
        axisPosition = [margin.left, 0];
        axisScale.range([rScale.range()[1], rScale.range()[0]]);
      } else if (orient === "top") {
        axisScale.range(rScale.range());
      } else if (orient === "bottom") {
        axisPosition = [0, margin.top];
        axisScale.range(rScale.range());
      }

      if (d.tickValues && Array.isArray(d.tickValues)) {
        tickValues = d.tickValues;
      } else if (d.tickValues) {
        //otherwise assume a function
        tickValues = d.tickValues(data, size, rScale);
      }

      var axisParts = (0, _axis.axisPieces)({
        padding: d.padding,
        tickValues: tickValues,
        scale: axisScale,
        ticks: d.ticks,
        orient: orient,
        size: adjustedSize,
        margin: margin,
        footer: d.footer
      });
      var axisTickLines = (0, _axis.axisLines)({ axisParts: axisParts, orient: orient });
      axesTickLines.push(axisTickLines);

      return _react2.default.createElement(_Axis2.default, {
        label: d.label,
        axisParts: axisParts,
        key: d.key || "orframe-axis-" + i,
        orient: orient,
        size: adjustedSize,
        margin: margin,
        position: axisPosition,
        ticks: d.ticks,
        tickSize: d.tickSize,
        tickFormat: d.tickFormat,
        tickValues: tickValues,
        format: d.format,
        rotate: d.rotate,
        scale: axisScale,
        className: d.className,
        name: d.name
      });
    });
  } else if (projection === "radial" && axis) {
    var _pieceType$innerRadiu = pieceType.innerRadius,
        innerRadius = _pieceType$innerRadiu === undefined ? 0 : _pieceType$innerRadiu;
    var _axis$tickValues = axis.tickValues,
        tickValues = _axis$tickValues === undefined ? rScale.ticks(Math.max(2, (adjustedSize[0] / 2 - innerRadius) / 50)) : _axis$tickValues,
        label = axis.label,
        _axis$tickFormat = axis.tickFormat,
        tickFormat = _axis$tickFormat === undefined ? function (d) {
      return d;
    } : _axis$tickFormat;


    var tickScale = rScaleType().domain(rExtent).range([innerRadius, adjustedSize[0] / 2]);
    var ticks = tickValues.map(function (t, i) {
      var tickSize = tickScale(t);
      if (!(innerRadius === 0 && t === 0)) {
        var axisLabel = void 0;
        var ref = "";
        if (label && i === tickValues.length - 1) {
          var labelSettings = typeof label === "string" ? { name: label } : label;
          var _labelSettings$locati = labelSettings.locationDistance,
              locationDistance = _labelSettings$locati === undefined ? 15 : _labelSettings$locati;

          ref = Math.random().toString() + " ";
          axisLabel = _react2.default.createElement(
            "g",
            {
              className: "axis-label",
              transform: "translate(0," + locationDistance + ")"
            },
            _react2.default.createElement(
              "text",
              { textAnchor: "middle" },
              _react2.default.createElement(
                "textPath",
                {
                  startOffset: tickSize * Math.PI * 0.5,
                  xlinkHref: "#" + ref
                },
                label.name
              )
            )
          );
        }
        return _react2.default.createElement(
          "g",
          {
            key: "orframe-radial-axis-element-" + t,
            className: "axis axis-label axis-tick",
            transform: "translate(" + margin.left + ",0)"
          },
          _react2.default.createElement("path", {
            id: ref,
            d: circlePath(0, 0, tickSize),
            r: tickSize,
            stroke: "gray",
            fill: "none"
          }),
          _react2.default.createElement(
            "text",
            { y: -tickSize + 5, textAnchor: "middle" },
            tickFormat(t)
          ),
          axisLabel
        );
      }
      return null;
    });
    generatedAxis = _react2.default.createElement(
      "g",
      {
        key: axis.key || "orframe-radial-axis-container",
        transform: "translate(" + adjustedSize[0] / 2 + "," + (adjustedSize[1] / 2 + margin.top) + ")"
      },
      ticks
    );
  }
  return { axis: generatedAxis, axesTickLines: axesTickLines };
};