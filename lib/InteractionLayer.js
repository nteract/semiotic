"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Brush = require("d3-brush");

var _d3Array = require("d3-array");

var _d3Selection = require("d3-selection");

var _d3Voronoi = require("d3-voronoi");

var _semioticMark = require("semiotic-mark");

var _Brush = require("./Brush");

var _Brush2 = _interopRequireDefault(_Brush);

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components


var InteractionLayer = function (_React$Component) {
  _inherits(InteractionLayer, _React$Component);

  function InteractionLayer(props) {
    _classCallCheck(this, InteractionLayer);

    var _this = _possibleConstructorReturn(this, (InteractionLayer.__proto__ || Object.getPrototypeOf(InteractionLayer)).call(this, props));

    _this.createBrush = _this.createBrush.bind(_this);
    _this.createColumnsBrush = _this.createColumnsBrush.bind(_this);
    _this.brushStart = _this.brushStart.bind(_this);
    _this.brush = _this.brush.bind(_this);
    _this.brushEnd = _this.brushEnd.bind(_this);
    _this.changeVoronoi = _this.changeVoronoi.bind(_this);
    _this.doubleclickVoronoi = _this.doubleclickVoronoi.bind(_this);
    _this.clickVoronoi = _this.clickVoronoi.bind(_this);
    _this.calculateOverlay = _this.calculateOverlay.bind(_this);

    _this.state = {
      overlayRegions: _this.calculateOverlay(props)
    };
    return _this;
  }

  _createClass(InteractionLayer, [{
    key: "changeVoronoi",
    value: function changeVoronoi(d, customHoverTypes) {
      if (this.props.customHoverBehavior) {
        this.props.customHoverBehavior(d);
      }
      if (!d) {
        this.props.voronoiHover(null);
      } else if (customHoverTypes === true) {
        var vorD = _extends({}, d);
        vorD.type = vorD.type === "column-hover" ? "column-hover" : "frame-hover";
        this.props.voronoiHover(vorD);
      } else {
        var arrayWrappedHoverTypes = Array.isArray(customHoverTypes) ? customHoverTypes : [customHoverTypes];
        var mappedHoverTypes = arrayWrappedHoverTypes.map(function (c) {
          var finalC = typeof c === "function" ? c(d) : c;
          return _extends({}, d, finalC);
        });
        this.props.voronoiHover(mappedHoverTypes);
      }
    }
  }, {
    key: "clickVoronoi",
    value: function clickVoronoi(d) {
      if (this.props.customClickBehavior) {
        this.props.customClickBehavior(d);
      }
    }
  }, {
    key: "doubleclickVoronoi",
    value: function doubleclickVoronoi(d) {
      if (this.props.customDoubleClickBehavior) {
        this.props.customClickBehavior(d);
      }
    }
  }, {
    key: "brushStart",
    value: function brushStart(e, c) {
      if (this.props.interaction.start) {
        this.props.interaction.start(e, c);
      }
    }
  }, {
    key: "brush",
    value: function brush(e, c) {
      if (this.props.interaction.during) {
        this.props.interaction.during(e, c);
      }
    }
  }, {
    key: "brushEnd",
    value: function brushEnd(e, c) {
      if (this.props.interaction.end) {
        this.props.interaction.end(e, c);
      }
    }
  }, {
    key: "createBrush",
    value: function createBrush() {
      var _this2 = this;

      var semioticBrush = void 0,
          mappingFn = void 0,
          selectedExtent = void 0;

      if (this.props.interaction.brush === "xBrush") {
        mappingFn = function mappingFn(d) {
          return !d ? null : [_this2.props.xScale.invert(d[0]), _this2.props.xScale.invert(d[1])];
        };
        semioticBrush = (0, _d3Brush.brushX)();
        selectedExtent = this.props.interaction.extent.map(function (d) {
          return _this2.props.xScale(d);
        });
      } else if (this.props.interaction.brush === "yBrush") {
        mappingFn = function mappingFn(d) {
          return !d ? null : [_this2.props.yScale.invert(d[0]), _this2.props.yScale.invert(d[1])];
        };
        semioticBrush = (0, _d3Brush.brushY)();
        selectedExtent = this.props.interaction.extent.map(function (d) {
          return _this2.props.yScale(d);
        });
      } else {
        semioticBrush = (0, _d3Brush.brush)();
        mappingFn = function mappingFn(d) {
          return !d ? null : [[_this2.props.xScale.invert(d[0][0]), _this2.props.yScale.invert(d[0][1])], [_this2.props.xScale.invert(d[1][0]), _this2.props.yScale.invert(d[1][1])]];
        };
        selectedExtent = this.props.interaction.extent.map(function (d) {
          return [_this2.props.xScale(d[0]), _this2.props.yScale(d[1])];
        });
      }

      semioticBrush.extent([[this.props.margin.left, this.props.margin.top], [this.props.size[0] + this.props.margin.left, this.props.size[1] + this.props.margin.top]]).on("start", function () {
        _this2.brushStart(mappingFn(_d3Selection.event.selection));
      }).on("brush", function () {
        _this2.brush(mappingFn(_d3Selection.event.selection));
      }).on("end", function () {
        _this2.brushEnd(mappingFn(_d3Selection.event.selection));
      });

      return _react2.default.createElement(
        "g",
        { className: "brush" },
        _react2.default.createElement(_Brush2.default, {
          type: this.props.interaction.brush,
          selectedExtent: selectedExtent,
          svgBrush: semioticBrush,
          size: this.props.size
        })
      );
    }
  }, {
    key: "componentWillReceiveProps",
    value: function componentWillReceiveProps(nextProps) {
      this.setState({ overlayRegions: this.calculateOverlay(nextProps) });
    }
  }, {
    key: "calculateOverlay",
    value: function calculateOverlay(props) {
      var _this3 = this;

      var voronoiPaths = [];
      var xScale = props.xScale,
          yScale = props.yScale,
          points = props.points,
          projectedX = props.projectedX,
          projectedY = props.projectedY,
          projectedYMiddle = props.projectedYMiddle,
          margin = props.margin,
          size = props.size,
          overlay = props.overlay,
          _props$interactionOve = props.interactionOverflow,
          interactionOverflow = _props$interactionOve === undefined ? { top: 0, bottom: 0, left: 0, right: 0 } : _props$interactionOve;


      if (points && props.hoverAnnotation && !overlay) {
        var voronoiDataset = [];
        var voronoiUniqueHash = {};

        points.forEach(function (d) {
          var xValue = parseInt(xScale(d[projectedX]));
          var yValue = parseInt(yScale(d[projectedYMiddle] || d[projectedY]));
          if (xValue && yValue && isNaN(xValue) === false && isNaN(yValue) === false) {
            var pointKey = xValue + "," + yValue;
            if (!voronoiUniqueHash[pointKey]) {
              var voronoiPoint = _extends({}, d, {
                coincidentPoints: [d],
                voronoiX: xValue,
                voronoiY: yValue
              });
              voronoiDataset.push(voronoiPoint);
              voronoiUniqueHash[pointKey] = voronoiPoint;
            } else {
              voronoiUniqueHash[pointKey].coincidentPoints.push(d);
            }
          }
        });

        var voronoiXExtent = (0, _d3Array.extent)(voronoiDataset.map(function (d) {
          return d.voronoiX;
        }));
        var voronoiYExtent = (0, _d3Array.extent)(voronoiDataset.map(function (d) {
          return d.voronoiY;
        }));

        var voronoiExtent = [[Math.min(voronoiXExtent[0], margin.left - interactionOverflow.left), Math.min(voronoiYExtent[0], margin.top - interactionOverflow.top)], [Math.max(voronoiXExtent[1], size[0] + margin.left + interactionOverflow.right), Math.max(voronoiXExtent[1], size[1] + margin.top + interactionOverflow.bottom)]];

        var voronoiDiagram = (0, _d3Voronoi.voronoi)().extent(voronoiExtent).x(function (d) {
          return d.voronoiX;
        }).y(function (d) {
          return d.voronoiY;
        });

        var voronoiData = voronoiDiagram.polygons(voronoiDataset);
        var voronoiLinks = voronoiDiagram.links(voronoiDataset);

        //create neighbors
        voronoiLinks.forEach(function (v) {
          if (!v.source.neighbors) {
            v.source.neighbors = [];
          }
          v.source.neighbors.push(v.target);
        });

        voronoiPaths = voronoiData.map(function (d, i) {
          return _react2.default.createElement("path", {
            onClick: function onClick() {
              _this3.clickVoronoi(voronoiDataset[i]);
            },
            onDoubleClick: function onDoubleClick() {
              _this3.doubleclickVoronoi(voronoiDataset[i]);
            },
            onMouseEnter: function onMouseEnter() {
              _this3.changeVoronoi(voronoiDataset[i], props.hoverAnnotation);
            },
            onMouseLeave: function onMouseLeave() {
              _this3.changeVoronoi();
            },
            key: "interactionVoronoi" + i,
            d: "M" + d.join("L") + "Z",
            style: { fillOpacity: 0 }
          });
        }, this);

        return voronoiPaths;
      } else if (overlay) {
        var renderedOverlay = overlay.map(function (overlayRegion) {
          return _react2.default.createElement(_semioticMark.Mark, _extends({
            forceUpdate: true
          }, overlayRegion, {
            onClick: function onClick() {
              _this3.clickVoronoi(overlayRegion.onClick());
            },
            onDoubleClick: function onDoubleClick() {
              _this3.doubleclickVoronoi(overlayRegion.onDoubleClick());
            },
            onMouseEnter: function onMouseEnter() {
              _this3.changeVoronoi(overlayRegion.onMouseEnter(), props.hoverAnnotation);
            },
            onMouseLeave: function onMouseLeave() {
              _this3.changeVoronoi();
            }
          }));
        });

        return renderedOverlay;
      }
    }
  }, {
    key: "createColumnsBrush",
    value: function createColumnsBrush() {
      var _this4 = this;

      var _props = this.props,
          projection = _props.projection,
          rScale = _props.rScale,
          interaction = _props.interaction,
          size = _props.size,
          oColumns = _props.oColumns,
          margin = _props.margin;


      var semioticBrush = void 0,
          mappingFn = void 0;

      var max = rScale.domain()[1];

      var type = "yBrush";

      if (projection && projection === "horizontal") {
        type = "xBrush";
        mappingFn = function mappingFn(d) {
          return !d ? null : [rScale.invert(d[0]), rScale.invert(d[1])];
        };
      } else {
        mappingFn = function mappingFn(d) {
          return !d ? null : [Math.abs(rScale.invert(d[1]) - max), Math.abs(rScale.invert(d[0]) - max)];
        };
      }

      var rRange = rScale.range();

      var columnHash = oColumns;
      var brushPosition = void 0,
          selectedExtent = void 0;
      var brushes = Object.keys(columnHash).map(function (c) {
        if (projection && projection === "horizontal") {
          selectedExtent = interaction.extent[c] ? interaction.extent[c].map(function (d) {
            return rScale(d);
          }) : rRange;
          brushPosition = [0, columnHash[c].x];
          semioticBrush = (0, _d3Brush.brushX)();
          semioticBrush.extent([[rRange[0], 0], [rRange[1], columnHash[c].width]]).on("start", function () {
            _this4.brushStart(mappingFn(_d3Selection.event.selection), c);
          }).on("brush", function () {
            _this4.brush(mappingFn(_d3Selection.event.selection), c);
          }).on("end", function () {
            _this4.brushEnd(mappingFn(_d3Selection.event.selection), c);
          });
        } else {
          selectedExtent = interaction.extent[c] ? interaction.extent[c].map(function (d) {
            return margin.top + rRange[1] - rScale(d);
          }).reverse() : rRange;
          brushPosition = [columnHash[c].x, 0];
          semioticBrush = (0, _d3Brush.brushY)();
          semioticBrush.extent([[0, rRange[0]], [columnHash[c].width, rRange[1]]]).on("start", function () {
            _this4.brushStart(mappingFn(_d3Selection.event.selection), c);
          }).on("brush", function () {
            _this4.brush(mappingFn(_d3Selection.event.selection), c);
          }).on("end", function () {
            _this4.brushEnd(mappingFn(_d3Selection.event.selection), c);
          });
        }

        return _react2.default.createElement(
          "g",
          { key: "column-brush-" + c, className: "brush" },
          _react2.default.createElement(_Brush2.default, {
            type: type,
            position: brushPosition,
            key: "orbrush" + c,
            selectedExtent: selectedExtent,
            svgBrush: semioticBrush,
            size: size
          })
        );
      });
      return brushes;
    }
  }, {
    key: "render",
    value: function render() {
      var semioticBrush = null;
      var _props2 = this.props,
          interaction = _props2.interaction,
          position = _props2.position,
          svgSize = _props2.svgSize;
      var overlayRegions = this.state.overlayRegions;
      var enabled = this.props.enabled;


      if (interaction && interaction.brush) {
        enabled = true;
        semioticBrush = this.createBrush();
      }
      if (interaction && interaction.columnsBrush) {
        enabled = true;
        semioticBrush = this.createColumnsBrush();
      }

      return _react2.default.createElement(
        "div",
        {
          className: "interaction-layer",
          style: {
            position: "absolute",
            background: "none",
            pointerEvents: "none"
          }
        },
        _react2.default.createElement(
          "svg",
          {
            height: svgSize[1],
            width: svgSize[0],
            style: { background: "none", pointerEvents: "none" }
          },
          _react2.default.createElement(
            "g",
            {
              className: "interaction-overlay",
              transform: "translate(" + position + ")",
              style: { pointerEvents: enabled ? "all" : "none" }
            },
            _react2.default.createElement(
              "g",
              { className: "interaction-regions" },
              overlayRegions
            ),
            semioticBrush
          )
        )
      );
    }
  }]);

  return InteractionLayer;
}(_react2.default.Component);

InteractionLayer.propTypes = {
  name: _propTypes2.default.string,
  interaction: _propTypes2.default.object,
  overlay: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  oColumns: _propTypes2.default.object,
  xScale: _propTypes2.default.func,
  yScale: _propTypes2.default.func,
  rScale: _propTypes2.default.func,
  svgSize: _propTypes2.default.array,
  margin: _propTypes2.default.object
};

exports.default = InteractionLayer;
module.exports = exports['default'];