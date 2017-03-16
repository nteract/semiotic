'use strict';

// modules

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _d3Selection = require('d3-selection');

require('d3-transition');

var _draggable = require('../decorators/draggable');

var _draggable2 = _interopRequireDefault(_draggable);

var _drawing = require('../markBehavior/drawing');

var _markTransition = require('../constants/markTransition');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components


var PropTypes = _react2.default.PropTypes;

var Mark = (0, _draggable2.default)(_class = function (_React$Component) {
    _inherits(Mark, _React$Component);

    function Mark(props) {
        _classCallCheck(this, Mark);

        var _this = _possibleConstructorReturn(this, (Mark.__proto__ || Object.getPrototypeOf(Mark)).call(this, props));

        _this._mouseup = _this._mouseup.bind(_this);
        _this._mousedown = _this._mousedown.bind(_this);
        _this._mousemove = _this._mousemove.bind(_this);

        _this.state = { translate: [0, 0], mouseOrigin: [], translateOrigin: [0, 0], dragging: false, uiUpdate: false };

        return _this;
    }

    _createClass(Mark, [{
        key: 'shouldComponentUpdate',
        value: function shouldComponentUpdate(nextProps) {
            //data-driven transition time?
            if (this.props.markType !== nextProps.markType || this.state.dragging || this.props.forceUpdate || this.props.renderMode !== nextProps.renderMode || this.props.className !== nextProps.className || this.props.children !== nextProps.children) {
                return true;
            }

            var node = this.node;

            var actualSVG = (0, _drawing.generateSVG)(nextProps, nextProps.className);
            var cloneProps = actualSVG.props;

            if (!cloneProps) {
                return true;
            }

            _markTransition.attributeTransitionWhitelist.forEach(function (attr) {
                if (cloneProps[attr] !== this.props[attr]) {
                    (0, _d3Selection.select)(node).select("*").transition(attr).duration(500)
                    //                .duration(cloneProps.transitions.attr.d.transform)
                    .attr(attr, cloneProps[attr]);
                    //                    .each("end", this.forceUpdate);
                }
            }, this);

            if (cloneProps.style) {

                _markTransition.styleTransitionWhitelist.forEach(function (style) {
                    if (cloneProps.style[style] !== this.props.style[style]) {

                        var nextValue = cloneProps.style[style];

                        if (_markTransition.reactCSSNameStyleHash[style]) {
                            style = _markTransition.reactCSSNameStyleHash[style];
                        }

                        (0, _d3Selection.select)(node).select("*").transition(style).duration(500)
                        //                .duration(nextProps.transitions.attr.d.transform)
                        .style(style, nextValue);
                        //                    .each("end", this.forceUpdate);
                    }
                }, this);
            }

            return false;
        }
    }, {
        key: '_mouseup',
        value: function _mouseup() {
            document.onmousemove = null;

            var finalTranslate = [0, 0];
            if (!this.props.resetAfter) finalTranslate = this.state.translate;

            this.setState({ dragging: false, translate: finalTranslate, uiUpdate: false });
            if (this.props.droppable && this.props.context && this.props.context.dragSource) {
                this.props.dropFunction(this.props.context.dragSource.props, this.props);
                this.props.updateContext("dragSource", undefined);
            }
        }
    }, {
        key: '_mousedown',
        value: function _mousedown(event) {
            this.setState({ mouseOrigin: [event.pageX, event.pageY], translateOrigin: this.state.translate, dragging: true });
            document.onmouseup = this._mouseup;
            document.onmousemove = this._mousemove;
        }
    }, {
        key: '_mousemove',
        value: function _mousemove(event) {
            var xAdjust = this.props.freezeX ? 0 : 1;
            var yAdjust = this.props.freezeY ? 0 : 1;

            var adjustedPosition = [event.pageX - this.state.mouseOrigin[0], event.pageY - this.state.mouseOrigin[1]];
            var adjustedTranslate = [(adjustedPosition[0] + this.state.translateOrigin[0]) * xAdjust, (adjustedPosition[1] + this.state.translateOrigin[1]) * yAdjust];
            if (this.props.droppable && this.state.uiUpdate === false) {
                this.props.updateContext("dragSource", this);
                this.setState({ translate: adjustedTranslate, uiUpdate: true, dragging: true });
            } else {
                this.setState({ translate: adjustedTranslate });
            }
        }
    }, {
        key: 'render',
        value: function render() {
            var _this2 = this;

            //Currently children are being duplicated in the mark

            var className = this.props.className || "";

            var mouseIn = null;
            var mouseOut = null;

            if (this.props.hoverBehavior) {
                mouseIn = function mouseIn() {
                    _this2.props.updateContext("hover", _this2.props.hoverBehavior());
                };
                mouseOut = function mouseOut() {
                    _this2.props.updateContext("hover", undefined);
                };

                if (this.props.context.hover === this.props.hoverBehavior()) {
                    className += " hover";
                }
            }

            var actualSVG = (0, _drawing.generateSVG)(this.props, className);

            if (this.props.draggable) {
                return _react2.default.createElement(
                    'g',
                    { ref: function ref(node) {
                            return _this2.node = node;
                        }, className: className, onMouseEnter: mouseIn, onMouseOut: mouseOut, onDoubleClick: this._doubleclick, style: { pointerEvents: this.props.droppable && this.state.dragging ? "none" : "all" }, onMouseDown: this._mousedown, onMouseUp: this._mouseup, transform: "translate(" + this.state.translate + ")" },
                    actualSVG
                );
            } else {
                return _react2.default.createElement(
                    'g',
                    { ref: function ref(node) {
                            return _this2.node = node;
                        }, className: className, onMouseEnter: mouseIn, onMouseOut: mouseOut },
                    actualSVG
                );
            }
        }
    }]);

    return Mark;
}(_react2.default.Component)) || _class;

Mark.propTypes = {
    name: PropTypes.string,
    markType: PropTypes.string.isRequired,
    description: PropTypes.string,
    from: PropTypes.object,
    delay: PropTypes.number,
    ease: PropTypes.string,
    update: PropTypes.object,
    enter: PropTypes.object,
    exit: PropTypes.object,
    value: PropTypes.object,
    field: PropTypes.string,
    scale: PropTypes.object,
    renderMode: PropTypes.string,
    draggable: PropTypes.bool,
    droppable: PropTypes.bool
};

exports.default = Mark;
module.exports = exports['default'];