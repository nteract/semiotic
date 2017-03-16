'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _d3Collection = require('d3-collection');

var _d3Force = require('d3-force');

var _lodash = require('lodash');

var _d3Scale = require('d3-scale');

var _d3Array = require('d3-array');

var _d3Shape = require('d3-shape');

var _Axis = require('./Axis');

var _Axis2 = _interopRequireDefault(_Axis);

var _Mark = require('./Mark');

var _Mark2 = _interopRequireDefault(_Mark);

var _MarkContext = require('./MarkContext');

var _MarkContext2 = _interopRequireDefault(_MarkContext);

var _AnnotationLayer = require('./AnnotationLayer');

var _AnnotationLayer2 = _interopRequireDefault(_AnnotationLayer);

var _InteractionLayer = require('./InteractionLayer');

var _InteractionLayer2 = _interopRequireDefault(_InteractionLayer);

var _frameFunctions = require('../svg/frameFunctions');

var _SvgHelper = require('../svg/SvgHelper');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PropTypes = _react2.default.PropTypes;

/*
Use symbols for x/y/offset to avoid conflicts when projecting the dataset
But how to expose those for custom hover rules?
*/

/*
const projectedO = Symbol("o");
const projectedR = Symbol("r");
const projectedRAdjusted = Symbol("rAdjusted");
const projectedOffset = Symbol("offset");
*/

var orFrame = function (_React$Component) {
  _inherits(orFrame, _React$Component);

  function orFrame(props) {
    _classCallCheck(this, orFrame);

    var _this = _possibleConstructorReturn(this, (orFrame.__proto__ || Object.getPrototypeOf(orFrame)).call(this, props));

    _this.calculateORFrame = _this.calculateORFrame.bind(_this);
    _this.defaultORHTMLRule = _this.defaultORHTMLRule.bind(_this);
    _this.defaultORSVGRule = _this.defaultORSVGRule.bind(_this);
    _this.adjustedPositionSize = _this.adjustedPositionSize.bind(_this);

    _this.renderBody = _this.renderBody.bind(_this);

    _this.state = {
      lineData: null,
      pointData: null,
      projectedLines: null,
      projectedPoints: null,
      fullDataset: null,
      adjustedPosition: null,
      adjustedSize: null,
      backgroundGraphics: null,
      foregroundGraphics: null,
      axisData: null,
      axis: null,
      renderNumber: 0 };

    _this.oAccessor = null;
    _this.rAccessor = null;
    _this.oScale = null;
    _this.rScale = null;

    return _this;
  }

  _createClass(orFrame, [{
    key: 'onPieceClick',
    value: function onPieceClick(d, i) {
      if (this.props.onPieceClick) {
        this.props.onPieceClick(d, i);
      }
    }
  }, {
    key: 'onPieceEnter',
    value: function onPieceEnter(d, i) {
      if (this.props.onPieceEnter) {
        this.props.onPieceEnter(d, i);
      }
    }
  }, {
    key: 'onPieceOut',
    value: function onPieceOut(d, i) {
      if (this.props.onPieceOut) {
        this.props.onPieceOut(d, i);
      }
    }
  }, {
    key: 'changeVoronoi',
    value: function changeVoronoi(_ref) {
      var pieces = _ref.pieces,
          summary = _ref.summary,
          arcAngles = _ref.arcAngles,
          length = _ref.length;

      if (this.props.customHoverBehavior) {
        this.props.customHoverBehavior({ pieces: pieces, summary: summary, arcAngles: arcAngles, length: length });
      }
      if (!pieces) {
        this.setState({ voronoiHover: null });
      } else {
        this.setState({ voronoiHover: { type: "frame-hover", pieces: pieces, summary: summary, arcAngles: arcAngles } });
      }
    }
  }, {
    key: 'clickVoronoi',
    value: function clickVoronoi(_ref2) {
      var pieces = _ref2.pieces,
          summary = _ref2.summary,
          arcAngles = _ref2.arcAngles,
          length = _ref2.length;

      if (this.props.customClickBehavior) {
        this.props.customClickBehavior({ pieces: pieces, summary: summary, arcAngles: arcAngles, length: length });
      }
    }
  }, {
    key: 'calculateORFrame',
    value: function calculateORFrame(currentProps) {
      var _this2 = this;

      //needs to work without bardata
      var ordinalHover = void 0;
      var oLabels = void 0;
      var connectorMarks = [];

      var summaryType = _typeof(currentProps.summaryType) === 'object' && currentProps.summaryType !== null ? currentProps.summaryType : { type: currentProps.summaryType };
      var pieceType = _typeof(currentProps.type) === 'object' && currentProps.type !== null ? currentProps.type : { type: currentProps.type };
      var connectorType = _typeof(currentProps.connectorType) === 'object' && currentProps.connectorType !== null ? currentProps.connectorType : { type: currentProps.connectorType };

      var projection = !currentProps.projection || currentProps.projection === "radial" && pieceType.type !== "bar" ? "vertical" : currentProps.projection;

      var barData = currentProps.data ? currentProps.data.map(function (d, i) {
        if ((typeof d === 'undefined' ? 'undefined' : _typeof(d)) !== "object") {
          return { value: d, renderKey: i };
        }
        return _extends(d, { renderKey: i });
      }) : [];

      var oAccessor = currentProps.oAccessor || function (d) {
        return d.renderKey;
      };
      var rAccessor = currentProps.rAccessor || function (d) {
        return d.value;
      };
      var summaryValueAccessor = currentProps.summaryValueAccessor || function (d) {
        return d.length;
      };

      var summaryData = summaryType.type ? (0, _d3Collection.nest)().key(oAccessor).entries(currentProps.data) : [];

      var allData = [].concat(_toConsumableArray(barData));
      summaryData.forEach(function (d) {
        allData = [].concat(_toConsumableArray(allData), _toConsumableArray(d.values));
      });

      //      const dataAccessor = currentProps.dataAccessor || function (d) {return d}
      var margin = (0, _frameFunctions.calculateMargin)(currentProps);

      var title = null;
      if (typeof currentProps.title === "string") {
        title = _react2.default.createElement(
          'text',
          { x: currentProps.size[0] / 2, y: 25, className: "frame-title", style: { textAnchor: "middle", pointerEvents: "none" } },
          currentProps.title
        );
      }
      //assume if defined then it's an svg mark of some sort
      else if (currentProps.title) {
          title = currentProps.title;
        }

      var nestedData = (0, _d3Collection.nest)().key(oAccessor).rollup(function (leaves) {
        return (0, _d3Array.sum)(leaves.map(rAccessor));
      }).entries(allData);

      var oExtent = currentProps.oExtent || (0, _lodash.uniq)(allData.map(function (d, i) {
        return oAccessor(d, i);
      }));

      var rExtent = currentProps.rExtent || [0, (0, _d3Array.max)(nestedData, function (d) {
        return d.value;
      })];

      var _adjustedPositionSize = this.adjustedPositionSize(this.props),
          adjustedPosition = _adjustedPositionSize.adjustedPosition,
          adjustedSize = _adjustedPositionSize.adjustedSize;

      var totalRExtent = currentProps.rExtent || [0, (0, _d3Array.max)(allData, rAccessor)];
      if (summaryType.type || pieceType.type === "swarm" || pieceType.type === "point") {
        rExtent = totalRExtent;
      }

      if (currentProps.yBaseline !== undefined && !currentProps.rExtent) {
        rExtent[0] = currentProps.yBaseline;
      }

      if (currentProps.sortO) {
        oExtent = oExtent.sort(currentProps.sortO);
      }
      if (currentProps.invertR) {
        rExtent = [rExtent[1], rExtent[0]];
      }

      var oDomain = [margin.left, adjustedSize[0] + margin.left];
      var rDomain = [margin.top, adjustedSize[1] + margin.top];

      if (projection === "horizontal") {
        rDomain = [margin.left, adjustedSize[0] + margin.left];
        oDomain = [margin.top, adjustedSize[1] + margin.top];
      }

      var oScaleType = currentProps.oScaleType || _d3Scale.scaleBand;
      var rScaleType = currentProps.rScaleType || _d3Scale.scaleLinear;

      var cwHash = void 0;

      var oScale = void 0;

      if (currentProps.columnWidth) {
        (function () {
          var thresholdDomain = [margin.left];
          var maxColumnValues = (0, _d3Array.sum)(barData.map(currentProps.columnWidth));

          cwHash = { total: 0 };
          oExtent.forEach(function (d, i) {
            var oValue = (0, _d3Array.sum)(barData.filter(function (p, q) {
              return oAccessor(p, q) === d;
            }).map(currentProps.columnWidth));
            var stepValue = oValue / maxColumnValues * (oDomain[1] - oDomain[0]);
            cwHash[d] = stepValue;
            cwHash.total = cwHash.total + stepValue;
            if (i !== oExtent.length - 1) {
              thresholdDomain.push(stepValue + thresholdDomain[i]);
            }
          });

          oScale = (0, _d3Scale.scaleOrdinal)().domain(oExtent).range(thresholdDomain);
        })();
      } else {
        oScale = oScaleType().domain(oExtent).range(oDomain);
      }

      var rScale = rScaleType().domain(rExtent).range(rDomain);
      var totalRScale = rScaleType().domain(totalRExtent).range(rDomain);

      this.oScale = oScale;
      this.rScale = rScale;

      this.oAccessor = oAccessor;
      this.rAccessor = rAccessor;

      var projectedColumns = {};

      var bars = [];
      var summaries = [];

      var padding = currentProps.oPadding ? currentProps.oPadding : 0;

      var columnWidth = cwHash ? 0 : oScale.bandwidth() - padding;

      var pieceData = void 0,
          mappedMiddles = void 0;

      var projectedPieces = [];
      var mappedMiddleSize = adjustedSize[0] + margin.left;
      if (projection === "horizontal") {
        mappedMiddleSize = adjustedSize[1] + margin.top;
      }
      mappedMiddles = this.mappedMiddles(oScale, mappedMiddleSize, padding);

      oExtent.forEach(function (o) {
        projectedColumns[o] = { name: o };
        if (cwHash) {
          projectedColumns[o].width = cwHash[o];
        } else {
          projectedColumns[o].width = columnWidth;
        }
        projectedColumns[o].x = oScale(o);
        projectedColumns[o].y = margin.top;
        projectedColumns[o].middle = mappedMiddles[o];
      });

      if (pieceType.type || connectorType.type) {
        (function () {
          var nestedPieces = {};
          (0, _d3Collection.nest)().key(oAccessor).entries(barData).forEach(function (d) {
            nestedPieces[d.key] = d.values;
          });
          pieceData = oExtent.map(function (d) {
            return nestedPieces[d];
          });
        })();
      }

      if (pieceType.type === "swarm") {
        (function () {

          var circleRadius = pieceType.r || Math.min(3, rDomain[1] * columnWidth / barData.length / oExtent.length);
          var iterations = pieceType.iterations || 120;

          oExtent.forEach(function (ordset, ordsetI) {
            var projectedOrd = [];
            projectedPieces.push(projectedOrd);
            var simulation = (0, _d3Force.forceSimulation)(pieceData[ordsetI]).force("y", (0, _d3Force.forceY)(function (d, i) {
              return totalRScale(rAccessor(d, i));
            }).strength(pieceType.strength || 2)).force("x", (0, _d3Force.forceX)(projectedColumns[ordset].middle)).force("collide", (0, _d3Force.forceCollide)(circleRadius)).stop();

            for (var i = 0; i < iterations; ++i) {
              simulation.tick();
            }var renderedPieces = pieceData[ordsetI].map(function (d, i) {
              var renderMode = currentProps.renderFn && currentProps.renderFn(d, i);

              var xPosition = d.x;
              var yPosition = margin.top + rDomain[1] - d.y;

              if (projection === "horizontal") {
                yPosition = d.x;
                xPosition = d.y;
              }
              projectedOrd.push({ data: d, x: xPosition, offset: 0, y: yPosition, size: 1 });
              var actualCircleRadius = typeof circleRadius === "function" ? circleRadius(d, i) : circleRadius;

              var piece = _react2.default.createElement(_Mark2.default, {
                markType: 'rect',
                renderMode: renderMode,
                key: "piece-" + d.renderKey,
                rx: actualCircleRadius,
                ry: actualCircleRadius,
                x: xPosition - actualCircleRadius / 2,
                y: yPosition - actualCircleRadius / 2,
                width: actualCircleRadius * 2,
                height: actualCircleRadius * 2,
                style: currentProps.style(d, i),
                onClick: function onClick() {
                  _this2.onPieceClick(d, i);
                },
                onMouseEnter: function onMouseEnter() {
                  _this2.onPieceEnter(d, i);
                },
                onMouseOut: function onMouseOut() {
                  _this2.onPieceOut(d, i);
                }
              });

              return piece;
            });
            bars = [].concat(_toConsumableArray(bars), _toConsumableArray(renderedPieces));
          });
        })();
      } else if (pieceType.type === "point") {
        (function () {
          var circleRadius = 3;

          oExtent.forEach(function (ordset, ordsetI) {
            var projectedOrd = [];
            projectedPieces.push(projectedOrd);

            var renderedPieces = pieceData[ordsetI].map(function (d, i) {
              var renderMode = currentProps.renderFn && currentProps.renderFn(d, i);

              var xPosition = projectedColumns[ordset].middle;
              var yPosition = margin.top + rDomain[1] - rScale(rAccessor(d, i));

              if (projection === "horizontal") {
                yPosition = projectedColumns[ordset].middle;
                xPosition = totalRScale(rAccessor(d, i));
              }

              projectedOrd.push({ data: d, x: xPosition, offset: 0, y: yPosition, size: 1 });

              var piece = _react2.default.createElement(_Mark2.default, {
                markType: 'rect',
                renderMode: renderMode,
                key: "piece-" + d.renderKey,
                rx: circleRadius,
                ry: circleRadius,
                x: xPosition - circleRadius / 2,
                y: yPosition - circleRadius / 2,
                width: circleRadius * 2,
                height: circleRadius * 2,
                style: currentProps.style(d, i),
                onClick: function onClick() {
                  _this2.onPieceClick(d, i);
                },
                onMouseEnter: function onMouseEnter() {
                  _this2.onPieceEnter(d, i);
                },
                onMouseOut: function onMouseOut() {
                  _this2.onPieceOut(d, i);
                }
              });

              return piece;
            });
            bars = [].concat(_toConsumableArray(bars), _toConsumableArray(renderedPieces));
          });
        })();
      } else if (pieceType.type === "bar") {
        oExtent.forEach(function (ordset, ordsetI) {
          var projectedOrd = [];
          projectedPieces.push(projectedOrd);

          var barColumnWidth = projectedColumns[ordset].width;

          //STACKING
          var currentOffset = 0;
          var renderedPieces = pieceData[ordsetI].map(function (d, i) {

            var pieceHeight = rScale(rAccessor(d, i)) - rScale.range()[0];
            var renderMode = currentProps.renderFn && currentProps.renderFn(d, i);

            var xPosition = projectedColumns[ordset].x;
            var yPosition = margin.top + rScale.range()[1] - currentOffset - rScale(rAccessor(d, i));
            var finalWidth = barColumnWidth;
            var finalHeight = pieceHeight;

            if (projection === "horizontal") {
              yPosition = projectedColumns[ordset].x;
              xPosition = margin.left + currentOffset;
              finalHeight = barColumnWidth;
              finalWidth = pieceHeight;
            }
            projectedOrd.push({ data: d, x: xPosition, offset: finalWidth, y: yPosition, size: finalHeight });

            var markD = void 0,
                translate = void 0,
                pieceMarkType = "rect";

            if (projection === "radial") {
              pieceMarkType = "path";
              var arcGenerator = (0, _d3Shape.arc)().innerRadius(currentOffset / 2).outerRadius(pieceHeight / 2 + currentOffset / 2);
              var angle = 1 / oExtent.length;
              var startAngle = angle * ordsetI;
              var endAngle = startAngle + angle;
              var twoPI = Math.PI * 2;

              //BETTER ME
              if (cwHash) {
                angle = projectedColumns[ordset].width / cwHash.total;
                startAngle = projectedColumns[ordset].x / cwHash.total;
                endAngle = startAngle + angle;
              }

              markD = arcGenerator({ startAngle: startAngle * twoPI, endAngle: endAngle * twoPI });
              translate = "translate(" + adjustedSize[0] / 2 + "," + adjustedSize[1] / 2 + ")";
            }

            var piece = _react2.default.createElement(_Mark2.default, {
              markType: pieceMarkType,
              renderMode: renderMode,
              key: "piece-" + d.renderKey,
              x: xPosition,
              y: yPosition,
              width: finalWidth,
              height: finalHeight,
              rx: 0,
              ry: 0,
              d: markD,
              transform: translate,
              style: currentProps.style(d, ordsetI),
              onClick: function onClick() {
                _this2.onPieceClick(d, i);
              },
              onMouseEnter: function onMouseEnter() {
                _this2.onPieceEnter(d, i);
              },
              onMouseOut: function onMouseOut() {
                _this2.onPieceOut(d, i);
              }
            });
            currentOffset = currentOffset + pieceHeight;
            return piece;
          });
          bars = [].concat(_toConsumableArray(bars), _toConsumableArray(renderedPieces));
        });
      }
      if (connectorType.type) {
        //Handle Data
        //Handle Function
        if (typeof connectorType.type === "function") {
          (function () {
            var connectionRule = connectorType.type;
            projectedPieces.forEach(function (pieceArray, pieceArrayI) {
              pieceArray.forEach(function (piece, pieceI) {
                var nextColumn = projectedPieces[pieceArrayI + 1];
                if (nextColumn) {
                  var matchingPieceIndex = nextColumn.map(function (d, i) {
                    return connectionRule(d.data, i);
                  }).indexOf(connectionRule(piece.data, pieceI));
                  if (matchingPieceIndex !== -1) {
                    var matchingPiece = nextColumn[matchingPieceIndex];
                    var markD = void 0;
                    if (currentProps.projection === "vertical") {
                      markD = (0, _SvgHelper.drawAreaConnector)({ x1: piece.x + piece.offset, x2: matchingPiece.x, y1: piece.y, y2: matchingPiece.y, sizeX1: 0, sizeX2: 0, sizeY1: piece.size, sizeY2: matchingPiece.size });
                    } else if (currentProps.projection === "horizontal") {
                      markD = (0, _SvgHelper.drawAreaConnector)({ x1: piece.x, x2: matchingPiece.x, y1: piece.y + piece.size, y2: matchingPiece.y, sizeX1: piece.offset, sizeX2: matchingPiece.offset, sizeY1: 0, sizeY2: 0 });
                    }
                    var renderMode = currentProps.renderFn && currentProps.renderFn(piece, pieceI);

                    var connectorStyle = currentProps.connectorStyle({ source: piece.data, target: matchingPiece.data });
                    connectorMarks.push(_react2.default.createElement(_Mark2.default, { renderMode: renderMode, markType: 'path', d: markD, key: "connector" + piece.data.renderKey, style: connectorStyle }));
                  }
                }
              });
            });
          })();
        }
      }
      if (summaryType.type) {
        if (summaryType.type === "boxplot") {
          oExtent.forEach(function (summary, summaryI) {
            var thisSummaryData = summaryData.filter(function (d) {
              return d.key === summary;
            })[0].values;

            var summaryStyle = currentProps.summaryStyle(thisSummaryData[0], summaryI);

            var summaryDataNest = thisSummaryData.map(function (p) {
              return rAccessor(p);
            }).map(function (p) {
              return rDomain[1] - totalRScale(p);
            }).sort(function (a, b) {
              return b - a;
            });

            summaryDataNest = [(0, _d3Array.quantile)(summaryDataNest, 0.0), (0, _d3Array.quantile)(summaryDataNest, 0.25), (0, _d3Array.quantile)(summaryDataNest, 0.5), (0, _d3Array.quantile)(summaryDataNest, 0.75), (0, _d3Array.quantile)(summaryDataNest, 1.0)];

            var translate = "translate(" + projectedColumns[summary].middle + "," + margin.top + ")";
            var extentlineX1 = 0;
            var extentlineX2 = 0;
            var extentlineY1 = summaryDataNest[0];
            var extentlineY2 = summaryDataNest[4];
            var topLineX1 = -columnWidth / 2;
            var topLineX2 = columnWidth / 2;
            var midLineX1 = -columnWidth / 2;
            var midLineX2 = columnWidth / 2;
            var bottomLineX1 = -columnWidth / 2;
            var bottomLineX2 = columnWidth / 2;
            var rectWidth = columnWidth;
            var rectHeight = summaryDataNest[1] - summaryDataNest[3];
            var rectY = summaryDataNest[3];
            var rectX = -columnWidth / 2;
            var topLineY1 = summaryDataNest[0];
            var topLineY2 = summaryDataNest[0];
            var bottomLineY1 = summaryDataNest[4];
            var bottomLineY2 = summaryDataNest[4];
            var midLineY1 = summaryDataNest[2];
            var midLineY2 = summaryDataNest[2];

            if (currentProps.projection === "horizontal") {
              summaryDataNest = thisSummaryData.map(function (p) {
                return rAccessor(p);
              }).map(function (p) {
                return totalRScale(p);
              }).sort(function (a, b) {
                return b - a;
              });

              summaryDataNest = [(0, _d3Array.quantile)(summaryDataNest, 0.0), (0, _d3Array.quantile)(summaryDataNest, 0.25), (0, _d3Array.quantile)(summaryDataNest, 0.5), (0, _d3Array.quantile)(summaryDataNest, 0.75), (0, _d3Array.quantile)(summaryDataNest, 1.0)];

              translate = "translate(0," + projectedColumns[summary].middle + ")";
              extentlineY1 = 0;
              extentlineY2 = 0;
              extentlineX1 = summaryDataNest[0];
              extentlineX2 = summaryDataNest[4];
              topLineY1 = -columnWidth / 2;
              topLineY2 = columnWidth / 2;
              midLineY1 = -columnWidth / 2;
              midLineY2 = columnWidth / 2;
              bottomLineY1 = -columnWidth / 2;
              bottomLineY2 = columnWidth / 2;
              rectHeight = columnWidth;
              rectWidth = summaryDataNest[1] - summaryDataNest[3];
              rectX = summaryDataNest[3];
              rectY = -columnWidth / 2;
              topLineX1 = summaryDataNest[0];
              topLineX2 = summaryDataNest[0];
              bottomLineX1 = summaryDataNest[4];
              bottomLineX2 = summaryDataNest[4];
              midLineX1 = summaryDataNest[2];
              midLineX2 = summaryDataNest[2];
            }

            var renderMode = currentProps.renderFn ? currentProps.renderFn(summary, summaryI) : undefined;

            summaries.push(_react2.default.createElement(
              'g',
              {
                transform: translate,
                key: "summaryPiece-" + summaryI },
              _react2.default.createElement(_Mark2.default, { renderMode: renderMode, markType: 'line', x1: extentlineX1, x2: extentlineX2, y1: extentlineY1, y2: extentlineY2, style: _extends({ strokeWidth: "2px" }, summaryStyle) }),
              _react2.default.createElement(_Mark2.default, { renderMode: renderMode, markType: 'line', x1: topLineX1, x2: topLineX2, y1: topLineY1, y2: topLineY2, style: _extends({ strokeWidth: "2px" }, summaryStyle) }),
              _react2.default.createElement(_Mark2.default, { renderMode: renderMode, markType: 'line', x1: bottomLineX1, x2: bottomLineX2, y1: bottomLineY1, y2: bottomLineY2, style: _extends({ strokeWidth: "2px" }, summaryStyle) }),
              _react2.default.createElement(_Mark2.default, { renderMode: renderMode, markType: 'line', x1: midLineX1, x2: midLineX2, y1: midLineY1, y2: midLineY2, style: _extends({ strokeWidth: "4px" }, summaryStyle) }),
              _react2.default.createElement(_Mark2.default, { renderMode: renderMode, markType: 'rect', x: rectX, width: rectWidth, y: rectY, height: rectHeight, style: _extends({ strokeWidth: "1px" }, summaryStyle) })
            ));
          });
        } else {
          oExtent.forEach(function (summary, summaryI) {
            var renderMode = currentProps.renderFn ? currentProps.renderFn(summary, summaryI) : undefined;
            var thisSummaryData = summaryData.filter(function (d) {
              return d.key === summary;
            })[0].values;

            var summaryStyle = currentProps.summaryStyle(thisSummaryData[0], summaryI);
            var summaryDataNest = thisSummaryData.sort(function (a, b) {
              return rAccessor(b) - rAccessor(a);
            });

            var buckets = summaryType.bins || 25;
            var bucketSize = (rDomain[1] - rDomain[0]) / buckets;

            var violinHist = (0, _d3Array.histogram)();
            var totalRScaleDomain = totalRScale.domain();
            var binDomain = totalRScaleDomain;
            var binBuckets = totalRScale.ticks(buckets);
            if (totalRScaleDomain[1] < totalRScaleDomain[0]) {
              binDomain = binDomain.reverse();
              binBuckets = binBuckets.reverse();
            }

            var bins = violinHist.domain(binDomain).thresholds(binBuckets).value(function (p) {
              return rAccessor(p);
            })(summaryDataNest);

            bins = bins.map(function (d) {
              return { y: rDomain[1] - bucketSize - totalRScale(d.x0), value: summaryValueAccessor(d) };
            }).filter(function (d) {
              return d.value !== 0;
            });

            var binMax = (0, _d3Array.max)(bins.map(function (d) {
              return d.value;
            }));

            var translate = "translate(" + projectedColumns[oAccessor(thisSummaryData[0])].middle + "," + margin.top + ")";
            if (projection === "horizontal") {
              translate = "translate(" + margin.left + "," + projectedColumns[oAccessor(thisSummaryData[0])].middle + ")";
            }
            if (summaryType.type === "heatmap") {

              var tiles = bins.map(function (d, i) {
                var opacity = d.value / binMax;
                var xProp = -columnWidth / 2;
                var yProp = d.y;
                var height = bucketSize;
                var width = columnWidth;
                if (currentProps.projection === "horizontal") {
                  yProp = -columnWidth / 2;
                  xProp = adjustedSize[0] - d.y - bucketSize;
                  height = columnWidth;
                  width = bucketSize;
                }
                return _react2.default.createElement(_Mark2.default, {
                  markType: 'rect',
                  renderMode: renderMode,
                  key: "heatmap-" + summaryI + "-" + i,
                  x: xProp,
                  y: yProp,
                  height: height,
                  width: width,
                  style: { opacity: opacity, fill: summaryStyle.fill }
                });
              });

              summaries.push(_react2.default.createElement(
                'g',
                {
                  transform: translate,
                  key: "summaryPiece-" + summaryI },
                tiles
              ));
            } else if (summaryType.type === "histogram") {
              var _tiles = bins.map(function (d, i) {
                var opacity = d.value / binMax;
                var rectX = -columnWidth / 2;
                var y = d.y;
                var height = bucketSize;
                var width = columnWidth * opacity;
                if (currentProps.projection === "horizontal") {
                  y = columnWidth - columnWidth * opacity - columnWidth / 2;
                  height = columnWidth * opacity;
                  rectX = adjustedSize[0] - d.y - bucketSize;
                  width = bucketSize;
                }
                return _react2.default.createElement(_Mark2.default, {
                  markType: 'rect',
                  renderMode: renderMode,
                  key: "heatmap-" + summaryI + "-" + i,
                  x: rectX,
                  y: y,
                  height: height,
                  width: width,
                  style: summaryStyle
                });
              });

              summaries.push(_react2.default.createElement(
                'g',
                {
                  transform: translate,
                  key: "summaryPiece-" + summaryI },
                _tiles
              ));
            } else if (summaryType.type === "violin") {

              var violinArea = (0, _d3Shape.area)().curve(_d3Shape.curveCatmullRom);

              if (projection === "horizontal") {
                violinArea.x(function (summaryPoint) {
                  return adjustedSize[0] - summaryPoint.y - bucketSize / 2;
                }).y0(function (summaryPoint) {
                  return -summaryPoint.value / binMax * columnWidth / 2;
                }).y1(function (summaryPoint) {
                  return summaryPoint.value / binMax * columnWidth / 2;
                });
              } else {
                violinArea.y(function (summaryPoint) {
                  return summaryPoint.y + bucketSize / 2;
                }).x0(function (summaryPoint) {
                  return -summaryPoint.value / binMax * columnWidth / 2;
                }).x1(function (summaryPoint) {
                  return summaryPoint.value / binMax * columnWidth / 2;
                });
              }

              summaries.push(_react2.default.createElement(
                'g',
                {
                  transform: translate,
                  key: "summaryPiece-" + summaryI },
                _react2.default.createElement(_Mark2.default, {
                  renderMode: renderMode,
                  markType: 'path',
                  style: summaryStyle,
                  d: violinArea(bins)
                })
              ));
            } else if (summaryType.type === "ekg") {

              var violinD = "M";
              if (projection === "horizontal") {
                bins.forEach(function (summaryPoint, gpi) {
                  violinD += adjustedSize[0] - summaryPoint.y - bucketSize / 2;
                  violinD += ",";
                  violinD += -(summaryPoint.value / binMax * columnWidth) + columnWidth / 2;
                  violinD += gpi === bins.length - 1 ? "" : " L";
                });
              } else {
                bins.forEach(function (summaryPoint, gpi) {
                  violinD += summaryPoint.value / binMax * columnWidth - columnWidth / 2;
                  violinD += ",";
                  violinD += summaryPoint.y;
                  violinD += gpi === bins.length - 1 ? "" : " L";
                });
              }

              summaries.push(_react2.default.createElement(
                'g',
                {
                  transform: translate,
                  key: "summaryPiece-" + summaryI },
                _react2.default.createElement(_Mark2.default, {
                  renderMode: renderMode,
                  markType: 'path',
                  style: summaryStyle,
                  d: violinD
                })
              ));
            }
          });
        }
      }

      var labelArray = [];

      var pieArcs = [];

      if (currentProps.oLabel || currentProps.hoverAnnotation) {
        ordinalHover = oExtent.map(function (d, i) {
          var arcGenerator = (0, _d3Shape.arc)().innerRadius(0).outerRadius(rScale.range()[1] / 2);
          var angle = 1 / oExtent.length;
          var startAngle = angle * i;
          var twoPI = Math.PI * 2;

          if (cwHash) {
            angle = cwHash[d] / cwHash.total;
            startAngle = oScale(d) / cwHash.total;
          }

          var endAngle = startAngle + angle;
          var midAngle = startAngle + angle / 2;

          var markD = arcGenerator({ startAngle: startAngle * twoPI, endAngle: endAngle * twoPI });
          var translate = [adjustedSize[0] / 2, adjustedSize[1] / 2];
          var centroid = arcGenerator.centroid({ startAngle: startAngle * twoPI, endAngle: endAngle * twoPI });
          pieArcs.push({ startAngle: startAngle, endAngle: endAngle, midAngle: midAngle, markD: markD, translate: translate, centroid: centroid });
        });
      }

      if (currentProps.oLabel) {
        (function () {
          var labelingFn = void 0;
          if (currentProps.oLabel === true) {
            labelingFn = function labelingFn(d) {
              return _react2.default.createElement(
                'text',
                { style: { textAnchor: projection === "horizontal" ? "end" : "middle" } },
                d
              );
            };
          } else if (typeof currentProps.oLabel === "function") {
            labelingFn = currentProps.oLabel;
          }

          oExtent.forEach(function (d, i) {
            var xPosition = mappedMiddles[d];
            var yPosition = 0;

            if (projection === "horizontal") {
              yPosition = mappedMiddles[d];
              xPosition = margin.left - 3;
            } else if (projection === "radial") {
              xPosition = pieArcs[i].centroid[0] + pieArcs[i].translate[0];
              yPosition = pieArcs[i].centroid[1] + pieArcs[i].translate[1];
            }
            var label = labelingFn(d, currentProps.data ? currentProps.data.filter(function (p, q) {
              return oAccessor(p, q) === d;
            }) : undefined);
            labelArray.push(_react2.default.createElement(
              'g',
              { key: "olabel-" + i, transform: "translate(" + xPosition + "," + yPosition + ")" },
              label
            ));
          });

          if (projection === "vertical") {
            oLabels = _react2.default.createElement(
              'g',
              { transform: "translate(0," + (15 + margin.top + rScale.range()[1]) + ")" },
              labelArray
            );
          } else if (projection === "horizontal") {
            oLabels = _react2.default.createElement(
              'g',
              { transform: "translate(0,0)" },
              labelArray
            );
          } else if (projection === "radial") {
            oLabels = _react2.default.createElement(
              'g',
              { transform: "translate(0,0)" },
              labelArray
            );
          }
        })();
      }

      if (currentProps.hoverAnnotation) {
        ordinalHover = oExtent.map(function (d, i) {
          var barColumnWidth = projectedColumns[d].width;
          var xPosition = projectedColumns[d].x;
          var yPosition = margin.top;
          var height = rScale.range()[1];
          var width = barColumnWidth + padding;
          if (projection === "horizontal") {
            yPosition = oScale(d) - padding;
            xPosition = margin.left;
            width = rScale.range()[1];
            height = barColumnWidth + padding;
          }

          if (projection === "radial") {
            var _ret7 = function () {
              var _pieArcs$i = pieArcs[i],
                  markD = _pieArcs$i.markD,
                  centroid = _pieArcs$i.centroid,
                  translate = _pieArcs$i.translate,
                  midAngle = _pieArcs$i.midAngle;

              return {
                v: _react2.default.createElement('path', {
                  key: "hover" + d,
                  d: markD,
                  transform: "translate(" + translate + ")",
                  style: { opacity: 0, fill: "pink" },
                  onClick: function onClick() {
                    _this2.clickVoronoi({ pieces: barData.filter(function (p, q) {
                        return oAccessor(p, q) === d;
                      }), summary: summaryData[i], arcAngles: { centroid: centroid, translate: translate, midAngle: midAngle, length: rScale.range()[1] / 2 } });
                  },
                  onMouseEnter: function onMouseEnter() {
                    _this2.changeVoronoi({ pieces: barData.filter(function (p, q) {
                        return oAccessor(p, q) === d;
                      }), summary: summaryData[i], arcAngles: { centroid: centroid, translate: translate, midAngle: midAngle, length: rScale.range()[1] / 2 } });
                  },
                  onMouseLeave: function onMouseLeave() {
                    _this2.changeVoronoi({});
                  }
                })
              };
            }();

            if ((typeof _ret7 === 'undefined' ? 'undefined' : _typeof(_ret7)) === "object") return _ret7.v;
          }

          return _react2.default.createElement('rect', {
            key: "hover" + d,
            x: xPosition,
            y: yPosition,
            height: height,
            width: width,
            style: { opacity: 0, stroke: "black", fill: "pink" },
            onClick: function onClick() {
              _this2.clickVoronoi({ pieces: barData.filter(function (p, q) {
                  return oAccessor(p, q) === d;
                }), summary: summaryData[i] });
            },
            onMouseEnter: function onMouseEnter() {
              _this2.changeVoronoi({ pieces: barData.filter(function (p, q) {
                  return oAccessor(p, q) === d;
                }), summary: summaryData[i] });
            },
            onMouseLeave: function onMouseLeave() {
              _this2.changeVoronoi({});
            }
          });
        });
      }

      var axis = null;

      if (projection !== "radial" && currentProps.axis) {
        (function () {
          var axisPosition = [0, 0];
          var axisSize = [0, 0];
          var axes = Array.isArray(currentProps.axis) ? currentProps.axis : [currentProps.axis];
          axis = axes.map(function (d) {
            var tickValues = void 0;

            var axisScale = rScaleType().domain(rScale.domain());

            var orient = (0, _frameFunctions.trueAxis)(d.orient, currentProps);

            axisSize = adjustedSize;

            if (orient === "right") {
              axisPosition = [margin.left, 0];
              axisScale.range([rScale.range()[1], rScale.range()[0]]);
            } else if (orient === "left") {
              axisPosition = [margin.left, 0];
              axisScale.range([rScale.range()[1], rScale.range()[0]]);
            } else if (orient === "top") {
              axisPosition = [0, margin.top];
              axisScale.range(rScale.range());
            } else if (orient === "bottom") {
              axisPosition = [0, margin.top];
              axisScale.range(rScale.range());
            }

            if (d.tickValues && Array.isArray(d.tickValues)) {
              tickValues = d.tickValues;
            }
            //otherwise assume a function
            else if (d.tickValues) {
                tickValues = d.tickValues(currentProps.data, currentProps.size, rScale);
              }

            return _react2.default.createElement(_Axis2.default, {
              key: d.key,
              orient: orient,
              size: axisSize,
              position: axisPosition,
              ticks: d.ticks,
              tickSize: d.tickSize,
              tickFormat: d.tickFormat,
              tickValues: tickValues,
              format: d.format,
              scale: axisScale,
              className: d.className,
              name: d.name });
          });
        })();
      }

      this.setState({
        voronoiHover: null,
        bars: bars,
        summaries: summaries,
        connectors: connectorMarks,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        backgroundGraphics: currentProps.backgroundGraphics,
        foregroundGraphics: currentProps.foregroundGraphics,
        axisData: currentProps.axis,
        axis: axis,
        oLabels: oLabels,
        title: title,
        ordinalHover: ordinalHover,
        renderNumber: this.state.renderNumber + 1,
        oAccessor: currentProps.oAccessor,
        rAccessor: currentProps.rAccessor,
        oScaleType: currentProps.oScaleType,
        rScaleType: currentProps.rScaleType,
        oExtent: currentProps.oExtent,
        rExtent: currentProps.rExtent,
        projectedColumns: projectedColumns
      });
    }
  }, {
    key: 'componentWillMount',
    value: function componentWillMount() {
      this.calculateORFrame(this.props);
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      //      if (!this.props.optimizeRendering) {
      this.calculateORFrame(nextProps);
      /*      }
            else if (this.props.customLineType !== nextProps.customLineType || this.props.xMetric !== nextProps.xMetric || this.props.yMetric !== nextProps.yMetric) {
              this.calculateORFrame(nextProps)
            }
      
            else {
              this.state.fullDataset.some((d,i) => {
                if (this.props.oAccessor(d,i) !== nextProps.oAccessor(d,i) || this.props.rAccessor(d,i) !== nextProps.rAccessor(d,i)) {
                  this.calculateORFrame(nextProps)
                  return true
                }
              });
      
            }
            */
    }
  }, {
    key: 'clonedAppliedElement',
    value: function clonedAppliedElement(_ref3) {
      var tx = _ref3.tx,
          ty = _ref3.ty,
          d = _ref3.d,
          i = _ref3.i,
          markProps = _ref3.markProps,
          styleFn = _ref3.styleFn,
          renderFn = _ref3.renderFn,
          classFn = _ref3.classFn,
          baseClass = _ref3.baseClass;


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
    key: 'defaultORSVGRule',
    value: function defaultORSVGRule(d, i, annotationLayer) {
      var oAccessor = this.oAccessor;
      var rAccessor = this.rAccessor;

      var oScale = this.oScale;
      var rScale = this.rScale;

      var _adjustedPositionSize2 = this.adjustedPositionSize(this.props),
          adjustedPosition = _adjustedPositionSize2.adjustedPosition,
          adjustedSize = _adjustedPositionSize2.adjustedSize;

      //TODO: Process your rules first


      if (this.props.svgAnnotationRules && this.props.svgAnnotationRules({ d: d, i: i, oScale: oScale, rScale: rScale, oAccessor: oAccessor, rAccessor: rAccessor, orFrameProps: this.props }) !== null) {
        return this.props.svgAnnotationRules({ d: d, i: i, oScale: oScale, rScale: rScale, oAccessor: oAccessor, rAccessor: rAccessor, orFrameProps: this.props, adjustedPosition: adjustedPosition, adjustedSize: adjustedSize, annotationLayer: annotationLayer });
      }

      return null;
    }
  }, {
    key: 'pointOnArcAtAngle',
    value: function pointOnArcAtAngle(center, angle, distance) {
      var radians = Math.PI * (angle + .75) * 2;

      var xPosition = center[0] + distance * Math.cos(radians);
      var yPosition = center[1] + distance * Math.sin(radians);

      return [xPosition, yPosition];
    }
  }, {
    key: 'mappedMiddles',
    value: function mappedMiddles(oScale, middleMax, padding) {
      var oScaleDomainValues = oScale.domain();

      var mappedMiddles = {};
      oScaleDomainValues.map(function (p, q) {
        var base = oScale(p) - padding;
        var next = oScaleDomainValues[q + 1] ? oScale(oScaleDomainValues[q + 1]) : middleMax;
        var diff = (next - base) / 2;
        mappedMiddles[p] = base + diff;
      });

      return mappedMiddles;
    }
  }, {
    key: 'defaultORHTMLRule',
    value: function defaultORHTMLRule(d, i) {

      var oAccessor = this.oAccessor;
      var rAccessor = this.rAccessor;
      var padding = this.props.oPadding ? this.props.oPadding : 0;

      var oScale = this.oScale;
      var rScale = this.rScale;

      var _adjustedPositionSize3 = this.adjustedPositionSize(this.props),
          adjustedPosition = _adjustedPositionSize3.adjustedPosition,
          adjustedSize = _adjustedPositionSize3.adjustedSize;

      var mappedMiddles = this.mappedMiddles(oScale, adjustedSize[0] + padding, padding);

      //TODO: Process your rules first
      if (this.props.htmlAnnotationRules && this.props.htmlAnnotationRules({ d: d, i: i, oScale: oScale, rScale: rScale, oAccessor: oAccessor, rAccessor: rAccessor, orFrameProps: this.props }) !== null) {
        return this.props.htmlAnnotationRules({ d: d, i: i, oScale: oScale, rScale: rScale, oAccessor: oAccessor, rAccessor: rAccessor, orFrameProps: this.props });
      }

      if (d.type === "xy" || d.type === "frame-hover") {
        var maxPiece = (0, _d3Array.max)(d.pieces.map(rAccessor));
        var sumPiece = (0, _d3Array.sum)(d.pieces.map(rAccessor));
        var positionValue = ["swarm", "point"].indexOf(this.props.type) !== -1 ? maxPiece : sumPiece;
        var xPosition = mappedMiddles[oAccessor(d.pieces[0])] + adjustedPosition[0];
        var yPosition = rScale(positionValue) + adjustedPosition[1] + 10;

        if (this.props.projection === "horizontal") {
          yPosition = adjustedSize[1] - oScale(oAccessor(d.pieces[0]));
          xPosition = rScale(positionValue) + adjustedPosition[0];
        } else if (this.props.projection === "radial") {
          var _pointOnArcAtAngle = this.pointOnArcAtAngle(d.arcAngles.translate, d.arcAngles.midAngle, d.arcAngles.length);

          var _pointOnArcAtAngle2 = _slicedToArray(_pointOnArcAtAngle, 2);

          xPosition = _pointOnArcAtAngle2[0];
          yPosition = _pointOnArcAtAngle2[1];

          yPosition = 10 + adjustedSize[1] - yPosition;
        }

        //To string because React gives a DOM error if it gets a date
        var content = [_react2.default.createElement(
          'p',
          { key: 'xy-annotation-1' },
          oAccessor(d.pieces[0]).toString()
        ), _react2.default.createElement(
          'p',
          { key: 'xy-annotation-2' },
          sumPiece
        )];

        if (d.type === "frame-hover" && this.props.tooltipContent) {
          content = this.props.tooltipContent(d);
        }

        if (d.type === "xy") {
          content = d.label;
        }

        return _react2.default.createElement(
          'div',
          {
            key: "xylabel" + i,
            className: 'annotation annotation-xy-label',
            style: { position: "absolute",
              bottom: yPosition + "px",
              left: xPosition - 75 + "px",
              width: "150px" } },
          content
        );
      }
      return null;
    }
  }, {
    key: 'adjustedPositionSize',
    value: function adjustedPositionSize(props) {
      var margin = (0, _frameFunctions.calculateMargin)(props);
      var position = props.position || [0, 0];
      var xPositionAdjust = 0;
      var yPositionAdjust = 0;
      var heightAdjust = margin.top + margin.bottom;
      var widthAdjust = margin.left + margin.right;

      var adjustedPosition = [position[0] + xPositionAdjust, position[1] + yPositionAdjust];
      var adjustedSize = [props.size[0] - widthAdjust, props.size[1] - heightAdjust];

      return { adjustedPosition: adjustedPosition, adjustedSize: adjustedSize };
    }
  }, {
    key: 'render',
    value: function render() {
      return this.renderBody({});
    }
  }, {
    key: 'renderBody',
    value: function renderBody(_ref4) {
      var _this3 = this;

      var afterElements = _ref4.afterElements;


      var annotationLayer = null;

      var totalAnnotations = (0, _lodash.clone)(this.props.annotations);

      if (this.state.voronoiHover) {
        if (totalAnnotations) {
          totalAnnotations.push(this.state.voronoiHover);
        } else {
          totalAnnotations = [this.state.voronoiHover];
        }
      }

      if (totalAnnotations) {
        annotationLayer = _react2.default.createElement(_AnnotationLayer2.default, {
          annotations: totalAnnotations,
          svgAnnotationRule: function svgAnnotationRule(d, i, thisALayer) {
            return _this3.defaultORSVGRule(d, i, thisALayer);
          },
          htmlAnnotationRule: function htmlAnnotationRule(d, i, thisALayer) {
            return _this3.defaultORHTMLRule(d, i, thisALayer);
          },
          size: this.props.size,
          position: this.state.adjustedPosition
        });
      }

      return _react2.default.createElement(
        'div',
        { className: this.props.className + " frame", style: { background: "none" } },
        _react2.default.createElement(
          'div',
          { className: 'frame-elements', style: { height: this.props.size[1] + "px" } },
          _react2.default.createElement(
            'svg',
            { style: { position: "absolute" }, width: this.props.size[0], height: this.props.size[1] },
            _react2.default.createElement(
              'defs',
              null,
              _react2.default.createElement(
                'filter',
                { id: 'gooeyCodeFilter' },
                _react2.default.createElement('feGaussianBlur', { id: 'gaussblurrer', 'in': 'SourceGraphic',
                  stdDeviation: 3,
                  colorInterpolationFilters: 'sRGB',
                  result: 'blur'
                }),
                _react2.default.createElement('feColorMatrix', { 'in': 'blur',
                  mode: 'matrix',
                  values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7',
                  result: 'gooey'
                })
              ),
              _react2.default.createElement(
                'filter',
                { id: 'gooeyCodeFilter2' },
                _react2.default.createElement('feGaussianBlur', { id: 'gaussblurrer', 'in': 'SourceGraphic',
                  stdDeviation: 2,
                  colorInterpolationFilters: 'sRGB',
                  result: 'blur'
                }),
                _react2.default.createElement('feColorMatrix', { 'in': 'blur',
                  mode: 'matrix',
                  values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7',
                  result: 'gooey'
                })
              ),
              this.props.additionalDefs
            ),
            _react2.default.createElement(
              _MarkContext2.default,
              {
                position: this.state.adjustedPosition,
                size: this.state.adjustedSize,
                orFrameChildren: true,
                renderNumber: this.state.renderNumber
              },
              this.state.backgroundGraphics,
              this.state.axis,
              _react2.default.createElement(
                'g',
                { className: 'connectors' },
                this.state.connectors
              ),
              _react2.default.createElement(
                'g',
                { className: 'pieces' },
                this.state.bars
              ),
              _react2.default.createElement(
                'g',
                { className: 'summaries' },
                this.state.summaries
              ),
              _react2.default.createElement(
                'g',
                { className: 'labels' },
                this.state.oLabels
              ),
              this.state.foregroundGraphics,
              this.state.title
            )
          ),
          _react2.default.createElement(_InteractionLayer2.default, {
            interaction: this.props.interaction,
            position: this.state.adjustedPosition,
            size: this.state.adjustedSize,
            svgSize: this.props.size,
            oScale: this.oScale,
            oColumns: this.state.projectedColumns,
            rScale: this.rScale,
            overlay: this.state.ordinalHover,
            enabled: true
          }),
          annotationLayer
        ),
        _react2.default.createElement(
          'div',
          { className: 'frame-after-elements' },
          afterElements
        )
      );
    }
  }]);

  return orFrame;
}(_react2.default.Component);

orFrame.propTypes = {
  name: PropTypes.string,
  orient: PropTypes.string,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  margin: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  format: PropTypes.string,
  properties: PropTypes.object,
  size: PropTypes.array.isRequired,
  position: PropTypes.array,
  oScaleType: PropTypes.func,
  rScaleType: PropTypes.func,
  oExtent: PropTypes.array,
  rExtent: PropTypes.array,
  invertO: PropTypes.bool,
  invertR: PropTypes.bool,
  oAccessor: PropTypes.func,
  rAccessor: PropTypes.func,
  dataAccessor: PropTypes.func,
  annotations: PropTypes.array
};

module.exports = orFrame;