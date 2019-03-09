import * as React from "react"

// components
import NetworkFrame from "./NetworkFrame"
import MiniMap from "./MiniMap"

class MinimapNetworkFrame extends NetworkFrame {
  constructor(props) {
    super(props)

    this.generateMinimap = this.generateMinimap.bind(this)
  }

  generateMinimap() {
    const miniDefaults = {
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

    const combinedOptions = Object.assign(miniDefaults, this.props.minimap)

    combinedOptions.hoverAnnotation = false

    return <MiniMap {...combinedOptions} />
  }

  render() {
    const miniMap = this.generateMinimap()
    const options = {}
    if (this.props.renderBefore) {
      options.beforeElements = miniMap
    } else {
      options.afterElements = miniMap
    }

    return <div>Build out NetworkFrameMinimap Soon</div>
  }
}

export default MinimapNetworkFrame
