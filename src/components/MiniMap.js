import React from "react";

import XYFrame from "./XYFrame";

// components

import PropTypes from "prop-types";

class MiniMap extends React.Component {
  render() {
    let interactivity = {
      start: this.props.brushStart,
      during: this.props.brush,
      end: this.props.brushEnd
    };

    if (this.props.xBrushable && this.props.yBrushable) {
      interactivity.brush = "xyBrush";
      interactivity.extent = [[], []];
      if (this.props.xBrushExtent) {
        interactivity.extent[0] = this.props.xBrushExtent;
      }
      if (this.props.yBrushExtent) {
        interactivity.extent[1] = this.props.yBrushExtent;
      }
    } else if (this.props.xBrushable) {
      interactivity.brush = "xBrush";
      if (this.props.xBrushExtent) {
        interactivity.extent = this.props.xBrushExtent;
      }
    } else if (this.props.yBrushable) {
      interactivity.brush = "yBrush";
      if (this.props.yBrushExtent) {
        interactivity.extent = this.props.yBrushExtent;
      }
    }

    return <XYFrame {...this.props} interaction={interactivity} />;
  }
}

MiniMap.propTypes = {
  brushStart: PropTypes.func,
  brush: PropTypes.func,
  brushEnd: PropTypes.func,
  xBrushExtent: PropTypes.array,
  yBrushExtent: PropTypes.array,
  xBrushable: PropTypes.bool,
  yBrushable: PropTypes.bool
};

export default MiniMap;
