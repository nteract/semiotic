"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var projectedX = exports.projectedX = "_xyfX";
var projectedY = exports.projectedY = "_xyfY";
var projectedYMiddle = exports.projectedYMiddle = "_xyfYMiddle";
var projectedYAdjusted = exports.projectedYAdjusted = "_xyfYAdjusted";
var projectedOffset = exports.projectedOffset = "_xyfYOffset";
var projectedYTop = exports.projectedYTop = "_xyfYTop";
var projectedYBottom = exports.projectedYBottom = "_xyfYBottom";

/*
Use symbols for x/y/offset to avoid conflicts when projecting the dataset
But how to expose those for custom hover rules?
*/

/*
const projectedX = Symbol('x');
const projectedY = Symbol('y');
const projectedYMiddle = Symbol('y-middle');
const projectedOffset = Symbol('offset');
*/