"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.groupBarMark = exports.hexToRgb = exports.wrap = exports.drawAreaConnector = undefined;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Selection = require("d3-selection");

var _d3Shape = require("d3-shape");

var _semioticMark = require("semiotic-mark");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var twoPI = Math.PI * 2;

var drawAreaConnector = exports.drawAreaConnector = function drawAreaConnector(_ref) {
  var x1 = _ref.x1,
      x2 = _ref.x2,
      y1 = _ref.y1,
      y2 = _ref.y2,
      sizeX1 = _ref.sizeX1,
      sizeY1 = _ref.sizeY1,
      sizeX2 = _ref.sizeX2,
      sizeY2 = _ref.sizeY2;

  return "M" + x1 + "," + y1 + "L" + x2 + "," + y2 + "L" + (x2 + sizeX2) + "," + (y2 + sizeY2) + "L" + (x1 + sizeX1) + "," + (y1 + sizeY1) + "Z";
};

var wrap = exports.wrap = function wrap(text, width) {
  text.each(function () {
    var textNode = (0, _d3Selection.select)(this),
        words = textNode.text().split(/\s+/).reverse(),
        lineHeight = 1.1,
        // ems
    y = textNode.attr("y"),
        dy = parseFloat(textNode.attr("dy"));

    var word = void 0,
        line = [],
        lineNumber = 0,
        tspan = textNode.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

    while (words.length > 0) {
      word = words.pop();
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];

        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
};

var hexToRgb = exports.hexToRgb = function hexToRgb(hex) {
  if (hex.substr(0, 1).toLowerCase() === "r") {
    return hex.split("(")[1].split(")")[0].split(",");
  }
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
};

var groupBarMark = exports.groupBarMark = function groupBarMark(_ref2) {
  var bins = _ref2.bins,
      binMax = _ref2.binMax,
      columnWidth = _ref2.columnWidth,
      projection = _ref2.projection,
      adjustedSize = _ref2.adjustedSize,
      chartSize = _ref2.chartSize,
      summaryI = _ref2.summaryI,
      data = _ref2.data,
      summary = _ref2.summary,
      renderValue = _ref2.renderValue,
      summaryStyle = _ref2.summaryStyle,
      type = _ref2.type,
      margin = _ref2.margin;

  var xProp = -columnWidth / 2;

  var mappedBins = [];
  var mappedPoints = [];

  bins.forEach(function (d, i) {
    var opacity = d.value / binMax;
    var finalStyle = type.type === "heatmap" ? { opacity: opacity, fill: summaryStyle.fill } : summaryStyle;
    var finalColumnWidth = type.type === "heatmap" ? columnWidth : columnWidth * opacity;
    var yProp = d.y;
    var height = d.y1;
    var width = finalColumnWidth;
    var xOffset = type.type === "heatmap" ? finalColumnWidth / 2 : finalColumnWidth;
    var yOffset = d.y1 / 2;

    if (projection === "horizontal") {
      yProp = type.type === "heatmap" ? -columnWidth / 2 : columnWidth / 2 - finalColumnWidth;
      xProp = d.y - d.y1;
      height = finalColumnWidth;
      width = d.y1;
      yOffset = type.type === "heatmap" ? finalColumnWidth / 2 : finalColumnWidth;
      xOffset = d.y1 / 2;
    } else if (projection === "radial") {
      var arcGenerator = (0, _d3Shape.arc)().innerRadius((d.y - margin.left) / 2).outerRadius((d.y + d.y1 - margin.left) / 2);

      var angle = summary.pct - summary.pct_padding;
      var startAngle = summary.pct_middle - summary.pct_padding;

      var endAngle = type.type === "heatmap" ? startAngle + angle : startAngle + angle * opacity;
      startAngle *= twoPI;
      endAngle *= twoPI;

      var arcAdjustX = adjustedSize[0] / 2;
      var arcAdjustY = adjustedSize[1] / 2;

      var arcTranslate = "translate(" + arcAdjustX + "," + arcAdjustY + ")";
      var arcCenter = arcGenerator.centroid({ startAngle: startAngle, endAngle: endAngle });
      mappedPoints.push({
        key: summary.name,
        value: d.value,
        pieces: d.pieces.map(function (d) {
          return d.piece;
        }),
        label: "Heatmap",
        x: arcCenter[0] + arcAdjustX,
        y: arcCenter[1] + arcAdjustY
      });
      mappedBins.push(_react2.default.createElement(_semioticMark.Mark, {
        markType: "path",
        transform: arcTranslate,
        renderMode: renderValue,
        key: "groupIcon-" + summaryI + "-" + i,
        d: arcGenerator({ startAngle: startAngle, endAngle: endAngle }),
        style: finalStyle
      }));
    }
    if (projection !== "radial") {
      mappedPoints.push({
        key: summary.name,
        value: d.value,
        pieces: d.pieces.map(function (d) {
          return d.piece;
        }),
        label: "Heatmap",
        x: xProp + xOffset,
        y: yProp + yOffset
      });

      mappedBins.push(_react2.default.createElement(_semioticMark.Mark, {
        markType: "rect",
        renderMode: renderValue,
        key: "groupIcon-" + summaryI + "-" + i,
        x: xProp,
        y: yProp,
        height: height,
        width: width,
        style: finalStyle
      }));
    }
  });

  return { marks: mappedBins, points: mappedPoints };
};