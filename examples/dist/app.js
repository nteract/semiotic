require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _MarkExamples = require('./components/MarkExamples');

var _MarkExamples2 = _interopRequireDefault(_MarkExamples);

var _DragAndDropExample = require('./components/DragAndDropExample');

var _DragAndDropExample2 = _interopRequireDefault(_DragAndDropExample);

var _XYFrameExamples = require('./components/XYFrameExamples');

var _XYFrameExamples2 = _interopRequireDefault(_XYFrameExamples);

var _XYFrameWithMinimapExamples = require('./components/XYFrameWithMinimapExamples');

var _XYFrameWithMinimapExamples2 = _interopRequireDefault(_XYFrameWithMinimapExamples);

var _XYFrameExamplesMisc = require('./components/XYFrameExamplesMisc');

var _XYFrameExamplesMisc2 = _interopRequireDefault(_XYFrameExamplesMisc);

var _XYAnnotationExamples = require('./components/XYAnnotationExamples');

var _XYAnnotationExamples2 = _interopRequireDefault(_XYAnnotationExamples);

var _XYFramePointExamples = require('./components/XYFramePointExamples');

var _XYFramePointExamples2 = _interopRequireDefault(_XYFramePointExamples);

var _ORFramePieceExamples = require('./components/ORFramePieceExamples');

var _ORFramePieceExamples2 = _interopRequireDefault(_ORFramePieceExamples);

var _ORFrameConnectorExamples = require('./components/ORFrameConnectorExamples');

var _ORFrameConnectorExamples2 = _interopRequireDefault(_ORFrameConnectorExamples);

var _ORFrameGroupExamples = require('./components/ORFrameGroupExamples');

var _ORFrameGroupExamples2 = _interopRequireDefault(_ORFrameGroupExamples);

var _DividedLineExamples = require('./components/DividedLineExamples');

var _DividedLineExamples2 = _interopRequireDefault(_DividedLineExamples);

var _BarLineChartExample = require('./components/BarLineChartExample');

var _BarLineChartExample2 = _interopRequireDefault(_BarLineChartExample);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-unused-vars */
_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_MarkExamples2.default, { label: 'Mark' })
), document.getElementById('mark-examples'));
/* eslint-enable no-unused-vars */

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_DragAndDropExample2.default, { label: 'Mark' })
), document.getElementById('drag-and-drop-examples'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_DividedLineExamples2.default, { label: 'Divided Line' })
), document.getElementById('dividedLine-examples'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_XYFrameExamples2.default, { label: 'XYFrame' })
), document.getElementById('xyFrame-examples-customlinetype'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_XYFrameExamplesMisc2.default, { label: 'XYFrame' })
), document.getElementById('xyFrame-examples-misc'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_XYFramePointExamples2.default, { label: 'XYFrame Points' })
), document.getElementById('xyFramePoint-examples'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_XYFrameWithMinimapExamples2.default, { label: 'XYFrame' })
), document.getElementById('xyFrame-examples-minimap'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_XYAnnotationExamples2.default, { label: 'XY Annotation Examples' })
), document.getElementById('xyFrame-examples-annotation'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_ORFramePieceExamples2.default, { label: 'ORFrame Pieces' })
), document.getElementById('orFramePiece-examples'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_ORFrameConnectorExamples2.default, { label: 'ORFrame Connectors' })
), document.getElementById('orFrameConnector-examples'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_ORFrameGroupExamples2.default, { label: 'ORFrame Groups' })
), document.getElementById('orFrameGroup-examples'));

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_BarLineChartExample2.default, { label: 'Bar Line Chart' })
), document.getElementById('barLine-examples'));

},{"./components/BarLineChartExample":2,"./components/DividedLineExamples":3,"./components/DragAndDropExample":4,"./components/MarkExamples":5,"./components/ORFrameConnectorExamples":6,"./components/ORFrameGroupExamples":7,"./components/ORFramePieceExamples":8,"./components/XYAnnotationExamples":9,"./components/XYFrameExamples":10,"./components/XYFrameExamplesMisc":11,"./components/XYFramePointExamples":12,"./components/XYFrameWithMinimapExamples":13,"react":undefined,"react-dom":undefined}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

var _d3Shape = require('d3-shape');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var testData = [{ id: "linedata-1", color: "#00a2ce", data: [{ sales: 5, leads: 150, x: 1 }, { sales: 7, leads: 100, x: 2 }, { sales: 7, leads: 112, x: 3 }, { sales: 4, leads: 40, x: 4 }, { sales: 2, leads: 200, x: 5 }, { sales: 3, leads: 180, x: 6 }, { sales: 5, leads: 165, x: 7 }] }];

var displayData = testData.map(function (d) {
    var moreData = [].concat(_toConsumableArray(d.data), _toConsumableArray(d.data.map(function (p) {
        return { sales: p.sales + Math.random() * 5, leads: p.leads + Math.random() * 100, x: p.x + 7 };
    })));
    return _extends(d, { data: moreData });
});

var BarLineChartExamples = function (_React$Component) {
    _inherits(BarLineChartExamples, _React$Component);

    function BarLineChartExamples(props) {
        _classCallCheck(this, BarLineChartExamples);

        return _possibleConstructorReturn(this, (BarLineChartExamples.__proto__ || Object.getPrototypeOf(BarLineChartExamples)).call(this, props));
    }

    _createClass(BarLineChartExamples, [{
        key: 'render',
        value: function render() {

            var axes = [{ key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickValues: [2, 6, 10], tickFormat: function tickFormat(d) {
                    return d + "%";
                } }, { key: "xAxis", orient: "bottom", className: "xscale", name: "TimeAxis", tickValues: [2, 4, 6, 8, 10, 12], tickFormat: function tickFormat(d) {
                    return "day " + d;
                } }];
            var axis3 = { key: "yAxis", orient: "right", className: "yscale", name: "CountAxis", ticks: 3, tickFormat: function tickFormat(d) {
                    return d;
                } };

            return _react2.default.createElement(
                'div',
                { style: { height: "300px" } },
                _react2.default.createElement(
                    'div',
                    { style: { position: "absolute" } },
                    _react2.default.createElement(_semiotic.ORFrame, {
                        className: 'divided-line-or',
                        size: [500, 300],
                        data: displayData[0].data,
                        type: "bar"
                        //                renderFn={() => "sketchy"}
                        , oAccessor: function oAccessor(d) {
                            return d.x;
                        },
                        rAccessor: function rAccessor(d) {
                            return d.leads;
                        },
                        style: function style() {
                            return { fill: "#b3331d", opacity: 1, stroke: 'white' };
                        },
                        margin: { top: 5, bottom: 25, left: 55, right: 55 },
                        axis: axis3
                    })
                ),
                _react2.default.createElement(
                    'div',
                    { style: { position: "absolute" } },
                    _react2.default.createElement(_semiotic.XYFrame, {
                        className: 'divided-line-xy',
                        axes: axes,
                        size: [500, 300],
                        lines: displayData,
                        lineDataAccessor: function lineDataAccessor(d) {
                            return d.data;
                        },
                        xAccessor: function xAccessor(d) {
                            return d.x;
                        },
                        yAccessor: function yAccessor(d) {
                            return d.sales;
                        },
                        lineStyle: function lineStyle(d) {
                            return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeWidth: "2px" };
                        },
                        customLineType: { type: "line", interpolator: _d3Shape.curveBasis, sort: null },
                        margin: { top: 5, bottom: 25, left: 55, right: 55 }
                    })
                )
            );
        }
    }]);

    return BarLineChartExamples;
}(_react2.default.Component);

module.exports = BarLineChartExamples;

},{"d3-shape":22,"react":undefined,"semiotic":undefined}],3:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

var _d3Shape = require('d3-shape');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DividedLineExample = function (_React$Component) {
  _inherits(DividedLineExample, _React$Component);

  function DividedLineExample(props) {
    _classCallCheck(this, DividedLineExample);

    return _possibleConstructorReturn(this, (DividedLineExample.__proto__ || Object.getPrototypeOf(DividedLineExample)).call(this, props));
  }

  _createClass(DividedLineExample, [{
    key: 'render',
    value: function render() {
      function randomLineGenerator(width, height, points) {
        var pointDataSet = [];
        var curY = 0.5;
        for (var x = 0; x < points; x++) {
          curY += Math.random() * 0.3 - 0.15;
          curY = Math.max(curY, 0.05);
          curY = Math.min(curY, 0.95);
          pointDataSet.push({ x: x / points * width, y: curY * height });
        }
        return pointDataSet;
      }

      function parameters(point) {
        if (point.x < 100) {
          return { fill: "none", stroke: "#b3331d", strokeWidth: 6, strokeOpacity: 0.5 };
        }
        if (point.x > 400) {
          return { fill: "none", stroke: "#b3331d", strokeWidth: 1, strokeDasharray: "5 5" };
        }
        if (point.y < 150) {
          return { fill: "none", strokeWidth: 1, stroke: "#00a2ce" };
        }
        if (point.y > 350) {
          return { fill: "none", strokeWidth: 2, stroke: "#b6a756" };
        }
        return { fill: "none", stroke: "black", strokeWidth: 1 };
      }

      var data = randomLineGenerator(500, 500, 100);

      return _react2.default.createElement(
        'svg',
        { height: '500', width: '500' },
        _react2.default.createElement(_semiotic.DividedLine, {
          parameters: parameters,
          data: [data],
          lineDataAccessor: function lineDataAccessor(d) {
            return d;
          },
          customAccessors: { x: function x(d) {
              return d.x;
            }, y: function y(d) {
              return d.y;
            } },
          interpolate: _d3Shape.curveBasis,
          searchIterations: 20
        })
      );
    }
  }]);

  return DividedLineExample;
}(_react2.default.Component);

module.exports = DividedLineExample;

},{"d3-shape":22,"react":undefined,"semiotic":undefined}],4:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DragAndDropExample = function (_React$Component) {
    _inherits(DragAndDropExample, _React$Component);

    function DragAndDropExample(props) {
        _classCallCheck(this, DragAndDropExample);

        var _this = _possibleConstructorReturn(this, (DragAndDropExample.__proto__ || Object.getPrototypeOf(DragAndDropExample)).call(this, props));

        _this.state = { source: undefined, target: undefined };
        _this.dropMe = _this.dropMe.bind(_this);
        return _this;
    }

    _createClass(DragAndDropExample, [{
        key: 'dropMe',
        value: function dropMe(source, target) {
            this.setState({ source: source.nid, target: target.nid });
        }
    }, {
        key: 'render',
        value: function render() {
            var DragMark1 = _react2.default.createElement(_semiotic.DraggableMark, {
                nid: null,
                markType: 'circle',
                r: 20,
                cx: 50,
                cy: 50,
                style: { fill: "gray", stroke: "black", strokeWidth: this.state.source === null ? "2px" : 0 },
                dropFunction: this.dropMe
            });

            var DragMark2 = _react2.default.createElement(_semiotic.DraggableMark, {
                nid: "painty",
                markType: 'circle',
                renderMode: "painty",
                r: 20,
                cx: 150,
                cy: 50,
                style: { fill: "gray", stroke: "black", strokeWidth: this.state.source === "painty" ? "2px" : 0 },
                dropFunction: this.dropMe
            });

            var DragMark3 = _react2.default.createElement(_semiotic.DraggableMark, {
                nid: "sketchy",
                markType: 'circle',
                renderMode: "sketchy",
                r: 20,
                cx: 250,
                cy: 50,
                style: { fill: "gray", stroke: "black", strokeWidth: this.state.source === "sketchy" ? "2px" : 0 },
                dropFunction: this.dropMe
            });

            var DragMark4 = _react2.default.createElement(_semiotic.DraggableMark, {
                markType: 'rect',
                nid: 1,
                renderMode: this.state.target === 1 ? this.state.source : null,
                width: 100,
                height: 100,
                x: 175,
                y: 150,
                style: { fill: "#00a2ce" },
                dropFunction: this.dropMe
            });

            var DragMark5 = _react2.default.createElement(_semiotic.DraggableMark, {
                markType: 'rect',
                nid: 2,
                renderMode: this.state.target === 2 ? this.state.source : null,
                width: 100,
                height: 100,
                x: 25,
                y: 150,
                style: { fill: "#b3331d" },
                dropFunction: this.dropMe
            });

            return _react2.default.createElement(
                'svg',
                { height: '365', width: '500' },
                _react2.default.createElement(
                    'defs',
                    null,
                    _react2.default.createElement(
                        'marker',
                        {
                            id: 'Triangle',
                            refX: 12,
                            refY: 6,
                            markerUnits: 'userSpaceOnUse',
                            markerWidth: 12,
                            markerHeight: 18,
                            orient: 'auto' },
                        _react2.default.createElement('path', { d: 'M 0 0 12 6 0 12 3 6' })
                    ),
                    _react2.default.createElement(
                        'filter',
                        { id: 'paintyFilterHeavy' },
                        _react2.default.createElement('feGaussianBlur', { id: 'gaussblurrer', 'in': 'SourceGraphic',
                            stdDeviation: 4,
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
                        { id: 'paintyFilterLight' },
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
                    )
                ),
                _react2.default.createElement(
                    'text',
                    { x: 190, y: 125, style: { userSelect: "none", pointerEvents: "none" } },
                    'Drag me!'
                ),
                _react2.default.createElement('line', { markerEnd: 'url(#Triangle)', x1: 155, y1: 65, x2: 190, y2: 140, style: { userSelect: "none", pointerEvents: "none", stroke: "black", strokeWidth: "1px", strokeDasharray: "5 5" } }),
                _react2.default.createElement(
                    _semiotic.MarkContext,
                    null,
                    DragMark4,
                    DragMark5,
                    DragMark1,
                    DragMark2,
                    DragMark3
                )
            );
        }
    }]);

    return DragAndDropExample;
}(_react2.default.Component);

module.exports = DragAndDropExample;

},{"react":undefined,"semiotic":undefined}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MarkExamples = function (_React$Component) {
    _inherits(MarkExamples, _React$Component);

    function MarkExamples(props) {
        _classCallCheck(this, MarkExamples);

        return _possibleConstructorReturn(this, (MarkExamples.__proto__ || Object.getPrototypeOf(MarkExamples)).call(this, props));
    }

    _createClass(MarkExamples, [{
        key: 'render',
        value: function render() {
            var mark = _react2.default.createElement(_semiotic.Mark, {
                markType: 'rect',
                width: 100,
                height: 100,
                x: 25,
                y: 25,
                draggable: true,
                style: { fill: "#00a2ce", stroke: "blue", strokeWidth: "1px" }
            });

            var circleMark = _react2.default.createElement(_semiotic.Mark, {
                markType: 'circle',
                renderMode: 'forcePath',
                r: 50,
                cx: 205,
                cy: 255,
                style: { fill: "#00a2ce", stroke: "blue", strokeWidth: "1px" }
            });

            var resetMark = _react2.default.createElement(_semiotic.Mark, {
                markType: 'rect',
                width: 100,
                height: 100,
                x: 25,
                y: 135,
                draggable: true,
                resetAfter: true,
                style: { fill: "#4d430c" }
            });

            var verticalBarMark = _react2.default.createElement(_semiotic.Mark, {
                markType: 'verticalbar',
                width: 50,
                height: 100,
                x: 185,
                y: 150,
                style: { fill: "#b3331d" }
            });

            var horizontalBarMark = _react2.default.createElement(_semiotic.Mark, {
                markType: 'horizontalbar',
                width: 50,
                height: 100,
                x: 185,
                y: 150,
                style: { fill: "#b6a756" }
            });

            var sketchyMark = _react2.default.createElement(_semiotic.Mark, {
                markType: 'rect',
                renderMode: 'sketchy',
                width: 100,
                height: 100,
                x: 25,
                y: 250,
                style: { fill: "#b86117", stroke: "#b86117", strokeWidth: "4px" }
            });

            return _react2.default.createElement(
                'svg',
                { height: '365', width: '500' },
                mark,
                circleMark,
                resetMark,
                sketchyMark,
                horizontalBarMark,
                verticalBarMark
            );
        }
    }]);

    return MarkExamples;
}(_react2.default.Component);

module.exports = MarkExamples;

},{"react":undefined,"semiotic":undefined}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

var _d3Scale = require('d3-scale');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// const d3colors = d3.scale.category20c()

var colors = (0, _d3Scale.scaleLinear)().domain([0, 20, 40, 60]).range(["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]);

var testData = [];
for (var x = 1; x < 5; x++) {
  for (var xx = 0; xx <= 60; xx++) {
    testData.push({ value: Math.random() * 100 + xx * 2, column: "column" + x, color: colors(xx) });
  }
}

var funnel = [{
  color: "#00a2ce",
  visits: 1000,
  registration: 900,
  mop: 500,
  signups: 400,
  streamed: 300,
  paid: 100
}, {
  color: "#b3331d",
  visits: 200,
  registration: 180,
  mop: 170,
  signups: 160,
  streamed: 150,
  paid: 140
}, {
  color: "#b6a756",
  visits: 300,
  registration: 100,
  mop: 50,
  signups: 50,
  streamed: 50,
  paid: 50
}];

var funnelData = (0, _semiotic.funnelize)({ data: funnel, steps: ["visits", "registration", "mop", "signups", "streamed", "paid"], key: "color" });

var ORFrameConnectorExamples = function (_React$Component) {
  _inherits(ORFrameConnectorExamples, _React$Component);

  function ORFrameConnectorExamples(props) {
    _classCallCheck(this, ORFrameConnectorExamples);

    var _this = _possibleConstructorReturn(this, (ORFrameConnectorExamples.__proto__ || Object.getPrototypeOf(ORFrameConnectorExamples)).call(this, props));

    _this.state = { projection: "vertical", type: "point", columnWidth: "fixed", rAccessor: "relative", renderFn: "none",
      columnExtent: { "column1": undefined, "column2": undefined, "column3": undefined, "column4": undefined }
    };
    _this.changeProjection = _this.changeProjection.bind(_this);
    _this.changeType = _this.changeType.bind(_this);
    _this.changeCW = _this.changeCW.bind(_this);
    _this.changeRAccessor = _this.changeRAccessor.bind(_this);
    _this.changeRenderFn = _this.changeRenderFn.bind(_this);
    _this.brushing = _this.brushing.bind(_this);
    return _this;
  }

  _createClass(ORFrameConnectorExamples, [{
    key: 'changeProjection',
    value: function changeProjection(e) {
      this.setState({ projection: e.target.value });
    }
  }, {
    key: 'changeType',
    value: function changeType(e) {
      this.setState({ type: e.target.value });
    }
  }, {
    key: 'changeCW',
    value: function changeCW(e) {
      this.setState({ columnWidth: e.target.value });
    }
  }, {
    key: 'changeRAccessor',
    value: function changeRAccessor(e) {
      this.setState({ rAccessor: e.target.value });
    }
  }, {
    key: 'changeRenderFn',
    value: function changeRenderFn(e) {
      this.setState({ renderFn: e.target.value });
    }
  }, {
    key: 'brushing',
    value: function brushing(e, c) {
      var columnExtent = this.state.columnExtent;
      columnExtent[c] = e;
      this.setState(columnExtent);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var outsideHash = {};
      testData.forEach(function (d) {
        if (!outsideHash[d.color]) {
          if (_this2.state.columnExtent[d.column] && (d.value > _this2.state.columnExtent[d.column][0] || d.value < _this2.state.columnExtent[d.column][1])) {
            outsideHash[d.color] = true;
          }
        }
      });

      var frameHeight = 300;

      var typeOptions = ["bar", "point", "swarm"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "type-option" + d, label: d, value: d },
          d
        );
      });
      var projectionOptions = ["vertical", "horizontal", "radial"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "projection-option" + d, label: d, value: d },
          d
        );
      });
      var cwOptions = ["fixed", "relative"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "cw-option" + d, label: d, value: d },
          d
        );
      });
      var rAccessorOptions = ["relative", "fixed"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "rAccessor-option" + d, label: d, value: d },
          d
        );
      });
      var renderFnOptions = ["none", "sketchy", "painty"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "renderfn-option" + d, label: d, value: d },
          d
        );
      });

      var rAccessor = this.state.rAccessor === "fixed" ? function () {
        return 1;
      } : function (d) {
        return d.stepValue || d.value;
      };
      var cwFn = this.state.columnWidth === "fixed" ? undefined : function (d) {
        return d.stepValue || d.value;
      };
      var reFn = this.state.renderFn === "none" ? undefined : function () {
        return _this2.state.renderFn;
      };

      var axis = { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickFormat: function tickFormat(d) {
          return d;
        } };

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'type=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeType },
              typeOptions
            )
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'projection=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeProjection },
              projectionOptions
            )
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'columnWidth=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeCW },
              cwOptions
            )
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'rAccessor=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeRAccessor },
              rAccessorOptions
            )
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'renderFn=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeRenderFn },
              renderFnOptions
            )
          )
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          size: [500, frameHeight],
          renderFn: reFn,
          oLabel: true,
          data: funnelData,
          axis: axis,
          projection: this.state.projection,
          type: this.state.type,
          connectorType: function connectorType(d) {
            return d.funnelKey;
          },
          connectorStyle: function connectorStyle(d) {
            return { fill: d.source.funnelKey, stroke: d.source.funnelKey };
          },
          oAccessor: function oAccessor(d) {
            return d.stepName;
          },
          rAccessor: rAccessor,
          style: function style(d) {
            return { fill: d.funnelKey, stroke: "black" };
          },
          hoverAnnotation: true,
          columnWidth: cwFn,
          margin: { left: 25, top: 20, bottom: 25, right: 0 },
          oPadding: 30
        }),
        _react2.default.createElement(_semiotic.ORFrame, {
          size: [500, frameHeight],
          renderFn: reFn,
          oLabel: function oLabel(d) {
            return _react2.default.createElement(
              'g',
              { transform: 'translate(0,-20)' },
              _react2.default.createElement('rect', { height: '5', width: '5', x: '-5', style: { fill: d } }),
              _react2.default.createElement(
                'text',
                { transform: 'rotate(45)' },
                d
              )
            );
          },
          data: testData,
          projection: this.state.projection,
          type: this.state.type,
          axis: axis,
          connectorType: function connectorType(d, i) {
            return i;
          },
          connectorStyle: function connectorStyle(d) {
            return { fill: d.source.color, stroke: d.source.color, opacity: outsideHash[d.source.color] ? 0.1 : 1 };
          },
          columnWidth: cwFn,
          oAccessor: function oAccessor(d) {
            return d.column;
          },
          rAccessor: rAccessor,
          oPadding: 70,
          margin: { left: 40, right: 20, top: 20, bottom: 40 },
          style: function style(d) {
            return { fill: d.color, stroke: d.color, strokeWidth: 1, opacity: outsideHash[d.color] ? 0.1 : 1 };
          },
          hoverAnnotation: true,
          interaction: { columnsBrush: true, end: this.brushing, extent: this.state.columnExtent }
        })
      );
    }
  }]);

  return ORFrameConnectorExamples;
}(_react2.default.Component);

module.exports = ORFrameConnectorExamples;

},{"d3-scale":21,"react":undefined,"semiotic":undefined}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

var _d3Random = require('d3-random');

var _d3Array = require('d3-array');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];

var testData = [];
var nRando = (0, _d3Random.randomNormal)(50, 15);
for (var x = 1; x < 500; x++) {
  testData.push({ x: nRando(), value: Math.max(0, nRando()), color: colors[x % 4], value2: x });
}

var ORFrameSummaryExamples = function (_React$Component) {
  _inherits(ORFrameSummaryExamples, _React$Component);

  function ORFrameSummaryExamples(props) {
    _classCallCheck(this, ORFrameSummaryExamples);

    return _possibleConstructorReturn(this, (ORFrameSummaryExamples.__proto__ || Object.getPrototypeOf(ORFrameSummaryExamples)).call(this, props));
  }

  _createClass(ORFrameSummaryExamples, [{
    key: 'render',
    value: function render() {

      var frameHeight = 300;

      var axis = { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickFormat: function tickFormat(d) {
          return d;
        } };
      var axis2 = { key: "yAxis", orient: "right", className: "yscale", name: "CountAxis", tickFormat: function tickFormat(d) {
          return d;
        } };

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(_semiotic.ORFrame, {
          title: "boxplot",
          oLabel: true,
          size: [500, frameHeight],
          data: testData,
          type: "swarm",
          projection: "vertical",
          summaryType: "boxplot",
          summaryStyle: function summaryStyle(d) {
            return { stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 };
          },
          oAccessor: function oAccessor(d) {
            return d.color;
          },
          rAccessor: function rAccessor(d) {
            return d.value;
          },
          style: function style(d) {
            return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 };
          },
          oPadding: 5,
          axis: axis2
        }),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "title={'boxplot'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oLabel={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "data={testData}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "type={'swarm'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryType={'boxplot'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oAccessor={d => d.color}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "rAccessor={d => d.value}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={30}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oPadding={5}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "axis={ axis }"
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          title: "violin",
          oLabel: true,
          size: [500, frameHeight],
          data: testData,
          type: { type: "swarm", r: function r(d, i) {
              return i % 3 + 2;
            } },
          projection: "vertical",
          summaryType: "violin",
          summaryStyle: function summaryStyle(d) {
            return { stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 };
          },
          oAccessor: function oAccessor(d) {
            return d.color;
          },
          rAccessor: function rAccessor(d) {
            return d.value;
          },
          style: function style(d) {
            return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 };
          },
          oPadding: 5,
          axis: axis
        }),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "title={'violin'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oLabel={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "data={testData}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "type={'swarm'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryType={'violin'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oAccessor={d => d.color}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "rAccessor={d => d.value}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={30}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oPadding={5}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "axis={ axis }"
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          title: "heatmap",
          projection: "vertical",
          oLabel: true,
          size: [500, frameHeight],
          summaryType: "heatmap",
          data: testData,
          summaryStyle: function summaryStyle(d) {
            return { stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 };
          },
          oAccessor: function oAccessor(d) {
            return d.color;
          },
          rAccessor: function rAccessor(d) {
            return d.value;
          },
          oPadding: 5,
          axis: axis2
        }),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "title={'heatmap'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oLabel={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryType={'heatmap'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oAccessor={d => d.color}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "rAccessor={d => d.value}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={30}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oPadding={5}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "axis={ axis }"
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          title: _react2.default.createElement(
            'g',
            null,
            _react2.default.createElement(
              'text',
              null,
              'histogram'
            )
          ),
          projection: "vertical",
          oLabel: true,
          size: [500, frameHeight],
          summaryType: "histogram",
          data: testData,
          summaryStyle: function summaryStyle(d) {
            return { stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 };
          },
          summaryValueAccessor: function summaryValueAccessor(d) {
            return (0, _d3Array.sum)(d.map(function (p) {
              return p.value2;
            }));
          },
          oAccessor: function oAccessor(d) {
            return d.color;
          },
          rAccessor: function rAccessor(d) {
            return d.value;
          },
          oPadding: 5,
          axis: axis,
          rExtent: [100, 0]
        }),
        _react2.default.createElement(
          'p',
          null,
          'Fixed extent using ',
          _react2.default.createElement(
            'span',
            { className: 'code' },
            'rExtent'
          ),
          ' and vertical projection.'
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "title={'histogram'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "projection={'vertical'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oLabel={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryType={'histogram'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryValueAccessor={(d) => sum(d.map(p => p.value2))}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oAccessor={d => d.color}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "rAccessor={d => d.value}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={30}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oPadding={5}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "axis={ axis }"
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          title: "ekg",
          data: testData,
          projection: "vertical",
          oLabel: true,
          size: [500, frameHeight],
          summaryType: "ekg",
          summaryStyle: function summaryStyle(d) {
            return { stroke: d.color, fill: "none", strokeOpacity: 0.5 };
          },
          oAccessor: function oAccessor(d) {
            return d.color;
          },
          rAccessor: function rAccessor(d) {
            return d.value;
          },
          oPadding: 5,
          axis: axis
        }),
        _react2.default.createElement(
          'p',
          null,
          'The \'ekg\' summaryType is just half a violin plot. Here it is with a vertical projection.'
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "title={'ekg'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "projection={'vertical'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oLabel={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryType={'ekg'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oAccessor={d => d.color}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "rAccessor={d => d.value}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={30}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oPadding={5}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "axis={ axis }"
        )
      );
    }
  }]);

  return ORFrameSummaryExamples;
}(_react2.default.Component);

module.exports = ORFrameSummaryExamples;

},{"d3-array":14,"d3-random":20,"react":undefined,"semiotic":undefined}],8:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

//import d3 from 'd3'

// const d3colors = d3.scale.category20c()

var colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756", "#00a2ce", "#4d430c", "#b3331d"];
var testData = [];
for (var x = 1; x < 100; x++) {
  testData.push({ value: Math.random() * 100, color: colors[x % 4] });
}

var funnel = [{
  color: "#00a2ce",
  visits: 1000,
  registration: 900,
  mop: 500,
  signups: 400,
  streamed: 300,
  paid: 100
}, {
  color: "#b3331d",
  visits: 200,
  registration: 180,
  mop: 170,
  signups: 160,
  streamed: 150,
  paid: 140
}, {
  color: "#b6a756",
  visits: 300,
  registration: 100,
  mop: 50,
  signups: 50,
  streamed: 50,
  paid: 50
}];

var stackedPieData = [{ pie: "one", color: "#00a2ce", value: 25 }, { pie: "one", color: "#b3331d", value: 70 }, { pie: "one", color: "#b6a756", value: 5 }, { pie: "two", color: "#00a2ce", value: 50 }, { pie: "two", color: "#b3331d", value: 20 }, { pie: "two", color: "#b6a756", value: 30 }, { pie: "three", color: "#00a2ce", value: 90 }, { pie: "three", color: "#b3331d", value: 5 }, { pie: "three", color: "#b6a756", value: 5 }];

var stackedPieDataWithNegatives = [{ pie: "one", color: "#00a2ce", value: 25 }, { pie: "one", color: "#b3331d", value: 50 }, { pie: "one", color: "#b6a756", value: 10 }, { pie: "two", color: "#00a2ce", value: -25 }, { pie: "two", color: "#b3331d", value: -50 }, { pie: "two", color: "#b6a756", value: -10 }, { pie: "three", color: "#00a2ce", value: 25 }, { pie: "three", color: "#b3331d", value: -50 }, { pie: "three", color: "#b6a756", value: 10 }];

var funnelData = (0, _semiotic.funnelize)({ data: funnel, steps: ["visits", "registration", "mop", "signups", "streamed", "paid"], key: "color" });

var ORFramePieceExamples = function (_React$Component) {
  _inherits(ORFramePieceExamples, _React$Component);

  function ORFramePieceExamples(props) {
    _classCallCheck(this, ORFramePieceExamples);

    var _this = _possibleConstructorReturn(this, (ORFramePieceExamples.__proto__ || Object.getPrototypeOf(ORFramePieceExamples)).call(this, props));

    _this.state = { projection: "vertical", type: "bar", columnWidth: "fixed", rAccessor: "relative", renderFn: "none" };
    _this.changeProjection = _this.changeProjection.bind(_this);
    _this.changeType = _this.changeType.bind(_this);
    _this.changeCW = _this.changeCW.bind(_this);
    _this.changeRAccessor = _this.changeRAccessor.bind(_this);
    _this.changeRenderFn = _this.changeRenderFn.bind(_this);
    return _this;
  }

  _createClass(ORFramePieceExamples, [{
    key: 'changeProjection',
    value: function changeProjection(e) {
      this.setState({ projection: e.target.value });
    }
  }, {
    key: 'changeType',
    value: function changeType(e) {
      this.setState({ type: e.target.value });
    }
  }, {
    key: 'changeCW',
    value: function changeCW(e) {
      this.setState({ columnWidth: e.target.value });
    }
  }, {
    key: 'changeRAccessor',
    value: function changeRAccessor(e) {
      this.setState({ rAccessor: e.target.value });
    }
  }, {
    key: 'changeRenderFn',
    value: function changeRenderFn(e) {
      this.setState({ renderFn: e.target.value });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var frameHeight = 300;

      var typeOptions = ["bar", "point", "swarm"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "type-option" + d, label: d, value: d },
          d
        );
      });
      var projectionOptions = ["vertical", "horizontal", "radial"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "projection-option" + d, label: d, value: d },
          d
        );
      });
      var cwOptions = ["fixed", "relative"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "cw-option" + d, label: d, value: d },
          d
        );
      });
      var rAccessorOptions = ["relative", "fixed"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "rAccessor-option" + d, label: d, value: d },
          d
        );
      });
      var renderFnOptions = ["none", "sketchy", "painty"].map(function (d) {
        return _react2.default.createElement(
          'option',
          { key: "renderfn-option" + d, label: d, value: d },
          d
        );
      });

      var rAccessor = this.state.rAccessor === "fixed" ? function () {
        return 1;
      } : function (d) {
        return d.stepValue || d.value;
      };
      var cwFn = this.state.columnWidth === "fixed" ? undefined : function (d) {
        return d.stepValue || d.value;
      };
      var reFn = this.state.renderFn === "none" ? undefined : function () {
        return _this2.state.renderFn;
      };

      var axis = { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickFormat: function tickFormat(d) {
          return d;
        } };
      var axisRight = { key: "yAxis", orient: "right", className: "yscale", name: "CountAxis", tickFormat: function tickFormat(d) {
          return d;
        } };

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'type=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeType },
              typeOptions
            )
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'projection=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeProjection },
              projectionOptions
            )
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'columnWidth=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeCW },
              cwOptions
            )
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'rAccessor=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeRAccessor },
              rAccessorOptions
            )
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'span',
            null,
            'renderFn=',
            _react2.default.createElement(
              'select',
              { onChange: this.changeRenderFn },
              renderFnOptions
            )
          )
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          title: "title",
          renderFn: reFn,
          size: [500, frameHeight],
          projection: this.state.projection,
          type: this.state.type,
          data: [10, 4, 8, 3, 5, 7],
          oPadding: 5,
          margin: 20,
          style: function style(d, i) {
            return { fill: colors[i], stroke: "black" };
          },
          hoverAnnotation: true
        }),
        _react2.default.createElement(
          'p',
          null,
          _react2.default.createElement(
            'b',
            null,
            'Basic bar chart'
          )
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "const colors = ['#00a2ce','#4d430c','#b3331d','#b6a756','#00a2ce','#4d430c','#b3331d']"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "title={'title'}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "data={[ 10, 4, 8, 3, 5, 7 ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oPadding={5}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={20}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={(d,i) => {return { fill: colors[i], stroke: 'black' }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "hoverAnnotation={true}"
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          size: [500, frameHeight],
          renderFn: reFn,
          data: funnelData,
          axis: axis,
          projection: this.state.projection,
          type: this.state.type,
          oAccessor: function oAccessor(d) {
            return d.stepName;
          },
          rAccessor: rAccessor,
          style: function style(d) {
            return { fill: d.funnelKey, stroke: "black" };
          },
          hoverAnnotation: true,
          columnWidth: this.state.rAccessor === "fixed" ? function (d) {
            return d.stepValue;
          } : undefined,
          margin: { left: 25, top: 0, bottom: 25, right: 0 }
        }),
        _react2.default.createElement(
          'p',
          null,
          _react2.default.createElement(
            'b',
            null,
            'Stacked'
          )
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "data={funnelData}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oLabel={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "axis={axis}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "projection={this.state.projection}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "type={this.state.type}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oAccessor={d => d.stepName}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "rAccessor={d => d.stepValue}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={d => {return { fill: d.funnelKey, stroke: 'black' }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "hoverAnnotation={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "columnWidth={this.state.columnWidth}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={{ left: 10, top: 0, bottom: 0, right: 0 }}"
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          size: [500, frameHeight],
          renderFn: reFn,
          data: stackedPieDataWithNegatives,
          axis: axis,
          projection: this.state.projection,
          type: this.state.type,
          oAccessor: function oAccessor(d) {
            return d.pie;
          },
          rAccessor: rAccessor,
          style: function style(d) {
            return { fill: d.color, stroke: "black" };
          },
          hoverAnnotation: true,
          columnWidth: this.state.rAccessor === "fixed" ? function (d) {
            return d.stepValue;
          } : undefined,
          margin: { left: 25, top: 0, bottom: 25, right: 0 }
        }),
        _react2.default.createElement(
          'p',
          null,
          _react2.default.createElement(
            'b',
            null,
            'Stacked'
          )
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "data={funnelData}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oLabel={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "axis={axis}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "projection={this.state.projection}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "type={this.state.type}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oAccessor={d => d.stepName}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "rAccessor={d => d.stepValue}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={d => {return { fill: d.funnelKey, stroke: 'black' }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "hoverAnnotation={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "columnWidth={this.state.columnWidth}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={{ left: 10, top: 0, bottom: 0, right: 0 }}"
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          size: [500, frameHeight],
          renderFn: reFn,
          oLabel: function oLabel(d) {
            return _react2.default.createElement(
              'g',
              { transform: 'translate(0,-20)' },
              _react2.default.createElement('rect', { height: '5', width: '5', x: '-5', style: { fill: d } }),
              _react2.default.createElement(
                'text',
                { transform: 'rotate(45)' },
                d
              )
            );
          },
          data: testData,
          projection: this.state.projection,
          type: this.state.type,
          axis: axis,
          columnWidth: cwFn,
          oAccessor: function oAccessor(d) {
            return d.color;
          },
          rAccessor: rAccessor,
          oPadding: 5,
          margin: { left: 40, right: 20, top: 20, bottom: 40 },
          style: function style(d) {
            return { fill: d.color, stroke: d.color };
          },
          hoverAnnotation: true
        }),
        _react2.default.createElement(
          'p',
          null,
          _react2.default.createElement(
            'b',
            null,
            'Custom Labeling'
          )
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "data={testData}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oLabel={d => <g><rect height='5' width='5' x='-5' style={{ fill: d }} /><text transform='rotate(45)'>{d}</text></g>}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "axis={axis}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "projection={this.state.projection}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "type={this.state.type}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oAccessor={d => d.color}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "rAccessor={d => d.value}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={d => {return { fill: d.color, stroke: d.color }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "hoverAnnotation={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "columnWidth={this.state.columnWidth}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oPadding={5}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={ left: 20, right: 20, top: 20, bottom: 40 }"
        ),
        _react2.default.createElement(_semiotic.ORFrame, {
          size: [500, frameHeight],
          renderFn: reFn,
          oLabel: true,
          data: stackedPieData.filter(function (d) {
            return d.pie === "two";
          }),
          oPadding: 5,
          axis: axisRight,
          margin: 20,
          oAccessor: function oAccessor(d) {
            return d.color;
          },
          projection: this.state.projection,
          type: this.state.type,
          columnWidth: cwFn,
          rAccessor: rAccessor,
          style: function style(d) {
            return { fill: d.color, stroke: "black" };
          },
          hoverAnnotation: true
        }),
        _react2.default.createElement(
          'p',
          null,
          _react2.default.createElement(
            'b',
            null,
            'Right-hand Axis'
          )
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "<ORFrame"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "size={[ 500,frameHeight ]}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "stackedPieData.filter(d => d.pie === 'two')"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oLabel={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "axis={axisRight}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "projection={this.state.projection}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "type={this.state.type}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oAccessor={d => d.color}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "rAccessor={d => d.value}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "style={d => {return { fill: d.color, stroke: 'black' }}}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "hoverAnnotation={true}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "columnWidth={this.state.columnWidth}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "oPadding={5}"
        ),
        _react2.default.createElement(
          'p',
          { className: 'code' },
          "margin={20}"
        )
      );
    }
  }]);

  return ORFramePieceExamples;
}(_react2.default.Component);

module.exports = ORFramePieceExamples;

},{"react":undefined,"semiotic":undefined}],9:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

var _d3Shape = require('d3-shape');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var testData = [{ id: "linedata-1", color: "#00a2ce", data: [{ y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 }] }, { id: "linedata-2", color: "#4d430c", data: [{ y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 }] }, { id: "linedata-3", color: "#b3331d", data: [{ y: 10, x: 1 }, { y: 8, x: 2 }, { y: 2, x: 3 }, { y: 3, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 }] }, { id: "linedata-4", color: "#b6a756", data: [{ y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 }] }];

var NameForm = function (_React$Component) {
    _inherits(NameForm, _React$Component);

    function NameForm(props) {
        _classCallCheck(this, NameForm);

        var _this = _possibleConstructorReturn(this, (NameForm.__proto__ || Object.getPrototypeOf(NameForm)).call(this, props));

        _this.state = { value: '', type: "x" };
        _this.handleChange = _this.handleChange.bind(_this);
        _this.changeType = _this.changeType.bind(_this);
        _this.handleSubmit = _this.handleSubmit.bind(_this);
        return _this;
    }

    _createClass(NameForm, [{
        key: 'handleChange',
        value: function handleChange(event) {
            this.setState({ value: event.target.value });
        }
    }, {
        key: 'changeType',
        value: function changeType(event) {
            this.setState({ type: event.target.value });
        }
    }, {
        key: 'handleSubmit',
        value: function handleSubmit(event) {
            event.preventDefault();
            //You could also mutate the existing annotation
            //this.props.updateAnnotations(Object.assign(this.props.dataPoint, { type: "x", label: this.state.value }))
            this.props.updateAnnotations(_extends({}, this.props.dataPoint, { type: this.state.type, label: this.state.value }));
        }
    }, {
        key: 'render',
        value: function render() {
            return _react2.default.createElement(
                'form',
                { style: { background: "#DDDDDD" }, onSubmit: this.handleSubmit },
                _react2.default.createElement(
                    'p',
                    null,
                    this.props.dataPoint.x,
                    ',',
                    this.props.dataPoint.y
                ),
                _react2.default.createElement(
                    'p',
                    null,
                    'Name:'
                ),
                _react2.default.createElement('input', { type: 'text', value: this.state.value, onChange: this.handleChange }),
                _react2.default.createElement(
                    'select',
                    { value: this.state.type, onChange: this.changeType },
                    _react2.default.createElement(
                        'option',
                        { label: 'x', value: 'x' },
                        'X'
                    ),
                    _react2.default.createElement(
                        'option',
                        { label: 'y', value: 'y' },
                        'Y'
                    ),
                    _react2.default.createElement(
                        'option',
                        { label: 'xy', value: 'xy' },
                        'XY'
                    )
                ),
                _react2.default.createElement('input', { type: 'submit', value: 'Submit' })
            );
        }
    }]);

    return NameForm;
}(_react2.default.Component);

var XYFrameExamples = function (_React$Component2) {
    _inherits(XYFrameExamples, _React$Component2);

    function XYFrameExamples(props) {
        _classCallCheck(this, XYFrameExamples);

        var _this2 = _possibleConstructorReturn(this, (XYFrameExamples.__proto__ || Object.getPrototypeOf(XYFrameExamples)).call(this, props));

        _this2.clickPoint = _this2.clickPoint.bind(_this2);
        _this2.customHTMLRules = _this2.customHTMLRules.bind(_this2);
        _this2.updateAnnotations = _this2.updateAnnotations.bind(_this2);
        _this2.changeLineType = _this2.changeLineType.bind(_this2);

        _this2.state = { annotations: [], lineType: "bumparea", axisAnnotation: { type: "y", y: 0, label: "click on axis to add an annotation" } };
        return _this2;
    }

    _createClass(XYFrameExamples, [{
        key: 'changeLineType',
        value: function changeLineType() {
            this.setState({ lineType: this.state.lineType === "bumparea" ? "line" : "bumparea" });
        }
    }, {
        key: 'clickPoint',
        value: function clickPoint(d) {
            var formlessAnnotations = this.state.annotations.filter(function (p) {
                return p.type !== "form";
            });
            var formAnnotation = _extends({ type: "form" }, d);
            formlessAnnotations.push(formAnnotation);
            this.setState({ annotations: formlessAnnotations });
        }
    }, {
        key: 'customHTMLRules',
        value: function customHTMLRules(_ref) {
            var screenCoordinates = _ref.screenCoordinates,
                d = _ref.d;

            if (d.type === "form") {
                return _react2.default.createElement(
                    'div',
                    { style: { pointerEvents: "all", position: "absolute", left: screenCoordinates[0], top: screenCoordinates[1] } },
                    _react2.default.createElement(NameForm, { updateAnnotations: this.updateAnnotations, dataPoint: d })
                );
            }
            //If you don't return null, it will suppress the rest of your HTML rules
            return null;
        }
    }, {
        key: 'updateAnnotations',
        value: function updateAnnotations(newAnnotation) {
            var formlessAnnotations = this.state.annotations.filter(function (d) {
                return d.type !== "form";
            });
            formlessAnnotations.push(newAnnotation);
            this.setState({ annotations: formlessAnnotations });
        }
    }, {
        key: 'render',
        value: function render() {
            var _this3 = this;

            var frameHeight = 200;

            var displayData = testData;

            var exampleAnnotations = [{ x: 3, y: 3, type: "xy", label: "xy" }, { x: 4, id: "linedata-222", type: "xy", label: "xy ID" }, { x: 4, id: "linedata-3", type: "xy", label: "xy ID" }, { type: "enclose", rp: "top", rd: 25, coordinates: [{ x: 6, id: "linedata-3" }, { x: 6, id: "linedata-4" }], label: "enclose ID" }, { x: 3, y: 90, dy: -30, type: "x", label: "x" }, { x: { lineID: "line-1", pointID: "point-17" }, y: 90, dy: -30, type: "x", label: "x" }, { x: 240, y: 3, type: "y", label: "y" }, { type: "enclose", rp: "top", rd: 25, coordinates: [{ x: 1, y: 5 }, { x: 2, y: 8 }, { x: 2, y: 10 }], label: "enclose" }];

            var axes = [{ key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickFormat: function tickFormat(d) {
                    return d + "%";
                } }, { key: "xAxis", orient: "bottom", className: "xscale", name: "TimeAxis", tickValues: [1, 2, 3, 4, 5, 6, 7], tickFormat: function tickFormat(d) {
                    return d + " day";
                } }];

            var allAnnotations = [].concat(exampleAnnotations, _toConsumableArray(this.state.annotations));

            return _react2.default.createElement(
                'div',
                null,
                _react2.default.createElement(
                    'button',
                    { onClick: this.changeLineType },
                    'Change Type Line'
                ),
                _react2.default.createElement(_semiotic.XYFrame, {
                    size: [500, frameHeight],
                    lines: displayData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data;
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    hoverAnnotation: true,
                    customClickBehavior: this.clickPoint,
                    annotations: allAnnotations,
                    htmlAnnotationRules: this.customHTMLRules,
                    customLineType: { type: this.state.lineType, interpolator: _d3Shape.curveCardinal, sort: null },
                    margin: 10
                }),
                _react2.default.createElement(_semiotic.XYFrame, {
                    title: 'axisAnnotationFunction sends { type, value }',
                    size: [500, 400],
                    lines: testData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data;
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    hoverAnnotation: true,
                    customLineType: "line",
                    axes: axes,
                    axisAnnotationFunction: function axisAnnotationFunction(d) {
                        var _axisAnnotation;

                        return _this3.setState({ axisAnnotation: (_axisAnnotation = { type: d.type }, _defineProperty(_axisAnnotation, d.type, d.value), _defineProperty(_axisAnnotation, 'label', "clicked annotation"), _axisAnnotation) });
                    },
                    margin: 50,
                    annotations: [this.state.axisAnnotation]
                })
            );
        }
    }]);

    return XYFrameExamples;
}(_react2.default.Component);

module.exports = XYFrameExamples;

},{"d3-shape":22,"react":undefined,"semiotic":undefined}],10:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

var _d3Shape = require('d3-shape');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var testData = [{ id: "linedata-1", color: "#00a2ce", data: [{ y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 }] }, { id: "linedata-2", color: "#4d430c", data: [{ y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 }] }, { id: "linedata-3", color: "#b3331d", data: [{ y: 10, x: 1 }, { y: 8, x: 2 }, { y: 0, x: 3 }, { y: 0, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 }] }, { id: "linedata-4", color: "#b6a756", data: [{ y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 }] }];

var XYFrameExamples = function (_React$Component) {
    _inherits(XYFrameExamples, _React$Component);

    function XYFrameExamples(props) {
        _classCallCheck(this, XYFrameExamples);

        var _this = _possibleConstructorReturn(this, (XYFrameExamples.__proto__ || Object.getPrototypeOf(XYFrameExamples)).call(this, props));

        _this.state = { customLineType: "difference", curve: "curveBasis" };
        _this.changeCustomLineType = _this.changeCustomLineType.bind(_this);
        _this.changeCurve = _this.changeCurve.bind(_this);
        return _this;
    }

    _createClass(XYFrameExamples, [{
        key: 'changeCustomLineType',
        value: function changeCustomLineType(e) {
            this.setState({ customLineType: e.target.value });
        }
    }, {
        key: 'changeCurve',
        value: function changeCurve(e) {
            this.setState({ curve: e.target.value });
        }
    }, {
        key: 'render',
        value: function render() {

            var frameHeight = 100;
            var options = ["line", "difference", "stackedarea", "bumpline", "bumparea"].map(function (d) {
                return _react2.default.createElement(
                    'option',
                    { key: "line-option-" + d, label: d, value: d },
                    d
                );
            });

            var curveOptions = ["curveBasis", "curveCardinal", "curveCatmullRom", "curveLinear", "curveNatural", "curveMonotoneX", "curveStep"].map(function (d) {
                return _react2.default.createElement(
                    'option',
                    { key: "curve-option-" + d, label: d, value: d },
                    d
                );
            });
            var displayData = testData;

            var curveHash = { curveBasis: _d3Shape.curveBasis, curveCardinal: _d3Shape.curveCardinal, curveCatmullRom: _d3Shape.curveCatmullRom, curveLinear: _d3Shape.curveLinear, curveNatural: _d3Shape.curveNatural, curveMonotoneX: _d3Shape.curveMonotoneX, curveStep: _d3Shape.curveStep };

            if (this.state.customLineType === "difference") {
                displayData = testData.filter(function (d, i) {
                    return i < 2;
                });
            }

            return _react2.default.createElement(
                'div',
                null,
                _react2.default.createElement(
                    'span',
                    null,
                    'customLineType=',
                    _react2.default.createElement(
                        'select',
                        { onChange: this.changeCustomLineType },
                        options
                    )
                ),
                _react2.default.createElement(
                    'span',
                    null,
                    'curve',
                    _react2.default.createElement(
                        'select',
                        { onChange: this.changeCurve },
                        curveOptions
                    )
                ),
                _react2.default.createElement(_semiotic.XYFrame, {
                    size: [500, frameHeight],
                    lines: displayData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data;
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    showLinePoints: true,
                    canvasLines: function canvasLines(d, i) {
                        return i % 2 === 0;
                    },
                    customLineType: this.state.customLineType,
                    margin: 10
                }),
                _react2.default.createElement(_semiotic.XYFrame, {
                    size: [500, frameHeight],
                    lines: displayData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data;
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    canvasLines: function canvasLines(d, i) {
                        return i % 2 === 0;
                    },
                    customLineType: { type: this.state.customLineType, interpolator: curveHash[this.state.curve], sort: null },
                    margin: 10,
                    defined: function defined(d) {
                        return d.y !== 0;
                    }
                })
            );
        }
    }]);

    return XYFrameExamples;
}(_react2.default.Component);

module.exports = XYFrameExamples;

},{"d3-shape":22,"react":undefined,"semiotic":undefined}],11:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var testData = [{ id: "linedata-1", color: "#00a2ce", data: [{ y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 }] }, { id: "linedata-2", color: "#4d430c", data: [{ y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 }] }, { id: "linedata-3", color: "#b3331d", data: [{ y: 10, x: 1 }, { y: 8, x: 2 }, { y: 2, x: 3 }, { y: 3, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 }] }, { id: "linedata-4", color: "#b6a756", data: [{ y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 }] }];

var XYFrameExamplesMisc = function (_React$Component) {
    _inherits(XYFrameExamplesMisc, _React$Component);

    function XYFrameExamplesMisc(props) {
        _classCallCheck(this, XYFrameExamplesMisc);

        return _possibleConstructorReturn(this, (XYFrameExamplesMisc.__proto__ || Object.getPrototypeOf(XYFrameExamplesMisc)).call(this, props));
    }

    _createClass(XYFrameExamplesMisc, [{
        key: 'render',
        value: function render() {

            var frameHeight = 100;

            var axes = [{ key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickFormat: function tickFormat(d) {
                    return d + "%";
                } }, { key: "xAxis", orient: "bottom", className: "xscale", name: "TimeAxis", tickValues: [1, 2, 3, 4, 5, 6, 7], tickFormat: function tickFormat(d) {
                    return d + " day";
                } }];

            return _react2.default.createElement(
                'div',
                null,
                _react2.default.createElement(_semiotic.XYFrame, {
                    title: 'lineRenderMode={() => "sketchy"}',
                    size: [500, frameHeight],
                    lines: testData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data;
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    customLineType: "stackedarea",
                    lineRenderMode: function lineRenderMode() {
                        return "sketchy";
                    }
                }),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "< XYFrame"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "title='lineRenderMode={() => 'sketchy'}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "size={[ 500,frameHeight ]}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lines={testData}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lineDataAccessor={d => d.data}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "xAccessor={d => d.x}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "yAccessor={d => d.y}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "customLineType={'stackedarea'}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lineRenderMode={() => 'sketchy'}"
                ),
                _react2.default.createElement(_semiotic.XYFrame, {
                    title: _react2.default.createElement(
                        'g',
                        null,
                        _react2.default.createElement(
                            'text',
                            null,
                            '"hoverAnnotation=',
                            true,
                            '"'
                        )
                    ),
                    size: [500, frameHeight],
                    lines: testData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data;
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    canvasLines: function canvasLines(d, i) {
                        return i > 1;
                    },
                    customLineType: "line",
                    hoverAnnotation: true
                }),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "< XYFrame"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "title='hoverAnnotation={true}'"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "size={[ 500,frameHeight ]}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lines={testData}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lineDataAccessor={d => d.data}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "xAccessor={d => d.x}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "yAccessor={d => d.y}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "hoverAnnotation={true}"
                ),
                _react2.default.createElement(_semiotic.XYFrame, {
                    title: 'axes',
                    size: [500, 400],
                    lines: testData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data;
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    hoverAnnotation: true,
                    canvasLines: function canvasLines(d, i) {
                        return i > 1;
                    },
                    customLineType: "line",
                    axes: axes,
                    margin: 50
                }),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "const axes = ["
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "{ key: 'yAxis', orient: 'left', className: 'yscale', name: 'CountAxis', tickFormat: (d) => d + '%' },"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "{ key: 'xAxis', orient: 'bottom', className: 'xscale', name: 'TimeAxis', tickValues: [ 1, 2, 3, 4, 5, 6, 7 ], tickFormat: d => d + ' day' }"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "]"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "< XYFrame"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "title='axes'"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "size={[ 500,400 ]}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lines={testData}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lineDataAccessor={d => d.data}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "xAccessor={d => d.x}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "yAccessor={d => d.y}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "hoverAnnotation={true}"
                ),
                _react2.default.createElement(
                    'p',
                    { className: 'code' },
                    "axes={axes}"
                ),
                _react2.default.createElement(_semiotic.XYFrame, {
                    title: 'zoom',
                    size: [500, 400],
                    lines: testData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data;
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    hoverAnnotation: true,
                    zoomable: true,
                    customLineType: "line",
                    axes: axes,
                    margin: 50
                }),
                _react2.default.createElement(_semiotic.XYFrame, {
                    title: 'fixed single extent',
                    size: [500, 400],
                    lines: testData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data;
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    xExtent: [undefined, 3],
                    yExtent: [undefined, 8],
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    hoverAnnotation: true,
                    customLineType: "line",
                    axes: axes,
                    margin: 50
                })
            );
        }
    }]);

    return XYFrameExamplesMisc;
}(_react2.default.Component);

module.exports = XYFrameExamplesMisc;

},{"react":undefined,"semiotic":undefined}],12:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];
var testData = [];
for (var x = 1; x < 500; x++) {
    testData.push({ x: Math.random() * 100, y: Math.random() * 100, r: Math.random() * 10, color: colors[x % 4] });
}

var XYFramePointExamples = function (_React$Component) {
    _inherits(XYFramePointExamples, _React$Component);

    function XYFramePointExamples(props) {
        _classCallCheck(this, XYFramePointExamples);

        return _possibleConstructorReturn(this, (XYFramePointExamples.__proto__ || Object.getPrototypeOf(XYFramePointExamples)).call(this, props));
    }

    _createClass(XYFramePointExamples, [{
        key: 'render',
        value: function render() {

            var frameHeight = 300;

            return _react2.default.createElement(
                'div',
                null,
                _react2.default.createElement(_semiotic.XYFrame, {
                    title: 'Points',
                    size: [500, frameHeight],
                    points: testData,
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    canvasPoints: function canvasPoints(d, i) {
                        return i % 3 === 0;
                    },
                    pointStyle: function pointStyle(d) {
                        return { fill: d.color, stroke: "black", strokeWidth: 1 };
                    },
                    customPointMark: function customPointMark(d, i) {
                        return i % 2 ? _react2.default.createElement(_semiotic.Mark, { markType: 'circle', r: '5' }) : _react2.default.createElement(_semiotic.Mark, { markType: 'rect', x: -4, y: -4, width: 8, height: 8 });
                    },
                    margin: 10
                })
            );
        }
    }]);

    return XYFramePointExamples;
}(_react2.default.Component);

module.exports = XYFramePointExamples;

},{"react":undefined,"semiotic":undefined}],13:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

var _d3Shape = require('d3-shape');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var testData = [{ id: "linedata-1", color: "#00a2ce", data: [{ y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 }] }, { id: "linedata-2", color: "#4d430c", data: [{ y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 }] }, { id: "linedata-3", color: "#b3331d", data: [{ y: 10, x: 1 }, { y: 8, x: 2 }, { y: 2, x: 3 }, { y: 3, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 }] }, { id: "linedata-4", color: "#b6a756", data: [{ y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 }] }];

var displayData = testData.map(function (d) {
    var moreData = [].concat(_toConsumableArray(d.data), _toConsumableArray(d.data.map(function (p) {
        return { y: p.y + Math.random() * 10, x: p.x + 7 };
    })));
    return _extends(d, { data: moreData });
});

var XYFrameWithMinimapExamples = function (_React$Component) {
    _inherits(XYFrameWithMinimapExamples, _React$Component);

    function XYFrameWithMinimapExamples(props) {
        _classCallCheck(this, XYFrameWithMinimapExamples);

        var _this = _possibleConstructorReturn(this, (XYFrameWithMinimapExamples.__proto__ || Object.getPrototypeOf(XYFrameWithMinimapExamples)).call(this, props));

        _this.state = { customLineType: "bumparea", curve: "curveBasis", extent: [1, 8] };
        _this.changeCustomLineType = _this.changeCustomLineType.bind(_this);
        _this.changeCurve = _this.changeCurve.bind(_this);
        _this.updateDateRange = _this.updateDateRange.bind(_this);
        return _this;
    }

    _createClass(XYFrameWithMinimapExamples, [{
        key: 'changeCustomLineType',
        value: function changeCustomLineType(e) {
            this.setState({ customLineType: e.target.value });
        }
    }, {
        key: 'changeCurve',
        value: function changeCurve(e) {
            this.setState({ curve: e.target.value });
        }
    }, {
        key: 'updateDateRange',
        value: function updateDateRange(e) {
            this.setState({ extent: e });
        }
    }, {
        key: 'render',
        value: function render() {
            var _this2 = this;

            var frameWidth = 500;
            var options = ["line", "difference", "stackedarea", "bumpline", "bumparea"].map(function (d) {
                return _react2.default.createElement(
                    'option',
                    { key: "line-option-" + d, label: d, value: d },
                    d
                );
            });

            var curveOptions = ["curveBasis", "curveCardinal", "curveCatmullRom", "curveLinear", "curveNatural", "curveMonotoneX", "curveStep"].map(function (d) {
                return _react2.default.createElement(
                    'option',
                    { key: "curve-option-" + d, label: d, value: d },
                    d
                );
            });

            var curveHash = { curveBasis: _d3Shape.curveBasis, curveCardinal: _d3Shape.curveCardinal, curveCatmullRom: _d3Shape.curveCatmullRom, curveLinear: _d3Shape.curveLinear, curveNatural: _d3Shape.curveNatural, curveMonotoneX: _d3Shape.curveMonotoneX, curveStep: _d3Shape.curveStep };
            var finaldisplayData = displayData;

            if (this.state.customLineType === "difference") {
                finaldisplayData = displayData.filter(function (d, i) {
                    return i < 2;
                });
            }

            var axes = [{ key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickValues: [10, 20, 30, 40, 50], tickFormat: function tickFormat(d) {
                    return d + "%";
                } }, { key: "xAxis", orient: "bottom", className: "xscale", name: "TimeAxis", tickValues: [2, 4, 6, 8, 10, 12, 14], tickFormat: function tickFormat(d) {
                    return d + " day";
                } }];

            return _react2.default.createElement(
                'div',
                null,
                _react2.default.createElement(
                    'span',
                    null,
                    'customLineType=',
                    _react2.default.createElement(
                        'select',
                        { onChange: this.changeCustomLineType },
                        options
                    )
                ),
                _react2.default.createElement(
                    'span',
                    null,
                    'curve',
                    _react2.default.createElement(
                        'select',
                        { onChange: this.changeCurve },
                        curveOptions
                    )
                ),
                _react2.default.createElement(_semiotic.MinimapXYFrame, {
                    renderBefore: true,
                    axes: axes,
                    size: [frameWidth, 300],
                    lines: finaldisplayData,
                    lineDataAccessor: function lineDataAccessor(d) {
                        return d.data.filter(function (p) {
                            return p.x >= _this2.state.extent[0] && p.x <= _this2.state.extent[1];
                        });
                    },
                    xAccessor: function xAccessor(d) {
                        return d.x;
                    },
                    yAccessor: function yAccessor(d) {
                        return d.y;
                    },
                    lineStyle: function lineStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    customLineType: { type: this.state.customLineType, interpolator: curveHash[this.state.curve], sort: null },
                    minimap: { margin: { top: 20, bottom: 20, left: 20, right: 20 }, lineStyle: function lineStyle(d) {
                            return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                        }, customLineType: { type: this.state.customLineType, interpolator: curveHash[this.state.curve], sort: null }, brushEnd: this.updateDateRange, yBrushable: false, xBrushExtent: this.state.extent, lines: finaldisplayData, lineDataAccessor: function lineDataAccessor(d) {
                            return d.data;
                        }, size: [frameWidth, 150], axes: [axes[1]] },
                    lineRenderMode: function lineRenderMode() {
                        return "sketchy";
                    }
                })
            );
        }
    }]);

    return XYFrameWithMinimapExamples;
}(_react2.default.Component);

module.exports = XYFrameWithMinimapExamples;

},{"d3-shape":22,"react":undefined,"semiotic":undefined}],14:[function(require,module,exports){
// https://d3js.org/d3-array/ Version 1.0.1. Copyright 2016 Mike Bostock.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function bisector(compare) {
    if (compare.length === 1) compare = ascendingComparator(compare);
    return {
      left: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      },
      right: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) > 0) hi = mid;
          else lo = mid + 1;
        }
        return lo;
      }
    };
  }

  function ascendingComparator(f) {
    return function(d, x) {
      return ascending(f(d), x);
    };
  }

  var ascendingBisect = bisector(ascending);
  var bisectRight = ascendingBisect.right;
  var bisectLeft = ascendingBisect.left;

  function descending(a, b) {
    return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
  }

  function number(x) {
    return x === null ? NaN : +x;
  }

  function variance(array, f) {
    var n = array.length,
        m = 0,
        a,
        d,
        s = 0,
        i = -1,
        j = 0;

    if (f == null) {
      while (++i < n) {
        if (!isNaN(a = number(array[i]))) {
          d = a - m;
          m += d / ++j;
          s += d * (a - m);
        }
      }
    }

    else {
      while (++i < n) {
        if (!isNaN(a = number(f(array[i], i, array)))) {
          d = a - m;
          m += d / ++j;
          s += d * (a - m);
        }
      }
    }

    if (j > 1) return s / (j - 1);
  }

  function deviation(array, f) {
    var v = variance(array, f);
    return v ? Math.sqrt(v) : v;
  }

  function extent(array, f) {
    var i = -1,
        n = array.length,
        a,
        b,
        c;

    if (f == null) {
      while (++i < n) if ((b = array[i]) != null && b >= b) { a = c = b; break; }
      while (++i < n) if ((b = array[i]) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    }

    else {
      while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = c = b; break; }
      while (++i < n) if ((b = f(array[i], i, array)) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    }

    return [a, c];
  }

  var array = Array.prototype;

  var slice = array.slice;
  var map = array.map;

  function constant(x) {
    return function() {
      return x;
    };
  }

  function identity(x) {
    return x;
  }

  function range(start, stop, step) {
    start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

    var i = -1,
        n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
        range = new Array(n);

    while (++i < n) {
      range[i] = start + i * step;
    }

    return range;
  }

  var e10 = Math.sqrt(50);
  var e5 = Math.sqrt(10);
  var e2 = Math.sqrt(2);
  function ticks(start, stop, count) {
    var step = tickStep(start, stop, count);
    return range(
      Math.ceil(start / step) * step,
      Math.floor(stop / step) * step + step / 2, // inclusive
      step
    );
  }

  function tickStep(start, stop, count) {
    var step0 = Math.abs(stop - start) / Math.max(0, count),
        step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
        error = step0 / step1;
    if (error >= e10) step1 *= 10;
    else if (error >= e5) step1 *= 5;
    else if (error >= e2) step1 *= 2;
    return stop < start ? -step1 : step1;
  }

  function sturges(values) {
    return Math.ceil(Math.log(values.length) / Math.LN2) + 1;
  }

  function histogram() {
    var value = identity,
        domain = extent,
        threshold = sturges;

    function histogram(data) {
      var i,
          n = data.length,
          x,
          values = new Array(n);

      for (i = 0; i < n; ++i) {
        values[i] = value(data[i], i, data);
      }

      var xz = domain(values),
          x0 = xz[0],
          x1 = xz[1],
          tz = threshold(values, x0, x1);

      // Convert number of thresholds into uniform thresholds.
      if (!Array.isArray(tz)) tz = ticks(x0, x1, tz);

      // Remove any thresholds outside the domain.
      var m = tz.length;
      while (tz[0] <= x0) tz.shift(), --m;
      while (tz[m - 1] >= x1) tz.pop(), --m;

      var bins = new Array(m + 1),
          bin;

      // Initialize bins.
      for (i = 0; i <= m; ++i) {
        bin = bins[i] = [];
        bin.x0 = i > 0 ? tz[i - 1] : x0;
        bin.x1 = i < m ? tz[i] : x1;
      }

      // Assign data to bins by value, ignoring any outside the domain.
      for (i = 0; i < n; ++i) {
        x = values[i];
        if (x0 <= x && x <= x1) {
          bins[bisectRight(tz, x, 0, m)].push(data[i]);
        }
      }

      return bins;
    }

    histogram.value = function(_) {
      return arguments.length ? (value = typeof _ === "function" ? _ : constant(_), histogram) : value;
    };

    histogram.domain = function(_) {
      return arguments.length ? (domain = typeof _ === "function" ? _ : constant([_[0], _[1]]), histogram) : domain;
    };

    histogram.thresholds = function(_) {
      return arguments.length ? (threshold = typeof _ === "function" ? _ : Array.isArray(_) ? constant(slice.call(_)) : constant(_), histogram) : threshold;
    };

    return histogram;
  }

  function quantile(array, p, f) {
    if (f == null) f = number;
    if (!(n = array.length)) return;
    if ((p = +p) <= 0 || n < 2) return +f(array[0], 0, array);
    if (p >= 1) return +f(array[n - 1], n - 1, array);
    var n,
        h = (n - 1) * p,
        i = Math.floor(h),
        a = +f(array[i], i, array),
        b = +f(array[i + 1], i + 1, array);
    return a + (b - a) * (h - i);
  }

  function freedmanDiaconis(values, min, max) {
    values = map.call(values, number).sort(ascending);
    return Math.ceil((max - min) / (2 * (quantile(values, 0.75) - quantile(values, 0.25)) * Math.pow(values.length, -1 / 3)));
  }

  function scott(values, min, max) {
    return Math.ceil((max - min) / (3.5 * deviation(values) * Math.pow(values.length, -1 / 3)));
  }

  function max(array, f) {
    var i = -1,
        n = array.length,
        a,
        b;

    if (f == null) {
      while (++i < n) if ((b = array[i]) != null && b >= b) { a = b; break; }
      while (++i < n) if ((b = array[i]) != null && b > a) a = b;
    }

    else {
      while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = b; break; }
      while (++i < n) if ((b = f(array[i], i, array)) != null && b > a) a = b;
    }

    return a;
  }

  function mean(array, f) {
    var s = 0,
        n = array.length,
        a,
        i = -1,
        j = n;

    if (f == null) {
      while (++i < n) if (!isNaN(a = number(array[i]))) s += a; else --j;
    }

    else {
      while (++i < n) if (!isNaN(a = number(f(array[i], i, array)))) s += a; else --j;
    }

    if (j) return s / j;
  }

  function median(array, f) {
    var numbers = [],
        n = array.length,
        a,
        i = -1;

    if (f == null) {
      while (++i < n) if (!isNaN(a = number(array[i]))) numbers.push(a);
    }

    else {
      while (++i < n) if (!isNaN(a = number(f(array[i], i, array)))) numbers.push(a);
    }

    return quantile(numbers.sort(ascending), 0.5);
  }

  function merge(arrays) {
    var n = arrays.length,
        m,
        i = -1,
        j = 0,
        merged,
        array;

    while (++i < n) j += arrays[i].length;
    merged = new Array(j);

    while (--n >= 0) {
      array = arrays[n];
      m = array.length;
      while (--m >= 0) {
        merged[--j] = array[m];
      }
    }

    return merged;
  }

  function min(array, f) {
    var i = -1,
        n = array.length,
        a,
        b;

    if (f == null) {
      while (++i < n) if ((b = array[i]) != null && b >= b) { a = b; break; }
      while (++i < n) if ((b = array[i]) != null && a > b) a = b;
    }

    else {
      while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = b; break; }
      while (++i < n) if ((b = f(array[i], i, array)) != null && a > b) a = b;
    }

    return a;
  }

  function pairs(array) {
    var i = 0, n = array.length - 1, p = array[0], pairs = new Array(n < 0 ? 0 : n);
    while (i < n) pairs[i] = [p, p = array[++i]];
    return pairs;
  }

  function permute(array, indexes) {
    var i = indexes.length, permutes = new Array(i);
    while (i--) permutes[i] = array[indexes[i]];
    return permutes;
  }

  function scan(array, compare) {
    if (!(n = array.length)) return;
    var i = 0,
        n,
        j = 0,
        xi,
        xj = array[j];

    if (!compare) compare = ascending;

    while (++i < n) if (compare(xi = array[i], xj) < 0 || compare(xj, xj) !== 0) xj = xi, j = i;

    if (compare(xj, xj) === 0) return j;
  }

  function shuffle(array, i0, i1) {
    var m = (i1 == null ? array.length : i1) - (i0 = i0 == null ? 0 : +i0),
        t,
        i;

    while (m) {
      i = Math.random() * m-- | 0;
      t = array[m + i0];
      array[m + i0] = array[i + i0];
      array[i + i0] = t;
    }

    return array;
  }

  function sum(array, f) {
    var s = 0,
        n = array.length,
        a,
        i = -1;

    if (f == null) {
      while (++i < n) if (a = +array[i]) s += a; // Note: zero and null are equivalent.
    }

    else {
      while (++i < n) if (a = +f(array[i], i, array)) s += a;
    }

    return s;
  }

  function transpose(matrix) {
    if (!(n = matrix.length)) return [];
    for (var i = -1, m = min(matrix, length), transpose = new Array(m); ++i < m;) {
      for (var j = -1, n, row = transpose[i] = new Array(n); ++j < n;) {
        row[j] = matrix[j][i];
      }
    }
    return transpose;
  }

  function length(d) {
    return d.length;
  }

  function zip() {
    return transpose(arguments);
  }

  exports.bisect = bisectRight;
  exports.bisectRight = bisectRight;
  exports.bisectLeft = bisectLeft;
  exports.ascending = ascending;
  exports.bisector = bisector;
  exports.descending = descending;
  exports.deviation = deviation;
  exports.extent = extent;
  exports.histogram = histogram;
  exports.thresholdFreedmanDiaconis = freedmanDiaconis;
  exports.thresholdScott = scott;
  exports.thresholdSturges = sturges;
  exports.max = max;
  exports.mean = mean;
  exports.median = median;
  exports.merge = merge;
  exports.min = min;
  exports.pairs = pairs;
  exports.permute = permute;
  exports.quantile = quantile;
  exports.range = range;
  exports.scan = scan;
  exports.shuffle = shuffle;
  exports.sum = sum;
  exports.ticks = ticks;
  exports.tickStep = tickStep;
  exports.transpose = transpose;
  exports.variance = variance;
  exports.zip = zip;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
},{}],15:[function(require,module,exports){
// https://d3js.org/d3-collection/ Version 1.0.1. Copyright 2016 Mike Bostock.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

  var prefix = "$";

  function Map() {}

  Map.prototype = map.prototype = {
    constructor: Map,
    has: function(key) {
      return (prefix + key) in this;
    },
    get: function(key) {
      return this[prefix + key];
    },
    set: function(key, value) {
      this[prefix + key] = value;
      return this;
    },
    remove: function(key) {
      var property = prefix + key;
      return property in this && delete this[property];
    },
    clear: function() {
      for (var property in this) if (property[0] === prefix) delete this[property];
    },
    keys: function() {
      var keys = [];
      for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
      return keys;
    },
    values: function() {
      var values = [];
      for (var property in this) if (property[0] === prefix) values.push(this[property]);
      return values;
    },
    entries: function() {
      var entries = [];
      for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
      return entries;
    },
    size: function() {
      var size = 0;
      for (var property in this) if (property[0] === prefix) ++size;
      return size;
    },
    empty: function() {
      for (var property in this) if (property[0] === prefix) return false;
      return true;
    },
    each: function(f) {
      for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
    }
  };

  function map(object, f) {
    var map = new Map;

    // Copy constructor.
    if (object instanceof Map) object.each(function(value, key) { map.set(key, value); });

    // Index array by numeric index or specified key function.
    else if (Array.isArray(object)) {
      var i = -1,
          n = object.length,
          o;

      if (f == null) while (++i < n) map.set(i, object[i]);
      else while (++i < n) map.set(f(o = object[i], i, object), o);
    }

    // Convert object to map.
    else if (object) for (var key in object) map.set(key, object[key]);

    return map;
  }

  function nest() {
    var keys = [],
        sortKeys = [],
        sortValues,
        rollup,
        nest;

    function apply(array, depth, createResult, setResult) {
      if (depth >= keys.length) return rollup != null
          ? rollup(array) : (sortValues != null
          ? array.sort(sortValues)
          : array);

      var i = -1,
          n = array.length,
          key = keys[depth++],
          keyValue,
          value,
          valuesByKey = map(),
          values,
          result = createResult();

      while (++i < n) {
        if (values = valuesByKey.get(keyValue = key(value = array[i]) + "")) {
          values.push(value);
        } else {
          valuesByKey.set(keyValue, [value]);
        }
      }

      valuesByKey.each(function(values, key) {
        setResult(result, key, apply(values, depth, createResult, setResult));
      });

      return result;
    }

    function entries(map, depth) {
      if (++depth > keys.length) return map;
      var array, sortKey = sortKeys[depth - 1];
      if (rollup != null && depth >= keys.length) array = map.entries();
      else array = [], map.each(function(v, k) { array.push({key: k, values: entries(v, depth)}); });
      return sortKey != null ? array.sort(function(a, b) { return sortKey(a.key, b.key); }) : array;
    }

    return nest = {
      object: function(array) { return apply(array, 0, createObject, setObject); },
      map: function(array) { return apply(array, 0, createMap, setMap); },
      entries: function(array) { return entries(apply(array, 0, createMap, setMap), 0); },
      key: function(d) { keys.push(d); return nest; },
      sortKeys: function(order) { sortKeys[keys.length - 1] = order; return nest; },
      sortValues: function(order) { sortValues = order; return nest; },
      rollup: function(f) { rollup = f; return nest; }
    };
  }

  function createObject() {
    return {};
  }

  function setObject(object, key, value) {
    object[key] = value;
  }

  function createMap() {
    return map();
  }

  function setMap(map, key, value) {
    map.set(key, value);
  }

  function Set() {}

  var proto = map.prototype;

  Set.prototype = set.prototype = {
    constructor: Set,
    has: proto.has,
    add: function(value) {
      value += "";
      this[prefix + value] = value;
      return this;
    },
    remove: proto.remove,
    clear: proto.clear,
    values: proto.keys,
    size: proto.size,
    empty: proto.empty,
    each: proto.each
  };

  function set(object, f) {
    var set = new Set;

    // Copy constructor.
    if (object instanceof Set) object.each(function(value) { set.add(value); });

    // Otherwise, assume it’s an array.
    else if (object) {
      var i = -1, n = object.length;
      if (f == null) while (++i < n) set.add(object[i]);
      else while (++i < n) set.add(f(object[i], i, object));
    }

    return set;
  }

  function keys(map) {
    var keys = [];
    for (var key in map) keys.push(key);
    return keys;
  }

  function values(map) {
    var values = [];
    for (var key in map) values.push(map[key]);
    return values;
  }

  function entries(map) {
    var entries = [];
    for (var key in map) entries.push({key: key, value: map[key]});
    return entries;
  }

  exports.nest = nest;
  exports.set = set;
  exports.map = map;
  exports.keys = keys;
  exports.values = values;
  exports.entries = entries;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
},{}],16:[function(require,module,exports){
// https://d3js.org/d3-color/ Version 1.0.2. Copyright 2016 Mike Bostock.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

var define = function(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
};

function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

function Color() {}

var darker = 0.7;
var brighter = 1 / darker;

var reI = "\\s*([+-]?\\d+)\\s*";
var reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*";
var reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
var reHex3 = /^#([0-9a-f]{3})$/;
var reHex6 = /^#([0-9a-f]{6})$/;
var reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$");
var reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$");
var reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$");
var reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$");
var reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$");
var reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

var named = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32
};

define(Color, color, {
  displayable: function() {
    return this.rgb().displayable();
  },
  toString: function() {
    return this.rgb() + "";
  }
});

function color(format) {
  var m;
  format = (format + "").trim().toLowerCase();
  return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb((m >> 8 & 0xf) | (m >> 4 & 0x0f0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1)) // #f00
      : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format])
      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
      : null;
}

function rgbn(n) {
  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
}

function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}

function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb;
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}

function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}

function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}

define(Rgb, rgb, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb: function() {
    return this;
  },
  displayable: function() {
    return (0 <= this.r && this.r <= 255)
        && (0 <= this.g && this.g <= 255)
        && (0 <= this.b && this.b <= 255)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  toString: function() {
    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "rgb(" : "rgba(")
        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
        + (a === 1 ? ")" : ", " + a + ")");
  }
}));

function hsla(h, s, l, a) {
  if (a <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a);
}

function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl;
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      h = NaN,
      s = max - min,
      l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}

function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}

function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Hsl, hsl, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb: function() {
    var h = this.h % 360 + (this.h < 0) * 360,
        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
        l = this.l,
        m2 = l + (l < 0.5 ? l : 1 - l) * s,
        m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  displayable: function() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
        && (0 <= this.l && this.l <= 1)
        && (0 <= this.opacity && this.opacity <= 1);
  }
}));

/* From FvD 13.37, CSS Color Module Level 3 */
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60
      : h < 180 ? m2
      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
      : m1) * 255;
}

var deg2rad = Math.PI / 180;
var rad2deg = 180 / Math.PI;

var Kn = 18;
var Xn = 0.950470;
var Yn = 1;
var Zn = 1.088830;
var t0 = 4 / 29;
var t1 = 6 / 29;
var t2 = 3 * t1 * t1;
var t3 = t1 * t1 * t1;

function labConvert(o) {
  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
  if (o instanceof Hcl) {
    var h = o.h * deg2rad;
    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
  }
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var b = rgb2xyz(o.r),
      a = rgb2xyz(o.g),
      l = rgb2xyz(o.b),
      x = xyz2lab((0.4124564 * b + 0.3575761 * a + 0.1804375 * l) / Xn),
      y = xyz2lab((0.2126729 * b + 0.7151522 * a + 0.0721750 * l) / Yn),
      z = xyz2lab((0.0193339 * b + 0.1191920 * a + 0.9503041 * l) / Zn);
  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
}

function lab(l, a, b, opacity) {
  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
}

function Lab(l, a, b, opacity) {
  this.l = +l;
  this.a = +a;
  this.b = +b;
  this.opacity = +opacity;
}

define(Lab, lab, extend(Color, {
  brighter: function(k) {
    return new Lab(this.l + Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  darker: function(k) {
    return new Lab(this.l - Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  rgb: function() {
    var y = (this.l + 16) / 116,
        x = isNaN(this.a) ? y : y + this.a / 500,
        z = isNaN(this.b) ? y : y - this.b / 200;
    y = Yn * lab2xyz(y);
    x = Xn * lab2xyz(x);
    z = Zn * lab2xyz(z);
    return new Rgb(
      xyz2rgb( 3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
      xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z),
      xyz2rgb( 0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
      this.opacity
    );
  }
}));

function xyz2lab(t) {
  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
}

function lab2xyz(t) {
  return t > t1 ? t * t * t : t2 * (t - t0);
}

function xyz2rgb(x) {
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}

function rgb2xyz(x) {
  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function hclConvert(o) {
  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
  if (!(o instanceof Lab)) o = labConvert(o);
  var h = Math.atan2(o.b, o.a) * rad2deg;
  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
}

function hcl(h, c, l, opacity) {
  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
}

function Hcl(h, c, l, opacity) {
  this.h = +h;
  this.c = +c;
  this.l = +l;
  this.opacity = +opacity;
}

define(Hcl, hcl, extend(Color, {
  brighter: function(k) {
    return new Hcl(this.h, this.c, this.l + Kn * (k == null ? 1 : k), this.opacity);
  },
  darker: function(k) {
    return new Hcl(this.h, this.c, this.l - Kn * (k == null ? 1 : k), this.opacity);
  },
  rgb: function() {
    return labConvert(this).rgb();
  }
}));

var A = -0.14861;
var B = +1.78277;
var C = -0.29227;
var D = -0.90649;
var E = +1.97294;
var ED = E * D;
var EB = E * B;
var BC_DA = B * C - D * A;

function cubehelixConvert(o) {
  if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
      bl = b - l,
      k = (E * (g - l) - C * bl) / D,
      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
      h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
  return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
}

function cubehelix(h, s, l, opacity) {
  return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
}

function Cubehelix(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Cubehelix, cubehelix, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  rgb: function() {
    var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
        l = +this.l,
        a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
        cosh = Math.cos(h),
        sinh = Math.sin(h);
    return new Rgb(
      255 * (l + a * (A * cosh + B * sinh)),
      255 * (l + a * (C * cosh + D * sinh)),
      255 * (l + a * (E * cosh)),
      this.opacity
    );
  }
}));

exports.color = color;
exports.rgb = rgb;
exports.hsl = hsl;
exports.lab = lab;
exports.hcl = hcl;
exports.cubehelix = cubehelix;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],17:[function(require,module,exports){
// https://d3js.org/d3-format/ Version 1.2.0. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

// Computes the decimal coefficient and exponent of the specified number x with
// significant digits p, where x is positive and p is in [1, 21] or undefined.
// For example, formatDecimal(1.23) returns ["123", 0].
var formatDecimal = function(x, p) {
  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
  var i, coefficient = x.slice(0, i);

  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
  return [
    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
    +x.slice(i + 1)
  ];
};

var exponent = function(x) {
  return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
};

var formatGroup = function(grouping, thousands) {
  return function(value, width) {
    var i = value.length,
        t = [],
        j = 0,
        g = grouping[0],
        length = 0;

    while (i > 0 && g > 0) {
      if (length + g + 1 > width) g = Math.max(1, width - length);
      t.push(value.substring(i -= g, i + g));
      if ((length += g + 1) > width) break;
      g = grouping[j = (j + 1) % grouping.length];
    }

    return t.reverse().join(thousands);
  };
};

var formatNumerals = function(numerals) {
  return function(value) {
    return value.replace(/[0-9]/g, function(i) {
      return numerals[+i];
    });
  };
};

var formatDefault = function(x, p) {
  x = x.toPrecision(p);

  out: for (var n = x.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (x[i]) {
      case ".": i0 = i1 = i; break;
      case "0": if (i0 === 0) i0 = i; i1 = i; break;
      case "e": break out;
      default: if (i0 > 0) i0 = 0; break;
    }
  }

  return i0 > 0 ? x.slice(0, i0) + x.slice(i1 + 1) : x;
};

var prefixExponent;

var formatPrefixAuto = function(x, p) {
  var d = formatDecimal(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1],
      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
      n = coefficient.length;
  return i === n ? coefficient
      : i > n ? coefficient + new Array(i - n + 1).join("0")
      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
      : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
};

var formatRounded = function(x, p) {
  var d = formatDecimal(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1];
  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
};

var formatTypes = {
  "": formatDefault,
  "%": function(x, p) { return (x * 100).toFixed(p); },
  "b": function(x) { return Math.round(x).toString(2); },
  "c": function(x) { return x + ""; },
  "d": function(x) { return Math.round(x).toString(10); },
  "e": function(x, p) { return x.toExponential(p); },
  "f": function(x, p) { return x.toFixed(p); },
  "g": function(x, p) { return x.toPrecision(p); },
  "o": function(x) { return Math.round(x).toString(8); },
  "p": function(x, p) { return formatRounded(x * 100, p); },
  "r": formatRounded,
  "s": formatPrefixAuto,
  "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
  "x": function(x) { return Math.round(x).toString(16); }
};

// [[fill]align][sign][symbol][0][width][,][.precision][type]
var re = /^(?:(.)?([<>=^]))?([+\-\( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?([a-z%])?$/i;

function formatSpecifier(specifier) {
  return new FormatSpecifier(specifier);
}

formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

function FormatSpecifier(specifier) {
  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);

  var match,
      fill = match[1] || " ",
      align = match[2] || ">",
      sign = match[3] || "-",
      symbol = match[4] || "",
      zero = !!match[5],
      width = match[6] && +match[6],
      comma = !!match[7],
      precision = match[8] && +match[8].slice(1),
      type = match[9] || "";

  // The "n" type is an alias for ",g".
  if (type === "n") comma = true, type = "g";

  // Map invalid types to the default format.
  else if (!formatTypes[type]) type = "";

  // If zero fill is specified, padding goes after sign and before digits.
  if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

  this.fill = fill;
  this.align = align;
  this.sign = sign;
  this.symbol = symbol;
  this.zero = zero;
  this.width = width;
  this.comma = comma;
  this.precision = precision;
  this.type = type;
}

FormatSpecifier.prototype.toString = function() {
  return this.fill
      + this.align
      + this.sign
      + this.symbol
      + (this.zero ? "0" : "")
      + (this.width == null ? "" : Math.max(1, this.width | 0))
      + (this.comma ? "," : "")
      + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0))
      + this.type;
};

var identity = function(x) {
  return x;
};

var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

var formatLocale = function(locale) {
  var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity,
      currency = locale.currency,
      decimal = locale.decimal,
      numerals = locale.numerals ? formatNumerals(locale.numerals) : identity,
      percent = locale.percent || "%";

  function newFormat(specifier) {
    specifier = formatSpecifier(specifier);

    var fill = specifier.fill,
        align = specifier.align,
        sign = specifier.sign,
        symbol = specifier.symbol,
        zero = specifier.zero,
        width = specifier.width,
        comma = specifier.comma,
        precision = specifier.precision,
        type = specifier.type;

    // Compute the prefix and suffix.
    // For SI-prefix, the suffix is lazily computed.
    var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
        suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? percent : "";

    // What format function should we use?
    // Is this an integer type?
    // Can this type generate exponential notation?
    var formatType = formatTypes[type],
        maybeSuffix = !type || /[defgprs%]/.test(type);

    // Set the default precision if not specified,
    // or clamp the specified precision to the supported range.
    // For significant precision, it must be in [1, 21].
    // For fixed precision, it must be in [0, 20].
    precision = precision == null ? (type ? 6 : 12)
        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
        : Math.max(0, Math.min(20, precision));

    function format(value) {
      var valuePrefix = prefix,
          valueSuffix = suffix,
          i, n, c;

      if (type === "c") {
        valueSuffix = formatType(value) + valueSuffix;
        value = "";
      } else {
        value = +value;

        // Perform the initial formatting.
        var valueNegative = value < 0;
        value = formatType(Math.abs(value), precision);

        // If a negative value rounds to zero during formatting, treat as positive.
        if (valueNegative && +value === 0) valueNegative = false;

        // Compute the prefix and suffix.
        valuePrefix = (valueNegative ? (sign === "(" ? sign : "-") : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
        valueSuffix = valueSuffix + (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + (valueNegative && sign === "(" ? ")" : "");

        // Break the formatted value into the integer “value” part that can be
        // grouped, and fractional or exponential “suffix” part that is not.
        if (maybeSuffix) {
          i = -1, n = value.length;
          while (++i < n) {
            if (c = value.charCodeAt(i), 48 > c || c > 57) {
              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
              value = value.slice(0, i);
              break;
            }
          }
        }
      }

      // If the fill character is not "0", grouping is applied before padding.
      if (comma && !zero) value = group(value, Infinity);

      // Compute the padding.
      var length = valuePrefix.length + value.length + valueSuffix.length,
          padding = length < width ? new Array(width - length + 1).join(fill) : "";

      // If the fill character is "0", grouping is applied after padding.
      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

      // Reconstruct the final output based on the desired alignment.
      switch (align) {
        case "<": value = valuePrefix + value + valueSuffix + padding; break;
        case "=": value = valuePrefix + padding + value + valueSuffix; break;
        case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
        default: value = padding + valuePrefix + value + valueSuffix; break;
      }

      return numerals(value);
    }

    format.toString = function() {
      return specifier + "";
    };

    return format;
  }

  function formatPrefix(specifier, value) {
    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
        e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
        k = Math.pow(10, -e),
        prefix = prefixes[8 + e / 3];
    return function(value) {
      return f(k * value) + prefix;
    };
  }

  return {
    format: newFormat,
    formatPrefix: formatPrefix
  };
};

var locale;



defaultLocale({
  decimal: ".",
  thousands: ",",
  grouping: [3],
  currency: ["$", ""]
});

function defaultLocale(definition) {
  locale = formatLocale(definition);
  exports.format = locale.format;
  exports.formatPrefix = locale.formatPrefix;
  return locale;
}

var precisionFixed = function(step) {
  return Math.max(0, -exponent(Math.abs(step)));
};

var precisionPrefix = function(step, value) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
};

var precisionRound = function(step, max) {
  step = Math.abs(step), max = Math.abs(max) - step;
  return Math.max(0, exponent(max) - exponent(step)) + 1;
};

exports.formatDefaultLocale = defaultLocale;
exports.formatLocale = formatLocale;
exports.formatSpecifier = formatSpecifier;
exports.precisionFixed = precisionFixed;
exports.precisionPrefix = precisionPrefix;
exports.precisionRound = precisionRound;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],18:[function(require,module,exports){
// https://d3js.org/d3-interpolate/ Version 1.1.4. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-color')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-color'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3));
}(this, (function (exports,d3Color) { 'use strict';

function basis(t1, v0, v1, v2, v3) {
  var t2 = t1 * t1, t3 = t2 * t1;
  return ((1 - 3 * t1 + 3 * t2 - t3) * v0
      + (4 - 6 * t2 + 3 * t3) * v1
      + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2
      + t3 * v3) / 6;
}

var basis$1 = function(values) {
  var n = values.length - 1;
  return function(t) {
    var i = t <= 0 ? (t = 0) : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n),
        v1 = values[i],
        v2 = values[i + 1],
        v0 = i > 0 ? values[i - 1] : 2 * v1 - v2,
        v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
};

var basisClosed = function(values) {
  var n = values.length;
  return function(t) {
    var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n),
        v0 = values[(i + n - 1) % n],
        v1 = values[i % n],
        v2 = values[(i + 1) % n],
        v3 = values[(i + 2) % n];
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
};

var constant = function(x) {
  return function() {
    return x;
  };
};

function linear(a, d) {
  return function(t) {
    return a + t * d;
  };
}

function exponential(a, b, y) {
  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
    return Math.pow(a + t * b, y);
  };
}

function hue(a, b) {
  var d = b - a;
  return d ? linear(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant(isNaN(a) ? b : a);
}

function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
  };
}

function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant(isNaN(a) ? b : a);
}

var rgb$1 = ((function rgbGamma(y) {
  var color$$1 = gamma(y);

  function rgb$$1(start, end) {
    var r = color$$1((start = d3Color.rgb(start)).r, (end = d3Color.rgb(end)).r),
        g = color$$1(start.g, end.g),
        b = color$$1(start.b, end.b),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }

  rgb$$1.gamma = rgbGamma;

  return rgb$$1;
}))(1);

function rgbSpline(spline) {
  return function(colors) {
    var n = colors.length,
        r = new Array(n),
        g = new Array(n),
        b = new Array(n),
        i, color$$1;
    for (i = 0; i < n; ++i) {
      color$$1 = d3Color.rgb(colors[i]);
      r[i] = color$$1.r || 0;
      g[i] = color$$1.g || 0;
      b[i] = color$$1.b || 0;
    }
    r = spline(r);
    g = spline(g);
    b = spline(b);
    color$$1.opacity = 1;
    return function(t) {
      color$$1.r = r(t);
      color$$1.g = g(t);
      color$$1.b = b(t);
      return color$$1 + "";
    };
  };
}

var rgbBasis = rgbSpline(basis$1);
var rgbBasisClosed = rgbSpline(basisClosed);

var array = function(a, b) {
  var nb = b ? b.length : 0,
      na = a ? Math.min(nb, a.length) : 0,
      x = new Array(nb),
      c = new Array(nb),
      i;

  for (i = 0; i < na; ++i) x[i] = value(a[i], b[i]);
  for (; i < nb; ++i) c[i] = b[i];

  return function(t) {
    for (i = 0; i < na; ++i) c[i] = x[i](t);
    return c;
  };
};

var date = function(a, b) {
  var d = new Date;
  return a = +a, b -= a, function(t) {
    return d.setTime(a + b * t), d;
  };
};

var number = function(a, b) {
  return a = +a, b -= a, function(t) {
    return a + b * t;
  };
};

var object = function(a, b) {
  var i = {},
      c = {},
      k;

  if (a === null || typeof a !== "object") a = {};
  if (b === null || typeof b !== "object") b = {};

  for (k in b) {
    if (k in a) {
      i[k] = value(a[k], b[k]);
    } else {
      c[k] = b[k];
    }
  }

  return function(t) {
    for (k in i) c[k] = i[k](t);
    return c;
  };
};

var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
var reB = new RegExp(reA.source, "g");

function zero(b) {
  return function() {
    return b;
  };
}

function one(b) {
  return function(t) {
    return b(t) + "";
  };
}

var string = function(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
      am, // current match in a
      bm, // current match in b
      bs, // string preceding current number in b, if any
      i = -1, // index in s
      s = [], // string constants and placeholders
      q = []; // number interpolators

  // Coerce inputs to strings.
  a = a + "", b = b + "";

  // Interpolate pairs of numbers in a & b.
  while ((am = reA.exec(a))
      && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) { // a string precedes the next number in b
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
      if (s[i]) s[i] += bm; // coalesce with previous string
      else s[++i] = bm;
    } else { // interpolate non-matching numbers
      s[++i] = null;
      q.push({i: i, x: number(am, bm)});
    }
    bi = reB.lastIndex;
  }

  // Add remains of b.
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs; // coalesce with previous string
    else s[++i] = bs;
  }

  // Special optimization for only a single match.
  // Otherwise, interpolate each of the numbers and rejoin the string.
  return s.length < 2 ? (q[0]
      ? one(q[0].x)
      : zero(b))
      : (b = q.length, function(t) {
          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        });
};

var value = function(a, b) {
  var t = typeof b, c;
  return b == null || t === "boolean" ? constant(b)
      : (t === "number" ? number
      : t === "string" ? ((c = d3Color.color(b)) ? (b = c, rgb$1) : string)
      : b instanceof d3Color.color ? rgb$1
      : b instanceof Date ? date
      : Array.isArray(b) ? array
      : isNaN(b) ? object
      : number)(a, b);
};

var round = function(a, b) {
  return a = +a, b -= a, function(t) {
    return Math.round(a + b * t);
  };
};

var degrees = 180 / Math.PI;

var identity = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};

var decompose = function(a, b, c, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * degrees,
    skewX: Math.atan(skewX) * degrees,
    scaleX: scaleX,
    scaleY: scaleY
  };
};

var cssNode;
var cssRoot;
var cssView;
var svgNode;

function parseCss(value) {
  if (value === "none") return identity;
  if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
  cssNode.style.transform = value;
  value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
  cssRoot.removeChild(cssNode);
  value = value.slice(7, -1).split(",");
  return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
}

function parseSvg(value) {
  if (value == null) return identity;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
  value = value.matrix;
  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
}

function interpolateTransform(parse, pxComma, pxParen, degParen) {

  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }

  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({i: i - 4, x: number(xa, xb)}, {i: i - 2, x: number(ya, yb)});
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }

  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number(a, b)});
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }

  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number(a, b)});
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }

  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({i: i - 4, x: number(xa, xb)}, {i: i - 2, x: number(ya, yb)});
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }

  return function(a, b) {
    var s = [], // string constants and placeholders
        q = []; // number interpolators
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null; // gc
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}

var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

var rho = Math.SQRT2;
var rho2 = 2;
var rho4 = 4;
var epsilon2 = 1e-12;

function cosh(x) {
  return ((x = Math.exp(x)) + 1 / x) / 2;
}

function sinh(x) {
  return ((x = Math.exp(x)) - 1 / x) / 2;
}

function tanh(x) {
  return ((x = Math.exp(2 * x)) - 1) / (x + 1);
}

// p0 = [ux0, uy0, w0]
// p1 = [ux1, uy1, w1]
var zoom = function(p0, p1) {
  var ux0 = p0[0], uy0 = p0[1], w0 = p0[2],
      ux1 = p1[0], uy1 = p1[1], w1 = p1[2],
      dx = ux1 - ux0,
      dy = uy1 - uy0,
      d2 = dx * dx + dy * dy,
      i,
      S;

  // Special case for u0 ≅ u1.
  if (d2 < epsilon2) {
    S = Math.log(w1 / w0) / rho;
    i = function(t) {
      return [
        ux0 + t * dx,
        uy0 + t * dy,
        w0 * Math.exp(rho * t * S)
      ];
    };
  }

  // General case.
  else {
    var d1 = Math.sqrt(d2),
        b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
        b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
        r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
        r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    S = (r1 - r0) / rho;
    i = function(t) {
      var s = t * S,
          coshr0 = cosh(r0),
          u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
      return [
        ux0 + u * dx,
        uy0 + u * dy,
        w0 * coshr0 / cosh(rho * s + r0)
      ];
    };
  }

  i.duration = S * 1000;

  return i;
};

function hsl$1(hue$$1) {
  return function(start, end) {
    var h = hue$$1((start = d3Color.hsl(start)).h, (end = d3Color.hsl(end)).h),
        s = nogamma(start.s, end.s),
        l = nogamma(start.l, end.l),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.h = h(t);
      start.s = s(t);
      start.l = l(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }
}

var hsl$2 = hsl$1(hue);
var hslLong = hsl$1(nogamma);

function lab$1(start, end) {
  var l = nogamma((start = d3Color.lab(start)).l, (end = d3Color.lab(end)).l),
      a = nogamma(start.a, end.a),
      b = nogamma(start.b, end.b),
      opacity = nogamma(start.opacity, end.opacity);
  return function(t) {
    start.l = l(t);
    start.a = a(t);
    start.b = b(t);
    start.opacity = opacity(t);
    return start + "";
  };
}

function hcl$1(hue$$1) {
  return function(start, end) {
    var h = hue$$1((start = d3Color.hcl(start)).h, (end = d3Color.hcl(end)).h),
        c = nogamma(start.c, end.c),
        l = nogamma(start.l, end.l),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.h = h(t);
      start.c = c(t);
      start.l = l(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }
}

var hcl$2 = hcl$1(hue);
var hclLong = hcl$1(nogamma);

function cubehelix$1(hue$$1) {
  return (function cubehelixGamma(y) {
    y = +y;

    function cubehelix$$1(start, end) {
      var h = hue$$1((start = d3Color.cubehelix(start)).h, (end = d3Color.cubehelix(end)).h),
          s = nogamma(start.s, end.s),
          l = nogamma(start.l, end.l),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.h = h(t);
        start.s = s(t);
        start.l = l(Math.pow(t, y));
        start.opacity = opacity(t);
        return start + "";
      };
    }

    cubehelix$$1.gamma = cubehelixGamma;

    return cubehelix$$1;
  })(1);
}

var cubehelix$2 = cubehelix$1(hue);
var cubehelixLong = cubehelix$1(nogamma);

var quantize = function(interpolator, n) {
  var samples = new Array(n);
  for (var i = 0; i < n; ++i) samples[i] = interpolator(i / (n - 1));
  return samples;
};

exports.interpolate = value;
exports.interpolateArray = array;
exports.interpolateBasis = basis$1;
exports.interpolateBasisClosed = basisClosed;
exports.interpolateDate = date;
exports.interpolateNumber = number;
exports.interpolateObject = object;
exports.interpolateRound = round;
exports.interpolateString = string;
exports.interpolateTransformCss = interpolateTransformCss;
exports.interpolateTransformSvg = interpolateTransformSvg;
exports.interpolateZoom = zoom;
exports.interpolateRgb = rgb$1;
exports.interpolateRgbBasis = rgbBasis;
exports.interpolateRgbBasisClosed = rgbBasisClosed;
exports.interpolateHsl = hsl$2;
exports.interpolateHslLong = hslLong;
exports.interpolateLab = lab$1;
exports.interpolateHcl = hcl$2;
exports.interpolateHclLong = hclLong;
exports.interpolateCubehelix = cubehelix$2;
exports.interpolateCubehelixLong = cubehelixLong;
exports.quantize = quantize;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{"d3-color":16}],19:[function(require,module,exports){
// https://d3js.org/d3-path/ Version 1.0.5. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

var pi = Math.PI;
var tau = 2 * pi;
var epsilon = 1e-6;
var tauEpsilon = tau - epsilon;

function Path() {
  this._x0 = this._y0 = // start of current subpath
  this._x1 = this._y1 = null; // end of current subpath
  this._ = "";
}

function path() {
  return new Path;
}

Path.prototype = path.prototype = {
  constructor: Path,
  moveTo: function(x, y) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
  },
  closePath: function() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  },
  lineTo: function(x, y) {
    this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  quadraticCurveTo: function(x1, y1, x, y) {
    this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
    this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  arcTo: function(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    var x0 = this._x1,
        y0 = this._y1,
        x21 = x2 - x1,
        y21 = y2 - y1,
        x01 = x0 - x1,
        y01 = y0 - y1,
        l01_2 = x01 * x01 + y01 * y01;

    // Is the radius negative? Error.
    if (r < 0) throw new Error("negative radius: " + r);

    // Is this path empty? Move to (x1,y1).
    if (this._x1 === null) {
      this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon)) {}

    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Line to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Otherwise, draw an arc!
    else {
      var x20 = x2 - x0,
          y20 = y2 - y0,
          l21_2 = x21 * x21 + y21 * y21,
          l20_2 = x20 * x20 + y20 * y20,
          l21 = Math.sqrt(l21_2),
          l01 = Math.sqrt(l01_2),
          l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
          t01 = l / l01,
          t21 = l / l21;

      // If the start tangent is not coincident with (x0,y0), line to.
      if (Math.abs(t01 - 1) > epsilon) {
        this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
      }

      this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
    }
  },
  arc: function(x, y, r, a0, a1, ccw) {
    x = +x, y = +y, r = +r;
    var dx = r * Math.cos(a0),
        dy = r * Math.sin(a0),
        x0 = x + dx,
        y0 = y + dy,
        cw = 1 ^ ccw,
        da = ccw ? a0 - a1 : a1 - a0;

    // Is the radius negative? Error.
    if (r < 0) throw new Error("negative radius: " + r);

    // Is this path empty? Move to (x0,y0).
    if (this._x1 === null) {
      this._ += "M" + x0 + "," + y0;
    }

    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._ += "L" + x0 + "," + y0;
    }

    // Is this arc empty? We’re done.
    if (!r) return;

    // Does the angle go the wrong way? Flip the direction.
    if (da < 0) da = da % tau + tau;

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon) {
      this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
    }

    // Is this arc non-empty? Draw an arc!
    else if (da > epsilon) {
      this._ += "A" + r + "," + r + ",0," + (+(da >= pi)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
    }
  },
  rect: function(x, y, w, h) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
  },
  toString: function() {
    return this._;
  }
};

exports.path = path;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],20:[function(require,module,exports){
// https://d3js.org/d3-random/ Version 1.0.1. Copyright 2016 Mike Bostock.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

  function uniform(min, max) {
    min = min == null ? 0 : +min;
    max = max == null ? 1 : +max;
    if (arguments.length === 1) max = min, min = 0;
    else max -= min;
    return function() {
      return Math.random() * max + min;
    };
  }

  function normal(mu, sigma) {
    var x, r;
    mu = mu == null ? 0 : +mu;
    sigma = sigma == null ? 1 : +sigma;
    return function() {
      var y;

      // If available, use the second previously-generated uniform random.
      if (x != null) y = x, x = null;

      // Otherwise, generate a new x and y.
      else do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        r = x * x + y * y;
      } while (!r || r > 1);

      return mu + sigma * y * Math.sqrt(-2 * Math.log(r) / r);
    };
  }

  function logNormal() {
    var randomNormal = normal.apply(this, arguments);
    return function() {
      return Math.exp(randomNormal());
    };
  }

  function irwinHall(n) {
    return function() {
      for (var sum = 0, i = 0; i < n; ++i) sum += Math.random();
      return sum;
    };
  }

  function bates(n) {
    var randomIrwinHall = irwinHall(n);
    return function() {
      return randomIrwinHall() / n;
    };
  }

  function exponential(lambda) {
    return function() {
      return -Math.log(1 - Math.random()) / lambda;
    };
  }

  exports.randomUniform = uniform;
  exports.randomNormal = normal;
  exports.randomLogNormal = logNormal;
  exports.randomBates = bates;
  exports.randomIrwinHall = irwinHall;
  exports.randomExponential = exponential;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
},{}],21:[function(require,module,exports){
// https://d3js.org/d3-scale/ Version 1.0.3. Copyright 2016 Mike Bostock.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-array'), require('d3-collection'), require('d3-interpolate'), require('d3-format'), require('d3-time'), require('d3-time-format'), require('d3-color')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3-array', 'd3-collection', 'd3-interpolate', 'd3-format', 'd3-time', 'd3-time-format', 'd3-color'], factory) :
  (factory((global.d3 = global.d3 || {}),global.d3,global.d3,global.d3,global.d3,global.d3,global.d3,global.d3));
}(this, function (exports,d3Array,d3Collection,d3Interpolate,d3Format,d3Time,d3TimeFormat,d3Color) { 'use strict';

  var array = Array.prototype;

  var map$1 = array.map;
  var slice = array.slice;

  var implicit = {name: "implicit"};

  function ordinal(range) {
    var index = d3Collection.map(),
        domain = [],
        unknown = implicit;

    range = range == null ? [] : slice.call(range);

    function scale(d) {
      var key = d + "", i = index.get(key);
      if (!i) {
        if (unknown !== implicit) return unknown;
        index.set(key, i = domain.push(d));
      }
      return range[(i - 1) % range.length];
    }

    scale.domain = function(_) {
      if (!arguments.length) return domain.slice();
      domain = [], index = d3Collection.map();
      var i = -1, n = _.length, d, key;
      while (++i < n) if (!index.has(key = (d = _[i]) + "")) index.set(key, domain.push(d));
      return scale;
    };

    scale.range = function(_) {
      return arguments.length ? (range = slice.call(_), scale) : range.slice();
    };

    scale.unknown = function(_) {
      return arguments.length ? (unknown = _, scale) : unknown;
    };

    scale.copy = function() {
      return ordinal()
          .domain(domain)
          .range(range)
          .unknown(unknown);
    };

    return scale;
  }

  function band() {
    var scale = ordinal().unknown(undefined),
        domain = scale.domain,
        ordinalRange = scale.range,
        range = [0, 1],
        step,
        bandwidth,
        round = false,
        paddingInner = 0,
        paddingOuter = 0,
        align = 0.5;

    delete scale.unknown;

    function rescale() {
      var n = domain().length,
          reverse = range[1] < range[0],
          start = range[reverse - 0],
          stop = range[1 - reverse];
      step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
      if (round) step = Math.floor(step);
      start += (stop - start - step * (n - paddingInner)) * align;
      bandwidth = step * (1 - paddingInner);
      if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
      var values = d3Array.range(n).map(function(i) { return start + step * i; });
      return ordinalRange(reverse ? values.reverse() : values);
    }

    scale.domain = function(_) {
      return arguments.length ? (domain(_), rescale()) : domain();
    };

    scale.range = function(_) {
      return arguments.length ? (range = [+_[0], +_[1]], rescale()) : range.slice();
    };

    scale.rangeRound = function(_) {
      return range = [+_[0], +_[1]], round = true, rescale();
    };

    scale.bandwidth = function() {
      return bandwidth;
    };

    scale.step = function() {
      return step;
    };

    scale.round = function(_) {
      return arguments.length ? (round = !!_, rescale()) : round;
    };

    scale.padding = function(_) {
      return arguments.length ? (paddingInner = paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
    };

    scale.paddingInner = function(_) {
      return arguments.length ? (paddingInner = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
    };

    scale.paddingOuter = function(_) {
      return arguments.length ? (paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingOuter;
    };

    scale.align = function(_) {
      return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
    };

    scale.copy = function() {
      return band()
          .domain(domain())
          .range(range)
          .round(round)
          .paddingInner(paddingInner)
          .paddingOuter(paddingOuter)
          .align(align);
    };

    return rescale();
  }

  function pointish(scale) {
    var copy = scale.copy;

    scale.padding = scale.paddingOuter;
    delete scale.paddingInner;
    delete scale.paddingOuter;

    scale.copy = function() {
      return pointish(copy());
    };

    return scale;
  }

  function point() {
    return pointish(band().paddingInner(1));
  }

  function constant(x) {
    return function() {
      return x;
    };
  }

  function number(x) {
    return +x;
  }

  var unit = [0, 1];

  function deinterpolate(a, b) {
    return (b -= (a = +a))
        ? function(x) { return (x - a) / b; }
        : constant(b);
  }

  function deinterpolateClamp(deinterpolate) {
    return function(a, b) {
      var d = deinterpolate(a = +a, b = +b);
      return function(x) { return x <= a ? 0 : x >= b ? 1 : d(x); };
    };
  }

  function reinterpolateClamp(reinterpolate) {
    return function(a, b) {
      var r = reinterpolate(a = +a, b = +b);
      return function(t) { return t <= 0 ? a : t >= 1 ? b : r(t); };
    };
  }

  function bimap(domain, range, deinterpolate, reinterpolate) {
    var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
    if (d1 < d0) d0 = deinterpolate(d1, d0), r0 = reinterpolate(r1, r0);
    else d0 = deinterpolate(d0, d1), r0 = reinterpolate(r0, r1);
    return function(x) { return r0(d0(x)); };
  }

  function polymap(domain, range, deinterpolate, reinterpolate) {
    var j = Math.min(domain.length, range.length) - 1,
        d = new Array(j),
        r = new Array(j),
        i = -1;

    // Reverse descending domains.
    if (domain[j] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }

    while (++i < j) {
      d[i] = deinterpolate(domain[i], domain[i + 1]);
      r[i] = reinterpolate(range[i], range[i + 1]);
    }

    return function(x) {
      var i = d3Array.bisect(domain, x, 1, j) - 1;
      return r[i](d[i](x));
    };
  }

  function copy(source, target) {
    return target
        .domain(source.domain())
        .range(source.range())
        .interpolate(source.interpolate())
        .clamp(source.clamp());
  }

  // deinterpolate(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
  // reinterpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding domain value x in [a,b].
  function continuous(deinterpolate$$, reinterpolate) {
    var domain = unit,
        range = unit,
        interpolate = d3Interpolate.interpolate,
        clamp = false,
        piecewise,
        output,
        input;

    function rescale() {
      piecewise = Math.min(domain.length, range.length) > 2 ? polymap : bimap;
      output = input = null;
      return scale;
    }

    function scale(x) {
      return (output || (output = piecewise(domain, range, clamp ? deinterpolateClamp(deinterpolate$$) : deinterpolate$$, interpolate)))(+x);
    }

    scale.invert = function(y) {
      return (input || (input = piecewise(range, domain, deinterpolate, clamp ? reinterpolateClamp(reinterpolate) : reinterpolate)))(+y);
    };

    scale.domain = function(_) {
      return arguments.length ? (domain = map$1.call(_, number), rescale()) : domain.slice();
    };

    scale.range = function(_) {
      return arguments.length ? (range = slice.call(_), rescale()) : range.slice();
    };

    scale.rangeRound = function(_) {
      return range = slice.call(_), interpolate = d3Interpolate.interpolateRound, rescale();
    };

    scale.clamp = function(_) {
      return arguments.length ? (clamp = !!_, rescale()) : clamp;
    };

    scale.interpolate = function(_) {
      return arguments.length ? (interpolate = _, rescale()) : interpolate;
    };

    return rescale();
  }

  function tickFormat(domain, count, specifier) {
    var start = domain[0],
        stop = domain[domain.length - 1],
        step = d3Array.tickStep(start, stop, count == null ? 10 : count),
        precision;
    specifier = d3Format.formatSpecifier(specifier == null ? ",f" : specifier);
    switch (specifier.type) {
      case "s": {
        var value = Math.max(Math.abs(start), Math.abs(stop));
        if (specifier.precision == null && !isNaN(precision = d3Format.precisionPrefix(step, value))) specifier.precision = precision;
        return d3Format.formatPrefix(specifier, value);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        if (specifier.precision == null && !isNaN(precision = d3Format.precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
        break;
      }
      case "f":
      case "%": {
        if (specifier.precision == null && !isNaN(precision = d3Format.precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
        break;
      }
    }
    return d3Format.format(specifier);
  }

  function linearish(scale) {
    var domain = scale.domain;

    scale.ticks = function(count) {
      var d = domain();
      return d3Array.ticks(d[0], d[d.length - 1], count == null ? 10 : count);
    };

    scale.tickFormat = function(count, specifier) {
      return tickFormat(domain(), count, specifier);
    };

    scale.nice = function(count) {
      var d = domain(),
          i = d.length - 1,
          n = count == null ? 10 : count,
          start = d[0],
          stop = d[i],
          step = d3Array.tickStep(start, stop, n);

      if (step) {
        step = d3Array.tickStep(Math.floor(start / step) * step, Math.ceil(stop / step) * step, n);
        d[0] = Math.floor(start / step) * step;
        d[i] = Math.ceil(stop / step) * step;
        domain(d);
      }

      return scale;
    };

    return scale;
  }

  function linear() {
    var scale = continuous(deinterpolate, d3Interpolate.interpolateNumber);

    scale.copy = function() {
      return copy(scale, linear());
    };

    return linearish(scale);
  }

  function identity() {
    var domain = [0, 1];

    function scale(x) {
      return +x;
    }

    scale.invert = scale;

    scale.domain = scale.range = function(_) {
      return arguments.length ? (domain = map$1.call(_, number), scale) : domain.slice();
    };

    scale.copy = function() {
      return identity().domain(domain);
    };

    return linearish(scale);
  }

  function nice(domain, interval) {
    domain = domain.slice();

    var i0 = 0,
        i1 = domain.length - 1,
        x0 = domain[i0],
        x1 = domain[i1],
        t;

    if (x1 < x0) {
      t = i0, i0 = i1, i1 = t;
      t = x0, x0 = x1, x1 = t;
    }

    domain[i0] = interval.floor(x0);
    domain[i1] = interval.ceil(x1);
    return domain;
  }

  function deinterpolate$1(a, b) {
    return (b = Math.log(b / a))
        ? function(x) { return Math.log(x / a) / b; }
        : constant(b);
  }

  function reinterpolate(a, b) {
    return a < 0
        ? function(t) { return -Math.pow(-b, t) * Math.pow(-a, 1 - t); }
        : function(t) { return Math.pow(b, t) * Math.pow(a, 1 - t); };
  }

  function pow10(x) {
    return isFinite(x) ? +("1e" + x) : x < 0 ? 0 : x;
  }

  function powp(base) {
    return base === 10 ? pow10
        : base === Math.E ? Math.exp
        : function(x) { return Math.pow(base, x); };
  }

  function logp(base) {
    return base === Math.E ? Math.log
        : base === 10 && Math.log10
        || base === 2 && Math.log2
        || (base = Math.log(base), function(x) { return Math.log(x) / base; });
  }

  function reflect(f) {
    return function(x) {
      return -f(-x);
    };
  }

  function log() {
    var scale = continuous(deinterpolate$1, reinterpolate).domain([1, 10]),
        domain = scale.domain,
        base = 10,
        logs = logp(10),
        pows = powp(10);

    function rescale() {
      logs = logp(base), pows = powp(base);
      if (domain()[0] < 0) logs = reflect(logs), pows = reflect(pows);
      return scale;
    }

    scale.base = function(_) {
      return arguments.length ? (base = +_, rescale()) : base;
    };

    scale.domain = function(_) {
      return arguments.length ? (domain(_), rescale()) : domain();
    };

    scale.ticks = function(count) {
      var d = domain(),
          u = d[0],
          v = d[d.length - 1],
          r;

      if (r = v < u) i = u, u = v, v = i;

      var i = logs(u),
          j = logs(v),
          p,
          k,
          t,
          n = count == null ? 10 : +count,
          z = [];

      if (!(base % 1) && j - i < n) {
        i = Math.round(i) - 1, j = Math.round(j) + 1;
        if (u > 0) for (; i < j; ++i) {
          for (k = 1, p = pows(i); k < base; ++k) {
            t = p * k;
            if (t < u) continue;
            if (t > v) break;
            z.push(t);
          }
        } else for (; i < j; ++i) {
          for (k = base - 1, p = pows(i); k >= 1; --k) {
            t = p * k;
            if (t < u) continue;
            if (t > v) break;
            z.push(t);
          }
        }
      } else {
        z = d3Array.ticks(i, j, Math.min(j - i, n)).map(pows);
      }

      return r ? z.reverse() : z;
    };

    scale.tickFormat = function(count, specifier) {
      if (specifier == null) specifier = base === 10 ? ".0e" : ",";
      if (typeof specifier !== "function") specifier = d3Format.format(specifier);
      if (count === Infinity) return specifier;
      if (count == null) count = 10;
      var k = Math.max(1, base * count / scale.ticks().length); // TODO fast estimate?
      return function(d) {
        var i = d / pows(Math.round(logs(d)));
        if (i * base < base - 0.5) i *= base;
        return i <= k ? specifier(d) : "";
      };
    };

    scale.nice = function() {
      return domain(nice(domain(), {
        floor: function(x) { return pows(Math.floor(logs(x))); },
        ceil: function(x) { return pows(Math.ceil(logs(x))); }
      }));
    };

    scale.copy = function() {
      return copy(scale, log().base(base));
    };

    return scale;
  }

  function raise(x, exponent) {
    return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
  }

  function pow() {
    var exponent = 1,
        scale = continuous(deinterpolate, reinterpolate),
        domain = scale.domain;

    function deinterpolate(a, b) {
      return (b = raise(b, exponent) - (a = raise(a, exponent)))
          ? function(x) { return (raise(x, exponent) - a) / b; }
          : constant(b);
    }

    function reinterpolate(a, b) {
      b = raise(b, exponent) - (a = raise(a, exponent));
      return function(t) { return raise(a + b * t, 1 / exponent); };
    }

    scale.exponent = function(_) {
      return arguments.length ? (exponent = +_, domain(domain())) : exponent;
    };

    scale.copy = function() {
      return copy(scale, pow().exponent(exponent));
    };

    return linearish(scale);
  }

  function sqrt() {
    return pow().exponent(0.5);
  }

  function quantile$1() {
    var domain = [],
        range = [],
        thresholds = [];

    function rescale() {
      var i = 0, n = Math.max(1, range.length);
      thresholds = new Array(n - 1);
      while (++i < n) thresholds[i - 1] = d3Array.quantile(domain, i / n);
      return scale;
    }

    function scale(x) {
      if (!isNaN(x = +x)) return range[d3Array.bisect(thresholds, x)];
    }

    scale.invertExtent = function(y) {
      var i = range.indexOf(y);
      return i < 0 ? [NaN, NaN] : [
        i > 0 ? thresholds[i - 1] : domain[0],
        i < thresholds.length ? thresholds[i] : domain[domain.length - 1]
      ];
    };

    scale.domain = function(_) {
      if (!arguments.length) return domain.slice();
      domain = [];
      for (var i = 0, n = _.length, d; i < n; ++i) if (d = _[i], d != null && !isNaN(d = +d)) domain.push(d);
      domain.sort(d3Array.ascending);
      return rescale();
    };

    scale.range = function(_) {
      return arguments.length ? (range = slice.call(_), rescale()) : range.slice();
    };

    scale.quantiles = function() {
      return thresholds.slice();
    };

    scale.copy = function() {
      return quantile$1()
          .domain(domain)
          .range(range);
    };

    return scale;
  }

  function quantize() {
    var x0 = 0,
        x1 = 1,
        n = 1,
        domain = [0.5],
        range = [0, 1];

    function scale(x) {
      if (x <= x) return range[d3Array.bisect(domain, x, 0, n)];
    }

    function rescale() {
      var i = -1;
      domain = new Array(n);
      while (++i < n) domain[i] = ((i + 1) * x1 - (i - n) * x0) / (n + 1);
      return scale;
    }

    scale.domain = function(_) {
      return arguments.length ? (x0 = +_[0], x1 = +_[1], rescale()) : [x0, x1];
    };

    scale.range = function(_) {
      return arguments.length ? (n = (range = slice.call(_)).length - 1, rescale()) : range.slice();
    };

    scale.invertExtent = function(y) {
      var i = range.indexOf(y);
      return i < 0 ? [NaN, NaN]
          : i < 1 ? [x0, domain[0]]
          : i >= n ? [domain[n - 1], x1]
          : [domain[i - 1], domain[i]];
    };

    scale.copy = function() {
      return quantize()
          .domain([x0, x1])
          .range(range);
    };

    return linearish(scale);
  }

  function threshold() {
    var domain = [0.5],
        range = [0, 1],
        n = 1;

    function scale(x) {
      if (x <= x) return range[d3Array.bisect(domain, x, 0, n)];
    }

    scale.domain = function(_) {
      return arguments.length ? (domain = slice.call(_), n = Math.min(domain.length, range.length - 1), scale) : domain.slice();
    };

    scale.range = function(_) {
      return arguments.length ? (range = slice.call(_), n = Math.min(domain.length, range.length - 1), scale) : range.slice();
    };

    scale.invertExtent = function(y) {
      var i = range.indexOf(y);
      return [domain[i - 1], domain[i]];
    };

    scale.copy = function() {
      return threshold()
          .domain(domain)
          .range(range);
    };

    return scale;
  }

  var durationSecond = 1000;
  var durationMinute = durationSecond * 60;
  var durationHour = durationMinute * 60;
  var durationDay = durationHour * 24;
  var durationWeek = durationDay * 7;
  var durationMonth = durationDay * 30;
  var durationYear = durationDay * 365;
  function date(t) {
    return new Date(t);
  }

  function number$1(t) {
    return t instanceof Date ? +t : +new Date(+t);
  }

  function calendar(year, month, week, day, hour, minute, second, millisecond, format) {
    var scale = continuous(deinterpolate, d3Interpolate.interpolateNumber),
        invert = scale.invert,
        domain = scale.domain;

    var formatMillisecond = format(".%L"),
        formatSecond = format(":%S"),
        formatMinute = format("%I:%M"),
        formatHour = format("%I %p"),
        formatDay = format("%a %d"),
        formatWeek = format("%b %d"),
        formatMonth = format("%B"),
        formatYear = format("%Y");

    var tickIntervals = [
      [second,  1,      durationSecond],
      [second,  5,  5 * durationSecond],
      [second, 15, 15 * durationSecond],
      [second, 30, 30 * durationSecond],
      [minute,  1,      durationMinute],
      [minute,  5,  5 * durationMinute],
      [minute, 15, 15 * durationMinute],
      [minute, 30, 30 * durationMinute],
      [  hour,  1,      durationHour  ],
      [  hour,  3,  3 * durationHour  ],
      [  hour,  6,  6 * durationHour  ],
      [  hour, 12, 12 * durationHour  ],
      [   day,  1,      durationDay   ],
      [   day,  2,  2 * durationDay   ],
      [  week,  1,      durationWeek  ],
      [ month,  1,      durationMonth ],
      [ month,  3,  3 * durationMonth ],
      [  year,  1,      durationYear  ]
    ];

    function tickFormat(date) {
      return (second(date) < date ? formatMillisecond
          : minute(date) < date ? formatSecond
          : hour(date) < date ? formatMinute
          : day(date) < date ? formatHour
          : month(date) < date ? (week(date) < date ? formatDay : formatWeek)
          : year(date) < date ? formatMonth
          : formatYear)(date);
    }

    function tickInterval(interval, start, stop, step) {
      if (interval == null) interval = 10;

      // If a desired tick count is specified, pick a reasonable tick interval
      // based on the extent of the domain and a rough estimate of tick size.
      // Otherwise, assume interval is already a time interval and use it.
      if (typeof interval === "number") {
        var target = Math.abs(stop - start) / interval,
            i = d3Array.bisector(function(i) { return i[2]; }).right(tickIntervals, target);
        if (i === tickIntervals.length) {
          step = d3Array.tickStep(start / durationYear, stop / durationYear, interval);
          interval = year;
        } else if (i) {
          i = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
          step = i[1];
          interval = i[0];
        } else {
          step = d3Array.tickStep(start, stop, interval);
          interval = millisecond;
        }
      }

      return step == null ? interval : interval.every(step);
    }

    scale.invert = function(y) {
      return new Date(invert(y));
    };

    scale.domain = function(_) {
      return arguments.length ? domain(map$1.call(_, number$1)) : domain().map(date);
    };

    scale.ticks = function(interval, step) {
      var d = domain(),
          t0 = d[0],
          t1 = d[d.length - 1],
          r = t1 < t0,
          t;
      if (r) t = t0, t0 = t1, t1 = t;
      t = tickInterval(interval, t0, t1, step);
      t = t ? t.range(t0, t1 + 1) : []; // inclusive stop
      return r ? t.reverse() : t;
    };

    scale.tickFormat = function(count, specifier) {
      return specifier == null ? tickFormat : format(specifier);
    };

    scale.nice = function(interval, step) {
      var d = domain();
      return (interval = tickInterval(interval, d[0], d[d.length - 1], step))
          ? domain(nice(d, interval))
          : scale;
    };

    scale.copy = function() {
      return copy(scale, calendar(year, month, week, day, hour, minute, second, millisecond, format));
    };

    return scale;
  }

  function time() {
    return calendar(d3Time.timeYear, d3Time.timeMonth, d3Time.timeWeek, d3Time.timeDay, d3Time.timeHour, d3Time.timeMinute, d3Time.timeSecond, d3Time.timeMillisecond, d3TimeFormat.timeFormat).domain([new Date(2000, 0, 1), new Date(2000, 0, 2)]);
  }

  function utcTime() {
    return calendar(d3Time.utcYear, d3Time.utcMonth, d3Time.utcWeek, d3Time.utcDay, d3Time.utcHour, d3Time.utcMinute, d3Time.utcSecond, d3Time.utcMillisecond, d3TimeFormat.utcFormat).domain([Date.UTC(2000, 0, 1), Date.UTC(2000, 0, 2)]);
  }

  function colors(s) {
    return s.match(/.{6}/g).map(function(x) {
      return "#" + x;
    });
  }

  var category10 = colors("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf");

  var category20b = colors("393b795254a36b6ecf9c9ede6379398ca252b5cf6bcedb9c8c6d31bd9e39e7ba52e7cb94843c39ad494ad6616be7969c7b4173a55194ce6dbdde9ed6");

  var category20c = colors("3182bd6baed69ecae1c6dbefe6550dfd8d3cfdae6bfdd0a231a35474c476a1d99bc7e9c0756bb19e9ac8bcbddcdadaeb636363969696bdbdbdd9d9d9");

  var category20 = colors("1f77b4aec7e8ff7f0effbb782ca02c98df8ad62728ff98969467bdc5b0d58c564bc49c94e377c2f7b6d27f7f7fc7c7c7bcbd22dbdb8d17becf9edae5");

  var cubehelix$1 = d3Interpolate.interpolateCubehelixLong(d3Color.cubehelix(300, 0.5, 0.0), d3Color.cubehelix(-240, 0.5, 1.0));

  var warm = d3Interpolate.interpolateCubehelixLong(d3Color.cubehelix(-100, 0.75, 0.35), d3Color.cubehelix(80, 1.50, 0.8));

  var cool = d3Interpolate.interpolateCubehelixLong(d3Color.cubehelix(260, 0.75, 0.35), d3Color.cubehelix(80, 1.50, 0.8));

  var rainbow = d3Color.cubehelix();

  function rainbow$1(t) {
    if (t < 0 || t > 1) t -= Math.floor(t);
    var ts = Math.abs(t - 0.5);
    rainbow.h = 360 * t - 100;
    rainbow.s = 1.5 - 1.5 * ts;
    rainbow.l = 0.8 - 0.9 * ts;
    return rainbow + "";
  }

  function ramp(range) {
    var n = range.length;
    return function(t) {
      return range[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
    };
  }

  var viridis = ramp(colors("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));

  var magma = ramp(colors("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf"));

  var inferno = ramp(colors("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4"));

  var plasma = ramp(colors("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));

  function sequential(interpolator) {
    var x0 = 0,
        x1 = 1,
        clamp = false;

    function scale(x) {
      var t = (x - x0) / (x1 - x0);
      return interpolator(clamp ? Math.max(0, Math.min(1, t)) : t);
    }

    scale.domain = function(_) {
      return arguments.length ? (x0 = +_[0], x1 = +_[1], scale) : [x0, x1];
    };

    scale.clamp = function(_) {
      return arguments.length ? (clamp = !!_, scale) : clamp;
    };

    scale.interpolator = function(_) {
      return arguments.length ? (interpolator = _, scale) : interpolator;
    };

    scale.copy = function() {
      return sequential(interpolator).domain([x0, x1]).clamp(clamp);
    };

    return linearish(scale);
  }

  exports.scaleBand = band;
  exports.scalePoint = point;
  exports.scaleIdentity = identity;
  exports.scaleLinear = linear;
  exports.scaleLog = log;
  exports.scaleOrdinal = ordinal;
  exports.scaleImplicit = implicit;
  exports.scalePow = pow;
  exports.scaleSqrt = sqrt;
  exports.scaleQuantile = quantile$1;
  exports.scaleQuantize = quantize;
  exports.scaleThreshold = threshold;
  exports.scaleTime = time;
  exports.scaleUtc = utcTime;
  exports.schemeCategory10 = category10;
  exports.schemeCategory20b = category20b;
  exports.schemeCategory20c = category20c;
  exports.schemeCategory20 = category20;
  exports.interpolateCubehelixDefault = cubehelix$1;
  exports.interpolateRainbow = rainbow$1;
  exports.interpolateWarm = warm;
  exports.interpolateCool = cool;
  exports.interpolateViridis = viridis;
  exports.interpolateMagma = magma;
  exports.interpolateInferno = inferno;
  exports.interpolatePlasma = plasma;
  exports.scaleSequential = sequential;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
},{"d3-array":14,"d3-collection":15,"d3-color":16,"d3-format":17,"d3-interpolate":18,"d3-time":24,"d3-time-format":23}],22:[function(require,module,exports){
// https://d3js.org/d3-shape/ Version 1.0.3. Copyright 2016 Mike Bostock.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-path')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3-path'], factory) :
  (factory((global.d3 = global.d3 || {}),global.d3));
}(this, (function (exports,d3Path) { 'use strict';

function constant(x) {
  return function constant() {
    return x;
  };
}

var epsilon = 1e-12;
var pi = Math.PI;
var halfPi = pi / 2;
var tau = 2 * pi;

function arcInnerRadius(d) {
  return d.innerRadius;
}

function arcOuterRadius(d) {
  return d.outerRadius;
}

function arcStartAngle(d) {
  return d.startAngle;
}

function arcEndAngle(d) {
  return d.endAngle;
}

function arcPadAngle(d) {
  return d && d.padAngle; // Note: optional!
}

function asin(x) {
  return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x);
}

function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
  var x10 = x1 - x0, y10 = y1 - y0,
      x32 = x3 - x2, y32 = y3 - y2,
      t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / (y32 * x10 - x32 * y10);
  return [x0 + t * x10, y0 + t * y10];
}

// Compute perpendicular offset line of length rc.
// http://mathworld.wolfram.com/Circle-LineIntersection.html
function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
  var x01 = x0 - x1,
      y01 = y0 - y1,
      lo = (cw ? rc : -rc) / Math.sqrt(x01 * x01 + y01 * y01),
      ox = lo * y01,
      oy = -lo * x01,
      x11 = x0 + ox,
      y11 = y0 + oy,
      x10 = x1 + ox,
      y10 = y1 + oy,
      x00 = (x11 + x10) / 2,
      y00 = (y11 + y10) / 2,
      dx = x10 - x11,
      dy = y10 - y11,
      d2 = dx * dx + dy * dy,
      r = r1 - rc,
      D = x11 * y10 - x10 * y11,
      d = (dy < 0 ? -1 : 1) * Math.sqrt(Math.max(0, r * r * d2 - D * D)),
      cx0 = (D * dy - dx * d) / d2,
      cy0 = (-D * dx - dy * d) / d2,
      cx1 = (D * dy + dx * d) / d2,
      cy1 = (-D * dx + dy * d) / d2,
      dx0 = cx0 - x00,
      dy0 = cy0 - y00,
      dx1 = cx1 - x00,
      dy1 = cy1 - y00;

  // Pick the closer of the two intersection points.
  // TODO Is there a faster way to determine which intersection to use?
  if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;

  return {
    cx: cx0,
    cy: cy0,
    x01: -ox,
    y01: -oy,
    x11: cx0 * (r1 / r - 1),
    y11: cy0 * (r1 / r - 1)
  };
}

function arc() {
  var innerRadius = arcInnerRadius,
      outerRadius = arcOuterRadius,
      cornerRadius = constant(0),
      padRadius = null,
      startAngle = arcStartAngle,
      endAngle = arcEndAngle,
      padAngle = arcPadAngle,
      context = null;

  function arc() {
    var buffer,
        r,
        r0 = +innerRadius.apply(this, arguments),
        r1 = +outerRadius.apply(this, arguments),
        a0 = startAngle.apply(this, arguments) - halfPi,
        a1 = endAngle.apply(this, arguments) - halfPi,
        da = Math.abs(a1 - a0),
        cw = a1 > a0;

    if (!context) context = buffer = d3Path.path();

    // Ensure that the outer radius is always larger than the inner radius.
    if (r1 < r0) r = r1, r1 = r0, r0 = r;

    // Is it a point?
    if (!(r1 > epsilon)) context.moveTo(0, 0);

    // Or is it a circle or annulus?
    else if (da > tau - epsilon) {
      context.moveTo(r1 * Math.cos(a0), r1 * Math.sin(a0));
      context.arc(0, 0, r1, a0, a1, !cw);
      if (r0 > epsilon) {
        context.moveTo(r0 * Math.cos(a1), r0 * Math.sin(a1));
        context.arc(0, 0, r0, a1, a0, cw);
      }
    }

    // Or is it a circular or annular sector?
    else {
      var a01 = a0,
          a11 = a1,
          a00 = a0,
          a10 = a1,
          da0 = da,
          da1 = da,
          ap = padAngle.apply(this, arguments) / 2,
          rp = (ap > epsilon) && (padRadius ? +padRadius.apply(this, arguments) : Math.sqrt(r0 * r0 + r1 * r1)),
          rc = Math.min(Math.abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)),
          rc0 = rc,
          rc1 = rc,
          t0,
          t1;

      // Apply padding? Note that since r1 ≥ r0, da1 ≥ da0.
      if (rp > epsilon) {
        var p0 = asin(rp / r0 * Math.sin(ap)),
            p1 = asin(rp / r1 * Math.sin(ap));
        if ((da0 -= p0 * 2) > epsilon) p0 *= (cw ? 1 : -1), a00 += p0, a10 -= p0;
        else da0 = 0, a00 = a10 = (a0 + a1) / 2;
        if ((da1 -= p1 * 2) > epsilon) p1 *= (cw ? 1 : -1), a01 += p1, a11 -= p1;
        else da1 = 0, a01 = a11 = (a0 + a1) / 2;
      }

      var x01 = r1 * Math.cos(a01),
          y01 = r1 * Math.sin(a01),
          x10 = r0 * Math.cos(a10),
          y10 = r0 * Math.sin(a10);

      // Apply rounded corners?
      if (rc > epsilon) {
        var x11 = r1 * Math.cos(a11),
            y11 = r1 * Math.sin(a11),
            x00 = r0 * Math.cos(a00),
            y00 = r0 * Math.sin(a00);

        // Restrict the corner radius according to the sector angle.
        if (da < pi) {
          var oc = da0 > epsilon ? intersect(x01, y01, x00, y00, x11, y11, x10, y10) : [x10, y10],
              ax = x01 - oc[0],
              ay = y01 - oc[1],
              bx = x11 - oc[0],
              by = y11 - oc[1],
              kc = 1 / Math.sin(Math.acos((ax * bx + ay * by) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by))) / 2),
              lc = Math.sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
          rc0 = Math.min(rc, (r0 - lc) / (kc - 1));
          rc1 = Math.min(rc, (r1 - lc) / (kc + 1));
        }
      }

      // Is the sector collapsed to a line?
      if (!(da1 > epsilon)) context.moveTo(x01, y01);

      // Does the sector’s outer ring have rounded corners?
      else if (rc1 > epsilon) {
        t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
        t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);

        context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);

        // Have the corners merged?
        if (rc1 < rc) context.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw);

        // Otherwise, draw the two corners and the ring.
        else {
          context.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw);
          context.arc(0, 0, r1, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
          context.arc(t1.cx, t1.cy, rc1, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw);
        }
      }

      // Or is the outer ring just a circular arc?
      else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);

      // Is there no inner ring, and it’s a circular sector?
      // Or perhaps it’s an annular sector collapsed due to padding?
      if (!(r0 > epsilon) || !(da0 > epsilon)) context.lineTo(x10, y10);

      // Does the sector’s inner ring (or point) have rounded corners?
      else if (rc0 > epsilon) {
        t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
        t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);

        context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);

        // Have the corners merged?
        if (rc0 < rc) context.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw);

        // Otherwise, draw the two corners and the ring.
        else {
          context.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw);
          context.arc(0, 0, r0, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
          context.arc(t1.cx, t1.cy, rc0, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw);
        }
      }

      // Or is the inner ring just a circular arc?
      else context.arc(0, 0, r0, a10, a00, cw);
    }

    context.closePath();

    if (buffer) return context = null, buffer + "" || null;
  }

  arc.centroid = function() {
    var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2,
        a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi / 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };

  arc.innerRadius = function(_) {
    return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant(+_), arc) : innerRadius;
  };

  arc.outerRadius = function(_) {
    return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant(+_), arc) : outerRadius;
  };

  arc.cornerRadius = function(_) {
    return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant(+_), arc) : cornerRadius;
  };

  arc.padRadius = function(_) {
    return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant(+_), arc) : padRadius;
  };

  arc.startAngle = function(_) {
    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant(+_), arc) : startAngle;
  };

  arc.endAngle = function(_) {
    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant(+_), arc) : endAngle;
  };

  arc.padAngle = function(_) {
    return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant(+_), arc) : padAngle;
  };

  arc.context = function(_) {
    return arguments.length ? ((context = _ == null ? null : _), arc) : context;
  };

  return arc;
}

function Linear(context) {
  this._context = context;
}

Linear.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; // proceed
      default: this._context.lineTo(x, y); break;
    }
  }
};

function curveLinear(context) {
  return new Linear(context);
}

function x(p) {
  return p[0];
}

function y(p) {
  return p[1];
}

function line() {
  var x$$ = x,
      y$$ = y,
      defined = constant(true),
      context = null,
      curve = curveLinear,
      output = null;

  function line(data) {
    var i,
        n = data.length,
        d,
        defined0 = false,
        buffer;

    if (context == null) output = curve(buffer = d3Path.path());

    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) output.lineStart();
        else output.lineEnd();
      }
      if (defined0) output.point(+x$$(d, i, data), +y$$(d, i, data));
    }

    if (buffer) return output = null, buffer + "" || null;
  }

  line.x = function(_) {
    return arguments.length ? (x$$ = typeof _ === "function" ? _ : constant(+_), line) : x$$;
  };

  line.y = function(_) {
    return arguments.length ? (y$$ = typeof _ === "function" ? _ : constant(+_), line) : y$$;
  };

  line.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant(!!_), line) : defined;
  };

  line.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
  };

  line.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
  };

  return line;
}

function area() {
  var x0 = x,
      x1 = null,
      y0 = constant(0),
      y1 = y,
      defined = constant(true),
      context = null,
      curve = curveLinear,
      output = null;

  function area(data) {
    var i,
        j,
        k,
        n = data.length,
        d,
        defined0 = false,
        buffer,
        x0z = new Array(n),
        y0z = new Array(n);

    if (context == null) output = curve(buffer = d3Path.path());

    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) {
          j = i;
          output.areaStart();
          output.lineStart();
        } else {
          output.lineEnd();
          output.lineStart();
          for (k = i - 1; k >= j; --k) {
            output.point(x0z[k], y0z[k]);
          }
          output.lineEnd();
          output.areaEnd();
        }
      }
      if (defined0) {
        x0z[i] = +x0(d, i, data), y0z[i] = +y0(d, i, data);
        output.point(x1 ? +x1(d, i, data) : x0z[i], y1 ? +y1(d, i, data) : y0z[i]);
      }
    }

    if (buffer) return output = null, buffer + "" || null;
  }

  function arealine() {
    return line().defined(defined).curve(curve).context(context);
  }

  area.x = function(_) {
    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant(+_), x1 = null, area) : x0;
  };

  area.x0 = function(_) {
    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant(+_), area) : x0;
  };

  area.x1 = function(_) {
    return arguments.length ? (x1 = _ == null ? null : typeof _ === "function" ? _ : constant(+_), area) : x1;
  };

  area.y = function(_) {
    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant(+_), y1 = null, area) : y0;
  };

  area.y0 = function(_) {
    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant(+_), area) : y0;
  };

  area.y1 = function(_) {
    return arguments.length ? (y1 = _ == null ? null : typeof _ === "function" ? _ : constant(+_), area) : y1;
  };

  area.lineX0 =
  area.lineY0 = function() {
    return arealine().x(x0).y(y0);
  };

  area.lineY1 = function() {
    return arealine().x(x0).y(y1);
  };

  area.lineX1 = function() {
    return arealine().x(x1).y(y0);
  };

  area.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant(!!_), area) : defined;
  };

  area.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), area) : curve;
  };

  area.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), area) : context;
  };

  return area;
}

function descending(a, b) {
  return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
}

function identity(d) {
  return d;
}

function pie() {
  var value = identity,
      sortValues = descending,
      sort = null,
      startAngle = constant(0),
      endAngle = constant(tau),
      padAngle = constant(0);

  function pie(data) {
    var i,
        n = data.length,
        j,
        k,
        sum = 0,
        index = new Array(n),
        arcs = new Array(n),
        a0 = +startAngle.apply(this, arguments),
        da = Math.min(tau, Math.max(-tau, endAngle.apply(this, arguments) - a0)),
        a1,
        p = Math.min(Math.abs(da) / n, padAngle.apply(this, arguments)),
        pa = p * (da < 0 ? -1 : 1),
        v;

    for (i = 0; i < n; ++i) {
      if ((v = arcs[index[i] = i] = +value(data[i], i, data)) > 0) {
        sum += v;
      }
    }

    // Optionally sort the arcs by previously-computed values or by data.
    if (sortValues != null) index.sort(function(i, j) { return sortValues(arcs[i], arcs[j]); });
    else if (sort != null) index.sort(function(i, j) { return sort(data[i], data[j]); });

    // Compute the arcs! They are stored in the original data's order.
    for (i = 0, k = sum ? (da - n * pa) / sum : 0; i < n; ++i, a0 = a1) {
      j = index[i], v = arcs[j], a1 = a0 + (v > 0 ? v * k : 0) + pa, arcs[j] = {
        data: data[j],
        index: i,
        value: v,
        startAngle: a0,
        endAngle: a1,
        padAngle: p
      };
    }

    return arcs;
  }

  pie.value = function(_) {
    return arguments.length ? (value = typeof _ === "function" ? _ : constant(+_), pie) : value;
  };

  pie.sortValues = function(_) {
    return arguments.length ? (sortValues = _, sort = null, pie) : sortValues;
  };

  pie.sort = function(_) {
    return arguments.length ? (sort = _, sortValues = null, pie) : sort;
  };

  pie.startAngle = function(_) {
    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant(+_), pie) : startAngle;
  };

  pie.endAngle = function(_) {
    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant(+_), pie) : endAngle;
  };

  pie.padAngle = function(_) {
    return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant(+_), pie) : padAngle;
  };

  return pie;
}

var curveRadialLinear = curveRadial(curveLinear);

function Radial(curve) {
  this._curve = curve;
}

Radial.prototype = {
  areaStart: function() {
    this._curve.areaStart();
  },
  areaEnd: function() {
    this._curve.areaEnd();
  },
  lineStart: function() {
    this._curve.lineStart();
  },
  lineEnd: function() {
    this._curve.lineEnd();
  },
  point: function(a, r) {
    this._curve.point(r * Math.sin(a), r * -Math.cos(a));
  }
};

function curveRadial(curve) {

  function radial(context) {
    return new Radial(curve(context));
  }

  radial._curve = curve;

  return radial;
}

function radialLine(l) {
  var c = l.curve;

  l.angle = l.x, delete l.x;
  l.radius = l.y, delete l.y;

  l.curve = function(_) {
    return arguments.length ? c(curveRadial(_)) : c()._curve;
  };

  return l;
}

function radialLine$1() {
  return radialLine(line().curve(curveRadialLinear));
}

function radialArea() {
  var a = area().curve(curveRadialLinear),
      c = a.curve,
      x0 = a.lineX0,
      x1 = a.lineX1,
      y0 = a.lineY0,
      y1 = a.lineY1;

  a.angle = a.x, delete a.x;
  a.startAngle = a.x0, delete a.x0;
  a.endAngle = a.x1, delete a.x1;
  a.radius = a.y, delete a.y;
  a.innerRadius = a.y0, delete a.y0;
  a.outerRadius = a.y1, delete a.y1;
  a.lineStartAngle = function() { return radialLine(x0()); }, delete a.lineX0;
  a.lineEndAngle = function() { return radialLine(x1()); }, delete a.lineX1;
  a.lineInnerRadius = function() { return radialLine(y0()); }, delete a.lineY0;
  a.lineOuterRadius = function() { return radialLine(y1()); }, delete a.lineY1;

  a.curve = function(_) {
    return arguments.length ? c(curveRadial(_)) : c()._curve;
  };

  return a;
}

var circle = {
  draw: function(context, size) {
    var r = Math.sqrt(size / pi);
    context.moveTo(r, 0);
    context.arc(0, 0, r, 0, tau);
  }
};

var cross = {
  draw: function(context, size) {
    var r = Math.sqrt(size / 5) / 2;
    context.moveTo(-3 * r, -r);
    context.lineTo(-r, -r);
    context.lineTo(-r, -3 * r);
    context.lineTo(r, -3 * r);
    context.lineTo(r, -r);
    context.lineTo(3 * r, -r);
    context.lineTo(3 * r, r);
    context.lineTo(r, r);
    context.lineTo(r, 3 * r);
    context.lineTo(-r, 3 * r);
    context.lineTo(-r, r);
    context.lineTo(-3 * r, r);
    context.closePath();
  }
};

var tan30 = Math.sqrt(1 / 3);
var tan30_2 = tan30 * 2;
var diamond = {
  draw: function(context, size) {
    var y = Math.sqrt(size / tan30_2),
        x = y * tan30;
    context.moveTo(0, -y);
    context.lineTo(x, 0);
    context.lineTo(0, y);
    context.lineTo(-x, 0);
    context.closePath();
  }
};

var ka = 0.89081309152928522810;
var kr = Math.sin(pi / 10) / Math.sin(7 * pi / 10);
var kx = Math.sin(tau / 10) * kr;
var ky = -Math.cos(tau / 10) * kr;
var star = {
  draw: function(context, size) {
    var r = Math.sqrt(size * ka),
        x = kx * r,
        y = ky * r;
    context.moveTo(0, -r);
    context.lineTo(x, y);
    for (var i = 1; i < 5; ++i) {
      var a = tau * i / 5,
          c = Math.cos(a),
          s = Math.sin(a);
      context.lineTo(s * r, -c * r);
      context.lineTo(c * x - s * y, s * x + c * y);
    }
    context.closePath();
  }
};

var square = {
  draw: function(context, size) {
    var w = Math.sqrt(size),
        x = -w / 2;
    context.rect(x, x, w, w);
  }
};

var sqrt3 = Math.sqrt(3);

var triangle = {
  draw: function(context, size) {
    var y = -Math.sqrt(size / (sqrt3 * 3));
    context.moveTo(0, y * 2);
    context.lineTo(-sqrt3 * y, -y);
    context.lineTo(sqrt3 * y, -y);
    context.closePath();
  }
};

var c = -0.5;
var s = Math.sqrt(3) / 2;
var k = 1 / Math.sqrt(12);
var a = (k / 2 + 1) * 3;
var wye = {
  draw: function(context, size) {
    var r = Math.sqrt(size / a),
        x0 = r / 2,
        y0 = r * k,
        x1 = x0,
        y1 = r * k + r,
        x2 = -x1,
        y2 = y1;
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(c * x0 - s * y0, s * x0 + c * y0);
    context.lineTo(c * x1 - s * y1, s * x1 + c * y1);
    context.lineTo(c * x2 - s * y2, s * x2 + c * y2);
    context.lineTo(c * x0 + s * y0, c * y0 - s * x0);
    context.lineTo(c * x1 + s * y1, c * y1 - s * x1);
    context.lineTo(c * x2 + s * y2, c * y2 - s * x2);
    context.closePath();
  }
};

var symbols = [
  circle,
  cross,
  diamond,
  square,
  star,
  triangle,
  wye
];

function symbol() {
  var type = constant(circle),
      size = constant(64),
      context = null;

  function symbol() {
    var buffer;
    if (!context) context = buffer = d3Path.path();
    type.apply(this, arguments).draw(context, +size.apply(this, arguments));
    if (buffer) return context = null, buffer + "" || null;
  }

  symbol.type = function(_) {
    return arguments.length ? (type = typeof _ === "function" ? _ : constant(_), symbol) : type;
  };

  symbol.size = function(_) {
    return arguments.length ? (size = typeof _ === "function" ? _ : constant(+_), symbol) : size;
  };

  symbol.context = function(_) {
    return arguments.length ? (context = _ == null ? null : _, symbol) : context;
  };

  return symbol;
}

function noop() {}

function point(that, x, y) {
  that._context.bezierCurveTo(
    (2 * that._x0 + that._x1) / 3,
    (2 * that._y0 + that._y1) / 3,
    (that._x0 + 2 * that._x1) / 3,
    (that._y0 + 2 * that._y1) / 3,
    (that._x0 + 4 * that._x1 + x) / 6,
    (that._y0 + 4 * that._y1 + y) / 6
  );
}

function Basis(context) {
  this._context = context;
}

Basis.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 =
    this._y0 = this._y1 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 3: point(this, this._x1, this._y1); // proceed
      case 2: this._context.lineTo(this._x1, this._y1); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6); // proceed
      default: point(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
  }
};

function basis(context) {
  return new Basis(context);
}

function BasisClosed(context) {
  this._context = context;
}

BasisClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 =
    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x2, this._y2);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.moveTo((this._x2 + 2 * this._x3) / 3, (this._y2 + 2 * this._y3) / 3);
        this._context.lineTo((this._x3 + 2 * this._x2) / 3, (this._y3 + 2 * this._y2) / 3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x2, this._y2);
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        break;
      }
    }
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._x2 = x, this._y2 = y; break;
      case 1: this._point = 2; this._x3 = x, this._y3 = y; break;
      case 2: this._point = 3; this._x4 = x, this._y4 = y; this._context.moveTo((this._x0 + 4 * this._x1 + x) / 6, (this._y0 + 4 * this._y1 + y) / 6); break;
      default: point(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
  }
};

function basisClosed(context) {
  return new BasisClosed(context);
}

function BasisOpen(context) {
  this._context = context;
}

BasisOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 =
    this._y0 = this._y1 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; var x0 = (this._x0 + 4 * this._x1 + x) / 6, y0 = (this._y0 + 4 * this._y1 + y) / 6; this._line ? this._context.lineTo(x0, y0) : this._context.moveTo(x0, y0); break;
      case 3: this._point = 4; // proceed
      default: point(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
  }
};

function basisOpen(context) {
  return new BasisOpen(context);
}

function Bundle(context, beta) {
  this._basis = new Basis(context);
  this._beta = beta;
}

Bundle.prototype = {
  lineStart: function() {
    this._x = [];
    this._y = [];
    this._basis.lineStart();
  },
  lineEnd: function() {
    var x = this._x,
        y = this._y,
        j = x.length - 1;

    if (j > 0) {
      var x0 = x[0],
          y0 = y[0],
          dx = x[j] - x0,
          dy = y[j] - y0,
          i = -1,
          t;

      while (++i <= j) {
        t = i / j;
        this._basis.point(
          this._beta * x[i] + (1 - this._beta) * (x0 + t * dx),
          this._beta * y[i] + (1 - this._beta) * (y0 + t * dy)
        );
      }
    }

    this._x = this._y = null;
    this._basis.lineEnd();
  },
  point: function(x, y) {
    this._x.push(+x);
    this._y.push(+y);
  }
};

var bundle = (function custom(beta) {

  function bundle(context) {
    return beta === 1 ? new Basis(context) : new Bundle(context, beta);
  }

  bundle.beta = function(beta) {
    return custom(+beta);
  };

  return bundle;
})(0.85);

function point$1(that, x, y) {
  that._context.bezierCurveTo(
    that._x1 + that._k * (that._x2 - that._x0),
    that._y1 + that._k * (that._y2 - that._y0),
    that._x2 + that._k * (that._x1 - x),
    that._y2 + that._k * (that._y1 - y),
    that._x2,
    that._y2
  );
}

function Cardinal(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}

Cardinal.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 =
    this._y0 = this._y1 = this._y2 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2: this._context.lineTo(this._x2, this._y2); break;
      case 3: point$1(this, this._x1, this._y1); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; this._x1 = x, this._y1 = y; break;
      case 2: this._point = 3; // proceed
      default: point$1(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

var cardinal = (function custom(tension) {

  function cardinal(context) {
    return new Cardinal(context, tension);
  }

  cardinal.tension = function(tension) {
    return custom(+tension);
  };

  return cardinal;
})(0);

function CardinalClosed(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}

CardinalClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.lineTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        this.point(this._x5, this._y5);
        break;
      }
    }
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
      case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
      case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
      default: point$1(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

var cardinalClosed = (function custom(tension) {

  function cardinal(context) {
    return new CardinalClosed(context, tension);
  }

  cardinal.tension = function(tension) {
    return custom(+tension);
  };

  return cardinal;
})(0);

function CardinalOpen(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}

CardinalOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 =
    this._y0 = this._y1 = this._y2 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
      case 3: this._point = 4; // proceed
      default: point$1(this, x, y); break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

var cardinalOpen = (function custom(tension) {

  function cardinal(context) {
    return new CardinalOpen(context, tension);
  }

  cardinal.tension = function(tension) {
    return custom(+tension);
  };

  return cardinal;
})(0);

function point$2(that, x, y) {
  var x1 = that._x1,
      y1 = that._y1,
      x2 = that._x2,
      y2 = that._y2;

  if (that._l01_a > epsilon) {
    var a = 2 * that._l01_2a + 3 * that._l01_a * that._l12_a + that._l12_2a,
        n = 3 * that._l01_a * (that._l01_a + that._l12_a);
    x1 = (x1 * a - that._x0 * that._l12_2a + that._x2 * that._l01_2a) / n;
    y1 = (y1 * a - that._y0 * that._l12_2a + that._y2 * that._l01_2a) / n;
  }

  if (that._l23_a > epsilon) {
    var b = 2 * that._l23_2a + 3 * that._l23_a * that._l12_a + that._l12_2a,
        m = 3 * that._l23_a * (that._l23_a + that._l12_a);
    x2 = (x2 * b + that._x1 * that._l23_2a - x * that._l12_2a) / m;
    y2 = (y2 * b + that._y1 * that._l23_2a - y * that._l12_2a) / m;
  }

  that._context.bezierCurveTo(x1, y1, x2, y2, that._x2, that._y2);
}

function CatmullRom(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}

CatmullRom.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 =
    this._y0 = this._y1 = this._y2 = NaN;
    this._l01_a = this._l12_a = this._l23_a =
    this._l01_2a = this._l12_2a = this._l23_2a =
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2: this._context.lineTo(this._x2, this._y2); break;
      case 3: this.point(this._x2, this._y2); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;

    if (this._point) {
      var x23 = this._x2 - x,
          y23 = this._y2 - y;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }

    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; // proceed
      default: point$2(this, x, y); break;
    }

    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

var catmullRom = (function custom(alpha) {

  function catmullRom(context) {
    return alpha ? new CatmullRom(context, alpha) : new Cardinal(context, 0);
  }

  catmullRom.alpha = function(alpha) {
    return custom(+alpha);
  };

  return catmullRom;
})(0.5);

function CatmullRomClosed(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}

CatmullRomClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
    this._l01_a = this._l12_a = this._l23_a =
    this._l01_2a = this._l12_2a = this._l23_2a =
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.lineTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        this.point(this._x5, this._y5);
        break;
      }
    }
  },
  point: function(x, y) {
    x = +x, y = +y;

    if (this._point) {
      var x23 = this._x2 - x,
          y23 = this._y2 - y;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }

    switch (this._point) {
      case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
      case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
      case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
      default: point$2(this, x, y); break;
    }

    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

var catmullRomClosed = (function custom(alpha) {

  function catmullRom(context) {
    return alpha ? new CatmullRomClosed(context, alpha) : new CardinalClosed(context, 0);
  }

  catmullRom.alpha = function(alpha) {
    return custom(+alpha);
  };

  return catmullRom;
})(0.5);

function CatmullRomOpen(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}

CatmullRomOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 =
    this._y0 = this._y1 = this._y2 = NaN;
    this._l01_a = this._l12_a = this._l23_a =
    this._l01_2a = this._l12_2a = this._l23_2a =
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;

    if (this._point) {
      var x23 = this._x2 - x,
          y23 = this._y2 - y;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }

    switch (this._point) {
      case 0: this._point = 1; break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
      case 3: this._point = 4; // proceed
      default: point$2(this, x, y); break;
    }

    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};

var catmullRomOpen = (function custom(alpha) {

  function catmullRom(context) {
    return alpha ? new CatmullRomOpen(context, alpha) : new CardinalOpen(context, 0);
  }

  catmullRom.alpha = function(alpha) {
    return custom(+alpha);
  };

  return catmullRom;
})(0.5);

function LinearClosed(context) {
  this._context = context;
}

LinearClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._point) this._context.closePath();
  },
  point: function(x, y) {
    x = +x, y = +y;
    if (this._point) this._context.lineTo(x, y);
    else this._point = 1, this._context.moveTo(x, y);
  }
};

function linearClosed(context) {
  return new LinearClosed(context);
}

function sign(x) {
  return x < 0 ? -1 : 1;
}

// Calculate the slopes of the tangents (Hermite-type interpolation) based on
// the following paper: Steffen, M. 1990. A Simple Method for Monotonic
// Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
// NOV(II), P. 443, 1990.
function slope3(that, x2, y2) {
  var h0 = that._x1 - that._x0,
      h1 = x2 - that._x1,
      s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
      s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
      p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}

// Calculate a one-sided slope.
function slope2(that, t) {
  var h = that._x1 - that._x0;
  return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
}

// According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
// "you can express cubic Hermite interpolation in terms of cubic Bézier curves
// with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
function point$3(that, t0, t1) {
  var x0 = that._x0,
      y0 = that._y0,
      x1 = that._x1,
      y1 = that._y1,
      dx = (x1 - x0) / 3;
  that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
}

function MonotoneX(context) {
  this._context = context;
}

MonotoneX.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 =
    this._y0 = this._y1 =
    this._t0 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2: this._context.lineTo(this._x1, this._y1); break;
      case 3: point$3(this, this._t0, slope2(this, this._t0)); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    var t1 = NaN;

    x = +x, y = +y;
    if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; point$3(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
      default: point$3(this, this._t0, t1 = slope3(this, x, y)); break;
    }

    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
    this._t0 = t1;
  }
}

function MonotoneY(context) {
  this._context = new ReflectContext(context);
}

(MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x, y) {
  MonotoneX.prototype.point.call(this, y, x);
};

function ReflectContext(context) {
  this._context = context;
}

ReflectContext.prototype = {
  moveTo: function(x, y) { this._context.moveTo(y, x); },
  closePath: function() { this._context.closePath(); },
  lineTo: function(x, y) { this._context.lineTo(y, x); },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) { this._context.bezierCurveTo(y1, x1, y2, x2, y, x); }
};

function monotoneX(context) {
  return new MonotoneX(context);
}

function monotoneY(context) {
  return new MonotoneY(context);
}

function Natural(context) {
  this._context = context;
}

Natural.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x = [];
    this._y = [];
  },
  lineEnd: function() {
    var x = this._x,
        y = this._y,
        n = x.length;

    if (n) {
      this._line ? this._context.lineTo(x[0], y[0]) : this._context.moveTo(x[0], y[0]);
      if (n === 2) {
        this._context.lineTo(x[1], y[1]);
      } else {
        var px = controlPoints(x),
            py = controlPoints(y);
        for (var i0 = 0, i1 = 1; i1 < n; ++i0, ++i1) {
          this._context.bezierCurveTo(px[0][i0], py[0][i0], px[1][i0], py[1][i0], x[i1], y[i1]);
        }
      }
    }

    if (this._line || (this._line !== 0 && n === 1)) this._context.closePath();
    this._line = 1 - this._line;
    this._x = this._y = null;
  },
  point: function(x, y) {
    this._x.push(+x);
    this._y.push(+y);
  }
};

// See https://www.particleincell.com/2012/bezier-splines/ for derivation.
function controlPoints(x) {
  var i,
      n = x.length - 1,
      m,
      a = new Array(n),
      b = new Array(n),
      r = new Array(n);
  a[0] = 0, b[0] = 2, r[0] = x[0] + 2 * x[1];
  for (i = 1; i < n - 1; ++i) a[i] = 1, b[i] = 4, r[i] = 4 * x[i] + 2 * x[i + 1];
  a[n - 1] = 2, b[n - 1] = 7, r[n - 1] = 8 * x[n - 1] + x[n];
  for (i = 1; i < n; ++i) m = a[i] / b[i - 1], b[i] -= m, r[i] -= m * r[i - 1];
  a[n - 1] = r[n - 1] / b[n - 1];
  for (i = n - 2; i >= 0; --i) a[i] = (r[i] - a[i + 1]) / b[i];
  b[n - 1] = (x[n] + a[n - 1]) / 2;
  for (i = 0; i < n - 1; ++i) b[i] = 2 * x[i + 1] - a[i + 1];
  return [a, b];
}

function natural(context) {
  return new Natural(context);
}

function Step(context, t) {
  this._context = context;
  this._t = t;
}

Step.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x = this._y = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (0 < this._t && this._t < 1 && this._point === 2) this._context.lineTo(this._x, this._y);
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    if (this._line >= 0) this._t = 1 - this._t, this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; // proceed
      default: {
        if (this._t <= 0) {
          this._context.lineTo(this._x, y);
          this._context.lineTo(x, y);
        } else {
          var x1 = this._x * (1 - this._t) + x * this._t;
          this._context.lineTo(x1, this._y);
          this._context.lineTo(x1, y);
        }
        break;
      }
    }
    this._x = x, this._y = y;
  }
};

function step(context) {
  return new Step(context, 0.5);
}

function stepBefore(context) {
  return new Step(context, 0);
}

function stepAfter(context) {
  return new Step(context, 1);
}

var slice = Array.prototype.slice;

function none(series, order) {
  if (!((n = series.length) > 1)) return;
  for (var i = 1, s0, s1 = series[order[0]], n, m = s1.length; i < n; ++i) {
    s0 = s1, s1 = series[order[i]];
    for (var j = 0; j < m; ++j) {
      s1[j][1] += s1[j][0] = isNaN(s0[j][1]) ? s0[j][0] : s0[j][1];
    }
  }
}

function none$1(series) {
  var n = series.length, o = new Array(n);
  while (--n >= 0) o[n] = n;
  return o;
}

function stackValue(d, key) {
  return d[key];
}

function stack() {
  var keys = constant([]),
      order = none$1,
      offset = none,
      value = stackValue;

  function stack(data) {
    var kz = keys.apply(this, arguments),
        i,
        m = data.length,
        n = kz.length,
        sz = new Array(n),
        oz;

    for (i = 0; i < n; ++i) {
      for (var ki = kz[i], si = sz[i] = new Array(m), j = 0, sij; j < m; ++j) {
        si[j] = sij = [0, +value(data[j], ki, j, data)];
        sij.data = data[j];
      }
      si.key = ki;
    }

    for (i = 0, oz = order(sz); i < n; ++i) {
      sz[oz[i]].index = i;
    }

    offset(sz, oz);
    return sz;
  }

  stack.keys = function(_) {
    return arguments.length ? (keys = typeof _ === "function" ? _ : constant(slice.call(_)), stack) : keys;
  };

  stack.value = function(_) {
    return arguments.length ? (value = typeof _ === "function" ? _ : constant(+_), stack) : value;
  };

  stack.order = function(_) {
    return arguments.length ? (order = _ == null ? none$1 : typeof _ === "function" ? _ : constant(slice.call(_)), stack) : order;
  };

  stack.offset = function(_) {
    return arguments.length ? (offset = _ == null ? none : _, stack) : offset;
  };

  return stack;
}

function expand(series, order) {
  if (!((n = series.length) > 0)) return;
  for (var i, n, j = 0, m = series[0].length, y; j < m; ++j) {
    for (y = i = 0; i < n; ++i) y += series[i][j][1] || 0;
    if (y) for (i = 0; i < n; ++i) series[i][j][1] /= y;
  }
  none(series, order);
}

function silhouette(series, order) {
  if (!((n = series.length) > 0)) return;
  for (var j = 0, s0 = series[order[0]], n, m = s0.length; j < m; ++j) {
    for (var i = 0, y = 0; i < n; ++i) y += series[i][j][1] || 0;
    s0[j][1] += s0[j][0] = -y / 2;
  }
  none(series, order);
}

function wiggle(series, order) {
  if (!((n = series.length) > 0) || !((m = (s0 = series[order[0]]).length) > 0)) return;
  for (var y = 0, j = 1, s0, m, n; j < m; ++j) {
    for (var i = 0, s1 = 0, s2 = 0; i < n; ++i) {
      var si = series[order[i]],
          sij0 = si[j][1] || 0,
          sij1 = si[j - 1][1] || 0,
          s3 = (sij0 - sij1) / 2;
      for (var k = 0; k < i; ++k) {
        var sk = series[order[k]],
            skj0 = sk[j][1] || 0,
            skj1 = sk[j - 1][1] || 0;
        s3 += skj0 - skj1;
      }
      s1 += sij0, s2 += s3 * sij0;
    }
    s0[j - 1][1] += s0[j - 1][0] = y;
    if (s1) y -= s2 / s1;
  }
  s0[j - 1][1] += s0[j - 1][0] = y;
  none(series, order);
}

function ascending(series) {
  var sums = series.map(sum);
  return none$1(series).sort(function(a, b) { return sums[a] - sums[b]; });
}

function sum(series) {
  var s = 0, i = -1, n = series.length, v;
  while (++i < n) if (v = +series[i][1]) s += v;
  return s;
}

function descending$1(series) {
  return ascending(series).reverse();
}

function insideOut(series) {
  var n = series.length,
      i,
      j,
      sums = series.map(sum),
      order = none$1(series).sort(function(a, b) { return sums[b] - sums[a]; }),
      top = 0,
      bottom = 0,
      tops = [],
      bottoms = [];

  for (i = 0; i < n; ++i) {
    j = order[i];
    if (top < bottom) {
      top += sums[j];
      tops.push(j);
    } else {
      bottom += sums[j];
      bottoms.push(j);
    }
  }

  return bottoms.reverse().concat(tops);
}

function reverse(series) {
  return none$1(series).reverse();
}

exports.arc = arc;
exports.area = area;
exports.line = line;
exports.pie = pie;
exports.radialArea = radialArea;
exports.radialLine = radialLine$1;
exports.symbol = symbol;
exports.symbols = symbols;
exports.symbolCircle = circle;
exports.symbolCross = cross;
exports.symbolDiamond = diamond;
exports.symbolSquare = square;
exports.symbolStar = star;
exports.symbolTriangle = triangle;
exports.symbolWye = wye;
exports.curveBasisClosed = basisClosed;
exports.curveBasisOpen = basisOpen;
exports.curveBasis = basis;
exports.curveBundle = bundle;
exports.curveCardinalClosed = cardinalClosed;
exports.curveCardinalOpen = cardinalOpen;
exports.curveCardinal = cardinal;
exports.curveCatmullRomClosed = catmullRomClosed;
exports.curveCatmullRomOpen = catmullRomOpen;
exports.curveCatmullRom = catmullRom;
exports.curveLinearClosed = linearClosed;
exports.curveLinear = curveLinear;
exports.curveMonotoneX = monotoneX;
exports.curveMonotoneY = monotoneY;
exports.curveNatural = natural;
exports.curveStep = step;
exports.curveStepAfter = stepAfter;
exports.curveStepBefore = stepBefore;
exports.stack = stack;
exports.stackOffsetExpand = expand;
exports.stackOffsetNone = none;
exports.stackOffsetSilhouette = silhouette;
exports.stackOffsetWiggle = wiggle;
exports.stackOrderAscending = ascending;
exports.stackOrderDescending = descending$1;
exports.stackOrderInsideOut = insideOut;
exports.stackOrderNone = none$1;
exports.stackOrderReverse = reverse;

Object.defineProperty(exports, '__esModule', { value: true });

})));
},{"d3-path":19}],23:[function(require,module,exports){
// https://d3js.org/d3-time-format/ Version 2.0.5. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-time')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-time'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3));
}(this, (function (exports,d3Time) { 'use strict';

function localDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
    date.setFullYear(d.y);
    return date;
  }
  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
}

function utcDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
    date.setUTCFullYear(d.y);
    return date;
  }
  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
}

function newYear(y) {
  return {y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0};
}

function formatLocale(locale) {
  var locale_dateTime = locale.dateTime,
      locale_date = locale.date,
      locale_time = locale.time,
      locale_periods = locale.periods,
      locale_weekdays = locale.days,
      locale_shortWeekdays = locale.shortDays,
      locale_months = locale.months,
      locale_shortMonths = locale.shortMonths;

  var periodRe = formatRe(locale_periods),
      periodLookup = formatLookup(locale_periods),
      weekdayRe = formatRe(locale_weekdays),
      weekdayLookup = formatLookup(locale_weekdays),
      shortWeekdayRe = formatRe(locale_shortWeekdays),
      shortWeekdayLookup = formatLookup(locale_shortWeekdays),
      monthRe = formatRe(locale_months),
      monthLookup = formatLookup(locale_months),
      shortMonthRe = formatRe(locale_shortMonths),
      shortMonthLookup = formatLookup(locale_shortMonths);

  var formats = {
    "a": formatShortWeekday,
    "A": formatWeekday,
    "b": formatShortMonth,
    "B": formatMonth,
    "c": null,
    "d": formatDayOfMonth,
    "e": formatDayOfMonth,
    "H": formatHour24,
    "I": formatHour12,
    "j": formatDayOfYear,
    "L": formatMilliseconds,
    "m": formatMonthNumber,
    "M": formatMinutes,
    "p": formatPeriod,
    "S": formatSeconds,
    "U": formatWeekNumberSunday,
    "w": formatWeekdayNumber,
    "W": formatWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatYear,
    "Y": formatFullYear,
    "Z": formatZone,
    "%": formatLiteralPercent
  };

  var utcFormats = {
    "a": formatUTCShortWeekday,
    "A": formatUTCWeekday,
    "b": formatUTCShortMonth,
    "B": formatUTCMonth,
    "c": null,
    "d": formatUTCDayOfMonth,
    "e": formatUTCDayOfMonth,
    "H": formatUTCHour24,
    "I": formatUTCHour12,
    "j": formatUTCDayOfYear,
    "L": formatUTCMilliseconds,
    "m": formatUTCMonthNumber,
    "M": formatUTCMinutes,
    "p": formatUTCPeriod,
    "S": formatUTCSeconds,
    "U": formatUTCWeekNumberSunday,
    "w": formatUTCWeekdayNumber,
    "W": formatUTCWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatUTCYear,
    "Y": formatUTCFullYear,
    "Z": formatUTCZone,
    "%": formatLiteralPercent
  };

  var parses = {
    "a": parseShortWeekday,
    "A": parseWeekday,
    "b": parseShortMonth,
    "B": parseMonth,
    "c": parseLocaleDateTime,
    "d": parseDayOfMonth,
    "e": parseDayOfMonth,
    "H": parseHour24,
    "I": parseHour24,
    "j": parseDayOfYear,
    "L": parseMilliseconds,
    "m": parseMonthNumber,
    "M": parseMinutes,
    "p": parsePeriod,
    "S": parseSeconds,
    "U": parseWeekNumberSunday,
    "w": parseWeekdayNumber,
    "W": parseWeekNumberMonday,
    "x": parseLocaleDate,
    "X": parseLocaleTime,
    "y": parseYear,
    "Y": parseFullYear,
    "Z": parseZone,
    "%": parseLiteralPercent
  };

  // These recursive directive definitions must be deferred.
  formats.x = newFormat(locale_date, formats);
  formats.X = newFormat(locale_time, formats);
  formats.c = newFormat(locale_dateTime, formats);
  utcFormats.x = newFormat(locale_date, utcFormats);
  utcFormats.X = newFormat(locale_time, utcFormats);
  utcFormats.c = newFormat(locale_dateTime, utcFormats);

  function newFormat(specifier, formats) {
    return function(date) {
      var string = [],
          i = -1,
          j = 0,
          n = specifier.length,
          c,
          pad,
          format;

      if (!(date instanceof Date)) date = new Date(+date);

      while (++i < n) {
        if (specifier.charCodeAt(i) === 37) {
          string.push(specifier.slice(j, i));
          if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
          else pad = c === "e" ? " " : "0";
          if (format = formats[c]) c = format(date, pad);
          string.push(c);
          j = i + 1;
        }
      }

      string.push(specifier.slice(j, i));
      return string.join("");
    };
  }

  function newParse(specifier, newDate) {
    return function(string) {
      var d = newYear(1900),
          i = parseSpecifier(d, specifier, string += "", 0);
      if (i != string.length) return null;

      // The am-pm flag is 0 for AM, and 1 for PM.
      if ("p" in d) d.H = d.H % 12 + d.p * 12;

      // Convert day-of-week and week-of-year to day-of-year.
      if ("W" in d || "U" in d) {
        if (!("w" in d)) d.w = "W" in d ? 1 : 0;
        var day = "Z" in d ? utcDate(newYear(d.y)).getUTCDay() : newDate(newYear(d.y)).getDay();
        d.m = 0;
        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day + 5) % 7 : d.w + d.U * 7 - (day + 6) % 7;
      }

      // If a time zone is specified, all fields are interpreted as UTC and then
      // offset according to the specified time zone.
      if ("Z" in d) {
        d.H += d.Z / 100 | 0;
        d.M += d.Z % 100;
        return utcDate(d);
      }

      // Otherwise, all fields are in local time.
      return newDate(d);
    };
  }

  function parseSpecifier(d, specifier, string, j) {
    var i = 0,
        n = specifier.length,
        m = string.length,
        c,
        parse;

    while (i < n) {
      if (j >= m) return -1;
      c = specifier.charCodeAt(i++);
      if (c === 37) {
        c = specifier.charAt(i++);
        parse = parses[c in pads ? specifier.charAt(i++) : c];
        if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
      } else if (c != string.charCodeAt(j++)) {
        return -1;
      }
    }

    return j;
  }

  function parsePeriod(d, string, i) {
    var n = periodRe.exec(string.slice(i));
    return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseShortWeekday(d, string, i) {
    var n = shortWeekdayRe.exec(string.slice(i));
    return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseWeekday(d, string, i) {
    var n = weekdayRe.exec(string.slice(i));
    return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseShortMonth(d, string, i) {
    var n = shortMonthRe.exec(string.slice(i));
    return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseMonth(d, string, i) {
    var n = monthRe.exec(string.slice(i));
    return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseLocaleDateTime(d, string, i) {
    return parseSpecifier(d, locale_dateTime, string, i);
  }

  function parseLocaleDate(d, string, i) {
    return parseSpecifier(d, locale_date, string, i);
  }

  function parseLocaleTime(d, string, i) {
    return parseSpecifier(d, locale_time, string, i);
  }

  function formatShortWeekday(d) {
    return locale_shortWeekdays[d.getDay()];
  }

  function formatWeekday(d) {
    return locale_weekdays[d.getDay()];
  }

  function formatShortMonth(d) {
    return locale_shortMonths[d.getMonth()];
  }

  function formatMonth(d) {
    return locale_months[d.getMonth()];
  }

  function formatPeriod(d) {
    return locale_periods[+(d.getHours() >= 12)];
  }

  function formatUTCShortWeekday(d) {
    return locale_shortWeekdays[d.getUTCDay()];
  }

  function formatUTCWeekday(d) {
    return locale_weekdays[d.getUTCDay()];
  }

  function formatUTCShortMonth(d) {
    return locale_shortMonths[d.getUTCMonth()];
  }

  function formatUTCMonth(d) {
    return locale_months[d.getUTCMonth()];
  }

  function formatUTCPeriod(d) {
    return locale_periods[+(d.getUTCHours() >= 12)];
  }

  return {
    format: function(specifier) {
      var f = newFormat(specifier += "", formats);
      f.toString = function() { return specifier; };
      return f;
    },
    parse: function(specifier) {
      var p = newParse(specifier += "", localDate);
      p.toString = function() { return specifier; };
      return p;
    },
    utcFormat: function(specifier) {
      var f = newFormat(specifier += "", utcFormats);
      f.toString = function() { return specifier; };
      return f;
    },
    utcParse: function(specifier) {
      var p = newParse(specifier, utcDate);
      p.toString = function() { return specifier; };
      return p;
    }
  };
}

var pads = {"-": "", "_": " ", "0": "0"};
var numberRe = /^\s*\d+/;
var percentRe = /^%/;
var requoteRe = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;

function pad(value, fill, width) {
  var sign = value < 0 ? "-" : "",
      string = (sign ? -value : value) + "",
      length = string.length;
  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
}

function requote(s) {
  return s.replace(requoteRe, "\\$&");
}

function formatRe(names) {
  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
}

function formatLookup(names) {
  var map = {}, i = -1, n = names.length;
  while (++i < n) map[names[i].toLowerCase()] = i;
  return map;
}

function parseWeekdayNumber(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.w = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.U = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.W = +n[0], i + n[0].length) : -1;
}

function parseFullYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 4));
  return n ? (d.y = +n[0], i + n[0].length) : -1;
}

function parseYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
}

function parseZone(d, string, i) {
  var n = /^(Z)|([+-]\d\d)(?:\:?(\d\d))?/.exec(string.slice(i, i + 6));
  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
}

function parseMonthNumber(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
}

function parseDayOfMonth(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.d = +n[0], i + n[0].length) : -1;
}

function parseDayOfYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
}

function parseHour24(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.H = +n[0], i + n[0].length) : -1;
}

function parseMinutes(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.M = +n[0], i + n[0].length) : -1;
}

function parseSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.S = +n[0], i + n[0].length) : -1;
}

function parseMilliseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.L = +n[0], i + n[0].length) : -1;
}

function parseLiteralPercent(d, string, i) {
  var n = percentRe.exec(string.slice(i, i + 1));
  return n ? i + n[0].length : -1;
}

function formatDayOfMonth(d, p) {
  return pad(d.getDate(), p, 2);
}

function formatHour24(d, p) {
  return pad(d.getHours(), p, 2);
}

function formatHour12(d, p) {
  return pad(d.getHours() % 12 || 12, p, 2);
}

function formatDayOfYear(d, p) {
  return pad(1 + d3Time.timeDay.count(d3Time.timeYear(d), d), p, 3);
}

function formatMilliseconds(d, p) {
  return pad(d.getMilliseconds(), p, 3);
}

function formatMonthNumber(d, p) {
  return pad(d.getMonth() + 1, p, 2);
}

function formatMinutes(d, p) {
  return pad(d.getMinutes(), p, 2);
}

function formatSeconds(d, p) {
  return pad(d.getSeconds(), p, 2);
}

function formatWeekNumberSunday(d, p) {
  return pad(d3Time.timeSunday.count(d3Time.timeYear(d), d), p, 2);
}

function formatWeekdayNumber(d) {
  return d.getDay();
}

function formatWeekNumberMonday(d, p) {
  return pad(d3Time.timeMonday.count(d3Time.timeYear(d), d), p, 2);
}

function formatYear(d, p) {
  return pad(d.getFullYear() % 100, p, 2);
}

function formatFullYear(d, p) {
  return pad(d.getFullYear() % 10000, p, 4);
}

function formatZone(d) {
  var z = d.getTimezoneOffset();
  return (z > 0 ? "-" : (z *= -1, "+"))
      + pad(z / 60 | 0, "0", 2)
      + pad(z % 60, "0", 2);
}

function formatUTCDayOfMonth(d, p) {
  return pad(d.getUTCDate(), p, 2);
}

function formatUTCHour24(d, p) {
  return pad(d.getUTCHours(), p, 2);
}

function formatUTCHour12(d, p) {
  return pad(d.getUTCHours() % 12 || 12, p, 2);
}

function formatUTCDayOfYear(d, p) {
  return pad(1 + d3Time.utcDay.count(d3Time.utcYear(d), d), p, 3);
}

function formatUTCMilliseconds(d, p) {
  return pad(d.getUTCMilliseconds(), p, 3);
}

function formatUTCMonthNumber(d, p) {
  return pad(d.getUTCMonth() + 1, p, 2);
}

function formatUTCMinutes(d, p) {
  return pad(d.getUTCMinutes(), p, 2);
}

function formatUTCSeconds(d, p) {
  return pad(d.getUTCSeconds(), p, 2);
}

function formatUTCWeekNumberSunday(d, p) {
  return pad(d3Time.utcSunday.count(d3Time.utcYear(d), d), p, 2);
}

function formatUTCWeekdayNumber(d) {
  return d.getUTCDay();
}

function formatUTCWeekNumberMonday(d, p) {
  return pad(d3Time.utcMonday.count(d3Time.utcYear(d), d), p, 2);
}

function formatUTCYear(d, p) {
  return pad(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCFullYear(d, p) {
  return pad(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCZone() {
  return "+0000";
}

function formatLiteralPercent() {
  return "%";
}

var locale$1;





defaultLocale({
  dateTime: "%x, %X",
  date: "%-m/%-d/%Y",
  time: "%-I:%M:%S %p",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
});

function defaultLocale(definition) {
  locale$1 = formatLocale(definition);
  exports.timeFormat = locale$1.format;
  exports.timeParse = locale$1.parse;
  exports.utcFormat = locale$1.utcFormat;
  exports.utcParse = locale$1.utcParse;
  return locale$1;
}

var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

function formatIsoNative(date) {
  return date.toISOString();
}

var formatIso = Date.prototype.toISOString
    ? formatIsoNative
    : exports.utcFormat(isoSpecifier);

function parseIsoNative(string) {
  var date = new Date(string);
  return isNaN(date) ? null : date;
}

var parseIso = +new Date("2000-01-01T00:00:00.000Z")
    ? parseIsoNative
    : exports.utcParse(isoSpecifier);

exports.timeFormatDefaultLocale = defaultLocale;
exports.timeFormatLocale = formatLocale;
exports.isoFormat = formatIso;
exports.isoParse = parseIso;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{"d3-time":24}],24:[function(require,module,exports){
// https://d3js.org/d3-time/ Version 1.0.6. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

var t0 = new Date;
var t1 = new Date;

function newInterval(floori, offseti, count, field) {

  function interval(date) {
    return floori(date = new Date(+date)), date;
  }

  interval.floor = interval;

  interval.ceil = function(date) {
    return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
  };

  interval.round = function(date) {
    var d0 = interval(date),
        d1 = interval.ceil(date);
    return date - d0 < d1 - date ? d0 : d1;
  };

  interval.offset = function(date, step) {
    return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
  };

  interval.range = function(start, stop, step) {
    var range = [];
    start = interval.ceil(start);
    step = step == null ? 1 : Math.floor(step);
    if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
    do range.push(new Date(+start)); while (offseti(start, step), floori(start), start < stop)
    return range;
  };

  interval.filter = function(test) {
    return newInterval(function(date) {
      if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
    }, function(date, step) {
      if (date >= date) while (--step >= 0) while (offseti(date, 1), !test(date)) {} // eslint-disable-line no-empty
    });
  };

  if (count) {
    interval.count = function(start, end) {
      t0.setTime(+start), t1.setTime(+end);
      floori(t0), floori(t1);
      return Math.floor(count(t0, t1));
    };

    interval.every = function(step) {
      step = Math.floor(step);
      return !isFinite(step) || !(step > 0) ? null
          : !(step > 1) ? interval
          : interval.filter(field
              ? function(d) { return field(d) % step === 0; }
              : function(d) { return interval.count(0, d) % step === 0; });
    };
  }

  return interval;
}

var millisecond = newInterval(function() {
  // noop
}, function(date, step) {
  date.setTime(+date + step);
}, function(start, end) {
  return end - start;
});

// An optimized implementation for this simple case.
millisecond.every = function(k) {
  k = Math.floor(k);
  if (!isFinite(k) || !(k > 0)) return null;
  if (!(k > 1)) return millisecond;
  return newInterval(function(date) {
    date.setTime(Math.floor(date / k) * k);
  }, function(date, step) {
    date.setTime(+date + step * k);
  }, function(start, end) {
    return (end - start) / k;
  });
};

var milliseconds = millisecond.range;

var durationSecond = 1e3;
var durationMinute = 6e4;
var durationHour = 36e5;
var durationDay = 864e5;
var durationWeek = 6048e5;

var second = newInterval(function(date) {
  date.setTime(Math.floor(date / durationSecond) * durationSecond);
}, function(date, step) {
  date.setTime(+date + step * durationSecond);
}, function(start, end) {
  return (end - start) / durationSecond;
}, function(date) {
  return date.getUTCSeconds();
});

var seconds = second.range;

var minute = newInterval(function(date) {
  date.setTime(Math.floor(date / durationMinute) * durationMinute);
}, function(date, step) {
  date.setTime(+date + step * durationMinute);
}, function(start, end) {
  return (end - start) / durationMinute;
}, function(date) {
  return date.getMinutes();
});

var minutes = minute.range;

var hour = newInterval(function(date) {
  var offset = date.getTimezoneOffset() * durationMinute % durationHour;
  if (offset < 0) offset += durationHour;
  date.setTime(Math.floor((+date - offset) / durationHour) * durationHour + offset);
}, function(date, step) {
  date.setTime(+date + step * durationHour);
}, function(start, end) {
  return (end - start) / durationHour;
}, function(date) {
  return date.getHours();
});

var hours = hour.range;

var day = newInterval(function(date) {
  date.setHours(0, 0, 0, 0);
}, function(date, step) {
  date.setDate(date.getDate() + step);
}, function(start, end) {
  return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
}, function(date) {
  return date.getDate() - 1;
});

var days = day.range;

function weekday(i) {
  return newInterval(function(date) {
    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setDate(date.getDate() + step * 7);
  }, function(start, end) {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
  });
}

var sunday = weekday(0);
var monday = weekday(1);
var tuesday = weekday(2);
var wednesday = weekday(3);
var thursday = weekday(4);
var friday = weekday(5);
var saturday = weekday(6);

var sundays = sunday.range;
var mondays = monday.range;
var tuesdays = tuesday.range;
var wednesdays = wednesday.range;
var thursdays = thursday.range;
var fridays = friday.range;
var saturdays = saturday.range;

var month = newInterval(function(date) {
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
}, function(date, step) {
  date.setMonth(date.getMonth() + step);
}, function(start, end) {
  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
}, function(date) {
  return date.getMonth();
});

var months = month.range;

var year = newInterval(function(date) {
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
}, function(date, step) {
  date.setFullYear(date.getFullYear() + step);
}, function(start, end) {
  return end.getFullYear() - start.getFullYear();
}, function(date) {
  return date.getFullYear();
});

// An optimized implementation for this simple case.
year.every = function(k) {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
    date.setFullYear(Math.floor(date.getFullYear() / k) * k);
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setFullYear(date.getFullYear() + step * k);
  });
};

var years = year.range;

var utcMinute = newInterval(function(date) {
  date.setUTCSeconds(0, 0);
}, function(date, step) {
  date.setTime(+date + step * durationMinute);
}, function(start, end) {
  return (end - start) / durationMinute;
}, function(date) {
  return date.getUTCMinutes();
});

var utcMinutes = utcMinute.range;

var utcHour = newInterval(function(date) {
  date.setUTCMinutes(0, 0, 0);
}, function(date, step) {
  date.setTime(+date + step * durationHour);
}, function(start, end) {
  return (end - start) / durationHour;
}, function(date) {
  return date.getUTCHours();
});

var utcHours = utcHour.range;

var utcDay = newInterval(function(date) {
  date.setUTCHours(0, 0, 0, 0);
}, function(date, step) {
  date.setUTCDate(date.getUTCDate() + step);
}, function(start, end) {
  return (end - start) / durationDay;
}, function(date) {
  return date.getUTCDate() - 1;
});

var utcDays = utcDay.range;

function utcWeekday(i) {
  return newInterval(function(date) {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCDate(date.getUTCDate() + step * 7);
  }, function(start, end) {
    return (end - start) / durationWeek;
  });
}

var utcSunday = utcWeekday(0);
var utcMonday = utcWeekday(1);
var utcTuesday = utcWeekday(2);
var utcWednesday = utcWeekday(3);
var utcThursday = utcWeekday(4);
var utcFriday = utcWeekday(5);
var utcSaturday = utcWeekday(6);

var utcSundays = utcSunday.range;
var utcMondays = utcMonday.range;
var utcTuesdays = utcTuesday.range;
var utcWednesdays = utcWednesday.range;
var utcThursdays = utcThursday.range;
var utcFridays = utcFriday.range;
var utcSaturdays = utcSaturday.range;

var utcMonth = newInterval(function(date) {
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
}, function(date, step) {
  date.setUTCMonth(date.getUTCMonth() + step);
}, function(start, end) {
  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
}, function(date) {
  return date.getUTCMonth();
});

var utcMonths = utcMonth.range;

var utcYear = newInterval(function(date) {
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
}, function(date, step) {
  date.setUTCFullYear(date.getUTCFullYear() + step);
}, function(start, end) {
  return end.getUTCFullYear() - start.getUTCFullYear();
}, function(date) {
  return date.getUTCFullYear();
});

// An optimized implementation for this simple case.
utcYear.every = function(k) {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCFullYear(date.getUTCFullYear() + step * k);
  });
};

var utcYears = utcYear.range;

exports.timeInterval = newInterval;
exports.timeMillisecond = millisecond;
exports.timeMilliseconds = milliseconds;
exports.utcMillisecond = millisecond;
exports.utcMilliseconds = milliseconds;
exports.timeSecond = second;
exports.timeSeconds = seconds;
exports.utcSecond = second;
exports.utcSeconds = seconds;
exports.timeMinute = minute;
exports.timeMinutes = minutes;
exports.timeHour = hour;
exports.timeHours = hours;
exports.timeDay = day;
exports.timeDays = days;
exports.timeWeek = sunday;
exports.timeWeeks = sundays;
exports.timeSunday = sunday;
exports.timeSundays = sundays;
exports.timeMonday = monday;
exports.timeMondays = mondays;
exports.timeTuesday = tuesday;
exports.timeTuesdays = tuesdays;
exports.timeWednesday = wednesday;
exports.timeWednesdays = wednesdays;
exports.timeThursday = thursday;
exports.timeThursdays = thursdays;
exports.timeFriday = friday;
exports.timeFridays = fridays;
exports.timeSaturday = saturday;
exports.timeSaturdays = saturdays;
exports.timeMonth = month;
exports.timeMonths = months;
exports.timeYear = year;
exports.timeYears = years;
exports.utcMinute = utcMinute;
exports.utcMinutes = utcMinutes;
exports.utcHour = utcHour;
exports.utcHours = utcHours;
exports.utcDay = utcDay;
exports.utcDays = utcDays;
exports.utcWeek = utcSunday;
exports.utcWeeks = utcSundays;
exports.utcSunday = utcSunday;
exports.utcSundays = utcSundays;
exports.utcMonday = utcMonday;
exports.utcMondays = utcMondays;
exports.utcTuesday = utcTuesday;
exports.utcTuesdays = utcTuesdays;
exports.utcWednesday = utcWednesday;
exports.utcWednesdays = utcWednesdays;
exports.utcThursday = utcThursday;
exports.utcThursdays = utcThursdays;
exports.utcFriday = utcFriday;
exports.utcFridays = utcFridays;
exports.utcSaturday = utcSaturday;
exports.utcSaturdays = utcSaturdays;
exports.utcMonth = utcMonth;
exports.utcMonths = utcMonths;
exports.utcYear = utcYear;
exports.utcYears = utcYears;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlcy9zcmMvYXBwLmpzIiwiZXhhbXBsZXMvc3JjL2NvbXBvbmVudHMvQmFyTGluZUNoYXJ0RXhhbXBsZS5qcyIsImV4YW1wbGVzL3NyYy9jb21wb25lbnRzL0RpdmlkZWRMaW5lRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9EcmFnQW5kRHJvcEV4YW1wbGUuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9NYXJrRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9PUkZyYW1lQ29ubmVjdG9yRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9PUkZyYW1lR3JvdXBFeGFtcGxlcy5qcyIsImV4YW1wbGVzL3NyYy9jb21wb25lbnRzL09SRnJhbWVQaWVjZUV4YW1wbGVzLmpzIiwiZXhhbXBsZXMvc3JjL2NvbXBvbmVudHMvWFlBbm5vdGF0aW9uRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9YWUZyYW1lRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9YWUZyYW1lRXhhbXBsZXNNaXNjLmpzIiwiZXhhbXBsZXMvc3JjL2NvbXBvbmVudHMvWFlGcmFtZVBvaW50RXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9YWUZyYW1lV2l0aE1pbmltYXBFeGFtcGxlcy5qcyIsIm5vZGVfbW9kdWxlcy9kMy1hcnJheS9idWlsZC9kMy1hcnJheS5qcyIsIm5vZGVfbW9kdWxlcy9kMy1jb2xsZWN0aW9uL2J1aWxkL2QzLWNvbGxlY3Rpb24uanMiLCJub2RlX21vZHVsZXMvZDMtY29sb3IvYnVpbGQvZDMtY29sb3IuanMiLCJub2RlX21vZHVsZXMvZDMtZm9ybWF0L2J1aWxkL2QzLWZvcm1hdC5qcyIsIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9idWlsZC9kMy1pbnRlcnBvbGF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9kMy1wYXRoL2J1aWxkL2QzLXBhdGguanMiLCJub2RlX21vZHVsZXMvZDMtcmFuZG9tL2J1aWxkL2QzLXJhbmRvbS5qcyIsIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9idWlsZC9kMy1zY2FsZS5qcyIsIm5vZGVfbW9kdWxlcy9kMy1zaGFwZS9idWlsZC9kMy1zaGFwZS5qcyIsIm5vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9idWlsZC9kMy10aW1lLWZvcm1hdC5qcyIsIm5vZGVfbW9kdWxlcy9kMy10aW1lL2J1aWxkL2QzLXRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0NBOzs7O0FBR0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQWhCQTtBQW1CQSxtQkFBUyxNQUFULENBQ0k7QUFBQTtBQUFBO0FBQ0ksNERBQWMsT0FBTSxNQUFwQjtBQURKLENBREosRUFJSSxTQUFTLGNBQVQsQ0FBd0IsZUFBeEIsQ0FKSjtBQWpCQTs7QUF3QkEsbUJBQVMsTUFBVCxDQUNJO0FBQUE7QUFBQTtBQUNJLGtFQUFvQixPQUFNLE1BQTFCO0FBREosQ0FESixFQUlJLFNBQVMsY0FBVCxDQUF3Qix3QkFBeEIsQ0FKSjs7QUFPQSxtQkFBUyxNQUFULENBQ0k7QUFBQTtBQUFBO0FBQ0ksbUVBQXFCLE9BQU0sY0FBM0I7QUFESixDQURKLEVBSUksU0FBUyxjQUFULENBQXdCLHNCQUF4QixDQUpKOztBQU9BLG1CQUFTLE1BQVQsQ0FDSTtBQUFBO0FBQUE7QUFDSSwrREFBaUIsT0FBTSxTQUF2QjtBQURKLENBREosRUFJSSxTQUFTLGNBQVQsQ0FBd0IsaUNBQXhCLENBSko7O0FBT0EsbUJBQVMsTUFBVCxDQUNJO0FBQUE7QUFBQTtBQUNJLG1FQUFxQixPQUFNLFNBQTNCO0FBREosQ0FESixFQUlJLFNBQVMsY0FB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QUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFGLEVBQWtCLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWxCLEVBQWtDLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWxDLEVBQWtELEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWxELEVBQWtFLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWxFLEVBQWtGLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWxGLEVBQWtHLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWxHLENBQTVDLEVBRmEsRUFHYixFQUFFLElBQUksWUFBTixFQUFvQixPQUFPLFNBQTNCLEVBQXNDLE1BQU0sQ0FBRSxFQUFFLEdBQUcsRUFBTCxFQUFTLEdBQUcsQ0FBWixFQUFGLEVBQW1CLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQW5CLEVBQW1DLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQW5DLEVBQW1ELEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQW5ELEVBQW1FLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQW5FLEVBQW1GLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQW5GLEVBQW1HLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQW5HLENBQTVDLEVBSGEsRUFJYixFQUFFLElBQUksWUFBTixFQUFvQixPQUFPLFNBQTNCLEVBQXNDLE1BQU0sQ0FBRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFGLEVBQWtCLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWxCLEVBQWtDLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWxDLEVBQWtELEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWxELEVBQWtFLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVB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QixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQixFQUFrQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQyxFQUFrRCxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRCxFQUFrRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRSxFQUFrRixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRixFQUFrRyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRyxDQUE1QyxFQURhLEVBRWIsRUFBRSxJQUFJLFlBQU4sRUFBb0IsT0FBTyxTQUEzQixFQUFzQyxNQUFNLENBQUUsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBRixFQUFrQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQixFQUFrQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQyxFQUFrRCxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRCxFQUFrRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRSxFQUFrRixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRixFQUFrRyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRyxDQUE1QyxFQUZhLEVBR2IsRUFBRSxJQUFJLFlBQU4sRUFBb0IsT0FBTyxTQUEzQixFQUFzQyxNQUFNLENBQUUsRUFBRSxHQUFHLEVBQUwsRUFBUyxHQUFHLENBQVosRUFBRixFQUFtQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuQixFQUFtQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuQyxFQUFtRCxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuRCxFQUFtRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuRSxFQUFtRixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FB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USxHQUFHLENBQVgsRUFBbEUsRUFBa0YsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEYsRUFBa0csRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEcsQ0FBNUMsRUFEYSxFQUViLEVBQUUsSUFBSSxZQUFOLEVBQW9CLE9BQU8sU0FBM0IsRUFBc0MsTUFBTSxDQUFFLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQUYsRUFBa0IsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEIsRUFBa0MsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEMsRUFBa0QsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEQsRUFBa0UsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEUsRUFBa0YsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEYsRUFBa0csRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEcsQ0FBNUMsRUFGYSxFQUdiLEVBQUUsSUFBSSxZQUFOLEVBQW9CLE9BQU8sU0FBM0IsRUFBc0MsTUFBTSxDQUFFLEVBQUUsR0FBRyxFQUFMLEVBQVMsR0FBRyxDQUFaLEVBQUYsRUFBbUIsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkIsRUFBbUMsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkMsRUFBbUQsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkQsRUFBbUUsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkUsRUFBbUYsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkYsRUFBbUcsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkcsQ0FBNUMsRUFIYSxFQUliLEVBQUUsSUFBSSxZQUFOLEVBQW9CLE9BQU8sU0FBM0IsRUFBc0MsTUFBTSxDQUFFLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVB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O0VBMURvQyxnQkFBTSxTOztBQTZEL0MsT0FBTyxPQUFQLEdBQWlCLDBCQUFqQjs7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ppQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyNEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0eERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCdcbi8qIGVzbGludC1lbmFibGUgbm8tdW51c2VkLXZhcnMgKi9cblxuaW1wb3J0IFJlYWN0RE9NIGZyb20gJ3JlYWN0LWRvbSdcbmltcG9ydCBNYXJrRXhhbXBsZXMgZnJvbSAnLi9jb21wb25lbnRzL01hcmtFeGFtcGxlcydcbmltcG9ydCBEcmFnQW5kRHJvcEV4YW1wbGUgZnJvbSAnLi9jb21wb25lbnRzL0RyYWdBbmREcm9wRXhhbXBsZSdcbmltcG9ydCBYWUZyYW1lRXhhbXBsZXMgZnJvbSAnLi9jb21wb25lbnRzL1hZRnJhbWVFeGFtcGxlcydcbmltcG9ydCBYWUZyYW1lV2l0aE1pbmltYXBFeGFtcGxlcyBmcm9tICcuL2NvbXBvbmVudHMvWFlGcmFtZVdpdGhNaW5pbWFwRXhhbXBsZXMnXG5pbXBvcnQgWFlGcmFtZUV4YW1wbGVzTWlzYyBmcm9tICcuL2NvbXBvbmVudHMvWFlGcmFtZUV4YW1wbGVzTWlzYydcbmltcG9ydCBYWUFubm90YXRpb25FeGFtcGxlcyBmcm9tICcuL2NvbXBvbmVudHMvWFlBbm5vdGF0aW9uRXhhbXBsZXMnXG5pbXBvcnQgWFlGcmFtZVBvaW50RXhhbXBsZXMgZnJvbSAnLi9jb21wb25lbnRzL1hZRnJhbWVQb2ludEV4YW1wbGVzJ1xuaW1wb3J0IE9SRnJhbWVQaWVjZUV4YW1wbGVzIGZyb20gJy4vY29tcG9uZW50cy9PUkZyYW1lUGllY2VFeGFtcGxlcydcbmltcG9ydCBPUkZyYW1lQ29ubmVjdG9yRXhhbXBsZXMgZnJvbSAnLi9jb21wb25lbnRzL09SRnJhbWVDb25uZWN0b3JFeGFtcGxlcydcbmltcG9ydCBPUkZyYW1lR3JvdXBFeGFtcGxlcyBmcm9tICcuL2NvbXBvbmVudHMvT1JGcmFtZUdyb3VwRXhhbXBsZXMnXG5pbXBvcnQgRGl2aWRlZExpbmVFeGFtcGxlcyBmcm9tICcuL2NvbXBvbmVudHMvRGl2aWRlZExpbmVFeGFtcGxlcydcbmltcG9ydCBCYXJMaW5lQ2hhcnRFeGFtcGxlIGZyb20gJy4vY29tcG9uZW50cy9CYXJMaW5lQ2hhcnRFeGFtcGxlJ1xuXG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8ZGl2PlxuICAgICAgICA8TWFya0V4YW1wbGVzIGxhYmVsPVwiTWFya1wiIC8+XG4gICAgPC9kaXY+LFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXJrLWV4YW1wbGVzJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxEcmFnQW5kRHJvcEV4YW1wbGUgbGFiZWw9XCJNYXJrXCIgLz5cbiAgICA8L2Rpdj4sXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RyYWctYW5kLWRyb3AtZXhhbXBsZXMnKVxuKVxuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPGRpdj5cbiAgICAgICAgPERpdmlkZWRMaW5lRXhhbXBsZXMgbGFiZWw9XCJEaXZpZGVkIExpbmVcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGl2aWRlZExpbmUtZXhhbXBsZXMnKVxuKVxuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPGRpdj5cbiAgICAgICAgPFhZRnJhbWVFeGFtcGxlcyBsYWJlbD1cIlhZRnJhbWVcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZS1leGFtcGxlcy1jdXN0b21saW5ldHlwZScpXG4pXG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8ZGl2PlxuICAgICAgICA8WFlGcmFtZUV4YW1wbGVzTWlzYyBsYWJlbD1cIlhZRnJhbWVcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZS1leGFtcGxlcy1taXNjJylcbilcblxuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPGRpdj5cbiAgICAgICAgPFhZRnJhbWVQb2ludEV4YW1wbGVzIGxhYmVsPVwiWFlGcmFtZSBQb2ludHNcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZVBvaW50LWV4YW1wbGVzJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxYWUZyYW1lV2l0aE1pbmltYXBFeGFtcGxlcyBsYWJlbD1cIlhZRnJhbWVcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZS1leGFtcGxlcy1taW5pbWFwJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxYWUFubm90YXRpb25FeGFtcGxlcyBsYWJlbD1cIlhZIEFubm90YXRpb24gRXhhbXBsZXNcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZS1leGFtcGxlcy1hbm5vdGF0aW9uJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxPUkZyYW1lUGllY2VFeGFtcGxlcyBsYWJlbD1cIk9SRnJhbWUgUGllY2VzXCIgLz5cbiAgICA8L2Rpdj4sXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29yRnJhbWVQaWVjZS1leGFtcGxlcycpXG4pXG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8ZGl2PlxuICAgICAgICA8T1JGcmFtZUNvbm5lY3RvckV4YW1wbGVzIGxhYmVsPVwiT1JGcmFtZSBDb25uZWN0b3JzXCIgLz5cbiAgICA8L2Rpdj4sXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29yRnJhbWVDb25uZWN0b3ItZXhhbXBsZXMnKVxuKVxuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPGRpdj5cbiAgICAgICAgPE9SRnJhbWVHcm91cEV4YW1wbGVzIGxhYmVsPVwiT1JGcmFtZSBHcm91cHNcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb3JGcmFtZUdyb3VwLWV4YW1wbGVzJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxCYXJMaW5lQ2hhcnRFeGFtcGxlIGxhYmVsPVwiQmFyIExpbmUgQ2hhcnRcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFyTGluZS1leGFtcGxlcycpXG4pXG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBYWUZyYW1lLCBPUkZyYW1lIH0gZnJvbSAnc2VtaW90aWMnO1xuaW1wb3J0IHsgY3VydmVCYXNpcyB9IGZyb20gJ2QzLXNoYXBlJ1xuXG5jb25zdCB0ZXN0RGF0YSA9IFtcbiAgICB7IGlkOiBcImxpbmVkYXRhLTFcIiwgY29sb3I6IFwiIzAwYTJjZVwiLCBkYXRhOiBbIHsgc2FsZXM6IDUsIGxlYWRzOiAxNTAsIHg6IDEgfSwgeyBzYWxlczogNywgbGVhZHM6IDEwMCwgeDogMiB9LCB7IHNhbGVzOiA3LCBsZWFkczogMTEyLCB4OiAzIH0sIHsgc2FsZXM6IDQsIGxlYWRzOiA0MCwgeDogNCB9LCB7IHNhbGVzOiAyLCBsZWFkczogMjAwLCB4OiA1IH0sIHsgc2FsZXM6IDMsIGxlYWRzOiAxODAsIHg6IDYgfSwgeyBzYWxlczogNSwgbGVhZHM6IDE2NSwgeDogNyB9IF0gfVxuXVxuXG5sZXQgZGlzcGxheURhdGEgPSB0ZXN0RGF0YS5tYXAoZCA9PiB7XG4gICAgbGV0IG1vcmVEYXRhID0gWyAuLi5kLmRhdGEsIC4uLmQuZGF0YS5tYXAocCA9PiAoeyBzYWxlczogcC5zYWxlcyArIE1hdGgucmFuZG9tKCkgKiA1LCBsZWFkczogcC5sZWFkcyArIE1hdGgucmFuZG9tKCkgKiAxMDAsIHg6IHAueCArIDcgfSkpIF1cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihkLCB7IGRhdGE6IG1vcmVEYXRhIH0pXG59KVxuXG5jbGFzcyBCYXJMaW5lQ2hhcnRFeGFtcGxlcyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpe1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuXG4gICAgICBjb25zdCBheGVzID0gW1xuICAgICAgICB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwibGVmdFwiLCBjbGFzc05hbWU6IFwieXNjYWxlXCIsIG5hbWU6IFwiQ291bnRBeGlzXCIsIHRpY2tWYWx1ZXM6IFsgMiwgNiwgMTAgXSwgdGlja0Zvcm1hdDogKGQpID0+IGQgKyBcIiVcIiB9LFxuICAgICAgICB7IGtleTogXCJ4QXhpc1wiLCBvcmllbnQ6IFwiYm90dG9tXCIsIGNsYXNzTmFtZTogXCJ4c2NhbGVcIiwgbmFtZTogXCJUaW1lQXhpc1wiLCB0aWNrVmFsdWVzOiBbIDIsIDQsIDYsIDgsIDEwLCAxMiBdLCB0aWNrRm9ybWF0OiBkID0+IFwiZGF5IFwiICsgZCAgfVxuICAgICAgXVxuICAgICAgY29uc3QgYXhpczMgPSB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwicmlnaHRcIiwgY2xhc3NOYW1lOiBcInlzY2FsZVwiLCBuYW1lOiBcIkNvdW50QXhpc1wiLCB0aWNrczogMywgdGlja0Zvcm1hdDogKGQpID0+IGQgfVxuXG4gICAgICAgIHJldHVybiA8ZGl2IHN0eWxlPXt7IGhlaWdodDogXCIzMDBweFwiIH19PlxuICAgICAgICAgICAgPGRpdiBzdHlsZT17eyBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiIH19PlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJkaXZpZGVkLWxpbmUtb3JcIlxuICAgICAgICAgICAgICAgIHNpemU9e1sgNTAwLDMwMCBdfVxuICAgICAgICAgICAgICAgIGRhdGE9e2Rpc3BsYXlEYXRhWzBdLmRhdGF9XG4gICAgICAgICAgICAgICAgdHlwZT17XCJiYXJcIn1cbi8vICAgICAgICAgICAgICAgIHJlbmRlckZuPXsoKSA9PiBcInNrZXRjaHlcIn1cbiAgICAgICAgICAgICAgICBvQWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgICAgIHJBY2Nlc3Nvcj17ZCA9PiBkLmxlYWRzfVxuICAgICAgICAgICAgICAgIHN0eWxlPXsoKSA9PiAoeyBmaWxsOiBcIiNiMzMzMWRcIiwgb3BhY2l0eTogMSwgc3Ryb2tlOiAnd2hpdGUnIH0pfVxuICAgICAgICAgICAgICAgIG1hcmdpbj17eyB0b3A6IDUsIGJvdHRvbTogMjUsIGxlZnQ6IDU1LCByaWdodDogNTUgfX1cbiAgICAgICAgICAgICAgICBheGlzPXtheGlzM31cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgcG9zaXRpb246IFwiYWJzb2x1dGVcIiB9fT5cbiAgICAgICAgICAgIDxYWUZyYW1lXG4gICAgICAgICAgICBjbGFzc05hbWU9XCJkaXZpZGVkLWxpbmUteHlcIlxuICAgICAgICAgICAgYXhlcz17YXhlc31cbiAgICAgICAgICAgIHNpemU9e1sgNTAwLCAzMDAgXX1cbiAgICAgICAgICAgIGxpbmVzPXtkaXNwbGF5RGF0YX1cbiAgICAgICAgICAgIGxpbmVEYXRhQWNjZXNzb3I9e2QgPT4gZC5kYXRhfVxuICAgICAgICAgICAgeEFjY2Vzc29yPXtkID0+IGQueH1cbiAgICAgICAgICAgIHlBY2Nlc3Nvcj17ZCA9PiBkLnNhbGVzfVxuICAgICAgICAgICAgbGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciwgc3Ryb2tlV2lkdGg6IFwiMnB4XCIgfSl9XG4gICAgICAgICAgICBjdXN0b21MaW5lVHlwZT17eyB0eXBlOiBcImxpbmVcIiwgaW50ZXJwb2xhdG9yOiBjdXJ2ZUJhc2lzLCBzb3J0OiBudWxsIH19XG4gICAgICAgICAgICBtYXJnaW49e3sgdG9wOiA1LCBib3R0b206IDI1LCBsZWZ0OiA1NSwgcmlnaHQ6IDU1IH19XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmFyTGluZUNoYXJ0RXhhbXBsZXM7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBEaXZpZGVkTGluZSB9IGZyb20gJ3NlbWlvdGljJztcbmltcG9ydCB7IGN1cnZlQmFzaXMgfSBmcm9tICdkMy1zaGFwZSdcblxuY2xhc3MgRGl2aWRlZExpbmVFeGFtcGxlIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcyl7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGZ1bmN0aW9uIHJhbmRvbUxpbmVHZW5lcmF0b3Iod2lkdGgsIGhlaWdodCwgcG9pbnRzKSB7XG4gICAgICAgICAgY29uc3QgcG9pbnREYXRhU2V0ID0gW11cbiAgICAgICAgICBsZXQgY3VyWSA9IDAuNVxuICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4PCBwb2ludHM7IHgrKykge1xuICAgICAgICAgICAgY3VyWSArPSBNYXRoLnJhbmRvbSgpICogMC4zIC0gMC4xNTtcbiAgICAgICAgICAgIGN1clkgPSBNYXRoLm1heChjdXJZLCAwLjA1KVxuICAgICAgICAgICAgY3VyWSA9IE1hdGgubWluKGN1clksIDAuOTUpXG4gICAgICAgICAgICBwb2ludERhdGFTZXQucHVzaCh7IHg6IHggLyBwb2ludHMgKiB3aWR0aCwgeTogY3VyWSAqIGhlaWdodCB9KVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcG9pbnREYXRhU2V0XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwYXJhbWV0ZXJzKHBvaW50KSB7XG4gICAgICAgICAgaWYgKHBvaW50LnggPCAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IGZpbGw6IFwibm9uZVwiLCBzdHJva2U6IFwiI2IzMzMxZFwiLCBzdHJva2VXaWR0aDogNiwgc3Ryb2tlT3BhY2l0eTogMC41IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBvaW50LnggPiA0MDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IGZpbGw6IFwibm9uZVwiLCBzdHJva2U6IFwiI2IzMzMxZFwiLCBzdHJva2VXaWR0aDogMSwgc3Ryb2tlRGFzaGFycmF5OiBcIjUgNVwiIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBvaW50LnkgPCAxNTApIHtcbiAgICAgICAgICAgIHJldHVybiB7IGZpbGw6IFwibm9uZVwiLCBzdHJva2VXaWR0aDogMSwgc3Ryb2tlOiBcIiMwMGEyY2VcIiB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwb2ludC55ID4gMzUwKSB7XG4gICAgICAgICAgICByZXR1cm4geyBmaWxsOiBcIm5vbmVcIiwgc3Ryb2tlV2lkdGg6IDIsIHN0cm9rZTogXCIjYjZhNzU2XCIgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4geyBmaWxsOiBcIm5vbmVcIiwgc3Ryb2tlOiBcImJsYWNrXCIsIHN0cm9rZVdpZHRoOiAxIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRhdGEgPSByYW5kb21MaW5lR2VuZXJhdG9yKDUwMCw1MDAsMTAwKVxuXG4gICAgICAgIHJldHVybiA8c3ZnIGhlaWdodD1cIjUwMFwiIHdpZHRoPVwiNTAwXCI+XG4gICAgICAgIDxEaXZpZGVkTGluZVxuICAgICAgICAgICAgcGFyYW1ldGVycz17cGFyYW1ldGVyc31cbiAgICAgICAgICAgIGRhdGE9e1sgZGF0YSBdfVxuICAgICAgICAgICAgbGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkfVxuICAgICAgICAgICAgY3VzdG9tQWNjZXNzb3JzPXt7IHg6IGQgPT4gZC54LCB5OiBkID0+IGQueSB9fVxuICAgICAgICAgICAgaW50ZXJwb2xhdGU9e2N1cnZlQmFzaXN9XG4gICAgICAgICAgICBzZWFyY2hJdGVyYXRpb25zPXsyMH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgIDwvc3ZnPlxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEaXZpZGVkTGluZUV4YW1wbGU7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgRHJhZ2dhYmxlTWFyaywgTWFya0NvbnRleHQgfSBmcm9tICdzZW1pb3RpYyc7XG5cbmNsYXNzIERyYWdBbmREcm9wRXhhbXBsZSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpe1xuICAgICAgICBzdXBlcihwcm9wcylcbiAgICAgICAgdGhpcy5zdGF0ZT17IHNvdXJjZTogdW5kZWZpbmVkLCB0YXJnZXQ6IHVuZGVmaW5lZCB9XG4gICAgICAgIHRoaXMuZHJvcE1lID0gdGhpcy5kcm9wTWUuYmluZCh0aGlzKVxuICAgIH1cblxuICAgIGRyb3BNZSAoc291cmNlLCB0YXJnZXQpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IHNvdXJjZTogc291cmNlLm5pZCwgdGFyZ2V0OiB0YXJnZXQubmlkIH0pXG4gICAgfVxuXG4gICAgcmVuZGVyICgpIHtcbiAgICAgICAgY29uc3QgRHJhZ01hcmsxID0gPERyYWdnYWJsZU1hcmtcbiAgICAgICAgICAgIG5pZD17bnVsbH1cbiAgICAgICAgICAgIG1hcmtUeXBlPVwiY2lyY2xlXCJcbiAgICAgICAgICAgIHI9ezIwfVxuICAgICAgICAgICAgY3g9ezUwfVxuICAgICAgICAgICAgY3k9ezUwfVxuICAgICAgICAgICAgc3R5bGU9e3sgZmlsbDogXCJncmF5XCIsIHN0cm9rZTogXCJibGFja1wiLCBzdHJva2VXaWR0aDogdGhpcy5zdGF0ZS5zb3VyY2UgPT09IG51bGwgPyBcIjJweFwiIDogMCB9fVxuICAgICAgICAgICAgZHJvcEZ1bmN0aW9uPXt0aGlzLmRyb3BNZX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgY29uc3QgRHJhZ01hcmsyID0gPERyYWdnYWJsZU1hcmtcbiAgICAgICAgICAgIG5pZD17XCJwYWludHlcIn1cbiAgICAgICAgICAgIG1hcmtUeXBlPVwiY2lyY2xlXCJcbiAgICAgICAgICAgIHJlbmRlck1vZGU9e1wicGFpbnR5XCJ9XG4gICAgICAgICAgICByPXsyMH1cbiAgICAgICAgICAgIGN4PXsxNTB9XG4gICAgICAgICAgICBjeT17NTB9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcImdyYXlcIiwgc3Ryb2tlOiBcImJsYWNrXCIsIHN0cm9rZVdpZHRoOiB0aGlzLnN0YXRlLnNvdXJjZSA9PT0gXCJwYWludHlcIiA/IFwiMnB4XCIgOiAwIH19XG4gICAgICAgICAgICBkcm9wRnVuY3Rpb249e3RoaXMuZHJvcE1lfVxuICAgICAgICAgICAgLz5cblxuICAgICAgICBjb25zdCBEcmFnTWFyazMgPSA8RHJhZ2dhYmxlTWFya1xuICAgICAgICAgICAgbmlkPXtcInNrZXRjaHlcIn1cbiAgICAgICAgICAgIG1hcmtUeXBlPVwiY2lyY2xlXCJcbiAgICAgICAgICAgIHJlbmRlck1vZGU9e1wic2tldGNoeVwifVxuICAgICAgICAgICAgcj17MjB9XG4gICAgICAgICAgICBjeD17MjUwfVxuICAgICAgICAgICAgY3k9ezUwfVxuICAgICAgICAgICAgc3R5bGU9e3sgZmlsbDogXCJncmF5XCIsIHN0cm9rZTogXCJibGFja1wiLCBzdHJva2VXaWR0aDogdGhpcy5zdGF0ZS5zb3VyY2UgPT09IFwic2tldGNoeVwiID8gXCIycHhcIiA6IDAgfX1cbiAgICAgICAgICAgIGRyb3BGdW5jdGlvbj17dGhpcy5kcm9wTWV9XG4gICAgICAgICAgICAvPlxuXG4gICAgICAgIGNvbnN0IERyYWdNYXJrNCA9IDxEcmFnZ2FibGVNYXJrXG4gICAgICAgICAgICBtYXJrVHlwZT1cInJlY3RcIlxuICAgICAgICAgICAgbmlkPXsxfVxuICAgICAgICAgICAgcmVuZGVyTW9kZT17dGhpcy5zdGF0ZS50YXJnZXQgPT09IDEgPyB0aGlzLnN0YXRlLnNvdXJjZSA6IG51bGx9XG4gICAgICAgICAgICB3aWR0aD17MTAwfVxuICAgICAgICAgICAgaGVpZ2h0PXsxMDB9XG4gICAgICAgICAgICB4PXsxNzV9XG4gICAgICAgICAgICB5PXsxNTB9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcIiMwMGEyY2VcIiB9fVxuICAgICAgICAgICAgZHJvcEZ1bmN0aW9uPXt0aGlzLmRyb3BNZX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgY29uc3QgRHJhZ01hcms1ID0gPERyYWdnYWJsZU1hcmtcbiAgICAgICAgICAgIG1hcmtUeXBlPVwicmVjdFwiXG4gICAgICAgICAgICBuaWQ9ezJ9XG4gICAgICAgICAgICByZW5kZXJNb2RlPXt0aGlzLnN0YXRlLnRhcmdldCA9PT0gMiA/IHRoaXMuc3RhdGUuc291cmNlIDogbnVsbH1cbiAgICAgICAgICAgIHdpZHRoPXsxMDB9XG4gICAgICAgICAgICBoZWlnaHQ9ezEwMH1cbiAgICAgICAgICAgIHg9ezI1fVxuICAgICAgICAgICAgeT17MTUwfVxuICAgICAgICAgICAgc3R5bGU9e3sgZmlsbDogXCIjYjMzMzFkXCIgfX1cbiAgICAgICAgICAgIGRyb3BGdW5jdGlvbj17dGhpcy5kcm9wTWV9XG4gICAgICAgICAgICAvPlxuXG4gICAgICAgIHJldHVybiA8c3ZnIGhlaWdodD1cIjM2NVwiIHdpZHRoPVwiNTAwXCI+XG4gICAgICAgIDxkZWZzPlxuICAgICAgICAgICAgPG1hcmtlclxuICAgICAgICAgICAgaWQ9XCJUcmlhbmdsZVwiXG4gICAgICAgICAgICByZWZYPXsxMn1cbiAgICAgICAgICAgIHJlZlk9ezZ9XG4gICAgICAgICAgICBtYXJrZXJVbml0cz1cInVzZXJTcGFjZU9uVXNlXCJcbiAgICAgICAgICAgIG1hcmtlcldpZHRoPXsxMn1cbiAgICAgICAgICAgIG1hcmtlckhlaWdodD17MTh9XG4gICAgICAgICAgICBvcmllbnQ9XCJhdXRvXCI+XG4gICAgICAgICAgICA8cGF0aCBkPVwiTSAwIDAgMTIgNiAwIDEyIDMgNlwiIC8+XG4gICAgICAgICAgICA8L21hcmtlcj5cbiAgICAgICAgICA8ZmlsdGVyIGlkPVwicGFpbnR5RmlsdGVySGVhdnlcIj5cbiAgICAgICAgICAgIDxmZUdhdXNzaWFuQmx1ciBpZD1cImdhdXNzYmx1cnJlclwiIGluPVwiU291cmNlR3JhcGhpY1wiXG4gICAgICAgICAgICAgIHN0ZERldmlhdGlvbj17NH1cbiAgICAgICAgICAgICAgY29sb3JJbnRlcnBvbGF0aW9uRmlsdGVycz1cInNSR0JcIlxuICAgICAgICAgICAgICByZXN1bHQ9XCJibHVyXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8ZmVDb2xvck1hdHJpeCBpbj1cImJsdXJcIlxuICAgICAgICAgICAgICBtb2RlPVwibWF0cml4XCJcbiAgICAgICAgICAgICAgdmFsdWVzPVwiMSAwIDAgMCAwICAwIDEgMCAwIDAgIDAgMCAxIDAgMCAgMCAwIDAgMzQgLTdcIlxuICAgICAgICAgICAgICByZXN1bHQ9XCJnb29leVwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZmlsdGVyPlxuICAgICAgICAgIDxmaWx0ZXIgaWQ9XCJwYWludHlGaWx0ZXJMaWdodFwiPlxuICAgICAgICAgICAgPGZlR2F1c3NpYW5CbHVyIGlkPVwiZ2F1c3NibHVycmVyXCIgaW49XCJTb3VyY2VHcmFwaGljXCJcbiAgICAgICAgICAgICAgc3RkRGV2aWF0aW9uPXsyfVxuICAgICAgICAgICAgICBjb2xvckludGVycG9sYXRpb25GaWx0ZXJzPVwic1JHQlwiXG4gICAgICAgICAgICAgIHJlc3VsdD1cImJsdXJcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxmZUNvbG9yTWF0cml4IGluPVwiYmx1clwiXG4gICAgICAgICAgICAgIG1vZGU9XCJtYXRyaXhcIlxuICAgICAgICAgICAgICB2YWx1ZXM9XCIxIDAgMCAwIDAgIDAgMSAwIDAgMCAgMCAwIDEgMCAwICAwIDAgMCAzNCAtN1wiXG4gICAgICAgICAgICAgIHJlc3VsdD1cImdvb2V5XCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgPC9maWx0ZXI+XG4gICAgICAgIDwvZGVmcz5cbiAgICAgICAgICAgIDx0ZXh0IHg9ezE5MH0geT17MTI1fSBzdHlsZT17eyB1c2VyU2VsZWN0OiBcIm5vbmVcIiwgcG9pbnRlckV2ZW50czogXCJub25lXCIgfX0+RHJhZyBtZSE8L3RleHQ+XG4gICAgICAgICAgICA8bGluZSBtYXJrZXJFbmQ9XCJ1cmwoI1RyaWFuZ2xlKVwiIHgxPXsxNTV9IHkxPXs2NX0geDI9ezE5MH0geTI9ezE0MH0gc3R5bGU9e3sgdXNlclNlbGVjdDogXCJub25lXCIsIHBvaW50ZXJFdmVudHM6IFwibm9uZVwiLCBzdHJva2U6IFwiYmxhY2tcIiwgc3Ryb2tlV2lkdGg6IFwiMXB4XCIsIHN0cm9rZURhc2hhcnJheTogXCI1IDVcIiB9fSAvPlxuICAgICAgICAgICAgPE1hcmtDb250ZXh0PlxuICAgICAgICAgICAgICAgIHtEcmFnTWFyazR9XG4gICAgICAgICAgICAgICAge0RyYWdNYXJrNX1cbiAgICAgICAgICAgICAgICB7RHJhZ01hcmsxfVxuICAgICAgICAgICAgICAgIHtEcmFnTWFyazJ9XG4gICAgICAgICAgICAgICAge0RyYWdNYXJrM31cbiAgICAgICAgICAgIDwvTWFya0NvbnRleHQ+XG4gICAgICAgIDwvc3ZnPlxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEcmFnQW5kRHJvcEV4YW1wbGVcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBNYXJrIH0gZnJvbSAnc2VtaW90aWMnO1xuXG5jbGFzcyBNYXJrRXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgIH1cblxuICAgIHJlbmRlciAoKSB7XG4gICAgICAgIGNvbnN0IG1hcmsgPSA8TWFya1xuICAgICAgICAgICAgbWFya1R5cGU9XCJyZWN0XCJcbiAgICAgICAgICAgIHdpZHRoPXsxMDB9XG4gICAgICAgICAgICBoZWlnaHQ9ezEwMH1cbiAgICAgICAgICAgIHg9ezI1fVxuICAgICAgICAgICAgeT17MjV9XG4gICAgICAgICAgICBkcmFnZ2FibGU9e3RydWV9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcIiMwMGEyY2VcIiwgc3Ryb2tlOiBcImJsdWVcIiwgc3Ryb2tlV2lkdGg6IFwiMXB4XCIgfX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgY29uc3QgY2lyY2xlTWFyayA9IDxNYXJrXG4gICAgICAgICAgICBtYXJrVHlwZT1cImNpcmNsZVwiXG4gICAgICAgICAgICByZW5kZXJNb2RlPVwiZm9yY2VQYXRoXCJcbiAgICAgICAgICAgIHI9ezUwfVxuICAgICAgICAgICAgY3g9ezIwNX1cbiAgICAgICAgICAgIGN5PXsyNTV9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcIiMwMGEyY2VcIiwgc3Ryb2tlOiBcImJsdWVcIiwgc3Ryb2tlV2lkdGg6IFwiMXB4XCIgfX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgY29uc3QgcmVzZXRNYXJrID0gPE1hcmtcbiAgICAgICAgICAgIG1hcmtUeXBlPVwicmVjdFwiXG4gICAgICAgICAgICB3aWR0aD17MTAwfVxuICAgICAgICAgICAgaGVpZ2h0PXsxMDB9XG4gICAgICAgICAgICB4PXsyNX1cbiAgICAgICAgICAgIHk9ezEzNX1cbiAgICAgICAgICAgIGRyYWdnYWJsZT17dHJ1ZX1cbiAgICAgICAgICAgIHJlc2V0QWZ0ZXI9e3RydWV9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcIiM0ZDQzMGNcIiB9fVxuICAgICAgICAgICAgLz5cblxuICAgICAgICBjb25zdCB2ZXJ0aWNhbEJhck1hcmsgPSA8TWFya1xuICAgICAgICAgICAgbWFya1R5cGU9XCJ2ZXJ0aWNhbGJhclwiXG4gICAgICAgICAgICB3aWR0aD17NTB9XG4gICAgICAgICAgICBoZWlnaHQ9ezEwMH1cbiAgICAgICAgICAgIHg9ezE4NX1cbiAgICAgICAgICAgIHk9ezE1MH1cbiAgICAgICAgICAgIHN0eWxlPXt7IGZpbGw6IFwiI2IzMzMxZFwiIH19XG4gICAgICAgICAgICAvPlxuXG4gICAgICAgIGNvbnN0IGhvcml6b250YWxCYXJNYXJrID0gPE1hcmtcbiAgICAgICAgICAgIG1hcmtUeXBlPVwiaG9yaXpvbnRhbGJhclwiXG4gICAgICAgICAgICB3aWR0aD17NTB9XG4gICAgICAgICAgICBoZWlnaHQ9ezEwMH1cbiAgICAgICAgICAgIHg9ezE4NX1cbiAgICAgICAgICAgIHk9ezE1MH1cbiAgICAgICAgICAgIHN0eWxlPXt7IGZpbGw6IFwiI2I2YTc1NlwiIH19XG4gICAgICAgICAgICAvPlxuXG4gICAgICAgIGNvbnN0IHNrZXRjaHlNYXJrID0gPE1hcmtcbiAgICAgICAgICAgIG1hcmtUeXBlPVwicmVjdFwiXG4gICAgICAgICAgICByZW5kZXJNb2RlPVwic2tldGNoeVwiXG4gICAgICAgICAgICB3aWR0aD17MTAwfVxuICAgICAgICAgICAgaGVpZ2h0PXsxMDB9XG4gICAgICAgICAgICB4PXsyNX1cbiAgICAgICAgICAgIHk9ezI1MH1cbiAgICAgICAgICAgIHN0eWxlPXt7IGZpbGw6IFwiI2I4NjExN1wiLCBzdHJva2U6IFwiI2I4NjExN1wiLCBzdHJva2VXaWR0aDogXCI0cHhcIiB9fVxuICAgICAgICAgICAgLz5cblxuICAgICAgICByZXR1cm4gPHN2ZyBoZWlnaHQ9XCIzNjVcIiB3aWR0aD1cIjUwMFwiPlxuICAgICAgICAgICAge21hcmt9XG4gICAgICAgICAgICB7Y2lyY2xlTWFya31cbiAgICAgICAgICAgIHtyZXNldE1hcmt9XG4gICAgICAgICAgICB7c2tldGNoeU1hcmt9XG4gICAgICAgICAgICB7aG9yaXpvbnRhbEJhck1hcmt9XG4gICAgICAgICAgICB7dmVydGljYWxCYXJNYXJrfVxuICAgICAgICA8L3N2Zz5cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTWFya0V4YW1wbGVzXG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBPUkZyYW1lLCBmdW5uZWxpemUgfSBmcm9tICdzZW1pb3RpYyc7XG5pbXBvcnQgeyBzY2FsZUxpbmVhciB9IGZyb20gJ2QzLXNjYWxlJ1xuXG4vLyBjb25zdCBkM2NvbG9ycyA9IGQzLnNjYWxlLmNhdGVnb3J5MjBjKClcblxuY29uc3QgY29sb3JzID0gc2NhbGVMaW5lYXIoKS5kb21haW4oWyAwLDIwLDQwLDYwIF0pLnJhbmdlKFtcbiAgICBcIiMwMGEyY2VcIixcbiAgICBcIiM0ZDQzMGNcIixcbiAgICBcIiNiMzMzMWRcIixcbiAgICBcIiNiNmE3NTZcIlxuXSlcblxuY29uc3QgdGVzdERhdGEgPSBbXVxuZm9yIChsZXQgeD0xO3g8NTt4KyspIHtcbiAgZm9yIChsZXQgeHg9MDt4eDw9NjA7eHgrKykge1xuICAgIHRlc3REYXRhLnB1c2goeyB2YWx1ZTogTWF0aC5yYW5kb20oKSAqIDEwMCArIHh4ICogMiwgY29sdW1uOiBcImNvbHVtblwiK3gsIGNvbG9yOiBjb2xvcnMoeHgpIH0pXG4gIH1cbn1cblxuY29uc3QgZnVubmVsID0gWyB7XG4gIGNvbG9yOiBcIiMwMGEyY2VcIixcbiAgdmlzaXRzOiAxMDAwLFxuICByZWdpc3RyYXRpb246IDkwMCxcbiAgbW9wOiA1MDAsXG4gIHNpZ251cHM6IDQwMCxcbiAgc3RyZWFtZWQ6IDMwMCxcbiAgcGFpZDogMTAwXG59LHtcbiAgY29sb3I6IFwiI2IzMzMxZFwiLFxuICB2aXNpdHM6IDIwMCxcbiAgcmVnaXN0cmF0aW9uOiAxODAsXG4gIG1vcDogMTcwLFxuICBzaWdudXBzOiAxNjAsXG4gIHN0cmVhbWVkOiAxNTAsXG4gIHBhaWQ6IDE0MFxufSx7XG4gIGNvbG9yOiBcIiNiNmE3NTZcIixcbiAgdmlzaXRzOiAzMDAsXG4gIHJlZ2lzdHJhdGlvbjogMTAwLFxuICBtb3A6IDUwLFxuICBzaWdudXBzOiA1MCxcbiAgc3RyZWFtZWQ6IDUwLFxuICBwYWlkOiA1MFxufSBdXG5cblxuY29uc3QgZnVubmVsRGF0YSA9IGZ1bm5lbGl6ZSh7IGRhdGE6IGZ1bm5lbCwgc3RlcHM6IFsgXCJ2aXNpdHNcIiwgXCJyZWdpc3RyYXRpb25cIiwgXCJtb3BcIiwgXCJzaWdudXBzXCIsIFwic3RyZWFtZWRcIiwgXCJwYWlkXCIgXSwga2V5OiBcImNvbG9yXCIgfSlcblxuY2xhc3MgT1JGcmFtZUNvbm5lY3RvckV4YW1wbGVzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcyl7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHsgcHJvamVjdGlvbjogXCJ2ZXJ0aWNhbFwiLCB0eXBlOiBcInBvaW50XCIsIGNvbHVtbldpZHRoOiBcImZpeGVkXCIsIHJBY2Nlc3NvcjogXCJyZWxhdGl2ZVwiLCByZW5kZXJGbjogXCJub25lXCIsXG4gICAgICAgICAgY29sdW1uRXh0ZW50OiB7IFwiY29sdW1uMVwiOiB1bmRlZmluZWQsIFwiY29sdW1uMlwiOiB1bmRlZmluZWQsIFwiY29sdW1uM1wiOiB1bmRlZmluZWQsIFwiY29sdW1uNFwiOiB1bmRlZmluZWQgfVxuICAgICAgICAgfVxuICAgICAgICB0aGlzLmNoYW5nZVByb2plY3Rpb24gPSB0aGlzLmNoYW5nZVByb2plY3Rpb24uYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZVR5cGUgPSB0aGlzLmNoYW5nZVR5cGUuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZUNXID0gdGhpcy5jaGFuZ2VDVy5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuY2hhbmdlUkFjY2Vzc29yID0gdGhpcy5jaGFuZ2VSQWNjZXNzb3IuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZVJlbmRlckZuID0gdGhpcy5jaGFuZ2VSZW5kZXJGbi5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuYnJ1c2hpbmcgPSB0aGlzLmJydXNoaW5nLmJpbmQodGhpcylcbiAgICB9XG5cbiAgICBjaGFuZ2VQcm9qZWN0aW9uKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IHByb2plY3Rpb246IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgY2hhbmdlVHlwZShlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyB0eXBlOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZUNXKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGNvbHVtbldpZHRoOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZVJBY2Nlc3NvcihlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyByQWNjZXNzb3I6IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgY2hhbmdlUmVuZGVyRm4oZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgcmVuZGVyRm46IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgYnJ1c2hpbmcoZSxjKSB7XG4gICAgICBjb25zdCBjb2x1bW5FeHRlbnQgPSB0aGlzLnN0YXRlLmNvbHVtbkV4dGVudFxuICAgICAgY29sdW1uRXh0ZW50W2NdID0gZVxuICAgICAgdGhpcy5zZXRTdGF0ZShjb2x1bW5FeHRlbnQpXG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3Qgb3V0c2lkZUhhc2ggPSB7fVxuICAgICAgdGVzdERhdGEuZm9yRWFjaChkID0+IHtcbiAgICAgICAgaWYgKCFvdXRzaWRlSGFzaFtkLmNvbG9yXSkge1xuICAgICAgICAgIGlmICh0aGlzLnN0YXRlLmNvbHVtbkV4dGVudFtkLmNvbHVtbl0gJiYgKGQudmFsdWUgPiB0aGlzLnN0YXRlLmNvbHVtbkV4dGVudFtkLmNvbHVtbl1bMF0gfHwgZC52YWx1ZSA8IHRoaXMuc3RhdGUuY29sdW1uRXh0ZW50W2QuY29sdW1uXVsxXSkpIHtcbiAgICAgICAgICAgIG91dHNpZGVIYXNoW2QuY29sb3JdID0gdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgICBjb25zdCBmcmFtZUhlaWdodCA9IDMwMFxuXG4gICAgICAgIGNvbnN0IHR5cGVPcHRpb25zID0gWyBcImJhclwiLCBcInBvaW50XCIsIFwic3dhcm1cIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInR5cGUtb3B0aW9uXCIgKyBkfSBsYWJlbD17ZH0gdmFsdWU9e2R9PntkfTwvb3B0aW9uPilcbiAgICAgICAgY29uc3QgcHJvamVjdGlvbk9wdGlvbnMgPSBbIFwidmVydGljYWxcIiwgXCJob3Jpem9udGFsXCIsIFwicmFkaWFsXCIgXS5tYXAoZCA9PiA8b3B0aW9uIGtleT17XCJwcm9qZWN0aW9uLW9wdGlvblwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG4gICAgICAgIGNvbnN0IGN3T3B0aW9ucyA9IFsgXCJmaXhlZFwiLCBcInJlbGF0aXZlXCIgXS5tYXAoZCA9PiA8b3B0aW9uIGtleT17XCJjdy1vcHRpb25cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuICAgICAgICBjb25zdCByQWNjZXNzb3JPcHRpb25zID0gWyBcInJlbGF0aXZlXCIsIFwiZml4ZWRcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInJBY2Nlc3Nvci1vcHRpb25cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuICAgICAgICBjb25zdCByZW5kZXJGbk9wdGlvbnMgPSBbIFwibm9uZVwiLCBcInNrZXRjaHlcIiwgXCJwYWludHlcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInJlbmRlcmZuLW9wdGlvblwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG5cbiAgICAgICAgY29uc3QgckFjY2Vzc29yID0gdGhpcy5zdGF0ZS5yQWNjZXNzb3IgPT09IFwiZml4ZWRcIiA/ICgpID0+IDEgOiBkID0+IGQuc3RlcFZhbHVlIHx8IGQudmFsdWVcbiAgICAgICAgY29uc3QgY3dGbiA9IHRoaXMuc3RhdGUuY29sdW1uV2lkdGggPT09IFwiZml4ZWRcIiA/IHVuZGVmaW5lZCA6IGQgPT4gZC5zdGVwVmFsdWUgfHwgZC52YWx1ZVxuICAgICAgICBjb25zdCByZUZuID0gdGhpcy5zdGF0ZS5yZW5kZXJGbiA9PT0gXCJub25lXCIgPyB1bmRlZmluZWQgOiAoKSA9PiB0aGlzLnN0YXRlLnJlbmRlckZuXG5cbiAgICAgICAgY29uc3QgYXhpcyA9IHsga2V5OiBcInlBeGlzXCIsIG9yaWVudDogXCJsZWZ0XCIsIGNsYXNzTmFtZTogXCJ5c2NhbGVcIiwgbmFtZTogXCJDb3VudEF4aXNcIiwgdGlja0Zvcm1hdDogKGQpID0+IGQgfVxuXG4gICAgICAgIHJldHVybiA8ZGl2PlxuICAgICAgICAgICAgPGRpdj48c3Bhbj50eXBlPTxzZWxlY3Qgb25DaGFuZ2U9e3RoaXMuY2hhbmdlVHlwZX0+e3R5cGVPcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXY+PHNwYW4+cHJvamVjdGlvbj08c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZVByb2plY3Rpb259Pntwcm9qZWN0aW9uT3B0aW9uc308L3NlbGVjdD48L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICA8ZGl2PjxzcGFuPmNvbHVtbldpZHRoPTxzZWxlY3Qgb25DaGFuZ2U9e3RoaXMuY2hhbmdlQ1d9Pntjd09wdGlvbnN9PC9zZWxlY3Q+PC9zcGFuPjwvZGl2PlxuICAgICAgICAgICAgPGRpdj48c3Bhbj5yQWNjZXNzb3I9PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VSQWNjZXNzb3J9PntyQWNjZXNzb3JPcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXY+PHNwYW4+cmVuZGVyRm49PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VSZW5kZXJGbn0+e3JlbmRlckZuT3B0aW9uc308L3NlbGVjdD48L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICA8T1JGcmFtZVxuICAgICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgICByZW5kZXJGbj17cmVGbn1cbiAgICAgICAgICAgICAgb0xhYmVsPXt0cnVlfVxuICAgICAgICAgICAgICBkYXRhPXtmdW5uZWxEYXRhfVxuICAgICAgICAgICAgICBheGlzPXtheGlzfVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XG4gICAgICAgICAgICAgIHR5cGU9e3RoaXMuc3RhdGUudHlwZX1cbiAgICAgICAgICAgICAgY29ubmVjdG9yVHlwZT17ZCA9PiBkLmZ1bm5lbEtleX1cbiAgICAgICAgICAgICAgY29ubmVjdG9yU3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuc291cmNlLmZ1bm5lbEtleSwgc3Ryb2tlOiBkLnNvdXJjZS5mdW5uZWxLZXkgfX19XG4gICAgICAgICAgICAgIG9BY2Nlc3Nvcj17ZCA9PiBkLnN0ZXBOYW1lfVxuICAgICAgICAgICAgICByQWNjZXNzb3I9e3JBY2Nlc3Nvcn1cbiAgICAgICAgICAgICAgc3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuZnVubmVsS2V5LCBzdHJva2U6IFwiYmxhY2tcIiB9fX1cbiAgICAgICAgICAgICAgaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVxuICAgICAgICAgICAgICBjb2x1bW5XaWR0aD17Y3dGbn1cbiAgICAgICAgICAgICAgbWFyZ2luPXt7IGxlZnQ6IDI1LCB0b3A6IDIwLCBib3R0b206IDI1LCByaWdodDogMCB9fVxuICAgICAgICAgICAgICBvUGFkZGluZz17MzB9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgICAgcmVuZGVyRm49e3JlRm59XG4gICAgICAgICAgICAgIG9MYWJlbD17ZCA9PiA8ZyB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoMCwtMjApXCI+PHJlY3QgaGVpZ2h0PVwiNVwiIHdpZHRoPVwiNVwiIHg9XCItNVwiIHN0eWxlPXt7IGZpbGw6IGQgfX0gLz48dGV4dCB0cmFuc2Zvcm09XCJyb3RhdGUoNDUpXCI+e2R9PC90ZXh0PjwvZz59XG4gICAgICAgICAgICAgIGRhdGE9e3Rlc3REYXRhfVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XG4gICAgICAgICAgICAgIHR5cGU9e3RoaXMuc3RhdGUudHlwZX1cbiAgICAgICAgICAgICAgYXhpcz17YXhpc31cbiAgICAgICAgICAgICAgY29ubmVjdG9yVHlwZT17KGQsaSkgPT4gaX1cbiAgICAgICAgICAgICAgY29ubmVjdG9yU3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuc291cmNlLmNvbG9yLCBzdHJva2U6IGQuc291cmNlLmNvbG9yLCBvcGFjaXR5OiBvdXRzaWRlSGFzaFtkLnNvdXJjZS5jb2xvcl0gPyAwLjEgOiAxIH19fVxuICAgICAgICAgICAgICBjb2x1bW5XaWR0aD17Y3dGbn1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sdW1ufVxuICAgICAgICAgICAgICByQWNjZXNzb3I9e3JBY2Nlc3Nvcn1cbiAgICAgICAgICAgICAgb1BhZGRpbmc9ezcwfVxuICAgICAgICAgICAgICBtYXJnaW49e3sgbGVmdDogNDAsIHJpZ2h0OiAyMCwgdG9wOiAyMCwgYm90dG9tOiA0MCB9fVxuICAgICAgICAgICAgICBzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VXaWR0aDogMSwgb3BhY2l0eTogb3V0c2lkZUhhc2hbZC5jb2xvcl0gPyAwLjEgOiAxIH19fVxuICAgICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICAgIGludGVyYWN0aW9uPXt7IGNvbHVtbnNCcnVzaDogdHJ1ZSwgZW5kOiB0aGlzLmJydXNoaW5nLCBleHRlbnQ6IHRoaXMuc3RhdGUuY29sdW1uRXh0ZW50IH19XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9SRnJhbWVDb25uZWN0b3JFeGFtcGxlcztcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCdcbmltcG9ydCB7IE9SRnJhbWUgfSBmcm9tICdzZW1pb3RpYydcbmltcG9ydCB7IHJhbmRvbU5vcm1hbCB9IGZyb20gJ2QzLXJhbmRvbSdcbmltcG9ydCB7IHN1bSB9IGZyb20gJ2QzLWFycmF5J1xuXG5jb25zdCBjb2xvcnMgPSBbXG4gICAgXCIjMDBhMmNlXCIsXG4gICAgXCIjNGQ0MzBjXCIsXG4gICAgXCIjYjMzMzFkXCIsXG4gICAgXCIjYjZhNzU2XCJcbl1cblxuY29uc3QgdGVzdERhdGEgPSBbXVxuY29uc3QgblJhbmRvID0gcmFuZG9tTm9ybWFsKDUwLCAxNSlcbmZvciAobGV0IHg9MTt4PDUwMDt4KyspIHtcbiAgICB0ZXN0RGF0YS5wdXNoKHsgeDogblJhbmRvKCksIHZhbHVlOiBNYXRoLm1heCgwLCBuUmFuZG8oKSksIGNvbG9yOiBjb2xvcnNbeCU0XSwgdmFsdWUyOiB4IH0pXG59XG5cbmNsYXNzIE9SRnJhbWVTdW1tYXJ5RXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcblxuICAgICAgICBjb25zdCBmcmFtZUhlaWdodCA9IDMwMFxuXG4gICAgICAgIGNvbnN0IGF4aXMgPSB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwibGVmdFwiLCBjbGFzc05hbWU6IFwieXNjYWxlXCIsIG5hbWU6IFwiQ291bnRBeGlzXCIsIHRpY2tGb3JtYXQ6IChkKSA9PiBkIH1cbiAgICAgICAgY29uc3QgYXhpczIgPSB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwicmlnaHRcIiwgY2xhc3NOYW1lOiBcInlzY2FsZVwiLCBuYW1lOiBcIkNvdW50QXhpc1wiLCB0aWNrRm9ybWF0OiAoZCkgPT4gZCB9XG5cbiAgICAgICAgcmV0dXJuIDxkaXY+XG4gICAgICAgICAgICA8T1JGcmFtZVxuICAgICAgICAgICAgICB0aXRsZT17XCJib3hwbG90XCJ9XG4gICAgICAgICAgICAgIG9MYWJlbD17dHJ1ZX1cbiAgICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgICAgZGF0YT17dGVzdERhdGF9XG4gICAgICAgICAgICAgIHR5cGU9e1wic3dhcm1cIn1cbiAgICAgICAgICAgICAgcHJvamVjdGlvbj17XCJ2ZXJ0aWNhbFwifVxuICAgICAgICAgICAgICBzdW1tYXJ5VHlwZT17XCJib3hwbG90XCJ9XG4gICAgICAgICAgICAgIHN1bW1hcnlTdHlsZT17KGQpID0+ICh7IHN0cm9rZTogZC5jb2xvciwgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlT3BhY2l0eTogMC41IH0pfVxuICAgICAgICAgICAgICBvQWNjZXNzb3I9e2QgPT4gZC5jb2xvcn1cbiAgICAgICAgICAgICAgckFjY2Vzc29yPXtkID0+IGQudmFsdWV9XG4gICAgICAgICAgICAgIHN0eWxlPXtkID0+IHtyZXR1cm4geyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IsIHN0cm9rZU9wYWNpdHk6IDAgfX19XG4gICAgICAgICAgICAgIG9QYWRkaW5nPXs1fVxuICAgICAgICAgICAgICBheGlzPXsgYXhpczIgfVxuICAgICAgICAgICAgLz5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8T1JGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0aXRsZT17J2JveHBsb3QnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvTGFiZWw9e3RydWV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImRhdGE9e3Rlc3REYXRhfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0eXBlPXsnc3dhcm0nfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5VHlwZT17J2JveHBsb3QnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VPcGFjaXR5OiAwIH19fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJtYXJnaW49ezMwfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvUGFkZGluZz17NX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiYXhpcz17IGF4aXMgfVwifTwvcD5cbiAgICAgICAgICAgIDxPUkZyYW1lXG4gICAgICAgICAgICAgIHRpdGxlPXtcInZpb2xpblwifVxuICAgICAgICAgICAgICBvTGFiZWw9e3RydWV9XG4gICAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICAgIGRhdGE9e3Rlc3REYXRhfVxuICAgICAgICAgICAgICB0eXBlPXt7IHR5cGU6IFwic3dhcm1cIiwgcjogKGQsaSkgPT4gaSUzICsgMiB9fVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXtcInZlcnRpY2FsXCJ9XG4gICAgICAgICAgICAgIHN1bW1hcnlUeXBlPXtcInZpb2xpblwifVxuICAgICAgICAgICAgICBzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XG4gICAgICAgICAgICAgIHJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVxuICAgICAgICAgICAgICBzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VPcGFjaXR5OiAwIH19fVxuICAgICAgICAgICAgICBvUGFkZGluZz17NX1cbiAgICAgICAgICAgICAgYXhpcz17IGF4aXMgfVxuICAgICAgICAgICAgLz5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8T1JGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0aXRsZT17J3Zpb2xpbid9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9MYWJlbD17dHJ1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiZGF0YT17dGVzdERhdGF9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInR5cGU9eydzd2FybSd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInN1bW1hcnlUeXBlPXsndmlvbGluJ31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3VtbWFyeVN0eWxlPXsoZCkgPT4gKHsgc3Ryb2tlOiBkLmNvbG9yLCBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2VPcGFjaXR5OiAwLjUgfSl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9BY2Nlc3Nvcj17ZCA9PiBkLmNvbG9yfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJyQWNjZXNzb3I9e2QgPT4gZC52YWx1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciwgc3Ryb2tlT3BhY2l0eTogMCB9fX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibWFyZ2luPXszMH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib1BhZGRpbmc9ezV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImF4aXM9eyBheGlzIH1cIn08L3A+XG4gICAgICAgICAgICA8T1JGcmFtZVxuICAgICAgICAgICAgICB0aXRsZT17XCJoZWF0bWFwXCJ9XG4gICAgICAgICAgICAgIHByb2plY3Rpb249e1widmVydGljYWxcIn1cbiAgICAgICAgICAgICAgb0xhYmVsPXt0cnVlfVxuICAgICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgICBzdW1tYXJ5VHlwZT17XCJoZWF0bWFwXCJ9XG4gICAgICAgICAgICAgIGRhdGE9e3Rlc3REYXRhfVxuICAgICAgICAgICAgICBzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XG4gICAgICAgICAgICAgIHJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVxuICAgICAgICAgICAgICBvUGFkZGluZz17NX1cbiAgICAgICAgICAgICAgYXhpcz17IGF4aXMyIH1cbiAgICAgICAgICAgIC8+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiPE9SRnJhbWVcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1widGl0bGU9eydoZWF0bWFwJ31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0xhYmVsPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5VHlwZT17J2hlYXRtYXAnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VPcGFjaXR5OiAwIH19fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJtYXJnaW49ezMwfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvUGFkZGluZz17NX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiYXhpcz17IGF4aXMgfVwifTwvcD5cbiAgICAgICAgICAgIDxPUkZyYW1lXG4gICAgICAgICAgICAgIHRpdGxlPXs8Zz48dGV4dD5oaXN0b2dyYW08L3RleHQ+PC9nPn1cbiAgICAgICAgICAgICAgcHJvamVjdGlvbj17XCJ2ZXJ0aWNhbFwifVxuICAgICAgICAgICAgICBvTGFiZWw9e3RydWV9XG4gICAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICAgIHN1bW1hcnlUeXBlPXtcImhpc3RvZ3JhbVwifVxuICAgICAgICAgICAgICBkYXRhPXt0ZXN0RGF0YX1cbiAgICAgICAgICAgICAgc3VtbWFyeVN0eWxlPXsoZCkgPT4gKHsgc3Ryb2tlOiBkLmNvbG9yLCBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2VPcGFjaXR5OiAwLjUgfSl9XG4gICAgICAgICAgICAgIHN1bW1hcnlWYWx1ZUFjY2Vzc29yPXsoZCkgPT4gc3VtKGQubWFwKHAgPT4gcC52YWx1ZTIpKX1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XG4gICAgICAgICAgICAgIHJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVxuICAgICAgICAgICAgICBvUGFkZGluZz17NX1cbiAgICAgICAgICAgICAgYXhpcz17IGF4aXMgfVxuICAgICAgICAgICAgICByRXh0ZW50PXtbIDEwMCwgMCBdfVxuICAgICAgICAgICAgLz5cbjxwPkZpeGVkIGV4dGVudCB1c2luZyA8c3BhbiBjbGFzc05hbWU9XCJjb2RlXCI+ckV4dGVudDwvc3Bhbj4gYW5kIHZlcnRpY2FsIHByb2plY3Rpb24uPC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIjxPUkZyYW1lXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInRpdGxlPXsnaGlzdG9ncmFtJ31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wicHJvamVjdGlvbj17J3ZlcnRpY2FsJ31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0xhYmVsPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5VHlwZT17J2hpc3RvZ3JhbSd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInN1bW1hcnlTdHlsZT17KGQpID0+ICh7IHN0cm9rZTogZC5jb2xvciwgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlT3BhY2l0eTogMC41IH0pfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5VmFsdWVBY2Nlc3Nvcj17KGQpID0+IHN1bShkLm1hcChwID0+IHAudmFsdWUyKSl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9BY2Nlc3Nvcj17ZCA9PiBkLmNvbG9yfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJyQWNjZXNzb3I9e2QgPT4gZC52YWx1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciwgc3Ryb2tlT3BhY2l0eTogMCB9fX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibWFyZ2luPXszMH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib1BhZGRpbmc9ezV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImF4aXM9eyBheGlzIH1cIn08L3A+XG4gICAgICAgICAgICA8T1JGcmFtZVxuICAgICAgICAgICAgICB0aXRsZT17XCJla2dcIn1cbiAgICAgICAgICAgICAgZGF0YT17dGVzdERhdGF9XG4gICAgICAgICAgICAgIHByb2plY3Rpb249e1widmVydGljYWxcIn1cbiAgICAgICAgICAgICAgb0xhYmVsPXt0cnVlfVxuICAgICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgICBzdW1tYXJ5VHlwZT17XCJla2dcIn1cbiAgICAgICAgICAgICAgc3VtbWFyeVN0eWxlPXsoZCkgPT4gKHsgc3Ryb2tlOiBkLmNvbG9yLCBmaWxsOiBcIm5vbmVcIiwgc3Ryb2tlT3BhY2l0eTogMC41IH0pfVxuICAgICAgICAgICAgICBvQWNjZXNzb3I9e2QgPT4gZC5jb2xvcn1cbiAgICAgICAgICAgICAgckFjY2Vzc29yPXtkID0+IGQudmFsdWV9XG4gICAgICAgICAgICAgIG9QYWRkaW5nPXs1fVxuICAgICAgICAgICAgICBheGlzPXsgYXhpcyB9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPHA+VGhlICdla2cnIHN1bW1hcnlUeXBlIGlzIGp1c3QgaGFsZiBhIHZpb2xpbiBwbG90LiBIZXJlIGl0IGlzIHdpdGggYSB2ZXJ0aWNhbCBwcm9qZWN0aW9uLjwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8T1JGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0aXRsZT17J2VrZyd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInByb2plY3Rpb249eyd2ZXJ0aWNhbCd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9MYWJlbD17dHJ1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3VtbWFyeVR5cGU9eydla2cnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VPcGFjaXR5OiAwIH19fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJtYXJnaW49ezMwfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvUGFkZGluZz17NX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiYXhpcz17IGF4aXMgfVwifTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBPUkZyYW1lU3VtbWFyeUV4YW1wbGVzO1xuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0J1xuaW1wb3J0IHsgT1JGcmFtZSwgZnVubmVsaXplIH0gZnJvbSAnc2VtaW90aWMnO1xuLy9pbXBvcnQgZDMgZnJvbSAnZDMnXG5cbi8vIGNvbnN0IGQzY29sb3JzID0gZDMuc2NhbGUuY2F0ZWdvcnkyMGMoKVxuXG5jb25zdCBjb2xvcnMgPSBbXG4gICAgXCIjMDBhMmNlXCIsXG4gICAgXCIjNGQ0MzBjXCIsXG4gICAgXCIjYjMzMzFkXCIsXG4gICAgXCIjYjZhNzU2XCIsXG4gICAgXCIjMDBhMmNlXCIsXG4gICAgXCIjNGQ0MzBjXCIsXG4gICAgXCIjYjMzMzFkXCJcbl1cbmNvbnN0IHRlc3REYXRhID0gW11cbmZvciAobGV0IHg9MTt4PDEwMDt4KyspIHtcbiAgICB0ZXN0RGF0YS5wdXNoKHsgdmFsdWU6IE1hdGgucmFuZG9tKCkgKiAxMDAsIGNvbG9yOiBjb2xvcnNbeCU0XSB9KVxufVxuXG5jb25zdCBmdW5uZWwgPSBbIHtcbiAgY29sb3I6IFwiIzAwYTJjZVwiLFxuICB2aXNpdHM6IDEwMDAsXG4gIHJlZ2lzdHJhdGlvbjogOTAwLFxuICBtb3A6IDUwMCxcbiAgc2lnbnVwczogNDAwLFxuICBzdHJlYW1lZDogMzAwLFxuICBwYWlkOiAxMDBcbn0se1xuICBjb2xvcjogXCIjYjMzMzFkXCIsXG4gIHZpc2l0czogMjAwLFxuICByZWdpc3RyYXRpb246IDE4MCxcbiAgbW9wOiAxNzAsXG4gIHNpZ251cHM6IDE2MCxcbiAgc3RyZWFtZWQ6IDE1MCxcbiAgcGFpZDogMTQwXG59LHtcbiAgY29sb3I6IFwiI2I2YTc1NlwiLFxuICB2aXNpdHM6IDMwMCxcbiAgcmVnaXN0cmF0aW9uOiAxMDAsXG4gIG1vcDogNTAsXG4gIHNpZ251cHM6IDUwLFxuICBzdHJlYW1lZDogNTAsXG4gIHBhaWQ6IDUwXG59IF1cblxuY29uc3Qgc3RhY2tlZFBpZURhdGEgPSBbXG4gIHsgcGllOiBcIm9uZVwiLCBjb2xvcjogXCIjMDBhMmNlXCIsIHZhbHVlOiAyNSB9LFxuICB7IHBpZTogXCJvbmVcIiwgY29sb3I6IFwiI2IzMzMxZFwiLCB2YWx1ZTogNzAgfSxcbiAgeyBwaWU6IFwib25lXCIsIGNvbG9yOiBcIiNiNmE3NTZcIiwgdmFsdWU6IDUgfSxcbiAgeyBwaWU6IFwidHdvXCIsIGNvbG9yOiBcIiMwMGEyY2VcIiwgdmFsdWU6IDUwIH0sXG4gIHsgcGllOiBcInR3b1wiLCBjb2xvcjogXCIjYjMzMzFkXCIsIHZhbHVlOiAyMCB9LFxuICB7IHBpZTogXCJ0d29cIiwgY29sb3I6IFwiI2I2YTc1NlwiLCB2YWx1ZTogMzAgfSxcbiAgeyBwaWU6IFwidGhyZWVcIiwgY29sb3I6IFwiIzAwYTJjZVwiLCB2YWx1ZTogOTAgfSxcbiAgeyBwaWU6IFwidGhyZWVcIiwgY29sb3I6IFwiI2IzMzMxZFwiLCB2YWx1ZTogNSB9LFxuICB7IHBpZTogXCJ0aHJlZVwiLCBjb2xvcjogXCIjYjZhNzU2XCIsIHZhbHVlOiA1IH1cbl1cblxuY29uc3Qgc3RhY2tlZFBpZURhdGFXaXRoTmVnYXRpdmVzID0gW1xuICB7IHBpZTogXCJvbmVcIiwgY29sb3I6IFwiIzAwYTJjZVwiLCB2YWx1ZTogMjUgfSxcbiAgeyBwaWU6IFwib25lXCIsIGNvbG9yOiBcIiNiMzMzMWRcIiwgdmFsdWU6IDUwIH0sXG4gIHsgcGllOiBcIm9uZVwiLCBjb2xvcjogXCIjYjZhNzU2XCIsIHZhbHVlOiAxMCB9LFxuICB7IHBpZTogXCJ0d29cIiwgY29sb3I6IFwiIzAwYTJjZVwiLCB2YWx1ZTogLTI1IH0sXG4gIHsgcGllOiBcInR3b1wiLCBjb2xvcjogXCIjYjMzMzFkXCIsIHZhbHVlOiAtNTAgfSxcbiAgeyBwaWU6IFwidHdvXCIsIGNvbG9yOiBcIiNiNmE3NTZcIiwgdmFsdWU6IC0xMCB9LFxuICB7IHBpZTogXCJ0aHJlZVwiLCBjb2xvcjogXCIjMDBhMmNlXCIsIHZhbHVlOiAyNSB9LFxuICB7IHBpZTogXCJ0aHJlZVwiLCBjb2xvcjogXCIjYjMzMzFkXCIsIHZhbHVlOiAtNTAgfSxcbiAgeyBwaWU6IFwidGhyZWVcIiwgY29sb3I6IFwiI2I2YTc1NlwiLCB2YWx1ZTogMTAgfVxuXVxuXG5jb25zdCBmdW5uZWxEYXRhID0gZnVubmVsaXplKHsgZGF0YTogZnVubmVsLCBzdGVwczogWyBcInZpc2l0c1wiLCBcInJlZ2lzdHJhdGlvblwiLCBcIm1vcFwiLCBcInNpZ251cHNcIiwgXCJzdHJlYW1lZFwiLCBcInBhaWRcIiBdLCBrZXk6IFwiY29sb3JcIiB9KVxuXG5jbGFzcyBPUkZyYW1lUGllY2VFeGFtcGxlcyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpe1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7IHByb2plY3Rpb246IFwidmVydGljYWxcIiwgdHlwZTogXCJiYXJcIiwgY29sdW1uV2lkdGg6IFwiZml4ZWRcIiwgckFjY2Vzc29yOiBcInJlbGF0aXZlXCIsIHJlbmRlckZuOiBcIm5vbmVcIiB9XG4gICAgICAgIHRoaXMuY2hhbmdlUHJvamVjdGlvbiA9IHRoaXMuY2hhbmdlUHJvamVjdGlvbi5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuY2hhbmdlVHlwZSA9IHRoaXMuY2hhbmdlVHlwZS5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuY2hhbmdlQ1cgPSB0aGlzLmNoYW5nZUNXLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy5jaGFuZ2VSQWNjZXNzb3IgPSB0aGlzLmNoYW5nZVJBY2Nlc3Nvci5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuY2hhbmdlUmVuZGVyRm4gPSB0aGlzLmNoYW5nZVJlbmRlckZuLmJpbmQodGhpcylcbiAgICB9XG5cbiAgICBjaGFuZ2VQcm9qZWN0aW9uKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IHByb2plY3Rpb246IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgY2hhbmdlVHlwZShlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyB0eXBlOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZUNXKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGNvbHVtbldpZHRoOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZVJBY2Nlc3NvcihlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyByQWNjZXNzb3I6IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgY2hhbmdlUmVuZGVyRm4oZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgcmVuZGVyRm46IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuXG4gICAgICAgIGNvbnN0IGZyYW1lSGVpZ2h0ID0gMzAwXG5cbiAgICAgICAgY29uc3QgdHlwZU9wdGlvbnMgPSBbIFwiYmFyXCIsIFwicG9pbnRcIiwgXCJzd2FybVwiIF0ubWFwKGQgPT4gPG9wdGlvbiBrZXk9e1widHlwZS1vcHRpb25cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuICAgICAgICBjb25zdCBwcm9qZWN0aW9uT3B0aW9ucyA9IFsgXCJ2ZXJ0aWNhbFwiLCBcImhvcml6b250YWxcIiwgXCJyYWRpYWxcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInByb2plY3Rpb24tb3B0aW9uXCIgKyBkfSBsYWJlbD17ZH0gdmFsdWU9e2R9PntkfTwvb3B0aW9uPilcbiAgICAgICAgY29uc3QgY3dPcHRpb25zID0gWyBcImZpeGVkXCIsIFwicmVsYXRpdmVcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcImN3LW9wdGlvblwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG4gICAgICAgIGNvbnN0IHJBY2Nlc3Nvck9wdGlvbnMgPSBbIFwicmVsYXRpdmVcIiwgXCJmaXhlZFwiIF0ubWFwKGQgPT4gPG9wdGlvbiBrZXk9e1wickFjY2Vzc29yLW9wdGlvblwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG4gICAgICAgIGNvbnN0IHJlbmRlckZuT3B0aW9ucyA9IFsgXCJub25lXCIsIFwic2tldGNoeVwiLCBcInBhaW50eVwiIF0ubWFwKGQgPT4gPG9wdGlvbiBrZXk9e1wicmVuZGVyZm4tb3B0aW9uXCIgKyBkfSBsYWJlbD17ZH0gdmFsdWU9e2R9PntkfTwvb3B0aW9uPilcblxuICAgICAgICBjb25zdCByQWNjZXNzb3IgPSB0aGlzLnN0YXRlLnJBY2Nlc3NvciA9PT0gXCJmaXhlZFwiID8gKCkgPT4gMSA6IGQgPT4gZC5zdGVwVmFsdWUgfHwgZC52YWx1ZVxuICAgICAgICBjb25zdCBjd0ZuID0gdGhpcy5zdGF0ZS5jb2x1bW5XaWR0aCA9PT0gXCJmaXhlZFwiID8gdW5kZWZpbmVkIDogZCA9PiBkLnN0ZXBWYWx1ZSB8fCBkLnZhbHVlXG4gICAgICAgIGNvbnN0IHJlRm4gPSB0aGlzLnN0YXRlLnJlbmRlckZuID09PSBcIm5vbmVcIiA/IHVuZGVmaW5lZCA6ICgpID0+IHRoaXMuc3RhdGUucmVuZGVyRm5cblxuICAgICAgICBjb25zdCBheGlzID0geyBrZXk6IFwieUF4aXNcIiwgb3JpZW50OiBcImxlZnRcIiwgY2xhc3NOYW1lOiBcInlzY2FsZVwiLCBuYW1lOiBcIkNvdW50QXhpc1wiLCB0aWNrRm9ybWF0OiAoZCkgPT4gZCB9XG4gICAgICAgIGNvbnN0IGF4aXNSaWdodCA9IHsga2V5OiBcInlBeGlzXCIsIG9yaWVudDogXCJyaWdodFwiLCBjbGFzc05hbWU6IFwieXNjYWxlXCIsIG5hbWU6IFwiQ291bnRBeGlzXCIsIHRpY2tGb3JtYXQ6IChkKSA9PiBkIH1cblxuICAgICAgICByZXR1cm4gPGRpdj5cbiAgICAgICAgICAgIDxkaXY+PHNwYW4+dHlwZT08c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZVR5cGV9Pnt0eXBlT3B0aW9uc308L3NlbGVjdD48L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICA8ZGl2PjxzcGFuPnByb2plY3Rpb249PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VQcm9qZWN0aW9ufT57cHJvamVjdGlvbk9wdGlvbnN9PC9zZWxlY3Q+PC9zcGFuPjwvZGl2PlxuICAgICAgICAgICAgPGRpdj48c3Bhbj5jb2x1bW5XaWR0aD08c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZUNXfT57Y3dPcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXY+PHNwYW4+ckFjY2Vzc29yPTxzZWxlY3Qgb25DaGFuZ2U9e3RoaXMuY2hhbmdlUkFjY2Vzc29yfT57ckFjY2Vzc29yT3B0aW9uc308L3NlbGVjdD48L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICA8ZGl2PjxzcGFuPnJlbmRlckZuPTxzZWxlY3Qgb25DaGFuZ2U9e3RoaXMuY2hhbmdlUmVuZGVyRm59PntyZW5kZXJGbk9wdGlvbnN9PC9zZWxlY3Q+PC9zcGFuPjwvZGl2PlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgdGl0bGU9e1widGl0bGVcIn1cbiAgICAgICAgICAgICAgcmVuZGVyRm49e3JlRm59XG4gICAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICAgIHByb2plY3Rpb249e3RoaXMuc3RhdGUucHJvamVjdGlvbn1cbiAgICAgICAgICAgICAgdHlwZT17dGhpcy5zdGF0ZS50eXBlfVxuICAgICAgICAgICAgICBkYXRhPXtbIDEwLCA0LCA4LCAzLCA1LCA3IF19XG4gICAgICAgICAgICAgIG9QYWRkaW5nPXs1fVxuICAgICAgICAgICAgICBtYXJnaW49ezIwfVxuICAgICAgICAgICAgICBzdHlsZT17KGQsaSkgPT4ge3JldHVybiB7IGZpbGw6IGNvbG9yc1tpXSwgc3Ryb2tlOiBcImJsYWNrXCIgfX19XG4gICAgICAgICAgICAgIGhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cbiAgICAgICAgICAgIC8+XG48cD48Yj5CYXNpYyBiYXIgY2hhcnQ8L2I+PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImNvbnN0IGNvbG9ycyA9IFsnIzAwYTJjZScsJyM0ZDQzMGMnLCcjYjMzMzFkJywnI2I2YTc1NicsJyMwMGEyY2UnLCcjNGQ0MzBjJywnI2IzMzMxZCddXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIjxPUkZyYW1lXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInRpdGxlPXsndGl0bGUnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJkYXRhPXtbIDEwLCA0LCA4LCAzLCA1LCA3IF19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9QYWRkaW5nPXs1fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJtYXJnaW49ezIwfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17KGQsaSkgPT4ge3JldHVybiB7IGZpbGw6IGNvbG9yc1tpXSwgc3Ryb2tlOiAnYmxhY2snIH19fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJob3ZlckFubm90YXRpb249e3RydWV9XCJ9PC9wPlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgICAgcmVuZGVyRm49e3JlRm59XG4gICAgICAgICAgICAgIGRhdGE9e2Z1bm5lbERhdGF9XG4gICAgICAgICAgICAgIGF4aXM9e2F4aXN9XG4gICAgICAgICAgICAgIHByb2plY3Rpb249e3RoaXMuc3RhdGUucHJvamVjdGlvbn1cbiAgICAgICAgICAgICAgdHlwZT17dGhpcy5zdGF0ZS50eXBlfVxuICAgICAgICAgICAgICBvQWNjZXNzb3I9e2QgPT4gZC5zdGVwTmFtZX1cbiAgICAgICAgICAgICAgckFjY2Vzc29yPXtyQWNjZXNzb3J9XG4gICAgICAgICAgICAgIHN0eWxlPXtkID0+IHtyZXR1cm4geyBmaWxsOiBkLmZ1bm5lbEtleSwgc3Ryb2tlOiBcImJsYWNrXCIgfX19XG4gICAgICAgICAgICAgIGhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cbiAgICAgICAgICAgICAgY29sdW1uV2lkdGg9e3RoaXMuc3RhdGUuckFjY2Vzc29yID09PSBcImZpeGVkXCIgPyBkID0+IGQuc3RlcFZhbHVlIDogdW5kZWZpbmVkfVxuICAgICAgICAgICAgICBtYXJnaW49e3sgbGVmdDogMjUsIHRvcDogMCwgYm90dG9tOiAyNSwgcmlnaHQ6IDAgfX1cbiAgICAgICAgICAgIC8+XG48cD48Yj5TdGFja2VkPC9iPjwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8T1JGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJkYXRhPXtmdW5uZWxEYXRhfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvTGFiZWw9e3RydWV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImF4aXM9e2F4aXN9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInByb2plY3Rpb249e3RoaXMuc3RhdGUucHJvamVjdGlvbn1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1widHlwZT17dGhpcy5zdGF0ZS50eXBlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvQWNjZXNzb3I9e2QgPT4gZC5zdGVwTmFtZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wickFjY2Vzc29yPXtkID0+IGQuc3RlcFZhbHVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5mdW5uZWxLZXksIHN0cm9rZTogJ2JsYWNrJyB9fX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJjb2x1bW5XaWR0aD17dGhpcy5zdGF0ZS5jb2x1bW5XaWR0aH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibWFyZ2luPXt7IGxlZnQ6IDEwLCB0b3A6IDAsIGJvdHRvbTogMCwgcmlnaHQ6IDAgfX1cIn08L3A+XG4gICAgICAgICAgICA8T1JGcmFtZVxuICAgICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgICByZW5kZXJGbj17cmVGbn1cbiAgICAgICAgICAgICAgZGF0YT17c3RhY2tlZFBpZURhdGFXaXRoTmVnYXRpdmVzfVxuICAgICAgICAgICAgICBheGlzPXtheGlzfVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XG4gICAgICAgICAgICAgIHR5cGU9e3RoaXMuc3RhdGUudHlwZX1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQucGllfVxuICAgICAgICAgICAgICByQWNjZXNzb3I9e3JBY2Nlc3Nvcn1cbiAgICAgICAgICAgICAgc3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuY29sb3IsIHN0cm9rZTogXCJibGFja1wiIH19fVxuICAgICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICAgIGNvbHVtbldpZHRoPXt0aGlzLnN0YXRlLnJBY2Nlc3NvciA9PT0gXCJmaXhlZFwiID8gZCA9PiBkLnN0ZXBWYWx1ZSA6IHVuZGVmaW5lZH1cbiAgICAgICAgICAgICAgbWFyZ2luPXt7IGxlZnQ6IDI1LCB0b3A6IDAsIGJvdHRvbTogMjUsIHJpZ2h0OiAwIH19XG4gICAgICAgICAgICAvPlxuPHA+PGI+U3RhY2tlZDwvYj48L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiPE9SRnJhbWVcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiZGF0YT17ZnVubmVsRGF0YX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0xhYmVsPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJheGlzPXtheGlzfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInR5cGU9e3RoaXMuc3RhdGUudHlwZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuc3RlcE5hbWV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnN0ZXBWYWx1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuZnVubmVsS2V5LCBzdHJva2U6ICdibGFjaycgfX19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiY29sdW1uV2lkdGg9e3RoaXMuc3RhdGUuY29sdW1uV2lkdGh9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm1hcmdpbj17eyBsZWZ0OiAxMCwgdG9wOiAwLCBib3R0b206IDAsIHJpZ2h0OiAwIH19XCJ9PC9wPlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgICAgcmVuZGVyRm49e3JlRm59XG4gICAgICAgICAgICAgIG9MYWJlbD17ZCA9PiA8ZyB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoMCwtMjApXCI+PHJlY3QgaGVpZ2h0PVwiNVwiIHdpZHRoPVwiNVwiIHg9XCItNVwiIHN0eWxlPXt7IGZpbGw6IGQgfX0gLz48dGV4dCB0cmFuc2Zvcm09XCJyb3RhdGUoNDUpXCI+e2R9PC90ZXh0PjwvZz59XG4gICAgICAgICAgICAgIGRhdGE9e3Rlc3REYXRhfVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XG4gICAgICAgICAgICAgIHR5cGU9e3RoaXMuc3RhdGUudHlwZX1cbiAgICAgICAgICAgICAgYXhpcz17YXhpc31cbiAgICAgICAgICAgICAgY29sdW1uV2lkdGg9e2N3Rm59XG4gICAgICAgICAgICAgIG9BY2Nlc3Nvcj17ZCA9PiBkLmNvbG9yfVxuICAgICAgICAgICAgICByQWNjZXNzb3I9e3JBY2Nlc3Nvcn1cbiAgICAgICAgICAgICAgb1BhZGRpbmc9ezV9XG4gICAgICAgICAgICAgIG1hcmdpbj17eyBsZWZ0OiA0MCwgcmlnaHQ6IDIwLCB0b3A6IDIwLCBib3R0b206IDQwIH19XG4gICAgICAgICAgICAgIHN0eWxlPXtkID0+IHtyZXR1cm4geyBmaWxsOiBkLmNvbG9yLCBzdHJva2U6IGQuY29sb3IgfX19XG4gICAgICAgICAgICAgIGhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cbiAgICAgICAgICAgIC8+XG48cD48Yj5DdXN0b20gTGFiZWxpbmc8L2I+PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIjxPUkZyYW1lXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImRhdGE9e3Rlc3REYXRhfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvTGFiZWw9e2QgPT4gPGc+PHJlY3QgaGVpZ2h0PSc1JyB3aWR0aD0nNScgeD0nLTUnIHN0eWxlPXt7IGZpbGw6IGQgfX0gLz48dGV4dCB0cmFuc2Zvcm09J3JvdGF0ZSg0NSknPntkfTwvdGV4dD48L2c+fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJheGlzPXtheGlzfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInR5cGU9e3RoaXMuc3RhdGUudHlwZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgc3Ryb2tlOiBkLmNvbG9yIH19fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJob3ZlckFubm90YXRpb249e3RydWV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImNvbHVtbldpZHRoPXt0aGlzLnN0YXRlLmNvbHVtbldpZHRofVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvUGFkZGluZz17NX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibWFyZ2luPXsgbGVmdDogMjAsIHJpZ2h0OiAyMCwgdG9wOiAyMCwgYm90dG9tOiA0MCB9XCJ9PC9wPlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgc2l6ZT17WyA1MDAsIGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICAgIHJlbmRlckZuPXtyZUZufVxuICAgICAgICAgICAgICBvTGFiZWw9e3RydWV9XG4gICAgICAgICAgICAgIGRhdGE9e3N0YWNrZWRQaWVEYXRhLmZpbHRlcihkID0+IGQucGllID09PSBcInR3b1wiKX1cbiAgICAgICAgICAgICAgb1BhZGRpbmc9ezV9XG4gICAgICAgICAgICAgIGF4aXM9e2F4aXNSaWdodH1cbiAgICAgICAgICAgICAgbWFyZ2luPXsyMH1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XG4gICAgICAgICAgICAgIHByb2plY3Rpb249e3RoaXMuc3RhdGUucHJvamVjdGlvbn1cbiAgICAgICAgICAgICAgdHlwZT17dGhpcy5zdGF0ZS50eXBlfVxuICAgICAgICAgICAgICBjb2x1bW5XaWR0aD17Y3dGbn1cbiAgICAgICAgICAgICAgckFjY2Vzc29yPXtyQWNjZXNzb3J9XG4gICAgICAgICAgICAgIHN0eWxlPXtkID0+IHtyZXR1cm4geyBmaWxsOiBkLmNvbG9yLCBzdHJva2U6IFwiYmxhY2tcIiB9fX1cbiAgICAgICAgICAgICAgaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVxuICAgICAgICAgICAgLz5cbjxwPjxiPlJpZ2h0LWhhbmQgQXhpczwvYj48L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiPE9SRnJhbWVcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3RhY2tlZFBpZURhdGEuZmlsdGVyKGQgPT4gZC5waWUgPT09ICd0d28nKVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvTGFiZWw9e3RydWV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImF4aXM9e2F4aXNSaWdodH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wicHJvamVjdGlvbj17dGhpcy5zdGF0ZS5wcm9qZWN0aW9ufVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0eXBlPXt0aGlzLnN0YXRlLnR5cGV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9BY2Nlc3Nvcj17ZCA9PiBkLmNvbG9yfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJyQWNjZXNzb3I9e2QgPT4gZC52YWx1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuY29sb3IsIHN0cm9rZTogJ2JsYWNrJyB9fX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJjb2x1bW5XaWR0aD17dGhpcy5zdGF0ZS5jb2x1bW5XaWR0aH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib1BhZGRpbmc9ezV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm1hcmdpbj17MjB9XCJ9PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9SRnJhbWVQaWVjZUV4YW1wbGVzO1xuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0J1xuaW1wb3J0IHsgWFlGcmFtZSB9IGZyb20gJ3NlbWlvdGljJztcbmltcG9ydCB7IGN1cnZlQ2FyZGluYWwgfSBmcm9tICdkMy1zaGFwZSdcblxuY29uc3QgdGVzdERhdGEgPSBbXG4gICAgeyBpZDogXCJsaW5lZGF0YS0xXCIsIGNvbG9yOiBcIiMwMGEyY2VcIiwgZGF0YTogWyB7IHk6IDUsIHg6IDEgfSwgeyB5OiA3LCB4OiAyIH0sIHsgeTogNywgeDogMyB9LCB7IHk6IDQsIHg6IDQgfSwgeyB5OiAyLCB4OiA1IH0sIHsgeTogMywgeDogNiB9LCB7IHk6IDUsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS0yXCIsIGNvbG9yOiBcIiM0ZDQzMGNcIiwgZGF0YTogWyB7IHk6IDEsIHg6IDEgfSwgeyB5OiA2LCB4OiAyIH0sIHsgeTogOCwgeDogMyB9LCB7IHk6IDYsIHg6IDQgfSwgeyB5OiA0LCB4OiA1IH0sIHsgeTogMiwgeDogNiB9LCB7IHk6IDAsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS0zXCIsIGNvbG9yOiBcIiNiMzMzMWRcIiwgZGF0YTogWyB7IHk6IDEwLCB4OiAxIH0sIHsgeTogOCwgeDogMiB9LCB7IHk6IDIsIHg6IDMgfSwgeyB5OiAzLCB4OiA0IH0sIHsgeTogMywgeDogNSB9LCB7IHk6IDQsIHg6IDYgfSwgeyB5OiA0LCB4OiA3IH0gXSB9LFxuICAgIHsgaWQ6IFwibGluZWRhdGEtNFwiLCBjb2xvcjogXCIjYjZhNzU2XCIsIGRhdGE6IFsgeyB5OiA2LCB4OiAxIH0sIHsgeTogMywgeDogMiB9LCB7IHk6IDMsIHg6IDMgfSwgeyB5OiA1LCB4OiA0IH0sIHsgeTogNiwgeDogNSB9LCB7IHk6IDYsIHg6IDYgfSwgeyB5OiA2LCB4OiA3IH0gXSB9XG5dXG5cbmNsYXNzIE5hbWVGb3JtIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICBzdXBlcihwcm9wcyk7XG4gICAgdGhpcy5zdGF0ZSA9IHsgdmFsdWU6ICcnLCB0eXBlOiBcInhcIiB9O1xuICAgIHRoaXMuaGFuZGxlQ2hhbmdlID0gdGhpcy5oYW5kbGVDaGFuZ2UuYmluZCh0aGlzKTtcbiAgICB0aGlzLmNoYW5nZVR5cGUgPSB0aGlzLmNoYW5nZVR5cGUuYmluZCh0aGlzKTtcbiAgICB0aGlzLmhhbmRsZVN1Ym1pdCA9IHRoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyk7XG4gIH1cblxuICBoYW5kbGVDaGFuZ2UoZXZlbnQpIHtcbiAgICB0aGlzLnNldFN0YXRlKHsgdmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZSB9KTtcbiAgfVxuXG4gIGNoYW5nZVR5cGUoZXZlbnQpIHtcbiAgICB0aGlzLnNldFN0YXRlKHsgdHlwZTogZXZlbnQudGFyZ2V0LnZhbHVlIH0pO1xuICB9XG5cbiAgaGFuZGxlU3VibWl0KGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAvL1lvdSBjb3VsZCBhbHNvIG11dGF0ZSB0aGUgZXhpc3RpbmcgYW5ub3RhdGlvblxuICAgIC8vdGhpcy5wcm9wcy51cGRhdGVBbm5vdGF0aW9ucyhPYmplY3QuYXNzaWduKHRoaXMucHJvcHMuZGF0YVBvaW50LCB7IHR5cGU6IFwieFwiLCBsYWJlbDogdGhpcy5zdGF0ZS52YWx1ZSB9KSlcbiAgICB0aGlzLnByb3BzLnVwZGF0ZUFubm90YXRpb25zKE9iamVjdC5hc3NpZ24oe30sIHRoaXMucHJvcHMuZGF0YVBvaW50LCB7IHR5cGU6IHRoaXMuc3RhdGUudHlwZSwgbGFiZWw6IHRoaXMuc3RhdGUudmFsdWUgfSkpXG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgcmV0dXJuIDxmb3JtIHN0eWxlPXt7IGJhY2tncm91bmQ6IFwiI0RERERERFwiIH19IG9uU3VibWl0PXt0aGlzLmhhbmRsZVN1Ym1pdH0+XG4gICAgICAgIDxwPnt0aGlzLnByb3BzLmRhdGFQb2ludC54fSx7dGhpcy5wcm9wcy5kYXRhUG9pbnQueX08L3A+XG4gICAgICAgIDxwPk5hbWU6PC9wPlxuICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT17dGhpcy5zdGF0ZS52YWx1ZX0gb25DaGFuZ2U9e3RoaXMuaGFuZGxlQ2hhbmdlfSAvPlxuICAgICAgICA8c2VsZWN0IHZhbHVlPXt0aGlzLnN0YXRlLnR5cGV9IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZVR5cGV9PlxuICAgICAgICAgICAgPG9wdGlvbiBsYWJlbD1cInhcIiB2YWx1ZT1cInhcIj5YPC9vcHRpb24+XG4gICAgICAgICAgICA8b3B0aW9uIGxhYmVsPVwieVwiIHZhbHVlPVwieVwiPlk8L29wdGlvbj5cbiAgICAgICAgICAgIDxvcHRpb24gbGFiZWw9XCJ4eVwiIHZhbHVlPVwieHlcIj5YWTwvb3B0aW9uPlxuICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJzdWJtaXRcIiB2YWx1ZT1cIlN1Ym1pdFwiIC8+XG4gICAgICA8L2Zvcm0+XG4gIH1cbn1cblxuXG5jbGFzcyBYWUZyYW1lRXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLmNsaWNrUG9pbnQgPSB0aGlzLmNsaWNrUG9pbnQuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmN1c3RvbUhUTUxSdWxlcyA9IHRoaXMuY3VzdG9tSFRNTFJ1bGVzLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy51cGRhdGVBbm5vdGF0aW9ucyA9IHRoaXMudXBkYXRlQW5ub3RhdGlvbnMuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZUxpbmVUeXBlID0gdGhpcy5jaGFuZ2VMaW5lVHlwZS5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHRoaXMuc3RhdGUgPSB7IGFubm90YXRpb25zOiBbXSwgbGluZVR5cGU6IFwiYnVtcGFyZWFcIiwgYXhpc0Fubm90YXRpb246IHsgdHlwZTogXCJ5XCIsIHk6IDAsIGxhYmVsOiBcImNsaWNrIG9uIGF4aXMgdG8gYWRkIGFuIGFubm90YXRpb25cIiB9IH1cbiAgICB9XG5cbiAgICBjaGFuZ2VMaW5lVHlwZSgpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGxpbmVUeXBlOiB0aGlzLnN0YXRlLmxpbmVUeXBlID09PSBcImJ1bXBhcmVhXCIgPyBcImxpbmVcIiA6IFwiYnVtcGFyZWFcIiB9KTtcbiAgICB9XG5cbiAgICBjbGlja1BvaW50KGQpIHtcbiAgICAgICAgY29uc3QgZm9ybWxlc3NBbm5vdGF0aW9ucyA9IHRoaXMuc3RhdGUuYW5ub3RhdGlvbnMuZmlsdGVyKHAgPT4gcC50eXBlICE9PSBcImZvcm1cIilcbiAgICAgICAgY29uc3QgZm9ybUFubm90YXRpb24gPSBPYmplY3QuYXNzaWduKHsgdHlwZTogXCJmb3JtXCIgfSwgZClcbiAgICAgICAgZm9ybWxlc3NBbm5vdGF0aW9ucy5wdXNoKGZvcm1Bbm5vdGF0aW9uKVxuICAgICAgICB0aGlzLnNldFN0YXRlKHsgYW5ub3RhdGlvbnM6IGZvcm1sZXNzQW5ub3RhdGlvbnMgfSlcbiAgICB9XG5cbiAgICBjdXN0b21IVE1MUnVsZXMoeyBzY3JlZW5Db29yZGluYXRlcywgZCB9KSB7XG4gICAgICAgIGlmIChkLnR5cGUgPT09IFwiZm9ybVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gPGRpdiBzdHlsZT17eyBwb2ludGVyRXZlbnRzOiBcImFsbFwiLCBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLCBsZWZ0OiBzY3JlZW5Db29yZGluYXRlc1swXSwgdG9wOiBzY3JlZW5Db29yZGluYXRlc1sxXSB9fT5cbiAgICAgICAgICAgICAgICA8TmFtZUZvcm0gdXBkYXRlQW5ub3RhdGlvbnM9e3RoaXMudXBkYXRlQW5ub3RhdGlvbnN9IGRhdGFQb2ludD17ZH0gLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICB9XG4gICAgICAgIC8vSWYgeW91IGRvbid0IHJldHVybiBudWxsLCBpdCB3aWxsIHN1cHByZXNzIHRoZSByZXN0IG9mIHlvdXIgSFRNTCBydWxlc1xuICAgICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHVwZGF0ZUFubm90YXRpb25zKG5ld0Fubm90YXRpb24pIHtcbiAgICAgICAgY29uc3QgZm9ybWxlc3NBbm5vdGF0aW9ucyA9IHRoaXMuc3RhdGUuYW5ub3RhdGlvbnMuZmlsdGVyKGQgPT4gZC50eXBlICE9PSBcImZvcm1cIilcbiAgICAgICAgZm9ybWxlc3NBbm5vdGF0aW9ucy5wdXNoKG5ld0Fubm90YXRpb24pXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyBhbm5vdGF0aW9uczogZm9ybWxlc3NBbm5vdGF0aW9ucyB9KVxuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICBjb25zdCBmcmFtZUhlaWdodCA9IDIwMFxuXG4gICAgICAgbGV0IGRpc3BsYXlEYXRhID0gdGVzdERhdGFcblxuICAgICAgIGNvbnN0IGV4YW1wbGVBbm5vdGF0aW9ucyA9IFtcbiAgICAgICAgeyB4OiAzLCB5OiAzLCB0eXBlOiBcInh5XCIsIGxhYmVsOiBcInh5XCIgfSxcbiAgICAgICAgeyB4OiA0LCBpZDogXCJsaW5lZGF0YS0yMjJcIiwgdHlwZTogXCJ4eVwiLCBsYWJlbDogXCJ4eSBJRFwiIH0sXG4gICAgICAgIHsgeDogNCwgaWQ6IFwibGluZWRhdGEtM1wiLCB0eXBlOiBcInh5XCIsIGxhYmVsOiBcInh5IElEXCIgfSxcbiAgICAgICAgeyB0eXBlOiBcImVuY2xvc2VcIiwgcnA6IFwidG9wXCIsIHJkOiAyNSwgY29vcmRpbmF0ZXM6IFsgeyB4OiA2LCBpZDogXCJsaW5lZGF0YS0zXCIgfSwgeyB4OiA2LCBpZDogXCJsaW5lZGF0YS00XCIgfSBdLCBsYWJlbDogXCJlbmNsb3NlIElEXCIgfSxcbiAgICAgICAgeyB4OiAzLCB5OiA5MCwgZHk6IC0zMCwgdHlwZTogXCJ4XCIsIGxhYmVsOiBcInhcIiB9LFxuICAgICAgICB7IHg6IHsgbGluZUlEOiBcImxpbmUtMVwiLCBwb2ludElEOiBcInBvaW50LTE3XCIgfSwgeTogOTAsIGR5OiAtMzAsIHR5cGU6IFwieFwiLCBsYWJlbDogXCJ4XCIgfSxcbiAgICAgICAgeyB4OiAyNDAsIHk6IDMsIHR5cGU6IFwieVwiLCBsYWJlbDogXCJ5XCIgfSxcbiAgICAgICAgeyB0eXBlOiBcImVuY2xvc2VcIiwgcnA6IFwidG9wXCIsIHJkOiAyNSwgY29vcmRpbmF0ZXM6IFsgeyB4OiAxLCB5OiA1IH0sIHsgeDogMiwgeTogOCB9LCB7IHg6IDIsIHk6IDEwIH0gXSwgbGFiZWw6IFwiZW5jbG9zZVwiIH1cbiAgICAgICBdXG5cbiAgICAgIGNvbnN0IGF4ZXMgPSBbXG4gICAgICAgIHsga2V5OiBcInlBeGlzXCIsIG9yaWVudDogXCJsZWZ0XCIsIGNsYXNzTmFtZTogXCJ5c2NhbGVcIiwgbmFtZTogXCJDb3VudEF4aXNcIiwgdGlja0Zvcm1hdDogKGQpID0+IGQgKyBcIiVcIiB9LFxuICAgICAgICB7IGtleTogXCJ4QXhpc1wiLCBvcmllbnQ6IFwiYm90dG9tXCIsIGNsYXNzTmFtZTogXCJ4c2NhbGVcIiwgbmFtZTogXCJUaW1lQXhpc1wiLCB0aWNrVmFsdWVzOiBbIDEsIDIsIDMsIDQsIDUsIDYsIDcgXSwgdGlja0Zvcm1hdDogZCA9PiBkICsgXCIgZGF5XCIgfVxuICAgICAgXVxuXG4gICAgICAgY29uc3QgYWxsQW5ub3RhdGlvbnMgPSBbIC4uLmV4YW1wbGVBbm5vdGF0aW9ucywgLi4udGhpcy5zdGF0ZS5hbm5vdGF0aW9ucyBdXG5cbiAgICAgICAgcmV0dXJuIDxkaXY+XG4gICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e3RoaXMuY2hhbmdlTGluZVR5cGV9PkNoYW5nZSBUeXBlIExpbmU8L2J1dHRvbj5cbiAgICAgICAgICAgIDxYWUZyYW1lXG4gICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgbGluZXM9e2Rpc3BsYXlEYXRhfVxuICAgICAgICAgICAgbGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XG4gICAgICAgICAgICB4QWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgeUFjY2Vzc29yPXtkID0+IGQueX1cbiAgICAgICAgICAgIGxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XG4gICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICBjdXN0b21DbGlja0JlaGF2aW9yPXt0aGlzLmNsaWNrUG9pbnR9XG4gICAgICAgICAgICBhbm5vdGF0aW9ucz17YWxsQW5ub3RhdGlvbnN9XG4gICAgICAgICAgICBodG1sQW5ub3RhdGlvblJ1bGVzPXt0aGlzLmN1c3RvbUhUTUxSdWxlc31cbiAgICAgICAgICAgIGN1c3RvbUxpbmVUeXBlPXt7IHR5cGU6IHRoaXMuc3RhdGUubGluZVR5cGUsIGludGVycG9sYXRvcjogY3VydmVDYXJkaW5hbCwgc29ydDogbnVsbCB9fVxuICAgICAgICAgICAgbWFyZ2luPXsxMH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8WFlGcmFtZVxuICAgICAgICAgICAgdGl0bGU9XCJheGlzQW5ub3RhdGlvbkZ1bmN0aW9uIHNlbmRzIHsgdHlwZSwgdmFsdWUgfVwiXG4gICAgICAgICAgICBzaXplPXtbIDUwMCw0MDAgXX1cbiAgICAgICAgICAgIGxpbmVzPXt0ZXN0RGF0YX1cbiAgICAgICAgICAgIGxpbmVEYXRhQWNjZXNzb3I9e2QgPT4gZC5kYXRhfVxuICAgICAgICAgICAgeEFjY2Vzc29yPXtkID0+IGQueH1cbiAgICAgICAgICAgIHlBY2Nlc3Nvcj17ZCA9PiBkLnl9XG4gICAgICAgICAgICBsaW5lU3R5bGU9e2QgPT4gKHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yIH0pfVxuICAgICAgICAgICAgaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVxuICAgICAgICAgICAgY3VzdG9tTGluZVR5cGU9e1wibGluZVwifVxuICAgICAgICAgICAgYXhlcz17YXhlc31cbiAgICAgICAgICAgIGF4aXNBbm5vdGF0aW9uRnVuY3Rpb249e2QgPT4gdGhpcy5zZXRTdGF0ZSh7IGF4aXNBbm5vdGF0aW9uOiB7IHR5cGU6IGQudHlwZSwgW2QudHlwZV06IGQudmFsdWUsIGxhYmVsOiBcImNsaWNrZWQgYW5ub3RhdGlvblwiIH0gfSl9XG4gICAgICAgICAgICBtYXJnaW49eyA1MCB9XG4gICAgICAgICAgICBhbm5vdGF0aW9ucz17WyB0aGlzLnN0YXRlLmF4aXNBbm5vdGF0aW9uIF19XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFhZRnJhbWVFeGFtcGxlcztcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCdcbmltcG9ydCB7IFhZRnJhbWUgfSBmcm9tICdzZW1pb3RpYyc7XG5pbXBvcnQgeyBjdXJ2ZUJhc2lzLCBjdXJ2ZUNhcmRpbmFsLCBjdXJ2ZUNhdG11bGxSb20sIGN1cnZlTGluZWFyLCBjdXJ2ZU5hdHVyYWwsIGN1cnZlTW9ub3RvbmVYLCBjdXJ2ZVN0ZXAgIH0gZnJvbSAnZDMtc2hhcGUnXG5cbmNvbnN0IHRlc3REYXRhID0gW1xuICAgIHsgaWQ6IFwibGluZWRhdGEtMVwiLCBjb2xvcjogXCIjMDBhMmNlXCIsIGRhdGE6IFsgeyB5OiA1LCB4OiAxIH0sIHsgeTogNywgeDogMiB9LCB7IHk6IDcsIHg6IDMgfSwgeyB5OiA0LCB4OiA0IH0sIHsgeTogMiwgeDogNSB9LCB7IHk6IDMsIHg6IDYgfSwgeyB5OiA1LCB4OiA3IH0gXSB9LFxuICAgIHsgaWQ6IFwibGluZWRhdGEtMlwiLCBjb2xvcjogXCIjNGQ0MzBjXCIsIGRhdGE6IFsgeyB5OiAxLCB4OiAxIH0sIHsgeTogNiwgeDogMiB9LCB7IHk6IDgsIHg6IDMgfSwgeyB5OiA2LCB4OiA0IH0sIHsgeTogNCwgeDogNSB9LCB7IHk6IDIsIHg6IDYgfSwgeyB5OiAwLCB4OiA3IH0gXSB9LFxuICAgIHsgaWQ6IFwibGluZWRhdGEtM1wiLCBjb2xvcjogXCIjYjMzMzFkXCIsIGRhdGE6IFsgeyB5OiAxMCwgeDogMSB9LCB7IHk6IDgsIHg6IDIgfSwgeyB5OiAwLCB4OiAzIH0sIHsgeTogMCwgeDogNCB9LCB7IHk6IDMsIHg6IDUgfSwgeyB5OiA0LCB4OiA2IH0sIHsgeTogNCwgeDogNyB9IF0gfSxcbiAgICB7IGlkOiBcImxpbmVkYXRhLTRcIiwgY29sb3I6IFwiI2I2YTc1NlwiLCBkYXRhOiBbIHsgeTogNiwgeDogMSB9LCB7IHk6IDMsIHg6IDIgfSwgeyB5OiAzLCB4OiAzIH0sIHsgeTogNSwgeDogNCB9LCB7IHk6IDYsIHg6IDUgfSwgeyB5OiA2LCB4OiA2IH0sIHsgeTogNiwgeDogNyB9IF0gfVxuXVxuXG5jbGFzcyBYWUZyYW1lRXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0geyBjdXN0b21MaW5lVHlwZTogXCJkaWZmZXJlbmNlXCIsIGN1cnZlOiBcImN1cnZlQmFzaXNcIiB9XG4gICAgICAgIHRoaXMuY2hhbmdlQ3VzdG9tTGluZVR5cGUgPSB0aGlzLmNoYW5nZUN1c3RvbUxpbmVUeXBlLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy5jaGFuZ2VDdXJ2ZSA9IHRoaXMuY2hhbmdlQ3VydmUuYmluZCh0aGlzKVxuICAgIH1cblxuICAgIGNoYW5nZUN1c3RvbUxpbmVUeXBlKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGN1c3RvbUxpbmVUeXBlOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZUN1cnZlIChlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyBjdXJ2ZTogZS50YXJnZXQudmFsdWUgfSlcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG5cbiAgICAgICAgY29uc3QgZnJhbWVIZWlnaHQgPSAxMDBcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFsgXCJsaW5lXCIsIFwiZGlmZmVyZW5jZVwiLCBcInN0YWNrZWRhcmVhXCIsIFwiYnVtcGxpbmVcIiwgXCJidW1wYXJlYVwiIF1cbiAgICAgICAgICAgIC5tYXAoZCA9PiA8b3B0aW9uIGtleT17XCJsaW5lLW9wdGlvbi1cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuXG4gICAgICAgIGNvbnN0IGN1cnZlT3B0aW9ucyA9IFsgXCJjdXJ2ZUJhc2lzXCIsIFwiY3VydmVDYXJkaW5hbFwiLCBcImN1cnZlQ2F0bXVsbFJvbVwiLCBcImN1cnZlTGluZWFyXCIsIFwiY3VydmVOYXR1cmFsXCIsIFwiY3VydmVNb25vdG9uZVhcIiwgXCJjdXJ2ZVN0ZXBcIiBdXG4gICAgICAgICAgICAubWFwKGQgPT4gPG9wdGlvbiBrZXk9e1wiY3VydmUtb3B0aW9uLVwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG4gICAgICAgIGxldCBkaXNwbGF5RGF0YSA9IHRlc3REYXRhXG5cbiAgICAgICAgY29uc3QgY3VydmVIYXNoID0geyBjdXJ2ZUJhc2lzLCBjdXJ2ZUNhcmRpbmFsLCBjdXJ2ZUNhdG11bGxSb20sIGN1cnZlTGluZWFyLCBjdXJ2ZU5hdHVyYWwsIGN1cnZlTW9ub3RvbmVYLCBjdXJ2ZVN0ZXAgfVxuXG4gICAgICAgIGlmICh0aGlzLnN0YXRlLmN1c3RvbUxpbmVUeXBlID09PSBcImRpZmZlcmVuY2VcIikge1xuICAgICAgICAgICAgZGlzcGxheURhdGEgPSB0ZXN0RGF0YS5maWx0ZXIoKGQsaSkgPT4gaSA8IDIpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gPGRpdj5cbiAgICAgICAgICAgIDxzcGFuPmN1c3RvbUxpbmVUeXBlPTxzZWxlY3Qgb25DaGFuZ2U9e3RoaXMuY2hhbmdlQ3VzdG9tTGluZVR5cGV9PntvcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuPmN1cnZlPHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VDdXJ2ZX0+e2N1cnZlT3B0aW9uc308L3NlbGVjdD48L3NwYW4+XG5cbiAgICAgICAgICAgIDxYWUZyYW1lXG4gICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgbGluZXM9e2Rpc3BsYXlEYXRhfVxuICAgICAgICAgICAgbGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XG4gICAgICAgICAgICB4QWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgeUFjY2Vzc29yPXtkID0+IGQueX1cbiAgICAgICAgICAgIGxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XG4gICAgICAgICAgICBzaG93TGluZVBvaW50cz17dHJ1ZX1cbiAgICAgICAgICAgIGNhbnZhc0xpbmVzPXsoZCxpKSA9PiBpJTIgPT09IDB9XG4gICAgICAgICAgICBjdXN0b21MaW5lVHlwZT17dGhpcy5zdGF0ZS5jdXN0b21MaW5lVHlwZX1cbiAgICAgICAgICAgIG1hcmdpbj17MTB9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPFhZRnJhbWVcbiAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICBsaW5lcz17ZGlzcGxheURhdGF9XG4gICAgICAgICAgICBsaW5lRGF0YUFjY2Vzc29yPXtkID0+IGQuZGF0YX1cbiAgICAgICAgICAgIHhBY2Nlc3Nvcj17ZCA9PiBkLnh9XG4gICAgICAgICAgICB5QWNjZXNzb3I9e2QgPT4gZC55fVxuICAgICAgICAgICAgbGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cbiAgICAgICAgICAgIGNhbnZhc0xpbmVzPXsoZCxpKSA9PiBpJTIgPT09IDB9XG4gICAgICAgICAgICBjdXN0b21MaW5lVHlwZT17eyB0eXBlOiB0aGlzLnN0YXRlLmN1c3RvbUxpbmVUeXBlLCBpbnRlcnBvbGF0b3I6IGN1cnZlSGFzaFt0aGlzLnN0YXRlLmN1cnZlXSwgc29ydDogbnVsbCB9fVxuICAgICAgICAgICAgbWFyZ2luPXsxMH1cbiAgICAgICAgICAgIGRlZmluZWQ9e2QgPT4gZC55ICE9PSAwfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYWUZyYW1lRXhhbXBsZXM7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBYWUZyYW1lIH0gZnJvbSAnc2VtaW90aWMnO1xuXG5jb25zdCB0ZXN0RGF0YSA9IFtcbiAgICB7IGlkOiBcImxpbmVkYXRhLTFcIiwgY29sb3I6IFwiIzAwYTJjZVwiLCBkYXRhOiBbIHsgeTogNSwgeDogMSB9LCB7IHk6IDcsIHg6IDIgfSwgeyB5OiA3LCB4OiAzIH0sIHsgeTogNCwgeDogNCB9LCB7IHk6IDIsIHg6IDUgfSwgeyB5OiAzLCB4OiA2IH0sIHsgeTogNSwgeDogNyB9IF0gfSxcbiAgICB7IGlkOiBcImxpbmVkYXRhLTJcIiwgY29sb3I6IFwiIzRkNDMwY1wiLCBkYXRhOiBbIHsgeTogMSwgeDogMSB9LCB7IHk6IDYsIHg6IDIgfSwgeyB5OiA4LCB4OiAzIH0sIHsgeTogNiwgeDogNCB9LCB7IHk6IDQsIHg6IDUgfSwgeyB5OiAyLCB4OiA2IH0sIHsgeTogMCwgeDogNyB9IF0gfSxcbiAgICB7IGlkOiBcImxpbmVkYXRhLTNcIiwgY29sb3I6IFwiI2IzMzMxZFwiLCBkYXRhOiBbIHsgeTogMTAsIHg6IDEgfSwgeyB5OiA4LCB4OiAyIH0sIHsgeTogMiwgeDogMyB9LCB7IHk6IDMsIHg6IDQgfSwgeyB5OiAzLCB4OiA1IH0sIHsgeTogNCwgeDogNiB9LCB7IHk6IDQsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS00XCIsIGNvbG9yOiBcIiNiNmE3NTZcIiwgZGF0YTogWyB7IHk6IDYsIHg6IDEgfSwgeyB5OiAzLCB4OiAyIH0sIHsgeTogMywgeDogMyB9LCB7IHk6IDUsIHg6IDQgfSwgeyB5OiA2LCB4OiA1IH0sIHsgeTogNiwgeDogNiB9LCB7IHk6IDYsIHg6IDcgfSBdIH1cbl1cblxuY2xhc3MgWFlGcmFtZUV4YW1wbGVzTWlzYyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpe1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuXG4gICAgICAgIGNvbnN0IGZyYW1lSGVpZ2h0ID0gMTAwXG5cbiAgICAgIGNvbnN0IGF4ZXMgPSBbXG4gICAgICAgIHsga2V5OiBcInlBeGlzXCIsIG9yaWVudDogXCJsZWZ0XCIsIGNsYXNzTmFtZTogXCJ5c2NhbGVcIiwgbmFtZTogXCJDb3VudEF4aXNcIiwgdGlja0Zvcm1hdDogKGQpID0+IGQgKyBcIiVcIiB9LFxuICAgICAgICB7IGtleTogXCJ4QXhpc1wiLCBvcmllbnQ6IFwiYm90dG9tXCIsIGNsYXNzTmFtZTogXCJ4c2NhbGVcIiwgbmFtZTogXCJUaW1lQXhpc1wiLCB0aWNrVmFsdWVzOiBbIDEsIDIsIDMsIDQsIDUsIDYsIDcgXSwgdGlja0Zvcm1hdDogZCA9PiBkICsgXCIgZGF5XCIgfVxuICAgICAgXVxuXG5cbiAgICAgICAgcmV0dXJuIDxkaXY+XG4gICAgICAgICAgICA8WFlGcmFtZVxuICAgICAgICAgICAgdGl0bGU9J2xpbmVSZW5kZXJNb2RlPXsoKSA9PiBcInNrZXRjaHlcIn0nXG4gICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgbGluZXM9e3Rlc3REYXRhfVxuICAgICAgICAgICAgbGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XG4gICAgICAgICAgICB4QWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgeUFjY2Vzc29yPXtkID0+IGQueX1cbiAgICAgICAgICAgIGxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XG4gICAgICAgICAgICBjdXN0b21MaW5lVHlwZT17XCJzdGFja2VkYXJlYVwifVxuICAgICAgICAgICAgbGluZVJlbmRlck1vZGU9eygpID0+IFwic2tldGNoeVwifVxuICAgICAgICAgICAgLz5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8IFhZRnJhbWVcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1widGl0bGU9J2xpbmVSZW5kZXJNb2RlPXsoKSA9PiAnc2tldGNoeSd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImxpbmVzPXt0ZXN0RGF0YX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInhBY2Nlc3Nvcj17ZCA9PiBkLnh9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInlBY2Nlc3Nvcj17ZCA9PiBkLnl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImN1c3RvbUxpbmVUeXBlPXsnc3RhY2tlZGFyZWEnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJsaW5lUmVuZGVyTW9kZT17KCkgPT4gJ3NrZXRjaHknfVwifTwvcD5cbiAgICAgICAgICAgIDxYWUZyYW1lXG4gICAgICAgICAgICB0aXRsZT17PGc+PHRleHQ+XCJob3ZlckFubm90YXRpb249e3RydWV9XCI8L3RleHQ+PC9nPn1cbiAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICBsaW5lcz17dGVzdERhdGF9XG4gICAgICAgICAgICBsaW5lRGF0YUFjY2Vzc29yPXtkID0+IGQuZGF0YX1cbiAgICAgICAgICAgIHhBY2Nlc3Nvcj17ZCA9PiBkLnh9XG4gICAgICAgICAgICB5QWNjZXNzb3I9e2QgPT4gZC55fVxuICAgICAgICAgICAgbGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cbiAgICAgICAgICAgIGNhbnZhc0xpbmVzPXsoZCxpKSA9PiBpID4gMX1cbiAgICAgICAgICAgIGN1c3RvbUxpbmVUeXBlPXtcImxpbmVcIn1cbiAgICAgICAgICAgIGhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cbiAgICAgICAgICAgIC8+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiPCBYWUZyYW1lXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInRpdGxlPSdob3ZlckFubm90YXRpb249e3RydWV9J1wifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJsaW5lcz17dGVzdERhdGF9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImxpbmVEYXRhQWNjZXNzb3I9e2QgPT4gZC5kYXRhfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ4QWNjZXNzb3I9e2QgPT4gZC54fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ5QWNjZXNzb3I9e2QgPT4gZC55fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJsaW5lU3R5bGU9e2QgPT4gKHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yIH0pfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJob3ZlckFubm90YXRpb249e3RydWV9XCJ9PC9wPlxuICAgICAgICAgICAgPFhZRnJhbWVcbiAgICAgICAgICAgIHRpdGxlPVwiYXhlc1wiXG4gICAgICAgICAgICBzaXplPXtbIDUwMCw0MDAgXX1cbiAgICAgICAgICAgIGxpbmVzPXt0ZXN0RGF0YX1cbiAgICAgICAgICAgIGxpbmVEYXRhQWNjZXNzb3I9e2QgPT4gZC5kYXRhfVxuICAgICAgICAgICAgeEFjY2Vzc29yPXtkID0+IGQueH1cbiAgICAgICAgICAgIHlBY2Nlc3Nvcj17ZCA9PiBkLnl9XG4gICAgICAgICAgICBsaW5lU3R5bGU9e2QgPT4gKHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yIH0pfVxuICAgICAgICAgICAgaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVxuICAgICAgICAgICAgY2FudmFzTGluZXM9eyhkLGkpID0+IGkgPiAxfVxuICAgICAgICAgICAgY3VzdG9tTGluZVR5cGU9e1wibGluZVwifVxuICAgICAgICAgICAgYXhlcz17YXhlc31cbiAgICAgICAgICAgIG1hcmdpbj17IDUwIH1cbiAgICAgICAgICAgIC8+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiY29uc3QgYXhlcyA9IFtcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wieyBrZXk6ICd5QXhpcycsIG9yaWVudDogJ2xlZnQnLCBjbGFzc05hbWU6ICd5c2NhbGUnLCBuYW1lOiAnQ291bnRBeGlzJywgdGlja0Zvcm1hdDogKGQpID0+IGQgKyAnJScgfSxcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wieyBrZXk6ICd4QXhpcycsIG9yaWVudDogJ2JvdHRvbScsIGNsYXNzTmFtZTogJ3hzY2FsZScsIG5hbWU6ICdUaW1lQXhpcycsIHRpY2tWYWx1ZXM6IFsgMSwgMiwgMywgNCwgNSwgNiwgNyBdLCB0aWNrRm9ybWF0OiBkID0+IGQgKyAnIGRheScgfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJdXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIjwgWFlGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0aXRsZT0nYXhlcydcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsNDAwIF19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImxpbmVzPXt0ZXN0RGF0YX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInhBY2Nlc3Nvcj17ZCA9PiBkLnh9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInlBY2Nlc3Nvcj17ZCA9PiBkLnl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiYXhlcz17YXhlc31cIn08L3A+XG4gICAgICAgICAgICA8WFlGcmFtZVxuICAgICAgICAgICAgdGl0bGU9XCJ6b29tXCJcbiAgICAgICAgICAgIHNpemU9e1sgNTAwLDQwMCBdfVxuICAgICAgICAgICAgbGluZXM9e3Rlc3REYXRhfVxuICAgICAgICAgICAgbGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XG4gICAgICAgICAgICB4QWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgeUFjY2Vzc29yPXtkID0+IGQueX1cbiAgICAgICAgICAgIGxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XG4gICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICB6b29tYWJsZT17dHJ1ZX1cbiAgICAgICAgICAgIGN1c3RvbUxpbmVUeXBlPXtcImxpbmVcIn1cbiAgICAgICAgICAgIGF4ZXM9e2F4ZXN9XG4gICAgICAgICAgICBtYXJnaW49eyA1MCB9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPFhZRnJhbWVcbiAgICAgICAgICAgIHRpdGxlPVwiZml4ZWQgc2luZ2xlIGV4dGVudFwiXG4gICAgICAgICAgICBzaXplPXtbIDUwMCw0MDAgXX1cbiAgICAgICAgICAgIGxpbmVzPXt0ZXN0RGF0YX1cbiAgICAgICAgICAgIGxpbmVEYXRhQWNjZXNzb3I9e2QgPT4gZC5kYXRhfVxuICAgICAgICAgICAgeEFjY2Vzc29yPXtkID0+IGQueH1cbiAgICAgICAgICAgIHlBY2Nlc3Nvcj17ZCA9PiBkLnl9XG4gICAgICAgICAgICB4RXh0ZW50PXtbIHVuZGVmaW5lZCwgMyBdfVxuICAgICAgICAgICAgeUV4dGVudD17WyB1bmRlZmluZWQsIDggXX1cbiAgICAgICAgICAgIGxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XG4gICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICBjdXN0b21MaW5lVHlwZT17XCJsaW5lXCJ9XG4gICAgICAgICAgICBheGVzPXtheGVzfVxuICAgICAgICAgICAgbWFyZ2luPXsgNTAgfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFhZRnJhbWVFeGFtcGxlc01pc2M7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBYWUZyYW1lLCBNYXJrIH0gZnJvbSAnc2VtaW90aWMnO1xuXG5jb25zdCBjb2xvcnMgPSBbXG4gICAgXCIjMDBhMmNlXCIsXG4gICAgXCIjNGQ0MzBjXCIsXG4gICAgXCIjYjMzMzFkXCIsXG4gICAgXCIjYjZhNzU2XCJcbl1cbmNvbnN0IHRlc3REYXRhID0gW11cbmZvciAobGV0IHg9MTt4PDUwMDt4KyspIHtcbiAgICB0ZXN0RGF0YS5wdXNoKHsgeDogTWF0aC5yYW5kb20oKSAqIDEwMCwgeTogTWF0aC5yYW5kb20oKSAqIDEwMCwgcjogTWF0aC5yYW5kb20oKSAqIDEwLCBjb2xvcjogY29sb3JzW3glNF0gfSlcbn1cblxuY2xhc3MgWFlGcmFtZVBvaW50RXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcblxuICAgICAgICBjb25zdCBmcmFtZUhlaWdodCA9IDMwMFxuXG4gICAgICAgIHJldHVybiA8ZGl2PlxuICAgICAgICAgICAgPFhZRnJhbWVcbiAgICAgICAgICAgIHRpdGxlPVwiUG9pbnRzXCJcbiAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICBwb2ludHM9e3Rlc3REYXRhfVxuICAgICAgICAgICAgeEFjY2Vzc29yPXtkID0+IGQueH1cbiAgICAgICAgICAgIHlBY2Nlc3Nvcj17ZCA9PiBkLnl9XG4gICAgICAgICAgICBjYW52YXNQb2ludHM9eyhkLGkpID0+IGklMyA9PT0gMH1cbiAgICAgICAgICAgIHBvaW50U3R5bGU9e2QgPT4gKHsgZmlsbDogZC5jb2xvciwgc3Ryb2tlOiBcImJsYWNrXCIsIHN0cm9rZVdpZHRoOiAxIH0pfVxuICAgICAgICAgICAgY3VzdG9tUG9pbnRNYXJrPXsoZCxpKSA9PiBpJTIgPyA8TWFyayBtYXJrVHlwZT1cImNpcmNsZVwiIHI9XCI1XCIgLz4gOiA8TWFyayBtYXJrVHlwZT1cInJlY3RcIiB4PXstNH0geT17LTR9IHdpZHRoPXs4fSBoZWlnaHQ9ezh9IC8+fVxuICAgICAgICAgICAgbWFyZ2luPXsxMH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gWFlGcmFtZVBvaW50RXhhbXBsZXM7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBNaW5pbWFwWFlGcmFtZSB9IGZyb20gJ3NlbWlvdGljJztcbmltcG9ydCB7IGN1cnZlQmFzaXMsIGN1cnZlQ2FyZGluYWwsIGN1cnZlQ2F0bXVsbFJvbSwgY3VydmVMaW5lYXIsIGN1cnZlTmF0dXJhbCwgY3VydmVNb25vdG9uZVgsIGN1cnZlU3RlcCAgfSBmcm9tICdkMy1zaGFwZSdcblxuY29uc3QgdGVzdERhdGEgPSBbXG4gICAgeyBpZDogXCJsaW5lZGF0YS0xXCIsIGNvbG9yOiBcIiMwMGEyY2VcIiwgZGF0YTogWyB7IHk6IDUsIHg6IDEgfSwgeyB5OiA3LCB4OiAyIH0sIHsgeTogNywgeDogMyB9LCB7IHk6IDQsIHg6IDQgfSwgeyB5OiAyLCB4OiA1IH0sIHsgeTogMywgeDogNiB9LCB7IHk6IDUsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS0yXCIsIGNvbG9yOiBcIiM0ZDQzMGNcIiwgZGF0YTogWyB7IHk6IDEsIHg6IDEgfSwgeyB5OiA2LCB4OiAyIH0sIHsgeTogOCwgeDogMyB9LCB7IHk6IDYsIHg6IDQgfSwgeyB5OiA0LCB4OiA1IH0sIHsgeTogMiwgeDogNiB9LCB7IHk6IDAsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS0zXCIsIGNvbG9yOiBcIiNiMzMzMWRcIiwgZGF0YTogWyB7IHk6IDEwLCB4OiAxIH0sIHsgeTogOCwgeDogMiB9LCB7IHk6IDIsIHg6IDMgfSwgeyB5OiAzLCB4OiA0IH0sIHsgeTogMywgeDogNSB9LCB7IHk6IDQsIHg6IDYgfSwgeyB5OiA0LCB4OiA3IH0gXSB9LFxuICAgIHsgaWQ6IFwibGluZWRhdGEtNFwiLCBjb2xvcjogXCIjYjZhNzU2XCIsIGRhdGE6IFsgeyB5OiA2LCB4OiAxIH0sIHsgeTogMywgeDogMiB9LCB7IHk6IDMsIHg6IDMgfSwgeyB5OiA1LCB4OiA0IH0sIHsgeTogNiwgeDogNSB9LCB7IHk6IDYsIHg6IDYgfSwgeyB5OiA2LCB4OiA3IH0gXSB9XG5dXG5cbmxldCBkaXNwbGF5RGF0YSA9IHRlc3REYXRhLm1hcChkID0+IHtcbiAgICBsZXQgbW9yZURhdGEgPSBbIC4uLmQuZGF0YSwgLi4uZC5kYXRhLm1hcChwID0+ICh7IHk6IHAueSArIE1hdGgucmFuZG9tKCkgKiAxMCwgeDogcC54ICsgNyB9KSkgXVxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKGQsIHsgZGF0YTogbW9yZURhdGEgfSlcbn0pXG5cbmNsYXNzIFhZRnJhbWVXaXRoTWluaW1hcEV4YW1wbGVzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcyl7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHsgY3VzdG9tTGluZVR5cGU6IFwiYnVtcGFyZWFcIiwgY3VydmU6IFwiY3VydmVCYXNpc1wiLCBleHRlbnQ6IFsgMSw4IF0gfVxuICAgICAgICB0aGlzLmNoYW5nZUN1c3RvbUxpbmVUeXBlID0gdGhpcy5jaGFuZ2VDdXN0b21MaW5lVHlwZS5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuY2hhbmdlQ3VydmUgPSB0aGlzLmNoYW5nZUN1cnZlLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy51cGRhdGVEYXRlUmFuZ2UgPSB0aGlzLnVwZGF0ZURhdGVSYW5nZS5iaW5kKHRoaXMpXG4gICAgfVxuXG4gICAgY2hhbmdlQ3VzdG9tTGluZVR5cGUoZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgY3VzdG9tTGluZVR5cGU6IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgY2hhbmdlQ3VydmUgKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGN1cnZlOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cbiAgICB1cGRhdGVEYXRlUmFuZ2UgKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGV4dGVudDogZSB9KVxuICAgIH1cblxuICAgIHJlbmRlcigpIHtcblxuICAgICAgICBjb25zdCBmcmFtZVdpZHRoID0gNTAwXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbIFwibGluZVwiLCBcImRpZmZlcmVuY2VcIiwgXCJzdGFja2VkYXJlYVwiLCBcImJ1bXBsaW5lXCIsIFwiYnVtcGFyZWFcIiBdXG4gICAgICAgICAgICAubWFwKGQgPT4gPG9wdGlvbiBrZXk9e1wibGluZS1vcHRpb24tXCIgKyBkfSBsYWJlbD17ZH0gdmFsdWU9e2R9PntkfTwvb3B0aW9uPilcblxuICAgICAgICBjb25zdCBjdXJ2ZU9wdGlvbnMgPSBbIFwiY3VydmVCYXNpc1wiLCBcImN1cnZlQ2FyZGluYWxcIiwgXCJjdXJ2ZUNhdG11bGxSb21cIiwgXCJjdXJ2ZUxpbmVhclwiLCBcImN1cnZlTmF0dXJhbFwiLCBcImN1cnZlTW9ub3RvbmVYXCIsIFwiY3VydmVTdGVwXCIgXVxuICAgICAgICAgICAgLm1hcChkID0+IDxvcHRpb24ga2V5PXtcImN1cnZlLW9wdGlvbi1cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuXG4gICAgICAgIGNvbnN0IGN1cnZlSGFzaCA9IHsgY3VydmVCYXNpcywgY3VydmVDYXJkaW5hbCwgY3VydmVDYXRtdWxsUm9tLCBjdXJ2ZUxpbmVhciwgY3VydmVOYXR1cmFsLCBjdXJ2ZU1vbm90b25lWCwgY3VydmVTdGVwIH1cbiAgICAgICAgbGV0IGZpbmFsZGlzcGxheURhdGEgPSBkaXNwbGF5RGF0YVxuXG4gICAgICAgIGlmICh0aGlzLnN0YXRlLmN1c3RvbUxpbmVUeXBlID09PSBcImRpZmZlcmVuY2VcIikge1xuICAgICAgICAgICAgZmluYWxkaXNwbGF5RGF0YSA9IGRpc3BsYXlEYXRhLmZpbHRlcigoZCxpKSA9PiBpIDwgMilcbiAgICAgICAgfVxuXG4gICAgICBjb25zdCBheGVzID0gW1xuICAgICAgICB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwibGVmdFwiLCBjbGFzc05hbWU6IFwieXNjYWxlXCIsIG5hbWU6IFwiQ291bnRBeGlzXCIsIHRpY2tWYWx1ZXM6IFsgMTAsIDIwLCAzMCwgNDAsIDUwIF0sIHRpY2tGb3JtYXQ6IChkKSA9PiBkICsgXCIlXCIgfSxcbiAgICAgICAgeyBrZXk6IFwieEF4aXNcIiwgb3JpZW50OiBcImJvdHRvbVwiLCBjbGFzc05hbWU6IFwieHNjYWxlXCIsIG5hbWU6IFwiVGltZUF4aXNcIiwgdGlja1ZhbHVlczogWyAyLCA0LCA2LCA4LCAxMCwgMTIsIDE0IF0sIHRpY2tGb3JtYXQ6IGQgPT4gZCArIFwiIGRheVwiIH1cbiAgICAgIF1cblxuICAgICAgICByZXR1cm4gPGRpdj5cbiAgICAgICAgICAgIDxzcGFuPmN1c3RvbUxpbmVUeXBlPTxzZWxlY3Qgb25DaGFuZ2U9e3RoaXMuY2hhbmdlQ3VzdG9tTGluZVR5cGV9PntvcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuPmN1cnZlPHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VDdXJ2ZX0+e2N1cnZlT3B0aW9uc308L3NlbGVjdD48L3NwYW4+XG4gICAgICAgICAgICA8TWluaW1hcFhZRnJhbWVcbiAgICAgICAgICAgIHJlbmRlckJlZm9yZT17dHJ1ZX1cbiAgICAgICAgICAgIGF4ZXM9e2F4ZXN9XG4gICAgICAgICAgICBzaXplPXtbIGZyYW1lV2lkdGgsIDMwMCBdfVxuICAgICAgICAgICAgbGluZXM9e2ZpbmFsZGlzcGxheURhdGF9XG4gICAgICAgICAgICBsaW5lRGF0YUFjY2Vzc29yPXtkID0+IGQuZGF0YS5maWx0ZXIocCA9PiBwLnggPj0gdGhpcy5zdGF0ZS5leHRlbnRbMF0gJiYgcC54IDw9IHRoaXMuc3RhdGUuZXh0ZW50WzFdKX1cbiAgICAgICAgICAgIHhBY2Nlc3Nvcj17ZCA9PiBkLnh9XG4gICAgICAgICAgICB5QWNjZXNzb3I9e2QgPT4gZC55fVxuICAgICAgICAgICAgbGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cbiAgICAgICAgICAgIGN1c3RvbUxpbmVUeXBlPXt7IHR5cGU6IHRoaXMuc3RhdGUuY3VzdG9tTGluZVR5cGUsIGludGVycG9sYXRvcjogY3VydmVIYXNoW3RoaXMuc3RhdGUuY3VydmVdLCBzb3J0OiBudWxsIH19XG4gICAgICAgICAgICBtaW5pbWFwPXt7IG1hcmdpbjoge3RvcDogMjAsIGJvdHRvbTogMjAsIGxlZnQ6IDIwLCByaWdodDogMjB9LCBsaW5lU3R5bGU6IGQgPT4gKHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yIH0pLCBjdXN0b21MaW5lVHlwZTogeyB0eXBlOiB0aGlzLnN0YXRlLmN1c3RvbUxpbmVUeXBlLCBpbnRlcnBvbGF0b3I6IGN1cnZlSGFzaFt0aGlzLnN0YXRlLmN1cnZlXSwgc29ydDogbnVsbCB9LCBicnVzaEVuZDogdGhpcy51cGRhdGVEYXRlUmFuZ2UsIHlCcnVzaGFibGU6IGZhbHNlLCB4QnJ1c2hFeHRlbnQ6IHRoaXMuc3RhdGUuZXh0ZW50LCBsaW5lczogZmluYWxkaXNwbGF5RGF0YSwgbGluZURhdGFBY2Nlc3NvcjogZCA9PiBkLmRhdGEsIHNpemU6IFsgZnJhbWVXaWR0aCwgMTUwIF0sIGF4ZXM6IFtheGVzWzFdXSB9fVxuICAgICAgICAgICAgbGluZVJlbmRlck1vZGU9eygpID0+IFwic2tldGNoeVwifVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYWUZyYW1lV2l0aE1pbmltYXBFeGFtcGxlcztcbiIsIi8vIGh0dHBzOi8vZDNqcy5vcmcvZDMtYXJyYXkvIFZlcnNpb24gMS4wLjEuIENvcHlyaWdodCAyMDE2IE1pa2UgQm9zdG9jay5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5kMyA9IGdsb2JhbC5kMyB8fCB7fSkpKTtcbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG4gIGZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiBhID49IGIgPyAwIDogTmFOO1xuICB9XG5cbiAgZnVuY3Rpb24gYmlzZWN0b3IoY29tcGFyZSkge1xuICAgIGlmIChjb21wYXJlLmxlbmd0aCA9PT0gMSkgY29tcGFyZSA9IGFzY2VuZGluZ0NvbXBhcmF0b3IoY29tcGFyZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IGZ1bmN0aW9uKGEsIHgsIGxvLCBoaSkge1xuICAgICAgICBpZiAobG8gPT0gbnVsbCkgbG8gPSAwO1xuICAgICAgICBpZiAoaGkgPT0gbnVsbCkgaGkgPSBhLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcbiAgICAgICAgICB2YXIgbWlkID0gbG8gKyBoaSA+Pj4gMTtcbiAgICAgICAgICBpZiAoY29tcGFyZShhW21pZF0sIHgpIDwgMCkgbG8gPSBtaWQgKyAxO1xuICAgICAgICAgIGVsc2UgaGkgPSBtaWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxvO1xuICAgICAgfSxcbiAgICAgIHJpZ2h0OiBmdW5jdGlvbihhLCB4LCBsbywgaGkpIHtcbiAgICAgICAgaWYgKGxvID09IG51bGwpIGxvID0gMDtcbiAgICAgICAgaWYgKGhpID09IG51bGwpIGhpID0gYS5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChsbyA8IGhpKSB7XG4gICAgICAgICAgdmFyIG1pZCA9IGxvICsgaGkgPj4+IDE7XG4gICAgICAgICAgaWYgKGNvbXBhcmUoYVttaWRdLCB4KSA+IDApIGhpID0gbWlkO1xuICAgICAgICAgIGVsc2UgbG8gPSBtaWQgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsbztcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gYXNjZW5kaW5nQ29tcGFyYXRvcihmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQsIHgpIHtcbiAgICAgIHJldHVybiBhc2NlbmRpbmcoZihkKSwgeCk7XG4gICAgfTtcbiAgfVxuXG4gIHZhciBhc2NlbmRpbmdCaXNlY3QgPSBiaXNlY3Rvcihhc2NlbmRpbmcpO1xuICB2YXIgYmlzZWN0UmlnaHQgPSBhc2NlbmRpbmdCaXNlY3QucmlnaHQ7XG4gIHZhciBiaXNlY3RMZWZ0ID0gYXNjZW5kaW5nQmlzZWN0LmxlZnQ7XG5cbiAgZnVuY3Rpb24gZGVzY2VuZGluZyhhLCBiKSB7XG4gICAgcmV0dXJuIGIgPCBhID8gLTEgOiBiID4gYSA/IDEgOiBiID49IGEgPyAwIDogTmFOO1xuICB9XG5cbiAgZnVuY3Rpb24gbnVtYmVyKHgpIHtcbiAgICByZXR1cm4geCA9PT0gbnVsbCA/IE5hTiA6ICt4O1xuICB9XG5cbiAgZnVuY3Rpb24gdmFyaWFuY2UoYXJyYXksIGYpIHtcbiAgICB2YXIgbiA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgbSA9IDAsXG4gICAgICAgIGEsXG4gICAgICAgIGQsXG4gICAgICAgIHMgPSAwLFxuICAgICAgICBpID0gLTEsXG4gICAgICAgIGogPSAwO1xuXG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKCFpc05hTihhID0gbnVtYmVyKGFycmF5W2ldKSkpIHtcbiAgICAgICAgICBkID0gYSAtIG07XG4gICAgICAgICAgbSArPSBkIC8gKytqO1xuICAgICAgICAgIHMgKz0gZCAqIChhIC0gbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGlmICghaXNOYU4oYSA9IG51bWJlcihmKGFycmF5W2ldLCBpLCBhcnJheSkpKSkge1xuICAgICAgICAgIGQgPSBhIC0gbTtcbiAgICAgICAgICBtICs9IGQgLyArK2o7XG4gICAgICAgICAgcyArPSBkICogKGEgLSBtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChqID4gMSkgcmV0dXJuIHMgLyAoaiAtIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGV2aWF0aW9uKGFycmF5LCBmKSB7XG4gICAgdmFyIHYgPSB2YXJpYW5jZShhcnJheSwgZik7XG4gICAgcmV0dXJuIHYgPyBNYXRoLnNxcnQodikgOiB2O1xuICB9XG5cbiAgZnVuY3Rpb24gZXh0ZW50KGFycmF5LCBmKSB7XG4gICAgdmFyIGkgPSAtMSxcbiAgICAgICAgbiA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgYSxcbiAgICAgICAgYixcbiAgICAgICAgYztcblxuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBhcnJheVtpXSkgIT0gbnVsbCAmJiBiID49IGIpIHsgYSA9IGMgPSBiOyBicmVhazsgfVxuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGFycmF5W2ldKSAhPSBudWxsKSB7XG4gICAgICAgIGlmIChhID4gYikgYSA9IGI7XG4gICAgICAgIGlmIChjIDwgYikgYyA9IGI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZWxzZSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gZihhcnJheVtpXSwgaSwgYXJyYXkpKSAhPSBudWxsICYmIGIgPj0gYikgeyBhID0gYyA9IGI7IGJyZWFrOyB9XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gZihhcnJheVtpXSwgaSwgYXJyYXkpKSAhPSBudWxsKSB7XG4gICAgICAgIGlmIChhID4gYikgYSA9IGI7XG4gICAgICAgIGlmIChjIDwgYikgYyA9IGI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFthLCBjXTtcbiAgfVxuXG4gIHZhciBhcnJheSA9IEFycmF5LnByb3RvdHlwZTtcblxuICB2YXIgc2xpY2UgPSBhcnJheS5zbGljZTtcbiAgdmFyIG1hcCA9IGFycmF5Lm1hcDtcblxuICBmdW5jdGlvbiBjb25zdGFudCh4KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHg7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlkZW50aXR5KHgpIHtcbiAgICByZXR1cm4geDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJhbmdlKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgc3RhcnQgPSArc3RhcnQsIHN0b3AgPSArc3RvcCwgc3RlcCA9IChuID0gYXJndW1lbnRzLmxlbmd0aCkgPCAyID8gKHN0b3AgPSBzdGFydCwgc3RhcnQgPSAwLCAxKSA6IG4gPCAzID8gMSA6ICtzdGVwO1xuXG4gICAgdmFyIGkgPSAtMSxcbiAgICAgICAgbiA9IE1hdGgubWF4KDAsIE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApKSB8IDAsXG4gICAgICAgIHJhbmdlID0gbmV3IEFycmF5KG4pO1xuXG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIHJhbmdlW2ldID0gc3RhcnQgKyBpICogc3RlcDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH1cblxuICB2YXIgZTEwID0gTWF0aC5zcXJ0KDUwKTtcbiAgdmFyIGU1ID0gTWF0aC5zcXJ0KDEwKTtcbiAgdmFyIGUyID0gTWF0aC5zcXJ0KDIpO1xuICBmdW5jdGlvbiB0aWNrcyhzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgICB2YXIgc3RlcCA9IHRpY2tTdGVwKHN0YXJ0LCBzdG9wLCBjb3VudCk7XG4gICAgcmV0dXJuIHJhbmdlKFxuICAgICAgTWF0aC5jZWlsKHN0YXJ0IC8gc3RlcCkgKiBzdGVwLFxuICAgICAgTWF0aC5mbG9vcihzdG9wIC8gc3RlcCkgKiBzdGVwICsgc3RlcCAvIDIsIC8vIGluY2x1c2l2ZVxuICAgICAgc3RlcFxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiB0aWNrU3RlcChzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgICB2YXIgc3RlcDAgPSBNYXRoLmFicyhzdG9wIC0gc3RhcnQpIC8gTWF0aC5tYXgoMCwgY291bnQpLFxuICAgICAgICBzdGVwMSA9IE1hdGgucG93KDEwLCBNYXRoLmZsb29yKE1hdGgubG9nKHN0ZXAwKSAvIE1hdGguTE4xMCkpLFxuICAgICAgICBlcnJvciA9IHN0ZXAwIC8gc3RlcDE7XG4gICAgaWYgKGVycm9yID49IGUxMCkgc3RlcDEgKj0gMTA7XG4gICAgZWxzZSBpZiAoZXJyb3IgPj0gZTUpIHN0ZXAxICo9IDU7XG4gICAgZWxzZSBpZiAoZXJyb3IgPj0gZTIpIHN0ZXAxICo9IDI7XG4gICAgcmV0dXJuIHN0b3AgPCBzdGFydCA/IC1zdGVwMSA6IHN0ZXAxO1xuICB9XG5cbiAgZnVuY3Rpb24gc3R1cmdlcyh2YWx1ZXMpIHtcbiAgICByZXR1cm4gTWF0aC5jZWlsKE1hdGgubG9nKHZhbHVlcy5sZW5ndGgpIC8gTWF0aC5MTjIpICsgMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhpc3RvZ3JhbSgpIHtcbiAgICB2YXIgdmFsdWUgPSBpZGVudGl0eSxcbiAgICAgICAgZG9tYWluID0gZXh0ZW50LFxuICAgICAgICB0aHJlc2hvbGQgPSBzdHVyZ2VzO1xuXG4gICAgZnVuY3Rpb24gaGlzdG9ncmFtKGRhdGEpIHtcbiAgICAgIHZhciBpLFxuICAgICAgICAgIG4gPSBkYXRhLmxlbmd0aCxcbiAgICAgICAgICB4LFxuICAgICAgICAgIHZhbHVlcyA9IG5ldyBBcnJheShuKTtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgICB2YWx1ZXNbaV0gPSB2YWx1ZShkYXRhW2ldLCBpLCBkYXRhKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHh6ID0gZG9tYWluKHZhbHVlcyksXG4gICAgICAgICAgeDAgPSB4elswXSxcbiAgICAgICAgICB4MSA9IHh6WzFdLFxuICAgICAgICAgIHR6ID0gdGhyZXNob2xkKHZhbHVlcywgeDAsIHgxKTtcblxuICAgICAgLy8gQ29udmVydCBudW1iZXIgb2YgdGhyZXNob2xkcyBpbnRvIHVuaWZvcm0gdGhyZXNob2xkcy5cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheSh0eikpIHR6ID0gdGlja3MoeDAsIHgxLCB0eik7XG5cbiAgICAgIC8vIFJlbW92ZSBhbnkgdGhyZXNob2xkcyBvdXRzaWRlIHRoZSBkb21haW4uXG4gICAgICB2YXIgbSA9IHR6Lmxlbmd0aDtcbiAgICAgIHdoaWxlICh0elswXSA8PSB4MCkgdHouc2hpZnQoKSwgLS1tO1xuICAgICAgd2hpbGUgKHR6W20gLSAxXSA+PSB4MSkgdHoucG9wKCksIC0tbTtcblxuICAgICAgdmFyIGJpbnMgPSBuZXcgQXJyYXkobSArIDEpLFxuICAgICAgICAgIGJpbjtcblxuICAgICAgLy8gSW5pdGlhbGl6ZSBiaW5zLlxuICAgICAgZm9yIChpID0gMDsgaSA8PSBtOyArK2kpIHtcbiAgICAgICAgYmluID0gYmluc1tpXSA9IFtdO1xuICAgICAgICBiaW4ueDAgPSBpID4gMCA/IHR6W2kgLSAxXSA6IHgwO1xuICAgICAgICBiaW4ueDEgPSBpIDwgbSA/IHR6W2ldIDogeDE7XG4gICAgICB9XG5cbiAgICAgIC8vIEFzc2lnbiBkYXRhIHRvIGJpbnMgYnkgdmFsdWUsIGlnbm9yaW5nIGFueSBvdXRzaWRlIHRoZSBkb21haW4uXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICAgIHggPSB2YWx1ZXNbaV07XG4gICAgICAgIGlmICh4MCA8PSB4ICYmIHggPD0geDEpIHtcbiAgICAgICAgICBiaW5zW2Jpc2VjdFJpZ2h0KHR6LCB4LCAwLCBtKV0ucHVzaChkYXRhW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gYmlucztcbiAgICB9XG5cbiAgICBoaXN0b2dyYW0udmFsdWUgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh2YWx1ZSA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoXyksIGhpc3RvZ3JhbSkgOiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgaGlzdG9ncmFtLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRvbWFpbiA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoW19bMF0sIF9bMV1dKSwgaGlzdG9ncmFtKSA6IGRvbWFpbjtcbiAgICB9O1xuXG4gICAgaGlzdG9ncmFtLnRocmVzaG9sZHMgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh0aHJlc2hvbGQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IEFycmF5LmlzQXJyYXkoXykgPyBjb25zdGFudChzbGljZS5jYWxsKF8pKSA6IGNvbnN0YW50KF8pLCBoaXN0b2dyYW0pIDogdGhyZXNob2xkO1xuICAgIH07XG5cbiAgICByZXR1cm4gaGlzdG9ncmFtO1xuICB9XG5cbiAgZnVuY3Rpb24gcXVhbnRpbGUoYXJyYXksIHAsIGYpIHtcbiAgICBpZiAoZiA9PSBudWxsKSBmID0gbnVtYmVyO1xuICAgIGlmICghKG4gPSBhcnJheS5sZW5ndGgpKSByZXR1cm47XG4gICAgaWYgKChwID0gK3ApIDw9IDAgfHwgbiA8IDIpIHJldHVybiArZihhcnJheVswXSwgMCwgYXJyYXkpO1xuICAgIGlmIChwID49IDEpIHJldHVybiArZihhcnJheVtuIC0gMV0sIG4gLSAxLCBhcnJheSk7XG4gICAgdmFyIG4sXG4gICAgICAgIGggPSAobiAtIDEpICogcCxcbiAgICAgICAgaSA9IE1hdGguZmxvb3IoaCksXG4gICAgICAgIGEgPSArZihhcnJheVtpXSwgaSwgYXJyYXkpLFxuICAgICAgICBiID0gK2YoYXJyYXlbaSArIDFdLCBpICsgMSwgYXJyYXkpO1xuICAgIHJldHVybiBhICsgKGIgLSBhKSAqIChoIC0gaSk7XG4gIH1cblxuICBmdW5jdGlvbiBmcmVlZG1hbkRpYWNvbmlzKHZhbHVlcywgbWluLCBtYXgpIHtcbiAgICB2YWx1ZXMgPSBtYXAuY2FsbCh2YWx1ZXMsIG51bWJlcikuc29ydChhc2NlbmRpbmcpO1xuICAgIHJldHVybiBNYXRoLmNlaWwoKG1heCAtIG1pbikgLyAoMiAqIChxdWFudGlsZSh2YWx1ZXMsIDAuNzUpIC0gcXVhbnRpbGUodmFsdWVzLCAwLjI1KSkgKiBNYXRoLnBvdyh2YWx1ZXMubGVuZ3RoLCAtMSAvIDMpKSk7XG4gIH1cblxuICBmdW5jdGlvbiBzY290dCh2YWx1ZXMsIG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIE1hdGguY2VpbCgobWF4IC0gbWluKSAvICgzLjUgKiBkZXZpYXRpb24odmFsdWVzKSAqIE1hdGgucG93KHZhbHVlcy5sZW5ndGgsIC0xIC8gMykpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1heChhcnJheSwgZikge1xuICAgIHZhciBpID0gLTEsXG4gICAgICAgIG4gPSBhcnJheS5sZW5ndGgsXG4gICAgICAgIGEsXG4gICAgICAgIGI7XG5cbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gYXJyYXlbaV0pICE9IG51bGwgJiYgYiA+PSBiKSB7IGEgPSBiOyBicmVhazsgfVxuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGFycmF5W2ldKSAhPSBudWxsICYmIGIgPiBhKSBhID0gYjtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBmKGFycmF5W2ldLCBpLCBhcnJheSkpICE9IG51bGwgJiYgYiA+PSBiKSB7IGEgPSBiOyBicmVhazsgfVxuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGYoYXJyYXlbaV0sIGksIGFycmF5KSkgIT0gbnVsbCAmJiBiID4gYSkgYSA9IGI7XG4gICAgfVxuXG4gICAgcmV0dXJuIGE7XG4gIH1cblxuICBmdW5jdGlvbiBtZWFuKGFycmF5LCBmKSB7XG4gICAgdmFyIHMgPSAwLFxuICAgICAgICBuID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICBhLFxuICAgICAgICBpID0gLTEsXG4gICAgICAgIGogPSBuO1xuXG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICghaXNOYU4oYSA9IG51bWJlcihhcnJheVtpXSkpKSBzICs9IGE7IGVsc2UgLS1qO1xuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICghaXNOYU4oYSA9IG51bWJlcihmKGFycmF5W2ldLCBpLCBhcnJheSkpKSkgcyArPSBhOyBlbHNlIC0tajtcbiAgICB9XG5cbiAgICBpZiAoaikgcmV0dXJuIHMgLyBqO1xuICB9XG5cbiAgZnVuY3Rpb24gbWVkaWFuKGFycmF5LCBmKSB7XG4gICAgdmFyIG51bWJlcnMgPSBbXSxcbiAgICAgICAgbiA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgYSxcbiAgICAgICAgaSA9IC0xO1xuXG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICghaXNOYU4oYSA9IG51bWJlcihhcnJheVtpXSkpKSBudW1iZXJzLnB1c2goYSk7XG4gICAgfVxuXG4gICAgZWxzZSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKCFpc05hTihhID0gbnVtYmVyKGYoYXJyYXlbaV0sIGksIGFycmF5KSkpKSBudW1iZXJzLnB1c2goYSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHF1YW50aWxlKG51bWJlcnMuc29ydChhc2NlbmRpbmcpLCAwLjUpO1xuICB9XG5cbiAgZnVuY3Rpb24gbWVyZ2UoYXJyYXlzKSB7XG4gICAgdmFyIG4gPSBhcnJheXMubGVuZ3RoLFxuICAgICAgICBtLFxuICAgICAgICBpID0gLTEsXG4gICAgICAgIGogPSAwLFxuICAgICAgICBtZXJnZWQsXG4gICAgICAgIGFycmF5O1xuXG4gICAgd2hpbGUgKCsraSA8IG4pIGogKz0gYXJyYXlzW2ldLmxlbmd0aDtcbiAgICBtZXJnZWQgPSBuZXcgQXJyYXkoaik7XG5cbiAgICB3aGlsZSAoLS1uID49IDApIHtcbiAgICAgIGFycmF5ID0gYXJyYXlzW25dO1xuICAgICAgbSA9IGFycmF5Lmxlbmd0aDtcbiAgICAgIHdoaWxlICgtLW0gPj0gMCkge1xuICAgICAgICBtZXJnZWRbLS1qXSA9IGFycmF5W21dO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtZXJnZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBtaW4oYXJyYXksIGYpIHtcbiAgICB2YXIgaSA9IC0xLFxuICAgICAgICBuID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICBhLFxuICAgICAgICBiO1xuXG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGFycmF5W2ldKSAhPSBudWxsICYmIGIgPj0gYikgeyBhID0gYjsgYnJlYWs7IH1cbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBhcnJheVtpXSkgIT0gbnVsbCAmJiBhID4gYikgYSA9IGI7XG4gICAgfVxuXG4gICAgZWxzZSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gZihhcnJheVtpXSwgaSwgYXJyYXkpKSAhPSBudWxsICYmIGIgPj0gYikgeyBhID0gYjsgYnJlYWs7IH1cbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBmKGFycmF5W2ldLCBpLCBhcnJheSkpICE9IG51bGwgJiYgYSA+IGIpIGEgPSBiO1xuICAgIH1cblxuICAgIHJldHVybiBhO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFpcnMoYXJyYXkpIHtcbiAgICB2YXIgaSA9IDAsIG4gPSBhcnJheS5sZW5ndGggLSAxLCBwID0gYXJyYXlbMF0sIHBhaXJzID0gbmV3IEFycmF5KG4gPCAwID8gMCA6IG4pO1xuICAgIHdoaWxlIChpIDwgbikgcGFpcnNbaV0gPSBbcCwgcCA9IGFycmF5WysraV1dO1xuICAgIHJldHVybiBwYWlycztcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlcm11dGUoYXJyYXksIGluZGV4ZXMpIHtcbiAgICB2YXIgaSA9IGluZGV4ZXMubGVuZ3RoLCBwZXJtdXRlcyA9IG5ldyBBcnJheShpKTtcbiAgICB3aGlsZSAoaS0tKSBwZXJtdXRlc1tpXSA9IGFycmF5W2luZGV4ZXNbaV1dO1xuICAgIHJldHVybiBwZXJtdXRlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIHNjYW4oYXJyYXksIGNvbXBhcmUpIHtcbiAgICBpZiAoIShuID0gYXJyYXkubGVuZ3RoKSkgcmV0dXJuO1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbixcbiAgICAgICAgaiA9IDAsXG4gICAgICAgIHhpLFxuICAgICAgICB4aiA9IGFycmF5W2pdO1xuXG4gICAgaWYgKCFjb21wYXJlKSBjb21wYXJlID0gYXNjZW5kaW5nO1xuXG4gICAgd2hpbGUgKCsraSA8IG4pIGlmIChjb21wYXJlKHhpID0gYXJyYXlbaV0sIHhqKSA8IDAgfHwgY29tcGFyZSh4aiwgeGopICE9PSAwKSB4aiA9IHhpLCBqID0gaTtcblxuICAgIGlmIChjb21wYXJlKHhqLCB4aikgPT09IDApIHJldHVybiBqO1xuICB9XG5cbiAgZnVuY3Rpb24gc2h1ZmZsZShhcnJheSwgaTAsIGkxKSB7XG4gICAgdmFyIG0gPSAoaTEgPT0gbnVsbCA/IGFycmF5Lmxlbmd0aCA6IGkxKSAtIChpMCA9IGkwID09IG51bGwgPyAwIDogK2kwKSxcbiAgICAgICAgdCxcbiAgICAgICAgaTtcblxuICAgIHdoaWxlIChtKSB7XG4gICAgICBpID0gTWF0aC5yYW5kb20oKSAqIG0tLSB8IDA7XG4gICAgICB0ID0gYXJyYXlbbSArIGkwXTtcbiAgICAgIGFycmF5W20gKyBpMF0gPSBhcnJheVtpICsgaTBdO1xuICAgICAgYXJyYXlbaSArIGkwXSA9IHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG5cbiAgZnVuY3Rpb24gc3VtKGFycmF5LCBmKSB7XG4gICAgdmFyIHMgPSAwLFxuICAgICAgICBuID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICBhLFxuICAgICAgICBpID0gLTE7XG5cbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKGEgPSArYXJyYXlbaV0pIHMgKz0gYTsgLy8gTm90ZTogemVybyBhbmQgbnVsbCBhcmUgZXF1aXZhbGVudC5cbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoYSA9ICtmKGFycmF5W2ldLCBpLCBhcnJheSkpIHMgKz0gYTtcbiAgICB9XG5cbiAgICByZXR1cm4gcztcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zcG9zZShtYXRyaXgpIHtcbiAgICBpZiAoIShuID0gbWF0cml4Lmxlbmd0aCkpIHJldHVybiBbXTtcbiAgICBmb3IgKHZhciBpID0gLTEsIG0gPSBtaW4obWF0cml4LCBsZW5ndGgpLCB0cmFuc3Bvc2UgPSBuZXcgQXJyYXkobSk7ICsraSA8IG07KSB7XG4gICAgICBmb3IgKHZhciBqID0gLTEsIG4sIHJvdyA9IHRyYW5zcG9zZVtpXSA9IG5ldyBBcnJheShuKTsgKytqIDwgbjspIHtcbiAgICAgICAgcm93W2pdID0gbWF0cml4W2pdW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJhbnNwb3NlO1xuICB9XG5cbiAgZnVuY3Rpb24gbGVuZ3RoKGQpIHtcbiAgICByZXR1cm4gZC5sZW5ndGg7XG4gIH1cblxuICBmdW5jdGlvbiB6aXAoKSB7XG4gICAgcmV0dXJuIHRyYW5zcG9zZShhcmd1bWVudHMpO1xuICB9XG5cbiAgZXhwb3J0cy5iaXNlY3QgPSBiaXNlY3RSaWdodDtcbiAgZXhwb3J0cy5iaXNlY3RSaWdodCA9IGJpc2VjdFJpZ2h0O1xuICBleHBvcnRzLmJpc2VjdExlZnQgPSBiaXNlY3RMZWZ0O1xuICBleHBvcnRzLmFzY2VuZGluZyA9IGFzY2VuZGluZztcbiAgZXhwb3J0cy5iaXNlY3RvciA9IGJpc2VjdG9yO1xuICBleHBvcnRzLmRlc2NlbmRpbmcgPSBkZXNjZW5kaW5nO1xuICBleHBvcnRzLmRldmlhdGlvbiA9IGRldmlhdGlvbjtcbiAgZXhwb3J0cy5leHRlbnQgPSBleHRlbnQ7XG4gIGV4cG9ydHMuaGlzdG9ncmFtID0gaGlzdG9ncmFtO1xuICBleHBvcnRzLnRocmVzaG9sZEZyZWVkbWFuRGlhY29uaXMgPSBmcmVlZG1hbkRpYWNvbmlzO1xuICBleHBvcnRzLnRocmVzaG9sZFNjb3R0ID0gc2NvdHQ7XG4gIGV4cG9ydHMudGhyZXNob2xkU3R1cmdlcyA9IHN0dXJnZXM7XG4gIGV4cG9ydHMubWF4ID0gbWF4O1xuICBleHBvcnRzLm1lYW4gPSBtZWFuO1xuICBleHBvcnRzLm1lZGlhbiA9IG1lZGlhbjtcbiAgZXhwb3J0cy5tZXJnZSA9IG1lcmdlO1xuICBleHBvcnRzLm1pbiA9IG1pbjtcbiAgZXhwb3J0cy5wYWlycyA9IHBhaXJzO1xuICBleHBvcnRzLnBlcm11dGUgPSBwZXJtdXRlO1xuICBleHBvcnRzLnF1YW50aWxlID0gcXVhbnRpbGU7XG4gIGV4cG9ydHMucmFuZ2UgPSByYW5nZTtcbiAgZXhwb3J0cy5zY2FuID0gc2NhbjtcbiAgZXhwb3J0cy5zaHVmZmxlID0gc2h1ZmZsZTtcbiAgZXhwb3J0cy5zdW0gPSBzdW07XG4gIGV4cG9ydHMudGlja3MgPSB0aWNrcztcbiAgZXhwb3J0cy50aWNrU3RlcCA9IHRpY2tTdGVwO1xuICBleHBvcnRzLnRyYW5zcG9zZSA9IHRyYW5zcG9zZTtcbiAgZXhwb3J0cy52YXJpYW5jZSA9IHZhcmlhbmNlO1xuICBleHBvcnRzLnppcCA9IHppcDtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSk7IiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy1jb2xsZWN0aW9uLyBWZXJzaW9uIDEuMC4xLiBDb3B5cmlnaHQgMjAxNiBNaWtlIEJvc3RvY2suXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG4gIChmYWN0b3J5KChnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pKSk7XG59KHRoaXMsIGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxuICB2YXIgcHJlZml4ID0gXCIkXCI7XG5cbiAgZnVuY3Rpb24gTWFwKCkge31cblxuICBNYXAucHJvdG90eXBlID0gbWFwLnByb3RvdHlwZSA9IHtcbiAgICBjb25zdHJ1Y3RvcjogTWFwLFxuICAgIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gKHByZWZpeCArIGtleSkgaW4gdGhpcztcbiAgICB9LFxuICAgIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGhpc1twcmVmaXggKyBrZXldO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICB0aGlzW3ByZWZpeCArIGtleV0gPSB2YWx1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBwcm9wZXJ0eSA9IHByZWZpeCArIGtleTtcbiAgICAgIHJldHVybiBwcm9wZXJ0eSBpbiB0aGlzICYmIGRlbGV0ZSB0aGlzW3Byb3BlcnR5XTtcbiAgICB9LFxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSBkZWxldGUgdGhpc1twcm9wZXJ0eV07XG4gICAgfSxcbiAgICBrZXlzOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXlzID0gW107XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkga2V5cy5wdXNoKHByb3BlcnR5LnNsaWNlKDEpKTtcbiAgICAgIHJldHVybiBrZXlzO1xuICAgIH0sXG4gICAgdmFsdWVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSB2YWx1ZXMucHVzaCh0aGlzW3Byb3BlcnR5XSk7XG4gICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH0sXG4gICAgZW50cmllczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZW50cmllcyA9IFtdO1xuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGVudHJpZXMucHVzaCh7a2V5OiBwcm9wZXJ0eS5zbGljZSgxKSwgdmFsdWU6IHRoaXNbcHJvcGVydHldfSk7XG4gICAgICByZXR1cm4gZW50cmllcztcbiAgICB9LFxuICAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNpemUgPSAwO1xuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpICsrc2l6ZTtcbiAgICAgIHJldHVybiBzaXplO1xuICAgIH0sXG4gICAgZW1wdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgZWFjaDogZnVuY3Rpb24oZikge1xuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGYodGhpc1twcm9wZXJ0eV0sIHByb3BlcnR5LnNsaWNlKDEpLCB0aGlzKTtcbiAgICB9XG4gIH07XG5cbiAgZnVuY3Rpb24gbWFwKG9iamVjdCwgZikge1xuICAgIHZhciBtYXAgPSBuZXcgTWFwO1xuXG4gICAgLy8gQ29weSBjb25zdHJ1Y3Rvci5cbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgTWFwKSBvYmplY3QuZWFjaChmdW5jdGlvbih2YWx1ZSwga2V5KSB7IG1hcC5zZXQoa2V5LCB2YWx1ZSk7IH0pO1xuXG4gICAgLy8gSW5kZXggYXJyYXkgYnkgbnVtZXJpYyBpbmRleCBvciBzcGVjaWZpZWQga2V5IGZ1bmN0aW9uLlxuICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0KSkge1xuICAgICAgdmFyIGkgPSAtMSxcbiAgICAgICAgICBuID0gb2JqZWN0Lmxlbmd0aCxcbiAgICAgICAgICBvO1xuXG4gICAgICBpZiAoZiA9PSBudWxsKSB3aGlsZSAoKytpIDwgbikgbWFwLnNldChpLCBvYmplY3RbaV0pO1xuICAgICAgZWxzZSB3aGlsZSAoKytpIDwgbikgbWFwLnNldChmKG8gPSBvYmplY3RbaV0sIGksIG9iamVjdCksIG8pO1xuICAgIH1cblxuICAgIC8vIENvbnZlcnQgb2JqZWN0IHRvIG1hcC5cbiAgICBlbHNlIGlmIChvYmplY3QpIGZvciAodmFyIGtleSBpbiBvYmplY3QpIG1hcC5zZXQoa2V5LCBvYmplY3Rba2V5XSk7XG5cbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgZnVuY3Rpb24gbmVzdCgpIHtcbiAgICB2YXIga2V5cyA9IFtdLFxuICAgICAgICBzb3J0S2V5cyA9IFtdLFxuICAgICAgICBzb3J0VmFsdWVzLFxuICAgICAgICByb2xsdXAsXG4gICAgICAgIG5lc3Q7XG5cbiAgICBmdW5jdGlvbiBhcHBseShhcnJheSwgZGVwdGgsIGNyZWF0ZVJlc3VsdCwgc2V0UmVzdWx0KSB7XG4gICAgICBpZiAoZGVwdGggPj0ga2V5cy5sZW5ndGgpIHJldHVybiByb2xsdXAgIT0gbnVsbFxuICAgICAgICAgID8gcm9sbHVwKGFycmF5KSA6IChzb3J0VmFsdWVzICE9IG51bGxcbiAgICAgICAgICA/IGFycmF5LnNvcnQoc29ydFZhbHVlcylcbiAgICAgICAgICA6IGFycmF5KTtcblxuICAgICAgdmFyIGkgPSAtMSxcbiAgICAgICAgICBuID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICAgIGtleSA9IGtleXNbZGVwdGgrK10sXG4gICAgICAgICAga2V5VmFsdWUsXG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgdmFsdWVzQnlLZXkgPSBtYXAoKSxcbiAgICAgICAgICB2YWx1ZXMsXG4gICAgICAgICAgcmVzdWx0ID0gY3JlYXRlUmVzdWx0KCk7XG5cbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGlmICh2YWx1ZXMgPSB2YWx1ZXNCeUtleS5nZXQoa2V5VmFsdWUgPSBrZXkodmFsdWUgPSBhcnJheVtpXSkgKyBcIlwiKSkge1xuICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZXNCeUtleS5zZXQoa2V5VmFsdWUsIFt2YWx1ZV0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhbHVlc0J5S2V5LmVhY2goZnVuY3Rpb24odmFsdWVzLCBrZXkpIHtcbiAgICAgICAgc2V0UmVzdWx0KHJlc3VsdCwga2V5LCBhcHBseSh2YWx1ZXMsIGRlcHRoLCBjcmVhdGVSZXN1bHQsIHNldFJlc3VsdCkpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZW50cmllcyhtYXAsIGRlcHRoKSB7XG4gICAgICBpZiAoKytkZXB0aCA+IGtleXMubGVuZ3RoKSByZXR1cm4gbWFwO1xuICAgICAgdmFyIGFycmF5LCBzb3J0S2V5ID0gc29ydEtleXNbZGVwdGggLSAxXTtcbiAgICAgIGlmIChyb2xsdXAgIT0gbnVsbCAmJiBkZXB0aCA+PSBrZXlzLmxlbmd0aCkgYXJyYXkgPSBtYXAuZW50cmllcygpO1xuICAgICAgZWxzZSBhcnJheSA9IFtdLCBtYXAuZWFjaChmdW5jdGlvbih2LCBrKSB7IGFycmF5LnB1c2goe2tleTogaywgdmFsdWVzOiBlbnRyaWVzKHYsIGRlcHRoKX0pOyB9KTtcbiAgICAgIHJldHVybiBzb3J0S2V5ICE9IG51bGwgPyBhcnJheS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIHNvcnRLZXkoYS5rZXksIGIua2V5KTsgfSkgOiBhcnJheTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVzdCA9IHtcbiAgICAgIG9iamVjdDogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGFwcGx5KGFycmF5LCAwLCBjcmVhdGVPYmplY3QsIHNldE9iamVjdCk7IH0sXG4gICAgICBtYXA6IGZ1bmN0aW9uKGFycmF5KSB7IHJldHVybiBhcHBseShhcnJheSwgMCwgY3JlYXRlTWFwLCBzZXRNYXApOyB9LFxuICAgICAgZW50cmllczogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGVudHJpZXMoYXBwbHkoYXJyYXksIDAsIGNyZWF0ZU1hcCwgc2V0TWFwKSwgMCk7IH0sXG4gICAgICBrZXk6IGZ1bmN0aW9uKGQpIHsga2V5cy5wdXNoKGQpOyByZXR1cm4gbmVzdDsgfSxcbiAgICAgIHNvcnRLZXlzOiBmdW5jdGlvbihvcmRlcikgeyBzb3J0S2V5c1trZXlzLmxlbmd0aCAtIDFdID0gb3JkZXI7IHJldHVybiBuZXN0OyB9LFxuICAgICAgc29ydFZhbHVlczogZnVuY3Rpb24ob3JkZXIpIHsgc29ydFZhbHVlcyA9IG9yZGVyOyByZXR1cm4gbmVzdDsgfSxcbiAgICAgIHJvbGx1cDogZnVuY3Rpb24oZikgeyByb2xsdXAgPSBmOyByZXR1cm4gbmVzdDsgfVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVPYmplY3QoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0T2JqZWN0KG9iamVjdCwga2V5LCB2YWx1ZSkge1xuICAgIG9iamVjdFtrZXldID0gdmFsdWU7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVNYXAoKSB7XG4gICAgcmV0dXJuIG1hcCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0TWFwKG1hcCwga2V5LCB2YWx1ZSkge1xuICAgIG1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBTZXQoKSB7fVxuXG4gIHZhciBwcm90byA9IG1hcC5wcm90b3R5cGU7XG5cbiAgU2V0LnByb3RvdHlwZSA9IHNldC5wcm90b3R5cGUgPSB7XG4gICAgY29uc3RydWN0b3I6IFNldCxcbiAgICBoYXM6IHByb3RvLmhhcyxcbiAgICBhZGQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB2YWx1ZSArPSBcIlwiO1xuICAgICAgdGhpc1twcmVmaXggKyB2YWx1ZV0gPSB2YWx1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBwcm90by5yZW1vdmUsXG4gICAgY2xlYXI6IHByb3RvLmNsZWFyLFxuICAgIHZhbHVlczogcHJvdG8ua2V5cyxcbiAgICBzaXplOiBwcm90by5zaXplLFxuICAgIGVtcHR5OiBwcm90by5lbXB0eSxcbiAgICBlYWNoOiBwcm90by5lYWNoXG4gIH07XG5cbiAgZnVuY3Rpb24gc2V0KG9iamVjdCwgZikge1xuICAgIHZhciBzZXQgPSBuZXcgU2V0O1xuXG4gICAgLy8gQ29weSBjb25zdHJ1Y3Rvci5cbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgU2V0KSBvYmplY3QuZWFjaChmdW5jdGlvbih2YWx1ZSkgeyBzZXQuYWRkKHZhbHVlKTsgfSk7XG5cbiAgICAvLyBPdGhlcndpc2UsIGFzc3VtZSBpdOKAmXMgYW4gYXJyYXkuXG4gICAgZWxzZSBpZiAob2JqZWN0KSB7XG4gICAgICB2YXIgaSA9IC0xLCBuID0gb2JqZWN0Lmxlbmd0aDtcbiAgICAgIGlmIChmID09IG51bGwpIHdoaWxlICgrK2kgPCBuKSBzZXQuYWRkKG9iamVjdFtpXSk7XG4gICAgICBlbHNlIHdoaWxlICgrK2kgPCBuKSBzZXQuYWRkKGYob2JqZWN0W2ldLCBpLCBvYmplY3QpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2V0O1xuICB9XG5cbiAgZnVuY3Rpb24ga2V5cyhtYXApIHtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBtYXApIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xuICB9XG5cbiAgZnVuY3Rpb24gdmFsdWVzKG1hcCkge1xuICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gbWFwKSB2YWx1ZXMucHVzaChtYXBba2V5XSk7XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGVudHJpZXMobWFwKSB7XG4gICAgdmFyIGVudHJpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gbWFwKSBlbnRyaWVzLnB1c2goe2tleToga2V5LCB2YWx1ZTogbWFwW2tleV19KTtcbiAgICByZXR1cm4gZW50cmllcztcbiAgfVxuXG4gIGV4cG9ydHMubmVzdCA9IG5lc3Q7XG4gIGV4cG9ydHMuc2V0ID0gc2V0O1xuICBleHBvcnRzLm1hcCA9IG1hcDtcbiAgZXhwb3J0cy5rZXlzID0ga2V5cztcbiAgZXhwb3J0cy52YWx1ZXMgPSB2YWx1ZXM7XG4gIGV4cG9ydHMuZW50cmllcyA9IGVudHJpZXM7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpOyIsIi8vIGh0dHBzOi8vZDNqcy5vcmcvZDMtY29sb3IvIFZlcnNpb24gMS4wLjIuIENvcHlyaWdodCAyMDE2IE1pa2UgQm9zdG9jay5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5kMyA9IGdsb2JhbC5kMyB8fCB7fSkpKTtcbn0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxudmFyIGRlZmluZSA9IGZ1bmN0aW9uKGNvbnN0cnVjdG9yLCBmYWN0b3J5LCBwcm90b3R5cGUpIHtcbiAgY29uc3RydWN0b3IucHJvdG90eXBlID0gZmFjdG9yeS5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gIHByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yO1xufTtcblxuZnVuY3Rpb24gZXh0ZW5kKHBhcmVudCwgZGVmaW5pdGlvbikge1xuICB2YXIgcHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlKTtcbiAgZm9yICh2YXIga2V5IGluIGRlZmluaXRpb24pIHByb3RvdHlwZVtrZXldID0gZGVmaW5pdGlvbltrZXldO1xuICByZXR1cm4gcHJvdG90eXBlO1xufVxuXG5mdW5jdGlvbiBDb2xvcigpIHt9XG5cbnZhciBkYXJrZXIgPSAwLjc7XG52YXIgYnJpZ2h0ZXIgPSAxIC8gZGFya2VyO1xuXG52YXIgcmVJID0gXCJcXFxccyooWystXT9cXFxcZCspXFxcXHMqXCI7XG52YXIgcmVOID0gXCJcXFxccyooWystXT9cXFxcZCpcXFxcLj9cXFxcZCsoPzpbZUVdWystXT9cXFxcZCspPylcXFxccypcIjtcbnZhciByZVAgPSBcIlxcXFxzKihbKy1dP1xcXFxkKlxcXFwuP1xcXFxkKyg/OltlRV1bKy1dP1xcXFxkKyk/KSVcXFxccypcIjtcbnZhciByZUhleDMgPSAvXiMoWzAtOWEtZl17M30pJC87XG52YXIgcmVIZXg2ID0gL14jKFswLTlhLWZdezZ9KSQvO1xudmFyIHJlUmdiSW50ZWdlciA9IG5ldyBSZWdFeHAoXCJecmdiXFxcXChcIiArIFtyZUksIHJlSSwgcmVJXSArIFwiXFxcXCkkXCIpO1xudmFyIHJlUmdiUGVyY2VudCA9IG5ldyBSZWdFeHAoXCJecmdiXFxcXChcIiArIFtyZVAsIHJlUCwgcmVQXSArIFwiXFxcXCkkXCIpO1xudmFyIHJlUmdiYUludGVnZXIgPSBuZXcgUmVnRXhwKFwiXnJnYmFcXFxcKFwiICsgW3JlSSwgcmVJLCByZUksIHJlTl0gKyBcIlxcXFwpJFwiKTtcbnZhciByZVJnYmFQZXJjZW50ID0gbmV3IFJlZ0V4cChcIl5yZ2JhXFxcXChcIiArIFtyZVAsIHJlUCwgcmVQLCByZU5dICsgXCJcXFxcKSRcIik7XG52YXIgcmVIc2xQZXJjZW50ID0gbmV3IFJlZ0V4cChcIl5oc2xcXFxcKFwiICsgW3JlTiwgcmVQLCByZVBdICsgXCJcXFxcKSRcIik7XG52YXIgcmVIc2xhUGVyY2VudCA9IG5ldyBSZWdFeHAoXCJeaHNsYVxcXFwoXCIgKyBbcmVOLCByZVAsIHJlUCwgcmVOXSArIFwiXFxcXCkkXCIpO1xuXG52YXIgbmFtZWQgPSB7XG4gIGFsaWNlYmx1ZTogMHhmMGY4ZmYsXG4gIGFudGlxdWV3aGl0ZTogMHhmYWViZDcsXG4gIGFxdWE6IDB4MDBmZmZmLFxuICBhcXVhbWFyaW5lOiAweDdmZmZkNCxcbiAgYXp1cmU6IDB4ZjBmZmZmLFxuICBiZWlnZTogMHhmNWY1ZGMsXG4gIGJpc3F1ZTogMHhmZmU0YzQsXG4gIGJsYWNrOiAweDAwMDAwMCxcbiAgYmxhbmNoZWRhbG1vbmQ6IDB4ZmZlYmNkLFxuICBibHVlOiAweDAwMDBmZixcbiAgYmx1ZXZpb2xldDogMHg4YTJiZTIsXG4gIGJyb3duOiAweGE1MmEyYSxcbiAgYnVybHl3b29kOiAweGRlYjg4NyxcbiAgY2FkZXRibHVlOiAweDVmOWVhMCxcbiAgY2hhcnRyZXVzZTogMHg3ZmZmMDAsXG4gIGNob2NvbGF0ZTogMHhkMjY5MWUsXG4gIGNvcmFsOiAweGZmN2Y1MCxcbiAgY29ybmZsb3dlcmJsdWU6IDB4NjQ5NWVkLFxuICBjb3Juc2lsazogMHhmZmY4ZGMsXG4gIGNyaW1zb246IDB4ZGMxNDNjLFxuICBjeWFuOiAweDAwZmZmZixcbiAgZGFya2JsdWU6IDB4MDAwMDhiLFxuICBkYXJrY3lhbjogMHgwMDhiOGIsXG4gIGRhcmtnb2xkZW5yb2Q6IDB4Yjg4NjBiLFxuICBkYXJrZ3JheTogMHhhOWE5YTksXG4gIGRhcmtncmVlbjogMHgwMDY0MDAsXG4gIGRhcmtncmV5OiAweGE5YTlhOSxcbiAgZGFya2toYWtpOiAweGJkYjc2YixcbiAgZGFya21hZ2VudGE6IDB4OGIwMDhiLFxuICBkYXJrb2xpdmVncmVlbjogMHg1NTZiMmYsXG4gIGRhcmtvcmFuZ2U6IDB4ZmY4YzAwLFxuICBkYXJrb3JjaGlkOiAweDk5MzJjYyxcbiAgZGFya3JlZDogMHg4YjAwMDAsXG4gIGRhcmtzYWxtb246IDB4ZTk5NjdhLFxuICBkYXJrc2VhZ3JlZW46IDB4OGZiYzhmLFxuICBkYXJrc2xhdGVibHVlOiAweDQ4M2Q4YixcbiAgZGFya3NsYXRlZ3JheTogMHgyZjRmNGYsXG4gIGRhcmtzbGF0ZWdyZXk6IDB4MmY0ZjRmLFxuICBkYXJrdHVycXVvaXNlOiAweDAwY2VkMSxcbiAgZGFya3Zpb2xldDogMHg5NDAwZDMsXG4gIGRlZXBwaW5rOiAweGZmMTQ5MyxcbiAgZGVlcHNreWJsdWU6IDB4MDBiZmZmLFxuICBkaW1ncmF5OiAweDY5Njk2OSxcbiAgZGltZ3JleTogMHg2OTY5NjksXG4gIGRvZGdlcmJsdWU6IDB4MWU5MGZmLFxuICBmaXJlYnJpY2s6IDB4YjIyMjIyLFxuICBmbG9yYWx3aGl0ZTogMHhmZmZhZjAsXG4gIGZvcmVzdGdyZWVuOiAweDIyOGIyMixcbiAgZnVjaHNpYTogMHhmZjAwZmYsXG4gIGdhaW5zYm9ybzogMHhkY2RjZGMsXG4gIGdob3N0d2hpdGU6IDB4ZjhmOGZmLFxuICBnb2xkOiAweGZmZDcwMCxcbiAgZ29sZGVucm9kOiAweGRhYTUyMCxcbiAgZ3JheTogMHg4MDgwODAsXG4gIGdyZWVuOiAweDAwODAwMCxcbiAgZ3JlZW55ZWxsb3c6IDB4YWRmZjJmLFxuICBncmV5OiAweDgwODA4MCxcbiAgaG9uZXlkZXc6IDB4ZjBmZmYwLFxuICBob3RwaW5rOiAweGZmNjliNCxcbiAgaW5kaWFucmVkOiAweGNkNWM1YyxcbiAgaW5kaWdvOiAweDRiMDA4MixcbiAgaXZvcnk6IDB4ZmZmZmYwLFxuICBraGFraTogMHhmMGU2OGMsXG4gIGxhdmVuZGVyOiAweGU2ZTZmYSxcbiAgbGF2ZW5kZXJibHVzaDogMHhmZmYwZjUsXG4gIGxhd25ncmVlbjogMHg3Y2ZjMDAsXG4gIGxlbW9uY2hpZmZvbjogMHhmZmZhY2QsXG4gIGxpZ2h0Ymx1ZTogMHhhZGQ4ZTYsXG4gIGxpZ2h0Y29yYWw6IDB4ZjA4MDgwLFxuICBsaWdodGN5YW46IDB4ZTBmZmZmLFxuICBsaWdodGdvbGRlbnJvZHllbGxvdzogMHhmYWZhZDIsXG4gIGxpZ2h0Z3JheTogMHhkM2QzZDMsXG4gIGxpZ2h0Z3JlZW46IDB4OTBlZTkwLFxuICBsaWdodGdyZXk6IDB4ZDNkM2QzLFxuICBsaWdodHBpbms6IDB4ZmZiNmMxLFxuICBsaWdodHNhbG1vbjogMHhmZmEwN2EsXG4gIGxpZ2h0c2VhZ3JlZW46IDB4MjBiMmFhLFxuICBsaWdodHNreWJsdWU6IDB4ODdjZWZhLFxuICBsaWdodHNsYXRlZ3JheTogMHg3Nzg4OTksXG4gIGxpZ2h0c2xhdGVncmV5OiAweDc3ODg5OSxcbiAgbGlnaHRzdGVlbGJsdWU6IDB4YjBjNGRlLFxuICBsaWdodHllbGxvdzogMHhmZmZmZTAsXG4gIGxpbWU6IDB4MDBmZjAwLFxuICBsaW1lZ3JlZW46IDB4MzJjZDMyLFxuICBsaW5lbjogMHhmYWYwZTYsXG4gIG1hZ2VudGE6IDB4ZmYwMGZmLFxuICBtYXJvb246IDB4ODAwMDAwLFxuICBtZWRpdW1hcXVhbWFyaW5lOiAweDY2Y2RhYSxcbiAgbWVkaXVtYmx1ZTogMHgwMDAwY2QsXG4gIG1lZGl1bW9yY2hpZDogMHhiYTU1ZDMsXG4gIG1lZGl1bXB1cnBsZTogMHg5MzcwZGIsXG4gIG1lZGl1bXNlYWdyZWVuOiAweDNjYjM3MSxcbiAgbWVkaXVtc2xhdGVibHVlOiAweDdiNjhlZSxcbiAgbWVkaXVtc3ByaW5nZ3JlZW46IDB4MDBmYTlhLFxuICBtZWRpdW10dXJxdW9pc2U6IDB4NDhkMWNjLFxuICBtZWRpdW12aW9sZXRyZWQ6IDB4YzcxNTg1LFxuICBtaWRuaWdodGJsdWU6IDB4MTkxOTcwLFxuICBtaW50Y3JlYW06IDB4ZjVmZmZhLFxuICBtaXN0eXJvc2U6IDB4ZmZlNGUxLFxuICBtb2NjYXNpbjogMHhmZmU0YjUsXG4gIG5hdmFqb3doaXRlOiAweGZmZGVhZCxcbiAgbmF2eTogMHgwMDAwODAsXG4gIG9sZGxhY2U6IDB4ZmRmNWU2LFxuICBvbGl2ZTogMHg4MDgwMDAsXG4gIG9saXZlZHJhYjogMHg2YjhlMjMsXG4gIG9yYW5nZTogMHhmZmE1MDAsXG4gIG9yYW5nZXJlZDogMHhmZjQ1MDAsXG4gIG9yY2hpZDogMHhkYTcwZDYsXG4gIHBhbGVnb2xkZW5yb2Q6IDB4ZWVlOGFhLFxuICBwYWxlZ3JlZW46IDB4OThmYjk4LFxuICBwYWxldHVycXVvaXNlOiAweGFmZWVlZSxcbiAgcGFsZXZpb2xldHJlZDogMHhkYjcwOTMsXG4gIHBhcGF5YXdoaXA6IDB4ZmZlZmQ1LFxuICBwZWFjaHB1ZmY6IDB4ZmZkYWI5LFxuICBwZXJ1OiAweGNkODUzZixcbiAgcGluazogMHhmZmMwY2IsXG4gIHBsdW06IDB4ZGRhMGRkLFxuICBwb3dkZXJibHVlOiAweGIwZTBlNixcbiAgcHVycGxlOiAweDgwMDA4MCxcbiAgcmViZWNjYXB1cnBsZTogMHg2NjMzOTksXG4gIHJlZDogMHhmZjAwMDAsXG4gIHJvc3licm93bjogMHhiYzhmOGYsXG4gIHJveWFsYmx1ZTogMHg0MTY5ZTEsXG4gIHNhZGRsZWJyb3duOiAweDhiNDUxMyxcbiAgc2FsbW9uOiAweGZhODA3MixcbiAgc2FuZHlicm93bjogMHhmNGE0NjAsXG4gIHNlYWdyZWVuOiAweDJlOGI1NyxcbiAgc2Vhc2hlbGw6IDB4ZmZmNWVlLFxuICBzaWVubmE6IDB4YTA1MjJkLFxuICBzaWx2ZXI6IDB4YzBjMGMwLFxuICBza3libHVlOiAweDg3Y2VlYixcbiAgc2xhdGVibHVlOiAweDZhNWFjZCxcbiAgc2xhdGVncmF5OiAweDcwODA5MCxcbiAgc2xhdGVncmV5OiAweDcwODA5MCxcbiAgc25vdzogMHhmZmZhZmEsXG4gIHNwcmluZ2dyZWVuOiAweDAwZmY3ZixcbiAgc3RlZWxibHVlOiAweDQ2ODJiNCxcbiAgdGFuOiAweGQyYjQ4YyxcbiAgdGVhbDogMHgwMDgwODAsXG4gIHRoaXN0bGU6IDB4ZDhiZmQ4LFxuICB0b21hdG86IDB4ZmY2MzQ3LFxuICB0dXJxdW9pc2U6IDB4NDBlMGQwLFxuICB2aW9sZXQ6IDB4ZWU4MmVlLFxuICB3aGVhdDogMHhmNWRlYjMsXG4gIHdoaXRlOiAweGZmZmZmZixcbiAgd2hpdGVzbW9rZTogMHhmNWY1ZjUsXG4gIHllbGxvdzogMHhmZmZmMDAsXG4gIHllbGxvd2dyZWVuOiAweDlhY2QzMlxufTtcblxuZGVmaW5lKENvbG9yLCBjb2xvciwge1xuICBkaXNwbGF5YWJsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucmdiKCkuZGlzcGxheWFibGUoKTtcbiAgfSxcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJnYigpICsgXCJcIjtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIGNvbG9yKGZvcm1hdCkge1xuICB2YXIgbTtcbiAgZm9ybWF0ID0gKGZvcm1hdCArIFwiXCIpLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICByZXR1cm4gKG0gPSByZUhleDMuZXhlYyhmb3JtYXQpKSA/IChtID0gcGFyc2VJbnQobVsxXSwgMTYpLCBuZXcgUmdiKChtID4+IDggJiAweGYpIHwgKG0gPj4gNCAmIDB4MGYwKSwgKG0gPj4gNCAmIDB4ZikgfCAobSAmIDB4ZjApLCAoKG0gJiAweGYpIDw8IDQpIHwgKG0gJiAweGYpLCAxKSkgLy8gI2YwMFxuICAgICAgOiAobSA9IHJlSGV4Ni5leGVjKGZvcm1hdCkpID8gcmdibihwYXJzZUludChtWzFdLCAxNikpIC8vICNmZjAwMDBcbiAgICAgIDogKG0gPSByZVJnYkludGVnZXIuZXhlYyhmb3JtYXQpKSA/IG5ldyBSZ2IobVsxXSwgbVsyXSwgbVszXSwgMSkgLy8gcmdiKDI1NSwgMCwgMClcbiAgICAgIDogKG0gPSByZVJnYlBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IG5ldyBSZ2IobVsxXSAqIDI1NSAvIDEwMCwgbVsyXSAqIDI1NSAvIDEwMCwgbVszXSAqIDI1NSAvIDEwMCwgMSkgLy8gcmdiKDEwMCUsIDAlLCAwJSlcbiAgICAgIDogKG0gPSByZVJnYmFJbnRlZ2VyLmV4ZWMoZm9ybWF0KSkgPyByZ2JhKG1bMV0sIG1bMl0sIG1bM10sIG1bNF0pIC8vIHJnYmEoMjU1LCAwLCAwLCAxKVxuICAgICAgOiAobSA9IHJlUmdiYVBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IHJnYmEobVsxXSAqIDI1NSAvIDEwMCwgbVsyXSAqIDI1NSAvIDEwMCwgbVszXSAqIDI1NSAvIDEwMCwgbVs0XSkgLy8gcmdiKDEwMCUsIDAlLCAwJSwgMSlcbiAgICAgIDogKG0gPSByZUhzbFBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IGhzbGEobVsxXSwgbVsyXSAvIDEwMCwgbVszXSAvIDEwMCwgMSkgLy8gaHNsKDEyMCwgNTAlLCA1MCUpXG4gICAgICA6IChtID0gcmVIc2xhUGVyY2VudC5leGVjKGZvcm1hdCkpID8gaHNsYShtWzFdLCBtWzJdIC8gMTAwLCBtWzNdIC8gMTAwLCBtWzRdKSAvLyBoc2xhKDEyMCwgNTAlLCA1MCUsIDEpXG4gICAgICA6IG5hbWVkLmhhc093blByb3BlcnR5KGZvcm1hdCkgPyByZ2JuKG5hbWVkW2Zvcm1hdF0pXG4gICAgICA6IGZvcm1hdCA9PT0gXCJ0cmFuc3BhcmVudFwiID8gbmV3IFJnYihOYU4sIE5hTiwgTmFOLCAwKVxuICAgICAgOiBudWxsO1xufVxuXG5mdW5jdGlvbiByZ2JuKG4pIHtcbiAgcmV0dXJuIG5ldyBSZ2IobiA+PiAxNiAmIDB4ZmYsIG4gPj4gOCAmIDB4ZmYsIG4gJiAweGZmLCAxKTtcbn1cblxuZnVuY3Rpb24gcmdiYShyLCBnLCBiLCBhKSB7XG4gIGlmIChhIDw9IDApIHIgPSBnID0gYiA9IE5hTjtcbiAgcmV0dXJuIG5ldyBSZ2IociwgZywgYiwgYSk7XG59XG5cbmZ1bmN0aW9uIHJnYkNvbnZlcnQobykge1xuICBpZiAoIShvIGluc3RhbmNlb2YgQ29sb3IpKSBvID0gY29sb3Iobyk7XG4gIGlmICghbykgcmV0dXJuIG5ldyBSZ2I7XG4gIG8gPSBvLnJnYigpO1xuICByZXR1cm4gbmV3IFJnYihvLnIsIG8uZywgby5iLCBvLm9wYWNpdHkpO1xufVxuXG5mdW5jdGlvbiByZ2IociwgZywgYiwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IHJnYkNvbnZlcnQocikgOiBuZXcgUmdiKHIsIGcsIGIsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gUmdiKHIsIGcsIGIsIG9wYWNpdHkpIHtcbiAgdGhpcy5yID0gK3I7XG4gIHRoaXMuZyA9ICtnO1xuICB0aGlzLmIgPSArYjtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShSZ2IsIHJnYiwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGJyaWdodGVyIDogTWF0aC5wb3coYnJpZ2h0ZXIsIGspO1xuICAgIHJldHVybiBuZXcgUmdiKHRoaXMuciAqIGssIHRoaXMuZyAqIGssIHRoaXMuYiAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBkYXJrZXIgOiBNYXRoLnBvdyhkYXJrZXIsIGspO1xuICAgIHJldHVybiBuZXcgUmdiKHRoaXMuciAqIGssIHRoaXMuZyAqIGssIHRoaXMuYiAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGRpc3BsYXlhYmxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKDAgPD0gdGhpcy5yICYmIHRoaXMuciA8PSAyNTUpXG4gICAgICAgICYmICgwIDw9IHRoaXMuZyAmJiB0aGlzLmcgPD0gMjU1KVxuICAgICAgICAmJiAoMCA8PSB0aGlzLmIgJiYgdGhpcy5iIDw9IDI1NSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5vcGFjaXR5ICYmIHRoaXMub3BhY2l0eSA8PSAxKTtcbiAgfSxcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy5vcGFjaXR5OyBhID0gaXNOYU4oYSkgPyAxIDogTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgYSkpO1xuICAgIHJldHVybiAoYSA9PT0gMSA/IFwicmdiKFwiIDogXCJyZ2JhKFwiKVxuICAgICAgICArIE1hdGgubWF4KDAsIE1hdGgubWluKDI1NSwgTWF0aC5yb3VuZCh0aGlzLnIpIHx8IDApKSArIFwiLCBcIlxuICAgICAgICArIE1hdGgubWF4KDAsIE1hdGgubWluKDI1NSwgTWF0aC5yb3VuZCh0aGlzLmcpIHx8IDApKSArIFwiLCBcIlxuICAgICAgICArIE1hdGgubWF4KDAsIE1hdGgubWluKDI1NSwgTWF0aC5yb3VuZCh0aGlzLmIpIHx8IDApKVxuICAgICAgICArIChhID09PSAxID8gXCIpXCIgOiBcIiwgXCIgKyBhICsgXCIpXCIpO1xuICB9XG59KSk7XG5cbmZ1bmN0aW9uIGhzbGEoaCwgcywgbCwgYSkge1xuICBpZiAoYSA8PSAwKSBoID0gcyA9IGwgPSBOYU47XG4gIGVsc2UgaWYgKGwgPD0gMCB8fCBsID49IDEpIGggPSBzID0gTmFOO1xuICBlbHNlIGlmIChzIDw9IDApIGggPSBOYU47XG4gIHJldHVybiBuZXcgSHNsKGgsIHMsIGwsIGEpO1xufVxuXG5mdW5jdGlvbiBoc2xDb252ZXJ0KG8pIHtcbiAgaWYgKG8gaW5zdGFuY2VvZiBIc2wpIHJldHVybiBuZXcgSHNsKG8uaCwgby5zLCBvLmwsIG8ub3BhY2l0eSk7XG4gIGlmICghKG8gaW5zdGFuY2VvZiBDb2xvcikpIG8gPSBjb2xvcihvKTtcbiAgaWYgKCFvKSByZXR1cm4gbmV3IEhzbDtcbiAgaWYgKG8gaW5zdGFuY2VvZiBIc2wpIHJldHVybiBvO1xuICBvID0gby5yZ2IoKTtcbiAgdmFyIHIgPSBvLnIgLyAyNTUsXG4gICAgICBnID0gby5nIC8gMjU1LFxuICAgICAgYiA9IG8uYiAvIDI1NSxcbiAgICAgIG1pbiA9IE1hdGgubWluKHIsIGcsIGIpLFxuICAgICAgbWF4ID0gTWF0aC5tYXgociwgZywgYiksXG4gICAgICBoID0gTmFOLFxuICAgICAgcyA9IG1heCAtIG1pbixcbiAgICAgIGwgPSAobWF4ICsgbWluKSAvIDI7XG4gIGlmIChzKSB7XG4gICAgaWYgKHIgPT09IG1heCkgaCA9IChnIC0gYikgLyBzICsgKGcgPCBiKSAqIDY7XG4gICAgZWxzZSBpZiAoZyA9PT0gbWF4KSBoID0gKGIgLSByKSAvIHMgKyAyO1xuICAgIGVsc2UgaCA9IChyIC0gZykgLyBzICsgNDtcbiAgICBzIC89IGwgPCAwLjUgPyBtYXggKyBtaW4gOiAyIC0gbWF4IC0gbWluO1xuICAgIGggKj0gNjA7XG4gIH0gZWxzZSB7XG4gICAgcyA9IGwgPiAwICYmIGwgPCAxID8gMCA6IGg7XG4gIH1cbiAgcmV0dXJuIG5ldyBIc2woaCwgcywgbCwgby5vcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gaHNsKGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBoc2xDb252ZXJ0KGgpIDogbmV3IEhzbChoLCBzLCBsLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmZ1bmN0aW9uIEhzbChoLCBzLCBsLCBvcGFjaXR5KSB7XG4gIHRoaXMuaCA9ICtoO1xuICB0aGlzLnMgPSArcztcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoSHNsLCBoc2wsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBicmlnaHRlciA6IE1hdGgucG93KGJyaWdodGVyLCBrKTtcbiAgICByZXR1cm4gbmV3IEhzbCh0aGlzLmgsIHRoaXMucywgdGhpcy5sICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGRhcmtlciA6IE1hdGgucG93KGRhcmtlciwgayk7XG4gICAgcmV0dXJuIG5ldyBIc2wodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGggPSB0aGlzLmggJSAzNjAgKyAodGhpcy5oIDwgMCkgKiAzNjAsXG4gICAgICAgIHMgPSBpc05hTihoKSB8fCBpc05hTih0aGlzLnMpID8gMCA6IHRoaXMucyxcbiAgICAgICAgbCA9IHRoaXMubCxcbiAgICAgICAgbTIgPSBsICsgKGwgPCAwLjUgPyBsIDogMSAtIGwpICogcyxcbiAgICAgICAgbTEgPSAyICogbCAtIG0yO1xuICAgIHJldHVybiBuZXcgUmdiKFxuICAgICAgaHNsMnJnYihoID49IDI0MCA/IGggLSAyNDAgOiBoICsgMTIwLCBtMSwgbTIpLFxuICAgICAgaHNsMnJnYihoLCBtMSwgbTIpLFxuICAgICAgaHNsMnJnYihoIDwgMTIwID8gaCArIDI0MCA6IGggLSAxMjAsIG0xLCBtMiksXG4gICAgICB0aGlzLm9wYWNpdHlcbiAgICApO1xuICB9LFxuICBkaXNwbGF5YWJsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgwIDw9IHRoaXMucyAmJiB0aGlzLnMgPD0gMSB8fCBpc05hTih0aGlzLnMpKVxuICAgICAgICAmJiAoMCA8PSB0aGlzLmwgJiYgdGhpcy5sIDw9IDEpXG4gICAgICAgICYmICgwIDw9IHRoaXMub3BhY2l0eSAmJiB0aGlzLm9wYWNpdHkgPD0gMSk7XG4gIH1cbn0pKTtcblxuLyogRnJvbSBGdkQgMTMuMzcsIENTUyBDb2xvciBNb2R1bGUgTGV2ZWwgMyAqL1xuZnVuY3Rpb24gaHNsMnJnYihoLCBtMSwgbTIpIHtcbiAgcmV0dXJuIChoIDwgNjAgPyBtMSArIChtMiAtIG0xKSAqIGggLyA2MFxuICAgICAgOiBoIDwgMTgwID8gbTJcbiAgICAgIDogaCA8IDI0MCA/IG0xICsgKG0yIC0gbTEpICogKDI0MCAtIGgpIC8gNjBcbiAgICAgIDogbTEpICogMjU1O1xufVxuXG52YXIgZGVnMnJhZCA9IE1hdGguUEkgLyAxODA7XG52YXIgcmFkMmRlZyA9IDE4MCAvIE1hdGguUEk7XG5cbnZhciBLbiA9IDE4O1xudmFyIFhuID0gMC45NTA0NzA7XG52YXIgWW4gPSAxO1xudmFyIFpuID0gMS4wODg4MzA7XG52YXIgdDAgPSA0IC8gMjk7XG52YXIgdDEgPSA2IC8gMjk7XG52YXIgdDIgPSAzICogdDEgKiB0MTtcbnZhciB0MyA9IHQxICogdDEgKiB0MTtcblxuZnVuY3Rpb24gbGFiQ29udmVydChvKSB7XG4gIGlmIChvIGluc3RhbmNlb2YgTGFiKSByZXR1cm4gbmV3IExhYihvLmwsIG8uYSwgby5iLCBvLm9wYWNpdHkpO1xuICBpZiAobyBpbnN0YW5jZW9mIEhjbCkge1xuICAgIHZhciBoID0gby5oICogZGVnMnJhZDtcbiAgICByZXR1cm4gbmV3IExhYihvLmwsIE1hdGguY29zKGgpICogby5jLCBNYXRoLnNpbihoKSAqIG8uYywgby5vcGFjaXR5KTtcbiAgfVxuICBpZiAoIShvIGluc3RhbmNlb2YgUmdiKSkgbyA9IHJnYkNvbnZlcnQobyk7XG4gIHZhciBiID0gcmdiMnh5eihvLnIpLFxuICAgICAgYSA9IHJnYjJ4eXooby5nKSxcbiAgICAgIGwgPSByZ2IyeHl6KG8uYiksXG4gICAgICB4ID0geHl6MmxhYigoMC40MTI0NTY0ICogYiArIDAuMzU3NTc2MSAqIGEgKyAwLjE4MDQzNzUgKiBsKSAvIFhuKSxcbiAgICAgIHkgPSB4eXoybGFiKCgwLjIxMjY3MjkgKiBiICsgMC43MTUxNTIyICogYSArIDAuMDcyMTc1MCAqIGwpIC8gWW4pLFxuICAgICAgeiA9IHh5ejJsYWIoKDAuMDE5MzMzOSAqIGIgKyAwLjExOTE5MjAgKiBhICsgMC45NTAzMDQxICogbCkgLyBabik7XG4gIHJldHVybiBuZXcgTGFiKDExNiAqIHkgLSAxNiwgNTAwICogKHggLSB5KSwgMjAwICogKHkgLSB6KSwgby5vcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gbGFiKGwsIGEsIGIsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBsYWJDb252ZXJ0KGwpIDogbmV3IExhYihsLCBhLCBiLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmZ1bmN0aW9uIExhYihsLCBhLCBiLCBvcGFjaXR5KSB7XG4gIHRoaXMubCA9ICtsO1xuICB0aGlzLmEgPSArYTtcbiAgdGhpcy5iID0gK2I7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoTGFiLCBsYWIsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgTGFiKHRoaXMubCArIEtuICogKGsgPT0gbnVsbCA/IDEgOiBrKSwgdGhpcy5hLCB0aGlzLmIsIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgTGFiKHRoaXMubCAtIEtuICogKGsgPT0gbnVsbCA/IDEgOiBrKSwgdGhpcy5hLCB0aGlzLmIsIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHkgPSAodGhpcy5sICsgMTYpIC8gMTE2LFxuICAgICAgICB4ID0gaXNOYU4odGhpcy5hKSA/IHkgOiB5ICsgdGhpcy5hIC8gNTAwLFxuICAgICAgICB6ID0gaXNOYU4odGhpcy5iKSA/IHkgOiB5IC0gdGhpcy5iIC8gMjAwO1xuICAgIHkgPSBZbiAqIGxhYjJ4eXooeSk7XG4gICAgeCA9IFhuICogbGFiMnh5eih4KTtcbiAgICB6ID0gWm4gKiBsYWIyeHl6KHopO1xuICAgIHJldHVybiBuZXcgUmdiKFxuICAgICAgeHl6MnJnYiggMy4yNDA0NTQyICogeCAtIDEuNTM3MTM4NSAqIHkgLSAwLjQ5ODUzMTQgKiB6KSwgLy8gRDY1IC0+IHNSR0JcbiAgICAgIHh5ejJyZ2IoLTAuOTY5MjY2MCAqIHggKyAxLjg3NjAxMDggKiB5ICsgMC4wNDE1NTYwICogeiksXG4gICAgICB4eXoycmdiKCAwLjA1NTY0MzQgKiB4IC0gMC4yMDQwMjU5ICogeSArIDEuMDU3MjI1MiAqIHopLFxuICAgICAgdGhpcy5vcGFjaXR5XG4gICAgKTtcbiAgfVxufSkpO1xuXG5mdW5jdGlvbiB4eXoybGFiKHQpIHtcbiAgcmV0dXJuIHQgPiB0MyA/IE1hdGgucG93KHQsIDEgLyAzKSA6IHQgLyB0MiArIHQwO1xufVxuXG5mdW5jdGlvbiBsYWIyeHl6KHQpIHtcbiAgcmV0dXJuIHQgPiB0MSA/IHQgKiB0ICogdCA6IHQyICogKHQgLSB0MCk7XG59XG5cbmZ1bmN0aW9uIHh5ejJyZ2IoeCkge1xuICByZXR1cm4gMjU1ICogKHggPD0gMC4wMDMxMzA4ID8gMTIuOTIgKiB4IDogMS4wNTUgKiBNYXRoLnBvdyh4LCAxIC8gMi40KSAtIDAuMDU1KTtcbn1cblxuZnVuY3Rpb24gcmdiMnh5eih4KSB7XG4gIHJldHVybiAoeCAvPSAyNTUpIDw9IDAuMDQwNDUgPyB4IC8gMTIuOTIgOiBNYXRoLnBvdygoeCArIDAuMDU1KSAvIDEuMDU1LCAyLjQpO1xufVxuXG5mdW5jdGlvbiBoY2xDb252ZXJ0KG8pIHtcbiAgaWYgKG8gaW5zdGFuY2VvZiBIY2wpIHJldHVybiBuZXcgSGNsKG8uaCwgby5jLCBvLmwsIG8ub3BhY2l0eSk7XG4gIGlmICghKG8gaW5zdGFuY2VvZiBMYWIpKSBvID0gbGFiQ29udmVydChvKTtcbiAgdmFyIGggPSBNYXRoLmF0YW4yKG8uYiwgby5hKSAqIHJhZDJkZWc7XG4gIHJldHVybiBuZXcgSGNsKGggPCAwID8gaCArIDM2MCA6IGgsIE1hdGguc3FydChvLmEgKiBvLmEgKyBvLmIgKiBvLmIpLCBvLmwsIG8ub3BhY2l0eSk7XG59XG5cbmZ1bmN0aW9uIGhjbChoLCBjLCBsLCBvcGFjaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gaGNsQ29udmVydChoKSA6IG5ldyBIY2woaCwgYywgbCwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5mdW5jdGlvbiBIY2woaCwgYywgbCwgb3BhY2l0eSkge1xuICB0aGlzLmggPSAraDtcbiAgdGhpcy5jID0gK2M7XG4gIHRoaXMubCA9ICtsO1xuICB0aGlzLm9wYWNpdHkgPSArb3BhY2l0eTtcbn1cblxuZGVmaW5lKEhjbCwgaGNsLCBleHRlbmQoQ29sb3IsIHtcbiAgYnJpZ2h0ZXI6IGZ1bmN0aW9uKGspIHtcbiAgICByZXR1cm4gbmV3IEhjbCh0aGlzLmgsIHRoaXMuYywgdGhpcy5sICsgS24gKiAoayA9PSBudWxsID8gMSA6IGspLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXI6IGZ1bmN0aW9uKGspIHtcbiAgICByZXR1cm4gbmV3IEhjbCh0aGlzLmgsIHRoaXMuYywgdGhpcy5sIC0gS24gKiAoayA9PSBudWxsID8gMSA6IGspLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICByZ2I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBsYWJDb252ZXJ0KHRoaXMpLnJnYigpO1xuICB9XG59KSk7XG5cbnZhciBBID0gLTAuMTQ4NjE7XG52YXIgQiA9ICsxLjc4Mjc3O1xudmFyIEMgPSAtMC4yOTIyNztcbnZhciBEID0gLTAuOTA2NDk7XG52YXIgRSA9ICsxLjk3Mjk0O1xudmFyIEVEID0gRSAqIEQ7XG52YXIgRUIgPSBFICogQjtcbnZhciBCQ19EQSA9IEIgKiBDIC0gRCAqIEE7XG5cbmZ1bmN0aW9uIGN1YmVoZWxpeENvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIEN1YmVoZWxpeCkgcmV0dXJuIG5ldyBDdWJlaGVsaXgoby5oLCBvLnMsIG8ubCwgby5vcGFjaXR5KTtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIFJnYikpIG8gPSByZ2JDb252ZXJ0KG8pO1xuICB2YXIgciA9IG8uciAvIDI1NSxcbiAgICAgIGcgPSBvLmcgLyAyNTUsXG4gICAgICBiID0gby5iIC8gMjU1LFxuICAgICAgbCA9IChCQ19EQSAqIGIgKyBFRCAqIHIgLSBFQiAqIGcpIC8gKEJDX0RBICsgRUQgLSBFQiksXG4gICAgICBibCA9IGIgLSBsLFxuICAgICAgayA9IChFICogKGcgLSBsKSAtIEMgKiBibCkgLyBELFxuICAgICAgcyA9IE1hdGguc3FydChrICogayArIGJsICogYmwpIC8gKEUgKiBsICogKDEgLSBsKSksIC8vIE5hTiBpZiBsPTAgb3IgbD0xXG4gICAgICBoID0gcyA/IE1hdGguYXRhbjIoaywgYmwpICogcmFkMmRlZyAtIDEyMCA6IE5hTjtcbiAgcmV0dXJuIG5ldyBDdWJlaGVsaXgoaCA8IDAgPyBoICsgMzYwIDogaCwgcywgbCwgby5vcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gY3ViZWhlbGl4KGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBjdWJlaGVsaXhDb252ZXJ0KGgpIDogbmV3IEN1YmVoZWxpeChoLCBzLCBsLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmZ1bmN0aW9uIEN1YmVoZWxpeChoLCBzLCBsLCBvcGFjaXR5KSB7XG4gIHRoaXMuaCA9ICtoO1xuICB0aGlzLnMgPSArcztcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoQ3ViZWhlbGl4LCBjdWJlaGVsaXgsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBicmlnaHRlciA6IE1hdGgucG93KGJyaWdodGVyLCBrKTtcbiAgICByZXR1cm4gbmV3IEN1YmVoZWxpeCh0aGlzLmgsIHRoaXMucywgdGhpcy5sICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGRhcmtlciA6IE1hdGgucG93KGRhcmtlciwgayk7XG4gICAgcmV0dXJuIG5ldyBDdWJlaGVsaXgodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGggPSBpc05hTih0aGlzLmgpID8gMCA6ICh0aGlzLmggKyAxMjApICogZGVnMnJhZCxcbiAgICAgICAgbCA9ICt0aGlzLmwsXG4gICAgICAgIGEgPSBpc05hTih0aGlzLnMpID8gMCA6IHRoaXMucyAqIGwgKiAoMSAtIGwpLFxuICAgICAgICBjb3NoID0gTWF0aC5jb3MoaCksXG4gICAgICAgIHNpbmggPSBNYXRoLnNpbihoKTtcbiAgICByZXR1cm4gbmV3IFJnYihcbiAgICAgIDI1NSAqIChsICsgYSAqIChBICogY29zaCArIEIgKiBzaW5oKSksXG4gICAgICAyNTUgKiAobCArIGEgKiAoQyAqIGNvc2ggKyBEICogc2luaCkpLFxuICAgICAgMjU1ICogKGwgKyBhICogKEUgKiBjb3NoKSksXG4gICAgICB0aGlzLm9wYWNpdHlcbiAgICApO1xuICB9XG59KSk7XG5cbmV4cG9ydHMuY29sb3IgPSBjb2xvcjtcbmV4cG9ydHMucmdiID0gcmdiO1xuZXhwb3J0cy5oc2wgPSBoc2w7XG5leHBvcnRzLmxhYiA9IGxhYjtcbmV4cG9ydHMuaGNsID0gaGNsO1xuZXhwb3J0cy5jdWJlaGVsaXggPSBjdWJlaGVsaXg7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4iLCIvLyBodHRwczovL2QzanMub3JnL2QzLWZvcm1hdC8gVmVyc2lvbiAxLjIuMC4gQ29weXJpZ2h0IDIwMTcgTWlrZSBCb3N0b2NrLlxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuXHQoZmFjdG9yeSgoZ2xvYmFsLmQzID0gZ2xvYmFsLmQzIHx8IHt9KSkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG4vLyBDb21wdXRlcyB0aGUgZGVjaW1hbCBjb2VmZmljaWVudCBhbmQgZXhwb25lbnQgb2YgdGhlIHNwZWNpZmllZCBudW1iZXIgeCB3aXRoXG4vLyBzaWduaWZpY2FudCBkaWdpdHMgcCwgd2hlcmUgeCBpcyBwb3NpdGl2ZSBhbmQgcCBpcyBpbiBbMSwgMjFdIG9yIHVuZGVmaW5lZC5cbi8vIEZvciBleGFtcGxlLCBmb3JtYXREZWNpbWFsKDEuMjMpIHJldHVybnMgW1wiMTIzXCIsIDBdLlxudmFyIGZvcm1hdERlY2ltYWwgPSBmdW5jdGlvbih4LCBwKSB7XG4gIGlmICgoaSA9ICh4ID0gcCA/IHgudG9FeHBvbmVudGlhbChwIC0gMSkgOiB4LnRvRXhwb25lbnRpYWwoKSkuaW5kZXhPZihcImVcIikpIDwgMCkgcmV0dXJuIG51bGw7IC8vIE5hTiwgwrFJbmZpbml0eVxuICB2YXIgaSwgY29lZmZpY2llbnQgPSB4LnNsaWNlKDAsIGkpO1xuXG4gIC8vIFRoZSBzdHJpbmcgcmV0dXJuZWQgYnkgdG9FeHBvbmVudGlhbCBlaXRoZXIgaGFzIHRoZSBmb3JtIFxcZFxcLlxcZCtlWy0rXVxcZCtcbiAgLy8gKGUuZy4sIDEuMmUrMykgb3IgdGhlIGZvcm0gXFxkZVstK11cXGQrIChlLmcuLCAxZSszKS5cbiAgcmV0dXJuIFtcbiAgICBjb2VmZmljaWVudC5sZW5ndGggPiAxID8gY29lZmZpY2llbnRbMF0gKyBjb2VmZmljaWVudC5zbGljZSgyKSA6IGNvZWZmaWNpZW50LFxuICAgICt4LnNsaWNlKGkgKyAxKVxuICBdO1xufTtcblxudmFyIGV4cG9uZW50ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4geCA9IGZvcm1hdERlY2ltYWwoTWF0aC5hYnMoeCkpLCB4ID8geFsxXSA6IE5hTjtcbn07XG5cbnZhciBmb3JtYXRHcm91cCA9IGZ1bmN0aW9uKGdyb3VwaW5nLCB0aG91c2FuZHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCB3aWR0aCkge1xuICAgIHZhciBpID0gdmFsdWUubGVuZ3RoLFxuICAgICAgICB0ID0gW10sXG4gICAgICAgIGogPSAwLFxuICAgICAgICBnID0gZ3JvdXBpbmdbMF0sXG4gICAgICAgIGxlbmd0aCA9IDA7XG5cbiAgICB3aGlsZSAoaSA+IDAgJiYgZyA+IDApIHtcbiAgICAgIGlmIChsZW5ndGggKyBnICsgMSA+IHdpZHRoKSBnID0gTWF0aC5tYXgoMSwgd2lkdGggLSBsZW5ndGgpO1xuICAgICAgdC5wdXNoKHZhbHVlLnN1YnN0cmluZyhpIC09IGcsIGkgKyBnKSk7XG4gICAgICBpZiAoKGxlbmd0aCArPSBnICsgMSkgPiB3aWR0aCkgYnJlYWs7XG4gICAgICBnID0gZ3JvdXBpbmdbaiA9IChqICsgMSkgJSBncm91cGluZy5sZW5ndGhdO1xuICAgIH1cblxuICAgIHJldHVybiB0LnJldmVyc2UoKS5qb2luKHRob3VzYW5kcyk7XG4gIH07XG59O1xuXG52YXIgZm9ybWF0TnVtZXJhbHMgPSBmdW5jdGlvbihudW1lcmFscykge1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUucmVwbGFjZSgvWzAtOV0vZywgZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIG51bWVyYWxzWytpXTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbnZhciBmb3JtYXREZWZhdWx0ID0gZnVuY3Rpb24oeCwgcCkge1xuICB4ID0geC50b1ByZWNpc2lvbihwKTtcblxuICBvdXQ6IGZvciAodmFyIG4gPSB4Lmxlbmd0aCwgaSA9IDEsIGkwID0gLTEsIGkxOyBpIDwgbjsgKytpKSB7XG4gICAgc3dpdGNoICh4W2ldKSB7XG4gICAgICBjYXNlIFwiLlwiOiBpMCA9IGkxID0gaTsgYnJlYWs7XG4gICAgICBjYXNlIFwiMFwiOiBpZiAoaTAgPT09IDApIGkwID0gaTsgaTEgPSBpOyBicmVhaztcbiAgICAgIGNhc2UgXCJlXCI6IGJyZWFrIG91dDtcbiAgICAgIGRlZmF1bHQ6IGlmIChpMCA+IDApIGkwID0gMDsgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGkwID4gMCA/IHguc2xpY2UoMCwgaTApICsgeC5zbGljZShpMSArIDEpIDogeDtcbn07XG5cbnZhciBwcmVmaXhFeHBvbmVudDtcblxudmFyIGZvcm1hdFByZWZpeEF1dG8gPSBmdW5jdGlvbih4LCBwKSB7XG4gIHZhciBkID0gZm9ybWF0RGVjaW1hbCh4LCBwKTtcbiAgaWYgKCFkKSByZXR1cm4geCArIFwiXCI7XG4gIHZhciBjb2VmZmljaWVudCA9IGRbMF0sXG4gICAgICBleHBvbmVudCA9IGRbMV0sXG4gICAgICBpID0gZXhwb25lbnQgLSAocHJlZml4RXhwb25lbnQgPSBNYXRoLm1heCgtOCwgTWF0aC5taW4oOCwgTWF0aC5mbG9vcihleHBvbmVudCAvIDMpKSkgKiAzKSArIDEsXG4gICAgICBuID0gY29lZmZpY2llbnQubGVuZ3RoO1xuICByZXR1cm4gaSA9PT0gbiA/IGNvZWZmaWNpZW50XG4gICAgICA6IGkgPiBuID8gY29lZmZpY2llbnQgKyBuZXcgQXJyYXkoaSAtIG4gKyAxKS5qb2luKFwiMFwiKVxuICAgICAgOiBpID4gMCA/IGNvZWZmaWNpZW50LnNsaWNlKDAsIGkpICsgXCIuXCIgKyBjb2VmZmljaWVudC5zbGljZShpKVxuICAgICAgOiBcIjAuXCIgKyBuZXcgQXJyYXkoMSAtIGkpLmpvaW4oXCIwXCIpICsgZm9ybWF0RGVjaW1hbCh4LCBNYXRoLm1heCgwLCBwICsgaSAtIDEpKVswXTsgLy8gbGVzcyB0aGFuIDF5IVxufTtcblxudmFyIGZvcm1hdFJvdW5kZWQgPSBmdW5jdGlvbih4LCBwKSB7XG4gIHZhciBkID0gZm9ybWF0RGVjaW1hbCh4LCBwKTtcbiAgaWYgKCFkKSByZXR1cm4geCArIFwiXCI7XG4gIHZhciBjb2VmZmljaWVudCA9IGRbMF0sXG4gICAgICBleHBvbmVudCA9IGRbMV07XG4gIHJldHVybiBleHBvbmVudCA8IDAgPyBcIjAuXCIgKyBuZXcgQXJyYXkoLWV4cG9uZW50KS5qb2luKFwiMFwiKSArIGNvZWZmaWNpZW50XG4gICAgICA6IGNvZWZmaWNpZW50Lmxlbmd0aCA+IGV4cG9uZW50ICsgMSA/IGNvZWZmaWNpZW50LnNsaWNlKDAsIGV4cG9uZW50ICsgMSkgKyBcIi5cIiArIGNvZWZmaWNpZW50LnNsaWNlKGV4cG9uZW50ICsgMSlcbiAgICAgIDogY29lZmZpY2llbnQgKyBuZXcgQXJyYXkoZXhwb25lbnQgLSBjb2VmZmljaWVudC5sZW5ndGggKyAyKS5qb2luKFwiMFwiKTtcbn07XG5cbnZhciBmb3JtYXRUeXBlcyA9IHtcbiAgXCJcIjogZm9ybWF0RGVmYXVsdCxcbiAgXCIlXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuICh4ICogMTAwKS50b0ZpeGVkKHApOyB9LFxuICBcImJcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygyKTsgfSxcbiAgXCJjXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggKyBcIlwiOyB9LFxuICBcImRcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygxMCk7IH0sXG4gIFwiZVwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvRXhwb25lbnRpYWwocCk7IH0sXG4gIFwiZlwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvRml4ZWQocCk7IH0sXG4gIFwiZ1wiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvUHJlY2lzaW9uKHApOyB9LFxuICBcIm9cIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZyg4KTsgfSxcbiAgXCJwXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuIGZvcm1hdFJvdW5kZWQoeCAqIDEwMCwgcCk7IH0sXG4gIFwiclwiOiBmb3JtYXRSb3VuZGVkLFxuICBcInNcIjogZm9ybWF0UHJlZml4QXV0byxcbiAgXCJYXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgucm91bmQoeCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7IH0sXG4gIFwieFwiOiBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDE2KTsgfVxufTtcblxuLy8gW1tmaWxsXWFsaWduXVtzaWduXVtzeW1ib2xdWzBdW3dpZHRoXVssXVsucHJlY2lzaW9uXVt0eXBlXVxudmFyIHJlID0gL14oPzooLik/KFs8Pj1eXSkpPyhbK1xcLVxcKCBdKT8oWyQjXSk/KDApPyhcXGQrKT8oLCk/KFxcLlxcZCspPyhbYS16JV0pPyQvaTtcblxuZnVuY3Rpb24gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcikge1xuICByZXR1cm4gbmV3IEZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpO1xufVxuXG5mb3JtYXRTcGVjaWZpZXIucHJvdG90eXBlID0gRm9ybWF0U3BlY2lmaWVyLnByb3RvdHlwZTsgLy8gaW5zdGFuY2VvZlxuXG5mdW5jdGlvbiBGb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSB7XG4gIGlmICghKG1hdGNoID0gcmUuZXhlYyhzcGVjaWZpZXIpKSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBmb3JtYXQ6IFwiICsgc3BlY2lmaWVyKTtcblxuICB2YXIgbWF0Y2gsXG4gICAgICBmaWxsID0gbWF0Y2hbMV0gfHwgXCIgXCIsXG4gICAgICBhbGlnbiA9IG1hdGNoWzJdIHx8IFwiPlwiLFxuICAgICAgc2lnbiA9IG1hdGNoWzNdIHx8IFwiLVwiLFxuICAgICAgc3ltYm9sID0gbWF0Y2hbNF0gfHwgXCJcIixcbiAgICAgIHplcm8gPSAhIW1hdGNoWzVdLFxuICAgICAgd2lkdGggPSBtYXRjaFs2XSAmJiArbWF0Y2hbNl0sXG4gICAgICBjb21tYSA9ICEhbWF0Y2hbN10sXG4gICAgICBwcmVjaXNpb24gPSBtYXRjaFs4XSAmJiArbWF0Y2hbOF0uc2xpY2UoMSksXG4gICAgICB0eXBlID0gbWF0Y2hbOV0gfHwgXCJcIjtcblxuICAvLyBUaGUgXCJuXCIgdHlwZSBpcyBhbiBhbGlhcyBmb3IgXCIsZ1wiLlxuICBpZiAodHlwZSA9PT0gXCJuXCIpIGNvbW1hID0gdHJ1ZSwgdHlwZSA9IFwiZ1wiO1xuXG4gIC8vIE1hcCBpbnZhbGlkIHR5cGVzIHRvIHRoZSBkZWZhdWx0IGZvcm1hdC5cbiAgZWxzZSBpZiAoIWZvcm1hdFR5cGVzW3R5cGVdKSB0eXBlID0gXCJcIjtcblxuICAvLyBJZiB6ZXJvIGZpbGwgaXMgc3BlY2lmaWVkLCBwYWRkaW5nIGdvZXMgYWZ0ZXIgc2lnbiBhbmQgYmVmb3JlIGRpZ2l0cy5cbiAgaWYgKHplcm8gfHwgKGZpbGwgPT09IFwiMFwiICYmIGFsaWduID09PSBcIj1cIikpIHplcm8gPSB0cnVlLCBmaWxsID0gXCIwXCIsIGFsaWduID0gXCI9XCI7XG5cbiAgdGhpcy5maWxsID0gZmlsbDtcbiAgdGhpcy5hbGlnbiA9IGFsaWduO1xuICB0aGlzLnNpZ24gPSBzaWduO1xuICB0aGlzLnN5bWJvbCA9IHN5bWJvbDtcbiAgdGhpcy56ZXJvID0gemVybztcbiAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICB0aGlzLmNvbW1hID0gY29tbWE7XG4gIHRoaXMucHJlY2lzaW9uID0gcHJlY2lzaW9uO1xuICB0aGlzLnR5cGUgPSB0eXBlO1xufVxuXG5Gb3JtYXRTcGVjaWZpZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZpbGxcbiAgICAgICsgdGhpcy5hbGlnblxuICAgICAgKyB0aGlzLnNpZ25cbiAgICAgICsgdGhpcy5zeW1ib2xcbiAgICAgICsgKHRoaXMuemVybyA/IFwiMFwiIDogXCJcIilcbiAgICAgICsgKHRoaXMud2lkdGggPT0gbnVsbCA/IFwiXCIgOiBNYXRoLm1heCgxLCB0aGlzLndpZHRoIHwgMCkpXG4gICAgICArICh0aGlzLmNvbW1hID8gXCIsXCIgOiBcIlwiKVxuICAgICAgKyAodGhpcy5wcmVjaXNpb24gPT0gbnVsbCA/IFwiXCIgOiBcIi5cIiArIE1hdGgubWF4KDAsIHRoaXMucHJlY2lzaW9uIHwgMCkpXG4gICAgICArIHRoaXMudHlwZTtcbn07XG5cbnZhciBpZGVudGl0eSA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHg7XG59O1xuXG52YXIgcHJlZml4ZXMgPSBbXCJ5XCIsXCJ6XCIsXCJhXCIsXCJmXCIsXCJwXCIsXCJuXCIsXCLCtVwiLFwibVwiLFwiXCIsXCJrXCIsXCJNXCIsXCJHXCIsXCJUXCIsXCJQXCIsXCJFXCIsXCJaXCIsXCJZXCJdO1xuXG52YXIgZm9ybWF0TG9jYWxlID0gZnVuY3Rpb24obG9jYWxlKSB7XG4gIHZhciBncm91cCA9IGxvY2FsZS5ncm91cGluZyAmJiBsb2NhbGUudGhvdXNhbmRzID8gZm9ybWF0R3JvdXAobG9jYWxlLmdyb3VwaW5nLCBsb2NhbGUudGhvdXNhbmRzKSA6IGlkZW50aXR5LFxuICAgICAgY3VycmVuY3kgPSBsb2NhbGUuY3VycmVuY3ksXG4gICAgICBkZWNpbWFsID0gbG9jYWxlLmRlY2ltYWwsXG4gICAgICBudW1lcmFscyA9IGxvY2FsZS5udW1lcmFscyA/IGZvcm1hdE51bWVyYWxzKGxvY2FsZS5udW1lcmFscykgOiBpZGVudGl0eSxcbiAgICAgIHBlcmNlbnQgPSBsb2NhbGUucGVyY2VudCB8fCBcIiVcIjtcblxuICBmdW5jdGlvbiBuZXdGb3JtYXQoc3BlY2lmaWVyKSB7XG4gICAgc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcik7XG5cbiAgICB2YXIgZmlsbCA9IHNwZWNpZmllci5maWxsLFxuICAgICAgICBhbGlnbiA9IHNwZWNpZmllci5hbGlnbixcbiAgICAgICAgc2lnbiA9IHNwZWNpZmllci5zaWduLFxuICAgICAgICBzeW1ib2wgPSBzcGVjaWZpZXIuc3ltYm9sLFxuICAgICAgICB6ZXJvID0gc3BlY2lmaWVyLnplcm8sXG4gICAgICAgIHdpZHRoID0gc3BlY2lmaWVyLndpZHRoLFxuICAgICAgICBjb21tYSA9IHNwZWNpZmllci5jb21tYSxcbiAgICAgICAgcHJlY2lzaW9uID0gc3BlY2lmaWVyLnByZWNpc2lvbixcbiAgICAgICAgdHlwZSA9IHNwZWNpZmllci50eXBlO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgcHJlZml4IGFuZCBzdWZmaXguXG4gICAgLy8gRm9yIFNJLXByZWZpeCwgdGhlIHN1ZmZpeCBpcyBsYXppbHkgY29tcHV0ZWQuXG4gICAgdmFyIHByZWZpeCA9IHN5bWJvbCA9PT0gXCIkXCIgPyBjdXJyZW5jeVswXSA6IHN5bWJvbCA9PT0gXCIjXCIgJiYgL1tib3hYXS8udGVzdCh0eXBlKSA/IFwiMFwiICsgdHlwZS50b0xvd2VyQ2FzZSgpIDogXCJcIixcbiAgICAgICAgc3VmZml4ID0gc3ltYm9sID09PSBcIiRcIiA/IGN1cnJlbmN5WzFdIDogL1slcF0vLnRlc3QodHlwZSkgPyBwZXJjZW50IDogXCJcIjtcblxuICAgIC8vIFdoYXQgZm9ybWF0IGZ1bmN0aW9uIHNob3VsZCB3ZSB1c2U/XG4gICAgLy8gSXMgdGhpcyBhbiBpbnRlZ2VyIHR5cGU/XG4gICAgLy8gQ2FuIHRoaXMgdHlwZSBnZW5lcmF0ZSBleHBvbmVudGlhbCBub3RhdGlvbj9cbiAgICB2YXIgZm9ybWF0VHlwZSA9IGZvcm1hdFR5cGVzW3R5cGVdLFxuICAgICAgICBtYXliZVN1ZmZpeCA9ICF0eXBlIHx8IC9bZGVmZ3BycyVdLy50ZXN0KHR5cGUpO1xuXG4gICAgLy8gU2V0IHRoZSBkZWZhdWx0IHByZWNpc2lvbiBpZiBub3Qgc3BlY2lmaWVkLFxuICAgIC8vIG9yIGNsYW1wIHRoZSBzcGVjaWZpZWQgcHJlY2lzaW9uIHRvIHRoZSBzdXBwb3J0ZWQgcmFuZ2UuXG4gICAgLy8gRm9yIHNpZ25pZmljYW50IHByZWNpc2lvbiwgaXQgbXVzdCBiZSBpbiBbMSwgMjFdLlxuICAgIC8vIEZvciBmaXhlZCBwcmVjaXNpb24sIGl0IG11c3QgYmUgaW4gWzAsIDIwXS5cbiAgICBwcmVjaXNpb24gPSBwcmVjaXNpb24gPT0gbnVsbCA/ICh0eXBlID8gNiA6IDEyKVxuICAgICAgICA6IC9bZ3Byc10vLnRlc3QodHlwZSkgPyBNYXRoLm1heCgxLCBNYXRoLm1pbigyMSwgcHJlY2lzaW9uKSlcbiAgICAgICAgOiBNYXRoLm1heCgwLCBNYXRoLm1pbigyMCwgcHJlY2lzaW9uKSk7XG5cbiAgICBmdW5jdGlvbiBmb3JtYXQodmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZVByZWZpeCA9IHByZWZpeCxcbiAgICAgICAgICB2YWx1ZVN1ZmZpeCA9IHN1ZmZpeCxcbiAgICAgICAgICBpLCBuLCBjO1xuXG4gICAgICBpZiAodHlwZSA9PT0gXCJjXCIpIHtcbiAgICAgICAgdmFsdWVTdWZmaXggPSBmb3JtYXRUeXBlKHZhbHVlKSArIHZhbHVlU3VmZml4O1xuICAgICAgICB2YWx1ZSA9IFwiXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9ICt2YWx1ZTtcblxuICAgICAgICAvLyBQZXJmb3JtIHRoZSBpbml0aWFsIGZvcm1hdHRpbmcuXG4gICAgICAgIHZhciB2YWx1ZU5lZ2F0aXZlID0gdmFsdWUgPCAwO1xuICAgICAgICB2YWx1ZSA9IGZvcm1hdFR5cGUoTWF0aC5hYnModmFsdWUpLCBwcmVjaXNpb24pO1xuXG4gICAgICAgIC8vIElmIGEgbmVnYXRpdmUgdmFsdWUgcm91bmRzIHRvIHplcm8gZHVyaW5nIGZvcm1hdHRpbmcsIHRyZWF0IGFzIHBvc2l0aXZlLlxuICAgICAgICBpZiAodmFsdWVOZWdhdGl2ZSAmJiArdmFsdWUgPT09IDApIHZhbHVlTmVnYXRpdmUgPSBmYWxzZTtcblxuICAgICAgICAvLyBDb21wdXRlIHRoZSBwcmVmaXggYW5kIHN1ZmZpeC5cbiAgICAgICAgdmFsdWVQcmVmaXggPSAodmFsdWVOZWdhdGl2ZSA/IChzaWduID09PSBcIihcIiA/IHNpZ24gOiBcIi1cIikgOiBzaWduID09PSBcIi1cIiB8fCBzaWduID09PSBcIihcIiA/IFwiXCIgOiBzaWduKSArIHZhbHVlUHJlZml4O1xuICAgICAgICB2YWx1ZVN1ZmZpeCA9IHZhbHVlU3VmZml4ICsgKHR5cGUgPT09IFwic1wiID8gcHJlZml4ZXNbOCArIHByZWZpeEV4cG9uZW50IC8gM10gOiBcIlwiKSArICh2YWx1ZU5lZ2F0aXZlICYmIHNpZ24gPT09IFwiKFwiID8gXCIpXCIgOiBcIlwiKTtcblxuICAgICAgICAvLyBCcmVhayB0aGUgZm9ybWF0dGVkIHZhbHVlIGludG8gdGhlIGludGVnZXIg4oCcdmFsdWXigJ0gcGFydCB0aGF0IGNhbiBiZVxuICAgICAgICAvLyBncm91cGVkLCBhbmQgZnJhY3Rpb25hbCBvciBleHBvbmVudGlhbCDigJxzdWZmaXjigJ0gcGFydCB0aGF0IGlzIG5vdC5cbiAgICAgICAgaWYgKG1heWJlU3VmZml4KSB7XG4gICAgICAgICAgaSA9IC0xLCBuID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgICBpZiAoYyA9IHZhbHVlLmNoYXJDb2RlQXQoaSksIDQ4ID4gYyB8fCBjID4gNTcpIHtcbiAgICAgICAgICAgICAgdmFsdWVTdWZmaXggPSAoYyA9PT0gNDYgPyBkZWNpbWFsICsgdmFsdWUuc2xpY2UoaSArIDEpIDogdmFsdWUuc2xpY2UoaSkpICsgdmFsdWVTdWZmaXg7XG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc2xpY2UoMCwgaSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgZmlsbCBjaGFyYWN0ZXIgaXMgbm90IFwiMFwiLCBncm91cGluZyBpcyBhcHBsaWVkIGJlZm9yZSBwYWRkaW5nLlxuICAgICAgaWYgKGNvbW1hICYmICF6ZXJvKSB2YWx1ZSA9IGdyb3VwKHZhbHVlLCBJbmZpbml0eSk7XG5cbiAgICAgIC8vIENvbXB1dGUgdGhlIHBhZGRpbmcuXG4gICAgICB2YXIgbGVuZ3RoID0gdmFsdWVQcmVmaXgubGVuZ3RoICsgdmFsdWUubGVuZ3RoICsgdmFsdWVTdWZmaXgubGVuZ3RoLFxuICAgICAgICAgIHBhZGRpbmcgPSBsZW5ndGggPCB3aWR0aCA/IG5ldyBBcnJheSh3aWR0aCAtIGxlbmd0aCArIDEpLmpvaW4oZmlsbCkgOiBcIlwiO1xuXG4gICAgICAvLyBJZiB0aGUgZmlsbCBjaGFyYWN0ZXIgaXMgXCIwXCIsIGdyb3VwaW5nIGlzIGFwcGxpZWQgYWZ0ZXIgcGFkZGluZy5cbiAgICAgIGlmIChjb21tYSAmJiB6ZXJvKSB2YWx1ZSA9IGdyb3VwKHBhZGRpbmcgKyB2YWx1ZSwgcGFkZGluZy5sZW5ndGggPyB3aWR0aCAtIHZhbHVlU3VmZml4Lmxlbmd0aCA6IEluZmluaXR5KSwgcGFkZGluZyA9IFwiXCI7XG5cbiAgICAgIC8vIFJlY29uc3RydWN0IHRoZSBmaW5hbCBvdXRwdXQgYmFzZWQgb24gdGhlIGRlc2lyZWQgYWxpZ25tZW50LlxuICAgICAgc3dpdGNoIChhbGlnbikge1xuICAgICAgICBjYXNlIFwiPFwiOiB2YWx1ZSA9IHZhbHVlUHJlZml4ICsgdmFsdWUgKyB2YWx1ZVN1ZmZpeCArIHBhZGRpbmc7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiPVwiOiB2YWx1ZSA9IHZhbHVlUHJlZml4ICsgcGFkZGluZyArIHZhbHVlICsgdmFsdWVTdWZmaXg7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiXlwiOiB2YWx1ZSA9IHBhZGRpbmcuc2xpY2UoMCwgbGVuZ3RoID0gcGFkZGluZy5sZW5ndGggPj4gMSkgKyB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXggKyBwYWRkaW5nLnNsaWNlKGxlbmd0aCk7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OiB2YWx1ZSA9IHBhZGRpbmcgKyB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXg7IGJyZWFrO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVtZXJhbHModmFsdWUpO1xuICAgIH1cblxuICAgIGZvcm1hdC50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHNwZWNpZmllciArIFwiXCI7XG4gICAgfTtcblxuICAgIHJldHVybiBmb3JtYXQ7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRQcmVmaXgoc3BlY2lmaWVyLCB2YWx1ZSkge1xuICAgIHZhciBmID0gbmV3Rm9ybWF0KChzcGVjaWZpZXIgPSBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSwgc3BlY2lmaWVyLnR5cGUgPSBcImZcIiwgc3BlY2lmaWVyKSksXG4gICAgICAgIGUgPSBNYXRoLm1heCgtOCwgTWF0aC5taW4oOCwgTWF0aC5mbG9vcihleHBvbmVudCh2YWx1ZSkgLyAzKSkpICogMyxcbiAgICAgICAgayA9IE1hdGgucG93KDEwLCAtZSksXG4gICAgICAgIHByZWZpeCA9IHByZWZpeGVzWzggKyBlIC8gM107XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gZihrICogdmFsdWUpICsgcHJlZml4O1xuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdDogbmV3Rm9ybWF0LFxuICAgIGZvcm1hdFByZWZpeDogZm9ybWF0UHJlZml4XG4gIH07XG59O1xuXG52YXIgbG9jYWxlO1xuXG5cblxuZGVmYXVsdExvY2FsZSh7XG4gIGRlY2ltYWw6IFwiLlwiLFxuICB0aG91c2FuZHM6IFwiLFwiLFxuICBncm91cGluZzogWzNdLFxuICBjdXJyZW5jeTogW1wiJFwiLCBcIlwiXVxufSk7XG5cbmZ1bmN0aW9uIGRlZmF1bHRMb2NhbGUoZGVmaW5pdGlvbikge1xuICBsb2NhbGUgPSBmb3JtYXRMb2NhbGUoZGVmaW5pdGlvbik7XG4gIGV4cG9ydHMuZm9ybWF0ID0gbG9jYWxlLmZvcm1hdDtcbiAgZXhwb3J0cy5mb3JtYXRQcmVmaXggPSBsb2NhbGUuZm9ybWF0UHJlZml4O1xuICByZXR1cm4gbG9jYWxlO1xufVxuXG52YXIgcHJlY2lzaW9uRml4ZWQgPSBmdW5jdGlvbihzdGVwKSB7XG4gIHJldHVybiBNYXRoLm1heCgwLCAtZXhwb25lbnQoTWF0aC5hYnMoc3RlcCkpKTtcbn07XG5cbnZhciBwcmVjaXNpb25QcmVmaXggPSBmdW5jdGlvbihzdGVwLCB2YWx1ZSkge1xuICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5tYXgoLTgsIE1hdGgubWluKDgsIE1hdGguZmxvb3IoZXhwb25lbnQodmFsdWUpIC8gMykpKSAqIDMgLSBleHBvbmVudChNYXRoLmFicyhzdGVwKSkpO1xufTtcblxudmFyIHByZWNpc2lvblJvdW5kID0gZnVuY3Rpb24oc3RlcCwgbWF4KSB7XG4gIHN0ZXAgPSBNYXRoLmFicyhzdGVwKSwgbWF4ID0gTWF0aC5hYnMobWF4KSAtIHN0ZXA7XG4gIHJldHVybiBNYXRoLm1heCgwLCBleHBvbmVudChtYXgpIC0gZXhwb25lbnQoc3RlcCkpICsgMTtcbn07XG5cbmV4cG9ydHMuZm9ybWF0RGVmYXVsdExvY2FsZSA9IGRlZmF1bHRMb2NhbGU7XG5leHBvcnRzLmZvcm1hdExvY2FsZSA9IGZvcm1hdExvY2FsZTtcbmV4cG9ydHMuZm9ybWF0U3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyO1xuZXhwb3J0cy5wcmVjaXNpb25GaXhlZCA9IHByZWNpc2lvbkZpeGVkO1xuZXhwb3J0cy5wcmVjaXNpb25QcmVmaXggPSBwcmVjaXNpb25QcmVmaXg7XG5leHBvcnRzLnByZWNpc2lvblJvdW5kID0gcHJlY2lzaW9uUm91bmQ7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4iLCIvLyBodHRwczovL2QzanMub3JnL2QzLWludGVycG9sYXRlLyBWZXJzaW9uIDEuMS40LiBDb3B5cmlnaHQgMjAxNyBNaWtlIEJvc3RvY2suXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuXHR0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMsIHJlcXVpcmUoJ2QzLWNvbG9yJykpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cycsICdkMy1jb2xvciddLCBmYWN0b3J5KSA6XG5cdChmYWN0b3J5KChnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pLGdsb2JhbC5kMykpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMsZDNDb2xvcikgeyAndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGJhc2lzKHQxLCB2MCwgdjEsIHYyLCB2Mykge1xuICB2YXIgdDIgPSB0MSAqIHQxLCB0MyA9IHQyICogdDE7XG4gIHJldHVybiAoKDEgLSAzICogdDEgKyAzICogdDIgLSB0MykgKiB2MFxuICAgICAgKyAoNCAtIDYgKiB0MiArIDMgKiB0MykgKiB2MVxuICAgICAgKyAoMSArIDMgKiB0MSArIDMgKiB0MiAtIDMgKiB0MykgKiB2MlxuICAgICAgKyB0MyAqIHYzKSAvIDY7XG59XG5cbnZhciBiYXNpcyQxID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aCAtIDE7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgdmFyIGkgPSB0IDw9IDAgPyAodCA9IDApIDogdCA+PSAxID8gKHQgPSAxLCBuIC0gMSkgOiBNYXRoLmZsb29yKHQgKiBuKSxcbiAgICAgICAgdjEgPSB2YWx1ZXNbaV0sXG4gICAgICAgIHYyID0gdmFsdWVzW2kgKyAxXSxcbiAgICAgICAgdjAgPSBpID4gMCA/IHZhbHVlc1tpIC0gMV0gOiAyICogdjEgLSB2MixcbiAgICAgICAgdjMgPSBpIDwgbiAtIDEgPyB2YWx1ZXNbaSArIDJdIDogMiAqIHYyIC0gdjE7XG4gICAgcmV0dXJuIGJhc2lzKCh0IC0gaSAvIG4pICogbiwgdjAsIHYxLCB2MiwgdjMpO1xuICB9O1xufTtcblxudmFyIGJhc2lzQ2xvc2VkID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aDtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgaSA9IE1hdGguZmxvb3IoKCh0ICU9IDEpIDwgMCA/ICsrdCA6IHQpICogbiksXG4gICAgICAgIHYwID0gdmFsdWVzWyhpICsgbiAtIDEpICUgbl0sXG4gICAgICAgIHYxID0gdmFsdWVzW2kgJSBuXSxcbiAgICAgICAgdjIgPSB2YWx1ZXNbKGkgKyAxKSAlIG5dLFxuICAgICAgICB2MyA9IHZhbHVlc1soaSArIDIpICUgbl07XG4gICAgcmV0dXJuIGJhc2lzKCh0IC0gaSAvIG4pICogbiwgdjAsIHYxLCB2MiwgdjMpO1xuICB9O1xufTtcblxudmFyIGNvbnN0YW50ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59O1xuXG5mdW5jdGlvbiBsaW5lYXIoYSwgZCkge1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBhICsgdCAqIGQ7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGV4cG9uZW50aWFsKGEsIGIsIHkpIHtcbiAgcmV0dXJuIGEgPSBNYXRoLnBvdyhhLCB5KSwgYiA9IE1hdGgucG93KGIsIHkpIC0gYSwgeSA9IDEgLyB5LCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIE1hdGgucG93KGEgKyB0ICogYiwgeSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGh1ZShhLCBiKSB7XG4gIHZhciBkID0gYiAtIGE7XG4gIHJldHVybiBkID8gbGluZWFyKGEsIGQgPiAxODAgfHwgZCA8IC0xODAgPyBkIC0gMzYwICogTWF0aC5yb3VuZChkIC8gMzYwKSA6IGQpIDogY29uc3RhbnQoaXNOYU4oYSkgPyBiIDogYSk7XG59XG5cbmZ1bmN0aW9uIGdhbW1hKHkpIHtcbiAgcmV0dXJuICh5ID0gK3kpID09PSAxID8gbm9nYW1tYSA6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYiAtIGEgPyBleHBvbmVudGlhbChhLCBiLCB5KSA6IGNvbnN0YW50KGlzTmFOKGEpID8gYiA6IGEpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBub2dhbW1hKGEsIGIpIHtcbiAgdmFyIGQgPSBiIC0gYTtcbiAgcmV0dXJuIGQgPyBsaW5lYXIoYSwgZCkgOiBjb25zdGFudChpc05hTihhKSA/IGIgOiBhKTtcbn1cblxudmFyIHJnYiQxID0gKChmdW5jdGlvbiByZ2JHYW1tYSh5KSB7XG4gIHZhciBjb2xvciQkMSA9IGdhbW1hKHkpO1xuXG4gIGZ1bmN0aW9uIHJnYiQkMShzdGFydCwgZW5kKSB7XG4gICAgdmFyIHIgPSBjb2xvciQkMSgoc3RhcnQgPSBkM0NvbG9yLnJnYihzdGFydCkpLnIsIChlbmQgPSBkM0NvbG9yLnJnYihlbmQpKS5yKSxcbiAgICAgICAgZyA9IGNvbG9yJCQxKHN0YXJ0LmcsIGVuZC5nKSxcbiAgICAgICAgYiA9IGNvbG9yJCQxKHN0YXJ0LmIsIGVuZC5iKSxcbiAgICAgICAgb3BhY2l0eSA9IG5vZ2FtbWEoc3RhcnQub3BhY2l0eSwgZW5kLm9wYWNpdHkpO1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICBzdGFydC5yID0gcih0KTtcbiAgICAgIHN0YXJ0LmcgPSBnKHQpO1xuICAgICAgc3RhcnQuYiA9IGIodCk7XG4gICAgICBzdGFydC5vcGFjaXR5ID0gb3BhY2l0eSh0KTtcbiAgICAgIHJldHVybiBzdGFydCArIFwiXCI7XG4gICAgfTtcbiAgfVxuXG4gIHJnYiQkMS5nYW1tYSA9IHJnYkdhbW1hO1xuXG4gIHJldHVybiByZ2IkJDE7XG59KSkoMSk7XG5cbmZ1bmN0aW9uIHJnYlNwbGluZShzcGxpbmUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbG9ycykge1xuICAgIHZhciBuID0gY29sb3JzLmxlbmd0aCxcbiAgICAgICAgciA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgZyA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgYiA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgaSwgY29sb3IkJDE7XG4gICAgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgY29sb3IkJDEgPSBkM0NvbG9yLnJnYihjb2xvcnNbaV0pO1xuICAgICAgcltpXSA9IGNvbG9yJCQxLnIgfHwgMDtcbiAgICAgIGdbaV0gPSBjb2xvciQkMS5nIHx8IDA7XG4gICAgICBiW2ldID0gY29sb3IkJDEuYiB8fCAwO1xuICAgIH1cbiAgICByID0gc3BsaW5lKHIpO1xuICAgIGcgPSBzcGxpbmUoZyk7XG4gICAgYiA9IHNwbGluZShiKTtcbiAgICBjb2xvciQkMS5vcGFjaXR5ID0gMTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgY29sb3IkJDEuciA9IHIodCk7XG4gICAgICBjb2xvciQkMS5nID0gZyh0KTtcbiAgICAgIGNvbG9yJCQxLmIgPSBiKHQpO1xuICAgICAgcmV0dXJuIGNvbG9yJCQxICsgXCJcIjtcbiAgICB9O1xuICB9O1xufVxuXG52YXIgcmdiQmFzaXMgPSByZ2JTcGxpbmUoYmFzaXMkMSk7XG52YXIgcmdiQmFzaXNDbG9zZWQgPSByZ2JTcGxpbmUoYmFzaXNDbG9zZWQpO1xuXG52YXIgYXJyYXkgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBuYiA9IGIgPyBiLmxlbmd0aCA6IDAsXG4gICAgICBuYSA9IGEgPyBNYXRoLm1pbihuYiwgYS5sZW5ndGgpIDogMCxcbiAgICAgIHggPSBuZXcgQXJyYXkobmIpLFxuICAgICAgYyA9IG5ldyBBcnJheShuYiksXG4gICAgICBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBuYTsgKytpKSB4W2ldID0gdmFsdWUoYVtpXSwgYltpXSk7XG4gIGZvciAoOyBpIDwgbmI7ICsraSkgY1tpXSA9IGJbaV07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbmE7ICsraSkgY1tpXSA9IHhbaV0odCk7XG4gICAgcmV0dXJuIGM7XG4gIH07XG59O1xuXG52YXIgZGF0ZSA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZTtcbiAgcmV0dXJuIGEgPSArYSwgYiAtPSBhLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGQuc2V0VGltZShhICsgYiAqIHQpLCBkO1xuICB9O1xufTtcblxudmFyIG51bWJlciA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPSArYSwgYiAtPSBhLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGEgKyBiICogdDtcbiAgfTtcbn07XG5cbnZhciBvYmplY3QgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBpID0ge30sXG4gICAgICBjID0ge30sXG4gICAgICBrO1xuXG4gIGlmIChhID09PSBudWxsIHx8IHR5cGVvZiBhICE9PSBcIm9iamVjdFwiKSBhID0ge307XG4gIGlmIChiID09PSBudWxsIHx8IHR5cGVvZiBiICE9PSBcIm9iamVjdFwiKSBiID0ge307XG5cbiAgZm9yIChrIGluIGIpIHtcbiAgICBpZiAoayBpbiBhKSB7XG4gICAgICBpW2tdID0gdmFsdWUoYVtrXSwgYltrXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNba10gPSBiW2tdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgZm9yIChrIGluIGkpIGNba10gPSBpW2tdKHQpO1xuICAgIHJldHVybiBjO1xuICB9O1xufTtcblxudmFyIHJlQSA9IC9bLStdPyg/OlxcZCtcXC4/XFxkKnxcXC4/XFxkKykoPzpbZUVdWy0rXT9cXGQrKT8vZztcbnZhciByZUIgPSBuZXcgUmVnRXhwKHJlQS5zb3VyY2UsIFwiZ1wiKTtcblxuZnVuY3Rpb24gemVybyhiKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYjtcbiAgfTtcbn1cblxuZnVuY3Rpb24gb25lKGIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gYih0KSArIFwiXCI7XG4gIH07XG59XG5cbnZhciBzdHJpbmcgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBiaSA9IHJlQS5sYXN0SW5kZXggPSByZUIubGFzdEluZGV4ID0gMCwgLy8gc2NhbiBpbmRleCBmb3IgbmV4dCBudW1iZXIgaW4gYlxuICAgICAgYW0sIC8vIGN1cnJlbnQgbWF0Y2ggaW4gYVxuICAgICAgYm0sIC8vIGN1cnJlbnQgbWF0Y2ggaW4gYlxuICAgICAgYnMsIC8vIHN0cmluZyBwcmVjZWRpbmcgY3VycmVudCBudW1iZXIgaW4gYiwgaWYgYW55XG4gICAgICBpID0gLTEsIC8vIGluZGV4IGluIHNcbiAgICAgIHMgPSBbXSwgLy8gc3RyaW5nIGNvbnN0YW50cyBhbmQgcGxhY2Vob2xkZXJzXG4gICAgICBxID0gW107IC8vIG51bWJlciBpbnRlcnBvbGF0b3JzXG5cbiAgLy8gQ29lcmNlIGlucHV0cyB0byBzdHJpbmdzLlxuICBhID0gYSArIFwiXCIsIGIgPSBiICsgXCJcIjtcblxuICAvLyBJbnRlcnBvbGF0ZSBwYWlycyBvZiBudW1iZXJzIGluIGEgJiBiLlxuICB3aGlsZSAoKGFtID0gcmVBLmV4ZWMoYSkpXG4gICAgICAmJiAoYm0gPSByZUIuZXhlYyhiKSkpIHtcbiAgICBpZiAoKGJzID0gYm0uaW5kZXgpID4gYmkpIHsgLy8gYSBzdHJpbmcgcHJlY2VkZXMgdGhlIG5leHQgbnVtYmVyIGluIGJcbiAgICAgIGJzID0gYi5zbGljZShiaSwgYnMpO1xuICAgICAgaWYgKHNbaV0pIHNbaV0gKz0gYnM7IC8vIGNvYWxlc2NlIHdpdGggcHJldmlvdXMgc3RyaW5nXG4gICAgICBlbHNlIHNbKytpXSA9IGJzO1xuICAgIH1cbiAgICBpZiAoKGFtID0gYW1bMF0pID09PSAoYm0gPSBibVswXSkpIHsgLy8gbnVtYmVycyBpbiBhICYgYiBtYXRjaFxuICAgICAgaWYgKHNbaV0pIHNbaV0gKz0gYm07IC8vIGNvYWxlc2NlIHdpdGggcHJldmlvdXMgc3RyaW5nXG4gICAgICBlbHNlIHNbKytpXSA9IGJtO1xuICAgIH0gZWxzZSB7IC8vIGludGVycG9sYXRlIG5vbi1tYXRjaGluZyBudW1iZXJzXG4gICAgICBzWysraV0gPSBudWxsO1xuICAgICAgcS5wdXNoKHtpOiBpLCB4OiBudW1iZXIoYW0sIGJtKX0pO1xuICAgIH1cbiAgICBiaSA9IHJlQi5sYXN0SW5kZXg7XG4gIH1cblxuICAvLyBBZGQgcmVtYWlucyBvZiBiLlxuICBpZiAoYmkgPCBiLmxlbmd0aCkge1xuICAgIGJzID0gYi5zbGljZShiaSk7XG4gICAgaWYgKHNbaV0pIHNbaV0gKz0gYnM7IC8vIGNvYWxlc2NlIHdpdGggcHJldmlvdXMgc3RyaW5nXG4gICAgZWxzZSBzWysraV0gPSBicztcbiAgfVxuXG4gIC8vIFNwZWNpYWwgb3B0aW1pemF0aW9uIGZvciBvbmx5IGEgc2luZ2xlIG1hdGNoLlxuICAvLyBPdGhlcndpc2UsIGludGVycG9sYXRlIGVhY2ggb2YgdGhlIG51bWJlcnMgYW5kIHJlam9pbiB0aGUgc3RyaW5nLlxuICByZXR1cm4gcy5sZW5ndGggPCAyID8gKHFbMF1cbiAgICAgID8gb25lKHFbMF0ueClcbiAgICAgIDogemVybyhiKSlcbiAgICAgIDogKGIgPSBxLmxlbmd0aCwgZnVuY3Rpb24odCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBvOyBpIDwgYjsgKytpKSBzWyhvID0gcVtpXSkuaV0gPSBvLngodCk7XG4gICAgICAgICAgcmV0dXJuIHMuam9pbihcIlwiKTtcbiAgICAgICAgfSk7XG59O1xuXG52YXIgdmFsdWUgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciB0ID0gdHlwZW9mIGIsIGM7XG4gIHJldHVybiBiID09IG51bGwgfHwgdCA9PT0gXCJib29sZWFuXCIgPyBjb25zdGFudChiKVxuICAgICAgOiAodCA9PT0gXCJudW1iZXJcIiA/IG51bWJlclxuICAgICAgOiB0ID09PSBcInN0cmluZ1wiID8gKChjID0gZDNDb2xvci5jb2xvcihiKSkgPyAoYiA9IGMsIHJnYiQxKSA6IHN0cmluZylcbiAgICAgIDogYiBpbnN0YW5jZW9mIGQzQ29sb3IuY29sb3IgPyByZ2IkMVxuICAgICAgOiBiIGluc3RhbmNlb2YgRGF0ZSA/IGRhdGVcbiAgICAgIDogQXJyYXkuaXNBcnJheShiKSA/IGFycmF5XG4gICAgICA6IGlzTmFOKGIpID8gb2JqZWN0XG4gICAgICA6IG51bWJlcikoYSwgYik7XG59O1xuXG52YXIgcm91bmQgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiBhID0gK2EsIGIgLT0gYSwgZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKGEgKyBiICogdCk7XG4gIH07XG59O1xuXG52YXIgZGVncmVlcyA9IDE4MCAvIE1hdGguUEk7XG5cbnZhciBpZGVudGl0eSA9IHtcbiAgdHJhbnNsYXRlWDogMCxcbiAgdHJhbnNsYXRlWTogMCxcbiAgcm90YXRlOiAwLFxuICBza2V3WDogMCxcbiAgc2NhbGVYOiAxLFxuICBzY2FsZVk6IDFcbn07XG5cbnZhciBkZWNvbXBvc2UgPSBmdW5jdGlvbihhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIHZhciBzY2FsZVgsIHNjYWxlWSwgc2tld1g7XG4gIGlmIChzY2FsZVggPSBNYXRoLnNxcnQoYSAqIGEgKyBiICogYikpIGEgLz0gc2NhbGVYLCBiIC89IHNjYWxlWDtcbiAgaWYgKHNrZXdYID0gYSAqIGMgKyBiICogZCkgYyAtPSBhICogc2tld1gsIGQgLT0gYiAqIHNrZXdYO1xuICBpZiAoc2NhbGVZID0gTWF0aC5zcXJ0KGMgKiBjICsgZCAqIGQpKSBjIC89IHNjYWxlWSwgZCAvPSBzY2FsZVksIHNrZXdYIC89IHNjYWxlWTtcbiAgaWYgKGEgKiBkIDwgYiAqIGMpIGEgPSAtYSwgYiA9IC1iLCBza2V3WCA9IC1za2V3WCwgc2NhbGVYID0gLXNjYWxlWDtcbiAgcmV0dXJuIHtcbiAgICB0cmFuc2xhdGVYOiBlLFxuICAgIHRyYW5zbGF0ZVk6IGYsXG4gICAgcm90YXRlOiBNYXRoLmF0YW4yKGIsIGEpICogZGVncmVlcyxcbiAgICBza2V3WDogTWF0aC5hdGFuKHNrZXdYKSAqIGRlZ3JlZXMsXG4gICAgc2NhbGVYOiBzY2FsZVgsXG4gICAgc2NhbGVZOiBzY2FsZVlcbiAgfTtcbn07XG5cbnZhciBjc3NOb2RlO1xudmFyIGNzc1Jvb3Q7XG52YXIgY3NzVmlldztcbnZhciBzdmdOb2RlO1xuXG5mdW5jdGlvbiBwYXJzZUNzcyh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IFwibm9uZVwiKSByZXR1cm4gaWRlbnRpdHk7XG4gIGlmICghY3NzTm9kZSkgY3NzTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIiksIGNzc1Jvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIGNzc1ZpZXcgPSBkb2N1bWVudC5kZWZhdWx0VmlldztcbiAgY3NzTm9kZS5zdHlsZS50cmFuc2Zvcm0gPSB2YWx1ZTtcbiAgdmFsdWUgPSBjc3NWaWV3LmdldENvbXB1dGVkU3R5bGUoY3NzUm9vdC5hcHBlbmRDaGlsZChjc3NOb2RlKSwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZShcInRyYW5zZm9ybVwiKTtcbiAgY3NzUm9vdC5yZW1vdmVDaGlsZChjc3NOb2RlKTtcbiAgdmFsdWUgPSB2YWx1ZS5zbGljZSg3LCAtMSkuc3BsaXQoXCIsXCIpO1xuICByZXR1cm4gZGVjb21wb3NlKCt2YWx1ZVswXSwgK3ZhbHVlWzFdLCArdmFsdWVbMl0sICt2YWx1ZVszXSwgK3ZhbHVlWzRdLCArdmFsdWVbNV0pO1xufVxuXG5mdW5jdGlvbiBwYXJzZVN2Zyh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIGlkZW50aXR5O1xuICBpZiAoIXN2Z05vZGUpIHN2Z05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCBcImdcIik7XG4gIHN2Z05vZGUuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIHZhbHVlKTtcbiAgaWYgKCEodmFsdWUgPSBzdmdOb2RlLnRyYW5zZm9ybS5iYXNlVmFsLmNvbnNvbGlkYXRlKCkpKSByZXR1cm4gaWRlbnRpdHk7XG4gIHZhbHVlID0gdmFsdWUubWF0cml4O1xuICByZXR1cm4gZGVjb21wb3NlKHZhbHVlLmEsIHZhbHVlLmIsIHZhbHVlLmMsIHZhbHVlLmQsIHZhbHVlLmUsIHZhbHVlLmYpO1xufVxuXG5mdW5jdGlvbiBpbnRlcnBvbGF0ZVRyYW5zZm9ybShwYXJzZSwgcHhDb21tYSwgcHhQYXJlbiwgZGVnUGFyZW4pIHtcblxuICBmdW5jdGlvbiBwb3Aocykge1xuICAgIHJldHVybiBzLmxlbmd0aCA/IHMucG9wKCkgKyBcIiBcIiA6IFwiXCI7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2xhdGUoeGEsIHlhLCB4YiwgeWIsIHMsIHEpIHtcbiAgICBpZiAoeGEgIT09IHhiIHx8IHlhICE9PSB5Yikge1xuICAgICAgdmFyIGkgPSBzLnB1c2goXCJ0cmFuc2xhdGUoXCIsIG51bGwsIHB4Q29tbWEsIG51bGwsIHB4UGFyZW4pO1xuICAgICAgcS5wdXNoKHtpOiBpIC0gNCwgeDogbnVtYmVyKHhhLCB4Yil9LCB7aTogaSAtIDIsIHg6IG51bWJlcih5YSwgeWIpfSk7XG4gICAgfSBlbHNlIGlmICh4YiB8fCB5Yikge1xuICAgICAgcy5wdXNoKFwidHJhbnNsYXRlKFwiICsgeGIgKyBweENvbW1hICsgeWIgKyBweFBhcmVuKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByb3RhdGUoYSwgYiwgcywgcSkge1xuICAgIGlmIChhICE9PSBiKSB7XG4gICAgICBpZiAoYSAtIGIgPiAxODApIGIgKz0gMzYwOyBlbHNlIGlmIChiIC0gYSA+IDE4MCkgYSArPSAzNjA7IC8vIHNob3J0ZXN0IHBhdGhcbiAgICAgIHEucHVzaCh7aTogcy5wdXNoKHBvcChzKSArIFwicm90YXRlKFwiLCBudWxsLCBkZWdQYXJlbikgLSAyLCB4OiBudW1iZXIoYSwgYil9KTtcbiAgICB9IGVsc2UgaWYgKGIpIHtcbiAgICAgIHMucHVzaChwb3AocykgKyBcInJvdGF0ZShcIiArIGIgKyBkZWdQYXJlbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2tld1goYSwgYiwgcywgcSkge1xuICAgIGlmIChhICE9PSBiKSB7XG4gICAgICBxLnB1c2goe2k6IHMucHVzaChwb3AocykgKyBcInNrZXdYKFwiLCBudWxsLCBkZWdQYXJlbikgLSAyLCB4OiBudW1iZXIoYSwgYil9KTtcbiAgICB9IGVsc2UgaWYgKGIpIHtcbiAgICAgIHMucHVzaChwb3AocykgKyBcInNrZXdYKFwiICsgYiArIGRlZ1BhcmVuKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzY2FsZSh4YSwgeWEsIHhiLCB5YiwgcywgcSkge1xuICAgIGlmICh4YSAhPT0geGIgfHwgeWEgIT09IHliKSB7XG4gICAgICB2YXIgaSA9IHMucHVzaChwb3AocykgKyBcInNjYWxlKFwiLCBudWxsLCBcIixcIiwgbnVsbCwgXCIpXCIpO1xuICAgICAgcS5wdXNoKHtpOiBpIC0gNCwgeDogbnVtYmVyKHhhLCB4Yil9LCB7aTogaSAtIDIsIHg6IG51bWJlcih5YSwgeWIpfSk7XG4gICAgfSBlbHNlIGlmICh4YiAhPT0gMSB8fCB5YiAhPT0gMSkge1xuICAgICAgcy5wdXNoKHBvcChzKSArIFwic2NhbGUoXCIgKyB4YiArIFwiLFwiICsgeWIgKyBcIilcIik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgcyA9IFtdLCAvLyBzdHJpbmcgY29uc3RhbnRzIGFuZCBwbGFjZWhvbGRlcnNcbiAgICAgICAgcSA9IFtdOyAvLyBudW1iZXIgaW50ZXJwb2xhdG9yc1xuICAgIGEgPSBwYXJzZShhKSwgYiA9IHBhcnNlKGIpO1xuICAgIHRyYW5zbGF0ZShhLnRyYW5zbGF0ZVgsIGEudHJhbnNsYXRlWSwgYi50cmFuc2xhdGVYLCBiLnRyYW5zbGF0ZVksIHMsIHEpO1xuICAgIHJvdGF0ZShhLnJvdGF0ZSwgYi5yb3RhdGUsIHMsIHEpO1xuICAgIHNrZXdYKGEuc2tld1gsIGIuc2tld1gsIHMsIHEpO1xuICAgIHNjYWxlKGEuc2NhbGVYLCBhLnNjYWxlWSwgYi5zY2FsZVgsIGIuc2NhbGVZLCBzLCBxKTtcbiAgICBhID0gYiA9IG51bGw7IC8vIGdjXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHZhciBpID0gLTEsIG4gPSBxLmxlbmd0aCwgbztcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBzWyhvID0gcVtpXSkuaV0gPSBvLngodCk7XG4gICAgICByZXR1cm4gcy5qb2luKFwiXCIpO1xuICAgIH07XG4gIH07XG59XG5cbnZhciBpbnRlcnBvbGF0ZVRyYW5zZm9ybUNzcyA9IGludGVycG9sYXRlVHJhbnNmb3JtKHBhcnNlQ3NzLCBcInB4LCBcIiwgXCJweClcIiwgXCJkZWcpXCIpO1xudmFyIGludGVycG9sYXRlVHJhbnNmb3JtU3ZnID0gaW50ZXJwb2xhdGVUcmFuc2Zvcm0ocGFyc2VTdmcsIFwiLCBcIiwgXCIpXCIsIFwiKVwiKTtcblxudmFyIHJobyA9IE1hdGguU1FSVDI7XG52YXIgcmhvMiA9IDI7XG52YXIgcmhvNCA9IDQ7XG52YXIgZXBzaWxvbjIgPSAxZS0xMjtcblxuZnVuY3Rpb24gY29zaCh4KSB7XG4gIHJldHVybiAoKHggPSBNYXRoLmV4cCh4KSkgKyAxIC8geCkgLyAyO1xufVxuXG5mdW5jdGlvbiBzaW5oKHgpIHtcbiAgcmV0dXJuICgoeCA9IE1hdGguZXhwKHgpKSAtIDEgLyB4KSAvIDI7XG59XG5cbmZ1bmN0aW9uIHRhbmgoeCkge1xuICByZXR1cm4gKCh4ID0gTWF0aC5leHAoMiAqIHgpKSAtIDEpIC8gKHggKyAxKTtcbn1cblxuLy8gcDAgPSBbdXgwLCB1eTAsIHcwXVxuLy8gcDEgPSBbdXgxLCB1eTEsIHcxXVxudmFyIHpvb20gPSBmdW5jdGlvbihwMCwgcDEpIHtcbiAgdmFyIHV4MCA9IHAwWzBdLCB1eTAgPSBwMFsxXSwgdzAgPSBwMFsyXSxcbiAgICAgIHV4MSA9IHAxWzBdLCB1eTEgPSBwMVsxXSwgdzEgPSBwMVsyXSxcbiAgICAgIGR4ID0gdXgxIC0gdXgwLFxuICAgICAgZHkgPSB1eTEgLSB1eTAsXG4gICAgICBkMiA9IGR4ICogZHggKyBkeSAqIGR5LFxuICAgICAgaSxcbiAgICAgIFM7XG5cbiAgLy8gU3BlY2lhbCBjYXNlIGZvciB1MCDiiYUgdTEuXG4gIGlmIChkMiA8IGVwc2lsb24yKSB7XG4gICAgUyA9IE1hdGgubG9nKHcxIC8gdzApIC8gcmhvO1xuICAgIGkgPSBmdW5jdGlvbih0KSB7XG4gICAgICByZXR1cm4gW1xuICAgICAgICB1eDAgKyB0ICogZHgsXG4gICAgICAgIHV5MCArIHQgKiBkeSxcbiAgICAgICAgdzAgKiBNYXRoLmV4cChyaG8gKiB0ICogUylcbiAgICAgIF07XG4gICAgfTtcbiAgfVxuXG4gIC8vIEdlbmVyYWwgY2FzZS5cbiAgZWxzZSB7XG4gICAgdmFyIGQxID0gTWF0aC5zcXJ0KGQyKSxcbiAgICAgICAgYjAgPSAodzEgKiB3MSAtIHcwICogdzAgKyByaG80ICogZDIpIC8gKDIgKiB3MCAqIHJobzIgKiBkMSksXG4gICAgICAgIGIxID0gKHcxICogdzEgLSB3MCAqIHcwIC0gcmhvNCAqIGQyKSAvICgyICogdzEgKiByaG8yICogZDEpLFxuICAgICAgICByMCA9IE1hdGgubG9nKE1hdGguc3FydChiMCAqIGIwICsgMSkgLSBiMCksXG4gICAgICAgIHIxID0gTWF0aC5sb2coTWF0aC5zcXJ0KGIxICogYjEgKyAxKSAtIGIxKTtcbiAgICBTID0gKHIxIC0gcjApIC8gcmhvO1xuICAgIGkgPSBmdW5jdGlvbih0KSB7XG4gICAgICB2YXIgcyA9IHQgKiBTLFxuICAgICAgICAgIGNvc2hyMCA9IGNvc2gocjApLFxuICAgICAgICAgIHUgPSB3MCAvIChyaG8yICogZDEpICogKGNvc2hyMCAqIHRhbmgocmhvICogcyArIHIwKSAtIHNpbmgocjApKTtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIHV4MCArIHUgKiBkeCxcbiAgICAgICAgdXkwICsgdSAqIGR5LFxuICAgICAgICB3MCAqIGNvc2hyMCAvIGNvc2gocmhvICogcyArIHIwKVxuICAgICAgXTtcbiAgICB9O1xuICB9XG5cbiAgaS5kdXJhdGlvbiA9IFMgKiAxMDAwO1xuXG4gIHJldHVybiBpO1xufTtcblxuZnVuY3Rpb24gaHNsJDEoaHVlJCQxKSB7XG4gIHJldHVybiBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgdmFyIGggPSBodWUkJDEoKHN0YXJ0ID0gZDNDb2xvci5oc2woc3RhcnQpKS5oLCAoZW5kID0gZDNDb2xvci5oc2woZW5kKSkuaCksXG4gICAgICAgIHMgPSBub2dhbW1hKHN0YXJ0LnMsIGVuZC5zKSxcbiAgICAgICAgbCA9IG5vZ2FtbWEoc3RhcnQubCwgZW5kLmwpLFxuICAgICAgICBvcGFjaXR5ID0gbm9nYW1tYShzdGFydC5vcGFjaXR5LCBlbmQub3BhY2l0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHN0YXJ0LmggPSBoKHQpO1xuICAgICAgc3RhcnQucyA9IHModCk7XG4gICAgICBzdGFydC5sID0gbCh0KTtcbiAgICAgIHN0YXJ0Lm9wYWNpdHkgPSBvcGFjaXR5KHQpO1xuICAgICAgcmV0dXJuIHN0YXJ0ICsgXCJcIjtcbiAgICB9O1xuICB9XG59XG5cbnZhciBoc2wkMiA9IGhzbCQxKGh1ZSk7XG52YXIgaHNsTG9uZyA9IGhzbCQxKG5vZ2FtbWEpO1xuXG5mdW5jdGlvbiBsYWIkMShzdGFydCwgZW5kKSB7XG4gIHZhciBsID0gbm9nYW1tYSgoc3RhcnQgPSBkM0NvbG9yLmxhYihzdGFydCkpLmwsIChlbmQgPSBkM0NvbG9yLmxhYihlbmQpKS5sKSxcbiAgICAgIGEgPSBub2dhbW1hKHN0YXJ0LmEsIGVuZC5hKSxcbiAgICAgIGIgPSBub2dhbW1hKHN0YXJ0LmIsIGVuZC5iKSxcbiAgICAgIG9wYWNpdHkgPSBub2dhbW1hKHN0YXJ0Lm9wYWNpdHksIGVuZC5vcGFjaXR5KTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICBzdGFydC5sID0gbCh0KTtcbiAgICBzdGFydC5hID0gYSh0KTtcbiAgICBzdGFydC5iID0gYih0KTtcbiAgICBzdGFydC5vcGFjaXR5ID0gb3BhY2l0eSh0KTtcbiAgICByZXR1cm4gc3RhcnQgKyBcIlwiO1xuICB9O1xufVxuXG5mdW5jdGlvbiBoY2wkMShodWUkJDEpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICB2YXIgaCA9IGh1ZSQkMSgoc3RhcnQgPSBkM0NvbG9yLmhjbChzdGFydCkpLmgsIChlbmQgPSBkM0NvbG9yLmhjbChlbmQpKS5oKSxcbiAgICAgICAgYyA9IG5vZ2FtbWEoc3RhcnQuYywgZW5kLmMpLFxuICAgICAgICBsID0gbm9nYW1tYShzdGFydC5sLCBlbmQubCksXG4gICAgICAgIG9wYWNpdHkgPSBub2dhbW1hKHN0YXJ0Lm9wYWNpdHksIGVuZC5vcGFjaXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgc3RhcnQuaCA9IGgodCk7XG4gICAgICBzdGFydC5jID0gYyh0KTtcbiAgICAgIHN0YXJ0LmwgPSBsKHQpO1xuICAgICAgc3RhcnQub3BhY2l0eSA9IG9wYWNpdHkodCk7XG4gICAgICByZXR1cm4gc3RhcnQgKyBcIlwiO1xuICAgIH07XG4gIH1cbn1cblxudmFyIGhjbCQyID0gaGNsJDEoaHVlKTtcbnZhciBoY2xMb25nID0gaGNsJDEobm9nYW1tYSk7XG5cbmZ1bmN0aW9uIGN1YmVoZWxpeCQxKGh1ZSQkMSkge1xuICByZXR1cm4gKGZ1bmN0aW9uIGN1YmVoZWxpeEdhbW1hKHkpIHtcbiAgICB5ID0gK3k7XG5cbiAgICBmdW5jdGlvbiBjdWJlaGVsaXgkJDEoc3RhcnQsIGVuZCkge1xuICAgICAgdmFyIGggPSBodWUkJDEoKHN0YXJ0ID0gZDNDb2xvci5jdWJlaGVsaXgoc3RhcnQpKS5oLCAoZW5kID0gZDNDb2xvci5jdWJlaGVsaXgoZW5kKSkuaCksXG4gICAgICAgICAgcyA9IG5vZ2FtbWEoc3RhcnQucywgZW5kLnMpLFxuICAgICAgICAgIGwgPSBub2dhbW1hKHN0YXJ0LmwsIGVuZC5sKSxcbiAgICAgICAgICBvcGFjaXR5ID0gbm9nYW1tYShzdGFydC5vcGFjaXR5LCBlbmQub3BhY2l0eSk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgICBzdGFydC5oID0gaCh0KTtcbiAgICAgICAgc3RhcnQucyA9IHModCk7XG4gICAgICAgIHN0YXJ0LmwgPSBsKE1hdGgucG93KHQsIHkpKTtcbiAgICAgICAgc3RhcnQub3BhY2l0eSA9IG9wYWNpdHkodCk7XG4gICAgICAgIHJldHVybiBzdGFydCArIFwiXCI7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGN1YmVoZWxpeCQkMS5nYW1tYSA9IGN1YmVoZWxpeEdhbW1hO1xuXG4gICAgcmV0dXJuIGN1YmVoZWxpeCQkMTtcbiAgfSkoMSk7XG59XG5cbnZhciBjdWJlaGVsaXgkMiA9IGN1YmVoZWxpeCQxKGh1ZSk7XG52YXIgY3ViZWhlbGl4TG9uZyA9IGN1YmVoZWxpeCQxKG5vZ2FtbWEpO1xuXG52YXIgcXVhbnRpemUgPSBmdW5jdGlvbihpbnRlcnBvbGF0b3IsIG4pIHtcbiAgdmFyIHNhbXBsZXMgPSBuZXcgQXJyYXkobik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgKytpKSBzYW1wbGVzW2ldID0gaW50ZXJwb2xhdG9yKGkgLyAobiAtIDEpKTtcbiAgcmV0dXJuIHNhbXBsZXM7XG59O1xuXG5leHBvcnRzLmludGVycG9sYXRlID0gdmFsdWU7XG5leHBvcnRzLmludGVycG9sYXRlQXJyYXkgPSBhcnJheTtcbmV4cG9ydHMuaW50ZXJwb2xhdGVCYXNpcyA9IGJhc2lzJDE7XG5leHBvcnRzLmludGVycG9sYXRlQmFzaXNDbG9zZWQgPSBiYXNpc0Nsb3NlZDtcbmV4cG9ydHMuaW50ZXJwb2xhdGVEYXRlID0gZGF0ZTtcbmV4cG9ydHMuaW50ZXJwb2xhdGVOdW1iZXIgPSBudW1iZXI7XG5leHBvcnRzLmludGVycG9sYXRlT2JqZWN0ID0gb2JqZWN0O1xuZXhwb3J0cy5pbnRlcnBvbGF0ZVJvdW5kID0gcm91bmQ7XG5leHBvcnRzLmludGVycG9sYXRlU3RyaW5nID0gc3RyaW5nO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZVRyYW5zZm9ybUNzcyA9IGludGVycG9sYXRlVHJhbnNmb3JtQ3NzO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZVRyYW5zZm9ybVN2ZyA9IGludGVycG9sYXRlVHJhbnNmb3JtU3ZnO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZVpvb20gPSB6b29tO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZVJnYiA9IHJnYiQxO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZVJnYkJhc2lzID0gcmdiQmFzaXM7XG5leHBvcnRzLmludGVycG9sYXRlUmdiQmFzaXNDbG9zZWQgPSByZ2JCYXNpc0Nsb3NlZDtcbmV4cG9ydHMuaW50ZXJwb2xhdGVIc2wgPSBoc2wkMjtcbmV4cG9ydHMuaW50ZXJwb2xhdGVIc2xMb25nID0gaHNsTG9uZztcbmV4cG9ydHMuaW50ZXJwb2xhdGVMYWIgPSBsYWIkMTtcbmV4cG9ydHMuaW50ZXJwb2xhdGVIY2wgPSBoY2wkMjtcbmV4cG9ydHMuaW50ZXJwb2xhdGVIY2xMb25nID0gaGNsTG9uZztcbmV4cG9ydHMuaW50ZXJwb2xhdGVDdWJlaGVsaXggPSBjdWJlaGVsaXgkMjtcbmV4cG9ydHMuaW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nID0gY3ViZWhlbGl4TG9uZztcbmV4cG9ydHMucXVhbnRpemUgPSBxdWFudGl6ZTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbiIsIi8vIGh0dHBzOi8vZDNqcy5vcmcvZDMtcGF0aC8gVmVyc2lvbiAxLjAuNS4gQ29weXJpZ2h0IDIwMTcgTWlrZSBCb3N0b2NrLlxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuXHQoZmFjdG9yeSgoZ2xvYmFsLmQzID0gZ2xvYmFsLmQzIHx8IHt9KSkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG52YXIgcGkgPSBNYXRoLlBJO1xudmFyIHRhdSA9IDIgKiBwaTtcbnZhciBlcHNpbG9uID0gMWUtNjtcbnZhciB0YXVFcHNpbG9uID0gdGF1IC0gZXBzaWxvbjtcblxuZnVuY3Rpb24gUGF0aCgpIHtcbiAgdGhpcy5feDAgPSB0aGlzLl95MCA9IC8vIHN0YXJ0IG9mIGN1cnJlbnQgc3VicGF0aFxuICB0aGlzLl94MSA9IHRoaXMuX3kxID0gbnVsbDsgLy8gZW5kIG9mIGN1cnJlbnQgc3VicGF0aFxuICB0aGlzLl8gPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBwYXRoKCkge1xuICByZXR1cm4gbmV3IFBhdGg7XG59XG5cblBhdGgucHJvdG90eXBlID0gcGF0aC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBQYXRoLFxuICBtb3ZlVG86IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLl8gKz0gXCJNXCIgKyAodGhpcy5feDAgPSB0aGlzLl94MSA9ICt4KSArIFwiLFwiICsgKHRoaXMuX3kwID0gdGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIGNsb3NlUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3gxICE9PSBudWxsKSB7XG4gICAgICB0aGlzLl94MSA9IHRoaXMuX3gwLCB0aGlzLl95MSA9IHRoaXMuX3kwO1xuICAgICAgdGhpcy5fICs9IFwiWlwiO1xuICAgIH1cbiAgfSxcbiAgbGluZVRvOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5fICs9IFwiTFwiICsgKHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIHF1YWRyYXRpY0N1cnZlVG86IGZ1bmN0aW9uKHgxLCB5MSwgeCwgeSkge1xuICAgIHRoaXMuXyArPSBcIlFcIiArICgreDEpICsgXCIsXCIgKyAoK3kxKSArIFwiLFwiICsgKHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIGJlemllckN1cnZlVG86IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyLCB4LCB5KSB7XG4gICAgdGhpcy5fICs9IFwiQ1wiICsgKCt4MSkgKyBcIixcIiArICgreTEpICsgXCIsXCIgKyAoK3gyKSArIFwiLFwiICsgKCt5MikgKyBcIixcIiArICh0aGlzLl94MSA9ICt4KSArIFwiLFwiICsgKHRoaXMuX3kxID0gK3kpO1xuICB9LFxuICBhcmNUbzogZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIHIpIHtcbiAgICB4MSA9ICt4MSwgeTEgPSAreTEsIHgyID0gK3gyLCB5MiA9ICt5MiwgciA9ICtyO1xuICAgIHZhciB4MCA9IHRoaXMuX3gxLFxuICAgICAgICB5MCA9IHRoaXMuX3kxLFxuICAgICAgICB4MjEgPSB4MiAtIHgxLFxuICAgICAgICB5MjEgPSB5MiAtIHkxLFxuICAgICAgICB4MDEgPSB4MCAtIHgxLFxuICAgICAgICB5MDEgPSB5MCAtIHkxLFxuICAgICAgICBsMDFfMiA9IHgwMSAqIHgwMSArIHkwMSAqIHkwMTtcblxuICAgIC8vIElzIHRoZSByYWRpdXMgbmVnYXRpdmU/IEVycm9yLlxuICAgIGlmIChyIDwgMCkgdGhyb3cgbmV3IEVycm9yKFwibmVnYXRpdmUgcmFkaXVzOiBcIiArIHIpO1xuXG4gICAgLy8gSXMgdGhpcyBwYXRoIGVtcHR5PyBNb3ZlIHRvICh4MSx5MSkuXG4gICAgaWYgKHRoaXMuX3gxID09PSBudWxsKSB7XG4gICAgICB0aGlzLl8gKz0gXCJNXCIgKyAodGhpcy5feDEgPSB4MSkgKyBcIixcIiArICh0aGlzLl95MSA9IHkxKTtcbiAgICB9XG5cbiAgICAvLyBPciwgaXMgKHgxLHkxKSBjb2luY2lkZW50IHdpdGggKHgwLHkwKT8gRG8gbm90aGluZy5cbiAgICBlbHNlIGlmICghKGwwMV8yID4gZXBzaWxvbikpIHt9XG5cbiAgICAvLyBPciwgYXJlICh4MCx5MCksICh4MSx5MSkgYW5kICh4Mix5MikgY29sbGluZWFyP1xuICAgIC8vIEVxdWl2YWxlbnRseSwgaXMgKHgxLHkxKSBjb2luY2lkZW50IHdpdGggKHgyLHkyKT9cbiAgICAvLyBPciwgaXMgdGhlIHJhZGl1cyB6ZXJvPyBMaW5lIHRvICh4MSx5MSkuXG4gICAgZWxzZSBpZiAoIShNYXRoLmFicyh5MDEgKiB4MjEgLSB5MjEgKiB4MDEpID4gZXBzaWxvbikgfHwgIXIpIHtcbiAgICAgIHRoaXMuXyArPSBcIkxcIiArICh0aGlzLl94MSA9IHgxKSArIFwiLFwiICsgKHRoaXMuX3kxID0geTEpO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgZHJhdyBhbiBhcmMhXG4gICAgZWxzZSB7XG4gICAgICB2YXIgeDIwID0geDIgLSB4MCxcbiAgICAgICAgICB5MjAgPSB5MiAtIHkwLFxuICAgICAgICAgIGwyMV8yID0geDIxICogeDIxICsgeTIxICogeTIxLFxuICAgICAgICAgIGwyMF8yID0geDIwICogeDIwICsgeTIwICogeTIwLFxuICAgICAgICAgIGwyMSA9IE1hdGguc3FydChsMjFfMiksXG4gICAgICAgICAgbDAxID0gTWF0aC5zcXJ0KGwwMV8yKSxcbiAgICAgICAgICBsID0gciAqIE1hdGgudGFuKChwaSAtIE1hdGguYWNvcygobDIxXzIgKyBsMDFfMiAtIGwyMF8yKSAvICgyICogbDIxICogbDAxKSkpIC8gMiksXG4gICAgICAgICAgdDAxID0gbCAvIGwwMSxcbiAgICAgICAgICB0MjEgPSBsIC8gbDIxO1xuXG4gICAgICAvLyBJZiB0aGUgc3RhcnQgdGFuZ2VudCBpcyBub3QgY29pbmNpZGVudCB3aXRoICh4MCx5MCksIGxpbmUgdG8uXG4gICAgICBpZiAoTWF0aC5hYnModDAxIC0gMSkgPiBlcHNpbG9uKSB7XG4gICAgICAgIHRoaXMuXyArPSBcIkxcIiArICh4MSArIHQwMSAqIHgwMSkgKyBcIixcIiArICh5MSArIHQwMSAqIHkwMSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuXyArPSBcIkFcIiArIHIgKyBcIixcIiArIHIgKyBcIiwwLDAsXCIgKyAoKyh5MDEgKiB4MjAgPiB4MDEgKiB5MjApKSArIFwiLFwiICsgKHRoaXMuX3gxID0geDEgKyB0MjEgKiB4MjEpICsgXCIsXCIgKyAodGhpcy5feTEgPSB5MSArIHQyMSAqIHkyMSk7XG4gICAgfVxuICB9LFxuICBhcmM6IGZ1bmN0aW9uKHgsIHksIHIsIGEwLCBhMSwgY2N3KSB7XG4gICAgeCA9ICt4LCB5ID0gK3ksIHIgPSArcjtcbiAgICB2YXIgZHggPSByICogTWF0aC5jb3MoYTApLFxuICAgICAgICBkeSA9IHIgKiBNYXRoLnNpbihhMCksXG4gICAgICAgIHgwID0geCArIGR4LFxuICAgICAgICB5MCA9IHkgKyBkeSxcbiAgICAgICAgY3cgPSAxIF4gY2N3LFxuICAgICAgICBkYSA9IGNjdyA/IGEwIC0gYTEgOiBhMSAtIGEwO1xuXG4gICAgLy8gSXMgdGhlIHJhZGl1cyBuZWdhdGl2ZT8gRXJyb3IuXG4gICAgaWYgKHIgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJuZWdhdGl2ZSByYWRpdXM6IFwiICsgcik7XG5cbiAgICAvLyBJcyB0aGlzIHBhdGggZW1wdHk/IE1vdmUgdG8gKHgwLHkwKS5cbiAgICBpZiAodGhpcy5feDEgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuXyArPSBcIk1cIiArIHgwICsgXCIsXCIgKyB5MDtcbiAgICB9XG5cbiAgICAvLyBPciwgaXMgKHgwLHkwKSBub3QgY29pbmNpZGVudCB3aXRoIHRoZSBwcmV2aW91cyBwb2ludD8gTGluZSB0byAoeDAseTApLlxuICAgIGVsc2UgaWYgKE1hdGguYWJzKHRoaXMuX3gxIC0geDApID4gZXBzaWxvbiB8fCBNYXRoLmFicyh0aGlzLl95MSAtIHkwKSA+IGVwc2lsb24pIHtcbiAgICAgIHRoaXMuXyArPSBcIkxcIiArIHgwICsgXCIsXCIgKyB5MDtcbiAgICB9XG5cbiAgICAvLyBJcyB0aGlzIGFyYyBlbXB0eT8gV2XigJlyZSBkb25lLlxuICAgIGlmICghcikgcmV0dXJuO1xuXG4gICAgLy8gRG9lcyB0aGUgYW5nbGUgZ28gdGhlIHdyb25nIHdheT8gRmxpcCB0aGUgZGlyZWN0aW9uLlxuICAgIGlmIChkYSA8IDApIGRhID0gZGEgJSB0YXUgKyB0YXU7XG5cbiAgICAvLyBJcyB0aGlzIGEgY29tcGxldGUgY2lyY2xlPyBEcmF3IHR3byBhcmNzIHRvIGNvbXBsZXRlIHRoZSBjaXJjbGUuXG4gICAgaWYgKGRhID4gdGF1RXBzaWxvbikge1xuICAgICAgdGhpcy5fICs9IFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsMSxcIiArIGN3ICsgXCIsXCIgKyAoeCAtIGR4KSArIFwiLFwiICsgKHkgLSBkeSkgKyBcIkFcIiArIHIgKyBcIixcIiArIHIgKyBcIiwwLDEsXCIgKyBjdyArIFwiLFwiICsgKHRoaXMuX3gxID0geDApICsgXCIsXCIgKyAodGhpcy5feTEgPSB5MCk7XG4gICAgfVxuXG4gICAgLy8gSXMgdGhpcyBhcmMgbm9uLWVtcHR5PyBEcmF3IGFuIGFyYyFcbiAgICBlbHNlIGlmIChkYSA+IGVwc2lsb24pIHtcbiAgICAgIHRoaXMuXyArPSBcIkFcIiArIHIgKyBcIixcIiArIHIgKyBcIiwwLFwiICsgKCsoZGEgPj0gcGkpKSArIFwiLFwiICsgY3cgKyBcIixcIiArICh0aGlzLl94MSA9IHggKyByICogTWF0aC5jb3MoYTEpKSArIFwiLFwiICsgKHRoaXMuX3kxID0geSArIHIgKiBNYXRoLnNpbihhMSkpO1xuICAgIH1cbiAgfSxcbiAgcmVjdDogZnVuY3Rpb24oeCwgeSwgdywgaCkge1xuICAgIHRoaXMuXyArPSBcIk1cIiArICh0aGlzLl94MCA9IHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTAgPSB0aGlzLl95MSA9ICt5KSArIFwiaFwiICsgKCt3KSArIFwidlwiICsgKCtoKSArIFwiaFwiICsgKC13KSArIFwiWlwiO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuXztcbiAgfVxufTtcblxuZXhwb3J0cy5wYXRoID0gcGF0aDtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbiIsIi8vIGh0dHBzOi8vZDNqcy5vcmcvZDMtcmFuZG9tLyBWZXJzaW9uIDEuMC4xLiBDb3B5cmlnaHQgMjAxNiBNaWtlIEJvc3RvY2suXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG4gIChmYWN0b3J5KChnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pKSk7XG59KHRoaXMsIGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxuICBmdW5jdGlvbiB1bmlmb3JtKG1pbiwgbWF4KSB7XG4gICAgbWluID0gbWluID09IG51bGwgPyAwIDogK21pbjtcbiAgICBtYXggPSBtYXggPT0gbnVsbCA/IDEgOiArbWF4O1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSBtYXggPSBtaW4sIG1pbiA9IDA7XG4gICAgZWxzZSBtYXggLT0gbWluO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogbWF4ICsgbWluO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWwobXUsIHNpZ21hKSB7XG4gICAgdmFyIHgsIHI7XG4gICAgbXUgPSBtdSA9PSBudWxsID8gMCA6ICttdTtcbiAgICBzaWdtYSA9IHNpZ21hID09IG51bGwgPyAxIDogK3NpZ21hO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB5O1xuXG4gICAgICAvLyBJZiBhdmFpbGFibGUsIHVzZSB0aGUgc2Vjb25kIHByZXZpb3VzbHktZ2VuZXJhdGVkIHVuaWZvcm0gcmFuZG9tLlxuICAgICAgaWYgKHggIT0gbnVsbCkgeSA9IHgsIHggPSBudWxsO1xuXG4gICAgICAvLyBPdGhlcndpc2UsIGdlbmVyYXRlIGEgbmV3IHggYW5kIHkuXG4gICAgICBlbHNlIGRvIHtcbiAgICAgICAgeCA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcbiAgICAgICAgeSA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcbiAgICAgICAgciA9IHggKiB4ICsgeSAqIHk7XG4gICAgICB9IHdoaWxlICghciB8fCByID4gMSk7XG5cbiAgICAgIHJldHVybiBtdSArIHNpZ21hICogeSAqIE1hdGguc3FydCgtMiAqIE1hdGgubG9nKHIpIC8gcik7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvZ05vcm1hbCgpIHtcbiAgICB2YXIgcmFuZG9tTm9ybWFsID0gbm9ybWFsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIE1hdGguZXhwKHJhbmRvbU5vcm1hbCgpKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gaXJ3aW5IYWxsKG4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBmb3IgKHZhciBzdW0gPSAwLCBpID0gMDsgaSA8IG47ICsraSkgc3VtICs9IE1hdGgucmFuZG9tKCk7XG4gICAgICByZXR1cm4gc3VtO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBiYXRlcyhuKSB7XG4gICAgdmFyIHJhbmRvbUlyd2luSGFsbCA9IGlyd2luSGFsbChuKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmFuZG9tSXJ3aW5IYWxsKCkgLyBuO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBleHBvbmVudGlhbChsYW1iZGEpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gLU1hdGgubG9nKDEgLSBNYXRoLnJhbmRvbSgpKSAvIGxhbWJkYTtcbiAgICB9O1xuICB9XG5cbiAgZXhwb3J0cy5yYW5kb21Vbmlmb3JtID0gdW5pZm9ybTtcbiAgZXhwb3J0cy5yYW5kb21Ob3JtYWwgPSBub3JtYWw7XG4gIGV4cG9ydHMucmFuZG9tTG9nTm9ybWFsID0gbG9nTm9ybWFsO1xuICBleHBvcnRzLnJhbmRvbUJhdGVzID0gYmF0ZXM7XG4gIGV4cG9ydHMucmFuZG9tSXJ3aW5IYWxsID0gaXJ3aW5IYWxsO1xuICBleHBvcnRzLnJhbmRvbUV4cG9uZW50aWFsID0gZXhwb25lbnRpYWw7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpOyIsIi8vIGh0dHBzOi8vZDNqcy5vcmcvZDMtc2NhbGUvIFZlcnNpb24gMS4wLjMuIENvcHlyaWdodCAyMDE2IE1pa2UgQm9zdG9jay5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cywgcmVxdWlyZSgnZDMtYXJyYXknKSwgcmVxdWlyZSgnZDMtY29sbGVjdGlvbicpLCByZXF1aXJlKCdkMy1pbnRlcnBvbGF0ZScpLCByZXF1aXJlKCdkMy1mb3JtYXQnKSwgcmVxdWlyZSgnZDMtdGltZScpLCByZXF1aXJlKCdkMy10aW1lLWZvcm1hdCcpLCByZXF1aXJlKCdkMy1jb2xvcicpKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnLCAnZDMtYXJyYXknLCAnZDMtY29sbGVjdGlvbicsICdkMy1pbnRlcnBvbGF0ZScsICdkMy1mb3JtYXQnLCAnZDMtdGltZScsICdkMy10aW1lLWZvcm1hdCcsICdkMy1jb2xvciddLCBmYWN0b3J5KSA6XG4gIChmYWN0b3J5KChnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pLGdsb2JhbC5kMyxnbG9iYWwuZDMsZ2xvYmFsLmQzLGdsb2JhbC5kMyxnbG9iYWwuZDMsZ2xvYmFsLmQzLGdsb2JhbC5kMykpO1xufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cyxkM0FycmF5LGQzQ29sbGVjdGlvbixkM0ludGVycG9sYXRlLGQzRm9ybWF0LGQzVGltZSxkM1RpbWVGb3JtYXQsZDNDb2xvcikgeyAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGFycmF5ID0gQXJyYXkucHJvdG90eXBlO1xuXG4gIHZhciBtYXAkMSA9IGFycmF5Lm1hcDtcbiAgdmFyIHNsaWNlID0gYXJyYXkuc2xpY2U7XG5cbiAgdmFyIGltcGxpY2l0ID0ge25hbWU6IFwiaW1wbGljaXRcIn07XG5cbiAgZnVuY3Rpb24gb3JkaW5hbChyYW5nZSkge1xuICAgIHZhciBpbmRleCA9IGQzQ29sbGVjdGlvbi5tYXAoKSxcbiAgICAgICAgZG9tYWluID0gW10sXG4gICAgICAgIHVua25vd24gPSBpbXBsaWNpdDtcblxuICAgIHJhbmdlID0gcmFuZ2UgPT0gbnVsbCA/IFtdIDogc2xpY2UuY2FsbChyYW5nZSk7XG5cbiAgICBmdW5jdGlvbiBzY2FsZShkKSB7XG4gICAgICB2YXIga2V5ID0gZCArIFwiXCIsIGkgPSBpbmRleC5nZXQoa2V5KTtcbiAgICAgIGlmICghaSkge1xuICAgICAgICBpZiAodW5rbm93biAhPT0gaW1wbGljaXQpIHJldHVybiB1bmtub3duO1xuICAgICAgICBpbmRleC5zZXQoa2V5LCBpID0gZG9tYWluLnB1c2goZCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJhbmdlWyhpIC0gMSkgJSByYW5nZS5sZW5ndGhdO1xuICAgIH1cblxuICAgIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRvbWFpbi5zbGljZSgpO1xuICAgICAgZG9tYWluID0gW10sIGluZGV4ID0gZDNDb2xsZWN0aW9uLm1hcCgpO1xuICAgICAgdmFyIGkgPSAtMSwgbiA9IF8ubGVuZ3RoLCBkLCBrZXk7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKCFpbmRleC5oYXMoa2V5ID0gKGQgPSBfW2ldKSArIFwiXCIpKSBpbmRleC5zZXQoa2V5LCBkb21haW4ucHVzaChkKSk7XG4gICAgICByZXR1cm4gc2NhbGU7XG4gICAgfTtcblxuICAgIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBzbGljZS5jYWxsKF8pLCBzY2FsZSkgOiByYW5nZS5zbGljZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS51bmtub3duID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodW5rbm93biA9IF8sIHNjYWxlKSA6IHVua25vd247XG4gICAgfTtcblxuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBvcmRpbmFsKClcbiAgICAgICAgICAuZG9tYWluKGRvbWFpbilcbiAgICAgICAgICAucmFuZ2UocmFuZ2UpXG4gICAgICAgICAgLnVua25vd24odW5rbm93bik7XG4gICAgfTtcblxuICAgIHJldHVybiBzY2FsZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJhbmQoKSB7XG4gICAgdmFyIHNjYWxlID0gb3JkaW5hbCgpLnVua25vd24odW5kZWZpbmVkKSxcbiAgICAgICAgZG9tYWluID0gc2NhbGUuZG9tYWluLFxuICAgICAgICBvcmRpbmFsUmFuZ2UgPSBzY2FsZS5yYW5nZSxcbiAgICAgICAgcmFuZ2UgPSBbMCwgMV0sXG4gICAgICAgIHN0ZXAsXG4gICAgICAgIGJhbmR3aWR0aCxcbiAgICAgICAgcm91bmQgPSBmYWxzZSxcbiAgICAgICAgcGFkZGluZ0lubmVyID0gMCxcbiAgICAgICAgcGFkZGluZ091dGVyID0gMCxcbiAgICAgICAgYWxpZ24gPSAwLjU7XG5cbiAgICBkZWxldGUgc2NhbGUudW5rbm93bjtcblxuICAgIGZ1bmN0aW9uIHJlc2NhbGUoKSB7XG4gICAgICB2YXIgbiA9IGRvbWFpbigpLmxlbmd0aCxcbiAgICAgICAgICByZXZlcnNlID0gcmFuZ2VbMV0gPCByYW5nZVswXSxcbiAgICAgICAgICBzdGFydCA9IHJhbmdlW3JldmVyc2UgLSAwXSxcbiAgICAgICAgICBzdG9wID0gcmFuZ2VbMSAtIHJldmVyc2VdO1xuICAgICAgc3RlcCA9IChzdG9wIC0gc3RhcnQpIC8gTWF0aC5tYXgoMSwgbiAtIHBhZGRpbmdJbm5lciArIHBhZGRpbmdPdXRlciAqIDIpO1xuICAgICAgaWYgKHJvdW5kKSBzdGVwID0gTWF0aC5mbG9vcihzdGVwKTtcbiAgICAgIHN0YXJ0ICs9IChzdG9wIC0gc3RhcnQgLSBzdGVwICogKG4gLSBwYWRkaW5nSW5uZXIpKSAqIGFsaWduO1xuICAgICAgYmFuZHdpZHRoID0gc3RlcCAqICgxIC0gcGFkZGluZ0lubmVyKTtcbiAgICAgIGlmIChyb3VuZCkgc3RhcnQgPSBNYXRoLnJvdW5kKHN0YXJ0KSwgYmFuZHdpZHRoID0gTWF0aC5yb3VuZChiYW5kd2lkdGgpO1xuICAgICAgdmFyIHZhbHVlcyA9IGQzQXJyYXkucmFuZ2UobikubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIHN0YXJ0ICsgc3RlcCAqIGk7IH0pO1xuICAgICAgcmV0dXJuIG9yZGluYWxSYW5nZShyZXZlcnNlID8gdmFsdWVzLnJldmVyc2UoKSA6IHZhbHVlcyk7XG4gICAgfVxuXG4gICAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZG9tYWluKF8pLCByZXNjYWxlKCkpIDogZG9tYWluKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBbK19bMF0sICtfWzFdXSwgcmVzY2FsZSgpKSA6IHJhbmdlLnNsaWNlKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLnJhbmdlUm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gcmFuZ2UgPSBbK19bMF0sICtfWzFdXSwgcm91bmQgPSB0cnVlLCByZXNjYWxlKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLmJhbmR3aWR0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGJhbmR3aWR0aDtcbiAgICB9O1xuXG4gICAgc2NhbGUuc3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgfTtcblxuICAgIHNjYWxlLnJvdW5kID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocm91bmQgPSAhIV8sIHJlc2NhbGUoKSkgOiByb3VuZDtcbiAgICB9O1xuXG4gICAgc2NhbGUucGFkZGluZyA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHBhZGRpbmdJbm5lciA9IHBhZGRpbmdPdXRlciA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIF8pKSwgcmVzY2FsZSgpKSA6IHBhZGRpbmdJbm5lcjtcbiAgICB9O1xuXG4gICAgc2NhbGUucGFkZGluZ0lubmVyID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkZGluZ0lubmVyID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgXykpLCByZXNjYWxlKCkpIDogcGFkZGluZ0lubmVyO1xuICAgIH07XG5cbiAgICBzY2FsZS5wYWRkaW5nT3V0ZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRkaW5nT3V0ZXIgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBfKSksIHJlc2NhbGUoKSkgOiBwYWRkaW5nT3V0ZXI7XG4gICAgfTtcblxuICAgIHNjYWxlLmFsaWduID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoYWxpZ24gPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBfKSksIHJlc2NhbGUoKSkgOiBhbGlnbjtcbiAgICB9O1xuXG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGJhbmQoKVxuICAgICAgICAgIC5kb21haW4oZG9tYWluKCkpXG4gICAgICAgICAgLnJhbmdlKHJhbmdlKVxuICAgICAgICAgIC5yb3VuZChyb3VuZClcbiAgICAgICAgICAucGFkZGluZ0lubmVyKHBhZGRpbmdJbm5lcilcbiAgICAgICAgICAucGFkZGluZ091dGVyKHBhZGRpbmdPdXRlcilcbiAgICAgICAgICAuYWxpZ24oYWxpZ24pO1xuICAgIH07XG5cbiAgICByZXR1cm4gcmVzY2FsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcG9pbnRpc2goc2NhbGUpIHtcbiAgICB2YXIgY29weSA9IHNjYWxlLmNvcHk7XG5cbiAgICBzY2FsZS5wYWRkaW5nID0gc2NhbGUucGFkZGluZ091dGVyO1xuICAgIGRlbGV0ZSBzY2FsZS5wYWRkaW5nSW5uZXI7XG4gICAgZGVsZXRlIHNjYWxlLnBhZGRpbmdPdXRlcjtcblxuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwb2ludGlzaChjb3B5KCkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gc2NhbGU7XG4gIH1cblxuICBmdW5jdGlvbiBwb2ludCgpIHtcbiAgICByZXR1cm4gcG9pbnRpc2goYmFuZCgpLnBhZGRpbmdJbm5lcigxKSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb25zdGFudCh4KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHg7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG51bWJlcih4KSB7XG4gICAgcmV0dXJuICt4O1xuICB9XG5cbiAgdmFyIHVuaXQgPSBbMCwgMV07XG5cbiAgZnVuY3Rpb24gZGVpbnRlcnBvbGF0ZShhLCBiKSB7XG4gICAgcmV0dXJuIChiIC09IChhID0gK2EpKVxuICAgICAgICA/IGZ1bmN0aW9uKHgpIHsgcmV0dXJuICh4IC0gYSkgLyBiOyB9XG4gICAgICAgIDogY29uc3RhbnQoYik7XG4gIH1cblxuICBmdW5jdGlvbiBkZWludGVycG9sYXRlQ2xhbXAoZGVpbnRlcnBvbGF0ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICB2YXIgZCA9IGRlaW50ZXJwb2xhdGUoYSA9ICthLCBiID0gK2IpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggPD0gYSA/IDAgOiB4ID49IGIgPyAxIDogZCh4KTsgfTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gcmVpbnRlcnBvbGF0ZUNsYW1wKHJlaW50ZXJwb2xhdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgICAgdmFyIHIgPSByZWludGVycG9sYXRlKGEgPSArYSwgYiA9ICtiKTtcbiAgICAgIHJldHVybiBmdW5jdGlvbih0KSB7IHJldHVybiB0IDw9IDAgPyBhIDogdCA+PSAxID8gYiA6IHIodCk7IH07XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJpbWFwKGRvbWFpbiwgcmFuZ2UsIGRlaW50ZXJwb2xhdGUsIHJlaW50ZXJwb2xhdGUpIHtcbiAgICB2YXIgZDAgPSBkb21haW5bMF0sIGQxID0gZG9tYWluWzFdLCByMCA9IHJhbmdlWzBdLCByMSA9IHJhbmdlWzFdO1xuICAgIGlmIChkMSA8IGQwKSBkMCA9IGRlaW50ZXJwb2xhdGUoZDEsIGQwKSwgcjAgPSByZWludGVycG9sYXRlKHIxLCByMCk7XG4gICAgZWxzZSBkMCA9IGRlaW50ZXJwb2xhdGUoZDAsIGQxKSwgcjAgPSByZWludGVycG9sYXRlKHIwLCByMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHIwKGQwKHgpKTsgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBvbHltYXAoZG9tYWluLCByYW5nZSwgZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSkge1xuICAgIHZhciBqID0gTWF0aC5taW4oZG9tYWluLmxlbmd0aCwgcmFuZ2UubGVuZ3RoKSAtIDEsXG4gICAgICAgIGQgPSBuZXcgQXJyYXkoaiksXG4gICAgICAgIHIgPSBuZXcgQXJyYXkoaiksXG4gICAgICAgIGkgPSAtMTtcblxuICAgIC8vIFJldmVyc2UgZGVzY2VuZGluZyBkb21haW5zLlxuICAgIGlmIChkb21haW5bal0gPCBkb21haW5bMF0pIHtcbiAgICAgIGRvbWFpbiA9IGRvbWFpbi5zbGljZSgpLnJldmVyc2UoKTtcbiAgICAgIHJhbmdlID0gcmFuZ2Uuc2xpY2UoKS5yZXZlcnNlKCk7XG4gICAgfVxuXG4gICAgd2hpbGUgKCsraSA8IGopIHtcbiAgICAgIGRbaV0gPSBkZWludGVycG9sYXRlKGRvbWFpbltpXSwgZG9tYWluW2kgKyAxXSk7XG4gICAgICByW2ldID0gcmVpbnRlcnBvbGF0ZShyYW5nZVtpXSwgcmFuZ2VbaSArIDFdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgdmFyIGkgPSBkM0FycmF5LmJpc2VjdChkb21haW4sIHgsIDEsIGopIC0gMTtcbiAgICAgIHJldHVybiByW2ldKGRbaV0oeCkpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBjb3B5KHNvdXJjZSwgdGFyZ2V0KSB7XG4gICAgcmV0dXJuIHRhcmdldFxuICAgICAgICAuZG9tYWluKHNvdXJjZS5kb21haW4oKSlcbiAgICAgICAgLnJhbmdlKHNvdXJjZS5yYW5nZSgpKVxuICAgICAgICAuaW50ZXJwb2xhdGUoc291cmNlLmludGVycG9sYXRlKCkpXG4gICAgICAgIC5jbGFtcChzb3VyY2UuY2xhbXAoKSk7XG4gIH1cblxuICAvLyBkZWludGVycG9sYXRlKGEsIGIpKHgpIHRha2VzIGEgZG9tYWluIHZhbHVlIHggaW4gW2EsYl0gYW5kIHJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmcgcGFyYW1ldGVyIHQgaW4gWzAsMV0uXG4gIC8vIHJlaW50ZXJwb2xhdGUoYSwgYikodCkgdGFrZXMgYSBwYXJhbWV0ZXIgdCBpbiBbMCwxXSBhbmQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBkb21haW4gdmFsdWUgeCBpbiBbYSxiXS5cbiAgZnVuY3Rpb24gY29udGludW91cyhkZWludGVycG9sYXRlJCQsIHJlaW50ZXJwb2xhdGUpIHtcbiAgICB2YXIgZG9tYWluID0gdW5pdCxcbiAgICAgICAgcmFuZ2UgPSB1bml0LFxuICAgICAgICBpbnRlcnBvbGF0ZSA9IGQzSW50ZXJwb2xhdGUuaW50ZXJwb2xhdGUsXG4gICAgICAgIGNsYW1wID0gZmFsc2UsXG4gICAgICAgIHBpZWNld2lzZSxcbiAgICAgICAgb3V0cHV0LFxuICAgICAgICBpbnB1dDtcblxuICAgIGZ1bmN0aW9uIHJlc2NhbGUoKSB7XG4gICAgICBwaWVjZXdpc2UgPSBNYXRoLm1pbihkb21haW4ubGVuZ3RoLCByYW5nZS5sZW5ndGgpID4gMiA/IHBvbHltYXAgOiBiaW1hcDtcbiAgICAgIG91dHB1dCA9IGlucHV0ID0gbnVsbDtcbiAgICAgIHJldHVybiBzY2FsZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgICByZXR1cm4gKG91dHB1dCB8fCAob3V0cHV0ID0gcGllY2V3aXNlKGRvbWFpbiwgcmFuZ2UsIGNsYW1wID8gZGVpbnRlcnBvbGF0ZUNsYW1wKGRlaW50ZXJwb2xhdGUkJCkgOiBkZWludGVycG9sYXRlJCQsIGludGVycG9sYXRlKSkpKCt4KTtcbiAgICB9XG5cbiAgICBzY2FsZS5pbnZlcnQgPSBmdW5jdGlvbih5KSB7XG4gICAgICByZXR1cm4gKGlucHV0IHx8IChpbnB1dCA9IHBpZWNld2lzZShyYW5nZSwgZG9tYWluLCBkZWludGVycG9sYXRlLCBjbGFtcCA/IHJlaW50ZXJwb2xhdGVDbGFtcChyZWludGVycG9sYXRlKSA6IHJlaW50ZXJwb2xhdGUpKSkoK3kpO1xuICAgIH07XG5cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4gPSBtYXAkMS5jYWxsKF8sIG51bWJlciksIHJlc2NhbGUoKSkgOiBkb21haW4uc2xpY2UoKTtcbiAgICB9O1xuXG4gICAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyYW5nZSA9IHNsaWNlLmNhbGwoXyksIHJlc2NhbGUoKSkgOiByYW5nZS5zbGljZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS5yYW5nZVJvdW5kID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIHJhbmdlID0gc2xpY2UuY2FsbChfKSwgaW50ZXJwb2xhdGUgPSBkM0ludGVycG9sYXRlLmludGVycG9sYXRlUm91bmQsIHJlc2NhbGUoKTtcbiAgICB9O1xuXG4gICAgc2NhbGUuY2xhbXAgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChjbGFtcCA9ICEhXywgcmVzY2FsZSgpKSA6IGNsYW1wO1xuICAgIH07XG5cbiAgICBzY2FsZS5pbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGludGVycG9sYXRlID0gXywgcmVzY2FsZSgpKSA6IGludGVycG9sYXRlO1xuICAgIH07XG5cbiAgICByZXR1cm4gcmVzY2FsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGlja0Zvcm1hdChkb21haW4sIGNvdW50LCBzcGVjaWZpZXIpIHtcbiAgICB2YXIgc3RhcnQgPSBkb21haW5bMF0sXG4gICAgICAgIHN0b3AgPSBkb21haW5bZG9tYWluLmxlbmd0aCAtIDFdLFxuICAgICAgICBzdGVwID0gZDNBcnJheS50aWNrU3RlcChzdGFydCwgc3RvcCwgY291bnQgPT0gbnVsbCA/IDEwIDogY291bnQpLFxuICAgICAgICBwcmVjaXNpb247XG4gICAgc3BlY2lmaWVyID0gZDNGb3JtYXQuZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllciA9PSBudWxsID8gXCIsZlwiIDogc3BlY2lmaWVyKTtcbiAgICBzd2l0Y2ggKHNwZWNpZmllci50eXBlKSB7XG4gICAgICBjYXNlIFwic1wiOiB7XG4gICAgICAgIHZhciB2YWx1ZSA9IE1hdGgubWF4KE1hdGguYWJzKHN0YXJ0KSwgTWF0aC5hYnMoc3RvcCkpO1xuICAgICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBkM0Zvcm1hdC5wcmVjaXNpb25QcmVmaXgoc3RlcCwgdmFsdWUpKSkgc3BlY2lmaWVyLnByZWNpc2lvbiA9IHByZWNpc2lvbjtcbiAgICAgICAgcmV0dXJuIGQzRm9ybWF0LmZvcm1hdFByZWZpeChzcGVjaWZpZXIsIHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgXCJcIjpcbiAgICAgIGNhc2UgXCJlXCI6XG4gICAgICBjYXNlIFwiZ1wiOlxuICAgICAgY2FzZSBcInBcIjpcbiAgICAgIGNhc2UgXCJyXCI6IHtcbiAgICAgICAgaWYgKHNwZWNpZmllci5wcmVjaXNpb24gPT0gbnVsbCAmJiAhaXNOYU4ocHJlY2lzaW9uID0gZDNGb3JtYXQucHJlY2lzaW9uUm91bmQoc3RlcCwgTWF0aC5tYXgoTWF0aC5hYnMoc3RhcnQpLCBNYXRoLmFicyhzdG9wKSkpKSkgc3BlY2lmaWVyLnByZWNpc2lvbiA9IHByZWNpc2lvbiAtIChzcGVjaWZpZXIudHlwZSA9PT0gXCJlXCIpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgXCJmXCI6XG4gICAgICBjYXNlIFwiJVwiOiB7XG4gICAgICAgIGlmIChzcGVjaWZpZXIucHJlY2lzaW9uID09IG51bGwgJiYgIWlzTmFOKHByZWNpc2lvbiA9IGQzRm9ybWF0LnByZWNpc2lvbkZpeGVkKHN0ZXApKSkgc3BlY2lmaWVyLnByZWNpc2lvbiA9IHByZWNpc2lvbiAtIChzcGVjaWZpZXIudHlwZSA9PT0gXCIlXCIpICogMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkM0Zvcm1hdC5mb3JtYXQoc3BlY2lmaWVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxpbmVhcmlzaChzY2FsZSkge1xuICAgIHZhciBkb21haW4gPSBzY2FsZS5kb21haW47XG5cbiAgICBzY2FsZS50aWNrcyA9IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgICB2YXIgZCA9IGRvbWFpbigpO1xuICAgICAgcmV0dXJuIGQzQXJyYXkudGlja3MoZFswXSwgZFtkLmxlbmd0aCAtIDFdLCBjb3VudCA9PSBudWxsID8gMTAgOiBjb3VudCk7XG4gICAgfTtcblxuICAgIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihjb3VudCwgc3BlY2lmaWVyKSB7XG4gICAgICByZXR1cm4gdGlja0Zvcm1hdChkb21haW4oKSwgY291bnQsIHNwZWNpZmllcik7XG4gICAgfTtcblxuICAgIHNjYWxlLm5pY2UgPSBmdW5jdGlvbihjb3VudCkge1xuICAgICAgdmFyIGQgPSBkb21haW4oKSxcbiAgICAgICAgICBpID0gZC5sZW5ndGggLSAxLFxuICAgICAgICAgIG4gPSBjb3VudCA9PSBudWxsID8gMTAgOiBjb3VudCxcbiAgICAgICAgICBzdGFydCA9IGRbMF0sXG4gICAgICAgICAgc3RvcCA9IGRbaV0sXG4gICAgICAgICAgc3RlcCA9IGQzQXJyYXkudGlja1N0ZXAoc3RhcnQsIHN0b3AsIG4pO1xuXG4gICAgICBpZiAoc3RlcCkge1xuICAgICAgICBzdGVwID0gZDNBcnJheS50aWNrU3RlcChNYXRoLmZsb29yKHN0YXJ0IC8gc3RlcCkgKiBzdGVwLCBNYXRoLmNlaWwoc3RvcCAvIHN0ZXApICogc3RlcCwgbik7XG4gICAgICAgIGRbMF0gPSBNYXRoLmZsb29yKHN0YXJ0IC8gc3RlcCkgKiBzdGVwO1xuICAgICAgICBkW2ldID0gTWF0aC5jZWlsKHN0b3AgLyBzdGVwKSAqIHN0ZXA7XG4gICAgICAgIGRvbWFpbihkKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH07XG5cbiAgICByZXR1cm4gc2NhbGU7XG4gIH1cblxuICBmdW5jdGlvbiBsaW5lYXIoKSB7XG4gICAgdmFyIHNjYWxlID0gY29udGludW91cyhkZWludGVycG9sYXRlLCBkM0ludGVycG9sYXRlLmludGVycG9sYXRlTnVtYmVyKTtcblxuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBjb3B5KHNjYWxlLCBsaW5lYXIoKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBsaW5lYXJpc2goc2NhbGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaWRlbnRpdHkoKSB7XG4gICAgdmFyIGRvbWFpbiA9IFswLCAxXTtcblxuICAgIGZ1bmN0aW9uIHNjYWxlKHgpIHtcbiAgICAgIHJldHVybiAreDtcbiAgICB9XG5cbiAgICBzY2FsZS5pbnZlcnQgPSBzY2FsZTtcblxuICAgIHNjYWxlLmRvbWFpbiA9IHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZG9tYWluID0gbWFwJDEuY2FsbChfLCBudW1iZXIpLCBzY2FsZSkgOiBkb21haW4uc2xpY2UoKTtcbiAgICB9O1xuXG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGlkZW50aXR5KCkuZG9tYWluKGRvbWFpbik7XG4gICAgfTtcblxuICAgIHJldHVybiBsaW5lYXJpc2goc2NhbGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gbmljZShkb21haW4sIGludGVydmFsKSB7XG4gICAgZG9tYWluID0gZG9tYWluLnNsaWNlKCk7XG5cbiAgICB2YXIgaTAgPSAwLFxuICAgICAgICBpMSA9IGRvbWFpbi5sZW5ndGggLSAxLFxuICAgICAgICB4MCA9IGRvbWFpbltpMF0sXG4gICAgICAgIHgxID0gZG9tYWluW2kxXSxcbiAgICAgICAgdDtcblxuICAgIGlmICh4MSA8IHgwKSB7XG4gICAgICB0ID0gaTAsIGkwID0gaTEsIGkxID0gdDtcbiAgICAgIHQgPSB4MCwgeDAgPSB4MSwgeDEgPSB0O1xuICAgIH1cblxuICAgIGRvbWFpbltpMF0gPSBpbnRlcnZhbC5mbG9vcih4MCk7XG4gICAgZG9tYWluW2kxXSA9IGludGVydmFsLmNlaWwoeDEpO1xuICAgIHJldHVybiBkb21haW47XG4gIH1cblxuICBmdW5jdGlvbiBkZWludGVycG9sYXRlJDEoYSwgYikge1xuICAgIHJldHVybiAoYiA9IE1hdGgubG9nKGIgLyBhKSlcbiAgICAgICAgPyBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLmxvZyh4IC8gYSkgLyBiOyB9XG4gICAgICAgIDogY29uc3RhbnQoYik7XG4gIH1cblxuICBmdW5jdGlvbiByZWludGVycG9sYXRlKGEsIGIpIHtcbiAgICByZXR1cm4gYSA8IDBcbiAgICAgICAgPyBmdW5jdGlvbih0KSB7IHJldHVybiAtTWF0aC5wb3coLWIsIHQpICogTWF0aC5wb3coLWEsIDEgLSB0KTsgfVxuICAgICAgICA6IGZ1bmN0aW9uKHQpIHsgcmV0dXJuIE1hdGgucG93KGIsIHQpICogTWF0aC5wb3coYSwgMSAtIHQpOyB9O1xuICB9XG5cbiAgZnVuY3Rpb24gcG93MTAoeCkge1xuICAgIHJldHVybiBpc0Zpbml0ZSh4KSA/ICsoXCIxZVwiICsgeCkgOiB4IDwgMCA/IDAgOiB4O1xuICB9XG5cbiAgZnVuY3Rpb24gcG93cChiYXNlKSB7XG4gICAgcmV0dXJuIGJhc2UgPT09IDEwID8gcG93MTBcbiAgICAgICAgOiBiYXNlID09PSBNYXRoLkUgPyBNYXRoLmV4cFxuICAgICAgICA6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgucG93KGJhc2UsIHgpOyB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbG9ncChiYXNlKSB7XG4gICAgcmV0dXJuIGJhc2UgPT09IE1hdGguRSA/IE1hdGgubG9nXG4gICAgICAgIDogYmFzZSA9PT0gMTAgJiYgTWF0aC5sb2cxMFxuICAgICAgICB8fCBiYXNlID09PSAyICYmIE1hdGgubG9nMlxuICAgICAgICB8fCAoYmFzZSA9IE1hdGgubG9nKGJhc2UpLCBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLmxvZyh4KSAvIGJhc2U7IH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVmbGVjdChmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAtZigteCk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvZygpIHtcbiAgICB2YXIgc2NhbGUgPSBjb250aW51b3VzKGRlaW50ZXJwb2xhdGUkMSwgcmVpbnRlcnBvbGF0ZSkuZG9tYWluKFsxLCAxMF0pLFxuICAgICAgICBkb21haW4gPSBzY2FsZS5kb21haW4sXG4gICAgICAgIGJhc2UgPSAxMCxcbiAgICAgICAgbG9ncyA9IGxvZ3AoMTApLFxuICAgICAgICBwb3dzID0gcG93cCgxMCk7XG5cbiAgICBmdW5jdGlvbiByZXNjYWxlKCkge1xuICAgICAgbG9ncyA9IGxvZ3AoYmFzZSksIHBvd3MgPSBwb3dwKGJhc2UpO1xuICAgICAgaWYgKGRvbWFpbigpWzBdIDwgMCkgbG9ncyA9IHJlZmxlY3QobG9ncyksIHBvd3MgPSByZWZsZWN0KHBvd3MpO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH1cblxuICAgIHNjYWxlLmJhc2UgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChiYXNlID0gK18sIHJlc2NhbGUoKSkgOiBiYXNlO1xuICAgIH07XG5cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4oXyksIHJlc2NhbGUoKSkgOiBkb21haW4oKTtcbiAgICB9O1xuXG4gICAgc2NhbGUudGlja3MgPSBmdW5jdGlvbihjb3VudCkge1xuICAgICAgdmFyIGQgPSBkb21haW4oKSxcbiAgICAgICAgICB1ID0gZFswXSxcbiAgICAgICAgICB2ID0gZFtkLmxlbmd0aCAtIDFdLFxuICAgICAgICAgIHI7XG5cbiAgICAgIGlmIChyID0gdiA8IHUpIGkgPSB1LCB1ID0gdiwgdiA9IGk7XG5cbiAgICAgIHZhciBpID0gbG9ncyh1KSxcbiAgICAgICAgICBqID0gbG9ncyh2KSxcbiAgICAgICAgICBwLFxuICAgICAgICAgIGssXG4gICAgICAgICAgdCxcbiAgICAgICAgICBuID0gY291bnQgPT0gbnVsbCA/IDEwIDogK2NvdW50LFxuICAgICAgICAgIHogPSBbXTtcblxuICAgICAgaWYgKCEoYmFzZSAlIDEpICYmIGogLSBpIDwgbikge1xuICAgICAgICBpID0gTWF0aC5yb3VuZChpKSAtIDEsIGogPSBNYXRoLnJvdW5kKGopICsgMTtcbiAgICAgICAgaWYgKHUgPiAwKSBmb3IgKDsgaSA8IGo7ICsraSkge1xuICAgICAgICAgIGZvciAoayA9IDEsIHAgPSBwb3dzKGkpOyBrIDwgYmFzZTsgKytrKSB7XG4gICAgICAgICAgICB0ID0gcCAqIGs7XG4gICAgICAgICAgICBpZiAodCA8IHUpIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKHQgPiB2KSBicmVhaztcbiAgICAgICAgICAgIHoucHVzaCh0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBmb3IgKDsgaSA8IGo7ICsraSkge1xuICAgICAgICAgIGZvciAoayA9IGJhc2UgLSAxLCBwID0gcG93cyhpKTsgayA+PSAxOyAtLWspIHtcbiAgICAgICAgICAgIHQgPSBwICogaztcbiAgICAgICAgICAgIGlmICh0IDwgdSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAodCA+IHYpIGJyZWFrO1xuICAgICAgICAgICAgei5wdXNoKHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgeiA9IGQzQXJyYXkudGlja3MoaSwgaiwgTWF0aC5taW4oaiAtIGksIG4pKS5tYXAocG93cyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByID8gei5yZXZlcnNlKCkgOiB6O1xuICAgIH07XG5cbiAgICBzY2FsZS50aWNrRm9ybWF0ID0gZnVuY3Rpb24oY291bnQsIHNwZWNpZmllcikge1xuICAgICAgaWYgKHNwZWNpZmllciA9PSBudWxsKSBzcGVjaWZpZXIgPSBiYXNlID09PSAxMCA/IFwiLjBlXCIgOiBcIixcIjtcbiAgICAgIGlmICh0eXBlb2Ygc3BlY2lmaWVyICE9PSBcImZ1bmN0aW9uXCIpIHNwZWNpZmllciA9IGQzRm9ybWF0LmZvcm1hdChzcGVjaWZpZXIpO1xuICAgICAgaWYgKGNvdW50ID09PSBJbmZpbml0eSkgcmV0dXJuIHNwZWNpZmllcjtcbiAgICAgIGlmIChjb3VudCA9PSBudWxsKSBjb3VudCA9IDEwO1xuICAgICAgdmFyIGsgPSBNYXRoLm1heCgxLCBiYXNlICogY291bnQgLyBzY2FsZS50aWNrcygpLmxlbmd0aCk7IC8vIFRPRE8gZmFzdCBlc3RpbWF0ZT9cbiAgICAgIHJldHVybiBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBpID0gZCAvIHBvd3MoTWF0aC5yb3VuZChsb2dzKGQpKSk7XG4gICAgICAgIGlmIChpICogYmFzZSA8IGJhc2UgLSAwLjUpIGkgKj0gYmFzZTtcbiAgICAgICAgcmV0dXJuIGkgPD0gayA/IHNwZWNpZmllcihkKSA6IFwiXCI7XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBzY2FsZS5uaWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZG9tYWluKG5pY2UoZG9tYWluKCksIHtcbiAgICAgICAgZmxvb3I6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBvd3MoTWF0aC5mbG9vcihsb2dzKHgpKSk7IH0sXG4gICAgICAgIGNlaWw6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBvd3MoTWF0aC5jZWlsKGxvZ3MoeCkpKTsgfVxuICAgICAgfSkpO1xuICAgIH07XG5cbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gY29weShzY2FsZSwgbG9nKCkuYmFzZShiYXNlKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBzY2FsZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJhaXNlKHgsIGV4cG9uZW50KSB7XG4gICAgcmV0dXJuIHggPCAwID8gLU1hdGgucG93KC14LCBleHBvbmVudCkgOiBNYXRoLnBvdyh4LCBleHBvbmVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBwb3coKSB7XG4gICAgdmFyIGV4cG9uZW50ID0gMSxcbiAgICAgICAgc2NhbGUgPSBjb250aW51b3VzKGRlaW50ZXJwb2xhdGUsIHJlaW50ZXJwb2xhdGUpLFxuICAgICAgICBkb21haW4gPSBzY2FsZS5kb21haW47XG5cbiAgICBmdW5jdGlvbiBkZWludGVycG9sYXRlKGEsIGIpIHtcbiAgICAgIHJldHVybiAoYiA9IHJhaXNlKGIsIGV4cG9uZW50KSAtIChhID0gcmFpc2UoYSwgZXhwb25lbnQpKSlcbiAgICAgICAgICA/IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChyYWlzZSh4LCBleHBvbmVudCkgLSBhKSAvIGI7IH1cbiAgICAgICAgICA6IGNvbnN0YW50KGIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlaW50ZXJwb2xhdGUoYSwgYikge1xuICAgICAgYiA9IHJhaXNlKGIsIGV4cG9uZW50KSAtIChhID0gcmFpc2UoYSwgZXhwb25lbnQpKTtcbiAgICAgIHJldHVybiBmdW5jdGlvbih0KSB7IHJldHVybiByYWlzZShhICsgYiAqIHQsIDEgLyBleHBvbmVudCk7IH07XG4gICAgfVxuXG4gICAgc2NhbGUuZXhwb25lbnQgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChleHBvbmVudCA9ICtfLCBkb21haW4oZG9tYWluKCkpKSA6IGV4cG9uZW50O1xuICAgIH07XG5cbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gY29weShzY2FsZSwgcG93KCkuZXhwb25lbnQoZXhwb25lbnQpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGxpbmVhcmlzaChzY2FsZSk7XG4gIH1cblxuICBmdW5jdGlvbiBzcXJ0KCkge1xuICAgIHJldHVybiBwb3coKS5leHBvbmVudCgwLjUpO1xuICB9XG5cbiAgZnVuY3Rpb24gcXVhbnRpbGUkMSgpIHtcbiAgICB2YXIgZG9tYWluID0gW10sXG4gICAgICAgIHJhbmdlID0gW10sXG4gICAgICAgIHRocmVzaG9sZHMgPSBbXTtcblxuICAgIGZ1bmN0aW9uIHJlc2NhbGUoKSB7XG4gICAgICB2YXIgaSA9IDAsIG4gPSBNYXRoLm1heCgxLCByYW5nZS5sZW5ndGgpO1xuICAgICAgdGhyZXNob2xkcyA9IG5ldyBBcnJheShuIC0gMSk7XG4gICAgICB3aGlsZSAoKytpIDwgbikgdGhyZXNob2xkc1tpIC0gMV0gPSBkM0FycmF5LnF1YW50aWxlKGRvbWFpbiwgaSAvIG4pO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjYWxlKHgpIHtcbiAgICAgIGlmICghaXNOYU4oeCA9ICt4KSkgcmV0dXJuIHJhbmdlW2QzQXJyYXkuYmlzZWN0KHRocmVzaG9sZHMsIHgpXTtcbiAgICB9XG5cbiAgICBzY2FsZS5pbnZlcnRFeHRlbnQgPSBmdW5jdGlvbih5KSB7XG4gICAgICB2YXIgaSA9IHJhbmdlLmluZGV4T2YoeSk7XG4gICAgICByZXR1cm4gaSA8IDAgPyBbTmFOLCBOYU5dIDogW1xuICAgICAgICBpID4gMCA/IHRocmVzaG9sZHNbaSAtIDFdIDogZG9tYWluWzBdLFxuICAgICAgICBpIDwgdGhyZXNob2xkcy5sZW5ndGggPyB0aHJlc2hvbGRzW2ldIDogZG9tYWluW2RvbWFpbi5sZW5ndGggLSAxXVxuICAgICAgXTtcbiAgICB9O1xuXG4gICAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZG9tYWluLnNsaWNlKCk7XG4gICAgICBkb21haW4gPSBbXTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gXy5sZW5ndGgsIGQ7IGkgPCBuOyArK2kpIGlmIChkID0gX1tpXSwgZCAhPSBudWxsICYmICFpc05hTihkID0gK2QpKSBkb21haW4ucHVzaChkKTtcbiAgICAgIGRvbWFpbi5zb3J0KGQzQXJyYXkuYXNjZW5kaW5nKTtcbiAgICAgIHJldHVybiByZXNjYWxlKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBzbGljZS5jYWxsKF8pLCByZXNjYWxlKCkpIDogcmFuZ2Uuc2xpY2UoKTtcbiAgICB9O1xuXG4gICAgc2NhbGUucXVhbnRpbGVzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhyZXNob2xkcy5zbGljZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcXVhbnRpbGUkMSgpXG4gICAgICAgICAgLmRvbWFpbihkb21haW4pXG4gICAgICAgICAgLnJhbmdlKHJhbmdlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9XG5cbiAgZnVuY3Rpb24gcXVhbnRpemUoKSB7XG4gICAgdmFyIHgwID0gMCxcbiAgICAgICAgeDEgPSAxLFxuICAgICAgICBuID0gMSxcbiAgICAgICAgZG9tYWluID0gWzAuNV0sXG4gICAgICAgIHJhbmdlID0gWzAsIDFdO1xuXG4gICAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgICAgaWYgKHggPD0geCkgcmV0dXJuIHJhbmdlW2QzQXJyYXkuYmlzZWN0KGRvbWFpbiwgeCwgMCwgbildO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2NhbGUoKSB7XG4gICAgICB2YXIgaSA9IC0xO1xuICAgICAgZG9tYWluID0gbmV3IEFycmF5KG4pO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGRvbWFpbltpXSA9ICgoaSArIDEpICogeDEgLSAoaSAtIG4pICogeDApIC8gKG4gKyAxKTtcbiAgICAgIHJldHVybiBzY2FsZTtcbiAgICB9XG5cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh4MCA9ICtfWzBdLCB4MSA9ICtfWzFdLCByZXNjYWxlKCkpIDogW3gwLCB4MV07XG4gICAgfTtcblxuICAgIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAobiA9IChyYW5nZSA9IHNsaWNlLmNhbGwoXykpLmxlbmd0aCAtIDEsIHJlc2NhbGUoKSkgOiByYW5nZS5zbGljZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS5pbnZlcnRFeHRlbnQgPSBmdW5jdGlvbih5KSB7XG4gICAgICB2YXIgaSA9IHJhbmdlLmluZGV4T2YoeSk7XG4gICAgICByZXR1cm4gaSA8IDAgPyBbTmFOLCBOYU5dXG4gICAgICAgICAgOiBpIDwgMSA/IFt4MCwgZG9tYWluWzBdXVxuICAgICAgICAgIDogaSA+PSBuID8gW2RvbWFpbltuIC0gMV0sIHgxXVxuICAgICAgICAgIDogW2RvbWFpbltpIC0gMV0sIGRvbWFpbltpXV07XG4gICAgfTtcblxuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBxdWFudGl6ZSgpXG4gICAgICAgICAgLmRvbWFpbihbeDAsIHgxXSlcbiAgICAgICAgICAucmFuZ2UocmFuZ2UpO1xuICAgIH07XG5cbiAgICByZXR1cm4gbGluZWFyaXNoKHNjYWxlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRocmVzaG9sZCgpIHtcbiAgICB2YXIgZG9tYWluID0gWzAuNV0sXG4gICAgICAgIHJhbmdlID0gWzAsIDFdLFxuICAgICAgICBuID0gMTtcblxuICAgIGZ1bmN0aW9uIHNjYWxlKHgpIHtcbiAgICAgIGlmICh4IDw9IHgpIHJldHVybiByYW5nZVtkM0FycmF5LmJpc2VjdChkb21haW4sIHgsIDAsIG4pXTtcbiAgICB9XG5cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4gPSBzbGljZS5jYWxsKF8pLCBuID0gTWF0aC5taW4oZG9tYWluLmxlbmd0aCwgcmFuZ2UubGVuZ3RoIC0gMSksIHNjYWxlKSA6IGRvbWFpbi5zbGljZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJhbmdlID0gc2xpY2UuY2FsbChfKSwgbiA9IE1hdGgubWluKGRvbWFpbi5sZW5ndGgsIHJhbmdlLmxlbmd0aCAtIDEpLCBzY2FsZSkgOiByYW5nZS5zbGljZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS5pbnZlcnRFeHRlbnQgPSBmdW5jdGlvbih5KSB7XG4gICAgICB2YXIgaSA9IHJhbmdlLmluZGV4T2YoeSk7XG4gICAgICByZXR1cm4gW2RvbWFpbltpIC0gMV0sIGRvbWFpbltpXV07XG4gICAgfTtcblxuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aHJlc2hvbGQoKVxuICAgICAgICAgIC5kb21haW4oZG9tYWluKVxuICAgICAgICAgIC5yYW5nZShyYW5nZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBzY2FsZTtcbiAgfVxuXG4gIHZhciBkdXJhdGlvblNlY29uZCA9IDEwMDA7XG4gIHZhciBkdXJhdGlvbk1pbnV0ZSA9IGR1cmF0aW9uU2Vjb25kICogNjA7XG4gIHZhciBkdXJhdGlvbkhvdXIgPSBkdXJhdGlvbk1pbnV0ZSAqIDYwO1xuICB2YXIgZHVyYXRpb25EYXkgPSBkdXJhdGlvbkhvdXIgKiAyNDtcbiAgdmFyIGR1cmF0aW9uV2VlayA9IGR1cmF0aW9uRGF5ICogNztcbiAgdmFyIGR1cmF0aW9uTW9udGggPSBkdXJhdGlvbkRheSAqIDMwO1xuICB2YXIgZHVyYXRpb25ZZWFyID0gZHVyYXRpb25EYXkgKiAzNjU7XG4gIGZ1bmN0aW9uIGRhdGUodCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSh0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG51bWJlciQxKHQpIHtcbiAgICByZXR1cm4gdCBpbnN0YW5jZW9mIERhdGUgPyArdCA6ICtuZXcgRGF0ZSgrdCk7XG4gIH1cblxuICBmdW5jdGlvbiBjYWxlbmRhcih5ZWFyLCBtb250aCwgd2VlaywgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCwgbWlsbGlzZWNvbmQsIGZvcm1hdCkge1xuICAgIHZhciBzY2FsZSA9IGNvbnRpbnVvdXMoZGVpbnRlcnBvbGF0ZSwgZDNJbnRlcnBvbGF0ZS5pbnRlcnBvbGF0ZU51bWJlciksXG4gICAgICAgIGludmVydCA9IHNjYWxlLmludmVydCxcbiAgICAgICAgZG9tYWluID0gc2NhbGUuZG9tYWluO1xuXG4gICAgdmFyIGZvcm1hdE1pbGxpc2Vjb25kID0gZm9ybWF0KFwiLiVMXCIpLFxuICAgICAgICBmb3JtYXRTZWNvbmQgPSBmb3JtYXQoXCI6JVNcIiksXG4gICAgICAgIGZvcm1hdE1pbnV0ZSA9IGZvcm1hdChcIiVJOiVNXCIpLFxuICAgICAgICBmb3JtYXRIb3VyID0gZm9ybWF0KFwiJUkgJXBcIiksXG4gICAgICAgIGZvcm1hdERheSA9IGZvcm1hdChcIiVhICVkXCIpLFxuICAgICAgICBmb3JtYXRXZWVrID0gZm9ybWF0KFwiJWIgJWRcIiksXG4gICAgICAgIGZvcm1hdE1vbnRoID0gZm9ybWF0KFwiJUJcIiksXG4gICAgICAgIGZvcm1hdFllYXIgPSBmb3JtYXQoXCIlWVwiKTtcblxuICAgIHZhciB0aWNrSW50ZXJ2YWxzID0gW1xuICAgICAgW3NlY29uZCwgIDEsICAgICAgZHVyYXRpb25TZWNvbmRdLFxuICAgICAgW3NlY29uZCwgIDUsICA1ICogZHVyYXRpb25TZWNvbmRdLFxuICAgICAgW3NlY29uZCwgMTUsIDE1ICogZHVyYXRpb25TZWNvbmRdLFxuICAgICAgW3NlY29uZCwgMzAsIDMwICogZHVyYXRpb25TZWNvbmRdLFxuICAgICAgW21pbnV0ZSwgIDEsICAgICAgZHVyYXRpb25NaW51dGVdLFxuICAgICAgW21pbnV0ZSwgIDUsICA1ICogZHVyYXRpb25NaW51dGVdLFxuICAgICAgW21pbnV0ZSwgMTUsIDE1ICogZHVyYXRpb25NaW51dGVdLFxuICAgICAgW21pbnV0ZSwgMzAsIDMwICogZHVyYXRpb25NaW51dGVdLFxuICAgICAgWyAgaG91ciwgIDEsICAgICAgZHVyYXRpb25Ib3VyICBdLFxuICAgICAgWyAgaG91ciwgIDMsICAzICogZHVyYXRpb25Ib3VyICBdLFxuICAgICAgWyAgaG91ciwgIDYsICA2ICogZHVyYXRpb25Ib3VyICBdLFxuICAgICAgWyAgaG91ciwgMTIsIDEyICogZHVyYXRpb25Ib3VyICBdLFxuICAgICAgWyAgIGRheSwgIDEsICAgICAgZHVyYXRpb25EYXkgICBdLFxuICAgICAgWyAgIGRheSwgIDIsICAyICogZHVyYXRpb25EYXkgICBdLFxuICAgICAgWyAgd2VlaywgIDEsICAgICAgZHVyYXRpb25XZWVrICBdLFxuICAgICAgWyBtb250aCwgIDEsICAgICAgZHVyYXRpb25Nb250aCBdLFxuICAgICAgWyBtb250aCwgIDMsICAzICogZHVyYXRpb25Nb250aCBdLFxuICAgICAgWyAgeWVhciwgIDEsICAgICAgZHVyYXRpb25ZZWFyICBdXG4gICAgXTtcblxuICAgIGZ1bmN0aW9uIHRpY2tGb3JtYXQoZGF0ZSkge1xuICAgICAgcmV0dXJuIChzZWNvbmQoZGF0ZSkgPCBkYXRlID8gZm9ybWF0TWlsbGlzZWNvbmRcbiAgICAgICAgICA6IG1pbnV0ZShkYXRlKSA8IGRhdGUgPyBmb3JtYXRTZWNvbmRcbiAgICAgICAgICA6IGhvdXIoZGF0ZSkgPCBkYXRlID8gZm9ybWF0TWludXRlXG4gICAgICAgICAgOiBkYXkoZGF0ZSkgPCBkYXRlID8gZm9ybWF0SG91clxuICAgICAgICAgIDogbW9udGgoZGF0ZSkgPCBkYXRlID8gKHdlZWsoZGF0ZSkgPCBkYXRlID8gZm9ybWF0RGF5IDogZm9ybWF0V2VlaylcbiAgICAgICAgICA6IHllYXIoZGF0ZSkgPCBkYXRlID8gZm9ybWF0TW9udGhcbiAgICAgICAgICA6IGZvcm1hdFllYXIpKGRhdGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRpY2tJbnRlcnZhbChpbnRlcnZhbCwgc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICAgIGlmIChpbnRlcnZhbCA9PSBudWxsKSBpbnRlcnZhbCA9IDEwO1xuXG4gICAgICAvLyBJZiBhIGRlc2lyZWQgdGljayBjb3VudCBpcyBzcGVjaWZpZWQsIHBpY2sgYSByZWFzb25hYmxlIHRpY2sgaW50ZXJ2YWxcbiAgICAgIC8vIGJhc2VkIG9uIHRoZSBleHRlbnQgb2YgdGhlIGRvbWFpbiBhbmQgYSByb3VnaCBlc3RpbWF0ZSBvZiB0aWNrIHNpemUuXG4gICAgICAvLyBPdGhlcndpc2UsIGFzc3VtZSBpbnRlcnZhbCBpcyBhbHJlYWR5IGEgdGltZSBpbnRlcnZhbCBhbmQgdXNlIGl0LlxuICAgICAgaWYgKHR5cGVvZiBpbnRlcnZhbCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gTWF0aC5hYnMoc3RvcCAtIHN0YXJ0KSAvIGludGVydmFsLFxuICAgICAgICAgICAgaSA9IGQzQXJyYXkuYmlzZWN0b3IoZnVuY3Rpb24oaSkgeyByZXR1cm4gaVsyXTsgfSkucmlnaHQodGlja0ludGVydmFscywgdGFyZ2V0KTtcbiAgICAgICAgaWYgKGkgPT09IHRpY2tJbnRlcnZhbHMubGVuZ3RoKSB7XG4gICAgICAgICAgc3RlcCA9IGQzQXJyYXkudGlja1N0ZXAoc3RhcnQgLyBkdXJhdGlvblllYXIsIHN0b3AgLyBkdXJhdGlvblllYXIsIGludGVydmFsKTtcbiAgICAgICAgICBpbnRlcnZhbCA9IHllYXI7XG4gICAgICAgIH0gZWxzZSBpZiAoaSkge1xuICAgICAgICAgIGkgPSB0aWNrSW50ZXJ2YWxzW3RhcmdldCAvIHRpY2tJbnRlcnZhbHNbaSAtIDFdWzJdIDwgdGlja0ludGVydmFsc1tpXVsyXSAvIHRhcmdldCA/IGkgLSAxIDogaV07XG4gICAgICAgICAgc3RlcCA9IGlbMV07XG4gICAgICAgICAgaW50ZXJ2YWwgPSBpWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ZXAgPSBkM0FycmF5LnRpY2tTdGVwKHN0YXJ0LCBzdG9wLCBpbnRlcnZhbCk7XG4gICAgICAgICAgaW50ZXJ2YWwgPSBtaWxsaXNlY29uZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3RlcCA9PSBudWxsID8gaW50ZXJ2YWwgOiBpbnRlcnZhbC5ldmVyeShzdGVwKTtcbiAgICB9XG5cbiAgICBzY2FsZS5pbnZlcnQgPSBmdW5jdGlvbih5KSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoaW52ZXJ0KHkpKTtcbiAgICB9O1xuXG4gICAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyBkb21haW4obWFwJDEuY2FsbChfLCBudW1iZXIkMSkpIDogZG9tYWluKCkubWFwKGRhdGUpO1xuICAgIH07XG5cbiAgICBzY2FsZS50aWNrcyA9IGZ1bmN0aW9uKGludGVydmFsLCBzdGVwKSB7XG4gICAgICB2YXIgZCA9IGRvbWFpbigpLFxuICAgICAgICAgIHQwID0gZFswXSxcbiAgICAgICAgICB0MSA9IGRbZC5sZW5ndGggLSAxXSxcbiAgICAgICAgICByID0gdDEgPCB0MCxcbiAgICAgICAgICB0O1xuICAgICAgaWYgKHIpIHQgPSB0MCwgdDAgPSB0MSwgdDEgPSB0O1xuICAgICAgdCA9IHRpY2tJbnRlcnZhbChpbnRlcnZhbCwgdDAsIHQxLCBzdGVwKTtcbiAgICAgIHQgPSB0ID8gdC5yYW5nZSh0MCwgdDEgKyAxKSA6IFtdOyAvLyBpbmNsdXNpdmUgc3RvcFxuICAgICAgcmV0dXJuIHIgPyB0LnJldmVyc2UoKSA6IHQ7XG4gICAgfTtcblxuICAgIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihjb3VudCwgc3BlY2lmaWVyKSB7XG4gICAgICByZXR1cm4gc3BlY2lmaWVyID09IG51bGwgPyB0aWNrRm9ybWF0IDogZm9ybWF0KHNwZWNpZmllcik7XG4gICAgfTtcblxuICAgIHNjYWxlLm5pY2UgPSBmdW5jdGlvbihpbnRlcnZhbCwgc3RlcCkge1xuICAgICAgdmFyIGQgPSBkb21haW4oKTtcbiAgICAgIHJldHVybiAoaW50ZXJ2YWwgPSB0aWNrSW50ZXJ2YWwoaW50ZXJ2YWwsIGRbMF0sIGRbZC5sZW5ndGggLSAxXSwgc3RlcCkpXG4gICAgICAgICAgPyBkb21haW4obmljZShkLCBpbnRlcnZhbCkpXG4gICAgICAgICAgOiBzY2FsZTtcbiAgICB9O1xuXG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNvcHkoc2NhbGUsIGNhbGVuZGFyKHllYXIsIG1vbnRoLCB3ZWVrLCBkYXksIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtaWxsaXNlY29uZCwgZm9ybWF0KSk7XG4gICAgfTtcblxuICAgIHJldHVybiBzY2FsZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpbWUoKSB7XG4gICAgcmV0dXJuIGNhbGVuZGFyKGQzVGltZS50aW1lWWVhciwgZDNUaW1lLnRpbWVNb250aCwgZDNUaW1lLnRpbWVXZWVrLCBkM1RpbWUudGltZURheSwgZDNUaW1lLnRpbWVIb3VyLCBkM1RpbWUudGltZU1pbnV0ZSwgZDNUaW1lLnRpbWVTZWNvbmQsIGQzVGltZS50aW1lTWlsbGlzZWNvbmQsIGQzVGltZUZvcm1hdC50aW1lRm9ybWF0KS5kb21haW4oW25ldyBEYXRlKDIwMDAsIDAsIDEpLCBuZXcgRGF0ZSgyMDAwLCAwLCAyKV0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdXRjVGltZSgpIHtcbiAgICByZXR1cm4gY2FsZW5kYXIoZDNUaW1lLnV0Y1llYXIsIGQzVGltZS51dGNNb250aCwgZDNUaW1lLnV0Y1dlZWssIGQzVGltZS51dGNEYXksIGQzVGltZS51dGNIb3VyLCBkM1RpbWUudXRjTWludXRlLCBkM1RpbWUudXRjU2Vjb25kLCBkM1RpbWUudXRjTWlsbGlzZWNvbmQsIGQzVGltZUZvcm1hdC51dGNGb3JtYXQpLmRvbWFpbihbRGF0ZS5VVEMoMjAwMCwgMCwgMSksIERhdGUuVVRDKDIwMDAsIDAsIDIpXSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb2xvcnMocykge1xuICAgIHJldHVybiBzLm1hdGNoKC8uezZ9L2cpLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gXCIjXCIgKyB4O1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIGNhdGVnb3J5MTAgPSBjb2xvcnMoXCIxZjc3YjRmZjdmMGUyY2EwMmNkNjI3Mjg5NDY3YmQ4YzU2NGJlMzc3YzI3ZjdmN2ZiY2JkMjIxN2JlY2ZcIik7XG5cbiAgdmFyIGNhdGVnb3J5MjBiID0gY29sb3JzKFwiMzkzYjc5NTI1NGEzNmI2ZWNmOWM5ZWRlNjM3OTM5OGNhMjUyYjVjZjZiY2VkYjljOGM2ZDMxYmQ5ZTM5ZTdiYTUyZTdjYjk0ODQzYzM5YWQ0OTRhZDY2MTZiZTc5NjljN2I0MTczYTU1MTk0Y2U2ZGJkZGU5ZWQ2XCIpO1xuXG4gIHZhciBjYXRlZ29yeTIwYyA9IGNvbG9ycyhcIjMxODJiZDZiYWVkNjllY2FlMWM2ZGJlZmU2NTUwZGZkOGQzY2ZkYWU2YmZkZDBhMjMxYTM1NDc0YzQ3NmExZDk5YmM3ZTljMDc1NmJiMTllOWFjOGJjYmRkY2RhZGFlYjYzNjM2Mzk2OTY5NmJkYmRiZGQ5ZDlkOVwiKTtcblxuICB2YXIgY2F0ZWdvcnkyMCA9IGNvbG9ycyhcIjFmNzdiNGFlYzdlOGZmN2YwZWZmYmI3ODJjYTAyYzk4ZGY4YWQ2MjcyOGZmOTg5Njk0NjdiZGM1YjBkNThjNTY0YmM0OWM5NGUzNzdjMmY3YjZkMjdmN2Y3ZmM3YzdjN2JjYmQyMmRiZGI4ZDE3YmVjZjllZGFlNVwiKTtcblxuICB2YXIgY3ViZWhlbGl4JDEgPSBkM0ludGVycG9sYXRlLmludGVycG9sYXRlQ3ViZWhlbGl4TG9uZyhkM0NvbG9yLmN1YmVoZWxpeCgzMDAsIDAuNSwgMC4wKSwgZDNDb2xvci5jdWJlaGVsaXgoLTI0MCwgMC41LCAxLjApKTtcblxuICB2YXIgd2FybSA9IGQzSW50ZXJwb2xhdGUuaW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nKGQzQ29sb3IuY3ViZWhlbGl4KC0xMDAsIDAuNzUsIDAuMzUpLCBkM0NvbG9yLmN1YmVoZWxpeCg4MCwgMS41MCwgMC44KSk7XG5cbiAgdmFyIGNvb2wgPSBkM0ludGVycG9sYXRlLmludGVycG9sYXRlQ3ViZWhlbGl4TG9uZyhkM0NvbG9yLmN1YmVoZWxpeCgyNjAsIDAuNzUsIDAuMzUpLCBkM0NvbG9yLmN1YmVoZWxpeCg4MCwgMS41MCwgMC44KSk7XG5cbiAgdmFyIHJhaW5ib3cgPSBkM0NvbG9yLmN1YmVoZWxpeCgpO1xuXG4gIGZ1bmN0aW9uIHJhaW5ib3ckMSh0KSB7XG4gICAgaWYgKHQgPCAwIHx8IHQgPiAxKSB0IC09IE1hdGguZmxvb3IodCk7XG4gICAgdmFyIHRzID0gTWF0aC5hYnModCAtIDAuNSk7XG4gICAgcmFpbmJvdy5oID0gMzYwICogdCAtIDEwMDtcbiAgICByYWluYm93LnMgPSAxLjUgLSAxLjUgKiB0cztcbiAgICByYWluYm93LmwgPSAwLjggLSAwLjkgKiB0cztcbiAgICByZXR1cm4gcmFpbmJvdyArIFwiXCI7XG4gIH1cblxuICBmdW5jdGlvbiByYW1wKHJhbmdlKSB7XG4gICAgdmFyIG4gPSByYW5nZS5sZW5ndGg7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiByYW5nZVtNYXRoLm1heCgwLCBNYXRoLm1pbihuIC0gMSwgTWF0aC5mbG9vcih0ICogbikpKV07XG4gICAgfTtcbiAgfVxuXG4gIHZhciB2aXJpZGlzID0gcmFtcChjb2xvcnMoXCI0NDAxNTQ0NDAyNTY0NTA0NTc0NTA1NTk0NjA3NWE0NjA4NWM0NjBhNWQ0NjBiNWU0NzBkNjA0NzBlNjE0NzEwNjM0NzExNjQ0NzEzNjU0ODE0Njc0ODE2Njg0ODE3Njk0ODE4NmE0ODFhNmM0ODFiNmQ0ODFjNmU0ODFkNmY0ODFmNzA0ODIwNzE0ODIxNzM0ODIzNzQ0ODI0NzU0ODI1NzY0ODI2Nzc0ODI4Nzg0ODI5Nzk0NzJhN2E0NzJjN2E0NzJkN2I0NzJlN2M0NzJmN2Q0NjMwN2U0NjMyN2U0NjMzN2Y0NjM0ODA0NTM1ODE0NTM3ODE0NTM4ODI0NDM5ODM0NDNhODM0NDNiODQ0MzNkODQ0MzNlODU0MjNmODU0MjQwODY0MjQxODY0MTQyODc0MTQ0ODc0MDQ1ODg0MDQ2ODgzZjQ3ODgzZjQ4ODkzZTQ5ODkzZTRhODkzZTRjOGEzZDRkOGEzZDRlOGEzYzRmOGEzYzUwOGIzYjUxOGIzYjUyOGIzYTUzOGIzYTU0OGMzOTU1OGMzOTU2OGMzODU4OGMzODU5OGMzNzVhOGMzNzViOGQzNjVjOGQzNjVkOGQzNTVlOGQzNTVmOGQzNDYwOGQzNDYxOGQzMzYyOGQzMzYzOGQzMjY0OGUzMjY1OGUzMTY2OGUzMTY3OGUzMTY4OGUzMDY5OGUzMDZhOGUyZjZiOGUyZjZjOGUyZTZkOGUyZTZlOGUyZTZmOGUyZDcwOGUyZDcxOGUyYzcxOGUyYzcyOGUyYzczOGUyYjc0OGUyYjc1OGUyYTc2OGUyYTc3OGUyYTc4OGUyOTc5OGUyOTdhOGUyOTdiOGUyODdjOGUyODdkOGUyNzdlOGUyNzdmOGUyNzgwOGUyNjgxOGUyNjgyOGUyNjgyOGUyNTgzOGUyNTg0OGUyNTg1OGUyNDg2OGUyNDg3OGUyMzg4OGUyMzg5OGUyMzhhOGQyMjhiOGQyMjhjOGQyMjhkOGQyMThlOGQyMThmOGQyMTkwOGQyMTkxOGMyMDkyOGMyMDkyOGMyMDkzOGMxZjk0OGMxZjk1OGIxZjk2OGIxZjk3OGIxZjk4OGIxZjk5OGExZjlhOGExZTliOGExZTljODkxZTlkODkxZjllODkxZjlmODgxZmEwODgxZmExODgxZmExODcxZmEyODcyMGEzODYyMGE0ODYyMWE1ODUyMWE2ODUyMmE3ODUyMmE4ODQyM2E5ODMyNGFhODMyNWFiODIyNWFjODIyNmFkODEyN2FkODEyOGFlODAyOWFmN2YyYWIwN2YyY2IxN2UyZGIyN2QyZWIzN2MyZmI0N2MzMWI1N2IzMmI2N2EzNGI2NzkzNWI3NzkzN2I4NzgzOGI5NzczYWJhNzYzYmJiNzUzZGJjNzQzZmJjNzM0MGJkNzI0MmJlNzE0NGJmNzA0NmMwNmY0OGMxNmU0YWMxNmQ0Y2MyNmM0ZWMzNmI1MGM0NmE1MmM1Njk1NGM1Njg1NmM2Njc1OGM3NjU1YWM4NjQ1Y2M4NjM1ZWM5NjI2MGNhNjA2M2NiNWY2NWNiNWU2N2NjNWM2OWNkNWI2Y2NkNWE2ZWNlNTg3MGNmNTc3M2QwNTY3NWQwNTQ3N2QxNTM3YWQxNTE3Y2QyNTA3ZmQzNGU4MWQzNGQ4NGQ0NGI4NmQ1NDk4OWQ1NDg4YmQ2NDY4ZWQ2NDU5MGQ3NDM5M2Q3NDE5NWQ4NDA5OGQ4M2U5YmQ5M2M5ZGQ5M2JhMGRhMzlhMmRhMzdhNWRiMzZhOGRiMzRhYWRjMzJhZGRjMzBiMGRkMmZiMmRkMmRiNWRlMmJiOGRlMjliYWRlMjhiZGRmMjZjMGRmMjVjMmRmMjNjNWUwMjFjOGUwMjBjYWUxMWZjZGUxMWRkMGUxMWNkMmUyMWJkNWUyMWFkOGUyMTlkYWUzMTlkZGUzMThkZmUzMThlMmU0MThlNWU0MTllN2U0MTllYWU1MWFlY2U1MWJlZmU1MWNmMWU1MWRmNGU2MWVmNmU2MjBmOGU2MjFmYmU3MjNmZGU3MjVcIikpO1xuXG4gIHZhciBtYWdtYSA9IHJhbXAoY29sb3JzKFwiMDAwMDA0MDEwMDA1MDEwMTA2MDEwMTA4MDIwMTA5MDIwMjBiMDIwMjBkMDMwMzBmMDMwMzEyMDQwNDE0MDUwNDE2MDYwNTE4MDYwNTFhMDcwNjFjMDgwNzFlMDkwNzIwMGEwODIyMGIwOTI0MGMwOTI2MGQwYTI5MGUwYjJiMTAwYjJkMTEwYzJmMTIwZDMxMTMwZDM0MTQwZTM2MTUwZTM4MTYwZjNiMTgwZjNkMTkxMDNmMWExMDQyMWMxMDQ0MWQxMTQ3MWUxMTQ5MjAxMTRiMjExMTRlMjIxMTUwMjQxMjUzMjUxMjU1MjcxMjU4MjkxMTVhMmExMTVjMmMxMTVmMmQxMTYxMmYxMTYzMzExMTY1MzMxMDY3MzQxMDY5MzYxMDZiMzgxMDZjMzkwZjZlM2IwZjcwM2QwZjcxM2YwZjcyNDAwZjc0NDIwZjc1NDQwZjc2NDUxMDc3NDcxMDc4NDkxMDc4NGExMDc5NGMxMTdhNGUxMTdiNGYxMjdiNTExMjdjNTIxMzdjNTQxMzdkNTYxNDdkNTcxNTdlNTkxNTdlNWExNjdlNWMxNjdmNWQxNzdmNWYxODdmNjAxODgwNjIxOTgwNjQxYTgwNjUxYTgwNjcxYjgwNjgxYzgxNmExYzgxNmIxZDgxNmQxZDgxNmUxZTgxNzAxZjgxNzIxZjgxNzMyMDgxNzUyMTgxNzYyMTgxNzgyMjgxNzkyMjgyN2IyMzgyN2MyMzgyN2UyNDgyODAyNTgyODEyNTgxODMyNjgxODQyNjgxODYyNzgxODgyNzgxODkyODgxOGIyOTgxOGMyOTgxOGUyYTgxOTAyYTgxOTEyYjgxOTMyYjgwOTQyYzgwOTYyYzgwOTgyZDgwOTkyZDgwOWIyZTdmOWMyZTdmOWUyZjdmYTAyZjdmYTEzMDdlYTMzMDdlYTUzMTdlYTYzMTdkYTgzMjdkYWEzMzdkYWIzMzdjYWQzNDdjYWUzNDdiYjAzNTdiYjIzNTdiYjMzNjdhYjUzNjdhYjczNzc5YjgzNzc5YmEzODc4YmMzOTc4YmQzOTc3YmYzYTc3YzAzYTc2YzIzYjc1YzQzYzc1YzUzYzc0YzczZDczYzgzZTczY2EzZTcyY2MzZjcxY2Q0MDcxY2Y0MDcwZDA0MTZmZDI0MjZmZDM0MzZlZDU0NDZkZDY0NTZjZDg0NTZjZDk0NjZiZGI0NzZhZGM0ODY5ZGU0OTY4ZGY0YTY4ZTA0YzY3ZTI0ZDY2ZTM0ZTY1ZTQ0ZjY0ZTU1MDY0ZTc1MjYzZTg1MzYyZTk1NDYyZWE1NjYxZWI1NzYwZWM1ODYwZWQ1YTVmZWU1YjVlZWY1ZDVlZjA1ZjVlZjE2MDVkZjI2MjVkZjI2NDVjZjM2NTVjZjQ2NzVjZjQ2OTVjZjU2YjVjZjY2YzVjZjY2ZTVjZjc3MDVjZjc3MjVjZjg3NDVjZjg3NjVjZjk3ODVkZjk3OTVkZjk3YjVkZmE3ZDVlZmE3ZjVlZmE4MTVmZmI4MzVmZmI4NTYwZmI4NzYxZmM4OTYxZmM4YTYyZmM4YzYzZmM4ZTY0ZmM5MDY1ZmQ5MjY2ZmQ5NDY3ZmQ5NjY4ZmQ5ODY5ZmQ5YTZhZmQ5YjZiZmU5ZDZjZmU5ZjZkZmVhMTZlZmVhMzZmZmVhNTcxZmVhNzcyZmVhOTczZmVhYTc0ZmVhYzc2ZmVhZTc3ZmViMDc4ZmViMjdhZmViNDdiZmViNjdjZmViNzdlZmViOTdmZmViYjgxZmViZDgyZmViZjg0ZmVjMTg1ZmVjMjg3ZmVjNDg4ZmVjNjhhZmVjODhjZmVjYThkZmVjYzhmZmVjZDkwZmVjZjkyZmVkMTk0ZmVkMzk1ZmVkNTk3ZmVkNzk5ZmVkODlhZmRkYTljZmRkYzllZmRkZWEwZmRlMGExZmRlMmEzZmRlM2E1ZmRlNWE3ZmRlN2E5ZmRlOWFhZmRlYmFjZmNlY2FlZmNlZWIwZmNmMGIyZmNmMmI0ZmNmNGI2ZmNmNmI4ZmNmN2I5ZmNmOWJiZmNmYmJkZmNmZGJmXCIpKTtcblxuICB2YXIgaW5mZXJubyA9IHJhbXAoY29sb3JzKFwiMDAwMDA0MDEwMDA1MDEwMTA2MDEwMTA4MDIwMTBhMDIwMjBjMDIwMjBlMDMwMjEwMDQwMzEyMDQwMzE0MDUwNDE3MDYwNDE5MDcwNTFiMDgwNTFkMDkwNjFmMGEwNzIyMGIwNzI0MGMwODI2MGQwODI5MGUwOTJiMTAwOTJkMTEwYTMwMTIwYTMyMTQwYjM0MTUwYjM3MTYwYjM5MTgwYzNjMTkwYzNlMWIwYzQxMWMwYzQzMWUwYzQ1MWYwYzQ4MjEwYzRhMjMwYzRjMjQwYzRmMjYwYzUxMjgwYjUzMjkwYjU1MmIwYjU3MmQwYjU5MmYwYTViMzEwYTVjMzIwYTVlMzQwYTVmMzYwOTYxMzgwOTYyMzkwOTYzM2IwOTY0M2QwOTY1M2UwOTY2NDAwYTY3NDIwYTY4NDQwYTY4NDUwYTY5NDcwYjZhNDkwYjZhNGEwYzZiNGMwYzZiNGQwZDZjNGYwZDZjNTEwZTZjNTIwZTZkNTQwZjZkNTUwZjZkNTcxMDZlNTkxMDZlNWExMTZlNWMxMjZlNWQxMjZlNWYxMzZlNjExMzZlNjIxNDZlNjQxNTZlNjUxNTZlNjcxNjZlNjkxNjZlNmExNzZlNmMxODZlNmQxODZlNmYxOTZlNzExOTZlNzIxYTZlNzQxYTZlNzUxYjZlNzcxYzZkNzgxYzZkN2ExZDZkN2MxZDZkN2QxZTZkN2YxZTZjODAxZjZjODIyMDZjODQyMDZiODUyMTZiODcyMTZiODgyMjZhOGEyMjZhOGMyMzY5OGQyMzY5OGYyNDY5OTAyNTY4OTIyNTY4OTMyNjY3OTUyNjY3OTcyNzY2OTgyNzY2OWEyODY1OWIyOTY0OWQyOTY0OWYyYTYzYTAyYTYzYTIyYjYyYTMyYzYxYTUyYzYwYTYyZDYwYTgyZTVmYTkyZTVlYWIyZjVlYWQzMDVkYWUzMDVjYjAzMTViYjEzMjVhYjMzMjVhYjQzMzU5YjYzNDU4YjczNTU3YjkzNTU2YmEzNjU1YmMzNzU0YmQzODUzYmYzOTUyYzAzYTUxYzEzYTUwYzMzYjRmYzQzYzRlYzYzZDRkYzczZTRjYzgzZjRiY2E0MDRhY2I0MTQ5Y2M0MjQ4Y2U0MzQ3Y2Y0NDQ2ZDA0NTQ1ZDI0NjQ0ZDM0NzQzZDQ0ODQyZDU0YTQxZDc0YjNmZDg0YzNlZDk0ZDNkZGE0ZTNjZGI1MDNiZGQ1MTNhZGU1MjM4ZGY1MzM3ZTA1NTM2ZTE1NjM1ZTI1NzM0ZTM1OTMzZTQ1YTMxZTU1YzMwZTY1ZDJmZTc1ZTJlZTg2MDJkZTk2MTJiZWE2MzJhZWI2NDI5ZWI2NjI4ZWM2NzI2ZWQ2OTI1ZWU2YTI0ZWY2YzIzZWY2ZTIxZjA2ZjIwZjE3MTFmZjE3MzFkZjI3NDFjZjM3NjFiZjM3ODE5ZjQ3OTE4ZjU3YjE3ZjU3ZDE1ZjY3ZTE0ZjY4MDEzZjc4MjEyZjc4NDEwZjg4NTBmZjg4NzBlZjg4OTBjZjk4YjBiZjk4YzBhZjk4ZTA5ZmE5MDA4ZmE5MjA3ZmE5NDA3ZmI5NjA2ZmI5NzA2ZmI5OTA2ZmI5YjA2ZmI5ZDA3ZmM5ZjA3ZmNhMTA4ZmNhMzA5ZmNhNTBhZmNhNjBjZmNhODBkZmNhYTBmZmNhYzExZmNhZTEyZmNiMDE0ZmNiMjE2ZmNiNDE4ZmJiNjFhZmJiODFkZmJiYTFmZmJiYzIxZmJiZTIzZmFjMDI2ZmFjMjI4ZmFjNDJhZmFjNjJkZjljNzJmZjljOTMyZjljYjM1ZjhjZDM3ZjhjZjNhZjdkMTNkZjdkMzQwZjZkNTQzZjZkNzQ2ZjVkOTQ5ZjVkYjRjZjRkZDRmZjRkZjUzZjRlMTU2ZjNlMzVhZjNlNTVkZjJlNjYxZjJlODY1ZjJlYTY5ZjFlYzZkZjFlZDcxZjFlZjc1ZjFmMTc5ZjJmMjdkZjJmNDgyZjNmNTg2ZjNmNjhhZjRmODhlZjVmOTkyZjZmYTk2ZjhmYjlhZjlmYzlkZmFmZGExZmNmZmE0XCIpKTtcblxuICB2YXIgcGxhc21hID0gcmFtcChjb2xvcnMoXCIwZDA4ODcxMDA3ODgxMzA3ODkxNjA3OGExOTA2OGMxYjA2OGQxZDA2OGUyMDA2OGYyMjA2OTAyNDA2OTEyNjA1OTEyODA1OTIyYTA1OTMyYzA1OTQyZTA1OTUyZjA1OTYzMTA1OTczMzA1OTczNTA0OTgzNzA0OTkzODA0OWEzYTA0OWEzYzA0OWIzZTA0OWMzZjA0OWM0MTA0OWQ0MzAzOWU0NDAzOWU0NjAzOWY0ODAzOWY0OTAzYTA0YjAzYTE0YzAyYTE0ZTAyYTI1MDAyYTI1MTAyYTM1MzAyYTM1NTAyYTQ1NjAxYTQ1ODAxYTQ1OTAxYTU1YjAxYTU1YzAxYTY1ZTAxYTY2MDAxYTY2MTAwYTc2MzAwYTc2NDAwYTc2NjAwYTc2NzAwYTg2OTAwYTg2YTAwYTg2YzAwYTg2ZTAwYTg2ZjAwYTg3MTAwYTg3MjAxYTg3NDAxYTg3NTAxYTg3NzAxYTg3ODAxYTg3YTAyYTg3YjAyYTg3ZDAzYTg3ZTAzYTg4MDA0YTg4MTA0YTc4MzA1YTc4NDA1YTc4NjA2YTY4NzA3YTY4ODA4YTY4YTA5YTU4YjBhYTU4ZDBiYTU4ZTBjYTQ4ZjBkYTQ5MTBlYTM5MjBmYTM5NDEwYTI5NTExYTE5NjEzYTE5ODE0YTA5OTE1OWY5YTE2OWY5YzE3OWU5ZDE4OWQ5ZTE5OWRhMDFhOWNhMTFiOWJhMjFkOWFhMzFlOWFhNTFmOTlhNjIwOThhNzIxOTdhODIyOTZhYTIzOTVhYjI0OTRhYzI2OTRhZDI3OTNhZTI4OTJiMDI5OTFiMTJhOTBiMjJiOGZiMzJjOGViNDJlOGRiNTJmOGNiNjMwOGJiNzMxOGFiODMyODliYTMzODhiYjM0ODhiYzM1ODdiZDM3ODZiZTM4ODViZjM5ODRjMDNhODNjMTNiODJjMjNjODFjMzNkODBjNDNlN2ZjNTQwN2VjNjQxN2RjNzQyN2NjODQzN2JjOTQ0N2FjYTQ1N2FjYjQ2NzljYzQ3NzhjYzQ5NzdjZDRhNzZjZTRiNzVjZjRjNzRkMDRkNzNkMTRlNzJkMjRmNzFkMzUxNzFkNDUyNzBkNTUzNmZkNTU0NmVkNjU1NmRkNzU2NmNkODU3NmJkOTU4NmFkYTVhNmFkYTViNjlkYjVjNjhkYzVkNjdkZDVlNjZkZTVmNjVkZTYxNjRkZjYyNjNlMDYzNjNlMTY0NjJlMjY1NjFlMjY2NjBlMzY4NWZlNDY5NWVlNTZhNWRlNTZiNWRlNjZjNWNlNzZlNWJlNzZmNWFlODcwNTllOTcxNThlOTcyNTdlYTc0NTdlYjc1NTZlYjc2NTVlYzc3NTRlZDc5NTNlZDdhNTJlZTdiNTFlZjdjNTFlZjdlNTBmMDdmNGZmMDgwNGVmMTgxNGRmMTgzNGNmMjg0NGJmMzg1NGJmMzg3NGFmNDg4NDlmNDg5NDhmNThiNDdmNThjNDZmNjhkNDVmNjhmNDRmNzkwNDRmNzkxNDNmNzkzNDJmODk0NDFmODk1NDBmOTk3M2ZmOTk4M2VmOTlhM2VmYTliM2RmYTljM2NmYTllM2JmYjlmM2FmYmExMzlmYmEyMzhmY2EzMzhmY2E1MzdmY2E2MzZmY2E4MzVmY2E5MzRmZGFiMzNmZGFjMzNmZGFlMzJmZGFmMzFmZGIxMzBmZGIyMmZmZGI0MmZmZGI1MmVmZWI3MmRmZWI4MmNmZWJhMmNmZWJiMmJmZWJkMmFmZWJlMmFmZWMwMjlmZGMyMjlmZGMzMjhmZGM1MjdmZGM2MjdmZGM4MjdmZGNhMjZmZGNiMjZmY2NkMjVmY2NlMjVmY2QwMjVmY2QyMjVmYmQzMjRmYmQ1MjRmYmQ3MjRmYWQ4MjRmYWRhMjRmOWRjMjRmOWRkMjVmOGRmMjVmOGUxMjVmN2UyMjVmN2U0MjVmNmU2MjZmNmU4MjZmNWU5MjZmNWViMjdmNGVkMjdmM2VlMjdmM2YwMjdmMmYyMjdmMWY0MjZmMWY1MjVmMGY3MjRmMGY5MjFcIikpO1xuXG4gIGZ1bmN0aW9uIHNlcXVlbnRpYWwoaW50ZXJwb2xhdG9yKSB7XG4gICAgdmFyIHgwID0gMCxcbiAgICAgICAgeDEgPSAxLFxuICAgICAgICBjbGFtcCA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgICAgdmFyIHQgPSAoeCAtIHgwKSAvICh4MSAtIHgwKTtcbiAgICAgIHJldHVybiBpbnRlcnBvbGF0b3IoY2xhbXAgPyBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCB0KSkgOiB0KTtcbiAgICB9XG5cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh4MCA9ICtfWzBdLCB4MSA9ICtfWzFdLCBzY2FsZSkgOiBbeDAsIHgxXTtcbiAgICB9O1xuXG4gICAgc2NhbGUuY2xhbXAgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChjbGFtcCA9ICEhXywgc2NhbGUpIDogY2xhbXA7XG4gICAgfTtcblxuICAgIHNjYWxlLmludGVycG9sYXRvciA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGludGVycG9sYXRvciA9IF8sIHNjYWxlKSA6IGludGVycG9sYXRvcjtcbiAgICB9O1xuXG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHNlcXVlbnRpYWwoaW50ZXJwb2xhdG9yKS5kb21haW4oW3gwLCB4MV0pLmNsYW1wKGNsYW1wKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGxpbmVhcmlzaChzY2FsZSk7XG4gIH1cblxuICBleHBvcnRzLnNjYWxlQmFuZCA9IGJhbmQ7XG4gIGV4cG9ydHMuc2NhbGVQb2ludCA9IHBvaW50O1xuICBleHBvcnRzLnNjYWxlSWRlbnRpdHkgPSBpZGVudGl0eTtcbiAgZXhwb3J0cy5zY2FsZUxpbmVhciA9IGxpbmVhcjtcbiAgZXhwb3J0cy5zY2FsZUxvZyA9IGxvZztcbiAgZXhwb3J0cy5zY2FsZU9yZGluYWwgPSBvcmRpbmFsO1xuICBleHBvcnRzLnNjYWxlSW1wbGljaXQgPSBpbXBsaWNpdDtcbiAgZXhwb3J0cy5zY2FsZVBvdyA9IHBvdztcbiAgZXhwb3J0cy5zY2FsZVNxcnQgPSBzcXJ0O1xuICBleHBvcnRzLnNjYWxlUXVhbnRpbGUgPSBxdWFudGlsZSQxO1xuICBleHBvcnRzLnNjYWxlUXVhbnRpemUgPSBxdWFudGl6ZTtcbiAgZXhwb3J0cy5zY2FsZVRocmVzaG9sZCA9IHRocmVzaG9sZDtcbiAgZXhwb3J0cy5zY2FsZVRpbWUgPSB0aW1lO1xuICBleHBvcnRzLnNjYWxlVXRjID0gdXRjVGltZTtcbiAgZXhwb3J0cy5zY2hlbWVDYXRlZ29yeTEwID0gY2F0ZWdvcnkxMDtcbiAgZXhwb3J0cy5zY2hlbWVDYXRlZ29yeTIwYiA9IGNhdGVnb3J5MjBiO1xuICBleHBvcnRzLnNjaGVtZUNhdGVnb3J5MjBjID0gY2F0ZWdvcnkyMGM7XG4gIGV4cG9ydHMuc2NoZW1lQ2F0ZWdvcnkyMCA9IGNhdGVnb3J5MjA7XG4gIGV4cG9ydHMuaW50ZXJwb2xhdGVDdWJlaGVsaXhEZWZhdWx0ID0gY3ViZWhlbGl4JDE7XG4gIGV4cG9ydHMuaW50ZXJwb2xhdGVSYWluYm93ID0gcmFpbmJvdyQxO1xuICBleHBvcnRzLmludGVycG9sYXRlV2FybSA9IHdhcm07XG4gIGV4cG9ydHMuaW50ZXJwb2xhdGVDb29sID0gY29vbDtcbiAgZXhwb3J0cy5pbnRlcnBvbGF0ZVZpcmlkaXMgPSB2aXJpZGlzO1xuICBleHBvcnRzLmludGVycG9sYXRlTWFnbWEgPSBtYWdtYTtcbiAgZXhwb3J0cy5pbnRlcnBvbGF0ZUluZmVybm8gPSBpbmZlcm5vO1xuICBleHBvcnRzLmludGVycG9sYXRlUGxhc21hID0gcGxhc21hO1xuICBleHBvcnRzLnNjYWxlU2VxdWVudGlhbCA9IHNlcXVlbnRpYWw7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpOyIsIi8vIGh0dHBzOi8vZDNqcy5vcmcvZDMtc2hhcGUvIFZlcnNpb24gMS4wLjMuIENvcHlyaWdodCAyMDE2IE1pa2UgQm9zdG9jay5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cywgcmVxdWlyZSgnZDMtcGF0aCcpKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnLCAnZDMtcGF0aCddLCBmYWN0b3J5KSA6XG4gIChmYWN0b3J5KChnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pLGdsb2JhbC5kMykpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMsZDNQYXRoKSB7ICd1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gY29uc3RhbnQoeCkge1xuICByZXR1cm4gZnVuY3Rpb24gY29uc3RhbnQoKSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59XG5cbnZhciBlcHNpbG9uID0gMWUtMTI7XG52YXIgcGkgPSBNYXRoLlBJO1xudmFyIGhhbGZQaSA9IHBpIC8gMjtcbnZhciB0YXUgPSAyICogcGk7XG5cbmZ1bmN0aW9uIGFyY0lubmVyUmFkaXVzKGQpIHtcbiAgcmV0dXJuIGQuaW5uZXJSYWRpdXM7XG59XG5cbmZ1bmN0aW9uIGFyY091dGVyUmFkaXVzKGQpIHtcbiAgcmV0dXJuIGQub3V0ZXJSYWRpdXM7XG59XG5cbmZ1bmN0aW9uIGFyY1N0YXJ0QW5nbGUoZCkge1xuICByZXR1cm4gZC5zdGFydEFuZ2xlO1xufVxuXG5mdW5jdGlvbiBhcmNFbmRBbmdsZShkKSB7XG4gIHJldHVybiBkLmVuZEFuZ2xlO1xufVxuXG5mdW5jdGlvbiBhcmNQYWRBbmdsZShkKSB7XG4gIHJldHVybiBkICYmIGQucGFkQW5nbGU7IC8vIE5vdGU6IG9wdGlvbmFsIVxufVxuXG5mdW5jdGlvbiBhc2luKHgpIHtcbiAgcmV0dXJuIHggPj0gMSA/IGhhbGZQaSA6IHggPD0gLTEgPyAtaGFsZlBpIDogTWF0aC5hc2luKHgpO1xufVxuXG5mdW5jdGlvbiBpbnRlcnNlY3QoeDAsIHkwLCB4MSwgeTEsIHgyLCB5MiwgeDMsIHkzKSB7XG4gIHZhciB4MTAgPSB4MSAtIHgwLCB5MTAgPSB5MSAtIHkwLFxuICAgICAgeDMyID0geDMgLSB4MiwgeTMyID0geTMgLSB5MixcbiAgICAgIHQgPSAoeDMyICogKHkwIC0geTIpIC0geTMyICogKHgwIC0geDIpKSAvICh5MzIgKiB4MTAgLSB4MzIgKiB5MTApO1xuICByZXR1cm4gW3gwICsgdCAqIHgxMCwgeTAgKyB0ICogeTEwXTtcbn1cblxuLy8gQ29tcHV0ZSBwZXJwZW5kaWN1bGFyIG9mZnNldCBsaW5lIG9mIGxlbmd0aCByYy5cbi8vIGh0dHA6Ly9tYXRod29ybGQud29sZnJhbS5jb20vQ2lyY2xlLUxpbmVJbnRlcnNlY3Rpb24uaHRtbFxuZnVuY3Rpb24gY29ybmVyVGFuZ2VudHMoeDAsIHkwLCB4MSwgeTEsIHIxLCByYywgY3cpIHtcbiAgdmFyIHgwMSA9IHgwIC0geDEsXG4gICAgICB5MDEgPSB5MCAtIHkxLFxuICAgICAgbG8gPSAoY3cgPyByYyA6IC1yYykgLyBNYXRoLnNxcnQoeDAxICogeDAxICsgeTAxICogeTAxKSxcbiAgICAgIG94ID0gbG8gKiB5MDEsXG4gICAgICBveSA9IC1sbyAqIHgwMSxcbiAgICAgIHgxMSA9IHgwICsgb3gsXG4gICAgICB5MTEgPSB5MCArIG95LFxuICAgICAgeDEwID0geDEgKyBveCxcbiAgICAgIHkxMCA9IHkxICsgb3ksXG4gICAgICB4MDAgPSAoeDExICsgeDEwKSAvIDIsXG4gICAgICB5MDAgPSAoeTExICsgeTEwKSAvIDIsXG4gICAgICBkeCA9IHgxMCAtIHgxMSxcbiAgICAgIGR5ID0geTEwIC0geTExLFxuICAgICAgZDIgPSBkeCAqIGR4ICsgZHkgKiBkeSxcbiAgICAgIHIgPSByMSAtIHJjLFxuICAgICAgRCA9IHgxMSAqIHkxMCAtIHgxMCAqIHkxMSxcbiAgICAgIGQgPSAoZHkgPCAwID8gLTEgOiAxKSAqIE1hdGguc3FydChNYXRoLm1heCgwLCByICogciAqIGQyIC0gRCAqIEQpKSxcbiAgICAgIGN4MCA9IChEICogZHkgLSBkeCAqIGQpIC8gZDIsXG4gICAgICBjeTAgPSAoLUQgKiBkeCAtIGR5ICogZCkgLyBkMixcbiAgICAgIGN4MSA9IChEICogZHkgKyBkeCAqIGQpIC8gZDIsXG4gICAgICBjeTEgPSAoLUQgKiBkeCArIGR5ICogZCkgLyBkMixcbiAgICAgIGR4MCA9IGN4MCAtIHgwMCxcbiAgICAgIGR5MCA9IGN5MCAtIHkwMCxcbiAgICAgIGR4MSA9IGN4MSAtIHgwMCxcbiAgICAgIGR5MSA9IGN5MSAtIHkwMDtcblxuICAvLyBQaWNrIHRoZSBjbG9zZXIgb2YgdGhlIHR3byBpbnRlcnNlY3Rpb24gcG9pbnRzLlxuICAvLyBUT0RPIElzIHRoZXJlIGEgZmFzdGVyIHdheSB0byBkZXRlcm1pbmUgd2hpY2ggaW50ZXJzZWN0aW9uIHRvIHVzZT9cbiAgaWYgKGR4MCAqIGR4MCArIGR5MCAqIGR5MCA+IGR4MSAqIGR4MSArIGR5MSAqIGR5MSkgY3gwID0gY3gxLCBjeTAgPSBjeTE7XG5cbiAgcmV0dXJuIHtcbiAgICBjeDogY3gwLFxuICAgIGN5OiBjeTAsXG4gICAgeDAxOiAtb3gsXG4gICAgeTAxOiAtb3ksXG4gICAgeDExOiBjeDAgKiAocjEgLyByIC0gMSksXG4gICAgeTExOiBjeTAgKiAocjEgLyByIC0gMSlcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXJjKCkge1xuICB2YXIgaW5uZXJSYWRpdXMgPSBhcmNJbm5lclJhZGl1cyxcbiAgICAgIG91dGVyUmFkaXVzID0gYXJjT3V0ZXJSYWRpdXMsXG4gICAgICBjb3JuZXJSYWRpdXMgPSBjb25zdGFudCgwKSxcbiAgICAgIHBhZFJhZGl1cyA9IG51bGwsXG4gICAgICBzdGFydEFuZ2xlID0gYXJjU3RhcnRBbmdsZSxcbiAgICAgIGVuZEFuZ2xlID0gYXJjRW5kQW5nbGUsXG4gICAgICBwYWRBbmdsZSA9IGFyY1BhZEFuZ2xlLFxuICAgICAgY29udGV4dCA9IG51bGw7XG5cbiAgZnVuY3Rpb24gYXJjKCkge1xuICAgIHZhciBidWZmZXIsXG4gICAgICAgIHIsXG4gICAgICAgIHIwID0gK2lubmVyUmFkaXVzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksXG4gICAgICAgIHIxID0gK291dGVyUmFkaXVzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksXG4gICAgICAgIGEwID0gc3RhcnRBbmdsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpIC0gaGFsZlBpLFxuICAgICAgICBhMSA9IGVuZEFuZ2xlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgLSBoYWxmUGksXG4gICAgICAgIGRhID0gTWF0aC5hYnMoYTEgLSBhMCksXG4gICAgICAgIGN3ID0gYTEgPiBhMDtcblxuICAgIGlmICghY29udGV4dCkgY29udGV4dCA9IGJ1ZmZlciA9IGQzUGF0aC5wYXRoKCk7XG5cbiAgICAvLyBFbnN1cmUgdGhhdCB0aGUgb3V0ZXIgcmFkaXVzIGlzIGFsd2F5cyBsYXJnZXIgdGhhbiB0aGUgaW5uZXIgcmFkaXVzLlxuICAgIGlmIChyMSA8IHIwKSByID0gcjEsIHIxID0gcjAsIHIwID0gcjtcblxuICAgIC8vIElzIGl0IGEgcG9pbnQ/XG4gICAgaWYgKCEocjEgPiBlcHNpbG9uKSkgY29udGV4dC5tb3ZlVG8oMCwgMCk7XG5cbiAgICAvLyBPciBpcyBpdCBhIGNpcmNsZSBvciBhbm51bHVzP1xuICAgIGVsc2UgaWYgKGRhID4gdGF1IC0gZXBzaWxvbikge1xuICAgICAgY29udGV4dC5tb3ZlVG8ocjEgKiBNYXRoLmNvcyhhMCksIHIxICogTWF0aC5zaW4oYTApKTtcbiAgICAgIGNvbnRleHQuYXJjKDAsIDAsIHIxLCBhMCwgYTEsICFjdyk7XG4gICAgICBpZiAocjAgPiBlcHNpbG9uKSB7XG4gICAgICAgIGNvbnRleHQubW92ZVRvKHIwICogTWF0aC5jb3MoYTEpLCByMCAqIE1hdGguc2luKGExKSk7XG4gICAgICAgIGNvbnRleHQuYXJjKDAsIDAsIHIwLCBhMSwgYTAsIGN3KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPciBpcyBpdCBhIGNpcmN1bGFyIG9yIGFubnVsYXIgc2VjdG9yP1xuICAgIGVsc2Uge1xuICAgICAgdmFyIGEwMSA9IGEwLFxuICAgICAgICAgIGExMSA9IGExLFxuICAgICAgICAgIGEwMCA9IGEwLFxuICAgICAgICAgIGExMCA9IGExLFxuICAgICAgICAgIGRhMCA9IGRhLFxuICAgICAgICAgIGRhMSA9IGRhLFxuICAgICAgICAgIGFwID0gcGFkQW5nbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSAvIDIsXG4gICAgICAgICAgcnAgPSAoYXAgPiBlcHNpbG9uKSAmJiAocGFkUmFkaXVzID8gK3BhZFJhZGl1cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogTWF0aC5zcXJ0KHIwICogcjAgKyByMSAqIHIxKSksXG4gICAgICAgICAgcmMgPSBNYXRoLm1pbihNYXRoLmFicyhyMSAtIHIwKSAvIDIsICtjb3JuZXJSYWRpdXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSksXG4gICAgICAgICAgcmMwID0gcmMsXG4gICAgICAgICAgcmMxID0gcmMsXG4gICAgICAgICAgdDAsXG4gICAgICAgICAgdDE7XG5cbiAgICAgIC8vIEFwcGx5IHBhZGRpbmc/IE5vdGUgdGhhdCBzaW5jZSByMSDiiaUgcjAsIGRhMSDiiaUgZGEwLlxuICAgICAgaWYgKHJwID4gZXBzaWxvbikge1xuICAgICAgICB2YXIgcDAgPSBhc2luKHJwIC8gcjAgKiBNYXRoLnNpbihhcCkpLFxuICAgICAgICAgICAgcDEgPSBhc2luKHJwIC8gcjEgKiBNYXRoLnNpbihhcCkpO1xuICAgICAgICBpZiAoKGRhMCAtPSBwMCAqIDIpID4gZXBzaWxvbikgcDAgKj0gKGN3ID8gMSA6IC0xKSwgYTAwICs9IHAwLCBhMTAgLT0gcDA7XG4gICAgICAgIGVsc2UgZGEwID0gMCwgYTAwID0gYTEwID0gKGEwICsgYTEpIC8gMjtcbiAgICAgICAgaWYgKChkYTEgLT0gcDEgKiAyKSA+IGVwc2lsb24pIHAxICo9IChjdyA/IDEgOiAtMSksIGEwMSArPSBwMSwgYTExIC09IHAxO1xuICAgICAgICBlbHNlIGRhMSA9IDAsIGEwMSA9IGExMSA9IChhMCArIGExKSAvIDI7XG4gICAgICB9XG5cbiAgICAgIHZhciB4MDEgPSByMSAqIE1hdGguY29zKGEwMSksXG4gICAgICAgICAgeTAxID0gcjEgKiBNYXRoLnNpbihhMDEpLFxuICAgICAgICAgIHgxMCA9IHIwICogTWF0aC5jb3MoYTEwKSxcbiAgICAgICAgICB5MTAgPSByMCAqIE1hdGguc2luKGExMCk7XG5cbiAgICAgIC8vIEFwcGx5IHJvdW5kZWQgY29ybmVycz9cbiAgICAgIGlmIChyYyA+IGVwc2lsb24pIHtcbiAgICAgICAgdmFyIHgxMSA9IHIxICogTWF0aC5jb3MoYTExKSxcbiAgICAgICAgICAgIHkxMSA9IHIxICogTWF0aC5zaW4oYTExKSxcbiAgICAgICAgICAgIHgwMCA9IHIwICogTWF0aC5jb3MoYTAwKSxcbiAgICAgICAgICAgIHkwMCA9IHIwICogTWF0aC5zaW4oYTAwKTtcblxuICAgICAgICAvLyBSZXN0cmljdCB0aGUgY29ybmVyIHJhZGl1cyBhY2NvcmRpbmcgdG8gdGhlIHNlY3RvciBhbmdsZS5cbiAgICAgICAgaWYgKGRhIDwgcGkpIHtcbiAgICAgICAgICB2YXIgb2MgPSBkYTAgPiBlcHNpbG9uID8gaW50ZXJzZWN0KHgwMSwgeTAxLCB4MDAsIHkwMCwgeDExLCB5MTEsIHgxMCwgeTEwKSA6IFt4MTAsIHkxMF0sXG4gICAgICAgICAgICAgIGF4ID0geDAxIC0gb2NbMF0sXG4gICAgICAgICAgICAgIGF5ID0geTAxIC0gb2NbMV0sXG4gICAgICAgICAgICAgIGJ4ID0geDExIC0gb2NbMF0sXG4gICAgICAgICAgICAgIGJ5ID0geTExIC0gb2NbMV0sXG4gICAgICAgICAgICAgIGtjID0gMSAvIE1hdGguc2luKE1hdGguYWNvcygoYXggKiBieCArIGF5ICogYnkpIC8gKE1hdGguc3FydChheCAqIGF4ICsgYXkgKiBheSkgKiBNYXRoLnNxcnQoYnggKiBieCArIGJ5ICogYnkpKSkgLyAyKSxcbiAgICAgICAgICAgICAgbGMgPSBNYXRoLnNxcnQob2NbMF0gKiBvY1swXSArIG9jWzFdICogb2NbMV0pO1xuICAgICAgICAgIHJjMCA9IE1hdGgubWluKHJjLCAocjAgLSBsYykgLyAoa2MgLSAxKSk7XG4gICAgICAgICAgcmMxID0gTWF0aC5taW4ocmMsIChyMSAtIGxjKSAvIChrYyArIDEpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJcyB0aGUgc2VjdG9yIGNvbGxhcHNlZCB0byBhIGxpbmU/XG4gICAgICBpZiAoIShkYTEgPiBlcHNpbG9uKSkgY29udGV4dC5tb3ZlVG8oeDAxLCB5MDEpO1xuXG4gICAgICAvLyBEb2VzIHRoZSBzZWN0b3LigJlzIG91dGVyIHJpbmcgaGF2ZSByb3VuZGVkIGNvcm5lcnM/XG4gICAgICBlbHNlIGlmIChyYzEgPiBlcHNpbG9uKSB7XG4gICAgICAgIHQwID0gY29ybmVyVGFuZ2VudHMoeDAwLCB5MDAsIHgwMSwgeTAxLCByMSwgcmMxLCBjdyk7XG4gICAgICAgIHQxID0gY29ybmVyVGFuZ2VudHMoeDExLCB5MTEsIHgxMCwgeTEwLCByMSwgcmMxLCBjdyk7XG5cbiAgICAgICAgY29udGV4dC5tb3ZlVG8odDAuY3ggKyB0MC54MDEsIHQwLmN5ICsgdDAueTAxKTtcblxuICAgICAgICAvLyBIYXZlIHRoZSBjb3JuZXJzIG1lcmdlZD9cbiAgICAgICAgaWYgKHJjMSA8IHJjKSBjb250ZXh0LmFyYyh0MC5jeCwgdDAuY3ksIHJjMSwgTWF0aC5hdGFuMih0MC55MDEsIHQwLngwMSksIE1hdGguYXRhbjIodDEueTAxLCB0MS54MDEpLCAhY3cpO1xuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgZHJhdyB0aGUgdHdvIGNvcm5lcnMgYW5kIHRoZSByaW5nLlxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBjb250ZXh0LmFyYyh0MC5jeCwgdDAuY3ksIHJjMSwgTWF0aC5hdGFuMih0MC55MDEsIHQwLngwMSksIE1hdGguYXRhbjIodDAueTExLCB0MC54MTEpLCAhY3cpO1xuICAgICAgICAgIGNvbnRleHQuYXJjKDAsIDAsIHIxLCBNYXRoLmF0YW4yKHQwLmN5ICsgdDAueTExLCB0MC5jeCArIHQwLngxMSksIE1hdGguYXRhbjIodDEuY3kgKyB0MS55MTEsIHQxLmN4ICsgdDEueDExKSwgIWN3KTtcbiAgICAgICAgICBjb250ZXh0LmFyYyh0MS5jeCwgdDEuY3ksIHJjMSwgTWF0aC5hdGFuMih0MS55MTEsIHQxLngxMSksIE1hdGguYXRhbjIodDEueTAxLCB0MS54MDEpLCAhY3cpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE9yIGlzIHRoZSBvdXRlciByaW5nIGp1c3QgYSBjaXJjdWxhciBhcmM/XG4gICAgICBlbHNlIGNvbnRleHQubW92ZVRvKHgwMSwgeTAxKSwgY29udGV4dC5hcmMoMCwgMCwgcjEsIGEwMSwgYTExLCAhY3cpO1xuXG4gICAgICAvLyBJcyB0aGVyZSBubyBpbm5lciByaW5nLCBhbmQgaXTigJlzIGEgY2lyY3VsYXIgc2VjdG9yP1xuICAgICAgLy8gT3IgcGVyaGFwcyBpdOKAmXMgYW4gYW5udWxhciBzZWN0b3IgY29sbGFwc2VkIGR1ZSB0byBwYWRkaW5nP1xuICAgICAgaWYgKCEocjAgPiBlcHNpbG9uKSB8fCAhKGRhMCA+IGVwc2lsb24pKSBjb250ZXh0LmxpbmVUbyh4MTAsIHkxMCk7XG5cbiAgICAgIC8vIERvZXMgdGhlIHNlY3RvcuKAmXMgaW5uZXIgcmluZyAob3IgcG9pbnQpIGhhdmUgcm91bmRlZCBjb3JuZXJzP1xuICAgICAgZWxzZSBpZiAocmMwID4gZXBzaWxvbikge1xuICAgICAgICB0MCA9IGNvcm5lclRhbmdlbnRzKHgxMCwgeTEwLCB4MTEsIHkxMSwgcjAsIC1yYzAsIGN3KTtcbiAgICAgICAgdDEgPSBjb3JuZXJUYW5nZW50cyh4MDEsIHkwMSwgeDAwLCB5MDAsIHIwLCAtcmMwLCBjdyk7XG5cbiAgICAgICAgY29udGV4dC5saW5lVG8odDAuY3ggKyB0MC54MDEsIHQwLmN5ICsgdDAueTAxKTtcblxuICAgICAgICAvLyBIYXZlIHRoZSBjb3JuZXJzIG1lcmdlZD9cbiAgICAgICAgaWYgKHJjMCA8IHJjKSBjb250ZXh0LmFyYyh0MC5jeCwgdDAuY3ksIHJjMCwgTWF0aC5hdGFuMih0MC55MDEsIHQwLngwMSksIE1hdGguYXRhbjIodDEueTAxLCB0MS54MDEpLCAhY3cpO1xuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgZHJhdyB0aGUgdHdvIGNvcm5lcnMgYW5kIHRoZSByaW5nLlxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBjb250ZXh0LmFyYyh0MC5jeCwgdDAuY3ksIHJjMCwgTWF0aC5hdGFuMih0MC55MDEsIHQwLngwMSksIE1hdGguYXRhbjIodDAueTExLCB0MC54MTEpLCAhY3cpO1xuICAgICAgICAgIGNvbnRleHQuYXJjKDAsIDAsIHIwLCBNYXRoLmF0YW4yKHQwLmN5ICsgdDAueTExLCB0MC5jeCArIHQwLngxMSksIE1hdGguYXRhbjIodDEuY3kgKyB0MS55MTEsIHQxLmN4ICsgdDEueDExKSwgY3cpO1xuICAgICAgICAgIGNvbnRleHQuYXJjKHQxLmN4LCB0MS5jeSwgcmMwLCBNYXRoLmF0YW4yKHQxLnkxMSwgdDEueDExKSwgTWF0aC5hdGFuMih0MS55MDEsIHQxLngwMSksICFjdyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gT3IgaXMgdGhlIGlubmVyIHJpbmcganVzdCBhIGNpcmN1bGFyIGFyYz9cbiAgICAgIGVsc2UgY29udGV4dC5hcmMoMCwgMCwgcjAsIGExMCwgYTAwLCBjdyk7XG4gICAgfVxuXG4gICAgY29udGV4dC5jbG9zZVBhdGgoKTtcblxuICAgIGlmIChidWZmZXIpIHJldHVybiBjb250ZXh0ID0gbnVsbCwgYnVmZmVyICsgXCJcIiB8fCBudWxsO1xuICB9XG5cbiAgYXJjLmNlbnRyb2lkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHIgPSAoK2lubmVyUmFkaXVzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgKyArb3V0ZXJSYWRpdXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSkgLyAyLFxuICAgICAgICBhID0gKCtzdGFydEFuZ2xlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgKyArZW5kQW5nbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSkgLyAyIC0gcGkgLyAyO1xuICAgIHJldHVybiBbTWF0aC5jb3MoYSkgKiByLCBNYXRoLnNpbihhKSAqIHJdO1xuICB9O1xuXG4gIGFyYy5pbm5lclJhZGl1cyA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChpbm5lclJhZGl1cyA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmMpIDogaW5uZXJSYWRpdXM7XG4gIH07XG5cbiAgYXJjLm91dGVyUmFkaXVzID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKG91dGVyUmFkaXVzID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyYykgOiBvdXRlclJhZGl1cztcbiAgfTtcblxuICBhcmMuY29ybmVyUmFkaXVzID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGNvcm5lclJhZGl1cyA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmMpIDogY29ybmVyUmFkaXVzO1xuICB9O1xuXG4gIGFyYy5wYWRSYWRpdXMgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkUmFkaXVzID0gXyA9PSBudWxsID8gbnVsbCA6IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmMpIDogcGFkUmFkaXVzO1xuICB9O1xuXG4gIGFyYy5zdGFydEFuZ2xlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHN0YXJ0QW5nbGUgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJjKSA6IHN0YXJ0QW5nbGU7XG4gIH07XG5cbiAgYXJjLmVuZEFuZ2xlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGVuZEFuZ2xlID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyYykgOiBlbmRBbmdsZTtcbiAgfTtcblxuICBhcmMucGFkQW5nbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkQW5nbGUgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJjKSA6IHBhZEFuZ2xlO1xuICB9O1xuXG4gIGFyYy5jb250ZXh0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKChjb250ZXh0ID0gXyA9PSBudWxsID8gbnVsbCA6IF8pLCBhcmMpIDogY29udGV4dDtcbiAgfTtcblxuICByZXR1cm4gYXJjO1xufVxuXG5mdW5jdGlvbiBMaW5lYXIoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuTGluZWFyLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gMDtcbiAgfSxcbiAgYXJlYUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IE5hTjtcbiAgfSxcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9saW5lIHx8ICh0aGlzLl9saW5lICE9PSAwICYmIHRoaXMuX3BvaW50ID09PSAxKSkgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICB0aGlzLl9saW5lID0gMSAtIHRoaXMuX2xpbmU7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KSA6IHRoaXMuX2NvbnRleHQubW92ZVRvKHgsIHkpOyBicmVhaztcbiAgICAgIGNhc2UgMTogdGhpcy5fcG9pbnQgPSAyOyAvLyBwcm9jZWVkXG4gICAgICBkZWZhdWx0OiB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KTsgYnJlYWs7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBjdXJ2ZUxpbmVhcihjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgTGluZWFyKGNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiB4KHApIHtcbiAgcmV0dXJuIHBbMF07XG59XG5cbmZ1bmN0aW9uIHkocCkge1xuICByZXR1cm4gcFsxXTtcbn1cblxuZnVuY3Rpb24gbGluZSgpIHtcbiAgdmFyIHgkJCA9IHgsXG4gICAgICB5JCQgPSB5LFxuICAgICAgZGVmaW5lZCA9IGNvbnN0YW50KHRydWUpLFxuICAgICAgY29udGV4dCA9IG51bGwsXG4gICAgICBjdXJ2ZSA9IGN1cnZlTGluZWFyLFxuICAgICAgb3V0cHV0ID0gbnVsbDtcblxuICBmdW5jdGlvbiBsaW5lKGRhdGEpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgbiA9IGRhdGEubGVuZ3RoLFxuICAgICAgICBkLFxuICAgICAgICBkZWZpbmVkMCA9IGZhbHNlLFxuICAgICAgICBidWZmZXI7XG5cbiAgICBpZiAoY29udGV4dCA9PSBudWxsKSBvdXRwdXQgPSBjdXJ2ZShidWZmZXIgPSBkM1BhdGgucGF0aCgpKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPD0gbjsgKytpKSB7XG4gICAgICBpZiAoIShpIDwgbiAmJiBkZWZpbmVkKGQgPSBkYXRhW2ldLCBpLCBkYXRhKSkgPT09IGRlZmluZWQwKSB7XG4gICAgICAgIGlmIChkZWZpbmVkMCA9ICFkZWZpbmVkMCkgb3V0cHV0LmxpbmVTdGFydCgpO1xuICAgICAgICBlbHNlIG91dHB1dC5saW5lRW5kKCk7XG4gICAgICB9XG4gICAgICBpZiAoZGVmaW5lZDApIG91dHB1dC5wb2ludCgreCQkKGQsIGksIGRhdGEpLCAreSQkKGQsIGksIGRhdGEpKTtcbiAgICB9XG5cbiAgICBpZiAoYnVmZmVyKSByZXR1cm4gb3V0cHV0ID0gbnVsbCwgYnVmZmVyICsgXCJcIiB8fCBudWxsO1xuICB9XG5cbiAgbGluZS54ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgkJCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBsaW5lKSA6IHgkJDtcbiAgfTtcblxuICBsaW5lLnkgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeSQkID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGxpbmUpIDogeSQkO1xuICB9O1xuXG4gIGxpbmUuZGVmaW5lZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkZWZpbmVkID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCghIV8pLCBsaW5lKSA6IGRlZmluZWQ7XG4gIH07XG5cbiAgbGluZS5jdXJ2ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChjdXJ2ZSA9IF8sIGNvbnRleHQgIT0gbnVsbCAmJiAob3V0cHV0ID0gY3VydmUoY29udGV4dCkpLCBsaW5lKSA6IGN1cnZlO1xuICB9O1xuXG4gIGxpbmUuY29udGV4dCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChfID09IG51bGwgPyBjb250ZXh0ID0gb3V0cHV0ID0gbnVsbCA6IG91dHB1dCA9IGN1cnZlKGNvbnRleHQgPSBfKSwgbGluZSkgOiBjb250ZXh0O1xuICB9O1xuXG4gIHJldHVybiBsaW5lO1xufVxuXG5mdW5jdGlvbiBhcmVhKCkge1xuICB2YXIgeDAgPSB4LFxuICAgICAgeDEgPSBudWxsLFxuICAgICAgeTAgPSBjb25zdGFudCgwKSxcbiAgICAgIHkxID0geSxcbiAgICAgIGRlZmluZWQgPSBjb25zdGFudCh0cnVlKSxcbiAgICAgIGNvbnRleHQgPSBudWxsLFxuICAgICAgY3VydmUgPSBjdXJ2ZUxpbmVhcixcbiAgICAgIG91dHB1dCA9IG51bGw7XG5cbiAgZnVuY3Rpb24gYXJlYShkYXRhKSB7XG4gICAgdmFyIGksXG4gICAgICAgIGosXG4gICAgICAgIGssXG4gICAgICAgIG4gPSBkYXRhLmxlbmd0aCxcbiAgICAgICAgZCxcbiAgICAgICAgZGVmaW5lZDAgPSBmYWxzZSxcbiAgICAgICAgYnVmZmVyLFxuICAgICAgICB4MHogPSBuZXcgQXJyYXkobiksXG4gICAgICAgIHkweiA9IG5ldyBBcnJheShuKTtcblxuICAgIGlmIChjb250ZXh0ID09IG51bGwpIG91dHB1dCA9IGN1cnZlKGJ1ZmZlciA9IGQzUGF0aC5wYXRoKCkpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8PSBuOyArK2kpIHtcbiAgICAgIGlmICghKGkgPCBuICYmIGRlZmluZWQoZCA9IGRhdGFbaV0sIGksIGRhdGEpKSA9PT0gZGVmaW5lZDApIHtcbiAgICAgICAgaWYgKGRlZmluZWQwID0gIWRlZmluZWQwKSB7XG4gICAgICAgICAgaiA9IGk7XG4gICAgICAgICAgb3V0cHV0LmFyZWFTdGFydCgpO1xuICAgICAgICAgIG91dHB1dC5saW5lU3RhcnQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXRwdXQubGluZUVuZCgpO1xuICAgICAgICAgIG91dHB1dC5saW5lU3RhcnQoKTtcbiAgICAgICAgICBmb3IgKGsgPSBpIC0gMTsgayA+PSBqOyAtLWspIHtcbiAgICAgICAgICAgIG91dHB1dC5wb2ludCh4MHpba10sIHkweltrXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dHB1dC5saW5lRW5kKCk7XG4gICAgICAgICAgb3V0cHV0LmFyZWFFbmQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGRlZmluZWQwKSB7XG4gICAgICAgIHgweltpXSA9ICt4MChkLCBpLCBkYXRhKSwgeTB6W2ldID0gK3kwKGQsIGksIGRhdGEpO1xuICAgICAgICBvdXRwdXQucG9pbnQoeDEgPyAreDEoZCwgaSwgZGF0YSkgOiB4MHpbaV0sIHkxID8gK3kxKGQsIGksIGRhdGEpIDogeTB6W2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYnVmZmVyKSByZXR1cm4gb3V0cHV0ID0gbnVsbCwgYnVmZmVyICsgXCJcIiB8fCBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gYXJlYWxpbmUoKSB7XG4gICAgcmV0dXJuIGxpbmUoKS5kZWZpbmVkKGRlZmluZWQpLmN1cnZlKGN1cnZlKS5jb250ZXh0KGNvbnRleHQpO1xuICB9XG5cbiAgYXJlYS54ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgwID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIHgxID0gbnVsbCwgYXJlYSkgOiB4MDtcbiAgfTtcblxuICBhcmVhLngwID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgwID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyZWEpIDogeDA7XG4gIH07XG5cbiAgYXJlYS54MSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh4MSA9IF8gPT0gbnVsbCA/IG51bGwgOiB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJlYSkgOiB4MTtcbiAgfTtcblxuICBhcmVhLnkgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeTAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgeTEgPSBudWxsLCBhcmVhKSA6IHkwO1xuICB9O1xuXG4gIGFyZWEueTAgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeTAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJlYSkgOiB5MDtcbiAgfTtcblxuICBhcmVhLnkxID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHkxID0gXyA9PSBudWxsID8gbnVsbCA6IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmVhKSA6IHkxO1xuICB9O1xuXG4gIGFyZWEubGluZVgwID1cbiAgYXJlYS5saW5lWTAgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJlYWxpbmUoKS54KHgwKS55KHkwKTtcbiAgfTtcblxuICBhcmVhLmxpbmVZMSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmVhbGluZSgpLngoeDApLnkoeTEpO1xuICB9O1xuXG4gIGFyZWEubGluZVgxID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZWFsaW5lKCkueCh4MSkueSh5MCk7XG4gIH07XG5cbiAgYXJlYS5kZWZpbmVkID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRlZmluZWQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCEhXyksIGFyZWEpIDogZGVmaW5lZDtcbiAgfTtcblxuICBhcmVhLmN1cnZlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGN1cnZlID0gXywgY29udGV4dCAhPSBudWxsICYmIChvdXRwdXQgPSBjdXJ2ZShjb250ZXh0KSksIGFyZWEpIDogY3VydmU7XG4gIH07XG5cbiAgYXJlYS5jb250ZXh0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKF8gPT0gbnVsbCA/IGNvbnRleHQgPSBvdXRwdXQgPSBudWxsIDogb3V0cHV0ID0gY3VydmUoY29udGV4dCA9IF8pLCBhcmVhKSA6IGNvbnRleHQ7XG4gIH07XG5cbiAgcmV0dXJuIGFyZWE7XG59XG5cbmZ1bmN0aW9uIGRlc2NlbmRpbmcoYSwgYikge1xuICByZXR1cm4gYiA8IGEgPyAtMSA6IGIgPiBhID8gMSA6IGIgPj0gYSA/IDAgOiBOYU47XG59XG5cbmZ1bmN0aW9uIGlkZW50aXR5KGQpIHtcbiAgcmV0dXJuIGQ7XG59XG5cbmZ1bmN0aW9uIHBpZSgpIHtcbiAgdmFyIHZhbHVlID0gaWRlbnRpdHksXG4gICAgICBzb3J0VmFsdWVzID0gZGVzY2VuZGluZyxcbiAgICAgIHNvcnQgPSBudWxsLFxuICAgICAgc3RhcnRBbmdsZSA9IGNvbnN0YW50KDApLFxuICAgICAgZW5kQW5nbGUgPSBjb25zdGFudCh0YXUpLFxuICAgICAgcGFkQW5nbGUgPSBjb25zdGFudCgwKTtcblxuICBmdW5jdGlvbiBwaWUoZGF0YSkge1xuICAgIHZhciBpLFxuICAgICAgICBuID0gZGF0YS5sZW5ndGgsXG4gICAgICAgIGosXG4gICAgICAgIGssXG4gICAgICAgIHN1bSA9IDAsXG4gICAgICAgIGluZGV4ID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBhcmNzID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBhMCA9ICtzdGFydEFuZ2xlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksXG4gICAgICAgIGRhID0gTWF0aC5taW4odGF1LCBNYXRoLm1heCgtdGF1LCBlbmRBbmdsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpIC0gYTApKSxcbiAgICAgICAgYTEsXG4gICAgICAgIHAgPSBNYXRoLm1pbihNYXRoLmFicyhkYSkgLyBuLCBwYWRBbmdsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKSxcbiAgICAgICAgcGEgPSBwICogKGRhIDwgMCA/IC0xIDogMSksXG4gICAgICAgIHY7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKHYgPSBhcmNzW2luZGV4W2ldID0gaV0gPSArdmFsdWUoZGF0YVtpXSwgaSwgZGF0YSkpID4gMCkge1xuICAgICAgICBzdW0gKz0gdjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPcHRpb25hbGx5IHNvcnQgdGhlIGFyY3MgYnkgcHJldmlvdXNseS1jb21wdXRlZCB2YWx1ZXMgb3IgYnkgZGF0YS5cbiAgICBpZiAoc29ydFZhbHVlcyAhPSBudWxsKSBpbmRleC5zb3J0KGZ1bmN0aW9uKGksIGopIHsgcmV0dXJuIHNvcnRWYWx1ZXMoYXJjc1tpXSwgYXJjc1tqXSk7IH0pO1xuICAgIGVsc2UgaWYgKHNvcnQgIT0gbnVsbCkgaW5kZXguc29ydChmdW5jdGlvbihpLCBqKSB7IHJldHVybiBzb3J0KGRhdGFbaV0sIGRhdGFbal0pOyB9KTtcblxuICAgIC8vIENvbXB1dGUgdGhlIGFyY3MhIFRoZXkgYXJlIHN0b3JlZCBpbiB0aGUgb3JpZ2luYWwgZGF0YSdzIG9yZGVyLlxuICAgIGZvciAoaSA9IDAsIGsgPSBzdW0gPyAoZGEgLSBuICogcGEpIC8gc3VtIDogMDsgaSA8IG47ICsraSwgYTAgPSBhMSkge1xuICAgICAgaiA9IGluZGV4W2ldLCB2ID0gYXJjc1tqXSwgYTEgPSBhMCArICh2ID4gMCA/IHYgKiBrIDogMCkgKyBwYSwgYXJjc1tqXSA9IHtcbiAgICAgICAgZGF0YTogZGF0YVtqXSxcbiAgICAgICAgaW5kZXg6IGksXG4gICAgICAgIHZhbHVlOiB2LFxuICAgICAgICBzdGFydEFuZ2xlOiBhMCxcbiAgICAgICAgZW5kQW5nbGU6IGExLFxuICAgICAgICBwYWRBbmdsZTogcFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJjcztcbiAgfVxuXG4gIHBpZS52YWx1ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh2YWx1ZSA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBwaWUpIDogdmFsdWU7XG4gIH07XG5cbiAgcGllLnNvcnRWYWx1ZXMgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoc29ydFZhbHVlcyA9IF8sIHNvcnQgPSBudWxsLCBwaWUpIDogc29ydFZhbHVlcztcbiAgfTtcblxuICBwaWUuc29ydCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChzb3J0ID0gXywgc29ydFZhbHVlcyA9IG51bGwsIHBpZSkgOiBzb3J0O1xuICB9O1xuXG4gIHBpZS5zdGFydEFuZ2xlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHN0YXJ0QW5nbGUgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgcGllKSA6IHN0YXJ0QW5nbGU7XG4gIH07XG5cbiAgcGllLmVuZEFuZ2xlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGVuZEFuZ2xlID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIHBpZSkgOiBlbmRBbmdsZTtcbiAgfTtcblxuICBwaWUucGFkQW5nbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkQW5nbGUgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgcGllKSA6IHBhZEFuZ2xlO1xuICB9O1xuXG4gIHJldHVybiBwaWU7XG59XG5cbnZhciBjdXJ2ZVJhZGlhbExpbmVhciA9IGN1cnZlUmFkaWFsKGN1cnZlTGluZWFyKTtcblxuZnVuY3Rpb24gUmFkaWFsKGN1cnZlKSB7XG4gIHRoaXMuX2N1cnZlID0gY3VydmU7XG59XG5cblJhZGlhbC5wcm90b3R5cGUgPSB7XG4gIGFyZWFTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY3VydmUuYXJlYVN0YXJ0KCk7XG4gIH0sXG4gIGFyZWFFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2N1cnZlLmFyZWFFbmQoKTtcbiAgfSxcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jdXJ2ZS5saW5lU3RhcnQoKTtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY3VydmUubGluZUVuZCgpO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oYSwgcikge1xuICAgIHRoaXMuX2N1cnZlLnBvaW50KHIgKiBNYXRoLnNpbihhKSwgciAqIC1NYXRoLmNvcyhhKSk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGN1cnZlUmFkaWFsKGN1cnZlKSB7XG5cbiAgZnVuY3Rpb24gcmFkaWFsKGNvbnRleHQpIHtcbiAgICByZXR1cm4gbmV3IFJhZGlhbChjdXJ2ZShjb250ZXh0KSk7XG4gIH1cblxuICByYWRpYWwuX2N1cnZlID0gY3VydmU7XG5cbiAgcmV0dXJuIHJhZGlhbDtcbn1cblxuZnVuY3Rpb24gcmFkaWFsTGluZShsKSB7XG4gIHZhciBjID0gbC5jdXJ2ZTtcblxuICBsLmFuZ2xlID0gbC54LCBkZWxldGUgbC54O1xuICBsLnJhZGl1cyA9IGwueSwgZGVsZXRlIGwueTtcblxuICBsLmN1cnZlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gYyhjdXJ2ZVJhZGlhbChfKSkgOiBjKCkuX2N1cnZlO1xuICB9O1xuXG4gIHJldHVybiBsO1xufVxuXG5mdW5jdGlvbiByYWRpYWxMaW5lJDEoKSB7XG4gIHJldHVybiByYWRpYWxMaW5lKGxpbmUoKS5jdXJ2ZShjdXJ2ZVJhZGlhbExpbmVhcikpO1xufVxuXG5mdW5jdGlvbiByYWRpYWxBcmVhKCkge1xuICB2YXIgYSA9IGFyZWEoKS5jdXJ2ZShjdXJ2ZVJhZGlhbExpbmVhciksXG4gICAgICBjID0gYS5jdXJ2ZSxcbiAgICAgIHgwID0gYS5saW5lWDAsXG4gICAgICB4MSA9IGEubGluZVgxLFxuICAgICAgeTAgPSBhLmxpbmVZMCxcbiAgICAgIHkxID0gYS5saW5lWTE7XG5cbiAgYS5hbmdsZSA9IGEueCwgZGVsZXRlIGEueDtcbiAgYS5zdGFydEFuZ2xlID0gYS54MCwgZGVsZXRlIGEueDA7XG4gIGEuZW5kQW5nbGUgPSBhLngxLCBkZWxldGUgYS54MTtcbiAgYS5yYWRpdXMgPSBhLnksIGRlbGV0ZSBhLnk7XG4gIGEuaW5uZXJSYWRpdXMgPSBhLnkwLCBkZWxldGUgYS55MDtcbiAgYS5vdXRlclJhZGl1cyA9IGEueTEsIGRlbGV0ZSBhLnkxO1xuICBhLmxpbmVTdGFydEFuZ2xlID0gZnVuY3Rpb24oKSB7IHJldHVybiByYWRpYWxMaW5lKHgwKCkpOyB9LCBkZWxldGUgYS5saW5lWDA7XG4gIGEubGluZUVuZEFuZ2xlID0gZnVuY3Rpb24oKSB7IHJldHVybiByYWRpYWxMaW5lKHgxKCkpOyB9LCBkZWxldGUgYS5saW5lWDE7XG4gIGEubGluZUlubmVyUmFkaXVzID0gZnVuY3Rpb24oKSB7IHJldHVybiByYWRpYWxMaW5lKHkwKCkpOyB9LCBkZWxldGUgYS5saW5lWTA7XG4gIGEubGluZU91dGVyUmFkaXVzID0gZnVuY3Rpb24oKSB7IHJldHVybiByYWRpYWxMaW5lKHkxKCkpOyB9LCBkZWxldGUgYS5saW5lWTE7XG5cbiAgYS5jdXJ2ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IGMoY3VydmVSYWRpYWwoXykpIDogYygpLl9jdXJ2ZTtcbiAgfTtcblxuICByZXR1cm4gYTtcbn1cblxudmFyIGNpcmNsZSA9IHtcbiAgZHJhdzogZnVuY3Rpb24oY29udGV4dCwgc2l6ZSkge1xuICAgIHZhciByID0gTWF0aC5zcXJ0KHNpemUgLyBwaSk7XG4gICAgY29udGV4dC5tb3ZlVG8ociwgMCk7XG4gICAgY29udGV4dC5hcmMoMCwgMCwgciwgMCwgdGF1KTtcbiAgfVxufTtcblxudmFyIGNyb3NzID0ge1xuICBkcmF3OiBmdW5jdGlvbihjb250ZXh0LCBzaXplKSB7XG4gICAgdmFyIHIgPSBNYXRoLnNxcnQoc2l6ZSAvIDUpIC8gMjtcbiAgICBjb250ZXh0Lm1vdmVUbygtMyAqIHIsIC1yKTtcbiAgICBjb250ZXh0LmxpbmVUbygtciwgLXIpO1xuICAgIGNvbnRleHQubGluZVRvKC1yLCAtMyAqIHIpO1xuICAgIGNvbnRleHQubGluZVRvKHIsIC0zICogcik7XG4gICAgY29udGV4dC5saW5lVG8ociwgLXIpO1xuICAgIGNvbnRleHQubGluZVRvKDMgKiByLCAtcik7XG4gICAgY29udGV4dC5saW5lVG8oMyAqIHIsIHIpO1xuICAgIGNvbnRleHQubGluZVRvKHIsIHIpO1xuICAgIGNvbnRleHQubGluZVRvKHIsIDMgKiByKTtcbiAgICBjb250ZXh0LmxpbmVUbygtciwgMyAqIHIpO1xuICAgIGNvbnRleHQubGluZVRvKC1yLCByKTtcbiAgICBjb250ZXh0LmxpbmVUbygtMyAqIHIsIHIpO1xuICAgIGNvbnRleHQuY2xvc2VQYXRoKCk7XG4gIH1cbn07XG5cbnZhciB0YW4zMCA9IE1hdGguc3FydCgxIC8gMyk7XG52YXIgdGFuMzBfMiA9IHRhbjMwICogMjtcbnZhciBkaWFtb25kID0ge1xuICBkcmF3OiBmdW5jdGlvbihjb250ZXh0LCBzaXplKSB7XG4gICAgdmFyIHkgPSBNYXRoLnNxcnQoc2l6ZSAvIHRhbjMwXzIpLFxuICAgICAgICB4ID0geSAqIHRhbjMwO1xuICAgIGNvbnRleHQubW92ZVRvKDAsIC15KTtcbiAgICBjb250ZXh0LmxpbmVUbyh4LCAwKTtcbiAgICBjb250ZXh0LmxpbmVUbygwLCB5KTtcbiAgICBjb250ZXh0LmxpbmVUbygteCwgMCk7XG4gICAgY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgfVxufTtcblxudmFyIGthID0gMC44OTA4MTMwOTE1MjkyODUyMjgxMDtcbnZhciBrciA9IE1hdGguc2luKHBpIC8gMTApIC8gTWF0aC5zaW4oNyAqIHBpIC8gMTApO1xudmFyIGt4ID0gTWF0aC5zaW4odGF1IC8gMTApICoga3I7XG52YXIga3kgPSAtTWF0aC5jb3ModGF1IC8gMTApICoga3I7XG52YXIgc3RhciA9IHtcbiAgZHJhdzogZnVuY3Rpb24oY29udGV4dCwgc2l6ZSkge1xuICAgIHZhciByID0gTWF0aC5zcXJ0KHNpemUgKiBrYSksXG4gICAgICAgIHggPSBreCAqIHIsXG4gICAgICAgIHkgPSBreSAqIHI7XG4gICAgY29udGV4dC5tb3ZlVG8oMCwgLXIpO1xuICAgIGNvbnRleHQubGluZVRvKHgsIHkpO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgNTsgKytpKSB7XG4gICAgICB2YXIgYSA9IHRhdSAqIGkgLyA1LFxuICAgICAgICAgIGMgPSBNYXRoLmNvcyhhKSxcbiAgICAgICAgICBzID0gTWF0aC5zaW4oYSk7XG4gICAgICBjb250ZXh0LmxpbmVUbyhzICogciwgLWMgKiByKTtcbiAgICAgIGNvbnRleHQubGluZVRvKGMgKiB4IC0gcyAqIHksIHMgKiB4ICsgYyAqIHkpO1xuICAgIH1cbiAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xuICB9XG59O1xuXG52YXIgc3F1YXJlID0ge1xuICBkcmF3OiBmdW5jdGlvbihjb250ZXh0LCBzaXplKSB7XG4gICAgdmFyIHcgPSBNYXRoLnNxcnQoc2l6ZSksXG4gICAgICAgIHggPSAtdyAvIDI7XG4gICAgY29udGV4dC5yZWN0KHgsIHgsIHcsIHcpO1xuICB9XG59O1xuXG52YXIgc3FydDMgPSBNYXRoLnNxcnQoMyk7XG5cbnZhciB0cmlhbmdsZSA9IHtcbiAgZHJhdzogZnVuY3Rpb24oY29udGV4dCwgc2l6ZSkge1xuICAgIHZhciB5ID0gLU1hdGguc3FydChzaXplIC8gKHNxcnQzICogMykpO1xuICAgIGNvbnRleHQubW92ZVRvKDAsIHkgKiAyKTtcbiAgICBjb250ZXh0LmxpbmVUbygtc3FydDMgKiB5LCAteSk7XG4gICAgY29udGV4dC5saW5lVG8oc3FydDMgKiB5LCAteSk7XG4gICAgY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgfVxufTtcblxudmFyIGMgPSAtMC41O1xudmFyIHMgPSBNYXRoLnNxcnQoMykgLyAyO1xudmFyIGsgPSAxIC8gTWF0aC5zcXJ0KDEyKTtcbnZhciBhID0gKGsgLyAyICsgMSkgKiAzO1xudmFyIHd5ZSA9IHtcbiAgZHJhdzogZnVuY3Rpb24oY29udGV4dCwgc2l6ZSkge1xuICAgIHZhciByID0gTWF0aC5zcXJ0KHNpemUgLyBhKSxcbiAgICAgICAgeDAgPSByIC8gMixcbiAgICAgICAgeTAgPSByICogayxcbiAgICAgICAgeDEgPSB4MCxcbiAgICAgICAgeTEgPSByICogayArIHIsXG4gICAgICAgIHgyID0gLXgxLFxuICAgICAgICB5MiA9IHkxO1xuICAgIGNvbnRleHQubW92ZVRvKHgwLCB5MCk7XG4gICAgY29udGV4dC5saW5lVG8oeDEsIHkxKTtcbiAgICBjb250ZXh0LmxpbmVUbyh4MiwgeTIpO1xuICAgIGNvbnRleHQubGluZVRvKGMgKiB4MCAtIHMgKiB5MCwgcyAqIHgwICsgYyAqIHkwKTtcbiAgICBjb250ZXh0LmxpbmVUbyhjICogeDEgLSBzICogeTEsIHMgKiB4MSArIGMgKiB5MSk7XG4gICAgY29udGV4dC5saW5lVG8oYyAqIHgyIC0gcyAqIHkyLCBzICogeDIgKyBjICogeTIpO1xuICAgIGNvbnRleHQubGluZVRvKGMgKiB4MCArIHMgKiB5MCwgYyAqIHkwIC0gcyAqIHgwKTtcbiAgICBjb250ZXh0LmxpbmVUbyhjICogeDEgKyBzICogeTEsIGMgKiB5MSAtIHMgKiB4MSk7XG4gICAgY29udGV4dC5saW5lVG8oYyAqIHgyICsgcyAqIHkyLCBjICogeTIgLSBzICogeDIpO1xuICAgIGNvbnRleHQuY2xvc2VQYXRoKCk7XG4gIH1cbn07XG5cbnZhciBzeW1ib2xzID0gW1xuICBjaXJjbGUsXG4gIGNyb3NzLFxuICBkaWFtb25kLFxuICBzcXVhcmUsXG4gIHN0YXIsXG4gIHRyaWFuZ2xlLFxuICB3eWVcbl07XG5cbmZ1bmN0aW9uIHN5bWJvbCgpIHtcbiAgdmFyIHR5cGUgPSBjb25zdGFudChjaXJjbGUpLFxuICAgICAgc2l6ZSA9IGNvbnN0YW50KDY0KSxcbiAgICAgIGNvbnRleHQgPSBudWxsO1xuXG4gIGZ1bmN0aW9uIHN5bWJvbCgpIHtcbiAgICB2YXIgYnVmZmVyO1xuICAgIGlmICghY29udGV4dCkgY29udGV4dCA9IGJ1ZmZlciA9IGQzUGF0aC5wYXRoKCk7XG4gICAgdHlwZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpLmRyYXcoY29udGV4dCwgK3NpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgaWYgKGJ1ZmZlcikgcmV0dXJuIGNvbnRleHQgPSBudWxsLCBidWZmZXIgKyBcIlwiIHx8IG51bGw7XG4gIH1cblxuICBzeW1ib2wudHlwZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh0eXBlID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudChfKSwgc3ltYm9sKSA6IHR5cGU7XG4gIH07XG5cbiAgc3ltYm9sLnNpemUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoc2l6ZSA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBzeW1ib2wpIDogc2l6ZTtcbiAgfTtcblxuICBzeW1ib2wuY29udGV4dCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChjb250ZXh0ID0gXyA9PSBudWxsID8gbnVsbCA6IF8sIHN5bWJvbCkgOiBjb250ZXh0O1xuICB9O1xuXG4gIHJldHVybiBzeW1ib2w7XG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5mdW5jdGlvbiBwb2ludCh0aGF0LCB4LCB5KSB7XG4gIHRoYXQuX2NvbnRleHQuYmV6aWVyQ3VydmVUbyhcbiAgICAoMiAqIHRoYXQuX3gwICsgdGhhdC5feDEpIC8gMyxcbiAgICAoMiAqIHRoYXQuX3kwICsgdGhhdC5feTEpIC8gMyxcbiAgICAodGhhdC5feDAgKyAyICogdGhhdC5feDEpIC8gMyxcbiAgICAodGhhdC5feTAgKyAyICogdGhhdC5feTEpIC8gMyxcbiAgICAodGhhdC5feDAgKyA0ICogdGhhdC5feDEgKyB4KSAvIDYsXG4gICAgKHRoYXQuX3kwICsgNCAqIHRoYXQuX3kxICsgeSkgLyA2XG4gICk7XG59XG5cbmZ1bmN0aW9uIEJhc2lzKGNvbnRleHQpIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG59XG5cbkJhc2lzLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gMDtcbiAgfSxcbiAgYXJlYUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IE5hTjtcbiAgfSxcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxID1cbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxID0gTmFOO1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAzOiBwb2ludCh0aGlzLCB0aGlzLl94MSwgdGhpcy5feTEpOyAvLyBwcm9jZWVkXG4gICAgICBjYXNlIDI6IHRoaXMuX2NvbnRleHQubGluZVRvKHRoaXMuX3gxLCB0aGlzLl95MSk7IGJyZWFrO1xuICAgIH1cbiAgICBpZiAodGhpcy5fbGluZSB8fCAodGhpcy5fbGluZSAhPT0gMCAmJiB0aGlzLl9wb2ludCA9PT0gMSkpIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgdGhpcy5fbGluZSA9IDEgLSB0aGlzLl9saW5lO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSAreCwgeSA9ICt5O1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl9saW5lID8gdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSkgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh4LCB5KTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgYnJlYWs7XG4gICAgICBjYXNlIDI6IHRoaXMuX3BvaW50ID0gMzsgdGhpcy5fY29udGV4dC5saW5lVG8oKDUgKiB0aGlzLl94MCArIHRoaXMuX3gxKSAvIDYsICg1ICogdGhpcy5feTAgKyB0aGlzLl95MSkgLyA2KTsgLy8gcHJvY2VlZFxuICAgICAgZGVmYXVsdDogcG9pbnQodGhpcywgeCwgeSk7IGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxLCB0aGlzLl94MSA9IHg7XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSwgdGhpcy5feTEgPSB5O1xuICB9XG59O1xuXG5mdW5jdGlvbiBiYXNpcyhjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgQmFzaXMoY29udGV4dCk7XG59XG5cbmZ1bmN0aW9uIEJhc2lzQ2xvc2VkKGNvbnRleHQpIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG59XG5cbkJhc2lzQ2xvc2VkLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBub29wLFxuICBhcmVhRW5kOiBub29wLFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPSB0aGlzLl94MiA9IHRoaXMuX3gzID0gdGhpcy5feDQgPVxuICAgIHRoaXMuX3kwID0gdGhpcy5feTEgPSB0aGlzLl95MiA9IHRoaXMuX3kzID0gdGhpcy5feTQgPSBOYU47XG4gICAgdGhpcy5fcG9pbnQgPSAwO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDE6IHtcbiAgICAgICAgdGhpcy5fY29udGV4dC5tb3ZlVG8odGhpcy5feDIsIHRoaXMuX3kyKTtcbiAgICAgICAgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgdGhpcy5fY29udGV4dC5tb3ZlVG8oKHRoaXMuX3gyICsgMiAqIHRoaXMuX3gzKSAvIDMsICh0aGlzLl95MiArIDIgKiB0aGlzLl95MykgLyAzKTtcbiAgICAgICAgdGhpcy5fY29udGV4dC5saW5lVG8oKHRoaXMuX3gzICsgMiAqIHRoaXMuX3gyKSAvIDMsICh0aGlzLl95MyArIDIgKiB0aGlzLl95MikgLyAzKTtcbiAgICAgICAgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIDM6IHtcbiAgICAgICAgdGhpcy5wb2ludCh0aGlzLl94MiwgdGhpcy5feTIpO1xuICAgICAgICB0aGlzLnBvaW50KHRoaXMuX3gzLCB0aGlzLl95Myk7XG4gICAgICAgIHRoaXMucG9pbnQodGhpcy5feDQsIHRoaXMuX3k0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSAreCwgeSA9ICt5O1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl94MiA9IHgsIHRoaXMuX3kyID0geTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgdGhpcy5feDMgPSB4LCB0aGlzLl95MyA9IHk7IGJyZWFrO1xuICAgICAgY2FzZSAyOiB0aGlzLl9wb2ludCA9IDM7IHRoaXMuX3g0ID0geCwgdGhpcy5feTQgPSB5OyB0aGlzLl9jb250ZXh0Lm1vdmVUbygodGhpcy5feDAgKyA0ICogdGhpcy5feDEgKyB4KSAvIDYsICh0aGlzLl95MCArIDQgKiB0aGlzLl95MSArIHkpIC8gNik7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogcG9pbnQodGhpcywgeCwgeSk7IGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxLCB0aGlzLl94MSA9IHg7XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSwgdGhpcy5feTEgPSB5O1xuICB9XG59O1xuXG5mdW5jdGlvbiBiYXNpc0Nsb3NlZChjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgQmFzaXNDbG9zZWQoY29udGV4dCk7XG59XG5cbmZ1bmN0aW9uIEJhc2lzT3Blbihjb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufVxuXG5CYXNpc09wZW4ucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPVxuICAgIHRoaXMuX3kwID0gdGhpcy5feTEgPSBOYU47XG4gICAgdGhpcy5fcG9pbnQgPSAwO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fbGluZSB8fCAodGhpcy5fbGluZSAhPT0gMCAmJiB0aGlzLl9wb2ludCA9PT0gMykpIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgdGhpcy5fbGluZSA9IDEgLSB0aGlzLl9saW5lO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSAreCwgeSA9ICt5O1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyBicmVhaztcbiAgICAgIGNhc2UgMTogdGhpcy5fcG9pbnQgPSAyOyBicmVhaztcbiAgICAgIGNhc2UgMjogdGhpcy5fcG9pbnQgPSAzOyB2YXIgeDAgPSAodGhpcy5feDAgKyA0ICogdGhpcy5feDEgKyB4KSAvIDYsIHkwID0gKHRoaXMuX3kwICsgNCAqIHRoaXMuX3kxICsgeSkgLyA2OyB0aGlzLl9saW5lID8gdGhpcy5fY29udGV4dC5saW5lVG8oeDAsIHkwKSA6IHRoaXMuX2NvbnRleHQubW92ZVRvKHgwLCB5MCk7IGJyZWFrO1xuICAgICAgY2FzZSAzOiB0aGlzLl9wb2ludCA9IDQ7IC8vIHByb2NlZWRcbiAgICAgIGRlZmF1bHQ6IHBvaW50KHRoaXMsIHgsIHkpOyBicmVhaztcbiAgICB9XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSwgdGhpcy5feDEgPSB4O1xuICAgIHRoaXMuX3kwID0gdGhpcy5feTEsIHRoaXMuX3kxID0geTtcbiAgfVxufTtcblxuZnVuY3Rpb24gYmFzaXNPcGVuKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBCYXNpc09wZW4oY29udGV4dCk7XG59XG5cbmZ1bmN0aW9uIEJ1bmRsZShjb250ZXh0LCBiZXRhKSB7XG4gIHRoaXMuX2Jhc2lzID0gbmV3IEJhc2lzKGNvbnRleHQpO1xuICB0aGlzLl9iZXRhID0gYmV0YTtcbn1cblxuQnVuZGxlLnByb3RvdHlwZSA9IHtcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl94ID0gW107XG4gICAgdGhpcy5feSA9IFtdO1xuICAgIHRoaXMuX2Jhc2lzLmxpbmVTdGFydCgpO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgeCA9IHRoaXMuX3gsXG4gICAgICAgIHkgPSB0aGlzLl95LFxuICAgICAgICBqID0geC5sZW5ndGggLSAxO1xuXG4gICAgaWYgKGogPiAwKSB7XG4gICAgICB2YXIgeDAgPSB4WzBdLFxuICAgICAgICAgIHkwID0geVswXSxcbiAgICAgICAgICBkeCA9IHhbal0gLSB4MCxcbiAgICAgICAgICBkeSA9IHlbal0gLSB5MCxcbiAgICAgICAgICBpID0gLTEsXG4gICAgICAgICAgdDtcblxuICAgICAgd2hpbGUgKCsraSA8PSBqKSB7XG4gICAgICAgIHQgPSBpIC8gajtcbiAgICAgICAgdGhpcy5fYmFzaXMucG9pbnQoXG4gICAgICAgICAgdGhpcy5fYmV0YSAqIHhbaV0gKyAoMSAtIHRoaXMuX2JldGEpICogKHgwICsgdCAqIGR4KSxcbiAgICAgICAgICB0aGlzLl9iZXRhICogeVtpXSArICgxIC0gdGhpcy5fYmV0YSkgKiAoeTAgKyB0ICogZHkpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5feCA9IHRoaXMuX3kgPSBudWxsO1xuICAgIHRoaXMuX2Jhc2lzLmxpbmVFbmQoKTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLl94LnB1c2goK3gpO1xuICAgIHRoaXMuX3kucHVzaCgreSk7XG4gIH1cbn07XG5cbnZhciBidW5kbGUgPSAoZnVuY3Rpb24gY3VzdG9tKGJldGEpIHtcblxuICBmdW5jdGlvbiBidW5kbGUoY29udGV4dCkge1xuICAgIHJldHVybiBiZXRhID09PSAxID8gbmV3IEJhc2lzKGNvbnRleHQpIDogbmV3IEJ1bmRsZShjb250ZXh0LCBiZXRhKTtcbiAgfVxuXG4gIGJ1bmRsZS5iZXRhID0gZnVuY3Rpb24oYmV0YSkge1xuICAgIHJldHVybiBjdXN0b20oK2JldGEpO1xuICB9O1xuXG4gIHJldHVybiBidW5kbGU7XG59KSgwLjg1KTtcblxuZnVuY3Rpb24gcG9pbnQkMSh0aGF0LCB4LCB5KSB7XG4gIHRoYXQuX2NvbnRleHQuYmV6aWVyQ3VydmVUbyhcbiAgICB0aGF0Ll94MSArIHRoYXQuX2sgKiAodGhhdC5feDIgLSB0aGF0Ll94MCksXG4gICAgdGhhdC5feTEgKyB0aGF0Ll9rICogKHRoYXQuX3kyIC0gdGhhdC5feTApLFxuICAgIHRoYXQuX3gyICsgdGhhdC5fayAqICh0aGF0Ll94MSAtIHgpLFxuICAgIHRoYXQuX3kyICsgdGhhdC5fayAqICh0aGF0Ll95MSAtIHkpLFxuICAgIHRoYXQuX3gyLFxuICAgIHRoYXQuX3kyXG4gICk7XG59XG5cbmZ1bmN0aW9uIENhcmRpbmFsKGNvbnRleHQsIHRlbnNpb24pIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuX2sgPSAoMSAtIHRlbnNpb24pIC8gNjtcbn1cblxuQ2FyZGluYWwucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPSB0aGlzLl94MiA9XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSA9IHRoaXMuX3kyID0gTmFOO1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAyOiB0aGlzLl9jb250ZXh0LmxpbmVUbyh0aGlzLl94MiwgdGhpcy5feTIpOyBicmVhaztcbiAgICAgIGNhc2UgMzogcG9pbnQkMSh0aGlzLCB0aGlzLl94MSwgdGhpcy5feTEpOyBicmVhaztcbiAgICB9XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDEpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB4ID0gK3gsIHkgPSAreTtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDA6IHRoaXMuX3BvaW50ID0gMTsgdGhpcy5fbGluZSA/IHRoaXMuX2NvbnRleHQubGluZVRvKHgsIHkpIDogdGhpcy5fY29udGV4dC5tb3ZlVG8oeCwgeSk7IGJyZWFrO1xuICAgICAgY2FzZSAxOiB0aGlzLl9wb2ludCA9IDI7IHRoaXMuX3gxID0geCwgdGhpcy5feTEgPSB5OyBicmVhaztcbiAgICAgIGNhc2UgMjogdGhpcy5fcG9pbnQgPSAzOyAvLyBwcm9jZWVkXG4gICAgICBkZWZhdWx0OiBwb2ludCQxKHRoaXMsIHgsIHkpOyBicmVhaztcbiAgICB9XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSwgdGhpcy5feDEgPSB0aGlzLl94MiwgdGhpcy5feDIgPSB4O1xuICAgIHRoaXMuX3kwID0gdGhpcy5feTEsIHRoaXMuX3kxID0gdGhpcy5feTIsIHRoaXMuX3kyID0geTtcbiAgfVxufTtcblxudmFyIGNhcmRpbmFsID0gKGZ1bmN0aW9uIGN1c3RvbSh0ZW5zaW9uKSB7XG5cbiAgZnVuY3Rpb24gY2FyZGluYWwoY29udGV4dCkge1xuICAgIHJldHVybiBuZXcgQ2FyZGluYWwoY29udGV4dCwgdGVuc2lvbik7XG4gIH1cblxuICBjYXJkaW5hbC50ZW5zaW9uID0gZnVuY3Rpb24odGVuc2lvbikge1xuICAgIHJldHVybiBjdXN0b20oK3RlbnNpb24pO1xuICB9O1xuXG4gIHJldHVybiBjYXJkaW5hbDtcbn0pKDApO1xuXG5mdW5jdGlvbiBDYXJkaW5hbENsb3NlZChjb250ZXh0LCB0ZW5zaW9uKSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLl9rID0gKDEgLSB0ZW5zaW9uKSAvIDY7XG59XG5cbkNhcmRpbmFsQ2xvc2VkLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBub29wLFxuICBhcmVhRW5kOiBub29wLFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPSB0aGlzLl94MiA9IHRoaXMuX3gzID0gdGhpcy5feDQgPSB0aGlzLl94NSA9XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSA9IHRoaXMuX3kyID0gdGhpcy5feTMgPSB0aGlzLl95NCA9IHRoaXMuX3k1ID0gTmFOO1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAxOiB7XG4gICAgICAgIHRoaXMuX2NvbnRleHQubW92ZVRvKHRoaXMuX3gzLCB0aGlzLl95Myk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIHRoaXMuX2NvbnRleHQubGluZVRvKHRoaXMuX3gzLCB0aGlzLl95Myk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSAzOiB7XG4gICAgICAgIHRoaXMucG9pbnQodGhpcy5feDMsIHRoaXMuX3kzKTtcbiAgICAgICAgdGhpcy5wb2ludCh0aGlzLl94NCwgdGhpcy5feTQpO1xuICAgICAgICB0aGlzLnBvaW50KHRoaXMuX3g1LCB0aGlzLl95NSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB4ID0gK3gsIHkgPSAreTtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDA6IHRoaXMuX3BvaW50ID0gMTsgdGhpcy5feDMgPSB4LCB0aGlzLl95MyA9IHk7IGJyZWFrO1xuICAgICAgY2FzZSAxOiB0aGlzLl9wb2ludCA9IDI7IHRoaXMuX2NvbnRleHQubW92ZVRvKHRoaXMuX3g0ID0geCwgdGhpcy5feTQgPSB5KTsgYnJlYWs7XG4gICAgICBjYXNlIDI6IHRoaXMuX3BvaW50ID0gMzsgdGhpcy5feDUgPSB4LCB0aGlzLl95NSA9IHk7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogcG9pbnQkMSh0aGlzLCB4LCB5KTsgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuX3gwID0gdGhpcy5feDEsIHRoaXMuX3gxID0gdGhpcy5feDIsIHRoaXMuX3gyID0geDtcbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxLCB0aGlzLl95MSA9IHRoaXMuX3kyLCB0aGlzLl95MiA9IHk7XG4gIH1cbn07XG5cbnZhciBjYXJkaW5hbENsb3NlZCA9IChmdW5jdGlvbiBjdXN0b20odGVuc2lvbikge1xuXG4gIGZ1bmN0aW9uIGNhcmRpbmFsKGNvbnRleHQpIHtcbiAgICByZXR1cm4gbmV3IENhcmRpbmFsQ2xvc2VkKGNvbnRleHQsIHRlbnNpb24pO1xuICB9XG5cbiAgY2FyZGluYWwudGVuc2lvbiA9IGZ1bmN0aW9uKHRlbnNpb24pIHtcbiAgICByZXR1cm4gY3VzdG9tKCt0ZW5zaW9uKTtcbiAgfTtcblxuICByZXR1cm4gY2FyZGluYWw7XG59KSgwKTtcblxuZnVuY3Rpb24gQ2FyZGluYWxPcGVuKGNvbnRleHQsIHRlbnNpb24pIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuX2sgPSAoMSAtIHRlbnNpb24pIC8gNjtcbn1cblxuQ2FyZGluYWxPcGVuLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gMDtcbiAgfSxcbiAgYXJlYUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IE5hTjtcbiAgfSxcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxID0gdGhpcy5feDIgPVxuICAgIHRoaXMuX3kwID0gdGhpcy5feTEgPSB0aGlzLl95MiA9IE5hTjtcbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9saW5lIHx8ICh0aGlzLl9saW5lICE9PSAwICYmIHRoaXMuX3BvaW50ID09PSAzKSkgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICB0aGlzLl9saW5lID0gMSAtIHRoaXMuX2xpbmU7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IGJyZWFrO1xuICAgICAgY2FzZSAxOiB0aGlzLl9wb2ludCA9IDI7IGJyZWFrO1xuICAgICAgY2FzZSAyOiB0aGlzLl9wb2ludCA9IDM7IHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh0aGlzLl94MiwgdGhpcy5feTIpIDogdGhpcy5fY29udGV4dC5tb3ZlVG8odGhpcy5feDIsIHRoaXMuX3kyKTsgYnJlYWs7XG4gICAgICBjYXNlIDM6IHRoaXMuX3BvaW50ID0gNDsgLy8gcHJvY2VlZFxuICAgICAgZGVmYXVsdDogcG9pbnQkMSh0aGlzLCB4LCB5KTsgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuX3gwID0gdGhpcy5feDEsIHRoaXMuX3gxID0gdGhpcy5feDIsIHRoaXMuX3gyID0geDtcbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxLCB0aGlzLl95MSA9IHRoaXMuX3kyLCB0aGlzLl95MiA9IHk7XG4gIH1cbn07XG5cbnZhciBjYXJkaW5hbE9wZW4gPSAoZnVuY3Rpb24gY3VzdG9tKHRlbnNpb24pIHtcblxuICBmdW5jdGlvbiBjYXJkaW5hbChjb250ZXh0KSB7XG4gICAgcmV0dXJuIG5ldyBDYXJkaW5hbE9wZW4oY29udGV4dCwgdGVuc2lvbik7XG4gIH1cblxuICBjYXJkaW5hbC50ZW5zaW9uID0gZnVuY3Rpb24odGVuc2lvbikge1xuICAgIHJldHVybiBjdXN0b20oK3RlbnNpb24pO1xuICB9O1xuXG4gIHJldHVybiBjYXJkaW5hbDtcbn0pKDApO1xuXG5mdW5jdGlvbiBwb2ludCQyKHRoYXQsIHgsIHkpIHtcbiAgdmFyIHgxID0gdGhhdC5feDEsXG4gICAgICB5MSA9IHRoYXQuX3kxLFxuICAgICAgeDIgPSB0aGF0Ll94MixcbiAgICAgIHkyID0gdGhhdC5feTI7XG5cbiAgaWYgKHRoYXQuX2wwMV9hID4gZXBzaWxvbikge1xuICAgIHZhciBhID0gMiAqIHRoYXQuX2wwMV8yYSArIDMgKiB0aGF0Ll9sMDFfYSAqIHRoYXQuX2wxMl9hICsgdGhhdC5fbDEyXzJhLFxuICAgICAgICBuID0gMyAqIHRoYXQuX2wwMV9hICogKHRoYXQuX2wwMV9hICsgdGhhdC5fbDEyX2EpO1xuICAgIHgxID0gKHgxICogYSAtIHRoYXQuX3gwICogdGhhdC5fbDEyXzJhICsgdGhhdC5feDIgKiB0aGF0Ll9sMDFfMmEpIC8gbjtcbiAgICB5MSA9ICh5MSAqIGEgLSB0aGF0Ll95MCAqIHRoYXQuX2wxMl8yYSArIHRoYXQuX3kyICogdGhhdC5fbDAxXzJhKSAvIG47XG4gIH1cblxuICBpZiAodGhhdC5fbDIzX2EgPiBlcHNpbG9uKSB7XG4gICAgdmFyIGIgPSAyICogdGhhdC5fbDIzXzJhICsgMyAqIHRoYXQuX2wyM19hICogdGhhdC5fbDEyX2EgKyB0aGF0Ll9sMTJfMmEsXG4gICAgICAgIG0gPSAzICogdGhhdC5fbDIzX2EgKiAodGhhdC5fbDIzX2EgKyB0aGF0Ll9sMTJfYSk7XG4gICAgeDIgPSAoeDIgKiBiICsgdGhhdC5feDEgKiB0aGF0Ll9sMjNfMmEgLSB4ICogdGhhdC5fbDEyXzJhKSAvIG07XG4gICAgeTIgPSAoeTIgKiBiICsgdGhhdC5feTEgKiB0aGF0Ll9sMjNfMmEgLSB5ICogdGhhdC5fbDEyXzJhKSAvIG07XG4gIH1cblxuICB0aGF0Ll9jb250ZXh0LmJlemllckN1cnZlVG8oeDEsIHkxLCB4MiwgeTIsIHRoYXQuX3gyLCB0aGF0Ll95Mik7XG59XG5cbmZ1bmN0aW9uIENhdG11bGxSb20oY29udGV4dCwgYWxwaGEpIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuX2FscGhhID0gYWxwaGE7XG59XG5cbkNhdG11bGxSb20ucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPSB0aGlzLl94MiA9XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSA9IHRoaXMuX3kyID0gTmFOO1xuICAgIHRoaXMuX2wwMV9hID0gdGhpcy5fbDEyX2EgPSB0aGlzLl9sMjNfYSA9XG4gICAgdGhpcy5fbDAxXzJhID0gdGhpcy5fbDEyXzJhID0gdGhpcy5fbDIzXzJhID1cbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMjogdGhpcy5fY29udGV4dC5saW5lVG8odGhpcy5feDIsIHRoaXMuX3kyKTsgYnJlYWs7XG4gICAgICBjYXNlIDM6IHRoaXMucG9pbnQodGhpcy5feDIsIHRoaXMuX3kyKTsgYnJlYWs7XG4gICAgfVxuICAgIGlmICh0aGlzLl9saW5lIHx8ICh0aGlzLl9saW5lICE9PSAwICYmIHRoaXMuX3BvaW50ID09PSAxKSkgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICB0aGlzLl9saW5lID0gMSAtIHRoaXMuX2xpbmU7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG5cbiAgICBpZiAodGhpcy5fcG9pbnQpIHtcbiAgICAgIHZhciB4MjMgPSB0aGlzLl94MiAtIHgsXG4gICAgICAgICAgeTIzID0gdGhpcy5feTIgLSB5O1xuICAgICAgdGhpcy5fbDIzX2EgPSBNYXRoLnNxcnQodGhpcy5fbDIzXzJhID0gTWF0aC5wb3coeDIzICogeDIzICsgeTIzICogeTIzLCB0aGlzLl9hbHBoYSkpO1xuICAgIH1cblxuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl9saW5lID8gdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSkgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh4LCB5KTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgYnJlYWs7XG4gICAgICBjYXNlIDI6IHRoaXMuX3BvaW50ID0gMzsgLy8gcHJvY2VlZFxuICAgICAgZGVmYXVsdDogcG9pbnQkMih0aGlzLCB4LCB5KTsgYnJlYWs7XG4gICAgfVxuXG4gICAgdGhpcy5fbDAxX2EgPSB0aGlzLl9sMTJfYSwgdGhpcy5fbDEyX2EgPSB0aGlzLl9sMjNfYTtcbiAgICB0aGlzLl9sMDFfMmEgPSB0aGlzLl9sMTJfMmEsIHRoaXMuX2wxMl8yYSA9IHRoaXMuX2wyM18yYTtcbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxLCB0aGlzLl94MSA9IHRoaXMuX3gyLCB0aGlzLl94MiA9IHg7XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSwgdGhpcy5feTEgPSB0aGlzLl95MiwgdGhpcy5feTIgPSB5O1xuICB9XG59O1xuXG52YXIgY2F0bXVsbFJvbSA9IChmdW5jdGlvbiBjdXN0b20oYWxwaGEpIHtcblxuICBmdW5jdGlvbiBjYXRtdWxsUm9tKGNvbnRleHQpIHtcbiAgICByZXR1cm4gYWxwaGEgPyBuZXcgQ2F0bXVsbFJvbShjb250ZXh0LCBhbHBoYSkgOiBuZXcgQ2FyZGluYWwoY29udGV4dCwgMCk7XG4gIH1cblxuICBjYXRtdWxsUm9tLmFscGhhID0gZnVuY3Rpb24oYWxwaGEpIHtcbiAgICByZXR1cm4gY3VzdG9tKCthbHBoYSk7XG4gIH07XG5cbiAgcmV0dXJuIGNhdG11bGxSb207XG59KSgwLjUpO1xuXG5mdW5jdGlvbiBDYXRtdWxsUm9tQ2xvc2VkKGNvbnRleHQsIGFscGhhKSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLl9hbHBoYSA9IGFscGhhO1xufVxuXG5DYXRtdWxsUm9tQ2xvc2VkLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBub29wLFxuICBhcmVhRW5kOiBub29wLFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPSB0aGlzLl94MiA9IHRoaXMuX3gzID0gdGhpcy5feDQgPSB0aGlzLl94NSA9XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSA9IHRoaXMuX3kyID0gdGhpcy5feTMgPSB0aGlzLl95NCA9IHRoaXMuX3k1ID0gTmFOO1xuICAgIHRoaXMuX2wwMV9hID0gdGhpcy5fbDEyX2EgPSB0aGlzLl9sMjNfYSA9XG4gICAgdGhpcy5fbDAxXzJhID0gdGhpcy5fbDEyXzJhID0gdGhpcy5fbDIzXzJhID1cbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMToge1xuICAgICAgICB0aGlzLl9jb250ZXh0Lm1vdmVUbyh0aGlzLl94MywgdGhpcy5feTMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgMjoge1xuICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbyh0aGlzLl94MywgdGhpcy5feTMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgMzoge1xuICAgICAgICB0aGlzLnBvaW50KHRoaXMuX3gzLCB0aGlzLl95Myk7XG4gICAgICAgIHRoaXMucG9pbnQodGhpcy5feDQsIHRoaXMuX3k0KTtcbiAgICAgICAgdGhpcy5wb2ludCh0aGlzLl94NSwgdGhpcy5feTUpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG5cbiAgICBpZiAodGhpcy5fcG9pbnQpIHtcbiAgICAgIHZhciB4MjMgPSB0aGlzLl94MiAtIHgsXG4gICAgICAgICAgeTIzID0gdGhpcy5feTIgLSB5O1xuICAgICAgdGhpcy5fbDIzX2EgPSBNYXRoLnNxcnQodGhpcy5fbDIzXzJhID0gTWF0aC5wb3coeDIzICogeDIzICsgeTIzICogeTIzLCB0aGlzLl9hbHBoYSkpO1xuICAgIH1cblxuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl94MyA9IHgsIHRoaXMuX3kzID0geTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgdGhpcy5fY29udGV4dC5tb3ZlVG8odGhpcy5feDQgPSB4LCB0aGlzLl95NCA9IHkpOyBicmVhaztcbiAgICAgIGNhc2UgMjogdGhpcy5fcG9pbnQgPSAzOyB0aGlzLl94NSA9IHgsIHRoaXMuX3k1ID0geTsgYnJlYWs7XG4gICAgICBkZWZhdWx0OiBwb2ludCQyKHRoaXMsIHgsIHkpOyBicmVhaztcbiAgICB9XG5cbiAgICB0aGlzLl9sMDFfYSA9IHRoaXMuX2wxMl9hLCB0aGlzLl9sMTJfYSA9IHRoaXMuX2wyM19hO1xuICAgIHRoaXMuX2wwMV8yYSA9IHRoaXMuX2wxMl8yYSwgdGhpcy5fbDEyXzJhID0gdGhpcy5fbDIzXzJhO1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEsIHRoaXMuX3gxID0gdGhpcy5feDIsIHRoaXMuX3gyID0geDtcbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxLCB0aGlzLl95MSA9IHRoaXMuX3kyLCB0aGlzLl95MiA9IHk7XG4gIH1cbn07XG5cbnZhciBjYXRtdWxsUm9tQ2xvc2VkID0gKGZ1bmN0aW9uIGN1c3RvbShhbHBoYSkge1xuXG4gIGZ1bmN0aW9uIGNhdG11bGxSb20oY29udGV4dCkge1xuICAgIHJldHVybiBhbHBoYSA/IG5ldyBDYXRtdWxsUm9tQ2xvc2VkKGNvbnRleHQsIGFscGhhKSA6IG5ldyBDYXJkaW5hbENsb3NlZChjb250ZXh0LCAwKTtcbiAgfVxuXG4gIGNhdG11bGxSb20uYWxwaGEgPSBmdW5jdGlvbihhbHBoYSkge1xuICAgIHJldHVybiBjdXN0b20oK2FscGhhKTtcbiAgfTtcblxuICByZXR1cm4gY2F0bXVsbFJvbTtcbn0pKDAuNSk7XG5cbmZ1bmN0aW9uIENhdG11bGxSb21PcGVuKGNvbnRleHQsIGFscGhhKSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLl9hbHBoYSA9IGFscGhhO1xufVxuXG5DYXRtdWxsUm9tT3Blbi5wcm90b3R5cGUgPSB7XG4gIGFyZWFTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IDA7XG4gIH0sXG4gIGFyZWFFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSBOYU47XG4gIH0sXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSA9IHRoaXMuX3gyID1cbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxID0gdGhpcy5feTIgPSBOYU47XG4gICAgdGhpcy5fbDAxX2EgPSB0aGlzLl9sMTJfYSA9IHRoaXMuX2wyM19hID1cbiAgICB0aGlzLl9sMDFfMmEgPSB0aGlzLl9sMTJfMmEgPSB0aGlzLl9sMjNfMmEgPVxuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDMpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB4ID0gK3gsIHkgPSAreTtcblxuICAgIGlmICh0aGlzLl9wb2ludCkge1xuICAgICAgdmFyIHgyMyA9IHRoaXMuX3gyIC0geCxcbiAgICAgICAgICB5MjMgPSB0aGlzLl95MiAtIHk7XG4gICAgICB0aGlzLl9sMjNfYSA9IE1hdGguc3FydCh0aGlzLl9sMjNfMmEgPSBNYXRoLnBvdyh4MjMgKiB4MjMgKyB5MjMgKiB5MjMsIHRoaXMuX2FscGhhKSk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IGJyZWFrO1xuICAgICAgY2FzZSAxOiB0aGlzLl9wb2ludCA9IDI7IGJyZWFrO1xuICAgICAgY2FzZSAyOiB0aGlzLl9wb2ludCA9IDM7IHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh0aGlzLl94MiwgdGhpcy5feTIpIDogdGhpcy5fY29udGV4dC5tb3ZlVG8odGhpcy5feDIsIHRoaXMuX3kyKTsgYnJlYWs7XG4gICAgICBjYXNlIDM6IHRoaXMuX3BvaW50ID0gNDsgLy8gcHJvY2VlZFxuICAgICAgZGVmYXVsdDogcG9pbnQkMih0aGlzLCB4LCB5KTsgYnJlYWs7XG4gICAgfVxuXG4gICAgdGhpcy5fbDAxX2EgPSB0aGlzLl9sMTJfYSwgdGhpcy5fbDEyX2EgPSB0aGlzLl9sMjNfYTtcbiAgICB0aGlzLl9sMDFfMmEgPSB0aGlzLl9sMTJfMmEsIHRoaXMuX2wxMl8yYSA9IHRoaXMuX2wyM18yYTtcbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxLCB0aGlzLl94MSA9IHRoaXMuX3gyLCB0aGlzLl94MiA9IHg7XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSwgdGhpcy5feTEgPSB0aGlzLl95MiwgdGhpcy5feTIgPSB5O1xuICB9XG59O1xuXG52YXIgY2F0bXVsbFJvbU9wZW4gPSAoZnVuY3Rpb24gY3VzdG9tKGFscGhhKSB7XG5cbiAgZnVuY3Rpb24gY2F0bXVsbFJvbShjb250ZXh0KSB7XG4gICAgcmV0dXJuIGFscGhhID8gbmV3IENhdG11bGxSb21PcGVuKGNvbnRleHQsIGFscGhhKSA6IG5ldyBDYXJkaW5hbE9wZW4oY29udGV4dCwgMCk7XG4gIH1cblxuICBjYXRtdWxsUm9tLmFscGhhID0gZnVuY3Rpb24oYWxwaGEpIHtcbiAgICByZXR1cm4gY3VzdG9tKCthbHBoYSk7XG4gIH07XG5cbiAgcmV0dXJuIGNhdG11bGxSb207XG59KSgwLjUpO1xuXG5mdW5jdGlvbiBMaW5lYXJDbG9zZWQoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuTGluZWFyQ2xvc2VkLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBub29wLFxuICBhcmVhRW5kOiBub29wLFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3BvaW50KSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSAreCwgeSA9ICt5O1xuICAgIGlmICh0aGlzLl9wb2ludCkgdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSk7XG4gICAgZWxzZSB0aGlzLl9wb2ludCA9IDEsIHRoaXMuX2NvbnRleHQubW92ZVRvKHgsIHkpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBsaW5lYXJDbG9zZWQoY29udGV4dCkge1xuICByZXR1cm4gbmV3IExpbmVhckNsb3NlZChjb250ZXh0KTtcbn1cblxuZnVuY3Rpb24gc2lnbih4KSB7XG4gIHJldHVybiB4IDwgMCA/IC0xIDogMTtcbn1cblxuLy8gQ2FsY3VsYXRlIHRoZSBzbG9wZXMgb2YgdGhlIHRhbmdlbnRzIChIZXJtaXRlLXR5cGUgaW50ZXJwb2xhdGlvbikgYmFzZWQgb25cbi8vIHRoZSBmb2xsb3dpbmcgcGFwZXI6IFN0ZWZmZW4sIE0uIDE5OTAuIEEgU2ltcGxlIE1ldGhvZCBmb3IgTW9ub3RvbmljXG4vLyBJbnRlcnBvbGF0aW9uIGluIE9uZSBEaW1lbnNpb24uIEFzdHJvbm9teSBhbmQgQXN0cm9waHlzaWNzLCBWb2wuIDIzOSwgTk8uXG4vLyBOT1YoSUkpLCBQLiA0NDMsIDE5OTAuXG5mdW5jdGlvbiBzbG9wZTModGhhdCwgeDIsIHkyKSB7XG4gIHZhciBoMCA9IHRoYXQuX3gxIC0gdGhhdC5feDAsXG4gICAgICBoMSA9IHgyIC0gdGhhdC5feDEsXG4gICAgICBzMCA9ICh0aGF0Ll95MSAtIHRoYXQuX3kwKSAvIChoMCB8fCBoMSA8IDAgJiYgLTApLFxuICAgICAgczEgPSAoeTIgLSB0aGF0Ll95MSkgLyAoaDEgfHwgaDAgPCAwICYmIC0wKSxcbiAgICAgIHAgPSAoczAgKiBoMSArIHMxICogaDApIC8gKGgwICsgaDEpO1xuICByZXR1cm4gKHNpZ24oczApICsgc2lnbihzMSkpICogTWF0aC5taW4oTWF0aC5hYnMoczApLCBNYXRoLmFicyhzMSksIDAuNSAqIE1hdGguYWJzKHApKSB8fCAwO1xufVxuXG4vLyBDYWxjdWxhdGUgYSBvbmUtc2lkZWQgc2xvcGUuXG5mdW5jdGlvbiBzbG9wZTIodGhhdCwgdCkge1xuICB2YXIgaCA9IHRoYXQuX3gxIC0gdGhhdC5feDA7XG4gIHJldHVybiBoID8gKDMgKiAodGhhdC5feTEgLSB0aGF0Ll95MCkgLyBoIC0gdCkgLyAyIDogdDtcbn1cblxuLy8gQWNjb3JkaW5nIHRvIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0N1YmljX0hlcm1pdGVfc3BsaW5lI1JlcHJlc2VudGF0aW9uc1xuLy8gXCJ5b3UgY2FuIGV4cHJlc3MgY3ViaWMgSGVybWl0ZSBpbnRlcnBvbGF0aW9uIGluIHRlcm1zIG9mIGN1YmljIELDqXppZXIgY3VydmVzXG4vLyB3aXRoIHJlc3BlY3QgdG8gdGhlIGZvdXIgdmFsdWVzIHAwLCBwMCArIG0wIC8gMywgcDEgLSBtMSAvIDMsIHAxXCIuXG5mdW5jdGlvbiBwb2ludCQzKHRoYXQsIHQwLCB0MSkge1xuICB2YXIgeDAgPSB0aGF0Ll94MCxcbiAgICAgIHkwID0gdGhhdC5feTAsXG4gICAgICB4MSA9IHRoYXQuX3gxLFxuICAgICAgeTEgPSB0aGF0Ll95MSxcbiAgICAgIGR4ID0gKHgxIC0geDApIC8gMztcbiAgdGhhdC5fY29udGV4dC5iZXppZXJDdXJ2ZVRvKHgwICsgZHgsIHkwICsgZHggKiB0MCwgeDEgLSBkeCwgeTEgLSBkeCAqIHQxLCB4MSwgeTEpO1xufVxuXG5mdW5jdGlvbiBNb25vdG9uZVgoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuTW9ub3RvbmVYLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gMDtcbiAgfSxcbiAgYXJlYUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IE5hTjtcbiAgfSxcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxID1cbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxID1cbiAgICB0aGlzLl90MCA9IE5hTjtcbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMjogdGhpcy5fY29udGV4dC5saW5lVG8odGhpcy5feDEsIHRoaXMuX3kxKTsgYnJlYWs7XG4gICAgICBjYXNlIDM6IHBvaW50JDModGhpcywgdGhpcy5fdDAsIHNsb3BlMih0aGlzLCB0aGlzLl90MCkpOyBicmVhaztcbiAgICB9XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDEpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2YXIgdDEgPSBOYU47XG5cbiAgICB4ID0gK3gsIHkgPSAreTtcbiAgICBpZiAoeCA9PT0gdGhpcy5feDEgJiYgeSA9PT0gdGhpcy5feTEpIHJldHVybjsgLy8gSWdub3JlIGNvaW5jaWRlbnQgcG9pbnRzLlxuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl9saW5lID8gdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSkgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh4LCB5KTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgYnJlYWs7XG4gICAgICBjYXNlIDI6IHRoaXMuX3BvaW50ID0gMzsgcG9pbnQkMyh0aGlzLCBzbG9wZTIodGhpcywgdDEgPSBzbG9wZTModGhpcywgeCwgeSkpLCB0MSk7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogcG9pbnQkMyh0aGlzLCB0aGlzLl90MCwgdDEgPSBzbG9wZTModGhpcywgeCwgeSkpOyBicmVhaztcbiAgICB9XG5cbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxLCB0aGlzLl94MSA9IHg7XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSwgdGhpcy5feTEgPSB5O1xuICAgIHRoaXMuX3QwID0gdDE7XG4gIH1cbn1cblxuZnVuY3Rpb24gTW9ub3RvbmVZKGNvbnRleHQpIHtcbiAgdGhpcy5fY29udGV4dCA9IG5ldyBSZWZsZWN0Q29udGV4dChjb250ZXh0KTtcbn1cblxuKE1vbm90b25lWS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE1vbm90b25lWC5wcm90b3R5cGUpKS5wb2ludCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgTW9ub3RvbmVYLnByb3RvdHlwZS5wb2ludC5jYWxsKHRoaXMsIHksIHgpO1xufTtcblxuZnVuY3Rpb24gUmVmbGVjdENvbnRleHQoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuUmVmbGVjdENvbnRleHQucHJvdG90eXBlID0ge1xuICBtb3ZlVG86IGZ1bmN0aW9uKHgsIHkpIHsgdGhpcy5fY29udGV4dC5tb3ZlVG8oeSwgeCk7IH0sXG4gIGNsb3NlUGF0aDogZnVuY3Rpb24oKSB7IHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7IH0sXG4gIGxpbmVUbzogZnVuY3Rpb24oeCwgeSkgeyB0aGlzLl9jb250ZXh0LmxpbmVUbyh5LCB4KTsgfSxcbiAgYmV6aWVyQ3VydmVUbzogZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIHgsIHkpIHsgdGhpcy5fY29udGV4dC5iZXppZXJDdXJ2ZVRvKHkxLCB4MSwgeTIsIHgyLCB5LCB4KTsgfVxufTtcblxuZnVuY3Rpb24gbW9ub3RvbmVYKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBNb25vdG9uZVgoY29udGV4dCk7XG59XG5cbmZ1bmN0aW9uIG1vbm90b25lWShjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgTW9ub3RvbmVZKGNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiBOYXR1cmFsKGNvbnRleHQpIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG59XG5cbk5hdHVyYWwucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3ggPSBbXTtcbiAgICB0aGlzLl95ID0gW107XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gdGhpcy5feCxcbiAgICAgICAgeSA9IHRoaXMuX3ksXG4gICAgICAgIG4gPSB4Lmxlbmd0aDtcblxuICAgIGlmIChuKSB7XG4gICAgICB0aGlzLl9saW5lID8gdGhpcy5fY29udGV4dC5saW5lVG8oeFswXSwgeVswXSkgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh4WzBdLCB5WzBdKTtcbiAgICAgIGlmIChuID09PSAyKSB7XG4gICAgICAgIHRoaXMuX2NvbnRleHQubGluZVRvKHhbMV0sIHlbMV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHB4ID0gY29udHJvbFBvaW50cyh4KSxcbiAgICAgICAgICAgIHB5ID0gY29udHJvbFBvaW50cyh5KTtcbiAgICAgICAgZm9yICh2YXIgaTAgPSAwLCBpMSA9IDE7IGkxIDwgbjsgKytpMCwgKytpMSkge1xuICAgICAgICAgIHRoaXMuX2NvbnRleHQuYmV6aWVyQ3VydmVUbyhweFswXVtpMF0sIHB5WzBdW2kwXSwgcHhbMV1baTBdLCBweVsxXVtpMF0sIHhbaTFdLCB5W2kxXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fbGluZSB8fCAodGhpcy5fbGluZSAhPT0gMCAmJiBuID09PSAxKSkgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICB0aGlzLl9saW5lID0gMSAtIHRoaXMuX2xpbmU7XG4gICAgdGhpcy5feCA9IHRoaXMuX3kgPSBudWxsO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuX3gucHVzaCgreCk7XG4gICAgdGhpcy5feS5wdXNoKCt5KTtcbiAgfVxufTtcblxuLy8gU2VlIGh0dHBzOi8vd3d3LnBhcnRpY2xlaW5jZWxsLmNvbS8yMDEyL2Jlemllci1zcGxpbmVzLyBmb3IgZGVyaXZhdGlvbi5cbmZ1bmN0aW9uIGNvbnRyb2xQb2ludHMoeCkge1xuICB2YXIgaSxcbiAgICAgIG4gPSB4Lmxlbmd0aCAtIDEsXG4gICAgICBtLFxuICAgICAgYSA9IG5ldyBBcnJheShuKSxcbiAgICAgIGIgPSBuZXcgQXJyYXkobiksXG4gICAgICByID0gbmV3IEFycmF5KG4pO1xuICBhWzBdID0gMCwgYlswXSA9IDIsIHJbMF0gPSB4WzBdICsgMiAqIHhbMV07XG4gIGZvciAoaSA9IDE7IGkgPCBuIC0gMTsgKytpKSBhW2ldID0gMSwgYltpXSA9IDQsIHJbaV0gPSA0ICogeFtpXSArIDIgKiB4W2kgKyAxXTtcbiAgYVtuIC0gMV0gPSAyLCBiW24gLSAxXSA9IDcsIHJbbiAtIDFdID0gOCAqIHhbbiAtIDFdICsgeFtuXTtcbiAgZm9yIChpID0gMTsgaSA8IG47ICsraSkgbSA9IGFbaV0gLyBiW2kgLSAxXSwgYltpXSAtPSBtLCByW2ldIC09IG0gKiByW2kgLSAxXTtcbiAgYVtuIC0gMV0gPSByW24gLSAxXSAvIGJbbiAtIDFdO1xuICBmb3IgKGkgPSBuIC0gMjsgaSA+PSAwOyAtLWkpIGFbaV0gPSAocltpXSAtIGFbaSArIDFdKSAvIGJbaV07XG4gIGJbbiAtIDFdID0gKHhbbl0gKyBhW24gLSAxXSkgLyAyO1xuICBmb3IgKGkgPSAwOyBpIDwgbiAtIDE7ICsraSkgYltpXSA9IDIgKiB4W2kgKyAxXSAtIGFbaSArIDFdO1xuICByZXR1cm4gW2EsIGJdO1xufVxuXG5mdW5jdGlvbiBuYXR1cmFsKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBOYXR1cmFsKGNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiBTdGVwKGNvbnRleHQsIHQpIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuX3QgPSB0O1xufVxuXG5TdGVwLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gMDtcbiAgfSxcbiAgYXJlYUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IE5hTjtcbiAgfSxcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl94ID0gdGhpcy5feSA9IE5hTjtcbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICgwIDwgdGhpcy5fdCAmJiB0aGlzLl90IDwgMSAmJiB0aGlzLl9wb2ludCA9PT0gMikgdGhpcy5fY29udGV4dC5saW5lVG8odGhpcy5feCwgdGhpcy5feSk7XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDEpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIGlmICh0aGlzLl9saW5lID49IDApIHRoaXMuX3QgPSAxIC0gdGhpcy5fdCwgdGhpcy5fbGluZSA9IDEgLSB0aGlzLl9saW5lO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSAreCwgeSA9ICt5O1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl9saW5lID8gdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSkgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh4LCB5KTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgLy8gcHJvY2VlZFxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBpZiAodGhpcy5fdCA8PSAwKSB7XG4gICAgICAgICAgdGhpcy5fY29udGV4dC5saW5lVG8odGhpcy5feCwgeSk7XG4gICAgICAgICAgdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIHgxID0gdGhpcy5feCAqICgxIC0gdGhpcy5fdCkgKyB4ICogdGhpcy5fdDtcbiAgICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbyh4MSwgdGhpcy5feSk7XG4gICAgICAgICAgdGhpcy5fY29udGV4dC5saW5lVG8oeDEsIHkpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl94ID0geCwgdGhpcy5feSA9IHk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHN0ZXAoY29udGV4dCkge1xuICByZXR1cm4gbmV3IFN0ZXAoY29udGV4dCwgMC41KTtcbn1cblxuZnVuY3Rpb24gc3RlcEJlZm9yZShjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgU3RlcChjb250ZXh0LCAwKTtcbn1cblxuZnVuY3Rpb24gc3RlcEFmdGVyKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBTdGVwKGNvbnRleHQsIDEpO1xufVxuXG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbmZ1bmN0aW9uIG5vbmUoc2VyaWVzLCBvcmRlcikge1xuICBpZiAoISgobiA9IHNlcmllcy5sZW5ndGgpID4gMSkpIHJldHVybjtcbiAgZm9yICh2YXIgaSA9IDEsIHMwLCBzMSA9IHNlcmllc1tvcmRlclswXV0sIG4sIG0gPSBzMS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICBzMCA9IHMxLCBzMSA9IHNlcmllc1tvcmRlcltpXV07XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICAgIHMxW2pdWzFdICs9IHMxW2pdWzBdID0gaXNOYU4oczBbal1bMV0pID8gczBbal1bMF0gOiBzMFtqXVsxXTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9uZSQxKHNlcmllcykge1xuICB2YXIgbiA9IHNlcmllcy5sZW5ndGgsIG8gPSBuZXcgQXJyYXkobik7XG4gIHdoaWxlICgtLW4gPj0gMCkgb1tuXSA9IG47XG4gIHJldHVybiBvO1xufVxuXG5mdW5jdGlvbiBzdGFja1ZhbHVlKGQsIGtleSkge1xuICByZXR1cm4gZFtrZXldO1xufVxuXG5mdW5jdGlvbiBzdGFjaygpIHtcbiAgdmFyIGtleXMgPSBjb25zdGFudChbXSksXG4gICAgICBvcmRlciA9IG5vbmUkMSxcbiAgICAgIG9mZnNldCA9IG5vbmUsXG4gICAgICB2YWx1ZSA9IHN0YWNrVmFsdWU7XG5cbiAgZnVuY3Rpb24gc3RhY2soZGF0YSkge1xuICAgIHZhciBreiA9IGtleXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSxcbiAgICAgICAgaSxcbiAgICAgICAgbSA9IGRhdGEubGVuZ3RoLFxuICAgICAgICBuID0ga3oubGVuZ3RoLFxuICAgICAgICBzeiA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgb3o7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBmb3IgKHZhciBraSA9IGt6W2ldLCBzaSA9IHN6W2ldID0gbmV3IEFycmF5KG0pLCBqID0gMCwgc2lqOyBqIDwgbTsgKytqKSB7XG4gICAgICAgIHNpW2pdID0gc2lqID0gWzAsICt2YWx1ZShkYXRhW2pdLCBraSwgaiwgZGF0YSldO1xuICAgICAgICBzaWouZGF0YSA9IGRhdGFbal07XG4gICAgICB9XG4gICAgICBzaS5rZXkgPSBraTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwLCBveiA9IG9yZGVyKHN6KTsgaSA8IG47ICsraSkge1xuICAgICAgc3pbb3pbaV1dLmluZGV4ID0gaTtcbiAgICB9XG5cbiAgICBvZmZzZXQoc3osIG96KTtcbiAgICByZXR1cm4gc3o7XG4gIH1cblxuICBzdGFjay5rZXlzID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGtleXMgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KHNsaWNlLmNhbGwoXykpLCBzdGFjaykgOiBrZXlzO1xuICB9O1xuXG4gIHN0YWNrLnZhbHVlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHZhbHVlID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIHN0YWNrKSA6IHZhbHVlO1xuICB9O1xuXG4gIHN0YWNrLm9yZGVyID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKG9yZGVyID0gXyA9PSBudWxsID8gbm9uZSQxIDogdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudChzbGljZS5jYWxsKF8pKSwgc3RhY2spIDogb3JkZXI7XG4gIH07XG5cbiAgc3RhY2sub2Zmc2V0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKG9mZnNldCA9IF8gPT0gbnVsbCA/IG5vbmUgOiBfLCBzdGFjaykgOiBvZmZzZXQ7XG4gIH07XG5cbiAgcmV0dXJuIHN0YWNrO1xufVxuXG5mdW5jdGlvbiBleHBhbmQoc2VyaWVzLCBvcmRlcikge1xuICBpZiAoISgobiA9IHNlcmllcy5sZW5ndGgpID4gMCkpIHJldHVybjtcbiAgZm9yICh2YXIgaSwgbiwgaiA9IDAsIG0gPSBzZXJpZXNbMF0ubGVuZ3RoLCB5OyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh5ID0gaSA9IDA7IGkgPCBuOyArK2kpIHkgKz0gc2VyaWVzW2ldW2pdWzFdIHx8IDA7XG4gICAgaWYgKHkpIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHNlcmllc1tpXVtqXVsxXSAvPSB5O1xuICB9XG4gIG5vbmUoc2VyaWVzLCBvcmRlcik7XG59XG5cbmZ1bmN0aW9uIHNpbGhvdWV0dGUoc2VyaWVzLCBvcmRlcikge1xuICBpZiAoISgobiA9IHNlcmllcy5sZW5ndGgpID4gMCkpIHJldHVybjtcbiAgZm9yICh2YXIgaiA9IDAsIHMwID0gc2VyaWVzW29yZGVyWzBdXSwgbiwgbSA9IHMwLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGkgPSAwLCB5ID0gMDsgaSA8IG47ICsraSkgeSArPSBzZXJpZXNbaV1bal1bMV0gfHwgMDtcbiAgICBzMFtqXVsxXSArPSBzMFtqXVswXSA9IC15IC8gMjtcbiAgfVxuICBub25lKHNlcmllcywgb3JkZXIpO1xufVxuXG5mdW5jdGlvbiB3aWdnbGUoc2VyaWVzLCBvcmRlcikge1xuICBpZiAoISgobiA9IHNlcmllcy5sZW5ndGgpID4gMCkgfHwgISgobSA9IChzMCA9IHNlcmllc1tvcmRlclswXV0pLmxlbmd0aCkgPiAwKSkgcmV0dXJuO1xuICBmb3IgKHZhciB5ID0gMCwgaiA9IDEsIHMwLCBtLCBuOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIHMxID0gMCwgczIgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICB2YXIgc2kgPSBzZXJpZXNbb3JkZXJbaV1dLFxuICAgICAgICAgIHNpajAgPSBzaVtqXVsxXSB8fCAwLFxuICAgICAgICAgIHNpajEgPSBzaVtqIC0gMV1bMV0gfHwgMCxcbiAgICAgICAgICBzMyA9IChzaWowIC0gc2lqMSkgLyAyO1xuICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBpOyArK2spIHtcbiAgICAgICAgdmFyIHNrID0gc2VyaWVzW29yZGVyW2tdXSxcbiAgICAgICAgICAgIHNrajAgPSBza1tqXVsxXSB8fCAwLFxuICAgICAgICAgICAgc2tqMSA9IHNrW2ogLSAxXVsxXSB8fCAwO1xuICAgICAgICBzMyArPSBza2owIC0gc2tqMTtcbiAgICAgIH1cbiAgICAgIHMxICs9IHNpajAsIHMyICs9IHMzICogc2lqMDtcbiAgICB9XG4gICAgczBbaiAtIDFdWzFdICs9IHMwW2ogLSAxXVswXSA9IHk7XG4gICAgaWYgKHMxKSB5IC09IHMyIC8gczE7XG4gIH1cbiAgczBbaiAtIDFdWzFdICs9IHMwW2ogLSAxXVswXSA9IHk7XG4gIG5vbmUoc2VyaWVzLCBvcmRlcik7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhzZXJpZXMpIHtcbiAgdmFyIHN1bXMgPSBzZXJpZXMubWFwKHN1bSk7XG4gIHJldHVybiBub25lJDEoc2VyaWVzKS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIHN1bXNbYV0gLSBzdW1zW2JdOyB9KTtcbn1cblxuZnVuY3Rpb24gc3VtKHNlcmllcykge1xuICB2YXIgcyA9IDAsIGkgPSAtMSwgbiA9IHNlcmllcy5sZW5ndGgsIHY7XG4gIHdoaWxlICgrK2kgPCBuKSBpZiAodiA9ICtzZXJpZXNbaV1bMV0pIHMgKz0gdjtcbiAgcmV0dXJuIHM7XG59XG5cbmZ1bmN0aW9uIGRlc2NlbmRpbmckMShzZXJpZXMpIHtcbiAgcmV0dXJuIGFzY2VuZGluZyhzZXJpZXMpLnJldmVyc2UoKTtcbn1cblxuZnVuY3Rpb24gaW5zaWRlT3V0KHNlcmllcykge1xuICB2YXIgbiA9IHNlcmllcy5sZW5ndGgsXG4gICAgICBpLFxuICAgICAgaixcbiAgICAgIHN1bXMgPSBzZXJpZXMubWFwKHN1bSksXG4gICAgICBvcmRlciA9IG5vbmUkMShzZXJpZXMpLnNvcnQoZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gc3Vtc1tiXSAtIHN1bXNbYV07IH0pLFxuICAgICAgdG9wID0gMCxcbiAgICAgIGJvdHRvbSA9IDAsXG4gICAgICB0b3BzID0gW10sXG4gICAgICBib3R0b21zID0gW107XG5cbiAgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgIGogPSBvcmRlcltpXTtcbiAgICBpZiAodG9wIDwgYm90dG9tKSB7XG4gICAgICB0b3AgKz0gc3Vtc1tqXTtcbiAgICAgIHRvcHMucHVzaChqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYm90dG9tICs9IHN1bXNbal07XG4gICAgICBib3R0b21zLnB1c2goaik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJvdHRvbXMucmV2ZXJzZSgpLmNvbmNhdCh0b3BzKTtcbn1cblxuZnVuY3Rpb24gcmV2ZXJzZShzZXJpZXMpIHtcbiAgcmV0dXJuIG5vbmUkMShzZXJpZXMpLnJldmVyc2UoKTtcbn1cblxuZXhwb3J0cy5hcmMgPSBhcmM7XG5leHBvcnRzLmFyZWEgPSBhcmVhO1xuZXhwb3J0cy5saW5lID0gbGluZTtcbmV4cG9ydHMucGllID0gcGllO1xuZXhwb3J0cy5yYWRpYWxBcmVhID0gcmFkaWFsQXJlYTtcbmV4cG9ydHMucmFkaWFsTGluZSA9IHJhZGlhbExpbmUkMTtcbmV4cG9ydHMuc3ltYm9sID0gc3ltYm9sO1xuZXhwb3J0cy5zeW1ib2xzID0gc3ltYm9scztcbmV4cG9ydHMuc3ltYm9sQ2lyY2xlID0gY2lyY2xlO1xuZXhwb3J0cy5zeW1ib2xDcm9zcyA9IGNyb3NzO1xuZXhwb3J0cy5zeW1ib2xEaWFtb25kID0gZGlhbW9uZDtcbmV4cG9ydHMuc3ltYm9sU3F1YXJlID0gc3F1YXJlO1xuZXhwb3J0cy5zeW1ib2xTdGFyID0gc3RhcjtcbmV4cG9ydHMuc3ltYm9sVHJpYW5nbGUgPSB0cmlhbmdsZTtcbmV4cG9ydHMuc3ltYm9sV3llID0gd3llO1xuZXhwb3J0cy5jdXJ2ZUJhc2lzQ2xvc2VkID0gYmFzaXNDbG9zZWQ7XG5leHBvcnRzLmN1cnZlQmFzaXNPcGVuID0gYmFzaXNPcGVuO1xuZXhwb3J0cy5jdXJ2ZUJhc2lzID0gYmFzaXM7XG5leHBvcnRzLmN1cnZlQnVuZGxlID0gYnVuZGxlO1xuZXhwb3J0cy5jdXJ2ZUNhcmRpbmFsQ2xvc2VkID0gY2FyZGluYWxDbG9zZWQ7XG5leHBvcnRzLmN1cnZlQ2FyZGluYWxPcGVuID0gY2FyZGluYWxPcGVuO1xuZXhwb3J0cy5jdXJ2ZUNhcmRpbmFsID0gY2FyZGluYWw7XG5leHBvcnRzLmN1cnZlQ2F0bXVsbFJvbUNsb3NlZCA9IGNhdG11bGxSb21DbG9zZWQ7XG5leHBvcnRzLmN1cnZlQ2F0bXVsbFJvbU9wZW4gPSBjYXRtdWxsUm9tT3BlbjtcbmV4cG9ydHMuY3VydmVDYXRtdWxsUm9tID0gY2F0bXVsbFJvbTtcbmV4cG9ydHMuY3VydmVMaW5lYXJDbG9zZWQgPSBsaW5lYXJDbG9zZWQ7XG5leHBvcnRzLmN1cnZlTGluZWFyID0gY3VydmVMaW5lYXI7XG5leHBvcnRzLmN1cnZlTW9ub3RvbmVYID0gbW9ub3RvbmVYO1xuZXhwb3J0cy5jdXJ2ZU1vbm90b25lWSA9IG1vbm90b25lWTtcbmV4cG9ydHMuY3VydmVOYXR1cmFsID0gbmF0dXJhbDtcbmV4cG9ydHMuY3VydmVTdGVwID0gc3RlcDtcbmV4cG9ydHMuY3VydmVTdGVwQWZ0ZXIgPSBzdGVwQWZ0ZXI7XG5leHBvcnRzLmN1cnZlU3RlcEJlZm9yZSA9IHN0ZXBCZWZvcmU7XG5leHBvcnRzLnN0YWNrID0gc3RhY2s7XG5leHBvcnRzLnN0YWNrT2Zmc2V0RXhwYW5kID0gZXhwYW5kO1xuZXhwb3J0cy5zdGFja09mZnNldE5vbmUgPSBub25lO1xuZXhwb3J0cy5zdGFja09mZnNldFNpbGhvdWV0dGUgPSBzaWxob3VldHRlO1xuZXhwb3J0cy5zdGFja09mZnNldFdpZ2dsZSA9IHdpZ2dsZTtcbmV4cG9ydHMuc3RhY2tPcmRlckFzY2VuZGluZyA9IGFzY2VuZGluZztcbmV4cG9ydHMuc3RhY2tPcmRlckRlc2NlbmRpbmcgPSBkZXNjZW5kaW5nJDE7XG5leHBvcnRzLnN0YWNrT3JkZXJJbnNpZGVPdXQgPSBpbnNpZGVPdXQ7XG5leHBvcnRzLnN0YWNrT3JkZXJOb25lID0gbm9uZSQxO1xuZXhwb3J0cy5zdGFja09yZGVyUmV2ZXJzZSA9IHJldmVyc2U7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7IiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy10aW1lLWZvcm1hdC8gVmVyc2lvbiAyLjAuNS4gQ29weXJpZ2h0IDIwMTcgTWlrZSBCb3N0b2NrLlxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzLCByZXF1aXJlKCdkMy10aW1lJykpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cycsICdkMy10aW1lJ10sIGZhY3RvcnkpIDpcblx0KGZhY3RvcnkoKGdsb2JhbC5kMyA9IGdsb2JhbC5kMyB8fCB7fSksZ2xvYmFsLmQzKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cyxkM1RpbWUpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBsb2NhbERhdGUoZCkge1xuICBpZiAoMCA8PSBkLnkgJiYgZC55IDwgMTAwKSB7XG4gICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgtMSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCk7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihkLnkpO1xuICAgIHJldHVybiBkYXRlO1xuICB9XG4gIHJldHVybiBuZXcgRGF0ZShkLnksIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpO1xufVxuXG5mdW5jdGlvbiB1dGNEYXRlKGQpIHtcbiAgaWYgKDAgPD0gZC55ICYmIGQueSA8IDEwMCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoRGF0ZS5VVEMoLTEsIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpKTtcbiAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKGQueSk7XG4gICAgcmV0dXJuIGRhdGU7XG4gIH1cbiAgcmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKGQueSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCkpO1xufVxuXG5mdW5jdGlvbiBuZXdZZWFyKHkpIHtcbiAgcmV0dXJuIHt5OiB5LCBtOiAwLCBkOiAxLCBIOiAwLCBNOiAwLCBTOiAwLCBMOiAwfTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TG9jYWxlKGxvY2FsZSkge1xuICB2YXIgbG9jYWxlX2RhdGVUaW1lID0gbG9jYWxlLmRhdGVUaW1lLFxuICAgICAgbG9jYWxlX2RhdGUgPSBsb2NhbGUuZGF0ZSxcbiAgICAgIGxvY2FsZV90aW1lID0gbG9jYWxlLnRpbWUsXG4gICAgICBsb2NhbGVfcGVyaW9kcyA9IGxvY2FsZS5wZXJpb2RzLFxuICAgICAgbG9jYWxlX3dlZWtkYXlzID0gbG9jYWxlLmRheXMsXG4gICAgICBsb2NhbGVfc2hvcnRXZWVrZGF5cyA9IGxvY2FsZS5zaG9ydERheXMsXG4gICAgICBsb2NhbGVfbW9udGhzID0gbG9jYWxlLm1vbnRocyxcbiAgICAgIGxvY2FsZV9zaG9ydE1vbnRocyA9IGxvY2FsZS5zaG9ydE1vbnRocztcblxuICB2YXIgcGVyaW9kUmUgPSBmb3JtYXRSZShsb2NhbGVfcGVyaW9kcyksXG4gICAgICBwZXJpb2RMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX3BlcmlvZHMpLFxuICAgICAgd2Vla2RheVJlID0gZm9ybWF0UmUobG9jYWxlX3dlZWtkYXlzKSxcbiAgICAgIHdlZWtkYXlMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX3dlZWtkYXlzKSxcbiAgICAgIHNob3J0V2Vla2RheVJlID0gZm9ybWF0UmUobG9jYWxlX3Nob3J0V2Vla2RheXMpLFxuICAgICAgc2hvcnRXZWVrZGF5TG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9zaG9ydFdlZWtkYXlzKSxcbiAgICAgIG1vbnRoUmUgPSBmb3JtYXRSZShsb2NhbGVfbW9udGhzKSxcbiAgICAgIG1vbnRoTG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9tb250aHMpLFxuICAgICAgc2hvcnRNb250aFJlID0gZm9ybWF0UmUobG9jYWxlX3Nob3J0TW9udGhzKSxcbiAgICAgIHNob3J0TW9udGhMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX3Nob3J0TW9udGhzKTtcblxuICB2YXIgZm9ybWF0cyA9IHtcbiAgICBcImFcIjogZm9ybWF0U2hvcnRXZWVrZGF5LFxuICAgIFwiQVwiOiBmb3JtYXRXZWVrZGF5LFxuICAgIFwiYlwiOiBmb3JtYXRTaG9ydE1vbnRoLFxuICAgIFwiQlwiOiBmb3JtYXRNb250aCxcbiAgICBcImNcIjogbnVsbCxcbiAgICBcImRcIjogZm9ybWF0RGF5T2ZNb250aCxcbiAgICBcImVcIjogZm9ybWF0RGF5T2ZNb250aCxcbiAgICBcIkhcIjogZm9ybWF0SG91cjI0LFxuICAgIFwiSVwiOiBmb3JtYXRIb3VyMTIsXG4gICAgXCJqXCI6IGZvcm1hdERheU9mWWVhcixcbiAgICBcIkxcIjogZm9ybWF0TWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBmb3JtYXRNb250aE51bWJlcixcbiAgICBcIk1cIjogZm9ybWF0TWludXRlcyxcbiAgICBcInBcIjogZm9ybWF0UGVyaW9kLFxuICAgIFwiU1wiOiBmb3JtYXRTZWNvbmRzLFxuICAgIFwiVVwiOiBmb3JtYXRXZWVrTnVtYmVyU3VuZGF5LFxuICAgIFwid1wiOiBmb3JtYXRXZWVrZGF5TnVtYmVyLFxuICAgIFwiV1wiOiBmb3JtYXRXZWVrTnVtYmVyTW9uZGF5LFxuICAgIFwieFwiOiBudWxsLFxuICAgIFwiWFwiOiBudWxsLFxuICAgIFwieVwiOiBmb3JtYXRZZWFyLFxuICAgIFwiWVwiOiBmb3JtYXRGdWxsWWVhcixcbiAgICBcIlpcIjogZm9ybWF0Wm9uZSxcbiAgICBcIiVcIjogZm9ybWF0TGl0ZXJhbFBlcmNlbnRcbiAgfTtcblxuICB2YXIgdXRjRm9ybWF0cyA9IHtcbiAgICBcImFcIjogZm9ybWF0VVRDU2hvcnRXZWVrZGF5LFxuICAgIFwiQVwiOiBmb3JtYXRVVENXZWVrZGF5LFxuICAgIFwiYlwiOiBmb3JtYXRVVENTaG9ydE1vbnRoLFxuICAgIFwiQlwiOiBmb3JtYXRVVENNb250aCxcbiAgICBcImNcIjogbnVsbCxcbiAgICBcImRcIjogZm9ybWF0VVRDRGF5T2ZNb250aCxcbiAgICBcImVcIjogZm9ybWF0VVRDRGF5T2ZNb250aCxcbiAgICBcIkhcIjogZm9ybWF0VVRDSG91cjI0LFxuICAgIFwiSVwiOiBmb3JtYXRVVENIb3VyMTIsXG4gICAgXCJqXCI6IGZvcm1hdFVUQ0RheU9mWWVhcixcbiAgICBcIkxcIjogZm9ybWF0VVRDTWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBmb3JtYXRVVENNb250aE51bWJlcixcbiAgICBcIk1cIjogZm9ybWF0VVRDTWludXRlcyxcbiAgICBcInBcIjogZm9ybWF0VVRDUGVyaW9kLFxuICAgIFwiU1wiOiBmb3JtYXRVVENTZWNvbmRzLFxuICAgIFwiVVwiOiBmb3JtYXRVVENXZWVrTnVtYmVyU3VuZGF5LFxuICAgIFwid1wiOiBmb3JtYXRVVENXZWVrZGF5TnVtYmVyLFxuICAgIFwiV1wiOiBmb3JtYXRVVENXZWVrTnVtYmVyTW9uZGF5LFxuICAgIFwieFwiOiBudWxsLFxuICAgIFwiWFwiOiBudWxsLFxuICAgIFwieVwiOiBmb3JtYXRVVENZZWFyLFxuICAgIFwiWVwiOiBmb3JtYXRVVENGdWxsWWVhcixcbiAgICBcIlpcIjogZm9ybWF0VVRDWm9uZSxcbiAgICBcIiVcIjogZm9ybWF0TGl0ZXJhbFBlcmNlbnRcbiAgfTtcblxuICB2YXIgcGFyc2VzID0ge1xuICAgIFwiYVwiOiBwYXJzZVNob3J0V2Vla2RheSxcbiAgICBcIkFcIjogcGFyc2VXZWVrZGF5LFxuICAgIFwiYlwiOiBwYXJzZVNob3J0TW9udGgsXG4gICAgXCJCXCI6IHBhcnNlTW9udGgsXG4gICAgXCJjXCI6IHBhcnNlTG9jYWxlRGF0ZVRpbWUsXG4gICAgXCJkXCI6IHBhcnNlRGF5T2ZNb250aCxcbiAgICBcImVcIjogcGFyc2VEYXlPZk1vbnRoLFxuICAgIFwiSFwiOiBwYXJzZUhvdXIyNCxcbiAgICBcIklcIjogcGFyc2VIb3VyMjQsXG4gICAgXCJqXCI6IHBhcnNlRGF5T2ZZZWFyLFxuICAgIFwiTFwiOiBwYXJzZU1pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogcGFyc2VNb250aE51bWJlcixcbiAgICBcIk1cIjogcGFyc2VNaW51dGVzLFxuICAgIFwicFwiOiBwYXJzZVBlcmlvZCxcbiAgICBcIlNcIjogcGFyc2VTZWNvbmRzLFxuICAgIFwiVVwiOiBwYXJzZVdlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJ3XCI6IHBhcnNlV2Vla2RheU51bWJlcixcbiAgICBcIldcIjogcGFyc2VXZWVrTnVtYmVyTW9uZGF5LFxuICAgIFwieFwiOiBwYXJzZUxvY2FsZURhdGUsXG4gICAgXCJYXCI6IHBhcnNlTG9jYWxlVGltZSxcbiAgICBcInlcIjogcGFyc2VZZWFyLFxuICAgIFwiWVwiOiBwYXJzZUZ1bGxZZWFyLFxuICAgIFwiWlwiOiBwYXJzZVpvbmUsXG4gICAgXCIlXCI6IHBhcnNlTGl0ZXJhbFBlcmNlbnRcbiAgfTtcblxuICAvLyBUaGVzZSByZWN1cnNpdmUgZGlyZWN0aXZlIGRlZmluaXRpb25zIG11c3QgYmUgZGVmZXJyZWQuXG4gIGZvcm1hdHMueCA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZSwgZm9ybWF0cyk7XG4gIGZvcm1hdHMuWCA9IG5ld0Zvcm1hdChsb2NhbGVfdGltZSwgZm9ybWF0cyk7XG4gIGZvcm1hdHMuYyA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZVRpbWUsIGZvcm1hdHMpO1xuICB1dGNGb3JtYXRzLnggPSBuZXdGb3JtYXQobG9jYWxlX2RhdGUsIHV0Y0Zvcm1hdHMpO1xuICB1dGNGb3JtYXRzLlggPSBuZXdGb3JtYXQobG9jYWxlX3RpbWUsIHV0Y0Zvcm1hdHMpO1xuICB1dGNGb3JtYXRzLmMgPSBuZXdGb3JtYXQobG9jYWxlX2RhdGVUaW1lLCB1dGNGb3JtYXRzKTtcblxuICBmdW5jdGlvbiBuZXdGb3JtYXQoc3BlY2lmaWVyLCBmb3JtYXRzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgIHZhciBzdHJpbmcgPSBbXSxcbiAgICAgICAgICBpID0gLTEsXG4gICAgICAgICAgaiA9IDAsXG4gICAgICAgICAgbiA9IHNwZWNpZmllci5sZW5ndGgsXG4gICAgICAgICAgYyxcbiAgICAgICAgICBwYWQsXG4gICAgICAgICAgZm9ybWF0O1xuXG4gICAgICBpZiAoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpIGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSk7XG5cbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGlmIChzcGVjaWZpZXIuY2hhckNvZGVBdChpKSA9PT0gMzcpIHtcbiAgICAgICAgICBzdHJpbmcucHVzaChzcGVjaWZpZXIuc2xpY2UoaiwgaSkpO1xuICAgICAgICAgIGlmICgocGFkID0gcGFkc1tjID0gc3BlY2lmaWVyLmNoYXJBdCgrK2kpXSkgIT0gbnVsbCkgYyA9IHNwZWNpZmllci5jaGFyQXQoKytpKTtcbiAgICAgICAgICBlbHNlIHBhZCA9IGMgPT09IFwiZVwiID8gXCIgXCIgOiBcIjBcIjtcbiAgICAgICAgICBpZiAoZm9ybWF0ID0gZm9ybWF0c1tjXSkgYyA9IGZvcm1hdChkYXRlLCBwYWQpO1xuICAgICAgICAgIHN0cmluZy5wdXNoKGMpO1xuICAgICAgICAgIGogPSBpICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzdHJpbmcucHVzaChzcGVjaWZpZXIuc2xpY2UoaiwgaSkpO1xuICAgICAgcmV0dXJuIHN0cmluZy5qb2luKFwiXCIpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBuZXdQYXJzZShzcGVjaWZpZXIsIG5ld0RhdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICB2YXIgZCA9IG5ld1llYXIoMTkwMCksXG4gICAgICAgICAgaSA9IHBhcnNlU3BlY2lmaWVyKGQsIHNwZWNpZmllciwgc3RyaW5nICs9IFwiXCIsIDApO1xuICAgICAgaWYgKGkgIT0gc3RyaW5nLmxlbmd0aCkgcmV0dXJuIG51bGw7XG5cbiAgICAgIC8vIFRoZSBhbS1wbSBmbGFnIGlzIDAgZm9yIEFNLCBhbmQgMSBmb3IgUE0uXG4gICAgICBpZiAoXCJwXCIgaW4gZCkgZC5IID0gZC5IICUgMTIgKyBkLnAgKiAxMjtcblxuICAgICAgLy8gQ29udmVydCBkYXktb2Ytd2VlayBhbmQgd2Vlay1vZi15ZWFyIHRvIGRheS1vZi15ZWFyLlxuICAgICAgaWYgKFwiV1wiIGluIGQgfHwgXCJVXCIgaW4gZCkge1xuICAgICAgICBpZiAoIShcIndcIiBpbiBkKSkgZC53ID0gXCJXXCIgaW4gZCA/IDEgOiAwO1xuICAgICAgICB2YXIgZGF5ID0gXCJaXCIgaW4gZCA/IHV0Y0RhdGUobmV3WWVhcihkLnkpKS5nZXRVVENEYXkoKSA6IG5ld0RhdGUobmV3WWVhcihkLnkpKS5nZXREYXkoKTtcbiAgICAgICAgZC5tID0gMDtcbiAgICAgICAgZC5kID0gXCJXXCIgaW4gZCA/IChkLncgKyA2KSAlIDcgKyBkLlcgKiA3IC0gKGRheSArIDUpICUgNyA6IGQudyArIGQuVSAqIDcgLSAoZGF5ICsgNikgJSA3O1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBhIHRpbWUgem9uZSBpcyBzcGVjaWZpZWQsIGFsbCBmaWVsZHMgYXJlIGludGVycHJldGVkIGFzIFVUQyBhbmQgdGhlblxuICAgICAgLy8gb2Zmc2V0IGFjY29yZGluZyB0byB0aGUgc3BlY2lmaWVkIHRpbWUgem9uZS5cbiAgICAgIGlmIChcIlpcIiBpbiBkKSB7XG4gICAgICAgIGQuSCArPSBkLlogLyAxMDAgfCAwO1xuICAgICAgICBkLk0gKz0gZC5aICUgMTAwO1xuICAgICAgICByZXR1cm4gdXRjRGF0ZShkKTtcbiAgICAgIH1cblxuICAgICAgLy8gT3RoZXJ3aXNlLCBhbGwgZmllbGRzIGFyZSBpbiBsb2NhbCB0aW1lLlxuICAgICAgcmV0dXJuIG5ld0RhdGUoZCk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlU3BlY2lmaWVyKGQsIHNwZWNpZmllciwgc3RyaW5nLCBqKSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBuID0gc3BlY2lmaWVyLmxlbmd0aCxcbiAgICAgICAgbSA9IHN0cmluZy5sZW5ndGgsXG4gICAgICAgIGMsXG4gICAgICAgIHBhcnNlO1xuXG4gICAgd2hpbGUgKGkgPCBuKSB7XG4gICAgICBpZiAoaiA+PSBtKSByZXR1cm4gLTE7XG4gICAgICBjID0gc3BlY2lmaWVyLmNoYXJDb2RlQXQoaSsrKTtcbiAgICAgIGlmIChjID09PSAzNykge1xuICAgICAgICBjID0gc3BlY2lmaWVyLmNoYXJBdChpKyspO1xuICAgICAgICBwYXJzZSA9IHBhcnNlc1tjIGluIHBhZHMgPyBzcGVjaWZpZXIuY2hhckF0KGkrKykgOiBjXTtcbiAgICAgICAgaWYgKCFwYXJzZSB8fCAoKGogPSBwYXJzZShkLCBzdHJpbmcsIGopKSA8IDApKSByZXR1cm4gLTE7XG4gICAgICB9IGVsc2UgaWYgKGMgIT0gc3RyaW5nLmNoYXJDb2RlQXQoaisrKSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGo7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVBlcmlvZChkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHBlcmlvZFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLnAgPSBwZXJpb2RMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VTaG9ydFdlZWtkYXkoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBzaG9ydFdlZWtkYXlSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC53ID0gc2hvcnRXZWVrZGF5TG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlV2Vla2RheShkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHdlZWtkYXlSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC53ID0gd2Vla2RheUxvb2t1cFtuWzBdLnRvTG93ZXJDYXNlKCldLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVNob3J0TW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBzaG9ydE1vbnRoUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQubSA9IHNob3J0TW9udGhMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VNb250aChkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IG1vbnRoUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQubSA9IG1vbnRoTG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlRGF0ZVRpbWUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV9kYXRlVGltZSwgc3RyaW5nLCBpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlRGF0ZShkLCBzdHJpbmcsIGkpIHtcbiAgICByZXR1cm4gcGFyc2VTcGVjaWZpZXIoZCwgbG9jYWxlX2RhdGUsIHN0cmluZywgaSk7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUxvY2FsZVRpbWUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV90aW1lLCBzdHJpbmcsIGkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0U2hvcnRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0V2Vla2RheXNbZC5nZXREYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3dlZWtkYXlzW2QuZ2V0RGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0U2hvcnRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydE1vbnRoc1tkLmdldE1vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0TW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfbW9udGhzW2QuZ2V0TW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRQZXJpb2QoZCkge1xuICAgIHJldHVybiBsb2NhbGVfcGVyaW9kc1srKGQuZ2V0SG91cnMoKSA+PSAxMildO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDU2hvcnRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0V2Vla2RheXNbZC5nZXRVVENEYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3dlZWtkYXlzW2QuZ2V0VVRDRGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDU2hvcnRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydE1vbnRoc1tkLmdldFVUQ01vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDTW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfbW9udGhzW2QuZ2V0VVRDTW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENQZXJpb2QoZCkge1xuICAgIHJldHVybiBsb2NhbGVfcGVyaW9kc1srKGQuZ2V0VVRDSG91cnMoKSA+PSAxMildO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmb3JtYXQ6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIGYgPSBuZXdGb3JtYXQoc3BlY2lmaWVyICs9IFwiXCIsIGZvcm1hdHMpO1xuICAgICAgZi50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIGY7XG4gICAgfSxcbiAgICBwYXJzZTogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgcCA9IG5ld1BhcnNlKHNwZWNpZmllciArPSBcIlwiLCBsb2NhbERhdGUpO1xuICAgICAgcC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIHA7XG4gICAgfSxcbiAgICB1dGNGb3JtYXQ6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIGYgPSBuZXdGb3JtYXQoc3BlY2lmaWVyICs9IFwiXCIsIHV0Y0Zvcm1hdHMpO1xuICAgICAgZi50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIGY7XG4gICAgfSxcbiAgICB1dGNQYXJzZTogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgcCA9IG5ld1BhcnNlKHNwZWNpZmllciwgdXRjRGF0ZSk7XG4gICAgICBwLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBzcGVjaWZpZXI7IH07XG4gICAgICByZXR1cm4gcDtcbiAgICB9XG4gIH07XG59XG5cbnZhciBwYWRzID0ge1wiLVwiOiBcIlwiLCBcIl9cIjogXCIgXCIsIFwiMFwiOiBcIjBcIn07XG52YXIgbnVtYmVyUmUgPSAvXlxccypcXGQrLztcbnZhciBwZXJjZW50UmUgPSAvXiUvO1xudmFyIHJlcXVvdGVSZSA9IC9bXFxcXFxcXlxcJFxcKlxcK1xcP1xcfFxcW1xcXVxcKFxcKVxcLlxce1xcfV0vZztcblxuZnVuY3Rpb24gcGFkKHZhbHVlLCBmaWxsLCB3aWR0aCkge1xuICB2YXIgc2lnbiA9IHZhbHVlIDwgMCA/IFwiLVwiIDogXCJcIixcbiAgICAgIHN0cmluZyA9IChzaWduID8gLXZhbHVlIDogdmFsdWUpICsgXCJcIixcbiAgICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gIHJldHVybiBzaWduICsgKGxlbmd0aCA8IHdpZHRoID8gbmV3IEFycmF5KHdpZHRoIC0gbGVuZ3RoICsgMSkuam9pbihmaWxsKSArIHN0cmluZyA6IHN0cmluZyk7XG59XG5cbmZ1bmN0aW9uIHJlcXVvdGUocykge1xuICByZXR1cm4gcy5yZXBsYWNlKHJlcXVvdGVSZSwgXCJcXFxcJCZcIik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFJlKG5hbWVzKSB7XG4gIHJldHVybiBuZXcgUmVnRXhwKFwiXig/OlwiICsgbmFtZXMubWFwKHJlcXVvdGUpLmpvaW4oXCJ8XCIpICsgXCIpXCIsIFwiaVwiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TG9va3VwKG5hbWVzKSB7XG4gIHZhciBtYXAgPSB7fSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICB3aGlsZSAoKytpIDwgbikgbWFwW25hbWVzW2ldLnRvTG93ZXJDYXNlKCldID0gaTtcbiAgcmV0dXJuIG1hcDtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrZGF5TnVtYmVyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAxKSk7XG4gIHJldHVybiBuID8gKGQudyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla051bWJlclN1bmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gIHJldHVybiBuID8gKGQuVSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla051bWJlck1vbmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gIHJldHVybiBuID8gKGQuVyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRnVsbFllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDQpKTtcbiAgcmV0dXJuIG4gPyAoZC55ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VZZWFyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQueSA9ICtuWzBdICsgKCtuWzBdID4gNjggPyAxOTAwIDogMjAwMCksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2Vab25lKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IC9eKFopfChbKy1dXFxkXFxkKSg/OlxcOj8oXFxkXFxkKSk/Ly5leGVjKHN0cmluZy5zbGljZShpLCBpICsgNikpO1xuICByZXR1cm4gbiA/IChkLlogPSBuWzFdID8gMCA6IC0oblsyXSArIChuWzNdIHx8IFwiMDBcIikpLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTW9udGhOdW1iZXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5tID0gblswXSAtIDEsIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VEYXlPZk1vbnRoKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuZCA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRGF5T2ZZZWFyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAzKSk7XG4gIHJldHVybiBuID8gKGQubSA9IDAsIGQuZCA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlSG91cjI0KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuSCA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTWludXRlcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLk0gPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVNlY29uZHMoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5TID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNaWxsaXNlY29uZHMoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDMpKTtcbiAgcmV0dXJuIG4gPyAoZC5MID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VMaXRlcmFsUGVyY2VudChkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBwZXJjZW50UmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDEpKTtcbiAgcmV0dXJuIG4gPyBpICsgblswXS5sZW5ndGggOiAtMTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RGF5T2ZNb250aChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXREYXRlKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRIb3VyMjQoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0SG91cnMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEhvdXIxMihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRIb3VycygpICUgMTIgfHwgMTIsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXlPZlllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKDEgKyBkM1RpbWUudGltZURheS5jb3VudChkM1RpbWUudGltZVllYXIoZCksIGQpLCBwLCAzKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWlsbGlzZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldE1pbGxpc2Vjb25kcygpLCBwLCAzKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TW9udGhOdW1iZXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0TW9udGgoKSArIDEsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNaW51dGVzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldE1pbnV0ZXMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFNlY29uZHMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0U2Vjb25kcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla051bWJlclN1bmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQoZDNUaW1lLnRpbWVTdW5kYXkuY291bnQoZDNUaW1lLnRpbWVZZWFyKGQpLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtkYXlOdW1iZXIoZCkge1xuICByZXR1cm4gZC5nZXREYXkoKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla051bWJlck1vbmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQoZDNUaW1lLnRpbWVNb25kYXkuY291bnQoZDNUaW1lLnRpbWVZZWFyKGQpLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0RnVsbFllYXIoKSAlIDEwMCwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEZ1bGxZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldEZ1bGxZZWFyKCkgJSAxMDAwMCwgcCwgNCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFpvbmUoZCkge1xuICB2YXIgeiA9IGQuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgcmV0dXJuICh6ID4gMCA/IFwiLVwiIDogKHogKj0gLTEsIFwiK1wiKSlcbiAgICAgICsgcGFkKHogLyA2MCB8IDAsIFwiMFwiLCAyKVxuICAgICAgKyBwYWQoeiAlIDYwLCBcIjBcIiwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0RheU9mTW9udGgoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDRGF0ZSgpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDSG91cjI0KGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0hvdXJzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENIb3VyMTIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDSG91cnMoKSAlIDEyIHx8IDEyLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDRGF5T2ZZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZCgxICsgZDNUaW1lLnV0Y0RheS5jb3VudChkM1RpbWUudXRjWWVhcihkKSwgZCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNaWxsaXNlY29uZHMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDTWlsbGlzZWNvbmRzKCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNb250aE51bWJlcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNb250aCgpICsgMSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pbnV0ZXMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDTWludXRlcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDU2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENTZWNvbmRzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrTnVtYmVyU3VuZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZChkM1RpbWUudXRjU3VuZGF5LmNvdW50KGQzVGltZS51dGNZZWFyKGQpLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXIoZCkge1xuICByZXR1cm4gZC5nZXRVVENEYXkoKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla051bWJlck1vbmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQoZDNUaW1lLnV0Y01vbmRheS5jb3VudChkM1RpbWUudXRjWWVhcihkKSwgZCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0Z1bGxZZWFyKCkgJSAxMDAsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENGdWxsWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENGdWxsWWVhcigpICUgMTAwMDAsIHAsIDQpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENab25lKCkge1xuICByZXR1cm4gXCIrMDAwMFwiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRMaXRlcmFsUGVyY2VudCgpIHtcbiAgcmV0dXJuIFwiJVwiO1xufVxuXG52YXIgbG9jYWxlJDE7XG5cblxuXG5cblxuZGVmYXVsdExvY2FsZSh7XG4gIGRhdGVUaW1lOiBcIiV4LCAlWFwiLFxuICBkYXRlOiBcIiUtbS8lLWQvJVlcIixcbiAgdGltZTogXCIlLUk6JU06JVMgJXBcIixcbiAgcGVyaW9kczogW1wiQU1cIiwgXCJQTVwiXSxcbiAgZGF5czogW1wiU3VuZGF5XCIsIFwiTW9uZGF5XCIsIFwiVHVlc2RheVwiLCBcIldlZG5lc2RheVwiLCBcIlRodXJzZGF5XCIsIFwiRnJpZGF5XCIsIFwiU2F0dXJkYXlcIl0sXG4gIHNob3J0RGF5czogW1wiU3VuXCIsIFwiTW9uXCIsIFwiVHVlXCIsIFwiV2VkXCIsIFwiVGh1XCIsIFwiRnJpXCIsIFwiU2F0XCJdLFxuICBtb250aHM6IFtcIkphbnVhcnlcIiwgXCJGZWJydWFyeVwiLCBcIk1hcmNoXCIsIFwiQXByaWxcIiwgXCJNYXlcIiwgXCJKdW5lXCIsIFwiSnVseVwiLCBcIkF1Z3VzdFwiLCBcIlNlcHRlbWJlclwiLCBcIk9jdG9iZXJcIiwgXCJOb3ZlbWJlclwiLCBcIkRlY2VtYmVyXCJdLFxuICBzaG9ydE1vbnRoczogW1wiSmFuXCIsIFwiRmViXCIsIFwiTWFyXCIsIFwiQXByXCIsIFwiTWF5XCIsIFwiSnVuXCIsIFwiSnVsXCIsIFwiQXVnXCIsIFwiU2VwXCIsIFwiT2N0XCIsIFwiTm92XCIsIFwiRGVjXCJdXG59KTtcblxuZnVuY3Rpb24gZGVmYXVsdExvY2FsZShkZWZpbml0aW9uKSB7XG4gIGxvY2FsZSQxID0gZm9ybWF0TG9jYWxlKGRlZmluaXRpb24pO1xuICBleHBvcnRzLnRpbWVGb3JtYXQgPSBsb2NhbGUkMS5mb3JtYXQ7XG4gIGV4cG9ydHMudGltZVBhcnNlID0gbG9jYWxlJDEucGFyc2U7XG4gIGV4cG9ydHMudXRjRm9ybWF0ID0gbG9jYWxlJDEudXRjRm9ybWF0O1xuICBleHBvcnRzLnV0Y1BhcnNlID0gbG9jYWxlJDEudXRjUGFyc2U7XG4gIHJldHVybiBsb2NhbGUkMTtcbn1cblxudmFyIGlzb1NwZWNpZmllciA9IFwiJVktJW0tJWRUJUg6JU06JVMuJUxaXCI7XG5cbmZ1bmN0aW9uIGZvcm1hdElzb05hdGl2ZShkYXRlKSB7XG4gIHJldHVybiBkYXRlLnRvSVNPU3RyaW5nKCk7XG59XG5cbnZhciBmb3JtYXRJc28gPSBEYXRlLnByb3RvdHlwZS50b0lTT1N0cmluZ1xuICAgID8gZm9ybWF0SXNvTmF0aXZlXG4gICAgOiBleHBvcnRzLnV0Y0Zvcm1hdChpc29TcGVjaWZpZXIpO1xuXG5mdW5jdGlvbiBwYXJzZUlzb05hdGl2ZShzdHJpbmcpIHtcbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZShzdHJpbmcpO1xuICByZXR1cm4gaXNOYU4oZGF0ZSkgPyBudWxsIDogZGF0ZTtcbn1cblxudmFyIHBhcnNlSXNvID0gK25ldyBEYXRlKFwiMjAwMC0wMS0wMVQwMDowMDowMC4wMDBaXCIpXG4gICAgPyBwYXJzZUlzb05hdGl2ZVxuICAgIDogZXhwb3J0cy51dGNQYXJzZShpc29TcGVjaWZpZXIpO1xuXG5leHBvcnRzLnRpbWVGb3JtYXREZWZhdWx0TG9jYWxlID0gZGVmYXVsdExvY2FsZTtcbmV4cG9ydHMudGltZUZvcm1hdExvY2FsZSA9IGZvcm1hdExvY2FsZTtcbmV4cG9ydHMuaXNvRm9ybWF0ID0gZm9ybWF0SXNvO1xuZXhwb3J0cy5pc29QYXJzZSA9IHBhcnNlSXNvO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSkpO1xuIiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy10aW1lLyBWZXJzaW9uIDEuMC42LiBDb3B5cmlnaHQgMjAxNyBNaWtlIEJvc3RvY2suXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuXHR0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG5cdChmYWN0b3J5KChnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cbnZhciB0MCA9IG5ldyBEYXRlO1xudmFyIHQxID0gbmV3IERhdGU7XG5cbmZ1bmN0aW9uIG5ld0ludGVydmFsKGZsb29yaSwgb2Zmc2V0aSwgY291bnQsIGZpZWxkKSB7XG5cbiAgZnVuY3Rpb24gaW50ZXJ2YWwoZGF0ZSkge1xuICAgIHJldHVybiBmbG9vcmkoZGF0ZSA9IG5ldyBEYXRlKCtkYXRlKSksIGRhdGU7XG4gIH1cblxuICBpbnRlcnZhbC5mbG9vciA9IGludGVydmFsO1xuXG4gIGludGVydmFsLmNlaWwgPSBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGZsb29yaShkYXRlID0gbmV3IERhdGUoZGF0ZSAtIDEpKSwgb2Zmc2V0aShkYXRlLCAxKSwgZmxvb3JpKGRhdGUpLCBkYXRlO1xuICB9O1xuXG4gIGludGVydmFsLnJvdW5kID0gZnVuY3Rpb24oZGF0ZSkge1xuICAgIHZhciBkMCA9IGludGVydmFsKGRhdGUpLFxuICAgICAgICBkMSA9IGludGVydmFsLmNlaWwoZGF0ZSk7XG4gICAgcmV0dXJuIGRhdGUgLSBkMCA8IGQxIC0gZGF0ZSA/IGQwIDogZDE7XG4gIH07XG5cbiAgaW50ZXJ2YWwub2Zmc2V0ID0gZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIHJldHVybiBvZmZzZXRpKGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSksIHN0ZXAgPT0gbnVsbCA/IDEgOiBNYXRoLmZsb29yKHN0ZXApKSwgZGF0ZTtcbiAgfTtcblxuICBpbnRlcnZhbC5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgdmFyIHJhbmdlID0gW107XG4gICAgc3RhcnQgPSBpbnRlcnZhbC5jZWlsKHN0YXJ0KTtcbiAgICBzdGVwID0gc3RlcCA9PSBudWxsID8gMSA6IE1hdGguZmxvb3Ioc3RlcCk7XG4gICAgaWYgKCEoc3RhcnQgPCBzdG9wKSB8fCAhKHN0ZXAgPiAwKSkgcmV0dXJuIHJhbmdlOyAvLyBhbHNvIGhhbmRsZXMgSW52YWxpZCBEYXRlXG4gICAgZG8gcmFuZ2UucHVzaChuZXcgRGF0ZSgrc3RhcnQpKTsgd2hpbGUgKG9mZnNldGkoc3RhcnQsIHN0ZXApLCBmbG9vcmkoc3RhcnQpLCBzdGFydCA8IHN0b3ApXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIGludGVydmFsLmZpbHRlciA9IGZ1bmN0aW9uKHRlc3QpIHtcbiAgICByZXR1cm4gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgaWYgKGRhdGUgPj0gZGF0ZSkgd2hpbGUgKGZsb29yaShkYXRlKSwgIXRlc3QoZGF0ZSkpIGRhdGUuc2V0VGltZShkYXRlIC0gMSk7XG4gICAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgICAgaWYgKGRhdGUgPj0gZGF0ZSkgd2hpbGUgKC0tc3RlcCA+PSAwKSB3aGlsZSAob2Zmc2V0aShkYXRlLCAxKSwgIXRlc3QoZGF0ZSkpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcbiAgICB9KTtcbiAgfTtcblxuICBpZiAoY291bnQpIHtcbiAgICBpbnRlcnZhbC5jb3VudCA9IGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICAgIHQwLnNldFRpbWUoK3N0YXJ0KSwgdDEuc2V0VGltZSgrZW5kKTtcbiAgICAgIGZsb29yaSh0MCksIGZsb29yaSh0MSk7XG4gICAgICByZXR1cm4gTWF0aC5mbG9vcihjb3VudCh0MCwgdDEpKTtcbiAgICB9O1xuXG4gICAgaW50ZXJ2YWwuZXZlcnkgPSBmdW5jdGlvbihzdGVwKSB7XG4gICAgICBzdGVwID0gTWF0aC5mbG9vcihzdGVwKTtcbiAgICAgIHJldHVybiAhaXNGaW5pdGUoc3RlcCkgfHwgIShzdGVwID4gMCkgPyBudWxsXG4gICAgICAgICAgOiAhKHN0ZXAgPiAxKSA/IGludGVydmFsXG4gICAgICAgICAgOiBpbnRlcnZhbC5maWx0ZXIoZmllbGRcbiAgICAgICAgICAgICAgPyBmdW5jdGlvbihkKSB7IHJldHVybiBmaWVsZChkKSAlIHN0ZXAgPT09IDA7IH1cbiAgICAgICAgICAgICAgOiBmdW5jdGlvbihkKSB7IHJldHVybiBpbnRlcnZhbC5jb3VudCgwLCBkKSAlIHN0ZXAgPT09IDA7IH0pO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gaW50ZXJ2YWw7XG59XG5cbnZhciBtaWxsaXNlY29uZCA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKCkge1xuICAvLyBub29wXG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gZW5kIC0gc3RhcnQ7XG59KTtcblxuLy8gQW4gb3B0aW1pemVkIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIHNpbXBsZSBjYXNlLlxubWlsbGlzZWNvbmQuZXZlcnkgPSBmdW5jdGlvbihrKSB7XG4gIGsgPSBNYXRoLmZsb29yKGspO1xuICBpZiAoIWlzRmluaXRlKGspIHx8ICEoayA+IDApKSByZXR1cm4gbnVsbDtcbiAgaWYgKCEoayA+IDEpKSByZXR1cm4gbWlsbGlzZWNvbmQ7XG4gIHJldHVybiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoZGF0ZSAvIGspICogayk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogayk7XG4gIH0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGs7XG4gIH0pO1xufTtcblxudmFyIG1pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kLnJhbmdlO1xuXG52YXIgZHVyYXRpb25TZWNvbmQgPSAxZTM7XG52YXIgZHVyYXRpb25NaW51dGUgPSA2ZTQ7XG52YXIgZHVyYXRpb25Ib3VyID0gMzZlNTtcbnZhciBkdXJhdGlvbkRheSA9IDg2NGU1O1xudmFyIGR1cmF0aW9uV2VlayA9IDYwNDhlNTtcblxudmFyIHNlY29uZCA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoZGF0ZSAvIGR1cmF0aW9uU2Vjb25kKSAqIGR1cmF0aW9uU2Vjb25kKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uU2Vjb25kKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvblNlY29uZDtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDU2Vjb25kcygpO1xufSk7XG5cbnZhciBzZWNvbmRzID0gc2Vjb25kLnJhbmdlO1xuXG52YXIgbWludXRlID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFRpbWUoTWF0aC5mbG9vcihkYXRlIC8gZHVyYXRpb25NaW51dGUpICogZHVyYXRpb25NaW51dGUpO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25NaW51dGUpO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uTWludXRlO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRNaW51dGVzKCk7XG59KTtcblxudmFyIG1pbnV0ZXMgPSBtaW51dGUucmFuZ2U7XG5cbnZhciBob3VyID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICB2YXIgb2Zmc2V0ID0gZGF0ZS5nZXRUaW1lem9uZU9mZnNldCgpICogZHVyYXRpb25NaW51dGUgJSBkdXJhdGlvbkhvdXI7XG4gIGlmIChvZmZzZXQgPCAwKSBvZmZzZXQgKz0gZHVyYXRpb25Ib3VyO1xuICBkYXRlLnNldFRpbWUoTWF0aC5mbG9vcigoK2RhdGUgLSBvZmZzZXQpIC8gZHVyYXRpb25Ib3VyKSAqIGR1cmF0aW9uSG91ciArIG9mZnNldCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbkhvdXIpO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uSG91cjtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0SG91cnMoKTtcbn0pO1xuXG52YXIgaG91cnMgPSBob3VyLnJhbmdlO1xuXG52YXIgZGF5ID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCAtIChlbmQuZ2V0VGltZXpvbmVPZmZzZXQoKSAtIHN0YXJ0LmdldFRpbWV6b25lT2Zmc2V0KCkpICogZHVyYXRpb25NaW51dGUpIC8gZHVyYXRpb25EYXk7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldERhdGUoKSAtIDE7XG59KTtcblxudmFyIGRheXMgPSBkYXkucmFuZ2U7XG5cbmZ1bmN0aW9uIHdlZWtkYXkoaSkge1xuICByZXR1cm4gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSAtIChkYXRlLmdldERheSgpICsgNyAtIGkpICUgNyk7XG4gICAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIHN0ZXAgKiA3KTtcbiAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQgLSAoZW5kLmdldFRpbWV6b25lT2Zmc2V0KCkgLSBzdGFydC5nZXRUaW1lem9uZU9mZnNldCgpKSAqIGR1cmF0aW9uTWludXRlKSAvIGR1cmF0aW9uV2VlaztcbiAgfSk7XG59XG5cbnZhciBzdW5kYXkgPSB3ZWVrZGF5KDApO1xudmFyIG1vbmRheSA9IHdlZWtkYXkoMSk7XG52YXIgdHVlc2RheSA9IHdlZWtkYXkoMik7XG52YXIgd2VkbmVzZGF5ID0gd2Vla2RheSgzKTtcbnZhciB0aHVyc2RheSA9IHdlZWtkYXkoNCk7XG52YXIgZnJpZGF5ID0gd2Vla2RheSg1KTtcbnZhciBzYXR1cmRheSA9IHdlZWtkYXkoNik7XG5cbnZhciBzdW5kYXlzID0gc3VuZGF5LnJhbmdlO1xudmFyIG1vbmRheXMgPSBtb25kYXkucmFuZ2U7XG52YXIgdHVlc2RheXMgPSB0dWVzZGF5LnJhbmdlO1xudmFyIHdlZG5lc2RheXMgPSB3ZWRuZXNkYXkucmFuZ2U7XG52YXIgdGh1cnNkYXlzID0gdGh1cnNkYXkucmFuZ2U7XG52YXIgZnJpZGF5cyA9IGZyaWRheS5yYW5nZTtcbnZhciBzYXR1cmRheXMgPSBzYXR1cmRheS5yYW5nZTtcblxudmFyIG1vbnRoID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldERhdGUoMSk7XG4gIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0TW9udGgoZGF0ZS5nZXRNb250aCgpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiBlbmQuZ2V0TW9udGgoKSAtIHN0YXJ0LmdldE1vbnRoKCkgKyAoZW5kLmdldEZ1bGxZZWFyKCkgLSBzdGFydC5nZXRGdWxsWWVhcigpKSAqIDEyO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRNb250aCgpO1xufSk7XG5cbnZhciBtb250aHMgPSBtb250aC5yYW5nZTtcblxudmFyIHllYXIgPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0TW9udGgoMCwgMSk7XG4gIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0RnVsbFllYXIoZGF0ZS5nZXRGdWxsWWVhcigpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiBlbmQuZ2V0RnVsbFllYXIoKSAtIHN0YXJ0LmdldEZ1bGxZZWFyKCk7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldEZ1bGxZZWFyKCk7XG59KTtcblxuLy8gQW4gb3B0aW1pemVkIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIHNpbXBsZSBjYXNlLlxueWVhci5ldmVyeSA9IGZ1bmN0aW9uKGspIHtcbiAgcmV0dXJuICFpc0Zpbml0ZShrID0gTWF0aC5mbG9vcihrKSkgfHwgIShrID4gMCkgPyBudWxsIDogbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0RnVsbFllYXIoTWF0aC5mbG9vcihkYXRlLmdldEZ1bGxZZWFyKCkgLyBrKSAqIGspO1xuICAgIGRhdGUuc2V0TW9udGgoMCwgMSk7XG4gICAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0RnVsbFllYXIoZGF0ZS5nZXRGdWxsWWVhcigpICsgc3RlcCAqIGspO1xuICB9KTtcbn07XG5cbnZhciB5ZWFycyA9IHllYXIucmFuZ2U7XG5cbnZhciB1dGNNaW51dGUgPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VVRDU2Vjb25kcygwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uTWludXRlKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbk1pbnV0ZTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDTWludXRlcygpO1xufSk7XG5cbnZhciB1dGNNaW51dGVzID0gdXRjTWludXRlLnJhbmdlO1xuXG52YXIgdXRjSG91ciA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENNaW51dGVzKDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25Ib3VyKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkhvdXI7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ0hvdXJzKCk7XG59KTtcblxudmFyIHV0Y0hvdXJzID0gdXRjSG91ci5yYW5nZTtcblxudmFyIHV0Y0RheSA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25EYXk7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ0RhdGUoKSAtIDE7XG59KTtcblxudmFyIHV0Y0RheXMgPSB1dGNEYXkucmFuZ2U7XG5cbmZ1bmN0aW9uIHV0Y1dlZWtkYXkoaSkge1xuICByZXR1cm4gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSAtIChkYXRlLmdldFVUQ0RheSgpICsgNyAtIGkpICUgNyk7XG4gICAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSArIHN0ZXAgKiA3KTtcbiAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25XZWVrO1xuICB9KTtcbn1cblxudmFyIHV0Y1N1bmRheSA9IHV0Y1dlZWtkYXkoMCk7XG52YXIgdXRjTW9uZGF5ID0gdXRjV2Vla2RheSgxKTtcbnZhciB1dGNUdWVzZGF5ID0gdXRjV2Vla2RheSgyKTtcbnZhciB1dGNXZWRuZXNkYXkgPSB1dGNXZWVrZGF5KDMpO1xudmFyIHV0Y1RodXJzZGF5ID0gdXRjV2Vla2RheSg0KTtcbnZhciB1dGNGcmlkYXkgPSB1dGNXZWVrZGF5KDUpO1xudmFyIHV0Y1NhdHVyZGF5ID0gdXRjV2Vla2RheSg2KTtcblxudmFyIHV0Y1N1bmRheXMgPSB1dGNTdW5kYXkucmFuZ2U7XG52YXIgdXRjTW9uZGF5cyA9IHV0Y01vbmRheS5yYW5nZTtcbnZhciB1dGNUdWVzZGF5cyA9IHV0Y1R1ZXNkYXkucmFuZ2U7XG52YXIgdXRjV2VkbmVzZGF5cyA9IHV0Y1dlZG5lc2RheS5yYW5nZTtcbnZhciB1dGNUaHVyc2RheXMgPSB1dGNUaHVyc2RheS5yYW5nZTtcbnZhciB1dGNGcmlkYXlzID0gdXRjRnJpZGF5LnJhbmdlO1xudmFyIHV0Y1NhdHVyZGF5cyA9IHV0Y1NhdHVyZGF5LnJhbmdlO1xuXG52YXIgdXRjTW9udGggPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VVRDRGF0ZSgxKTtcbiAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRVVENNb250aChkYXRlLmdldFVUQ01vbnRoKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRVVENNb250aCgpIC0gc3RhcnQuZ2V0VVRDTW9udGgoKSArIChlbmQuZ2V0VVRDRnVsbFllYXIoKSAtIHN0YXJ0LmdldFVUQ0Z1bGxZZWFyKCkpICogMTI7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ01vbnRoKCk7XG59KTtcblxudmFyIHV0Y01vbnRocyA9IHV0Y01vbnRoLnJhbmdlO1xuXG52YXIgdXRjWWVhciA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENNb250aCgwLCAxKTtcbiAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRVVENGdWxsWWVhcihkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRVVENGdWxsWWVhcigpIC0gc3RhcnQuZ2V0VVRDRnVsbFllYXIoKTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDRnVsbFllYXIoKTtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG51dGNZZWFyLmV2ZXJ5ID0gZnVuY3Rpb24oaykge1xuICByZXR1cm4gIWlzRmluaXRlKGsgPSBNYXRoLmZsb29yKGspKSB8fCAhKGsgPiAwKSA/IG51bGwgOiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihNYXRoLmZsb29yKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSAvIGspICogayk7XG4gICAgZGF0ZS5zZXRVVENNb250aCgwLCAxKTtcbiAgICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgKyBzdGVwICogayk7XG4gIH0pO1xufTtcblxudmFyIHV0Y1llYXJzID0gdXRjWWVhci5yYW5nZTtcblxuZXhwb3J0cy50aW1lSW50ZXJ2YWwgPSBuZXdJbnRlcnZhbDtcbmV4cG9ydHMudGltZU1pbGxpc2Vjb25kID0gbWlsbGlzZWNvbmQ7XG5leHBvcnRzLnRpbWVNaWxsaXNlY29uZHMgPSBtaWxsaXNlY29uZHM7XG5leHBvcnRzLnV0Y01pbGxpc2Vjb25kID0gbWlsbGlzZWNvbmQ7XG5leHBvcnRzLnV0Y01pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kcztcbmV4cG9ydHMudGltZVNlY29uZCA9IHNlY29uZDtcbmV4cG9ydHMudGltZVNlY29uZHMgPSBzZWNvbmRzO1xuZXhwb3J0cy51dGNTZWNvbmQgPSBzZWNvbmQ7XG5leHBvcnRzLnV0Y1NlY29uZHMgPSBzZWNvbmRzO1xuZXhwb3J0cy50aW1lTWludXRlID0gbWludXRlO1xuZXhwb3J0cy50aW1lTWludXRlcyA9IG1pbnV0ZXM7XG5leHBvcnRzLnRpbWVIb3VyID0gaG91cjtcbmV4cG9ydHMudGltZUhvdXJzID0gaG91cnM7XG5leHBvcnRzLnRpbWVEYXkgPSBkYXk7XG5leHBvcnRzLnRpbWVEYXlzID0gZGF5cztcbmV4cG9ydHMudGltZVdlZWsgPSBzdW5kYXk7XG5leHBvcnRzLnRpbWVXZWVrcyA9IHN1bmRheXM7XG5leHBvcnRzLnRpbWVTdW5kYXkgPSBzdW5kYXk7XG5leHBvcnRzLnRpbWVTdW5kYXlzID0gc3VuZGF5cztcbmV4cG9ydHMudGltZU1vbmRheSA9IG1vbmRheTtcbmV4cG9ydHMudGltZU1vbmRheXMgPSBtb25kYXlzO1xuZXhwb3J0cy50aW1lVHVlc2RheSA9IHR1ZXNkYXk7XG5leHBvcnRzLnRpbWVUdWVzZGF5cyA9IHR1ZXNkYXlzO1xuZXhwb3J0cy50aW1lV2VkbmVzZGF5ID0gd2VkbmVzZGF5O1xuZXhwb3J0cy50aW1lV2VkbmVzZGF5cyA9IHdlZG5lc2RheXM7XG5leHBvcnRzLnRpbWVUaHVyc2RheSA9IHRodXJzZGF5O1xuZXhwb3J0cy50aW1lVGh1cnNkYXlzID0gdGh1cnNkYXlzO1xuZXhwb3J0cy50aW1lRnJpZGF5ID0gZnJpZGF5O1xuZXhwb3J0cy50aW1lRnJpZGF5cyA9IGZyaWRheXM7XG5leHBvcnRzLnRpbWVTYXR1cmRheSA9IHNhdHVyZGF5O1xuZXhwb3J0cy50aW1lU2F0dXJkYXlzID0gc2F0dXJkYXlzO1xuZXhwb3J0cy50aW1lTW9udGggPSBtb250aDtcbmV4cG9ydHMudGltZU1vbnRocyA9IG1vbnRocztcbmV4cG9ydHMudGltZVllYXIgPSB5ZWFyO1xuZXhwb3J0cy50aW1lWWVhcnMgPSB5ZWFycztcbmV4cG9ydHMudXRjTWludXRlID0gdXRjTWludXRlO1xuZXhwb3J0cy51dGNNaW51dGVzID0gdXRjTWludXRlcztcbmV4cG9ydHMudXRjSG91ciA9IHV0Y0hvdXI7XG5leHBvcnRzLnV0Y0hvdXJzID0gdXRjSG91cnM7XG5leHBvcnRzLnV0Y0RheSA9IHV0Y0RheTtcbmV4cG9ydHMudXRjRGF5cyA9IHV0Y0RheXM7XG5leHBvcnRzLnV0Y1dlZWsgPSB1dGNTdW5kYXk7XG5leHBvcnRzLnV0Y1dlZWtzID0gdXRjU3VuZGF5cztcbmV4cG9ydHMudXRjU3VuZGF5ID0gdXRjU3VuZGF5O1xuZXhwb3J0cy51dGNTdW5kYXlzID0gdXRjU3VuZGF5cztcbmV4cG9ydHMudXRjTW9uZGF5ID0gdXRjTW9uZGF5O1xuZXhwb3J0cy51dGNNb25kYXlzID0gdXRjTW9uZGF5cztcbmV4cG9ydHMudXRjVHVlc2RheSA9IHV0Y1R1ZXNkYXk7XG5leHBvcnRzLnV0Y1R1ZXNkYXlzID0gdXRjVHVlc2RheXM7XG5leHBvcnRzLnV0Y1dlZG5lc2RheSA9IHV0Y1dlZG5lc2RheTtcbmV4cG9ydHMudXRjV2VkbmVzZGF5cyA9IHV0Y1dlZG5lc2RheXM7XG5leHBvcnRzLnV0Y1RodXJzZGF5ID0gdXRjVGh1cnNkYXk7XG5leHBvcnRzLnV0Y1RodXJzZGF5cyA9IHV0Y1RodXJzZGF5cztcbmV4cG9ydHMudXRjRnJpZGF5ID0gdXRjRnJpZGF5O1xuZXhwb3J0cy51dGNGcmlkYXlzID0gdXRjRnJpZGF5cztcbmV4cG9ydHMudXRjU2F0dXJkYXkgPSB1dGNTYXR1cmRheTtcbmV4cG9ydHMudXRjU2F0dXJkYXlzID0gdXRjU2F0dXJkYXlzO1xuZXhwb3J0cy51dGNNb250aCA9IHV0Y01vbnRoO1xuZXhwb3J0cy51dGNNb250aHMgPSB1dGNNb250aHM7XG5leHBvcnRzLnV0Y1llYXIgPSB1dGNZZWFyO1xuZXhwb3J0cy51dGNZZWFycyA9IHV0Y1llYXJzO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSkpO1xuIl19
