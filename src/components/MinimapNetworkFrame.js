import React from "react"

// components
import NetworkFrame from "./NetworkFrame"
import MiniMap from "./MiniMap"

import PropTypes from "prop-types"

class MinimapNetworkFrame extends NetworkFrame {
  constructor(props) {
    super(props)

    this.generateMinimap = this.generateMinimap.bind(this)
  }

  generateMinimap() {
    let miniDefaults = {
      title: "",
      position: [0, 0],
      size: [this.props.size[0] * 5, this.props.size[1] * 5],
      edges: this.props.edges,
      nodes: this.props.nodes,
      xBrushable: true,
      yBrushable: true,
      brushStart: () => {},
      brush: () => {},
      brushEnd: () => {}
    }

    console.log("this.props.nodes", this.props.nodes)
    console.log("this.props.edges", this.props.edges)

    let combinedOptions = Object.assign(miniDefaults, this.props.minimap)

    combinedOptions.hoverAnnotation = false

    return <MiniMap {...combinedOptions} />
  }

  render() {
    let miniMap = this.generateMinimap()
    const options = {}
    if (this.props.renderBefore) {
      options.beforeElements = miniMap
    } else {
      options.afterElements = miniMap
    }

    return this.renderBody(options)
  }
}

MinimapNetworkFrame.propTypes = {
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

export default MinimapNetworkFrame
