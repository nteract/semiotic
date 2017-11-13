"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateDataExtent = exports.stringToFn = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _lineDrawing = require("../svg/lineDrawing");

var _coordinateNames = require("../constants/coordinateNames");

var _areaDrawing = require("../svg/areaDrawing");

var _d3Array = require("d3-array");

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var builtInTransformations = {
  stackedarea: _lineDrawing.stackedArea,
  "stackedarea-invert": _lineDrawing.stackedArea,
  stackedpercent: _lineDrawing.stackedArea,
  "stackedpercent-invert": _lineDrawing.stackedArea,
  difference: _lineDrawing.differenceLine,
  bumparea: _lineDrawing.bumpChart,
  bumpline: _lineDrawing.bumpChart,
  "bumparea-invert": _lineDrawing.bumpChart,
  line: _lineDrawing.lineChart
};

var stringToFn = exports.stringToFn = function stringToFn(accessor, defaultAccessor, raw) {
  if (!accessor) {
    return defaultAccessor;
  } else if (typeof accessor !== "function" && raw) {
    return function () {
      return accessor;
    };
  }
  return typeof accessor !== "function" ? function (d) {
    return d[accessor];
  } : accessor;
};

var calculateDataExtent = exports.calculateDataExtent = function calculateDataExtent(_ref) {
  var lineDataAccessor = _ref.lineDataAccessor,
      xAccessor = _ref.xAccessor,
      yAccessor = _ref.yAccessor,
      areas = _ref.areas,
      points = _ref.points,
      lines = _ref.lines,
      lineType = _ref.lineType,
      showLinePoints = _ref.showLinePoints,
      xExtent = _ref.xExtent,
      yExtent = _ref.yExtent,
      invertX = _ref.invertX,
      invertY = _ref.invertY,
      areaDataAccessor = _ref.areaDataAccessor,
      projection = _ref.projection,
      areaType = _ref.areaType;

  lineDataAccessor = stringToFn(lineDataAccessor, function (d) {
    return d.coordinates;
  });
  xAccessor = stringToFn(xAccessor, function (d) {
    return d[0];
  });
  yAccessor = stringToFn(yAccessor, function (d) {
    return d[1];
  });
  areaDataAccessor = stringToFn(areaDataAccessor, function (d) {
    return d.coordinates;
  });

  var fullDataset = [];
  var initialProjectedLines = [];

  var projectedPoints = [],
      projectedLines = [],
      projectedAreas = [];
  if (points) {
    projectedPoints = points.map(function (d, i) {
      var _extends2;

      var x = xAccessor(d, i);
      var y = yAccessor(d, i);
      return _extends((_extends2 = {}, _defineProperty(_extends2, _coordinateNames.projectedX, x), _defineProperty(_extends2, _coordinateNames.projectedY, y), _extends2), d);
    });
    fullDataset = projectedPoints;
  } else if (lines) {
    initialProjectedLines = (0, _lineDrawing.projectLineData)({
      data: lines,
      lineDataAccessor: lineDataAccessor,
      xProp: _coordinateNames.projectedX,
      yProp: _coordinateNames.projectedY,
      yPropTop: _coordinateNames.projectedYTop,
      yPropBottom: _coordinateNames.projectedYBottom,
      xAccessor: xAccessor,
      yAccessor: yAccessor
    });

    var optionsObject = {
      xProp: _coordinateNames.projectedX,
      yProp: _coordinateNames.projectedY,
      yPropMiddle: _coordinateNames.projectedYMiddle,
      yPropTop: _coordinateNames.projectedYTop,
      yPropBottom: _coordinateNames.projectedYBottom
    };

    projectedLines = lineTransformation(lineType, optionsObject)(initialProjectedLines);

    projectedLines.forEach(function (d) {
      fullDataset = [].concat(_toConsumableArray(fullDataset), _toConsumableArray(d.data.map(function (p) {
        return _extends({ parentLine: d }, p);
      })));
    });
  }
  if (areas) {
    projectedAreas = (0, _lineDrawing.projectAreaData)({
      data: areas,
      areaDataAccessor: areaDataAccessor,
      projection: projection,
      xProp: _coordinateNames.projectedX,
      yProp: _coordinateNames.projectedY,
      yPropTop: _coordinateNames.projectedYTop,
      yPropBottom: _coordinateNames.projectedYBottom,
      xAccessor: xAccessor,
      yAccessor: yAccessor
    });
    projectedAreas.forEach(function (d) {
      var baseData = areaDataAccessor(d);
      if (d._xyfCoordinates[0][0][0]) {
        d._xyfCoordinates[0].forEach(function (multi) {
          fullDataset = [].concat(_toConsumableArray(fullDataset), _toConsumableArray(multi.map(function (p, q) {
            var _extends3;

            return _extends({ parentArea: d }, baseData[q], (_extends3 = {}, _defineProperty(_extends3, _coordinateNames.projectedX, p[0]), _defineProperty(_extends3, _coordinateNames.projectedY, p[1]), _extends3));
          })));
        });
      } else {
        fullDataset = [].concat(_toConsumableArray(fullDataset), _toConsumableArray(d._xyfCoordinates.map(function (p, q) {
          var _extends4;

          return _extends({ parentArea: d }, baseData[q], (_extends4 = {}, _defineProperty(_extends4, _coordinateNames.projectedX, p[0]), _defineProperty(_extends4, _coordinateNames.projectedY, p[1]), _extends4));
        })));
      }
    });
  }

  //Handle 'expose points on lines' option now that sending points and lines simultaneously is no longer allowed
  if (showLinePoints) {
    projectedPoints = fullDataset;
  }

  function lineTransformation() {
    var lineType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { type: "line" };
    var options = arguments[1];

    var differenceCatch = function differenceCatch(olineType, data) {
      return (lineType === "difference" || lineType.type && lineType.type === "difference") && data.length !== 2 ? "line" : olineType;
    };
    if (builtInTransformations[lineType]) {
      return function (data) {
        return builtInTransformations[differenceCatch(lineType, data)](_extends({
          type: lineType
        }, options, {
          data: data
        }));
      };
    }

    if (builtInTransformations[lineType.type]) {
      return function (data) {
        return builtInTransformations[differenceCatch(lineType.type, data)](_extends({}, lineType, options, {
          data: data
        }));
      };
    }

    //otherwise assume a function
    return function (data) {
      return lineType(_extends({}, options, { data: data }));
    };
  }

  var xMin = xExtent && xExtent[0] !== undefined ? xExtent[0] : (0, _d3Array.min)(fullDataset.map(function (d) {
    return d[_coordinateNames.projectedX];
  }));
  var xMax = xExtent && xExtent[1] !== undefined ? xExtent[1] : (0, _d3Array.max)(fullDataset.map(function (d) {
    return d[_coordinateNames.projectedX];
  }));

  var yMin = yExtent && yExtent[0] !== undefined ? yExtent[0] : (0, _d3Array.min)(fullDataset.map(function (d) {
    return d[_coordinateNames.projectedYBottom] === undefined ? d[_coordinateNames.projectedY] : d[_coordinateNames.projectedYBottom];
  }));
  var yMax = yExtent && yExtent[1] !== undefined ? yExtent[1] : (0, _d3Array.max)(fullDataset.map(function (d) {
    return d[_coordinateNames.projectedYTop] === undefined ? d[_coordinateNames.projectedY] : d[_coordinateNames.projectedYTop];
  }));

  var finalYExtent = [yMin, yMax];
  var finalXExtent = [xMin, xMax];

  if (invertX) {
    finalXExtent = [finalXExtent[1], finalXExtent[0]];
  }
  if (invertY) {
    finalYExtent = [finalYExtent[1], finalYExtent[0]];
  }

  if (areaType && (areaType === "contour" || areaType.type && areaType.type === "contour")) {
    projectedAreas = (0, _areaDrawing.contouring)({
      areaType: areaType,
      data: projectedAreas,
      projectedX: _coordinateNames.projectedX,
      projectedY: _coordinateNames.projectedY,
      finalXExtent: finalXExtent,
      finalYExtent: finalYExtent
    });
  } else if (typeof areaType === "function" || areaType && areaType.type && typeof areaType.type === "function") {
    var areaFunction = areaType.type || areaType;

    projectedAreas = areaFunction({
      xExtent: finalXExtent,
      yExtent: finalYExtent,
      projectedX: _coordinateNames.projectedX,
      projectedY: _coordinateNames.projectedY,
      fullDataset: fullDataset,
      projectedAreas: projectedAreas
    });
  }

  return {
    xExtent: finalXExtent,
    yExtent: finalYExtent,
    projectedLines: projectedLines,
    projectedPoints: projectedPoints,
    projectedAreas: projectedAreas,
    fullDataset: fullDataset
  };
};