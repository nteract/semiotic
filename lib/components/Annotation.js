'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _d3Selection = require('d3-selection');

var _d3SvgAnnotation = require('d3-svg-annotation');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Annotation = function (_React$Component) {
    _inherits(Annotation, _React$Component);

    function Annotation(props) {
        _classCallCheck(this, Annotation);

        var _this = _possibleConstructorReturn(this, (Annotation.__proto__ || Object.getPrototypeOf(Annotation)).call(this, props));

        _this.createAnnotation = _this.createAnnotation.bind(_this);
        return _this;
    }

    _createClass(Annotation, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
            this.createAnnotation();
        }
    }, {
        key: 'componentDidUpdate',
        value: function componentDidUpdate() {
            this.createAnnotation();
        }
    }, {
        key: 'createAnnotation',
        value: function createAnnotation() {
            var node = this.node;
            var noteData = this.props.noteData;

            var makeAnnotations = (0, _d3SvgAnnotation.annotation)().type(noteData.noteType).annotations([noteData]);

            (0, _d3Selection.select)(node).call(makeAnnotations);
        }
    }, {
        key: 'render',
        value: function render() {
            var _this2 = this;

            return _react2.default.createElement('g', { ref: function ref(node) {
                    return _this2.node = node;
                } });
        }
    }]);

    return Annotation;
}(_react2.default.Component);

Annotation.propTypes = {};

exports.default = Annotation;
module.exports = exports['default'];