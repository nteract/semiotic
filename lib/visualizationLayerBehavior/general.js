"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.lineGeneratorDecorator = lineGeneratorDecorator;
exports.createPoints = createPoints;
exports.createLines = createLines;
exports.createAreas = createAreas;
exports.clonedAppliedElement = clonedAppliedElement;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _semioticMark = require("semiotic-mark");

var _d3Shape = require("d3-shape");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function lineGeneratorDecorator(_ref) {
  var generator = _ref.generator,
      projectedCoordinateNames = _ref.projectedCoordinateNames,
      defined = _ref.defined,
      xScale = _ref.xScale,
      yScale = _ref.yScale,
      interpolator = _ref.interpolator,
      singleLine = _ref.singleLine;
  var x = projectedCoordinateNames.x,
      y = projectedCoordinateNames.y,
      yTop = projectedCoordinateNames.yTop,
      yBottom = projectedCoordinateNames.yBottom;


  generator.x(function (d) {
    return xScale(d[x]);
  }).curve(interpolator);

  if (singleLine) {
    generator.y(function (d) {
      return yScale(d[y]);
    });
  } else {
    generator.y0(function (d) {
      return yScale(d[yBottom]);
    }).y1(function (d) {
      return yScale(d[yTop]);
    });
  }

  if (defined) {
    generator.defined(function (p) {
      return p._xyFrameUndefined || defined(p);
    });
  } else {
    generator.defined(function (p) {
      return !p._xyFrameUndefined;
    });
  }
}

function createPoints(_ref2) {
  var xScale = _ref2.xScale,
      yScale = _ref2.yScale,
      canvasDrawing = _ref2.canvasDrawing,
      data = _ref2.data,
      projectedCoordinateNames = _ref2.projectedCoordinateNames,
      customMark = _ref2.customMark,
      canvasRender = _ref2.canvasRender,
      styleFn = _ref2.styleFn,
      classFn = _ref2.classFn,
      renderKeyFn = _ref2.renderKeyFn,
      renderMode = _ref2.renderMode;
  var y = projectedCoordinateNames.y,
      x = projectedCoordinateNames.x;

  var mappedPoints = [];
  data.forEach(function (d, i) {
    var dX = xScale(d[x]);
    var dY = yScale(d[y]);
    var markProps = customMark ? _extends({}, customMark({ d: d, i: i }).props) : { key: "piece-" + i, markType: "circle", r: 2 };

    if (canvasRender && canvasRender(d, i) === true) {
      var canvasPoint = {
        type: "point",
        baseClass: "frame-piece",
        tx: dX,
        ty: dY,
        d: d,
        i: i,
        markProps: markProps,
        styleFn: styleFn,
        renderFn: renderMode,
        classFn: classFn
      };
      canvasDrawing.push(canvasPoint);
    } else {
      mappedPoints.push(clonedAppliedElement({
        baseClass: "frame-piece",
        tx: dX,
        ty: dY,
        d: d,
        i: i,
        markProps: markProps,
        styleFn: styleFn,
        renderFn: renderMode,
        renderKeyFn: renderKeyFn,
        classFn: classFn
      }));
    }
  });
  return mappedPoints;
}

function createLines(_ref3) {
  var xScale = _ref3.xScale,
      yScale = _ref3.yScale,
      canvasDrawing = _ref3.canvasDrawing,
      data = _ref3.data,
      projectedCoordinateNames = _ref3.projectedCoordinateNames,
      customMark = _ref3.customMark,
      canvasRender = _ref3.canvasRender,
      styleFn = _ref3.styleFn,
      classFn = _ref3.classFn,
      renderMode = _ref3.renderMode,
      renderKeyFn = _ref3.renderKeyFn,
      type = _ref3.type,
      defined = _ref3.defined;

  var customLine = (typeof type === "undefined" ? "undefined" : _typeof(type)) === "object" ? type : { type: type };
  var interpolator = customLine.interpolator ? customLine.interpolator : _d3Shape.curveLinear;
  var lineGenerator = (0, _d3Shape.area)();

  lineGeneratorDecorator({
    projectedCoordinateNames: projectedCoordinateNames,
    defined: defined,
    interpolator: interpolator,
    generator: lineGenerator,
    xScale: xScale,
    yScale: yScale
  });

  var mappedLines = [];
  data.forEach(function (d, i) {
    if (customMark && typeof customMark === "function") {
      mappedLines.push(customMark({ d: d, i: i, xScale: xScale, yScale: yScale, canvasDrawing: canvasDrawing }));
    } else {
      var markProps = { markType: "path", d: lineGenerator(d.data) };
      if (canvasRender && canvasRender(d, i) === true) {
        var canvasLine = {
          type: "line",
          baseClass: "xyframe-line",
          tx: 0,
          ty: 0,
          d: d,
          i: i,
          markProps: markProps,
          styleFn: styleFn,
          renderFn: renderMode,
          classFn: classFn
        };
        canvasDrawing.push(canvasLine);
      } else {
        mappedLines.push(clonedAppliedElement({
          baseClass: "xyframe-line",
          d: d,
          i: i,
          markProps: markProps,
          styleFn: styleFn,
          renderFn: renderMode,
          renderKeyFn: renderKeyFn,
          classFn: classFn
        }));
      }
    }
  });

  if (customLine.type === "difference" && data.length === 2) {
    //Create the overlay line for the difference chart

    var diffdataA = data[0].data.map(function (basedata, baseI) {
      var linePoint = basedata._xyfYTop > data[1].data[baseI]._xyfYTop ? basedata._xyfYTop : basedata._xyfYBottom;
      return {
        _xyfX: basedata._xyfX,
        _xyfY: linePoint,
        _xyfYBottom: linePoint,
        _xyfYTop: linePoint
      };
    });

    var diffdataB = data[0].data.map(function (basedata, baseI) {
      var linePoint = data[1].data[baseI]._xyfYTop > basedata._xyfYTop ? data[1].data[baseI]._xyfYTop : data[1].data[baseI]._xyfYBottom;
      return {
        _xyfX: basedata._xyfX,
        _xyfY: linePoint,
        _xyfYBottom: linePoint,
        _xyfYTop: linePoint
      };
    });

    var doClassname = classFn ? "xyframe-line " + classFn(diffdataA) : "xyframe-line";

    var overLine = (0, _d3Shape.line)();

    lineGeneratorDecorator({
      projectedCoordinateNames: projectedCoordinateNames,
      defined: defined,
      interpolator: interpolator,
      generator: overLine,
      xScale: xScale,
      yScale: yScale,
      singleLine: true
    });

    //      let baseStyle = props.lineStyle ? props.lineStyle(diffdata, 0) : {}
    var diffOverlayA = _react2.default.createElement(_semioticMark.Mark, {
      key: "xyline-diff-a",
      className: doClassname + " difference-overlay-a",
      markType: "path",
      d: overLine(diffdataA),
      style: { fill: "none", pointerEvents: "none" }
    });
    mappedLines.push(diffOverlayA);

    var diffOverlayB = _react2.default.createElement(_semioticMark.Mark, {
      key: "xyline-diff-b",
      className: doClassname + " difference-overlay-b",
      markType: "path",
      d: overLine(diffdataB),
      style: { fill: "none", pointerEvents: "none" }
    });
    mappedLines.push(diffOverlayB);
  }

  return mappedLines;
}

function createAreas(_ref4) {
  var xScale = _ref4.xScale,
      yScale = _ref4.yScale,
      canvasDrawing = _ref4.canvasDrawing,
      data = _ref4.data,
      projectedCoordinateNames = _ref4.projectedCoordinateNames,
      canvasRender = _ref4.canvasRender,
      styleFn = _ref4.styleFn,
      classFn = _ref4.classFn,
      renderKeyFn = _ref4.renderKeyFn,
      renderMode = _ref4.renderMode,
      type = _ref4.type;

  var areaClass = classFn || function () {
    return "";
  };
  var areaStyle = styleFn || function () {
    return {};
  };

  var renderFn = renderMode;

  if (!Array.isArray(data)) {
    data = [data];
  }

  var renderedAreas = [];

  data.forEach(function (d, i) {
    var className = "xyframe-area";
    if (areaClass) {
      className = "xyframe-area " + areaClass(d);
    }
    var drawD = "";
    if (d.type === "MultiPolygon") {
      d.coordinates.forEach(function (coord) {
        coord.forEach(function (c) {
          drawD += "M" + c.map(function (p) {
            return xScale(p[0]) + "," + yScale(p[1]);
          }).join("L") + "Z ";
        });
      });
    } else {
      drawD = "M" + d._xyfCoordinates.map(function (p) {
        return xScale(p[0]) + "," + yScale(p[1]);
      }).join("L") + "Z";
    }

    var renderKey = renderKeyFn ? renderKeyFn(d, i) : "area-" + i;

    if (canvasRender && canvasRender(d, i) === true) {
      var canvasArea = {
        type: "area",
        baseClass: "xyframe-area",
        tx: 0,
        ty: 0,
        d: d,
        i: i,
        markProps: { markType: "path", d: drawD },
        styleFn: areaStyle,
        renderFn: renderFn,
        classFn: function classFn() {
          return className;
        }
      };
      canvasDrawing.push(canvasArea);
    } else {
      renderedAreas.push(_react2.default.createElement(_semioticMark.Mark, {
        key: renderKey,
        forceUpdate: true,
        renderMode: renderFn ? renderFn(d, i) : undefined,
        className: className,
        markType: "path",
        d: drawD,
        style: areaStyle(d, i)
      }));
    }
  });
  return renderedAreas;
}

function clonedAppliedElement(_ref5) {
  var tx = _ref5.tx,
      ty = _ref5.ty,
      d = _ref5.d,
      i = _ref5.i,
      markProps = _ref5.markProps,
      styleFn = _ref5.styleFn,
      renderFn = _ref5.renderFn,
      classFn = _ref5.classFn,
      renderKeyFn = _ref5.renderKeyFn,
      baseClass = _ref5.baseClass;

  markProps.style = styleFn ? styleFn(d, i) : {};

  markProps.renderMode = renderFn ? renderFn(d, i) : undefined;

  if (tx || ty) {
    markProps.transform = "translate(" + (tx || 0) + "," + (ty || 0) + ")";
  }

  markProps.className = baseClass;

  markProps.key = renderKeyFn ? renderKeyFn(d, i) : baseClass + "-" + (d.key === undefined ? i : d.key);

  if (classFn) {
    markProps.className = baseClass + " " + classFn(d, i);
  }

  return _react2.default.createElement(_semioticMark.Mark, markProps);
}