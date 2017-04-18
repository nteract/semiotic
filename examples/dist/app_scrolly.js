require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _ScrollyExamples = require('./components/ScrollyExamples');

var _ScrollyExamples2 = _interopRequireDefault(_ScrollyExamples);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-enable no-unused-vars */

_reactDom2.default.render(_react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_ScrollyExamples2.default, { label: 'Scrolly' })
), document.getElementById('scrolly-frame')); /* eslint-disable no-unused-vars */

},{"./components/ScrollyExamples":2,"react":undefined,"react-dom":undefined}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semiotic = require('semiotic');

var _d3Random = require('d3-random');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
//import { curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveNatural, curveMonotoneX, curveStep  } from 'd3-shape'


//import d3 from 'd3'

var colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];

var countries = ["Brazil", "China", "United States", "Egypt"];

var testData = [];
var nRando = (0, _d3Random.randomNormal)(50, 15);
for (var x = 1; x < 100; x++) {
    testData.push({ x: nRando(), value: Math.max(0, nRando()), color: colors[x % 4], country: countries[x % 4] });
}

testData = testData.sort(function (a, b) {
    return a.x - b.x;
});

// const aggData = d3.nest().key(d => d.color).entries(testData).map(d => Object.assign({ color: d.key }, d))

var ScrollyExamples = function (_React$Component) {
    _inherits(ScrollyExamples, _React$Component);

    function ScrollyExamples(props) {
        _classCallCheck(this, ScrollyExamples);

        var _this = _possibleConstructorReturn(this, (ScrollyExamples.__proto__ || Object.getPrototypeOf(ScrollyExamples)).call(this, props));

        _this.state = { customLineType: "line", curve: "basis", frame: "xyFrame" };
        _this.changeCustomLineType = _this.changeCustomLineType.bind(_this);
        _this.changeCurve = _this.changeCurve.bind(_this);
        _this.changeFrame = _this.changeFrame.bind(_this);
        return _this;
    }

    _createClass(ScrollyExamples, [{
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
        key: 'changeFrame',
        value: function changeFrame(e) {
            this.setState({ frame: e.target.value });
        }
    }, {
        key: 'render',
        value: function render() {

            var options = ["line", "difference", "stackedarea", "bumpline", "bumparea"].map(function (d) {
                return _react2.default.createElement(
                    'option',
                    { key: "line" + d, label: d, value: d },
                    d
                );
            });

            var curveOptions = ["curveBasis", "curveCardinal", "curveCatmullRom", "curveLinear", "curveNatural", "curveMonotoneX", "curveStep"].map(function (d) {
                return _react2.default.createElement(
                    'option',
                    { key: "curve" + d, label: d, value: d },
                    d
                );
            });

            var frameOptions = ["xyFrame", "orFrame"].map(function (d) {
                return _react2.default.createElement(
                    'option',
                    { key: "frame" + d, label: d, value: d },
                    d
                );
            });

            //        const curveHash = { curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveNatural, curveMonotoneX, curveStep }

            var xAccessor = this.state.frame === "xyFrame" ? function (d) {
                return d.x;
            } : function (d) {
                return d.country;
            };

            {/*            aggStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
                                       customAggType={{ type: this.state.customLineType, interpolator: curveHash[this.state.curve], sort: null }}
                                       aggData={aggData}
                           */}

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
                _react2.default.createElement(
                    'span',
                    null,
                    'frame',
                    _react2.default.createElement(
                        'select',
                        { onChange: this.changeFrame },
                        frameOptions
                    )
                ),
                _react2.default.createElement(_semiotic.SmartFrame, {
                    frameType: this.state.frame,
                    size: [500, 500],
                    pieceData: testData,
                    padding: 5,
                    aggDataAccessor: function aggDataAccessor(d) {
                        return d.values;
                    },
                    xAccessor: xAccessor,
                    yAccessor: function yAccessor(d) {
                        return d.value;
                    },
                    pieceStyle: function pieceStyle(d) {
                        return { fill: d.color, fillOpacity: 0.5, stroke: d.color };
                    },
                    customPieceType: 'swarm',
                    margin: 10
                })
            );
        }
    }]);

    return ScrollyExamples;
}(_react2.default.Component);

module.exports = ScrollyExamples;

},{"d3-random":3,"react":undefined,"semiotic":undefined}],3:[function(require,module,exports){
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
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlcy9zcmMvYXBwX3Njcm9sbHkuanMiLCJleGFtcGxlcy9zcmMvY29tcG9uZW50cy9TY3JvbGx5RXhhbXBsZXMuanMiLCJub2RlX21vZHVsZXMvZDMtcmFuZG9tL2J1aWxkL2QzLXJhbmRvbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQ0E7Ozs7QUFHQTs7OztBQUNBOzs7Ozs7QUFIQTs7QUFLQSxtQkFBUyxNQUFULENBQ0k7QUFBQTtBQUFBO0FBQ0ksK0RBQWdCLE9BQU0sU0FBdEI7QUFESixDQURKLEVBSUksU0FBUyxjQUFULENBQXdCLGVBQXhCLENBSkosRSxDQVBBOzs7Ozs7O0FDQUE7Ozs7QUFDQTs7QUFFQTs7Ozs7Ozs7O0FBREE7OztBQUVBOztBQUVBLElBQU0sU0FBUyxDQUNYLFNBRFcsRUFFWCxTQUZXLEVBR1gsU0FIVyxFQUlYLFNBSlcsQ0FBZjs7QUFPQSxJQUFNLFlBQVksQ0FDZCxRQURjLEVBRWQsT0FGYyxFQUdkLGVBSGMsRUFJZCxPQUpjLENBQWxCOztBQU9BLElBQUksV0FBVyxFQUFmO0FBQ0EsSUFBTSxTQUFTLDRCQUFhLEVBQWIsRUFBaUIsRUFBakIsQ0FBZjtBQUNBLEtBQUssSUFBSSxJQUFFLENBQVgsRUFBYSxJQUFFLEdBQWYsRUFBbUIsR0FBbkIsRUFBd0I7QUFDcEIsYUFBUyxJQUFULENBQWMsRUFBRSxHQUFHLFFBQUwsRUFBZSxPQUFPLEtBQUssR0FBTCxDQUFTLENBQVQsRUFBWSxRQUFaLENBQXRCLEVBQTZDLE9BQU8sT0FBTyxJQUFFLENBQVQsQ0FBcEQsRUFBaUUsU0FBUyxVQUFVLElBQUUsQ0FBWixDQUExRSxFQUFkO0FBQ0g7O0FBRUQsV0FBVyxTQUFTLElBQVQsQ0FBYyxVQUFDLENBQUQsRUFBRyxDQUFIO0FBQUEsV0FBUyxFQUFFLENBQUYsR0FBTSxFQUFFLENBQWpCO0FBQUEsQ0FBZCxDQUFYOztBQUVBOztJ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LEVBQWlCLGFBQWEsR0FBOUIsRUFBbUMsUUFBUSxFQUFFLEtBQTdDLEVBQU47QUFBQSxxQkFSWjtBQVNBLHFDQUFnQixPQVRoQjtBQVVBLDRCQUFRO0FBVlI7QUFKRyxhQUFQO0FBaUJIOzs7O0VBdkR5QixnQkFBTSxTOztBQTBEcEMsT0FBTyxPQUFQLEdBQWlCLGVBQWpCOzs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuLyogZXNsaW50LWVuYWJsZSBuby11bnVzZWQtdmFycyAqL1xuXG5pbXBvcnQgUmVhY3RET00gZnJvbSAncmVhY3QtZG9tJztcbmltcG9ydCBTY3JvbGx5RXhhbXBsZSBmcm9tICcuL2NvbXBvbmVudHMvU2Nyb2xseUV4YW1wbGVzJztcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxkaXY+XG4gICAgICAgIDxTY3JvbGx5RXhhbXBsZSBsYWJlbD1cIlNjcm9sbHlcIiAvPlxuICAgIDwvZGl2PixcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2Nyb2xseS1mcmFtZScpXG4pO1xuXG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBTbWFydEZyYW1lIH0gZnJvbSAnc2VtaW90aWMnO1xuLy9pbXBvcnQgeyBjdXJ2ZUJhc2lzLCBjdXJ2ZUNhcmRpbmFsLCBjdXJ2ZUNhdG11bGxSb20sIGN1cnZlTGluZWFyLCBjdXJ2ZU5hdHVyYWwsIGN1cnZlTW9ub3RvbmVYLCBjdXJ2ZVN0ZXAgIH0gZnJvbSAnZDMtc2hhcGUnXG5pbXBvcnQgeyByYW5kb21Ob3JtYWwgfSBmcm9tICdkMy1yYW5kb20nXG4vL2ltcG9ydCBkMyBmcm9tICdkMydcblxuY29uc3QgY29sb3JzID0gW1xuICAgIFwiIzAwYTJjZVwiLFxuICAgIFwiIzRkNDMwY1wiLFxuICAgIFwiI2IzMzMxZFwiLFxuICAgIFwiI2I2YTc1NlwiXG5dXG5cbmNvbnN0IGNvdW50cmllcyA9IFtcbiAgICBcIkJyYXppbFwiLFxuICAgIFwiQ2hpbmFcIixcbiAgICBcIlVuaXRlZCBTdGF0ZXNcIixcbiAgICBcIkVneXB0XCJcbl1cblxubGV0IHRlc3REYXRhID0gW11cbmNvbnN0IG5SYW5kbyA9IHJhbmRvbU5vcm1hbCg1MCwgMTUpXG5mb3IgKGxldCB4PTE7eDwxMDA7eCsrKSB7XG4gICAgdGVzdERhdGEucHVzaCh7IHg6IG5SYW5kbygpLCB2YWx1ZTogTWF0aC5tYXgoMCwgblJhbmRvKCkpLCBjb2xvcjogY29sb3JzW3glNF0sIGNvdW50cnk6IGNvdW50cmllc1t4JTRdIH0pXG59XG5cbnRlc3REYXRhID0gdGVzdERhdGEuc29ydCgoYSxiKSA9PiBhLnggLSBiLngpXG5cbi8vIGNvbnN0IGFnZ0RhdGEgPSBkMy5uZXN0KCkua2V5KGQgPT4gZC5jb2xvcikuZW50cmllcyh0ZXN0RGF0YSkubWFwKGQgPT4gT2JqZWN0LmFzc2lnbih7IGNvbG9yOiBkLmtleSB9LCBkKSlcblxuY2xhc3MgU2Nyb2xseUV4YW1wbGVzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcyl7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHsgY3VzdG9tTGluZVR5cGU6IFwibGluZVwiLCBjdXJ2ZTogXCJiYXNpc1wiLCBmcmFtZTogXCJ4eUZyYW1lXCIgfVxuICAgICAgICB0aGlzLmNoYW5nZUN1c3RvbUxpbmVUeXBlID0gdGhpcy5jaGFuZ2VDdXN0b21MaW5lVHlwZS5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMuY2hhbmdlQ3VydmUgPSB0aGlzLmNoYW5nZUN1cnZlLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy5jaGFuZ2VGcmFtZSA9IHRoaXMuY2hhbmdlRnJhbWUuYmluZCh0aGlzKVxuICAgIH1cblxuICAgIGNoYW5nZUN1c3RvbUxpbmVUeXBlKGUpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGN1c3RvbUxpbmVUeXBlOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgIH1cblxuICAgIGNoYW5nZUN1cnZlIChlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyBjdXJ2ZTogZS50YXJnZXQudmFsdWUgfSlcbiAgICB9XG5cbiAgICBjaGFuZ2VGcmFtZSAoZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgZnJhbWU6IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbIFwibGluZVwiLCBcImRpZmZlcmVuY2VcIiwgXCJzdGFja2VkYXJlYVwiLCBcImJ1bXBsaW5lXCIsIFwiYnVtcGFyZWFcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcImxpbmVcIiArIGR9IGxhYmVsPXtkfSB2YWx1ZT17ZH0+e2R9PC9vcHRpb24+KVxuXG4gICAgICAgIGNvbnN0IGN1cnZlT3B0aW9ucyA9IFsgXCJjdXJ2ZUJhc2lzXCIsIFwiY3VydmVDYXJkaW5hbFwiLCBcImN1cnZlQ2F0bXVsbFJvbVwiLCBcImN1cnZlTGluZWFyXCIsIFwiY3VydmVOYXR1cmFsXCIsIFwiY3VydmVNb25vdG9uZVhcIiwgXCJjdXJ2ZVN0ZXBcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcImN1cnZlXCIgKyBkfSBsYWJlbD17ZH0gdmFsdWU9e2R9PntkfTwvb3B0aW9uPilcblxuICAgICAgICBjb25zdCBmcmFtZU9wdGlvbnMgPSBbIFwieHlGcmFtZVwiLCBcIm9yRnJhbWVcIiBdLm1hcChkID0+IDxvcHRpb24ga2V5PXtcImZyYW1lXCIgKyBkfSBsYWJlbD17ZH0gdmFsdWU9e2R9PntkfTwvb3B0aW9uPilcblxuLy8gICAgICAgIGNvbnN0IGN1cnZlSGFzaCA9IHsgY3VydmVCYXNpcywgY3VydmVDYXJkaW5hbCwgY3VydmVDYXRtdWxsUm9tLCBjdXJ2ZUxpbmVhciwgY3VydmVOYXR1cmFsLCBjdXJ2ZU1vbm90b25lWCwgY3VydmVTdGVwIH1cblxuICAgICAgICBjb25zdCB4QWNjZXNzb3IgPSB0aGlzLnN0YXRlLmZyYW1lID09PSBcInh5RnJhbWVcIiA/IGQgPT4gZC54IDogZCA9PiBkLmNvdW50cnlcblxuey8qICAgICAgICAgICAgYWdnU3R5bGU9e2QgPT4gKHsgZmlsbDogZC5jb2xvciwgZmlsbE9wYWNpdHk6IDAuNSwgc3Ryb2tlOiBkLmNvbG9yIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tQWdnVHlwZT17eyB0eXBlOiB0aGlzLnN0YXRlLmN1c3RvbUxpbmVUeXBlLCBpbnRlcnBvbGF0b3I6IGN1cnZlSGFzaFt0aGlzLnN0YXRlLmN1cnZlXSwgc29ydDogbnVsbCB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgYWdnRGF0YT17YWdnRGF0YX1cbiAgICAgICAgICAgICovfVxuXG4gICAgICAgIHJldHVybiA8ZGl2PlxuICAgICAgICAgICAgPHNwYW4+Y3VzdG9tTGluZVR5cGU9PHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VDdXN0b21MaW5lVHlwZX0+e29wdGlvbnN9PC9zZWxlY3Q+PC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4+Y3VydmU8c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZUN1cnZlfT57Y3VydmVPcHRpb25zfTwvc2VsZWN0Pjwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuPmZyYW1lPHNlbGVjdCBvbkNoYW5nZT17dGhpcy5jaGFuZ2VGcmFtZX0+e2ZyYW1lT3B0aW9uc308L3NlbGVjdD48L3NwYW4+XG4gICAgICAgICAgICA8U21hcnRGcmFtZVxuICAgICAgICAgICAgZnJhbWVUeXBlPXt0aGlzLnN0YXRlLmZyYW1lfVxuICAgICAgICAgICAgc2l6ZT17WyA1MDAsNTAwIF19XG4gICAgICAgICAgICBwaWVjZURhdGE9e3Rlc3REYXRhfVxuICAgICAgICAgICAgcGFkZGluZz17NX1cbiAgICAgICAgICAgIGFnZ0RhdGFBY2Nlc3Nvcj17ZCA9PiBkLnZhbHVlc31cbiAgICAgICAgICAgIHhBY2Nlc3Nvcj17eEFjY2Vzc29yfVxuICAgICAgICAgICAgeUFjY2Vzc29yPXtkID0+IGQudmFsdWV9XG4gICAgICAgICAgICBwaWVjZVN0eWxlPXtkID0+ICh7IGZpbGw6IGQuY29sb3IsIGZpbGxPcGFjaXR5OiAwLjUsIHN0cm9rZTogZC5jb2xvciB9KX1cbiAgICAgICAgICAgIGN1c3RvbVBpZWNlVHlwZT1cInN3YXJtXCJcbiAgICAgICAgICAgIG1hcmdpbj17MTB9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjcm9sbHlFeGFtcGxlcztcbiIsIi8vIGh0dHBzOi8vZDNqcy5vcmcvZDMtcmFuZG9tLyBWZXJzaW9uIDEuMC4xLiBDb3B5cmlnaHQgMjAxNiBNaWtlIEJvc3RvY2suXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG4gIChmYWN0b3J5KChnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pKSk7XG59KHRoaXMsIGZ1bmN0aW9uIChleHBvcnRzKSB7ICd1c2Ugc3RyaWN0JztcblxuICBmdW5jdGlvbiB1bmlmb3JtKG1pbiwgbWF4KSB7XG4gICAgbWluID0gbWluID09IG51bGwgPyAwIDogK21pbjtcbiAgICBtYXggPSBtYXggPT0gbnVsbCA/IDEgOiArbWF4O1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSBtYXggPSBtaW4sIG1pbiA9IDA7XG4gICAgZWxzZSBtYXggLT0gbWluO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogbWF4ICsgbWluO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWwobXUsIHNpZ21hKSB7XG4gICAgdmFyIHgsIHI7XG4gICAgbXUgPSBtdSA9PSBudWxsID8gMCA6ICttdTtcbiAgICBzaWdtYSA9IHNpZ21hID09IG51bGwgPyAxIDogK3NpZ21hO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB5O1xuXG4gICAgICAvLyBJZiBhdmFpbGFibGUsIHVzZSB0aGUgc2Vjb25kIHByZXZpb3VzbHktZ2VuZXJhdGVkIHVuaWZvcm0gcmFuZG9tLlxuICAgICAgaWYgKHggIT0gbnVsbCkgeSA9IHgsIHggPSBudWxsO1xuXG4gICAgICAvLyBPdGhlcndpc2UsIGdlbmVyYXRlIGEgbmV3IHggYW5kIHkuXG4gICAgICBlbHNlIGRvIHtcbiAgICAgICAgeCA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcbiAgICAgICAgeSA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcbiAgICAgICAgciA9IHggKiB4ICsgeSAqIHk7XG4gICAgICB9IHdoaWxlICghciB8fCByID4gMSk7XG5cbiAgICAgIHJldHVybiBtdSArIHNpZ21hICogeSAqIE1hdGguc3FydCgtMiAqIE1hdGgubG9nKHIpIC8gcik7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvZ05vcm1hbCgpIHtcbiAgICB2YXIgcmFuZG9tTm9ybWFsID0gbm9ybWFsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIE1hdGguZXhwKHJhbmRvbU5vcm1hbCgpKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gaXJ3aW5IYWxsKG4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBmb3IgKHZhciBzdW0gPSAwLCBpID0gMDsgaSA8IG47ICsraSkgc3VtICs9IE1hdGgucmFuZG9tKCk7XG4gICAgICByZXR1cm4gc3VtO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBiYXRlcyhuKSB7XG4gICAgdmFyIHJhbmRvbUlyd2luSGFsbCA9IGlyd2luSGFsbChuKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmFuZG9tSXJ3aW5IYWxsKCkgLyBuO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBleHBvbmVudGlhbChsYW1iZGEpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gLU1hdGgubG9nKDEgLSBNYXRoLnJhbmRvbSgpKSAvIGxhbWJkYTtcbiAgICB9O1xuICB9XG5cbiAgZXhwb3J0cy5yYW5kb21Vbmlmb3JtID0gdW5pZm9ybTtcbiAgZXhwb3J0cy5yYW5kb21Ob3JtYWwgPSBub3JtYWw7XG4gIGV4cG9ydHMucmFuZG9tTG9nTm9ybWFsID0gbG9nTm9ybWFsO1xuICBleHBvcnRzLnJhbmRvbUJhdGVzID0gYmF0ZXM7XG4gIGV4cG9ydHMucmFuZG9tSXJ3aW5IYWxsID0gaXJ3aW5IYWxsO1xuICBleHBvcnRzLnJhbmRvbUV4cG9uZW50aWFsID0gZXhwb25lbnRpYWw7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpOyJdfQ==
