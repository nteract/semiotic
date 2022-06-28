import * as React from "react"
import { useMemo } from "react"

import { scaleLinear } from "d3-scale"

// components

import Frame from "./Frame"
import TooltipPositioner from "./TooltipPositioner"
import {
  svgXYAnnotation,
  svgHighlight,
  basicReactAnnotation,
  svgEncloseAnnotation,
  svgRectEncloseAnnotation,
  svgHullEncloseAnnotation,
  svgXAnnotation,
  svgYAnnotation,
  svgBoundsAnnotation,
  svgLineAnnotation,
  svgAreaAnnotation,
  svgHorizontalPointsAnnotation,
  svgVerticalPointsAnnotation,
  htmlTooltipAnnotation
} from "./annotationRules/xyframeRules"

import { desaturationLayer } from "./annotationRules/baseRules"

import { relativeY, relativeX, findPointByID } from "./svg/lineDrawing"

import { calculateMargin, adjustedPositionSize } from "./svg/frameFunctions"

import {
  projectedX,
  projectedY,
  projectedYTop,
  projectedYMiddle,
  projectedYBottom,
  projectedXMiddle,
  projectedXTop,
  projectedXBottom
} from "./constants/coordinateNames"

import { extentValue } from "./data/unflowedFunctions"

import { basicDataChangeCheck } from "./processing/diffing"

import { findFirstAccessorValue } from "./data/multiAccessorUtils"

import { calculateXYFrame } from "./processing/xyDrawing"

import { xyFrameChangeProps } from "./constants/frame_props"

import { HOCSpanOrDiv } from "./SpanOrDiv"

import {
  ProjectedPoint,
  ProjectedSummary,
  ProjectedLine,
  GenericObject
} from "./types/generalTypes"

import { AnnotationType } from "./types/annotationTypes"

import { XYFrameProps, XYFrameState } from "./types/xyTypes"

import { UpdatedAnnotationLayerProps } from "./AnnotationLayer"
import { useDerivedStateFromProps } from "./useDerivedStateFromProps"
import { useLegacyUnmountCallback } from "./useLegacyUnmountCallback"

let xyframeKey = ""
const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
for (let i = 32; i > 0; --i)
  xyframeKey += chars[Math.floor(Math.random() * chars.length)]

const projectedCoordinateNames = {
  y: projectedY,
  x: projectedX,
  yMiddle: projectedYMiddle,
  yTop: projectedYTop,
  yBottom: projectedYBottom,
  xMiddle: projectedXMiddle,
  xTop: projectedXTop,
  xBottom: projectedXBottom
}

const defaultProps = {
  annotations: [],
  foregroundGraphics: undefined,
  size: [500, 500],
  className: "",
  lineType: "line",
  name: "xyframe",
  dataVersion: undefined
}

const XYFrame = React.memo(function XYFrame(allProps: XYFrameProps) {
  const props = { ...defaultProps, ...allProps }
  const baseState = {
    SpanOrDiv: HOCSpanOrDiv(props.useSpans),
    size: [500, 500],
    dataVersion: undefined,
    lineData: undefined,
    pointData: undefined,
    summaryData: undefined,
    projectedLines: undefined,
    projectedPoints: undefined,
    projectedSummaries: undefined,
    fullDataset: [],
    adjustedPosition: [0, 0],
    adjustedSize: [500, 500],
    backgroundGraphics: null,
    foregroundGraphics: null,
    axesData: undefined,
    axes: undefined,
    axesTickLines: undefined,
    renderNumber: 0,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    calculatedXExtent: [0, 0],
    calculatedYExtent: [0, 0],
    xAccessor: [(d: { x: number }) => d.x],
    yAccessor: [(d: { y: number }) => d.y],
    xExtent: [0, 0],
    yExtent: [0, 0],
    areaAnnotations: [],
    xScale: scaleLinear(),
    yScale: scaleLinear(),
    title: null,
    legendSettings: undefined,
    xyFrameRender: {},
    canvasDrawing: [],
    annotatedSettings: {
      xAccessor: undefined,
      yAccessor: undefined,
      summaryDataAccessor: undefined,
      lineDataAccessor: undefined,
      renderKeyFn: undefined,
      lineType: undefined,
      summaryType: undefined,
      lineIDAccessor: undefined,
      summaries: undefined,
      lines: undefined,
      title: undefined,
      xExtent: undefined,
      yExtent: undefined
    },
    overlay: undefined,
    props
  }

  const initialState = useMemo(
    () => ({
      ...baseState,
      ...calculateXYFrame(props, baseState, true)
    }),
    []
  )
  const state = useDerivedStateFromProps(
    deriveXYFrameState,
    props,
    initialState
  )

  const {
    size,
    className,
    annotationSettings,
    annotations,
    additionalDefs,
    hoverAnnotation,
    interaction,
    customClickBehavior,
    customHoverBehavior,
    customDoubleClickBehavior,
    canvasPostProcess,
    baseMarkProps,
    useSpans,
    canvasSummaries,
    canvasPoints,
    canvasLines,
    afterElements,
    beforeElements,
    renderOrder,
    matte,
    frameKey,
    showLinePoints,
    sketchyRenderingEngine,
    disableContext,
    frameRenderOrder,
    disableCanvasInteraction,
    interactionSettings,
    disableProgressiveRendering
  } = props

  const {
    backgroundGraphics,
    foregroundGraphics,
    adjustedPosition,
    adjustedSize,
    margin,
    axes,
    axesTickLines,
    xScale,
    yScale,
    fullDataset,
    dataVersion,
    areaAnnotations,
    legendSettings,
    xyFrameRender,
    annotatedSettings,
    overlay
  } = state

  useLegacyUnmountCallback(props, state)

  return (
    <Frame
      name="xyframe"
      renderPipeline={xyFrameRender}
      adjustedPosition={adjustedPosition}
      size={size}
      projectedCoordinateNames={projectedCoordinateNames}
      xScale={xScale}
      yScale={yScale}
      axes={axes}
      axesTickLines={axesTickLines}
      title={annotatedSettings.title}
      dataVersion={dataVersion}
      matte={matte}
      className={className}
      adjustedSize={adjustedSize}
      frameKey={frameKey || xyframeKey}
      additionalDefs={additionalDefs}
      hoverAnnotation={hoverAnnotation}
      defaultSVGRule={(args) => defaultXYSVGRule(props, state, args)}
      defaultHTMLRule={(args) => defaultXYHTMLRule(props, state, args)}
      annotations={
        areaAnnotations.length > 0
          ? [...annotations, ...areaAnnotations]
          : annotations
      }
      annotationSettings={annotationSettings}
      legendSettings={legendSettings}
      projectedYMiddle={projectedYMiddle}
      interaction={interaction}
      customClickBehavior={customClickBehavior}
      customHoverBehavior={customHoverBehavior}
      customDoubleClickBehavior={customDoubleClickBehavior}
      points={fullDataset}
      showLinePoints={
        typeof showLinePoints === "string" ? showLinePoints : undefined
      }
      margin={margin}
      backgroundGraphics={backgroundGraphics}
      foregroundGraphics={foregroundGraphics}
      beforeElements={beforeElements}
      afterElements={afterElements}
      disableContext={disableContext}
      canvasPostProcess={canvasPostProcess}
      baseMarkProps={baseMarkProps}
      useSpans={useSpans}
      canvasRendering={!!(canvasSummaries || canvasPoints || canvasLines)}
      renderOrder={renderOrder}
      overlay={overlay}
      sketchyRenderingEngine={sketchyRenderingEngine}
      frameRenderOrder={frameRenderOrder}
      disableCanvasInteraction={disableCanvasInteraction}
      interactionSettings={interactionSettings}
      disableProgressiveRendering={disableProgressiveRendering}
    />
  )
})

function deriveXYFrameState(nextProps: XYFrameProps, prevState: XYFrameState) {
  const { props } = prevState
  const {
    xExtent: oldXExtent = [],
    yExtent: oldYExtent = [],
    size: oldSize,
    dataVersion: oldDataVersion,
    lineData,
    summaryData,
    pointData
  } = prevState
  const {
    xExtent: baseNewXExtent,
    yExtent: baseNewYExtent,
    size: newSize,
    dataVersion: newDataVersion,
    lines: newLines,
    summaries: newSummaries,
    points: newPoints
  } = nextProps

  const newXExtent: number[] = extentValue(baseNewXExtent)

  const newYExtent: number[] = extentValue(baseNewYExtent)

  const extentChange =
    (oldXExtent[0] !== newXExtent[0] && newXExtent[0] !== undefined) ||
    (oldYExtent[0] !== newYExtent[0] && newYExtent[0] !== undefined) ||
    (oldXExtent[1] !== newXExtent[1] && newXExtent[1] !== undefined) ||
    (oldYExtent[1] !== newYExtent[1] && newYExtent[1] !== undefined)

  const lineChange = basicDataChangeCheck(lineData, newLines)

  const summaryChange = basicDataChangeCheck(summaryData, newSummaries)

  const pointChange = basicDataChangeCheck(pointData, newPoints)

  if (
    (oldDataVersion && oldDataVersion !== newDataVersion) ||
    !prevState.fullDataset
  ) {
    return calculateXYFrame(nextProps, prevState, true)
  } else if (
    lineChange ||
    summaryChange ||
    pointChange ||
    oldSize[0] !== newSize[0] ||
    oldSize[1] !== newSize[1] ||
    extentChange ||
    (!oldDataVersion &&
      xyFrameChangeProps.find((d) => props[d] !== nextProps[d]))
  ) {
    const dataChanged =
      lineChange ||
      summaryChange ||
      pointChange ||
      extentChange ||
      !!xyFrameChangeProps.find((d) => props[d] !== nextProps[d])

    return calculateXYFrame(nextProps, prevState, dataChanged)
  }

  return null
}

function defaultXYSVGRule(
  props: XYFrameProps,
  state: XYFrameState,
  {
    d: baseD,
    i,
    lines,
    summaries,
    points,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: UpdatedAnnotationLayerProps
    lines: { data: [] }
    summaries: { data: [] }
    points: {
      data: []
      styleFn: (args?: GenericObject, index?: number) => GenericObject
    }
  }
) {
  const {
    showLinePoints,
    defined,
    margin: baseMargin,
    size,
    svgAnnotationRules
  } = props

  const {
    xyFrameRender,
    xScale,
    yScale,
    xAccessor,
    yAccessor,
    axesData,
    annotatedSettings
  } = state

  let screenCoordinates: number[] | number[][] = []
  const idAccessor = annotatedSettings.lineIDAccessor

  if (baseD.type === "highlight") {
    return svgHighlight({
      d: baseD,
      i,
      idAccessor,
      lines,
      summaries,
      points,
      xScale,
      yScale,
      xyFrameRender,
      defined
    })
  }

  const d: AnnotationType = baseD.coordinates
    ? baseD
    : findPointByID({
        point: baseD,
        idAccessor,
        lines,
        xScale,
        projectedX,
        xAccessor
      })

  if (!d) return null

  const margin = calculateMargin({
    margin: baseMargin,
    axes: axesData,
    title: annotatedSettings.title,
    size: size
  })
  const { adjustedPosition, adjustedSize } = adjustedPositionSize({
    size: size,
    margin
  })

  if (!d.coordinates && !d.bounds) {
    screenCoordinates = [
      relativeX({
        point: d,
        projectedXMiddle,
        projectedX,
        xAccessor,
        xScale
      }) || 0,
      relativeY({
        point: d,
        projectedYMiddle,
        projectedY,
        yAccessor,
        yScale,
        showLinePoints
      }) || 0
    ]
  } else if (!d.bounds) {
    screenCoordinates = d.coordinates.reduce(
      (coords: number[], p: AnnotationType | ProjectedPoint) => {
        const xCoordinate = relativeX({
          point: p,
          projectedXMiddle,
          projectedX,
          xAccessor,
          xScale
        })

        const yCoordinate = relativeY({
          point: p,
          projectedYMiddle,
          projectedY,
          yAccessor,
          yScale
        })
        if (Array.isArray(yCoordinate)) {
          return [
            ...coords,
            [xCoordinate, Math.min(...yCoordinate)],
            [xCoordinate, Math.max(...yCoordinate)]
          ]
        } else if (Array.isArray(xCoordinate)) {
          return [
            ...coords,
            [Math.min(...xCoordinate), yCoordinate],
            [Math.max(...xCoordinate), yCoordinate]
          ]
        } else {
          return [...coords, [xCoordinate, yCoordinate]]
        }
      },
      [] as number[]
    ) as number[]
  }

  const { voronoiHover } = annotationLayer

  const customSVG =
    svgAnnotationRules &&
    svgAnnotationRules({
      d,
      i,
      screenCoordinates,
      xScale,
      yScale,
      xAccessor,
      yAccessor,
      xyFrameProps: props,
      xyFrameState: state,
      summaries,
      points,
      lines,
      voronoiHover,
      adjustedPosition,
      adjustedSize,
      annotationLayer
    })
  if (svgAnnotationRules !== undefined && customSVG !== null) {
    return customSVG
  } else if (d.type === "desaturation-layer") {
    return desaturationLayer({
      style: d.style instanceof Function ? d.style(d, i) : d.style,
      size: adjustedSize,
      i,
      key: d.key
    })
  } else if (d.type === "xy" || d.type === "frame-hover") {
    return svgXYAnnotation({ d, i, screenCoordinates })
  } else if (d.type === "react-annotation" || typeof d.type === "function") {
    return basicReactAnnotation({ d, screenCoordinates, i })
  } else if (d.type === "enclose") {
    return svgEncloseAnnotation({ d, screenCoordinates, i })
  } else if (d.type === "enclose-rect") {
    return svgRectEncloseAnnotation({ d, screenCoordinates, i })
  } else if (d.type === "enclose-hull") {
    return svgHullEncloseAnnotation({ d, screenCoordinates, i })
  } else if (d.type === "x") {
    return svgXAnnotation({
      d,
      screenCoordinates,
      i,
      adjustedSize
    })
  } else if (d.type === "y") {
    return svgYAnnotation({
      d,
      screenCoordinates,
      i,
      adjustedSize,
      adjustedPosition
    })
  } else if (d.type === "bounds") {
    return svgBoundsAnnotation({
      d,
      i,
      adjustedSize,
      xAccessor,
      yAccessor,
      xScale,
      yScale
    })
  } else if (d.type === "line") {
    return svgLineAnnotation({ d, i, screenCoordinates })
  } else if (d.type === "area") {
    return svgAreaAnnotation({
      d,
      i,
      xScale,
      xAccessor,
      yScale,
      yAccessor,
      annotationLayer
    })
  } else if (d.type === "horizontal-points") {
    return svgHorizontalPointsAnnotation({
      d,
      lines: lines.data,
      points: points.data,
      xScale,
      yScale,
      pointStyle: points.styleFn
    })
  } else if (d.type === "vertical-points") {
    return svgVerticalPointsAnnotation({
      d,
      lines: lines.data,
      points: points.data,
      xScale,
      yScale,
      pointStyle: points.styleFn
    })
  }
  return null
}

function defaultXYHTMLRule(
  props: XYFrameProps,
  state: XYFrameState,
  {
    d: baseD,
    i,
    lines,
    summaries,
    points,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: UpdatedAnnotationLayerProps
    lines: { data: ProjectedLine[] }
    summaries: { data: ProjectedSummary[] }
    points: {
      data: ProjectedPoint[]
      styleFn: (args?: GenericObject, index?: number) => GenericObject
    }
  }
) {
  const {
    xAccessor,
    yAccessor,
    xScale,
    yScale,
    SpanOrDiv,
    annotatedSettings,
    axesData
  } = state

  const { voronoiHover } = annotationLayer

  let screenCoordinates = []

  const {
    useSpans,
    tooltipContent,
    optimizeCustomTooltipPosition,
    htmlAnnotationRules,
    size,
    showLinePoints,
    margin: baseMargin
  } = props

  const idAccessor = annotatedSettings.lineIDAccessor
  const d: AnnotationType = findPointByID({
    point: baseD,
    idAccessor,
    lines,
    xScale,
    projectedX,
    xAccessor
  })

  if (!d) {
    return null
  }

  const xCoord =
    d[projectedXMiddle] || d[projectedX] || findFirstAccessorValue(xAccessor, d)
  const yCoord =
    d[projectedYMiddle] || d[projectedY] || findFirstAccessorValue(yAccessor, d)

  const xString = xCoord && xCoord.toString ? xCoord.toString() : xCoord
  const yString = yCoord && yCoord.toString ? yCoord.toString() : yCoord

  const margin = calculateMargin({
    margin: baseMargin,
    axes: axesData,
    title: annotatedSettings.title,
    size: size
  })
  const { adjustedPosition, adjustedSize } = adjustedPositionSize({
    size,
    margin
  })
  if (!d.coordinates) {
    screenCoordinates = [
      xScale(xCoord) || 0,
      relativeY({
        point: d,
        projectedYMiddle,
        projectedY,
        showLinePoints,
        yAccessor,
        yScale
      }) || 0
    ]
  } else {
    screenCoordinates = d.coordinates.map((p) => {
      const foundP = findPointByID({
        point: { x: 0, y: 0, ...p },
        idAccessor,
        lines,
        xScale,
        projectedX,
        xAccessor
      })
      return [
        (xScale(findFirstAccessorValue(xAccessor, d)) || 0) +
          adjustedPosition[0],
        (relativeY({
          point: foundP,
          projectedYMiddle,
          projectedY,
          yAccessor,
          yScale
        }) || 0) + adjustedPosition[1]
      ]
    })
  }

  const customAnnotation =
    htmlAnnotationRules &&
    htmlAnnotationRules({
      d,
      i,
      screenCoordinates,
      xScale,
      yScale,
      xAccessor,
      yAccessor,
      xyFrameProps: props,
      xyFrameState: state,
      summaries,
      points,
      lines,
      voronoiHover,
      adjustedPosition,
      adjustedSize,
      annotationLayer
    })

  if (htmlAnnotationRules && customAnnotation !== null) {
    return customAnnotation
  }
  if (d.type === "frame-hover") {
    let content = (
      <SpanOrDiv span={useSpans} className="tooltip-content">
        <p key="html-annotation-content-1">{xString}</p>
        <p key="html-annotation-content-2">{yString}</p>
        {d.percent ? (
          <p key="html-annotation-content-3">
            {Math.floor(d.percent * 1000) / 10}%
          </p>
        ) : null}
      </SpanOrDiv>
    )

    if (d.type === "frame-hover" && tooltipContent) {
      content = optimizeCustomTooltipPosition ? (
        <TooltipPositioner
          tooltipContent={tooltipContent}
          tooltipContentArgs={d}
        />
      ) : (
        tooltipContent(d)
      )
    }
    return htmlTooltipAnnotation({
      content,
      screenCoordinates,
      i,
      d,
      useSpans
    })
  }
  return null
}

XYFrame.displayName = "XYFrame"
export default XYFrame
