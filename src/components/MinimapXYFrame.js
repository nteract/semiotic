import React from "react";

// components
import XYFrame from "./XYFrame";
import MiniMap from "./MiniMap";

import PropTypes from "prop-types";

class MinimapXYFrame extends XYFrame {
  constructor(props) {
    super(props);

    this.generateMinimap = this.generateMinimap.bind(this);
  }

  generateMinimap() {
    let miniDefaults = {
      title: "",
      position: [0, 0],
      size: [this.props.size[0], this.props.size[1] * 0.25],
      xAccessor: this.props.xAccessor,
      yAccessor: this.props.yAccessor,
      points: this.props.points,
      lines: this.props.lines,
      areas: this.props.areas,
      lineDataAccessor: this.props.lineDataAccessor,
      xBrushable: true,
      yBrushable: true,
      brushStart: () => {},
      brush: () => {},
      brushEnd: () => {},
      lineType: this.props.lineType
    };

    let combinedOptions = Object.assign(miniDefaults, this.props.minimap);

    combinedOptions.hoverAnnotation = false;

    return <MiniMap {...combinedOptions} />;
  }

  render() {
    let miniMap = this.generateMinimap();
    const options = {};
    if (this.props.renderBefore) {
      options.beforeElements = miniMap;
    } else {
      options.afterElements = miniMap;
    }

    return this.renderBody(options);
  }
}

MinimapXYFrame.propTypes = {
  size: PropTypes.array,
  xAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  yAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  points: PropTypes.array,
  lines: PropTypes.array,
  areas: PropTypes.array,
  lineDataAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  lineType: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  minimap: PropTypes.object,
  renderBefore: PropTypes.oneOfType([PropTypes.array, PropTypes.object])
};

export default MinimapXYFrame;
