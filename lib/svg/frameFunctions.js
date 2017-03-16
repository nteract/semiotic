"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var trueAxis = exports.trueAxis = function trueAxis(orient, props) {
  if (props.projection === "horizontal" && ["top", "bottom"].indexOf(orient) === -1) {
    return "bottom";
  } else if ((!props.projection || props.projection === "vertical") && ["left", "right"].indexOf(orient) === -1) {
    return "left";
  } else if (!orient && props.projection === "horizontal") {
    return "bottom";
  } else if (!orient) {
    return "left";
  }
  return orient;
};

var calculateMargin = exports.calculateMargin = function calculateMargin(props) {
  if (props.margin) {
    if (_typeof(props.margin) !== "object") {
      return { top: props.margin, bottom: props.margin, left: props.margin, right: props.margin };
    }
    return _extends({ top: 0, bottom: 0, left: 0, right: 0 }, props.margin);
  }
  var margin = { top: 0, bottom: 0, left: 0, right: 0 };
  if (props.title && props.title.length !== 0) {
    margin.top = 30;
  }
  var orient = trueAxis(null, props);
  if (props.axis) {
    orient = trueAxis(props.axis.orient, props);
    margin[orient] += 50;
  }
  if (props.axes) {
    props.axes.forEach(function (axis) {
      orient = axis.orient;
      margin[orient] += 50;
    });
  }
  if (props.oLabel) {
    if (orient === "bottom" || orient === "top") {
      margin.left += 50;
    } else {
      margin.bottom += 50;
    }
  }
  return margin;
};