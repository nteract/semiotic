"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.drawSummaries = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.boxplotRenderFn = boxplotRenderFn;
exports.contourRenderFn = contourRenderFn;
exports.bucketizedRenderingFn = bucketizedRenderingFn;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _Mark = require("../Mark");

var _Mark2 = _interopRequireDefault(_Mark);

var _areaDrawing = require("../svg/areaDrawing");

var _d3Array = require("d3-array");

var _SvgHelper = require("../svg/SvgHelper");

var _d3Shape = require("d3-shape");

var _pieceDrawing = require("./pieceDrawing");

var _frameFunctions = require("./frameFunctions");

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

  var keys = Object.keys(data);
  var renderedSummaryMarks = [];
  keys.forEach(function (key, summaryI) {
    var summary = data[key];
    var eventListeners = eventListenersGenerator(summary, summaryI);

    var columnWidth = summary.width;

    var thisSummaryData = summary.pieceData;

    var calculatedSummaryStyle = styleFn(thisSummaryData[0], summaryI);
    var calculatedSummaryClass = classFn(thisSummaryData[0], summaryI);

    var summaryDataNest = void 0,
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
        rectWidth = void 0,
        rectHeight = void 0,
        rectY = void 0,
        rectX = void 0,
        topLineY1 = void 0,
        topLineY2 = void 0,
        bottomLineY1 = void 0,
        bottomLineY2 = void 0,
        midLineY1 = void 0,
        midLineY2 = void 0;

    var renderValue = renderMode ? renderMode(summary, summaryI) : undefined;

    if (projection === "vertical") {
      summaryDataNest = thisSummaryData.map(function (p) {
        return chartSize - p._orFR;
      }).sort(function (a, b) {
        return b - a;
      });

      summaryDataNest = [(0, _d3Array.quantile)(summaryDataNest, 0.0), (0, _d3Array.quantile)(summaryDataNest, 0.25), (0, _d3Array.quantile)(summaryDataNest, 0.5), (0, _d3Array.quantile)(summaryDataNest, 0.75), (0, _d3Array.quantile)(summaryDataNest, 1.0)];

      var xPosition = positionFn(summary.middle, key, summaryI);

      translate = "translate(" + xPosition + "," + margin.top + ")";
      extentlineX1 = 0;
      extentlineX2 = 0;
      extentlineY1 = summaryDataNest[0];
      extentlineY2 = summaryDataNest[4];
      topLineX1 = -columnWidth / 2;
      topLineX2 = columnWidth / 2;
      midLineX1 = -columnWidth / 2;
      midLineX2 = columnWidth / 2;
      bottomLineX1 = -columnWidth / 2;
      bottomLineX2 = columnWidth / 2;
      rectWidth = columnWidth;
      rectHeight = summaryDataNest[1] - summaryDataNest[3];
      rectY = summaryDataNest[3];
      rectX = -columnWidth / 2;
      topLineY1 = summaryDataNest[0];
      topLineY2 = summaryDataNest[0];
      bottomLineY1 = summaryDataNest[4];
      bottomLineY2 = summaryDataNest[4];
      midLineY1 = summaryDataNest[2];
      midLineY2 = summaryDataNest[2];
    } else if (projection === "horizontal") {
      summaryDataNest = thisSummaryData.map(function (p) {
        return p._orFR;
      }).sort(function (a, b) {
        return a - b;
      });

      summaryDataNest = [(0, _d3Array.quantile)(summaryDataNest, 0.0), (0, _d3Array.quantile)(summaryDataNest, 0.25), (0, _d3Array.quantile)(summaryDataNest, 0.5), (0, _d3Array.quantile)(summaryDataNest, 0.75), (0, _d3Array.quantile)(summaryDataNest, 1.0)];

      var yPosition = positionFn(summary.middle, key, summaryI);

      translate = "translate(0," + yPosition + ")";
      extentlineY1 = 0;
      extentlineY2 = 0;
      extentlineX1 = summaryDataNest[0];
      extentlineX2 = summaryDataNest[4];
      topLineY1 = -columnWidth / 2;
      topLineY2 = columnWidth / 2;
      midLineY1 = -columnWidth / 2;
      midLineY2 = columnWidth / 2;
      bottomLineY1 = -columnWidth / 2;
      bottomLineY2 = columnWidth / 2;
      rectHeight = columnWidth;
      rectWidth = summaryDataNest[3] - summaryDataNest[1];
      rectX = summaryDataNest[1];
      rectY = -columnWidth / 2;
      topLineX1 = summaryDataNest[0];
      topLineX2 = summaryDataNest[0];
      bottomLineX1 = summaryDataNest[4];
      bottomLineX2 = summaryDataNest[4];
      midLineX1 = summaryDataNest[2];
      midLineX2 = summaryDataNest[2];
    }

    if (projection === "radial") {
      summaryDataNest = thisSummaryData.map(function (p) {
        return p._orFR - margin.left;
      }).sort(function (a, b) {
        return a - b;
      });

      summaryDataNest = [(0, _d3Array.quantile)(summaryDataNest, 0.0), (0, _d3Array.quantile)(summaryDataNest, 0.25), (0, _d3Array.quantile)(summaryDataNest, 0.5), (0, _d3Array.quantile)(summaryDataNest, 0.75), (0, _d3Array.quantile)(summaryDataNest, 1.0)];

      extentlineX1 = 0;
      extentlineX2 = 0;
      extentlineY1 = summaryDataNest[0];
      extentlineY2 = summaryDataNest[4];
      topLineX1 = -columnWidth / 2;
      topLineX2 = columnWidth / 2;
      midLineX1 = -columnWidth / 2;
      midLineX2 = columnWidth / 2;
      bottomLineX1 = -columnWidth / 2;
      bottomLineX2 = columnWidth / 2;
      rectWidth = columnWidth;
      rectHeight = summaryDataNest[1] - summaryDataNest[3];
      rectY = summaryDataNest[3];
      rectX = -columnWidth / 2;
      topLineY1 = summaryDataNest[0];
      topLineY2 = summaryDataNest[0];
      bottomLineY1 = summaryDataNest[4];
      bottomLineY2 = summaryDataNest[4];
      midLineY1 = summaryDataNest[2];
      midLineY2 = summaryDataNest[2];

      var twoPI = Math.PI * 2;

      var bottomLineArcGenerator = (0, _d3Shape.arc)().innerRadius(bottomLineY1 / 2).outerRadius(bottomLineY1 / 2).padAngle(summary.pct_padding * twoPI);

      var topLineArcGenerator = (0, _d3Shape.arc)().innerRadius(topLineY1 / 2).outerRadius(topLineY1 / 2).padAngle(summary.pct_padding * twoPI);

      var midLineArcGenerator = (0, _d3Shape.arc)().innerRadius(midLineY1 / 2).outerRadius(midLineY1 / 2).padAngle(summary.pct_padding * twoPI);

      var bodyArcGenerator = (0, _d3Shape.arc)().innerRadius(summaryDataNest[1] / 2).outerRadius(summaryDataNest[3] / 2).padAngle(summary.pct_padding * twoPI);

      var startAngle = summary.pct_start;
      var endAngle = summary.pct + summary.pct_start;
      var midAngle = summary.pct / 2 + summary.pct_start;

      startAngle *= twoPI;
      endAngle *= twoPI;

      //        const bottomPoint = bottomLineArcGenerator.centroid({ startAngle, endAngle })
      //        const topPoint = topLineArcGenerator.centroid({ startAngle, endAngle })
      var bottomPoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle, summaryDataNest[4] / 2);
      var topPoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle, summaryDataNest[0] / 2);

      translate = "translate(" + (adjustedSize[0] / 2 + margin.left) + "," + (adjustedSize[1] / 2 + margin.top) + ")";

      renderedSummaryMarks.push(_react2.default.createElement(
        "g",
        _extends({}, eventListeners, {
          className: calculatedSummaryClass,
          transform: translate,
          key: "summaryPiece-" + summaryI
        }),
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "path",
          d: topLineArcGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({ strokeWidth: 4 }, calculatedSummaryStyle, {
            fill: "none"
          })
        }),
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "path",
          d: midLineArcGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({ strokeWidth: 4 }, calculatedSummaryStyle, {
            fill: "none"
          })
        }),
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "path",
          d: bottomLineArcGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({ strokeWidth: 4 }, calculatedSummaryStyle, {
            fill: "none"
          })
        }),
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "path",
          d: bodyArcGenerator({ startAngle: startAngle, endAngle: endAngle }),
          style: _extends({ strokeWidth: 4 }, calculatedSummaryStyle)
        }),
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "line",
          x1: bottomPoint[0],
          x2: topPoint[0],
          y1: bottomPoint[1],
          y2: topPoint[1],
          style: _extends({ strokeWidth: 2 }, calculatedSummaryStyle)
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
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "line",
          x1: extentlineX1,
          x2: extentlineX2,
          y1: extentlineY1,
          y2: extentlineY2,
          style: _extends({ strokeWidth: "2px" }, calculatedSummaryStyle)
        }),
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "line",
          x1: topLineX1,
          x2: topLineX2,
          y1: topLineY1,
          y2: topLineY2,
          style: _extends({ strokeWidth: "2px" }, calculatedSummaryStyle)
        }),
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "line",
          x1: bottomLineX1,
          x2: bottomLineX2,
          y1: bottomLineY1,
          y2: bottomLineY2,
          style: _extends({ strokeWidth: "2px" }, calculatedSummaryStyle)
        }),
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "line",
          x1: midLineX1,
          x2: midLineX2,
          y1: midLineY1,
          y2: midLineY2,
          style: _extends({ strokeWidth: "4px" }, calculatedSummaryStyle)
        }),
        _react2.default.createElement(_Mark2.default, {
          renderMode: renderValue,
          markType: "rect",
          x: rectX,
          width: rectWidth,
          y: rectY,
          height: rectHeight,
          style: _extends({ strokeWidth: "1px" }, calculatedSummaryStyle)
        })
      ));
    }
  });

  return renderedSummaryMarks;
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
        contourMarks.push(_react2.default.createElement(_Mark2.default, _extends({}, eventListeners, {
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
  return renderedSummaryMarks;
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

  var buckets = type.bins || 25;
  var summaryValueAccessor = type.binValue || function (d) {
    return d.length;
  };

  var bucketSize = chartSize / buckets;

  var keys = Object.keys(data);
  keys.forEach(function (key, summaryI) {
    var summary = data[key];
    var eventListeners = eventListenersGenerator(summary, summaryI);

    var renderValue = renderMode && renderMode(summary, summaryI);
    var thisSummaryData = summary.xyData;
    var columnWidth = summary.width;

    var calculatedSummaryStyle = styleFn(thisSummaryData[0].piece, summaryI);
    var calculatedSummaryClass = classFn(thisSummaryData[0].piece, summaryI);
    var xySorting = projection === "vertical" ? verticalXYSorting : horizontalXYSorting;

    var summaryDataNest = thisSummaryData.sort(xySorting);

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

    var bins = violinHist.domain(binDomain).thresholds(binBuckets).value(xyValue)(summaryDataNest);

    bins = bins.map(function (d) {
      return {
        y: d.x0,
        y1: d.x1 - d.x0,
        value: summaryValueAccessor(d.map(function (p) {
          return p.piece;
        }))
      };
    }).filter(function (d) {
      return d.value !== 0;
    });

    var binMax = (0, _d3Array.max)(bins.map(function (d) {
      return d.value;
    }));

    var translate = "translate(" + summary.middle + ",0)";
    if (projection === "horizontal") {
      translate = "translate(" + bucketSize + "," + summary.middle + ")";
    }

    if (type.type === "heatmap" || type.type === "histogram") {
      var tiles = bins.map(function (d, i) {
        return (0, _SvgHelper.groupBarMark)({
          d: d,
          i: i,
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
      });
      if (projection === "radial") {
        translate = "translate(" + margin.left + "," + margin.top + ")";
      }

      renderedSummaryMarks.push(_react2.default.createElement(
        "g",
        _extends({}, eventListeners, {
          transform: translate,
          key: "summaryPiece-" + summaryI
        }),
        tiles
      ));
    } else if (type.type === "violin") {
      bins[0].y = bins[0].y - bucketSize / 2;
      bins[bins.length - 1].y = bins[bins.length - 1].y + bucketSize / 2;
      var violinArea = (0, _d3Shape.area)().curve(type.curve || _d3Shape.curveCatmullRom);

      if (projection === "horizontal") {
        violinArea.x(function (summaryPoint) {
          return summaryPoint.y - bucketSize / 2;
        }).y0(function (summaryPoint) {
          return -summaryPoint.value / binMax * columnWidth / 2;
        }).y1(function (summaryPoint) {
          return summaryPoint.value / binMax * columnWidth / 2;
        });
      } else if (projection === "vertical") {
        violinArea.y(function (summaryPoint) {
          return summaryPoint.y + bucketSize / 2;
        }).x0(function (summaryPoint) {
          return -summaryPoint.value / binMax * columnWidth / 2;
        }).x1(function (summaryPoint) {
          return summaryPoint.value / binMax * columnWidth / 2;
        });
      } else if (projection === "radial") {
        var angle = summary.pct - summary.pct_padding / 2;
        var midAngle = summary.pct_middle;

        translate = "translate(" + (adjustedSize[0] / 2 + margin.left) + "," + (adjustedSize[1] / 2 + margin.top) + ")";

        violinArea = function violinArea(inbins) {
          var forward = [];
          var backward = [];
          inbins.forEach(function (bin) {
            var outsidePoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle + angle * bin.value / binMax / 2, (bin.y + bin.y1 - margin.left - bucketSize / 2) / 2);
            var insidePoint = (0, _pieceDrawing.pointOnArcAtAngle)([0, 0], midAngle - angle * bin.value / binMax / 2, (bin.y + bin.y1 - margin.left - bucketSize / 2) / 2);

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

      renderedSummaryMarks.push(_react2.default.createElement(_Mark2.default, _extends({
        transform: translate,
        key: "summaryPiece-" + summaryI
      }, eventListeners, {
        renderMode: renderValue,
        markType: "path",
        className: calculatedSummaryClass,
        style: calculatedSummaryStyle,
        d: violinArea(bins)
      })));
    } else if (type.type === "joy") {
      var zeroedStart = _extends({}, bins[0], { value: 0 });
      var zeroedEnd = _extends({}, bins[bins.length - 1], { value: 0 });
      //Joy plots need to visually signify the zero baseline with their start and end position

      zeroedStart.y = zeroedStart.y - bucketSize / 2;
      zeroedEnd.y = zeroedEnd.y + bucketSize / 2;

      var joyBins = [zeroedStart].concat(_toConsumableArray(bins), [zeroedEnd]);

      var joyArea = (0, _d3Shape.line)().curve(type.curve || _d3Shape.curveCatmullRom);

      var joyHeight = type.amplitude || 0;

      if (projection === "horizontal") {
        joyArea.x(function (summaryPoint) {
          return summaryPoint.y;
        }).y(function (summaryPoint) {
          return -summaryPoint.value / binMax * (columnWidth + joyHeight) + columnWidth / 2;
        });
      } else if (projection === "vertical") {
        joyArea.y(function (summaryPoint) {
          return summaryPoint.y;
        }).x(function (summaryPoint) {
          return -summaryPoint.value / binMax * (columnWidth + joyHeight) + columnWidth / 2;
        });
      } else if (projection === "radial") {
        var _angle = summary.pct - summary.pct_padding / 2;
        var _midAngle = summary.pct_start + summary.pct_padding / 2;

        translate = "translate(" + margin.left + "," + margin.top + ")";

        joyArea = function joyArea(inbins) {
          var forward = [];
          inbins.forEach(function (bin) {
            var outsidePoint = (0, _pieceDrawing.pointOnArcAtAngle)([adjustedSize[0] / 2, adjustedSize[1] / 2], _midAngle + _angle * bin.value / binMax, (bin.y + bin.y1 - margin.left - bucketSize / 2) / 2);

            forward.push(outsidePoint);
          });
          return "M" + forward.map(function (d) {
            return d.join(",");
          }).join("L") + "Z";
        };
      }

      renderedSummaryMarks.push(_react2.default.createElement(
        "g",
        { transform: translate, key: "summaryPiece-" + summaryI },
        _react2.default.createElement(_Mark2.default, _extends({}, eventListeners, {
          renderMode: renderValue,
          markType: "path",
          className: calculatedSummaryClass,
          style: calculatedSummaryStyle,
          d: joyArea(joyBins)
        }))
      ));
    }
  });

  return renderedSummaryMarks;
}

var drawSummaries = exports.drawSummaries = function drawSummaries(_ref4) {
  var data = _ref4.data,
      type = _ref4.type,
      renderMode = _ref4.renderMode,
      eventListenersGenerator = _ref4.eventListenersGenerator,
      styleFn = _ref4.styleFn,
      classFn = _ref4.classFn,
      positionFn = _ref4.positionFn,
      projection = _ref4.projection,
      adjustedSize = _ref4.adjustedSize,
      margin = _ref4.margin;

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