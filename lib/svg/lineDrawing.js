'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dividedLine = exports.bumpChart = exports.lineChart = exports.stackedArea = exports.differenceLine = exports.projectLineData = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
//import assert from 'assert';

exports.funnelize = funnelize;

var _d3Array = require('d3-array');

var _lodash = require('lodash');

var datesForUnique = function datesForUnique(d) {
  return d instanceof Date ? d.toString() : d;
};

var projectLineData = exports.projectLineData = function projectLineData(_ref) {
  var data = _ref.data,
      lineDataAccessor = _ref.lineDataAccessor,
      xProp = _ref.xProp,
      yProp = _ref.yProp,
      yPropTop = _ref.yPropTop,
      yPropBottom = _ref.yPropBottom,
      xAccessor = _ref.xAccessor,
      yAccessor = _ref.yAccessor;

  if (!Array.isArray(data)) {
    data = [data];
  }
  return data.map(function (d, i) {
    var originalLineData = (0, _lodash.clone)(d);
    originalLineData.data = lineDataAccessor(d).map(function (p, q) {
      var originalCoords = (0, _lodash.clone)(p);

      originalCoords[xProp] = xAccessor(p, q);
      originalCoords[yProp] = yAccessor(p, q);
      originalCoords[yPropTop] = originalCoords[yProp];
      originalCoords[yPropBottom] = originalCoords[yProp];

      return originalCoords;
    });
    originalLineData.key = i;
    return originalLineData;
  });
};

var differenceLine = exports.differenceLine = function differenceLine(_ref2) {
  var data = _ref2.data,
      yProp = _ref2.yProp,
      yPropTop = _ref2.yPropTop,
      yPropBottom = _ref2.yPropBottom;

  //  assert(data.length === 2 || data[0].data.length === data[1].data.length, 'Difference line line can only be created with an array of two sets of points where both have the same number of points');

  data.forEach(function (l, i) {
    l.data.forEach(function (point, q) {
      var otherLine = i === 0 ? 1 : 0;
      if (point[yProp] > data[otherLine].data[q][yProp]) {
        point[yPropBottom] = data[otherLine].data[q][yProp];
        point[yPropTop] = point[yProp];
      } else {
        point[yPropTop] = point[yProp];
        point[yPropBottom] = point[yProp];
      }
    });
  });

  return data;
};

var stackedArea = exports.stackedArea = function stackedArea(_ref3) {
  var _ref3$type = _ref3.type,
      type = _ref3$type === undefined ? "stackedarea" : _ref3$type,
      data = _ref3.data,
      xProp = _ref3.xProp,
      yProp = _ref3.yProp,
      yPropMiddle = _ref3.yPropMiddle,
      sort = _ref3.sort,
      yPropTop = _ref3.yPropTop,
      yPropBottom = _ref3.yPropBottom;


  var uniqXValues = (0, _lodash.uniq)((0, _lodash.flatten)(data.map(function (d) {
    return d.data.map(function (p) {
      return datesForUnique(p[xProp]);
    });
  })));
  var stackSort = function stackSort(a, b) {
    return (0, _d3Array.sum)(b.data.map(function (p) {
      return p[yProp];
    })) - (0, _d3Array.sum)(a.data.map(function (p) {
      return p[yProp];
    }));
  };
  if (type === "stackedpercent-invert" || type === "stackedarea-invert") {
    stackSort = function stackSort(a, b) {
      return (0, _d3Array.sum)(a.data.map(function (p) {
        return p[yProp];
      })) - (0, _d3Array.sum)(b.data.map(function (p) {
        return p[yProp];
      }));
    };
  }
  sort = sort === undefined ? stackSort : sort;

  if (sort !== null) {
    data = data.sort(sort);
  }

  uniqXValues.forEach(function (xValue) {
    var offset = 0;
    var stepValues = (0, _lodash.flatten)(data.map(function (d) {
      return d.data.filter(function (p) {
        return datesForUnique(p[xProp]) === xValue;
      });
    }));

    var stepTotal = (0, _d3Array.sum)(stepValues.map(function (d) {
      return d[yProp];
    }));

    stepValues.forEach(function (l) {

      if (type === "stackedpercent" || type === "stackedpercent-invert") {
        var adjustment = stepTotal === 0 ? 0 : l[yProp] / stepTotal;

        l[yPropBottom] = stepTotal === 0 ? 0 : offset / stepTotal;
        l[yPropTop] = l[yPropBottom] + adjustment;
        l[yPropMiddle] = l[yPropBottom] + adjustment / 2;
      } else {
        l[yPropBottom] = offset;
        l[yPropTop] = offset + l[yProp];
        l[yPropMiddle] = offset + l[yProp] / 2;
      }
      offset += l[yProp];
    });
  });

  return data;
};

var lineChart = exports.lineChart = function lineChart(_ref4) {
  var data = _ref4.data;

  return data;
};

var bumpChart = exports.bumpChart = function bumpChart(_ref5) {
  var _ref5$type = _ref5.type,
      type = _ref5$type === undefined ? "bumpline" : _ref5$type,
      data = _ref5.data,
      xProp = _ref5.xProp,
      yProp = _ref5.yProp,
      yPropMiddle = _ref5.yPropMiddle,
      yPropTop = _ref5.yPropTop,
      yPropBottom = _ref5.yPropBottom;


  var uniqXValues = (0, _lodash.uniq)((0, _lodash.flatten)(data.map(function (d) {
    return d.data.map(function (p) {
      return datesForUnique(p[xProp]);
    });
  })));
  var bumpSort = function bumpSort(a, b) {
    if (a[yProp] > b[yProp]) {
      return 1;
    }
    if (a[yProp] < b[yProp]) {
      return -1;
    }
    return -1;
  };
  if (type === "bumparea-invert" || type === "bumpline-invert") {
    bumpSort = function bumpSort(a, b) {
      if (a[yProp] < b[yProp]) {
        return 1;
      }
      if (a[yProp] > b[yProp]) {
        return -1;
      }
      return -1;
    };
  }

  uniqXValues.forEach(function (xValue) {
    var offset = 0;
    (0, _lodash.flatten)(data.map(function (d) {
      return d.data.filter(function (p) {
        return datesForUnique(p[xProp]) === xValue;
      });
    })).sort(bumpSort).forEach(function (l, rank) {
      //determine ranking and offset by the number of less than this one at each step
      l._XYFrameRank = rank;
      if (type === "bumparea" || type === "bumparea-invert") {
        l[yPropTop] = offset + l[yProp];
        l[yPropMiddle] = offset + l[yProp] / 2;
        l[yPropBottom] = offset;
        offset += l[yProp];
      } else {
        l[yProp] = rank;
        l[yPropTop] = rank;
        l[yPropBottom] = rank;
      }
    });
  });

  return data;
};

var dividedLine = exports.dividedLine = function dividedLine(parameters, points) {
  var searchIterations = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 10;

  var currentParameters = parameters(points[0], 0);
  var currentPointsArray = [];
  var dividedLinesData = [{ key: currentParameters, points: currentPointsArray }];
  points.forEach(function (point, pointI) {

    var newParameters = parameters(point, pointI);

    var matchingParams = newParameters === currentParameters;

    if ((typeof currentParameters === 'undefined' ? 'undefined' : _typeof(currentParameters)) === "object") {
      matchingParams = JSON.stringify(newParameters) === JSON.stringify(currentParameters);
    }

    if (matchingParams) {
      currentPointsArray.push(point);
    } else {
      var lastPoint = currentPointsArray[currentPointsArray.length - 1];
      var pointA = lastPoint;
      var pointB = point;

      for (var x = 0; x < searchIterations; x++) {
        var keys = Object.keys(pointA);
        var findPoints = simpleSearchFunction(pointA, pointB, currentParameters, parameters, keys);
        pointA = findPoints[0];
        pointB = findPoints[1];
      }
      currentPointsArray.push(pointB);
      currentPointsArray = [pointB, point];
      dividedLinesData.push({ key: newParameters, points: currentPointsArray });
      currentParameters = newParameters;
    }
  });
  return dividedLinesData;
};

function simpleSearchFunction(pointA, pointB, current, parameters, keys) {
  var betweenPoint = {};
  keys.forEach(function (key) {
    betweenPoint[key] = typeof pointA[key] === "number" ? (pointA[key] + pointB[key]) / 2 : undefined;
  });

  if (JSON.stringify(parameters(betweenPoint)) === JSON.stringify(current)) {
    return [betweenPoint, pointB];
  }
  return [pointA, betweenPoint];
}

function funnelize(_ref6) {
  var data = _ref6.data,
      steps = _ref6.steps,
      key = _ref6.key;

  var funnelData = [];
  if (!Array.isArray(data)) {
    data = [data];
  }
  if (!steps) {
    steps = (0, _lodash.uniq)((0, _lodash.flatten)(data.map(function (d) {
      return Object.keys(d);
    })));
  }

  data.forEach(function (datum, i) {
    var datumKey = key ? datum[key] : i;
    steps.forEach(function (step) {
      var funnelDatum = { funnelKey: datumKey };
      funnelDatum.stepName = step;
      funnelDatum.stepValue = datum[step] ? datum[step] : 0;
      funnelData.push(funnelDatum);
    });
  });

  return funnelData;
}