"use client"
import * as React from "react"

// components
import XYFrame from "./XYFrame"
import MiniMap from "./MiniMap"

import { XYFrameProps } from "./types/xyTypes"

interface MinimapXYFrameProps<TDatum = Record<string, any>> extends XYFrameProps<TDatum> {
  renderBefore?: boolean
  minimap: { summaries: object[] }
}

const generateMinimap = <TDatum = Record<string, any>>(props: MinimapXYFrameProps<TDatum>) => {
  const {
    xAccessor,
    yAccessor,
    points,
    lines,
    minimap,
    summaries,
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
    name,
    annotations,
    summaryType,
    interactionSettings
  } = props

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
    name,
    annotations,
    summaryType,
    interactionSettings
  }

  const combinedOptions = {
    ...miniDefaults,
    ...minimap,
    hoverAnnotation: false
  }

  return <MiniMap {...combinedOptions} />
}

export default function MinimapXYFrame<TDatum = Record<string, any>>(props: MinimapXYFrameProps<TDatum>) {
  const miniMap = generateMinimap(props)
  const options: {
    beforeElements?: React.ReactNode
    afterElements?: React.ReactNode
  } = {}
  const { minimap, renderBefore, ...rest } = props

  if (renderBefore) {
    options.beforeElements = miniMap
  } else {
    options.afterElements = miniMap
  }

  return <XYFrame {...rest} {...options} />
}
