"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.areaLineGenerator = areaLineGenerator;
exports.areaLine = areaLine;
exports.verticalbar = verticalbar;
exports.horizontalbar = horizontalbar;
exports.pathStr = pathStr;
exports.circlePath = circlePath;
exports.rectPath = rectPath;
exports.linePath = linePath;
exports.jitterLine = jitterLine;
exports.cheapSketchy = cheapSketchy;
exports.cheapPopArtsy = cheapPopArtsy;
exports.randomColor = randomColor;
exports.painty = painty;
exports.sketchy = sketchy;
exports.generateSVG = generateSVG;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Shape = require("d3-shape");

var _d3Color = require("d3-color");

var _DividedLine = require("../DividedLine");

var _DividedLine2 = _interopRequireDefault(_DividedLine);

var _d3Selection = require("d3-selection");

var _d3Scale = require("d3-scale");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//All generic line constructors expect a projected coordinates array with x & y coordinates, if there are no y1 & x1 coordinates then it defaults to 0-width
function roundToTenth(number) {
  return Math.round(number * 10) / 10;
}

function areaLineGenerator(customAccessors, interpolator) {
  var lineGenerator = (0, _d3Shape.area)().x0(customAccessors.x).y0(customAccessors.y).x1(customAccessors.x1).y1(customAccessors.y1).interpolate(interpolator || "linear");
  return lineGenerator;
}

function areaLine(props) {
  var lineGenerator = areaLineGenerator(props.customAccessors, props.interpolate);
  props.d = lineGenerator(props.coordinates);

  return props;
}

function verticalbar(props) {
  props.y = props.y - props.height;
  return props;
}

function horizontalbar(props) {
  //just flips height for width
  var originalHeight = props.height;
  var originalWidth = props.width;
  props.width = originalHeight;
  props.height = originalWidth;

  return props;
}

function pathStr(_ref) {
  var x = _ref.x,
      y = _ref.y,
      width = _ref.width,
      height = _ref.height,
      cx = _ref.cx,
      cy = _ref.cy,
      r = _ref.r;

  if (cx !== undefined) {
    return ["M", roundToTenth(cx - r), roundToTenth(cy), "a", r, r, 0, 1, 0, r * 2, 0, "a", r, r, 0, 1, 0, -(r * 2), 0].join(" ");
  }
  return ["M", roundToTenth(x), roundToTenth(y), "h", width, "v", height, "h", -width, "v", -height].join(" ");
}

function circlePath(cx, cy, r) {
  return pathStr({ cx: cx, cy: cy, r: r });
}

function rectPath(x, y, width, height) {
  return pathStr({ x: x, y: y, width: width, height: height });
}

function linePath(x1, x2, y1, y2) {
  return "M" + x1 + "," + y1 + "L" + x2 + "," + y2 + "L";
}

function jitterLine(pathNode) {
  var length = pathNode.getTotalLength();
  var j = 2;
  var x = j + Math.random() * j * 5;
  var jitteredPoints = [];
  var lineGen = (0, _d3Shape.line)().x(function (d) {
    return d.x;
  }).y(function (d) {
    return d.y;
  }).curve(_d3Shape.curveBasis);

  var newPoint = pathNode.getPointAtLength(0);
  jitteredPoints.push(newPoint);

  while (x < length) {
    newPoint = pathNode.getPointAtLength(x);
    var newX = newPoint.x + (Math.random() * j - j / 2);
    var newY = newPoint.y + (Math.random() * j - j / 2);
    jitteredPoints.push({ x: newX, y: newY });
    x += j + Math.random() * j * 5;
  }
  newPoint = pathNode.getPointAtLength(length);
  jitteredPoints.push(newPoint);

  return lineGen(jitteredPoints);
}

function cheapSketchy(path) {
  var opacity = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

  if (opacity === 0) {
    //no fill
    return "";
  }
  var opacitySketchyScale = (0, _d3Scale.scaleLinear)().domain([0, 1]).range([10, 1]).clamp(true);
  var length = path.getTotalLength();
  var drawCode = "";
  var x = 0;
  var step = opacitySketchyScale(opacity);

  while (x < length / 2) {
    var start = path.getPointAtLength(x);
    var end = path.getPointAtLength(length - x);

    drawCode += " M" + (start.x + (Math.random() * step - step / 2)) + " " + (start.y + (Math.random() * step - step / 2)) + "L" + (end.x + (Math.random() * step - step / 2)) + " " + (end.y + (Math.random() * step - step / 2));

    x += step + Math.random() * step;
  }

  return drawCode;
}

function cheapPopArtsy(path, size) {
  var length = path.getTotalLength();
  var circles = [];
  var x = 0;
  var step = size * 3;

  while (x < length / 2) {
    var start = path.getPointAtLength(x);
    var end = path.getPointAtLength(length - x);
    var distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    var begin = size / 2;
    while (begin < distance - size / 2) {
      var percent = begin / distance;
      var circleXa = percent * start.x;
      var circleXb = (1 - percent) * end.x;
      var circleYa = percent * start.y;
      var circleYb = (1 - percent) * end.y;
      circles.push([circleXa + circleXb, circleYa + circleYb]);
      begin = begin + (step + Math.random());
    }
    x = x + step;
  }

  return circles;
}

function randomColor(baseColor, range) {
  var hslBase = (0, _d3Color.hsl)(baseColor);
  hslBase.h = hslBase.h + (Math.floor(Math.random() * (range * 255)) - Math.floor(range / 2));
  hslBase.s = hslBase.s + (Math.floor(Math.random() * range) - Math.floor(range / 2));
  hslBase.l = hslBase.l + (Math.floor(Math.random() * range) - Math.floor(range / 2));
  return hslBase.toString();
}

function painty(markType, cloneProps) {
  delete cloneProps.markType;
  if ((markType === "path" || markType === "circle" || markType === "line" || markType === "rect") && cloneProps.style && (cloneProps.style.stroke || cloneProps.style.fill)) {
    if (markType === "circle") {
      cloneProps.d = circlePath(cloneProps.cx || 0, cloneProps.cy || 0, cloneProps.r);
    }

    if (markType === "rect") {
      cloneProps.d = rectPath(cloneProps.x || 0, cloneProps.y || 0, cloneProps.width, cloneProps.height);
    }

    if (markType === "line") {
      cloneProps.d = linePath(cloneProps.x1, cloneProps.x2, cloneProps.y1, cloneProps.y2);
    }

    (0, _d3Selection.select)("body").append("svg").attr("id", "sketchyTempSVG");

    var fills = [];
    var outlines = [];

    cloneProps.d.split("M").filter(function (d, i) {
      return i !== 0;
    }).forEach(function (pathD, i) {
      var pathDummy = (0, _d3Selection.select)("#sketchyTempSVG").append("path").attr("class", cloneProps.className).attr("d", "M" + pathD);

      var pathNode = pathDummy.node();

      if (cloneProps.style && cloneProps.style.fill !== "none") {
        var sketchyFill = cheapPopArtsy(pathNode, 4);
        var fillProps = _extends({}, cloneProps);
        var fillStyle = _extends({}, cloneProps.style);
        var fillValue = fillStyle.fill;
        fillProps.style = fillStyle;
        delete fillProps.d;
        delete fillProps.style.fillOpacity;
        delete fillProps.style.stroke;
        delete fillProps.style.strokeWidth;

        fills.push(sketchyFill.map(function (circle, ci) {
          fillProps.key = "painty-fill-" + i + "-" + ci;
          fillProps.cx = circle[0];
          fillProps.cy = circle[1];
          fillProps.style = _extends({}, fillProps.style);
          fillProps.style.fill = randomColor(fillValue, 0.05);
          fillProps.r = Math.random() * 2 + 3;
          return _react2.default.createElement("circle", fillProps);
        }));
      }

      if (cloneProps.style && cloneProps.style.stroke !== "none" && cloneProps.style.strokeWidth !== 0) {
        var sketchyOutline = jitterLine(pathNode);

        var outlineProps = _extends({}, cloneProps);
        var outlineStyle = _extends({}, cloneProps.style);
        outlineProps.style = outlineStyle;
        outlineProps.d = sketchyOutline;
        outlineProps.key = "painty-outline-" + i;
        outlineProps.style.fill = "none";

        outlines.push(_react2.default.createElement("path", outlineProps));
      }
    });

    (0, _d3Selection.select)("#sketchyTempSVG").remove();

    return [_react2.default.createElement("path", {
      key: "painty-interaction-overlay",
      d: cloneProps.d,
      style: { opacity: 0 }
    }), _react2.default.createElement(
      "g",
      { key: "painty-fill", style: { filter: "url(#paintyFilterHeavy)" } },
      fills
    ), outlines];
  }

  return _react2.default.createElement(markType, cloneProps);
}

function sketchy(markType, cloneProps) {
  delete cloneProps.markType;
  if (markType === "text" && _typeof(cloneProps.children) !== "object") {
    var stringyChild = cloneProps.children.toString();
    var x = 0;
    var sketchyText = [];
    var sketchyBase = [];
    while (x <= stringyChild.length + 1) {
      var random = parseInt(Math.random() * 2) + 1;
      var randomSub = stringyChild.substring(x, random + x);

      var randomTspan = _react2.default.createElement(
        "tspan",
        {
          style: {
            fontSize: 10 + parseInt(Math.random() * 6) + "px",
            strokeWidth: 0,
            fontWeight: Math.random() < 0.5 ? "900" : "100"
          }
        },
        randomSub
      );
      sketchyBase.push(randomSub);
      sketchyText.push(randomTspan);
      x += random;
    }

    cloneProps.children = sketchyText;
    return _react2.default.createElement("text", cloneProps);
  }

  if ((markType === "path" || markType === "circle" || markType === "line" || markType === "rect") && cloneProps.style && (cloneProps.style.stroke || cloneProps.style.fill)) {
    if (markType === "circle") {
      cloneProps.d = circlePath(cloneProps.cx || 0, cloneProps.cy || 0, cloneProps.r);
    }

    if (markType === "rect") {
      cloneProps.d = rectPath(cloneProps.x || 0, cloneProps.y || 0, cloneProps.width, cloneProps.height);
    }

    if (markType === "line") {
      cloneProps.d = linePath(cloneProps.x1, cloneProps.x2, cloneProps.y1, cloneProps.y2);
    }
    var fills = [];
    var outlines = [];
    var sketchKey = Math.random().toString();

    if (cloneProps.d) {
      (0, _d3Selection.select)("body").append("svg").attr("id", "sketchyTempSVG");

      cloneProps.d.split("M").filter(function (d, i) {
        return i !== 0;
      }).forEach(function (pathD, i) {
        var pathDummy = (0, _d3Selection.select)("#sketchyTempSVG").append("path").attr("class", cloneProps.className).attr("d", "M" + pathD);

        var pathNode = pathDummy.node();
        if (cloneProps.style && cloneProps.style.fill !== "none") {
          var fillProps = _extends({}, cloneProps);
          var fillStyle = _extends({}, cloneProps.style);
          var sketchyFill = cheapSketchy(pathNode, fillStyle.fillOpacity);
          fillStyle.clipPath = "url(#clip-path-" + sketchKey + ")";
          fillProps.style = fillStyle;
          fillProps.d = sketchyFill;
          fillStyle.stroke = fillStyle.fill;
          fillStyle.strokeWidth = "1px";
          //            fillStyle.strokeOpacity = fillStyle.fillOpacity ? fillStyle.fillOpacity : 1;
          fillStyle.fill = "none";
          fillProps.key = "sketchFill-" + i;
          fills.push(_react2.default.createElement("path", fillProps));
        }
        if (cloneProps.style && cloneProps.style.stroke !== "none" && cloneProps.style.strokeWidth !== 0) {
          var sketchyOutline = jitterLine(pathNode);

          var outlineProps = _extends({}, cloneProps);
          var outlineStyle = _extends({}, cloneProps.style);
          outlineProps.style = outlineStyle;
          outlineProps.d = sketchyOutline;
          outlineProps.key = "sketchOutline-" + i;
          outlineProps.style.fill = "none";
          outlines.push(_react2.default.createElement("path", outlineProps));
        }
      });
    }

    (0, _d3Selection.select)("#sketchyTempSVG").remove();

    return [_react2.default.createElement(
      "clipPath",
      { key: "sketchy-clip-overlay", id: "clip-path-" + sketchKey },
      _react2.default.createElement("path", { d: cloneProps.d, style: { opacity: 0 } })
    ), _react2.default.createElement("path", {
      key: "sketchy-interaction-overlay",
      d: cloneProps.d,
      style: { opacity: 0 }
    }), fills, outlines];
  }

  return _react2.default.createElement(markType, cloneProps);
}

function generateSVG(props, className) {
  var markType = props.markType;
  var renderMode = props.renderMode;

  var cloneProps = _extends({}, props);
  delete cloneProps.markType;
  delete cloneProps.renderMode;
  delete cloneProps.resetAfter;
  delete cloneProps.droppable;
  delete cloneProps.nid;
  delete cloneProps.dropFunction;
  delete cloneProps.context;
  delete cloneProps.updateContext;
  delete cloneProps.parameters;
  delete cloneProps.lineDataAccessor;
  delete cloneProps.customAccessors;
  delete cloneProps.interpolate;
  delete cloneProps.forceUpdate;
  delete cloneProps.searchIterations;
  delete cloneProps.simpleInterpolate;

  if (markType === "verticalbar") {
    markType = "rect";
    cloneProps = verticalbar(cloneProps);
  } else if (markType === "horizontalbar") {
    markType = "rect";
    cloneProps = horizontalbar(cloneProps);
  } else if (markType === "simpleline") {
    markType = "path";
    cloneProps = areaLine(cloneProps);
  }

  //        let transform = cloneProps['transform'];
  if (props.draggable) {
    delete cloneProps.transform;
  }

  cloneProps.className = className;

  var actualSVG = null;

  if (props.markType === "dividedline") {
    actualSVG = _react2.default.createElement(_DividedLine2.default, props);
  } else if (renderMode === "sketchy") {
    actualSVG = sketchy(markType, cloneProps);
  } else if (renderMode === "painty") {
    actualSVG = painty(markType, cloneProps);
  } else if (renderMode === "forcePath" && markType === "circle") {
    cloneProps.d = circlePath(cloneProps.cx || 0, cloneProps.cy || 0, cloneProps.r);
    markType = "path";
    actualSVG = _react2.default.createElement(markType, cloneProps);
  } else if (renderMode === "forcePath" && markType === "rect") {
    cloneProps.d = rectPath(cloneProps.x || 0, cloneProps.y || 0, cloneProps.width, cloneProps.height);
    markType = "path";
    actualSVG = _react2.default.createElement(markType, cloneProps);
  } else {
    if (props.markType === "text" && _typeof(cloneProps.children) !== "object") {
      cloneProps.children = _react2.default.createElement(
        "tspan",
        null,
        cloneProps.children
      );
    }
    actualSVG = _react2.default.createElement(markType, cloneProps);
  }
  return actualSVG;
}