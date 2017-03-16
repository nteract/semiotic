'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Mark = require('./Mark');

var _Mark2 = _interopRequireDefault(_Mark);

var _MarkContext = require('./MarkContext');

var _MarkContext2 = _interopRequireDefault(_MarkContext);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// modules


var Scatterplot = function (_React$Component) {
  _inherits(Scatterplot, _React$Component);

  function Scatterplot(props) {
    _classCallCheck(this, Scatterplot);

    var _this = _possibleConstructorReturn(this, (Scatterplot.__proto__ || Object.getPrototypeOf(Scatterplot)).call(this, props));

    _this.generatePoints = _this.generatePoints.bind(_this);

    return _this;
  }

  _createClass(Scatterplot, [{
    key: 'shouldComponentUpdate',
    value: function shouldComponentUpdate(lastprops) {
      if ((0, _lodash.difference)(lastprops.data, this.props.data).length === 0) {
        return false;
      }
      return true;
    }
  }, {
    key: 'generatePoints',
    value: function generatePoints() {
      var _this2 = this;

      var points = this.props.data.map(function (d, i) {

        var point = void 0;
        if (!_this2.props.customSymbol) {
          point = _react2.default.createElement(_Mark2.default, { markType: 'circle', r: '5', style: { fill: "blue", stroke: "white" } });
        } else {
          point = _this2.props.customSymbol(d);
        }

        return _react2.default.createElement(
          'g',
          { key: "scatterpoint" + i, transform: "translate(" + _this2.props.xScale(d.x) + "," + _this2.props.yScale(d.y) + ")" },
          point
        );
      });

      return points;
    }
  }, {
    key: 'render',
    value: function render() {
      var points = this.generatePoints();

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'svg',
          { height: this.props.size[1], width: this.props.size[0] },
          _react2.default.createElement(
            _MarkContext2.default,
            {
              name: 'Scatterplot',
              position: [0, 0],
              size: this.props.size,
              scene: {} },
            points
          )
        )
      );
    }
  }]);

  return Scatterplot;
}(_react2.default.Component);

module.exports = Scatterplot;