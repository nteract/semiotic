'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.downloadCSV = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _json2csv = require('json2csv');

var _json2csv2 = _interopRequireDefault(_json2csv);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PropTypes = _react2.default.PropTypes;

var downloadCSV = exports.downloadCSV = function downloadCSV(csvName, data) {
    (0, _json2csv2.default)(_extends({}, { data: data }), function (err, csv) {
        var blob = new Blob([csv], { type: 'text/csv' });

        var dlink = document.createElement('a');
        dlink.download = csvName ? csvName.replace(/ /g, '_') + ".csv" : "vis.csv";
        dlink.href = window.URL.createObjectURL(blob);
        dlink.onclick = function () {
            // revokeObjectURL needs a delay to work properly
            var that = this;
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
        key: 'renderBody',
        value: function renderBody(_ref) {
            var csvName = _ref.csvName,
                data = _ref.data;

            return _react2.default.createElement(
                'div',
                { className: 'download-div' },
                _react2.default.createElement(
                    'button',
                    { alt: 'download', onClick: downloadCSV.bind(this, csvName, data), className: 'download-data-button' },
                    _react2.default.createElement(
                        'a',
                        null,
                        'Download'
                    )
                )
            );
        }
    }, {
        key: 'render',
        value: function render() {
            var _props = this.props,
                csvName = _props.csvName,
                data = _props.data,
                width = _props.width;

            return _react2.default.createElement(
                'div',
                { className: 'download-div', style: { width: width } },
                _react2.default.createElement(
                    'button',
                    { alt: 'download', onClick: downloadCSV.bind(this, csvName, data), className: 'download-data-button' },
                    _react2.default.createElement(
                        'a',
                        null,
                        'Download'
                    )
                )
            );
        }
    }]);

    return DownloadButton;
}(_react2.default.Component);

DownloadButton.propTypes = {
    csvName: PropTypes.string,
    data: PropTypes.array,
    renderBody: PropTypes.func
};

exports.default = DownloadButton;