import React from "react";
import { select } from "d3-selection";

// components

import PropTypes from "prop-types";

class Brush extends React.Component {
  constructor(props) {
    super(props);

    this.createBrush = this.createBrush.bind(this);
  }

  componentDidMount() {
    this.createBrush();
  }
  componentDidUpdate(lastProps) {
    if (
      (lastProps.selectedExtent &&
        this.props.selectedExtent &&
        lastProps.selectedExtent.toString() !==
          this.props.selectedExtent.toString()) ||
      (!lastProps.selectedExtent && this.props.selectedExtent) ||
      (lastProps.selectedExtent && !this.props.selectedExtent)
    ) {
      this.createBrush();
    }
  }

  createBrush() {
    let node = this.node;
    let brush = this.props.svgBrush;
    select(node).call(brush);
    if (this.props.selectedExtent) {
      select(node).call(brush.move, this.props.selectedExtent);
    }
  }

  render() {
    return (
      <g
        ref={node => (this.node = node)}
        transform={"translate(" + (this.props.position || [0, 0]) + ")"}
        className="xybrush"
      />
    );
  }
}

Brush.propTypes = {
  size: PropTypes.array,
  position: PropTypes.array,
  selectedExtent: PropTypes.array,
  svgBrush: PropTypes.func
};

export default Brush;
