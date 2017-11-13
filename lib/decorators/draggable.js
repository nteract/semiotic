"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
function _mouseup() {
  document.onmousemove = null;

  var finalTranslate = [0, 0];
  if (!this.props.resetAfter) finalTranslate = this.state.translate;

  this.setState({
    dragging: false,
    translate: finalTranslate,
    uiUpdate: false
  });
  if (this.props.droppable && this.props.uiContext && this.props.uiContext.dragSource) {
    this.props.dropFunction(this.props.uiContext.dragSource.props, this.props);
    this.props.updateUIContext("dragSource", undefined);
  }
}

function _mousedown(event) {
  this.setState({
    mouseOrigin: [event.pageX, event.pageY],
    translateOrigin: this.state.translate
  });
  document.onmouseup = this._mouseup;
  document.onmousemove = this._mousemove;
}

function _mousemove(event) {
  var xAdjust = this.props.freezeX ? 1 : 0;
  var yAdjust = this.props.freezeY ? 1 : 0;

  var adjustedPosition = [event.pageX - this.state.mouseOrigin[0], event.pageY - this.state.mouseOrigin[1]];
  var adjustedTranslate = [(adjustedPosition[0] + this.state.translateOrigin[0]) * xAdjust, (adjustedPosition[1] + this.state.translateOrigin[1]) * yAdjust];
  if (this.props.droppable && this.state.uiUpdate === false) {
    this.props.updateUIContext("dragSource", this);
    this.setState({
      translate: adjustedTranslate,
      uiUpdate: true,
      dragging: true
    });
  } else {
    this.setState({ translate: adjustedTranslate });
  }
}

exports.default = function (component) {
  var previousWillReceive = component.componentWillReceiveProps;

  Object.defineProperties(component, {
    componentWillReceiveProps: {
      value: function value() {
        this._mouseup = this._mouseup.bind(this);
        this._mousedown = this._mousedown.bind(this);
        this._mousemove = this._mousemove.bind(this);
        this._doubleclick = this._doubleclick.bind(this);
        previousWillReceive && previousWillReceive.apply(this, arguments);
      }
    },

    _doubleclick: {
      value: function value() {
        this.props.onDoubleClick(this.props);
      }
    },

    _mouseup: {
      value: _mouseup
    },

    _mousedown: {
      value: _mousedown
    },

    _mousemove: {
      value: _mousemove
    }
  });
};

module.exports = exports['default'];