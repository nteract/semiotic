"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Collection = require("d3-collection");

var _lodash = require("lodash.uniq");

var _lodash2 = _interopRequireDefault(_lodash);

var _d3Scale = require("d3-scale");

var _d3Array = require("d3-array");

var _drawing = require("./markBehavior/drawing");

var _d3Shape = require("d3-shape");

var _axis = require("./visualizationLayerBehavior/axis");

var _jsx = require("./constants/jsx");

var _Annotation = require("./Annotation");

var _Annotation2 = _interopRequireDefault(_Annotation);

var _d3Hierarchy = require("d3-hierarchy");

var _reactAnnotation = require("react-annotation");

var _Axis = require("./Axis");

var _Axis2 = _interopRequireDefault(_Axis);

var _Frame = require("./Frame");

var _Frame2 = _interopRequireDefault(_Frame);

var _Mark = require("./Mark");

var _Mark2 = _interopRequireDefault(_Mark);

var _DownloadButton = require("./DownloadButton");

var _DownloadButton2 = _interopRequireDefault(_DownloadButton);

var _downloadDataMapping = require("./downloadDataMapping");

var _frameFunctions = require("./svg/frameFunctions");

var _pieceDrawing = require("./svg/pieceDrawing");

var _pieceLayouts = require("./svg/pieceLayouts");

var _summaryDrawing = require("./svg/summaryDrawing");

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

var layoutHash = {
  clusterbar: _pieceLayouts.clusterBarLayout,
  bar: _pieceLayouts.barLayout,
  point: _pieceLayouts.pointLayout,
  swarm: _pieceLayouts.swarmLayout
};

var orFrame = function (_React$Component) {
  _inherits(orFrame, _React$Component);

  function orFrame(props) {
    _classCallCheck(this, orFrame);

    var _this = _possibleConstructorReturn(this, (orFrame.__proto__ || Object.getPrototypeOf(orFrame)).call(this, props));

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
      renderNumber: 0
    };

    _this.oAccessor = null;
    _this.rAccessor = null;
    _this.oScale = null;
    _this.rScale = null;
    return _this;
  }

  _createClass(orFrame, [{
    key: "calculateORFrame",
    value: function calculateORFrame(currentProps) {
      var oLabels = void 0;
      var projectedColumns = {};

      var padding = currentProps.oPadding ? currentProps.oPadding : 0;

      var summaryType = (0, _frameFunctions.objectifyType)(currentProps.summaryType);
      var pieceType = (0, _frameFunctions.objectifyType)(currentProps.type);
      var connectorType = (0, _frameFunctions.objectifyType)(currentProps.connectorType);

      var _currentProps$project = currentProps.projection,
          projection = _currentProps$project === undefined ? "vertical" : _currentProps$project,
          customHoverBehavior = currentProps.customHoverBehavior,
          customClickBehavior = currentProps.customClickBehavior;

      var eventListenersGenerator = (0, _frameFunctions.generateORFrameEventListeners)(customHoverBehavior, customClickBehavior);

      var barData = (0, _frameFunctions.keyAndObjectifyBarData)(currentProps);

      var oAccessor = (0, _dataFunctions.stringToFn)(currentProps.oAccessor, function (d) {
        return d.renderKey;
      });
      var rAccessor = (0, _dataFunctions.stringToFn)(currentProps.rAccessor, function (d) {
        return d.value;
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

      if (currentProps.rExtent && currentProps.rExtent[0] && currentProps.rExtent[1]) {
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

        rExtent = currentProps.rExtent ? [0, topR] : [0, nestedPositiveData.length === 0 ? 0 : Math.max((0, _d3Array.max)(nestedPositiveData, function (d) {
          return d.value;
        }), 0)];

        var bottomR = currentProps.rExtent && currentProps.rExtent[0];

        if (currentProps.rExtent && currentProps.rExtent[0] > currentProps.rExtent[1]) {
          //Assume a flipped rExtent
          bottomR = currentProps.rExtent && currentProps.rExtent[1];
          topR = currentProps.rExtent && currentProps.rExtent[0];
        }
        subZeroRExtent = currentProps.rExtent ? [0, bottomR] : [0, nestedNegativeData.length === 0 ? 0 : Math.min((0, _d3Array.min)(nestedNegativeData, function (d) {
          return d.value;
        }), 0)];
        rExtent = [subZeroRExtent[1], rExtent[1]];
      }

      if (pieceType.type === "clusterbar") {
        rExtent[0] = 0;
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
          projectedColumns[o].pct = cwHash[o] / cwHash.total;
          projectedColumns[o].pct_start = (projectedColumns[o].x - oDomain[0]) / cwHash.total;
          projectedColumns[o].pct_padding = padding / cwHash.total;
          projectedColumns[o].pct_middle = projectedColumns[o].middle / cwHash.total;
        } else {
          projectedColumns[o].width = columnWidth - padding;
          projectedColumns[o].pct = columnWidth / adjustedSize[1];
          projectedColumns[o].pct_start = (projectedColumns[o].x - oDomain[0]) / adjustedSize[1];
          projectedColumns[o].pct_padding = padding / adjustedSize[1];
          projectedColumns[o].pct_middle = projectedColumns[o].middle / adjustedSize[1];
        }
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

      if (currentProps.oLabel) {
        var labelingFn = void 0;
        if (currentProps.oLabel === true) {
          labelingFn = function labelingFn(d) {
            return _react2.default.createElement(
              "text",
              {
                style: {
                  textAnchor: projection === "horizontal" ? "end" : "middle"
                }
              },
              d
            );
          };
        } else if (typeof currentProps.oLabel === "function") {
          labelingFn = currentProps.oLabel;
        }

        oExtent.forEach(function (d, i) {
          var xPosition = projectedColumns[d].middle;
          var yPosition = 0;

          if (projection === "horizontal") {
            yPosition = projectedColumns[d].middle;
            xPosition = margin.left - 3;
          } else if (projection === "radial") {
            xPosition = pieArcs[i].centroid[0] + pieArcs[i].translate[0];
            yPosition = pieArcs[i].centroid[1] + pieArcs[i].translate[1] + margin.top;
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
          oLabels = _react2.default.createElement(
            "g",
            {
              key: "orframe-labels-container",
              transform: "translate(0," + (15 + rScale.range()[1]) + ")"
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
                  pieces: barData.filter(function (p, q) {
                    return oAccessor(p, q) === d;
                  }),
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
                  pieces: barData.filter(function (p, q) {
                    return oAccessor(p, q) === d;
                  }),
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
                pieces: barData.filter(function (p, q) {
                  return oAccessor(p, q) === d;
                }),
                summary: projectedColumns[d].pieceData
              };
            },
            onMouseEnter: function onMouseEnter() {
              return {
                type: "column-hover",
                pieces: barData.filter(function (p, q) {
                  return oAccessor(p, q) === d;
                }),
                summary: projectedColumns[d].pieceData
              };
            },
            onMouseLeave: function onMouseLeave() {
              return {};
            }
          };
        });
      }

      var axis = null;
      var axesTickLines = null;

      if (projection !== "radial" && currentProps.axis) {
        axesTickLines = [];
        var axisPosition = [0, 0];
        var axisSize = [0, 0];
        var axes = Array.isArray(currentProps.axis) ? currentProps.axis : [currentProps.axis];
        axis = axes.map(function (d, i) {
          var tickValues = void 0;

          var axisScale = rScaleType().domain(rScale.domain());

          var orient = (0, _frameFunctions.trueAxis)(d.orient, currentProps.projection);

          axisSize = adjustedSize;

          if (orient === "right") {
            axisScale.range([rScale.range()[1], rScale.range()[0]]);
          } else if (orient === "left") {
            axisPosition = [margin.left, 0];
            axisScale.range([rScale.range()[1], rScale.range()[0]]);
          } else if (orient === "top") {
            axisScale.range(rScale.range());
          } else if (orient === "bottom") {
            axisPosition = [0, margin.top];
            axisScale.range(rScale.range());
          }

          if (d.tickValues && Array.isArray(d.tickValues)) {
            tickValues = d.tickValues;
          } else if (d.tickValues) {
            //otherwise assume a function
            tickValues = d.tickValues(currentProps.data, currentProps.size, rScale);
          }

          var axisParts = (0, _axis.axisPieces)({
            padding: d.padding,
            tickValues: tickValues,
            scale: axisScale,
            ticks: d.ticks,
            orient: orient,
            size: axisSize,
            margin: margin,
            footer: d.footer
          });
          var axisTickLines = (0, _axis.axisLines)({ axisParts: axisParts, orient: orient });
          axesTickLines.push(axisTickLines);

          return _react2.default.createElement(_Axis2.default, {
            label: d.label,
            axisParts: axisParts,
            key: d.key || "orframe-axis-" + i,
            orient: orient,
            size: axisSize,
            margin: margin,
            position: axisPosition,
            ticks: d.ticks,
            tickSize: d.tickSize,
            tickFormat: d.tickFormat,
            tickValues: tickValues,
            format: d.format,
            rotate: d.rotate,
            scale: axisScale,
            className: d.className,
            name: d.name
          });
        });
      } else if (projection === "radial" && currentProps.axis) {
        var _pieceType$innerRadiu = pieceType.innerRadius,
            innerRadius = _pieceType$innerRadiu === undefined ? 0 : _pieceType$innerRadiu;
        var _currentProps$axis = currentProps.axis,
            _currentProps$axis$ti = _currentProps$axis.tickValues,
            tickValues = _currentProps$axis$ti === undefined ? rScale.ticks(Math.max(2, (adjustedSize[0] / 2 - innerRadius) / 50)) : _currentProps$axis$ti,
            label = _currentProps$axis.label,
            _currentProps$axis$ti2 = _currentProps$axis.tickFormat,
            tickFormat = _currentProps$axis$ti2 === undefined ? function (d) {
          return d;
        } : _currentProps$axis$ti2;


        var tickScale = rScaleType().domain(rExtent).range([innerRadius, adjustedSize[0] / 2]);
        var ticks = tickValues.map(function (t, i) {
          var tickSize = tickScale(t);
          if (!(innerRadius === 0 && t === 0)) {
            var axisLabel = void 0;
            var ref = "";
            if (label && i === tickValues.length - 1) {
              var labelSettings = typeof label === "string" ? { name: label } : label;
              var _labelSettings$locati = labelSettings.locationDistance,
                  locationDistance = _labelSettings$locati === undefined ? 15 : _labelSettings$locati;

              ref = Math.random().toString + " ";
              axisLabel = _react2.default.createElement(
                "g",
                {
                  className: "axis-label",
                  transform: "translate(0," + locationDistance + ")"
                },
                _react2.default.createElement(
                  "text",
                  { textAnchor: "middle" },
                  _react2.default.createElement(
                    "textPath",
                    {
                      startOffset: tickSize * Math.PI * 0.5,
                      xlinkHref: "#" + ref
                    },
                    label.name
                  )
                )
              );
            }
            return _react2.default.createElement(
              "g",
              {
                key: "orframe-radial-axis-element-" + t,
                className: "axis axis-label axis-tick",
                transform: "translate(" + margin.left + ",0)"
              },
              _react2.default.createElement("path", {
                id: ref,
                d: (0, _drawing.circlePath)(0, 0, tickSize),
                r: tickSize,
                stroke: "gray",
                fill: "none"
              }),
              _react2.default.createElement(
                "text",
                { y: -tickSize + 5, textAnchor: "middle" },
                tickFormat(t)
              ),
              axisLabel
            );
          }
          return null;
        });
        axis = _react2.default.createElement(
          "g",
          {
            key: currentProps.axis.key || "orframe-radial-axis-container",
            transform: "translate(" + adjustedSize[0] / 2 + "," + (adjustedSize[1] / 2 + margin.top) + ")"
          },
          ticks
        );
      }
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

      if (currentProps.pieceHoverAnnotation && calculatedPieceData) {
        var yMod = projection === "horizontal" ? function (d) {
          return d.middle ? d.middle : 0;
        } : function () {
          return 0;
        };
        var xMod = projection === "vertical" ? function (d) {
          return d.middle ? d.middle : 0;
        } : function () {
          return 0;
        };

        pieceDataXY = calculatedPieceData.map(function (d) {
          return _extends({}, d.piece, {
            type: "frame-hover",
            x: d.xy.x + xMod(d.xy),
            y: d.xy.y + yMod(d.xy)
          });
        });
      }

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
          projection: projection,
          data: projectedColumns,
          styleFn: (0, _dataFunctions.stringToFn)(summaryStyle, function () {}, true),
          classFn: (0, _dataFunctions.stringToFn)(summaryClass, function () {
            return "";
          }, true),
          positionFn: summaryPosition,
          renderMode: (0, _dataFunctions.stringToFn)(summaryRenderMode, undefined, true),
          canvasRender: (0, _dataFunctions.stringToFn)(canvasSummaries, undefined, true),
          type: summaryType,
          behavior: _summaryDrawing.drawSummaries,
          eventListenersGenerator: eventListenersGenerator,
          adjustedSize: adjustedSize,
          margin: margin
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
      this.calculateORFrame(nextProps);
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

      return _react2.default.createElement(_Mark2.default, markProps);
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
        if (projection !== "vertical") {
          return [rScale(rAccessor(p)), o];
        }
        var newScale = (0, _d3Scale.scaleLinear)().domain(rScale.domain()).range(rScale.range().reverse());

        return [o, newScale(rAccessor(p))];
      };

      var screenCoordinates = [0, 0];

      //TODO: Support radial??
      if (d.coordinates) {
        screenCoordinates = d.coordinates.map(function (p) {
          return screenProject(p);
        });
      } else {
        screenCoordinates = screenProject(d);
      }

      //TODO: Process your rules first
      if (this.props.svgAnnotationRules && this.props.svgAnnotationRules({
        d: d,
        i: i,
        oScale: oScale,
        rScale: rScale,
        oAccessor: oAccessor,
        rAccessor: rAccessor,
        orFrameProps: this.props,
        orFrameState: this.state
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
          orFrameState: this.state
        });
      } else if (d.type === "or") {
        return _react2.default.createElement(
          _Mark2.default,
          {
            markType: "text",
            key: d.label + "annotationtext" + i,
            forceUpdate: true,
            x: screenCoordinates[0] + (projection === "horizontal" ? 10 : 0),
            y: screenCoordinates[1] + (projection === "vertical" ? 10 : 0),
            className: "annotation annotation-or-label " + (d.className || ""),
            textAnchor: "middle"
          },
          d.label
        );
      } else if (d.type === "react-annotation" || typeof d.type === "function") {
        var noteData = _extends({
          dx: 0,
          dy: 0,
          x: screenCoordinates[0],
          y: screenCoordinates[1],
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, { type: typeof d.type === "function" ? d.type : undefined });
        return _react2.default.createElement(_Annotation2.default, { key: i, noteData: noteData });
      } else if (d.type === "enclose") {
        var circle = (0, _d3Hierarchy.packEnclose)(screenCoordinates.map(function (p) {
          return { x: p[0], y: p[1], r: 2 };
        }));
        var _noteData = _extends({
          dx: 0,
          dy: 0,
          x: circle.x,
          y: circle.y,
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, {
          type: _reactAnnotation.AnnotationCalloutCircle,
          subject: {
            radius: circle.r,
            radiusPadding: 5 || d.radiusPadding
          }
        });

        if (_noteData.rp) {
          switch (_noteData.rp) {
            case "top":
              _noteData.dx = 0;
              _noteData.dy = -circle.r - _noteData.rd;
              break;
            case "bottom":
              _noteData.dx = 0;
              _noteData.dy = circle.r + _noteData.rd;
              break;
            case "left":
              _noteData.dx = -circle.r - _noteData.rd;
              _noteData.dy = 0;
              break;
            case "right":
              _noteData.dx = circle.r + _noteData.rd;
              _noteData.dy = 0;
              break;
            default:
              _noteData.dx = 0;
              _noteData.dy = 0;
          }
        }
        //TODO: Support .ra (setting angle)

        return _react2.default.createElement(_Annotation2.default, { key: i, noteData: _noteData });
      } else if (d.type === "r") {
        var x = void 0,
            y = void 0,
            xPosition = void 0,
            yPosition = void 0,
            subject = void 0,
            dx = void 0,
            dy = void 0;
        if (this.props.projection === "radial") {
          return _react2.default.createElement(_Annotation2.default, {
            key: i,
            noteData: _extends({
              dx: 50,
              dy: 50,
              note: { label: d.label },
              connector: { end: "arrow" }
            }, d, {
              type: _reactAnnotation.AnnotationCalloutCircle,
              subject: {
                radius: (rScale(rAccessor(d)) - margin.left) / 2,
                radiusPadding: 0
              },
              x: adjustedSize[0] / 2 + margin.left,
              y: adjustedSize[1] / 2 + margin.top
            })
          });
        } else if (this.props.projection === "horizontal") {
          dx = 50;
          dy = 50;
          yPosition = d.offset || margin.top + i * 25;
          x = screenCoordinates[0];
          y = yPosition;
          subject = {
            x: x,
            y1: margin.top,
            y2: adjustedSize[1] + adjustedPosition[1] + margin.top
          };
        } else {
          dx = 50;
          dy = -20;
          xPosition = d.offset || margin.left + i * 25;
          y = screenCoordinates[1];
          x = xPosition;
          subject = {
            y: y,
            x1: margin.left,
            x2: adjustedSize[0] + adjustedPosition[0] + margin.left
          };
        }

        var _noteData2 = _extends({
          dx: dx,
          dy: dy,
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, {
          type: _reactAnnotation.AnnotationXYThreshold,
          x: x,
          y: y,
          subject: subject
        });
        return _react2.default.createElement(_Annotation2.default, { key: i, noteData: _noteData2 });
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
          tooltipContent = _props.tooltipContent;


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
        orFrameState: this.state
      }) !== null) {
        return htmlAnnotationRules({
          d: d,
          i: i,
          oScale: oScale,
          rScale: rScale,
          oAccessor: oAccessor,
          rAccessor: rAccessor,
          orFrameProps: this.props
        });
      }

      if (d.type === "frame-hover") {
        //To string because React gives a DOM error if it gets a date
        var content = _react2.default.createElement(
          "div",
          { className: "tooltip-content" },
          _react2.default.createElement(
            "p",
            { key: "html-annotation-content-1" },
            oAccessor(d).toString()
          ),
          _react2.default.createElement(
            "p",
            { key: "html-annotation-content-2" },
            rAccessor(d).toString()
          )
        );

        if (d.type === "frame-hover" && tooltipContent) {
          content = tooltipContent(d);
        }

        return _react2.default.createElement(
          "div",
          {
            key: "xylabel" + i,
            className: "annotation annotation-or-label tooltip " + this.props.projection + " " + (d.className || ""),
            style: {
              position: "absolute",
              bottom: 10 + this.props.size[1] - d.y + "px",
              left: d.x + "px"
            }
          },
          content
        );
      } else if (d.type === "column-hover") {
        var maxPiece = (0, _d3Array.max)(d.pieces.map(function (d) {
          return d._orFR;
        }));
        //we need to ignore negative pieces to make sure the hover behavior populates on top of the positive bar
        var sumPiece = (0, _d3Array.sum)(d.pieces.map(function (d) {
          return d._orFR;
        }).filter(function (p) {
          return p > 0;
        }));
        var positionValue = summaryType.type || ["swarm", "point", "clusterbar"].find(function (d) {
          return d === type.type;
        }) ? maxPiece : sumPiece;

        var xPosition = this.state.projectedColumns[oAccessor(d.pieces[0])].middle + adjustedPosition[0];
        var yPosition = positionValue;
        yPosition += margin.bottom + margin.top + 10;

        if (this.props.projection === "horizontal") {
          yPosition = adjustedSize[1] - this.state.projectedColumns[oAccessor(d.pieces[0])].middle + adjustedPosition[0] + margin.top + margin.bottom;
          xPosition = positionValue + adjustedPosition[0] + margin.left;
        } else if (this.props.projection === "radial") {
          ;
          var _pointOnArcAtAngle = (0, _pieceDrawing.pointOnArcAtAngle)(d.arcAngles.translate, d.arcAngles.midAngle, d.arcAngles.length);

          var _pointOnArcAtAngle2 = _slicedToArray(_pointOnArcAtAngle, 2);

          xPosition = _pointOnArcAtAngle2[0];
          yPosition = _pointOnArcAtAngle2[1];

          yPosition = 10 + adjustedSize[1] - yPosition;
        }

        //To string because React gives a DOM error if it gets a date
        var _content = _react2.default.createElement(
          "div",
          { className: "tooltip-content" },
          _react2.default.createElement(
            "p",
            { key: "or-annotation-1" },
            oAccessor(d.pieces[0]).toString()
          ),
          _react2.default.createElement(
            "p",
            { key: "or-annotation-2" },
            sumPiece
          )
        );

        if (d.type === "column-hover" && this.props.tooltipContent) {
          _content = this.props.tooltipContent(d);
        }

        if (d.type === "xy") {
          _content = d.label;
        }

        return _react2.default.createElement(
          "div",
          {
            key: "orlabel" + i,
            className: "annotation annotation-or-label tooltip " + this.props.projection + " " + (d.className || ""),
            style: {
              position: "absolute",
              bottom: yPosition + "px",
              left: xPosition + "px"
            }
          },
          _content
        );
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
          _props2$className = _props2.className,
          className = _props2$className === undefined ? "" : _props2$className,
          _props2$annotationSet = _props2.annotationSettings,
          annotationSettings = _props2$annotationSet === undefined ? {} : _props2$annotationSet,
          size = _props2.size,
          downloadFields = _props2.downloadFields,
          rAccessor = _props2.rAccessor,
          oAccessor = _props2.oAccessor,
          name = _props2.name,
          download = _props2.download,
          _props2$annotations = _props2.annotations,
          annotations = _props2$annotations === undefined ? [] : _props2$annotations,
          title = _props2.title,
          matte = _props2.matte,
          renderKey = _props2.renderKey,
          interaction = _props2.interaction,
          customClickBehavior = _props2.customClickBehavior,
          customHoverBehavior = _props2.customHoverBehavior,
          customDoubleClickBehavior = _props2.customDoubleClickBehavior,
          _props2$projection = _props2.projection,
          projection = _props2$projection === undefined ? "vertical" : _props2$projection,
          backgroundGraphics = _props2.backgroundGraphics,
          _props2$foregroundGra = _props2.foregroundGraphics,
          foregroundGraphics = _props2$foregroundGra === undefined ? [] : _props2$foregroundGra,
          beforeElements = _props2.beforeElements;
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
          _state$oLabels = _state.oLabels,
          oLabels = _state$oLabels === undefined ? [] : _state$oLabels;


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
        projectedCoordinateNames: { y: "y", x: "x" },
        defaultSVGRule: this.defaultORSVGRule.bind(this),
        defaultHTMLRule: this.defaultORHTMLRule.bind(this),
        hoverAnnotation: !!pieceDataXY,
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
        projection: projection
      });
    }
  }]);

  return orFrame;
}(_react2.default.Component);

orFrame.propTypes = {
  name: _propTypes2.default.string,
  orient: _propTypes2.default.string,
  title: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object]),
  margin: _propTypes2.default.oneOfType([_propTypes2.default.number, _propTypes2.default.object]),
  format: _propTypes2.default.string,
  properties: _propTypes2.default.object,
  size: _propTypes2.default.array.isRequired,
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
  optimizeRendering: _propTypes2.default.bool,
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
  oLabel: _propTypes2.default.oneOfType([_propTypes2.default.bool, _propTypes2.default.func]),
  hoverAnnotation: _propTypes2.default.bool,
  axis: _propTypes2.default.object,
  backgroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array]),
  foregroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array])
};

module.exports = orFrame;