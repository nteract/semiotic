"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class, _temp;

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Collection = require("d3-collection");

var _lodash = require("lodash.uniq");

var _lodash2 = _interopRequireDefault(_lodash);

var _d3Scale = require("d3-scale");

var _d3Array = require("d3-array");

var _d3Shape = require("d3-shape");

var _jsx = require("./constants/jsx");

var _frame_props = require("./constants/frame_props");

var _orframeRules = require("./annotationRules/orframeRules");

var _Frame = require("./Frame");

var _Frame2 = _interopRequireDefault(_Frame);

var _semioticMark = require("semiotic-mark");

var _DownloadButton = require("./DownloadButton");

var _DownloadButton2 = _interopRequireDefault(_DownloadButton);

var _downloadDataMapping = require("./downloadDataMapping");

var _frameFunctions = require("./svg/frameFunctions");

var _pieceDrawing = require("./svg/pieceDrawing");

var _pieceLayouts = require("./svg/pieceLayouts");

var _summaryLayouts = require("./svg/summaryLayouts");

var _dataFunctions = require("./data/dataFunctions");

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var xScale = (0, _d3Scale.scaleIdentity)();
var yScale = (0, _d3Scale.scaleIdentity)();

var midMod = function midMod(d) {
  return d.middle ? d.middle : 0;
};
var zeroFunction = function zeroFunction() {
  return 0;
};

var projectedCoordinatesObject = { y: "y", x: "x" };

var defaultOverflow = { top: 0, bottom: 0, left: 0, right: 0 };

var layoutHash = {
  clusterbar: _pieceLayouts.clusterBarLayout,
  bar: _pieceLayouts.barLayout,
  point: _pieceLayouts.pointLayout,
  swarm: _pieceLayouts.swarmLayout
};

var ORFrame = (_temp = _class = function (_React$Component) {
  _inherits(ORFrame, _React$Component);

  function ORFrame(props) {
    _classCallCheck(this, ORFrame);

    var _this = _possibleConstructorReturn(this, (ORFrame.__proto__ || Object.getPrototypeOf(ORFrame)).call(this, props));

    _this.calculateORFrame = _this.calculateORFrame.bind(_this);
    _this.defaultORHTMLRule = _this.defaultORHTMLRule.bind(_this);
    _this.defaultORSVGRule = _this.defaultORSVGRule.bind(_this);

    _this.renderBody = _this.renderBody.bind(_this);

    _this.state = {
      adjustedPosition: null,
      adjustedSize: null,
      backgroundGraphics: null,
      foregroundGraphics: null,
      axisData: null,
      axis: null,
      renderNumber: 0,
      oLabels: []
    };

    _this.oAccessor = null;
    _this.rAccessor = null;
    _this.oScale = null;
    _this.rScale = null;
    return _this;
  }

  _createClass(ORFrame, [{
    key: "calculateORFrame",
    value: function calculateORFrame(currentProps) {
      var oLabels = void 0;
      var projectedColumns = {};

      var padding = currentProps.oPadding ? currentProps.oPadding : 0;

      var summaryType = (0, _frameFunctions.objectifyType)(currentProps.summaryType);
      var pieceType = (0, _frameFunctions.objectifyType)(currentProps.type);
      var connectorType = (0, _frameFunctions.objectifyType)(currentProps.connectorType);

      var projection = currentProps.projection,
          customHoverBehavior = currentProps.customHoverBehavior,
          customClickBehavior = currentProps.customClickBehavior,
          size = currentProps.size;

      var eventListenersGenerator = (0, _frameFunctions.generateORFrameEventListeners)(customHoverBehavior, customClickBehavior);

      var barData = (0, _frameFunctions.keyAndObjectifyBarData)(currentProps);

      var oAccessor = (0, _dataFunctions.stringToFn)(currentProps.oAccessor, function (d) {
        return d.renderKey;
      });
      var rAccessor = (0, _dataFunctions.stringToFn)(currentProps.rAccessor, function (d) {
        return d.value || 1;
      });

      var connectorStyle = (0, _dataFunctions.stringToFn)(currentProps.connectorStyle, function () {
        return {};
      }, true);
      var summaryStyle = (0, _dataFunctions.stringToFn)(currentProps.summaryStyle, function () {
        return {};
      }, true);
      var pieceStyle = (0, _dataFunctions.stringToFn)(currentProps.style, function () {
        return {};
      }, true);
      var pieceClass = (0, _dataFunctions.stringToFn)(currentProps.pieceClass, function () {
        return "";
      }, true);
      var summaryClass = (0, _dataFunctions.stringToFn)(currentProps.summaryClass, function () {
        return "";
      }, true);
      var summaryPosition = currentProps.summaryPosition || function (position) {
        return position;
      };

      var allData = [].concat(_toConsumableArray(barData));

      //      const dataAccessor = currentProps.dataAccessor || function (d) {return d}
      var margin = (0, _frameFunctions.calculateMargin)(currentProps);

      var _adjustedPositionSize = (0, _frameFunctions.adjustedPositionSize)(currentProps),
          adjustedPosition = _adjustedPositionSize.adjustedPosition,
          adjustedSize = _adjustedPositionSize.adjustedSize;

      var title = (0, _frameFunctions.generateFrameTitle)(currentProps);

      var oExtent = currentProps.oExtent || (0, _lodash2.default)(allData.map(function (d, i) {
        return oAccessor(d, i);
      }));

      var rExtent = void 0;
      var subZeroRExtent = [0, 0];

      if (pieceType.type === "bar" && summaryType.type && summaryType.type !== "none") {
        pieceType.type = undefined;
      }

      if (currentProps.rExtent && currentProps.rExtent[0] !== undefined && currentProps.rExtent[1] !== undefined) {
        rExtent = currentProps.rExtent;
      } else if (pieceType.type !== "bar") {
        rExtent = (0, _d3Array.extent)(allData, rAccessor);
      } else {
        var positiveData = allData.filter(function (d) {
          return rAccessor(d) >= 0;
        });
        var negativeData = allData.filter(function (d) {
          return rAccessor(d) <= 0;
        });

        var nestedPositiveData = (0, _d3Collection.nest)().key(oAccessor).rollup(function (leaves) {
          return (0, _d3Array.sum)(leaves.map(rAccessor));
        }).entries(positiveData);

        var nestedNegativeData = (0, _d3Collection.nest)().key(oAccessor).rollup(function (leaves) {
          return (0, _d3Array.sum)(leaves.map(rAccessor));
        }).entries(negativeData);

        var topR = currentProps.rExtent && currentProps.rExtent[1];

        rExtent = currentProps.rExtent && topR ? [0, topR] : [0, nestedPositiveData.length === 0 ? 0 : Math.max((0, _d3Array.max)(nestedPositiveData, function (d) {
          return d.value;
        }), 0)];

        var bottomR = currentProps.rExtent && currentProps.rExtent[0];

        if (currentProps.rExtent && topR && bottomR && currentProps.rExtent[0] > currentProps.rExtent[1]) {
          //Assume a flipped rExtent
          bottomR = currentProps.rExtent && currentProps.rExtent[1];
          topR = currentProps.rExtent && currentProps.rExtent[0];
        }
        subZeroRExtent = bottomR ? [0, bottomR] : [0, nestedNegativeData.length === 0 ? 0 : Math.min((0, _d3Array.min)(nestedNegativeData, function (d) {
          return d.value;
        }), 0)];
        rExtent = [subZeroRExtent[1], rExtent[1]];
        if (pieceType.type === "clusterbar") {
          rExtent[0] = 0;
        }
      }

      if (currentProps.rExtent && currentProps.rExtent[1] !== undefined && currentProps.rExtent[0] === undefined) {
        rExtent[1] = currentProps.rExtent[1];
      }

      if (currentProps.rExtent && currentProps.rExtent[0] !== undefined && currentProps.rExtent[1] === undefined) {
        rExtent[0] = currentProps.rExtent[0];
      }

      if (currentProps.sortO) {
        oExtent = oExtent.sort(currentProps.sortO);
      }
      if (currentProps.invertR || currentProps.rExtent && currentProps.rExtent[0] > currentProps.rExtent[1]) {
        rExtent = [rExtent[1], rExtent[0]];
      }

      var rDomain = [margin.left, adjustedSize[0] + margin.left];
      var oDomain = [margin.top, adjustedSize[1] + margin.top];

      if (projection === "vertical") {
        oDomain = [margin.left, adjustedSize[0] + margin.left];
        rDomain = [margin.top, adjustedSize[1]];
      }

      var oScaleType = currentProps.oScaleType || _d3Scale.scaleBand;
      var rScaleType = currentProps.rScaleType || _d3Scale.scaleLinear;

      var cwHash = void 0;

      var oScale = void 0;

      if (currentProps.dynamicColumnWidth) {
        var columnValueCreator = void 0;
        if (typeof currentProps.dynamicColumnWidth === "string") {
          columnValueCreator = function columnValueCreator(d) {
            return (0, _d3Array.sum)(d.map(function (p) {
              return p[currentProps.dynamicColumnWidth];
            }));
          };
        } else {
          columnValueCreator = currentProps.dynamicColumnWidth;
        }
        var thresholdDomain = projection === "vertical" ? [margin.left] : [margin.top];
        var maxColumnValues = 0;
        var columnValues = [];

        oExtent.forEach(function (d, i) {
          var oValue = columnValueCreator(barData.filter(function (p, q) {
            return oAccessor(p, q) === d;
          }));
          columnValues.push(oValue);
          maxColumnValues += oValue;
        });

        cwHash = { total: 0 };
        oExtent.forEach(function (d, i) {
          var oValue = columnValues[i];
          var stepValue = oValue / maxColumnValues * (oDomain[1] - oDomain[0]);
          cwHash[d] = stepValue;
          cwHash.total += stepValue;
          if (i !== oExtent.length - 1) {
            thresholdDomain.push(stepValue + thresholdDomain[i]);
          }
        });

        oScale = (0, _d3Scale.scaleOrdinal)().domain(oExtent).range(thresholdDomain);
      } else {
        oScale = oScaleType().domain(oExtent).range(oDomain);
      }

      var rScale = rScaleType().domain(rExtent).range(rDomain);

      var rScaleReverse = rScaleType().domain(rDomain).range(rDomain.reverse());

      this.oScale = oScale;
      this.rScale = rScale;

      this.oAccessor = oAccessor;
      this.rAccessor = rAccessor;

      var columnWidth = cwHash ? 0 : oScale.bandwidth();

      var pieceData = [],
          mappedMiddles = void 0;

      var mappedMiddleSize = adjustedSize[1] + margin.top;
      if (projection === "vertical") {
        mappedMiddleSize = adjustedSize[0] + margin.left;
      }
      mappedMiddles = this.mappedMiddles(oScale, mappedMiddleSize, padding);

      var nestedPieces = {};
      (0, _d3Collection.nest)().key(oAccessor).entries(barData).forEach(function (d) {
        nestedPieces[d.key] = d.values;
      });
      pieceData = oExtent.map(function (d) {
        return nestedPieces[d];
      });

      var zeroValue = projection === "vertical" ? rScaleReverse(rScale(0)) : rScale(0);

      oExtent.forEach(function (o, i) {
        projectedColumns[o] = { name: o, padding: padding, pieceData: pieceData[i] };
        projectedColumns[o].x = oScale(o) + padding / 2;
        projectedColumns[o].y = projection === "vertical" ? margin.top : margin.left;
        projectedColumns[o].middle = mappedMiddles[o] + padding / 2;

        var negativeOffset = zeroValue;
        var positiveOffset = zeroValue;

        projectedColumns[o].pieceData.forEach(function (piece) {
          var pieceValue = rAccessor(piece);
          var valPosition = void 0;

          if (pieceType.type !== "bar" && pieceType.type !== "clusterbar") {
            valPosition = rScale(pieceValue);
            piece._orFR = valPosition;
          } else {
            valPosition = projection === "vertical" ? rScaleReverse(rScale(pieceValue)) : rScale(pieceValue);
            piece._orFR = Math.abs(zeroValue - valPosition);
          }
          piece._orFV = pieceValue;
          piece._orFX = projectedColumns[o].x;
          piece._orFRZ = valPosition - zeroValue;
          if (pieceValue >= 0) {
            piece._orFRBase = zeroValue;
            piece._orFRBottom = positiveOffset;
            piece._orFRMiddle = piece._orFR / 2 + positiveOffset;
            positiveOffset = projection === "vertical" ? positiveOffset - piece._orFR : positiveOffset + piece._orFR;
            piece.negative = false;
          } else {
            piece._orFRBase = zeroValue;
            piece._orFRBottom = negativeOffset;
            piece._orFRMiddle = positiveOffset - piece._orFR / 2;
            negativeOffset = projection === "vertical" ? negativeOffset + piece._orFR : negativeOffset - piece._orFR;
            piece.negative = true;
          }
        });

        if (cwHash) {
          projectedColumns[o].width = cwHash[o] - padding;
          console.log("with");

          if (currentProps.ordinalAlign === "center") {
            projectedColumns[o].x = projectedColumns[o].x - projectedColumns[o].width / 2;
            projectedColumns[o].middle = projectedColumns[o].middle - projectedColumns[o].width / 2;
          }
          projectedColumns[o].pct = cwHash[o] / cwHash.total;
          projectedColumns[o].pct_start = (projectedColumns[o].x - oDomain[0]) / cwHash.total;
          projectedColumns[o].pct_padding = padding / cwHash.total;
          projectedColumns[o].pct_middle = (projectedColumns[o].middle - oDomain[0]) / cwHash.total;
        } else {
          console.log("without");
          projectedColumns[o].width = columnWidth - padding;
          if (currentProps.ordinalAlign === "center") {
            projectedColumns[o].x = projectedColumns[o].x - projectedColumns[o].width / 2;
            projectedColumns[o].middle = projectedColumns[o].middle - projectedColumns[o].width / 2;
          }
          console.log("projectedColumns[o]", projectedColumns[o]);
          console.log("middle", projectedColumns[o].middle);
          console.log("adjustedSize[1]", adjustedSize[1]);
          projectedColumns[o].pct = columnWidth / adjustedSize[1];
          projectedColumns[o].pct_start = (projectedColumns[o].x - oDomain[0]) / adjustedSize[1];
          projectedColumns[o].pct_padding = padding / adjustedSize[1];
          projectedColumns[o].pct_middle = (projectedColumns[o].middle - oDomain[0]) / adjustedSize[1];
        }
        console.log("start", projectedColumns[o].pct_start);
        console.log("middle", projectedColumns[o].pct_middle);
      });

      var labelArray = [];

      var pieArcs = [];

      if (currentProps.oLabel || currentProps.hoverAnnotation) {
        oExtent.forEach(function (d, i) {
          var arcGenerator = (0, _d3Shape.arc)().innerRadius(0).outerRadius(rScale.range()[1] / 2);
          var angle = 1 / oExtent.length;
          var startAngle = angle * i;
          var twoPI = Math.PI * 2;
          angle = projectedColumns[d].pct;
          startAngle = projectedColumns[d].pct_start;

          var endAngle = startAngle + angle;
          var midAngle = startAngle + angle / 2;

          var markD = arcGenerator({
            startAngle: startAngle * twoPI,
            endAngle: endAngle * twoPI
          });
          var translate = [adjustedSize[0] / 2 + margin.left, adjustedSize[1] / 2 + margin.top];
          var centroid = arcGenerator.centroid({
            startAngle: startAngle * twoPI,
            endAngle: endAngle * twoPI
          });
          pieArcs.push({
            startAngle: startAngle,
            endAngle: endAngle,
            midAngle: midAngle,
            markD: markD,
            translate: translate,
            centroid: centroid
          });
        });
      }

      var labelSettings = _typeof(currentProps.oLabel) === "object" ? _extends({ label: true }, currentProps.oLabel) : { orient: "default", label: currentProps.oLabel };

      if (currentProps.oLabel) {
        var labelingFn = void 0;
        if (labelSettings.label === true) {
          labelingFn = function labelingFn(d) {
            return _react2.default.createElement(
              "text",
              {
                style: {
                  textAnchor: projection === "horizontal" && labelSettings.orient === "right" ? "start" : projection === "horizontal" ? "end" : "middle"
                }
              },
              d
            );
          };
        } else if (typeof labelSettings.label === "function") {
          labelingFn = labelSettings.label;
        }

        oExtent.forEach(function (d, i) {
          var xPosition = projectedColumns[d].middle;
          var yPosition = 0;

          if (projection === "horizontal") {
            yPosition = projectedColumns[d].middle;
            if (labelSettings.orient === "right") {
              xPosition = margin.left + adjustedSize[0] + 3;
            } else {
              xPosition = margin.left - 3;
            }
          } else if (projection === "radial") {
            xPosition = pieArcs[i].centroid[0] + pieArcs[i].translate[0];
            yPosition = pieArcs[i].centroid[1] + pieArcs[i].translate[1];
          }
          var label = labelingFn(d, currentProps.data ? currentProps.data.filter(function (p, q) {
            return oAccessor(p, q) === d;
          }) : undefined);
          labelArray.push(_react2.default.createElement(
            "g",
            {
              key: "olabel-" + i,
              transform: "translate(" + xPosition + "," + yPosition + ")"
            },
            label
          ));
        });

        if (projection === "vertical") {
          var labelY = void 0;
          if (labelSettings.orient === "top") {
            labelY = margin.top - 15;
          } else {
            labelY = 15 + rScale.range()[1];
          }
          oLabels = _react2.default.createElement(
            "g",
            {
              key: "orframe-labels-container",
              transform: "translate(0," + labelY + ")"
            },
            labelArray
          );
        } else if (projection === "horizontal") {
          oLabels = _react2.default.createElement(
            "g",
            { key: "orframe-labels-container", transform: "translate(0,0)" },
            labelArray
          );
        } else if (projection === "radial") {
          oLabels = _react2.default.createElement(
            "g",
            { key: "orframe-labels-container", transform: "translate(0,0)" },
            labelArray
          );
        }
      }

      var columnOverlays = void 0;

      if (currentProps.hoverAnnotation) {
        columnOverlays = oExtent.map(function (d, i) {
          var barColumnWidth = projectedColumns[d].width;
          var xPosition = projectedColumns[d].x;
          var yPosition = margin.top;
          var height = rScale.range()[1];
          var width = barColumnWidth + padding;
          if (projection === "horizontal") {
            yPosition = projectedColumns[d].x;
            xPosition = margin.left;
            width = rScale.range()[1] - margin.left;
            height = barColumnWidth;
          }

          if (projection === "radial") {
            var _pieArcs$i = pieArcs[i],
                markD = _pieArcs$i.markD,
                centroid = _pieArcs$i.centroid,
                translate = _pieArcs$i.translate,
                midAngle = _pieArcs$i.midAngle;

            return {
              markType: "path",
              key: "hover" + d,
              d: markD,
              transform: "translate(" + translate + ")",
              style: { opacity: 0, fill: "pink" },
              onClick: function onClick() {
                return {
                  type: "column-hover",
                  pieces: projectedColumns[d].pieceData,
                  summary: projectedColumns[d].pieceData,
                  arcAngles: {
                    centroid: centroid,
                    translate: translate,
                    midAngle: midAngle,
                    length: rScale.range()[1] / 2
                  }
                };
              },
              onMouseEnter: function onMouseEnter() {
                return {
                  type: "column-hover",
                  pieces: projectedColumns[d].pieceData,
                  summary: projectedColumns[d].pieceData,
                  arcAngles: {
                    centroid: centroid,
                    translate: translate,
                    midAngle: midAngle,
                    length: rScale.range()[1] / 2
                  }
                };
              },
              onMouseLeave: function onMouseLeave() {
                return {};
              }
            };
          }

          return {
            markType: "rect",
            key: "hover" + d,
            x: xPosition,
            y: yPosition,
            height: height,
            width: width,
            style: { opacity: 0, stroke: "black", fill: "pink" },
            onClick: function onClick() {
              return {
                type: "column-hover",
                pieces: projectedColumns[d].pieceData,
                summary: projectedColumns[d].pieceData
              };
            },
            onMouseEnter: function onMouseEnter() {
              return {
                type: "column-hover",
                pieces: projectedColumns[d].pieceData,
                summary: projectedColumns[d].pieceData
              };
            },
            onMouseLeave: function onMouseLeave() {
              return {};
            }
          };
        });
      }

      var _orFrameAxisGenerator = (0, _frameFunctions.orFrameAxisGenerator)({
        axis: currentProps.axis,
        data: currentProps.data,
        projection: projection,
        adjustedSize: adjustedSize,
        size: size,
        rScale: rScale,
        rScaleType: rScaleType,
        margin: margin,
        pieceType: pieceType,
        rExtent: rExtent
      }),
          axis = _orFrameAxisGenerator.axis,
          axesTickLines = _orFrameAxisGenerator.axesTickLines;

      var renderMode = currentProps.renderMode,
          canvasSummaries = currentProps.canvasSummaries,
          summaryRenderMode = currentProps.summaryRenderMode,
          connectorClass = currentProps.connectorClass,
          connectorRenderMode = currentProps.connectorRenderMode,
          canvasConnectors = currentProps.canvasConnectors;


      var pieceDataXY = void 0;
      var pieceRenderMode = (0, _dataFunctions.stringToFn)(renderMode, undefined, true);
      //    const pieceCanvasRender = stringToFn(canvasPieces, undefined, true)

      var pieceTypeForXY = pieceType.type && pieceType.type !== "none" ? pieceType.type : "point";
      var pieceTypeLayout = typeof pieceTypeForXY === "function" ? pieceTypeForXY : layoutHash[pieceTypeForXY];
      var calculatedPieceData = pieceTypeLayout({
        type: pieceType,
        data: projectedColumns,
        renderMode: pieceRenderMode,
        eventListenersGenerator: eventListenersGenerator,
        styleFn: pieceStyle,
        projection: projection,
        classFn: pieceClass,
        adjustedSize: adjustedSize,
        margin: margin,
        rScale: rScale
      });

      var keyedData = calculatedPieceData.reduce(function (p, c) {
        if (!p[c.o]) {
          p[c.o] = [];
        }
        p[c.o].push(c);
        return p;
      }, {});

      Object.keys(projectedColumns).forEach(function (d) {
        projectedColumns[d].xyData = keyedData[d];
      });
      var calculatedSummaries = {};

      if (summaryType.type) {
        calculatedSummaries = (0, _summaryLayouts.drawSummaries)({
          data: projectedColumns,
          type: summaryType,
          renderMode: (0, _dataFunctions.stringToFn)(summaryRenderMode, undefined, true),
          styleFn: (0, _dataFunctions.stringToFn)(summaryStyle, function () {}, true),
          classFn: (0, _dataFunctions.stringToFn)(summaryClass, function () {
            return "";
          }, true),
          canvasRender: (0, _dataFunctions.stringToFn)(canvasSummaries, undefined, true),
          positionFn: summaryPosition,
          projection: projection,
          eventListenersGenerator: eventListenersGenerator,
          adjustedSize: adjustedSize,
          margin: margin
        });
      }

      if (currentProps.pieceHoverAnnotation || currentProps.summaryHoverAnnotation) {
        var yMod = projection === "horizontal" ? midMod : zeroFunction;
        var xMod = projection === "vertical" ? midMod : zeroFunction;

        if (currentProps.summaryHoverAnnotation && calculatedSummaries.xyPoints) {
          pieceDataXY = calculatedSummaries.xyPoints.map(function (d) {
            return _extends({}, d, {
              type: "frame-hover",
              isSummaryData: true,
              x: d.x,
              y: d.y
            });
          });
        } else if (currentProps.pieceHoverAnnotation && calculatedPieceData) {
          pieceDataXY = calculatedPieceData.map(function (d) {
            return _extends({}, d.piece, {
              type: "frame-hover",
              x: d.xy.x + xMod(d.xy),
              y: d.xy.y + yMod(d.xy)
            });
          });
        }
      }

      var orFrameRender = {
        connectors: {
          projection: projection,
          data: keyedData,
          styleFn: (0, _dataFunctions.stringToFn)(connectorStyle, function () {}, true),
          classFn: (0, _dataFunctions.stringToFn)(connectorClass, function () {
            return "";
          }, true),
          renderMode: (0, _dataFunctions.stringToFn)(connectorRenderMode, undefined, true),
          canvasRender: (0, _dataFunctions.stringToFn)(canvasConnectors, undefined, true),
          behavior: _frameFunctions.orFrameConnectionRenderer,
          type: connectorType,
          eventListenersGenerator: eventListenersGenerator,
          margin: margin
        },
        summaries: {
          data: calculatedSummaries.marks,
          behavior: _summaryLayouts.renderLaidOutSummaries
        },
        pieces: {
          shouldRender: pieceType.type && pieceType.type !== "none",
          data: calculatedPieceData,
          behavior: _pieceDrawing.renderLaidOutPieces
        }
      };

      this.setState({
        pieceDataXY: pieceDataXY,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        backgroundGraphics: currentProps.backgroundGraphics,
        foregroundGraphics: currentProps.foregroundGraphics,
        axisData: currentProps.axis,
        axes: _react2.default.createElement(
          "g",
          { className: "axis-labels" },
          axis
        ),
        axesTickLines: axesTickLines,
        oLabels: oLabels,
        title: title,
        columnOverlays: columnOverlays,
        renderNumber: this.state.renderNumber + 1,
        oAccessor: currentProps.oAccessor,
        rAccessor: currentProps.rAccessor,
        oScaleType: currentProps.oScaleType,
        rScaleType: currentProps.rScaleType,
        oExtent: currentProps.oExtent,
        rExtent: currentProps.rExtent,
        projectedColumns: projectedColumns,
        margin: margin,
        legendSettings: currentProps.legend,
        eventListenersGenerator: eventListenersGenerator,
        orFrameRender: orFrameRender
      });
    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
      this.calculateORFrame(this.props);
    }
  }, {
    key: "componentWillReceiveProps",
    value: function componentWillReceiveProps(nextProps) {
      var _this2 = this;

      if (this.state.dataVersion && this.state.dataVersion !== nextProps.dataVersion || !this.state.projectedColumns) {
        this.calculateORFrame(nextProps);
      } else if (this.props.size[0] !== nextProps.size[0] || this.props.size[1] !== nextProps.size[1] || !this.state.dataVersion && _frame_props.orFrameChangeProps.find(function (d) {
        return _this2.props[d] !== nextProps[d];
      })) {
        this.calculateORFrame(nextProps);
      }
    }
  }, {
    key: "clonedAppliedElement",
    value: function clonedAppliedElement(_ref) {
      var tx = _ref.tx,
          ty = _ref.ty,
          d = _ref.d,
          i = _ref.i,
          markProps = _ref.markProps,
          styleFn = _ref.styleFn,
          renderFn = _ref.renderFn,
          classFn = _ref.classFn,
          baseClass = _ref.baseClass;

      markProps.style = styleFn ? styleFn(d, i) : {};
      markProps.renderMode = renderFn ? renderFn(d, i) : undefined;

      if (tx || ty) {
        markProps.transform = "translate(" + tx || 0 + "," + ty || 0 + ")";
      }

      markProps.className = baseClass;

      markProps.key = baseClass + "-" + i;

      if (classFn) {
        markProps.className = baseClass + " " + classFn(d, i);
      }

      return _react2.default.createElement(_semioticMark.Mark, markProps);
    }
  }, {
    key: "defaultORSVGRule",
    value: function defaultORSVGRule(_ref2) {
      var d = _ref2.d,
          i = _ref2.i,
          annotationLayer = _ref2.annotationLayer;

      var oAccessor = this.oAccessor;
      var rAccessor = this.rAccessor;
      var oScale = this.oScale;
      var rScale = this.rScale;

      var projection = this.props.projection;
      var projectedColumns = this.state.projectedColumns;

      var _adjustedPositionSize2 = (0, _frameFunctions.adjustedPositionSize)(this.props),
          adjustedPosition = _adjustedPositionSize2.adjustedPosition,
          adjustedSize = _adjustedPositionSize2.adjustedSize;

      var margin = (0, _frameFunctions.calculateMargin)(this.props);

      var screenProject = function screenProject(p) {
        var oColumn = projectedColumns[oAccessor(p)];
        var o = void 0;
        if (oColumn) {
          o = oColumn.middle;
        } else {
          o = 0;
        }
        if (oColumn && projection === "radial") {
          return (0, _pieceDrawing.pointOnArcAtAngle)([adjustedSize[0] / 2 + margin.left, adjustedSize[1] / 2 + margin.top], oColumn.pct_middle, (rScale(rAccessor(p)) - margin.left) / 2);
        }
        if (projection === "horizontal") {
          return [rScale(rAccessor(p)), o];
        }
        var newScale = (0, _d3Scale.scaleLinear)().domain(rScale.domain()).range(rScale.range().reverse());

        return [o, newScale(rAccessor(p))];
      };

      var screenCoordinates = [0, 0];

      //TODO: Support radial??
      if (d.coordinates || d.type === "enclose" && d.neighbors) {
        screenCoordinates = (d.coordinates || d.neighbors).map(function (p) {
          return screenProject(p);
        });
      } else {
        screenCoordinates = screenProject(d);
      }
      console.log("d.type", d.type);

      //TODO: Process your rules first
      if (this.props.svgAnnotationRules && this.props.svgAnnotationRules({
        d: d,
        i: i,
        oScale: oScale,
        rScale: rScale,
        oAccessor: oAccessor,
        rAccessor: rAccessor,
        orFrameProps: this.props,
        orFrameState: this.state,
        categories: this.state.projectedColumns
      }) !== null) {
        return this.props.svgAnnotationRules({
          d: d,
          i: i,
          oScale: oScale,
          rScale: rScale,
          oAccessor: oAccessor,
          rAccessor: rAccessor,
          orFrameProps: this.props,
          adjustedPosition: adjustedPosition,
          adjustedSize: adjustedSize,
          annotationLayer: annotationLayer,
          orFrameState: this.state,
          categories: this.state.projectedColumns
        });
      } else if (d.type === "or") {
        return (0, _orframeRules.svgORRule)({ d: d, i: i, screenCoordinates: screenCoordinates, projection: projection });
      } else if (d.type === "react-annotation" || typeof d.type === "function") {
        return (0, _orframeRules.basicReactAnnotationRule)({ d: d, i: i, screenCoordinates: screenCoordinates });
      } else if (d.type === "enclose") {
        return (0, _orframeRules.svgEncloseRule)({ d: d, i: i, screenCoordinates: screenCoordinates });
      } else if (d.type === "r") {
        return (0, _orframeRules.svgRRule)({
          d: d,
          i: i,
          screenCoordinates: screenCoordinates,
          rScale: rScale,
          rAccessor: rAccessor,
          margin: margin,
          projection: projection,
          adjustedSize: adjustedSize,
          adjustedPosition: adjustedPosition
        });
      } else if (d.type === "category") {
        return (0, _orframeRules.svgCategoryRule)({
          projection: projection,
          d: d,
          i: i,
          categories: this.state.projectedColumns,
          adjustedSize: adjustedSize,
          margin: margin
        });
      }
      return null;
    }
  }, {
    key: "defaultORHTMLRule",
    value: function defaultORHTMLRule(_ref3) {
      var d = _ref3.d,
          i = _ref3.i;

      var oAccessor = this.oAccessor;
      var rAccessor = this.rAccessor;
      var oScale = this.oScale;
      var rScale = this.rScale;

      var _props = this.props,
          htmlAnnotationRules = _props.htmlAnnotationRules,
          tooltipContent = _props.tooltipContent,
          projection = _props.projection,
          size = _props.size;
      var projectedColumns = this.state.projectedColumns;


      var type = _typeof(this.props.type) === "object" ? this.props.type : { type: this.props.type };
      var summaryType = _typeof(this.props.summaryType) === "object" ? this.props.summaryType : { type: this.props.summaryType };

      var _adjustedPositionSize3 = (0, _frameFunctions.adjustedPositionSize)(this.props),
          adjustedPosition = _adjustedPositionSize3.adjustedPosition,
          adjustedSize = _adjustedPositionSize3.adjustedSize;

      var margin = (0, _frameFunctions.calculateMargin)(this.props);

      //TODO: Process your rules first
      if (htmlAnnotationRules && htmlAnnotationRules({
        d: d,
        i: i,
        oScale: oScale,
        rScale: rScale,
        oAccessor: oAccessor,
        rAccessor: rAccessor,
        orFrameProps: this.props,
        orFrameState: this.state,
        categories: this.state.projectedColumns
      }) !== null) {
        return htmlAnnotationRules({
          d: d,
          i: i,
          oScale: oScale,
          rScale: rScale,
          oAccessor: oAccessor,
          rAccessor: rAccessor,
          orFrameProps: this.props,
          categories: this.state.projectedColumns
        });
      }

      if (d.type === "frame-hover") {
        return (0, _orframeRules.htmlFrameHoverRule)({
          d: d,
          i: i,
          rAccessor: rAccessor,
          oAccessor: oAccessor,
          size: size,
          projection: projection,
          tooltipContent: tooltipContent
        });
      } else if (d.type === "column-hover") {
        return (0, _orframeRules.htmlColumnHoverRule)({
          d: d,
          i: i,
          summaryType: summaryType,
          oAccessor: oAccessor,
          rAccessor: rAccessor,
          projectedColumns: projectedColumns,
          type: type,
          adjustedPosition: adjustedPosition,
          adjustedSize: adjustedSize,
          margin: margin,
          projection: projection,
          tooltipContent: tooltipContent
        });
      }
      return null;
    }
  }, {
    key: "mappedMiddles",
    value: function mappedMiddles(oScale, middleMax, padding) {
      var oScaleDomainValues = oScale.domain();

      var mappedMiddles = {};
      oScaleDomainValues.forEach(function (p, q) {
        var base = oScale(p) - padding;
        var next = oScaleDomainValues[q + 1] ? oScale(oScaleDomainValues[q + 1]) : middleMax;
        var diff = (next - base) / 2;
        mappedMiddles[p] = base + diff;
      });

      return mappedMiddles;
    }
  }, {
    key: "render",
    value: function render() {
      return this.renderBody({ afterElements: this.props.afterElements });
    }
  }, {
    key: "renderBody",
    value: function renderBody(_ref4) {
      var afterElements = _ref4.afterElements;
      var _props2 = this.props,
          className = _props2.className,
          annotationSettings = _props2.annotationSettings,
          size = _props2.size,
          downloadFields = _props2.downloadFields,
          rAccessor = _props2.rAccessor,
          oAccessor = _props2.oAccessor,
          name = _props2.name,
          download = _props2.download,
          annotations = _props2.annotations,
          matte = _props2.matte,
          renderKey = _props2.renderKey,
          interaction = _props2.interaction,
          customClickBehavior = _props2.customClickBehavior,
          customHoverBehavior = _props2.customHoverBehavior,
          customDoubleClickBehavior = _props2.customDoubleClickBehavior,
          projection = _props2.projection,
          backgroundGraphics = _props2.backgroundGraphics,
          foregroundGraphics = _props2.foregroundGraphics,
          beforeElements = _props2.beforeElements,
          disableContext = _props2.disableContext,
          summaryType = _props2.summaryType,
          summaryHoverAnnotation = _props2.summaryHoverAnnotation,
          pieceHoverAnnotation = _props2.pieceHoverAnnotation,
          hoverAnnotation = _props2.hoverAnnotation;
      var _state = this.state,
          orFrameRender = _state.orFrameRender,
          projectedColumns = _state.projectedColumns,
          adjustedPosition = _state.adjustedPosition,
          adjustedSize = _state.adjustedSize,
          legendSettings = _state.legendSettings,
          columnOverlays = _state.columnOverlays,
          axesTickLines = _state.axesTickLines,
          axes = _state.axes,
          margin = _state.margin,
          pieceDataXY = _state.pieceDataXY,
          oLabels = _state.oLabels,
          title = _state.title;


      var downloadButton = void 0;

      if (download) {
        downloadButton = _react2.default.createElement(_DownloadButton2.default, {
          csvName: (name || "orframe") + "-" + new Date().toJSON(),
          width: size[0],
          data: (0, _downloadDataMapping.orDownloadMapping)({
            data: projectedColumns,
            rAccessor: (0, _dataFunctions.stringToFn)(rAccessor),
            oAccessor: (0, _dataFunctions.stringToFn)(oAccessor),
            fields: downloadFields
          })
        });
      }

      var finalFilterDefs = (0, _jsx.filterDefs)({
        key: "orframe",
        additionalDefs: this.props.additionalDefs
      });

      var interactionOverflow = void 0;

      if (summaryType && summaryType.amplitude) {
        if (projection === "horizontal") {
          interactionOverflow = {
            top: summaryType.amplitude,
            bottom: 0,
            left: 0,
            right: 0
          };
        } else if (projection === "radial") {
          interactionOverflow = defaultOverflow;
        } else {
          interactionOverflow = {
            top: 0,
            bottom: 0,
            left: summaryType.amplitude,
            right: 0
          };
        }
      }

      return _react2.default.createElement(_Frame2.default, {
        name: "orframe",
        renderPipeline: orFrameRender,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        size: size,
        xScale: xScale,
        yScale: yScale,
        axes: axes,
        axesTickLines: axesTickLines,
        title: title,
        matte: matte,
        className: className,
        finalFilterDefs: finalFilterDefs,
        frameKey: "none",
        renderKeyFn: renderKey,
        projectedCoordinateNames: projectedCoordinatesObject,
        defaultSVGRule: this.defaultORSVGRule.bind(this),
        defaultHTMLRule: this.defaultORHTMLRule.bind(this),
        hoverAnnotation: summaryHoverAnnotation || pieceHoverAnnotation || hoverAnnotation,
        annotations: annotations,
        annotationSettings: annotationSettings,
        legendSettings: legendSettings,
        interaction: interaction,
        customClickBehavior: customClickBehavior,
        customHoverBehavior: customHoverBehavior,
        customDoubleClickBehavior: customDoubleClickBehavior,
        points: pieceDataXY,
        margin: margin,
        columns: projectedColumns,
        backgroundGraphics: backgroundGraphics,
        foregroundGraphics: [foregroundGraphics, oLabels],
        beforeElements: beforeElements,
        afterElements: afterElements,
        downloadButton: downloadButton,
        overlay: columnOverlays,
        rScale: this.rScale,
        projection: projection,
        disableContext: disableContext,
        interactionOverflow: interactionOverflow
      });
    }
  }]);

  return ORFrame;
}(_react2.default.Component), _class.defaultProps = {
  annotations: [],
  foregroundGraphics: [],
  annotationSettings: {},
  projection: "vertical",
  size: [500, 500],
  className: ""
}, _temp);


ORFrame.propTypes = {
  data: _propTypes2.default.array,
  name: _propTypes2.default.string,
  orient: _propTypes2.default.string,
  title: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object]),
  margin: _propTypes2.default.oneOfType([_propTypes2.default.number, _propTypes2.default.object]),
  format: _propTypes2.default.string,
  size: _propTypes2.default.array,
  position: _propTypes2.default.array,
  oScaleType: _propTypes2.default.func,
  rScaleType: _propTypes2.default.func,
  oExtent: _propTypes2.default.array,
  rExtent: _propTypes2.default.array,
  invertO: _propTypes2.default.bool,
  invertR: _propTypes2.default.bool,
  oAccessor: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  rAccessor: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  annotations: _propTypes2.default.array,
  customHoverBehavior: _propTypes2.default.func,
  customClickBehavior: _propTypes2.default.func,
  svgAnnotationRules: _propTypes2.default.func,
  oPadding: _propTypes2.default.number,
  projection: _propTypes2.default.string,
  htmlAnnotationRules: _propTypes2.default.func,
  type: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object, _propTypes2.default.func]),
  summaryType: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object]),
  connectorType: _propTypes2.default.func,
  tooltipContent: _propTypes2.default.func,
  className: _propTypes2.default.string,
  additionalDefs: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  interaction: _propTypes2.default.object,
  renderKey: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  dataAccessor: _propTypes2.default.func,
  rBaseline: _propTypes2.default.number,
  sortO: _propTypes2.default.func,
  dynamicColumnWidth: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  renderFn: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  style: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.func]),
  connectorStyle: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.func]),
  summaryStyle: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.func]),
  summaryPosition: _propTypes2.default.func,
  oLabel: _propTypes2.default.oneOfType([_propTypes2.default.bool, _propTypes2.default.func, _propTypes2.default.object]),
  hoverAnnotation: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array, _propTypes2.default.func, _propTypes2.default.bool]),
  pieceHoverAnnotation: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array, _propTypes2.default.func, _propTypes2.default.bool]),
  summaryHoverAnnotation: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array, _propTypes2.default.func, _propTypes2.default.bool]),
  axis: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array]),
  backgroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array]),
  foregroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array])
};

exports.default = ORFrame;
module.exports = exports['default'];