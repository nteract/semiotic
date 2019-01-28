import React from "react"

// components
import XYFrame from "./XYFrame"
import MiniMap from "./MiniMap"

import PropTypes from "prop-types"

class MinimapXYFrame extends React.Component {
  constructor(props) {
    super(props)

    this.generateMinimap = this.generateMinimap.bind(this)
  }

  static displayName = "OrdinalFrame"

  generateMinimap() {
    const {
      xAccessor,
      yAccessor,
      points,
      lines,
      areas,
      size,
      lineDataAccessor,
      lineType,
      minimap
    } = this.props
    const miniDefaults = {
      title: "",
      position: [0, 0],
      size: [size[0], size[1] * 0.25],
      xAccessor: xAccessor,
      yAccessor: yAccessor,
      points: points,
      lines: lines,
      areas: areas,
      lineDataAccessor: lineDataAccessor,
      xBrushable: true,
      yBrushable: true,
      brushStart: () => {},
      brush: () => {},
      brushEnd: () => {},
      lineType: lineType
    }

    const combinedOptions = { ...miniDefaults, ...minimap }

    combinedOptions.hoverAnnotation = false

    return <MiniMap {...combinedOptions} />
  }

  render() {
    const miniMap = this.generateMinimap()
    const options = {}
    const { minimap, renderBefore, ...rest } = this.props

    if (renderBefore) {
      options.beforeElements = miniMap
    } else {
      options.afterElements = miniMap
    }

    return <XYFrame {...rest} {...options} />
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
}

export default MinimapXYFrame
