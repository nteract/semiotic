"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.axisLines = exports.axisLabels = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.axisPieces = axisPieces;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _semioticMark = require("semiotic-mark");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function axisPieces(_ref) {
  var _ref$renderMode = _ref.renderMode,
      renderMode = _ref$renderMode === undefined ? function () {
    return undefined;
  } : _ref$renderMode,
      _ref$padding = _ref.padding,
      padding = _ref$padding === undefined ? 5 : _ref$padding,
      tickValues = _ref.tickValues,
      scale = _ref.scale,
      ticks = _ref.ticks,
      _ref$orient = _ref.orient,
      orient = _ref$orient === undefined ? "left" : _ref$orient,
      size = _ref.size,
      _ref$margin = _ref.margin,
      margin = _ref$margin === undefined ? { left: 0, right: 0, top: 0, bottom: 0 } : _ref$margin,
      _ref$footer = _ref.footer,
      footer = _ref$footer === undefined ? false : _ref$footer;

  //returns x1 (start of line), x2 (end of line) associated with the value of the tick
  var axisDomain = [],
      position1 = void 0,
      position2 = void 0,
      domain1 = void 0,
      domain2 = void 0,
      tposition1 = void 0,
      tposition2 = void 0,
      textPositionMod = 0,
      textPositionMod2 = 0,
      defaultAnchor = "middle";
  switch (orient) {
    case "top":
      position1 = "x1";
      position2 = "x2";
      domain1 = "y1";
      domain2 = "y2";
      axisDomain = footer ? [10, margin.top] : [margin.top, size[1] + margin.top];
      tposition1 = "tx";
      tposition2 = "ty";
      textPositionMod -= 20 - padding;
      break;
    case "bottom":
      position1 = "x1";
      position2 = "x2";
      domain1 = "y2";
      domain2 = "y1";
      axisDomain = footer ? [size[1] + margin.top + 10, size[1] + margin.top] : [size[1] + margin.top, margin.top];
      tposition1 = "tx";
      tposition2 = "ty";
      textPositionMod += 20 + padding;
      break;
    case "right":
      position1 = "y2";
      position2 = "y1";
      domain1 = "x2";
      domain2 = "x1";
      axisDomain = footer ? [size[0] + margin.left, size[0] + margin.left + 10] : [size[0] + margin.left, margin.left];
      tposition1 = "ty";
      tposition2 = "tx";
      textPositionMod += 5 + padding;
      textPositionMod2 += 5;
      defaultAnchor = "start";
      break;
    //left
    default:
      position1 = "y1";
      position2 = "y2";
      domain1 = "x1";
      domain2 = "x2";
      axisDomain = footer ? [margin.left - 10, margin.left] : [margin.left, size[0] + margin.left];
      tposition1 = "ty";
      tposition2 = "tx";
      textPositionMod -= 5 + padding;
      textPositionMod2 += 5;
      defaultAnchor = "end";
      break;
  }

  var axisSize = Math.abs(scale.range()[1] - scale.range()[0]);

  if (!tickValues) {
    if (!ticks) {
      ticks = Math.max(1, parseInt(axisSize / 40));
    }
    tickValues = scale.ticks(ticks);
  }

  return tickValues.map(function (tick, i) {
    var _ref2;

    var tickPosition = scale(tick);
    return _ref2 = {}, _defineProperty(_ref2, position1, tickPosition), _defineProperty(_ref2, position2, tickPosition), _defineProperty(_ref2, domain1, axisDomain[0]), _defineProperty(_ref2, domain2, axisDomain[1]), _defineProperty(_ref2, tposition1, tickPosition + textPositionMod2), _defineProperty(_ref2, tposition2, axisDomain[0] + textPositionMod), _defineProperty(_ref2, "defaultAnchor", defaultAnchor), _defineProperty(_ref2, "renderMode", renderMode(tick, i)), _defineProperty(_ref2, "value", tick), _ref2;
  });
}

var axisLabels = exports.axisLabels = function axisLabels(_ref3) {
  var axisParts = _ref3.axisParts,
      orient = _ref3.orient,
      tickFormat = _ref3.tickFormat,
      _ref3$rotate = _ref3.rotate,
      rotate = _ref3$rotate === undefined ? 0 : _ref3$rotate;

  return axisParts.map(function (axisPart, i) {
    var renderedValue = tickFormat(axisPart.value);
    if ((typeof renderedValue === "undefined" ? "undefined" : _typeof(renderedValue)) !== "object" || renderedValue instanceof Date) {
      renderedValue = _react2.default.createElement(
        "text",
        { textAnchor: axisPart.defaultAnchor },
        renderedValue.toString ? renderedValue.toString() : renderedValue
      );
    }

    return _react2.default.createElement(
      "g",
      {
        key: i,
        pointerEvents: "none",
        transform: "translate(" + axisPart.tx + "," + axisPart.ty + ")rotate(" + rotate + ")"
      },
      renderedValue
    );
  });
};

var axisLines = exports.axisLines = function axisLines(_ref4) {
  var axisParts = _ref4.axisParts,
      orient = _ref4.orient;

  return axisParts.map(function (axisPart, i) {
    return _react2.default.createElement(_semioticMark.Mark, {
      key: i,
      markType: "path",
      renderMode: axisPart.renderMode,
      stroke: "black",
      strokeWidth: "1px",
      simpleInterpolate: true,
      d: "M" + axisPart.x1 + "," + axisPart.y1 + "L" + axisPart.x2 + "," + axisPart.y2,
      className: "tick-line tick " + orient
    });
  });
};