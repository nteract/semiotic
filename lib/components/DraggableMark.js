'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _Mark = require('./Mark');

var _Mark2 = _interopRequireDefault(_Mark);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PropTypes = _react2.default.PropTypes;

var DraggableMark = function (_React$Component) {
    _inherits(DraggableMark, _React$Component);

    function DraggableMark(props) {
        _classCallCheck(this, DraggableMark);

        return _possibleConstructorReturn(this, (DraggableMark.__proto__ || Object.getPrototypeOf(DraggableMark)).call(this, props));
    }

    _createClass(DraggableMark, [{
        key: 'render',
        value: function render() {
            //Currently children are being duplicated in the mark

            return _react2.default.createElement(_Mark2.default, _extends({
                draggable: true,
                resetAfter: true,
                droppable: true
            }, this.props));
        }
    }]);

    return DraggableMark;
}(_react2.default.Component);

DraggableMark.propTypes = {
    name: PropTypes.string,
    markType: PropTypes.string.isRequired,
    description: PropTypes.string,
    from: PropTypes.object,
    key: PropTypes.string,
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

exports.default = DraggableMark;
module.exports = exports['default'];