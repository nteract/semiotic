"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.drawEdges = exports.drawNodes = undefined;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _semioticMark = require("semiotic-mark");

var _d3Glyphedge = require("d3-glyphedge");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var customEdgeHashD = {
  linearc: function linearc(d) {
    return _d3Glyphedge.d.lineArc(d);
  },
  ribbon: function ribbon(d) {
    return _d3Glyphedge.d.ribbon(d, d.width);
  },
  arrowhead: function arrowhead(d) {
    return _d3Glyphedge.d.arrowhead(d, d.target.nodeSize, d.width, d.width * 1.5);
  },
  halfarrow: function halfarrow(d) {
    return _d3Glyphedge.d.halfArrow(d, d.target.nodeSize, d.width, d.width * 1.5);
  },
  nail: function nail(d) {
    return _d3Glyphedge.d.nail(d, d.source.nodeSize);
  },
  comet: function comet(d) {
    return _d3Glyphedge.d.comet(d, d.target.nodeSize);
  },
  taffy: function taffy(d) {
    return _d3Glyphedge.d.taffy(d, d.source.nodeSize / 2, d.target.nodeSize / 2, (d.source.nodeSize + d.target.nodeSize) / 4);
  }
};

var circleNodeGenerator = function circleNodeGenerator(_ref) {
  var d = _ref.d,
      i = _ref.i,
      renderKeyFn = _ref.renderKeyFn,
      styleFn = _ref.styleFn,
      classFn = _ref.classFn,
      renderMode = _ref.renderMode,
      key = _ref.key,
      className = _ref.className,
      transform = _ref.transform;

  //this is repetitious
  return _react2.default.createElement(_semioticMark.Mark, {
    key: key,
    transform: transform,
    markType: "rect",
    width: d.nodeSize * 2,
    height: d.nodeSize * 2,
    ry: d.nodeSize * 2,
    rx: d.nodeSize * 2,
    x: -d.nodeSize,
    y: -d.nodeSize,
    style: styleFn(d, i),
    renderMode: renderMode ? renderMode(d, i) : undefined,
    className: className
  });
};

var genericLineGenerator = function genericLineGenerator(d) {
  return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
};

var drawNodes = exports.drawNodes = function drawNodes(_ref2) {
  var data = _ref2.data,
      renderKeyFn = _ref2.renderKeyFn,
      customMark = _ref2.customMark,
      styleFn = _ref2.styleFn,
      classFn = _ref2.classFn,
      renderMode = _ref2.renderMode,
      canvasDrawing = _ref2.canvasDrawing;

  var markGenerator = customMark || circleNodeGenerator;

  return data.map(function (d, i) {
    return markGenerator({
      d: d,
      i: i,
      renderKeyFn: renderKeyFn,
      styleFn: styleFn,
      classFn: classFn,
      renderMode: renderMode,
      key: renderKeyFn ? renderKeyFn(d, i) : d.id || "node-" + i,
      className: "node " + classFn(d, i),
      transform: "translate(" + d.x + "," + d.y + ")"
    });
  });
};

var drawEdges = exports.drawEdges = function drawEdges(_ref3) {
  var data = _ref3.data,
      renderKeyFn = _ref3.renderKeyFn,
      customMark = _ref3.customMark,
      styleFn = _ref3.styleFn,
      classFn = _ref3.classFn,
      renderMode = _ref3.renderMode,
      canvasDrawing = _ref3.canvasDrawing,
      type = _ref3.type;

  var dGenerator = genericLineGenerator;
  if (customMark) {
    return data.map(function (d, i) {
      return customMark({
        d: d,
        i: i,
        renderKeyFn: renderKeyFn,
        styleFn: styleFn,
        classFn: classFn,
        renderMode: renderMode,
        key: renderKeyFn ? renderKeyFn(d, i) : "edge-" + i,
        className: classFn(d, i) + " edge",
        transform: "translate(" + d.x + "," + d.y + ")"
      });
    });
  }
  if (type) {
    if (typeof type === "function") {
      dGenerator = type;
    } else if (customEdgeHashD[type]) {
      dGenerator = function dGenerator(d) {
        return customEdgeHashD[type](d);
      };
    }
  }

  return data.map(function (d, i) {
    return _react2.default.createElement(_semioticMark.Mark, {
      key: renderKeyFn ? renderKeyFn(d, i) : "edge-" + i,
      markType: "path",
      renderMode: renderMode ? renderMode(d, i) : undefined,
      className: classFn(d) + " edge",
      d: dGenerator(d),
      style: styleFn(d, i)
    });
  });
};