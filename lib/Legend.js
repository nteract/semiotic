"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var typeHash = {
  fill: function fill(style) {
    return _react2.default.createElement("rect", { style: style, width: 20, height: 20 });
  },
  line: function line(style) {
    return _react2.default.createElement("line", { style: style, x1: 0, y1: 0, x2: 20, y2: 20 });
  }
};

var Legend = function (_React$Component) {
  _inherits(Legend, _React$Component);

  function Legend() {
    _classCallCheck(this, Legend);

    return _possibleConstructorReturn(this, (Legend.__proto__ || Object.getPrototypeOf(Legend)).apply(this, arguments));
  }

  _createClass(Legend, [{
    key: "renderLegendGroup",
    value: function renderLegendGroup(legendGroup) {
      var _legendGroup$type = legendGroup.type,
          type = _legendGroup$type === undefined ? "fill" : _legendGroup$type,
          styleFn = legendGroup.styleFn,
          items = legendGroup.items;

      var renderedItems = [];
      var itemOffset = 0;
      items.forEach(function (item, i) {
        var Type = typeHash[type];
        var renderedType = void 0;
        if (Type) {
          var style = styleFn(item, i);
          renderedType = Type(style);
        } else {
          renderedType = type(item);
        }
        renderedItems.push(_react2.default.createElement(
          "g",
          { key: "legend-item-" + i, transform: "translate(0," + itemOffset + ")" },
          renderedType,
          _react2.default.createElement(
            "text",
            { y: 15, x: 30 },
            item.label
          )
        ));
        itemOffset += 25;
      });
      return renderedItems;
    }
  }, {
    key: "render",
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          legendGroups = _props.legendGroups,
          _props$title = _props.title,
          title = _props$title === undefined ? "Legend" : _props$title,
          _props$width = _props.width,
          width = _props$width === undefined ? 100 : _props$width;

      var offset = 30;
      var renderedGroups = [];
      legendGroups.forEach(function (l, i) {
        offset += 5;
        renderedGroups.push(_react2.default.createElement("line", {
          key: "legend-top-line legend-symbol-" + i,
          stroke: "gray",
          x1: 0,
          y1: offset,
          x2: width,
          y2: offset
        }));
        offset += 10;
        if (l.label) {
          offset += 20;
          renderedGroups.push(_react2.default.createElement(
            "text",
            {
              key: "legend-text-" + i,
              y: offset,
              className: "legend-group-label"
            },
            l.label
          ));
          offset += 10;
        }

        renderedGroups.push(_react2.default.createElement(
          "g",
          {
            key: "legend-group-" + i,
            className: "legend-item",
            transform: "translate(0," + offset + ")"
          },
          _this2.renderLegendGroup(l)
        ));
        offset += l.items.length * 25 + 10;
      });

      return _react2.default.createElement(
        "g",
        null,
        _react2.default.createElement(
          "text",
          { className: "legend-title", y: 20, x: width / 2, textAnchor: "middle" },
          title
        ),
        renderedGroups
      );
    }
  }]);

  return Legend;
}(_react2.default.Component);

Legend.propTypes = {
  title: _propTypes2.default.string,
  width: _propTypes2.default.number,
  legendGroups: _propTypes2.default.array
};

exports.default = Legend;
module.exports = exports['default'];