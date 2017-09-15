"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.pointOnArcAtAngle = pointOnArcAtAngle;
exports.clusterBarLayout = clusterBarLayout;
exports.barLayout = barLayout;
exports.pointLayout = pointLayout;
exports.swarmLayout = swarmLayout;

var _d3Force = require("d3-force");

var _d3Shape = require("d3-shape");

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var twoPI = Math.PI * 2;

function pointOnArcAtAngle(center, angle, distance) {
  var radians = Math.PI * (angle + 0.75) * 2;

  var xPosition = center[0] + distance * Math.cos(radians);
  var yPosition = center[1] + distance * Math.sin(radians);

  return [xPosition, yPosition];
}

function clusterBarLayout(_ref) {
  var type = _ref.type,
      data = _ref.data,
      renderMode = _ref.renderMode,
      eventListenersGenerator = _ref.eventListenersGenerator,
      styleFn = _ref.styleFn,
      projection = _ref.projection,
      classFn = _ref.classFn,
      adjustedSize = _ref.adjustedSize,
      margin = _ref.margin;

  var allCalculatedPieces = [];
  var keys = Object.keys(data);
  keys.forEach(function (key, ordsetI) {
    var ordset = data[key];

    var barColumnWidth = ordset.width;
    var clusterWidth = barColumnWidth / ordset.pieceData.length;

    var currentX = 0;
    var currentY = 0;

    var calculatedPieces = ordset.pieceData.map(function (piece, i) {
      var renderValue = renderMode && renderMode(piece, i);

      var xPosition = piece._orFX;
      var yPosition = piece._orFRBase;
      var finalWidth = clusterWidth;
      var finalHeight = piece._orFR;

      if (!piece.negative) {
        yPosition -= piece._orFR;
      }

      if (projection === "horizontal") {
        //TODO: NEGATIVE FOR HORIZONTAL
        yPosition = piece._orFX;
        xPosition = piece._orFRBase;
        finalHeight = clusterWidth;
        finalWidth = piece._orFR;
        if (piece.negative) {
          xPosition -= piece._orFR;
        }
      }

      var markD = void 0,
          translate = void 0,
          markProps = {};

      if (projection === "radial") {
        //TODO: Make clustered radial bars work
        var arcGenerator = (0, _d3Shape.arc)().innerRadius(0).outerRadius(piece._orFR / 2);

        var angle = ordset.pct / ordset.pieceData.length;
        var startAngle = ordset.pct_start + i / ordset.pieceData.length * ordset.pct;
        var endAngle = startAngle + angle;

        markD = arcGenerator({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        var xOffset = adjustedSize[0] / 2 + margin.left;
        var yOffset = adjustedSize[1] / 2 + margin.top;
        translate = "translate(" + xOffset + "," + yOffset + ")";

        var centroid = arcGenerator.centroid({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        finalHeight = undefined;
        finalWidth = undefined;
        xPosition = centroid[0] + xOffset;
        yPosition = centroid[1] + yOffset;

        markProps = { markType: "path", d: markD };
      } else {
        xPosition += currentX;
        yPosition += currentY;
        markProps = {
          markType: "rect",
          x: xPosition,
          y: yPosition,
          width: finalWidth,
          height: finalHeight,
          rx: 0,
          ry: 0
        };
      }

      var eventListeners = eventListenersGenerator(piece, i);

      var calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition,
          middle: clusterWidth / 2,
          height: finalHeight,
          width: finalWidth
        },
        piece: piece,
        renderElement: _extends({
          className: classFn(piece, i),
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          transform: translate,
          style: styleFn(piece, ordsetI)
        }, markProps, eventListeners)
      };
      if (projection === "horizontal") {
        currentY += finalHeight;
      } else {
        currentX += finalWidth;
      }

      //        currentOffset += pieceSize
      return calculatedPiece;
    });
    allCalculatedPieces = [].concat(_toConsumableArray(allCalculatedPieces), _toConsumableArray(calculatedPieces));
  });
  return allCalculatedPieces;
}

function barLayout(_ref2) {
  var type = _ref2.type,
      data = _ref2.data,
      renderMode = _ref2.renderMode,
      eventListenersGenerator = _ref2.eventListenersGenerator,
      styleFn = _ref2.styleFn,
      projection = _ref2.projection,
      classFn = _ref2.classFn,
      adjustedSize = _ref2.adjustedSize,
      margin = _ref2.margin;

  var keys = Object.keys(data);
  var allCalculatedPieces = [];
  keys.forEach(function (key, ordsetI) {
    var ordset = data[key];
    var barColumnWidth = ordset.width;

    var calculatedPieces = ordset.pieceData.map(function (piece, i) {
      var pieceSize = piece._orFR;
      var renderValue = renderMode && renderMode(piece, i);

      var xPosition = piece._orFX;
      var yPosition = piece._orFRBottom;
      var finalWidth = barColumnWidth;
      var finalHeight = pieceSize;

      if (!piece.negative) {
        yPosition -= piece._orFR;
      }

      if (projection === "horizontal") {
        yPosition = piece._orFX;
        xPosition = piece._orFRBottom;
        finalHeight = barColumnWidth;
        finalWidth = pieceSize;
        if (piece.negative) {
          xPosition = piece._orFRBottom - piece._orFR;
        }
      }

      var markD = void 0,
          translate = void 0,
          markProps = void 0;

      if (projection === "radial") {
        var innerRadius = type.innerRadius;

        var innerSize = (piece._orFRBottom - margin.left) / 2;
        var outerSize = piece._orFR / 2 + (piece._orFRBottom - margin.left) / 2;
        if (innerRadius) {
          innerRadius = parseInt(innerRadius);
          var canvasRadius = adjustedSize[0] / 2;
          var donutMod = (canvasRadius - innerRadius) / canvasRadius;
          innerSize = innerSize * donutMod + innerRadius;
          outerSize = outerSize * donutMod + innerRadius;
        }

        var arcGenerator = (0, _d3Shape.arc)().innerRadius(innerSize).outerRadius(outerSize).padAngle(ordset.pct_padding * twoPI);

        var angle = ordset.pct;
        var startAngle = ordset.pct_start;
        var endAngle = startAngle + angle - ordset.pct_padding / 2;

        markD = arcGenerator({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        var centroid = arcGenerator.centroid({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        finalHeight = undefined;
        finalWidth = undefined;
        var xOffset = adjustedSize[0] / 2 + margin.left;
        var yOffset = adjustedSize[1] / 2 + margin.top;
        xPosition = centroid[0] + xOffset;
        yPosition = centroid[1] + yOffset;
        translate = "translate(" + xOffset + "," + yOffset + ")";
        markProps = { markType: "path", d: markD };
      } else {
        markProps = {
          markType: "rect",
          x: xPosition,
          y: yPosition,
          width: finalWidth,
          height: finalHeight,
          rx: 0,
          ry: 0
        };
      }

      var eventListeners = eventListenersGenerator(piece, i);

      var calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition,
          middle: barColumnWidth / 2,
          height: finalHeight,
          width: finalWidth
        },
        piece: piece,
        renderElement: _extends({
          className: classFn(piece, i),
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          transform: translate,
          style: styleFn(piece, ordsetI)
        }, eventListeners, markProps)
      };
      return calculatedPiece;
    });
    allCalculatedPieces = [].concat(_toConsumableArray(allCalculatedPieces), _toConsumableArray(calculatedPieces));
  });

  return allCalculatedPieces;
}

function pointLayout(_ref3) {
  var type = _ref3.type,
      data = _ref3.data,
      renderMode = _ref3.renderMode,
      eventListenersGenerator = _ref3.eventListenersGenerator,
      styleFn = _ref3.styleFn,
      projection = _ref3.projection,
      classFn = _ref3.classFn,
      adjustedSize = _ref3.adjustedSize,
      margin = _ref3.margin;

  var circleRadius = type.r || 3;
  var allCalculatedPieces = [];
  var keys = Object.keys(data);
  keys.forEach(function (key, ordsetI) {
    var ordset = data[key];

    var calculatedPieces = [];

    ordset.pieceData.forEach(function (piece, i) {
      var renderValue = renderMode && renderMode(piece, i);

      var xPosition = ordset.middle;
      var yPosition = adjustedSize[1] - piece._orFR + margin.top;

      if (projection === "horizontal") {
        yPosition = ordset.middle;
        xPosition = piece._orFR;
      } else if (projection === "radial") {
        var angle = ordset.pct_middle;

        var rPosition = (piece._orFR - margin.left) / 2;
        var baseCentroid = pointOnArcAtAngle([adjustedSize[0] / 2, adjustedSize[1] / 2], angle, rPosition);
        xPosition = baseCentroid[0] + margin.left;
        yPosition = baseCentroid[1] + margin.top;
      }

      //Only return the actual piece if you're rendering points, otherwise you just needed to iterate and calculate the points for the contour summary type
      var actualCircleRadius = typeof circleRadius === "function" ? circleRadius(piece, i) : circleRadius;
      var eventListeners = eventListenersGenerator(piece, i);

      var calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition
        },
        piece: piece,
        renderElement: _extends({
          className: classFn(piece, i),
          markType: "rect",
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          height: actualCircleRadius * 2,
          width: actualCircleRadius * 2,
          x: xPosition - actualCircleRadius,
          y: yPosition - actualCircleRadius,
          rx: actualCircleRadius,
          ry: actualCircleRadius,
          style: styleFn(piece, ordsetI)
        }, eventListeners)
      };

      calculatedPieces.push(calculatedPiece);
    });
    allCalculatedPieces = [].concat(_toConsumableArray(allCalculatedPieces), calculatedPieces);
  });

  return allCalculatedPieces;
}

function swarmLayout(_ref4) {
  var type = _ref4.type,
      data = _ref4.data,
      renderMode = _ref4.renderMode,
      eventListenersGenerator = _ref4.eventListenersGenerator,
      styleFn = _ref4.styleFn,
      projection = _ref4.projection,
      classFn = _ref4.classFn,
      adjustedSize = _ref4.adjustedSize,
      margin = _ref4.margin;

  var allCalculatedPieces = [];
  var iterations = type.iterations || 120;

  var columnKeys = Object.keys(data);

  columnKeys.forEach(function (key, ordsetI) {
    var oColumn = data[key];
    var anglePiece = 1 / columnKeys.length;
    var oData = oColumn.pieceData;
    var adjustedColumnWidth = oColumn.width;

    var circleRadius = type.r || Math.max(2, Math.min(5, 4 * adjustedColumnWidth / oData.length));

    var simulation = (0, _d3Force.forceSimulation)(oData).force("y", (0, _d3Force.forceY)(function (d, i) {
      return d._orFR;
    }).strength(type.strength || 2)).force("x", (0, _d3Force.forceX)(oColumn.middle)).force("collide", (0, _d3Force.forceCollide)(circleRadius)).stop();

    for (var i = 0; i < iterations; ++i) {
      simulation.tick();
    }var calculatedPieces = oData.map(function (piece, i) {
      var renderValue = renderMode && renderMode(piece, i);

      var xPosition = piece.x;
      var yPosition = adjustedSize[1] - piece.y + margin.top;

      if (projection === "horizontal") {
        yPosition = piece.x;
        xPosition = piece.y;
      } else if (projection === "radial") {
        var angle = oColumn.pct_middle;
        xPosition = (piece.x - oColumn.middle) / adjustedColumnWidth * anglePiece;
        var rPosition = (piece._orFR - margin.left) / 2;
        var xAngle = angle + xPosition;
        var baseCentroid = pointOnArcAtAngle([adjustedSize[0] / 2, adjustedSize[1] / 2], xAngle, rPosition);
        xPosition = baseCentroid[0] + margin.left;
        yPosition = baseCentroid[1] + margin.top;
      }

      var actualCircleRadius = typeof circleRadius === "function" ? circleRadius(piece, i) : circleRadius;

      var eventListeners = eventListenersGenerator(piece, i);

      var calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition
        },
        piece: piece,
        renderElement: _extends({
          className: classFn(piece, i),
          markType: "rect",
          height: actualCircleRadius * 2,
          width: actualCircleRadius * 2,
          x: xPosition - actualCircleRadius,
          y: yPosition - actualCircleRadius,
          rx: actualCircleRadius,
          ry: actualCircleRadius,
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          style: styleFn(piece, ordsetI)
        }, eventListeners)
      };

      return calculatedPiece;
    });
    allCalculatedPieces = [].concat(_toConsumableArray(allCalculatedPieces), _toConsumableArray(calculatedPieces));
  });

  return allCalculatedPieces;
}