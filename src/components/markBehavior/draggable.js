export function _mouseup(component) {
  document.onmousemove = null;
  document.onmouseup = null;

  let finalTranslate = [0, 0];
  if (!component.props.resetAfter) finalTranslate = component.state.translate;

  component.setState({
    dragging: false,
    translate: finalTranslate,
    uiUpdate: false
  });
  if (
    component.props.droppable &&
    component.props.context &&
    component.props.context.dragSource
  ) {
    component.props.dropFunction(
      component.props.context.dragSource.props,
      component.props
    );
    component.props.updateContext("dragSource");
  }
}

export function _mousedown(component, event) {
  component.setState({
    mouseOrigin: [event.pageX, event.pageY],
    translateOrigin: component.state.translate,
    dragging: true
  });
  document.onmouseup = () => {
    component._mouseup(component);
  };
  document.onmousemove = e => {
    _mousemove(component, e);
  };
}

function _mousemove(component, event) {
  let xAdjust = component.props.freezeX ? 0 : 1;
  let yAdjust = component.props.freezeY ? 0 : 1;

  let adjustedPosition = [
    event.pageX - component.state.mouseOrigin[0],
    event.pageY - component.state.mouseOrigin[1]
  ];
  let adjustedTranslate = [
    (adjustedPosition[0] + component.state.translateOrigin[0]) * xAdjust,
    (adjustedPosition[1] + component.state.translateOrigin[1]) * yAdjust
  ];
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
