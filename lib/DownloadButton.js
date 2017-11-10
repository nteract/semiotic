"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.downloadCSV = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _json2csv = require("json2csv");

var _json2csv2 = _interopRequireDefault(_json2csv);

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var downloadCSV = exports.downloadCSV = function downloadCSV(csvName, data) {
  (0, _json2csv2.default)(_extends({}, { data: data }), function (err, csv) {
    var blob = new Blob([csv], { type: "text/csv" });

    var dlink = document.createElement("a");
    dlink.download = csvName ? csvName.replace(/ /g, "_") + ".csv" : "vis.csv";
    dlink.href = window.URL.createObjectURL(blob);
    dlink.onclick = function () {
      // revokeObjectURL needs a delay to work properly
      var that = undefined;
      setTimeout(function () {
        window.URL.revokeObjectURL(that.href);
      }, 1500);
    };

    dlink.click();
    dlink.remove();
  });
};

var DownloadButton = function (_React$Component) {
  _inherits(DownloadButton, _React$Component);

  function DownloadButton() {
    _classCallCheck(this, DownloadButton);

    return _possibleConstructorReturn(this, (DownloadButton.__proto__ || Object.getPrototypeOf(DownloadButton)).apply(this, arguments));
  }

  _createClass(DownloadButton, [{
    key: "render",

    /*
      renderBody({ csvName, data }) {
          return <div className='download-div'>
                  <button alt='download' onClick={downloadCSV.bind(this, csvName, data)} className='download-data-button'>
                      <a>Download</a>
                  </button>
              </div>
      }
    */
    value: function render() {
      var _props = this.props,
          csvName = _props.csvName,
          data = _props.data,
          width = _props.width,
          _props$label = _props.label,
          label = _props$label === undefined ? "Download" : _props$label;

      return _react2.default.createElement(
        "div",
        { className: "download-div", style: { width: width } },
        _react2.default.createElement(
          "button",
          {
            alt: "download",
            onClick: downloadCSV.bind(this, csvName, data),
            className: "download-data-button"
          },
          _react2.default.createElement(
            "a",
            null,
            label
          )
        )
      );
    }
  }]);

  return DownloadButton;
}(_react2.default.Component);

DownloadButton.propTypes = {
  csvName: _propTypes2.default.string,
  data: _propTypes2.default.array,
  width: _propTypes2.default.number
};

exports.default = DownloadButton;