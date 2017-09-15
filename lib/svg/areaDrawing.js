"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.contouring = contouring;

var _d3Contour = require("d3-contour");

var _d3Scale = require("d3-scale");

var _polylabel = require("@mapbox/polylabel");

var _polylabel2 = _interopRequireDefault(_polylabel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function contouring(_ref) {
  var areaType = _ref.areaType,
      data = _ref.data,
      finalXExtent = _ref.finalXExtent,
      finalYExtent = _ref.finalYExtent;

  var projectedAreas = [];
  if (!areaType.type) {
    areaType = { type: areaType };
  }

  var _areaType = areaType,
      _areaType$resolution = _areaType.resolution,
      resolution = _areaType$resolution === undefined ? 500 : _areaType$resolution,
      _areaType$thresholds = _areaType.thresholds,
      thresholds = _areaType$thresholds === undefined ? 10 : _areaType$thresholds,
      _areaType$bandwidth = _areaType.bandwidth,
      bandwidth = _areaType$bandwidth === undefined ? 20 : _areaType$bandwidth,
      neighborhood = _areaType.neighborhood;


  var xScale = (0, _d3Scale.scaleLinear)().domain(finalXExtent).rangeRound([0, resolution]).nice();
  var yScale = (0, _d3Scale.scaleLinear)().domain(finalYExtent).rangeRound([resolution, 0]).nice();

  data.forEach(function (contourData) {
    var contourProjectedAreas = (0, _d3Contour.contourDensity)().size([resolution, resolution]).x(function (d) {
      return xScale(d[0]);
    }).y(function (d) {
      return yScale(d[1]);
    }).thresholds(thresholds).bandwidth(bandwidth)(contourData._xyfCoordinates);

    if (neighborhood) {
      contourProjectedAreas = [contourProjectedAreas[0]];
    }

    contourProjectedAreas.forEach(function (area) {
      area.parentArea = contourData;
      area.bounds = [];
      area.coordinates.forEach(function (poly) {
        poly.forEach(function (subpoly, i) {
          poly[i] = subpoly.map(function (coordpair) {
            coordpair = [xScale.invert(coordpair[0]), yScale.invert(coordpair[1])];
            return coordpair;
          });
          //Only push bounds for the main poly, not its interior rings, otherwise you end up labeling interior cutouts
          if (i === 0) {
            area.bounds.push(shapeBounds(poly[i]));
          }
        });
      });
    });
    projectedAreas = [].concat(_toConsumableArray(projectedAreas), _toConsumableArray(contourProjectedAreas));
  });

  return projectedAreas;
}

function shapeBounds(coordinates) {
  var left = [Infinity, 0];
  var right = [-Infinity, 0];
  var top = [0, Infinity];
  var bottom = [0, -Infinity];
  coordinates.forEach(function (d) {
    left = d[0] < left[0] ? d : left;
    right = d[0] > right[0] ? d : right;
    bottom = d[1] > bottom[1] ? d : bottom;
    top = d[1] < top[1] ? d : top;
  });

  return { center: (0, _polylabel2.default)([coordinates]), top: top, left: left, right: right, bottom: bottom };
}