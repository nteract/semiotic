import React from "react";

// components

import PropTypes from "prop-types";

class MarkContext extends React.Component {
  constructor(props) {
    super(props);
    this.mapElements = this.mapElements.bind(this);
    this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
    this.updateContext = this.updateContext.bind(this);
    this.state = { context: {} };
  }

  mapElements(element, ei) {
    if (!element) return null;

    const props = {
      key: `mc-mark-${ei}`
    };

    if (typeof element.type !== "string") {
      props.context = this.state.context;
      props.updateContext = this.updateContext;
    }
    if (Array.isArray(element)) return element.map(this.mapElements);

    return React.cloneElement(element, props);
  }

  shouldComponentUpdate(nextProps) {
    if (
      this.props.xyFrameChildren &&
      this.props.renderNumber === nextProps.renderNumber
    ) {
      return false;
    }
    return true;
  }

  updateContext(prop, value) {
    const currentContext = this.state.context;
    currentContext[prop] = value;
    this.setState({ context: currentContext });
  }

  render() {
    let elements = null;

    if (Array.isArray(this.props.children))
      elements = this.props.children.map(this.mapElements);
    else if (typeof this.props.children === "object")
      elements = this.mapElements(this.props.children);

    let transform = [0, 0];

    transform[0] = this.props.position ? this.props.position[0] : 0;
    transform[1] = this.props.position ? this.props.position[1] : 0;

    return (
      <g transform={"translate(" + transform.toString() + ")"}>{elements}</g>
    );
  }
}

MarkContext.propTypes = {
  position: PropTypes.array,
  xyFrameChildren: PropTypes.bool,
  renderNumber: PropTypes.number
};
export default MarkContext;
