"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dividedLine = exports.bumpChart = exports.lineChart = exports.stackedArea = exports.differenceLine = exports.projectLineData = exports.projectAreaData = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };
//import assert from 'assert';

exports.funnelize = funnelize;
exports.relativeY = relativeY;

var _d3Array = require("d3-array");

var _lodash = require("lodash.flatten");

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require("lodash.uniq");

var _lodash4 = _interopRequireDefault(_lodash3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var datesForUnique = function datesForUnique(d) {
  return d instanceof Date ? d.toString() : d;
};

var projectAreaData = exports.projectAreaData = function projectAreaData(_ref) {
  var data = _ref.data,
      areaDataAccessor = _ref.areaDataAccessor,
      projection = _ref.projection,
      xAccessor = _ref.xAccessor,
      yAccessor = _ref.yAccessor;

  projection = projection ? projection : function (d) {
    return areaDataAccessor(d).map(function (p, q) {
      return [xAccessor(p, q), yAccessor(p, q)];
    });
  };
  data.forEach(function (d) {
    d._xyfCoordinates = projection(d);
  });
  return data;
};

var projectLineData = exports.projectLineData = function projectLineData(_ref2) {
  var data = _ref2.data,
      lineDataAccessor = _ref2.lineDataAccessor,
      xProp = _ref2.xProp,
      yProp = _ref2.yProp,
      yPropTop = _ref2.yPropTop,
      yPropBottom = _ref2.yPropBottom,
      xAccessor = _ref2.xAccessor,
      yAccessor = _ref2.yAccessor;

  if (!Array.isArray(data)) {
    data = [data];
  }
  return data.map(function (d, i) {
    var originalLineData = _extends({}, d);
    originalLineData.data = lineDataAccessor(d).map(function (p, q) {
      var originalCoords = _extends({}, p);

      originalCoords[xProp] = xAccessor(p, q);
      originalCoords[yProp] = yAccessor(p, q);
      originalCoords[yPropTop] = originalCoords[yProp];
      originalCoords[yPropBottom] = originalCoords[yProp];

      return originalCoords;
    });
    originalLineData.key = originalLineData.key || i;
    return originalLineData;
  });
};

var differenceLine = exports.differenceLine = function differenceLine(_ref3) {
  var data = _ref3.data,
      yProp = _ref3.yProp,
      yPropTop = _ref3.yPropTop,
      yPropBottom = _ref3.yPropBottom;

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

var stackedArea = exports.stackedArea = function stackedArea(_ref4) {
  var _ref4$type = _ref4.type,
      type = _ref4$type === undefined ? "stackedarea" : _ref4$type,
      data = _ref4.data,
      xProp = _ref4.xProp,
      yProp = _ref4.yProp,
      yPropMiddle = _ref4.yPropMiddle,
      sort = _ref4.sort,
      yPropTop = _ref4.yPropTop,
      yPropBottom = _ref4.yPropBottom;

  /* Object.keys(allData.map((d,i) => oAccessor(d,i)).reduce((p,c) => {
      p[c] = true
      return p
    }, {})) */

  var uniqXValues = (0, _lodash4.default)((0, _lodash2.default)(data.map(function (d) {
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
    var stepValues = (0, _lodash2.default)(data.map(function (d) {
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

var lineChart = exports.lineChart = function lineChart(_ref5) {
  var data = _ref5.data,
      y1 = _ref5.y1,
      yPropTop = _ref5.yPropTop,
      yPropMiddle = _ref5.yPropMiddle,
      yPropBottom = _ref5.yPropBottom;

  if (y1) {
    data.forEach(function (d) {
      d.data.forEach(function (p) {
        p[yPropBottom] = y1(p);
        p[yPropMiddle] = p[yPropBottom] + p[yPropTop] / 2;
      });
    });
  }

  return data;
};

var bumpChart = exports.bumpChart = function bumpChart(_ref6) {
  var _ref6$type = _ref6.type,
      type = _ref6$type === undefined ? "bumpline" : _ref6$type,
      data = _ref6.data,
      xProp = _ref6.xProp,
      yProp = _ref6.yProp,
      yPropMiddle = _ref6.yPropMiddle,
      yPropTop = _ref6.yPropTop,
      yPropBottom = _ref6.yPropBottom;

  var uniqXValues = (0, _lodash4.default)((0, _lodash2.default)(data.map(function (d) {
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
    (0, _lodash2.default)(data.map(function (d) {
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
    var stringNewParams = JSON.stringify(newParameters);
    var stringCurrentParams = JSON.stringify(currentParameters);

    if ((typeof currentParameters === "undefined" ? "undefined" : _typeof(currentParameters)) === "object") {
      matchingParams = stringNewParams === stringCurrentParams;
    }

    if (matchingParams) {
      currentPointsArray.push(point);
    } else {
      var lastPoint = currentPointsArray[currentPointsArray.length - 1];
      var pointA = lastPoint;
      var pointB = point;
      var stringBParams = stringNewParams;

      var x = 0;
      while (x < searchIterations && stringNewParams === stringBParams) {
        var keys = Object.keys(pointA);
        var findPoints = simpleSearchFunction({
          pointA: pointA,
          pointB: pointB,
          currentParameters: currentParameters,
          parameters: parameters,
          keys: keys
        });
        pointA = findPoints[0];
        pointB = findPoints[1];
        stringBParams = JSON.stringify(parameters(pointB));
        x++;
      }
      currentPointsArray.push(pointB);
      currentPointsArray = [pointB, point];
      dividedLinesData.push({ key: newParameters, points: currentPointsArray });
      currentParameters = newParameters;
    }
  });
  return dividedLinesData;
};

function simpleSearchFunction(_ref7) {
  var pointA = _ref7.pointA,
      pointB = _ref7.pointB,
      currentParameters = _ref7.currentParameters,
      parameters = _ref7.parameters,
      keys = _ref7.keys;

  var betweenPoint = {};
  keys.forEach(function (key) {
    betweenPoint[key] = typeof pointA[key] === "number" ? (pointA[key] + pointB[key]) / 2 : undefined;
  });
  var stringBetween = JSON.stringify(parameters(betweenPoint));
  var stringCurrent = JSON.stringify(currentParameters);

  if (stringBetween === stringCurrent) {
    return [betweenPoint, pointB];
  }
  return [pointA, betweenPoint];
}

function funnelize(_ref8) {
  var data = _ref8.data,
      steps = _ref8.steps,
      key = _ref8.key;

  var funnelData = [];
  if (!Array.isArray(data)) {
    data = [data];
  }
  if (!steps) {
    steps = (0, _lodash4.default)((0, _lodash2.default)(data.map(function (d) {
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

function relativeY(_ref9) {
  var point = _ref9.point,
      lines = _ref9.lines,
      projectedYMiddle = _ref9.projectedYMiddle,
      projectedY = _ref9.projectedY,
      projectedX = _ref9.projectedX,
      xAccessor = _ref9.xAccessor,
      yAccessor = _ref9.yAccessor,
      yScale = _ref9.yScale,
      xScale = _ref9.xScale,
      idAccessor = _ref9.idAccessor;

  if (idAccessor(point)) {
    var thisLine = lines.data.find(function (l) {
      return idAccessor(l) === idAccessor(point);
    });
    if (!thisLine) {
      return null;
    }
    var thisPoint = thisLine.data.find(function (p) {
      return xScale(p[projectedX]) === xScale(xAccessor(point));
    });
    if (!thisPoint) {
      return null;
    }
    point = thisPoint;
  }
  return yScale(point[projectedYMiddle] || point[projectedY] || yAccessor(point));
}