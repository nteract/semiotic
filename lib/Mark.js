"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Selection = require("d3-selection");

require("d3-transition");

var _flubber = require("flubber");

var _drawing = require("./markBehavior/drawing");

var _markTransition = require("./constants/markTransition");

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Decorator stopped working why?
//import draggable from '../decorators/draggable'


// components

function coordsOrPathstring(d) {
  var splitToMs = d.split("M").filter(function (p) {
    return p !== "";
  }).map(function (p) {
    return "M" + p;
  });
  return { length: splitToMs.length, coords: splitToMs };
}

//@draggable
var Mark = function (_React$Component) {
  _inherits(Mark, _React$Component);

  function Mark(props) {
    _classCallCheck(this, Mark);

    var _this = _possibleConstructorReturn(this, (Mark.__proto__ || Object.getPrototypeOf(Mark)).call(this, props));

    _this._mouseup = _this._mouseup.bind(_this);
    _this._mousedown = _this._mousedown.bind(_this);
    _this._mousemove = _this._mousemove.bind(_this);

    _this.state = {
      translate: [0, 0],
      mouseOrigin: [],
      translateOrigin: [0, 0],
      dragging: false,
      uiUpdate: false
    };
    return _this;
  }

  _createClass(Mark, [{
    key: "shouldComponentUpdate",
    value: function shouldComponentUpdate(nextProps) {
      //data-driven transition time?
      if (this.props.markType !== nextProps.markType || this.state.dragging || this.props.forceUpdate || nextProps.forceUpdate || this.props.renderMode !== nextProps.renderMode || this.props.className !== nextProps.className || this.props.children !== nextProps.children) {
        return true;
      }

      var node = this.node;

      var actualSVG = (0, _drawing.generateSVG)(nextProps, nextProps.className);
      var cloneProps = actualSVG.props;

      if (!cloneProps) {
        return true;
      }

      _markTransition.attributeTransitionWhitelist.forEach(function (attr) {
        var _this2 = this;

        if ((0, _d3Selection.select)(node).select("*").transition && (attr !== "d" || this.props.d && nextProps.d && this.props.d.match(/NaN/g) === null && nextProps.d.match(/NaN/g) === null && (this.props.d.match(/a/gi) === null && nextProps.d.match(/a/gi) === null || this.props.d.match(/a/gi) !== null && nextProps.d.match(/a/gi) !== null))) {
          if (cloneProps[attr] !== this.props[attr]) {
            if (!this.props.simpleInterpolate && !nextProps.simpleInterpolate && attr === "d" && this.props.markType === "path" && nextProps.markType === "path" && this.props.d.match(/a/gi) === null && nextProps.d.match(/a/gi) === null) {
              var prevD = coordsOrPathstring(this.props.d);
              var nextD = coordsOrPathstring(nextProps.d);
              var dummy = [[0, 0], [1, 1], [2, 2]];
              var interpolators = (nextD.length > prevD.length ? nextD : prevD).coords.map(function (c, i) {
                return (0, _flubber.interpolate)(prevD.coords[i] || dummy, nextD.coords[i] || dummy, { maxSegmentLength: _this2.props.flubberSegments || 10 });
              });
              (0, _d3Selection.select)(node).select("*").transition(attr).duration(1000).attrTween("d", function () {
                return function (t) {
                  var interps = interpolators.map(function (d) {
                    return d(t);
                  }).join("");
                  return interps;
                };
              });
            } else {
              (0, _d3Selection.select)(node).select("*").transition(attr).duration(1000)
              //                .duration(cloneProps.transitions.attr.d.transform)
              .attr(attr, cloneProps[attr]);
              //                    .each('end', this.forceUpdate);
            }
          }
        } else {
          (0, _d3Selection.select)(node).select("*").attr(attr, cloneProps[attr]);
        }
      }, this);

      if (cloneProps.style) {
        _markTransition.styleTransitionWhitelist.forEach(function (style) {
          if (cloneProps.style[style] !== this.props.style[style]) {
            var nextValue = cloneProps.style[style];

            if (_markTransition.reactCSSNameStyleHash[style]) {
              style = _markTransition.reactCSSNameStyleHash[style];
            }

            if ((0, _d3Selection.select)(node).select("*").transition) {
              (0, _d3Selection.select)(node).select("*").transition(style).duration(1000)
              //                  .duration(nextProps.transitions.attr.d.transform)
              .style(style, nextValue);
              //                  .each('end', this.forceUpdate);
            } else {
              (0, _d3Selection.select)(node).select("*").style(style, nextValue);
            }
          }
        }, this);
      }

      return false;
    }
  }, {
    key: "_mouseup",
    value: function _mouseup() {
      document.onmousemove = null;

      var finalTranslate = [0, 0];
      if (!this.props.resetAfter) finalTranslate = this.state.translate;

      this.setState({
        dragging: false,
        translate: finalTranslate,
        uiUpdate: false
      });
      if (this.props.dropFunction && this.props.context && this.props.context.dragSource) {
        this.props.dropFunction(this.props.context.dragSource.props, this.props);
        this.props.updateContext("dragSource", undefined);
      }
    }
  }, {
    key: "_mousedown",
    value: function _mousedown(event) {
      this.setState({
        mouseOrigin: [event.pageX, event.pageY],
        translateOrigin: this.state.translate,
        dragging: true
      });
      document.onmouseup = this._mouseup;
      document.onmousemove = this._mousemove;
    }
  }, {
    key: "_mousemove",
    value: function _mousemove(event) {
      var xAdjust = this.props.freezeX ? 0 : 1;
      var yAdjust = this.props.freezeY ? 0 : 1;

      var adjustedPosition = [event.pageX - this.state.mouseOrigin[0], event.pageY - this.state.mouseOrigin[1]];
      var adjustedTranslate = [(adjustedPosition[0] + this.state.translateOrigin[0]) * xAdjust, (adjustedPosition[1] + this.state.translateOrigin[1]) * yAdjust];
      if (this.props.dropFunction && this.state.uiUpdate === false) {
        this.props.updateContext("dragSource", this);
        this.setState({
          translate: adjustedTranslate,
          uiUpdate: true,
          dragging: true
        });
      } else {
        this.setState({ translate: adjustedTranslate });
      }
    }
  }, {
    key: "render",
    value: function render() {
      var _this3 = this;

      //Currently children are being duplicated in the mark

      var className = this.props.className || "";

      var mouseIn = null;
      var mouseOut = null;

      var actualSVG = (0, _drawing.generateSVG)(this.props, className);

      if (this.props.draggable) {
        return _react2.default.createElement(
          "g",
          {
            ref: function ref(node) {
              return _this3.node = node;
            },
            className: className,
            onMouseEnter: mouseIn,
            onMouseOut: mouseOut,
            onDoubleClick: this._doubleclick,
            style: {
              pointerEvents: this.props.dropFunction && this.state.dragging ? "none" : "all"
            },
            onMouseDown: this._mousedown,
            onMouseUp: this._mouseup,
            transform: "translate(" + this.state.translate + ")"
          },
          actualSVG
        );
      } else {
        return _react2.default.createElement(
          "g",
          {
            ref: function ref(node) {
              return _this3.node = node;
            },
            className: className,
            onMouseEnter: mouseIn,
            onMouseOut: mouseOut
          },
          actualSVG
        );
      }
    }
  }]);

  return Mark;
}(_react2.default.Component);

Mark.propTypes = {
  markType: _propTypes2.default.string.isRequired,
  forceUpdate: _propTypes2.default.bool,
  renderMode: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  draggable: _propTypes2.default.bool,
  dropFunction: _propTypes2.default.func,
  resetAfter: _propTypes2.default.bool,
  freezeX: _propTypes2.default.bool,
  freezeY: _propTypes2.default.bool,
  context: _propTypes2.default.object,
  updateContext: _propTypes2.default.func,
  className: _propTypes2.default.string
};

exports.default = Mark;
module.exports = exports['default'];