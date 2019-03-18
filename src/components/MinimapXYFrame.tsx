import * as React from "react"

// components
import XYFrame from "./XYFrame"
import MiniMap from "./MiniMap"

import { XYFrameProps } from "./XYFrame"

interface MinimapXYFrameProps extends XYFrameProps {
  renderBefore?: boolean
  minimap: { areas: object[] }
}

class MinimapXYFrame extends React.Component<MinimapXYFrameProps> {
  constructor(props) {
    super(props)

    this.generateMinimap = this.generateMinimap.bind(this)
  }

  static displayName = "MinimapXYFrame"

  generateMinimap() {
    const {
      xAccessor,
      yAccessor,
      points,
      lines,
      minimap,
      areas,
      summaries = "areas" in minimap ? minimap.areas : areas,
      size,
      lineDataAccessor,
      lineType,
      lineStyle,
      summaryStyle,
      pointStyle,
      lineClass,
      summaryClass,
      pointClass,
      lineRenderMode,
      pointRenderMode,
      summaryRenderMode,
      canvasLines,
      canvasPoints,
      canvasSummaries,
      axes,
      margin,
      useSpans,
      name,
      annotations,
      areaType,
      summaryType
    } = this.props
    const miniDefaults = {
      position: [0, 0],
      size: [size[0], size[1] * 0.25],
      xAccessor: xAccessor,
      yAccessor: yAccessor,
      points: points,
      lines: lines,
      summaries: summaries,
      lineDataAccessor: lineDataAccessor,
      xBrushable: true,
      yBrushable: true,
      brushStart: () => {},
      brush: () => {},
      brushEnd: () => {},
      lineType: lineType,
      lineStyle,
      summaryStyle,
      pointStyle,
      lineClass,
      summaryClass,
      pointClass,
      lineRenderMode,
      pointRenderMode,
      summaryRenderMode,
      canvasLines,
      canvasPoints,
      canvasSummaries,
      axes,
      margin,
      useSpans,
      name,
      annotations,
      areaType,
      summaryType
    }

    const combinedOptions = {
      ...miniDefaults,
      ...minimap,
      hoverAnnotation: false
    }

    return <MiniMap {...combinedOptions} />
  }

  render() {
    const miniMap = this.generateMinimap()
    const options: {
      beforeElements?: React.ReactNode
      afterElements?: React.ReactNode
    } = {}
    const { minimap, renderBefore, ...rest } = this.props

    if (renderBefore) {
      options.beforeElements = miniMap
    } else {
      options.afterElements = miniMap
    }

    return <XYFrame {...rest} {...options} />
  }
}

export default MinimapXYFrame
