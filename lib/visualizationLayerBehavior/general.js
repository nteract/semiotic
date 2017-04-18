'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.lineGeneratorDecorator = lineGeneratorDecorator;
exports.createPoints = createPoints;
exports.createLines = createLines;
exports.createAreas = createAreas;
exports.clonedAppliedElement = clonedAppliedElement;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _Mark = require('../components/Mark');

var _Mark2 = _interopRequireDefault(_Mark);

var _d3Shape = require('d3-shape');

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function lineGeneratorDecorator(_ref) {
  var generator = _ref.generator,
      props = _ref.props,
      xScale = _ref.xScale,
      yScale = _ref.yScale,
      interpolator = _ref.interpolator,
      singleLine = _ref.singleLine;
  var _props$projectedCoord = props.projectedCoordinateNames,
      x = _props$projectedCoord.x,
      y = _props$projectedCoord.y,
      yTop = _props$projectedCoord.yTop,
      yBottom = _props$projectedCoord.yBottom;


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

  if (props.defined) {
    generator.defined(function (p) {
      return p._xyFrameUndefined || props.defined(p);
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
      props = _ref2.props;
  var _props$projectedCoord2 = props.projectedCoordinateNames,
      y = _props$projectedCoord2.y,
      x = _props$projectedCoord2.x;

  var mappedPoints = [];
  data.forEach(function (d, i) {

    var dX = xScale(d[x]);
    var dY = yScale(d[y]);
    var markProps = props.customPointMark ? (0, _lodash.clone)(props.customPointMark(d, i).props) : { key: "piece-" + i, markType: "circle", r: 2 };

    if (props.canvasPoints && props.canvasPoints(d, i) === true) {
      var canvasPoint = { type: "point", baseClass: "frame-piece", tx: dX, ty: dY, d: d, i: i, markProps: markProps, props: props, styleFn: props.pointStyle, renderFn: props.pointRenderMode, classFn: props.pointClass };
      canvasDrawing.push(canvasPoint);
    } else {
      mappedPoints.push(clonedAppliedElement({ baseClass: "frame-piece", tx: dX, ty: dY, d: d, i: i, markProps: markProps, props: props, styleFn: props.pointStyle, renderFn: props.pointRenderMode, classFn: props.pointClass }));
    }
  });
  return mappedPoints;
}

function createLines(_ref3) {
  var xScale = _ref3.xScale,
      yScale = _ref3.yScale,
      props = _ref3.props,
      canvasDrawing = _ref3.canvasDrawing,
      lineData = _ref3.lineData;

  var customLine = _typeof(props.customLineType) === "object" ? props.customLineType : { type: props.customLineType };
  var interpolator = customLine.interpolator ? customLine.interpolator : _d3Shape.curveLinear;
  var lineGenerator = (0, _d3Shape.area)();

  lineGeneratorDecorator({ props: props, interpolator: interpolator, generator: lineGenerator, xScale: xScale, yScale: yScale });

  var mappedLines = [];
  lineData.forEach(function (d, i) {
    if (props.customLineMark && typeof props.customLineMark === "function") {
      mappedLines.push(props.customLineMark({ d: d, i: i, xScale: xScale, yScale: yScale, props: props, canvasDrawing: canvasDrawing }));
    } else {
      var markProps = { markType: "path", d: lineGenerator(d.data) };
      if (props.canvasLines && props.canvasLines(d, i) === true) {
        var canvasLine = { type: "line", baseClass: "xyframe-line", tx: 0, ty: 0, d: d, i: i, markProps: markProps, props: props, styleFn: props.lineStyle, renderFn: props.lineRenderMode, classFn: props.lineClass };
        canvasDrawing.push(canvasLine);
      } else {
        mappedLines.push(clonedAppliedElement({ baseClass: "xyframe-line", d: d, i: i, markProps: markProps, props: props, styleFn: props.lineStyle, renderFn: props.lineRenderMode, classFn: props.lineClass }));
      }
    }
  });

  if (customLine.type === "difference" && lineData.length === 2) {
    //Create the overlay line for the difference chart

    var diffdataA = lineData[0].data.map(function (basedata, baseI) {
      var linePoint = basedata._xyfYTop > lineData[1].data[baseI]._xyfYTop ? basedata._xyfYTop : basedata._xyfYBottom;
      return {
        _xyfX: basedata._xyfX,
        _xyfY: linePoint,
        _xyfYBottom: linePoint,
        _xyfYTop: linePoint
      };
    });

    var diffdataB = lineData[0].data.map(function (basedata, baseI) {
      var linePoint = lineData[1].data[baseI]._xyfYTop > basedata._xyfYTop ? lineData[1].data[baseI]._xyfYTop : lineData[1].data[baseI]._xyfYBottom;
      return {
        _xyfX: basedata._xyfX,
        _xyfY: linePoint,
        _xyfYBottom: linePoint,
        _xyfYTop: linePoint
      };
    });

    var doClassname = props.lineClass ? "xyframe-line " + props.lineClass(diffdataA) : "xyframe-line";

    var overLine = (0, _d3Shape.line)();

    lineGeneratorDecorator({ props: props, generator: overLine, xScale: xScale, yScale: yScale, interpolator: interpolator, singleLine: true });

    //      let baseStyle = props.lineStyle ? props.lineStyle(diffdata, 0) : {}
    var diffOverlayA = _react2.default.createElement(_Mark2.default, { key: "xyline-diff-a", className: doClassname + " difference-overlay-a", markType: 'path', d: overLine(diffdataA), style: { fill: "none", pointerEvents: "none" } });
    mappedLines.push(diffOverlayA);

    var diffOverlayB = _react2.default.createElement(_Mark2.default, { key: "xyline-diff-b", className: doClassname + " difference-overlay-b", markType: 'path', d: overLine(diffdataB), style: { fill: "none", pointerEvents: "none" } });
    mappedLines.push(diffOverlayB);
  }

  return mappedLines;
}

function createAreas(xScale, yScale, props) {
  var areaDataAccessor = props.areaDataAccessor || function (d) {
    return d.coordinates;
  };

  var areaData = props.areas;

  if (!Array.isArray(areaData)) {
    areaData = [areaData];
  }

  return areaData.map(function (d, i) {
    var className = "xyframe-area";
    if (props.areaClass) {
      className = "xyframe-area " + props.areaClass(d);
    }

    var drawD = "M" + areaDataAccessor(d).map(function (p, q) {
      return xScale(props.xAccessor(p, q)) + "," + yScale(props.yAccessor(p, q));
    }).join("L") + "Z";

    return _react2.default.createElement(_Mark2.default, { className: className, markType: 'path', d: drawD, style: props.areaStyle ? props.areaStyle(d, i) : {} });
  });
}

function clonedAppliedElement(_ref4) {
  var tx = _ref4.tx,
      ty = _ref4.ty,
      d = _ref4.d,
      i = _ref4.i,
      markProps = _ref4.markProps,
      styleFn = _ref4.styleFn,
      renderFn = _ref4.renderFn,
      classFn = _ref4.classFn,
      baseClass = _ref4.baseClass;


  markProps.style = styleFn ? styleFn(d, i) : {};

  markProps.renderMode = renderFn ? renderFn(d, i) : undefined;

  if (tx || ty) {
    markProps.transform = "translate(" + (tx || 0) + "," + (ty || 0) + ")";
  }

  markProps.className = baseClass;

  markProps.key = baseClass + "-" + (d.key === undefined ? i : d.key);

  if (classFn) {
    markProps.className = baseClass + " " + classFn(d, i);
  }

  return _react2.default.createElement(_Mark2.default, markProps);
}