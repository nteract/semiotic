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

        _this2.state = { annotations: [], lineType: "bumparea" };
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
            var frameHeight = 200;

            var displayData = testData;

            var exampleAnnotations = [{ x: 3, y: 3, type: "xy", label: "xy" }, { x: 4, id: "linedata-222", type: "xy", label: "xy ID" }, { x: 4, id: "linedata-3", type: "xy", label: "xy ID" }, { type: "enclose", rp: "top", rd: 25, coordinates: [{ x: 6, id: "linedata-3" }, { x: 6, id: "linedata-4" }], label: "enclose ID" }, { x: 3, y: 90, dy: -30, type: "x", label: "x" }, { x: { lineID: "line-1", pointID: "point-17" }, y: 90, dy: -30, type: "x", label: "x" }, { x: 240, y: 3, type: "y", label: "y" }, { type: "enclose", rp: "top", rd: 25, coordinates: [{ x: 1, y: 5 }, { x: 2, y: 8 }, { x: 2, y: 10 }], label: "enclose" }];

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlcy9zcmMvYXBwLmpzIiwiZXhhbXBsZXMvc3JjL2NvbXBvbmVudHMvQmFyTGluZUNoYXJ0RXhhbXBsZS5qcyIsImV4YW1wbGVzL3NyYy9jb21wb25lbnRzL0RpdmlkZWRMaW5lRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9EcmFnQW5kRHJvcEV4YW1wbGUuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9NYXJrRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9PUkZyYW1lQ29ubmVjdG9yRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9PUkZyYW1lR3JvdXBFeGFtcGxlcy5qcyIsImV4YW1wbGVzL3NyYy9jb21wb25lbnRzL09SRnJhbWVQaWVjZUV4YW1wbGVzLmpzIiwiZXhhbXBsZXMvc3JjL2NvbXBvbmVudHMvWFlBbm5vdGF0aW9uRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9YWUZyYW1lRXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9YWUZyYW1lRXhhbXBsZXNNaXNjLmpzIiwiZXhhbXBsZXMvc3JjL2NvbXBvbmVudHMvWFlGcmFtZVBvaW50RXhhbXBsZXMuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9YWUZyYW1lV2l0aE1pbmltYXBFeGFtcGxlcy5qcyIsIm5vZGVfbW9kdWxlcy9kMy1hcnJheS9idWlsZC9kMy1hcnJheS5qcyIsIm5vZGVfbW9kdWxlcy9kMy1jb2xsZWN0aW9uL2J1aWxkL2QzLWNvbGxlY3Rpb24uanMiLCJub2RlX21vZHVsZXMvZDMtY29sb3IvYnVpbGQvZDMtY29sb3IuanMiLCJub2RlX21vZHVsZXMvZDMtZm9ybWF0L2J1aWxkL2QzLWZvcm1hdC5qcyIsIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9idWlsZC9kMy1pbnRlcnBvbGF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9kMy1wYXRoL2J1aWxkL2QzLXBhdGguanMiLCJub2RlX21vZHVsZXMvZDMtcmFuZG9tL2J1aWxkL2QzLXJhbmRvbS5qcyIsIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9idWlsZC9kMy1zY2FsZS5qcyIsIm5vZGVfbW9kdWxlcy9kMy1zaGFwZS9idWlsZC9kMy1zaGFwZS5qcyIsIm5vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9idWlsZC9kMy10aW1lLWZvcm1hdC5qcyIsIm5vZGVfbW9kdWxlcy9kMy10aW1lL2J1aWxkL2QzLXRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0NBOzs7O0FBR0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQWhCQTtBQW1CQSxtQkFBUyxNQUFULENBQ0k7QUFBQTtBQUFBO0FBQ0ksNERBQWMsT0FBTSxNQUFwQjtBQURKLENBREosRUFJSSxTQUFTLGNBQVQsQ0FBd0IsZUFBeEIsQ0FKSjtBQWpCQTs7QUF3QkEsbUJBQVMsTUFBVCxDQUNJO0FBQUE7QUFBQTtBQUNJLGtFQUFvQixPQUFNLE1BQTFCO0FBREosQ0FESixFQUlJLFNBQVMsY0FBVCxDQUF3Qix3QkFBeEIsQ0FKSjs7QUFPQSxtQkFBUyxNQUFULENBQ0k7QUFBQTtBQUFBO0FBQ0ksbUVBQXFCLE9BQU0sY0FBM0I7QUFESixDQURKLEVBSUksU0FBUyxjQUFULENBQXdCLHNCQUF4QixDQUpKOztBQU9BLG1CQUFTLE1BQVQsQ0FDSTtBQUFBO0FBQUE7QUFDSSwrREFBaUIsT0FBTSxTQUF2QjtBQURKLENBREosRUFJSSxTQUFTLGNBQVQsQ0FBd0IsaUNBQXhCLENBSko7O0FBT0EsbUJBQVMsTUFBVCxDQUNJO0FBQUE7QUFBQTtBQUNJLG1FQUFxQixPQUFNLFNBQTNCO0FBREosQ0FESixFQUlJLFNBQVMsY0FB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QUFrRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRSxFQUFrRixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRixFQUFrRyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRyxDQUE1QyxFQURhLEVBRWIsRUFBRSxJQUFJLFlBQU4sRUFBb0IsT0FBTyxTQUEzQixFQUFzQyxNQUFNLENBQUUsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBRixFQUFrQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQixFQUFrQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQyxFQUFrRCxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRCxFQUFrRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRSxFQUFrRixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRixFQUFrRyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRyxDQUE1QyxFQUZhLEVBR2IsRUFBRSxJQUFJLFlBQU4sRUFBb0IsT0FBTyxTQUEzQixFQUFzQyxNQUFNLENBQUUsRUFBRSxHQUFHLEVBQUwsRUFBUyxHQUFHLENBQVosRUFBRixFQUFtQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuQixFQUFtQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuQyxFQUFtRCxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuRCxFQUFtRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuRSxFQUFtRixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuRixFQUFtRyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuRyxDQUE1QyxFQUhhLEVBSWIsRUFBRSxJQUFJLFlBQU4sRUFBb0IsT0FBTyxTQUEzQixFQUFzQyxNQUFNLENBQUUsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBRixFQUFrQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQixFQUFrQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQyxFQUFrRCxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRCxFQUFrRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRSxFQUFrRixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRixFQUFrRyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRyxDQUE1QyxFQUphLENBQWpCOztJQU9NLFE7OztBQUNKLHNCQUFZLEtBQVosRUFBbUI7QUFBQTs7QUFBQSx3SEFDWCxLQURXOztBQUVqQixjQUFLLEtBQUwsR0FBYSxFQUFFLE9BQU8sRUFBVCxFQUFhLE1BQU0sR0FBbkIsRUFBYjtBQUNBLGNBQUssWUFBTCxHQUFvQixNQUFLLFlBQUwsQ0FBa0IsSUFBbEIsT0FBcEI7QUFDQSxjQUFLLFVBQUwsR0FBa0IsTUFBSyxVQUFMLENBQWdCLElBQWhCLE9BQWxCO0FBQ0EsY0FBSyxZQUFMLEdBQW9CLE1BQUssWUFBTCxDQUFrQixJQUFsQixPQUFwQjtBQUxpQjtBQU1sQjs7OztxQ0FFWSxLLEVBQU87QUFDbEIsaUJBQUssUUFBTCxDQUFjLEVBQUUsT0FBTyxNQUFNLE1BQU4sQ0FBYSxLQUF0QixFQUFkO0FBQ0Q7OzttQ0FFVSxLLEVBQU87QUFDaEIsaUJBQUssUUFBTCxDQUFjLEVBQUUsTUFBTSxNQUFNLE1BQU4sQ0FBYSxLQUFyQixFQUFkO0FBQ0Q7OztxQ0FFWSxLLEVBQU87QUFDbEIsa0JBQU0sY0FBTjtBQUNBO0FBQ0E7QUFDQSxpQkFBSyxLQUFMLENBQVcsaUJBQVgsQ0FBNkIsU0FBYyxFQUFkLEVBQWtCLEtBQUssS0FBTCxDQUFXLFNBQTdCLEVBQXdDLEVBQUUsTUFBTSxLQUFLLEtBQUwsQ0FBVyxJQUFuQixFQUF5QixPQUFPLEtBQUssS0FBTCxDQUFXLEtBQTNDLEVBQXhDLENBQTdCO0FBQ0Q7OztpQ0FFUTtBQUNQLG1CQUFPO0FBQUE7QUFBQSxrQkFBTSxPQUFPLEVBQUUsWUFBWSxTQUFkLEVBQWIsRUFBd0MsVUFBVSxLQUFLLFlBQXZEO0FBQ0g7QUFBQTtBQUFBO0FBQUkseUJBQUssS0FBTCxDQUFXLFNBQVgsQ0FBcUIsQ0FBekI7QUFBQTtBQUE2Qix5QkFBSyxLQUFMLENBQVcsU0FBWCxDQUFxQjtBQUFsRCxpQkFERztBQUVIO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRkc7QUFHSCx5REFBTyxNQUFLLE1BQVosRUFBbUIsT0FBTyxLQUFLLEtBQUwsQ0FBVyxLQUFyQyxFQUE0QyxVQUFVLEtBQUssWUFBM0QsR0FIRztBQUlIO0FBQUE7QUFBQSxzQkFBUSxPQUFPLEtBQUssS0FBTCxDQUFXLElBQTFCLEVBQWdDLFVBQVUsS0FBSyxVQUEvQztBQUNJO0FBQUE7QUFBQSwwQkFBUSxPQUFNLEdBQWQsRUFBa0IsT0FBTSxHQUF4QjtBQUFBO0FBQUEscUJBREo7QUFFSTtBQUFBO0FBQUEsMEJBQVEsT0FBTSxHQUFkLEVBQWtCLE9BQU0sR0FBeEI7QUFBQTtBQUFBLHFCQUZKO0FBR0k7QUFBQTtBQUFBLDBCQUFRLE9BQU0sSUFBZCxFQUFtQixPQUFNLElBQXpCO0FBQUE7QUFBQTtBQUhKLGlCQUpHO0FBU0gseURBQU8sTUFBSyxRQUFaLEVBQXFCLE9BQU0sUUFBM0I7QUFURyxhQUFQO0FBV0Q7Ozs7RUFwQ29CLGdCQUFNLFM7O0lBd0N2QixlOzs7QUFDRiw2QkFBWSxLQUFaLEVBQWtCO0FBQUE7O0FBQUEsdUlBQ1IsS0FEUTs7QUFFZCxlQUFLLFVBQUwsR0FBa0IsT0FBSyxVQUFMLENBQWdCLElBQWhCLFFBQWxCO0FBQ0EsZUFBSyxlQUFMLEdBQXVCLE9BQUssZUFBTCxDQUFxQixJQUFyQixRQUF2QjtBQUNBLGVBQUssaUJBQUwsR0FBeUIsT0FBSyxpQkFBTCxDQUF1QixJQUF2QixRQUF6QjtBQUNBLGVBQUssY0FBTCxHQUFzQixPQUFLLGNBQUwsQ0FBb0IsSUFBcEIsUUFBdEI7O0FBRUEsZUFBSyxLQUFMLEdBQWEsRUFBRSxhQUFhLEVBQWYsRUFBbUIsVUFBVSxVQUE3QixFQUFiO0FBUGM7QUFRakI7Ozs7eUNBRWdCO0FBQ2IsaUJBQUssUUFBTCxDQUFjLEVBQUUsVUFBVSxLQUFLLEtBQUwsQ0FBVyxRQUFYLEtBQXdCLFVBQXhCLEdBQXFDLE1BQXJDLEdBQThDLFVBQTFELEVBQWQ7QUFDSDs7O21DQUVVLEMsRUFBRztBQUNWLGdCQUFNLHNCQUFzQixLQUFLLEtBQUwsQ0FBVyxXQUFYLENBQXVCLE1BQXZCLENBQThCO0FBQUEsdUJBQUssRUFBRSxJQUFGLEtBQVcsTUFBaEI7QUFBQSxhQUE5QixDQUE1QjtBQUNBLGdCQUFNLGlCQUFpQixTQUFjLEVBQUUsTUFBTSxNQUFSLEVBQWQsRUFBZ0MsQ0FBaEMsQ0FBdkI7QUFDQSxnQ0FBb0IsSUFBcEIsQ0FBeUIsY0FBekI7QUFDQSxpQkFBSyxRQUFMLENBQWMsRUFBRSxhQUFhLG1CQUFmLEVBQWQ7QUFDSDs7OzhDQUV5QztBQUFBLGdCQUF4QixpQkFBd0IsUUFBeEIsaUJBQXdCO0FBQUEsZ0JBQUwsQ0FBSyxRQUFMLENBQUs7O0FBQ3RDLGdCQUFJLEVBQUUsSUFBRixLQUFXLE1BQWYsRUFBdUI7QUFDbkIsdUJBQU87QUFBQTtBQUFBLHNCQUFLLE9BQU8sRUFBRSxlQUFlLEtBQWpCLEVBQXdCLFVBQVUsVUFBbEMsRUFBOEMsTUFBTSxrQkFBa0IsQ0FBbEIsQ0FBcEQsRUFBMEUsS0FBSyxrQkFBa0IsQ0FBbEIsQ0FBL0UsRUFBWjtBQUNILGtEQUFDLFFBQUQsSUFBVSxtQkFBbUIsS0FBSyxpQkFBbEMsRUFBcUQsV0FBVyxDQUFoRTtBQURHLGlCQUFQO0FBR0g7QUFDRDtBQUNBLG1CQUFPLElBQVA7QUFDSDs7OzBDQUVpQixhLEVBQWU7QUFDN0IsZ0JBQU0sc0JBQXNCLEtBQUssS0FBTCxDQUFXLFdBQVgsQ0FBdUIsTUFBdkIsQ0FBOEI7QUFBQSx1QkFBSyxFQUFFLElBQUYsS0FBVyxNQUFoQjtBQUFBLGFBQTlCLENBQTVCO0FBQ0EsZ0NBQW9CLElBQXBCLENBQXlCLGFBQXpCO0FBQ0EsaUJBQUssUUFBTCxDQUFjLEVBQUUsYUFBYSxtQkFBZixFQUFkO0FBQ0g7OztpQ0FFUTtBQUNOLGdCQUFNLGNBQWMsR0FBcEI7O0FBRUEsZ0JBQUksY0FBYyxRQUFsQjs7QUFFQSxnQkFBTSxxQkFBcUIsQ0FDMUIsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBYyxNQUFNLElBQXBCLEVBQTBCLE9BQU8sSUFBakMsRUFEMEIsRUFFMUIsRUFBRSxHQUFHLENBQUwsRUFBUSxJQUFJLGNBQVosRUFBNEIsTUFBTSxJQUFsQyxFQUF3QyxPQUFPLE9BQS9DLEVBRjBCLEVBRzFCLEVBQUUsR0FBRyxDQUFMLEVBQVEsSUFBSSxZQUFaLEVBQTBCLE1BQU0sSUFBaEMsRUFBc0MsT0FBTyxPQUE3QyxFQUgwQixFQUkxQixFQUFFLE1BQU0sU0FBUixFQUFtQixJQUFJLEtBQXZCLEVBQThCLElBQUksRUFBbEMsRUFBc0MsYUFBYSxDQUFFLEVBQUUsR0FBRyxDQUFMLEVBQVEsSUFBSSxZQUFaLEVBQUYsRUFBOEIsRUFBRSxHQUFHLENBQUwsRUFBUSxJQUFJLFlBQVosRUFBOUIsQ0FBbkQsRUFBK0csT0FBTyxZQUF0SCxFQUowQixFQUsxQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsRUFBWCxFQUFlLElBQUksQ0FBQyxFQUFwQixFQUF3QixNQUFNLEdBQTlCLEVBQW1DLE9BQU8sR0FBMUMsRUFMMEIsRUFNMUIsRUFBRSxHQUFHLEVBQUUsUUFBUSxRQUFWLEVBQW9CLFNBQVMsVUFBN0IsRUFBTCxFQUFnRCxHQUFHLEVBQW5ELEVBQXVELElBQUksQ0FBQyxFQUE1RCxFQUFnRSxNQUFNLEdBQXRFLEVBQTJFLE9BQU8sR0FBbEYsRUFOMEIsRUFPMUIsRUFBRSxHQUFHLEdBQUwsRUFBVSxHQUFHLENBQWIsRUFBZ0IsTUFBTSxHQUF0QixFQUEyQixPQUFPLEdBQWxDLEVBUDBCLEVBUTFCLEVBQUUsTUFBTSxTQUFSLEVBQW1CLElBQUksS0FBdkIsRUFBOEIsSUFBSSxFQUFsQyxFQUFzQyxhQUFhLENBQUUsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBRixFQUFrQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQixFQUFrQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsRUFBWCxFQUFsQyxDQUFuRCxFQUF3RyxPQUFPLFNBQS9HLEVBUjBCLENBQTNCOztBQVdBLGdCQUFNLDJCQUFzQixrQkFBdEIscUJBQTZDLEtBQUssS0FBTCxDQUFXLFdBQXhELEVBQU47O0FBRUMsbUJBQU87QUFBQTtBQUFBO0FBQ0g7QUFBQTtBQUFBLHNCQUFRLFNBQVMsS0FBSyxjQUF0QjtBQUFBO0FBQUEsaUJBREc7QUFFSDtBQUNBLDBCQUFNLENBQUUsR0FBRixFQUFNLFdBQU4sQ0FETjtBQUVBLDJCQUFPLFdBRlA7QUFHQSxzQ0FBa0I7QUFBQSwrQkFBSyxFQUFFLElBQVA7QUFBQSxxQkFIbEI7QUFJQSwrQkFBVztBQUFBLCtCQUFLLEVBQUUsQ0FBUDtBQUFBLHFCQUpYO0FBS0EsK0JBQVc7QUFBQSwrQkFBSyxFQUFFLENBQVA7QUFBQSxxQkFMWDtBQU1BLCtCQUFXO0FBQUEsK0JBQU0sRUFBRSxNQUFNLEVBQUUsS0FBVixFQUFpQixhQUFhLEdBQTlCLEVBQW1DLFFBQVEsRUFBRSxLQUE3QyxFQUFOO0FBQUEscUJBTlg7QUFPQSxxQ0FBaUIsSUFQakI7QUFRQSx5Q0FBcUIsS0FBSyxVQVIxQjtBQVNBLGlDQUFhLGNBVGI7QUFVQSx5Q0FBcUIsS0FBSyxlQVYxQjtBQVdBLG9DQUFnQixFQUFFLE1BQU0sS0FBSyxLQUFMLENBQVcsUUFBbkIsRUFBNkIsb0NBQTdCLEVBQTBELE1BQU0sSUFBaEUsRUFYaEI7QUFZQSw0QkFBUTtBQVpSO0FBRkcsYUFBUDtBQWlCSDs7OztFQXpFeUIsZ0JBQU0sUzs7QUE0RXBDLE9BQU8sT0FBUCxHQUFpQixlQUFqQjs7Ozs7OztBQy9IQTs7OztBQUNBOztBQUNBOzs7Ozs7Ozs7O0FBRUEsSUFBTSxXQUFXLENBQ2IsRUFBRSxJQUFJLFlBQU4sRUFBb0IsT0FBTyxTQUEzQixFQUFzQyxNQUFNLENBQUUsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBRixFQUFrQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQixFQUFrQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQyxFQUFrRCxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRCxFQUFrRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRSxFQUFrRixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRixFQUFrRyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRyxDQUE1QyxFQURhLEVBRWIsRUFBRSxJQUFJLFlBQU4sRUFBb0IsT0FBTyxTQUEzQixFQUFzQyxNQUFNLENBQUUsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBRixFQUFrQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQixFQUFrQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsQyxFQUFrRCxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRCxFQUFrRSxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRSxFQUFrRixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRixFQUFrRyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFsRyxDQUE1QyxFQUZhLEVBR2IsRUFBRSxJQUFJLFlBQU4sRUFBb0IsT0FBTyxTQUEzQixFQUFzQyxNQUFNLENBQUUsRUFBRSxHQUFHLEVBQUwsRUFBUyxHQUFHLENBQVosRUFBRixFQUFtQixFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuQixFQUFtQyxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FBWCxFQUFuQyxFQUFtRCxFQUFFLEdBQUcsQ0FBTCxFQUFRLEdBQUcsQ0FB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USxHQUFHLENBQVgsRUFBbEMsRUFBa0QsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEQsRUFBa0UsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEUsRUFBa0YsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEYsRUFBa0csRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEcsQ0FBNUMsRUFEYSxFQUViLEVBQUUsSUFBSSxZQUFOLEVBQW9CLE9BQU8sU0FBM0IsRUFBc0MsTUFBTSxDQUFFLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQUYsRUFBa0IsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEIsRUFBa0MsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEMsRUFBa0QsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEQsRUFBa0UsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEUsRUFBa0YsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEYsRUFBa0csRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbEcsQ0FBNUMsRUFGYSxFQUdiLEVBQUUsSUFBSSxZQUFOLEVBQW9CLE9BQU8sU0FBM0IsRUFBc0MsTUFBTSxDQUFFLEVBQUUsR0FBRyxFQUFMLEVBQVMsR0FBRyxDQUFaLEVBQUYsRUFBbUIsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkIsRUFBbUMsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkMsRUFBbUQsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkQsRUFBbUUsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkUsRUFBbUYsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkYsRUFBbUcsRUFBRSxHQUFHLENBQUwsRUFBUSxHQUFHLENBQVgsRUFBbkcsQ0FBNUMsRUFIYSxF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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ppQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyNEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0eERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCdcbi8qIGVzbGludC1lbmFibGUgbm8tdW51c2VkLXZhcnMgKi9cblxuaW1wb3J0IFJlYWN0RE9NIGZyb20gJ3JlYWN0LWRvbSdcbmltcG9ydCBNYXJrRXhhbXBsZXMgZnJvbSAnLi9jb21wb25lbnRzL01hcmtFeGFtcGxlcydcbmltcG9ydCBEcmFnQW5kRHJvcEV4YW1wbGUgZnJvbSAnLi9jb21wb25lbnRzL0RyYWdBbmREcm9wRXhhbXBsZSdcbmltcG9ydCBYWUZyYW1lRXhhbXBsZXMgZnJvbSAnLi9jb21wb25lbnRzL1hZRnJhbWVFeGFtcGxlcydcbmltcG9ydCBYWUZyYW1lV2l0aE1pbmltYXBFeGFtcGxlcyBmcm9tICcuL2NvbXBvbmVudHMvWFlGcmFtZVdpdGhNaW5pbWFwRXhhbXBsZXMnXG5pbXBvcnQgWFlGcmFtZUV4YW1wbGVzTWlzYyBmcm9tICcuL2NvbXBvbmVudHMvWFlGcmFtZUV4YW1wbGVzTWlzYydcbmltcG9ydCBYWUFubm90YXRpb25FeGFtcGxlcyBmcm9tICcuL2NvbXBvbmVudHMvWFlBbm5vdGF0aW9uRXhhbXBsZXMnXG5pbXBvcnQgWFlGcmFtZVBvaW50RXhhbXBsZXMgZnJvbSAnLi9jb21wb25lbnRzL1hZRnJhbWVQb2ludEV4YW1wbGVzJ1xuaW1wb3J0IE9SRnJhbWVQaWVjZUV4YW1wbGVzIGZyb20gJy4vY29tcG9uZW50cy9PUkZyYW1lUGllY2VFeGFtcGxlcydcbmltcG9ydCBPUkZyYW1lQ29ubmVjdG9yRXhhbXBsZXMgZnJvbSAnLi9jb21wb25lbnRzL09SRnJhbWVDb25uZWN0b3JFeGFtcGxlcydcbmltcG9ydCBPUkZyYW1lR3JvdXBFeGFtcGxlcyBmcm9tICcuL2NvbXBvbmVudHMvT1JGcmFtZUdyb3VwRXhhbXBsZXMnXG5pbXBvcnQgRGl2aWRlZExpbmVFeGFtcGxlcyBmcm9tICcuL2NvbXBvbmVudHMvRGl2aWRlZExpbmVFeGFtcGxlcydcbmltcG9ydCBCYXJMaW5lQ2hhcnRFeGFtcGxlIGZyb20gJy4vY29tcG9uZW50cy9CYXJMaW5lQ2hhcnRFeGFtcGxlJ1xuXG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8ZGl2PlxuICAgICAgICA8TWFya0V4YW1wbGVzIGxhYmVsPVwiTWFya1wiIC8+XG4gICAgPC9kaXY+LFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXJrLWV4YW1wbGVzJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxEcmFnQW5kRHJvcEV4YW1wbGUgbGFiZWw9XCJNYXJrXCIgLz5cbiAgICA8L2Rpdj4sXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RyYWctYW5kLWRyb3AtZXhhbXBsZXMnKVxuKVxuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPGRpdj5cbiAgICAgICAgPERpdmlkZWRMaW5lRXhhbXBsZXMgbGFiZWw9XCJEaXZpZGVkIExpbmVcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGl2aWRlZExpbmUtZXhhbXBsZXMnKVxuKVxuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPGRpdj5cbiAgICAgICAgPFhZRnJhbWVFeGFtcGxlcyBsYWJlbD1cIlhZRnJhbWVcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZS1leGFtcGxlcy1jdXN0b21saW5ldHlwZScpXG4pXG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8ZGl2PlxuICAgICAgICA8WFlGcmFtZUV4YW1wbGVzTWlzYyBsYWJlbD1cIlhZRnJhbWVcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZS1leGFtcGxlcy1taXNjJylcbilcblxuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPGRpdj5cbiAgICAgICAgPFhZRnJhbWVQb2ludEV4YW1wbGVzIGxhYmVsPVwiWFlGcmFtZSBQb2ludHNcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZVBvaW50LWV4YW1wbGVzJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxYWUZyYW1lV2l0aE1pbmltYXBFeGFtcGxlcyBsYWJlbD1cIlhZRnJhbWVcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZS1leGFtcGxlcy1taW5pbWFwJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxYWUFubm90YXRpb25FeGFtcGxlcyBsYWJlbD1cIlhZIEFubm90YXRpb24gRXhhbXBsZXNcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgneHlGcmFtZS1leGFtcGxlcy1hbm5vdGF0aW9uJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxPUkZyYW1lUGllY2VFeGFtcGxlcyBsYWJlbD1cIk9SRnJhbWUgUGllY2VzXCIgLz5cbiAgICA8L2Rpdj4sXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29yRnJhbWVQaWVjZS1leGFtcGxlcycpXG4pXG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8ZGl2PlxuICAgICAgICA8T1JGcmFtZUNvbm5lY3RvckV4YW1wbGVzIGxhYmVsPVwiT1JGcmFtZSBDb25uZWN0b3JzXCIgLz5cbiAgICA8L2Rpdj4sXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29yRnJhbWVDb25uZWN0b3ItZXhhbXBsZXMnKVxuKVxuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPGRpdj5cbiAgICAgICAgPE9SRnJhbWVHcm91cEV4YW1wbGVzIGxhYmVsPVwiT1JGcmFtZSBHcm91cHNcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb3JGcmFtZUdyb3VwLWV4YW1wbGVzJylcbilcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxCYXJMaW5lQ2hhcnRFeGFtcGxlIGxhYmVsPVwiQmFyIExpbmUgQ2hhcnRcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFyTGluZS1leGFtcGxlcycpXG4pXG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBYWUZyYW1lLCBPUkZyYW1lIH0gZnJvbSAnc2VtaW90aWMnO1xuaW1wb3J0IHsgY3VydmVCYXNpcyB9IGZyb20gJ2QzLXNoYXBlJ1xuXG5jb25zdCB0ZXN0RGF0YSA9IFtcbiAgICB7IGlkOiBcImxpbmVkYXRhLTFcIiwgY29sb3I6IFwiIzAwYTJjZVwiLCBkYXRhOiBbIHsgc2FsZXM6IDUsIGxlYWRzOiAxNTAsIHg6IDEgfSwgeyBzYWxlczogNywgbGVhZHM6IDEwMCwgeDogMiB9LCB7IHNhbGVzOiA3LCBsZWFkczogMTEyLCB4OiAzIH0sIHsgc2FsZXM6IDQsIGxlYWRzOiA0MCwgeDogNCB9LCB7IHNhbGVzOiAyLCBsZWFkczogMjAwLCB4OiA1IH0sIHsgc2FsZXM6IDMsIGxlYWRzOiAxODAsIHg6IDYgfSwgeyBzYWxlczogNSwgbGVhZHM6IDE2NSwgeDogNyB9IF0gfVxuXVxuXG5sZXQgZGlzcGxheURhdGEgPSB0ZXN0RGF0YS5tYXAoZCA9PiB7XG4gICAgbGV0IG1vcmVEYXRhID0gWyAuLi5kLmRhdGEsIC4uLmQuZGF0YS5tYXAocCA9PiAoeyBzYWxlczogcC5zYWxlcyArIE1hdGgucmFuZG9tKCkgKiA1LCBsZWFkczogcC5sZWFkcyArIE1hdGgucmFuZG9tKCkgKiAxMDAsIHg6IHAueCArIDcgfSkpIF1cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihkLCB7IGRhdGE6IG1vcmVEYXRhIH0pXG59KVxuXG5jbGFzcyBCYXJMaW5lQ2hhcnRFeGFtcGxlcyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpe1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuXG4gICAgICBjb25zdCBheGVzID0gW1xuICAgICAgICB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwibGVmdFwiLCBjbGFzc05hbWU6IFwieXNjYWxlXCIsIG5hbWU6IFwiQ291bnRBeGlzXCIsIHRpY2tWYWx1ZXM6IFsgMiwgNiwgMTAgXSwgdGlja0Zvcm1hdDogKGQpID0+IGQgKyBcIiVcIiB9LFxuICAgICAgICB7IGtleTogXCJ4QXhpc1wiLCBvcmllbnQ6IFwiYm90dG9tXCIsIGNsYXNzTmFtZTogXCJ4c2NhbGVcIiwgbmFtZTogXCJUaW1lQXhpc1wiLCB0aWNrVmFsdWVzOiBbIDIsIDQsIDYsIDgsIDEwLCAxMiBdLCB0aWNrRm9ybWF0OiBkID0+IFwiZGF5IFwiICsgZCAgfVxuICAgICAgXVxuICAgICAgY29uc3QgYXhpczMgPSB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwicmlnaHRcIiwgY2xhc3NOYW1lOiBcInlzY2FsZVwiLCBuYW1lOiBcIkNvdW50QXhpc1wiLCB0aWNrczogMywgdGlja0Zvcm1hdDogKGQpID0+IGQgfVxuXG4gICAgICAgIHJldHVybiA8ZGl2IHN0eWxlPXt7IGhlaWdodDogXCIzMDBweFwiIH19PlxuICAgICAgICAgICAgPGRpdiBzdHlsZT17eyBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiIH19PlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJkaXZpZGVkLWxpbmUtb3JcIlxuICAgICAgICAgICAgICAgIHNpemU9e1sgNTAwLDMwMCBdfVxuICAgICAgICAgICAgICAgIGRhdGE9e2Rpc3BsYXlEYXRhWzBdLmRhdGF9XG4gICAgICAgICAgICAgICAgdHlwZT17XCJiYXJcIn1cbi8vICAgICAgICAgICAgICAgIHJlbmRlckZuPXsoKSA9PiBcInNrZXRjaHlcIn1cbiAgICAgICAgICAgICAgICBvQWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgICAgIHJBY2Nlc3Nvcj17ZCA9PiBkLmxlYWRzfVxuICAgICAgICAgICAgICAgIHN0eWxlPXsoKSA9PiAoeyBmaWxsOiBcIiNiMzMzMWRcIiwgb3BhY2l0eTogMSwgc3Ryb2tlOiAnd2hpdGUnIH0pfVxuICAgICAgICAgICAgICAgIG1hcmdpbj17eyB0b3A6IDUsIGJvdHRvbTogMjUsIGxlZnQ6IDU1LCByaWdodDogNTUgfX1cbiAgICAgICAgICAgICAgICBheGlzPXtheGlzM31cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgcG9zaXRpb246IFwiYWJzb2x1dGVcIiB9fT5cbiAgICAgICAgICAgIDxYWUZyYW1lXG4gICAgICAgICAgICBjbGFzc05hbWU9XCJkaXZpZGVkLWxpbmUteHlcIlxuICAgICAgICAgICAgYXhlcz17YXhlc31cbiAgICAgICAgICAgIHNpemU9e1sgNTAwLCAzMDAgXX1cbiAgICAgICAgICAgIGxpbmVzPXtkaXNwbGF5RGF0YX1cbiAgICAgICAgICAgIGxpbmVEYXRhQWNjZXNzb3I9e2QgPT4gZC5kYXRhfVxuICAgICAgICAgICAgeEFjY2Vzc29yPXtkID0+IGQueH1cbiAgICAgICAgICAgIHlBY2Nlc3Nvcj17ZCA9PiBkLnNhbGVzfVxuICAgICAgICAgICAgbGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciwgc3Ryb2tlV2lkdGg6IFwiMnB4XCIgfSl9XG4gICAgICAgICAgICBjdXN0b21MaW5lVHlwZT17eyB0eXBlOiBcImxpbmVcIiwgaW50ZXJwb2xhdG9yOiBjdXJ2ZUJhc2lzLCBzb3J0OiBudWxsIH19XG4gICAgICAgICAgICBtYXJnaW49e3sgdG9wOiA1LCBib3R0b206IDI1LCBsZWZ0OiA1NSwgcmlnaHQ6IDU1IH19XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmFyTGluZUNoYXJ0RXhhbXBsZXM7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBEaXZpZGVkTGluZSB9IGZyb20gJ3NlbWlvdGljJztcbmltcG9ydCB7IGN1cnZlQmFzaXMgfSBmcm9tICdkMy1zaGFwZSdcblxuY2xhc3MgRGl2aWRlZExpbmVFeGFtcGxlIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcyl7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGZ1bmN0aW9uIHJhbmRvbUxpbmVHZW5lcmF0b3Iod2lkdGgsIGhlaWdodCwgcG9pbnRzKSB7XG4gICAgICAgICAgY29uc3QgcG9pbnREYXRhU2V0ID0gW11cbiAgICAgICAgICBsZXQgY3VyWSA9IDAuNVxuICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4PCBwb2ludHM7IHgrKykge1xuICAgICAgICAgICAgY3VyWSArPSBNYXRoLnJhbmRvbSgpICogMC4zIC0gMC4xNTtcbiAgICAgICAgICAgIGN1clkgPSBNYXRoLm1heChjdXJZLCAwLjA1KVxuICAgICAgICAgICAgY3VyWSA9IE1hdGgubWluKGN1clksIDAuOTUpXG4gICAgICAgICAgICBwb2ludERhdGFTZXQucHVzaCh7IHg6IHggLyBwb2ludHMgKiB3aWR0aCwgeTogY3VyWSAqIGhlaWdodCB9KVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcG9pbnREYXRhU2V0XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwYXJhbWV0ZXJzKHBvaW50KSB7XG4gICAgICAgICAgaWYgKHBvaW50LnggPCAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IGZpbGw6IFwibm9uZVwiLCBzdHJva2U6IFwiI2IzMzMxZFwiLCBzdHJva2VXaWR0aDogNiwgc3Ryb2tlT3BhY2l0eTogMC41IH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBvaW50LnggPiA0MDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IGZpbGw6IFwibm9uZVwiLCBzdHJva2U6IFwiI2IzMzMxZFwiLCBzdHJva2VXaWR0aDogMSwgc3Ryb2tlRGFzaGFycmF5OiBcIjUgNVwiIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBvaW50LnkgPCAxNTApIHtcbiAgICAgICAgICAgIHJldHVybiB7IGZpbGw6IFwibm9uZVwiLCBzdHJva2VXaWR0aDogMSwgc3Ryb2tlOiBcIiMwMGEyY2VcIiB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwb2ludC55ID4gMzUwKSB7XG4gICAgICAgICAgICByZXR1cm4geyBmaWxsOiBcIm5vbmVcIiwgc3Ryb2tlV2lkdGg6IDIsIHN0cm9rZTogXCIjYjZhNzU2XCIgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4geyBmaWxsOiBcIm5vbmVcIiwgc3Ryb2tlOiBcImJsYWNrXCIsIHN0cm9rZVdpZHRoOiAxIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRhdGEgPSByYW5kb21MaW5lR2VuZXJhdG9yKDUwMCw1MDAsMTAwKVxuXG4gICAgICAgIHJldHVybiA8c3ZnIGhlaWdodD1cIjUwMFwiIHdpZHRoPVwiNTAwXCI+XG4gICAgICAgIDxEaXZpZGVkTGluZVxuICAgICAgICAgICAgcGFyYW1ldGVycz17cGFyYW1ldGVyc31cbiAgICAgICAgICAgIGRhdGE9e1sgZGF0YSBdfVxuICAgICAgICAgICAgbGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkfVxuICAgICAgICAgICAgY3VzdG9tQWNjZXNzb3JzPXt7IHg6IGQgPT4gZC54LCB5OiBkID0+IGQueSB9fVxuICAgICAgICAgICAgaW50ZXJwb2xhdGU9e2N1cnZlQmFzaXN9XG4gICAgICAgICAgICBzZWFyY2hJdGVyYXRpb25zPXsyMH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgIDwvc3ZnPlxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEaXZpZGVkTGluZUV4YW1wbGU7XG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgRHJhZ2dhYmxlTWFyaywgTWFya0NvbnRleHQgfSBmcm9tICdzZW1pb3RpYyc7XG5cbmNsYXNzIERyYWdBbmREcm9wRXhhbXBsZSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpe1xuICAgICAgICBzdXBlcihwcm9wcylcbiAgICAgICAgdGhpcy5zdGF0ZT17IHNvdXJjZTogdW5kZWZpbmVkLCB0YXJnZXQ6IHVuZGVmaW5lZCB9XG4gICAgICAgIHRoaXMuZHJvcE1lID0gdGhpcy5kcm9wTWUuYmluZCh0aGlzKVxuICAgIH1cblxuICAgIGRyb3BNZSAoc291cmNlLCB0YXJnZXQpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IHNvdXJjZTogc291cmNlLm5pZCwgdGFyZ2V0OiB0YXJnZXQubmlkIH0pXG4gICAgfVxuXG4gICAgcmVuZGVyICgpIHtcbiAgICAgICAgY29uc3QgRHJhZ01hcmsxID0gPERyYWdnYWJsZU1hcmtcbiAgICAgICAgICAgIG5pZD17bnVsbH1cbiAgICAgICAgICAgIG1hcmtUeXBlPVwiY2lyY2xlXCJcbiAgICAgICAgICAgIHI9ezIwfVxuICAgICAgICAgICAgY3g9ezUwfVxuICAgICAgICAgICAgY3k9ezUwfVxuICAgICAgICAgICAgc3R5bGU9e3sgZmlsbDogXCJncmF5XCIsIHN0cm9rZTogXCJibGFja1wiLCBzdHJva2VXaWR0aDogdGhpcy5zdGF0ZS5zb3VyY2UgPT09IG51bGwgPyBcIjJweFwiIDogMCB9fVxuICAgICAgICAgICAgZHJvcEZ1bmN0aW9uPXt0aGlzLmRyb3BNZX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgY29uc3QgRHJhZ01hcmsyID0gPERyYWdnYWJsZU1hcmtcbiAgICAgICAgICAgIG5pZD17XCJwYWludHlcIn1cbiAgICAgICAgICAgIG1hcmtUeXBlPVwiY2lyY2xlXCJcbiAgICAgICAgICAgIHJlbmRlck1vZGU9e1wicGFpbnR5XCJ9XG4gICAgICAgICAgICByPXsyMH1cbiAgICAgICAgICAgIGN4PXsxNTB9XG4gICAgICAgICAgICBjeT17NTB9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcImdyYXlcIiwgc3Ryb2tlOiBcImJsYWNrXCIsIHN0cm9rZVdpZHRoOiB0aGlzLnN0YXRlLnNvdXJjZSA9PT0gXCJwYWludHlcIiA/IFwiMnB4XCIgOiAwIH19XG4gICAgICAgICAgICBkcm9wRnVuY3Rpb249e3RoaXMuZHJvcE1lfVxuICAgICAgICAgICAgLz5cblxuICAgICAgICBjb25zdCBEcmFnTWFyazMgPSA8RHJhZ2dhYmxlTWFya1xuICAgICAgICAgICAgbmlkPXtcInNrZXRjaHlcIn1cbiAgICAgICAgICAgIG1hcmtUeXBlPVwiY2lyY2xlXCJcbiAgICAgICAgICAgIHJlbmRlck1vZGU9e1wic2tldGNoeVwifVxuICAgICAgICAgICAgcj17MjB9XG4gICAgICAgICAgICBjeD17MjUwfVxuICAgICAgICAgICAgY3k9ezUwfVxuICAgICAgICAgICAgc3R5bGU9e3sgZmlsbDogXCJncmF5XCIsIHN0cm9rZTogXCJibGFja1wiLCBzdHJva2VXaWR0aDogdGhpcy5zdGF0ZS5zb3VyY2UgPT09IFwic2tldGNoeVwiID8gXCIycHhcIiA6IDAgfX1cbiAgICAgICAgICAgIGRyb3BGdW5jdGlvbj17dGhpcy5kcm9wTWV9XG4gICAgICAgICAgICAvPlxuXG4gICAgICAgIGNvbnN0IERyYWdNYXJrNCA9IDxEcmFnZ2FibGVNYXJrXG4gICAgICAgICAgICBtYXJrVHlwZT1cInJlY3RcIlxuICAgICAgICAgICAgbmlkPXsxfVxuICAgICAgICAgICAgcmVuZGVyTW9kZT17dGhpcy5zdGF0ZS50YXJnZXQgPT09IDEgPyB0aGlzLnN0YXRlLnNvdXJjZSA6IG51bGx9XG4gICAgICAgICAgICB3aWR0aD17MTAwfVxuICAgICAgICAgICAgaGVpZ2h0PXsxMDB9XG4gICAgICAgICAgICB4PXsxNzV9XG4gICAgICAgICAgICB5PXsxNTB9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcIiMwMGEyY2VcIiB9fVxuICAgICAgICAgICAgZHJvcEZ1bmN0aW9uPXt0aGlzLmRyb3BNZX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgY29uc3QgRHJhZ01hcms1ID0gPERyYWdnYWJsZU1hcmtcbiAgICAgICAgICAgIG1hcmtUeXBlPVwicmVjdFwiXG4gICAgICAgICAgICBuaWQ9ezJ9XG4gICAgICAgICAgICByZW5kZXJNb2RlPXt0aGlzLnN0YXRlLnRhcmdldCA9PT0gMiA/IHRoaXMuc3RhdGUuc291cmNlIDogbnVsbH1cbiAgICAgICAgICAgIHdpZHRoPXsxMDB9XG4gICAgICAgICAgICBoZWlnaHQ9ezEwMH1cbiAgICAgICAgICAgIHg9ezI1fVxuICAgICAgICAgICAgeT17MTUwfVxuICAgICAgICAgICAgc3R5bGU9e3sgZmlsbDogXCIjYjMzMzFkXCIgfX1cbiAgICAgICAgICAgIGRyb3BGdW5jdGlvbj17dGhpcy5kcm9wTWV9XG4gICAgICAgICAgICAvPlxuXG4gICAgICAgIHJldHVybiA8c3ZnIGhlaWdodD1cIjM2NVwiIHdpZHRoPVwiNTAwXCI+XG4gICAgICAgIDxkZWZzPlxuICAgICAgICAgICAgPG1hcmtlclxuICAgICAgICAgICAgaWQ9XCJUcmlhbmdsZVwiXG4gICAgICAgICAgICByZWZYPXsxMn1cbiAgICAgICAgICAgIHJlZlk9ezZ9XG4gICAgICAgICAgICBtYXJrZXJVbml0cz1cInVzZXJTcGFjZU9uVXNlXCJcbiAgICAgICAgICAgIG1hcmtlcldpZHRoPXsxMn1cbiAgICAgICAgICAgIG1hcmtlckhlaWdodD17MTh9XG4gICAgICAgICAgICBvcmllbnQ9XCJhdXRvXCI+XG4gICAgICAgICAgICA8cGF0aCBkPVwiTSAwIDAgMTIgNiAwIDEyIDMgNlwiIC8+XG4gICAgICAgICAgICA8L21hcmtlcj5cbiAgICAgICAgICA8ZmlsdGVyIGlkPVwicGFpbnR5RmlsdGVySGVhdnlcIj5cbiAgICAgICAgICAgIDxmZUdhdXNzaWFuQmx1ciBpZD1cImdhdXNzYmx1cnJlclwiIGluPVwiU291cmNlR3JhcGhpY1wiXG4gICAgICAgICAgICAgIHN0ZERldmlhdGlvbj17NH1cbiAgICAgICAgICAgICAgY29sb3JJbnRlcnBvbGF0aW9uRmlsdGVycz1cInNSR0JcIlxuICAgICAgICAgICAgICByZXN1bHQ9XCJibHVyXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8ZmVDb2xvck1hdHJpeCBpbj1cImJsdXJcIlxuICAgICAgICAgICAgICBtb2RlPVwibWF0cml4XCJcbiAgICAgICAgICAgICAgdmFsdWVzPVwiMSAwIDAgMCAwICAwIDEgMCAwIDAgIDAgMCAxIDAgMCAgMCAwIDAgMzQgLTdcIlxuICAgICAgICAgICAgICByZXN1bHQ9XCJnb29leVwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZmlsdGVyPlxuICAgICAgICAgIDxmaWx0ZXIgaWQ9XCJwYWludHlGaWx0ZXJMaWdodFwiPlxuICAgICAgICAgICAgPGZlR2F1c3NpYW5CbHVyIGlkPVwiZ2F1c3NibHVycmVyXCIgaW49XCJTb3VyY2VHcmFwaGljXCJcbiAgICAgICAgICAgICAgc3RkRGV2aWF0aW9uPXsyfVxuICAgICAgICAgICAgICBjb2xvckludGVycG9sYXRpb25GaWx0ZXJzPVwic1JHQlwiXG4gICAgICAgICAgICAgIHJlc3VsdD1cImJsdXJcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxmZUNvbG9yTWF0cml4IGluPVwiYmx1clwiXG4gICAgICAgICAgICAgIG1vZGU9XCJtYXRyaXhcIlxuICAgICAgICAgICAgICB2YWx1ZXM9XCIxIDAgMCAwIDAgIDAgMSAwIDAgMCAgMCAwIDEgMCAwICAwIDAgMCAzNCAtN1wiXG4gICAgICAgICAgICAgIHJlc3VsdD1cImdvb2V5XCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgPC9maWx0ZXI+XG4gICAgICAgIDwvZGVmcz5cbiAgICAgICAgICAgIDx0ZXh0IHg9ezE5MH0geT17MTI1fSBzdHlsZT17eyB1c2VyU2VsZWN0OiBcIm5vbmVcIiwgcG9pbnRlckV2ZW50czogXCJub25lXCIgfX0+RHJhZyBtZSE8L3RleHQ+XG4gICAgICAgICAgICA8bGluZSBtYXJrZXJFbmQ9XCJ1cmwoI1RyaWFuZ2xlKVwiIHgxPXsxNTV9IHkxPXs2NX0geDI9ezE5MH0geTI9ezE0MH0gc3R5bGU9e3sgdXNlclNlbGVjdDogXCJub25lXCIsIHBvaW50ZXJFdmVudHM6IFwibm9uZVwiLCBzdHJva2U6IFwiYmxhY2tcIiwgc3Ryb2tlV2lkdGg6IFwiMXB4XCIsIHN0cm9rZURhc2hhcnJheTogXCI1IDVcIiB9fSAvPlxuICAgICAgICAgICAgPE1hcmtDb250ZXh0PlxuICAgICAgICAgICAgICAgIHtEcmFnTWFyazR9XG4gICAgICAgICAgICAgICAge0RyYWdNYXJrNX1cbiAgICAgICAgICAgICAgICB7RHJhZ01hcmsxfVxuICAgICAgICAgICAgICAgIHtEcmFnTWFyazJ9XG4gICAgICAgICAgICAgICAge0RyYWdNYXJrM31cbiAgICAgICAgICAgIDwvTWFya0NvbnRleHQ+XG4gICAgICAgIDwvc3ZnPlxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEcmFnQW5kRHJvcEV4YW1wbGVcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBNYXJrIH0gZnJvbSAnc2VtaW90aWMnO1xuXG5jbGFzcyBNYXJrRXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgIH1cblxuICAgIHJlbmRlciAoKSB7XG4gICAgICAgIGNvbnN0IG1hcmsgPSA8TWFya1xuICAgICAgICAgICAgbWFya1R5cGU9XCJyZWN0XCJcbiAgICAgICAgICAgIHdpZHRoPXsxMDB9XG4gICAgICAgICAgICBoZWlnaHQ9ezEwMH1cbiAgICAgICAgICAgIHg9ezI1fVxuICAgICAgICAgICAgeT17MjV9XG4gICAgICAgICAgICBkcmFnZ2FibGU9e3RydWV9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcIiMwMGEyY2VcIiwgc3Ryb2tlOiBcImJsdWVcIiwgc3Ryb2tlV2lkdGg6IFwiMXB4XCIgfX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgY29uc3QgY2lyY2xlTWFyayA9IDxNYXJrXG4gICAgICAgICAgICBtYXJrVHlwZT1cImNpcmNsZVwiXG4gICAgICAgICAgICByZW5kZXJNb2RlPVwiZm9yY2VQYXRoXCJcbiAgICAgICAgICAgIHI9ezUwfVxuICAgICAgICAgICAgY3g9ezIwNX1cbiAgICAgICAgICAgIGN5PXsyNTV9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcIiMwMGEyY2VcIiwgc3Ryb2tlOiBcImJsdWVcIiwgc3Ryb2tlV2lkdGg6IFwiMXB4XCIgfX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgY29uc3QgcmVzZXRNYXJrID0gPE1hcmtcbiAgICAgICAgICAgIG1hcmtUeXBlPVwicmVjdFwiXG4gICAgICAgICAgICB3aWR0aD17MTAwfVxuICAgICAgICAgICAgaGVpZ2h0PXsxMDB9XG4gICAgICAgICAgICB4PXsyNX1cbiAgICAgICAgICAgIHk9ezEzNX1cbiAgICAgICAgICAgIGRyYWdnYWJsZT17dHJ1ZX1cbiAgICAgICAgICAgIHJlc2V0QWZ0ZXI9e3RydWV9XG4gICAgICAgICAgICBzdHlsZT17eyBmaWxsOiBcIiM0ZDQzMGNcIiB9fVxuICAgICAgICAgICAgLz5cblxuICAgICAgICBjb25zdCB2ZXJ0aWNhbEJhck1hcmsgPSA8TWFya1xuICAgICAgICAgICAgbWFya1R5cGU9XCJ2ZXJ0aWNhbGJhclwiXG4gICAgICAgICAgICB3aWR0aD17NTB9XG4gICAgICAgICAgICBoZWlnaHQ9ezEwMH1cbiAgICAgICAgICAgIHg9ezE4NX1cbiAgICAgICAgICAgIHk9ezE1MH1cbiAgICAgICAgICAgIHN0eWxlPXt7IGZpbGw6IFwiI2IzMzMxZFwiIH19XG4gICAgICAgICAgICAvPlxuXG4gICAgICAgIGNvbnN0IGhvcml6b250YWxCYXJNYXJrID0gPE1hcmtcbiAgICAgICAgICAgIG1hcmtUeXBlPVwiaG9yaXpvbnRhbGJhclwiXG4gICAgICAgICAgICB3aWR0aD17NTB9XG4gICAgICAgICAgICBoZWlnaHQ9ezEwMH1cbiAgICAgICAgICAgIHg9ezE4NX1cbiAgICAgICAgICAgIHk9ezE1MH1cbiAgICAgICAgICAgIHN0eWxlPXt7IGZpbGw6IFwiI2I2YTc1NlwiIH19XG4gICAgICAgICAgICAvPlxuXG4gICAgICAgIGNvbnN0IHNrZXRjaHlNYXJrID0gPE1hcmtcbiAgICAgICAgICAgIG1hcmtUeXBlPVwicmVjdFwiXG4gICAgICAgICAgICByZW5kZXJNb2RlPVwic2tldGNoeVwiXG4gICAgICAgICAgICB3aWR0aD17MTAwfVxuICAgICAgICAgICAgaGVpZ2h0PXsxMDB9XG4gICAgICAgICAgICB4PXsyNX1cbiAgICAgICAgICAgIHk9ezI1MH1cbiAgICAgICAgICAgIHN0eWxlPXt7IGZpbGw6IFwiI2I4NjExN1wiLCBzdHJva2U6IFwiI2I4NjExN1wiLCBzdHJva2VXaWR0aDogXCI0cHhcIiB9fVxuICAgICAgICAgICAgLz5cblxuICAgICAgICByZXR1cm4gPHN2ZyBoZWlnaHQ9XCIzNjVcIiB3aWR0aD1cIjUwMFwiPlxuICAgICAgICAgICAge21hcmt9XG4gICAgICAgICAgICB7Y2lyY2xlTWFya31cbiAgICAgICAgICAgIHtyZXNldE1hcmt9XG4gICAgICAgICAgICB7c2tldGNoeU1hcmt9XG4gICAgICAgICAgICB7aG9yaXpvbnRhbEJhck1hcmt9XG4gICAgICAgICAgICB7dmVydGljYWxCYXJNYXJrfVxuICAgICAgICA8L3N2Zz5cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTWFya0V4YW1wbGVzXG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBPUkZyYW1lLCBmdW5uZWxpemUgfSBmcm9tICdzZW1pb3RpYyc7XG5pbXBvcnQgeyBzY2FsZUxpbmVhciB9IGZyb20gJ2QzLXNjYWxlJ1xuXG4vLyBjb25zdCBkM2NvbG9ycyA9IGQzLnNjYWxlLmNhdGVnb3J5MjBjKClcblxuY29uc3QgY29sb3JzID0gc2NhbGVMaW5lYXIoKS5kb21haW4oWyAwLDIwLDQwLDYwIF0pLnJhbmdlKFtcbiAgICBcIiMwMGEyY2VcIixcbiAgICBcIiM0ZDQzMGNcIixcbiAgICBcIiNiMzMzMWRcIixcbiAgICBcIiNiNmE3NTZcIlxuXSlcblxuY29uc3QgdGVzdERhdGEgPSBbXVxuZm9yIChsZXQgeD0xO3g8NTt4KyspIHtcbiAgZm9yIChsZXQgeHg9MDt4eDw9NjA7eHgrKykge1xuICAgIHRlc3REYXRhLnB1c2goeyB2YWx1ZTogTWF0aC5yYW5kb20oKSAqIDEwMCArIHh4ICogMiwgY29sdW1uOiBcImNvbHVtblwiK3gsIGNvbG9yOiBjb2xvcnMoeHgpIH0pXG4gIH1cbn1cblxuY29uc3QgZnVubmVsID0gWyB7XG4gIGNvbG9yOiBcIiMwMGEyY2VcIixcbiAgdmlzaXRzOiAxMDAwLFxuICByZWdpc3RyYXRpb246IDkwMCxcbiAgbW9wOiA1MDAsXG4gIHNpZ251cHM6IDQwMCxcbiAgc3RyZWFtZWQ6IDMwMCxcbiAgcGFpZDogMTAwXG59LHtcbiAgY29sb3I6IFwiI2IzMzMxZFwiLFxuICB2aXNpdHM6IDIwMCxcbiAgcmVnaXN0cmF0aW9uOiAxODAsXG4gIG1vcDogMTcwLFxuICBzaWdudXBzOiAxNjAsXG4gIHN0cmVhbWVkOiAxNTAsXG4gIHBhaWQ6IDE0MFxufSx7XG4gIGNvbG9yOiBcIiNiNmE3NTZcIixcbiAgdmlzaXRzOiAzMDAsXG4gIHJlZ2lzdHJhdGlvbjogMTAwLFxuICBtb3A6IDUwLFxuICBzaWdudXBzOiA1MCxcbiAgc3RyZWFtZWQ6IDUwLFxuICBwYWlkOiA1MFxufSBdXG5cblxuY29uc3QgZnVubmVsRGF0YSA9IGZ1bm5lbGl6ZSh7IGRhdGE6IGZ1bm5lbCwgc3RlcHM6IFsgXCJ2aXNpdHNcIiwgXCJyZWdpc3RyYXRpb25cIiwgXCJtb3BcIiwgXCJzaWdudXBzXCIsIFwic3RyZWFtZWRcIiwgXCJwYWlkXCIgXSwga2V5OiBcImNvbG9yXCIgfSlcblxuY2xhc3MgT1JGcmFtZUNvbm5lY3RvckV4YW1wbGVzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcyl7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHsgcHJvamVjdGlvbjogXCJ2ZXJ0aWNhbFwiLCB0eXBlOiBcInBvaW50XCIsIGNvbHVtbldpZHRoOiBcImZpeGVkXCIsIHJBY2Nlc3NvcjogXCJyZWxhdGl2ZVwiLCByZW5kZXJGbjogXCJub25lXCIsXG4gICAgICAgICAgY29sdW1uRXh0ZW50OiB7IFwiY29sdW1uMVwiOiB1bmRlZmluZWQsIFwiY29sdW1uMlwiOiB1bmRlZmluZWQsIFwiY29sdW1uM1wiOiB1bmRlZmluZWQsIFwiY29sdW1uNFwiOiB1bmRlZmluZWQgfVxuICAgICAgICAgfVxuICAgICAgICB0aGlzLmNoYW5nZVByb2plY3Rpb24gPSB0aGlzLmNoYW5nZVByb2plY3Rpb24uYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZVR5cGUgPSB0aGlzLmNoYW5nZVR5cGUuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZUNXID0gdGhpcy5jaGFuZ2VDVy5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuY2hhbmdlUkFjY2Vzc29yID0gdGhpcy5jaGFuZ2VSQWNjZXNzb3IuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZVJlbmRlckZuID0gdGhpcy5jaGFuZ2VSZW5kZXJGbi5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuYnJ1c2hpbmcgPSB0aGlzLmJydXNoaW5nLmJpbmQodGhpcylcbiAgICB9XG5cbiAgICBjaGFuZ2VQcm9qZWN0aW9uKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IHByb2plY3Rpb246IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgY2hhbmdlVHlwZShlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyB0eXBlOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZUNXKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGNvbHVtbldpZHRoOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZVJBY2Nlc3NvcihlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyByQWNjZXNzb3I6IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgY2hhbmdlUmVuZGVyRm4oZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgcmVuZGVyRm46IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgYnJ1c2hpbmcoZSxjKSB7XG4gICAgICBjb25zdCBjb2x1bW5FeHRlbnQgPSB0aGlzLnN0YXRlLmNvbHVtbkV4dGVudFxuICAgICAgY29sdW1uRXh0ZW50W2NdID0gZVxuICAgICAgdGhpcy5zZXRTdGF0ZShjb2x1bW5FeHRlbnQpXG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgY29uc3Qgb3V0c2lkZUhhc2ggPSB7fVxuICAgICAgdGVzdERhdGEuZm9yRWFjaChkID0+IHtcbiAgICAgICAgaWYgKCFvdXRzaWRlSGFzaFtkLmNvbG9yXSkge1xuICAgICAgICAgIGlmICh0aGlzLnN0YXRlLmNvbHVtbkV4dGVudFtkLmNvbHVtbl0gJiYgKGQudmFsdWUgPiB0aGlzLnN0YXRlLmNvbHVtbkV4dGVudFtkLmNvbHVtbl1bMF0gfHwgZC52YWx1ZSA8IHRoaXMuc3RhdGUuY29sdW1uRXh0ZW50W2QuY29sdW1uXVsxXSkpIHtcbiAgICAgICAgICAgIG91dHNpZGVIYXNoW2QuY29sb3JdID0gdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgICBjb25zdCBmcmFtZUhlaWdodCA9IDMwMFxuXG4gICAgICAgIGNvbnN0IHR5cGVPcHRpb25zID0gWyBcImJhclwiLCBcInBvaW50XCIsIFwic3dhcm1cIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInR5cGUtb3B0aW9uXCIgKyBkfSBsYWJlbD17ZH0gdmFsdWU9e2R9PntkfTwvb3B0aW9uPilcbiAgICAgICAgY29uc3QgcHJvamVjdGlvbk9wdGlvbnMgPSBbIFwidmVydGljYWxcIiwgXCJob3Jpem9udGFsXCIsIFwicmFkaWFsXCIgXS5tYXAoZCA9PiA8b3B0aW9uIGtleT17XCJwcm9qZWN0aW9uLW9wdGlvblwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG4gICAgICAgIGNvbnN0IGN3T3B0aW9ucyA9IFsgXCJmaXhlZFwiLCBcInJlbGF0aXZlXCIgXS5tYXAoZCA9PiA8b3B0aW9uIGtleT17XCJjdy1vcHRpb25cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuICAgICAgICBjb25zdCByQWNjZXNzb3JPcHRpb25zID0gWyBcInJlbGF0aXZlXCIsIFwiZml4ZWRcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInJBY2Nlc3Nvci1vcHRpb25cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuICAgICAgICBjb25zdCByZW5kZXJGbk9wdGlvbnMgPSBbIFwibm9uZVwiLCBcInNrZXRjaHlcIiwgXCJwYWludHlcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInJlbmRlcmZuLW9wdGlvblwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG5cbiAgICAgICAgY29uc3QgckFjY2Vzc29yID0gdGhpcy5zdGF0ZS5yQWNjZXNzb3IgPT09IFwiZml4ZWRcIiA/ICgpID0+IDEgOiBkID0+IGQuc3RlcFZhbHVlIHx8IGQudmFsdWVcbiAgICAgICAgY29uc3QgY3dGbiA9IHRoaXMuc3RhdGUuY29sdW1uV2lkdGggPT09IFwiZml4ZWRcIiA/IHVuZGVmaW5lZCA6IGQgPT4gZC5zdGVwVmFsdWUgfHwgZC52YWx1ZVxuICAgICAgICBjb25zdCByZUZuID0gdGhpcy5zdGF0ZS5yZW5kZXJGbiA9PT0gXCJub25lXCIgPyB1bmRlZmluZWQgOiAoKSA9PiB0aGlzLnN0YXRlLnJlbmRlckZuXG5cbiAgICAgICAgY29uc3QgYXhpcyA9IHsga2V5OiBcInlBeGlzXCIsIG9yaWVudDogXCJsZWZ0XCIsIGNsYXNzTmFtZTogXCJ5c2NhbGVcIiwgbmFtZTogXCJDb3VudEF4aXNcIiwgdGlja0Zvcm1hdDogKGQpID0+IGQgfVxuXG4gICAgICAgIHJldHVybiA8ZGl2PlxuICAgICAgICAgICAgPGRpdj48c3Bhbj50eXBlPTxzZWxlY3Qgb25DaGFuZ2U9e3RoaXMuY2hhbmdlVHlwZX0+e3R5cGVPcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXY+PHNwYW4+cHJvamVjdGlvbj08c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZVByb2plY3Rpb259Pntwcm9qZWN0aW9uT3B0aW9uc308L3NlbGVjdD48L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICA8ZGl2PjxzcGFuPmNvbHVtbldpZHRoPTxzZWxlY3Qgb25DaGFuZ2U9e3RoaXMuY2hhbmdlQ1d9Pntjd09wdGlvbnN9PC9zZWxlY3Q+PC9zcGFuPjwvZGl2PlxuICAgICAgICAgICAgPGRpdj48c3Bhbj5yQWNjZXNzb3I9PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VSQWNjZXNzb3J9PntyQWNjZXNzb3JPcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXY+PHNwYW4+cmVuZGVyRm49PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VSZW5kZXJGbn0+e3JlbmRlckZuT3B0aW9uc308L3NlbGVjdD48L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICA8T1JGcmFtZVxuICAgICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgICByZW5kZXJGbj17cmVGbn1cbiAgICAgICAgICAgICAgb0xhYmVsPXt0cnVlfVxuICAgICAgICAgICAgICBkYXRhPXtmdW5uZWxEYXRhfVxuICAgICAgICAgICAgICBheGlzPXtheGlzfVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XG4gICAgICAgICAgICAgIHR5cGU9e3RoaXMuc3RhdGUudHlwZX1cbiAgICAgICAgICAgICAgY29ubmVjdG9yVHlwZT17ZCA9PiBkLmZ1bm5lbEtleX1cbiAgICAgICAgICAgICAgY29ubmVjdG9yU3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuc291cmNlLmZ1bm5lbEtleSwgc3Ryb2tlOiBkLnNvdXJjZS5mdW5uZWxLZXkgfX19XG4gICAgICAgICAgICAgIG9BY2Nlc3Nvcj17ZCA9PiBkLnN0ZXBOYW1lfVxuICAgICAgICAgICAgICByQWNjZXNzb3I9e3JBY2Nlc3Nvcn1cbiAgICAgICAgICAgICAgc3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuZnVubmVsS2V5LCBzdHJva2U6IFwiYmxhY2tcIiB9fX1cbiAgICAgICAgICAgICAgaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVxuICAgICAgICAgICAgICBjb2x1bW5XaWR0aD17Y3dGbn1cbiAgICAgICAgICAgICAgbWFyZ2luPXt7IGxlZnQ6IDI1LCB0b3A6IDIwLCBib3R0b206IDI1LCByaWdodDogMCB9fVxuICAgICAgICAgICAgICBvUGFkZGluZz17MzB9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgICAgcmVuZGVyRm49e3JlRm59XG4gICAgICAgICAgICAgIG9MYWJlbD17ZCA9PiA8ZyB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoMCwtMjApXCI+PHJlY3QgaGVpZ2h0PVwiNVwiIHdpZHRoPVwiNVwiIHg9XCItNVwiIHN0eWxlPXt7IGZpbGw6IGQgfX0gLz48dGV4dCB0cmFuc2Zvcm09XCJyb3RhdGUoNDUpXCI+e2R9PC90ZXh0PjwvZz59XG4gICAgICAgICAgICAgIGRhdGE9e3Rlc3REYXRhfVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XG4gICAgICAgICAgICAgIHR5cGU9e3RoaXMuc3RhdGUudHlwZX1cbiAgICAgICAgICAgICAgYXhpcz17YXhpc31cbiAgICAgICAgICAgICAgY29ubmVjdG9yVHlwZT17KGQsaSkgPT4gaX1cbiAgICAgICAgICAgICAgY29ubmVjdG9yU3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuc291cmNlLmNvbG9yLCBzdHJva2U6IGQuc291cmNlLmNvbG9yLCBvcGFjaXR5OiBvdXRzaWRlSGFzaFtkLnNvdXJjZS5jb2xvcl0gPyAwLjEgOiAxIH19fVxuICAgICAgICAgICAgICBjb2x1bW5XaWR0aD17Y3dGbn1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sdW1ufVxuICAgICAgICAgICAgICByQWNjZXNzb3I9e3JBY2Nlc3Nvcn1cbiAgICAgICAgICAgICAgb1BhZGRpbmc9ezcwfVxuICAgICAgICAgICAgICBtYXJnaW49e3sgbGVmdDogNDAsIHJpZ2h0OiAyMCwgdG9wOiAyMCwgYm90dG9tOiA0MCB9fVxuICAgICAgICAgICAgICBzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VXaWR0aDogMSwgb3BhY2l0eTogb3V0c2lkZUhhc2hbZC5jb2xvcl0gPyAwLjEgOiAxIH19fVxuICAgICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICAgIGludGVyYWN0aW9uPXt7IGNvbHVtbnNCcnVzaDogdHJ1ZSwgZW5kOiB0aGlzLmJydXNoaW5nLCBleHRlbnQ6IHRoaXMuc3RhdGUuY29sdW1uRXh0ZW50IH19XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9SRnJhbWVDb25uZWN0b3JFeGFtcGxlcztcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCdcbmltcG9ydCB7IE9SRnJhbWUgfSBmcm9tICdzZW1pb3RpYydcbmltcG9ydCB7IHJhbmRvbU5vcm1hbCB9IGZyb20gJ2QzLXJhbmRvbSdcbmltcG9ydCB7IHN1bSB9IGZyb20gJ2QzLWFycmF5J1xuXG5jb25zdCBjb2xvcnMgPSBbXG4gICAgXCIjMDBhMmNlXCIsXG4gICAgXCIjNGQ0MzBjXCIsXG4gICAgXCIjYjMzMzFkXCIsXG4gICAgXCIjYjZhNzU2XCJcbl1cblxuY29uc3QgdGVzdERhdGEgPSBbXVxuY29uc3QgblJhbmRvID0gcmFuZG9tTm9ybWFsKDUwLCAxNSlcbmZvciAobGV0IHg9MTt4PDUwMDt4KyspIHtcbiAgICB0ZXN0RGF0YS5wdXNoKHsgeDogblJhbmRvKCksIHZhbHVlOiBNYXRoLm1heCgwLCBuUmFuZG8oKSksIGNvbG9yOiBjb2xvcnNbeCU0XSwgdmFsdWUyOiB4IH0pXG59XG5cbmNsYXNzIE9SRnJhbWVTdW1tYXJ5RXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcblxuICAgICAgICBjb25zdCBmcmFtZUhlaWdodCA9IDMwMFxuXG4gICAgICAgIGNvbnN0IGF4aXMgPSB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwibGVmdFwiLCBjbGFzc05hbWU6IFwieXNjYWxlXCIsIG5hbWU6IFwiQ291bnRBeGlzXCIsIHRpY2tGb3JtYXQ6IChkKSA9PiBkIH1cbiAgICAgICAgY29uc3QgYXhpczIgPSB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwicmlnaHRcIiwgY2xhc3NOYW1lOiBcInlzY2FsZVwiLCBuYW1lOiBcIkNvdW50QXhpc1wiLCB0aWNrRm9ybWF0OiAoZCkgPT4gZCB9XG5cbiAgICAgICAgcmV0dXJuIDxkaXY+XG4gICAgICAgICAgICA8T1JGcmFtZVxuICAgICAgICAgICAgICB0aXRsZT17XCJib3hwbG90XCJ9XG4gICAgICAgICAgICAgIG9MYWJlbD17dHJ1ZX1cbiAgICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgICAgZGF0YT17dGVzdERhdGF9XG4gICAgICAgICAgICAgIHR5cGU9e1wic3dhcm1cIn1cbiAgICAgICAgICAgICAgcHJvamVjdGlvbj17XCJ2ZXJ0aWNhbFwifVxuICAgICAgICAgICAgICBzdW1tYXJ5VHlwZT17XCJib3hwbG90XCJ9XG4gICAgICAgICAgICAgIHN1bW1hcnlTdHlsZT17KGQpID0+ICh7IHN0cm9rZTogZC5jb2xvciwgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlT3BhY2l0eTogMC41IH0pfVxuICAgICAgICAgICAgICBvQWNjZXNzb3I9e2QgPT4gZC5jb2xvcn1cbiAgICAgICAgICAgICAgckFjY2Vzc29yPXtkID0+IGQudmFsdWV9XG4gICAgICAgICAgICAgIHN0eWxlPXtkID0+IHtyZXR1cm4geyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IsIHN0cm9rZU9wYWNpdHk6IDAgfX19XG4gICAgICAgICAgICAgIG9QYWRkaW5nPXs1fVxuICAgICAgICAgICAgICBheGlzPXsgYXhpczIgfVxuICAgICAgICAgICAgLz5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8T1JGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0aXRsZT17J2JveHBsb3QnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvTGFiZWw9e3RydWV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImRhdGE9e3Rlc3REYXRhfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0eXBlPXsnc3dhcm0nfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5VHlwZT17J2JveHBsb3QnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VPcGFjaXR5OiAwIH19fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJtYXJnaW49ezMwfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvUGFkZGluZz17NX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiYXhpcz17IGF4aXMgfVwifTwvcD5cbiAgICAgICAgICAgIDxPUkZyYW1lXG4gICAgICAgICAgICAgIHRpdGxlPXtcInZpb2xpblwifVxuICAgICAgICAgICAgICBvTGFiZWw9e3RydWV9XG4gICAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICAgIGRhdGE9e3Rlc3REYXRhfVxuICAgICAgICAgICAgICB0eXBlPXt7IHR5cGU6IFwic3dhcm1cIiwgcjogKGQsaSkgPT4gaSUzICsgMiB9fVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXtcInZlcnRpY2FsXCJ9XG4gICAgICAgICAgICAgIHN1bW1hcnlUeXBlPXtcInZpb2xpblwifVxuICAgICAgICAgICAgICBzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XG4gICAgICAgICAgICAgIHJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVxuICAgICAgICAgICAgICBzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VPcGFjaXR5OiAwIH19fVxuICAgICAgICAgICAgICBvUGFkZGluZz17NX1cbiAgICAgICAgICAgICAgYXhpcz17IGF4aXMgfVxuICAgICAgICAgICAgLz5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8T1JGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0aXRsZT17J3Zpb2xpbid9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9MYWJlbD17dHJ1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiZGF0YT17dGVzdERhdGF9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInR5cGU9eydzd2FybSd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInN1bW1hcnlUeXBlPXsndmlvbGluJ31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3VtbWFyeVN0eWxlPXsoZCkgPT4gKHsgc3Ryb2tlOiBkLmNvbG9yLCBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2VPcGFjaXR5OiAwLjUgfSl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9BY2Nlc3Nvcj17ZCA9PiBkLmNvbG9yfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJyQWNjZXNzb3I9e2QgPT4gZC52YWx1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciwgc3Ryb2tlT3BhY2l0eTogMCB9fX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibWFyZ2luPXszMH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib1BhZGRpbmc9ezV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImF4aXM9eyBheGlzIH1cIn08L3A+XG4gICAgICAgICAgICA8T1JGcmFtZVxuICAgICAgICAgICAgICB0aXRsZT17XCJoZWF0bWFwXCJ9XG4gICAgICAgICAgICAgIHByb2plY3Rpb249e1widmVydGljYWxcIn1cbiAgICAgICAgICAgICAgb0xhYmVsPXt0cnVlfVxuICAgICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgICBzdW1tYXJ5VHlwZT17XCJoZWF0bWFwXCJ9XG4gICAgICAgICAgICAgIGRhdGE9e3Rlc3REYXRhfVxuICAgICAgICAgICAgICBzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XG4gICAgICAgICAgICAgIHJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVxuICAgICAgICAgICAgICBvUGFkZGluZz17NX1cbiAgICAgICAgICAgICAgYXhpcz17IGF4aXMyIH1cbiAgICAgICAgICAgIC8+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiPE9SRnJhbWVcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1widGl0bGU9eydoZWF0bWFwJ31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0xhYmVsPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5VHlwZT17J2hlYXRtYXAnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VPcGFjaXR5OiAwIH19fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJtYXJnaW49ezMwfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvUGFkZGluZz17NX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiYXhpcz17IGF4aXMgfVwifTwvcD5cbiAgICAgICAgICAgIDxPUkZyYW1lXG4gICAgICAgICAgICAgIHRpdGxlPXs8Zz48dGV4dD5oaXN0b2dyYW08L3RleHQ+PC9nPn1cbiAgICAgICAgICAgICAgcHJvamVjdGlvbj17XCJ2ZXJ0aWNhbFwifVxuICAgICAgICAgICAgICBvTGFiZWw9e3RydWV9XG4gICAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICAgIHN1bW1hcnlUeXBlPXtcImhpc3RvZ3JhbVwifVxuICAgICAgICAgICAgICBkYXRhPXt0ZXN0RGF0YX1cbiAgICAgICAgICAgICAgc3VtbWFyeVN0eWxlPXsoZCkgPT4gKHsgc3Ryb2tlOiBkLmNvbG9yLCBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2VPcGFjaXR5OiAwLjUgfSl9XG4gICAgICAgICAgICAgIHN1bW1hcnlWYWx1ZUFjY2Vzc29yPXsoZCkgPT4gc3VtKGQubWFwKHAgPT4gcC52YWx1ZTIpKX1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XG4gICAgICAgICAgICAgIHJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVxuICAgICAgICAgICAgICBvUGFkZGluZz17NX1cbiAgICAgICAgICAgICAgYXhpcz17IGF4aXMgfVxuICAgICAgICAgICAgICByRXh0ZW50PXtbIDEwMCwgMCBdfVxuICAgICAgICAgICAgLz5cbjxwPkZpeGVkIGV4dGVudCB1c2luZyA8c3BhbiBjbGFzc05hbWU9XCJjb2RlXCI+ckV4dGVudDwvc3Bhbj4gYW5kIHZlcnRpY2FsIHByb2plY3Rpb24uPC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIjxPUkZyYW1lXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInRpdGxlPXsnaGlzdG9ncmFtJ31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wicHJvamVjdGlvbj17J3ZlcnRpY2FsJ31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0xhYmVsPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5VHlwZT17J2hpc3RvZ3JhbSd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInN1bW1hcnlTdHlsZT17KGQpID0+ICh7IHN0cm9rZTogZC5jb2xvciwgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlT3BhY2l0eTogMC41IH0pfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5VmFsdWVBY2Nlc3Nvcj17KGQpID0+IHN1bShkLm1hcChwID0+IHAudmFsdWUyKSl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9BY2Nlc3Nvcj17ZCA9PiBkLmNvbG9yfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJyQWNjZXNzb3I9e2QgPT4gZC52YWx1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciwgc3Ryb2tlT3BhY2l0eTogMCB9fX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibWFyZ2luPXszMH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib1BhZGRpbmc9ezV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImF4aXM9eyBheGlzIH1cIn08L3A+XG4gICAgICAgICAgICA8T1JGcmFtZVxuICAgICAgICAgICAgICB0aXRsZT17XCJla2dcIn1cbiAgICAgICAgICAgICAgZGF0YT17dGVzdERhdGF9XG4gICAgICAgICAgICAgIHByb2plY3Rpb249e1widmVydGljYWxcIn1cbiAgICAgICAgICAgICAgb0xhYmVsPXt0cnVlfVxuICAgICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgICBzdW1tYXJ5VHlwZT17XCJla2dcIn1cbiAgICAgICAgICAgICAgc3VtbWFyeVN0eWxlPXsoZCkgPT4gKHsgc3Ryb2tlOiBkLmNvbG9yLCBmaWxsOiBcIm5vbmVcIiwgc3Ryb2tlT3BhY2l0eTogMC41IH0pfVxuICAgICAgICAgICAgICBvQWNjZXNzb3I9e2QgPT4gZC5jb2xvcn1cbiAgICAgICAgICAgICAgckFjY2Vzc29yPXtkID0+IGQudmFsdWV9XG4gICAgICAgICAgICAgIG9QYWRkaW5nPXs1fVxuICAgICAgICAgICAgICBheGlzPXsgYXhpcyB9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPHA+VGhlICdla2cnIHN1bW1hcnlUeXBlIGlzIGp1c3QgaGFsZiBhIHZpb2xpbiBwbG90LiBIZXJlIGl0IGlzIHdpdGggYSB2ZXJ0aWNhbCBwcm9qZWN0aW9uLjwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8T1JGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0aXRsZT17J2VrZyd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInByb2plY3Rpb249eyd2ZXJ0aWNhbCd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9MYWJlbD17dHJ1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3VtbWFyeVR5cGU9eydla2cnfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdW1tYXJ5U3R5bGU9eyhkKSA9PiAoeyBzdHJva2U6IGQuY29sb3IsIGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZU9wYWNpdHk6IDAuNSB9KX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yLCBzdHJva2VPcGFjaXR5OiAwIH19fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJtYXJnaW49ezMwfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvUGFkZGluZz17NX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiYXhpcz17IGF4aXMgfVwifTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBPUkZyYW1lU3VtbWFyeUV4YW1wbGVzO1xuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0J1xuaW1wb3J0IHsgT1JGcmFtZSwgZnVubmVsaXplIH0gZnJvbSAnc2VtaW90aWMnO1xuLy9pbXBvcnQgZDMgZnJvbSAnZDMnXG5cbi8vIGNvbnN0IGQzY29sb3JzID0gZDMuc2NhbGUuY2F0ZWdvcnkyMGMoKVxuXG5jb25zdCBjb2xvcnMgPSBbXG4gICAgXCIjMDBhMmNlXCIsXG4gICAgXCIjNGQ0MzBjXCIsXG4gICAgXCIjYjMzMzFkXCIsXG4gICAgXCIjYjZhNzU2XCIsXG4gICAgXCIjMDBhMmNlXCIsXG4gICAgXCIjNGQ0MzBjXCIsXG4gICAgXCIjYjMzMzFkXCJcbl1cbmNvbnN0IHRlc3REYXRhID0gW11cbmZvciAobGV0IHg9MTt4PDEwMDt4KyspIHtcbiAgICB0ZXN0RGF0YS5wdXNoKHsgdmFsdWU6IE1hdGgucmFuZG9tKCkgKiAxMDAsIGNvbG9yOiBjb2xvcnNbeCU0XSB9KVxufVxuXG5jb25zdCBmdW5uZWwgPSBbIHtcbiAgY29sb3I6IFwiIzAwYTJjZVwiLFxuICB2aXNpdHM6IDEwMDAsXG4gIHJlZ2lzdHJhdGlvbjogOTAwLFxuICBtb3A6IDUwMCxcbiAgc2lnbnVwczogNDAwLFxuICBzdHJlYW1lZDogMzAwLFxuICBwYWlkOiAxMDBcbn0se1xuICBjb2xvcjogXCIjYjMzMzFkXCIsXG4gIHZpc2l0czogMjAwLFxuICByZWdpc3RyYXRpb246IDE4MCxcbiAgbW9wOiAxNzAsXG4gIHNpZ251cHM6IDE2MCxcbiAgc3RyZWFtZWQ6IDE1MCxcbiAgcGFpZDogMTQwXG59LHtcbiAgY29sb3I6IFwiI2I2YTc1NlwiLFxuICB2aXNpdHM6IDMwMCxcbiAgcmVnaXN0cmF0aW9uOiAxMDAsXG4gIG1vcDogNTAsXG4gIHNpZ251cHM6IDUwLFxuICBzdHJlYW1lZDogNTAsXG4gIHBhaWQ6IDUwXG59IF1cblxuY29uc3Qgc3RhY2tlZFBpZURhdGEgPSBbXG4gIHsgcGllOiBcIm9uZVwiLCBjb2xvcjogXCIjMDBhMmNlXCIsIHZhbHVlOiAyNSB9LFxuICB7IHBpZTogXCJvbmVcIiwgY29sb3I6IFwiI2IzMzMxZFwiLCB2YWx1ZTogNzAgfSxcbiAgeyBwaWU6IFwib25lXCIsIGNvbG9yOiBcIiNiNmE3NTZcIiwgdmFsdWU6IDUgfSxcbiAgeyBwaWU6IFwidHdvXCIsIGNvbG9yOiBcIiMwMGEyY2VcIiwgdmFsdWU6IDUwIH0sXG4gIHsgcGllOiBcInR3b1wiLCBjb2xvcjogXCIjYjMzMzFkXCIsIHZhbHVlOiAyMCB9LFxuICB7IHBpZTogXCJ0d29cIiwgY29sb3I6IFwiI2I2YTc1NlwiLCB2YWx1ZTogMzAgfSxcbiAgeyBwaWU6IFwidGhyZWVcIiwgY29sb3I6IFwiIzAwYTJjZVwiLCB2YWx1ZTogOTAgfSxcbiAgeyBwaWU6IFwidGhyZWVcIiwgY29sb3I6IFwiI2IzMzMxZFwiLCB2YWx1ZTogNSB9LFxuICB7IHBpZTogXCJ0aHJlZVwiLCBjb2xvcjogXCIjYjZhNzU2XCIsIHZhbHVlOiA1IH1cbl1cblxuY29uc3QgZnVubmVsRGF0YSA9IGZ1bm5lbGl6ZSh7IGRhdGE6IGZ1bm5lbCwgc3RlcHM6IFsgXCJ2aXNpdHNcIiwgXCJyZWdpc3RyYXRpb25cIiwgXCJtb3BcIiwgXCJzaWdudXBzXCIsIFwic3RyZWFtZWRcIiwgXCJwYWlkXCIgXSwga2V5OiBcImNvbG9yXCIgfSlcblxuY2xhc3MgT1JGcmFtZVBpZWNlRXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0geyBwcm9qZWN0aW9uOiBcInZlcnRpY2FsXCIsIHR5cGU6IFwiYmFyXCIsIGNvbHVtbldpZHRoOiBcImZpeGVkXCIsIHJBY2Nlc3NvcjogXCJyZWxhdGl2ZVwiLCByZW5kZXJGbjogXCJub25lXCIgfVxuICAgICAgICB0aGlzLmNoYW5nZVByb2plY3Rpb24gPSB0aGlzLmNoYW5nZVByb2plY3Rpb24uYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZVR5cGUgPSB0aGlzLmNoYW5nZVR5cGUuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZUNXID0gdGhpcy5jaGFuZ2VDVy5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuY2hhbmdlUkFjY2Vzc29yID0gdGhpcy5jaGFuZ2VSQWNjZXNzb3IuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZVJlbmRlckZuID0gdGhpcy5jaGFuZ2VSZW5kZXJGbi5iaW5kKHRoaXMpXG4gICAgfVxuXG4gICAgY2hhbmdlUHJvamVjdGlvbihlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyBwcm9qZWN0aW9uOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZVR5cGUoZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgdHlwZTogZS50YXJnZXQudmFsdWUgfSlcbiAgICB9XG5cbiAgICBjaGFuZ2VDVyhlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyBjb2x1bW5XaWR0aDogZS50YXJnZXQudmFsdWUgfSlcbiAgICB9XG5cbiAgICBjaGFuZ2VSQWNjZXNzb3IoZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgckFjY2Vzc29yOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZVJlbmRlckZuKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IHJlbmRlckZuOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIHJlbmRlcigpIHtcblxuICAgICAgICBjb25zdCBmcmFtZUhlaWdodCA9IDMwMFxuXG4gICAgICAgIGNvbnN0IHR5cGVPcHRpb25zID0gWyBcImJhclwiLCBcInBvaW50XCIsIFwic3dhcm1cIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInR5cGUtb3B0aW9uXCIgKyBkfSBsYWJlbD17ZH0gdmFsdWU9e2R9PntkfTwvb3B0aW9uPilcbiAgICAgICAgY29uc3QgcHJvamVjdGlvbk9wdGlvbnMgPSBbIFwidmVydGljYWxcIiwgXCJob3Jpem9udGFsXCIsIFwicmFkaWFsXCIgXS5tYXAoZCA9PiA8b3B0aW9uIGtleT17XCJwcm9qZWN0aW9uLW9wdGlvblwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG4gICAgICAgIGNvbnN0IGN3T3B0aW9ucyA9IFsgXCJmaXhlZFwiLCBcInJlbGF0aXZlXCIgXS5tYXAoZCA9PiA8b3B0aW9uIGtleT17XCJjdy1vcHRpb25cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuICAgICAgICBjb25zdCByQWNjZXNzb3JPcHRpb25zID0gWyBcInJlbGF0aXZlXCIsIFwiZml4ZWRcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInJBY2Nlc3Nvci1vcHRpb25cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuICAgICAgICBjb25zdCByZW5kZXJGbk9wdGlvbnMgPSBbIFwibm9uZVwiLCBcInNrZXRjaHlcIiwgXCJwYWludHlcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcInJlbmRlcmZuLW9wdGlvblwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG5cbiAgICAgICAgY29uc3QgckFjY2Vzc29yID0gdGhpcy5zdGF0ZS5yQWNjZXNzb3IgPT09IFwiZml4ZWRcIiA/ICgpID0+IDEgOiBkID0+IGQuc3RlcFZhbHVlIHx8IGQudmFsdWVcbiAgICAgICAgY29uc3QgY3dGbiA9IHRoaXMuc3RhdGUuY29sdW1uV2lkdGggPT09IFwiZml4ZWRcIiA/IHVuZGVmaW5lZCA6IGQgPT4gZC5zdGVwVmFsdWUgfHwgZC52YWx1ZVxuICAgICAgICBjb25zdCByZUZuID0gdGhpcy5zdGF0ZS5yZW5kZXJGbiA9PT0gXCJub25lXCIgPyB1bmRlZmluZWQgOiAoKSA9PiB0aGlzLnN0YXRlLnJlbmRlckZuXG5cbiAgICAgICAgY29uc3QgYXhpcyA9IHsga2V5OiBcInlBeGlzXCIsIG9yaWVudDogXCJsZWZ0XCIsIGNsYXNzTmFtZTogXCJ5c2NhbGVcIiwgbmFtZTogXCJDb3VudEF4aXNcIiwgdGlja0Zvcm1hdDogKGQpID0+IGQgfVxuICAgICAgICBjb25zdCBheGlzUmlnaHQgPSB7IGtleTogXCJ5QXhpc1wiLCBvcmllbnQ6IFwicmlnaHRcIiwgY2xhc3NOYW1lOiBcInlzY2FsZVwiLCBuYW1lOiBcIkNvdW50QXhpc1wiLCB0aWNrRm9ybWF0OiAoZCkgPT4gZCB9XG5cbiAgICAgICAgcmV0dXJuIDxkaXY+XG4gICAgICAgICAgICA8ZGl2PjxzcGFuPnR5cGU9PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VUeXBlfT57dHlwZU9wdGlvbnN9PC9zZWxlY3Q+PC9zcGFuPjwvZGl2PlxuICAgICAgICAgICAgPGRpdj48c3Bhbj5wcm9qZWN0aW9uPTxzZWxlY3Qgb25DaGFuZ2U9e3RoaXMuY2hhbmdlUHJvamVjdGlvbn0+e3Byb2plY3Rpb25PcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXY+PHNwYW4+Y29sdW1uV2lkdGg9PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VDV30+e2N3T3B0aW9uc308L3NlbGVjdD48L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICA8ZGl2PjxzcGFuPnJBY2Nlc3Nvcj08c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZVJBY2Nlc3Nvcn0+e3JBY2Nlc3Nvck9wdGlvbnN9PC9zZWxlY3Q+PC9zcGFuPjwvZGl2PlxuICAgICAgICAgICAgPGRpdj48c3Bhbj5yZW5kZXJGbj08c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZVJlbmRlckZufT57cmVuZGVyRm5PcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICAgIDxPUkZyYW1lXG4gICAgICAgICAgICAgIHRpdGxlPXtcInRpdGxlXCJ9XG4gICAgICAgICAgICAgIHJlbmRlckZuPXtyZUZufVxuICAgICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XG4gICAgICAgICAgICAgIHR5cGU9e3RoaXMuc3RhdGUudHlwZX1cbiAgICAgICAgICAgICAgZGF0YT17WyAxMCwgNCwgOCwgMywgNSwgNyBdfVxuICAgICAgICAgICAgICBvUGFkZGluZz17NX1cbiAgICAgICAgICAgICAgbWFyZ2luPXsyMH1cbiAgICAgICAgICAgICAgc3R5bGU9eyhkLGkpID0+IHtyZXR1cm4geyBmaWxsOiBjb2xvcnNbaV0sIHN0cm9rZTogXCJibGFja1wiIH19fVxuICAgICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICAvPlxuPHA+PGI+QmFzaWMgYmFyIGNoYXJ0PC9iPjwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJjb25zdCBjb2xvcnMgPSBbJyMwMGEyY2UnLCcjNGQ0MzBjJywnI2IzMzMxZCcsJyNiNmE3NTYnLCcjMDBhMmNlJywnIzRkNDMwYycsJyNiMzMzMWQnXVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8T1JGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0aXRsZT17J3RpdGxlJ31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiZGF0YT17WyAxMCwgNCwgOCwgMywgNSwgNyBdfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvUGFkZGluZz17NX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibWFyZ2luPXsyMH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3R5bGU9eyhkLGkpID0+IHtyZXR1cm4geyBmaWxsOiBjb2xvcnNbaV0sIHN0cm9rZTogJ2JsYWNrJyB9fX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVwifTwvcD5cbiAgICAgICAgICAgIDxPUkZyYW1lXG4gICAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICAgIHJlbmRlckZuPXtyZUZufVxuICAgICAgICAgICAgICBkYXRhPXtmdW5uZWxEYXRhfVxuICAgICAgICAgICAgICBheGlzPXtheGlzfVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XG4gICAgICAgICAgICAgIHR5cGU9e3RoaXMuc3RhdGUudHlwZX1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuc3RlcE5hbWV9XG4gICAgICAgICAgICAgIHJBY2Nlc3Nvcj17ckFjY2Vzc29yfVxuICAgICAgICAgICAgICBzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5mdW5uZWxLZXksIHN0cm9rZTogXCJibGFja1wiIH19fVxuICAgICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICAgIGNvbHVtbldpZHRoPXt0aGlzLnN0YXRlLnJBY2Nlc3NvciA9PT0gXCJmaXhlZFwiID8gZCA9PiBkLnN0ZXBWYWx1ZSA6IHVuZGVmaW5lZH1cbiAgICAgICAgICAgICAgbWFyZ2luPXt7IGxlZnQ6IDI1LCB0b3A6IDAsIGJvdHRvbTogMjUsIHJpZ2h0OiAwIH19XG4gICAgICAgICAgICAvPlxuPHA+PGI+U3RhY2tlZDwvYj48L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiPE9SRnJhbWVcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiZGF0YT17ZnVubmVsRGF0YX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0xhYmVsPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJheGlzPXtheGlzfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInR5cGU9e3RoaXMuc3RhdGUudHlwZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuc3RlcE5hbWV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnN0ZXBWYWx1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuZnVubmVsS2V5LCBzdHJva2U6ICdibGFjaycgfX19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiY29sdW1uV2lkdGg9e3RoaXMuc3RhdGUuY29sdW1uV2lkdGh9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm1hcmdpbj17eyBsZWZ0OiAxMCwgdG9wOiAwLCBib3R0b206IDAsIHJpZ2h0OiAwIH19XCJ9PC9wPlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgICAgcmVuZGVyRm49e3JlRm59XG4gICAgICAgICAgICAgIG9MYWJlbD17ZCA9PiA8ZyB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoMCwtMjApXCI+PHJlY3QgaGVpZ2h0PVwiNVwiIHdpZHRoPVwiNVwiIHg9XCItNVwiIHN0eWxlPXt7IGZpbGw6IGQgfX0gLz48dGV4dCB0cmFuc2Zvcm09XCJyb3RhdGUoNDUpXCI+e2R9PC90ZXh0PjwvZz59XG4gICAgICAgICAgICAgIGRhdGE9e3Rlc3REYXRhfVxuICAgICAgICAgICAgICBwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XG4gICAgICAgICAgICAgIHR5cGU9e3RoaXMuc3RhdGUudHlwZX1cbiAgICAgICAgICAgICAgYXhpcz17YXhpc31cbiAgICAgICAgICAgICAgY29sdW1uV2lkdGg9e2N3Rm59XG4gICAgICAgICAgICAgIG9BY2Nlc3Nvcj17ZCA9PiBkLmNvbG9yfVxuICAgICAgICAgICAgICByQWNjZXNzb3I9e3JBY2Nlc3Nvcn1cbiAgICAgICAgICAgICAgb1BhZGRpbmc9ezV9XG4gICAgICAgICAgICAgIG1hcmdpbj17eyBsZWZ0OiA0MCwgcmlnaHQ6IDIwLCB0b3A6IDIwLCBib3R0b206IDQwIH19XG4gICAgICAgICAgICAgIHN0eWxlPXtkID0+IHtyZXR1cm4geyBmaWxsOiBkLmNvbG9yLCBzdHJva2U6IGQuY29sb3IgfX19XG4gICAgICAgICAgICAgIGhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cbiAgICAgICAgICAgIC8+XG48cD48Yj5DdXN0b20gTGFiZWxpbmc8L2I+PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIjxPUkZyYW1lXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImRhdGE9e3Rlc3REYXRhfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvTGFiZWw9e2QgPT4gPGc+PHJlY3QgaGVpZ2h0PSc1JyB3aWR0aD0nNScgeD0nLTUnIHN0eWxlPXt7IGZpbGw6IGQgfX0gLz48dGV4dCB0cmFuc2Zvcm09J3JvdGF0ZSg0NSknPntkfTwvdGV4dD48L2c+fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJheGlzPXtheGlzfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJwcm9qZWN0aW9uPXt0aGlzLnN0YXRlLnByb2plY3Rpb259XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInR5cGU9e3RoaXMuc3RhdGUudHlwZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInJBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzdHlsZT17ZCA9PiB7cmV0dXJuIHsgZmlsbDogZC5jb2xvciwgc3Ryb2tlOiBkLmNvbG9yIH19fVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJob3ZlckFubm90YXRpb249e3RydWV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImNvbHVtbldpZHRoPXt0aGlzLnN0YXRlLmNvbHVtbldpZHRofVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvUGFkZGluZz17NX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibWFyZ2luPXsgbGVmdDogMjAsIHJpZ2h0OiAyMCwgdG9wOiAyMCwgYm90dG9tOiA0MCB9XCJ9PC9wPlxuICAgICAgICAgICAgPE9SRnJhbWVcbiAgICAgICAgICAgICAgc2l6ZT17WyA1MDAsIGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICAgIHJlbmRlckZuPXtyZUZufVxuICAgICAgICAgICAgICBvTGFiZWw9e3RydWV9XG4gICAgICAgICAgICAgIGRhdGE9e3N0YWNrZWRQaWVEYXRhLmZpbHRlcihkID0+IGQucGllID09PSBcInR3b1wiKX1cbiAgICAgICAgICAgICAgb1BhZGRpbmc9ezV9XG4gICAgICAgICAgICAgIGF4aXM9e2F4aXNSaWdodH1cbiAgICAgICAgICAgICAgbWFyZ2luPXsyMH1cbiAgICAgICAgICAgICAgb0FjY2Vzc29yPXtkID0+IGQuY29sb3J9XG4gICAgICAgICAgICAgIHByb2plY3Rpb249e3RoaXMuc3RhdGUucHJvamVjdGlvbn1cbiAgICAgICAgICAgICAgdHlwZT17dGhpcy5zdGF0ZS50eXBlfVxuICAgICAgICAgICAgICBjb2x1bW5XaWR0aD17Y3dGbn1cbiAgICAgICAgICAgICAgckFjY2Vzc29yPXtyQWNjZXNzb3J9XG4gICAgICAgICAgICAgIHN0eWxlPXtkID0+IHtyZXR1cm4geyBmaWxsOiBkLmNvbG9yLCBzdHJva2U6IFwiYmxhY2tcIiB9fX1cbiAgICAgICAgICAgICAgaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVxuICAgICAgICAgICAgLz5cbjxwPjxiPlJpZ2h0LWhhbmQgQXhpczwvYj48L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiPE9SRnJhbWVcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3RhY2tlZFBpZURhdGEuZmlsdGVyKGQgPT4gZC5waWUgPT09ICd0d28nKVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJvTGFiZWw9e3RydWV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImF4aXM9e2F4aXNSaWdodH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wicHJvamVjdGlvbj17dGhpcy5zdGF0ZS5wcm9qZWN0aW9ufVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0eXBlPXt0aGlzLnN0YXRlLnR5cGV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm9BY2Nlc3Nvcj17ZCA9PiBkLmNvbG9yfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJyQWNjZXNzb3I9e2QgPT4gZC52YWx1ZX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic3R5bGU9e2QgPT4ge3JldHVybiB7IGZpbGw6IGQuY29sb3IsIHN0cm9rZTogJ2JsYWNrJyB9fX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJjb2x1bW5XaWR0aD17dGhpcy5zdGF0ZS5jb2x1bW5XaWR0aH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wib1BhZGRpbmc9ezV9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIm1hcmdpbj17MjB9XCJ9PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9SRnJhbWVQaWVjZUV4YW1wbGVzO1xuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0J1xuaW1wb3J0IHsgWFlGcmFtZSB9IGZyb20gJ3NlbWlvdGljJztcbmltcG9ydCB7IGN1cnZlQ2FyZGluYWwgfSBmcm9tICdkMy1zaGFwZSdcblxuY29uc3QgdGVzdERhdGEgPSBbXG4gICAgeyBpZDogXCJsaW5lZGF0YS0xXCIsIGNvbG9yOiBcIiMwMGEyY2VcIiwgZGF0YTogWyB7IHk6IDUsIHg6IDEgfSwgeyB5OiA3LCB4OiAyIH0sIHsgeTogNywgeDogMyB9LCB7IHk6IDQsIHg6IDQgfSwgeyB5OiAyLCB4OiA1IH0sIHsgeTogMywgeDogNiB9LCB7IHk6IDUsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS0yXCIsIGNvbG9yOiBcIiM0ZDQzMGNcIiwgZGF0YTogWyB7IHk6IDEsIHg6IDEgfSwgeyB5OiA2LCB4OiAyIH0sIHsgeTogOCwgeDogMyB9LCB7IHk6IDYsIHg6IDQgfSwgeyB5OiA0LCB4OiA1IH0sIHsgeTogMiwgeDogNiB9LCB7IHk6IDAsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS0zXCIsIGNvbG9yOiBcIiNiMzMzMWRcIiwgZGF0YTogWyB7IHk6IDEwLCB4OiAxIH0sIHsgeTogOCwgeDogMiB9LCB7IHk6IDIsIHg6IDMgfSwgeyB5OiAzLCB4OiA0IH0sIHsgeTogMywgeDogNSB9LCB7IHk6IDQsIHg6IDYgfSwgeyB5OiA0LCB4OiA3IH0gXSB9LFxuICAgIHsgaWQ6IFwibGluZWRhdGEtNFwiLCBjb2xvcjogXCIjYjZhNzU2XCIsIGRhdGE6IFsgeyB5OiA2LCB4OiAxIH0sIHsgeTogMywgeDogMiB9LCB7IHk6IDMsIHg6IDMgfSwgeyB5OiA1LCB4OiA0IH0sIHsgeTogNiwgeDogNSB9LCB7IHk6IDYsIHg6IDYgfSwgeyB5OiA2LCB4OiA3IH0gXSB9XG5dXG5cbmNsYXNzIE5hbWVGb3JtIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICBzdXBlcihwcm9wcyk7XG4gICAgdGhpcy5zdGF0ZSA9IHsgdmFsdWU6ICcnLCB0eXBlOiBcInhcIiB9O1xuICAgIHRoaXMuaGFuZGxlQ2hhbmdlID0gdGhpcy5oYW5kbGVDaGFuZ2UuYmluZCh0aGlzKTtcbiAgICB0aGlzLmNoYW5nZVR5cGUgPSB0aGlzLmNoYW5nZVR5cGUuYmluZCh0aGlzKTtcbiAgICB0aGlzLmhhbmRsZVN1Ym1pdCA9IHRoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyk7XG4gIH1cblxuICBoYW5kbGVDaGFuZ2UoZXZlbnQpIHtcbiAgICB0aGlzLnNldFN0YXRlKHsgdmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZSB9KTtcbiAgfVxuXG4gIGNoYW5nZVR5cGUoZXZlbnQpIHtcbiAgICB0aGlzLnNldFN0YXRlKHsgdHlwZTogZXZlbnQudGFyZ2V0LnZhbHVlIH0pO1xuICB9XG5cbiAgaGFuZGxlU3VibWl0KGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAvL1lvdSBjb3VsZCBhbHNvIG11dGF0ZSB0aGUgZXhpc3RpbmcgYW5ub3RhdGlvblxuICAgIC8vdGhpcy5wcm9wcy51cGRhdGVBbm5vdGF0aW9ucyhPYmplY3QuYXNzaWduKHRoaXMucHJvcHMuZGF0YVBvaW50LCB7IHR5cGU6IFwieFwiLCBsYWJlbDogdGhpcy5zdGF0ZS52YWx1ZSB9KSlcbiAgICB0aGlzLnByb3BzLnVwZGF0ZUFubm90YXRpb25zKE9iamVjdC5hc3NpZ24oe30sIHRoaXMucHJvcHMuZGF0YVBvaW50LCB7IHR5cGU6IHRoaXMuc3RhdGUudHlwZSwgbGFiZWw6IHRoaXMuc3RhdGUudmFsdWUgfSkpXG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgcmV0dXJuIDxmb3JtIHN0eWxlPXt7IGJhY2tncm91bmQ6IFwiI0RERERERFwiIH19IG9uU3VibWl0PXt0aGlzLmhhbmRsZVN1Ym1pdH0+XG4gICAgICAgIDxwPnt0aGlzLnByb3BzLmRhdGFQb2ludC54fSx7dGhpcy5wcm9wcy5kYXRhUG9pbnQueX08L3A+XG4gICAgICAgIDxwPk5hbWU6PC9wPlxuICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT17dGhpcy5zdGF0ZS52YWx1ZX0gb25DaGFuZ2U9e3RoaXMuaGFuZGxlQ2hhbmdlfSAvPlxuICAgICAgICA8c2VsZWN0IHZhbHVlPXt0aGlzLnN0YXRlLnR5cGV9IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZVR5cGV9PlxuICAgICAgICAgICAgPG9wdGlvbiBsYWJlbD1cInhcIiB2YWx1ZT1cInhcIj5YPC9vcHRpb24+XG4gICAgICAgICAgICA8b3B0aW9uIGxhYmVsPVwieVwiIHZhbHVlPVwieVwiPlk8L29wdGlvbj5cbiAgICAgICAgICAgIDxvcHRpb24gbGFiZWw9XCJ4eVwiIHZhbHVlPVwieHlcIj5YWTwvb3B0aW9uPlxuICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJzdWJtaXRcIiB2YWx1ZT1cIlN1Ym1pdFwiIC8+XG4gICAgICA8L2Zvcm0+XG4gIH1cbn1cblxuXG5jbGFzcyBYWUZyYW1lRXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLmNsaWNrUG9pbnQgPSB0aGlzLmNsaWNrUG9pbnQuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmN1c3RvbUhUTUxSdWxlcyA9IHRoaXMuY3VzdG9tSFRNTFJ1bGVzLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy51cGRhdGVBbm5vdGF0aW9ucyA9IHRoaXMudXBkYXRlQW5ub3RhdGlvbnMuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZUxpbmVUeXBlID0gdGhpcy5jaGFuZ2VMaW5lVHlwZS5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHRoaXMuc3RhdGUgPSB7IGFubm90YXRpb25zOiBbXSwgbGluZVR5cGU6IFwiYnVtcGFyZWFcIiB9XG4gICAgfVxuXG4gICAgY2hhbmdlTGluZVR5cGUoKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyBsaW5lVHlwZTogdGhpcy5zdGF0ZS5saW5lVHlwZSA9PT0gXCJidW1wYXJlYVwiID8gXCJsaW5lXCIgOiBcImJ1bXBhcmVhXCIgfSk7XG4gICAgfVxuXG4gICAgY2xpY2tQb2ludChkKSB7XG4gICAgICAgIGNvbnN0IGZvcm1sZXNzQW5ub3RhdGlvbnMgPSB0aGlzLnN0YXRlLmFubm90YXRpb25zLmZpbHRlcihwID0+IHAudHlwZSAhPT0gXCJmb3JtXCIpXG4gICAgICAgIGNvbnN0IGZvcm1Bbm5vdGF0aW9uID0gT2JqZWN0LmFzc2lnbih7IHR5cGU6IFwiZm9ybVwiIH0sIGQpXG4gICAgICAgIGZvcm1sZXNzQW5ub3RhdGlvbnMucHVzaChmb3JtQW5ub3RhdGlvbilcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGFubm90YXRpb25zOiBmb3JtbGVzc0Fubm90YXRpb25zIH0pXG4gICAgfVxuXG4gICAgY3VzdG9tSFRNTFJ1bGVzKHsgc2NyZWVuQ29vcmRpbmF0ZXMsIGQgfSkge1xuICAgICAgICBpZiAoZC50eXBlID09PSBcImZvcm1cIikge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgc3R5bGU9e3sgcG9pbnRlckV2ZW50czogXCJhbGxcIiwgcG9zaXRpb246IFwiYWJzb2x1dGVcIiwgbGVmdDogc2NyZWVuQ29vcmRpbmF0ZXNbMF0sIHRvcDogc2NyZWVuQ29vcmRpbmF0ZXNbMV0gfX0+XG4gICAgICAgICAgICAgICAgPE5hbWVGb3JtIHVwZGF0ZUFubm90YXRpb25zPXt0aGlzLnVwZGF0ZUFubm90YXRpb25zfSBkYXRhUG9pbnQ9e2R9IC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgfVxuICAgICAgICAvL0lmIHlvdSBkb24ndCByZXR1cm4gbnVsbCwgaXQgd2lsbCBzdXBwcmVzcyB0aGUgcmVzdCBvZiB5b3VyIEhUTUwgcnVsZXNcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICB1cGRhdGVBbm5vdGF0aW9ucyhuZXdBbm5vdGF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGZvcm1sZXNzQW5ub3RhdGlvbnMgPSB0aGlzLnN0YXRlLmFubm90YXRpb25zLmZpbHRlcihkID0+IGQudHlwZSAhPT0gXCJmb3JtXCIpXG4gICAgICAgIGZvcm1sZXNzQW5ub3RhdGlvbnMucHVzaChuZXdBbm5vdGF0aW9uKVxuICAgICAgICB0aGlzLnNldFN0YXRlKHsgYW5ub3RhdGlvbnM6IGZvcm1sZXNzQW5ub3RhdGlvbnMgfSlcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgY29uc3QgZnJhbWVIZWlnaHQgPSAyMDBcblxuICAgICAgIGxldCBkaXNwbGF5RGF0YSA9IHRlc3REYXRhXG5cbiAgICAgICBjb25zdCBleGFtcGxlQW5ub3RhdGlvbnMgPSBbXG4gICAgICAgIHsgeDogMywgeTogMywgdHlwZTogXCJ4eVwiLCBsYWJlbDogXCJ4eVwiIH0sXG4gICAgICAgIHsgeDogNCwgaWQ6IFwibGluZWRhdGEtMjIyXCIsIHR5cGU6IFwieHlcIiwgbGFiZWw6IFwieHkgSURcIiB9LFxuICAgICAgICB7IHg6IDQsIGlkOiBcImxpbmVkYXRhLTNcIiwgdHlwZTogXCJ4eVwiLCBsYWJlbDogXCJ4eSBJRFwiIH0sXG4gICAgICAgIHsgdHlwZTogXCJlbmNsb3NlXCIsIHJwOiBcInRvcFwiLCByZDogMjUsIGNvb3JkaW5hdGVzOiBbIHsgeDogNiwgaWQ6IFwibGluZWRhdGEtM1wiIH0sIHsgeDogNiwgaWQ6IFwibGluZWRhdGEtNFwiIH0gXSwgbGFiZWw6IFwiZW5jbG9zZSBJRFwiIH0sXG4gICAgICAgIHsgeDogMywgeTogOTAsIGR5OiAtMzAsIHR5cGU6IFwieFwiLCBsYWJlbDogXCJ4XCIgfSxcbiAgICAgICAgeyB4OiB7IGxpbmVJRDogXCJsaW5lLTFcIiwgcG9pbnRJRDogXCJwb2ludC0xN1wiIH0sIHk6IDkwLCBkeTogLTMwLCB0eXBlOiBcInhcIiwgbGFiZWw6IFwieFwiIH0sXG4gICAgICAgIHsgeDogMjQwLCB5OiAzLCB0eXBlOiBcInlcIiwgbGFiZWw6IFwieVwiIH0sXG4gICAgICAgIHsgdHlwZTogXCJlbmNsb3NlXCIsIHJwOiBcInRvcFwiLCByZDogMjUsIGNvb3JkaW5hdGVzOiBbIHsgeDogMSwgeTogNSB9LCB7IHg6IDIsIHk6IDggfSwgeyB4OiAyLCB5OiAxMCB9IF0sIGxhYmVsOiBcImVuY2xvc2VcIiB9XG4gICAgICAgXVxuXG4gICAgICAgY29uc3QgYWxsQW5ub3RhdGlvbnMgPSBbIC4uLmV4YW1wbGVBbm5vdGF0aW9ucywgLi4udGhpcy5zdGF0ZS5hbm5vdGF0aW9ucyBdXG5cbiAgICAgICAgcmV0dXJuIDxkaXY+XG4gICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e3RoaXMuY2hhbmdlTGluZVR5cGV9PkNoYW5nZSBUeXBlIExpbmU8L2J1dHRvbj5cbiAgICAgICAgICAgIDxYWUZyYW1lXG4gICAgICAgICAgICBzaXplPXtbIDUwMCxmcmFtZUhlaWdodCBdfVxuICAgICAgICAgICAgbGluZXM9e2Rpc3BsYXlEYXRhfVxuICAgICAgICAgICAgbGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XG4gICAgICAgICAgICB4QWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgeUFjY2Vzc29yPXtkID0+IGQueX1cbiAgICAgICAgICAgIGxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XG4gICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICBjdXN0b21DbGlja0JlaGF2aW9yPXt0aGlzLmNsaWNrUG9pbnR9XG4gICAgICAgICAgICBhbm5vdGF0aW9ucz17YWxsQW5ub3RhdGlvbnN9XG4gICAgICAgICAgICBodG1sQW5ub3RhdGlvblJ1bGVzPXt0aGlzLmN1c3RvbUhUTUxSdWxlc31cbiAgICAgICAgICAgIGN1c3RvbUxpbmVUeXBlPXt7IHR5cGU6IHRoaXMuc3RhdGUubGluZVR5cGUsIGludGVycG9sYXRvcjogY3VydmVDYXJkaW5hbCwgc29ydDogbnVsbCB9fVxuICAgICAgICAgICAgbWFyZ2luPXsxMH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gWFlGcmFtZUV4YW1wbGVzO1xuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0J1xuaW1wb3J0IHsgWFlGcmFtZSB9IGZyb20gJ3NlbWlvdGljJztcbmltcG9ydCB7IGN1cnZlQmFzaXMsIGN1cnZlQ2FyZGluYWwsIGN1cnZlQ2F0bXVsbFJvbSwgY3VydmVMaW5lYXIsIGN1cnZlTmF0dXJhbCwgY3VydmVNb25vdG9uZVgsIGN1cnZlU3RlcCAgfSBmcm9tICdkMy1zaGFwZSdcblxuY29uc3QgdGVzdERhdGEgPSBbXG4gICAgeyBpZDogXCJsaW5lZGF0YS0xXCIsIGNvbG9yOiBcIiMwMGEyY2VcIiwgZGF0YTogWyB7IHk6IDUsIHg6IDEgfSwgeyB5OiA3LCB4OiAyIH0sIHsgeTogNywgeDogMyB9LCB7IHk6IDQsIHg6IDQgfSwgeyB5OiAyLCB4OiA1IH0sIHsgeTogMywgeDogNiB9LCB7IHk6IDUsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS0yXCIsIGNvbG9yOiBcIiM0ZDQzMGNcIiwgZGF0YTogWyB7IHk6IDEsIHg6IDEgfSwgeyB5OiA2LCB4OiAyIH0sIHsgeTogOCwgeDogMyB9LCB7IHk6IDYsIHg6IDQgfSwgeyB5OiA0LCB4OiA1IH0sIHsgeTogMiwgeDogNiB9LCB7IHk6IDAsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS0zXCIsIGNvbG9yOiBcIiNiMzMzMWRcIiwgZGF0YTogWyB7IHk6IDEwLCB4OiAxIH0sIHsgeTogOCwgeDogMiB9LCB7IHk6IDAsIHg6IDMgfSwgeyB5OiAwLCB4OiA0IH0sIHsgeTogMywgeDogNSB9LCB7IHk6IDQsIHg6IDYgfSwgeyB5OiA0LCB4OiA3IH0gXSB9LFxuICAgIHsgaWQ6IFwibGluZWRhdGEtNFwiLCBjb2xvcjogXCIjYjZhNzU2XCIsIGRhdGE6IFsgeyB5OiA2LCB4OiAxIH0sIHsgeTogMywgeDogMiB9LCB7IHk6IDMsIHg6IDMgfSwgeyB5OiA1LCB4OiA0IH0sIHsgeTogNiwgeDogNSB9LCB7IHk6IDYsIHg6IDYgfSwgeyB5OiA2LCB4OiA3IH0gXSB9XG5dXG5cbmNsYXNzIFhZRnJhbWVFeGFtcGxlcyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpe1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7IGN1c3RvbUxpbmVUeXBlOiBcImRpZmZlcmVuY2VcIiwgY3VydmU6IFwiY3VydmVCYXNpc1wiIH1cbiAgICAgICAgdGhpcy5jaGFuZ2VDdXN0b21MaW5lVHlwZSA9IHRoaXMuY2hhbmdlQ3VzdG9tTGluZVR5cGUuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLmNoYW5nZUN1cnZlID0gdGhpcy5jaGFuZ2VDdXJ2ZS5iaW5kKHRoaXMpXG4gICAgfVxuXG4gICAgY2hhbmdlQ3VzdG9tTGluZVR5cGUoZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgY3VzdG9tTGluZVR5cGU6IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgY2hhbmdlQ3VydmUgKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGN1cnZlOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIHJlbmRlcigpIHtcblxuICAgICAgICBjb25zdCBmcmFtZUhlaWdodCA9IDEwMFxuICAgICAgICBjb25zdCBvcHRpb25zID0gWyBcImxpbmVcIiwgXCJkaWZmZXJlbmNlXCIsIFwic3RhY2tlZGFyZWFcIiwgXCJidW1wbGluZVwiLCBcImJ1bXBhcmVhXCIgXVxuICAgICAgICAgICAgLm1hcChkID0+IDxvcHRpb24ga2V5PXtcImxpbmUtb3B0aW9uLVwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG5cbiAgICAgICAgY29uc3QgY3VydmVPcHRpb25zID0gWyBcImN1cnZlQmFzaXNcIiwgXCJjdXJ2ZUNhcmRpbmFsXCIsIFwiY3VydmVDYXRtdWxsUm9tXCIsIFwiY3VydmVMaW5lYXJcIiwgXCJjdXJ2ZU5hdHVyYWxcIiwgXCJjdXJ2ZU1vbm90b25lWFwiLCBcImN1cnZlU3RlcFwiIF1cbiAgICAgICAgICAgIC5tYXAoZCA9PiA8b3B0aW9uIGtleT17XCJjdXJ2ZS1vcHRpb24tXCIgKyBkfSBsYWJlbD17ZH0gdmFsdWU9e2R9PntkfTwvb3B0aW9uPilcbiAgICAgICAgbGV0IGRpc3BsYXlEYXRhID0gdGVzdERhdGFcblxuICAgICAgICBjb25zdCBjdXJ2ZUhhc2ggPSB7IGN1cnZlQmFzaXMsIGN1cnZlQ2FyZGluYWwsIGN1cnZlQ2F0bXVsbFJvbSwgY3VydmVMaW5lYXIsIGN1cnZlTmF0dXJhbCwgY3VydmVNb25vdG9uZVgsIGN1cnZlU3RlcCB9XG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUuY3VzdG9tTGluZVR5cGUgPT09IFwiZGlmZmVyZW5jZVwiKSB7XG4gICAgICAgICAgICBkaXNwbGF5RGF0YSA9IHRlc3REYXRhLmZpbHRlcigoZCxpKSA9PiBpIDwgMilcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiA8ZGl2PlxuICAgICAgICAgICAgPHNwYW4+Y3VzdG9tTGluZVR5cGU9PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VDdXN0b21MaW5lVHlwZX0+e29wdGlvbnN9PC9zZWxlY3Q+PC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4+Y3VydmU8c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZUN1cnZlfT57Y3VydmVPcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj5cblxuICAgICAgICAgICAgPFhZRnJhbWVcbiAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICBsaW5lcz17ZGlzcGxheURhdGF9XG4gICAgICAgICAgICBsaW5lRGF0YUFjY2Vzc29yPXtkID0+IGQuZGF0YX1cbiAgICAgICAgICAgIHhBY2Nlc3Nvcj17ZCA9PiBkLnh9XG4gICAgICAgICAgICB5QWNjZXNzb3I9e2QgPT4gZC55fVxuICAgICAgICAgICAgbGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cbiAgICAgICAgICAgIHNob3dMaW5lUG9pbnRzPXt0cnVlfVxuICAgICAgICAgICAgY2FudmFzTGluZXM9eyhkLGkpID0+IGklMiA9PT0gMH1cbiAgICAgICAgICAgIGN1c3RvbUxpbmVUeXBlPXt0aGlzLnN0YXRlLmN1c3RvbUxpbmVUeXBlfVxuICAgICAgICAgICAgbWFyZ2luPXsxMH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8WFlGcmFtZVxuICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgIGxpbmVzPXtkaXNwbGF5RGF0YX1cbiAgICAgICAgICAgIGxpbmVEYXRhQWNjZXNzb3I9e2QgPT4gZC5kYXRhfVxuICAgICAgICAgICAgeEFjY2Vzc29yPXtkID0+IGQueH1cbiAgICAgICAgICAgIHlBY2Nlc3Nvcj17ZCA9PiBkLnl9XG4gICAgICAgICAgICBsaW5lU3R5bGU9e2QgPT4gKHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yIH0pfVxuICAgICAgICAgICAgY2FudmFzTGluZXM9eyhkLGkpID0+IGklMiA9PT0gMH1cbiAgICAgICAgICAgIGN1c3RvbUxpbmVUeXBlPXt7IHR5cGU6IHRoaXMuc3RhdGUuY3VzdG9tTGluZVR5cGUsIGludGVycG9sYXRvcjogY3VydmVIYXNoW3RoaXMuc3RhdGUuY3VydmVdLCBzb3J0OiBudWxsIH19XG4gICAgICAgICAgICBtYXJnaW49ezEwfVxuICAgICAgICAgICAgZGVmaW5lZD17ZCA9PiBkLnkgIT09IDB9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFhZRnJhbWVFeGFtcGxlcztcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCdcbmltcG9ydCB7IFhZRnJhbWUgfSBmcm9tICdzZW1pb3RpYyc7XG5cbmNvbnN0IHRlc3REYXRhID0gW1xuICAgIHsgaWQ6IFwibGluZWRhdGEtMVwiLCBjb2xvcjogXCIjMDBhMmNlXCIsIGRhdGE6IFsgeyB5OiA1LCB4OiAxIH0sIHsgeTogNywgeDogMiB9LCB7IHk6IDcsIHg6IDMgfSwgeyB5OiA0LCB4OiA0IH0sIHsgeTogMiwgeDogNSB9LCB7IHk6IDMsIHg6IDYgfSwgeyB5OiA1LCB4OiA3IH0gXSB9LFxuICAgIHsgaWQ6IFwibGluZWRhdGEtMlwiLCBjb2xvcjogXCIjNGQ0MzBjXCIsIGRhdGE6IFsgeyB5OiAxLCB4OiAxIH0sIHsgeTogNiwgeDogMiB9LCB7IHk6IDgsIHg6IDMgfSwgeyB5OiA2LCB4OiA0IH0sIHsgeTogNCwgeDogNSB9LCB7IHk6IDIsIHg6IDYgfSwgeyB5OiAwLCB4OiA3IH0gXSB9LFxuICAgIHsgaWQ6IFwibGluZWRhdGEtM1wiLCBjb2xvcjogXCIjYjMzMzFkXCIsIGRhdGE6IFsgeyB5OiAxMCwgeDogMSB9LCB7IHk6IDgsIHg6IDIgfSwgeyB5OiAyLCB4OiAzIH0sIHsgeTogMywgeDogNCB9LCB7IHk6IDMsIHg6IDUgfSwgeyB5OiA0LCB4OiA2IH0sIHsgeTogNCwgeDogNyB9IF0gfSxcbiAgICB7IGlkOiBcImxpbmVkYXRhLTRcIiwgY29sb3I6IFwiI2I2YTc1NlwiLCBkYXRhOiBbIHsgeTogNiwgeDogMSB9LCB7IHk6IDMsIHg6IDIgfSwgeyB5OiAzLCB4OiAzIH0sIHsgeTogNSwgeDogNCB9LCB7IHk6IDYsIHg6IDUgfSwgeyB5OiA2LCB4OiA2IH0sIHsgeTogNiwgeDogNyB9IF0gfVxuXVxuXG5jbGFzcyBYWUZyYW1lRXhhbXBsZXNNaXNjIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcyl7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG5cbiAgICAgICAgY29uc3QgZnJhbWVIZWlnaHQgPSAxMDBcblxuICAgICAgY29uc3QgYXhlcyA9IFtcbiAgICAgICAgeyBrZXk6IFwieUF4aXNcIiwgb3JpZW50OiBcImxlZnRcIiwgY2xhc3NOYW1lOiBcInlzY2FsZVwiLCBuYW1lOiBcIkNvdW50QXhpc1wiLCB0aWNrRm9ybWF0OiAoZCkgPT4gZCArIFwiJVwiIH0sXG4gICAgICAgIHsga2V5OiBcInhBeGlzXCIsIG9yaWVudDogXCJib3R0b21cIiwgY2xhc3NOYW1lOiBcInhzY2FsZVwiLCBuYW1lOiBcIlRpbWVBeGlzXCIsIHRpY2tWYWx1ZXM6IFsgMSwgMiwgMywgNCwgNSwgNiwgNyBdLCB0aWNrRm9ybWF0OiBkID0+IGQgKyBcIiBkYXlcIiB9XG4gICAgICBdXG5cblxuICAgICAgICByZXR1cm4gPGRpdj5cbiAgICAgICAgICAgIDxYWUZyYW1lXG4gICAgICAgICAgICB0aXRsZT0nbGluZVJlbmRlck1vZGU9eygpID0+IFwic2tldGNoeVwifSdcbiAgICAgICAgICAgIHNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XG4gICAgICAgICAgICBsaW5lcz17dGVzdERhdGF9XG4gICAgICAgICAgICBsaW5lRGF0YUFjY2Vzc29yPXtkID0+IGQuZGF0YX1cbiAgICAgICAgICAgIHhBY2Nlc3Nvcj17ZCA9PiBkLnh9XG4gICAgICAgICAgICB5QWNjZXNzb3I9e2QgPT4gZC55fVxuICAgICAgICAgICAgbGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cbiAgICAgICAgICAgIGN1c3RvbUxpbmVUeXBlPXtcInN0YWNrZWRhcmVhXCJ9XG4gICAgICAgICAgICBsaW5lUmVuZGVyTW9kZT17KCkgPT4gXCJza2V0Y2h5XCJ9XG4gICAgICAgICAgICAvPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIjwgWFlGcmFtZVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ0aXRsZT0nbGluZVJlbmRlck1vZGU9eygpID0+ICdza2V0Y2h5J31cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wic2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibGluZXM9e3Rlc3REYXRhfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJsaW5lRGF0YUFjY2Vzc29yPXtkID0+IGQuZGF0YX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wieEFjY2Vzc29yPXtkID0+IGQueH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wieUFjY2Vzc29yPXtkID0+IGQueX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiY3VzdG9tTGluZVR5cGU9eydzdGFja2VkYXJlYSd9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImxpbmVSZW5kZXJNb2RlPXsoKSA9PiAnc2tldGNoeSd9XCJ9PC9wPlxuICAgICAgICAgICAgPFhZRnJhbWVcbiAgICAgICAgICAgIHRpdGxlPXs8Zz48dGV4dD5cImhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cIjwvdGV4dD48L2c+fVxuICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgIGxpbmVzPXt0ZXN0RGF0YX1cbiAgICAgICAgICAgIGxpbmVEYXRhQWNjZXNzb3I9e2QgPT4gZC5kYXRhfVxuICAgICAgICAgICAgeEFjY2Vzc29yPXtkID0+IGQueH1cbiAgICAgICAgICAgIHlBY2Nlc3Nvcj17ZCA9PiBkLnl9XG4gICAgICAgICAgICBsaW5lU3R5bGU9e2QgPT4gKHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yIH0pfVxuICAgICAgICAgICAgY2FudmFzTGluZXM9eyhkLGkpID0+IGkgPiAxfVxuICAgICAgICAgICAgY3VzdG9tTGluZVR5cGU9e1wibGluZVwifVxuICAgICAgICAgICAgaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVxuICAgICAgICAgICAgLz5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCI8IFhZRnJhbWVcIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1widGl0bGU9J2hvdmVyQW5ub3RhdGlvbj17dHJ1ZX0nXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInNpemU9e1sgNTAwLGZyYW1lSGVpZ2h0IF19XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImxpbmVzPXt0ZXN0RGF0YX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInhBY2Nlc3Nvcj17ZCA9PiBkLnh9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInlBY2Nlc3Nvcj17ZCA9PiBkLnl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcImhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cIn08L3A+XG4gICAgICAgICAgICA8WFlGcmFtZVxuICAgICAgICAgICAgdGl0bGU9XCJheGVzXCJcbiAgICAgICAgICAgIHNpemU9e1sgNTAwLDQwMCBdfVxuICAgICAgICAgICAgbGluZXM9e3Rlc3REYXRhfVxuICAgICAgICAgICAgbGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XG4gICAgICAgICAgICB4QWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgeUFjY2Vzc29yPXtkID0+IGQueX1cbiAgICAgICAgICAgIGxpbmVTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSl9XG4gICAgICAgICAgICBob3ZlckFubm90YXRpb249e3RydWV9XG4gICAgICAgICAgICBjYW52YXNMaW5lcz17KGQsaSkgPT4gaSA+IDF9XG4gICAgICAgICAgICBjdXN0b21MaW5lVHlwZT17XCJsaW5lXCJ9XG4gICAgICAgICAgICBheGVzPXtheGVzfVxuICAgICAgICAgICAgbWFyZ2luPXsgNTAgfVxuICAgICAgICAgICAgLz5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJjb25zdCBheGVzID0gW1wifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ7IGtleTogJ3lBeGlzJywgb3JpZW50OiAnbGVmdCcsIGNsYXNzTmFtZTogJ3lzY2FsZScsIG5hbWU6ICdDb3VudEF4aXMnLCB0aWNrRm9ybWF0OiAoZCkgPT4gZCArICclJyB9LFwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJ7IGtleTogJ3hBeGlzJywgb3JpZW50OiAnYm90dG9tJywgY2xhc3NOYW1lOiAneHNjYWxlJywgbmFtZTogJ1RpbWVBeGlzJywgdGlja1ZhbHVlczogWyAxLCAyLCAzLCA0LCA1LCA2LCA3IF0sIHRpY2tGb3JtYXQ6IGQgPT4gZCArICcgZGF5JyB9XCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcIl1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiPCBYWUZyYW1lXCJ9PC9wPlxuPHAgY2xhc3NOYW1lPVwiY29kZVwiPntcInRpdGxlPSdheGVzJ1wifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJzaXplPXtbIDUwMCw0MDAgXX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibGluZXM9e3Rlc3REYXRhfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJsaW5lRGF0YUFjY2Vzc29yPXtkID0+IGQuZGF0YX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wieEFjY2Vzc29yPXtkID0+IGQueH1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wieUFjY2Vzc29yPXtkID0+IGQueX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wibGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cIn08L3A+XG48cCBjbGFzc05hbWU9XCJjb2RlXCI+e1wiaG92ZXJBbm5vdGF0aW9uPXt0cnVlfVwifTwvcD5cbjxwIGNsYXNzTmFtZT1cImNvZGVcIj57XCJheGVzPXtheGVzfVwifTwvcD5cbiAgICAgICAgICAgIDxYWUZyYW1lXG4gICAgICAgICAgICB0aXRsZT1cInpvb21cIlxuICAgICAgICAgICAgc2l6ZT17WyA1MDAsNDAwIF19XG4gICAgICAgICAgICBsaW5lcz17dGVzdERhdGF9XG4gICAgICAgICAgICBsaW5lRGF0YUFjY2Vzc29yPXtkID0+IGQuZGF0YX1cbiAgICAgICAgICAgIHhBY2Nlc3Nvcj17ZCA9PiBkLnh9XG4gICAgICAgICAgICB5QWNjZXNzb3I9e2QgPT4gZC55fVxuICAgICAgICAgICAgbGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cbiAgICAgICAgICAgIGhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cbiAgICAgICAgICAgIHpvb21hYmxlPXt0cnVlfVxuICAgICAgICAgICAgY3VzdG9tTGluZVR5cGU9e1wibGluZVwifVxuICAgICAgICAgICAgYXhlcz17YXhlc31cbiAgICAgICAgICAgIG1hcmdpbj17IDUwIH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8WFlGcmFtZVxuICAgICAgICAgICAgdGl0bGU9XCJmaXhlZCBzaW5nbGUgZXh0ZW50XCJcbiAgICAgICAgICAgIHNpemU9e1sgNTAwLDQwMCBdfVxuICAgICAgICAgICAgbGluZXM9e3Rlc3REYXRhfVxuICAgICAgICAgICAgbGluZURhdGFBY2Nlc3Nvcj17ZCA9PiBkLmRhdGF9XG4gICAgICAgICAgICB4QWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgeUFjY2Vzc29yPXtkID0+IGQueX1cbiAgICAgICAgICAgIHhFeHRlbnQ9e1sgdW5kZWZpbmVkLCAzIF19XG4gICAgICAgICAgICB5RXh0ZW50PXtbIHVuZGVmaW5lZCwgOCBdfVxuICAgICAgICAgICAgbGluZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cbiAgICAgICAgICAgIGhvdmVyQW5ub3RhdGlvbj17dHJ1ZX1cbiAgICAgICAgICAgIGN1c3RvbUxpbmVUeXBlPXtcImxpbmVcIn1cbiAgICAgICAgICAgIGF4ZXM9e2F4ZXN9XG4gICAgICAgICAgICBtYXJnaW49eyA1MCB9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gWFlGcmFtZUV4YW1wbGVzTWlzYztcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCdcbmltcG9ydCB7IFhZRnJhbWUsIE1hcmsgfSBmcm9tICdzZW1pb3RpYyc7XG5cbmNvbnN0IGNvbG9ycyA9IFtcbiAgICBcIiMwMGEyY2VcIixcbiAgICBcIiM0ZDQzMGNcIixcbiAgICBcIiNiMzMzMWRcIixcbiAgICBcIiNiNmE3NTZcIlxuXVxuY29uc3QgdGVzdERhdGEgPSBbXVxuZm9yIChsZXQgeD0xO3g8NTAwO3grKykge1xuICAgIHRlc3REYXRhLnB1c2goeyB4OiBNYXRoLnJhbmRvbSgpICogMTAwLCB5OiBNYXRoLnJhbmRvbSgpICogMTAwLCByOiBNYXRoLnJhbmRvbSgpICogMTAsIGNvbG9yOiBjb2xvcnNbeCU0XSB9KVxufVxuXG5jbGFzcyBYWUZyYW1lUG9pbnRFeGFtcGxlcyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpe1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuXG4gICAgICAgIGNvbnN0IGZyYW1lSGVpZ2h0ID0gMzAwXG5cbiAgICAgICAgcmV0dXJuIDxkaXY+XG4gICAgICAgICAgICA8WFlGcmFtZVxuICAgICAgICAgICAgdGl0bGU9XCJQb2ludHNcIlxuICAgICAgICAgICAgc2l6ZT17WyA1MDAsZnJhbWVIZWlnaHQgXX1cbiAgICAgICAgICAgIHBvaW50cz17dGVzdERhdGF9XG4gICAgICAgICAgICB4QWNjZXNzb3I9e2QgPT4gZC54fVxuICAgICAgICAgICAgeUFjY2Vzc29yPXtkID0+IGQueX1cbiAgICAgICAgICAgIGNhbnZhc1BvaW50cz17KGQsaSkgPT4gaSUzID09PSAwfVxuICAgICAgICAgICAgcG9pbnRTdHlsZT17ZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBzdHJva2U6IFwiYmxhY2tcIiwgc3Ryb2tlV2lkdGg6IDEgfSl9XG4gICAgICAgICAgICBjdXN0b21Qb2ludE1hcms9eyhkLGkpID0+IGklMiA/IDxNYXJrIG1hcmtUeXBlPVwiY2lyY2xlXCIgcj1cIjVcIiAvPiA6IDxNYXJrIG1hcmtUeXBlPVwicmVjdFwiIHg9ey00fSB5PXstNH0gd2lkdGg9ezh9IGhlaWdodD17OH0gLz59XG4gICAgICAgICAgICBtYXJnaW49ezEwfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYWUZyYW1lUG9pbnRFeGFtcGxlcztcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCdcbmltcG9ydCB7IE1pbmltYXBYWUZyYW1lIH0gZnJvbSAnc2VtaW90aWMnO1xuaW1wb3J0IHsgY3VydmVCYXNpcywgY3VydmVDYXJkaW5hbCwgY3VydmVDYXRtdWxsUm9tLCBjdXJ2ZUxpbmVhciwgY3VydmVOYXR1cmFsLCBjdXJ2ZU1vbm90b25lWCwgY3VydmVTdGVwICB9IGZyb20gJ2QzLXNoYXBlJ1xuXG5jb25zdCB0ZXN0RGF0YSA9IFtcbiAgICB7IGlkOiBcImxpbmVkYXRhLTFcIiwgY29sb3I6IFwiIzAwYTJjZVwiLCBkYXRhOiBbIHsgeTogNSwgeDogMSB9LCB7IHk6IDcsIHg6IDIgfSwgeyB5OiA3LCB4OiAzIH0sIHsgeTogNCwgeDogNCB9LCB7IHk6IDIsIHg6IDUgfSwgeyB5OiAzLCB4OiA2IH0sIHsgeTogNSwgeDogNyB9IF0gfSxcbiAgICB7IGlkOiBcImxpbmVkYXRhLTJcIiwgY29sb3I6IFwiIzRkNDMwY1wiLCBkYXRhOiBbIHsgeTogMSwgeDogMSB9LCB7IHk6IDYsIHg6IDIgfSwgeyB5OiA4LCB4OiAzIH0sIHsgeTogNiwgeDogNCB9LCB7IHk6IDQsIHg6IDUgfSwgeyB5OiAyLCB4OiA2IH0sIHsgeTogMCwgeDogNyB9IF0gfSxcbiAgICB7IGlkOiBcImxpbmVkYXRhLTNcIiwgY29sb3I6IFwiI2IzMzMxZFwiLCBkYXRhOiBbIHsgeTogMTAsIHg6IDEgfSwgeyB5OiA4LCB4OiAyIH0sIHsgeTogMiwgeDogMyB9LCB7IHk6IDMsIHg6IDQgfSwgeyB5OiAzLCB4OiA1IH0sIHsgeTogNCwgeDogNiB9LCB7IHk6IDQsIHg6IDcgfSBdIH0sXG4gICAgeyBpZDogXCJsaW5lZGF0YS00XCIsIGNvbG9yOiBcIiNiNmE3NTZcIiwgZGF0YTogWyB7IHk6IDYsIHg6IDEgfSwgeyB5OiAzLCB4OiAyIH0sIHsgeTogMywgeDogMyB9LCB7IHk6IDUsIHg6IDQgfSwgeyB5OiA2LCB4OiA1IH0sIHsgeTogNiwgeDogNiB9LCB7IHk6IDYsIHg6IDcgfSBdIH1cbl1cblxubGV0IGRpc3BsYXlEYXRhID0gdGVzdERhdGEubWFwKGQgPT4ge1xuICAgIGxldCBtb3JlRGF0YSA9IFsgLi4uZC5kYXRhLCAuLi5kLmRhdGEubWFwKHAgPT4gKHsgeTogcC55ICsgTWF0aC5yYW5kb20oKSAqIDEwLCB4OiBwLnggKyA3IH0pKSBdXG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oZCwgeyBkYXRhOiBtb3JlRGF0YSB9KVxufSlcblxuY2xhc3MgWFlGcmFtZVdpdGhNaW5pbWFwRXhhbXBsZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0geyBjdXN0b21MaW5lVHlwZTogXCJidW1wYXJlYVwiLCBjdXJ2ZTogXCJjdXJ2ZUJhc2lzXCIsIGV4dGVudDogWyAxLDggXSB9XG4gICAgICAgIHRoaXMuY2hhbmdlQ3VzdG9tTGluZVR5cGUgPSB0aGlzLmNoYW5nZUN1c3RvbUxpbmVUeXBlLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy5jaGFuZ2VDdXJ2ZSA9IHRoaXMuY2hhbmdlQ3VydmUuYmluZCh0aGlzKVxuICAgICAgICB0aGlzLnVwZGF0ZURhdGVSYW5nZSA9IHRoaXMudXBkYXRlRGF0ZVJhbmdlLmJpbmQodGhpcylcbiAgICB9XG5cbiAgICBjaGFuZ2VDdXN0b21MaW5lVHlwZShlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyBjdXN0b21MaW5lVHlwZTogZS50YXJnZXQudmFsdWUgfSlcbiAgICB9XG5cbiAgICBjaGFuZ2VDdXJ2ZSAoZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgY3VydmU6IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuICAgIHVwZGF0ZURhdGVSYW5nZSAoZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgZXh0ZW50OiBlIH0pXG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuXG4gICAgICAgIGNvbnN0IGZyYW1lV2lkdGggPSA1MDBcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFsgXCJsaW5lXCIsIFwiZGlmZmVyZW5jZVwiLCBcInN0YWNrZWRhcmVhXCIsIFwiYnVtcGxpbmVcIiwgXCJidW1wYXJlYVwiIF1cbiAgICAgICAgICAgIC5tYXAoZCA9PiA8b3B0aW9uIGtleT17XCJsaW5lLW9wdGlvbi1cIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuXG4gICAgICAgIGNvbnN0IGN1cnZlT3B0aW9ucyA9IFsgXCJjdXJ2ZUJhc2lzXCIsIFwiY3VydmVDYXJkaW5hbFwiLCBcImN1cnZlQ2F0bXVsbFJvbVwiLCBcImN1cnZlTGluZWFyXCIsIFwiY3VydmVOYXR1cmFsXCIsIFwiY3VydmVNb25vdG9uZVhcIiwgXCJjdXJ2ZVN0ZXBcIiBdXG4gICAgICAgICAgICAubWFwKGQgPT4gPG9wdGlvbiBrZXk9e1wiY3VydmUtb3B0aW9uLVwiICsgZH0gbGFiZWw9e2R9IHZhbHVlPXtkfT57ZH08L29wdGlvbj4pXG5cbiAgICAgICAgY29uc3QgY3VydmVIYXNoID0geyBjdXJ2ZUJhc2lzLCBjdXJ2ZUNhcmRpbmFsLCBjdXJ2ZUNhdG11bGxSb20sIGN1cnZlTGluZWFyLCBjdXJ2ZU5hdHVyYWwsIGN1cnZlTW9ub3RvbmVYLCBjdXJ2ZVN0ZXAgfVxuICAgICAgICBsZXQgZmluYWxkaXNwbGF5RGF0YSA9IGRpc3BsYXlEYXRhXG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUuY3VzdG9tTGluZVR5cGUgPT09IFwiZGlmZmVyZW5jZVwiKSB7XG4gICAgICAgICAgICBmaW5hbGRpc3BsYXlEYXRhID0gZGlzcGxheURhdGEuZmlsdGVyKChkLGkpID0+IGkgPCAyKVxuICAgICAgICB9XG5cbiAgICAgIGNvbnN0IGF4ZXMgPSBbXG4gICAgICAgIHsga2V5OiBcInlBeGlzXCIsIG9yaWVudDogXCJsZWZ0XCIsIGNsYXNzTmFtZTogXCJ5c2NhbGVcIiwgbmFtZTogXCJDb3VudEF4aXNcIiwgdGlja1ZhbHVlczogWyAxMCwgMjAsIDMwLCA0MCwgNTAgXSwgdGlja0Zvcm1hdDogKGQpID0+IGQgKyBcIiVcIiB9LFxuICAgICAgICB7IGtleTogXCJ4QXhpc1wiLCBvcmllbnQ6IFwiYm90dG9tXCIsIGNsYXNzTmFtZTogXCJ4c2NhbGVcIiwgbmFtZTogXCJUaW1lQXhpc1wiLCB0aWNrVmFsdWVzOiBbIDIsIDQsIDYsIDgsIDEwLCAxMiwgMTQgXSwgdGlja0Zvcm1hdDogZCA9PiBkICsgXCIgZGF5XCIgfVxuICAgICAgXVxuXG4gICAgICAgIHJldHVybiA8ZGl2PlxuICAgICAgICAgICAgPHNwYW4+Y3VzdG9tTGluZVR5cGU9PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VDdXN0b21MaW5lVHlwZX0+e29wdGlvbnN9PC9zZWxlY3Q+PC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4+Y3VydmU8c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZUN1cnZlfT57Y3VydmVPcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj5cbiAgICAgICAgICAgIDxNaW5pbWFwWFlGcmFtZVxuICAgICAgICAgICAgcmVuZGVyQmVmb3JlPXt0cnVlfVxuICAgICAgICAgICAgYXhlcz17YXhlc31cbiAgICAgICAgICAgIHNpemU9e1sgZnJhbWVXaWR0aCwgMzAwIF19XG4gICAgICAgICAgICBsaW5lcz17ZmluYWxkaXNwbGF5RGF0YX1cbiAgICAgICAgICAgIGxpbmVEYXRhQWNjZXNzb3I9e2QgPT4gZC5kYXRhLmZpbHRlcihwID0+IHAueCA+PSB0aGlzLnN0YXRlLmV4dGVudFswXSAmJiBwLnggPD0gdGhpcy5zdGF0ZS5leHRlbnRbMV0pfVxuICAgICAgICAgICAgeEFjY2Vzc29yPXtkID0+IGQueH1cbiAgICAgICAgICAgIHlBY2Nlc3Nvcj17ZCA9PiBkLnl9XG4gICAgICAgICAgICBsaW5lU3R5bGU9e2QgPT4gKHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yIH0pfVxuICAgICAgICAgICAgY3VzdG9tTGluZVR5cGU9e3sgdHlwZTogdGhpcy5zdGF0ZS5jdXN0b21MaW5lVHlwZSwgaW50ZXJwb2xhdG9yOiBjdXJ2ZUhhc2hbdGhpcy5zdGF0ZS5jdXJ2ZV0sIHNvcnQ6IG51bGwgfX1cbiAgICAgICAgICAgIG1pbmltYXA9e3sgbWFyZ2luOiB7dG9wOiAyMCwgYm90dG9tOiAyMCwgbGVmdDogMjAsIHJpZ2h0OiAyMH0sIGxpbmVTdHlsZTogZCA9PiAoeyBmaWxsOiBkLmNvbG9yLCBmaWxsT3BhY2l0eTogMC41LCBzdHJva2U6IGQuY29sb3IgfSksIGN1c3RvbUxpbmVUeXBlOiB7IHR5cGU6IHRoaXMuc3RhdGUuY3VzdG9tTGluZVR5cGUsIGludGVycG9sYXRvcjogY3VydmVIYXNoW3RoaXMuc3RhdGUuY3VydmVdLCBzb3J0OiBudWxsIH0sIGJydXNoRW5kOiB0aGlzLnVwZGF0ZURhdGVSYW5nZSwgeUJydXNoYWJsZTogZmFsc2UsIHhCcnVzaEV4dGVudDogdGhpcy5zdGF0ZS5leHRlbnQsIGxpbmVzOiBmaW5hbGRpc3BsYXlEYXRhLCBsaW5lRGF0YUFjY2Vzc29yOiBkID0+IGQuZGF0YSwgc2l6ZTogWyBmcmFtZVdpZHRoLCAxNTAgXSwgYXhlczogW2F4ZXNbMV1dIH19XG4gICAgICAgICAgICBsaW5lUmVuZGVyTW9kZT17KCkgPT4gXCJza2V0Y2h5XCJ9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFhZRnJhbWVXaXRoTWluaW1hcEV4YW1wbGVzO1xuIiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy1hcnJheS8gVmVyc2lvbiAxLjAuMS4gQ29weXJpZ2h0IDIwMTYgTWlrZSBCb3N0b2NrLlxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuICAoZmFjdG9yeSgoZ2xvYmFsLmQzID0gZ2xvYmFsLmQzIHx8IHt9KSkpO1xufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cbiAgZnVuY3Rpb24gYXNjZW5kaW5nKGEsIGIpIHtcbiAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IGEgPj0gYiA/IDAgOiBOYU47XG4gIH1cblxuICBmdW5jdGlvbiBiaXNlY3Rvcihjb21wYXJlKSB7XG4gICAgaWYgKGNvbXBhcmUubGVuZ3RoID09PSAxKSBjb21wYXJlID0gYXNjZW5kaW5nQ29tcGFyYXRvcihjb21wYXJlKTtcbiAgICByZXR1cm4ge1xuICAgICAgbGVmdDogZnVuY3Rpb24oYSwgeCwgbG8sIGhpKSB7XG4gICAgICAgIGlmIChsbyA9PSBudWxsKSBsbyA9IDA7XG4gICAgICAgIGlmIChoaSA9PSBudWxsKSBoaSA9IGEubGVuZ3RoO1xuICAgICAgICB3aGlsZSAobG8gPCBoaSkge1xuICAgICAgICAgIHZhciBtaWQgPSBsbyArIGhpID4+PiAxO1xuICAgICAgICAgIGlmIChjb21wYXJlKGFbbWlkXSwgeCkgPCAwKSBsbyA9IG1pZCArIDE7XG4gICAgICAgICAgZWxzZSBoaSA9IG1pZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG87XG4gICAgICB9LFxuICAgICAgcmlnaHQ6IGZ1bmN0aW9uKGEsIHgsIGxvLCBoaSkge1xuICAgICAgICBpZiAobG8gPT0gbnVsbCkgbG8gPSAwO1xuICAgICAgICBpZiAoaGkgPT0gbnVsbCkgaGkgPSBhLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcbiAgICAgICAgICB2YXIgbWlkID0gbG8gKyBoaSA+Pj4gMTtcbiAgICAgICAgICBpZiAoY29tcGFyZShhW21pZF0sIHgpID4gMCkgaGkgPSBtaWQ7XG4gICAgICAgICAgZWxzZSBsbyA9IG1pZCArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxvO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBhc2NlbmRpbmdDb21wYXJhdG9yKGYpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZCwgeCkge1xuICAgICAgcmV0dXJuIGFzY2VuZGluZyhmKGQpLCB4KTtcbiAgICB9O1xuICB9XG5cbiAgdmFyIGFzY2VuZGluZ0Jpc2VjdCA9IGJpc2VjdG9yKGFzY2VuZGluZyk7XG4gIHZhciBiaXNlY3RSaWdodCA9IGFzY2VuZGluZ0Jpc2VjdC5yaWdodDtcbiAgdmFyIGJpc2VjdExlZnQgPSBhc2NlbmRpbmdCaXNlY3QubGVmdDtcblxuICBmdW5jdGlvbiBkZXNjZW5kaW5nKGEsIGIpIHtcbiAgICByZXR1cm4gYiA8IGEgPyAtMSA6IGIgPiBhID8gMSA6IGIgPj0gYSA/IDAgOiBOYU47XG4gIH1cblxuICBmdW5jdGlvbiBudW1iZXIoeCkge1xuICAgIHJldHVybiB4ID09PSBudWxsID8gTmFOIDogK3g7XG4gIH1cblxuICBmdW5jdGlvbiB2YXJpYW5jZShhcnJheSwgZikge1xuICAgIHZhciBuID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICBtID0gMCxcbiAgICAgICAgYSxcbiAgICAgICAgZCxcbiAgICAgICAgcyA9IDAsXG4gICAgICAgIGkgPSAtMSxcbiAgICAgICAgaiA9IDA7XG5cbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICBpZiAoIWlzTmFOKGEgPSBudW1iZXIoYXJyYXlbaV0pKSkge1xuICAgICAgICAgIGQgPSBhIC0gbTtcbiAgICAgICAgICBtICs9IGQgLyArK2o7XG4gICAgICAgICAgcyArPSBkICogKGEgLSBtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKCFpc05hTihhID0gbnVtYmVyKGYoYXJyYXlbaV0sIGksIGFycmF5KSkpKSB7XG4gICAgICAgICAgZCA9IGEgLSBtO1xuICAgICAgICAgIG0gKz0gZCAvICsrajtcbiAgICAgICAgICBzICs9IGQgKiAoYSAtIG0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGogPiAxKSByZXR1cm4gcyAvIChqIC0gMSk7XG4gIH1cblxuICBmdW5jdGlvbiBkZXZpYXRpb24oYXJyYXksIGYpIHtcbiAgICB2YXIgdiA9IHZhcmlhbmNlKGFycmF5LCBmKTtcbiAgICByZXR1cm4gdiA/IE1hdGguc3FydCh2KSA6IHY7XG4gIH1cblxuICBmdW5jdGlvbiBleHRlbnQoYXJyYXksIGYpIHtcbiAgICB2YXIgaSA9IC0xLFxuICAgICAgICBuID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICBhLFxuICAgICAgICBiLFxuICAgICAgICBjO1xuXG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGFycmF5W2ldKSAhPSBudWxsICYmIGIgPj0gYikgeyBhID0gYyA9IGI7IGJyZWFrOyB9XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gYXJyYXlbaV0pICE9IG51bGwpIHtcbiAgICAgICAgaWYgKGEgPiBiKSBhID0gYjtcbiAgICAgICAgaWYgKGMgPCBiKSBjID0gYjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBmKGFycmF5W2ldLCBpLCBhcnJheSkpICE9IG51bGwgJiYgYiA+PSBiKSB7IGEgPSBjID0gYjsgYnJlYWs7IH1cbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBmKGFycmF5W2ldLCBpLCBhcnJheSkpICE9IG51bGwpIHtcbiAgICAgICAgaWYgKGEgPiBiKSBhID0gYjtcbiAgICAgICAgaWYgKGMgPCBiKSBjID0gYjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gW2EsIGNdO1xuICB9XG5cbiAgdmFyIGFycmF5ID0gQXJyYXkucHJvdG90eXBlO1xuXG4gIHZhciBzbGljZSA9IGFycmF5LnNsaWNlO1xuICB2YXIgbWFwID0gYXJyYXkubWFwO1xuXG4gIGZ1bmN0aW9uIGNvbnN0YW50KHgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gaWRlbnRpdHkoeCkge1xuICAgIHJldHVybiB4O1xuICB9XG5cbiAgZnVuY3Rpb24gcmFuZ2Uoc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICBzdGFydCA9ICtzdGFydCwgc3RvcCA9ICtzdG9wLCBzdGVwID0gKG4gPSBhcmd1bWVudHMubGVuZ3RoKSA8IDIgPyAoc3RvcCA9IHN0YXJ0LCBzdGFydCA9IDAsIDEpIDogbiA8IDMgPyAxIDogK3N0ZXA7XG5cbiAgICB2YXIgaSA9IC0xLFxuICAgICAgICBuID0gTWF0aC5tYXgoMCwgTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCkpIHwgMCxcbiAgICAgICAgcmFuZ2UgPSBuZXcgQXJyYXkobik7XG5cbiAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgcmFuZ2VbaV0gPSBzdGFydCArIGkgKiBzdGVwO1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfVxuXG4gIHZhciBlMTAgPSBNYXRoLnNxcnQoNTApO1xuICB2YXIgZTUgPSBNYXRoLnNxcnQoMTApO1xuICB2YXIgZTIgPSBNYXRoLnNxcnQoMik7XG4gIGZ1bmN0aW9uIHRpY2tzKHN0YXJ0LCBzdG9wLCBjb3VudCkge1xuICAgIHZhciBzdGVwID0gdGlja1N0ZXAoc3RhcnQsIHN0b3AsIGNvdW50KTtcbiAgICByZXR1cm4gcmFuZ2UoXG4gICAgICBNYXRoLmNlaWwoc3RhcnQgLyBzdGVwKSAqIHN0ZXAsXG4gICAgICBNYXRoLmZsb29yKHN0b3AgLyBzdGVwKSAqIHN0ZXAgKyBzdGVwIC8gMiwgLy8gaW5jbHVzaXZlXG4gICAgICBzdGVwXG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpY2tTdGVwKHN0YXJ0LCBzdG9wLCBjb3VudCkge1xuICAgIHZhciBzdGVwMCA9IE1hdGguYWJzKHN0b3AgLSBzdGFydCkgLyBNYXRoLm1heCgwLCBjb3VudCksXG4gICAgICAgIHN0ZXAxID0gTWF0aC5wb3coMTAsIE1hdGguZmxvb3IoTWF0aC5sb2coc3RlcDApIC8gTWF0aC5MTjEwKSksXG4gICAgICAgIGVycm9yID0gc3RlcDAgLyBzdGVwMTtcbiAgICBpZiAoZXJyb3IgPj0gZTEwKSBzdGVwMSAqPSAxMDtcbiAgICBlbHNlIGlmIChlcnJvciA+PSBlNSkgc3RlcDEgKj0gNTtcbiAgICBlbHNlIGlmIChlcnJvciA+PSBlMikgc3RlcDEgKj0gMjtcbiAgICByZXR1cm4gc3RvcCA8IHN0YXJ0ID8gLXN0ZXAxIDogc3RlcDE7XG4gIH1cblxuICBmdW5jdGlvbiBzdHVyZ2VzKHZhbHVlcykge1xuICAgIHJldHVybiBNYXRoLmNlaWwoTWF0aC5sb2codmFsdWVzLmxlbmd0aCkgLyBNYXRoLkxOMikgKyAxO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlzdG9ncmFtKCkge1xuICAgIHZhciB2YWx1ZSA9IGlkZW50aXR5LFxuICAgICAgICBkb21haW4gPSBleHRlbnQsXG4gICAgICAgIHRocmVzaG9sZCA9IHN0dXJnZXM7XG5cbiAgICBmdW5jdGlvbiBoaXN0b2dyYW0oZGF0YSkge1xuICAgICAgdmFyIGksXG4gICAgICAgICAgbiA9IGRhdGEubGVuZ3RoLFxuICAgICAgICAgIHgsXG4gICAgICAgICAgdmFsdWVzID0gbmV3IEFycmF5KG4pO1xuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICAgIHZhbHVlc1tpXSA9IHZhbHVlKGRhdGFbaV0sIGksIGRhdGEpO1xuICAgICAgfVxuXG4gICAgICB2YXIgeHogPSBkb21haW4odmFsdWVzKSxcbiAgICAgICAgICB4MCA9IHh6WzBdLFxuICAgICAgICAgIHgxID0geHpbMV0sXG4gICAgICAgICAgdHogPSB0aHJlc2hvbGQodmFsdWVzLCB4MCwgeDEpO1xuXG4gICAgICAvLyBDb252ZXJ0IG51bWJlciBvZiB0aHJlc2hvbGRzIGludG8gdW5pZm9ybSB0aHJlc2hvbGRzLlxuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHR6KSkgdHogPSB0aWNrcyh4MCwgeDEsIHR6KTtcblxuICAgICAgLy8gUmVtb3ZlIGFueSB0aHJlc2hvbGRzIG91dHNpZGUgdGhlIGRvbWFpbi5cbiAgICAgIHZhciBtID0gdHoubGVuZ3RoO1xuICAgICAgd2hpbGUgKHR6WzBdIDw9IHgwKSB0ei5zaGlmdCgpLCAtLW07XG4gICAgICB3aGlsZSAodHpbbSAtIDFdID49IHgxKSB0ei5wb3AoKSwgLS1tO1xuXG4gICAgICB2YXIgYmlucyA9IG5ldyBBcnJheShtICsgMSksXG4gICAgICAgICAgYmluO1xuXG4gICAgICAvLyBJbml0aWFsaXplIGJpbnMuXG4gICAgICBmb3IgKGkgPSAwOyBpIDw9IG07ICsraSkge1xuICAgICAgICBiaW4gPSBiaW5zW2ldID0gW107XG4gICAgICAgIGJpbi54MCA9IGkgPiAwID8gdHpbaSAtIDFdIDogeDA7XG4gICAgICAgIGJpbi54MSA9IGkgPCBtID8gdHpbaV0gOiB4MTtcbiAgICAgIH1cblxuICAgICAgLy8gQXNzaWduIGRhdGEgdG8gYmlucyBieSB2YWx1ZSwgaWdub3JpbmcgYW55IG91dHNpZGUgdGhlIGRvbWFpbi5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgICAgeCA9IHZhbHVlc1tpXTtcbiAgICAgICAgaWYgKHgwIDw9IHggJiYgeCA8PSB4MSkge1xuICAgICAgICAgIGJpbnNbYmlzZWN0UmlnaHQodHosIHgsIDAsIG0pXS5wdXNoKGRhdGFbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBiaW5zO1xuICAgIH1cblxuICAgIGhpc3RvZ3JhbS52YWx1ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHZhbHVlID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudChfKSwgaGlzdG9ncmFtKSA6IHZhbHVlO1xuICAgIH07XG5cbiAgICBoaXN0b2dyYW0uZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZG9tYWluID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudChbX1swXSwgX1sxXV0pLCBoaXN0b2dyYW0pIDogZG9tYWluO1xuICAgIH07XG5cbiAgICBoaXN0b2dyYW0udGhyZXNob2xkcyA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHRocmVzaG9sZCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogQXJyYXkuaXNBcnJheShfKSA/IGNvbnN0YW50KHNsaWNlLmNhbGwoXykpIDogY29uc3RhbnQoXyksIGhpc3RvZ3JhbSkgOiB0aHJlc2hvbGQ7XG4gICAgfTtcblxuICAgIHJldHVybiBoaXN0b2dyYW07XG4gIH1cblxuICBmdW5jdGlvbiBxdWFudGlsZShhcnJheSwgcCwgZikge1xuICAgIGlmIChmID09IG51bGwpIGYgPSBudW1iZXI7XG4gICAgaWYgKCEobiA9IGFycmF5Lmxlbmd0aCkpIHJldHVybjtcbiAgICBpZiAoKHAgPSArcCkgPD0gMCB8fCBuIDwgMikgcmV0dXJuICtmKGFycmF5WzBdLCAwLCBhcnJheSk7XG4gICAgaWYgKHAgPj0gMSkgcmV0dXJuICtmKGFycmF5W24gLSAxXSwgbiAtIDEsIGFycmF5KTtcbiAgICB2YXIgbixcbiAgICAgICAgaCA9IChuIC0gMSkgKiBwLFxuICAgICAgICBpID0gTWF0aC5mbG9vcihoKSxcbiAgICAgICAgYSA9ICtmKGFycmF5W2ldLCBpLCBhcnJheSksXG4gICAgICAgIGIgPSArZihhcnJheVtpICsgMV0sIGkgKyAxLCBhcnJheSk7XG4gICAgcmV0dXJuIGEgKyAoYiAtIGEpICogKGggLSBpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZyZWVkbWFuRGlhY29uaXModmFsdWVzLCBtaW4sIG1heCkge1xuICAgIHZhbHVlcyA9IG1hcC5jYWxsKHZhbHVlcywgbnVtYmVyKS5zb3J0KGFzY2VuZGluZyk7XG4gICAgcmV0dXJuIE1hdGguY2VpbCgobWF4IC0gbWluKSAvICgyICogKHF1YW50aWxlKHZhbHVlcywgMC43NSkgLSBxdWFudGlsZSh2YWx1ZXMsIDAuMjUpKSAqIE1hdGgucG93KHZhbHVlcy5sZW5ndGgsIC0xIC8gMykpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNjb3R0KHZhbHVlcywgbWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5jZWlsKChtYXggLSBtaW4pIC8gKDMuNSAqIGRldmlhdGlvbih2YWx1ZXMpICogTWF0aC5wb3codmFsdWVzLmxlbmd0aCwgLTEgLyAzKSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gbWF4KGFycmF5LCBmKSB7XG4gICAgdmFyIGkgPSAtMSxcbiAgICAgICAgbiA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgYSxcbiAgICAgICAgYjtcblxuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBhcnJheVtpXSkgIT0gbnVsbCAmJiBiID49IGIpIHsgYSA9IGI7IGJyZWFrOyB9XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gYXJyYXlbaV0pICE9IG51bGwgJiYgYiA+IGEpIGEgPSBiO1xuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGYoYXJyYXlbaV0sIGksIGFycmF5KSkgIT0gbnVsbCAmJiBiID49IGIpIHsgYSA9IGI7IGJyZWFrOyB9XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gZihhcnJheVtpXSwgaSwgYXJyYXkpKSAhPSBudWxsICYmIGIgPiBhKSBhID0gYjtcbiAgICB9XG5cbiAgICByZXR1cm4gYTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1lYW4oYXJyYXksIGYpIHtcbiAgICB2YXIgcyA9IDAsXG4gICAgICAgIG4gPSBhcnJheS5sZW5ndGgsXG4gICAgICAgIGEsXG4gICAgICAgIGkgPSAtMSxcbiAgICAgICAgaiA9IG47XG5cbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKCFpc05hTihhID0gbnVtYmVyKGFycmF5W2ldKSkpIHMgKz0gYTsgZWxzZSAtLWo7XG4gICAgfVxuXG4gICAgZWxzZSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKCFpc05hTihhID0gbnVtYmVyKGYoYXJyYXlbaV0sIGksIGFycmF5KSkpKSBzICs9IGE7IGVsc2UgLS1qO1xuICAgIH1cblxuICAgIGlmIChqKSByZXR1cm4gcyAvIGo7XG4gIH1cblxuICBmdW5jdGlvbiBtZWRpYW4oYXJyYXksIGYpIHtcbiAgICB2YXIgbnVtYmVycyA9IFtdLFxuICAgICAgICBuID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICBhLFxuICAgICAgICBpID0gLTE7XG5cbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKCFpc05hTihhID0gbnVtYmVyKGFycmF5W2ldKSkpIG51bWJlcnMucHVzaChhKTtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoIWlzTmFOKGEgPSBudW1iZXIoZihhcnJheVtpXSwgaSwgYXJyYXkpKSkpIG51bWJlcnMucHVzaChhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcXVhbnRpbGUobnVtYmVycy5zb3J0KGFzY2VuZGluZyksIDAuNSk7XG4gIH1cblxuICBmdW5jdGlvbiBtZXJnZShhcnJheXMpIHtcbiAgICB2YXIgbiA9IGFycmF5cy5sZW5ndGgsXG4gICAgICAgIG0sXG4gICAgICAgIGkgPSAtMSxcbiAgICAgICAgaiA9IDAsXG4gICAgICAgIG1lcmdlZCxcbiAgICAgICAgYXJyYXk7XG5cbiAgICB3aGlsZSAoKytpIDwgbikgaiArPSBhcnJheXNbaV0ubGVuZ3RoO1xuICAgIG1lcmdlZCA9IG5ldyBBcnJheShqKTtcblxuICAgIHdoaWxlICgtLW4gPj0gMCkge1xuICAgICAgYXJyYXkgPSBhcnJheXNbbl07XG4gICAgICBtID0gYXJyYXkubGVuZ3RoO1xuICAgICAgd2hpbGUgKC0tbSA+PSAwKSB7XG4gICAgICAgIG1lcmdlZFstLWpdID0gYXJyYXlbbV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1lcmdlZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1pbihhcnJheSwgZikge1xuICAgIHZhciBpID0gLTEsXG4gICAgICAgIG4gPSBhcnJheS5sZW5ndGgsXG4gICAgICAgIGEsXG4gICAgICAgIGI7XG5cbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gYXJyYXlbaV0pICE9IG51bGwgJiYgYiA+PSBiKSB7IGEgPSBiOyBicmVhazsgfVxuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGFycmF5W2ldKSAhPSBudWxsICYmIGEgPiBiKSBhID0gYjtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBmKGFycmF5W2ldLCBpLCBhcnJheSkpICE9IG51bGwgJiYgYiA+PSBiKSB7IGEgPSBiOyBicmVhazsgfVxuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGYoYXJyYXlbaV0sIGksIGFycmF5KSkgIT0gbnVsbCAmJiBhID4gYikgYSA9IGI7XG4gICAgfVxuXG4gICAgcmV0dXJuIGE7XG4gIH1cblxuICBmdW5jdGlvbiBwYWlycyhhcnJheSkge1xuICAgIHZhciBpID0gMCwgbiA9IGFycmF5Lmxlbmd0aCAtIDEsIHAgPSBhcnJheVswXSwgcGFpcnMgPSBuZXcgQXJyYXkobiA8IDAgPyAwIDogbik7XG4gICAgd2hpbGUgKGkgPCBuKSBwYWlyc1tpXSA9IFtwLCBwID0gYXJyYXlbKytpXV07XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9XG5cbiAgZnVuY3Rpb24gcGVybXV0ZShhcnJheSwgaW5kZXhlcykge1xuICAgIHZhciBpID0gaW5kZXhlcy5sZW5ndGgsIHBlcm11dGVzID0gbmV3IEFycmF5KGkpO1xuICAgIHdoaWxlIChpLS0pIHBlcm11dGVzW2ldID0gYXJyYXlbaW5kZXhlc1tpXV07XG4gICAgcmV0dXJuIHBlcm11dGVzO1xuICB9XG5cbiAgZnVuY3Rpb24gc2NhbihhcnJheSwgY29tcGFyZSkge1xuICAgIGlmICghKG4gPSBhcnJheS5sZW5ndGgpKSByZXR1cm47XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBuLFxuICAgICAgICBqID0gMCxcbiAgICAgICAgeGksXG4gICAgICAgIHhqID0gYXJyYXlbal07XG5cbiAgICBpZiAoIWNvbXBhcmUpIGNvbXBhcmUgPSBhc2NlbmRpbmc7XG5cbiAgICB3aGlsZSAoKytpIDwgbikgaWYgKGNvbXBhcmUoeGkgPSBhcnJheVtpXSwgeGopIDwgMCB8fCBjb21wYXJlKHhqLCB4aikgIT09IDApIHhqID0geGksIGogPSBpO1xuXG4gICAgaWYgKGNvbXBhcmUoeGosIHhqKSA9PT0gMCkgcmV0dXJuIGo7XG4gIH1cblxuICBmdW5jdGlvbiBzaHVmZmxlKGFycmF5LCBpMCwgaTEpIHtcbiAgICB2YXIgbSA9IChpMSA9PSBudWxsID8gYXJyYXkubGVuZ3RoIDogaTEpIC0gKGkwID0gaTAgPT0gbnVsbCA/IDAgOiAraTApLFxuICAgICAgICB0LFxuICAgICAgICBpO1xuXG4gICAgd2hpbGUgKG0pIHtcbiAgICAgIGkgPSBNYXRoLnJhbmRvbSgpICogbS0tIHwgMDtcbiAgICAgIHQgPSBhcnJheVttICsgaTBdO1xuICAgICAgYXJyYXlbbSArIGkwXSA9IGFycmF5W2kgKyBpMF07XG4gICAgICBhcnJheVtpICsgaTBdID0gdDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cblxuICBmdW5jdGlvbiBzdW0oYXJyYXksIGYpIHtcbiAgICB2YXIgcyA9IDAsXG4gICAgICAgIG4gPSBhcnJheS5sZW5ndGgsXG4gICAgICAgIGEsXG4gICAgICAgIGkgPSAtMTtcblxuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoYSA9ICthcnJheVtpXSkgcyArPSBhOyAvLyBOb3RlOiB6ZXJvIGFuZCBudWxsIGFyZSBlcXVpdmFsZW50LlxuICAgIH1cblxuICAgIGVsc2Uge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmIChhID0gK2YoYXJyYXlbaV0sIGksIGFycmF5KSkgcyArPSBhO1xuICAgIH1cblxuICAgIHJldHVybiBzO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNwb3NlKG1hdHJpeCkge1xuICAgIGlmICghKG4gPSBtYXRyaXgubGVuZ3RoKSkgcmV0dXJuIFtdO1xuICAgIGZvciAodmFyIGkgPSAtMSwgbSA9IG1pbihtYXRyaXgsIGxlbmd0aCksIHRyYW5zcG9zZSA9IG5ldyBBcnJheShtKTsgKytpIDwgbTspIHtcbiAgICAgIGZvciAodmFyIGogPSAtMSwgbiwgcm93ID0gdHJhbnNwb3NlW2ldID0gbmV3IEFycmF5KG4pOyArK2ogPCBuOykge1xuICAgICAgICByb3dbal0gPSBtYXRyaXhbal1baV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cmFuc3Bvc2U7XG4gIH1cblxuICBmdW5jdGlvbiBsZW5ndGgoZCkge1xuICAgIHJldHVybiBkLmxlbmd0aDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHppcCgpIHtcbiAgICByZXR1cm4gdHJhbnNwb3NlKGFyZ3VtZW50cyk7XG4gIH1cblxuICBleHBvcnRzLmJpc2VjdCA9IGJpc2VjdFJpZ2h0O1xuICBleHBvcnRzLmJpc2VjdFJpZ2h0ID0gYmlzZWN0UmlnaHQ7XG4gIGV4cG9ydHMuYmlzZWN0TGVmdCA9IGJpc2VjdExlZnQ7XG4gIGV4cG9ydHMuYXNjZW5kaW5nID0gYXNjZW5kaW5nO1xuICBleHBvcnRzLmJpc2VjdG9yID0gYmlzZWN0b3I7XG4gIGV4cG9ydHMuZGVzY2VuZGluZyA9IGRlc2NlbmRpbmc7XG4gIGV4cG9ydHMuZGV2aWF0aW9uID0gZGV2aWF0aW9uO1xuICBleHBvcnRzLmV4dGVudCA9IGV4dGVudDtcbiAgZXhwb3J0cy5oaXN0b2dyYW0gPSBoaXN0b2dyYW07XG4gIGV4cG9ydHMudGhyZXNob2xkRnJlZWRtYW5EaWFjb25pcyA9IGZyZWVkbWFuRGlhY29uaXM7XG4gIGV4cG9ydHMudGhyZXNob2xkU2NvdHQgPSBzY290dDtcbiAgZXhwb3J0cy50aHJlc2hvbGRTdHVyZ2VzID0gc3R1cmdlcztcbiAgZXhwb3J0cy5tYXggPSBtYXg7XG4gIGV4cG9ydHMubWVhbiA9IG1lYW47XG4gIGV4cG9ydHMubWVkaWFuID0gbWVkaWFuO1xuICBleHBvcnRzLm1lcmdlID0gbWVyZ2U7XG4gIGV4cG9ydHMubWluID0gbWluO1xuICBleHBvcnRzLnBhaXJzID0gcGFpcnM7XG4gIGV4cG9ydHMucGVybXV0ZSA9IHBlcm11dGU7XG4gIGV4cG9ydHMucXVhbnRpbGUgPSBxdWFudGlsZTtcbiAgZXhwb3J0cy5yYW5nZSA9IHJhbmdlO1xuICBleHBvcnRzLnNjYW4gPSBzY2FuO1xuICBleHBvcnRzLnNodWZmbGUgPSBzaHVmZmxlO1xuICBleHBvcnRzLnN1bSA9IHN1bTtcbiAgZXhwb3J0cy50aWNrcyA9IHRpY2tzO1xuICBleHBvcnRzLnRpY2tTdGVwID0gdGlja1N0ZXA7XG4gIGV4cG9ydHMudHJhbnNwb3NlID0gdHJhbnNwb3NlO1xuICBleHBvcnRzLnZhcmlhbmNlID0gdmFyaWFuY2U7XG4gIGV4cG9ydHMuemlwID0gemlwO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKTsiLCIvLyBodHRwczovL2QzanMub3JnL2QzLWNvbGxlY3Rpb24vIFZlcnNpb24gMS4wLjEuIENvcHlyaWdodCAyMDE2IE1pa2UgQm9zdG9jay5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5kMyA9IGdsb2JhbC5kMyB8fCB7fSkpKTtcbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBwcmVmaXggPSBcIiRcIjtcblxuICBmdW5jdGlvbiBNYXAoKSB7fVxuXG4gIE1hcC5wcm90b3R5cGUgPSBtYXAucHJvdG90eXBlID0ge1xuICAgIGNvbnN0cnVjdG9yOiBNYXAsXG4gICAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiAocHJlZml4ICsga2V5KSBpbiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiB0aGlzW3ByZWZpeCArIGtleV07XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIHRoaXNbcHJlZml4ICsga2V5XSA9IHZhbHVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByZW1vdmU6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIHByb3BlcnR5ID0gcHJlZml4ICsga2V5O1xuICAgICAgcmV0dXJuIHByb3BlcnR5IGluIHRoaXMgJiYgZGVsZXRlIHRoaXNbcHJvcGVydHldO1xuICAgIH0sXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGRlbGV0ZSB0aGlzW3Byb3BlcnR5XTtcbiAgICB9LFxuICAgIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSBrZXlzLnB1c2gocHJvcGVydHkuc2xpY2UoMSkpO1xuICAgICAgcmV0dXJuIGtleXM7XG4gICAgfSxcbiAgICB2YWx1ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIHZhbHVlcy5wdXNoKHRoaXNbcHJvcGVydHldKTtcbiAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfSxcbiAgICBlbnRyaWVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlbnRyaWVzID0gW107XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgZW50cmllcy5wdXNoKHtrZXk6IHByb3BlcnR5LnNsaWNlKDEpLCB2YWx1ZTogdGhpc1twcm9wZXJ0eV19KTtcbiAgICAgIHJldHVybiBlbnRyaWVzO1xuICAgIH0sXG4gICAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2l6ZSA9IDA7XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgKytzaXplO1xuICAgICAgcmV0dXJuIHNpemU7XG4gICAgfSxcbiAgICBlbXB0eTogZnVuY3Rpb24oKSB7XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBlYWNoOiBmdW5jdGlvbihmKSB7XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgZih0aGlzW3Byb3BlcnR5XSwgcHJvcGVydHkuc2xpY2UoMSksIHRoaXMpO1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBtYXAob2JqZWN0LCBmKSB7XG4gICAgdmFyIG1hcCA9IG5ldyBNYXA7XG5cbiAgICAvLyBDb3B5IGNvbnN0cnVjdG9yLlxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBNYXApIG9iamVjdC5lYWNoKGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHsgbWFwLnNldChrZXksIHZhbHVlKTsgfSk7XG5cbiAgICAvLyBJbmRleCBhcnJheSBieSBudW1lcmljIGluZGV4IG9yIHNwZWNpZmllZCBrZXkgZnVuY3Rpb24uXG4gICAgZWxzZSBpZiAoQXJyYXkuaXNBcnJheShvYmplY3QpKSB7XG4gICAgICB2YXIgaSA9IC0xLFxuICAgICAgICAgIG4gPSBvYmplY3QubGVuZ3RoLFxuICAgICAgICAgIG87XG5cbiAgICAgIGlmIChmID09IG51bGwpIHdoaWxlICgrK2kgPCBuKSBtYXAuc2V0KGksIG9iamVjdFtpXSk7XG4gICAgICBlbHNlIHdoaWxlICgrK2kgPCBuKSBtYXAuc2V0KGYobyA9IG9iamVjdFtpXSwgaSwgb2JqZWN0KSwgbyk7XG4gICAgfVxuXG4gICAgLy8gQ29udmVydCBvYmplY3QgdG8gbWFwLlxuICAgIGVsc2UgaWYgKG9iamVjdCkgZm9yICh2YXIga2V5IGluIG9iamVjdCkgbWFwLnNldChrZXksIG9iamVjdFtrZXldKTtcblxuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICBmdW5jdGlvbiBuZXN0KCkge1xuICAgIHZhciBrZXlzID0gW10sXG4gICAgICAgIHNvcnRLZXlzID0gW10sXG4gICAgICAgIHNvcnRWYWx1ZXMsXG4gICAgICAgIHJvbGx1cCxcbiAgICAgICAgbmVzdDtcblxuICAgIGZ1bmN0aW9uIGFwcGx5KGFycmF5LCBkZXB0aCwgY3JlYXRlUmVzdWx0LCBzZXRSZXN1bHQpIHtcbiAgICAgIGlmIChkZXB0aCA+PSBrZXlzLmxlbmd0aCkgcmV0dXJuIHJvbGx1cCAhPSBudWxsXG4gICAgICAgICAgPyByb2xsdXAoYXJyYXkpIDogKHNvcnRWYWx1ZXMgIT0gbnVsbFxuICAgICAgICAgID8gYXJyYXkuc29ydChzb3J0VmFsdWVzKVxuICAgICAgICAgIDogYXJyYXkpO1xuXG4gICAgICB2YXIgaSA9IC0xLFxuICAgICAgICAgIG4gPSBhcnJheS5sZW5ndGgsXG4gICAgICAgICAga2V5ID0ga2V5c1tkZXB0aCsrXSxcbiAgICAgICAgICBrZXlWYWx1ZSxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICB2YWx1ZXNCeUtleSA9IG1hcCgpLFxuICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgICByZXN1bHQgPSBjcmVhdGVSZXN1bHQoKTtcblxuICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKHZhbHVlcyA9IHZhbHVlc0J5S2V5LmdldChrZXlWYWx1ZSA9IGtleSh2YWx1ZSA9IGFycmF5W2ldKSArIFwiXCIpKSB7XG4gICAgICAgICAgdmFsdWVzLnB1c2godmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlc0J5S2V5LnNldChrZXlWYWx1ZSwgW3ZhbHVlXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFsdWVzQnlLZXkuZWFjaChmdW5jdGlvbih2YWx1ZXMsIGtleSkge1xuICAgICAgICBzZXRSZXN1bHQocmVzdWx0LCBrZXksIGFwcGx5KHZhbHVlcywgZGVwdGgsIGNyZWF0ZVJlc3VsdCwgc2V0UmVzdWx0KSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbnRyaWVzKG1hcCwgZGVwdGgpIHtcbiAgICAgIGlmICgrK2RlcHRoID4ga2V5cy5sZW5ndGgpIHJldHVybiBtYXA7XG4gICAgICB2YXIgYXJyYXksIHNvcnRLZXkgPSBzb3J0S2V5c1tkZXB0aCAtIDFdO1xuICAgICAgaWYgKHJvbGx1cCAhPSBudWxsICYmIGRlcHRoID49IGtleXMubGVuZ3RoKSBhcnJheSA9IG1hcC5lbnRyaWVzKCk7XG4gICAgICBlbHNlIGFycmF5ID0gW10sIG1hcC5lYWNoKGZ1bmN0aW9uKHYsIGspIHsgYXJyYXkucHVzaCh7a2V5OiBrLCB2YWx1ZXM6IGVudHJpZXModiwgZGVwdGgpfSk7IH0pO1xuICAgICAgcmV0dXJuIHNvcnRLZXkgIT0gbnVsbCA/IGFycmF5LnNvcnQoZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gc29ydEtleShhLmtleSwgYi5rZXkpOyB9KSA6IGFycmF5O1xuICAgIH1cblxuICAgIHJldHVybiBuZXN0ID0ge1xuICAgICAgb2JqZWN0OiBmdW5jdGlvbihhcnJheSkgeyByZXR1cm4gYXBwbHkoYXJyYXksIDAsIGNyZWF0ZU9iamVjdCwgc2V0T2JqZWN0KTsgfSxcbiAgICAgIG1hcDogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGFwcGx5KGFycmF5LCAwLCBjcmVhdGVNYXAsIHNldE1hcCk7IH0sXG4gICAgICBlbnRyaWVzOiBmdW5jdGlvbihhcnJheSkgeyByZXR1cm4gZW50cmllcyhhcHBseShhcnJheSwgMCwgY3JlYXRlTWFwLCBzZXRNYXApLCAwKTsgfSxcbiAgICAgIGtleTogZnVuY3Rpb24oZCkgeyBrZXlzLnB1c2goZCk7IHJldHVybiBuZXN0OyB9LFxuICAgICAgc29ydEtleXM6IGZ1bmN0aW9uKG9yZGVyKSB7IHNvcnRLZXlzW2tleXMubGVuZ3RoIC0gMV0gPSBvcmRlcjsgcmV0dXJuIG5lc3Q7IH0sXG4gICAgICBzb3J0VmFsdWVzOiBmdW5jdGlvbihvcmRlcikgeyBzb3J0VmFsdWVzID0gb3JkZXI7IHJldHVybiBuZXN0OyB9LFxuICAgICAgcm9sbHVwOiBmdW5jdGlvbihmKSB7IHJvbGx1cCA9IGY7IHJldHVybiBuZXN0OyB9XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU9iamVjdCgpIHtcbiAgICByZXR1cm4ge307XG4gIH1cblxuICBmdW5jdGlvbiBzZXRPYmplY3Qob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gICAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU1hcCgpIHtcbiAgICByZXR1cm4gbWFwKCk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRNYXAobWFwLCBrZXksIHZhbHVlKSB7XG4gICAgbWFwLnNldChrZXksIHZhbHVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIFNldCgpIHt9XG5cbiAgdmFyIHByb3RvID0gbWFwLnByb3RvdHlwZTtcblxuICBTZXQucHJvdG90eXBlID0gc2V0LnByb3RvdHlwZSA9IHtcbiAgICBjb25zdHJ1Y3RvcjogU2V0LFxuICAgIGhhczogcHJvdG8uaGFzLFxuICAgIGFkZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhbHVlICs9IFwiXCI7XG4gICAgICB0aGlzW3ByZWZpeCArIHZhbHVlXSA9IHZhbHVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByZW1vdmU6IHByb3RvLnJlbW92ZSxcbiAgICBjbGVhcjogcHJvdG8uY2xlYXIsXG4gICAgdmFsdWVzOiBwcm90by5rZXlzLFxuICAgIHNpemU6IHByb3RvLnNpemUsXG4gICAgZW1wdHk6IHByb3RvLmVtcHR5LFxuICAgIGVhY2g6IHByb3RvLmVhY2hcbiAgfTtcblxuICBmdW5jdGlvbiBzZXQob2JqZWN0LCBmKSB7XG4gICAgdmFyIHNldCA9IG5ldyBTZXQ7XG5cbiAgICAvLyBDb3B5IGNvbnN0cnVjdG9yLlxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBTZXQpIG9iamVjdC5lYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IHNldC5hZGQodmFsdWUpOyB9KTtcblxuICAgIC8vIE90aGVyd2lzZSwgYXNzdW1lIGl04oCZcyBhbiBhcnJheS5cbiAgICBlbHNlIGlmIChvYmplY3QpIHtcbiAgICAgIHZhciBpID0gLTEsIG4gPSBvYmplY3QubGVuZ3RoO1xuICAgICAgaWYgKGYgPT0gbnVsbCkgd2hpbGUgKCsraSA8IG4pIHNldC5hZGQob2JqZWN0W2ldKTtcbiAgICAgIGVsc2Ugd2hpbGUgKCsraSA8IG4pIHNldC5hZGQoZihvYmplY3RbaV0sIGksIG9iamVjdCkpO1xuICAgIH1cblxuICAgIHJldHVybiBzZXQ7XG4gIH1cblxuICBmdW5jdGlvbiBrZXlzKG1hcCkge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG1hcCkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH1cblxuICBmdW5jdGlvbiB2YWx1ZXMobWFwKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBtYXApIHZhbHVlcy5wdXNoKG1hcFtrZXldKTtcbiAgICByZXR1cm4gdmFsdWVzO1xuICB9XG5cbiAgZnVuY3Rpb24gZW50cmllcyhtYXApIHtcbiAgICB2YXIgZW50cmllcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBtYXApIGVudHJpZXMucHVzaCh7a2V5OiBrZXksIHZhbHVlOiBtYXBba2V5XX0pO1xuICAgIHJldHVybiBlbnRyaWVzO1xuICB9XG5cbiAgZXhwb3J0cy5uZXN0ID0gbmVzdDtcbiAgZXhwb3J0cy5zZXQgPSBzZXQ7XG4gIGV4cG9ydHMubWFwID0gbWFwO1xuICBleHBvcnRzLmtleXMgPSBrZXlzO1xuICBleHBvcnRzLnZhbHVlcyA9IHZhbHVlcztcbiAgZXhwb3J0cy5lbnRyaWVzID0gZW50cmllcztcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSk7IiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy1jb2xvci8gVmVyc2lvbiAxLjAuMi4gQ29weXJpZ2h0IDIwMTYgTWlrZSBCb3N0b2NrLlxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuICAoZmFjdG9yeSgoZ2xvYmFsLmQzID0gZ2xvYmFsLmQzIHx8IHt9KSkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmaW5lID0gZnVuY3Rpb24oY29uc3RydWN0b3IsIGZhY3RvcnksIHByb3RvdHlwZSkge1xuICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBmYWN0b3J5LnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgcHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7XG59O1xuXG5mdW5jdGlvbiBleHRlbmQocGFyZW50LCBkZWZpbml0aW9uKSB7XG4gIHZhciBwcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuICBmb3IgKHZhciBrZXkgaW4gZGVmaW5pdGlvbikgcHJvdG90eXBlW2tleV0gPSBkZWZpbml0aW9uW2tleV07XG4gIHJldHVybiBwcm90b3R5cGU7XG59XG5cbmZ1bmN0aW9uIENvbG9yKCkge31cblxudmFyIGRhcmtlciA9IDAuNztcbnZhciBicmlnaHRlciA9IDEgLyBkYXJrZXI7XG5cbnZhciByZUkgPSBcIlxcXFxzKihbKy1dP1xcXFxkKylcXFxccypcIjtcbnZhciByZU4gPSBcIlxcXFxzKihbKy1dP1xcXFxkKlxcXFwuP1xcXFxkKyg/OltlRV1bKy1dP1xcXFxkKyk/KVxcXFxzKlwiO1xudmFyIHJlUCA9IFwiXFxcXHMqKFsrLV0/XFxcXGQqXFxcXC4/XFxcXGQrKD86W2VFXVsrLV0/XFxcXGQrKT8pJVxcXFxzKlwiO1xudmFyIHJlSGV4MyA9IC9eIyhbMC05YS1mXXszfSkkLztcbnZhciByZUhleDYgPSAvXiMoWzAtOWEtZl17Nn0pJC87XG52YXIgcmVSZ2JJbnRlZ2VyID0gbmV3IFJlZ0V4cChcIl5yZ2JcXFxcKFwiICsgW3JlSSwgcmVJLCByZUldICsgXCJcXFxcKSRcIik7XG52YXIgcmVSZ2JQZXJjZW50ID0gbmV3IFJlZ0V4cChcIl5yZ2JcXFxcKFwiICsgW3JlUCwgcmVQLCByZVBdICsgXCJcXFxcKSRcIik7XG52YXIgcmVSZ2JhSW50ZWdlciA9IG5ldyBSZWdFeHAoXCJecmdiYVxcXFwoXCIgKyBbcmVJLCByZUksIHJlSSwgcmVOXSArIFwiXFxcXCkkXCIpO1xudmFyIHJlUmdiYVBlcmNlbnQgPSBuZXcgUmVnRXhwKFwiXnJnYmFcXFxcKFwiICsgW3JlUCwgcmVQLCByZVAsIHJlTl0gKyBcIlxcXFwpJFwiKTtcbnZhciByZUhzbFBlcmNlbnQgPSBuZXcgUmVnRXhwKFwiXmhzbFxcXFwoXCIgKyBbcmVOLCByZVAsIHJlUF0gKyBcIlxcXFwpJFwiKTtcbnZhciByZUhzbGFQZXJjZW50ID0gbmV3IFJlZ0V4cChcIl5oc2xhXFxcXChcIiArIFtyZU4sIHJlUCwgcmVQLCByZU5dICsgXCJcXFxcKSRcIik7XG5cbnZhciBuYW1lZCA9IHtcbiAgYWxpY2VibHVlOiAweGYwZjhmZixcbiAgYW50aXF1ZXdoaXRlOiAweGZhZWJkNyxcbiAgYXF1YTogMHgwMGZmZmYsXG4gIGFxdWFtYXJpbmU6IDB4N2ZmZmQ0LFxuICBhenVyZTogMHhmMGZmZmYsXG4gIGJlaWdlOiAweGY1ZjVkYyxcbiAgYmlzcXVlOiAweGZmZTRjNCxcbiAgYmxhY2s6IDB4MDAwMDAwLFxuICBibGFuY2hlZGFsbW9uZDogMHhmZmViY2QsXG4gIGJsdWU6IDB4MDAwMGZmLFxuICBibHVldmlvbGV0OiAweDhhMmJlMixcbiAgYnJvd246IDB4YTUyYTJhLFxuICBidXJseXdvb2Q6IDB4ZGViODg3LFxuICBjYWRldGJsdWU6IDB4NWY5ZWEwLFxuICBjaGFydHJldXNlOiAweDdmZmYwMCxcbiAgY2hvY29sYXRlOiAweGQyNjkxZSxcbiAgY29yYWw6IDB4ZmY3ZjUwLFxuICBjb3JuZmxvd2VyYmx1ZTogMHg2NDk1ZWQsXG4gIGNvcm5zaWxrOiAweGZmZjhkYyxcbiAgY3JpbXNvbjogMHhkYzE0M2MsXG4gIGN5YW46IDB4MDBmZmZmLFxuICBkYXJrYmx1ZTogMHgwMDAwOGIsXG4gIGRhcmtjeWFuOiAweDAwOGI4YixcbiAgZGFya2dvbGRlbnJvZDogMHhiODg2MGIsXG4gIGRhcmtncmF5OiAweGE5YTlhOSxcbiAgZGFya2dyZWVuOiAweDAwNjQwMCxcbiAgZGFya2dyZXk6IDB4YTlhOWE5LFxuICBkYXJra2hha2k6IDB4YmRiNzZiLFxuICBkYXJrbWFnZW50YTogMHg4YjAwOGIsXG4gIGRhcmtvbGl2ZWdyZWVuOiAweDU1NmIyZixcbiAgZGFya29yYW5nZTogMHhmZjhjMDAsXG4gIGRhcmtvcmNoaWQ6IDB4OTkzMmNjLFxuICBkYXJrcmVkOiAweDhiMDAwMCxcbiAgZGFya3NhbG1vbjogMHhlOTk2N2EsXG4gIGRhcmtzZWFncmVlbjogMHg4ZmJjOGYsXG4gIGRhcmtzbGF0ZWJsdWU6IDB4NDgzZDhiLFxuICBkYXJrc2xhdGVncmF5OiAweDJmNGY0ZixcbiAgZGFya3NsYXRlZ3JleTogMHgyZjRmNGYsXG4gIGRhcmt0dXJxdW9pc2U6IDB4MDBjZWQxLFxuICBkYXJrdmlvbGV0OiAweDk0MDBkMyxcbiAgZGVlcHBpbms6IDB4ZmYxNDkzLFxuICBkZWVwc2t5Ymx1ZTogMHgwMGJmZmYsXG4gIGRpbWdyYXk6IDB4Njk2OTY5LFxuICBkaW1ncmV5OiAweDY5Njk2OSxcbiAgZG9kZ2VyYmx1ZTogMHgxZTkwZmYsXG4gIGZpcmVicmljazogMHhiMjIyMjIsXG4gIGZsb3JhbHdoaXRlOiAweGZmZmFmMCxcbiAgZm9yZXN0Z3JlZW46IDB4MjI4YjIyLFxuICBmdWNoc2lhOiAweGZmMDBmZixcbiAgZ2FpbnNib3JvOiAweGRjZGNkYyxcbiAgZ2hvc3R3aGl0ZTogMHhmOGY4ZmYsXG4gIGdvbGQ6IDB4ZmZkNzAwLFxuICBnb2xkZW5yb2Q6IDB4ZGFhNTIwLFxuICBncmF5OiAweDgwODA4MCxcbiAgZ3JlZW46IDB4MDA4MDAwLFxuICBncmVlbnllbGxvdzogMHhhZGZmMmYsXG4gIGdyZXk6IDB4ODA4MDgwLFxuICBob25leWRldzogMHhmMGZmZjAsXG4gIGhvdHBpbms6IDB4ZmY2OWI0LFxuICBpbmRpYW5yZWQ6IDB4Y2Q1YzVjLFxuICBpbmRpZ286IDB4NGIwMDgyLFxuICBpdm9yeTogMHhmZmZmZjAsXG4gIGtoYWtpOiAweGYwZTY4YyxcbiAgbGF2ZW5kZXI6IDB4ZTZlNmZhLFxuICBsYXZlbmRlcmJsdXNoOiAweGZmZjBmNSxcbiAgbGF3bmdyZWVuOiAweDdjZmMwMCxcbiAgbGVtb25jaGlmZm9uOiAweGZmZmFjZCxcbiAgbGlnaHRibHVlOiAweGFkZDhlNixcbiAgbGlnaHRjb3JhbDogMHhmMDgwODAsXG4gIGxpZ2h0Y3lhbjogMHhlMGZmZmYsXG4gIGxpZ2h0Z29sZGVucm9keWVsbG93OiAweGZhZmFkMixcbiAgbGlnaHRncmF5OiAweGQzZDNkMyxcbiAgbGlnaHRncmVlbjogMHg5MGVlOTAsXG4gIGxpZ2h0Z3JleTogMHhkM2QzZDMsXG4gIGxpZ2h0cGluazogMHhmZmI2YzEsXG4gIGxpZ2h0c2FsbW9uOiAweGZmYTA3YSxcbiAgbGlnaHRzZWFncmVlbjogMHgyMGIyYWEsXG4gIGxpZ2h0c2t5Ymx1ZTogMHg4N2NlZmEsXG4gIGxpZ2h0c2xhdGVncmF5OiAweDc3ODg5OSxcbiAgbGlnaHRzbGF0ZWdyZXk6IDB4Nzc4ODk5LFxuICBsaWdodHN0ZWVsYmx1ZTogMHhiMGM0ZGUsXG4gIGxpZ2h0eWVsbG93OiAweGZmZmZlMCxcbiAgbGltZTogMHgwMGZmMDAsXG4gIGxpbWVncmVlbjogMHgzMmNkMzIsXG4gIGxpbmVuOiAweGZhZjBlNixcbiAgbWFnZW50YTogMHhmZjAwZmYsXG4gIG1hcm9vbjogMHg4MDAwMDAsXG4gIG1lZGl1bWFxdWFtYXJpbmU6IDB4NjZjZGFhLFxuICBtZWRpdW1ibHVlOiAweDAwMDBjZCxcbiAgbWVkaXVtb3JjaGlkOiAweGJhNTVkMyxcbiAgbWVkaXVtcHVycGxlOiAweDkzNzBkYixcbiAgbWVkaXVtc2VhZ3JlZW46IDB4M2NiMzcxLFxuICBtZWRpdW1zbGF0ZWJsdWU6IDB4N2I2OGVlLFxuICBtZWRpdW1zcHJpbmdncmVlbjogMHgwMGZhOWEsXG4gIG1lZGl1bXR1cnF1b2lzZTogMHg0OGQxY2MsXG4gIG1lZGl1bXZpb2xldHJlZDogMHhjNzE1ODUsXG4gIG1pZG5pZ2h0Ymx1ZTogMHgxOTE5NzAsXG4gIG1pbnRjcmVhbTogMHhmNWZmZmEsXG4gIG1pc3R5cm9zZTogMHhmZmU0ZTEsXG4gIG1vY2Nhc2luOiAweGZmZTRiNSxcbiAgbmF2YWpvd2hpdGU6IDB4ZmZkZWFkLFxuICBuYXZ5OiAweDAwMDA4MCxcbiAgb2xkbGFjZTogMHhmZGY1ZTYsXG4gIG9saXZlOiAweDgwODAwMCxcbiAgb2xpdmVkcmFiOiAweDZiOGUyMyxcbiAgb3JhbmdlOiAweGZmYTUwMCxcbiAgb3JhbmdlcmVkOiAweGZmNDUwMCxcbiAgb3JjaGlkOiAweGRhNzBkNixcbiAgcGFsZWdvbGRlbnJvZDogMHhlZWU4YWEsXG4gIHBhbGVncmVlbjogMHg5OGZiOTgsXG4gIHBhbGV0dXJxdW9pc2U6IDB4YWZlZWVlLFxuICBwYWxldmlvbGV0cmVkOiAweGRiNzA5MyxcbiAgcGFwYXlhd2hpcDogMHhmZmVmZDUsXG4gIHBlYWNocHVmZjogMHhmZmRhYjksXG4gIHBlcnU6IDB4Y2Q4NTNmLFxuICBwaW5rOiAweGZmYzBjYixcbiAgcGx1bTogMHhkZGEwZGQsXG4gIHBvd2RlcmJsdWU6IDB4YjBlMGU2LFxuICBwdXJwbGU6IDB4ODAwMDgwLFxuICByZWJlY2NhcHVycGxlOiAweDY2MzM5OSxcbiAgcmVkOiAweGZmMDAwMCxcbiAgcm9zeWJyb3duOiAweGJjOGY4ZixcbiAgcm95YWxibHVlOiAweDQxNjllMSxcbiAgc2FkZGxlYnJvd246IDB4OGI0NTEzLFxuICBzYWxtb246IDB4ZmE4MDcyLFxuICBzYW5keWJyb3duOiAweGY0YTQ2MCxcbiAgc2VhZ3JlZW46IDB4MmU4YjU3LFxuICBzZWFzaGVsbDogMHhmZmY1ZWUsXG4gIHNpZW5uYTogMHhhMDUyMmQsXG4gIHNpbHZlcjogMHhjMGMwYzAsXG4gIHNreWJsdWU6IDB4ODdjZWViLFxuICBzbGF0ZWJsdWU6IDB4NmE1YWNkLFxuICBzbGF0ZWdyYXk6IDB4NzA4MDkwLFxuICBzbGF0ZWdyZXk6IDB4NzA4MDkwLFxuICBzbm93OiAweGZmZmFmYSxcbiAgc3ByaW5nZ3JlZW46IDB4MDBmZjdmLFxuICBzdGVlbGJsdWU6IDB4NDY4MmI0LFxuICB0YW46IDB4ZDJiNDhjLFxuICB0ZWFsOiAweDAwODA4MCxcbiAgdGhpc3RsZTogMHhkOGJmZDgsXG4gIHRvbWF0bzogMHhmZjYzNDcsXG4gIHR1cnF1b2lzZTogMHg0MGUwZDAsXG4gIHZpb2xldDogMHhlZTgyZWUsXG4gIHdoZWF0OiAweGY1ZGViMyxcbiAgd2hpdGU6IDB4ZmZmZmZmLFxuICB3aGl0ZXNtb2tlOiAweGY1ZjVmNSxcbiAgeWVsbG93OiAweGZmZmYwMCxcbiAgeWVsbG93Z3JlZW46IDB4OWFjZDMyXG59O1xuXG5kZWZpbmUoQ29sb3IsIGNvbG9yLCB7XG4gIGRpc3BsYXlhYmxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZ2IoKS5kaXNwbGF5YWJsZSgpO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucmdiKCkgKyBcIlwiO1xuICB9XG59KTtcblxuZnVuY3Rpb24gY29sb3IoZm9ybWF0KSB7XG4gIHZhciBtO1xuICBmb3JtYXQgPSAoZm9ybWF0ICsgXCJcIikudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiAobSA9IHJlSGV4My5leGVjKGZvcm1hdCkpID8gKG0gPSBwYXJzZUludChtWzFdLCAxNiksIG5ldyBSZ2IoKG0gPj4gOCAmIDB4ZikgfCAobSA+PiA0ICYgMHgwZjApLCAobSA+PiA0ICYgMHhmKSB8IChtICYgMHhmMCksICgobSAmIDB4ZikgPDwgNCkgfCAobSAmIDB4ZiksIDEpKSAvLyAjZjAwXG4gICAgICA6IChtID0gcmVIZXg2LmV4ZWMoZm9ybWF0KSkgPyByZ2JuKHBhcnNlSW50KG1bMV0sIDE2KSkgLy8gI2ZmMDAwMFxuICAgICAgOiAobSA9IHJlUmdiSW50ZWdlci5leGVjKGZvcm1hdCkpID8gbmV3IFJnYihtWzFdLCBtWzJdLCBtWzNdLCAxKSAvLyByZ2IoMjU1LCAwLCAwKVxuICAgICAgOiAobSA9IHJlUmdiUGVyY2VudC5leGVjKGZvcm1hdCkpID8gbmV3IFJnYihtWzFdICogMjU1IC8gMTAwLCBtWzJdICogMjU1IC8gMTAwLCBtWzNdICogMjU1IC8gMTAwLCAxKSAvLyByZ2IoMTAwJSwgMCUsIDAlKVxuICAgICAgOiAobSA9IHJlUmdiYUludGVnZXIuZXhlYyhmb3JtYXQpKSA/IHJnYmEobVsxXSwgbVsyXSwgbVszXSwgbVs0XSkgLy8gcmdiYSgyNTUsIDAsIDAsIDEpXG4gICAgICA6IChtID0gcmVSZ2JhUGVyY2VudC5leGVjKGZvcm1hdCkpID8gcmdiYShtWzFdICogMjU1IC8gMTAwLCBtWzJdICogMjU1IC8gMTAwLCBtWzNdICogMjU1IC8gMTAwLCBtWzRdKSAvLyByZ2IoMTAwJSwgMCUsIDAlLCAxKVxuICAgICAgOiAobSA9IHJlSHNsUGVyY2VudC5leGVjKGZvcm1hdCkpID8gaHNsYShtWzFdLCBtWzJdIC8gMTAwLCBtWzNdIC8gMTAwLCAxKSAvLyBoc2woMTIwLCA1MCUsIDUwJSlcbiAgICAgIDogKG0gPSByZUhzbGFQZXJjZW50LmV4ZWMoZm9ybWF0KSkgPyBoc2xhKG1bMV0sIG1bMl0gLyAxMDAsIG1bM10gLyAxMDAsIG1bNF0pIC8vIGhzbGEoMTIwLCA1MCUsIDUwJSwgMSlcbiAgICAgIDogbmFtZWQuaGFzT3duUHJvcGVydHkoZm9ybWF0KSA/IHJnYm4obmFtZWRbZm9ybWF0XSlcbiAgICAgIDogZm9ybWF0ID09PSBcInRyYW5zcGFyZW50XCIgPyBuZXcgUmdiKE5hTiwgTmFOLCBOYU4sIDApXG4gICAgICA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJnYm4obikge1xuICByZXR1cm4gbmV3IFJnYihuID4+IDE2ICYgMHhmZiwgbiA+PiA4ICYgMHhmZiwgbiAmIDB4ZmYsIDEpO1xufVxuXG5mdW5jdGlvbiByZ2JhKHIsIGcsIGIsIGEpIHtcbiAgaWYgKGEgPD0gMCkgciA9IGcgPSBiID0gTmFOO1xuICByZXR1cm4gbmV3IFJnYihyLCBnLCBiLCBhKTtcbn1cblxuZnVuY3Rpb24gcmdiQ29udmVydChvKSB7XG4gIGlmICghKG8gaW5zdGFuY2VvZiBDb2xvcikpIG8gPSBjb2xvcihvKTtcbiAgaWYgKCFvKSByZXR1cm4gbmV3IFJnYjtcbiAgbyA9IG8ucmdiKCk7XG4gIHJldHVybiBuZXcgUmdiKG8uciwgby5nLCBvLmIsIG8ub3BhY2l0eSk7XG59XG5cbmZ1bmN0aW9uIHJnYihyLCBnLCBiLCBvcGFjaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gcmdiQ29udmVydChyKSA6IG5ldyBSZ2IociwgZywgYiwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5mdW5jdGlvbiBSZ2IociwgZywgYiwgb3BhY2l0eSkge1xuICB0aGlzLnIgPSArcjtcbiAgdGhpcy5nID0gK2c7XG4gIHRoaXMuYiA9ICtiO1xuICB0aGlzLm9wYWNpdHkgPSArb3BhY2l0eTtcbn1cblxuZGVmaW5lKFJnYiwgcmdiLCBleHRlbmQoQ29sb3IsIHtcbiAgYnJpZ2h0ZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gYnJpZ2h0ZXIgOiBNYXRoLnBvdyhicmlnaHRlciwgayk7XG4gICAgcmV0dXJuIG5ldyBSZ2IodGhpcy5yICogaywgdGhpcy5nICogaywgdGhpcy5iICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGRhcmtlciA6IE1hdGgucG93KGRhcmtlciwgayk7XG4gICAgcmV0dXJuIG5ldyBSZ2IodGhpcy5yICogaywgdGhpcy5nICogaywgdGhpcy5iICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZGlzcGxheWFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoMCA8PSB0aGlzLnIgJiYgdGhpcy5yIDw9IDI1NSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5nICYmIHRoaXMuZyA8PSAyNTUpXG4gICAgICAgICYmICgwIDw9IHRoaXMuYiAmJiB0aGlzLmIgPD0gMjU1KVxuICAgICAgICAmJiAoMCA8PSB0aGlzLm9wYWNpdHkgJiYgdGhpcy5vcGFjaXR5IDw9IDEpO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLm9wYWNpdHk7IGEgPSBpc05hTihhKSA/IDEgOiBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBhKSk7XG4gICAgcmV0dXJuIChhID09PSAxID8gXCJyZ2IoXCIgOiBcInJnYmEoXCIpXG4gICAgICAgICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHRoaXMucikgfHwgMCkpICsgXCIsIFwiXG4gICAgICAgICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHRoaXMuZykgfHwgMCkpICsgXCIsIFwiXG4gICAgICAgICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHRoaXMuYikgfHwgMCkpXG4gICAgICAgICsgKGEgPT09IDEgPyBcIilcIiA6IFwiLCBcIiArIGEgKyBcIilcIik7XG4gIH1cbn0pKTtcblxuZnVuY3Rpb24gaHNsYShoLCBzLCBsLCBhKSB7XG4gIGlmIChhIDw9IDApIGggPSBzID0gbCA9IE5hTjtcbiAgZWxzZSBpZiAobCA8PSAwIHx8IGwgPj0gMSkgaCA9IHMgPSBOYU47XG4gIGVsc2UgaWYgKHMgPD0gMCkgaCA9IE5hTjtcbiAgcmV0dXJuIG5ldyBIc2woaCwgcywgbCwgYSk7XG59XG5cbmZ1bmN0aW9uIGhzbENvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIEhzbCkgcmV0dXJuIG5ldyBIc2woby5oLCBvLnMsIG8ubCwgby5vcGFjaXR5KTtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIENvbG9yKSkgbyA9IGNvbG9yKG8pO1xuICBpZiAoIW8pIHJldHVybiBuZXcgSHNsO1xuICBpZiAobyBpbnN0YW5jZW9mIEhzbCkgcmV0dXJuIG87XG4gIG8gPSBvLnJnYigpO1xuICB2YXIgciA9IG8uciAvIDI1NSxcbiAgICAgIGcgPSBvLmcgLyAyNTUsXG4gICAgICBiID0gby5iIC8gMjU1LFxuICAgICAgbWluID0gTWF0aC5taW4ociwgZywgYiksXG4gICAgICBtYXggPSBNYXRoLm1heChyLCBnLCBiKSxcbiAgICAgIGggPSBOYU4sXG4gICAgICBzID0gbWF4IC0gbWluLFxuICAgICAgbCA9IChtYXggKyBtaW4pIC8gMjtcbiAgaWYgKHMpIHtcbiAgICBpZiAociA9PT0gbWF4KSBoID0gKGcgLSBiKSAvIHMgKyAoZyA8IGIpICogNjtcbiAgICBlbHNlIGlmIChnID09PSBtYXgpIGggPSAoYiAtIHIpIC8gcyArIDI7XG4gICAgZWxzZSBoID0gKHIgLSBnKSAvIHMgKyA0O1xuICAgIHMgLz0gbCA8IDAuNSA/IG1heCArIG1pbiA6IDIgLSBtYXggLSBtaW47XG4gICAgaCAqPSA2MDtcbiAgfSBlbHNlIHtcbiAgICBzID0gbCA+IDAgJiYgbCA8IDEgPyAwIDogaDtcbiAgfVxuICByZXR1cm4gbmV3IEhzbChoLCBzLCBsLCBvLm9wYWNpdHkpO1xufVxuXG5mdW5jdGlvbiBoc2woaCwgcywgbCwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGhzbENvbnZlcnQoaCkgOiBuZXcgSHNsKGgsIHMsIGwsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gSHNsKGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgdGhpcy5oID0gK2g7XG4gIHRoaXMucyA9ICtzO1xuICB0aGlzLmwgPSArbDtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShIc2wsIGhzbCwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGJyaWdodGVyIDogTWF0aC5wb3coYnJpZ2h0ZXIsIGspO1xuICAgIHJldHVybiBuZXcgSHNsKHRoaXMuaCwgdGhpcy5zLCB0aGlzLmwgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gZGFya2VyIDogTWF0aC5wb3coZGFya2VyLCBrKTtcbiAgICByZXR1cm4gbmV3IEhzbCh0aGlzLmgsIHRoaXMucywgdGhpcy5sICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaCA9IHRoaXMuaCAlIDM2MCArICh0aGlzLmggPCAwKSAqIDM2MCxcbiAgICAgICAgcyA9IGlzTmFOKGgpIHx8IGlzTmFOKHRoaXMucykgPyAwIDogdGhpcy5zLFxuICAgICAgICBsID0gdGhpcy5sLFxuICAgICAgICBtMiA9IGwgKyAobCA8IDAuNSA/IGwgOiAxIC0gbCkgKiBzLFxuICAgICAgICBtMSA9IDIgKiBsIC0gbTI7XG4gICAgcmV0dXJuIG5ldyBSZ2IoXG4gICAgICBoc2wycmdiKGggPj0gMjQwID8gaCAtIDI0MCA6IGggKyAxMjAsIG0xLCBtMiksXG4gICAgICBoc2wycmdiKGgsIG0xLCBtMiksXG4gICAgICBoc2wycmdiKGggPCAxMjAgPyBoICsgMjQwIDogaCAtIDEyMCwgbTEsIG0yKSxcbiAgICAgIHRoaXMub3BhY2l0eVxuICAgICk7XG4gIH0sXG4gIGRpc3BsYXlhYmxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKDAgPD0gdGhpcy5zICYmIHRoaXMucyA8PSAxIHx8IGlzTmFOKHRoaXMucykpXG4gICAgICAgICYmICgwIDw9IHRoaXMubCAmJiB0aGlzLmwgPD0gMSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5vcGFjaXR5ICYmIHRoaXMub3BhY2l0eSA8PSAxKTtcbiAgfVxufSkpO1xuXG4vKiBGcm9tIEZ2RCAxMy4zNywgQ1NTIENvbG9yIE1vZHVsZSBMZXZlbCAzICovXG5mdW5jdGlvbiBoc2wycmdiKGgsIG0xLCBtMikge1xuICByZXR1cm4gKGggPCA2MCA/IG0xICsgKG0yIC0gbTEpICogaCAvIDYwXG4gICAgICA6IGggPCAxODAgPyBtMlxuICAgICAgOiBoIDwgMjQwID8gbTEgKyAobTIgLSBtMSkgKiAoMjQwIC0gaCkgLyA2MFxuICAgICAgOiBtMSkgKiAyNTU7XG59XG5cbnZhciBkZWcycmFkID0gTWF0aC5QSSAvIDE4MDtcbnZhciByYWQyZGVnID0gMTgwIC8gTWF0aC5QSTtcblxudmFyIEtuID0gMTg7XG52YXIgWG4gPSAwLjk1MDQ3MDtcbnZhciBZbiA9IDE7XG52YXIgWm4gPSAxLjA4ODgzMDtcbnZhciB0MCA9IDQgLyAyOTtcbnZhciB0MSA9IDYgLyAyOTtcbnZhciB0MiA9IDMgKiB0MSAqIHQxO1xudmFyIHQzID0gdDEgKiB0MSAqIHQxO1xuXG5mdW5jdGlvbiBsYWJDb252ZXJ0KG8pIHtcbiAgaWYgKG8gaW5zdGFuY2VvZiBMYWIpIHJldHVybiBuZXcgTGFiKG8ubCwgby5hLCBvLmIsIG8ub3BhY2l0eSk7XG4gIGlmIChvIGluc3RhbmNlb2YgSGNsKSB7XG4gICAgdmFyIGggPSBvLmggKiBkZWcycmFkO1xuICAgIHJldHVybiBuZXcgTGFiKG8ubCwgTWF0aC5jb3MoaCkgKiBvLmMsIE1hdGguc2luKGgpICogby5jLCBvLm9wYWNpdHkpO1xuICB9XG4gIGlmICghKG8gaW5zdGFuY2VvZiBSZ2IpKSBvID0gcmdiQ29udmVydChvKTtcbiAgdmFyIGIgPSByZ2IyeHl6KG8uciksXG4gICAgICBhID0gcmdiMnh5eihvLmcpLFxuICAgICAgbCA9IHJnYjJ4eXooby5iKSxcbiAgICAgIHggPSB4eXoybGFiKCgwLjQxMjQ1NjQgKiBiICsgMC4zNTc1NzYxICogYSArIDAuMTgwNDM3NSAqIGwpIC8gWG4pLFxuICAgICAgeSA9IHh5ejJsYWIoKDAuMjEyNjcyOSAqIGIgKyAwLjcxNTE1MjIgKiBhICsgMC4wNzIxNzUwICogbCkgLyBZbiksXG4gICAgICB6ID0geHl6MmxhYigoMC4wMTkzMzM5ICogYiArIDAuMTE5MTkyMCAqIGEgKyAwLjk1MDMwNDEgKiBsKSAvIFpuKTtcbiAgcmV0dXJuIG5ldyBMYWIoMTE2ICogeSAtIDE2LCA1MDAgKiAoeCAtIHkpLCAyMDAgKiAoeSAtIHopLCBvLm9wYWNpdHkpO1xufVxuXG5mdW5jdGlvbiBsYWIobCwgYSwgYiwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGxhYkNvbnZlcnQobCkgOiBuZXcgTGFiKGwsIGEsIGIsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gTGFiKGwsIGEsIGIsIG9wYWNpdHkpIHtcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMuYSA9ICthO1xuICB0aGlzLmIgPSArYjtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShMYWIsIGxhYiwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIG5ldyBMYWIodGhpcy5sICsgS24gKiAoayA9PSBudWxsID8gMSA6IGspLCB0aGlzLmEsIHRoaXMuYiwgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIG5ldyBMYWIodGhpcy5sIC0gS24gKiAoayA9PSBudWxsID8gMSA6IGspLCB0aGlzLmEsIHRoaXMuYiwgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgeSA9ICh0aGlzLmwgKyAxNikgLyAxMTYsXG4gICAgICAgIHggPSBpc05hTih0aGlzLmEpID8geSA6IHkgKyB0aGlzLmEgLyA1MDAsXG4gICAgICAgIHogPSBpc05hTih0aGlzLmIpID8geSA6IHkgLSB0aGlzLmIgLyAyMDA7XG4gICAgeSA9IFluICogbGFiMnh5eih5KTtcbiAgICB4ID0gWG4gKiBsYWIyeHl6KHgpO1xuICAgIHogPSBabiAqIGxhYjJ4eXooeik7XG4gICAgcmV0dXJuIG5ldyBSZ2IoXG4gICAgICB4eXoycmdiKCAzLjI0MDQ1NDIgKiB4IC0gMS41MzcxMzg1ICogeSAtIDAuNDk4NTMxNCAqIHopLCAvLyBENjUgLT4gc1JHQlxuICAgICAgeHl6MnJnYigtMC45NjkyNjYwICogeCArIDEuODc2MDEwOCAqIHkgKyAwLjA0MTU1NjAgKiB6KSxcbiAgICAgIHh5ejJyZ2IoIDAuMDU1NjQzNCAqIHggLSAwLjIwNDAyNTkgKiB5ICsgMS4wNTcyMjUyICogeiksXG4gICAgICB0aGlzLm9wYWNpdHlcbiAgICApO1xuICB9XG59KSk7XG5cbmZ1bmN0aW9uIHh5ejJsYWIodCkge1xuICByZXR1cm4gdCA+IHQzID8gTWF0aC5wb3codCwgMSAvIDMpIDogdCAvIHQyICsgdDA7XG59XG5cbmZ1bmN0aW9uIGxhYjJ4eXoodCkge1xuICByZXR1cm4gdCA+IHQxID8gdCAqIHQgKiB0IDogdDIgKiAodCAtIHQwKTtcbn1cblxuZnVuY3Rpb24geHl6MnJnYih4KSB7XG4gIHJldHVybiAyNTUgKiAoeCA8PSAwLjAwMzEzMDggPyAxMi45MiAqIHggOiAxLjA1NSAqIE1hdGgucG93KHgsIDEgLyAyLjQpIC0gMC4wNTUpO1xufVxuXG5mdW5jdGlvbiByZ2IyeHl6KHgpIHtcbiAgcmV0dXJuICh4IC89IDI1NSkgPD0gMC4wNDA0NSA/IHggLyAxMi45MiA6IE1hdGgucG93KCh4ICsgMC4wNTUpIC8gMS4wNTUsIDIuNCk7XG59XG5cbmZ1bmN0aW9uIGhjbENvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIEhjbCkgcmV0dXJuIG5ldyBIY2woby5oLCBvLmMsIG8ubCwgby5vcGFjaXR5KTtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIExhYikpIG8gPSBsYWJDb252ZXJ0KG8pO1xuICB2YXIgaCA9IE1hdGguYXRhbjIoby5iLCBvLmEpICogcmFkMmRlZztcbiAgcmV0dXJuIG5ldyBIY2woaCA8IDAgPyBoICsgMzYwIDogaCwgTWF0aC5zcXJ0KG8uYSAqIG8uYSArIG8uYiAqIG8uYiksIG8ubCwgby5vcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gaGNsKGgsIGMsIGwsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBoY2xDb252ZXJ0KGgpIDogbmV3IEhjbChoLCBjLCBsLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmZ1bmN0aW9uIEhjbChoLCBjLCBsLCBvcGFjaXR5KSB7XG4gIHRoaXMuaCA9ICtoO1xuICB0aGlzLmMgPSArYztcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoSGNsLCBoY2wsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgSGNsKHRoaXMuaCwgdGhpcy5jLCB0aGlzLmwgKyBLbiAqIChrID09IG51bGwgPyAxIDogayksIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgSGNsKHRoaXMuaCwgdGhpcy5jLCB0aGlzLmwgLSBLbiAqIChrID09IG51bGwgPyAxIDogayksIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGxhYkNvbnZlcnQodGhpcykucmdiKCk7XG4gIH1cbn0pKTtcblxudmFyIEEgPSAtMC4xNDg2MTtcbnZhciBCID0gKzEuNzgyNzc7XG52YXIgQyA9IC0wLjI5MjI3O1xudmFyIEQgPSAtMC45MDY0OTtcbnZhciBFID0gKzEuOTcyOTQ7XG52YXIgRUQgPSBFICogRDtcbnZhciBFQiA9IEUgKiBCO1xudmFyIEJDX0RBID0gQiAqIEMgLSBEICogQTtcblxuZnVuY3Rpb24gY3ViZWhlbGl4Q29udmVydChvKSB7XG4gIGlmIChvIGluc3RhbmNlb2YgQ3ViZWhlbGl4KSByZXR1cm4gbmV3IEN1YmVoZWxpeChvLmgsIG8ucywgby5sLCBvLm9wYWNpdHkpO1xuICBpZiAoIShvIGluc3RhbmNlb2YgUmdiKSkgbyA9IHJnYkNvbnZlcnQobyk7XG4gIHZhciByID0gby5yIC8gMjU1LFxuICAgICAgZyA9IG8uZyAvIDI1NSxcbiAgICAgIGIgPSBvLmIgLyAyNTUsXG4gICAgICBsID0gKEJDX0RBICogYiArIEVEICogciAtIEVCICogZykgLyAoQkNfREEgKyBFRCAtIEVCKSxcbiAgICAgIGJsID0gYiAtIGwsXG4gICAgICBrID0gKEUgKiAoZyAtIGwpIC0gQyAqIGJsKSAvIEQsXG4gICAgICBzID0gTWF0aC5zcXJ0KGsgKiBrICsgYmwgKiBibCkgLyAoRSAqIGwgKiAoMSAtIGwpKSwgLy8gTmFOIGlmIGw9MCBvciBsPTFcbiAgICAgIGggPSBzID8gTWF0aC5hdGFuMihrLCBibCkgKiByYWQyZGVnIC0gMTIwIDogTmFOO1xuICByZXR1cm4gbmV3IEN1YmVoZWxpeChoIDwgMCA/IGggKyAzNjAgOiBoLCBzLCBsLCBvLm9wYWNpdHkpO1xufVxuXG5mdW5jdGlvbiBjdWJlaGVsaXgoaCwgcywgbCwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGN1YmVoZWxpeENvbnZlcnQoaCkgOiBuZXcgQ3ViZWhlbGl4KGgsIHMsIGwsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gQ3ViZWhlbGl4KGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgdGhpcy5oID0gK2g7XG4gIHRoaXMucyA9ICtzO1xuICB0aGlzLmwgPSArbDtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShDdWJlaGVsaXgsIGN1YmVoZWxpeCwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGJyaWdodGVyIDogTWF0aC5wb3coYnJpZ2h0ZXIsIGspO1xuICAgIHJldHVybiBuZXcgQ3ViZWhlbGl4KHRoaXMuaCwgdGhpcy5zLCB0aGlzLmwgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gZGFya2VyIDogTWF0aC5wb3coZGFya2VyLCBrKTtcbiAgICByZXR1cm4gbmV3IEN1YmVoZWxpeCh0aGlzLmgsIHRoaXMucywgdGhpcy5sICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaCA9IGlzTmFOKHRoaXMuaCkgPyAwIDogKHRoaXMuaCArIDEyMCkgKiBkZWcycmFkLFxuICAgICAgICBsID0gK3RoaXMubCxcbiAgICAgICAgYSA9IGlzTmFOKHRoaXMucykgPyAwIDogdGhpcy5zICogbCAqICgxIC0gbCksXG4gICAgICAgIGNvc2ggPSBNYXRoLmNvcyhoKSxcbiAgICAgICAgc2luaCA9IE1hdGguc2luKGgpO1xuICAgIHJldHVybiBuZXcgUmdiKFxuICAgICAgMjU1ICogKGwgKyBhICogKEEgKiBjb3NoICsgQiAqIHNpbmgpKSxcbiAgICAgIDI1NSAqIChsICsgYSAqIChDICogY29zaCArIEQgKiBzaW5oKSksXG4gICAgICAyNTUgKiAobCArIGEgKiAoRSAqIGNvc2gpKSxcbiAgICAgIHRoaXMub3BhY2l0eVxuICAgICk7XG4gIH1cbn0pKTtcblxuZXhwb3J0cy5jb2xvciA9IGNvbG9yO1xuZXhwb3J0cy5yZ2IgPSByZ2I7XG5leHBvcnRzLmhzbCA9IGhzbDtcbmV4cG9ydHMubGFiID0gbGFiO1xuZXhwb3J0cy5oY2wgPSBoY2w7XG5leHBvcnRzLmN1YmVoZWxpeCA9IGN1YmVoZWxpeDtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbiIsIi8vIGh0dHBzOi8vZDNqcy5vcmcvZDMtZm9ybWF0LyBWZXJzaW9uIDEuMi4wLiBDb3B5cmlnaHQgMjAxNyBNaWtlIEJvc3RvY2suXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuXHR0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG5cdChmYWN0b3J5KChnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cbi8vIENvbXB1dGVzIHRoZSBkZWNpbWFsIGNvZWZmaWNpZW50IGFuZCBleHBvbmVudCBvZiB0aGUgc3BlY2lmaWVkIG51bWJlciB4IHdpdGhcbi8vIHNpZ25pZmljYW50IGRpZ2l0cyBwLCB3aGVyZSB4IGlzIHBvc2l0aXZlIGFuZCBwIGlzIGluIFsxLCAyMV0gb3IgdW5kZWZpbmVkLlxuLy8gRm9yIGV4YW1wbGUsIGZvcm1hdERlY2ltYWwoMS4yMykgcmV0dXJucyBbXCIxMjNcIiwgMF0uXG52YXIgZm9ybWF0RGVjaW1hbCA9IGZ1bmN0aW9uKHgsIHApIHtcbiAgaWYgKChpID0gKHggPSBwID8geC50b0V4cG9uZW50aWFsKHAgLSAxKSA6IHgudG9FeHBvbmVudGlhbCgpKS5pbmRleE9mKFwiZVwiKSkgPCAwKSByZXR1cm4gbnVsbDsgLy8gTmFOLCDCsUluZmluaXR5XG4gIHZhciBpLCBjb2VmZmljaWVudCA9IHguc2xpY2UoMCwgaSk7XG5cbiAgLy8gVGhlIHN0cmluZyByZXR1cm5lZCBieSB0b0V4cG9uZW50aWFsIGVpdGhlciBoYXMgdGhlIGZvcm0gXFxkXFwuXFxkK2VbLStdXFxkK1xuICAvLyAoZS5nLiwgMS4yZSszKSBvciB0aGUgZm9ybSBcXGRlWy0rXVxcZCsgKGUuZy4sIDFlKzMpLlxuICByZXR1cm4gW1xuICAgIGNvZWZmaWNpZW50Lmxlbmd0aCA+IDEgPyBjb2VmZmljaWVudFswXSArIGNvZWZmaWNpZW50LnNsaWNlKDIpIDogY29lZmZpY2llbnQsXG4gICAgK3guc2xpY2UoaSArIDEpXG4gIF07XG59O1xuXG52YXIgZXhwb25lbnQgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4ID0gZm9ybWF0RGVjaW1hbChNYXRoLmFicyh4KSksIHggPyB4WzFdIDogTmFOO1xufTtcblxudmFyIGZvcm1hdEdyb3VwID0gZnVuY3Rpb24oZ3JvdXBpbmcsIHRob3VzYW5kcykge1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUsIHdpZHRoKSB7XG4gICAgdmFyIGkgPSB2YWx1ZS5sZW5ndGgsXG4gICAgICAgIHQgPSBbXSxcbiAgICAgICAgaiA9IDAsXG4gICAgICAgIGcgPSBncm91cGluZ1swXSxcbiAgICAgICAgbGVuZ3RoID0gMDtcblxuICAgIHdoaWxlIChpID4gMCAmJiBnID4gMCkge1xuICAgICAgaWYgKGxlbmd0aCArIGcgKyAxID4gd2lkdGgpIGcgPSBNYXRoLm1heCgxLCB3aWR0aCAtIGxlbmd0aCk7XG4gICAgICB0LnB1c2godmFsdWUuc3Vic3RyaW5nKGkgLT0gZywgaSArIGcpKTtcbiAgICAgIGlmICgobGVuZ3RoICs9IGcgKyAxKSA+IHdpZHRoKSBicmVhaztcbiAgICAgIGcgPSBncm91cGluZ1tqID0gKGogKyAxKSAlIGdyb3VwaW5nLmxlbmd0aF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHQucmV2ZXJzZSgpLmpvaW4odGhvdXNhbmRzKTtcbiAgfTtcbn07XG5cbnZhciBmb3JtYXROdW1lcmFscyA9IGZ1bmN0aW9uKG51bWVyYWxzKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bMC05XS9nLCBmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gbnVtZXJhbHNbK2ldO1xuICAgIH0pO1xuICB9O1xufTtcblxudmFyIGZvcm1hdERlZmF1bHQgPSBmdW5jdGlvbih4LCBwKSB7XG4gIHggPSB4LnRvUHJlY2lzaW9uKHApO1xuXG4gIG91dDogZm9yICh2YXIgbiA9IHgubGVuZ3RoLCBpID0gMSwgaTAgPSAtMSwgaTE7IGkgPCBuOyArK2kpIHtcbiAgICBzd2l0Y2ggKHhbaV0pIHtcbiAgICAgIGNhc2UgXCIuXCI6IGkwID0gaTEgPSBpOyBicmVhaztcbiAgICAgIGNhc2UgXCIwXCI6IGlmIChpMCA9PT0gMCkgaTAgPSBpOyBpMSA9IGk7IGJyZWFrO1xuICAgICAgY2FzZSBcImVcIjogYnJlYWsgb3V0O1xuICAgICAgZGVmYXVsdDogaWYgKGkwID4gMCkgaTAgPSAwOyBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaTAgPiAwID8geC5zbGljZSgwLCBpMCkgKyB4LnNsaWNlKGkxICsgMSkgOiB4O1xufTtcblxudmFyIHByZWZpeEV4cG9uZW50O1xuXG52YXIgZm9ybWF0UHJlZml4QXV0byA9IGZ1bmN0aW9uKHgsIHApIHtcbiAgdmFyIGQgPSBmb3JtYXREZWNpbWFsKHgsIHApO1xuICBpZiAoIWQpIHJldHVybiB4ICsgXCJcIjtcbiAgdmFyIGNvZWZmaWNpZW50ID0gZFswXSxcbiAgICAgIGV4cG9uZW50ID0gZFsxXSxcbiAgICAgIGkgPSBleHBvbmVudCAtIChwcmVmaXhFeHBvbmVudCA9IE1hdGgubWF4KC04LCBNYXRoLm1pbig4LCBNYXRoLmZsb29yKGV4cG9uZW50IC8gMykpKSAqIDMpICsgMSxcbiAgICAgIG4gPSBjb2VmZmljaWVudC5sZW5ndGg7XG4gIHJldHVybiBpID09PSBuID8gY29lZmZpY2llbnRcbiAgICAgIDogaSA+IG4gPyBjb2VmZmljaWVudCArIG5ldyBBcnJheShpIC0gbiArIDEpLmpvaW4oXCIwXCIpXG4gICAgICA6IGkgPiAwID8gY29lZmZpY2llbnQuc2xpY2UoMCwgaSkgKyBcIi5cIiArIGNvZWZmaWNpZW50LnNsaWNlKGkpXG4gICAgICA6IFwiMC5cIiArIG5ldyBBcnJheSgxIC0gaSkuam9pbihcIjBcIikgKyBmb3JtYXREZWNpbWFsKHgsIE1hdGgubWF4KDAsIHAgKyBpIC0gMSkpWzBdOyAvLyBsZXNzIHRoYW4gMXkhXG59O1xuXG52YXIgZm9ybWF0Um91bmRlZCA9IGZ1bmN0aW9uKHgsIHApIHtcbiAgdmFyIGQgPSBmb3JtYXREZWNpbWFsKHgsIHApO1xuICBpZiAoIWQpIHJldHVybiB4ICsgXCJcIjtcbiAgdmFyIGNvZWZmaWNpZW50ID0gZFswXSxcbiAgICAgIGV4cG9uZW50ID0gZFsxXTtcbiAgcmV0dXJuIGV4cG9uZW50IDwgMCA/IFwiMC5cIiArIG5ldyBBcnJheSgtZXhwb25lbnQpLmpvaW4oXCIwXCIpICsgY29lZmZpY2llbnRcbiAgICAgIDogY29lZmZpY2llbnQubGVuZ3RoID4gZXhwb25lbnQgKyAxID8gY29lZmZpY2llbnQuc2xpY2UoMCwgZXhwb25lbnQgKyAxKSArIFwiLlwiICsgY29lZmZpY2llbnQuc2xpY2UoZXhwb25lbnQgKyAxKVxuICAgICAgOiBjb2VmZmljaWVudCArIG5ldyBBcnJheShleHBvbmVudCAtIGNvZWZmaWNpZW50Lmxlbmd0aCArIDIpLmpvaW4oXCIwXCIpO1xufTtcblxudmFyIGZvcm1hdFR5cGVzID0ge1xuICBcIlwiOiBmb3JtYXREZWZhdWx0LFxuICBcIiVcIjogZnVuY3Rpb24oeCwgcCkgeyByZXR1cm4gKHggKiAxMDApLnRvRml4ZWQocCk7IH0sXG4gIFwiYlwiOiBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDIpOyB9LFxuICBcImNcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4geCArIFwiXCI7IH0sXG4gIFwiZFwiOiBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDEwKTsgfSxcbiAgXCJlXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuIHgudG9FeHBvbmVudGlhbChwKTsgfSxcbiAgXCJmXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuIHgudG9GaXhlZChwKTsgfSxcbiAgXCJnXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuIHgudG9QcmVjaXNpb24ocCk7IH0sXG4gIFwib1wiOiBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDgpOyB9LFxuICBcInBcIjogZnVuY3Rpb24oeCwgcCkgeyByZXR1cm4gZm9ybWF0Um91bmRlZCh4ICogMTAwLCBwKTsgfSxcbiAgXCJyXCI6IGZvcm1hdFJvdW5kZWQsXG4gIFwic1wiOiBmb3JtYXRQcmVmaXhBdXRvLFxuICBcIlhcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTsgfSxcbiAgXCJ4XCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgucm91bmQoeCkudG9TdHJpbmcoMTYpOyB9XG59O1xuXG4vLyBbW2ZpbGxdYWxpZ25dW3NpZ25dW3N5bWJvbF1bMF1bd2lkdGhdWyxdWy5wcmVjaXNpb25dW3R5cGVdXG52YXIgcmUgPSAvXig/OiguKT8oWzw+PV5dKSk/KFsrXFwtXFwoIF0pPyhbJCNdKT8oMCk/KFxcZCspPygsKT8oXFwuXFxkKyk/KFthLXolXSk/JC9pO1xuXG5mdW5jdGlvbiBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSB7XG4gIHJldHVybiBuZXcgRm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcik7XG59XG5cbmZvcm1hdFNwZWNpZmllci5wcm90b3R5cGUgPSBGb3JtYXRTcGVjaWZpZXIucHJvdG90eXBlOyAvLyBpbnN0YW5jZW9mXG5cbmZ1bmN0aW9uIEZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpIHtcbiAgaWYgKCEobWF0Y2ggPSByZS5leGVjKHNwZWNpZmllcikpKSB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIGZvcm1hdDogXCIgKyBzcGVjaWZpZXIpO1xuXG4gIHZhciBtYXRjaCxcbiAgICAgIGZpbGwgPSBtYXRjaFsxXSB8fCBcIiBcIixcbiAgICAgIGFsaWduID0gbWF0Y2hbMl0gfHwgXCI+XCIsXG4gICAgICBzaWduID0gbWF0Y2hbM10gfHwgXCItXCIsXG4gICAgICBzeW1ib2wgPSBtYXRjaFs0XSB8fCBcIlwiLFxuICAgICAgemVybyA9ICEhbWF0Y2hbNV0sXG4gICAgICB3aWR0aCA9IG1hdGNoWzZdICYmICttYXRjaFs2XSxcbiAgICAgIGNvbW1hID0gISFtYXRjaFs3XSxcbiAgICAgIHByZWNpc2lvbiA9IG1hdGNoWzhdICYmICttYXRjaFs4XS5zbGljZSgxKSxcbiAgICAgIHR5cGUgPSBtYXRjaFs5XSB8fCBcIlwiO1xuXG4gIC8vIFRoZSBcIm5cIiB0eXBlIGlzIGFuIGFsaWFzIGZvciBcIixnXCIuXG4gIGlmICh0eXBlID09PSBcIm5cIikgY29tbWEgPSB0cnVlLCB0eXBlID0gXCJnXCI7XG5cbiAgLy8gTWFwIGludmFsaWQgdHlwZXMgdG8gdGhlIGRlZmF1bHQgZm9ybWF0LlxuICBlbHNlIGlmICghZm9ybWF0VHlwZXNbdHlwZV0pIHR5cGUgPSBcIlwiO1xuXG4gIC8vIElmIHplcm8gZmlsbCBpcyBzcGVjaWZpZWQsIHBhZGRpbmcgZ29lcyBhZnRlciBzaWduIGFuZCBiZWZvcmUgZGlnaXRzLlxuICBpZiAoemVybyB8fCAoZmlsbCA9PT0gXCIwXCIgJiYgYWxpZ24gPT09IFwiPVwiKSkgemVybyA9IHRydWUsIGZpbGwgPSBcIjBcIiwgYWxpZ24gPSBcIj1cIjtcblxuICB0aGlzLmZpbGwgPSBmaWxsO1xuICB0aGlzLmFsaWduID0gYWxpZ247XG4gIHRoaXMuc2lnbiA9IHNpZ247XG4gIHRoaXMuc3ltYm9sID0gc3ltYm9sO1xuICB0aGlzLnplcm8gPSB6ZXJvO1xuICB0aGlzLndpZHRoID0gd2lkdGg7XG4gIHRoaXMuY29tbWEgPSBjb21tYTtcbiAgdGhpcy5wcmVjaXNpb24gPSBwcmVjaXNpb247XG4gIHRoaXMudHlwZSA9IHR5cGU7XG59XG5cbkZvcm1hdFNwZWNpZmllci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmlsbFxuICAgICAgKyB0aGlzLmFsaWduXG4gICAgICArIHRoaXMuc2lnblxuICAgICAgKyB0aGlzLnN5bWJvbFxuICAgICAgKyAodGhpcy56ZXJvID8gXCIwXCIgOiBcIlwiKVxuICAgICAgKyAodGhpcy53aWR0aCA9PSBudWxsID8gXCJcIiA6IE1hdGgubWF4KDEsIHRoaXMud2lkdGggfCAwKSlcbiAgICAgICsgKHRoaXMuY29tbWEgPyBcIixcIiA6IFwiXCIpXG4gICAgICArICh0aGlzLnByZWNpc2lvbiA9PSBudWxsID8gXCJcIiA6IFwiLlwiICsgTWF0aC5tYXgoMCwgdGhpcy5wcmVjaXNpb24gfCAwKSlcbiAgICAgICsgdGhpcy50eXBlO1xufTtcblxudmFyIGlkZW50aXR5ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4geDtcbn07XG5cbnZhciBwcmVmaXhlcyA9IFtcInlcIixcInpcIixcImFcIixcImZcIixcInBcIixcIm5cIixcIsK1XCIsXCJtXCIsXCJcIixcImtcIixcIk1cIixcIkdcIixcIlRcIixcIlBcIixcIkVcIixcIlpcIixcIllcIl07XG5cbnZhciBmb3JtYXRMb2NhbGUgPSBmdW5jdGlvbihsb2NhbGUpIHtcbiAgdmFyIGdyb3VwID0gbG9jYWxlLmdyb3VwaW5nICYmIGxvY2FsZS50aG91c2FuZHMgPyBmb3JtYXRHcm91cChsb2NhbGUuZ3JvdXBpbmcsIGxvY2FsZS50aG91c2FuZHMpIDogaWRlbnRpdHksXG4gICAgICBjdXJyZW5jeSA9IGxvY2FsZS5jdXJyZW5jeSxcbiAgICAgIGRlY2ltYWwgPSBsb2NhbGUuZGVjaW1hbCxcbiAgICAgIG51bWVyYWxzID0gbG9jYWxlLm51bWVyYWxzID8gZm9ybWF0TnVtZXJhbHMobG9jYWxlLm51bWVyYWxzKSA6IGlkZW50aXR5LFxuICAgICAgcGVyY2VudCA9IGxvY2FsZS5wZXJjZW50IHx8IFwiJVwiO1xuXG4gIGZ1bmN0aW9uIG5ld0Zvcm1hdChzcGVjaWZpZXIpIHtcbiAgICBzcGVjaWZpZXIgPSBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKTtcblxuICAgIHZhciBmaWxsID0gc3BlY2lmaWVyLmZpbGwsXG4gICAgICAgIGFsaWduID0gc3BlY2lmaWVyLmFsaWduLFxuICAgICAgICBzaWduID0gc3BlY2lmaWVyLnNpZ24sXG4gICAgICAgIHN5bWJvbCA9IHNwZWNpZmllci5zeW1ib2wsXG4gICAgICAgIHplcm8gPSBzcGVjaWZpZXIuemVybyxcbiAgICAgICAgd2lkdGggPSBzcGVjaWZpZXIud2lkdGgsXG4gICAgICAgIGNvbW1hID0gc3BlY2lmaWVyLmNvbW1hLFxuICAgICAgICBwcmVjaXNpb24gPSBzcGVjaWZpZXIucHJlY2lzaW9uLFxuICAgICAgICB0eXBlID0gc3BlY2lmaWVyLnR5cGU7XG5cbiAgICAvLyBDb21wdXRlIHRoZSBwcmVmaXggYW5kIHN1ZmZpeC5cbiAgICAvLyBGb3IgU0ktcHJlZml4LCB0aGUgc3VmZml4IGlzIGxhemlseSBjb21wdXRlZC5cbiAgICB2YXIgcHJlZml4ID0gc3ltYm9sID09PSBcIiRcIiA/IGN1cnJlbmN5WzBdIDogc3ltYm9sID09PSBcIiNcIiAmJiAvW2JveFhdLy50ZXN0KHR5cGUpID8gXCIwXCIgKyB0eXBlLnRvTG93ZXJDYXNlKCkgOiBcIlwiLFxuICAgICAgICBzdWZmaXggPSBzeW1ib2wgPT09IFwiJFwiID8gY3VycmVuY3lbMV0gOiAvWyVwXS8udGVzdCh0eXBlKSA/IHBlcmNlbnQgOiBcIlwiO1xuXG4gICAgLy8gV2hhdCBmb3JtYXQgZnVuY3Rpb24gc2hvdWxkIHdlIHVzZT9cbiAgICAvLyBJcyB0aGlzIGFuIGludGVnZXIgdHlwZT9cbiAgICAvLyBDYW4gdGhpcyB0eXBlIGdlbmVyYXRlIGV4cG9uZW50aWFsIG5vdGF0aW9uP1xuICAgIHZhciBmb3JtYXRUeXBlID0gZm9ybWF0VHlwZXNbdHlwZV0sXG4gICAgICAgIG1heWJlU3VmZml4ID0gIXR5cGUgfHwgL1tkZWZncHJzJV0vLnRlc3QodHlwZSk7XG5cbiAgICAvLyBTZXQgdGhlIGRlZmF1bHQgcHJlY2lzaW9uIGlmIG5vdCBzcGVjaWZpZWQsXG4gICAgLy8gb3IgY2xhbXAgdGhlIHNwZWNpZmllZCBwcmVjaXNpb24gdG8gdGhlIHN1cHBvcnRlZCByYW5nZS5cbiAgICAvLyBGb3Igc2lnbmlmaWNhbnQgcHJlY2lzaW9uLCBpdCBtdXN0IGJlIGluIFsxLCAyMV0uXG4gICAgLy8gRm9yIGZpeGVkIHByZWNpc2lvbiwgaXQgbXVzdCBiZSBpbiBbMCwgMjBdLlxuICAgIHByZWNpc2lvbiA9IHByZWNpc2lvbiA9PSBudWxsID8gKHR5cGUgPyA2IDogMTIpXG4gICAgICAgIDogL1tncHJzXS8udGVzdCh0eXBlKSA/IE1hdGgubWF4KDEsIE1hdGgubWluKDIxLCBwcmVjaXNpb24pKVxuICAgICAgICA6IE1hdGgubWF4KDAsIE1hdGgubWluKDIwLCBwcmVjaXNpb24pKTtcblxuICAgIGZ1bmN0aW9uIGZvcm1hdCh2YWx1ZSkge1xuICAgICAgdmFyIHZhbHVlUHJlZml4ID0gcHJlZml4LFxuICAgICAgICAgIHZhbHVlU3VmZml4ID0gc3VmZml4LFxuICAgICAgICAgIGksIG4sIGM7XG5cbiAgICAgIGlmICh0eXBlID09PSBcImNcIikge1xuICAgICAgICB2YWx1ZVN1ZmZpeCA9IGZvcm1hdFR5cGUodmFsdWUpICsgdmFsdWVTdWZmaXg7XG4gICAgICAgIHZhbHVlID0gXCJcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gK3ZhbHVlO1xuXG4gICAgICAgIC8vIFBlcmZvcm0gdGhlIGluaXRpYWwgZm9ybWF0dGluZy5cbiAgICAgICAgdmFyIHZhbHVlTmVnYXRpdmUgPSB2YWx1ZSA8IDA7XG4gICAgICAgIHZhbHVlID0gZm9ybWF0VHlwZShNYXRoLmFicyh2YWx1ZSksIHByZWNpc2lvbik7XG5cbiAgICAgICAgLy8gSWYgYSBuZWdhdGl2ZSB2YWx1ZSByb3VuZHMgdG8gemVybyBkdXJpbmcgZm9ybWF0dGluZywgdHJlYXQgYXMgcG9zaXRpdmUuXG4gICAgICAgIGlmICh2YWx1ZU5lZ2F0aXZlICYmICt2YWx1ZSA9PT0gMCkgdmFsdWVOZWdhdGl2ZSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIENvbXB1dGUgdGhlIHByZWZpeCBhbmQgc3VmZml4LlxuICAgICAgICB2YWx1ZVByZWZpeCA9ICh2YWx1ZU5lZ2F0aXZlID8gKHNpZ24gPT09IFwiKFwiID8gc2lnbiA6IFwiLVwiKSA6IHNpZ24gPT09IFwiLVwiIHx8IHNpZ24gPT09IFwiKFwiID8gXCJcIiA6IHNpZ24pICsgdmFsdWVQcmVmaXg7XG4gICAgICAgIHZhbHVlU3VmZml4ID0gdmFsdWVTdWZmaXggKyAodHlwZSA9PT0gXCJzXCIgPyBwcmVmaXhlc1s4ICsgcHJlZml4RXhwb25lbnQgLyAzXSA6IFwiXCIpICsgKHZhbHVlTmVnYXRpdmUgJiYgc2lnbiA9PT0gXCIoXCIgPyBcIilcIiA6IFwiXCIpO1xuXG4gICAgICAgIC8vIEJyZWFrIHRoZSBmb3JtYXR0ZWQgdmFsdWUgaW50byB0aGUgaW50ZWdlciDigJx2YWx1ZeKAnSBwYXJ0IHRoYXQgY2FuIGJlXG4gICAgICAgIC8vIGdyb3VwZWQsIGFuZCBmcmFjdGlvbmFsIG9yIGV4cG9uZW50aWFsIOKAnHN1ZmZpeOKAnSBwYXJ0IHRoYXQgaXMgbm90LlxuICAgICAgICBpZiAobWF5YmVTdWZmaXgpIHtcbiAgICAgICAgICBpID0gLTEsIG4gPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgICAgIGlmIChjID0gdmFsdWUuY2hhckNvZGVBdChpKSwgNDggPiBjIHx8IGMgPiA1Nykge1xuICAgICAgICAgICAgICB2YWx1ZVN1ZmZpeCA9IChjID09PSA0NiA/IGRlY2ltYWwgKyB2YWx1ZS5zbGljZShpICsgMSkgOiB2YWx1ZS5zbGljZShpKSkgKyB2YWx1ZVN1ZmZpeDtcbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zbGljZSgwLCBpKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBmaWxsIGNoYXJhY3RlciBpcyBub3QgXCIwXCIsIGdyb3VwaW5nIGlzIGFwcGxpZWQgYmVmb3JlIHBhZGRpbmcuXG4gICAgICBpZiAoY29tbWEgJiYgIXplcm8pIHZhbHVlID0gZ3JvdXAodmFsdWUsIEluZmluaXR5KTtcblxuICAgICAgLy8gQ29tcHV0ZSB0aGUgcGFkZGluZy5cbiAgICAgIHZhciBsZW5ndGggPSB2YWx1ZVByZWZpeC5sZW5ndGggKyB2YWx1ZS5sZW5ndGggKyB2YWx1ZVN1ZmZpeC5sZW5ndGgsXG4gICAgICAgICAgcGFkZGluZyA9IGxlbmd0aCA8IHdpZHRoID8gbmV3IEFycmF5KHdpZHRoIC0gbGVuZ3RoICsgMSkuam9pbihmaWxsKSA6IFwiXCI7XG5cbiAgICAgIC8vIElmIHRoZSBmaWxsIGNoYXJhY3RlciBpcyBcIjBcIiwgZ3JvdXBpbmcgaXMgYXBwbGllZCBhZnRlciBwYWRkaW5nLlxuICAgICAgaWYgKGNvbW1hICYmIHplcm8pIHZhbHVlID0gZ3JvdXAocGFkZGluZyArIHZhbHVlLCBwYWRkaW5nLmxlbmd0aCA/IHdpZHRoIC0gdmFsdWVTdWZmaXgubGVuZ3RoIDogSW5maW5pdHkpLCBwYWRkaW5nID0gXCJcIjtcblxuICAgICAgLy8gUmVjb25zdHJ1Y3QgdGhlIGZpbmFsIG91dHB1dCBiYXNlZCBvbiB0aGUgZGVzaXJlZCBhbGlnbm1lbnQuXG4gICAgICBzd2l0Y2ggKGFsaWduKSB7XG4gICAgICAgIGNhc2UgXCI8XCI6IHZhbHVlID0gdmFsdWVQcmVmaXggKyB2YWx1ZSArIHZhbHVlU3VmZml4ICsgcGFkZGluZzsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCI9XCI6IHZhbHVlID0gdmFsdWVQcmVmaXggKyBwYWRkaW5nICsgdmFsdWUgKyB2YWx1ZVN1ZmZpeDsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJeXCI6IHZhbHVlID0gcGFkZGluZy5zbGljZSgwLCBsZW5ndGggPSBwYWRkaW5nLmxlbmd0aCA+PiAxKSArIHZhbHVlUHJlZml4ICsgdmFsdWUgKyB2YWx1ZVN1ZmZpeCArIHBhZGRpbmcuc2xpY2UobGVuZ3RoKTsgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6IHZhbHVlID0gcGFkZGluZyArIHZhbHVlUHJlZml4ICsgdmFsdWUgKyB2YWx1ZVN1ZmZpeDsgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudW1lcmFscyh2YWx1ZSk7XG4gICAgfVxuXG4gICAgZm9ybWF0LnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gc3BlY2lmaWVyICsgXCJcIjtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZvcm1hdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFByZWZpeChzcGVjaWZpZXIsIHZhbHVlKSB7XG4gICAgdmFyIGYgPSBuZXdGb3JtYXQoKHNwZWNpZmllciA9IGZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpLCBzcGVjaWZpZXIudHlwZSA9IFwiZlwiLCBzcGVjaWZpZXIpKSxcbiAgICAgICAgZSA9IE1hdGgubWF4KC04LCBNYXRoLm1pbig4LCBNYXRoLmZsb29yKGV4cG9uZW50KHZhbHVlKSAvIDMpKSkgKiAzLFxuICAgICAgICBrID0gTWF0aC5wb3coMTAsIC1lKSxcbiAgICAgICAgcHJlZml4ID0gcHJlZml4ZXNbOCArIGUgLyAzXTtcbiAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiBmKGsgKiB2YWx1ZSkgKyBwcmVmaXg7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZm9ybWF0OiBuZXdGb3JtYXQsXG4gICAgZm9ybWF0UHJlZml4OiBmb3JtYXRQcmVmaXhcbiAgfTtcbn07XG5cbnZhciBsb2NhbGU7XG5cblxuXG5kZWZhdWx0TG9jYWxlKHtcbiAgZGVjaW1hbDogXCIuXCIsXG4gIHRob3VzYW5kczogXCIsXCIsXG4gIGdyb3VwaW5nOiBbM10sXG4gIGN1cnJlbmN5OiBbXCIkXCIsIFwiXCJdXG59KTtcblxuZnVuY3Rpb24gZGVmYXVsdExvY2FsZShkZWZpbml0aW9uKSB7XG4gIGxvY2FsZSA9IGZvcm1hdExvY2FsZShkZWZpbml0aW9uKTtcbiAgZXhwb3J0cy5mb3JtYXQgPSBsb2NhbGUuZm9ybWF0O1xuICBleHBvcnRzLmZvcm1hdFByZWZpeCA9IGxvY2FsZS5mb3JtYXRQcmVmaXg7XG4gIHJldHVybiBsb2NhbGU7XG59XG5cbnZhciBwcmVjaXNpb25GaXhlZCA9IGZ1bmN0aW9uKHN0ZXApIHtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIC1leHBvbmVudChNYXRoLmFicyhzdGVwKSkpO1xufTtcblxudmFyIHByZWNpc2lvblByZWZpeCA9IGZ1bmN0aW9uKHN0ZXAsIHZhbHVlKSB7XG4gIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1heCgtOCwgTWF0aC5taW4oOCwgTWF0aC5mbG9vcihleHBvbmVudCh2YWx1ZSkgLyAzKSkpICogMyAtIGV4cG9uZW50KE1hdGguYWJzKHN0ZXApKSk7XG59O1xuXG52YXIgcHJlY2lzaW9uUm91bmQgPSBmdW5jdGlvbihzdGVwLCBtYXgpIHtcbiAgc3RlcCA9IE1hdGguYWJzKHN0ZXApLCBtYXggPSBNYXRoLmFicyhtYXgpIC0gc3RlcDtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIGV4cG9uZW50KG1heCkgLSBleHBvbmVudChzdGVwKSkgKyAxO1xufTtcblxuZXhwb3J0cy5mb3JtYXREZWZhdWx0TG9jYWxlID0gZGVmYXVsdExvY2FsZTtcbmV4cG9ydHMuZm9ybWF0TG9jYWxlID0gZm9ybWF0TG9jYWxlO1xuZXhwb3J0cy5mb3JtYXRTcGVjaWZpZXIgPSBmb3JtYXRTcGVjaWZpZXI7XG5leHBvcnRzLnByZWNpc2lvbkZpeGVkID0gcHJlY2lzaW9uRml4ZWQ7XG5leHBvcnRzLnByZWNpc2lvblByZWZpeCA9IHByZWNpc2lvblByZWZpeDtcbmV4cG9ydHMucHJlY2lzaW9uUm91bmQgPSBwcmVjaXNpb25Sb3VuZDtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbiIsIi8vIGh0dHBzOi8vZDNqcy5vcmcvZDMtaW50ZXJwb2xhdGUvIFZlcnNpb24gMS4xLjQuIENvcHlyaWdodCAyMDE3IE1pa2UgQm9zdG9jay5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cywgcmVxdWlyZSgnZDMtY29sb3InKSkgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJywgJ2QzLWNvbG9yJ10sIGZhY3RvcnkpIDpcblx0KGZhY3RvcnkoKGdsb2JhbC5kMyA9IGdsb2JhbC5kMyB8fCB7fSksZ2xvYmFsLmQzKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cyxkM0NvbG9yKSB7ICd1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gYmFzaXModDEsIHYwLCB2MSwgdjIsIHYzKSB7XG4gIHZhciB0MiA9IHQxICogdDEsIHQzID0gdDIgKiB0MTtcbiAgcmV0dXJuICgoMSAtIDMgKiB0MSArIDMgKiB0MiAtIHQzKSAqIHYwXG4gICAgICArICg0IC0gNiAqIHQyICsgMyAqIHQzKSAqIHYxXG4gICAgICArICgxICsgMyAqIHQxICsgMyAqIHQyIC0gMyAqIHQzKSAqIHYyXG4gICAgICArIHQzICogdjMpIC8gNjtcbn1cblxudmFyIGJhc2lzJDEgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoIC0gMTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgaSA9IHQgPD0gMCA/ICh0ID0gMCkgOiB0ID49IDEgPyAodCA9IDEsIG4gLSAxKSA6IE1hdGguZmxvb3IodCAqIG4pLFxuICAgICAgICB2MSA9IHZhbHVlc1tpXSxcbiAgICAgICAgdjIgPSB2YWx1ZXNbaSArIDFdLFxuICAgICAgICB2MCA9IGkgPiAwID8gdmFsdWVzW2kgLSAxXSA6IDIgKiB2MSAtIHYyLFxuICAgICAgICB2MyA9IGkgPCBuIC0gMSA/IHZhbHVlc1tpICsgMl0gOiAyICogdjIgLSB2MTtcbiAgICByZXR1cm4gYmFzaXMoKHQgLSBpIC8gbikgKiBuLCB2MCwgdjEsIHYyLCB2Myk7XG4gIH07XG59O1xuXG52YXIgYmFzaXNDbG9zZWQgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoO1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHZhciBpID0gTWF0aC5mbG9vcigoKHQgJT0gMSkgPCAwID8gKyt0IDogdCkgKiBuKSxcbiAgICAgICAgdjAgPSB2YWx1ZXNbKGkgKyBuIC0gMSkgJSBuXSxcbiAgICAgICAgdjEgPSB2YWx1ZXNbaSAlIG5dLFxuICAgICAgICB2MiA9IHZhbHVlc1soaSArIDEpICUgbl0sXG4gICAgICAgIHYzID0gdmFsdWVzWyhpICsgMikgJSBuXTtcbiAgICByZXR1cm4gYmFzaXMoKHQgLSBpIC8gbikgKiBuLCB2MCwgdjEsIHYyLCB2Myk7XG4gIH07XG59O1xuXG52YXIgY29uc3RhbnQgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn07XG5cbmZ1bmN0aW9uIGxpbmVhcihhLCBkKSB7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGEgKyB0ICogZDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZXhwb25lbnRpYWwoYSwgYiwgeSkge1xuICByZXR1cm4gYSA9IE1hdGgucG93KGEsIHkpLCBiID0gTWF0aC5wb3coYiwgeSkgLSBhLCB5ID0gMSAvIHksIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gTWF0aC5wb3coYSArIHQgKiBiLCB5KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gaHVlKGEsIGIpIHtcbiAgdmFyIGQgPSBiIC0gYTtcbiAgcmV0dXJuIGQgPyBsaW5lYXIoYSwgZCA+IDE4MCB8fCBkIDwgLTE4MCA/IGQgLSAzNjAgKiBNYXRoLnJvdW5kKGQgLyAzNjApIDogZCkgOiBjb25zdGFudChpc05hTihhKSA/IGIgOiBhKTtcbn1cblxuZnVuY3Rpb24gZ2FtbWEoeSkge1xuICByZXR1cm4gKHkgPSAreSkgPT09IDEgPyBub2dhbW1hIDogZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBiIC0gYSA/IGV4cG9uZW50aWFsKGEsIGIsIHkpIDogY29uc3RhbnQoaXNOYU4oYSkgPyBiIDogYSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vZ2FtbWEoYSwgYikge1xuICB2YXIgZCA9IGIgLSBhO1xuICByZXR1cm4gZCA/IGxpbmVhcihhLCBkKSA6IGNvbnN0YW50KGlzTmFOKGEpID8gYiA6IGEpO1xufVxuXG52YXIgcmdiJDEgPSAoKGZ1bmN0aW9uIHJnYkdhbW1hKHkpIHtcbiAgdmFyIGNvbG9yJCQxID0gZ2FtbWEoeSk7XG5cbiAgZnVuY3Rpb24gcmdiJCQxKHN0YXJ0LCBlbmQpIHtcbiAgICB2YXIgciA9IGNvbG9yJCQxKChzdGFydCA9IGQzQ29sb3IucmdiKHN0YXJ0KSkuciwgKGVuZCA9IGQzQ29sb3IucmdiKGVuZCkpLnIpLFxuICAgICAgICBnID0gY29sb3IkJDEoc3RhcnQuZywgZW5kLmcpLFxuICAgICAgICBiID0gY29sb3IkJDEoc3RhcnQuYiwgZW5kLmIpLFxuICAgICAgICBvcGFjaXR5ID0gbm9nYW1tYShzdGFydC5vcGFjaXR5LCBlbmQub3BhY2l0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHN0YXJ0LnIgPSByKHQpO1xuICAgICAgc3RhcnQuZyA9IGcodCk7XG4gICAgICBzdGFydC5iID0gYih0KTtcbiAgICAgIHN0YXJ0Lm9wYWNpdHkgPSBvcGFjaXR5KHQpO1xuICAgICAgcmV0dXJuIHN0YXJ0ICsgXCJcIjtcbiAgICB9O1xuICB9XG5cbiAgcmdiJCQxLmdhbW1hID0gcmdiR2FtbWE7XG5cbiAgcmV0dXJuIHJnYiQkMTtcbn0pKSgxKTtcblxuZnVuY3Rpb24gcmdiU3BsaW5lKHNwbGluZSkge1xuICByZXR1cm4gZnVuY3Rpb24oY29sb3JzKSB7XG4gICAgdmFyIG4gPSBjb2xvcnMubGVuZ3RoLFxuICAgICAgICByID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBnID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBiID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBpLCBjb2xvciQkMTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBjb2xvciQkMSA9IGQzQ29sb3IucmdiKGNvbG9yc1tpXSk7XG4gICAgICByW2ldID0gY29sb3IkJDEuciB8fCAwO1xuICAgICAgZ1tpXSA9IGNvbG9yJCQxLmcgfHwgMDtcbiAgICAgIGJbaV0gPSBjb2xvciQkMS5iIHx8IDA7XG4gICAgfVxuICAgIHIgPSBzcGxpbmUocik7XG4gICAgZyA9IHNwbGluZShnKTtcbiAgICBiID0gc3BsaW5lKGIpO1xuICAgIGNvbG9yJCQxLm9wYWNpdHkgPSAxO1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICBjb2xvciQkMS5yID0gcih0KTtcbiAgICAgIGNvbG9yJCQxLmcgPSBnKHQpO1xuICAgICAgY29sb3IkJDEuYiA9IGIodCk7XG4gICAgICByZXR1cm4gY29sb3IkJDEgKyBcIlwiO1xuICAgIH07XG4gIH07XG59XG5cbnZhciByZ2JCYXNpcyA9IHJnYlNwbGluZShiYXNpcyQxKTtcbnZhciByZ2JCYXNpc0Nsb3NlZCA9IHJnYlNwbGluZShiYXNpc0Nsb3NlZCk7XG5cbnZhciBhcnJheSA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIG5iID0gYiA/IGIubGVuZ3RoIDogMCxcbiAgICAgIG5hID0gYSA/IE1hdGgubWluKG5iLCBhLmxlbmd0aCkgOiAwLFxuICAgICAgeCA9IG5ldyBBcnJheShuYiksXG4gICAgICBjID0gbmV3IEFycmF5KG5iKSxcbiAgICAgIGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IG5hOyArK2kpIHhbaV0gPSB2YWx1ZShhW2ldLCBiW2ldKTtcbiAgZm9yICg7IGkgPCBuYjsgKytpKSBjW2ldID0gYltpXTtcblxuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBuYTsgKytpKSBjW2ldID0geFtpXSh0KTtcbiAgICByZXR1cm4gYztcbiAgfTtcbn07XG5cbnZhciBkYXRlID0gZnVuY3Rpb24oYSwgYikge1xuICB2YXIgZCA9IG5ldyBEYXRlO1xuICByZXR1cm4gYSA9ICthLCBiIC09IGEsIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gZC5zZXRUaW1lKGEgKyBiICogdCksIGQ7XG4gIH07XG59O1xuXG52YXIgbnVtYmVyID0gZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gYSA9ICthLCBiIC09IGEsIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gYSArIGIgKiB0O1xuICB9O1xufTtcblxudmFyIG9iamVjdCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGkgPSB7fSxcbiAgICAgIGMgPSB7fSxcbiAgICAgIGs7XG5cbiAgaWYgKGEgPT09IG51bGwgfHwgdHlwZW9mIGEgIT09IFwib2JqZWN0XCIpIGEgPSB7fTtcbiAgaWYgKGIgPT09IG51bGwgfHwgdHlwZW9mIGIgIT09IFwib2JqZWN0XCIpIGIgPSB7fTtcblxuICBmb3IgKGsgaW4gYikge1xuICAgIGlmIChrIGluIGEpIHtcbiAgICAgIGlba10gPSB2YWx1ZShhW2tdLCBiW2tdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY1trXSA9IGJba107XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICBmb3IgKGsgaW4gaSkgY1trXSA9IGlba10odCk7XG4gICAgcmV0dXJuIGM7XG4gIH07XG59O1xuXG52YXIgcmVBID0gL1stK10/KD86XFxkK1xcLj9cXGQqfFxcLj9cXGQrKSg/OltlRV1bLStdP1xcZCspPy9nO1xudmFyIHJlQiA9IG5ldyBSZWdFeHAocmVBLnNvdXJjZSwgXCJnXCIpO1xuXG5mdW5jdGlvbiB6ZXJvKGIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBiO1xuICB9O1xufVxuXG5mdW5jdGlvbiBvbmUoYikge1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBiKHQpICsgXCJcIjtcbiAgfTtcbn1cblxudmFyIHN0cmluZyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGJpID0gcmVBLmxhc3RJbmRleCA9IHJlQi5sYXN0SW5kZXggPSAwLCAvLyBzY2FuIGluZGV4IGZvciBuZXh0IG51bWJlciBpbiBiXG4gICAgICBhbSwgLy8gY3VycmVudCBtYXRjaCBpbiBhXG4gICAgICBibSwgLy8gY3VycmVudCBtYXRjaCBpbiBiXG4gICAgICBicywgLy8gc3RyaW5nIHByZWNlZGluZyBjdXJyZW50IG51bWJlciBpbiBiLCBpZiBhbnlcbiAgICAgIGkgPSAtMSwgLy8gaW5kZXggaW4gc1xuICAgICAgcyA9IFtdLCAvLyBzdHJpbmcgY29uc3RhbnRzIGFuZCBwbGFjZWhvbGRlcnNcbiAgICAgIHEgPSBbXTsgLy8gbnVtYmVyIGludGVycG9sYXRvcnNcblxuICAvLyBDb2VyY2UgaW5wdXRzIHRvIHN0cmluZ3MuXG4gIGEgPSBhICsgXCJcIiwgYiA9IGIgKyBcIlwiO1xuXG4gIC8vIEludGVycG9sYXRlIHBhaXJzIG9mIG51bWJlcnMgaW4gYSAmIGIuXG4gIHdoaWxlICgoYW0gPSByZUEuZXhlYyhhKSlcbiAgICAgICYmIChibSA9IHJlQi5leGVjKGIpKSkge1xuICAgIGlmICgoYnMgPSBibS5pbmRleCkgPiBiaSkgeyAvLyBhIHN0cmluZyBwcmVjZWRlcyB0aGUgbmV4dCBudW1iZXIgaW4gYlxuICAgICAgYnMgPSBiLnNsaWNlKGJpLCBicyk7XG4gICAgICBpZiAoc1tpXSkgc1tpXSArPSBiczsgLy8gY29hbGVzY2Ugd2l0aCBwcmV2aW91cyBzdHJpbmdcbiAgICAgIGVsc2Ugc1srK2ldID0gYnM7XG4gICAgfVxuICAgIGlmICgoYW0gPSBhbVswXSkgPT09IChibSA9IGJtWzBdKSkgeyAvLyBudW1iZXJzIGluIGEgJiBiIG1hdGNoXG4gICAgICBpZiAoc1tpXSkgc1tpXSArPSBibTsgLy8gY29hbGVzY2Ugd2l0aCBwcmV2aW91cyBzdHJpbmdcbiAgICAgIGVsc2Ugc1srK2ldID0gYm07XG4gICAgfSBlbHNlIHsgLy8gaW50ZXJwb2xhdGUgbm9uLW1hdGNoaW5nIG51bWJlcnNcbiAgICAgIHNbKytpXSA9IG51bGw7XG4gICAgICBxLnB1c2goe2k6IGksIHg6IG51bWJlcihhbSwgYm0pfSk7XG4gICAgfVxuICAgIGJpID0gcmVCLmxhc3RJbmRleDtcbiAgfVxuXG4gIC8vIEFkZCByZW1haW5zIG9mIGIuXG4gIGlmIChiaSA8IGIubGVuZ3RoKSB7XG4gICAgYnMgPSBiLnNsaWNlKGJpKTtcbiAgICBpZiAoc1tpXSkgc1tpXSArPSBiczsgLy8gY29hbGVzY2Ugd2l0aCBwcmV2aW91cyBzdHJpbmdcbiAgICBlbHNlIHNbKytpXSA9IGJzO1xuICB9XG5cbiAgLy8gU3BlY2lhbCBvcHRpbWl6YXRpb24gZm9yIG9ubHkgYSBzaW5nbGUgbWF0Y2guXG4gIC8vIE90aGVyd2lzZSwgaW50ZXJwb2xhdGUgZWFjaCBvZiB0aGUgbnVtYmVycyBhbmQgcmVqb2luIHRoZSBzdHJpbmcuXG4gIHJldHVybiBzLmxlbmd0aCA8IDIgPyAocVswXVxuICAgICAgPyBvbmUocVswXS54KVxuICAgICAgOiB6ZXJvKGIpKVxuICAgICAgOiAoYiA9IHEubGVuZ3RoLCBmdW5jdGlvbih0KSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG87IGkgPCBiOyArK2kpIHNbKG8gPSBxW2ldKS5pXSA9IG8ueCh0KTtcbiAgICAgICAgICByZXR1cm4gcy5qb2luKFwiXCIpO1xuICAgICAgICB9KTtcbn07XG5cbnZhciB2YWx1ZSA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIHQgPSB0eXBlb2YgYiwgYztcbiAgcmV0dXJuIGIgPT0gbnVsbCB8fCB0ID09PSBcImJvb2xlYW5cIiA/IGNvbnN0YW50KGIpXG4gICAgICA6ICh0ID09PSBcIm51bWJlclwiID8gbnVtYmVyXG4gICAgICA6IHQgPT09IFwic3RyaW5nXCIgPyAoKGMgPSBkM0NvbG9yLmNvbG9yKGIpKSA/IChiID0gYywgcmdiJDEpIDogc3RyaW5nKVxuICAgICAgOiBiIGluc3RhbmNlb2YgZDNDb2xvci5jb2xvciA/IHJnYiQxXG4gICAgICA6IGIgaW5zdGFuY2VvZiBEYXRlID8gZGF0ZVxuICAgICAgOiBBcnJheS5pc0FycmF5KGIpID8gYXJyYXlcbiAgICAgIDogaXNOYU4oYikgPyBvYmplY3RcbiAgICAgIDogbnVtYmVyKShhLCBiKTtcbn07XG5cbnZhciByb3VuZCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPSArYSwgYiAtPSBhLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoYSArIGIgKiB0KTtcbiAgfTtcbn07XG5cbnZhciBkZWdyZWVzID0gMTgwIC8gTWF0aC5QSTtcblxudmFyIGlkZW50aXR5ID0ge1xuICB0cmFuc2xhdGVYOiAwLFxuICB0cmFuc2xhdGVZOiAwLFxuICByb3RhdGU6IDAsXG4gIHNrZXdYOiAwLFxuICBzY2FsZVg6IDEsXG4gIHNjYWxlWTogMVxufTtcblxudmFyIGRlY29tcG9zZSA9IGZ1bmN0aW9uKGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgdmFyIHNjYWxlWCwgc2NhbGVZLCBza2V3WDtcbiAgaWYgKHNjYWxlWCA9IE1hdGguc3FydChhICogYSArIGIgKiBiKSkgYSAvPSBzY2FsZVgsIGIgLz0gc2NhbGVYO1xuICBpZiAoc2tld1ggPSBhICogYyArIGIgKiBkKSBjIC09IGEgKiBza2V3WCwgZCAtPSBiICogc2tld1g7XG4gIGlmIChzY2FsZVkgPSBNYXRoLnNxcnQoYyAqIGMgKyBkICogZCkpIGMgLz0gc2NhbGVZLCBkIC89IHNjYWxlWSwgc2tld1ggLz0gc2NhbGVZO1xuICBpZiAoYSAqIGQgPCBiICogYykgYSA9IC1hLCBiID0gLWIsIHNrZXdYID0gLXNrZXdYLCBzY2FsZVggPSAtc2NhbGVYO1xuICByZXR1cm4ge1xuICAgIHRyYW5zbGF0ZVg6IGUsXG4gICAgdHJhbnNsYXRlWTogZixcbiAgICByb3RhdGU6IE1hdGguYXRhbjIoYiwgYSkgKiBkZWdyZWVzLFxuICAgIHNrZXdYOiBNYXRoLmF0YW4oc2tld1gpICogZGVncmVlcyxcbiAgICBzY2FsZVg6IHNjYWxlWCxcbiAgICBzY2FsZVk6IHNjYWxlWVxuICB9O1xufTtcblxudmFyIGNzc05vZGU7XG52YXIgY3NzUm9vdDtcbnZhciBjc3NWaWV3O1xudmFyIHN2Z05vZGU7XG5cbmZ1bmN0aW9uIHBhcnNlQ3NzKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gXCJub25lXCIpIHJldHVybiBpZGVudGl0eTtcbiAgaWYgKCFjc3NOb2RlKSBjc3NOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKSwgY3NzUm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgY3NzVmlldyA9IGRvY3VtZW50LmRlZmF1bHRWaWV3O1xuICBjc3NOb2RlLnN0eWxlLnRyYW5zZm9ybSA9IHZhbHVlO1xuICB2YWx1ZSA9IGNzc1ZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShjc3NSb290LmFwcGVuZENoaWxkKGNzc05vZGUpLCBudWxsKS5nZXRQcm9wZXJ0eVZhbHVlKFwidHJhbnNmb3JtXCIpO1xuICBjc3NSb290LnJlbW92ZUNoaWxkKGNzc05vZGUpO1xuICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDcsIC0xKS5zcGxpdChcIixcIik7XG4gIHJldHVybiBkZWNvbXBvc2UoK3ZhbHVlWzBdLCArdmFsdWVbMV0sICt2YWx1ZVsyXSwgK3ZhbHVlWzNdLCArdmFsdWVbNF0sICt2YWx1ZVs1XSk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlU3ZnKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gaWRlbnRpdHk7XG4gIGlmICghc3ZnTm9kZSkgc3ZnTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIFwiZ1wiKTtcbiAgc3ZnTm9kZS5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgdmFsdWUpO1xuICBpZiAoISh2YWx1ZSA9IHN2Z05vZGUudHJhbnNmb3JtLmJhc2VWYWwuY29uc29saWRhdGUoKSkpIHJldHVybiBpZGVudGl0eTtcbiAgdmFsdWUgPSB2YWx1ZS5tYXRyaXg7XG4gIHJldHVybiBkZWNvbXBvc2UodmFsdWUuYSwgdmFsdWUuYiwgdmFsdWUuYywgdmFsdWUuZCwgdmFsdWUuZSwgdmFsdWUuZik7XG59XG5cbmZ1bmN0aW9uIGludGVycG9sYXRlVHJhbnNmb3JtKHBhcnNlLCBweENvbW1hLCBweFBhcmVuLCBkZWdQYXJlbikge1xuXG4gIGZ1bmN0aW9uIHBvcChzKSB7XG4gICAgcmV0dXJuIHMubGVuZ3RoID8gcy5wb3AoKSArIFwiIFwiIDogXCJcIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zbGF0ZSh4YSwgeWEsIHhiLCB5YiwgcywgcSkge1xuICAgIGlmICh4YSAhPT0geGIgfHwgeWEgIT09IHliKSB7XG4gICAgICB2YXIgaSA9IHMucHVzaChcInRyYW5zbGF0ZShcIiwgbnVsbCwgcHhDb21tYSwgbnVsbCwgcHhQYXJlbik7XG4gICAgICBxLnB1c2goe2k6IGkgLSA0LCB4OiBudW1iZXIoeGEsIHhiKX0sIHtpOiBpIC0gMiwgeDogbnVtYmVyKHlhLCB5Yil9KTtcbiAgICB9IGVsc2UgaWYgKHhiIHx8IHliKSB7XG4gICAgICBzLnB1c2goXCJ0cmFuc2xhdGUoXCIgKyB4YiArIHB4Q29tbWEgKyB5YiArIHB4UGFyZW4pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJvdGF0ZShhLCBiLCBzLCBxKSB7XG4gICAgaWYgKGEgIT09IGIpIHtcbiAgICAgIGlmIChhIC0gYiA+IDE4MCkgYiArPSAzNjA7IGVsc2UgaWYgKGIgLSBhID4gMTgwKSBhICs9IDM2MDsgLy8gc2hvcnRlc3QgcGF0aFxuICAgICAgcS5wdXNoKHtpOiBzLnB1c2gocG9wKHMpICsgXCJyb3RhdGUoXCIsIG51bGwsIGRlZ1BhcmVuKSAtIDIsIHg6IG51bWJlcihhLCBiKX0pO1xuICAgIH0gZWxzZSBpZiAoYikge1xuICAgICAgcy5wdXNoKHBvcChzKSArIFwicm90YXRlKFwiICsgYiArIGRlZ1BhcmVuKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBza2V3WChhLCBiLCBzLCBxKSB7XG4gICAgaWYgKGEgIT09IGIpIHtcbiAgICAgIHEucHVzaCh7aTogcy5wdXNoKHBvcChzKSArIFwic2tld1goXCIsIG51bGwsIGRlZ1BhcmVuKSAtIDIsIHg6IG51bWJlcihhLCBiKX0pO1xuICAgIH0gZWxzZSBpZiAoYikge1xuICAgICAgcy5wdXNoKHBvcChzKSArIFwic2tld1goXCIgKyBiICsgZGVnUGFyZW4pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNjYWxlKHhhLCB5YSwgeGIsIHliLCBzLCBxKSB7XG4gICAgaWYgKHhhICE9PSB4YiB8fCB5YSAhPT0geWIpIHtcbiAgICAgIHZhciBpID0gcy5wdXNoKHBvcChzKSArIFwic2NhbGUoXCIsIG51bGwsIFwiLFwiLCBudWxsLCBcIilcIik7XG4gICAgICBxLnB1c2goe2k6IGkgLSA0LCB4OiBudW1iZXIoeGEsIHhiKX0sIHtpOiBpIC0gMiwgeDogbnVtYmVyKHlhLCB5Yil9KTtcbiAgICB9IGVsc2UgaWYgKHhiICE9PSAxIHx8IHliICE9PSAxKSB7XG4gICAgICBzLnB1c2gocG9wKHMpICsgXCJzY2FsZShcIiArIHhiICsgXCIsXCIgKyB5YiArIFwiKVwiKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgIHZhciBzID0gW10sIC8vIHN0cmluZyBjb25zdGFudHMgYW5kIHBsYWNlaG9sZGVyc1xuICAgICAgICBxID0gW107IC8vIG51bWJlciBpbnRlcnBvbGF0b3JzXG4gICAgYSA9IHBhcnNlKGEpLCBiID0gcGFyc2UoYik7XG4gICAgdHJhbnNsYXRlKGEudHJhbnNsYXRlWCwgYS50cmFuc2xhdGVZLCBiLnRyYW5zbGF0ZVgsIGIudHJhbnNsYXRlWSwgcywgcSk7XG4gICAgcm90YXRlKGEucm90YXRlLCBiLnJvdGF0ZSwgcywgcSk7XG4gICAgc2tld1goYS5za2V3WCwgYi5za2V3WCwgcywgcSk7XG4gICAgc2NhbGUoYS5zY2FsZVgsIGEuc2NhbGVZLCBiLnNjYWxlWCwgYi5zY2FsZVksIHMsIHEpO1xuICAgIGEgPSBiID0gbnVsbDsgLy8gZ2NcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgdmFyIGkgPSAtMSwgbiA9IHEubGVuZ3RoLCBvO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIHNbKG8gPSBxW2ldKS5pXSA9IG8ueCh0KTtcbiAgICAgIHJldHVybiBzLmpvaW4oXCJcIik7XG4gICAgfTtcbiAgfTtcbn1cblxudmFyIGludGVycG9sYXRlVHJhbnNmb3JtQ3NzID0gaW50ZXJwb2xhdGVUcmFuc2Zvcm0ocGFyc2VDc3MsIFwicHgsIFwiLCBcInB4KVwiLCBcImRlZylcIik7XG52YXIgaW50ZXJwb2xhdGVUcmFuc2Zvcm1TdmcgPSBpbnRlcnBvbGF0ZVRyYW5zZm9ybShwYXJzZVN2ZywgXCIsIFwiLCBcIilcIiwgXCIpXCIpO1xuXG52YXIgcmhvID0gTWF0aC5TUVJUMjtcbnZhciByaG8yID0gMjtcbnZhciByaG80ID0gNDtcbnZhciBlcHNpbG9uMiA9IDFlLTEyO1xuXG5mdW5jdGlvbiBjb3NoKHgpIHtcbiAgcmV0dXJuICgoeCA9IE1hdGguZXhwKHgpKSArIDEgLyB4KSAvIDI7XG59XG5cbmZ1bmN0aW9uIHNpbmgoeCkge1xuICByZXR1cm4gKCh4ID0gTWF0aC5leHAoeCkpIC0gMSAvIHgpIC8gMjtcbn1cblxuZnVuY3Rpb24gdGFuaCh4KSB7XG4gIHJldHVybiAoKHggPSBNYXRoLmV4cCgyICogeCkpIC0gMSkgLyAoeCArIDEpO1xufVxuXG4vLyBwMCA9IFt1eDAsIHV5MCwgdzBdXG4vLyBwMSA9IFt1eDEsIHV5MSwgdzFdXG52YXIgem9vbSA9IGZ1bmN0aW9uKHAwLCBwMSkge1xuICB2YXIgdXgwID0gcDBbMF0sIHV5MCA9IHAwWzFdLCB3MCA9IHAwWzJdLFxuICAgICAgdXgxID0gcDFbMF0sIHV5MSA9IHAxWzFdLCB3MSA9IHAxWzJdLFxuICAgICAgZHggPSB1eDEgLSB1eDAsXG4gICAgICBkeSA9IHV5MSAtIHV5MCxcbiAgICAgIGQyID0gZHggKiBkeCArIGR5ICogZHksXG4gICAgICBpLFxuICAgICAgUztcblxuICAvLyBTcGVjaWFsIGNhc2UgZm9yIHUwIOKJhSB1MS5cbiAgaWYgKGQyIDwgZXBzaWxvbjIpIHtcbiAgICBTID0gTWF0aC5sb2codzEgLyB3MCkgLyByaG87XG4gICAgaSA9IGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIHV4MCArIHQgKiBkeCxcbiAgICAgICAgdXkwICsgdCAqIGR5LFxuICAgICAgICB3MCAqIE1hdGguZXhwKHJobyAqIHQgKiBTKVxuICAgICAgXTtcbiAgICB9O1xuICB9XG5cbiAgLy8gR2VuZXJhbCBjYXNlLlxuICBlbHNlIHtcbiAgICB2YXIgZDEgPSBNYXRoLnNxcnQoZDIpLFxuICAgICAgICBiMCA9ICh3MSAqIHcxIC0gdzAgKiB3MCArIHJobzQgKiBkMikgLyAoMiAqIHcwICogcmhvMiAqIGQxKSxcbiAgICAgICAgYjEgPSAodzEgKiB3MSAtIHcwICogdzAgLSByaG80ICogZDIpIC8gKDIgKiB3MSAqIHJobzIgKiBkMSksXG4gICAgICAgIHIwID0gTWF0aC5sb2coTWF0aC5zcXJ0KGIwICogYjAgKyAxKSAtIGIwKSxcbiAgICAgICAgcjEgPSBNYXRoLmxvZyhNYXRoLnNxcnQoYjEgKiBiMSArIDEpIC0gYjEpO1xuICAgIFMgPSAocjEgLSByMCkgLyByaG87XG4gICAgaSA9IGZ1bmN0aW9uKHQpIHtcbiAgICAgIHZhciBzID0gdCAqIFMsXG4gICAgICAgICAgY29zaHIwID0gY29zaChyMCksXG4gICAgICAgICAgdSA9IHcwIC8gKHJobzIgKiBkMSkgKiAoY29zaHIwICogdGFuaChyaG8gKiBzICsgcjApIC0gc2luaChyMCkpO1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgdXgwICsgdSAqIGR4LFxuICAgICAgICB1eTAgKyB1ICogZHksXG4gICAgICAgIHcwICogY29zaHIwIC8gY29zaChyaG8gKiBzICsgcjApXG4gICAgICBdO1xuICAgIH07XG4gIH1cblxuICBpLmR1cmF0aW9uID0gUyAqIDEwMDA7XG5cbiAgcmV0dXJuIGk7XG59O1xuXG5mdW5jdGlvbiBoc2wkMShodWUkJDEpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICB2YXIgaCA9IGh1ZSQkMSgoc3RhcnQgPSBkM0NvbG9yLmhzbChzdGFydCkpLmgsIChlbmQgPSBkM0NvbG9yLmhzbChlbmQpKS5oKSxcbiAgICAgICAgcyA9IG5vZ2FtbWEoc3RhcnQucywgZW5kLnMpLFxuICAgICAgICBsID0gbm9nYW1tYShzdGFydC5sLCBlbmQubCksXG4gICAgICAgIG9wYWNpdHkgPSBub2dhbW1hKHN0YXJ0Lm9wYWNpdHksIGVuZC5vcGFjaXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgc3RhcnQuaCA9IGgodCk7XG4gICAgICBzdGFydC5zID0gcyh0KTtcbiAgICAgIHN0YXJ0LmwgPSBsKHQpO1xuICAgICAgc3RhcnQub3BhY2l0eSA9IG9wYWNpdHkodCk7XG4gICAgICByZXR1cm4gc3RhcnQgKyBcIlwiO1xuICAgIH07XG4gIH1cbn1cblxudmFyIGhzbCQyID0gaHNsJDEoaHVlKTtcbnZhciBoc2xMb25nID0gaHNsJDEobm9nYW1tYSk7XG5cbmZ1bmN0aW9uIGxhYiQxKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGwgPSBub2dhbW1hKChzdGFydCA9IGQzQ29sb3IubGFiKHN0YXJ0KSkubCwgKGVuZCA9IGQzQ29sb3IubGFiKGVuZCkpLmwpLFxuICAgICAgYSA9IG5vZ2FtbWEoc3RhcnQuYSwgZW5kLmEpLFxuICAgICAgYiA9IG5vZ2FtbWEoc3RhcnQuYiwgZW5kLmIpLFxuICAgICAgb3BhY2l0eSA9IG5vZ2FtbWEoc3RhcnQub3BhY2l0eSwgZW5kLm9wYWNpdHkpO1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHN0YXJ0LmwgPSBsKHQpO1xuICAgIHN0YXJ0LmEgPSBhKHQpO1xuICAgIHN0YXJ0LmIgPSBiKHQpO1xuICAgIHN0YXJ0Lm9wYWNpdHkgPSBvcGFjaXR5KHQpO1xuICAgIHJldHVybiBzdGFydCArIFwiXCI7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGhjbCQxKGh1ZSQkMSkge1xuICByZXR1cm4gZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHZhciBoID0gaHVlJCQxKChzdGFydCA9IGQzQ29sb3IuaGNsKHN0YXJ0KSkuaCwgKGVuZCA9IGQzQ29sb3IuaGNsKGVuZCkpLmgpLFxuICAgICAgICBjID0gbm9nYW1tYShzdGFydC5jLCBlbmQuYyksXG4gICAgICAgIGwgPSBub2dhbW1hKHN0YXJ0LmwsIGVuZC5sKSxcbiAgICAgICAgb3BhY2l0eSA9IG5vZ2FtbWEoc3RhcnQub3BhY2l0eSwgZW5kLm9wYWNpdHkpO1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICBzdGFydC5oID0gaCh0KTtcbiAgICAgIHN0YXJ0LmMgPSBjKHQpO1xuICAgICAgc3RhcnQubCA9IGwodCk7XG4gICAgICBzdGFydC5vcGFjaXR5ID0gb3BhY2l0eSh0KTtcbiAgICAgIHJldHVybiBzdGFydCArIFwiXCI7XG4gICAgfTtcbiAgfVxufVxuXG52YXIgaGNsJDIgPSBoY2wkMShodWUpO1xudmFyIGhjbExvbmcgPSBoY2wkMShub2dhbW1hKTtcblxuZnVuY3Rpb24gY3ViZWhlbGl4JDEoaHVlJCQxKSB7XG4gIHJldHVybiAoZnVuY3Rpb24gY3ViZWhlbGl4R2FtbWEoeSkge1xuICAgIHkgPSAreTtcblxuICAgIGZ1bmN0aW9uIGN1YmVoZWxpeCQkMShzdGFydCwgZW5kKSB7XG4gICAgICB2YXIgaCA9IGh1ZSQkMSgoc3RhcnQgPSBkM0NvbG9yLmN1YmVoZWxpeChzdGFydCkpLmgsIChlbmQgPSBkM0NvbG9yLmN1YmVoZWxpeChlbmQpKS5oKSxcbiAgICAgICAgICBzID0gbm9nYW1tYShzdGFydC5zLCBlbmQucyksXG4gICAgICAgICAgbCA9IG5vZ2FtbWEoc3RhcnQubCwgZW5kLmwpLFxuICAgICAgICAgIG9wYWNpdHkgPSBub2dhbW1hKHN0YXJ0Lm9wYWNpdHksIGVuZC5vcGFjaXR5KTtcbiAgICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICAgIHN0YXJ0LmggPSBoKHQpO1xuICAgICAgICBzdGFydC5zID0gcyh0KTtcbiAgICAgICAgc3RhcnQubCA9IGwoTWF0aC5wb3codCwgeSkpO1xuICAgICAgICBzdGFydC5vcGFjaXR5ID0gb3BhY2l0eSh0KTtcbiAgICAgICAgcmV0dXJuIHN0YXJ0ICsgXCJcIjtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY3ViZWhlbGl4JCQxLmdhbW1hID0gY3ViZWhlbGl4R2FtbWE7XG5cbiAgICByZXR1cm4gY3ViZWhlbGl4JCQxO1xuICB9KSgxKTtcbn1cblxudmFyIGN1YmVoZWxpeCQyID0gY3ViZWhlbGl4JDEoaHVlKTtcbnZhciBjdWJlaGVsaXhMb25nID0gY3ViZWhlbGl4JDEobm9nYW1tYSk7XG5cbnZhciBxdWFudGl6ZSA9IGZ1bmN0aW9uKGludGVycG9sYXRvciwgbikge1xuICB2YXIgc2FtcGxlcyA9IG5ldyBBcnJheShuKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyArK2kpIHNhbXBsZXNbaV0gPSBpbnRlcnBvbGF0b3IoaSAvIChuIC0gMSkpO1xuICByZXR1cm4gc2FtcGxlcztcbn07XG5cbmV4cG9ydHMuaW50ZXJwb2xhdGUgPSB2YWx1ZTtcbmV4cG9ydHMuaW50ZXJwb2xhdGVBcnJheSA9IGFycmF5O1xuZXhwb3J0cy5pbnRlcnBvbGF0ZUJhc2lzID0gYmFzaXMkMTtcbmV4cG9ydHMuaW50ZXJwb2xhdGVCYXNpc0Nsb3NlZCA9IGJhc2lzQ2xvc2VkO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZURhdGUgPSBkYXRlO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZU51bWJlciA9IG51bWJlcjtcbmV4cG9ydHMuaW50ZXJwb2xhdGVPYmplY3QgPSBvYmplY3Q7XG5leHBvcnRzLmludGVycG9sYXRlUm91bmQgPSByb3VuZDtcbmV4cG9ydHMuaW50ZXJwb2xhdGVTdHJpbmcgPSBzdHJpbmc7XG5leHBvcnRzLmludGVycG9sYXRlVHJhbnNmb3JtQ3NzID0gaW50ZXJwb2xhdGVUcmFuc2Zvcm1Dc3M7XG5leHBvcnRzLmludGVycG9sYXRlVHJhbnNmb3JtU3ZnID0gaW50ZXJwb2xhdGVUcmFuc2Zvcm1Tdmc7XG5leHBvcnRzLmludGVycG9sYXRlWm9vbSA9IHpvb207XG5leHBvcnRzLmludGVycG9sYXRlUmdiID0gcmdiJDE7XG5leHBvcnRzLmludGVycG9sYXRlUmdiQmFzaXMgPSByZ2JCYXNpcztcbmV4cG9ydHMuaW50ZXJwb2xhdGVSZ2JCYXNpc0Nsb3NlZCA9IHJnYkJhc2lzQ2xvc2VkO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZUhzbCA9IGhzbCQyO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZUhzbExvbmcgPSBoc2xMb25nO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZUxhYiA9IGxhYiQxO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZUhjbCA9IGhjbCQyO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZUhjbExvbmcgPSBoY2xMb25nO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZUN1YmVoZWxpeCA9IGN1YmVoZWxpeCQyO1xuZXhwb3J0cy5pbnRlcnBvbGF0ZUN1YmVoZWxpeExvbmcgPSBjdWJlaGVsaXhMb25nO1xuZXhwb3J0cy5xdWFudGl6ZSA9IHF1YW50aXplO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSkpO1xuIiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy1wYXRoLyBWZXJzaW9uIDEuMC41LiBDb3B5cmlnaHQgMjAxNyBNaWtlIEJvc3RvY2suXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuXHR0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG5cdChmYWN0b3J5KChnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cbnZhciBwaSA9IE1hdGguUEk7XG52YXIgdGF1ID0gMiAqIHBpO1xudmFyIGVwc2lsb24gPSAxZS02O1xudmFyIHRhdUVwc2lsb24gPSB0YXUgLSBlcHNpbG9uO1xuXG5mdW5jdGlvbiBQYXRoKCkge1xuICB0aGlzLl94MCA9IHRoaXMuX3kwID0gLy8gc3RhcnQgb2YgY3VycmVudCBzdWJwYXRoXG4gIHRoaXMuX3gxID0gdGhpcy5feTEgPSBudWxsOyAvLyBlbmQgb2YgY3VycmVudCBzdWJwYXRoXG4gIHRoaXMuXyA9IFwiXCI7XG59XG5cbmZ1bmN0aW9uIHBhdGgoKSB7XG4gIHJldHVybiBuZXcgUGF0aDtcbn1cblxuUGF0aC5wcm90b3R5cGUgPSBwYXRoLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFBhdGgsXG4gIG1vdmVUbzogZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuXyArPSBcIk1cIiArICh0aGlzLl94MCA9IHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTAgPSB0aGlzLl95MSA9ICt5KTtcbiAgfSxcbiAgY2xvc2VQYXRoOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5feDEgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuX3gxID0gdGhpcy5feDAsIHRoaXMuX3kxID0gdGhpcy5feTA7XG4gICAgICB0aGlzLl8gKz0gXCJaXCI7XG4gICAgfVxuICB9LFxuICBsaW5lVG86IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLl8gKz0gXCJMXCIgKyAodGhpcy5feDEgPSAreCkgKyBcIixcIiArICh0aGlzLl95MSA9ICt5KTtcbiAgfSxcbiAgcXVhZHJhdGljQ3VydmVUbzogZnVuY3Rpb24oeDEsIHkxLCB4LCB5KSB7XG4gICAgdGhpcy5fICs9IFwiUVwiICsgKCt4MSkgKyBcIixcIiArICgreTEpICsgXCIsXCIgKyAodGhpcy5feDEgPSAreCkgKyBcIixcIiArICh0aGlzLl95MSA9ICt5KTtcbiAgfSxcbiAgYmV6aWVyQ3VydmVUbzogZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIHgsIHkpIHtcbiAgICB0aGlzLl8gKz0gXCJDXCIgKyAoK3gxKSArIFwiLFwiICsgKCt5MSkgKyBcIixcIiArICgreDIpICsgXCIsXCIgKyAoK3kyKSArIFwiLFwiICsgKHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIGFyY1RvOiBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Miwgcikge1xuICAgIHgxID0gK3gxLCB5MSA9ICt5MSwgeDIgPSAreDIsIHkyID0gK3kyLCByID0gK3I7XG4gICAgdmFyIHgwID0gdGhpcy5feDEsXG4gICAgICAgIHkwID0gdGhpcy5feTEsXG4gICAgICAgIHgyMSA9IHgyIC0geDEsXG4gICAgICAgIHkyMSA9IHkyIC0geTEsXG4gICAgICAgIHgwMSA9IHgwIC0geDEsXG4gICAgICAgIHkwMSA9IHkwIC0geTEsXG4gICAgICAgIGwwMV8yID0geDAxICogeDAxICsgeTAxICogeTAxO1xuXG4gICAgLy8gSXMgdGhlIHJhZGl1cyBuZWdhdGl2ZT8gRXJyb3IuXG4gICAgaWYgKHIgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJuZWdhdGl2ZSByYWRpdXM6IFwiICsgcik7XG5cbiAgICAvLyBJcyB0aGlzIHBhdGggZW1wdHk/IE1vdmUgdG8gKHgxLHkxKS5cbiAgICBpZiAodGhpcy5feDEgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuXyArPSBcIk1cIiArICh0aGlzLl94MSA9IHgxKSArIFwiLFwiICsgKHRoaXMuX3kxID0geTEpO1xuICAgIH1cblxuICAgIC8vIE9yLCBpcyAoeDEseTEpIGNvaW5jaWRlbnQgd2l0aCAoeDAseTApPyBEbyBub3RoaW5nLlxuICAgIGVsc2UgaWYgKCEobDAxXzIgPiBlcHNpbG9uKSkge31cblxuICAgIC8vIE9yLCBhcmUgKHgwLHkwKSwgKHgxLHkxKSBhbmQgKHgyLHkyKSBjb2xsaW5lYXI/XG4gICAgLy8gRXF1aXZhbGVudGx5LCBpcyAoeDEseTEpIGNvaW5jaWRlbnQgd2l0aCAoeDIseTIpP1xuICAgIC8vIE9yLCBpcyB0aGUgcmFkaXVzIHplcm8/IExpbmUgdG8gKHgxLHkxKS5cbiAgICBlbHNlIGlmICghKE1hdGguYWJzKHkwMSAqIHgyMSAtIHkyMSAqIHgwMSkgPiBlcHNpbG9uKSB8fCAhcikge1xuICAgICAgdGhpcy5fICs9IFwiTFwiICsgKHRoaXMuX3gxID0geDEpICsgXCIsXCIgKyAodGhpcy5feTEgPSB5MSk7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCBkcmF3IGFuIGFyYyFcbiAgICBlbHNlIHtcbiAgICAgIHZhciB4MjAgPSB4MiAtIHgwLFxuICAgICAgICAgIHkyMCA9IHkyIC0geTAsXG4gICAgICAgICAgbDIxXzIgPSB4MjEgKiB4MjEgKyB5MjEgKiB5MjEsXG4gICAgICAgICAgbDIwXzIgPSB4MjAgKiB4MjAgKyB5MjAgKiB5MjAsXG4gICAgICAgICAgbDIxID0gTWF0aC5zcXJ0KGwyMV8yKSxcbiAgICAgICAgICBsMDEgPSBNYXRoLnNxcnQobDAxXzIpLFxuICAgICAgICAgIGwgPSByICogTWF0aC50YW4oKHBpIC0gTWF0aC5hY29zKChsMjFfMiArIGwwMV8yIC0gbDIwXzIpIC8gKDIgKiBsMjEgKiBsMDEpKSkgLyAyKSxcbiAgICAgICAgICB0MDEgPSBsIC8gbDAxLFxuICAgICAgICAgIHQyMSA9IGwgLyBsMjE7XG5cbiAgICAgIC8vIElmIHRoZSBzdGFydCB0YW5nZW50IGlzIG5vdCBjb2luY2lkZW50IHdpdGggKHgwLHkwKSwgbGluZSB0by5cbiAgICAgIGlmIChNYXRoLmFicyh0MDEgLSAxKSA+IGVwc2lsb24pIHtcbiAgICAgICAgdGhpcy5fICs9IFwiTFwiICsgKHgxICsgdDAxICogeDAxKSArIFwiLFwiICsgKHkxICsgdDAxICogeTAxKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fICs9IFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsMCxcIiArICgrKHkwMSAqIHgyMCA+IHgwMSAqIHkyMCkpICsgXCIsXCIgKyAodGhpcy5feDEgPSB4MSArIHQyMSAqIHgyMSkgKyBcIixcIiArICh0aGlzLl95MSA9IHkxICsgdDIxICogeTIxKTtcbiAgICB9XG4gIH0sXG4gIGFyYzogZnVuY3Rpb24oeCwgeSwgciwgYTAsIGExLCBjY3cpIHtcbiAgICB4ID0gK3gsIHkgPSAreSwgciA9ICtyO1xuICAgIHZhciBkeCA9IHIgKiBNYXRoLmNvcyhhMCksXG4gICAgICAgIGR5ID0gciAqIE1hdGguc2luKGEwKSxcbiAgICAgICAgeDAgPSB4ICsgZHgsXG4gICAgICAgIHkwID0geSArIGR5LFxuICAgICAgICBjdyA9IDEgXiBjY3csXG4gICAgICAgIGRhID0gY2N3ID8gYTAgLSBhMSA6IGExIC0gYTA7XG5cbiAgICAvLyBJcyB0aGUgcmFkaXVzIG5lZ2F0aXZlPyBFcnJvci5cbiAgICBpZiAociA8IDApIHRocm93IG5ldyBFcnJvcihcIm5lZ2F0aXZlIHJhZGl1czogXCIgKyByKTtcblxuICAgIC8vIElzIHRoaXMgcGF0aCBlbXB0eT8gTW92ZSB0byAoeDAseTApLlxuICAgIGlmICh0aGlzLl94MSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5fICs9IFwiTVwiICsgeDAgKyBcIixcIiArIHkwO1xuICAgIH1cblxuICAgIC8vIE9yLCBpcyAoeDAseTApIG5vdCBjb2luY2lkZW50IHdpdGggdGhlIHByZXZpb3VzIHBvaW50PyBMaW5lIHRvICh4MCx5MCkuXG4gICAgZWxzZSBpZiAoTWF0aC5hYnModGhpcy5feDEgLSB4MCkgPiBlcHNpbG9uIHx8IE1hdGguYWJzKHRoaXMuX3kxIC0geTApID4gZXBzaWxvbikge1xuICAgICAgdGhpcy5fICs9IFwiTFwiICsgeDAgKyBcIixcIiArIHkwO1xuICAgIH1cblxuICAgIC8vIElzIHRoaXMgYXJjIGVtcHR5PyBXZeKAmXJlIGRvbmUuXG4gICAgaWYgKCFyKSByZXR1cm47XG5cbiAgICAvLyBEb2VzIHRoZSBhbmdsZSBnbyB0aGUgd3Jvbmcgd2F5PyBGbGlwIHRoZSBkaXJlY3Rpb24uXG4gICAgaWYgKGRhIDwgMCkgZGEgPSBkYSAlIHRhdSArIHRhdTtcblxuICAgIC8vIElzIHRoaXMgYSBjb21wbGV0ZSBjaXJjbGU/IERyYXcgdHdvIGFyY3MgdG8gY29tcGxldGUgdGhlIGNpcmNsZS5cbiAgICBpZiAoZGEgPiB0YXVFcHNpbG9uKSB7XG4gICAgICB0aGlzLl8gKz0gXCJBXCIgKyByICsgXCIsXCIgKyByICsgXCIsMCwxLFwiICsgY3cgKyBcIixcIiArICh4IC0gZHgpICsgXCIsXCIgKyAoeSAtIGR5KSArIFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsMSxcIiArIGN3ICsgXCIsXCIgKyAodGhpcy5feDEgPSB4MCkgKyBcIixcIiArICh0aGlzLl95MSA9IHkwKTtcbiAgICB9XG5cbiAgICAvLyBJcyB0aGlzIGFyYyBub24tZW1wdHk/IERyYXcgYW4gYXJjIVxuICAgIGVsc2UgaWYgKGRhID4gZXBzaWxvbikge1xuICAgICAgdGhpcy5fICs9IFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsXCIgKyAoKyhkYSA+PSBwaSkpICsgXCIsXCIgKyBjdyArIFwiLFwiICsgKHRoaXMuX3gxID0geCArIHIgKiBNYXRoLmNvcyhhMSkpICsgXCIsXCIgKyAodGhpcy5feTEgPSB5ICsgciAqIE1hdGguc2luKGExKSk7XG4gICAgfVxuICB9LFxuICByZWN0OiBmdW5jdGlvbih4LCB5LCB3LCBoKSB7XG4gICAgdGhpcy5fICs9IFwiTVwiICsgKHRoaXMuX3gwID0gdGhpcy5feDEgPSAreCkgKyBcIixcIiArICh0aGlzLl95MCA9IHRoaXMuX3kxID0gK3kpICsgXCJoXCIgKyAoK3cpICsgXCJ2XCIgKyAoK2gpICsgXCJoXCIgKyAoLXcpICsgXCJaXCI7XG4gIH0sXG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fO1xuICB9XG59O1xuXG5leHBvcnRzLnBhdGggPSBwYXRoO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSkpO1xuIiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy1yYW5kb20vIFZlcnNpb24gMS4wLjEuIENvcHlyaWdodCAyMDE2IE1pa2UgQm9zdG9jay5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5kMyA9IGdsb2JhbC5kMyB8fCB7fSkpKTtcbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG4gIGZ1bmN0aW9uIHVuaWZvcm0obWluLCBtYXgpIHtcbiAgICBtaW4gPSBtaW4gPT0gbnVsbCA/IDAgOiArbWluO1xuICAgIG1heCA9IG1heCA9PSBudWxsID8gMSA6ICttYXg7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIG1heCA9IG1pbiwgbWluID0gMDtcbiAgICBlbHNlIG1heCAtPSBtaW47XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiBtYXggKyBtaW47XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbChtdSwgc2lnbWEpIHtcbiAgICB2YXIgeCwgcjtcbiAgICBtdSA9IG11ID09IG51bGwgPyAwIDogK211O1xuICAgIHNpZ21hID0gc2lnbWEgPT0gbnVsbCA/IDEgOiArc2lnbWE7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHk7XG5cbiAgICAgIC8vIElmIGF2YWlsYWJsZSwgdXNlIHRoZSBzZWNvbmQgcHJldmlvdXNseS1nZW5lcmF0ZWQgdW5pZm9ybSByYW5kb20uXG4gICAgICBpZiAoeCAhPSBudWxsKSB5ID0geCwgeCA9IG51bGw7XG5cbiAgICAgIC8vIE90aGVyd2lzZSwgZ2VuZXJhdGUgYSBuZXcgeCBhbmQgeS5cbiAgICAgIGVsc2UgZG8ge1xuICAgICAgICB4ID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxO1xuICAgICAgICB5ID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxO1xuICAgICAgICByID0geCAqIHggKyB5ICogeTtcbiAgICAgIH0gd2hpbGUgKCFyIHx8IHIgPiAxKTtcblxuICAgICAgcmV0dXJuIG11ICsgc2lnbWEgKiB5ICogTWF0aC5zcXJ0KC0yICogTWF0aC5sb2cocikgLyByKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbG9nTm9ybWFsKCkge1xuICAgIHZhciByYW5kb21Ob3JtYWwgPSBub3JtYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gTWF0aC5leHAocmFuZG9tTm9ybWFsKCkpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBpcndpbkhhbGwobikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGZvciAodmFyIHN1bSA9IDAsIGkgPSAwOyBpIDwgbjsgKytpKSBzdW0gKz0gTWF0aC5yYW5kb20oKTtcbiAgICAgIHJldHVybiBzdW07XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJhdGVzKG4pIHtcbiAgICB2YXIgcmFuZG9tSXJ3aW5IYWxsID0gaXJ3aW5IYWxsKG4pO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiByYW5kb21JcndpbkhhbGwoKSAvIG47XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4cG9uZW50aWFsKGxhbWJkYSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAtTWF0aC5sb2coMSAtIE1hdGgucmFuZG9tKCkpIC8gbGFtYmRhO1xuICAgIH07XG4gIH1cblxuICBleHBvcnRzLnJhbmRvbVVuaWZvcm0gPSB1bmlmb3JtO1xuICBleHBvcnRzLnJhbmRvbU5vcm1hbCA9IG5vcm1hbDtcbiAgZXhwb3J0cy5yYW5kb21Mb2dOb3JtYWwgPSBsb2dOb3JtYWw7XG4gIGV4cG9ydHMucmFuZG9tQmF0ZXMgPSBiYXRlcztcbiAgZXhwb3J0cy5yYW5kb21JcndpbkhhbGwgPSBpcndpbkhhbGw7XG4gIGV4cG9ydHMucmFuZG9tRXhwb25lbnRpYWwgPSBleHBvbmVudGlhbDtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSk7IiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy1zY2FsZS8gVmVyc2lvbiAxLjAuMy4gQ29weXJpZ2h0IDIwMTYgTWlrZSBCb3N0b2NrLlxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzLCByZXF1aXJlKCdkMy1hcnJheScpLCByZXF1aXJlKCdkMy1jb2xsZWN0aW9uJyksIHJlcXVpcmUoJ2QzLWludGVycG9sYXRlJyksIHJlcXVpcmUoJ2QzLWZvcm1hdCcpLCByZXF1aXJlKCdkMy10aW1lJyksIHJlcXVpcmUoJ2QzLXRpbWUtZm9ybWF0JyksIHJlcXVpcmUoJ2QzLWNvbG9yJykpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cycsICdkMy1hcnJheScsICdkMy1jb2xsZWN0aW9uJywgJ2QzLWludGVycG9sYXRlJywgJ2QzLWZvcm1hdCcsICdkMy10aW1lJywgJ2QzLXRpbWUtZm9ybWF0JywgJ2QzLWNvbG9yJ10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5kMyA9IGdsb2JhbC5kMyB8fCB7fSksZ2xvYmFsLmQzLGdsb2JhbC5kMyxnbG9iYWwuZDMsZ2xvYmFsLmQzLGdsb2JhbC5kMyxnbG9iYWwuZDMsZ2xvYmFsLmQzKSk7XG59KHRoaXMsIGZ1bmN0aW9uIChleHBvcnRzLGQzQXJyYXksZDNDb2xsZWN0aW9uLGQzSW50ZXJwb2xhdGUsZDNGb3JtYXQsZDNUaW1lLGQzVGltZUZvcm1hdCxkM0NvbG9yKSB7ICd1c2Ugc3RyaWN0JztcblxuICB2YXIgYXJyYXkgPSBBcnJheS5wcm90b3R5cGU7XG5cbiAgdmFyIG1hcCQxID0gYXJyYXkubWFwO1xuICB2YXIgc2xpY2UgPSBhcnJheS5zbGljZTtcblxuICB2YXIgaW1wbGljaXQgPSB7bmFtZTogXCJpbXBsaWNpdFwifTtcblxuICBmdW5jdGlvbiBvcmRpbmFsKHJhbmdlKSB7XG4gICAgdmFyIGluZGV4ID0gZDNDb2xsZWN0aW9uLm1hcCgpLFxuICAgICAgICBkb21haW4gPSBbXSxcbiAgICAgICAgdW5rbm93biA9IGltcGxpY2l0O1xuXG4gICAgcmFuZ2UgPSByYW5nZSA9PSBudWxsID8gW10gOiBzbGljZS5jYWxsKHJhbmdlKTtcblxuICAgIGZ1bmN0aW9uIHNjYWxlKGQpIHtcbiAgICAgIHZhciBrZXkgPSBkICsgXCJcIiwgaSA9IGluZGV4LmdldChrZXkpO1xuICAgICAgaWYgKCFpKSB7XG4gICAgICAgIGlmICh1bmtub3duICE9PSBpbXBsaWNpdCkgcmV0dXJuIHVua25vd247XG4gICAgICAgIGluZGV4LnNldChrZXksIGkgPSBkb21haW4ucHVzaChkKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmFuZ2VbKGkgLSAxKSAlIHJhbmdlLmxlbmd0aF07XG4gICAgfVxuXG4gICAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZG9tYWluLnNsaWNlKCk7XG4gICAgICBkb21haW4gPSBbXSwgaW5kZXggPSBkM0NvbGxlY3Rpb24ubWFwKCk7XG4gICAgICB2YXIgaSA9IC0xLCBuID0gXy5sZW5ndGgsIGQsIGtleTtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoIWluZGV4LmhhcyhrZXkgPSAoZCA9IF9baV0pICsgXCJcIikpIGluZGV4LnNldChrZXksIGRvbWFpbi5wdXNoKGQpKTtcbiAgICAgIHJldHVybiBzY2FsZTtcbiAgICB9O1xuXG4gICAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyYW5nZSA9IHNsaWNlLmNhbGwoXyksIHNjYWxlKSA6IHJhbmdlLnNsaWNlKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLnVua25vd24gPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh1bmtub3duID0gXywgc2NhbGUpIDogdW5rbm93bjtcbiAgICB9O1xuXG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG9yZGluYWwoKVxuICAgICAgICAgIC5kb21haW4oZG9tYWluKVxuICAgICAgICAgIC5yYW5nZShyYW5nZSlcbiAgICAgICAgICAudW5rbm93bih1bmtub3duKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9XG5cbiAgZnVuY3Rpb24gYmFuZCgpIHtcbiAgICB2YXIgc2NhbGUgPSBvcmRpbmFsKCkudW5rbm93bih1bmRlZmluZWQpLFxuICAgICAgICBkb21haW4gPSBzY2FsZS5kb21haW4sXG4gICAgICAgIG9yZGluYWxSYW5nZSA9IHNjYWxlLnJhbmdlLFxuICAgICAgICByYW5nZSA9IFswLCAxXSxcbiAgICAgICAgc3RlcCxcbiAgICAgICAgYmFuZHdpZHRoLFxuICAgICAgICByb3VuZCA9IGZhbHNlLFxuICAgICAgICBwYWRkaW5nSW5uZXIgPSAwLFxuICAgICAgICBwYWRkaW5nT3V0ZXIgPSAwLFxuICAgICAgICBhbGlnbiA9IDAuNTtcblxuICAgIGRlbGV0ZSBzY2FsZS51bmtub3duO1xuXG4gICAgZnVuY3Rpb24gcmVzY2FsZSgpIHtcbiAgICAgIHZhciBuID0gZG9tYWluKCkubGVuZ3RoLFxuICAgICAgICAgIHJldmVyc2UgPSByYW5nZVsxXSA8IHJhbmdlWzBdLFxuICAgICAgICAgIHN0YXJ0ID0gcmFuZ2VbcmV2ZXJzZSAtIDBdLFxuICAgICAgICAgIHN0b3AgPSByYW5nZVsxIC0gcmV2ZXJzZV07XG4gICAgICBzdGVwID0gKHN0b3AgLSBzdGFydCkgLyBNYXRoLm1heCgxLCBuIC0gcGFkZGluZ0lubmVyICsgcGFkZGluZ091dGVyICogMik7XG4gICAgICBpZiAocm91bmQpIHN0ZXAgPSBNYXRoLmZsb29yKHN0ZXApO1xuICAgICAgc3RhcnQgKz0gKHN0b3AgLSBzdGFydCAtIHN0ZXAgKiAobiAtIHBhZGRpbmdJbm5lcikpICogYWxpZ247XG4gICAgICBiYW5kd2lkdGggPSBzdGVwICogKDEgLSBwYWRkaW5nSW5uZXIpO1xuICAgICAgaWYgKHJvdW5kKSBzdGFydCA9IE1hdGgucm91bmQoc3RhcnQpLCBiYW5kd2lkdGggPSBNYXRoLnJvdW5kKGJhbmR3aWR0aCk7XG4gICAgICB2YXIgdmFsdWVzID0gZDNBcnJheS5yYW5nZShuKS5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gc3RhcnQgKyBzdGVwICogaTsgfSk7XG4gICAgICByZXR1cm4gb3JkaW5hbFJhbmdlKHJldmVyc2UgPyB2YWx1ZXMucmV2ZXJzZSgpIDogdmFsdWVzKTtcbiAgICB9XG5cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4oXyksIHJlc2NhbGUoKSkgOiBkb21haW4oKTtcbiAgICB9O1xuXG4gICAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyYW5nZSA9IFsrX1swXSwgK19bMV1dLCByZXNjYWxlKCkpIDogcmFuZ2Uuc2xpY2UoKTtcbiAgICB9O1xuXG4gICAgc2NhbGUucmFuZ2VSb3VuZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiByYW5nZSA9IFsrX1swXSwgK19bMV1dLCByb3VuZCA9IHRydWUsIHJlc2NhbGUoKTtcbiAgICB9O1xuXG4gICAgc2NhbGUuYmFuZHdpZHRoID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gYmFuZHdpZHRoO1xuICAgIH07XG5cbiAgICBzY2FsZS5zdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gc3RlcDtcbiAgICB9O1xuXG4gICAgc2NhbGUucm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyb3VuZCA9ICEhXywgcmVzY2FsZSgpKSA6IHJvdW5kO1xuICAgIH07XG5cbiAgICBzY2FsZS5wYWRkaW5nID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkZGluZ0lubmVyID0gcGFkZGluZ091dGVyID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgXykpLCByZXNjYWxlKCkpIDogcGFkZGluZ0lubmVyO1xuICAgIH07XG5cbiAgICBzY2FsZS5wYWRkaW5nSW5uZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRkaW5nSW5uZXIgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBfKSksIHJlc2NhbGUoKSkgOiBwYWRkaW5nSW5uZXI7XG4gICAgfTtcblxuICAgIHNjYWxlLnBhZGRpbmdPdXRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHBhZGRpbmdPdXRlciA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIF8pKSwgcmVzY2FsZSgpKSA6IHBhZGRpbmdPdXRlcjtcbiAgICB9O1xuXG4gICAgc2NhbGUuYWxpZ24gPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChhbGlnbiA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIF8pKSwgcmVzY2FsZSgpKSA6IGFsaWduO1xuICAgIH07XG5cbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gYmFuZCgpXG4gICAgICAgICAgLmRvbWFpbihkb21haW4oKSlcbiAgICAgICAgICAucmFuZ2UocmFuZ2UpXG4gICAgICAgICAgLnJvdW5kKHJvdW5kKVxuICAgICAgICAgIC5wYWRkaW5nSW5uZXIocGFkZGluZ0lubmVyKVxuICAgICAgICAgIC5wYWRkaW5nT3V0ZXIocGFkZGluZ091dGVyKVxuICAgICAgICAgIC5hbGlnbihhbGlnbik7XG4gICAgfTtcblxuICAgIHJldHVybiByZXNjYWxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBwb2ludGlzaChzY2FsZSkge1xuICAgIHZhciBjb3B5ID0gc2NhbGUuY29weTtcblxuICAgIHNjYWxlLnBhZGRpbmcgPSBzY2FsZS5wYWRkaW5nT3V0ZXI7XG4gICAgZGVsZXRlIHNjYWxlLnBhZGRpbmdJbm5lcjtcbiAgICBkZWxldGUgc2NhbGUucGFkZGluZ091dGVyO1xuXG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBvaW50aXNoKGNvcHkoKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBzY2FsZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBvaW50KCkge1xuICAgIHJldHVybiBwb2ludGlzaChiYW5kKCkucGFkZGluZ0lubmVyKDEpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN0YW50KHgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbnVtYmVyKHgpIHtcbiAgICByZXR1cm4gK3g7XG4gIH1cblxuICB2YXIgdW5pdCA9IFswLCAxXTtcblxuICBmdW5jdGlvbiBkZWludGVycG9sYXRlKGEsIGIpIHtcbiAgICByZXR1cm4gKGIgLT0gKGEgPSArYSkpXG4gICAgICAgID8gZnVuY3Rpb24oeCkgeyByZXR1cm4gKHggLSBhKSAvIGI7IH1cbiAgICAgICAgOiBjb25zdGFudChiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlaW50ZXJwb2xhdGVDbGFtcChkZWludGVycG9sYXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIHZhciBkID0gZGVpbnRlcnBvbGF0ZShhID0gK2EsIGIgPSArYik7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oeCkgeyByZXR1cm4geCA8PSBhID8gMCA6IHggPj0gYiA/IDEgOiBkKHgpOyB9O1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiByZWludGVycG9sYXRlQ2xhbXAocmVpbnRlcnBvbGF0ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICB2YXIgciA9IHJlaW50ZXJwb2xhdGUoYSA9ICthLCBiID0gK2IpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHsgcmV0dXJuIHQgPD0gMCA/IGEgOiB0ID49IDEgPyBiIDogcih0KTsgfTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gYmltYXAoZG9tYWluLCByYW5nZSwgZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSkge1xuICAgIHZhciBkMCA9IGRvbWFpblswXSwgZDEgPSBkb21haW5bMV0sIHIwID0gcmFuZ2VbMF0sIHIxID0gcmFuZ2VbMV07XG4gICAgaWYgKGQxIDwgZDApIGQwID0gZGVpbnRlcnBvbGF0ZShkMSwgZDApLCByMCA9IHJlaW50ZXJwb2xhdGUocjEsIHIwKTtcbiAgICBlbHNlIGQwID0gZGVpbnRlcnBvbGF0ZShkMCwgZDEpLCByMCA9IHJlaW50ZXJwb2xhdGUocjAsIHIxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oeCkgeyByZXR1cm4gcjAoZDAoeCkpOyB9O1xuICB9XG5cbiAgZnVuY3Rpb24gcG9seW1hcChkb21haW4sIHJhbmdlLCBkZWludGVycG9sYXRlLCByZWludGVycG9sYXRlKSB7XG4gICAgdmFyIGogPSBNYXRoLm1pbihkb21haW4ubGVuZ3RoLCByYW5nZS5sZW5ndGgpIC0gMSxcbiAgICAgICAgZCA9IG5ldyBBcnJheShqKSxcbiAgICAgICAgciA9IG5ldyBBcnJheShqKSxcbiAgICAgICAgaSA9IC0xO1xuXG4gICAgLy8gUmV2ZXJzZSBkZXNjZW5kaW5nIGRvbWFpbnMuXG4gICAgaWYgKGRvbWFpbltqXSA8IGRvbWFpblswXSkge1xuICAgICAgZG9tYWluID0gZG9tYWluLnNsaWNlKCkucmV2ZXJzZSgpO1xuICAgICAgcmFuZ2UgPSByYW5nZS5zbGljZSgpLnJldmVyc2UoKTtcbiAgICB9XG5cbiAgICB3aGlsZSAoKytpIDwgaikge1xuICAgICAgZFtpXSA9IGRlaW50ZXJwb2xhdGUoZG9tYWluW2ldLCBkb21haW5baSArIDFdKTtcbiAgICAgIHJbaV0gPSByZWludGVycG9sYXRlKHJhbmdlW2ldLCByYW5nZVtpICsgMV0pO1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICB2YXIgaSA9IGQzQXJyYXkuYmlzZWN0KGRvbWFpbiwgeCwgMSwgaikgLSAxO1xuICAgICAgcmV0dXJuIHJbaV0oZFtpXSh4KSk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvcHkoc291cmNlLCB0YXJnZXQpIHtcbiAgICByZXR1cm4gdGFyZ2V0XG4gICAgICAgIC5kb21haW4oc291cmNlLmRvbWFpbigpKVxuICAgICAgICAucmFuZ2Uoc291cmNlLnJhbmdlKCkpXG4gICAgICAgIC5pbnRlcnBvbGF0ZShzb3VyY2UuaW50ZXJwb2xhdGUoKSlcbiAgICAgICAgLmNsYW1wKHNvdXJjZS5jbGFtcCgpKTtcbiAgfVxuXG4gIC8vIGRlaW50ZXJwb2xhdGUoYSwgYikoeCkgdGFrZXMgYSBkb21haW4gdmFsdWUgeCBpbiBbYSxiXSBhbmQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBwYXJhbWV0ZXIgdCBpbiBbMCwxXS5cbiAgLy8gcmVpbnRlcnBvbGF0ZShhLCBiKSh0KSB0YWtlcyBhIHBhcmFtZXRlciB0IGluIFswLDFdIGFuZCByZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nIGRvbWFpbiB2YWx1ZSB4IGluIFthLGJdLlxuICBmdW5jdGlvbiBjb250aW51b3VzKGRlaW50ZXJwb2xhdGUkJCwgcmVpbnRlcnBvbGF0ZSkge1xuICAgIHZhciBkb21haW4gPSB1bml0LFxuICAgICAgICByYW5nZSA9IHVuaXQsXG4gICAgICAgIGludGVycG9sYXRlID0gZDNJbnRlcnBvbGF0ZS5pbnRlcnBvbGF0ZSxcbiAgICAgICAgY2xhbXAgPSBmYWxzZSxcbiAgICAgICAgcGllY2V3aXNlLFxuICAgICAgICBvdXRwdXQsXG4gICAgICAgIGlucHV0O1xuXG4gICAgZnVuY3Rpb24gcmVzY2FsZSgpIHtcbiAgICAgIHBpZWNld2lzZSA9IE1hdGgubWluKGRvbWFpbi5sZW5ndGgsIHJhbmdlLmxlbmd0aCkgPiAyID8gcG9seW1hcCA6IGJpbWFwO1xuICAgICAgb3V0cHV0ID0gaW5wdXQgPSBudWxsO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjYWxlKHgpIHtcbiAgICAgIHJldHVybiAob3V0cHV0IHx8IChvdXRwdXQgPSBwaWVjZXdpc2UoZG9tYWluLCByYW5nZSwgY2xhbXAgPyBkZWludGVycG9sYXRlQ2xhbXAoZGVpbnRlcnBvbGF0ZSQkKSA6IGRlaW50ZXJwb2xhdGUkJCwgaW50ZXJwb2xhdGUpKSkoK3gpO1xuICAgIH1cblxuICAgIHNjYWxlLmludmVydCA9IGZ1bmN0aW9uKHkpIHtcbiAgICAgIHJldHVybiAoaW5wdXQgfHwgKGlucHV0ID0gcGllY2V3aXNlKHJhbmdlLCBkb21haW4sIGRlaW50ZXJwb2xhdGUsIGNsYW1wID8gcmVpbnRlcnBvbGF0ZUNsYW1wKHJlaW50ZXJwb2xhdGUpIDogcmVpbnRlcnBvbGF0ZSkpKSgreSk7XG4gICAgfTtcblxuICAgIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRvbWFpbiA9IG1hcCQxLmNhbGwoXywgbnVtYmVyKSwgcmVzY2FsZSgpKSA6IGRvbWFpbi5zbGljZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJhbmdlID0gc2xpY2UuY2FsbChfKSwgcmVzY2FsZSgpKSA6IHJhbmdlLnNsaWNlKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLnJhbmdlUm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gcmFuZ2UgPSBzbGljZS5jYWxsKF8pLCBpbnRlcnBvbGF0ZSA9IGQzSW50ZXJwb2xhdGUuaW50ZXJwb2xhdGVSb3VuZCwgcmVzY2FsZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS5jbGFtcCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGNsYW1wID0gISFfLCByZXNjYWxlKCkpIDogY2xhbXA7XG4gICAgfTtcblxuICAgIHNjYWxlLmludGVycG9sYXRlID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoaW50ZXJwb2xhdGUgPSBfLCByZXNjYWxlKCkpIDogaW50ZXJwb2xhdGU7XG4gICAgfTtcblxuICAgIHJldHVybiByZXNjYWxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB0aWNrRm9ybWF0KGRvbWFpbiwgY291bnQsIHNwZWNpZmllcikge1xuICAgIHZhciBzdGFydCA9IGRvbWFpblswXSxcbiAgICAgICAgc3RvcCA9IGRvbWFpbltkb21haW4ubGVuZ3RoIC0gMV0sXG4gICAgICAgIHN0ZXAgPSBkM0FycmF5LnRpY2tTdGVwKHN0YXJ0LCBzdG9wLCBjb3VudCA9PSBudWxsID8gMTAgOiBjb3VudCksXG4gICAgICAgIHByZWNpc2lvbjtcbiAgICBzcGVjaWZpZXIgPSBkM0Zvcm1hdC5mb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyID09IG51bGwgPyBcIixmXCIgOiBzcGVjaWZpZXIpO1xuICAgIHN3aXRjaCAoc3BlY2lmaWVyLnR5cGUpIHtcbiAgICAgIGNhc2UgXCJzXCI6IHtcbiAgICAgICAgdmFyIHZhbHVlID0gTWF0aC5tYXgoTWF0aC5hYnMoc3RhcnQpLCBNYXRoLmFicyhzdG9wKSk7XG4gICAgICAgIGlmIChzcGVjaWZpZXIucHJlY2lzaW9uID09IG51bGwgJiYgIWlzTmFOKHByZWNpc2lvbiA9IGQzRm9ybWF0LnByZWNpc2lvblByZWZpeChzdGVwLCB2YWx1ZSkpKSBzcGVjaWZpZXIucHJlY2lzaW9uID0gcHJlY2lzaW9uO1xuICAgICAgICByZXR1cm4gZDNGb3JtYXQuZm9ybWF0UHJlZml4KHNwZWNpZmllciwgdmFsdWUpO1xuICAgICAgfVxuICAgICAgY2FzZSBcIlwiOlxuICAgICAgY2FzZSBcImVcIjpcbiAgICAgIGNhc2UgXCJnXCI6XG4gICAgICBjYXNlIFwicFwiOlxuICAgICAgY2FzZSBcInJcIjoge1xuICAgICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBkM0Zvcm1hdC5wcmVjaXNpb25Sb3VuZChzdGVwLCBNYXRoLm1heChNYXRoLmFicyhzdGFydCksIE1hdGguYWJzKHN0b3ApKSkpKSBzcGVjaWZpZXIucHJlY2lzaW9uID0gcHJlY2lzaW9uIC0gKHNwZWNpZmllci50eXBlID09PSBcImVcIik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSBcImZcIjpcbiAgICAgIGNhc2UgXCIlXCI6IHtcbiAgICAgICAgaWYgKHNwZWNpZmllci5wcmVjaXNpb24gPT0gbnVsbCAmJiAhaXNOYU4ocHJlY2lzaW9uID0gZDNGb3JtYXQucHJlY2lzaW9uRml4ZWQoc3RlcCkpKSBzcGVjaWZpZXIucHJlY2lzaW9uID0gcHJlY2lzaW9uIC0gKHNwZWNpZmllci50eXBlID09PSBcIiVcIikgKiAyO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGQzRm9ybWF0LmZvcm1hdChzcGVjaWZpZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gbGluZWFyaXNoKHNjYWxlKSB7XG4gICAgdmFyIGRvbWFpbiA9IHNjYWxlLmRvbWFpbjtcblxuICAgIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oY291bnQpIHtcbiAgICAgIHZhciBkID0gZG9tYWluKCk7XG4gICAgICByZXR1cm4gZDNBcnJheS50aWNrcyhkWzBdLCBkW2QubGVuZ3RoIC0gMV0sIGNvdW50ID09IG51bGwgPyAxMCA6IGNvdW50KTtcbiAgICB9O1xuXG4gICAgc2NhbGUudGlja0Zvcm1hdCA9IGZ1bmN0aW9uKGNvdW50LCBzcGVjaWZpZXIpIHtcbiAgICAgIHJldHVybiB0aWNrRm9ybWF0KGRvbWFpbigpLCBjb3VudCwgc3BlY2lmaWVyKTtcbiAgICB9O1xuXG4gICAgc2NhbGUubmljZSA9IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgICB2YXIgZCA9IGRvbWFpbigpLFxuICAgICAgICAgIGkgPSBkLmxlbmd0aCAtIDEsXG4gICAgICAgICAgbiA9IGNvdW50ID09IG51bGwgPyAxMCA6IGNvdW50LFxuICAgICAgICAgIHN0YXJ0ID0gZFswXSxcbiAgICAgICAgICBzdG9wID0gZFtpXSxcbiAgICAgICAgICBzdGVwID0gZDNBcnJheS50aWNrU3RlcChzdGFydCwgc3RvcCwgbik7XG5cbiAgICAgIGlmIChzdGVwKSB7XG4gICAgICAgIHN0ZXAgPSBkM0FycmF5LnRpY2tTdGVwKE1hdGguZmxvb3Ioc3RhcnQgLyBzdGVwKSAqIHN0ZXAsIE1hdGguY2VpbChzdG9wIC8gc3RlcCkgKiBzdGVwLCBuKTtcbiAgICAgICAgZFswXSA9IE1hdGguZmxvb3Ioc3RhcnQgLyBzdGVwKSAqIHN0ZXA7XG4gICAgICAgIGRbaV0gPSBNYXRoLmNlaWwoc3RvcCAvIHN0ZXApICogc3RlcDtcbiAgICAgICAgZG9tYWluKGQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2NhbGU7XG4gICAgfTtcblxuICAgIHJldHVybiBzY2FsZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxpbmVhcigpIHtcbiAgICB2YXIgc2NhbGUgPSBjb250aW51b3VzKGRlaW50ZXJwb2xhdGUsIGQzSW50ZXJwb2xhdGUuaW50ZXJwb2xhdGVOdW1iZXIpO1xuXG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNvcHkoc2NhbGUsIGxpbmVhcigpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGxpbmVhcmlzaChzY2FsZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpZGVudGl0eSgpIHtcbiAgICB2YXIgZG9tYWluID0gWzAsIDFdO1xuXG4gICAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgICAgcmV0dXJuICt4O1xuICAgIH1cblxuICAgIHNjYWxlLmludmVydCA9IHNjYWxlO1xuXG4gICAgc2NhbGUuZG9tYWluID0gc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4gPSBtYXAkMS5jYWxsKF8sIG51bWJlciksIHNjYWxlKSA6IGRvbWFpbi5zbGljZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaWRlbnRpdHkoKS5kb21haW4oZG9tYWluKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGxpbmVhcmlzaChzY2FsZSk7XG4gIH1cblxuICBmdW5jdGlvbiBuaWNlKGRvbWFpbiwgaW50ZXJ2YWwpIHtcbiAgICBkb21haW4gPSBkb21haW4uc2xpY2UoKTtcblxuICAgIHZhciBpMCA9IDAsXG4gICAgICAgIGkxID0gZG9tYWluLmxlbmd0aCAtIDEsXG4gICAgICAgIHgwID0gZG9tYWluW2kwXSxcbiAgICAgICAgeDEgPSBkb21haW5baTFdLFxuICAgICAgICB0O1xuXG4gICAgaWYgKHgxIDwgeDApIHtcbiAgICAgIHQgPSBpMCwgaTAgPSBpMSwgaTEgPSB0O1xuICAgICAgdCA9IHgwLCB4MCA9IHgxLCB4MSA9IHQ7XG4gICAgfVxuXG4gICAgZG9tYWluW2kwXSA9IGludGVydmFsLmZsb29yKHgwKTtcbiAgICBkb21haW5baTFdID0gaW50ZXJ2YWwuY2VpbCh4MSk7XG4gICAgcmV0dXJuIGRvbWFpbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlaW50ZXJwb2xhdGUkMShhLCBiKSB7XG4gICAgcmV0dXJuIChiID0gTWF0aC5sb2coYiAvIGEpKVxuICAgICAgICA/IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgubG9nKHggLyBhKSAvIGI7IH1cbiAgICAgICAgOiBjb25zdGFudChiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlaW50ZXJwb2xhdGUoYSwgYikge1xuICAgIHJldHVybiBhIDwgMFxuICAgICAgICA/IGZ1bmN0aW9uKHQpIHsgcmV0dXJuIC1NYXRoLnBvdygtYiwgdCkgKiBNYXRoLnBvdygtYSwgMSAtIHQpOyB9XG4gICAgICAgIDogZnVuY3Rpb24odCkgeyByZXR1cm4gTWF0aC5wb3coYiwgdCkgKiBNYXRoLnBvdyhhLCAxIC0gdCk7IH07XG4gIH1cblxuICBmdW5jdGlvbiBwb3cxMCh4KSB7XG4gICAgcmV0dXJuIGlzRmluaXRlKHgpID8gKyhcIjFlXCIgKyB4KSA6IHggPCAwID8gMCA6IHg7XG4gIH1cblxuICBmdW5jdGlvbiBwb3dwKGJhc2UpIHtcbiAgICByZXR1cm4gYmFzZSA9PT0gMTAgPyBwb3cxMFxuICAgICAgICA6IGJhc2UgPT09IE1hdGguRSA/IE1hdGguZXhwXG4gICAgICAgIDogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5wb3coYmFzZSwgeCk7IH07XG4gIH1cblxuICBmdW5jdGlvbiBsb2dwKGJhc2UpIHtcbiAgICByZXR1cm4gYmFzZSA9PT0gTWF0aC5FID8gTWF0aC5sb2dcbiAgICAgICAgOiBiYXNlID09PSAxMCAmJiBNYXRoLmxvZzEwXG4gICAgICAgIHx8IGJhc2UgPT09IDIgJiYgTWF0aC5sb2cyXG4gICAgICAgIHx8IChiYXNlID0gTWF0aC5sb2coYmFzZSksIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgubG9nKHgpIC8gYmFzZTsgfSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWZsZWN0KGYpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIC1mKC14KTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbG9nKCkge1xuICAgIHZhciBzY2FsZSA9IGNvbnRpbnVvdXMoZGVpbnRlcnBvbGF0ZSQxLCByZWludGVycG9sYXRlKS5kb21haW4oWzEsIDEwXSksXG4gICAgICAgIGRvbWFpbiA9IHNjYWxlLmRvbWFpbixcbiAgICAgICAgYmFzZSA9IDEwLFxuICAgICAgICBsb2dzID0gbG9ncCgxMCksXG4gICAgICAgIHBvd3MgPSBwb3dwKDEwKTtcblxuICAgIGZ1bmN0aW9uIHJlc2NhbGUoKSB7XG4gICAgICBsb2dzID0gbG9ncChiYXNlKSwgcG93cyA9IHBvd3AoYmFzZSk7XG4gICAgICBpZiAoZG9tYWluKClbMF0gPCAwKSBsb2dzID0gcmVmbGVjdChsb2dzKSwgcG93cyA9IHJlZmxlY3QocG93cyk7XG4gICAgICByZXR1cm4gc2NhbGU7XG4gICAgfVxuXG4gICAgc2NhbGUuYmFzZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGJhc2UgPSArXywgcmVzY2FsZSgpKSA6IGJhc2U7XG4gICAgfTtcblxuICAgIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRvbWFpbihfKSwgcmVzY2FsZSgpKSA6IGRvbWFpbigpO1xuICAgIH07XG5cbiAgICBzY2FsZS50aWNrcyA9IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgICB2YXIgZCA9IGRvbWFpbigpLFxuICAgICAgICAgIHUgPSBkWzBdLFxuICAgICAgICAgIHYgPSBkW2QubGVuZ3RoIC0gMV0sXG4gICAgICAgICAgcjtcblxuICAgICAgaWYgKHIgPSB2IDwgdSkgaSA9IHUsIHUgPSB2LCB2ID0gaTtcblxuICAgICAgdmFyIGkgPSBsb2dzKHUpLFxuICAgICAgICAgIGogPSBsb2dzKHYpLFxuICAgICAgICAgIHAsXG4gICAgICAgICAgayxcbiAgICAgICAgICB0LFxuICAgICAgICAgIG4gPSBjb3VudCA9PSBudWxsID8gMTAgOiArY291bnQsXG4gICAgICAgICAgeiA9IFtdO1xuXG4gICAgICBpZiAoIShiYXNlICUgMSkgJiYgaiAtIGkgPCBuKSB7XG4gICAgICAgIGkgPSBNYXRoLnJvdW5kKGkpIC0gMSwgaiA9IE1hdGgucm91bmQoaikgKyAxO1xuICAgICAgICBpZiAodSA+IDApIGZvciAoOyBpIDwgajsgKytpKSB7XG4gICAgICAgICAgZm9yIChrID0gMSwgcCA9IHBvd3MoaSk7IGsgPCBiYXNlOyArK2spIHtcbiAgICAgICAgICAgIHQgPSBwICogaztcbiAgICAgICAgICAgIGlmICh0IDwgdSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAodCA+IHYpIGJyZWFrO1xuICAgICAgICAgICAgei5wdXNoKHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGZvciAoOyBpIDwgajsgKytpKSB7XG4gICAgICAgICAgZm9yIChrID0gYmFzZSAtIDEsIHAgPSBwb3dzKGkpOyBrID49IDE7IC0taykge1xuICAgICAgICAgICAgdCA9IHAgKiBrO1xuICAgICAgICAgICAgaWYgKHQgPCB1KSBjb250aW51ZTtcbiAgICAgICAgICAgIGlmICh0ID4gdikgYnJlYWs7XG4gICAgICAgICAgICB6LnB1c2godCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB6ID0gZDNBcnJheS50aWNrcyhpLCBqLCBNYXRoLm1pbihqIC0gaSwgbikpLm1hcChwb3dzKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHIgPyB6LnJldmVyc2UoKSA6IHo7XG4gICAgfTtcblxuICAgIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihjb3VudCwgc3BlY2lmaWVyKSB7XG4gICAgICBpZiAoc3BlY2lmaWVyID09IG51bGwpIHNwZWNpZmllciA9IGJhc2UgPT09IDEwID8gXCIuMGVcIiA6IFwiLFwiO1xuICAgICAgaWYgKHR5cGVvZiBzcGVjaWZpZXIgIT09IFwiZnVuY3Rpb25cIikgc3BlY2lmaWVyID0gZDNGb3JtYXQuZm9ybWF0KHNwZWNpZmllcik7XG4gICAgICBpZiAoY291bnQgPT09IEluZmluaXR5KSByZXR1cm4gc3BlY2lmaWVyO1xuICAgICAgaWYgKGNvdW50ID09IG51bGwpIGNvdW50ID0gMTA7XG4gICAgICB2YXIgayA9IE1hdGgubWF4KDEsIGJhc2UgKiBjb3VudCAvIHNjYWxlLnRpY2tzKCkubGVuZ3RoKTsgLy8gVE9ETyBmYXN0IGVzdGltYXRlP1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdmFyIGkgPSBkIC8gcG93cyhNYXRoLnJvdW5kKGxvZ3MoZCkpKTtcbiAgICAgICAgaWYgKGkgKiBiYXNlIDwgYmFzZSAtIDAuNSkgaSAqPSBiYXNlO1xuICAgICAgICByZXR1cm4gaSA8PSBrID8gc3BlY2lmaWVyKGQpIDogXCJcIjtcbiAgICAgIH07XG4gICAgfTtcblxuICAgIHNjYWxlLm5pY2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkb21haW4obmljZShkb21haW4oKSwge1xuICAgICAgICBmbG9vcjogZnVuY3Rpb24oeCkgeyByZXR1cm4gcG93cyhNYXRoLmZsb29yKGxvZ3MoeCkpKTsgfSxcbiAgICAgICAgY2VpbDogZnVuY3Rpb24oeCkgeyByZXR1cm4gcG93cyhNYXRoLmNlaWwobG9ncyh4KSkpOyB9XG4gICAgICB9KSk7XG4gICAgfTtcblxuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBjb3B5KHNjYWxlLCBsb2coKS5iYXNlKGJhc2UpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmFpc2UoeCwgZXhwb25lbnQpIHtcbiAgICByZXR1cm4geCA8IDAgPyAtTWF0aC5wb3coLXgsIGV4cG9uZW50KSA6IE1hdGgucG93KHgsIGV4cG9uZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBvdygpIHtcbiAgICB2YXIgZXhwb25lbnQgPSAxLFxuICAgICAgICBzY2FsZSA9IGNvbnRpbnVvdXMoZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSksXG4gICAgICAgIGRvbWFpbiA9IHNjYWxlLmRvbWFpbjtcblxuICAgIGZ1bmN0aW9uIGRlaW50ZXJwb2xhdGUoYSwgYikge1xuICAgICAgcmV0dXJuIChiID0gcmFpc2UoYiwgZXhwb25lbnQpIC0gKGEgPSByYWlzZShhLCBleHBvbmVudCkpKVxuICAgICAgICAgID8gZnVuY3Rpb24oeCkgeyByZXR1cm4gKHJhaXNlKHgsIGV4cG9uZW50KSAtIGEpIC8gYjsgfVxuICAgICAgICAgIDogY29uc3RhbnQoYik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVpbnRlcnBvbGF0ZShhLCBiKSB7XG4gICAgICBiID0gcmFpc2UoYiwgZXhwb25lbnQpIC0gKGEgPSByYWlzZShhLCBleHBvbmVudCkpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHsgcmV0dXJuIHJhaXNlKGEgKyBiICogdCwgMSAvIGV4cG9uZW50KTsgfTtcbiAgICB9XG5cbiAgICBzY2FsZS5leHBvbmVudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGV4cG9uZW50ID0gK18sIGRvbWFpbihkb21haW4oKSkpIDogZXhwb25lbnQ7XG4gICAgfTtcblxuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBjb3B5KHNjYWxlLCBwb3coKS5leHBvbmVudChleHBvbmVudCkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gbGluZWFyaXNoKHNjYWxlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNxcnQoKSB7XG4gICAgcmV0dXJuIHBvdygpLmV4cG9uZW50KDAuNSk7XG4gIH1cblxuICBmdW5jdGlvbiBxdWFudGlsZSQxKCkge1xuICAgIHZhciBkb21haW4gPSBbXSxcbiAgICAgICAgcmFuZ2UgPSBbXSxcbiAgICAgICAgdGhyZXNob2xkcyA9IFtdO1xuXG4gICAgZnVuY3Rpb24gcmVzY2FsZSgpIHtcbiAgICAgIHZhciBpID0gMCwgbiA9IE1hdGgubWF4KDEsIHJhbmdlLmxlbmd0aCk7XG4gICAgICB0aHJlc2hvbGRzID0gbmV3IEFycmF5KG4gLSAxKTtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSB0aHJlc2hvbGRzW2kgLSAxXSA9IGQzQXJyYXkucXVhbnRpbGUoZG9tYWluLCBpIC8gbik7XG4gICAgICByZXR1cm4gc2NhbGU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgICAgaWYgKCFpc05hTih4ID0gK3gpKSByZXR1cm4gcmFuZ2VbZDNBcnJheS5iaXNlY3QodGhyZXNob2xkcywgeCldO1xuICAgIH1cblxuICAgIHNjYWxlLmludmVydEV4dGVudCA9IGZ1bmN0aW9uKHkpIHtcbiAgICAgIHZhciBpID0gcmFuZ2UuaW5kZXhPZih5KTtcbiAgICAgIHJldHVybiBpIDwgMCA/IFtOYU4sIE5hTl0gOiBbXG4gICAgICAgIGkgPiAwID8gdGhyZXNob2xkc1tpIC0gMV0gOiBkb21haW5bMF0sXG4gICAgICAgIGkgPCB0aHJlc2hvbGRzLmxlbmd0aCA/IHRocmVzaG9sZHNbaV0gOiBkb21haW5bZG9tYWluLmxlbmd0aCAtIDFdXG4gICAgICBdO1xuICAgIH07XG5cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkb21haW4uc2xpY2UoKTtcbiAgICAgIGRvbWFpbiA9IFtdO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBfLmxlbmd0aCwgZDsgaSA8IG47ICsraSkgaWYgKGQgPSBfW2ldLCBkICE9IG51bGwgJiYgIWlzTmFOKGQgPSArZCkpIGRvbWFpbi5wdXNoKGQpO1xuICAgICAgZG9tYWluLnNvcnQoZDNBcnJheS5hc2NlbmRpbmcpO1xuICAgICAgcmV0dXJuIHJlc2NhbGUoKTtcbiAgICB9O1xuXG4gICAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyYW5nZSA9IHNsaWNlLmNhbGwoXyksIHJlc2NhbGUoKSkgOiByYW5nZS5zbGljZSgpO1xuICAgIH07XG5cbiAgICBzY2FsZS5xdWFudGlsZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aHJlc2hvbGRzLnNsaWNlKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBxdWFudGlsZSQxKClcbiAgICAgICAgICAuZG9tYWluKGRvbWFpbilcbiAgICAgICAgICAucmFuZ2UocmFuZ2UpO1xuICAgIH07XG5cbiAgICByZXR1cm4gc2NhbGU7XG4gIH1cblxuICBmdW5jdGlvbiBxdWFudGl6ZSgpIHtcbiAgICB2YXIgeDAgPSAwLFxuICAgICAgICB4MSA9IDEsXG4gICAgICAgIG4gPSAxLFxuICAgICAgICBkb21haW4gPSBbMC41XSxcbiAgICAgICAgcmFuZ2UgPSBbMCwgMV07XG5cbiAgICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgICBpZiAoeCA8PSB4KSByZXR1cm4gcmFuZ2VbZDNBcnJheS5iaXNlY3QoZG9tYWluLCB4LCAwLCBuKV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzY2FsZSgpIHtcbiAgICAgIHZhciBpID0gLTE7XG4gICAgICBkb21haW4gPSBuZXcgQXJyYXkobik7XG4gICAgICB3aGlsZSAoKytpIDwgbikgZG9tYWluW2ldID0gKChpICsgMSkgKiB4MSAtIChpIC0gbikgKiB4MCkgLyAobiArIDEpO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH1cblxuICAgIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgwID0gK19bMF0sIHgxID0gK19bMV0sIHJlc2NhbGUoKSkgOiBbeDAsIHgxXTtcbiAgICB9O1xuXG4gICAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChuID0gKHJhbmdlID0gc2xpY2UuY2FsbChfKSkubGVuZ3RoIC0gMSwgcmVzY2FsZSgpKSA6IHJhbmdlLnNsaWNlKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLmludmVydEV4dGVudCA9IGZ1bmN0aW9uKHkpIHtcbiAgICAgIHZhciBpID0gcmFuZ2UuaW5kZXhPZih5KTtcbiAgICAgIHJldHVybiBpIDwgMCA/IFtOYU4sIE5hTl1cbiAgICAgICAgICA6IGkgPCAxID8gW3gwLCBkb21haW5bMF1dXG4gICAgICAgICAgOiBpID49IG4gPyBbZG9tYWluW24gLSAxXSwgeDFdXG4gICAgICAgICAgOiBbZG9tYWluW2kgLSAxXSwgZG9tYWluW2ldXTtcbiAgICB9O1xuXG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHF1YW50aXplKClcbiAgICAgICAgICAuZG9tYWluKFt4MCwgeDFdKVxuICAgICAgICAgIC5yYW5nZShyYW5nZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBsaW5lYXJpc2goc2NhbGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGhyZXNob2xkKCkge1xuICAgIHZhciBkb21haW4gPSBbMC41XSxcbiAgICAgICAgcmFuZ2UgPSBbMCwgMV0sXG4gICAgICAgIG4gPSAxO1xuXG4gICAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgICAgaWYgKHggPD0geCkgcmV0dXJuIHJhbmdlW2QzQXJyYXkuYmlzZWN0KGRvbWFpbiwgeCwgMCwgbildO1xuICAgIH1cblxuICAgIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRvbWFpbiA9IHNsaWNlLmNhbGwoXyksIG4gPSBNYXRoLm1pbihkb21haW4ubGVuZ3RoLCByYW5nZS5sZW5ndGggLSAxKSwgc2NhbGUpIDogZG9tYWluLnNsaWNlKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBzbGljZS5jYWxsKF8pLCBuID0gTWF0aC5taW4oZG9tYWluLmxlbmd0aCwgcmFuZ2UubGVuZ3RoIC0gMSksIHNjYWxlKSA6IHJhbmdlLnNsaWNlKCk7XG4gICAgfTtcblxuICAgIHNjYWxlLmludmVydEV4dGVudCA9IGZ1bmN0aW9uKHkpIHtcbiAgICAgIHZhciBpID0gcmFuZ2UuaW5kZXhPZih5KTtcbiAgICAgIHJldHVybiBbZG9tYWluW2kgLSAxXSwgZG9tYWluW2ldXTtcbiAgICB9O1xuXG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRocmVzaG9sZCgpXG4gICAgICAgICAgLmRvbWFpbihkb21haW4pXG4gICAgICAgICAgLnJhbmdlKHJhbmdlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9XG5cbiAgdmFyIGR1cmF0aW9uU2Vjb25kID0gMTAwMDtcbiAgdmFyIGR1cmF0aW9uTWludXRlID0gZHVyYXRpb25TZWNvbmQgKiA2MDtcbiAgdmFyIGR1cmF0aW9uSG91ciA9IGR1cmF0aW9uTWludXRlICogNjA7XG4gIHZhciBkdXJhdGlvbkRheSA9IGR1cmF0aW9uSG91ciAqIDI0O1xuICB2YXIgZHVyYXRpb25XZWVrID0gZHVyYXRpb25EYXkgKiA3O1xuICB2YXIgZHVyYXRpb25Nb250aCA9IGR1cmF0aW9uRGF5ICogMzA7XG4gIHZhciBkdXJhdGlvblllYXIgPSBkdXJhdGlvbkRheSAqIDM2NTtcbiAgZnVuY3Rpb24gZGF0ZSh0KSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHQpO1xuICB9XG5cbiAgZnVuY3Rpb24gbnVtYmVyJDEodCkge1xuICAgIHJldHVybiB0IGluc3RhbmNlb2YgRGF0ZSA/ICt0IDogK25ldyBEYXRlKCt0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGVuZGFyKHllYXIsIG1vbnRoLCB3ZWVrLCBkYXksIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtaWxsaXNlY29uZCwgZm9ybWF0KSB7XG4gICAgdmFyIHNjYWxlID0gY29udGludW91cyhkZWludGVycG9sYXRlLCBkM0ludGVycG9sYXRlLmludGVycG9sYXRlTnVtYmVyKSxcbiAgICAgICAgaW52ZXJ0ID0gc2NhbGUuaW52ZXJ0LFxuICAgICAgICBkb21haW4gPSBzY2FsZS5kb21haW47XG5cbiAgICB2YXIgZm9ybWF0TWlsbGlzZWNvbmQgPSBmb3JtYXQoXCIuJUxcIiksXG4gICAgICAgIGZvcm1hdFNlY29uZCA9IGZvcm1hdChcIjolU1wiKSxcbiAgICAgICAgZm9ybWF0TWludXRlID0gZm9ybWF0KFwiJUk6JU1cIiksXG4gICAgICAgIGZvcm1hdEhvdXIgPSBmb3JtYXQoXCIlSSAlcFwiKSxcbiAgICAgICAgZm9ybWF0RGF5ID0gZm9ybWF0KFwiJWEgJWRcIiksXG4gICAgICAgIGZvcm1hdFdlZWsgPSBmb3JtYXQoXCIlYiAlZFwiKSxcbiAgICAgICAgZm9ybWF0TW9udGggPSBmb3JtYXQoXCIlQlwiKSxcbiAgICAgICAgZm9ybWF0WWVhciA9IGZvcm1hdChcIiVZXCIpO1xuXG4gICAgdmFyIHRpY2tJbnRlcnZhbHMgPSBbXG4gICAgICBbc2Vjb25kLCAgMSwgICAgICBkdXJhdGlvblNlY29uZF0sXG4gICAgICBbc2Vjb25kLCAgNSwgIDUgKiBkdXJhdGlvblNlY29uZF0sXG4gICAgICBbc2Vjb25kLCAxNSwgMTUgKiBkdXJhdGlvblNlY29uZF0sXG4gICAgICBbc2Vjb25kLCAzMCwgMzAgKiBkdXJhdGlvblNlY29uZF0sXG4gICAgICBbbWludXRlLCAgMSwgICAgICBkdXJhdGlvbk1pbnV0ZV0sXG4gICAgICBbbWludXRlLCAgNSwgIDUgKiBkdXJhdGlvbk1pbnV0ZV0sXG4gICAgICBbbWludXRlLCAxNSwgMTUgKiBkdXJhdGlvbk1pbnV0ZV0sXG4gICAgICBbbWludXRlLCAzMCwgMzAgKiBkdXJhdGlvbk1pbnV0ZV0sXG4gICAgICBbICBob3VyLCAgMSwgICAgICBkdXJhdGlvbkhvdXIgIF0sXG4gICAgICBbICBob3VyLCAgMywgIDMgKiBkdXJhdGlvbkhvdXIgIF0sXG4gICAgICBbICBob3VyLCAgNiwgIDYgKiBkdXJhdGlvbkhvdXIgIF0sXG4gICAgICBbICBob3VyLCAxMiwgMTIgKiBkdXJhdGlvbkhvdXIgIF0sXG4gICAgICBbICAgZGF5LCAgMSwgICAgICBkdXJhdGlvbkRheSAgIF0sXG4gICAgICBbICAgZGF5LCAgMiwgIDIgKiBkdXJhdGlvbkRheSAgIF0sXG4gICAgICBbICB3ZWVrLCAgMSwgICAgICBkdXJhdGlvbldlZWsgIF0sXG4gICAgICBbIG1vbnRoLCAgMSwgICAgICBkdXJhdGlvbk1vbnRoIF0sXG4gICAgICBbIG1vbnRoLCAgMywgIDMgKiBkdXJhdGlvbk1vbnRoIF0sXG4gICAgICBbICB5ZWFyLCAgMSwgICAgICBkdXJhdGlvblllYXIgIF1cbiAgICBdO1xuXG4gICAgZnVuY3Rpb24gdGlja0Zvcm1hdChkYXRlKSB7XG4gICAgICByZXR1cm4gKHNlY29uZChkYXRlKSA8IGRhdGUgPyBmb3JtYXRNaWxsaXNlY29uZFxuICAgICAgICAgIDogbWludXRlKGRhdGUpIDwgZGF0ZSA/IGZvcm1hdFNlY29uZFxuICAgICAgICAgIDogaG91cihkYXRlKSA8IGRhdGUgPyBmb3JtYXRNaW51dGVcbiAgICAgICAgICA6IGRheShkYXRlKSA8IGRhdGUgPyBmb3JtYXRIb3VyXG4gICAgICAgICAgOiBtb250aChkYXRlKSA8IGRhdGUgPyAod2VlayhkYXRlKSA8IGRhdGUgPyBmb3JtYXREYXkgOiBmb3JtYXRXZWVrKVxuICAgICAgICAgIDogeWVhcihkYXRlKSA8IGRhdGUgPyBmb3JtYXRNb250aFxuICAgICAgICAgIDogZm9ybWF0WWVhcikoZGF0ZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGlja0ludGVydmFsKGludGVydmFsLCBzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgICAgaWYgKGludGVydmFsID09IG51bGwpIGludGVydmFsID0gMTA7XG5cbiAgICAgIC8vIElmIGEgZGVzaXJlZCB0aWNrIGNvdW50IGlzIHNwZWNpZmllZCwgcGljayBhIHJlYXNvbmFibGUgdGljayBpbnRlcnZhbFxuICAgICAgLy8gYmFzZWQgb24gdGhlIGV4dGVudCBvZiB0aGUgZG9tYWluIGFuZCBhIHJvdWdoIGVzdGltYXRlIG9mIHRpY2sgc2l6ZS5cbiAgICAgIC8vIE90aGVyd2lzZSwgYXNzdW1lIGludGVydmFsIGlzIGFscmVhZHkgYSB0aW1lIGludGVydmFsIGFuZCB1c2UgaXQuXG4gICAgICBpZiAodHlwZW9mIGludGVydmFsID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBNYXRoLmFicyhzdG9wIC0gc3RhcnQpIC8gaW50ZXJ2YWwsXG4gICAgICAgICAgICBpID0gZDNBcnJheS5iaXNlY3RvcihmdW5jdGlvbihpKSB7IHJldHVybiBpWzJdOyB9KS5yaWdodCh0aWNrSW50ZXJ2YWxzLCB0YXJnZXQpO1xuICAgICAgICBpZiAoaSA9PT0gdGlja0ludGVydmFscy5sZW5ndGgpIHtcbiAgICAgICAgICBzdGVwID0gZDNBcnJheS50aWNrU3RlcChzdGFydCAvIGR1cmF0aW9uWWVhciwgc3RvcCAvIGR1cmF0aW9uWWVhciwgaW50ZXJ2YWwpO1xuICAgICAgICAgIGludGVydmFsID0geWVhcjtcbiAgICAgICAgfSBlbHNlIGlmIChpKSB7XG4gICAgICAgICAgaSA9IHRpY2tJbnRlcnZhbHNbdGFyZ2V0IC8gdGlja0ludGVydmFsc1tpIC0gMV1bMl0gPCB0aWNrSW50ZXJ2YWxzW2ldWzJdIC8gdGFyZ2V0ID8gaSAtIDEgOiBpXTtcbiAgICAgICAgICBzdGVwID0gaVsxXTtcbiAgICAgICAgICBpbnRlcnZhbCA9IGlbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RlcCA9IGQzQXJyYXkudGlja1N0ZXAoc3RhcnQsIHN0b3AsIGludGVydmFsKTtcbiAgICAgICAgICBpbnRlcnZhbCA9IG1pbGxpc2Vjb25kO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdGVwID09IG51bGwgPyBpbnRlcnZhbCA6IGludGVydmFsLmV2ZXJ5KHN0ZXApO1xuICAgIH1cblxuICAgIHNjYWxlLmludmVydCA9IGZ1bmN0aW9uKHkpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZShpbnZlcnQoeSkpO1xuICAgIH07XG5cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IGRvbWFpbihtYXAkMS5jYWxsKF8sIG51bWJlciQxKSkgOiBkb21haW4oKS5tYXAoZGF0ZSk7XG4gICAgfTtcblxuICAgIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oaW50ZXJ2YWwsIHN0ZXApIHtcbiAgICAgIHZhciBkID0gZG9tYWluKCksXG4gICAgICAgICAgdDAgPSBkWzBdLFxuICAgICAgICAgIHQxID0gZFtkLmxlbmd0aCAtIDFdLFxuICAgICAgICAgIHIgPSB0MSA8IHQwLFxuICAgICAgICAgIHQ7XG4gICAgICBpZiAocikgdCA9IHQwLCB0MCA9IHQxLCB0MSA9IHQ7XG4gICAgICB0ID0gdGlja0ludGVydmFsKGludGVydmFsLCB0MCwgdDEsIHN0ZXApO1xuICAgICAgdCA9IHQgPyB0LnJhbmdlKHQwLCB0MSArIDEpIDogW107IC8vIGluY2x1c2l2ZSBzdG9wXG4gICAgICByZXR1cm4gciA/IHQucmV2ZXJzZSgpIDogdDtcbiAgICB9O1xuXG4gICAgc2NhbGUudGlja0Zvcm1hdCA9IGZ1bmN0aW9uKGNvdW50LCBzcGVjaWZpZXIpIHtcbiAgICAgIHJldHVybiBzcGVjaWZpZXIgPT0gbnVsbCA/IHRpY2tGb3JtYXQgOiBmb3JtYXQoc3BlY2lmaWVyKTtcbiAgICB9O1xuXG4gICAgc2NhbGUubmljZSA9IGZ1bmN0aW9uKGludGVydmFsLCBzdGVwKSB7XG4gICAgICB2YXIgZCA9IGRvbWFpbigpO1xuICAgICAgcmV0dXJuIChpbnRlcnZhbCA9IHRpY2tJbnRlcnZhbChpbnRlcnZhbCwgZFswXSwgZFtkLmxlbmd0aCAtIDFdLCBzdGVwKSlcbiAgICAgICAgICA/IGRvbWFpbihuaWNlKGQsIGludGVydmFsKSlcbiAgICAgICAgICA6IHNjYWxlO1xuICAgIH07XG5cbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gY29weShzY2FsZSwgY2FsZW5kYXIoeWVhciwgbW9udGgsIHdlZWssIGRheSwgaG91ciwgbWludXRlLCBzZWNvbmQsIG1pbGxpc2Vjb25kLCBmb3JtYXQpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9XG5cbiAgZnVuY3Rpb24gdGltZSgpIHtcbiAgICByZXR1cm4gY2FsZW5kYXIoZDNUaW1lLnRpbWVZZWFyLCBkM1RpbWUudGltZU1vbnRoLCBkM1RpbWUudGltZVdlZWssIGQzVGltZS50aW1lRGF5LCBkM1RpbWUudGltZUhvdXIsIGQzVGltZS50aW1lTWludXRlLCBkM1RpbWUudGltZVNlY29uZCwgZDNUaW1lLnRpbWVNaWxsaXNlY29uZCwgZDNUaW1lRm9ybWF0LnRpbWVGb3JtYXQpLmRvbWFpbihbbmV3IERhdGUoMjAwMCwgMCwgMSksIG5ldyBEYXRlKDIwMDAsIDAsIDIpXSk7XG4gIH1cblxuICBmdW5jdGlvbiB1dGNUaW1lKCkge1xuICAgIHJldHVybiBjYWxlbmRhcihkM1RpbWUudXRjWWVhciwgZDNUaW1lLnV0Y01vbnRoLCBkM1RpbWUudXRjV2VlaywgZDNUaW1lLnV0Y0RheSwgZDNUaW1lLnV0Y0hvdXIsIGQzVGltZS51dGNNaW51dGUsIGQzVGltZS51dGNTZWNvbmQsIGQzVGltZS51dGNNaWxsaXNlY29uZCwgZDNUaW1lRm9ybWF0LnV0Y0Zvcm1hdCkuZG9tYWluKFtEYXRlLlVUQygyMDAwLCAwLCAxKSwgRGF0ZS5VVEMoMjAwMCwgMCwgMildKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbG9ycyhzKSB7XG4gICAgcmV0dXJuIHMubWF0Y2goLy57Nn0vZykubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiBcIiNcIiArIHg7XG4gICAgfSk7XG4gIH1cblxuICB2YXIgY2F0ZWdvcnkxMCA9IGNvbG9ycyhcIjFmNzdiNGZmN2YwZTJjYTAyY2Q2MjcyODk0NjdiZDhjNTY0YmUzNzdjMjdmN2Y3ZmJjYmQyMjE3YmVjZlwiKTtcblxuICB2YXIgY2F0ZWdvcnkyMGIgPSBjb2xvcnMoXCIzOTNiNzk1MjU0YTM2YjZlY2Y5YzllZGU2Mzc5Mzk4Y2EyNTJiNWNmNmJjZWRiOWM4YzZkMzFiZDllMzllN2JhNTJlN2NiOTQ4NDNjMzlhZDQ5NGFkNjYxNmJlNzk2OWM3YjQxNzNhNTUxOTRjZTZkYmRkZTllZDZcIik7XG5cbiAgdmFyIGNhdGVnb3J5MjBjID0gY29sb3JzKFwiMzE4MmJkNmJhZWQ2OWVjYWUxYzZkYmVmZTY1NTBkZmQ4ZDNjZmRhZTZiZmRkMGEyMzFhMzU0NzRjNDc2YTFkOTliYzdlOWMwNzU2YmIxOWU5YWM4YmNiZGRjZGFkYWViNjM2MzYzOTY5Njk2YmRiZGJkZDlkOWQ5XCIpO1xuXG4gIHZhciBjYXRlZ29yeTIwID0gY29sb3JzKFwiMWY3N2I0YWVjN2U4ZmY3ZjBlZmZiYjc4MmNhMDJjOThkZjhhZDYyNzI4ZmY5ODk2OTQ2N2JkYzViMGQ1OGM1NjRiYzQ5Yzk0ZTM3N2MyZjdiNmQyN2Y3ZjdmYzdjN2M3YmNiZDIyZGJkYjhkMTdiZWNmOWVkYWU1XCIpO1xuXG4gIHZhciBjdWJlaGVsaXgkMSA9IGQzSW50ZXJwb2xhdGUuaW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nKGQzQ29sb3IuY3ViZWhlbGl4KDMwMCwgMC41LCAwLjApLCBkM0NvbG9yLmN1YmVoZWxpeCgtMjQwLCAwLjUsIDEuMCkpO1xuXG4gIHZhciB3YXJtID0gZDNJbnRlcnBvbGF0ZS5pbnRlcnBvbGF0ZUN1YmVoZWxpeExvbmcoZDNDb2xvci5jdWJlaGVsaXgoLTEwMCwgMC43NSwgMC4zNSksIGQzQ29sb3IuY3ViZWhlbGl4KDgwLCAxLjUwLCAwLjgpKTtcblxuICB2YXIgY29vbCA9IGQzSW50ZXJwb2xhdGUuaW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nKGQzQ29sb3IuY3ViZWhlbGl4KDI2MCwgMC43NSwgMC4zNSksIGQzQ29sb3IuY3ViZWhlbGl4KDgwLCAxLjUwLCAwLjgpKTtcblxuICB2YXIgcmFpbmJvdyA9IGQzQ29sb3IuY3ViZWhlbGl4KCk7XG5cbiAgZnVuY3Rpb24gcmFpbmJvdyQxKHQpIHtcbiAgICBpZiAodCA8IDAgfHwgdCA+IDEpIHQgLT0gTWF0aC5mbG9vcih0KTtcbiAgICB2YXIgdHMgPSBNYXRoLmFicyh0IC0gMC41KTtcbiAgICByYWluYm93LmggPSAzNjAgKiB0IC0gMTAwO1xuICAgIHJhaW5ib3cucyA9IDEuNSAtIDEuNSAqIHRzO1xuICAgIHJhaW5ib3cubCA9IDAuOCAtIDAuOSAqIHRzO1xuICAgIHJldHVybiByYWluYm93ICsgXCJcIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJhbXAocmFuZ2UpIHtcbiAgICB2YXIgbiA9IHJhbmdlLmxlbmd0aDtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIHJhbmdlW01hdGgubWF4KDAsIE1hdGgubWluKG4gLSAxLCBNYXRoLmZsb29yKHQgKiBuKSkpXTtcbiAgICB9O1xuICB9XG5cbiAgdmFyIHZpcmlkaXMgPSByYW1wKGNvbG9ycyhcIjQ0MDE1NDQ0MDI1NjQ1MDQ1NzQ1MDU1OTQ2MDc1YTQ2MDg1YzQ2MGE1ZDQ2MGI1ZTQ3MGQ2MDQ3MGU2MTQ3MTA2MzQ3MTE2NDQ3MTM2NTQ4MTQ2NzQ4MTY2ODQ4MTc2OTQ4MTg2YTQ4MWE2YzQ4MWI2ZDQ4MWM2ZTQ4MWQ2ZjQ4MWY3MDQ4MjA3MTQ4MjE3MzQ4MjM3NDQ4MjQ3NTQ4MjU3NjQ4MjY3NzQ4Mjg3ODQ4Mjk3OTQ3MmE3YTQ3MmM3YTQ3MmQ3YjQ3MmU3YzQ3MmY3ZDQ2MzA3ZTQ2MzI3ZTQ2MzM3ZjQ2MzQ4MDQ1MzU4MTQ1Mzc4MTQ1Mzg4MjQ0Mzk4MzQ0M2E4MzQ0M2I4NDQzM2Q4NDQzM2U4NTQyM2Y4NTQyNDA4NjQyNDE4NjQxNDI4NzQxNDQ4NzQwNDU4ODQwNDY4ODNmNDc4ODNmNDg4OTNlNDk4OTNlNGE4OTNlNGM4YTNkNGQ4YTNkNGU4YTNjNGY4YTNjNTA4YjNiNTE4YjNiNTI4YjNhNTM4YjNhNTQ4YzM5NTU4YzM5NTY4YzM4NTg4YzM4NTk4YzM3NWE4YzM3NWI4ZDM2NWM4ZDM2NWQ4ZDM1NWU4ZDM1NWY4ZDM0NjA4ZDM0NjE4ZDMzNjI4ZDMzNjM4ZDMyNjQ4ZTMyNjU4ZTMxNjY4ZTMxNjc4ZTMxNjg4ZTMwNjk4ZTMwNmE4ZTJmNmI4ZTJmNmM4ZTJlNmQ4ZTJlNmU4ZTJlNmY4ZTJkNzA4ZTJkNzE4ZTJjNzE4ZTJjNzI4ZTJjNzM4ZTJiNzQ4ZTJiNzU4ZTJhNzY4ZTJhNzc4ZTJhNzg4ZTI5Nzk4ZTI5N2E4ZTI5N2I4ZTI4N2M4ZTI4N2Q4ZTI3N2U4ZTI3N2Y4ZTI3ODA4ZTI2ODE4ZTI2ODI4ZTI2ODI4ZTI1ODM4ZTI1ODQ4ZTI1ODU4ZTI0ODY4ZTI0ODc4ZTIzODg4ZTIzODk4ZTIzOGE4ZDIyOGI4ZDIyOGM4ZDIyOGQ4ZDIxOGU4ZDIxOGY4ZDIxOTA4ZDIxOTE4YzIwOTI4YzIwOTI4YzIwOTM4YzFmOTQ4YzFmOTU4YjFmOTY4YjFmOTc4YjFmOTg4YjFmOTk4YTFmOWE4YTFlOWI4YTFlOWM4OTFlOWQ4OTFmOWU4OTFmOWY4ODFmYTA4ODFmYTE4ODFmYTE4NzFmYTI4NzIwYTM4NjIwYTQ4NjIxYTU4NTIxYTY4NTIyYTc4NTIyYTg4NDIzYTk4MzI0YWE4MzI1YWI4MjI1YWM4MjI2YWQ4MTI3YWQ4MTI4YWU4MDI5YWY3ZjJhYjA3ZjJjYjE3ZTJkYjI3ZDJlYjM3YzJmYjQ3YzMxYjU3YjMyYjY3YTM0YjY3OTM1Yjc3OTM3Yjg3ODM4Yjk3NzNhYmE3NjNiYmI3NTNkYmM3NDNmYmM3MzQwYmQ3MjQyYmU3MTQ0YmY3MDQ2YzA2ZjQ4YzE2ZTRhYzE2ZDRjYzI2YzRlYzM2YjUwYzQ2YTUyYzU2OTU0YzU2ODU2YzY2NzU4Yzc2NTVhYzg2NDVjYzg2MzVlYzk2MjYwY2E2MDYzY2I1ZjY1Y2I1ZTY3Y2M1YzY5Y2Q1YjZjY2Q1YTZlY2U1ODcwY2Y1NzczZDA1Njc1ZDA1NDc3ZDE1MzdhZDE1MTdjZDI1MDdmZDM0ZTgxZDM0ZDg0ZDQ0Yjg2ZDU0OTg5ZDU0ODhiZDY0NjhlZDY0NTkwZDc0MzkzZDc0MTk1ZDg0MDk4ZDgzZTliZDkzYzlkZDkzYmEwZGEzOWEyZGEzN2E1ZGIzNmE4ZGIzNGFhZGMzMmFkZGMzMGIwZGQyZmIyZGQyZGI1ZGUyYmI4ZGUyOWJhZGUyOGJkZGYyNmMwZGYyNWMyZGYyM2M1ZTAyMWM4ZTAyMGNhZTExZmNkZTExZGQwZTExY2QyZTIxYmQ1ZTIxYWQ4ZTIxOWRhZTMxOWRkZTMxOGRmZTMxOGUyZTQxOGU1ZTQxOWU3ZTQxOWVhZTUxYWVjZTUxYmVmZTUxY2YxZTUxZGY0ZTYxZWY2ZTYyMGY4ZTYyMWZiZTcyM2ZkZTcyNVwiKSk7XG5cbiAgdmFyIG1hZ21hID0gcmFtcChjb2xvcnMoXCIwMDAwMDQwMTAwMDUwMTAxMDYwMTAxMDgwMjAxMDkwMjAyMGIwMjAyMGQwMzAzMGYwMzAzMTIwNDA0MTQwNTA0MTYwNjA1MTgwNjA1MWEwNzA2MWMwODA3MWUwOTA3MjAwYTA4MjIwYjA5MjQwYzA5MjYwZDBhMjkwZTBiMmIxMDBiMmQxMTBjMmYxMjBkMzExMzBkMzQxNDBlMzYxNTBlMzgxNjBmM2IxODBmM2QxOTEwM2YxYTEwNDIxYzEwNDQxZDExNDcxZTExNDkyMDExNGIyMTExNGUyMjExNTAyNDEyNTMyNTEyNTUyNzEyNTgyOTExNWEyYTExNWMyYzExNWYyZDExNjEyZjExNjMzMTExNjUzMzEwNjczNDEwNjkzNjEwNmIzODEwNmMzOTBmNmUzYjBmNzAzZDBmNzEzZjBmNzI0MDBmNzQ0MjBmNzU0NDBmNzY0NTEwNzc0NzEwNzg0OTEwNzg0YTEwNzk0YzExN2E0ZTExN2I0ZjEyN2I1MTEyN2M1MjEzN2M1NDEzN2Q1NjE0N2Q1NzE1N2U1OTE1N2U1YTE2N2U1YzE2N2Y1ZDE3N2Y1ZjE4N2Y2MDE4ODA2MjE5ODA2NDFhODA2NTFhODA2NzFiODA2ODFjODE2YTFjODE2YjFkODE2ZDFkODE2ZTFlODE3MDFmODE3MjFmODE3MzIwODE3NTIxODE3NjIxODE3ODIyODE3OTIyODI3YjIzODI3YzIzODI3ZTI0ODI4MDI1ODI4MTI1ODE4MzI2ODE4NDI2ODE4NjI3ODE4ODI3ODE4OTI4ODE4YjI5ODE4YzI5ODE4ZTJhODE5MDJhODE5MTJiODE5MzJiODA5NDJjODA5NjJjODA5ODJkODA5OTJkODA5YjJlN2Y5YzJlN2Y5ZTJmN2ZhMDJmN2ZhMTMwN2VhMzMwN2VhNTMxN2VhNjMxN2RhODMyN2RhYTMzN2RhYjMzN2NhZDM0N2NhZTM0N2JiMDM1N2JiMjM1N2JiMzM2N2FiNTM2N2FiNzM3NzliODM3NzliYTM4NzhiYzM5NzhiZDM5NzdiZjNhNzdjMDNhNzZjMjNiNzVjNDNjNzVjNTNjNzRjNzNkNzNjODNlNzNjYTNlNzJjYzNmNzFjZDQwNzFjZjQwNzBkMDQxNmZkMjQyNmZkMzQzNmVkNTQ0NmRkNjQ1NmNkODQ1NmNkOTQ2NmJkYjQ3NmFkYzQ4NjlkZTQ5NjhkZjRhNjhlMDRjNjdlMjRkNjZlMzRlNjVlNDRmNjRlNTUwNjRlNzUyNjNlODUzNjJlOTU0NjJlYTU2NjFlYjU3NjBlYzU4NjBlZDVhNWZlZTViNWVlZjVkNWVmMDVmNWVmMTYwNWRmMjYyNWRmMjY0NWNmMzY1NWNmNDY3NWNmNDY5NWNmNTZiNWNmNjZjNWNmNjZlNWNmNzcwNWNmNzcyNWNmODc0NWNmODc2NWNmOTc4NWRmOTc5NWRmOTdiNWRmYTdkNWVmYTdmNWVmYTgxNWZmYjgzNWZmYjg1NjBmYjg3NjFmYzg5NjFmYzhhNjJmYzhjNjNmYzhlNjRmYzkwNjVmZDkyNjZmZDk0NjdmZDk2NjhmZDk4NjlmZDlhNmFmZDliNmJmZTlkNmNmZTlmNmRmZWExNmVmZWEzNmZmZWE1NzFmZWE3NzJmZWE5NzNmZWFhNzRmZWFjNzZmZWFlNzdmZWIwNzhmZWIyN2FmZWI0N2JmZWI2N2NmZWI3N2VmZWI5N2ZmZWJiODFmZWJkODJmZWJmODRmZWMxODVmZWMyODdmZWM0ODhmZWM2OGFmZWM4OGNmZWNhOGRmZWNjOGZmZWNkOTBmZWNmOTJmZWQxOTRmZWQzOTVmZWQ1OTdmZWQ3OTlmZWQ4OWFmZGRhOWNmZGRjOWVmZGRlYTBmZGUwYTFmZGUyYTNmZGUzYTVmZGU1YTdmZGU3YTlmZGU5YWFmZGViYWNmY2VjYWVmY2VlYjBmY2YwYjJmY2YyYjRmY2Y0YjZmY2Y2YjhmY2Y3YjlmY2Y5YmJmY2ZiYmRmY2ZkYmZcIikpO1xuXG4gIHZhciBpbmZlcm5vID0gcmFtcChjb2xvcnMoXCIwMDAwMDQwMTAwMDUwMTAxMDYwMTAxMDgwMjAxMGEwMjAyMGMwMjAyMGUwMzAyMTAwNDAzMTIwNDAzMTQwNTA0MTcwNjA0MTkwNzA1MWIwODA1MWQwOTA2MWYwYTA3MjIwYjA3MjQwYzA4MjYwZDA4MjkwZTA5MmIxMDA5MmQxMTBhMzAxMjBhMzIxNDBiMzQxNTBiMzcxNjBiMzkxODBjM2MxOTBjM2UxYjBjNDExYzBjNDMxZTBjNDUxZjBjNDgyMTBjNGEyMzBjNGMyNDBjNGYyNjBjNTEyODBiNTMyOTBiNTUyYjBiNTcyZDBiNTkyZjBhNWIzMTBhNWMzMjBhNWUzNDBhNWYzNjA5NjEzODA5NjIzOTA5NjMzYjA5NjQzZDA5NjUzZTA5NjY0MDBhNjc0MjBhNjg0NDBhNjg0NTBhNjk0NzBiNmE0OTBiNmE0YTBjNmI0YzBjNmI0ZDBkNmM0ZjBkNmM1MTBlNmM1MjBlNmQ1NDBmNmQ1NTBmNmQ1NzEwNmU1OTEwNmU1YTExNmU1YzEyNmU1ZDEyNmU1ZjEzNmU2MTEzNmU2MjE0NmU2NDE1NmU2NTE1NmU2NzE2NmU2OTE2NmU2YTE3NmU2YzE4NmU2ZDE4NmU2ZjE5NmU3MTE5NmU3MjFhNmU3NDFhNmU3NTFiNmU3NzFjNmQ3ODFjNmQ3YTFkNmQ3YzFkNmQ3ZDFlNmQ3ZjFlNmM4MDFmNmM4MjIwNmM4NDIwNmI4NTIxNmI4NzIxNmI4ODIyNmE4YTIyNmE4YzIzNjk4ZDIzNjk4ZjI0Njk5MDI1Njg5MjI1Njg5MzI2Njc5NTI2Njc5NzI3NjY5ODI3NjY5YTI4NjU5YjI5NjQ5ZDI5NjQ5ZjJhNjNhMDJhNjNhMjJiNjJhMzJjNjFhNTJjNjBhNjJkNjBhODJlNWZhOTJlNWVhYjJmNWVhZDMwNWRhZTMwNWNiMDMxNWJiMTMyNWFiMzMyNWFiNDMzNTliNjM0NThiNzM1NTdiOTM1NTZiYTM2NTViYzM3NTRiZDM4NTNiZjM5NTJjMDNhNTFjMTNhNTBjMzNiNGZjNDNjNGVjNjNkNGRjNzNlNGNjODNmNGJjYTQwNGFjYjQxNDljYzQyNDhjZTQzNDdjZjQ0NDZkMDQ1NDVkMjQ2NDRkMzQ3NDNkNDQ4NDJkNTRhNDFkNzRiM2ZkODRjM2VkOTRkM2RkYTRlM2NkYjUwM2JkZDUxM2FkZTUyMzhkZjUzMzdlMDU1MzZlMTU2MzVlMjU3MzRlMzU5MzNlNDVhMzFlNTVjMzBlNjVkMmZlNzVlMmVlODYwMmRlOTYxMmJlYTYzMmFlYjY0MjllYjY2MjhlYzY3MjZlZDY5MjVlZTZhMjRlZjZjMjNlZjZlMjFmMDZmMjBmMTcxMWZmMTczMWRmMjc0MWNmMzc2MWJmMzc4MTlmNDc5MThmNTdiMTdmNTdkMTVmNjdlMTRmNjgwMTNmNzgyMTJmNzg0MTBmODg1MGZmODg3MGVmODg5MGNmOThiMGJmOThjMGFmOThlMDlmYTkwMDhmYTkyMDdmYTk0MDdmYjk2MDZmYjk3MDZmYjk5MDZmYjliMDZmYjlkMDdmYzlmMDdmY2ExMDhmY2EzMDlmY2E1MGFmY2E2MGNmY2E4MGRmY2FhMGZmY2FjMTFmY2FlMTJmY2IwMTRmY2IyMTZmY2I0MThmYmI2MWFmYmI4MWRmYmJhMWZmYmJjMjFmYmJlMjNmYWMwMjZmYWMyMjhmYWM0MmFmYWM2MmRmOWM3MmZmOWM5MzJmOWNiMzVmOGNkMzdmOGNmM2FmN2QxM2RmN2QzNDBmNmQ1NDNmNmQ3NDZmNWQ5NDlmNWRiNGNmNGRkNGZmNGRmNTNmNGUxNTZmM2UzNWFmM2U1NWRmMmU2NjFmMmU4NjVmMmVhNjlmMWVjNmRmMWVkNzFmMWVmNzVmMWYxNzlmMmYyN2RmMmY0ODJmM2Y1ODZmM2Y2OGFmNGY4OGVmNWY5OTJmNmZhOTZmOGZiOWFmOWZjOWRmYWZkYTFmY2ZmYTRcIikpO1xuXG4gIHZhciBwbGFzbWEgPSByYW1wKGNvbG9ycyhcIjBkMDg4NzEwMDc4ODEzMDc4OTE2MDc4YTE5MDY4YzFiMDY4ZDFkMDY4ZTIwMDY4ZjIyMDY5MDI0MDY5MTI2MDU5MTI4MDU5MjJhMDU5MzJjMDU5NDJlMDU5NTJmMDU5NjMxMDU5NzMzMDU5NzM1MDQ5ODM3MDQ5OTM4MDQ5YTNhMDQ5YTNjMDQ5YjNlMDQ5YzNmMDQ5YzQxMDQ5ZDQzMDM5ZTQ0MDM5ZTQ2MDM5ZjQ4MDM5ZjQ5MDNhMDRiMDNhMTRjMDJhMTRlMDJhMjUwMDJhMjUxMDJhMzUzMDJhMzU1MDJhNDU2MDFhNDU4MDFhNDU5MDFhNTViMDFhNTVjMDFhNjVlMDFhNjYwMDFhNjYxMDBhNzYzMDBhNzY0MDBhNzY2MDBhNzY3MDBhODY5MDBhODZhMDBhODZjMDBhODZlMDBhODZmMDBhODcxMDBhODcyMDFhODc0MDFhODc1MDFhODc3MDFhODc4MDFhODdhMDJhODdiMDJhODdkMDNhODdlMDNhODgwMDRhODgxMDRhNzgzMDVhNzg0MDVhNzg2MDZhNjg3MDdhNjg4MDhhNjhhMDlhNThiMGFhNThkMGJhNThlMGNhNDhmMGRhNDkxMGVhMzkyMGZhMzk0MTBhMjk1MTFhMTk2MTNhMTk4MTRhMDk5MTU5ZjlhMTY5ZjljMTc5ZTlkMTg5ZDllMTk5ZGEwMWE5Y2ExMWI5YmEyMWQ5YWEzMWU5YWE1MWY5OWE2MjA5OGE3MjE5N2E4MjI5NmFhMjM5NWFiMjQ5NGFjMjY5NGFkMjc5M2FlMjg5MmIwMjk5MWIxMmE5MGIyMmI4ZmIzMmM4ZWI0MmU4ZGI1MmY4Y2I2MzA4YmI3MzE4YWI4MzI4OWJhMzM4OGJiMzQ4OGJjMzU4N2JkMzc4NmJlMzg4NWJmMzk4NGMwM2E4M2MxM2I4MmMyM2M4MWMzM2Q4MGM0M2U3ZmM1NDA3ZWM2NDE3ZGM3NDI3Y2M4NDM3YmM5NDQ3YWNhNDU3YWNiNDY3OWNjNDc3OGNjNDk3N2NkNGE3NmNlNGI3NWNmNGM3NGQwNGQ3M2QxNGU3MmQyNGY3MWQzNTE3MWQ0NTI3MGQ1NTM2ZmQ1NTQ2ZWQ2NTU2ZGQ3NTY2Y2Q4NTc2YmQ5NTg2YWRhNWE2YWRhNWI2OWRiNWM2OGRjNWQ2N2RkNWU2NmRlNWY2NWRlNjE2NGRmNjI2M2UwNjM2M2UxNjQ2MmUyNjU2MWUyNjY2MGUzNjg1ZmU0Njk1ZWU1NmE1ZGU1NmI1ZGU2NmM1Y2U3NmU1YmU3NmY1YWU4NzA1OWU5NzE1OGU5NzI1N2VhNzQ1N2ViNzU1NmViNzY1NWVjNzc1NGVkNzk1M2VkN2E1MmVlN2I1MWVmN2M1MWVmN2U1MGYwN2Y0ZmYwODA0ZWYxODE0ZGYxODM0Y2YyODQ0YmYzODU0YmYzODc0YWY0ODg0OWY0ODk0OGY1OGI0N2Y1OGM0NmY2OGQ0NWY2OGY0NGY3OTA0NGY3OTE0M2Y3OTM0MmY4OTQ0MWY4OTU0MGY5OTczZmY5OTgzZWY5OWEzZWZhOWIzZGZhOWMzY2ZhOWUzYmZiOWYzYWZiYTEzOWZiYTIzOGZjYTMzOGZjYTUzN2ZjYTYzNmZjYTgzNWZjYTkzNGZkYWIzM2ZkYWMzM2ZkYWUzMmZkYWYzMWZkYjEzMGZkYjIyZmZkYjQyZmZkYjUyZWZlYjcyZGZlYjgyY2ZlYmEyY2ZlYmIyYmZlYmQyYWZlYmUyYWZlYzAyOWZkYzIyOWZkYzMyOGZkYzUyN2ZkYzYyN2ZkYzgyN2ZkY2EyNmZkY2IyNmZjY2QyNWZjY2UyNWZjZDAyNWZjZDIyNWZiZDMyNGZiZDUyNGZiZDcyNGZhZDgyNGZhZGEyNGY5ZGMyNGY5ZGQyNWY4ZGYyNWY4ZTEyNWY3ZTIyNWY3ZTQyNWY2ZTYyNmY2ZTgyNmY1ZTkyNmY1ZWIyN2Y0ZWQyN2YzZWUyN2YzZjAyN2YyZjIyN2YxZjQyNmYxZjUyNWYwZjcyNGYwZjkyMVwiKSk7XG5cbiAgZnVuY3Rpb24gc2VxdWVudGlhbChpbnRlcnBvbGF0b3IpIHtcbiAgICB2YXIgeDAgPSAwLFxuICAgICAgICB4MSA9IDEsXG4gICAgICAgIGNsYW1wID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgICB2YXIgdCA9ICh4IC0geDApIC8gKHgxIC0geDApO1xuICAgICAgcmV0dXJuIGludGVycG9sYXRvcihjbGFtcCA/IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIHQpKSA6IHQpO1xuICAgIH1cblxuICAgIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgwID0gK19bMF0sIHgxID0gK19bMV0sIHNjYWxlKSA6IFt4MCwgeDFdO1xuICAgIH07XG5cbiAgICBzY2FsZS5jbGFtcCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGNsYW1wID0gISFfLCBzY2FsZSkgOiBjbGFtcDtcbiAgICB9O1xuXG4gICAgc2NhbGUuaW50ZXJwb2xhdG9yID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoaW50ZXJwb2xhdG9yID0gXywgc2NhbGUpIDogaW50ZXJwb2xhdG9yO1xuICAgIH07XG5cbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gc2VxdWVudGlhbChpbnRlcnBvbGF0b3IpLmRvbWFpbihbeDAsIHgxXSkuY2xhbXAoY2xhbXApO1xuICAgIH07XG5cbiAgICByZXR1cm4gbGluZWFyaXNoKHNjYWxlKTtcbiAgfVxuXG4gIGV4cG9ydHMuc2NhbGVCYW5kID0gYmFuZDtcbiAgZXhwb3J0cy5zY2FsZVBvaW50ID0gcG9pbnQ7XG4gIGV4cG9ydHMuc2NhbGVJZGVudGl0eSA9IGlkZW50aXR5O1xuICBleHBvcnRzLnNjYWxlTGluZWFyID0gbGluZWFyO1xuICBleHBvcnRzLnNjYWxlTG9nID0gbG9nO1xuICBleHBvcnRzLnNjYWxlT3JkaW5hbCA9IG9yZGluYWw7XG4gIGV4cG9ydHMuc2NhbGVJbXBsaWNpdCA9IGltcGxpY2l0O1xuICBleHBvcnRzLnNjYWxlUG93ID0gcG93O1xuICBleHBvcnRzLnNjYWxlU3FydCA9IHNxcnQ7XG4gIGV4cG9ydHMuc2NhbGVRdWFudGlsZSA9IHF1YW50aWxlJDE7XG4gIGV4cG9ydHMuc2NhbGVRdWFudGl6ZSA9IHF1YW50aXplO1xuICBleHBvcnRzLnNjYWxlVGhyZXNob2xkID0gdGhyZXNob2xkO1xuICBleHBvcnRzLnNjYWxlVGltZSA9IHRpbWU7XG4gIGV4cG9ydHMuc2NhbGVVdGMgPSB1dGNUaW1lO1xuICBleHBvcnRzLnNjaGVtZUNhdGVnb3J5MTAgPSBjYXRlZ29yeTEwO1xuICBleHBvcnRzLnNjaGVtZUNhdGVnb3J5MjBiID0gY2F0ZWdvcnkyMGI7XG4gIGV4cG9ydHMuc2NoZW1lQ2F0ZWdvcnkyMGMgPSBjYXRlZ29yeTIwYztcbiAgZXhwb3J0cy5zY2hlbWVDYXRlZ29yeTIwID0gY2F0ZWdvcnkyMDtcbiAgZXhwb3J0cy5pbnRlcnBvbGF0ZUN1YmVoZWxpeERlZmF1bHQgPSBjdWJlaGVsaXgkMTtcbiAgZXhwb3J0cy5pbnRlcnBvbGF0ZVJhaW5ib3cgPSByYWluYm93JDE7XG4gIGV4cG9ydHMuaW50ZXJwb2xhdGVXYXJtID0gd2FybTtcbiAgZXhwb3J0cy5pbnRlcnBvbGF0ZUNvb2wgPSBjb29sO1xuICBleHBvcnRzLmludGVycG9sYXRlVmlyaWRpcyA9IHZpcmlkaXM7XG4gIGV4cG9ydHMuaW50ZXJwb2xhdGVNYWdtYSA9IG1hZ21hO1xuICBleHBvcnRzLmludGVycG9sYXRlSW5mZXJubyA9IGluZmVybm87XG4gIGV4cG9ydHMuaW50ZXJwb2xhdGVQbGFzbWEgPSBwbGFzbWE7XG4gIGV4cG9ydHMuc2NhbGVTZXF1ZW50aWFsID0gc2VxdWVudGlhbDtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSk7IiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy1zaGFwZS8gVmVyc2lvbiAxLjAuMy4gQ29weXJpZ2h0IDIwMTYgTWlrZSBCb3N0b2NrLlxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzLCByZXF1aXJlKCdkMy1wYXRoJykpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cycsICdkMy1wYXRoJ10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5kMyA9IGdsb2JhbC5kMyB8fCB7fSksZ2xvYmFsLmQzKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cyxkM1BhdGgpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBjb25zdGFudCh4KSB7XG4gIHJldHVybiBmdW5jdGlvbiBjb25zdGFudCgpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cblxudmFyIGVwc2lsb24gPSAxZS0xMjtcbnZhciBwaSA9IE1hdGguUEk7XG52YXIgaGFsZlBpID0gcGkgLyAyO1xudmFyIHRhdSA9IDIgKiBwaTtcblxuZnVuY3Rpb24gYXJjSW5uZXJSYWRpdXMoZCkge1xuICByZXR1cm4gZC5pbm5lclJhZGl1cztcbn1cblxuZnVuY3Rpb24gYXJjT3V0ZXJSYWRpdXMoZCkge1xuICByZXR1cm4gZC5vdXRlclJhZGl1cztcbn1cblxuZnVuY3Rpb24gYXJjU3RhcnRBbmdsZShkKSB7XG4gIHJldHVybiBkLnN0YXJ0QW5nbGU7XG59XG5cbmZ1bmN0aW9uIGFyY0VuZEFuZ2xlKGQpIHtcbiAgcmV0dXJuIGQuZW5kQW5nbGU7XG59XG5cbmZ1bmN0aW9uIGFyY1BhZEFuZ2xlKGQpIHtcbiAgcmV0dXJuIGQgJiYgZC5wYWRBbmdsZTsgLy8gTm90ZTogb3B0aW9uYWwhXG59XG5cbmZ1bmN0aW9uIGFzaW4oeCkge1xuICByZXR1cm4geCA+PSAxID8gaGFsZlBpIDogeCA8PSAtMSA/IC1oYWxmUGkgOiBNYXRoLmFzaW4oeCk7XG59XG5cbmZ1bmN0aW9uIGludGVyc2VjdCh4MCwgeTAsIHgxLCB5MSwgeDIsIHkyLCB4MywgeTMpIHtcbiAgdmFyIHgxMCA9IHgxIC0geDAsIHkxMCA9IHkxIC0geTAsXG4gICAgICB4MzIgPSB4MyAtIHgyLCB5MzIgPSB5MyAtIHkyLFxuICAgICAgdCA9ICh4MzIgKiAoeTAgLSB5MikgLSB5MzIgKiAoeDAgLSB4MikpIC8gKHkzMiAqIHgxMCAtIHgzMiAqIHkxMCk7XG4gIHJldHVybiBbeDAgKyB0ICogeDEwLCB5MCArIHQgKiB5MTBdO1xufVxuXG4vLyBDb21wdXRlIHBlcnBlbmRpY3VsYXIgb2Zmc2V0IGxpbmUgb2YgbGVuZ3RoIHJjLlxuLy8gaHR0cDovL21hdGh3b3JsZC53b2xmcmFtLmNvbS9DaXJjbGUtTGluZUludGVyc2VjdGlvbi5odG1sXG5mdW5jdGlvbiBjb3JuZXJUYW5nZW50cyh4MCwgeTAsIHgxLCB5MSwgcjEsIHJjLCBjdykge1xuICB2YXIgeDAxID0geDAgLSB4MSxcbiAgICAgIHkwMSA9IHkwIC0geTEsXG4gICAgICBsbyA9IChjdyA/IHJjIDogLXJjKSAvIE1hdGguc3FydCh4MDEgKiB4MDEgKyB5MDEgKiB5MDEpLFxuICAgICAgb3ggPSBsbyAqIHkwMSxcbiAgICAgIG95ID0gLWxvICogeDAxLFxuICAgICAgeDExID0geDAgKyBveCxcbiAgICAgIHkxMSA9IHkwICsgb3ksXG4gICAgICB4MTAgPSB4MSArIG94LFxuICAgICAgeTEwID0geTEgKyBveSxcbiAgICAgIHgwMCA9ICh4MTEgKyB4MTApIC8gMixcbiAgICAgIHkwMCA9ICh5MTEgKyB5MTApIC8gMixcbiAgICAgIGR4ID0geDEwIC0geDExLFxuICAgICAgZHkgPSB5MTAgLSB5MTEsXG4gICAgICBkMiA9IGR4ICogZHggKyBkeSAqIGR5LFxuICAgICAgciA9IHIxIC0gcmMsXG4gICAgICBEID0geDExICogeTEwIC0geDEwICogeTExLFxuICAgICAgZCA9IChkeSA8IDAgPyAtMSA6IDEpICogTWF0aC5zcXJ0KE1hdGgubWF4KDAsIHIgKiByICogZDIgLSBEICogRCkpLFxuICAgICAgY3gwID0gKEQgKiBkeSAtIGR4ICogZCkgLyBkMixcbiAgICAgIGN5MCA9ICgtRCAqIGR4IC0gZHkgKiBkKSAvIGQyLFxuICAgICAgY3gxID0gKEQgKiBkeSArIGR4ICogZCkgLyBkMixcbiAgICAgIGN5MSA9ICgtRCAqIGR4ICsgZHkgKiBkKSAvIGQyLFxuICAgICAgZHgwID0gY3gwIC0geDAwLFxuICAgICAgZHkwID0gY3kwIC0geTAwLFxuICAgICAgZHgxID0gY3gxIC0geDAwLFxuICAgICAgZHkxID0gY3kxIC0geTAwO1xuXG4gIC8vIFBpY2sgdGhlIGNsb3NlciBvZiB0aGUgdHdvIGludGVyc2VjdGlvbiBwb2ludHMuXG4gIC8vIFRPRE8gSXMgdGhlcmUgYSBmYXN0ZXIgd2F5IHRvIGRldGVybWluZSB3aGljaCBpbnRlcnNlY3Rpb24gdG8gdXNlP1xuICBpZiAoZHgwICogZHgwICsgZHkwICogZHkwID4gZHgxICogZHgxICsgZHkxICogZHkxKSBjeDAgPSBjeDEsIGN5MCA9IGN5MTtcblxuICByZXR1cm4ge1xuICAgIGN4OiBjeDAsXG4gICAgY3k6IGN5MCxcbiAgICB4MDE6IC1veCxcbiAgICB5MDE6IC1veSxcbiAgICB4MTE6IGN4MCAqIChyMSAvIHIgLSAxKSxcbiAgICB5MTE6IGN5MCAqIChyMSAvIHIgLSAxKVxuICB9O1xufVxuXG5mdW5jdGlvbiBhcmMoKSB7XG4gIHZhciBpbm5lclJhZGl1cyA9IGFyY0lubmVyUmFkaXVzLFxuICAgICAgb3V0ZXJSYWRpdXMgPSBhcmNPdXRlclJhZGl1cyxcbiAgICAgIGNvcm5lclJhZGl1cyA9IGNvbnN0YW50KDApLFxuICAgICAgcGFkUmFkaXVzID0gbnVsbCxcbiAgICAgIHN0YXJ0QW5nbGUgPSBhcmNTdGFydEFuZ2xlLFxuICAgICAgZW5kQW5nbGUgPSBhcmNFbmRBbmdsZSxcbiAgICAgIHBhZEFuZ2xlID0gYXJjUGFkQW5nbGUsXG4gICAgICBjb250ZXh0ID0gbnVsbDtcblxuICBmdW5jdGlvbiBhcmMoKSB7XG4gICAgdmFyIGJ1ZmZlcixcbiAgICAgICAgcixcbiAgICAgICAgcjAgPSAraW5uZXJSYWRpdXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSxcbiAgICAgICAgcjEgPSArb3V0ZXJSYWRpdXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSxcbiAgICAgICAgYTAgPSBzdGFydEFuZ2xlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgLSBoYWxmUGksXG4gICAgICAgIGExID0gZW5kQW5nbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSAtIGhhbGZQaSxcbiAgICAgICAgZGEgPSBNYXRoLmFicyhhMSAtIGEwKSxcbiAgICAgICAgY3cgPSBhMSA+IGEwO1xuXG4gICAgaWYgKCFjb250ZXh0KSBjb250ZXh0ID0gYnVmZmVyID0gZDNQYXRoLnBhdGgoKTtcblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBvdXRlciByYWRpdXMgaXMgYWx3YXlzIGxhcmdlciB0aGFuIHRoZSBpbm5lciByYWRpdXMuXG4gICAgaWYgKHIxIDwgcjApIHIgPSByMSwgcjEgPSByMCwgcjAgPSByO1xuXG4gICAgLy8gSXMgaXQgYSBwb2ludD9cbiAgICBpZiAoIShyMSA+IGVwc2lsb24pKSBjb250ZXh0Lm1vdmVUbygwLCAwKTtcblxuICAgIC8vIE9yIGlzIGl0IGEgY2lyY2xlIG9yIGFubnVsdXM/XG4gICAgZWxzZSBpZiAoZGEgPiB0YXUgLSBlcHNpbG9uKSB7XG4gICAgICBjb250ZXh0Lm1vdmVUbyhyMSAqIE1hdGguY29zKGEwKSwgcjEgKiBNYXRoLnNpbihhMCkpO1xuICAgICAgY29udGV4dC5hcmMoMCwgMCwgcjEsIGEwLCBhMSwgIWN3KTtcbiAgICAgIGlmIChyMCA+IGVwc2lsb24pIHtcbiAgICAgICAgY29udGV4dC5tb3ZlVG8ocjAgKiBNYXRoLmNvcyhhMSksIHIwICogTWF0aC5zaW4oYTEpKTtcbiAgICAgICAgY29udGV4dC5hcmMoMCwgMCwgcjAsIGExLCBhMCwgY3cpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9yIGlzIGl0IGEgY2lyY3VsYXIgb3IgYW5udWxhciBzZWN0b3I/XG4gICAgZWxzZSB7XG4gICAgICB2YXIgYTAxID0gYTAsXG4gICAgICAgICAgYTExID0gYTEsXG4gICAgICAgICAgYTAwID0gYTAsXG4gICAgICAgICAgYTEwID0gYTEsXG4gICAgICAgICAgZGEwID0gZGEsXG4gICAgICAgICAgZGExID0gZGEsXG4gICAgICAgICAgYXAgPSBwYWRBbmdsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpIC8gMixcbiAgICAgICAgICBycCA9IChhcCA+IGVwc2lsb24pICYmIChwYWRSYWRpdXMgPyArcGFkUmFkaXVzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBNYXRoLnNxcnQocjAgKiByMCArIHIxICogcjEpKSxcbiAgICAgICAgICByYyA9IE1hdGgubWluKE1hdGguYWJzKHIxIC0gcjApIC8gMiwgK2Nvcm5lclJhZGl1cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKSxcbiAgICAgICAgICByYzAgPSByYyxcbiAgICAgICAgICByYzEgPSByYyxcbiAgICAgICAgICB0MCxcbiAgICAgICAgICB0MTtcblxuICAgICAgLy8gQXBwbHkgcGFkZGluZz8gTm90ZSB0aGF0IHNpbmNlIHIxIOKJpSByMCwgZGExIOKJpSBkYTAuXG4gICAgICBpZiAocnAgPiBlcHNpbG9uKSB7XG4gICAgICAgIHZhciBwMCA9IGFzaW4ocnAgLyByMCAqIE1hdGguc2luKGFwKSksXG4gICAgICAgICAgICBwMSA9IGFzaW4ocnAgLyByMSAqIE1hdGguc2luKGFwKSk7XG4gICAgICAgIGlmICgoZGEwIC09IHAwICogMikgPiBlcHNpbG9uKSBwMCAqPSAoY3cgPyAxIDogLTEpLCBhMDAgKz0gcDAsIGExMCAtPSBwMDtcbiAgICAgICAgZWxzZSBkYTAgPSAwLCBhMDAgPSBhMTAgPSAoYTAgKyBhMSkgLyAyO1xuICAgICAgICBpZiAoKGRhMSAtPSBwMSAqIDIpID4gZXBzaWxvbikgcDEgKj0gKGN3ID8gMSA6IC0xKSwgYTAxICs9IHAxLCBhMTEgLT0gcDE7XG4gICAgICAgIGVsc2UgZGExID0gMCwgYTAxID0gYTExID0gKGEwICsgYTEpIC8gMjtcbiAgICAgIH1cblxuICAgICAgdmFyIHgwMSA9IHIxICogTWF0aC5jb3MoYTAxKSxcbiAgICAgICAgICB5MDEgPSByMSAqIE1hdGguc2luKGEwMSksXG4gICAgICAgICAgeDEwID0gcjAgKiBNYXRoLmNvcyhhMTApLFxuICAgICAgICAgIHkxMCA9IHIwICogTWF0aC5zaW4oYTEwKTtcblxuICAgICAgLy8gQXBwbHkgcm91bmRlZCBjb3JuZXJzP1xuICAgICAgaWYgKHJjID4gZXBzaWxvbikge1xuICAgICAgICB2YXIgeDExID0gcjEgKiBNYXRoLmNvcyhhMTEpLFxuICAgICAgICAgICAgeTExID0gcjEgKiBNYXRoLnNpbihhMTEpLFxuICAgICAgICAgICAgeDAwID0gcjAgKiBNYXRoLmNvcyhhMDApLFxuICAgICAgICAgICAgeTAwID0gcjAgKiBNYXRoLnNpbihhMDApO1xuXG4gICAgICAgIC8vIFJlc3RyaWN0IHRoZSBjb3JuZXIgcmFkaXVzIGFjY29yZGluZyB0byB0aGUgc2VjdG9yIGFuZ2xlLlxuICAgICAgICBpZiAoZGEgPCBwaSkge1xuICAgICAgICAgIHZhciBvYyA9IGRhMCA+IGVwc2lsb24gPyBpbnRlcnNlY3QoeDAxLCB5MDEsIHgwMCwgeTAwLCB4MTEsIHkxMSwgeDEwLCB5MTApIDogW3gxMCwgeTEwXSxcbiAgICAgICAgICAgICAgYXggPSB4MDEgLSBvY1swXSxcbiAgICAgICAgICAgICAgYXkgPSB5MDEgLSBvY1sxXSxcbiAgICAgICAgICAgICAgYnggPSB4MTEgLSBvY1swXSxcbiAgICAgICAgICAgICAgYnkgPSB5MTEgLSBvY1sxXSxcbiAgICAgICAgICAgICAga2MgPSAxIC8gTWF0aC5zaW4oTWF0aC5hY29zKChheCAqIGJ4ICsgYXkgKiBieSkgLyAoTWF0aC5zcXJ0KGF4ICogYXggKyBheSAqIGF5KSAqIE1hdGguc3FydChieCAqIGJ4ICsgYnkgKiBieSkpKSAvIDIpLFxuICAgICAgICAgICAgICBsYyA9IE1hdGguc3FydChvY1swXSAqIG9jWzBdICsgb2NbMV0gKiBvY1sxXSk7XG4gICAgICAgICAgcmMwID0gTWF0aC5taW4ocmMsIChyMCAtIGxjKSAvIChrYyAtIDEpKTtcbiAgICAgICAgICByYzEgPSBNYXRoLm1pbihyYywgKHIxIC0gbGMpIC8gKGtjICsgMSkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElzIHRoZSBzZWN0b3IgY29sbGFwc2VkIHRvIGEgbGluZT9cbiAgICAgIGlmICghKGRhMSA+IGVwc2lsb24pKSBjb250ZXh0Lm1vdmVUbyh4MDEsIHkwMSk7XG5cbiAgICAgIC8vIERvZXMgdGhlIHNlY3RvcuKAmXMgb3V0ZXIgcmluZyBoYXZlIHJvdW5kZWQgY29ybmVycz9cbiAgICAgIGVsc2UgaWYgKHJjMSA+IGVwc2lsb24pIHtcbiAgICAgICAgdDAgPSBjb3JuZXJUYW5nZW50cyh4MDAsIHkwMCwgeDAxLCB5MDEsIHIxLCByYzEsIGN3KTtcbiAgICAgICAgdDEgPSBjb3JuZXJUYW5nZW50cyh4MTEsIHkxMSwgeDEwLCB5MTAsIHIxLCByYzEsIGN3KTtcblxuICAgICAgICBjb250ZXh0Lm1vdmVUbyh0MC5jeCArIHQwLngwMSwgdDAuY3kgKyB0MC55MDEpO1xuXG4gICAgICAgIC8vIEhhdmUgdGhlIGNvcm5lcnMgbWVyZ2VkP1xuICAgICAgICBpZiAocmMxIDwgcmMpIGNvbnRleHQuYXJjKHQwLmN4LCB0MC5jeSwgcmMxLCBNYXRoLmF0YW4yKHQwLnkwMSwgdDAueDAxKSwgTWF0aC5hdGFuMih0MS55MDEsIHQxLngwMSksICFjdyk7XG5cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBkcmF3IHRoZSB0d28gY29ybmVycyBhbmQgdGhlIHJpbmcuXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNvbnRleHQuYXJjKHQwLmN4LCB0MC5jeSwgcmMxLCBNYXRoLmF0YW4yKHQwLnkwMSwgdDAueDAxKSwgTWF0aC5hdGFuMih0MC55MTEsIHQwLngxMSksICFjdyk7XG4gICAgICAgICAgY29udGV4dC5hcmMoMCwgMCwgcjEsIE1hdGguYXRhbjIodDAuY3kgKyB0MC55MTEsIHQwLmN4ICsgdDAueDExKSwgTWF0aC5hdGFuMih0MS5jeSArIHQxLnkxMSwgdDEuY3ggKyB0MS54MTEpLCAhY3cpO1xuICAgICAgICAgIGNvbnRleHQuYXJjKHQxLmN4LCB0MS5jeSwgcmMxLCBNYXRoLmF0YW4yKHQxLnkxMSwgdDEueDExKSwgTWF0aC5hdGFuMih0MS55MDEsIHQxLngwMSksICFjdyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gT3IgaXMgdGhlIG91dGVyIHJpbmcganVzdCBhIGNpcmN1bGFyIGFyYz9cbiAgICAgIGVsc2UgY29udGV4dC5tb3ZlVG8oeDAxLCB5MDEpLCBjb250ZXh0LmFyYygwLCAwLCByMSwgYTAxLCBhMTEsICFjdyk7XG5cbiAgICAgIC8vIElzIHRoZXJlIG5vIGlubmVyIHJpbmcsIGFuZCBpdOKAmXMgYSBjaXJjdWxhciBzZWN0b3I/XG4gICAgICAvLyBPciBwZXJoYXBzIGl04oCZcyBhbiBhbm51bGFyIHNlY3RvciBjb2xsYXBzZWQgZHVlIHRvIHBhZGRpbmc/XG4gICAgICBpZiAoIShyMCA+IGVwc2lsb24pIHx8ICEoZGEwID4gZXBzaWxvbikpIGNvbnRleHQubGluZVRvKHgxMCwgeTEwKTtcblxuICAgICAgLy8gRG9lcyB0aGUgc2VjdG9y4oCZcyBpbm5lciByaW5nIChvciBwb2ludCkgaGF2ZSByb3VuZGVkIGNvcm5lcnM/XG4gICAgICBlbHNlIGlmIChyYzAgPiBlcHNpbG9uKSB7XG4gICAgICAgIHQwID0gY29ybmVyVGFuZ2VudHMoeDEwLCB5MTAsIHgxMSwgeTExLCByMCwgLXJjMCwgY3cpO1xuICAgICAgICB0MSA9IGNvcm5lclRhbmdlbnRzKHgwMSwgeTAxLCB4MDAsIHkwMCwgcjAsIC1yYzAsIGN3KTtcblxuICAgICAgICBjb250ZXh0LmxpbmVUbyh0MC5jeCArIHQwLngwMSwgdDAuY3kgKyB0MC55MDEpO1xuXG4gICAgICAgIC8vIEhhdmUgdGhlIGNvcm5lcnMgbWVyZ2VkP1xuICAgICAgICBpZiAocmMwIDwgcmMpIGNvbnRleHQuYXJjKHQwLmN4LCB0MC5jeSwgcmMwLCBNYXRoLmF0YW4yKHQwLnkwMSwgdDAueDAxKSwgTWF0aC5hdGFuMih0MS55MDEsIHQxLngwMSksICFjdyk7XG5cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBkcmF3IHRoZSB0d28gY29ybmVycyBhbmQgdGhlIHJpbmcuXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNvbnRleHQuYXJjKHQwLmN4LCB0MC5jeSwgcmMwLCBNYXRoLmF0YW4yKHQwLnkwMSwgdDAueDAxKSwgTWF0aC5hdGFuMih0MC55MTEsIHQwLngxMSksICFjdyk7XG4gICAgICAgICAgY29udGV4dC5hcmMoMCwgMCwgcjAsIE1hdGguYXRhbjIodDAuY3kgKyB0MC55MTEsIHQwLmN4ICsgdDAueDExKSwgTWF0aC5hdGFuMih0MS5jeSArIHQxLnkxMSwgdDEuY3ggKyB0MS54MTEpLCBjdyk7XG4gICAgICAgICAgY29udGV4dC5hcmModDEuY3gsIHQxLmN5LCByYzAsIE1hdGguYXRhbjIodDEueTExLCB0MS54MTEpLCBNYXRoLmF0YW4yKHQxLnkwMSwgdDEueDAxKSwgIWN3KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBPciBpcyB0aGUgaW5uZXIgcmluZyBqdXN0IGEgY2lyY3VsYXIgYXJjP1xuICAgICAgZWxzZSBjb250ZXh0LmFyYygwLCAwLCByMCwgYTEwLCBhMDAsIGN3KTtcbiAgICB9XG5cbiAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xuXG4gICAgaWYgKGJ1ZmZlcikgcmV0dXJuIGNvbnRleHQgPSBudWxsLCBidWZmZXIgKyBcIlwiIHx8IG51bGw7XG4gIH1cblxuICBhcmMuY2VudHJvaWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgciA9ICgraW5uZXJSYWRpdXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSArICtvdXRlclJhZGl1cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKSAvIDIsXG4gICAgICAgIGEgPSAoK3N0YXJ0QW5nbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSArICtlbmRBbmdsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKSAvIDIgLSBwaSAvIDI7XG4gICAgcmV0dXJuIFtNYXRoLmNvcyhhKSAqIHIsIE1hdGguc2luKGEpICogcl07XG4gIH07XG5cbiAgYXJjLmlubmVyUmFkaXVzID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGlubmVyUmFkaXVzID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyYykgOiBpbm5lclJhZGl1cztcbiAgfTtcblxuICBhcmMub3V0ZXJSYWRpdXMgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAob3V0ZXJSYWRpdXMgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJjKSA6IG91dGVyUmFkaXVzO1xuICB9O1xuXG4gIGFyYy5jb3JuZXJSYWRpdXMgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoY29ybmVyUmFkaXVzID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyYykgOiBjb3JuZXJSYWRpdXM7XG4gIH07XG5cbiAgYXJjLnBhZFJhZGl1cyA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRSYWRpdXMgPSBfID09IG51bGwgPyBudWxsIDogdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyYykgOiBwYWRSYWRpdXM7XG4gIH07XG5cbiAgYXJjLnN0YXJ0QW5nbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoc3RhcnRBbmdsZSA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmMpIDogc3RhcnRBbmdsZTtcbiAgfTtcblxuICBhcmMuZW5kQW5nbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZW5kQW5nbGUgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJjKSA6IGVuZEFuZ2xlO1xuICB9O1xuXG4gIGFyYy5wYWRBbmdsZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRBbmdsZSA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmMpIDogcGFkQW5nbGU7XG4gIH07XG5cbiAgYXJjLmNvbnRleHQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoKGNvbnRleHQgPSBfID09IG51bGwgPyBudWxsIDogXyksIGFyYykgOiBjb250ZXh0O1xuICB9O1xuXG4gIHJldHVybiBhcmM7XG59XG5cbmZ1bmN0aW9uIExpbmVhcihjb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufVxuXG5MaW5lYXIucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDEpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB4ID0gK3gsIHkgPSAreTtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDA6IHRoaXMuX3BvaW50ID0gMTsgdGhpcy5fbGluZSA/IHRoaXMuX2NvbnRleHQubGluZVRvKHgsIHkpIDogdGhpcy5fY29udGV4dC5tb3ZlVG8oeCwgeSk7IGJyZWFrO1xuICAgICAgY2FzZSAxOiB0aGlzLl9wb2ludCA9IDI7IC8vIHByb2NlZWRcbiAgICAgIGRlZmF1bHQ6IHRoaXMuX2NvbnRleHQubGluZVRvKHgsIHkpOyBicmVhaztcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGN1cnZlTGluZWFyKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBMaW5lYXIoY29udGV4dCk7XG59XG5cbmZ1bmN0aW9uIHgocCkge1xuICByZXR1cm4gcFswXTtcbn1cblxuZnVuY3Rpb24geShwKSB7XG4gIHJldHVybiBwWzFdO1xufVxuXG5mdW5jdGlvbiBsaW5lKCkge1xuICB2YXIgeCQkID0geCxcbiAgICAgIHkkJCA9IHksXG4gICAgICBkZWZpbmVkID0gY29uc3RhbnQodHJ1ZSksXG4gICAgICBjb250ZXh0ID0gbnVsbCxcbiAgICAgIGN1cnZlID0gY3VydmVMaW5lYXIsXG4gICAgICBvdXRwdXQgPSBudWxsO1xuXG4gIGZ1bmN0aW9uIGxpbmUoZGF0YSkge1xuICAgIHZhciBpLFxuICAgICAgICBuID0gZGF0YS5sZW5ndGgsXG4gICAgICAgIGQsXG4gICAgICAgIGRlZmluZWQwID0gZmFsc2UsXG4gICAgICAgIGJ1ZmZlcjtcblxuICAgIGlmIChjb250ZXh0ID09IG51bGwpIG91dHB1dCA9IGN1cnZlKGJ1ZmZlciA9IGQzUGF0aC5wYXRoKCkpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8PSBuOyArK2kpIHtcbiAgICAgIGlmICghKGkgPCBuICYmIGRlZmluZWQoZCA9IGRhdGFbaV0sIGksIGRhdGEpKSA9PT0gZGVmaW5lZDApIHtcbiAgICAgICAgaWYgKGRlZmluZWQwID0gIWRlZmluZWQwKSBvdXRwdXQubGluZVN0YXJ0KCk7XG4gICAgICAgIGVsc2Ugb3V0cHV0LmxpbmVFbmQoKTtcbiAgICAgIH1cbiAgICAgIGlmIChkZWZpbmVkMCkgb3V0cHV0LnBvaW50KCt4JCQoZCwgaSwgZGF0YSksICt5JCQoZCwgaSwgZGF0YSkpO1xuICAgIH1cblxuICAgIGlmIChidWZmZXIpIHJldHVybiBvdXRwdXQgPSBudWxsLCBidWZmZXIgKyBcIlwiIHx8IG51bGw7XG4gIH1cblxuICBsaW5lLnggPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeCQkID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGxpbmUpIDogeCQkO1xuICB9O1xuXG4gIGxpbmUueSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh5JCQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgbGluZSkgOiB5JCQ7XG4gIH07XG5cbiAgbGluZS5kZWZpbmVkID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRlZmluZWQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCEhXyksIGxpbmUpIDogZGVmaW5lZDtcbiAgfTtcblxuICBsaW5lLmN1cnZlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGN1cnZlID0gXywgY29udGV4dCAhPSBudWxsICYmIChvdXRwdXQgPSBjdXJ2ZShjb250ZXh0KSksIGxpbmUpIDogY3VydmU7XG4gIH07XG5cbiAgbGluZS5jb250ZXh0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKF8gPT0gbnVsbCA/IGNvbnRleHQgPSBvdXRwdXQgPSBudWxsIDogb3V0cHV0ID0gY3VydmUoY29udGV4dCA9IF8pLCBsaW5lKSA6IGNvbnRleHQ7XG4gIH07XG5cbiAgcmV0dXJuIGxpbmU7XG59XG5cbmZ1bmN0aW9uIGFyZWEoKSB7XG4gIHZhciB4MCA9IHgsXG4gICAgICB4MSA9IG51bGwsXG4gICAgICB5MCA9IGNvbnN0YW50KDApLFxuICAgICAgeTEgPSB5LFxuICAgICAgZGVmaW5lZCA9IGNvbnN0YW50KHRydWUpLFxuICAgICAgY29udGV4dCA9IG51bGwsXG4gICAgICBjdXJ2ZSA9IGN1cnZlTGluZWFyLFxuICAgICAgb3V0cHV0ID0gbnVsbDtcblxuICBmdW5jdGlvbiBhcmVhKGRhdGEpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgaixcbiAgICAgICAgayxcbiAgICAgICAgbiA9IGRhdGEubGVuZ3RoLFxuICAgICAgICBkLFxuICAgICAgICBkZWZpbmVkMCA9IGZhbHNlLFxuICAgICAgICBidWZmZXIsXG4gICAgICAgIHgweiA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgeTB6ID0gbmV3IEFycmF5KG4pO1xuXG4gICAgaWYgKGNvbnRleHQgPT0gbnVsbCkgb3V0cHV0ID0gY3VydmUoYnVmZmVyID0gZDNQYXRoLnBhdGgoKSk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDw9IG47ICsraSkge1xuICAgICAgaWYgKCEoaSA8IG4gJiYgZGVmaW5lZChkID0gZGF0YVtpXSwgaSwgZGF0YSkpID09PSBkZWZpbmVkMCkge1xuICAgICAgICBpZiAoZGVmaW5lZDAgPSAhZGVmaW5lZDApIHtcbiAgICAgICAgICBqID0gaTtcbiAgICAgICAgICBvdXRwdXQuYXJlYVN0YXJ0KCk7XG4gICAgICAgICAgb3V0cHV0LmxpbmVTdGFydCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dHB1dC5saW5lRW5kKCk7XG4gICAgICAgICAgb3V0cHV0LmxpbmVTdGFydCgpO1xuICAgICAgICAgIGZvciAoayA9IGkgLSAxOyBrID49IGo7IC0taykge1xuICAgICAgICAgICAgb3V0cHV0LnBvaW50KHgweltrXSwgeTB6W2tdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0cHV0LmxpbmVFbmQoKTtcbiAgICAgICAgICBvdXRwdXQuYXJlYUVuZCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZGVmaW5lZDApIHtcbiAgICAgICAgeDB6W2ldID0gK3gwKGQsIGksIGRhdGEpLCB5MHpbaV0gPSAreTAoZCwgaSwgZGF0YSk7XG4gICAgICAgIG91dHB1dC5wb2ludCh4MSA/ICt4MShkLCBpLCBkYXRhKSA6IHgweltpXSwgeTEgPyAreTEoZCwgaSwgZGF0YSkgOiB5MHpbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChidWZmZXIpIHJldHVybiBvdXRwdXQgPSBudWxsLCBidWZmZXIgKyBcIlwiIHx8IG51bGw7XG4gIH1cblxuICBmdW5jdGlvbiBhcmVhbGluZSgpIHtcbiAgICByZXR1cm4gbGluZSgpLmRlZmluZWQoZGVmaW5lZCkuY3VydmUoY3VydmUpLmNvbnRleHQoY29udGV4dCk7XG4gIH1cblxuICBhcmVhLnggPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeDAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgeDEgPSBudWxsLCBhcmVhKSA6IHgwO1xuICB9O1xuXG4gIGFyZWEueDAgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeDAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJlYSkgOiB4MDtcbiAgfTtcblxuICBhcmVhLngxID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgxID0gXyA9PSBudWxsID8gbnVsbCA6IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmVhKSA6IHgxO1xuICB9O1xuXG4gIGFyZWEueSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh5MCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCB5MSA9IG51bGwsIGFyZWEpIDogeTA7XG4gIH07XG5cbiAgYXJlYS55MCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh5MCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmVhKSA6IHkwO1xuICB9O1xuXG4gIGFyZWEueTEgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeTEgPSBfID09IG51bGwgPyBudWxsIDogdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyZWEpIDogeTE7XG4gIH07XG5cbiAgYXJlYS5saW5lWDAgPVxuICBhcmVhLmxpbmVZMCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmVhbGluZSgpLngoeDApLnkoeTApO1xuICB9O1xuXG4gIGFyZWEubGluZVkxID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZWFsaW5lKCkueCh4MCkueSh5MSk7XG4gIH07XG5cbiAgYXJlYS5saW5lWDEgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJlYWxpbmUoKS54KHgxKS55KHkwKTtcbiAgfTtcblxuICBhcmVhLmRlZmluZWQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZGVmaW5lZCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoISFfKSwgYXJlYSkgOiBkZWZpbmVkO1xuICB9O1xuXG4gIGFyZWEuY3VydmUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoY3VydmUgPSBfLCBjb250ZXh0ICE9IG51bGwgJiYgKG91dHB1dCA9IGN1cnZlKGNvbnRleHQpKSwgYXJlYSkgOiBjdXJ2ZTtcbiAgfTtcblxuICBhcmVhLmNvbnRleHQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoXyA9PSBudWxsID8gY29udGV4dCA9IG91dHB1dCA9IG51bGwgOiBvdXRwdXQgPSBjdXJ2ZShjb250ZXh0ID0gXyksIGFyZWEpIDogY29udGV4dDtcbiAgfTtcblxuICByZXR1cm4gYXJlYTtcbn1cblxuZnVuY3Rpb24gZGVzY2VuZGluZyhhLCBiKSB7XG4gIHJldHVybiBiIDwgYSA/IC0xIDogYiA+IGEgPyAxIDogYiA+PSBhID8gMCA6IE5hTjtcbn1cblxuZnVuY3Rpb24gaWRlbnRpdHkoZCkge1xuICByZXR1cm4gZDtcbn1cblxuZnVuY3Rpb24gcGllKCkge1xuICB2YXIgdmFsdWUgPSBpZGVudGl0eSxcbiAgICAgIHNvcnRWYWx1ZXMgPSBkZXNjZW5kaW5nLFxuICAgICAgc29ydCA9IG51bGwsXG4gICAgICBzdGFydEFuZ2xlID0gY29uc3RhbnQoMCksXG4gICAgICBlbmRBbmdsZSA9IGNvbnN0YW50KHRhdSksXG4gICAgICBwYWRBbmdsZSA9IGNvbnN0YW50KDApO1xuXG4gIGZ1bmN0aW9uIHBpZShkYXRhKSB7XG4gICAgdmFyIGksXG4gICAgICAgIG4gPSBkYXRhLmxlbmd0aCxcbiAgICAgICAgaixcbiAgICAgICAgayxcbiAgICAgICAgc3VtID0gMCxcbiAgICAgICAgaW5kZXggPSBuZXcgQXJyYXkobiksXG4gICAgICAgIGFyY3MgPSBuZXcgQXJyYXkobiksXG4gICAgICAgIGEwID0gK3N0YXJ0QW5nbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSxcbiAgICAgICAgZGEgPSBNYXRoLm1pbih0YXUsIE1hdGgubWF4KC10YXUsIGVuZEFuZ2xlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgLSBhMCkpLFxuICAgICAgICBhMSxcbiAgICAgICAgcCA9IE1hdGgubWluKE1hdGguYWJzKGRhKSAvIG4sIHBhZEFuZ2xlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpLFxuICAgICAgICBwYSA9IHAgKiAoZGEgPCAwID8gLTEgOiAxKSxcbiAgICAgICAgdjtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmICgodiA9IGFyY3NbaW5kZXhbaV0gPSBpXSA9ICt2YWx1ZShkYXRhW2ldLCBpLCBkYXRhKSkgPiAwKSB7XG4gICAgICAgIHN1bSArPSB2O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9wdGlvbmFsbHkgc29ydCB0aGUgYXJjcyBieSBwcmV2aW91c2x5LWNvbXB1dGVkIHZhbHVlcyBvciBieSBkYXRhLlxuICAgIGlmIChzb3J0VmFsdWVzICE9IG51bGwpIGluZGV4LnNvcnQoZnVuY3Rpb24oaSwgaikgeyByZXR1cm4gc29ydFZhbHVlcyhhcmNzW2ldLCBhcmNzW2pdKTsgfSk7XG4gICAgZWxzZSBpZiAoc29ydCAhPSBudWxsKSBpbmRleC5zb3J0KGZ1bmN0aW9uKGksIGopIHsgcmV0dXJuIHNvcnQoZGF0YVtpXSwgZGF0YVtqXSk7IH0pO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgYXJjcyEgVGhleSBhcmUgc3RvcmVkIGluIHRoZSBvcmlnaW5hbCBkYXRhJ3Mgb3JkZXIuXG4gICAgZm9yIChpID0gMCwgayA9IHN1bSA/IChkYSAtIG4gKiBwYSkgLyBzdW0gOiAwOyBpIDwgbjsgKytpLCBhMCA9IGExKSB7XG4gICAgICBqID0gaW5kZXhbaV0sIHYgPSBhcmNzW2pdLCBhMSA9IGEwICsgKHYgPiAwID8gdiAqIGsgOiAwKSArIHBhLCBhcmNzW2pdID0ge1xuICAgICAgICBkYXRhOiBkYXRhW2pdLFxuICAgICAgICBpbmRleDogaSxcbiAgICAgICAgdmFsdWU6IHYsXG4gICAgICAgIHN0YXJ0QW5nbGU6IGEwLFxuICAgICAgICBlbmRBbmdsZTogYTEsXG4gICAgICAgIHBhZEFuZ2xlOiBwXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBhcmNzO1xuICB9XG5cbiAgcGllLnZhbHVlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHZhbHVlID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIHBpZSkgOiB2YWx1ZTtcbiAgfTtcblxuICBwaWUuc29ydFZhbHVlcyA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChzb3J0VmFsdWVzID0gXywgc29ydCA9IG51bGwsIHBpZSkgOiBzb3J0VmFsdWVzO1xuICB9O1xuXG4gIHBpZS5zb3J0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHNvcnQgPSBfLCBzb3J0VmFsdWVzID0gbnVsbCwgcGllKSA6IHNvcnQ7XG4gIH07XG5cbiAgcGllLnN0YXJ0QW5nbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoc3RhcnRBbmdsZSA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBwaWUpIDogc3RhcnRBbmdsZTtcbiAgfTtcblxuICBwaWUuZW5kQW5nbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZW5kQW5nbGUgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgcGllKSA6IGVuZEFuZ2xlO1xuICB9O1xuXG4gIHBpZS5wYWRBbmdsZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRBbmdsZSA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBwaWUpIDogcGFkQW5nbGU7XG4gIH07XG5cbiAgcmV0dXJuIHBpZTtcbn1cblxudmFyIGN1cnZlUmFkaWFsTGluZWFyID0gY3VydmVSYWRpYWwoY3VydmVMaW5lYXIpO1xuXG5mdW5jdGlvbiBSYWRpYWwoY3VydmUpIHtcbiAgdGhpcy5fY3VydmUgPSBjdXJ2ZTtcbn1cblxuUmFkaWFsLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jdXJ2ZS5hcmVhU3RhcnQoKTtcbiAgfSxcbiAgYXJlYUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY3VydmUuYXJlYUVuZCgpO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2N1cnZlLmxpbmVTdGFydCgpO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jdXJ2ZS5saW5lRW5kKCk7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbihhLCByKSB7XG4gICAgdGhpcy5fY3VydmUucG9pbnQociAqIE1hdGguc2luKGEpLCByICogLU1hdGguY29zKGEpKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gY3VydmVSYWRpYWwoY3VydmUpIHtcblxuICBmdW5jdGlvbiByYWRpYWwoY29udGV4dCkge1xuICAgIHJldHVybiBuZXcgUmFkaWFsKGN1cnZlKGNvbnRleHQpKTtcbiAgfVxuXG4gIHJhZGlhbC5fY3VydmUgPSBjdXJ2ZTtcblxuICByZXR1cm4gcmFkaWFsO1xufVxuXG5mdW5jdGlvbiByYWRpYWxMaW5lKGwpIHtcbiAgdmFyIGMgPSBsLmN1cnZlO1xuXG4gIGwuYW5nbGUgPSBsLngsIGRlbGV0ZSBsLng7XG4gIGwucmFkaXVzID0gbC55LCBkZWxldGUgbC55O1xuXG4gIGwuY3VydmUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyBjKGN1cnZlUmFkaWFsKF8pKSA6IGMoKS5fY3VydmU7XG4gIH07XG5cbiAgcmV0dXJuIGw7XG59XG5cbmZ1bmN0aW9uIHJhZGlhbExpbmUkMSgpIHtcbiAgcmV0dXJuIHJhZGlhbExpbmUobGluZSgpLmN1cnZlKGN1cnZlUmFkaWFsTGluZWFyKSk7XG59XG5cbmZ1bmN0aW9uIHJhZGlhbEFyZWEoKSB7XG4gIHZhciBhID0gYXJlYSgpLmN1cnZlKGN1cnZlUmFkaWFsTGluZWFyKSxcbiAgICAgIGMgPSBhLmN1cnZlLFxuICAgICAgeDAgPSBhLmxpbmVYMCxcbiAgICAgIHgxID0gYS5saW5lWDEsXG4gICAgICB5MCA9IGEubGluZVkwLFxuICAgICAgeTEgPSBhLmxpbmVZMTtcblxuICBhLmFuZ2xlID0gYS54LCBkZWxldGUgYS54O1xuICBhLnN0YXJ0QW5nbGUgPSBhLngwLCBkZWxldGUgYS54MDtcbiAgYS5lbmRBbmdsZSA9IGEueDEsIGRlbGV0ZSBhLngxO1xuICBhLnJhZGl1cyA9IGEueSwgZGVsZXRlIGEueTtcbiAgYS5pbm5lclJhZGl1cyA9IGEueTAsIGRlbGV0ZSBhLnkwO1xuICBhLm91dGVyUmFkaXVzID0gYS55MSwgZGVsZXRlIGEueTE7XG4gIGEubGluZVN0YXJ0QW5nbGUgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHJhZGlhbExpbmUoeDAoKSk7IH0sIGRlbGV0ZSBhLmxpbmVYMDtcbiAgYS5saW5lRW5kQW5nbGUgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHJhZGlhbExpbmUoeDEoKSk7IH0sIGRlbGV0ZSBhLmxpbmVYMTtcbiAgYS5saW5lSW5uZXJSYWRpdXMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHJhZGlhbExpbmUoeTAoKSk7IH0sIGRlbGV0ZSBhLmxpbmVZMDtcbiAgYS5saW5lT3V0ZXJSYWRpdXMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHJhZGlhbExpbmUoeTEoKSk7IH0sIGRlbGV0ZSBhLmxpbmVZMTtcblxuICBhLmN1cnZlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gYyhjdXJ2ZVJhZGlhbChfKSkgOiBjKCkuX2N1cnZlO1xuICB9O1xuXG4gIHJldHVybiBhO1xufVxuXG52YXIgY2lyY2xlID0ge1xuICBkcmF3OiBmdW5jdGlvbihjb250ZXh0LCBzaXplKSB7XG4gICAgdmFyIHIgPSBNYXRoLnNxcnQoc2l6ZSAvIHBpKTtcbiAgICBjb250ZXh0Lm1vdmVUbyhyLCAwKTtcbiAgICBjb250ZXh0LmFyYygwLCAwLCByLCAwLCB0YXUpO1xuICB9XG59O1xuXG52YXIgY3Jvc3MgPSB7XG4gIGRyYXc6IGZ1bmN0aW9uKGNvbnRleHQsIHNpemUpIHtcbiAgICB2YXIgciA9IE1hdGguc3FydChzaXplIC8gNSkgLyAyO1xuICAgIGNvbnRleHQubW92ZVRvKC0zICogciwgLXIpO1xuICAgIGNvbnRleHQubGluZVRvKC1yLCAtcik7XG4gICAgY29udGV4dC5saW5lVG8oLXIsIC0zICogcik7XG4gICAgY29udGV4dC5saW5lVG8ociwgLTMgKiByKTtcbiAgICBjb250ZXh0LmxpbmVUbyhyLCAtcik7XG4gICAgY29udGV4dC5saW5lVG8oMyAqIHIsIC1yKTtcbiAgICBjb250ZXh0LmxpbmVUbygzICogciwgcik7XG4gICAgY29udGV4dC5saW5lVG8ociwgcik7XG4gICAgY29udGV4dC5saW5lVG8ociwgMyAqIHIpO1xuICAgIGNvbnRleHQubGluZVRvKC1yLCAzICogcik7XG4gICAgY29udGV4dC5saW5lVG8oLXIsIHIpO1xuICAgIGNvbnRleHQubGluZVRvKC0zICogciwgcik7XG4gICAgY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgfVxufTtcblxudmFyIHRhbjMwID0gTWF0aC5zcXJ0KDEgLyAzKTtcbnZhciB0YW4zMF8yID0gdGFuMzAgKiAyO1xudmFyIGRpYW1vbmQgPSB7XG4gIGRyYXc6IGZ1bmN0aW9uKGNvbnRleHQsIHNpemUpIHtcbiAgICB2YXIgeSA9IE1hdGguc3FydChzaXplIC8gdGFuMzBfMiksXG4gICAgICAgIHggPSB5ICogdGFuMzA7XG4gICAgY29udGV4dC5tb3ZlVG8oMCwgLXkpO1xuICAgIGNvbnRleHQubGluZVRvKHgsIDApO1xuICAgIGNvbnRleHQubGluZVRvKDAsIHkpO1xuICAgIGNvbnRleHQubGluZVRvKC14LCAwKTtcbiAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xuICB9XG59O1xuXG52YXIga2EgPSAwLjg5MDgxMzA5MTUyOTI4NTIyODEwO1xudmFyIGtyID0gTWF0aC5zaW4ocGkgLyAxMCkgLyBNYXRoLnNpbig3ICogcGkgLyAxMCk7XG52YXIga3ggPSBNYXRoLnNpbih0YXUgLyAxMCkgKiBrcjtcbnZhciBreSA9IC1NYXRoLmNvcyh0YXUgLyAxMCkgKiBrcjtcbnZhciBzdGFyID0ge1xuICBkcmF3OiBmdW5jdGlvbihjb250ZXh0LCBzaXplKSB7XG4gICAgdmFyIHIgPSBNYXRoLnNxcnQoc2l6ZSAqIGthKSxcbiAgICAgICAgeCA9IGt4ICogcixcbiAgICAgICAgeSA9IGt5ICogcjtcbiAgICBjb250ZXh0Lm1vdmVUbygwLCAtcik7XG4gICAgY29udGV4dC5saW5lVG8oeCwgeSk7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCA1OyArK2kpIHtcbiAgICAgIHZhciBhID0gdGF1ICogaSAvIDUsXG4gICAgICAgICAgYyA9IE1hdGguY29zKGEpLFxuICAgICAgICAgIHMgPSBNYXRoLnNpbihhKTtcbiAgICAgIGNvbnRleHQubGluZVRvKHMgKiByLCAtYyAqIHIpO1xuICAgICAgY29udGV4dC5saW5lVG8oYyAqIHggLSBzICogeSwgcyAqIHggKyBjICogeSk7XG4gICAgfVxuICAgIGNvbnRleHQuY2xvc2VQYXRoKCk7XG4gIH1cbn07XG5cbnZhciBzcXVhcmUgPSB7XG4gIGRyYXc6IGZ1bmN0aW9uKGNvbnRleHQsIHNpemUpIHtcbiAgICB2YXIgdyA9IE1hdGguc3FydChzaXplKSxcbiAgICAgICAgeCA9IC13IC8gMjtcbiAgICBjb250ZXh0LnJlY3QoeCwgeCwgdywgdyk7XG4gIH1cbn07XG5cbnZhciBzcXJ0MyA9IE1hdGguc3FydCgzKTtcblxudmFyIHRyaWFuZ2xlID0ge1xuICBkcmF3OiBmdW5jdGlvbihjb250ZXh0LCBzaXplKSB7XG4gICAgdmFyIHkgPSAtTWF0aC5zcXJ0KHNpemUgLyAoc3FydDMgKiAzKSk7XG4gICAgY29udGV4dC5tb3ZlVG8oMCwgeSAqIDIpO1xuICAgIGNvbnRleHQubGluZVRvKC1zcXJ0MyAqIHksIC15KTtcbiAgICBjb250ZXh0LmxpbmVUbyhzcXJ0MyAqIHksIC15KTtcbiAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xuICB9XG59O1xuXG52YXIgYyA9IC0wLjU7XG52YXIgcyA9IE1hdGguc3FydCgzKSAvIDI7XG52YXIgayA9IDEgLyBNYXRoLnNxcnQoMTIpO1xudmFyIGEgPSAoayAvIDIgKyAxKSAqIDM7XG52YXIgd3llID0ge1xuICBkcmF3OiBmdW5jdGlvbihjb250ZXh0LCBzaXplKSB7XG4gICAgdmFyIHIgPSBNYXRoLnNxcnQoc2l6ZSAvIGEpLFxuICAgICAgICB4MCA9IHIgLyAyLFxuICAgICAgICB5MCA9IHIgKiBrLFxuICAgICAgICB4MSA9IHgwLFxuICAgICAgICB5MSA9IHIgKiBrICsgcixcbiAgICAgICAgeDIgPSAteDEsXG4gICAgICAgIHkyID0geTE7XG4gICAgY29udGV4dC5tb3ZlVG8oeDAsIHkwKTtcbiAgICBjb250ZXh0LmxpbmVUbyh4MSwgeTEpO1xuICAgIGNvbnRleHQubGluZVRvKHgyLCB5Mik7XG4gICAgY29udGV4dC5saW5lVG8oYyAqIHgwIC0gcyAqIHkwLCBzICogeDAgKyBjICogeTApO1xuICAgIGNvbnRleHQubGluZVRvKGMgKiB4MSAtIHMgKiB5MSwgcyAqIHgxICsgYyAqIHkxKTtcbiAgICBjb250ZXh0LmxpbmVUbyhjICogeDIgLSBzICogeTIsIHMgKiB4MiArIGMgKiB5Mik7XG4gICAgY29udGV4dC5saW5lVG8oYyAqIHgwICsgcyAqIHkwLCBjICogeTAgLSBzICogeDApO1xuICAgIGNvbnRleHQubGluZVRvKGMgKiB4MSArIHMgKiB5MSwgYyAqIHkxIC0gcyAqIHgxKTtcbiAgICBjb250ZXh0LmxpbmVUbyhjICogeDIgKyBzICogeTIsIGMgKiB5MiAtIHMgKiB4Mik7XG4gICAgY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgfVxufTtcblxudmFyIHN5bWJvbHMgPSBbXG4gIGNpcmNsZSxcbiAgY3Jvc3MsXG4gIGRpYW1vbmQsXG4gIHNxdWFyZSxcbiAgc3RhcixcbiAgdHJpYW5nbGUsXG4gIHd5ZVxuXTtcblxuZnVuY3Rpb24gc3ltYm9sKCkge1xuICB2YXIgdHlwZSA9IGNvbnN0YW50KGNpcmNsZSksXG4gICAgICBzaXplID0gY29uc3RhbnQoNjQpLFxuICAgICAgY29udGV4dCA9IG51bGw7XG5cbiAgZnVuY3Rpb24gc3ltYm9sKCkge1xuICAgIHZhciBidWZmZXI7XG4gICAgaWYgKCFjb250ZXh0KSBjb250ZXh0ID0gYnVmZmVyID0gZDNQYXRoLnBhdGgoKTtcbiAgICB0eXBlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykuZHJhdyhjb250ZXh0LCArc2l6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICBpZiAoYnVmZmVyKSByZXR1cm4gY29udGV4dCA9IG51bGwsIGJ1ZmZlciArIFwiXCIgfHwgbnVsbDtcbiAgfVxuXG4gIHN5bWJvbC50eXBlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHR5cGUgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KF8pLCBzeW1ib2wpIDogdHlwZTtcbiAgfTtcblxuICBzeW1ib2wuc2l6ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChzaXplID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIHN5bWJvbCkgOiBzaXplO1xuICB9O1xuXG4gIHN5bWJvbC5jb250ZXh0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGNvbnRleHQgPSBfID09IG51bGwgPyBudWxsIDogXywgc3ltYm9sKSA6IGNvbnRleHQ7XG4gIH07XG5cbiAgcmV0dXJuIHN5bWJvbDtcbn1cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbmZ1bmN0aW9uIHBvaW50KHRoYXQsIHgsIHkpIHtcbiAgdGhhdC5fY29udGV4dC5iZXppZXJDdXJ2ZVRvKFxuICAgICgyICogdGhhdC5feDAgKyB0aGF0Ll94MSkgLyAzLFxuICAgICgyICogdGhhdC5feTAgKyB0aGF0Ll95MSkgLyAzLFxuICAgICh0aGF0Ll94MCArIDIgKiB0aGF0Ll94MSkgLyAzLFxuICAgICh0aGF0Ll95MCArIDIgKiB0aGF0Ll95MSkgLyAzLFxuICAgICh0aGF0Ll94MCArIDQgKiB0aGF0Ll94MSArIHgpIC8gNixcbiAgICAodGhhdC5feTAgKyA0ICogdGhhdC5feTEgKyB5KSAvIDZcbiAgKTtcbn1cblxuZnVuY3Rpb24gQmFzaXMoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuQmFzaXMucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPVxuICAgIHRoaXMuX3kwID0gdGhpcy5feTEgPSBOYU47XG4gICAgdGhpcy5fcG9pbnQgPSAwO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDM6IHBvaW50KHRoaXMsIHRoaXMuX3gxLCB0aGlzLl95MSk7IC8vIHByb2NlZWRcbiAgICAgIGNhc2UgMjogdGhpcy5fY29udGV4dC5saW5lVG8odGhpcy5feDEsIHRoaXMuX3kxKTsgYnJlYWs7XG4gICAgfVxuICAgIGlmICh0aGlzLl9saW5lIHx8ICh0aGlzLl9saW5lICE9PSAwICYmIHRoaXMuX3BvaW50ID09PSAxKSkgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICB0aGlzLl9saW5lID0gMSAtIHRoaXMuX2xpbmU7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KSA6IHRoaXMuX2NvbnRleHQubW92ZVRvKHgsIHkpOyBicmVhaztcbiAgICAgIGNhc2UgMTogdGhpcy5fcG9pbnQgPSAyOyBicmVhaztcbiAgICAgIGNhc2UgMjogdGhpcy5fcG9pbnQgPSAzOyB0aGlzLl9jb250ZXh0LmxpbmVUbygoNSAqIHRoaXMuX3gwICsgdGhpcy5feDEpIC8gNiwgKDUgKiB0aGlzLl95MCArIHRoaXMuX3kxKSAvIDYpOyAvLyBwcm9jZWVkXG4gICAgICBkZWZhdWx0OiBwb2ludCh0aGlzLCB4LCB5KTsgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuX3gwID0gdGhpcy5feDEsIHRoaXMuX3gxID0geDtcbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxLCB0aGlzLl95MSA9IHk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGJhc2lzKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBCYXNpcyhjb250ZXh0KTtcbn1cblxuZnVuY3Rpb24gQmFzaXNDbG9zZWQoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuQmFzaXNDbG9zZWQucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IG5vb3AsXG4gIGFyZWFFbmQ6IG5vb3AsXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSA9IHRoaXMuX3gyID0gdGhpcy5feDMgPSB0aGlzLl94NCA9XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSA9IHRoaXMuX3kyID0gdGhpcy5feTMgPSB0aGlzLl95NCA9IE5hTjtcbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMToge1xuICAgICAgICB0aGlzLl9jb250ZXh0Lm1vdmVUbyh0aGlzLl94MiwgdGhpcy5feTIpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgMjoge1xuICAgICAgICB0aGlzLl9jb250ZXh0Lm1vdmVUbygodGhpcy5feDIgKyAyICogdGhpcy5feDMpIC8gMywgKHRoaXMuX3kyICsgMiAqIHRoaXMuX3kzKSAvIDMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbygodGhpcy5feDMgKyAyICogdGhpcy5feDIpIC8gMywgKHRoaXMuX3kzICsgMiAqIHRoaXMuX3kyKSAvIDMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgMzoge1xuICAgICAgICB0aGlzLnBvaW50KHRoaXMuX3gyLCB0aGlzLl95Mik7XG4gICAgICAgIHRoaXMucG9pbnQodGhpcy5feDMsIHRoaXMuX3kzKTtcbiAgICAgICAgdGhpcy5wb2ludCh0aGlzLl94NCwgdGhpcy5feTQpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IHRoaXMuX3gyID0geCwgdGhpcy5feTIgPSB5OyBicmVhaztcbiAgICAgIGNhc2UgMTogdGhpcy5fcG9pbnQgPSAyOyB0aGlzLl94MyA9IHgsIHRoaXMuX3kzID0geTsgYnJlYWs7XG4gICAgICBjYXNlIDI6IHRoaXMuX3BvaW50ID0gMzsgdGhpcy5feDQgPSB4LCB0aGlzLl95NCA9IHk7IHRoaXMuX2NvbnRleHQubW92ZVRvKCh0aGlzLl94MCArIDQgKiB0aGlzLl94MSArIHgpIC8gNiwgKHRoaXMuX3kwICsgNCAqIHRoaXMuX3kxICsgeSkgLyA2KTsgYnJlYWs7XG4gICAgICBkZWZhdWx0OiBwb2ludCh0aGlzLCB4LCB5KTsgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuX3gwID0gdGhpcy5feDEsIHRoaXMuX3gxID0geDtcbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxLCB0aGlzLl95MSA9IHk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGJhc2lzQ2xvc2VkKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBCYXNpc0Nsb3NlZChjb250ZXh0KTtcbn1cblxuZnVuY3Rpb24gQmFzaXNPcGVuKGNvbnRleHQpIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG59XG5cbkJhc2lzT3Blbi5wcm90b3R5cGUgPSB7XG4gIGFyZWFTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IDA7XG4gIH0sXG4gIGFyZWFFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSBOYU47XG4gIH0sXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSA9XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSA9IE5hTjtcbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9saW5lIHx8ICh0aGlzLl9saW5lICE9PSAwICYmIHRoaXMuX3BvaW50ID09PSAzKSkgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICB0aGlzLl9saW5lID0gMSAtIHRoaXMuX2xpbmU7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IGJyZWFrO1xuICAgICAgY2FzZSAxOiB0aGlzLl9wb2ludCA9IDI7IGJyZWFrO1xuICAgICAgY2FzZSAyOiB0aGlzLl9wb2ludCA9IDM7IHZhciB4MCA9ICh0aGlzLl94MCArIDQgKiB0aGlzLl94MSArIHgpIC8gNiwgeTAgPSAodGhpcy5feTAgKyA0ICogdGhpcy5feTEgKyB5KSAvIDY7IHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh4MCwgeTApIDogdGhpcy5fY29udGV4dC5tb3ZlVG8oeDAsIHkwKTsgYnJlYWs7XG4gICAgICBjYXNlIDM6IHRoaXMuX3BvaW50ID0gNDsgLy8gcHJvY2VlZFxuICAgICAgZGVmYXVsdDogcG9pbnQodGhpcywgeCwgeSk7IGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxLCB0aGlzLl94MSA9IHg7XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSwgdGhpcy5feTEgPSB5O1xuICB9XG59O1xuXG5mdW5jdGlvbiBiYXNpc09wZW4oY29udGV4dCkge1xuICByZXR1cm4gbmV3IEJhc2lzT3Blbihjb250ZXh0KTtcbn1cblxuZnVuY3Rpb24gQnVuZGxlKGNvbnRleHQsIGJldGEpIHtcbiAgdGhpcy5fYmFzaXMgPSBuZXcgQmFzaXMoY29udGV4dCk7XG4gIHRoaXMuX2JldGEgPSBiZXRhO1xufVxuXG5CdW5kbGUucHJvdG90eXBlID0ge1xuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3ggPSBbXTtcbiAgICB0aGlzLl95ID0gW107XG4gICAgdGhpcy5fYmFzaXMubGluZVN0YXJ0KCk7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gdGhpcy5feCxcbiAgICAgICAgeSA9IHRoaXMuX3ksXG4gICAgICAgIGogPSB4Lmxlbmd0aCAtIDE7XG5cbiAgICBpZiAoaiA+IDApIHtcbiAgICAgIHZhciB4MCA9IHhbMF0sXG4gICAgICAgICAgeTAgPSB5WzBdLFxuICAgICAgICAgIGR4ID0geFtqXSAtIHgwLFxuICAgICAgICAgIGR5ID0geVtqXSAtIHkwLFxuICAgICAgICAgIGkgPSAtMSxcbiAgICAgICAgICB0O1xuXG4gICAgICB3aGlsZSAoKytpIDw9IGopIHtcbiAgICAgICAgdCA9IGkgLyBqO1xuICAgICAgICB0aGlzLl9iYXNpcy5wb2ludChcbiAgICAgICAgICB0aGlzLl9iZXRhICogeFtpXSArICgxIC0gdGhpcy5fYmV0YSkgKiAoeDAgKyB0ICogZHgpLFxuICAgICAgICAgIHRoaXMuX2JldGEgKiB5W2ldICsgKDEgLSB0aGlzLl9iZXRhKSAqICh5MCArIHQgKiBkeSlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl94ID0gdGhpcy5feSA9IG51bGw7XG4gICAgdGhpcy5fYmFzaXMubGluZUVuZCgpO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuX3gucHVzaCgreCk7XG4gICAgdGhpcy5feS5wdXNoKCt5KTtcbiAgfVxufTtcblxudmFyIGJ1bmRsZSA9IChmdW5jdGlvbiBjdXN0b20oYmV0YSkge1xuXG4gIGZ1bmN0aW9uIGJ1bmRsZShjb250ZXh0KSB7XG4gICAgcmV0dXJuIGJldGEgPT09IDEgPyBuZXcgQmFzaXMoY29udGV4dCkgOiBuZXcgQnVuZGxlKGNvbnRleHQsIGJldGEpO1xuICB9XG5cbiAgYnVuZGxlLmJldGEgPSBmdW5jdGlvbihiZXRhKSB7XG4gICAgcmV0dXJuIGN1c3RvbSgrYmV0YSk7XG4gIH07XG5cbiAgcmV0dXJuIGJ1bmRsZTtcbn0pKDAuODUpO1xuXG5mdW5jdGlvbiBwb2ludCQxKHRoYXQsIHgsIHkpIHtcbiAgdGhhdC5fY29udGV4dC5iZXppZXJDdXJ2ZVRvKFxuICAgIHRoYXQuX3gxICsgdGhhdC5fayAqICh0aGF0Ll94MiAtIHRoYXQuX3gwKSxcbiAgICB0aGF0Ll95MSArIHRoYXQuX2sgKiAodGhhdC5feTIgLSB0aGF0Ll95MCksXG4gICAgdGhhdC5feDIgKyB0aGF0Ll9rICogKHRoYXQuX3gxIC0geCksXG4gICAgdGhhdC5feTIgKyB0aGF0Ll9rICogKHRoYXQuX3kxIC0geSksXG4gICAgdGhhdC5feDIsXG4gICAgdGhhdC5feTJcbiAgKTtcbn1cblxuZnVuY3Rpb24gQ2FyZGluYWwoY29udGV4dCwgdGVuc2lvbikge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5fayA9ICgxIC0gdGVuc2lvbikgLyA2O1xufVxuXG5DYXJkaW5hbC5wcm90b3R5cGUgPSB7XG4gIGFyZWFTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IDA7XG4gIH0sXG4gIGFyZWFFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSBOYU47XG4gIH0sXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSA9IHRoaXMuX3gyID1cbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxID0gdGhpcy5feTIgPSBOYU47XG4gICAgdGhpcy5fcG9pbnQgPSAwO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDI6IHRoaXMuX2NvbnRleHQubGluZVRvKHRoaXMuX3gyLCB0aGlzLl95Mik7IGJyZWFrO1xuICAgICAgY2FzZSAzOiBwb2ludCQxKHRoaXMsIHRoaXMuX3gxLCB0aGlzLl95MSk7IGJyZWFrO1xuICAgIH1cbiAgICBpZiAodGhpcy5fbGluZSB8fCAodGhpcy5fbGluZSAhPT0gMCAmJiB0aGlzLl9wb2ludCA9PT0gMSkpIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgdGhpcy5fbGluZSA9IDEgLSB0aGlzLl9saW5lO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSAreCwgeSA9ICt5O1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl9saW5lID8gdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSkgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh4LCB5KTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgdGhpcy5feDEgPSB4LCB0aGlzLl95MSA9IHk7IGJyZWFrO1xuICAgICAgY2FzZSAyOiB0aGlzLl9wb2ludCA9IDM7IC8vIHByb2NlZWRcbiAgICAgIGRlZmF1bHQ6IHBvaW50JDEodGhpcywgeCwgeSk7IGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxLCB0aGlzLl94MSA9IHRoaXMuX3gyLCB0aGlzLl94MiA9IHg7XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSwgdGhpcy5feTEgPSB0aGlzLl95MiwgdGhpcy5feTIgPSB5O1xuICB9XG59O1xuXG52YXIgY2FyZGluYWwgPSAoZnVuY3Rpb24gY3VzdG9tKHRlbnNpb24pIHtcblxuICBmdW5jdGlvbiBjYXJkaW5hbChjb250ZXh0KSB7XG4gICAgcmV0dXJuIG5ldyBDYXJkaW5hbChjb250ZXh0LCB0ZW5zaW9uKTtcbiAgfVxuXG4gIGNhcmRpbmFsLnRlbnNpb24gPSBmdW5jdGlvbih0ZW5zaW9uKSB7XG4gICAgcmV0dXJuIGN1c3RvbSgrdGVuc2lvbik7XG4gIH07XG5cbiAgcmV0dXJuIGNhcmRpbmFsO1xufSkoMCk7XG5cbmZ1bmN0aW9uIENhcmRpbmFsQ2xvc2VkKGNvbnRleHQsIHRlbnNpb24pIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuX2sgPSAoMSAtIHRlbnNpb24pIC8gNjtcbn1cblxuQ2FyZGluYWxDbG9zZWQucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IG5vb3AsXG4gIGFyZWFFbmQ6IG5vb3AsXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSA9IHRoaXMuX3gyID0gdGhpcy5feDMgPSB0aGlzLl94NCA9IHRoaXMuX3g1ID1cbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxID0gdGhpcy5feTIgPSB0aGlzLl95MyA9IHRoaXMuX3k0ID0gdGhpcy5feTUgPSBOYU47XG4gICAgdGhpcy5fcG9pbnQgPSAwO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDE6IHtcbiAgICAgICAgdGhpcy5fY29udGV4dC5tb3ZlVG8odGhpcy5feDMsIHRoaXMuX3kzKTtcbiAgICAgICAgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIDI6IHtcbiAgICAgICAgdGhpcy5fY29udGV4dC5saW5lVG8odGhpcy5feDMsIHRoaXMuX3kzKTtcbiAgICAgICAgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIDM6IHtcbiAgICAgICAgdGhpcy5wb2ludCh0aGlzLl94MywgdGhpcy5feTMpO1xuICAgICAgICB0aGlzLnBvaW50KHRoaXMuX3g0LCB0aGlzLl95NCk7XG4gICAgICAgIHRoaXMucG9pbnQodGhpcy5feDUsIHRoaXMuX3k1KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSAreCwgeSA9ICt5O1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl94MyA9IHgsIHRoaXMuX3kzID0geTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgdGhpcy5fY29udGV4dC5tb3ZlVG8odGhpcy5feDQgPSB4LCB0aGlzLl95NCA9IHkpOyBicmVhaztcbiAgICAgIGNhc2UgMjogdGhpcy5fcG9pbnQgPSAzOyB0aGlzLl94NSA9IHgsIHRoaXMuX3k1ID0geTsgYnJlYWs7XG4gICAgICBkZWZhdWx0OiBwb2ludCQxKHRoaXMsIHgsIHkpOyBicmVhaztcbiAgICB9XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSwgdGhpcy5feDEgPSB0aGlzLl94MiwgdGhpcy5feDIgPSB4O1xuICAgIHRoaXMuX3kwID0gdGhpcy5feTEsIHRoaXMuX3kxID0gdGhpcy5feTIsIHRoaXMuX3kyID0geTtcbiAgfVxufTtcblxudmFyIGNhcmRpbmFsQ2xvc2VkID0gKGZ1bmN0aW9uIGN1c3RvbSh0ZW5zaW9uKSB7XG5cbiAgZnVuY3Rpb24gY2FyZGluYWwoY29udGV4dCkge1xuICAgIHJldHVybiBuZXcgQ2FyZGluYWxDbG9zZWQoY29udGV4dCwgdGVuc2lvbik7XG4gIH1cblxuICBjYXJkaW5hbC50ZW5zaW9uID0gZnVuY3Rpb24odGVuc2lvbikge1xuICAgIHJldHVybiBjdXN0b20oK3RlbnNpb24pO1xuICB9O1xuXG4gIHJldHVybiBjYXJkaW5hbDtcbn0pKDApO1xuXG5mdW5jdGlvbiBDYXJkaW5hbE9wZW4oY29udGV4dCwgdGVuc2lvbikge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5fayA9ICgxIC0gdGVuc2lvbikgLyA2O1xufVxuXG5DYXJkaW5hbE9wZW4ucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPSB0aGlzLl94MiA9XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSA9IHRoaXMuX3kyID0gTmFOO1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDMpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB4ID0gK3gsIHkgPSAreTtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDA6IHRoaXMuX3BvaW50ID0gMTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgYnJlYWs7XG4gICAgICBjYXNlIDI6IHRoaXMuX3BvaW50ID0gMzsgdGhpcy5fbGluZSA/IHRoaXMuX2NvbnRleHQubGluZVRvKHRoaXMuX3gyLCB0aGlzLl95MikgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh0aGlzLl94MiwgdGhpcy5feTIpOyBicmVhaztcbiAgICAgIGNhc2UgMzogdGhpcy5fcG9pbnQgPSA0OyAvLyBwcm9jZWVkXG4gICAgICBkZWZhdWx0OiBwb2ludCQxKHRoaXMsIHgsIHkpOyBicmVhaztcbiAgICB9XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSwgdGhpcy5feDEgPSB0aGlzLl94MiwgdGhpcy5feDIgPSB4O1xuICAgIHRoaXMuX3kwID0gdGhpcy5feTEsIHRoaXMuX3kxID0gdGhpcy5feTIsIHRoaXMuX3kyID0geTtcbiAgfVxufTtcblxudmFyIGNhcmRpbmFsT3BlbiA9IChmdW5jdGlvbiBjdXN0b20odGVuc2lvbikge1xuXG4gIGZ1bmN0aW9uIGNhcmRpbmFsKGNvbnRleHQpIHtcbiAgICByZXR1cm4gbmV3IENhcmRpbmFsT3Blbihjb250ZXh0LCB0ZW5zaW9uKTtcbiAgfVxuXG4gIGNhcmRpbmFsLnRlbnNpb24gPSBmdW5jdGlvbih0ZW5zaW9uKSB7XG4gICAgcmV0dXJuIGN1c3RvbSgrdGVuc2lvbik7XG4gIH07XG5cbiAgcmV0dXJuIGNhcmRpbmFsO1xufSkoMCk7XG5cbmZ1bmN0aW9uIHBvaW50JDIodGhhdCwgeCwgeSkge1xuICB2YXIgeDEgPSB0aGF0Ll94MSxcbiAgICAgIHkxID0gdGhhdC5feTEsXG4gICAgICB4MiA9IHRoYXQuX3gyLFxuICAgICAgeTIgPSB0aGF0Ll95MjtcblxuICBpZiAodGhhdC5fbDAxX2EgPiBlcHNpbG9uKSB7XG4gICAgdmFyIGEgPSAyICogdGhhdC5fbDAxXzJhICsgMyAqIHRoYXQuX2wwMV9hICogdGhhdC5fbDEyX2EgKyB0aGF0Ll9sMTJfMmEsXG4gICAgICAgIG4gPSAzICogdGhhdC5fbDAxX2EgKiAodGhhdC5fbDAxX2EgKyB0aGF0Ll9sMTJfYSk7XG4gICAgeDEgPSAoeDEgKiBhIC0gdGhhdC5feDAgKiB0aGF0Ll9sMTJfMmEgKyB0aGF0Ll94MiAqIHRoYXQuX2wwMV8yYSkgLyBuO1xuICAgIHkxID0gKHkxICogYSAtIHRoYXQuX3kwICogdGhhdC5fbDEyXzJhICsgdGhhdC5feTIgKiB0aGF0Ll9sMDFfMmEpIC8gbjtcbiAgfVxuXG4gIGlmICh0aGF0Ll9sMjNfYSA+IGVwc2lsb24pIHtcbiAgICB2YXIgYiA9IDIgKiB0aGF0Ll9sMjNfMmEgKyAzICogdGhhdC5fbDIzX2EgKiB0aGF0Ll9sMTJfYSArIHRoYXQuX2wxMl8yYSxcbiAgICAgICAgbSA9IDMgKiB0aGF0Ll9sMjNfYSAqICh0aGF0Ll9sMjNfYSArIHRoYXQuX2wxMl9hKTtcbiAgICB4MiA9ICh4MiAqIGIgKyB0aGF0Ll94MSAqIHRoYXQuX2wyM18yYSAtIHggKiB0aGF0Ll9sMTJfMmEpIC8gbTtcbiAgICB5MiA9ICh5MiAqIGIgKyB0aGF0Ll95MSAqIHRoYXQuX2wyM18yYSAtIHkgKiB0aGF0Ll9sMTJfMmEpIC8gbTtcbiAgfVxuXG4gIHRoYXQuX2NvbnRleHQuYmV6aWVyQ3VydmVUbyh4MSwgeTEsIHgyLCB5MiwgdGhhdC5feDIsIHRoYXQuX3kyKTtcbn1cblxuZnVuY3Rpb24gQ2F0bXVsbFJvbShjb250ZXh0LCBhbHBoYSkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5fYWxwaGEgPSBhbHBoYTtcbn1cblxuQ2F0bXVsbFJvbS5wcm90b3R5cGUgPSB7XG4gIGFyZWFTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IDA7XG4gIH0sXG4gIGFyZWFFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSBOYU47XG4gIH0sXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSA9IHRoaXMuX3gyID1cbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxID0gdGhpcy5feTIgPSBOYU47XG4gICAgdGhpcy5fbDAxX2EgPSB0aGlzLl9sMTJfYSA9IHRoaXMuX2wyM19hID1cbiAgICB0aGlzLl9sMDFfMmEgPSB0aGlzLl9sMTJfMmEgPSB0aGlzLl9sMjNfMmEgPVxuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAyOiB0aGlzLl9jb250ZXh0LmxpbmVUbyh0aGlzLl94MiwgdGhpcy5feTIpOyBicmVhaztcbiAgICAgIGNhc2UgMzogdGhpcy5wb2ludCh0aGlzLl94MiwgdGhpcy5feTIpOyBicmVhaztcbiAgICB9XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDEpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB4ID0gK3gsIHkgPSAreTtcblxuICAgIGlmICh0aGlzLl9wb2ludCkge1xuICAgICAgdmFyIHgyMyA9IHRoaXMuX3gyIC0geCxcbiAgICAgICAgICB5MjMgPSB0aGlzLl95MiAtIHk7XG4gICAgICB0aGlzLl9sMjNfYSA9IE1hdGguc3FydCh0aGlzLl9sMjNfMmEgPSBNYXRoLnBvdyh4MjMgKiB4MjMgKyB5MjMgKiB5MjMsIHRoaXMuX2FscGhhKSk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KSA6IHRoaXMuX2NvbnRleHQubW92ZVRvKHgsIHkpOyBicmVhaztcbiAgICAgIGNhc2UgMTogdGhpcy5fcG9pbnQgPSAyOyBicmVhaztcbiAgICAgIGNhc2UgMjogdGhpcy5fcG9pbnQgPSAzOyAvLyBwcm9jZWVkXG4gICAgICBkZWZhdWx0OiBwb2ludCQyKHRoaXMsIHgsIHkpOyBicmVhaztcbiAgICB9XG5cbiAgICB0aGlzLl9sMDFfYSA9IHRoaXMuX2wxMl9hLCB0aGlzLl9sMTJfYSA9IHRoaXMuX2wyM19hO1xuICAgIHRoaXMuX2wwMV8yYSA9IHRoaXMuX2wxMl8yYSwgdGhpcy5fbDEyXzJhID0gdGhpcy5fbDIzXzJhO1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEsIHRoaXMuX3gxID0gdGhpcy5feDIsIHRoaXMuX3gyID0geDtcbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxLCB0aGlzLl95MSA9IHRoaXMuX3kyLCB0aGlzLl95MiA9IHk7XG4gIH1cbn07XG5cbnZhciBjYXRtdWxsUm9tID0gKGZ1bmN0aW9uIGN1c3RvbShhbHBoYSkge1xuXG4gIGZ1bmN0aW9uIGNhdG11bGxSb20oY29udGV4dCkge1xuICAgIHJldHVybiBhbHBoYSA/IG5ldyBDYXRtdWxsUm9tKGNvbnRleHQsIGFscGhhKSA6IG5ldyBDYXJkaW5hbChjb250ZXh0LCAwKTtcbiAgfVxuXG4gIGNhdG11bGxSb20uYWxwaGEgPSBmdW5jdGlvbihhbHBoYSkge1xuICAgIHJldHVybiBjdXN0b20oK2FscGhhKTtcbiAgfTtcblxuICByZXR1cm4gY2F0bXVsbFJvbTtcbn0pKDAuNSk7XG5cbmZ1bmN0aW9uIENhdG11bGxSb21DbG9zZWQoY29udGV4dCwgYWxwaGEpIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuX2FscGhhID0gYWxwaGE7XG59XG5cbkNhdG11bGxSb21DbG9zZWQucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IG5vb3AsXG4gIGFyZWFFbmQ6IG5vb3AsXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSA9IHRoaXMuX3gyID0gdGhpcy5feDMgPSB0aGlzLl94NCA9IHRoaXMuX3g1ID1cbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxID0gdGhpcy5feTIgPSB0aGlzLl95MyA9IHRoaXMuX3k0ID0gdGhpcy5feTUgPSBOYU47XG4gICAgdGhpcy5fbDAxX2EgPSB0aGlzLl9sMTJfYSA9IHRoaXMuX2wyM19hID1cbiAgICB0aGlzLl9sMDFfMmEgPSB0aGlzLl9sMTJfMmEgPSB0aGlzLl9sMjNfMmEgPVxuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAxOiB7XG4gICAgICAgIHRoaXMuX2NvbnRleHQubW92ZVRvKHRoaXMuX3gzLCB0aGlzLl95Myk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSAyOiB7XG4gICAgICAgIHRoaXMuX2NvbnRleHQubGluZVRvKHRoaXMuX3gzLCB0aGlzLl95Myk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSAzOiB7XG4gICAgICAgIHRoaXMucG9pbnQodGhpcy5feDMsIHRoaXMuX3kzKTtcbiAgICAgICAgdGhpcy5wb2ludCh0aGlzLl94NCwgdGhpcy5feTQpO1xuICAgICAgICB0aGlzLnBvaW50KHRoaXMuX3g1LCB0aGlzLl95NSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB4ID0gK3gsIHkgPSAreTtcblxuICAgIGlmICh0aGlzLl9wb2ludCkge1xuICAgICAgdmFyIHgyMyA9IHRoaXMuX3gyIC0geCxcbiAgICAgICAgICB5MjMgPSB0aGlzLl95MiAtIHk7XG4gICAgICB0aGlzLl9sMjNfYSA9IE1hdGguc3FydCh0aGlzLl9sMjNfMmEgPSBNYXRoLnBvdyh4MjMgKiB4MjMgKyB5MjMgKiB5MjMsIHRoaXMuX2FscGhhKSk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IHRoaXMuX3gzID0geCwgdGhpcy5feTMgPSB5OyBicmVhaztcbiAgICAgIGNhc2UgMTogdGhpcy5fcG9pbnQgPSAyOyB0aGlzLl9jb250ZXh0Lm1vdmVUbyh0aGlzLl94NCA9IHgsIHRoaXMuX3k0ID0geSk7IGJyZWFrO1xuICAgICAgY2FzZSAyOiB0aGlzLl9wb2ludCA9IDM7IHRoaXMuX3g1ID0geCwgdGhpcy5feTUgPSB5OyBicmVhaztcbiAgICAgIGRlZmF1bHQ6IHBvaW50JDIodGhpcywgeCwgeSk7IGJyZWFrO1xuICAgIH1cblxuICAgIHRoaXMuX2wwMV9hID0gdGhpcy5fbDEyX2EsIHRoaXMuX2wxMl9hID0gdGhpcy5fbDIzX2E7XG4gICAgdGhpcy5fbDAxXzJhID0gdGhpcy5fbDEyXzJhLCB0aGlzLl9sMTJfMmEgPSB0aGlzLl9sMjNfMmE7XG4gICAgdGhpcy5feDAgPSB0aGlzLl94MSwgdGhpcy5feDEgPSB0aGlzLl94MiwgdGhpcy5feDIgPSB4O1xuICAgIHRoaXMuX3kwID0gdGhpcy5feTEsIHRoaXMuX3kxID0gdGhpcy5feTIsIHRoaXMuX3kyID0geTtcbiAgfVxufTtcblxudmFyIGNhdG11bGxSb21DbG9zZWQgPSAoZnVuY3Rpb24gY3VzdG9tKGFscGhhKSB7XG5cbiAgZnVuY3Rpb24gY2F0bXVsbFJvbShjb250ZXh0KSB7XG4gICAgcmV0dXJuIGFscGhhID8gbmV3IENhdG11bGxSb21DbG9zZWQoY29udGV4dCwgYWxwaGEpIDogbmV3IENhcmRpbmFsQ2xvc2VkKGNvbnRleHQsIDApO1xuICB9XG5cbiAgY2F0bXVsbFJvbS5hbHBoYSA9IGZ1bmN0aW9uKGFscGhhKSB7XG4gICAgcmV0dXJuIGN1c3RvbSgrYWxwaGEpO1xuICB9O1xuXG4gIHJldHVybiBjYXRtdWxsUm9tO1xufSkoMC41KTtcblxuZnVuY3Rpb24gQ2F0bXVsbFJvbU9wZW4oY29udGV4dCwgYWxwaGEpIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuX2FscGhhID0gYWxwaGE7XG59XG5cbkNhdG11bGxSb21PcGVuLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gMDtcbiAgfSxcbiAgYXJlYUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IE5hTjtcbiAgfSxcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxID0gdGhpcy5feDIgPVxuICAgIHRoaXMuX3kwID0gdGhpcy5feTEgPSB0aGlzLl95MiA9IE5hTjtcbiAgICB0aGlzLl9sMDFfYSA9IHRoaXMuX2wxMl9hID0gdGhpcy5fbDIzX2EgPVxuICAgIHRoaXMuX2wwMV8yYSA9IHRoaXMuX2wxMl8yYSA9IHRoaXMuX2wyM18yYSA9XG4gICAgdGhpcy5fcG9pbnQgPSAwO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fbGluZSB8fCAodGhpcy5fbGluZSAhPT0gMCAmJiB0aGlzLl9wb2ludCA9PT0gMykpIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgdGhpcy5fbGluZSA9IDEgLSB0aGlzLl9saW5lO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSAreCwgeSA9ICt5O1xuXG4gICAgaWYgKHRoaXMuX3BvaW50KSB7XG4gICAgICB2YXIgeDIzID0gdGhpcy5feDIgLSB4LFxuICAgICAgICAgIHkyMyA9IHRoaXMuX3kyIC0geTtcbiAgICAgIHRoaXMuX2wyM19hID0gTWF0aC5zcXJ0KHRoaXMuX2wyM18yYSA9IE1hdGgucG93KHgyMyAqIHgyMyArIHkyMyAqIHkyMywgdGhpcy5fYWxwaGEpKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDA6IHRoaXMuX3BvaW50ID0gMTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgYnJlYWs7XG4gICAgICBjYXNlIDI6IHRoaXMuX3BvaW50ID0gMzsgdGhpcy5fbGluZSA/IHRoaXMuX2NvbnRleHQubGluZVRvKHRoaXMuX3gyLCB0aGlzLl95MikgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh0aGlzLl94MiwgdGhpcy5feTIpOyBicmVhaztcbiAgICAgIGNhc2UgMzogdGhpcy5fcG9pbnQgPSA0OyAvLyBwcm9jZWVkXG4gICAgICBkZWZhdWx0OiBwb2ludCQyKHRoaXMsIHgsIHkpOyBicmVhaztcbiAgICB9XG5cbiAgICB0aGlzLl9sMDFfYSA9IHRoaXMuX2wxMl9hLCB0aGlzLl9sMTJfYSA9IHRoaXMuX2wyM19hO1xuICAgIHRoaXMuX2wwMV8yYSA9IHRoaXMuX2wxMl8yYSwgdGhpcy5fbDEyXzJhID0gdGhpcy5fbDIzXzJhO1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEsIHRoaXMuX3gxID0gdGhpcy5feDIsIHRoaXMuX3gyID0geDtcbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxLCB0aGlzLl95MSA9IHRoaXMuX3kyLCB0aGlzLl95MiA9IHk7XG4gIH1cbn07XG5cbnZhciBjYXRtdWxsUm9tT3BlbiA9IChmdW5jdGlvbiBjdXN0b20oYWxwaGEpIHtcblxuICBmdW5jdGlvbiBjYXRtdWxsUm9tKGNvbnRleHQpIHtcbiAgICByZXR1cm4gYWxwaGEgPyBuZXcgQ2F0bXVsbFJvbU9wZW4oY29udGV4dCwgYWxwaGEpIDogbmV3IENhcmRpbmFsT3Blbihjb250ZXh0LCAwKTtcbiAgfVxuXG4gIGNhdG11bGxSb20uYWxwaGEgPSBmdW5jdGlvbihhbHBoYSkge1xuICAgIHJldHVybiBjdXN0b20oK2FscGhhKTtcbiAgfTtcblxuICByZXR1cm4gY2F0bXVsbFJvbTtcbn0pKDAuNSk7XG5cbmZ1bmN0aW9uIExpbmVhckNsb3NlZChjb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufVxuXG5MaW5lYXJDbG9zZWQucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IG5vb3AsXG4gIGFyZWFFbmQ6IG5vb3AsXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcG9pbnQgPSAwO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fcG9pbnQpIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG4gICAgaWYgKHRoaXMuX3BvaW50KSB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KTtcbiAgICBlbHNlIHRoaXMuX3BvaW50ID0gMSwgdGhpcy5fY29udGV4dC5tb3ZlVG8oeCwgeSk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGxpbmVhckNsb3NlZChjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgTGluZWFyQ2xvc2VkKGNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiBzaWduKHgpIHtcbiAgcmV0dXJuIHggPCAwID8gLTEgOiAxO1xufVxuXG4vLyBDYWxjdWxhdGUgdGhlIHNsb3BlcyBvZiB0aGUgdGFuZ2VudHMgKEhlcm1pdGUtdHlwZSBpbnRlcnBvbGF0aW9uKSBiYXNlZCBvblxuLy8gdGhlIGZvbGxvd2luZyBwYXBlcjogU3RlZmZlbiwgTS4gMTk5MC4gQSBTaW1wbGUgTWV0aG9kIGZvciBNb25vdG9uaWNcbi8vIEludGVycG9sYXRpb24gaW4gT25lIERpbWVuc2lvbi4gQXN0cm9ub215IGFuZCBBc3Ryb3BoeXNpY3MsIFZvbC4gMjM5LCBOTy5cbi8vIE5PVihJSSksIFAuIDQ0MywgMTk5MC5cbmZ1bmN0aW9uIHNsb3BlMyh0aGF0LCB4MiwgeTIpIHtcbiAgdmFyIGgwID0gdGhhdC5feDEgLSB0aGF0Ll94MCxcbiAgICAgIGgxID0geDIgLSB0aGF0Ll94MSxcbiAgICAgIHMwID0gKHRoYXQuX3kxIC0gdGhhdC5feTApIC8gKGgwIHx8IGgxIDwgMCAmJiAtMCksXG4gICAgICBzMSA9ICh5MiAtIHRoYXQuX3kxKSAvIChoMSB8fCBoMCA8IDAgJiYgLTApLFxuICAgICAgcCA9IChzMCAqIGgxICsgczEgKiBoMCkgLyAoaDAgKyBoMSk7XG4gIHJldHVybiAoc2lnbihzMCkgKyBzaWduKHMxKSkgKiBNYXRoLm1pbihNYXRoLmFicyhzMCksIE1hdGguYWJzKHMxKSwgMC41ICogTWF0aC5hYnMocCkpIHx8IDA7XG59XG5cbi8vIENhbGN1bGF0ZSBhIG9uZS1zaWRlZCBzbG9wZS5cbmZ1bmN0aW9uIHNsb3BlMih0aGF0LCB0KSB7XG4gIHZhciBoID0gdGhhdC5feDEgLSB0aGF0Ll94MDtcbiAgcmV0dXJuIGggPyAoMyAqICh0aGF0Ll95MSAtIHRoYXQuX3kwKSAvIGggLSB0KSAvIDIgOiB0O1xufVxuXG4vLyBBY2NvcmRpbmcgdG8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ3ViaWNfSGVybWl0ZV9zcGxpbmUjUmVwcmVzZW50YXRpb25zXG4vLyBcInlvdSBjYW4gZXhwcmVzcyBjdWJpYyBIZXJtaXRlIGludGVycG9sYXRpb24gaW4gdGVybXMgb2YgY3ViaWMgQsOpemllciBjdXJ2ZXNcbi8vIHdpdGggcmVzcGVjdCB0byB0aGUgZm91ciB2YWx1ZXMgcDAsIHAwICsgbTAgLyAzLCBwMSAtIG0xIC8gMywgcDFcIi5cbmZ1bmN0aW9uIHBvaW50JDModGhhdCwgdDAsIHQxKSB7XG4gIHZhciB4MCA9IHRoYXQuX3gwLFxuICAgICAgeTAgPSB0aGF0Ll95MCxcbiAgICAgIHgxID0gdGhhdC5feDEsXG4gICAgICB5MSA9IHRoYXQuX3kxLFxuICAgICAgZHggPSAoeDEgLSB4MCkgLyAzO1xuICB0aGF0Ll9jb250ZXh0LmJlemllckN1cnZlVG8oeDAgKyBkeCwgeTAgKyBkeCAqIHQwLCB4MSAtIGR4LCB5MSAtIGR4ICogdDEsIHgxLCB5MSk7XG59XG5cbmZ1bmN0aW9uIE1vbm90b25lWChjb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufVxuXG5Nb25vdG9uZVgucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPVxuICAgIHRoaXMuX3kwID0gdGhpcy5feTEgPVxuICAgIHRoaXMuX3QwID0gTmFOO1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAyOiB0aGlzLl9jb250ZXh0LmxpbmVUbyh0aGlzLl94MSwgdGhpcy5feTEpOyBicmVhaztcbiAgICAgIGNhc2UgMzogcG9pbnQkMyh0aGlzLCB0aGlzLl90MCwgc2xvcGUyKHRoaXMsIHRoaXMuX3QwKSk7IGJyZWFrO1xuICAgIH1cbiAgICBpZiAodGhpcy5fbGluZSB8fCAodGhpcy5fbGluZSAhPT0gMCAmJiB0aGlzLl9wb2ludCA9PT0gMSkpIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgdGhpcy5fbGluZSA9IDEgLSB0aGlzLl9saW5lO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHZhciB0MSA9IE5hTjtcblxuICAgIHggPSAreCwgeSA9ICt5O1xuICAgIGlmICh4ID09PSB0aGlzLl94MSAmJiB5ID09PSB0aGlzLl95MSkgcmV0dXJuOyAvLyBJZ25vcmUgY29pbmNpZGVudCBwb2ludHMuXG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KSA6IHRoaXMuX2NvbnRleHQubW92ZVRvKHgsIHkpOyBicmVhaztcbiAgICAgIGNhc2UgMTogdGhpcy5fcG9pbnQgPSAyOyBicmVhaztcbiAgICAgIGNhc2UgMjogdGhpcy5fcG9pbnQgPSAzOyBwb2ludCQzKHRoaXMsIHNsb3BlMih0aGlzLCB0MSA9IHNsb3BlMyh0aGlzLCB4LCB5KSksIHQxKTsgYnJlYWs7XG4gICAgICBkZWZhdWx0OiBwb2ludCQzKHRoaXMsIHRoaXMuX3QwLCB0MSA9IHNsb3BlMyh0aGlzLCB4LCB5KSk7IGJyZWFrO1xuICAgIH1cblxuICAgIHRoaXMuX3gwID0gdGhpcy5feDEsIHRoaXMuX3gxID0geDtcbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxLCB0aGlzLl95MSA9IHk7XG4gICAgdGhpcy5fdDAgPSB0MTtcbiAgfVxufVxuXG5mdW5jdGlvbiBNb25vdG9uZVkoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gbmV3IFJlZmxlY3RDb250ZXh0KGNvbnRleHQpO1xufVxuXG4oTW9ub3RvbmVZLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTW9ub3RvbmVYLnByb3RvdHlwZSkpLnBvaW50ID0gZnVuY3Rpb24oeCwgeSkge1xuICBNb25vdG9uZVgucHJvdG90eXBlLnBvaW50LmNhbGwodGhpcywgeSwgeCk7XG59O1xuXG5mdW5jdGlvbiBSZWZsZWN0Q29udGV4dChjb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufVxuXG5SZWZsZWN0Q29udGV4dC5wcm90b3R5cGUgPSB7XG4gIG1vdmVUbzogZnVuY3Rpb24oeCwgeSkgeyB0aGlzLl9jb250ZXh0Lm1vdmVUbyh5LCB4KTsgfSxcbiAgY2xvc2VQYXRoOiBmdW5jdGlvbigpIHsgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTsgfSxcbiAgbGluZVRvOiBmdW5jdGlvbih4LCB5KSB7IHRoaXMuX2NvbnRleHQubGluZVRvKHksIHgpOyB9LFxuICBiZXppZXJDdXJ2ZVRvOiBmdW5jdGlvbih4MSwgeTEsIHgyLCB5MiwgeCwgeSkgeyB0aGlzLl9jb250ZXh0LmJlemllckN1cnZlVG8oeTEsIHgxLCB5MiwgeDIsIHksIHgpOyB9XG59O1xuXG5mdW5jdGlvbiBtb25vdG9uZVgoY29udGV4dCkge1xuICByZXR1cm4gbmV3IE1vbm90b25lWChjb250ZXh0KTtcbn1cblxuZnVuY3Rpb24gbW9ub3RvbmVZKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBNb25vdG9uZVkoY29udGV4dCk7XG59XG5cbmZ1bmN0aW9uIE5hdHVyYWwoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuTmF0dXJhbC5wcm90b3R5cGUgPSB7XG4gIGFyZWFTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IDA7XG4gIH0sXG4gIGFyZWFFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSBOYU47XG4gIH0sXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5feCA9IFtdO1xuICAgIHRoaXMuX3kgPSBbXTtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHggPSB0aGlzLl94LFxuICAgICAgICB5ID0gdGhpcy5feSxcbiAgICAgICAgbiA9IHgubGVuZ3RoO1xuXG4gICAgaWYgKG4pIHtcbiAgICAgIHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh4WzBdLCB5WzBdKSA6IHRoaXMuX2NvbnRleHQubW92ZVRvKHhbMF0sIHlbMF0pO1xuICAgICAgaWYgKG4gPT09IDIpIHtcbiAgICAgICAgdGhpcy5fY29udGV4dC5saW5lVG8oeFsxXSwgeVsxXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcHggPSBjb250cm9sUG9pbnRzKHgpLFxuICAgICAgICAgICAgcHkgPSBjb250cm9sUG9pbnRzKHkpO1xuICAgICAgICBmb3IgKHZhciBpMCA9IDAsIGkxID0gMTsgaTEgPCBuOyArK2kwLCArK2kxKSB7XG4gICAgICAgICAgdGhpcy5fY29udGV4dC5iZXppZXJDdXJ2ZVRvKHB4WzBdW2kwXSwgcHlbMF1baTBdLCBweFsxXVtpMF0sIHB5WzFdW2kwXSwgeFtpMV0sIHlbaTFdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9saW5lIHx8ICh0aGlzLl9saW5lICE9PSAwICYmIG4gPT09IDEpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgICB0aGlzLl94ID0gdGhpcy5feSA9IG51bGw7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5feC5wdXNoKCt4KTtcbiAgICB0aGlzLl95LnB1c2goK3kpO1xuICB9XG59O1xuXG4vLyBTZWUgaHR0cHM6Ly93d3cucGFydGljbGVpbmNlbGwuY29tLzIwMTIvYmV6aWVyLXNwbGluZXMvIGZvciBkZXJpdmF0aW9uLlxuZnVuY3Rpb24gY29udHJvbFBvaW50cyh4KSB7XG4gIHZhciBpLFxuICAgICAgbiA9IHgubGVuZ3RoIC0gMSxcbiAgICAgIG0sXG4gICAgICBhID0gbmV3IEFycmF5KG4pLFxuICAgICAgYiA9IG5ldyBBcnJheShuKSxcbiAgICAgIHIgPSBuZXcgQXJyYXkobik7XG4gIGFbMF0gPSAwLCBiWzBdID0gMiwgclswXSA9IHhbMF0gKyAyICogeFsxXTtcbiAgZm9yIChpID0gMTsgaSA8IG4gLSAxOyArK2kpIGFbaV0gPSAxLCBiW2ldID0gNCwgcltpXSA9IDQgKiB4W2ldICsgMiAqIHhbaSArIDFdO1xuICBhW24gLSAxXSA9IDIsIGJbbiAtIDFdID0gNywgcltuIC0gMV0gPSA4ICogeFtuIC0gMV0gKyB4W25dO1xuICBmb3IgKGkgPSAxOyBpIDwgbjsgKytpKSBtID0gYVtpXSAvIGJbaSAtIDFdLCBiW2ldIC09IG0sIHJbaV0gLT0gbSAqIHJbaSAtIDFdO1xuICBhW24gLSAxXSA9IHJbbiAtIDFdIC8gYltuIC0gMV07XG4gIGZvciAoaSA9IG4gLSAyOyBpID49IDA7IC0taSkgYVtpXSA9IChyW2ldIC0gYVtpICsgMV0pIC8gYltpXTtcbiAgYltuIC0gMV0gPSAoeFtuXSArIGFbbiAtIDFdKSAvIDI7XG4gIGZvciAoaSA9IDA7IGkgPCBuIC0gMTsgKytpKSBiW2ldID0gMiAqIHhbaSArIDFdIC0gYVtpICsgMV07XG4gIHJldHVybiBbYSwgYl07XG59XG5cbmZ1bmN0aW9uIG5hdHVyYWwoY29udGV4dCkge1xuICByZXR1cm4gbmV3IE5hdHVyYWwoY29udGV4dCk7XG59XG5cbmZ1bmN0aW9uIFN0ZXAoY29udGV4dCwgdCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5fdCA9IHQ7XG59XG5cblN0ZXAucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3ggPSB0aGlzLl95ID0gTmFOO1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKDAgPCB0aGlzLl90ICYmIHRoaXMuX3QgPCAxICYmIHRoaXMuX3BvaW50ID09PSAyKSB0aGlzLl9jb250ZXh0LmxpbmVUbyh0aGlzLl94LCB0aGlzLl95KTtcbiAgICBpZiAodGhpcy5fbGluZSB8fCAodGhpcy5fbGluZSAhPT0gMCAmJiB0aGlzLl9wb2ludCA9PT0gMSkpIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgaWYgKHRoaXMuX2xpbmUgPj0gMCkgdGhpcy5fdCA9IDEgLSB0aGlzLl90LCB0aGlzLl9saW5lID0gMSAtIHRoaXMuX2xpbmU7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KSA6IHRoaXMuX2NvbnRleHQubW92ZVRvKHgsIHkpOyBicmVhaztcbiAgICAgIGNhc2UgMTogdGhpcy5fcG9pbnQgPSAyOyAvLyBwcm9jZWVkXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGlmICh0aGlzLl90IDw9IDApIHtcbiAgICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbyh0aGlzLl94LCB5KTtcbiAgICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgeDEgPSB0aGlzLl94ICogKDEgLSB0aGlzLl90KSArIHggKiB0aGlzLl90O1xuICAgICAgICAgIHRoaXMuX2NvbnRleHQubGluZVRvKHgxLCB0aGlzLl95KTtcbiAgICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbyh4MSwgeSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3ggPSB4LCB0aGlzLl95ID0geTtcbiAgfVxufTtcblxuZnVuY3Rpb24gc3RlcChjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgU3RlcChjb250ZXh0LCAwLjUpO1xufVxuXG5mdW5jdGlvbiBzdGVwQmVmb3JlKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBTdGVwKGNvbnRleHQsIDApO1xufVxuXG5mdW5jdGlvbiBzdGVwQWZ0ZXIoY29udGV4dCkge1xuICByZXR1cm4gbmV3IFN0ZXAoY29udGV4dCwgMSk7XG59XG5cbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuZnVuY3Rpb24gbm9uZShzZXJpZXMsIG9yZGVyKSB7XG4gIGlmICghKChuID0gc2VyaWVzLmxlbmd0aCkgPiAxKSkgcmV0dXJuO1xuICBmb3IgKHZhciBpID0gMSwgczAsIHMxID0gc2VyaWVzW29yZGVyWzBdXSwgbiwgbSA9IHMxLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgIHMwID0gczEsIHMxID0gc2VyaWVzW29yZGVyW2ldXTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IG07ICsraikge1xuICAgICAgczFbal1bMV0gKz0gczFbal1bMF0gPSBpc05hTihzMFtqXVsxXSkgPyBzMFtqXVswXSA6IHMwW2pdWzFdO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBub25lJDEoc2VyaWVzKSB7XG4gIHZhciBuID0gc2VyaWVzLmxlbmd0aCwgbyA9IG5ldyBBcnJheShuKTtcbiAgd2hpbGUgKC0tbiA+PSAwKSBvW25dID0gbjtcbiAgcmV0dXJuIG87XG59XG5cbmZ1bmN0aW9uIHN0YWNrVmFsdWUoZCwga2V5KSB7XG4gIHJldHVybiBkW2tleV07XG59XG5cbmZ1bmN0aW9uIHN0YWNrKCkge1xuICB2YXIga2V5cyA9IGNvbnN0YW50KFtdKSxcbiAgICAgIG9yZGVyID0gbm9uZSQxLFxuICAgICAgb2Zmc2V0ID0gbm9uZSxcbiAgICAgIHZhbHVlID0gc3RhY2tWYWx1ZTtcblxuICBmdW5jdGlvbiBzdGFjayhkYXRhKSB7XG4gICAgdmFyIGt6ID0ga2V5cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpLFxuICAgICAgICBpLFxuICAgICAgICBtID0gZGF0YS5sZW5ndGgsXG4gICAgICAgIG4gPSBrei5sZW5ndGgsXG4gICAgICAgIHN6ID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBvejtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGZvciAodmFyIGtpID0ga3pbaV0sIHNpID0gc3pbaV0gPSBuZXcgQXJyYXkobSksIGogPSAwLCBzaWo7IGogPCBtOyArK2opIHtcbiAgICAgICAgc2lbal0gPSBzaWogPSBbMCwgK3ZhbHVlKGRhdGFbal0sIGtpLCBqLCBkYXRhKV07XG4gICAgICAgIHNpai5kYXRhID0gZGF0YVtqXTtcbiAgICAgIH1cbiAgICAgIHNpLmtleSA9IGtpO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDAsIG96ID0gb3JkZXIoc3opOyBpIDwgbjsgKytpKSB7XG4gICAgICBzeltveltpXV0uaW5kZXggPSBpO1xuICAgIH1cblxuICAgIG9mZnNldChzeiwgb3opO1xuICAgIHJldHVybiBzejtcbiAgfVxuXG4gIHN0YWNrLmtleXMgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoa2V5cyA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoc2xpY2UuY2FsbChfKSksIHN0YWNrKSA6IGtleXM7XG4gIH07XG5cbiAgc3RhY2sudmFsdWUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodmFsdWUgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgc3RhY2spIDogdmFsdWU7XG4gIH07XG5cbiAgc3RhY2sub3JkZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAob3JkZXIgPSBfID09IG51bGwgPyBub25lJDEgOiB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KHNsaWNlLmNhbGwoXykpLCBzdGFjaykgOiBvcmRlcjtcbiAgfTtcblxuICBzdGFjay5vZmZzZXQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAob2Zmc2V0ID0gXyA9PSBudWxsID8gbm9uZSA6IF8sIHN0YWNrKSA6IG9mZnNldDtcbiAgfTtcblxuICByZXR1cm4gc3RhY2s7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZChzZXJpZXMsIG9yZGVyKSB7XG4gIGlmICghKChuID0gc2VyaWVzLmxlbmd0aCkgPiAwKSkgcmV0dXJuO1xuICBmb3IgKHZhciBpLCBuLCBqID0gMCwgbSA9IHNlcmllc1swXS5sZW5ndGgsIHk7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHkgPSBpID0gMDsgaSA8IG47ICsraSkgeSArPSBzZXJpZXNbaV1bal1bMV0gfHwgMDtcbiAgICBpZiAoeSkgZm9yIChpID0gMDsgaSA8IG47ICsraSkgc2VyaWVzW2ldW2pdWzFdIC89IHk7XG4gIH1cbiAgbm9uZShzZXJpZXMsIG9yZGVyKTtcbn1cblxuZnVuY3Rpb24gc2lsaG91ZXR0ZShzZXJpZXMsIG9yZGVyKSB7XG4gIGlmICghKChuID0gc2VyaWVzLmxlbmd0aCkgPiAwKSkgcmV0dXJuO1xuICBmb3IgKHZhciBqID0gMCwgczAgPSBzZXJpZXNbb3JkZXJbMF1dLCBuLCBtID0gczAubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIHkgPSAwOyBpIDwgbjsgKytpKSB5ICs9IHNlcmllc1tpXVtqXVsxXSB8fCAwO1xuICAgIHMwW2pdWzFdICs9IHMwW2pdWzBdID0gLXkgLyAyO1xuICB9XG4gIG5vbmUoc2VyaWVzLCBvcmRlcik7XG59XG5cbmZ1bmN0aW9uIHdpZ2dsZShzZXJpZXMsIG9yZGVyKSB7XG4gIGlmICghKChuID0gc2VyaWVzLmxlbmd0aCkgPiAwKSB8fCAhKChtID0gKHMwID0gc2VyaWVzW29yZGVyWzBdXSkubGVuZ3RoKSA+IDApKSByZXR1cm47XG4gIGZvciAodmFyIHkgPSAwLCBqID0gMSwgczAsIG0sIG47IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBpID0gMCwgczEgPSAwLCBzMiA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBzaSA9IHNlcmllc1tvcmRlcltpXV0sXG4gICAgICAgICAgc2lqMCA9IHNpW2pdWzFdIHx8IDAsXG4gICAgICAgICAgc2lqMSA9IHNpW2ogLSAxXVsxXSB8fCAwLFxuICAgICAgICAgIHMzID0gKHNpajAgLSBzaWoxKSAvIDI7XG4gICAgICBmb3IgKHZhciBrID0gMDsgayA8IGk7ICsraykge1xuICAgICAgICB2YXIgc2sgPSBzZXJpZXNbb3JkZXJba11dLFxuICAgICAgICAgICAgc2tqMCA9IHNrW2pdWzFdIHx8IDAsXG4gICAgICAgICAgICBza2oxID0gc2tbaiAtIDFdWzFdIHx8IDA7XG4gICAgICAgIHMzICs9IHNrajAgLSBza2oxO1xuICAgICAgfVxuICAgICAgczEgKz0gc2lqMCwgczIgKz0gczMgKiBzaWowO1xuICAgIH1cbiAgICBzMFtqIC0gMV1bMV0gKz0gczBbaiAtIDFdWzBdID0geTtcbiAgICBpZiAoczEpIHkgLT0gczIgLyBzMTtcbiAgfVxuICBzMFtqIC0gMV1bMV0gKz0gczBbaiAtIDFdWzBdID0geTtcbiAgbm9uZShzZXJpZXMsIG9yZGVyKTtcbn1cblxuZnVuY3Rpb24gYXNjZW5kaW5nKHNlcmllcykge1xuICB2YXIgc3VtcyA9IHNlcmllcy5tYXAoc3VtKTtcbiAgcmV0dXJuIG5vbmUkMShzZXJpZXMpLnNvcnQoZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gc3Vtc1thXSAtIHN1bXNbYl07IH0pO1xufVxuXG5mdW5jdGlvbiBzdW0oc2VyaWVzKSB7XG4gIHZhciBzID0gMCwgaSA9IC0xLCBuID0gc2VyaWVzLmxlbmd0aCwgdjtcbiAgd2hpbGUgKCsraSA8IG4pIGlmICh2ID0gK3Nlcmllc1tpXVsxXSkgcyArPSB2O1xuICByZXR1cm4gcztcbn1cblxuZnVuY3Rpb24gZGVzY2VuZGluZyQxKHNlcmllcykge1xuICByZXR1cm4gYXNjZW5kaW5nKHNlcmllcykucmV2ZXJzZSgpO1xufVxuXG5mdW5jdGlvbiBpbnNpZGVPdXQoc2VyaWVzKSB7XG4gIHZhciBuID0gc2VyaWVzLmxlbmd0aCxcbiAgICAgIGksXG4gICAgICBqLFxuICAgICAgc3VtcyA9IHNlcmllcy5tYXAoc3VtKSxcbiAgICAgIG9yZGVyID0gbm9uZSQxKHNlcmllcykuc29ydChmdW5jdGlvbihhLCBiKSB7IHJldHVybiBzdW1zW2JdIC0gc3Vtc1thXTsgfSksXG4gICAgICB0b3AgPSAwLFxuICAgICAgYm90dG9tID0gMCxcbiAgICAgIHRvcHMgPSBbXSxcbiAgICAgIGJvdHRvbXMgPSBbXTtcblxuICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgaiA9IG9yZGVyW2ldO1xuICAgIGlmICh0b3AgPCBib3R0b20pIHtcbiAgICAgIHRvcCArPSBzdW1zW2pdO1xuICAgICAgdG9wcy5wdXNoKGopO1xuICAgIH0gZWxzZSB7XG4gICAgICBib3R0b20gKz0gc3Vtc1tqXTtcbiAgICAgIGJvdHRvbXMucHVzaChqKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYm90dG9tcy5yZXZlcnNlKCkuY29uY2F0KHRvcHMpO1xufVxuXG5mdW5jdGlvbiByZXZlcnNlKHNlcmllcykge1xuICByZXR1cm4gbm9uZSQxKHNlcmllcykucmV2ZXJzZSgpO1xufVxuXG5leHBvcnRzLmFyYyA9IGFyYztcbmV4cG9ydHMuYXJlYSA9IGFyZWE7XG5leHBvcnRzLmxpbmUgPSBsaW5lO1xuZXhwb3J0cy5waWUgPSBwaWU7XG5leHBvcnRzLnJhZGlhbEFyZWEgPSByYWRpYWxBcmVhO1xuZXhwb3J0cy5yYWRpYWxMaW5lID0gcmFkaWFsTGluZSQxO1xuZXhwb3J0cy5zeW1ib2wgPSBzeW1ib2w7XG5leHBvcnRzLnN5bWJvbHMgPSBzeW1ib2xzO1xuZXhwb3J0cy5zeW1ib2xDaXJjbGUgPSBjaXJjbGU7XG5leHBvcnRzLnN5bWJvbENyb3NzID0gY3Jvc3M7XG5leHBvcnRzLnN5bWJvbERpYW1vbmQgPSBkaWFtb25kO1xuZXhwb3J0cy5zeW1ib2xTcXVhcmUgPSBzcXVhcmU7XG5leHBvcnRzLnN5bWJvbFN0YXIgPSBzdGFyO1xuZXhwb3J0cy5zeW1ib2xUcmlhbmdsZSA9IHRyaWFuZ2xlO1xuZXhwb3J0cy5zeW1ib2xXeWUgPSB3eWU7XG5leHBvcnRzLmN1cnZlQmFzaXNDbG9zZWQgPSBiYXNpc0Nsb3NlZDtcbmV4cG9ydHMuY3VydmVCYXNpc09wZW4gPSBiYXNpc09wZW47XG5leHBvcnRzLmN1cnZlQmFzaXMgPSBiYXNpcztcbmV4cG9ydHMuY3VydmVCdW5kbGUgPSBidW5kbGU7XG5leHBvcnRzLmN1cnZlQ2FyZGluYWxDbG9zZWQgPSBjYXJkaW5hbENsb3NlZDtcbmV4cG9ydHMuY3VydmVDYXJkaW5hbE9wZW4gPSBjYXJkaW5hbE9wZW47XG5leHBvcnRzLmN1cnZlQ2FyZGluYWwgPSBjYXJkaW5hbDtcbmV4cG9ydHMuY3VydmVDYXRtdWxsUm9tQ2xvc2VkID0gY2F0bXVsbFJvbUNsb3NlZDtcbmV4cG9ydHMuY3VydmVDYXRtdWxsUm9tT3BlbiA9IGNhdG11bGxSb21PcGVuO1xuZXhwb3J0cy5jdXJ2ZUNhdG11bGxSb20gPSBjYXRtdWxsUm9tO1xuZXhwb3J0cy5jdXJ2ZUxpbmVhckNsb3NlZCA9IGxpbmVhckNsb3NlZDtcbmV4cG9ydHMuY3VydmVMaW5lYXIgPSBjdXJ2ZUxpbmVhcjtcbmV4cG9ydHMuY3VydmVNb25vdG9uZVggPSBtb25vdG9uZVg7XG5leHBvcnRzLmN1cnZlTW9ub3RvbmVZID0gbW9ub3RvbmVZO1xuZXhwb3J0cy5jdXJ2ZU5hdHVyYWwgPSBuYXR1cmFsO1xuZXhwb3J0cy5jdXJ2ZVN0ZXAgPSBzdGVwO1xuZXhwb3J0cy5jdXJ2ZVN0ZXBBZnRlciA9IHN0ZXBBZnRlcjtcbmV4cG9ydHMuY3VydmVTdGVwQmVmb3JlID0gc3RlcEJlZm9yZTtcbmV4cG9ydHMuc3RhY2sgPSBzdGFjaztcbmV4cG9ydHMuc3RhY2tPZmZzZXRFeHBhbmQgPSBleHBhbmQ7XG5leHBvcnRzLnN0YWNrT2Zmc2V0Tm9uZSA9IG5vbmU7XG5leHBvcnRzLnN0YWNrT2Zmc2V0U2lsaG91ZXR0ZSA9IHNpbGhvdWV0dGU7XG5leHBvcnRzLnN0YWNrT2Zmc2V0V2lnZ2xlID0gd2lnZ2xlO1xuZXhwb3J0cy5zdGFja09yZGVyQXNjZW5kaW5nID0gYXNjZW5kaW5nO1xuZXhwb3J0cy5zdGFja09yZGVyRGVzY2VuZGluZyA9IGRlc2NlbmRpbmckMTtcbmV4cG9ydHMuc3RhY2tPcmRlckluc2lkZU91dCA9IGluc2lkZU91dDtcbmV4cG9ydHMuc3RhY2tPcmRlck5vbmUgPSBub25lJDE7XG5leHBvcnRzLnN0YWNrT3JkZXJSZXZlcnNlID0gcmV2ZXJzZTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTsiLCIvLyBodHRwczovL2QzanMub3JnL2QzLXRpbWUtZm9ybWF0LyBWZXJzaW9uIDIuMC41LiBDb3B5cmlnaHQgMjAxNyBNaWtlIEJvc3RvY2suXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuXHR0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMsIHJlcXVpcmUoJ2QzLXRpbWUnKSkgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJywgJ2QzLXRpbWUnXSwgZmFjdG9yeSkgOlxuXHQoZmFjdG9yeSgoZ2xvYmFsLmQzID0gZ2xvYmFsLmQzIHx8IHt9KSxnbG9iYWwuZDMpKTtcbn0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzLGQzVGltZSkgeyAndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGxvY2FsRGF0ZShkKSB7XG4gIGlmICgwIDw9IGQueSAmJiBkLnkgPCAxMDApIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKC0xLCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKTtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKGQueSk7XG4gICAgcmV0dXJuIGRhdGU7XG4gIH1cbiAgcmV0dXJuIG5ldyBEYXRlKGQueSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCk7XG59XG5cbmZ1bmN0aW9uIHV0Y0RhdGUoZCkge1xuICBpZiAoMCA8PSBkLnkgJiYgZC55IDwgMTAwKSB7XG4gICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQygtMSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCkpO1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoZC55KTtcbiAgICByZXR1cm4gZGF0ZTtcbiAgfVxuICByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoZC55LCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKSk7XG59XG5cbmZ1bmN0aW9uIG5ld1llYXIoeSkge1xuICByZXR1cm4ge3k6IHksIG06IDAsIGQ6IDEsIEg6IDAsIE06IDAsIFM6IDAsIEw6IDB9O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRMb2NhbGUobG9jYWxlKSB7XG4gIHZhciBsb2NhbGVfZGF0ZVRpbWUgPSBsb2NhbGUuZGF0ZVRpbWUsXG4gICAgICBsb2NhbGVfZGF0ZSA9IGxvY2FsZS5kYXRlLFxuICAgICAgbG9jYWxlX3RpbWUgPSBsb2NhbGUudGltZSxcbiAgICAgIGxvY2FsZV9wZXJpb2RzID0gbG9jYWxlLnBlcmlvZHMsXG4gICAgICBsb2NhbGVfd2Vla2RheXMgPSBsb2NhbGUuZGF5cyxcbiAgICAgIGxvY2FsZV9zaG9ydFdlZWtkYXlzID0gbG9jYWxlLnNob3J0RGF5cyxcbiAgICAgIGxvY2FsZV9tb250aHMgPSBsb2NhbGUubW9udGhzLFxuICAgICAgbG9jYWxlX3Nob3J0TW9udGhzID0gbG9jYWxlLnNob3J0TW9udGhzO1xuXG4gIHZhciBwZXJpb2RSZSA9IGZvcm1hdFJlKGxvY2FsZV9wZXJpb2RzKSxcbiAgICAgIHBlcmlvZExvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfcGVyaW9kcyksXG4gICAgICB3ZWVrZGF5UmUgPSBmb3JtYXRSZShsb2NhbGVfd2Vla2RheXMpLFxuICAgICAgd2Vla2RheUxvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfd2Vla2RheXMpLFxuICAgICAgc2hvcnRXZWVrZGF5UmUgPSBmb3JtYXRSZShsb2NhbGVfc2hvcnRXZWVrZGF5cyksXG4gICAgICBzaG9ydFdlZWtkYXlMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX3Nob3J0V2Vla2RheXMpLFxuICAgICAgbW9udGhSZSA9IGZvcm1hdFJlKGxvY2FsZV9tb250aHMpLFxuICAgICAgbW9udGhMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX21vbnRocyksXG4gICAgICBzaG9ydE1vbnRoUmUgPSBmb3JtYXRSZShsb2NhbGVfc2hvcnRNb250aHMpLFxuICAgICAgc2hvcnRNb250aExvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfc2hvcnRNb250aHMpO1xuXG4gIHZhciBmb3JtYXRzID0ge1xuICAgIFwiYVwiOiBmb3JtYXRTaG9ydFdlZWtkYXksXG4gICAgXCJBXCI6IGZvcm1hdFdlZWtkYXksXG4gICAgXCJiXCI6IGZvcm1hdFNob3J0TW9udGgsXG4gICAgXCJCXCI6IGZvcm1hdE1vbnRoLFxuICAgIFwiY1wiOiBudWxsLFxuICAgIFwiZFwiOiBmb3JtYXREYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBmb3JtYXREYXlPZk1vbnRoLFxuICAgIFwiSFwiOiBmb3JtYXRIb3VyMjQsXG4gICAgXCJJXCI6IGZvcm1hdEhvdXIxMixcbiAgICBcImpcIjogZm9ybWF0RGF5T2ZZZWFyLFxuICAgIFwiTFwiOiBmb3JtYXRNaWxsaXNlY29uZHMsXG4gICAgXCJtXCI6IGZvcm1hdE1vbnRoTnVtYmVyLFxuICAgIFwiTVwiOiBmb3JtYXRNaW51dGVzLFxuICAgIFwicFwiOiBmb3JtYXRQZXJpb2QsXG4gICAgXCJTXCI6IGZvcm1hdFNlY29uZHMsXG4gICAgXCJVXCI6IGZvcm1hdFdlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJ3XCI6IGZvcm1hdFdlZWtkYXlOdW1iZXIsXG4gICAgXCJXXCI6IGZvcm1hdFdlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IG51bGwsXG4gICAgXCJYXCI6IG51bGwsXG4gICAgXCJ5XCI6IGZvcm1hdFllYXIsXG4gICAgXCJZXCI6IGZvcm1hdEZ1bGxZZWFyLFxuICAgIFwiWlwiOiBmb3JtYXRab25lLFxuICAgIFwiJVwiOiBmb3JtYXRMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIHZhciB1dGNGb3JtYXRzID0ge1xuICAgIFwiYVwiOiBmb3JtYXRVVENTaG9ydFdlZWtkYXksXG4gICAgXCJBXCI6IGZvcm1hdFVUQ1dlZWtkYXksXG4gICAgXCJiXCI6IGZvcm1hdFVUQ1Nob3J0TW9udGgsXG4gICAgXCJCXCI6IGZvcm1hdFVUQ01vbnRoLFxuICAgIFwiY1wiOiBudWxsLFxuICAgIFwiZFwiOiBmb3JtYXRVVENEYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBmb3JtYXRVVENEYXlPZk1vbnRoLFxuICAgIFwiSFwiOiBmb3JtYXRVVENIb3VyMjQsXG4gICAgXCJJXCI6IGZvcm1hdFVUQ0hvdXIxMixcbiAgICBcImpcIjogZm9ybWF0VVRDRGF5T2ZZZWFyLFxuICAgIFwiTFwiOiBmb3JtYXRVVENNaWxsaXNlY29uZHMsXG4gICAgXCJtXCI6IGZvcm1hdFVUQ01vbnRoTnVtYmVyLFxuICAgIFwiTVwiOiBmb3JtYXRVVENNaW51dGVzLFxuICAgIFwicFwiOiBmb3JtYXRVVENQZXJpb2QsXG4gICAgXCJTXCI6IGZvcm1hdFVUQ1NlY29uZHMsXG4gICAgXCJVXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJ3XCI6IGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXIsXG4gICAgXCJXXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IG51bGwsXG4gICAgXCJYXCI6IG51bGwsXG4gICAgXCJ5XCI6IGZvcm1hdFVUQ1llYXIsXG4gICAgXCJZXCI6IGZvcm1hdFVUQ0Z1bGxZZWFyLFxuICAgIFwiWlwiOiBmb3JtYXRVVENab25lLFxuICAgIFwiJVwiOiBmb3JtYXRMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIHZhciBwYXJzZXMgPSB7XG4gICAgXCJhXCI6IHBhcnNlU2hvcnRXZWVrZGF5LFxuICAgIFwiQVwiOiBwYXJzZVdlZWtkYXksXG4gICAgXCJiXCI6IHBhcnNlU2hvcnRNb250aCxcbiAgICBcIkJcIjogcGFyc2VNb250aCxcbiAgICBcImNcIjogcGFyc2VMb2NhbGVEYXRlVGltZSxcbiAgICBcImRcIjogcGFyc2VEYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBwYXJzZURheU9mTW9udGgsXG4gICAgXCJIXCI6IHBhcnNlSG91cjI0LFxuICAgIFwiSVwiOiBwYXJzZUhvdXIyNCxcbiAgICBcImpcIjogcGFyc2VEYXlPZlllYXIsXG4gICAgXCJMXCI6IHBhcnNlTWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBwYXJzZU1vbnRoTnVtYmVyLFxuICAgIFwiTVwiOiBwYXJzZU1pbnV0ZXMsXG4gICAgXCJwXCI6IHBhcnNlUGVyaW9kLFxuICAgIFwiU1wiOiBwYXJzZVNlY29uZHMsXG4gICAgXCJVXCI6IHBhcnNlV2Vla051bWJlclN1bmRheSxcbiAgICBcIndcIjogcGFyc2VXZWVrZGF5TnVtYmVyLFxuICAgIFwiV1wiOiBwYXJzZVdlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IHBhcnNlTG9jYWxlRGF0ZSxcbiAgICBcIlhcIjogcGFyc2VMb2NhbGVUaW1lLFxuICAgIFwieVwiOiBwYXJzZVllYXIsXG4gICAgXCJZXCI6IHBhcnNlRnVsbFllYXIsXG4gICAgXCJaXCI6IHBhcnNlWm9uZSxcbiAgICBcIiVcIjogcGFyc2VMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIC8vIFRoZXNlIHJlY3Vyc2l2ZSBkaXJlY3RpdmUgZGVmaW5pdGlvbnMgbXVzdCBiZSBkZWZlcnJlZC5cbiAgZm9ybWF0cy54ID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlLCBmb3JtYXRzKTtcbiAgZm9ybWF0cy5YID0gbmV3Rm9ybWF0KGxvY2FsZV90aW1lLCBmb3JtYXRzKTtcbiAgZm9ybWF0cy5jID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlVGltZSwgZm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMueCA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZSwgdXRjRm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMuWCA9IG5ld0Zvcm1hdChsb2NhbGVfdGltZSwgdXRjRm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMuYyA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZVRpbWUsIHV0Y0Zvcm1hdHMpO1xuXG4gIGZ1bmN0aW9uIG5ld0Zvcm1hdChzcGVjaWZpZXIsIGZvcm1hdHMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgdmFyIHN0cmluZyA9IFtdLFxuICAgICAgICAgIGkgPSAtMSxcbiAgICAgICAgICBqID0gMCxcbiAgICAgICAgICBuID0gc3BlY2lmaWVyLmxlbmd0aCxcbiAgICAgICAgICBjLFxuICAgICAgICAgIHBhZCxcbiAgICAgICAgICBmb3JtYXQ7XG5cbiAgICAgIGlmICghKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgZGF0ZSA9IG5ldyBEYXRlKCtkYXRlKTtcblxuICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKHNwZWNpZmllci5jaGFyQ29kZUF0KGkpID09PSAzNykge1xuICAgICAgICAgIHN0cmluZy5wdXNoKHNwZWNpZmllci5zbGljZShqLCBpKSk7XG4gICAgICAgICAgaWYgKChwYWQgPSBwYWRzW2MgPSBzcGVjaWZpZXIuY2hhckF0KCsraSldKSAhPSBudWxsKSBjID0gc3BlY2lmaWVyLmNoYXJBdCgrK2kpO1xuICAgICAgICAgIGVsc2UgcGFkID0gYyA9PT0gXCJlXCIgPyBcIiBcIiA6IFwiMFwiO1xuICAgICAgICAgIGlmIChmb3JtYXQgPSBmb3JtYXRzW2NdKSBjID0gZm9ybWF0KGRhdGUsIHBhZCk7XG4gICAgICAgICAgc3RyaW5nLnB1c2goYyk7XG4gICAgICAgICAgaiA9IGkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHN0cmluZy5wdXNoKHNwZWNpZmllci5zbGljZShqLCBpKSk7XG4gICAgICByZXR1cm4gc3RyaW5nLmpvaW4oXCJcIik7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5ld1BhcnNlKHNwZWNpZmllciwgbmV3RGF0ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIHZhciBkID0gbmV3WWVhcigxOTAwKSxcbiAgICAgICAgICBpID0gcGFyc2VTcGVjaWZpZXIoZCwgc3BlY2lmaWVyLCBzdHJpbmcgKz0gXCJcIiwgMCk7XG4gICAgICBpZiAoaSAhPSBzdHJpbmcubGVuZ3RoKSByZXR1cm4gbnVsbDtcblxuICAgICAgLy8gVGhlIGFtLXBtIGZsYWcgaXMgMCBmb3IgQU0sIGFuZCAxIGZvciBQTS5cbiAgICAgIGlmIChcInBcIiBpbiBkKSBkLkggPSBkLkggJSAxMiArIGQucCAqIDEyO1xuXG4gICAgICAvLyBDb252ZXJ0IGRheS1vZi13ZWVrIGFuZCB3ZWVrLW9mLXllYXIgdG8gZGF5LW9mLXllYXIuXG4gICAgICBpZiAoXCJXXCIgaW4gZCB8fCBcIlVcIiBpbiBkKSB7XG4gICAgICAgIGlmICghKFwid1wiIGluIGQpKSBkLncgPSBcIldcIiBpbiBkID8gMSA6IDA7XG4gICAgICAgIHZhciBkYXkgPSBcIlpcIiBpbiBkID8gdXRjRGF0ZShuZXdZZWFyKGQueSkpLmdldFVUQ0RheSgpIDogbmV3RGF0ZShuZXdZZWFyKGQueSkpLmdldERheSgpO1xuICAgICAgICBkLm0gPSAwO1xuICAgICAgICBkLmQgPSBcIldcIiBpbiBkID8gKGQudyArIDYpICUgNyArIGQuVyAqIDcgLSAoZGF5ICsgNSkgJSA3IDogZC53ICsgZC5VICogNyAtIChkYXkgKyA2KSAlIDc7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGEgdGltZSB6b25lIGlzIHNwZWNpZmllZCwgYWxsIGZpZWxkcyBhcmUgaW50ZXJwcmV0ZWQgYXMgVVRDIGFuZCB0aGVuXG4gICAgICAvLyBvZmZzZXQgYWNjb3JkaW5nIHRvIHRoZSBzcGVjaWZpZWQgdGltZSB6b25lLlxuICAgICAgaWYgKFwiWlwiIGluIGQpIHtcbiAgICAgICAgZC5IICs9IGQuWiAvIDEwMCB8IDA7XG4gICAgICAgIGQuTSArPSBkLlogJSAxMDA7XG4gICAgICAgIHJldHVybiB1dGNEYXRlKGQpO1xuICAgICAgfVxuXG4gICAgICAvLyBPdGhlcndpc2UsIGFsbCBmaWVsZHMgYXJlIGluIGxvY2FsIHRpbWUuXG4gICAgICByZXR1cm4gbmV3RGF0ZShkKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VTcGVjaWZpZXIoZCwgc3BlY2lmaWVyLCBzdHJpbmcsIGopIHtcbiAgICB2YXIgaSA9IDAsXG4gICAgICAgIG4gPSBzcGVjaWZpZXIubGVuZ3RoLFxuICAgICAgICBtID0gc3RyaW5nLmxlbmd0aCxcbiAgICAgICAgYyxcbiAgICAgICAgcGFyc2U7XG5cbiAgICB3aGlsZSAoaSA8IG4pIHtcbiAgICAgIGlmIChqID49IG0pIHJldHVybiAtMTtcbiAgICAgIGMgPSBzcGVjaWZpZXIuY2hhckNvZGVBdChpKyspO1xuICAgICAgaWYgKGMgPT09IDM3KSB7XG4gICAgICAgIGMgPSBzcGVjaWZpZXIuY2hhckF0KGkrKyk7XG4gICAgICAgIHBhcnNlID0gcGFyc2VzW2MgaW4gcGFkcyA/IHNwZWNpZmllci5jaGFyQXQoaSsrKSA6IGNdO1xuICAgICAgICBpZiAoIXBhcnNlIHx8ICgoaiA9IHBhcnNlKGQsIHN0cmluZywgaikpIDwgMCkpIHJldHVybiAtMTtcbiAgICAgIH0gZWxzZSBpZiAoYyAhPSBzdHJpbmcuY2hhckNvZGVBdChqKyspKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gajtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlUGVyaW9kKGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gcGVyaW9kUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQucCA9IHBlcmlvZExvb2t1cFtuWzBdLnRvTG93ZXJDYXNlKCldLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVNob3J0V2Vla2RheShkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHNob3J0V2Vla2RheVJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLncgPSBzaG9ydFdlZWtkYXlMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VXZWVrZGF5KGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gd2Vla2RheVJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLncgPSB3ZWVrZGF5TG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlU2hvcnRNb250aChkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHNob3J0TW9udGhSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC5tID0gc2hvcnRNb250aExvb2t1cFtuWzBdLnRvTG93ZXJDYXNlKCldLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZU1vbnRoKGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gbW9udGhSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC5tID0gbW9udGhMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VMb2NhbGVEYXRlVGltZShkLCBzdHJpbmcsIGkpIHtcbiAgICByZXR1cm4gcGFyc2VTcGVjaWZpZXIoZCwgbG9jYWxlX2RhdGVUaW1lLCBzdHJpbmcsIGkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VMb2NhbGVEYXRlKGQsIHN0cmluZywgaSkge1xuICAgIHJldHVybiBwYXJzZVNwZWNpZmllcihkLCBsb2NhbGVfZGF0ZSwgc3RyaW5nLCBpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlVGltZShkLCBzdHJpbmcsIGkpIHtcbiAgICByZXR1cm4gcGFyc2VTcGVjaWZpZXIoZCwgbG9jYWxlX3RpbWUsIHN0cmluZywgaSk7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRTaG9ydFdlZWtkYXkoZCkge1xuICAgIHJldHVybiBsb2NhbGVfc2hvcnRXZWVrZGF5c1tkLmdldERheSgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFdlZWtkYXkoZCkge1xuICAgIHJldHVybiBsb2NhbGVfd2Vla2RheXNbZC5nZXREYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRTaG9ydE1vbnRoKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0TW9udGhzW2QuZ2V0TW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9tb250aHNbZC5nZXRNb250aCgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFBlcmlvZChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9wZXJpb2RzWysoZC5nZXRIb3VycygpID49IDEyKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENTaG9ydFdlZWtkYXkoZCkge1xuICAgIHJldHVybiBsb2NhbGVfc2hvcnRXZWVrZGF5c1tkLmdldFVUQ0RheSgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtkYXkoZCkge1xuICAgIHJldHVybiBsb2NhbGVfd2Vla2RheXNbZC5nZXRVVENEYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENTaG9ydE1vbnRoKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0TW9udGhzW2QuZ2V0VVRDTW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9tb250aHNbZC5nZXRVVENNb250aCgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ1BlcmlvZChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9wZXJpb2RzWysoZC5nZXRVVENIb3VycygpID49IDEyKV07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdDogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgZiA9IG5ld0Zvcm1hdChzcGVjaWZpZXIgKz0gXCJcIiwgZm9ybWF0cyk7XG4gICAgICBmLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBzcGVjaWZpZXI7IH07XG4gICAgICByZXR1cm4gZjtcbiAgICB9LFxuICAgIHBhcnNlOiBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgICAgIHZhciBwID0gbmV3UGFyc2Uoc3BlY2lmaWVyICs9IFwiXCIsIGxvY2FsRGF0ZSk7XG4gICAgICBwLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBzcGVjaWZpZXI7IH07XG4gICAgICByZXR1cm4gcDtcbiAgICB9LFxuICAgIHV0Y0Zvcm1hdDogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgZiA9IG5ld0Zvcm1hdChzcGVjaWZpZXIgKz0gXCJcIiwgdXRjRm9ybWF0cyk7XG4gICAgICBmLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBzcGVjaWZpZXI7IH07XG4gICAgICByZXR1cm4gZjtcbiAgICB9LFxuICAgIHV0Y1BhcnNlOiBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgICAgIHZhciBwID0gbmV3UGFyc2Uoc3BlY2lmaWVyLCB1dGNEYXRlKTtcbiAgICAgIHAudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBwO1xuICAgIH1cbiAgfTtcbn1cblxudmFyIHBhZHMgPSB7XCItXCI6IFwiXCIsIFwiX1wiOiBcIiBcIiwgXCIwXCI6IFwiMFwifTtcbnZhciBudW1iZXJSZSA9IC9eXFxzKlxcZCsvO1xudmFyIHBlcmNlbnRSZSA9IC9eJS87XG52YXIgcmVxdW90ZVJlID0gL1tcXFxcXFxeXFwkXFwqXFwrXFw/XFx8XFxbXFxdXFwoXFwpXFwuXFx7XFx9XS9nO1xuXG5mdW5jdGlvbiBwYWQodmFsdWUsIGZpbGwsIHdpZHRoKSB7XG4gIHZhciBzaWduID0gdmFsdWUgPCAwID8gXCItXCIgOiBcIlwiLFxuICAgICAgc3RyaW5nID0gKHNpZ24gPyAtdmFsdWUgOiB2YWx1ZSkgKyBcIlwiLFxuICAgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgcmV0dXJuIHNpZ24gKyAobGVuZ3RoIDwgd2lkdGggPyBuZXcgQXJyYXkod2lkdGggLSBsZW5ndGggKyAxKS5qb2luKGZpbGwpICsgc3RyaW5nIDogc3RyaW5nKTtcbn1cblxuZnVuY3Rpb24gcmVxdW90ZShzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UocmVxdW90ZVJlLCBcIlxcXFwkJlwiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0UmUobmFtZXMpIHtcbiAgcmV0dXJuIG5ldyBSZWdFeHAoXCJeKD86XCIgKyBuYW1lcy5tYXAocmVxdW90ZSkuam9pbihcInxcIikgKyBcIilcIiwgXCJpXCIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRMb29rdXAobmFtZXMpIHtcbiAgdmFyIG1hcCA9IHt9LCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gIHdoaWxlICgrK2kgPCBuKSBtYXBbbmFtZXNbaV0udG9Mb3dlckNhc2UoKV0gPSBpO1xuICByZXR1cm4gbWFwO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtkYXlOdW1iZXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDEpKTtcbiAgcmV0dXJuIG4gPyAoZC53ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrTnVtYmVyU3VuZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgcmV0dXJuIG4gPyAoZC5VID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrTnVtYmVyTW9uZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgcmV0dXJuIG4gPyAoZC5XID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VGdWxsWWVhcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgNCkpO1xuICByZXR1cm4gbiA/IChkLnkgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC55ID0gK25bMF0gKyAoK25bMF0gPiA2OCA/IDE5MDAgOiAyMDAwKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVpvbmUoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gL14oWil8KFsrLV1cXGRcXGQpKD86XFw6PyhcXGRcXGQpKT8vLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyA2KSk7XG4gIHJldHVybiBuID8gKGQuWiA9IG5bMV0gPyAwIDogLShuWzJdICsgKG5bM10gfHwgXCIwMFwiKSksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNb250aE51bWJlcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLm0gPSBuWzBdIC0gMSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZURheU9mTW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5kID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VEYXlPZlllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDMpKTtcbiAgcmV0dXJuIG4gPyAoZC5tID0gMCwgZC5kID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VIb3VyMjQoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5IID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNaW51dGVzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuTSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlU2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlMgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1pbGxpc2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMykpO1xuICByZXR1cm4gbiA/IChkLkwgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZUxpdGVyYWxQZXJjZW50KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IHBlcmNlbnRSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMSkpO1xuICByZXR1cm4gbiA/IGkgKyBuWzBdLmxlbmd0aCA6IC0xO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXlPZk1vbnRoKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldERhdGUoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEhvdXIyNChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRIb3VycygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0SG91cjEyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldEhvdXJzKCkgJSAxMiB8fCAxMiwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdERheU9mWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoMSArIGQzVGltZS50aW1lRGF5LmNvdW50KGQzVGltZS50aW1lWWVhcihkKSwgZCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNaWxsaXNlY29uZHMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0TWlsbGlzZWNvbmRzKCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNb250aE51bWJlcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRNb250aCgpICsgMSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pbnV0ZXMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0TWludXRlcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0U2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRTZWNvbmRzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrTnVtYmVyU3VuZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZChkM1RpbWUudGltZVN1bmRheS5jb3VudChkM1RpbWUudGltZVllYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla2RheU51bWJlcihkKSB7XG4gIHJldHVybiBkLmdldERheSgpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrTnVtYmVyTW9uZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZChkM1RpbWUudGltZU1vbmRheS5jb3VudChkM1RpbWUudGltZVllYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0WWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRGdWxsWWVhcigpICUgMTAwLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RnVsbFllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0RnVsbFllYXIoKSAlIDEwMDAwLCBwLCA0KTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Wm9uZShkKSB7XG4gIHZhciB6ID0gZC5nZXRUaW1lem9uZU9mZnNldCgpO1xuICByZXR1cm4gKHogPiAwID8gXCItXCIgOiAoeiAqPSAtMSwgXCIrXCIpKVxuICAgICAgKyBwYWQoeiAvIDYwIHwgMCwgXCIwXCIsIDIpXG4gICAgICArIHBhZCh6ICUgNjAsIFwiMFwiLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDRGF5T2ZNb250aChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENEYXRlKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENIb3VyMjQoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDSG91cnMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0hvdXIxMihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENIb3VycygpICUgMTIgfHwgMTIsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENEYXlPZlllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKDEgKyBkM1RpbWUudXRjRGF5LmNvdW50KGQzVGltZS51dGNZZWFyKGQpLCBkKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pbGxpc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNaWxsaXNlY29uZHMoKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01vbnRoTnVtYmVyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ01vbnRoKCkgKyAxLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDTWludXRlcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNaW51dGVzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENTZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ1NlY29uZHMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtOdW1iZXJTdW5kYXkoZCwgcCkge1xuICByZXR1cm4gcGFkKGQzVGltZS51dGNTdW5kYXkuY291bnQoZDNUaW1lLnV0Y1llYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla2RheU51bWJlcihkKSB7XG4gIHJldHVybiBkLmdldFVUQ0RheSgpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrTnVtYmVyTW9uZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZChkM1RpbWUudXRjTW9uZGF5LmNvdW50KGQzVGltZS51dGNZZWFyKGQpLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1llYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDRnVsbFllYXIoKSAlIDEwMCwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0Z1bGxZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0Z1bGxZZWFyKCkgJSAxMDAwMCwgcCwgNCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1pvbmUoKSB7XG4gIHJldHVybiBcIiswMDAwXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdExpdGVyYWxQZXJjZW50KCkge1xuICByZXR1cm4gXCIlXCI7XG59XG5cbnZhciBsb2NhbGUkMTtcblxuXG5cblxuXG5kZWZhdWx0TG9jYWxlKHtcbiAgZGF0ZVRpbWU6IFwiJXgsICVYXCIsXG4gIGRhdGU6IFwiJS1tLyUtZC8lWVwiLFxuICB0aW1lOiBcIiUtSTolTTolUyAlcFwiLFxuICBwZXJpb2RzOiBbXCJBTVwiLCBcIlBNXCJdLFxuICBkYXlzOiBbXCJTdW5kYXlcIiwgXCJNb25kYXlcIiwgXCJUdWVzZGF5XCIsIFwiV2VkbmVzZGF5XCIsIFwiVGh1cnNkYXlcIiwgXCJGcmlkYXlcIiwgXCJTYXR1cmRheVwiXSxcbiAgc2hvcnREYXlzOiBbXCJTdW5cIiwgXCJNb25cIiwgXCJUdWVcIiwgXCJXZWRcIiwgXCJUaHVcIiwgXCJGcmlcIiwgXCJTYXRcIl0sXG4gIG1vbnRoczogW1wiSmFudWFyeVwiLCBcIkZlYnJ1YXJ5XCIsIFwiTWFyY2hcIiwgXCJBcHJpbFwiLCBcIk1heVwiLCBcIkp1bmVcIiwgXCJKdWx5XCIsIFwiQXVndXN0XCIsIFwiU2VwdGVtYmVyXCIsIFwiT2N0b2JlclwiLCBcIk5vdmVtYmVyXCIsIFwiRGVjZW1iZXJcIl0sXG4gIHNob3J0TW9udGhzOiBbXCJKYW5cIiwgXCJGZWJcIiwgXCJNYXJcIiwgXCJBcHJcIiwgXCJNYXlcIiwgXCJKdW5cIiwgXCJKdWxcIiwgXCJBdWdcIiwgXCJTZXBcIiwgXCJPY3RcIiwgXCJOb3ZcIiwgXCJEZWNcIl1cbn0pO1xuXG5mdW5jdGlvbiBkZWZhdWx0TG9jYWxlKGRlZmluaXRpb24pIHtcbiAgbG9jYWxlJDEgPSBmb3JtYXRMb2NhbGUoZGVmaW5pdGlvbik7XG4gIGV4cG9ydHMudGltZUZvcm1hdCA9IGxvY2FsZSQxLmZvcm1hdDtcbiAgZXhwb3J0cy50aW1lUGFyc2UgPSBsb2NhbGUkMS5wYXJzZTtcbiAgZXhwb3J0cy51dGNGb3JtYXQgPSBsb2NhbGUkMS51dGNGb3JtYXQ7XG4gIGV4cG9ydHMudXRjUGFyc2UgPSBsb2NhbGUkMS51dGNQYXJzZTtcbiAgcmV0dXJuIGxvY2FsZSQxO1xufVxuXG52YXIgaXNvU3BlY2lmaWVyID0gXCIlWS0lbS0lZFQlSDolTTolUy4lTFpcIjtcblxuZnVuY3Rpb24gZm9ybWF0SXNvTmF0aXZlKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUudG9JU09TdHJpbmcoKTtcbn1cblxudmFyIGZvcm1hdElzbyA9IERhdGUucHJvdG90eXBlLnRvSVNPU3RyaW5nXG4gICAgPyBmb3JtYXRJc29OYXRpdmVcbiAgICA6IGV4cG9ydHMudXRjRm9ybWF0KGlzb1NwZWNpZmllcik7XG5cbmZ1bmN0aW9uIHBhcnNlSXNvTmF0aXZlKHN0cmluZykge1xuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHN0cmluZyk7XG4gIHJldHVybiBpc05hTihkYXRlKSA/IG51bGwgOiBkYXRlO1xufVxuXG52YXIgcGFyc2VJc28gPSArbmV3IERhdGUoXCIyMDAwLTAxLTAxVDAwOjAwOjAwLjAwMFpcIilcbiAgICA/IHBhcnNlSXNvTmF0aXZlXG4gICAgOiBleHBvcnRzLnV0Y1BhcnNlKGlzb1NwZWNpZmllcik7XG5cbmV4cG9ydHMudGltZUZvcm1hdERlZmF1bHRMb2NhbGUgPSBkZWZhdWx0TG9jYWxlO1xuZXhwb3J0cy50aW1lRm9ybWF0TG9jYWxlID0gZm9ybWF0TG9jYWxlO1xuZXhwb3J0cy5pc29Gb3JtYXQgPSBmb3JtYXRJc287XG5leHBvcnRzLmlzb1BhcnNlID0gcGFyc2VJc287XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4iLCIvLyBodHRwczovL2QzanMub3JnL2QzLXRpbWUvIFZlcnNpb24gMS4wLjYuIENvcHlyaWdodCAyMDE3IE1pa2UgQm9zdG9jay5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcblx0KGZhY3RvcnkoKGdsb2JhbC5kMyA9IGdsb2JhbC5kMyB8fCB7fSkpKTtcbn0odGhpcywgKGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxudmFyIHQwID0gbmV3IERhdGU7XG52YXIgdDEgPSBuZXcgRGF0ZTtcblxuZnVuY3Rpb24gbmV3SW50ZXJ2YWwoZmxvb3JpLCBvZmZzZXRpLCBjb3VudCwgZmllbGQpIHtcblxuICBmdW5jdGlvbiBpbnRlcnZhbChkYXRlKSB7XG4gICAgcmV0dXJuIGZsb29yaShkYXRlID0gbmV3IERhdGUoK2RhdGUpKSwgZGF0ZTtcbiAgfVxuXG4gIGludGVydmFsLmZsb29yID0gaW50ZXJ2YWw7XG5cbiAgaW50ZXJ2YWwuY2VpbCA9IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICByZXR1cm4gZmxvb3JpKGRhdGUgPSBuZXcgRGF0ZShkYXRlIC0gMSkpLCBvZmZzZXRpKGRhdGUsIDEpLCBmbG9vcmkoZGF0ZSksIGRhdGU7XG4gIH07XG5cbiAgaW50ZXJ2YWwucm91bmQgPSBmdW5jdGlvbihkYXRlKSB7XG4gICAgdmFyIGQwID0gaW50ZXJ2YWwoZGF0ZSksXG4gICAgICAgIGQxID0gaW50ZXJ2YWwuY2VpbChkYXRlKTtcbiAgICByZXR1cm4gZGF0ZSAtIGQwIDwgZDEgLSBkYXRlID8gZDAgOiBkMTtcbiAgfTtcblxuICBpbnRlcnZhbC5vZmZzZXQgPSBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgcmV0dXJuIG9mZnNldGkoZGF0ZSA9IG5ldyBEYXRlKCtkYXRlKSwgc3RlcCA9PSBudWxsID8gMSA6IE1hdGguZmxvb3Ioc3RlcCkpLCBkYXRlO1xuICB9O1xuXG4gIGludGVydmFsLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICB2YXIgcmFuZ2UgPSBbXTtcbiAgICBzdGFydCA9IGludGVydmFsLmNlaWwoc3RhcnQpO1xuICAgIHN0ZXAgPSBzdGVwID09IG51bGwgPyAxIDogTWF0aC5mbG9vcihzdGVwKTtcbiAgICBpZiAoIShzdGFydCA8IHN0b3ApIHx8ICEoc3RlcCA+IDApKSByZXR1cm4gcmFuZ2U7IC8vIGFsc28gaGFuZGxlcyBJbnZhbGlkIERhdGVcbiAgICBkbyByYW5nZS5wdXNoKG5ldyBEYXRlKCtzdGFydCkpOyB3aGlsZSAob2Zmc2V0aShzdGFydCwgc3RlcCksIGZsb29yaShzdGFydCksIHN0YXJ0IDwgc3RvcClcbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgaW50ZXJ2YWwuZmlsdGVyID0gZnVuY3Rpb24odGVzdCkge1xuICAgIHJldHVybiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgICBpZiAoZGF0ZSA+PSBkYXRlKSB3aGlsZSAoZmxvb3JpKGRhdGUpLCAhdGVzdChkYXRlKSkgZGF0ZS5zZXRUaW1lKGRhdGUgLSAxKTtcbiAgICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgICBpZiAoZGF0ZSA+PSBkYXRlKSB3aGlsZSAoLS1zdGVwID49IDApIHdoaWxlIChvZmZzZXRpKGRhdGUsIDEpLCAhdGVzdChkYXRlKSkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eVxuICAgIH0pO1xuICB9O1xuXG4gIGlmIChjb3VudCkge1xuICAgIGludGVydmFsLmNvdW50ID0gZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgICAgdDAuc2V0VGltZSgrc3RhcnQpLCB0MS5zZXRUaW1lKCtlbmQpO1xuICAgICAgZmxvb3JpKHQwKSwgZmxvb3JpKHQxKTtcbiAgICAgIHJldHVybiBNYXRoLmZsb29yKGNvdW50KHQwLCB0MSkpO1xuICAgIH07XG5cbiAgICBpbnRlcnZhbC5ldmVyeSA9IGZ1bmN0aW9uKHN0ZXApIHtcbiAgICAgIHN0ZXAgPSBNYXRoLmZsb29yKHN0ZXApO1xuICAgICAgcmV0dXJuICFpc0Zpbml0ZShzdGVwKSB8fCAhKHN0ZXAgPiAwKSA/IG51bGxcbiAgICAgICAgICA6ICEoc3RlcCA+IDEpID8gaW50ZXJ2YWxcbiAgICAgICAgICA6IGludGVydmFsLmZpbHRlcihmaWVsZFxuICAgICAgICAgICAgICA/IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGZpZWxkKGQpICUgc3RlcCA9PT0gMDsgfVxuICAgICAgICAgICAgICA6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGludGVydmFsLmNvdW50KDAsIGQpICUgc3RlcCA9PT0gMDsgfSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBpbnRlcnZhbDtcbn1cblxudmFyIG1pbGxpc2Vjb25kID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gIC8vIG5vb3Bcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiBlbmQgLSBzdGFydDtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG5taWxsaXNlY29uZC5ldmVyeSA9IGZ1bmN0aW9uKGspIHtcbiAgayA9IE1hdGguZmxvb3Ioayk7XG4gIGlmICghaXNGaW5pdGUoaykgfHwgIShrID4gMCkpIHJldHVybiBudWxsO1xuICBpZiAoIShrID4gMSkpIHJldHVybiBtaWxsaXNlY29uZDtcbiAgcmV0dXJuIG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldFRpbWUoTWF0aC5mbG9vcihkYXRlIC8gaykgKiBrKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBrKTtcbiAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gaztcbiAgfSk7XG59O1xuXG52YXIgbWlsbGlzZWNvbmRzID0gbWlsbGlzZWNvbmQucmFuZ2U7XG5cbnZhciBkdXJhdGlvblNlY29uZCA9IDFlMztcbnZhciBkdXJhdGlvbk1pbnV0ZSA9IDZlNDtcbnZhciBkdXJhdGlvbkhvdXIgPSAzNmU1O1xudmFyIGR1cmF0aW9uRGF5ID0gODY0ZTU7XG52YXIgZHVyYXRpb25XZWVrID0gNjA0OGU1O1xuXG52YXIgc2Vjb25kID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFRpbWUoTWF0aC5mbG9vcihkYXRlIC8gZHVyYXRpb25TZWNvbmQpICogZHVyYXRpb25TZWNvbmQpO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25TZWNvbmQpO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uU2Vjb25kO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRVVENTZWNvbmRzKCk7XG59KTtcblxudmFyIHNlY29uZHMgPSBzZWNvbmQucmFuZ2U7XG5cbnZhciBtaW51dGUgPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKGRhdGUgLyBkdXJhdGlvbk1pbnV0ZSkgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25NaW51dGU7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldE1pbnV0ZXMoKTtcbn0pO1xuXG52YXIgbWludXRlcyA9IG1pbnV0ZS5yYW5nZTtcblxudmFyIGhvdXIgPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIHZhciBvZmZzZXQgPSBkYXRlLmdldFRpbWV6b25lT2Zmc2V0KCkgKiBkdXJhdGlvbk1pbnV0ZSAlIGR1cmF0aW9uSG91cjtcbiAgaWYgKG9mZnNldCA8IDApIG9mZnNldCArPSBkdXJhdGlvbkhvdXI7XG4gIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKCgrZGF0ZSAtIG9mZnNldCkgLyBkdXJhdGlvbkhvdXIpICogZHVyYXRpb25Ib3VyICsgb2Zmc2V0KTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uSG91cik7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25Ib3VyO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRIb3VycygpO1xufSk7XG5cbnZhciBob3VycyA9IGhvdXIucmFuZ2U7XG5cbnZhciBkYXkgPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0IC0gKGVuZC5nZXRUaW1lem9uZU9mZnNldCgpIC0gc3RhcnQuZ2V0VGltZXpvbmVPZmZzZXQoKSkgKiBkdXJhdGlvbk1pbnV0ZSkgLyBkdXJhdGlvbkRheTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0RGF0ZSgpIC0gMTtcbn0pO1xuXG52YXIgZGF5cyA9IGRheS5yYW5nZTtcblxuZnVuY3Rpb24gd2Vla2RheShpKSB7XG4gIHJldHVybiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gKGRhdGUuZ2V0RGF5KCkgKyA3IC0gaSkgJSA3KTtcbiAgICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgc3RlcCAqIDcpO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCAtIChlbmQuZ2V0VGltZXpvbmVPZmZzZXQoKSAtIHN0YXJ0LmdldFRpbWV6b25lT2Zmc2V0KCkpICogZHVyYXRpb25NaW51dGUpIC8gZHVyYXRpb25XZWVrO1xuICB9KTtcbn1cblxudmFyIHN1bmRheSA9IHdlZWtkYXkoMCk7XG52YXIgbW9uZGF5ID0gd2Vla2RheSgxKTtcbnZhciB0dWVzZGF5ID0gd2Vla2RheSgyKTtcbnZhciB3ZWRuZXNkYXkgPSB3ZWVrZGF5KDMpO1xudmFyIHRodXJzZGF5ID0gd2Vla2RheSg0KTtcbnZhciBmcmlkYXkgPSB3ZWVrZGF5KDUpO1xudmFyIHNhdHVyZGF5ID0gd2Vla2RheSg2KTtcblxudmFyIHN1bmRheXMgPSBzdW5kYXkucmFuZ2U7XG52YXIgbW9uZGF5cyA9IG1vbmRheS5yYW5nZTtcbnZhciB0dWVzZGF5cyA9IHR1ZXNkYXkucmFuZ2U7XG52YXIgd2VkbmVzZGF5cyA9IHdlZG5lc2RheS5yYW5nZTtcbnZhciB0aHVyc2RheXMgPSB0aHVyc2RheS5yYW5nZTtcbnZhciBmcmlkYXlzID0gZnJpZGF5LnJhbmdlO1xudmFyIHNhdHVyZGF5cyA9IHNhdHVyZGF5LnJhbmdlO1xuXG52YXIgbW9udGggPSBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0RGF0ZSgxKTtcbiAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRNb250aChkYXRlLmdldE1vbnRoKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRNb250aCgpIC0gc3RhcnQuZ2V0TW9udGgoKSArIChlbmQuZ2V0RnVsbFllYXIoKSAtIHN0YXJ0LmdldEZ1bGxZZWFyKCkpICogMTI7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldE1vbnRoKCk7XG59KTtcblxudmFyIG1vbnRocyA9IG1vbnRoLnJhbmdlO1xuXG52YXIgeWVhciA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRNb250aCgwLCAxKTtcbiAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRGdWxsWWVhcihkYXRlLmdldEZ1bGxZZWFyKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRGdWxsWWVhcigpIC0gc3RhcnQuZ2V0RnVsbFllYXIoKTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKTtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG55ZWFyLmV2ZXJ5ID0gZnVuY3Rpb24oaykge1xuICByZXR1cm4gIWlzRmluaXRlKGsgPSBNYXRoLmZsb29yKGspKSB8fCAhKGsgPiAwKSA/IG51bGwgOiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihNYXRoLmZsb29yKGRhdGUuZ2V0RnVsbFllYXIoKSAvIGspICogayk7XG4gICAgZGF0ZS5zZXRNb250aCgwLCAxKTtcbiAgICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihkYXRlLmdldEZ1bGxZZWFyKCkgKyBzdGVwICogayk7XG4gIH0pO1xufTtcblxudmFyIHllYXJzID0geWVhci5yYW5nZTtcblxudmFyIHV0Y01pbnV0ZSA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENTZWNvbmRzKDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25NaW51dGUpO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uTWludXRlO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRVVENNaW51dGVzKCk7XG59KTtcblxudmFyIHV0Y01pbnV0ZXMgPSB1dGNNaW51dGUucmFuZ2U7XG5cbnZhciB1dGNIb3VyID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ01pbnV0ZXMoMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbkhvdXIpO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uSG91cjtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDSG91cnMoKTtcbn0pO1xuXG52YXIgdXRjSG91cnMgPSB1dGNIb3VyLnJhbmdlO1xuXG52YXIgdXRjRGF5ID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkRheTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDRGF0ZSgpIC0gMTtcbn0pO1xuXG52YXIgdXRjRGF5cyA9IHV0Y0RheS5yYW5nZTtcblxuZnVuY3Rpb24gdXRjV2Vla2RheShpKSB7XG4gIHJldHVybiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpIC0gKGRhdGUuZ2V0VVRDRGF5KCkgKyA3IC0gaSkgJSA3KTtcbiAgICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpICsgc3RlcCAqIDcpO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbldlZWs7XG4gIH0pO1xufVxuXG52YXIgdXRjU3VuZGF5ID0gdXRjV2Vla2RheSgwKTtcbnZhciB1dGNNb25kYXkgPSB1dGNXZWVrZGF5KDEpO1xudmFyIHV0Y1R1ZXNkYXkgPSB1dGNXZWVrZGF5KDIpO1xudmFyIHV0Y1dlZG5lc2RheSA9IHV0Y1dlZWtkYXkoMyk7XG52YXIgdXRjVGh1cnNkYXkgPSB1dGNXZWVrZGF5KDQpO1xudmFyIHV0Y0ZyaWRheSA9IHV0Y1dlZWtkYXkoNSk7XG52YXIgdXRjU2F0dXJkYXkgPSB1dGNXZWVrZGF5KDYpO1xuXG52YXIgdXRjU3VuZGF5cyA9IHV0Y1N1bmRheS5yYW5nZTtcbnZhciB1dGNNb25kYXlzID0gdXRjTW9uZGF5LnJhbmdlO1xudmFyIHV0Y1R1ZXNkYXlzID0gdXRjVHVlc2RheS5yYW5nZTtcbnZhciB1dGNXZWRuZXNkYXlzID0gdXRjV2VkbmVzZGF5LnJhbmdlO1xudmFyIHV0Y1RodXJzZGF5cyA9IHV0Y1RodXJzZGF5LnJhbmdlO1xudmFyIHV0Y0ZyaWRheXMgPSB1dGNGcmlkYXkucmFuZ2U7XG52YXIgdXRjU2F0dXJkYXlzID0gdXRjU2F0dXJkYXkucmFuZ2U7XG5cbnZhciB1dGNNb250aCA9IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENEYXRlKDEpO1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFVUQ01vbnRoKGRhdGUuZ2V0VVRDTW9udGgoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gZW5kLmdldFVUQ01vbnRoKCkgLSBzdGFydC5nZXRVVENNb250aCgpICsgKGVuZC5nZXRVVENGdWxsWWVhcigpIC0gc3RhcnQuZ2V0VVRDRnVsbFllYXIoKSkgKiAxMjtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDTW9udGgoKTtcbn0pO1xuXG52YXIgdXRjTW9udGhzID0gdXRjTW9udGgucmFuZ2U7XG5cbnZhciB1dGNZZWFyID0gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ01vbnRoKDAsIDEpO1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFVUQ0Z1bGxZZWFyKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gZW5kLmdldFVUQ0Z1bGxZZWFyKCkgLSBzdGFydC5nZXRVVENGdWxsWWVhcigpO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRVVENGdWxsWWVhcigpO1xufSk7XG5cbi8vIEFuIG9wdGltaXplZCBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBzaW1wbGUgY2FzZS5cbnV0Y1llYXIuZXZlcnkgPSBmdW5jdGlvbihrKSB7XG4gIHJldHVybiAhaXNGaW5pdGUoayA9IE1hdGguZmxvb3IoaykpIHx8ICEoayA+IDApID8gbnVsbCA6IG5ld0ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKE1hdGguZmxvb3IoZGF0ZS5nZXRVVENGdWxsWWVhcigpIC8gaykgKiBrKTtcbiAgICBkYXRlLnNldFVUQ01vbnRoKDAsIDEpO1xuICAgIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSArIHN0ZXAgKiBrKTtcbiAgfSk7XG59O1xuXG52YXIgdXRjWWVhcnMgPSB1dGNZZWFyLnJhbmdlO1xuXG5leHBvcnRzLnRpbWVJbnRlcnZhbCA9IG5ld0ludGVydmFsO1xuZXhwb3J0cy50aW1lTWlsbGlzZWNvbmQgPSBtaWxsaXNlY29uZDtcbmV4cG9ydHMudGltZU1pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kcztcbmV4cG9ydHMudXRjTWlsbGlzZWNvbmQgPSBtaWxsaXNlY29uZDtcbmV4cG9ydHMudXRjTWlsbGlzZWNvbmRzID0gbWlsbGlzZWNvbmRzO1xuZXhwb3J0cy50aW1lU2Vjb25kID0gc2Vjb25kO1xuZXhwb3J0cy50aW1lU2Vjb25kcyA9IHNlY29uZHM7XG5leHBvcnRzLnV0Y1NlY29uZCA9IHNlY29uZDtcbmV4cG9ydHMudXRjU2Vjb25kcyA9IHNlY29uZHM7XG5leHBvcnRzLnRpbWVNaW51dGUgPSBtaW51dGU7XG5leHBvcnRzLnRpbWVNaW51dGVzID0gbWludXRlcztcbmV4cG9ydHMudGltZUhvdXIgPSBob3VyO1xuZXhwb3J0cy50aW1lSG91cnMgPSBob3VycztcbmV4cG9ydHMudGltZURheSA9IGRheTtcbmV4cG9ydHMudGltZURheXMgPSBkYXlzO1xuZXhwb3J0cy50aW1lV2VlayA9IHN1bmRheTtcbmV4cG9ydHMudGltZVdlZWtzID0gc3VuZGF5cztcbmV4cG9ydHMudGltZVN1bmRheSA9IHN1bmRheTtcbmV4cG9ydHMudGltZVN1bmRheXMgPSBzdW5kYXlzO1xuZXhwb3J0cy50aW1lTW9uZGF5ID0gbW9uZGF5O1xuZXhwb3J0cy50aW1lTW9uZGF5cyA9IG1vbmRheXM7XG5leHBvcnRzLnRpbWVUdWVzZGF5ID0gdHVlc2RheTtcbmV4cG9ydHMudGltZVR1ZXNkYXlzID0gdHVlc2RheXM7XG5leHBvcnRzLnRpbWVXZWRuZXNkYXkgPSB3ZWRuZXNkYXk7XG5leHBvcnRzLnRpbWVXZWRuZXNkYXlzID0gd2VkbmVzZGF5cztcbmV4cG9ydHMudGltZVRodXJzZGF5ID0gdGh1cnNkYXk7XG5leHBvcnRzLnRpbWVUaHVyc2RheXMgPSB0aHVyc2RheXM7XG5leHBvcnRzLnRpbWVGcmlkYXkgPSBmcmlkYXk7XG5leHBvcnRzLnRpbWVGcmlkYXlzID0gZnJpZGF5cztcbmV4cG9ydHMudGltZVNhdHVyZGF5ID0gc2F0dXJkYXk7XG5leHBvcnRzLnRpbWVTYXR1cmRheXMgPSBzYXR1cmRheXM7XG5leHBvcnRzLnRpbWVNb250aCA9IG1vbnRoO1xuZXhwb3J0cy50aW1lTW9udGhzID0gbW9udGhzO1xuZXhwb3J0cy50aW1lWWVhciA9IHllYXI7XG5leHBvcnRzLnRpbWVZZWFycyA9IHllYXJzO1xuZXhwb3J0cy51dGNNaW51dGUgPSB1dGNNaW51dGU7XG5leHBvcnRzLnV0Y01pbnV0ZXMgPSB1dGNNaW51dGVzO1xuZXhwb3J0cy51dGNIb3VyID0gdXRjSG91cjtcbmV4cG9ydHMudXRjSG91cnMgPSB1dGNIb3VycztcbmV4cG9ydHMudXRjRGF5ID0gdXRjRGF5O1xuZXhwb3J0cy51dGNEYXlzID0gdXRjRGF5cztcbmV4cG9ydHMudXRjV2VlayA9IHV0Y1N1bmRheTtcbmV4cG9ydHMudXRjV2Vla3MgPSB1dGNTdW5kYXlzO1xuZXhwb3J0cy51dGNTdW5kYXkgPSB1dGNTdW5kYXk7XG5leHBvcnRzLnV0Y1N1bmRheXMgPSB1dGNTdW5kYXlzO1xuZXhwb3J0cy51dGNNb25kYXkgPSB1dGNNb25kYXk7XG5leHBvcnRzLnV0Y01vbmRheXMgPSB1dGNNb25kYXlzO1xuZXhwb3J0cy51dGNUdWVzZGF5ID0gdXRjVHVlc2RheTtcbmV4cG9ydHMudXRjVHVlc2RheXMgPSB1dGNUdWVzZGF5cztcbmV4cG9ydHMudXRjV2VkbmVzZGF5ID0gdXRjV2VkbmVzZGF5O1xuZXhwb3J0cy51dGNXZWRuZXNkYXlzID0gdXRjV2VkbmVzZGF5cztcbmV4cG9ydHMudXRjVGh1cnNkYXkgPSB1dGNUaHVyc2RheTtcbmV4cG9ydHMudXRjVGh1cnNkYXlzID0gdXRjVGh1cnNkYXlzO1xuZXhwb3J0cy51dGNGcmlkYXkgPSB1dGNGcmlkYXk7XG5leHBvcnRzLnV0Y0ZyaWRheXMgPSB1dGNGcmlkYXlzO1xuZXhwb3J0cy51dGNTYXR1cmRheSA9IHV0Y1NhdHVyZGF5O1xuZXhwb3J0cy51dGNTYXR1cmRheXMgPSB1dGNTYXR1cmRheXM7XG5leHBvcnRzLnV0Y01vbnRoID0gdXRjTW9udGg7XG5leHBvcnRzLnV0Y01vbnRocyA9IHV0Y01vbnRocztcbmV4cG9ydHMudXRjWWVhciA9IHV0Y1llYXI7XG5leHBvcnRzLnV0Y1llYXJzID0gdXRjWWVhcnM7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4iXX0=
