"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._mouseup = _mouseup;
exports._mousedown = _mousedown;
function _mouseup(component) {
  document.onmousemove = null;
  document.onmouseup = null;

  var finalTranslate = [0, 0];
  if (!component.props.resetAfter) finalTranslate = component.state.translate;

  component.setState({
    dragging: false,
    translate: finalTranslate,
    uiUpdate: false
  });
  if (component.props.droppable && component.props.context && component.props.context.dragSource) {
    component.props.dropFunction(component.props.context.dragSource.props, component.props);
    component.props.updateContext("dragSource");
  }
}

function _mousedown(component, event) {
  component.setState({
    mouseOrigin: [event.pageX, event.pageY],
    translateOrigin: component.state.translate,
    dragging: true
  });
  document.onmouseup = function () {
    component._mouseup(component);
  };
  document.onmousemove = function (e) {
    _mousemove(component, e);
  };
}

function _mousemove(component, event) {
  var xAdjust = component.props.freezeX ? 0 : 1;
  var yAdjust = component.props.freezeY ? 0 : 1;

  var adjustedPosition = [event.pageX - component.state.mouseOrigin[0], event.pageY - component.state.mouseOrigin[1]];
  var adjustedTranslate = [(adjustedPosition[0] + component.state.translateOrigin[0]) * xAdjust, (adjustedPosition[1] + component.state.translateOrigin[1]) * yAdjust];
  if (component.props.droppable && component.state.uiUpdate === false) {
    component.props.updateContext("dragSource", component);
    component.setState({
      translate: adjustedTranslate,
      uiUpdate: true,
      dragging: true
    });
  } else {
    component.setState({ translate: adjustedTranslate });
  }
}