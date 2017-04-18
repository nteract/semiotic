'use strict';

// modules

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _d3Brush = require('d3-brush');

var _d3Selection = require('d3-selection');

var _Brush = require('./Brush');

var _Brush2 = _interopRequireDefault(_Brush);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// components


var PropTypes = _react2.default.PropTypes;

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

        return _this;
    }

    _createClass(InteractionLayer, [{
        key: 'brushStart',
        value: function brushStart(e, c) {
            if (this.props.interaction.start) {
                this.props.interaction.start(e, c);
            }
        }
    }, {
        key: 'brush',
        value: function brush(e, c) {
            if (this.props.interaction.during) {
                this.props.interaction.during(e, c);
            }
        }
    }, {
        key: 'brushEnd',
        value: function brushEnd(e, c) {
            if (this.props.interaction.end) {
                this.props.interaction.end(e, c);
            }
        }
    }, {
        key: 'createBrush',
        value: function createBrush() {
            var _this2 = this;

            var semioticBrush = void 0; /* = brush() */
            var mappingFn = function mappingFn(d) {
                return !d ? null : [[_this2.props.xScale.invert(d[0][0]), _this2.props.yScale.invert(d[0][1])], [_this2.props.xScale.invert(d[1][0]), _this2.props.yScale.invert(d[1][1])]];
            };
            /*       
                    if (this.props.xScale && !this.props.yScale) {
            */
            mappingFn = function mappingFn(d) {
                return !d ? null : [_this2.props.xScale.invert(d[0]), _this2.props.xScale.invert(d[1])];
            };
            semioticBrush = (0, _d3Brush.brushX)();
            /*        }
                    else if (!this.props.xScale && this.props.yScale) {
                        mappingFn = d => !d ? null : [ this.props.yScale.invert(d[0]),this.props.yScale.invert(d[1]) ]
                        semioticBrush = brushY()
                    }
            */
            semioticBrush.extent([[this.props.margin.left, this.props.margin.top], [this.props.size[0] + this.props.margin.left, this.props.size[1] + this.props.margin.top]]).on("start", function () {
                _this2.brushStart(mappingFn(_d3Selection.event.selection));
            }).on("brush", function () {
                _this2.brush(mappingFn(_d3Selection.event.selection));
            }).on("end", function () {
                _this2.brushEnd(mappingFn(_d3Selection.event.selection));
            });

            var selectedExtent = this.props.interaction.extent.map(function (d) {
                return _this2.props.xScale(d);
            });

            return _react2.default.createElement(_Brush2.default, { selectedExtent: selectedExtent, svgBrush: semioticBrush, size: this.props.size });
        }
    }, {
        key: 'createColumnsBrush',
        value: function createColumnsBrush() {
            var _this3 = this;

            var semioticBrush = void 0;
            var max = this.props.rScale.domain()[1];
            var mappingFn = function mappingFn(d) {
                return !d ? null : [Math.abs(_this3.props.rScale.invert(d[0]) - max), Math.abs(_this3.props.rScale.invert(d[1]) - max)];
            };

            var rRange = this.props.rScale.range();

            var columnHash = this.props.oColumns;
            var brushes = Object.keys(columnHash).map(function (c) {
                semioticBrush = (0, _d3Brush.brushY)();
                semioticBrush.extent([[0, rRange[0]], [columnHash[c].width, rRange[1]]]).on("start", function () {
                    _this3.brushStart(mappingFn(_d3Selection.event.selection), c);
                }).on("brush", function () {
                    _this3.brush(mappingFn(_d3Selection.event.selection), c);
                }).on("end", function () {
                    _this3.brushEnd(mappingFn(_d3Selection.event.selection), c);
                });

                //            const selectedExtent = this.props.interaction.extent[c] ? this.props.interaction.extent[c].map(d => this.props.rScale(d)) : this.props.rScale.domain()
                var selectedExtent = _this3.props.interaction.extent[c] ? _this3.props.interaction.extent[c].map(function (d) {
                    return _this3.props.rScale(d);
                }) : rRange;

                return _react2.default.createElement(_Brush2.default, { position: [columnHash[c].x, 0], key: "orbrush" + c, selectedExtent: selectedExtent, svgBrush: semioticBrush, size: _this3.props.size });
            });
            return brushes;
        }
    }, {
        key: 'render',
        value: function render() {
            var semioticBrush = null;
            var enabled = this.props.enabled;

            if (this.props.interaction && this.props.interaction.brush) {
                enabled = true;
                semioticBrush = this.createBrush();
            }
            if (this.props.interaction && this.props.interaction.columnsBrush) {
                enabled = true;
                semioticBrush = this.createColumnsBrush();
            }

            return _react2.default.createElement(
                'div',
                { className: 'xyframe-interaction-layer', style: { position: "absolute", background: "none", pointerEvents: "none" } },
                _react2.default.createElement(
                    'svg',
                    { height: this.props.svgSize[1], width: this.props.svgSize[0], style: { background: "none", pointerEvents: "none" } },
                    _react2.default.createElement(
                        'g',
                        { transform: "translate(" + this.props.position + ")", style: { pointerEvents: enabled ? "all" : "none" } },
                        this.props.overlay,
                        semioticBrush
                    )
                )
            );
        }
    }]);

    return InteractionLayer;
}(_react2.default.Component);

InteractionLayer.propTypes = {
    name: PropTypes.string,
    scale: PropTypes.func,
    orient: PropTypes.string,
    title: PropTypes.string,
    format: PropTypes.string,
    values: PropTypes.array,
    properties: PropTypes.object,
    position: PropTypes.array
};

module.exports = InteractionLayer;