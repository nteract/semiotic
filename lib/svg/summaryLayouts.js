"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderLaidOutSummaries = exports.drawSummaries = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.boxplotRenderFn = boxplotRenderFn;
exports.contourRenderFn = contourRenderFn;
exports.bucketizedRenderingFn = bucketizedRenderingFn;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _Axis = require("../Axis");

var _Axis2 = _interopRequireDefault(_Axis);

var _semioticMark = require("semiotic-mark");

var _areaDrawing = require("../svg/areaDrawing");

var _d3Array = require("d3-array");

var _SvgHelper = require("../svg/SvgHelper");

var _d3Shape = require("d3-shape");

var _pieceDrawing = require("./pieceDrawing");

var _frameFunctions = require("./frameFunctions");

var _d3Scale = require("d3-scale");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var contourMap = function contourMap(d) {
  return [d.xy.x, d.xy.y];
};

var verticalXYSorting = function verticalXYSorting(a, b) {
  return a.xy.y - b.xy.y;
};
var horizontalXYSorting = function horizontalXYSorting(a, b) {
  return b.xy.x - a.xy.x;
};
var emptyObjectReturnFn = function emptyObjectReturnFn() {
  return {};
};

function boxplotRenderFn(_ref) {
  var data = _ref.data,
      type = _ref.type,
      renderMode = _ref.renderMode,
      eventListenersGenerator = _ref.eventListenersGenerator,
      styleFn = _ref.styleFn,
      classFn = _ref.classFn,
      _ref$positionFn = _ref.positionFn,
      positionFn = _ref$positionFn === undefined ? function (position) {
    return position;
  } : _ref$positionFn,
      projection = _ref.projection,
      adjustedSize = _ref.adjustedSize,
      margin = _ref.margin,
      chartSize = _ref.chartSize;

  var summaryElementStylingFn = type.elementStyleFn || emptyObjectReturnFn;

  var keys = Object.keys(data);
  var renderedSummaryMarks = [];
  var summaryXYCoords = [];
  keys.forEach(function (key, summaryI) {
    var summary = data[key];
    var eventListeners = eventListenersGenerator(summary, summaryI);

    var columnWidth = summary.width;

    var thisSummaryData = summary.pieceData;

    var calculatedSummaryStyle = styleFn(thisSummaryData[0], summaryI);
    var calculatedSummaryClass = classFn(thisSummaryData[0], summaryI);

    var summaryPositionNest = void 0,
        summaryValueNest = void 0,
        translate = void 0,
        extentlineX1 = void 0,
        extentlineX2 = void 0,
        extentlineY1 = void 0,
        extentlineY2 = void 0,
        topLineX1 = void 0,
        topLineX2 = void 0,
        midLineX1 = void 0,
        midLineX2 = void 0,
        bottomLineX1 = void 0,
        bottomLineX2 = void 0,
        rectTopWidth = void 0,
        rectTopHeight = void 0,
        rectTopY = void 0,
        rectTopX = void 0,
        rectBottomWidth = void 0,
        rectBottomHeight = void 0,
        rectBottomY = void 0,
        rectBottomX = void 0,
        rectWholeWidth = void 0,
        rectWholeHeight = void 0,
        rectWholeY = void 0,
        rectWholeX = void 0,
        topLineY1 = void 0,
        topLineY2 = void 0,
        bottomLineY1 = void 0,
        bottomLineY2 = void 0,
        midLineY1 = void 0,
        midLineY2 = void 0;

    var renderValue = renderMode ? renderMode(summary, summaryI) : undefined;

    summaryValueNest = thisSummaryData.map(function (p) {
      return p._orFV;
    }).sort(function (a, b) {
      return a - b;
    });

    summaryValueNest = [(0, _d3Array.quantile)(summaryValueNest, 0.0), (0, _d3Array.quantile)(summaryValueNest, 0.25), (0, _d3Array.quantile)(summaryValueNest, 0.5), (0, _d3Array.quantile)(summaryValueNest, 0.75), (0, _d3Array.quantile)(summaryValueNest, 1.0)];

    if (projection === "vertical") {
      summaryPositionNest = thisSummaryData.map(function (p) {
        return chartSize - p._orFR;
      }).sort(function (a, b) {
        return b - a;
      });

      summaryPositionNest = [(0, _d3Array.quantile)(summaryPositionNest, 0.0), (0, _d3Array.quantile)(summaryPositionNest, 0.25), (0, _d3Array.quantile)(summaryPositionNest, 0.5), (0, _d3Array.quantile)(summaryPositionNest, 0.75), (0, _d3Array.quantile)(summaryPositionNest, 1.0)];

      var xPosition = positionFn(summary.middle, key, summaryI);

      translate = "translate(" + xPosition + "," + margin.top + ")";
      extentlineX1 = 0;
      extentlineX2 = 0;
      extentlineY1 = summaryPositionNest[0];
      extentlineY2 = summaryPositionNest[4];
      topLineX1 = -columnWidth / 2;
      topLineX2 = columnWidth / 2;
      midLineX1 = -columnWidth / 2;
      midLineX2 = columnWidth / 2;
      bottomLineX1 = -columnWidth / 2;
      bottomLineX2 = columnWidth / 2;
      rectBottomWidth = columnWidth;
      rectBottomHeight = summaryPositionNest[1] - summaryPositionNest[2];
      rectBottomY = summaryPositionNest[2];
      rectBottomX = -columnWidth / 2;
      rectTopWidth = columnWidth;
      rectTopHeight = summaryPositionNest[2] - summaryPositionNest[3];
      rectWholeWidth = columnWidth;
      rectWholeHeight = summaryPositionNest[1] - summaryPositionNest[3];
      rectWholeY = summaryPositionNest[3];
      rectWholeX = -columnWidth / 2;
      rectTopY = summaryPositionNest[3];
      rectTopX = -columnWidth / 2;
      topLineY1 = summaryPositionNest[0];
      topLineY2 = summaryPositionNest[0];
      bottomLineY1 = summaryPositionNest[4];
      bottomLineY2 = summaryPositionNest[4];
      midLineY1 = summaryPositionNest[2];
      midLineY2 = summaryPositionNest[2];

      summaryXYCoords.push({
        label: "Maximum",
        key: key,
        summaryPieceName: "max",
        x: xPosition,
        y: summaryPositionNest[4] + margin.top,
        value: summaryValueNest[4]
      }, {
        label: "3rd Quartile",
        key: key,
        summaryPieceName: "q3area",
        x: xPosition,
        y: summaryPositionNest[3] + margin.top,
        value: summaryValueNest[3]
      }, {
        label: "Median",
        key: key,
        summaryPieceName: "median",
        x: xPosition,
        y: summaryPositionNest[2] + margin.top,
        value: summaryValueNest[2]
      }, {
        label: "1st Quartile",
        key: key,
        summaryPieceName: "q1area",
        x: xPosition,
        y: summaryPositionNest[1] + margin.top,
        value: summaryValueNest[1]
      }, {
        label: "Minimum",
        key: key,
        summaryPieceName: "min",
        x: xPosition,
        y: summaryPositionNest[0] + margin.top,
        value: summaryValueNest[0]
      });
    } else if (projection === "horizontal") {
      summaryPositionNest = thisSummaryData.map(function (p) {
        return p._orFR;
      }).sort(function (a, b) {
        return a - b;
      });

      summaryPositionNest = [(0, _d3Array.quantile)(summaryPositionNest, 0.0), (0, _d3Array.quantile)(summaryPositionNest, 0.25), (0, _d3Array.quantile)(summaryPositionNest, 0.5), (0, _d3Array.quantile)(summaryPositionNest, 0.75), (0, _d3Array.quantile)(summaryPositionNest, 1.0)];

      var yPosition = positionFn(summary.middle, key, summaryI);

      translate = "translate(0," + yPosition + ")";
      extentlineY1 = 0;
      extentlineY2 = 0;
      extentlineX1 = summaryPositionNest[0];
      extentlineX2 = summaryPositionNest[4];
      topLineY1 = -columnWidth / 2;
      topLineY2 = columnWidth / 2;
      midLineY1 = -columnWidth / 2;
      midLineY2 = columnWidth / 2;
      bottomLineY1 = -columnWidth / 2;
      bottomLineY2 = columnWidth / 2;
      rectTopHeight = columnWidth;
      rectTopWidth = summaryPositionNest[3] - summaryPositionNest[2];
      rectTopX = summaryPositionNest[2];
      rectTopY = -columnWidth / 2;
      rectBottomHeight = columnWidth;
      rectBottomWidth = summaryPositionNest[2] - summaryPositionNest[1];
      rectBottomX = summaryPositionNest[1];
      rectBottomY = -columnWidth / 2;
      rectWholeHeight = columnWidth;
      rectWholeWidth = summaryPositionNest[3] - summaryPositionNest[1];
      rectWholeX = summaryPositionNest[1];
      rectWholeY = -columnWidth / 2;
      topLineX1 = summaryPositionNest[0];
      topLineX2 = summaryPositionNest[0];
      bottomLineX1 = summaryPositionNest[4];
      bottomLineX2 = summaryPositionNest[4];
      midLineX1 = summaryPositionNest[2];
      midLineX2 = summaryPositionNest[2];

      summaryXYCoords.push({
        label: "Maximum",
        key: key,
        summaryPieceName: "max",
        x: summaryPositionNest[4],
        y: yPosition,
        value: summaryValueNest[4]
      }, {
        label: "3rd Quartile",
        key: key,
        summaryPieceName: "q3area",
        x: summaryPositionNest[3],
        y: yPosition,
        value: summaryValueNest[3]
      }, {
        label: "Median",
        key: key,
        summaryPieceName: "median",
        x: summaryPositionNest[2],
        y: yPosition,
        value: summaryValueNest[2]
      }, {
        label: "1st Quartile",
        key: key,
        summaryPieceName: "q1area",
        x: summaryPositionNest[1],
        y: yPosition,
        value: summaryValueNest[1]
      }, {
        label: "Minimum",
        key: key,
        summaryPieceName: "min",
        x: summaryPositionNest[0],
        y: yPosition,
        value: summaryValueNest[0]
      });
    }

    if (projection === "radial") {
      summaryPositionNest = thisSummaryData.map(function (p) {
        return p._orFR - margin.left;
      }).sort(function (a, b) {
        return a - b;
      });

      summaryPositionNest = [(0, _d3Array.quantile)(summaryPositionNest, 0.0), (0, _d3Array.quantile)(summaryPositionNest, 0.25), (0, _d3Array.quantile)(summaryPositionNest, 0.5), (0, _d3Array.quantile)(summaryPositionNest, 0.75), (0, _d3Array.quantile)(summaryPositionNest, 1.0)];

      extentlineX1 = 0;
      extentlineX2 = 0;
      extentlineY1 = summaryPositionNest[0];
      extentlineY2 = summaryPositionNest[4];
      topLineX1 = -columnWidth / 2;
      topLineX2 = columnWidth / 2;
      midLineX1 = -columnWidth / 2;
      midLineX2 = columnWidth / 2;
      bottomLineX1 = -columnWidth / 2;
      bottomLineX2 = columnWidth / 2;
      rectTopWidth = columnWidth;
      rectTopHeight = summaryPositionNest[1] - summaryPositionNest[3];
      rectTopY = summaryPositionNest[3];
      rectTopX = -columnWidth / 2;
      rectBottomWidth = columnWidth;
      rectBottomHeight = summaryPositionNest[1] - summaryPositionNest[3];
      rectBottomY = summaryPositionNest[3];
      rectBottomX = -columnWidth / 2;
      topLineY1 = summaryPositionNest[0];
      topLineY2 = summaryPositionNest[0];
      bottomLineY1 = summaryPositionNest[4];
      bottomLineY2 = summaryPositionNest[4];
      midLineY1 = summaryPositionNest[2];
      midLineY2 = summaryPositionNest[2];

      var twoPI = Math.PI * 2;

      var bottomLineArcGenerator = (0, _d3Shape.arc)().innerRadius(bottomLineY1 / 2).outerRadius(bottomLineY1 / 2);
      //        .padAngle(summary.pct_padding * twoPI);

      var topLineArcGenerator = (0, _d3Shape.arc)().innerRadius(topLineY1 / 2).outerRadius(topLineY1 / 2);
      //        .padAngle(summary.pct_padding * twoPI);

      var midLineArcGenerator = (0, _d3Shape.arc)().innerRadius(midLineY1 / 2).outerRadius(midLineY1 / 2);
      //        .padAngle(summary.pct_padding * twoPI);

      var bodyArcTopGenerator = (0, _d3Shape.arc)().innerRadius(summaryPositionNest[1] / 2).outerRadius(midLineY1 / 2);
      //        .padAngle(summary.pct_padding * twoPI);

      var bodyArcBottomGenerator = (0, _d3Shape.arc)().innerRadius(midLineY1 / 2).outerRadius(summaryPositionNest[3] / 2);
      //        .padAngle(summary.pct_padding * twoPI);

      var bodyArcWholeGenerator = (0, _d3Shape.arc)().innerRadius(summaryPositionNest[1] / 2).outerRadius(summaryPositionNest[3] / 2);
      //        .padAngle(summary.pct_padding * twoPI);

      var startAngle = summary.pct_start + summary.pct_padding / 2;
      var endAngle = summary.pct + summary.pct_start - summary.pct_padding / 2;
      var midAngle = summary.pct / 2 + summary.pct_start;
      startAngle *= twoPI;
      endAngle *= twoPI;

      var radialAdjustX = adjustedSize[0] / 2 + margin.left;

      var radialAdjustY = adjustedSize[1] / 2 + margin.top;

      //        const bottomPoint = bottomLineArcGenerator.centroid({ startAngle, endAngle })
      //        const topPoint = topLineArcGenerator.centroid({ startAngle, endAngle })
      var bottomPoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle, summaryPositionNest[4] / 2);
      var topPoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle, summaryPositionNest[0] / 2);
      var thirdPoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle, summaryPositionNest[3] / 2);
      var midPoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle, summaryPositionNest[2] / 2);
      var firstPoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle, summaryPositionNest[1] / 2);

      summaryXYCoords.push({
        label: "Minimum",
        key: key,
        summaryPieceName: "min",
        x: topPoint[0] + radialAdjustX,
        y: topPoint[1] + radialAdjustY,
        value: summaryValueNest[0]
      }, {
        label: "1st Quartile",
        key: key,
        summaryPieceName: "q3area",
        x: firstPoint[0] + radialAdjustX,
        y: firstPoint[1] + radialAdjustY,
        value: summaryValueNest[1]
      }, {
        label: "Median",
        key: key,
        summaryPieceName: "median",
        x: midPoint[0] + radialAdjustX,
        y: midPoint[1] + radialAdjustY,
        value: summaryValueNest[2]
      }, {
        label: "3rd Quartile",
        key: key,
        summaryPieceName: "q1area",
        x: thirdPoint[0] + radialAdjustX,
        y: thirdPoint[1] + radialAdjustY,
        value: summaryValueNest[3]
      }, {
        label: "Maximum",
        key: key,
        summaryPieceName: "max",
        x: bottomPoint[0] + radialAdjustX,
        y: bottomPoint[1] + radialAdjustY,
        value: summaryValueNest[4]
      });
      translate = "translate(" + radialAdjustX + "," + radialAdjustY + ")";

      renderedSummaryMarks.push(_react2.default.createElement(
        "g",
        _extends({}, eventListeners, {
          className: calculatedSummaryClass,
          transform: translate,
          key: "summaryPiece-" + summaryI
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "line",
          x1: bottomPoint[0],
          x2: topPoint[0],
          y1: bottomPoint[1],
          y2: topPoint[1],
          style: _extends({ strokeWidth: 2 }, calculatedSummaryStyle, summaryElementStylingFn("whisker"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "path",
          d: topLineArcGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({ strokeWidth: 4 }, calculatedSummaryStyle, { fill: "none" }, summaryElementStylingFn("max"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "path",
          d: midLineArcGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({ strokeWidth: 4 }, calculatedSummaryStyle, { fill: "none" }, summaryElementStylingFn("median"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "path",
          d: bottomLineArcGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({ strokeWidth: 4 }, calculatedSummaryStyle, { fill: "none" }, summaryElementStylingFn("min"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "path",
          d: bodyArcWholeGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({ strokeWidth: 4 }, calculatedSummaryStyle, summaryElementStylingFn("iqrarea"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "path",
          d: bodyArcTopGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({}, calculatedSummaryStyle, { fill: "none", stroke: "none" }, summaryElementStylingFn("q3area"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "path",
          d: bodyArcBottomGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({}, calculatedSummaryStyle, { fill: "none", stroke: "none" }, summaryElementStylingFn("q1area"))
        })
      ));
    } else {
      renderedSummaryMarks.push(_react2.default.createElement(
        "g",
        _extends({}, eventListeners, {
          className: calculatedSummaryClass,
          transform: translate,
          key: "summaryPiece-" + summaryI
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "line",
          x1: extentlineX1,
          x2: extentlineX2,
          y1: extentlineY1,
          y2: extentlineY2,
          style: _extends({ strokeWidth: "2px" }, calculatedSummaryStyle, summaryElementStylingFn("whisker"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "line",
          x1: topLineX1,
          x2: topLineX2,
          y1: topLineY1,
          y2: topLineY2,
          style: _extends({ strokeWidth: "2px" }, calculatedSummaryStyle, summaryElementStylingFn("min"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "line",
          x1: bottomLineX1,
          x2: bottomLineX2,
          y1: bottomLineY1,
          y2: bottomLineY2,
          style: _extends({ strokeWidth: "2px" }, calculatedSummaryStyle, summaryElementStylingFn("max"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "rect",
          x: rectWholeX,
          width: rectWholeWidth,
          y: rectWholeY,
          height: rectWholeHeight,
          style: _extends({ strokeWidth: "1px" }, calculatedSummaryStyle, summaryElementStylingFn("iqrarea"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "rect",
          x: rectTopX,
          width: rectTopWidth,
          y: rectTopY,
          height: rectTopHeight,
          style: _extends({}, calculatedSummaryStyle, { fill: "none", stroke: "none" }, summaryElementStylingFn("q3area"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "rect",
          x: rectBottomX,
          width: rectBottomWidth,
          y: rectBottomY,
          height: rectBottomHeight,
          style: _extends({}, calculatedSummaryStyle, { fill: "none", stroke: "none" }, summaryElementStylingFn("q1area"))
        }),
        _react2.default.createElement(_semioticMark.Mark, {
          renderMode: renderValue,
          markType: "line",
          x1: midLineX1,
          x2: midLineX2,
          y1: midLineY1,
          y2: midLineY2,
          style: _extends({ strokeWidth: "2px" }, calculatedSummaryStyle, summaryElementStylingFn("median"))
        })
      ));
    }
  });

  return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords };
}

function contourRenderFn(_ref2) {
  var data = _ref2.data,
      type = _ref2.type,
      renderMode = _ref2.renderMode,
      eventListenersGenerator = _ref2.eventListenersGenerator,
      styleFn = _ref2.styleFn,
      classFn = _ref2.classFn,
      projection = _ref2.projection,
      adjustedSize = _ref2.adjustedSize,
      margin = _ref2.margin,
      chartSize = _ref2.chartSize;

  var keys = Object.keys(data);
  var renderedSummaryMarks = [];
  var summaryXYCoords = [];

  keys.forEach(function (key, ordsetI) {
    var ordset = data[key];
    var renderValue = renderMode && renderMode(ordset, ordsetI);
    type.thresholds = type.thresholds || 8;
    type.bandwidth = type.bandwidth || 12;
    type.resolution = type.resolution || 1000;

    var projectedOrd = [{ id: ordset, _xyfCoordinates: ordset.xyData.map(contourMap) }];

    var oContours = (0, _areaDrawing.contouring)({
      areaType: type,
      data: projectedOrd,
      projectedX: "x",
      projectedY: "y",
      finalXExtent: [0, adjustedSize[0]],
      finalYExtent: [0, adjustedSize[1]]
    });
    var contourMarks = [];
    oContours.forEach(function (d, i) {
      d.coordinates.forEach(function (coords, ii) {
        var eventListeners = eventListenersGenerator(d, i);
        contourMarks.push(_react2.default.createElement(_semioticMark.Mark, _extends({}, eventListeners, {
          renderMode: renderValue,
          simpleInterpolate: true,
          key: i + "-" + ii,
          style: styleFn(ordset.pieceData[0], ordsetI),
          markType: "path",
          d: "M" + d.coordinates[0].map(function (p) {
            return p.join(",");
          }).join("L") + "Z"
        })));
      });
    });

    renderedSummaryMarks.push(_react2.default.createElement(
      "g",
      { key: "contour-container-" + ordsetI },
      contourMarks
    ));
  });
  return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords };
}

function axisGenerator(axisProps, i, axisScale) {
  return _react2.default.createElement(_Axis2.default, {
    label: axisProps.label,
    key: axisProps.key || "orframe-summary-axis-" + i,
    orient: axisProps.orient,
    size: axisProps.size,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    ticks: axisProps.ticks,
    tickSize: axisProps.tickSize,
    tickFormat: axisProps.tickFormat,
    tickValues: axisProps.tickValues,
    format: axisProps.format,
    rotate: axisProps.rotate,
    scale: axisScale,
    className: axisProps.className,
    name: axisProps.name
  });
}

function bucketizedRenderingFn(_ref3) {
  var data = _ref3.data,
      type = _ref3.type,
      renderMode = _ref3.renderMode,
      eventListenersGenerator = _ref3.eventListenersGenerator,
      styleFn = _ref3.styleFn,
      classFn = _ref3.classFn,
      projection = _ref3.projection,
      adjustedSize = _ref3.adjustedSize,
      margin = _ref3.margin,
      chartSize = _ref3.chartSize;

  var renderedSummaryMarks = [];
  var summaryXYCoords = [];

  var buckets = type.bins || 25;
  var summaryValueAccessor = type.binValue || function (d) {
    return d.length;
  };
  var axisCreator = void 0;
  if (type.axis) {
    type.axis.orient = projection === "horizontal" && ["left", "right"].indexOf(type.axis.orient) === -1 ? "left" : type.axis.orient;
    type.axis.orient = projection === "vertical" && ["bottom", "top"].indexOf(type.axis.orient) === -1 ? "bottom" : type.axis.orient;
    axisCreator = axisGenerator;
    if (projection === "radial") {
      console.error("Summary axes cannot be drawn for radial histograms");
      axisCreator = function axisCreator() {
        return null;
      };
    }
  }

  var bucketSize = chartSize / buckets;

  var keys = Object.keys(data);
  var binMax = 0;
  var calculatedBins = keys.map(function (key, summaryI) {
    var summary = data[key];

    var thisSummaryData = summary.xyData;

    var xySorting = projection === "vertical" ? verticalXYSorting : horizontalXYSorting;

    var summaryPositionNest = thisSummaryData.sort(xySorting);

    var violinHist = (0, _d3Array.histogram)();
    var binDomain = projection === "vertical" ? [margin.top, chartSize] : [margin.left, chartSize + margin.left];
    var binOffset = projection === "vertical" ? binDomain[0] : 0;
    var binBuckets = [];

    for (var x = 0; x < buckets; x++) {
      binBuckets.push(binDomain[0] + x / buckets * (chartSize - binOffset));
    }
    //    binBuckets.push(binDomain[1]);

    var xyValue = projection === "vertical" ? function (p) {
      return p.xy.y;
    } : function (p) {
      return p.piece._orFR;
    };

    var calculatedBins = violinHist.domain(binDomain).thresholds(binBuckets).value(xyValue)(summaryPositionNest);

    calculatedBins = calculatedBins.map(function (d) {
      return {
        y: d.x0,
        y1: d.x1 - d.x0,
        pieces: d,
        value: summaryValueAccessor(d.map(function (p) {
          return p.piece;
        }))
      };
    }).filter(function (d) {
      return d.value !== 0;
    });

    binMax = Math.max(binMax, (0, _d3Array.max)(calculatedBins.map(function (d) {
      return d.value;
    })));
    return { bins: calculatedBins, summary: summary, summaryI: summaryI, thisSummaryData: thisSummaryData };
  });
  calculatedBins.forEach(function (_ref4) {
    var bins = _ref4.bins,
        summary = _ref4.summary,
        summaryI = _ref4.summaryI,
        thisSummaryData = _ref4.thisSummaryData;

    var eventListeners = eventListenersGenerator(summary, summaryI);
    var columnWidth = summary.width;
    var renderValue = renderMode && renderMode(summary, summaryI);

    var calculatedSummaryStyle = styleFn(thisSummaryData[0].piece, summaryI);
    var calculatedSummaryClass = classFn(thisSummaryData[0].piece, summaryI);

    var translate = [summary.middle, 0];
    if (projection === "horizontal") {
      translate = [bucketSize, summary.middle];
    } else if (projection === "radial") {
      translate = [adjustedSize[0] / 2 + margin.left, adjustedSize[1] / 2 + margin.top];
    }

    if (type.type === "heatmap" || type.type === "histogram") {
      var mappedBars = (0, _SvgHelper.groupBarMark)({
        bins: bins,
        binMax: binMax,
        columnWidth: columnWidth,
        bucketSize: bucketSize,
        projection: projection,
        adjustedSize: adjustedSize,
        chartSize: chartSize,
        summaryI: summaryI,
        data: data,
        summary: summary,
        renderValue: renderValue,
        summaryStyle: calculatedSummaryStyle,
        type: type,
        margin: margin
      });
      var tiles = mappedBars.marks;
      if (projection === "radial") {
        translate = [margin.left, margin.top];
      }

      if (type.axis && type.type === "histogram") {
        var axisTranslate = "translate(" + summary.x + "," + margin.top + ")";
        var axisDomain = [0, binMax];
        if (projection === "horizontal") {
          axisTranslate = "translate(" + (bucketSize + margin.left) + "," + summary.x + ")";
          axisDomain = [binMax, 0];
        } else if (projection === "radial") {
          axisTranslate = "translate(" + margin.left + "," + margin.top + ")";
        }

        var axisWidth = projection === "horizontal" ? adjustedSize[0] : columnWidth;
        var axisHeight = projection === "vertical" ? adjustedSize[1] - margin.top : columnWidth;
        type.axis.size = [axisWidth, axisHeight];
        var axisScale = (0, _d3Scale.scaleLinear)().domain(axisDomain).range([0, columnWidth]);
        var renderedSummaryAxis = axisCreator(type.axis, summaryI, axisScale);

        renderedSummaryMarks.push(_react2.default.createElement(
          "g",
          {
            className: "summary-axis",
            key: "summaryPiece-axis-" + summaryI,
            transform: axisTranslate
          },
          renderedSummaryAxis
        ));
      }
      mappedBars.points.forEach(function (d) {
        d.x += translate[0];
        d.y += translate[1];
      });

      summaryXYCoords.push.apply(summaryXYCoords, _toConsumableArray(mappedBars.points));
      renderedSummaryMarks.push(_react2.default.createElement(
        "g",
        _extends({}, eventListeners, {
          transform: "translate(" + translate + ")",
          key: "summaryPiece-" + summaryI
        }),
        tiles
      ));
    } else if (type.type === "violin") {
      bins[0].y = bins[0].y - bucketSize / 2;
      bins[bins.length - 1].y = bins[bins.length - 1].y + bucketSize / 2;
      var violinArea = (0, _d3Shape.area)().curve(type.curve || _d3Shape.curveCatmullRom);

      var violinPoints = [];

      if (projection === "horizontal") {
        violinArea.x(function (d) {
          return d.x;
        }).y0(function (d) {
          return d.y0;
        }).y1(function (d) {
          return d.y1;
        });

        bins.forEach(function (summaryPoint) {
          var xValue = summaryPoint.y - bucketSize / 2;
          var yValue = summaryPoint.value / binMax * columnWidth / 2;

          violinPoints.push({
            x: xValue,
            y0: -yValue,
            y1: yValue
          });
          summaryXYCoords.push({
            key: summary.name,
            x: xValue + translate[0],
            y: yValue + translate[1],
            pieces: summaryPoint.pieces.map(function (d) {
              return d.piece;
            }),
            value: summaryPoint.value
          });
        });
      } else if (projection === "vertical") {
        violinArea.y(function (d) {
          return d.y;
        }).x0(function (d) {
          return d.x0;
        }).x1(function (d) {
          return d.x1;
        });

        bins.forEach(function (summaryPoint) {
          var yValue = summaryPoint.y + bucketSize / 2;
          var xValue = summaryPoint.value / binMax * columnWidth / 2;

          violinPoints.push({
            y: yValue,
            x0: -xValue,
            x1: xValue
          });

          summaryXYCoords.push({
            key: summary.name,
            x: xValue + translate[0],
            y: yValue + translate[1],
            pieces: summaryPoint.pieces.map(function (d) {
              return d.piece;
            }),
            value: summaryPoint.value
          });
        });
      } else if (projection === "radial") {
        var angle = summary.pct - summary.pct_padding / 2;
        var midAngle = summary.pct_middle;
        violinPoints = bins;
        violinArea = function violinArea(inbins) {
          var forward = [];
          var backward = [];
          inbins.forEach(function (bin) {
            var outsidePoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle + angle * bin.value / binMax / 2, (bin.y + bin.y1 - margin.left - bucketSize / 2) / 2);
            var insidePoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle - angle * bin.value / binMax / 2, (bin.y + bin.y1 - margin.left - bucketSize / 2) / 2);

            //Ugh a terrible side effect has appeared
            summaryXYCoords.push({
              key: summary.name,
              x: insidePoint[0] + translate[0],
              y: insidePoint[1] + translate[1],
              pieces: bin.pieces.map(function (d) {
                return d.piece;
              }),
              value: bin.value
            });
            summaryXYCoords.push({
              key: summary.name,
              x: outsidePoint[0] + translate[0],
              y: outsidePoint[1] + translate[1],
              pieces: bin.pieces.map(function (d) {
                return d.piece;
              }),
              value: bin.value
            });

            forward.push(outsidePoint);
            backward.push(insidePoint);
          });
          return "M" + forward.map(function (d) {
            return d.join(",");
          }).join("L") + "L" + backward.reverse().map(function (d) {
            return d.join(",");
          }).join("L") + "Z";
        };
      }

      renderedSummaryMarks.push(_react2.default.createElement(_semioticMark.Mark, _extends({
        transform: "translate(" + translate + ")",
        key: "summaryPiece-" + summaryI
      }, eventListeners, {
        renderMode: renderValue,
        markType: "path",
        className: calculatedSummaryClass,
        style: calculatedSummaryStyle,
        d: violinArea(violinPoints)
      })));
    } else if (type.type === "joy") {
      var zeroedStart = _extends({}, bins[0], { value: 0 });
      var zeroedEnd = _extends({}, bins[bins.length - 1], { value: 0 });
      //Joy plots need to visually signify the zero baseline with their start and end position

      zeroedStart.y = zeroedStart.y - bucketSize / 2;
      zeroedEnd.y = zeroedEnd.y + bucketSize / 2;

      var joyBins = [zeroedStart].concat(_toConsumableArray(bins), [zeroedEnd]);
      var joyPoints = [];

      var joyArea = (0, _d3Shape.line)().curve(type.curve || _d3Shape.curveCatmullRom).x(function (d) {
        return d.x;
      }).y(function (d) {
        return d.y;
      });

      var joyHeight = type.amplitude || 0;

      if (projection === "horizontal") {
        joyBins.forEach(function (summaryPoint, i) {
          var xValue = summaryPoint.y;
          var yValue = -summaryPoint.value / binMax * (columnWidth + joyHeight) + columnWidth / 2;

          joyPoints.push({
            y: yValue,
            x: xValue
          });

          //Don't make an interaction point for the first or last
          if (i !== 0 && i !== joyBins.length - 1) {
            summaryXYCoords.push({
              key: summary.name,
              x: xValue + translate[0],
              y: yValue + translate[1],
              pieces: summaryPoint.pieces.map(function (d) {
                return d.piece;
              }),
              value: summaryPoint.value
            });
          }
        });
      } else if (projection === "vertical") {
        joyBins.forEach(function (summaryPoint) {
          var yValue = summaryPoint.y;
          var xValue = -summaryPoint.value / binMax * (columnWidth + joyHeight) + columnWidth / 2;

          joyPoints.push({
            y: yValue,
            x: xValue
          });

          summaryXYCoords.push({
            key: summary.name,
            x: xValue + translate[0],
            y: yValue + translate[1],
            pieces: summaryPoint.pieces.map(function (d) {
              return d.piece;
            }),
            value: summaryPoint.value
          });
        });
      } else if (projection === "radial") {
        var _angle = summary.pct - summary.pct_padding / 2;
        var _midAngle = summary.pct_start + summary.pct_padding / 2;

        translate = [margin.left, margin.top];
        joyPoints = joyBins;
        joyArea = function joyArea(inbins) {
          var forward = [];
          inbins.forEach(function (bin) {
            var outsidePoint = (0, _pieceDrawing.pointOnArcAtAngle)([adjustedSize[0] / 2, adjustedSize[1] / 2], _midAngle + _angle * bin.value / binMax, (bin.y + bin.y1 - margin.left - bucketSize / 2) / 2);
            //Ugh a terrible side effect has appeared
            summaryXYCoords.push({
              key: summary.name,
              x: outsidePoint[0] + translate[0],
              y: outsidePoint[1] + translate[1],
              pieces: bin.pieces.map(function (d) {
                return d.piece;
              }),
              value: bin.value
            });

            forward.push(outsidePoint);
          });
          return "M" + forward.map(function (d) {
            return d.join(",");
          }).join("L") + "Z";
        };
      }

      renderedSummaryMarks.push(_react2.default.createElement(_semioticMark.Mark, _extends({
        transform: "translate(" + translate + ")",
        key: "summaryPiece-" + summaryI
      }, eventListeners, {
        renderMode: renderValue,
        markType: "path",
        className: calculatedSummaryClass,
        style: calculatedSummaryStyle,
        d: joyArea(joyPoints)
      })));
    }
  });

  return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords };
}

var drawSummaries = exports.drawSummaries = function drawSummaries(_ref5) {
  var data = _ref5.data,
      type = _ref5.type,
      renderMode = _ref5.renderMode,
      eventListenersGenerator = _ref5.eventListenersGenerator,
      styleFn = _ref5.styleFn,
      classFn = _ref5.classFn,
      positionFn = _ref5.positionFn,
      projection = _ref5.projection,
      adjustedSize = _ref5.adjustedSize,
      margin = _ref5.margin;

  if (!type || !type.type) return;
  type = typeof type === "string" ? { type: type } : type;
  var chartSize = projection === "vertical" ? adjustedSize[1] : adjustedSize[0];
  return (0, _frameFunctions.orFrameSummaryRenderer)({
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
};

var renderLaidOutSummaries = exports.renderLaidOutSummaries = function renderLaidOutSummaries(_ref6) {
  var data = _ref6.data;

  return data;
};