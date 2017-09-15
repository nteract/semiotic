"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var attributeTransitionWhitelist = exports.attributeTransitionWhitelist = ["d", "height", "width", "transform", "x", "y", "cx", "cy", "x1", "x2", "y1", "y2", "rx", "ry", "r"];

var styleTransitionWhitelist = exports.styleTransitionWhitelist = ["strokeOpacity", "fillOpacity", "strokeWidth", "fill", "stroke", "opacity", "strokeDasharray"];

//TODO find React Everything to everything translater
var reactCSSNameStyleHash = exports.reactCSSNameStyleHash = {
  strokeWidth: "stroke-width",
  fillOpacity: "fill-opacity",
  strokeOpacity: "stroke-opacity",
  strokeDasharray: "stroke-dasharray"
};