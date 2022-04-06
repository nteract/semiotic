import * as React from "react"
import { useMemo } from "react"

import Frame from "./Frame"

import { stringToFn } from "./data/dataFunctions"

import { networkFrameChangeProps } from "./constants/frame_props"

import {
  htmlFrameHoverRule,
  svgNodeRule,
  svgReactAnnotationRule,
  svgEncloseRule,
  svgRectEncloseRule,
  svgHullEncloseRule,
  svgHighlightRule
} from "./annotationRules/networkframeRules"

import { desaturationLayer } from "./annotationRules/baseRules"

import { genericFunction } from "./generic_utilities/functions"

import { AnnotationType } from "./types/annotationTypes"

import { scaleLinear } from "d3-scale"

import { calculateNetworkFrame } from "./processing/network"

const blankArray = []

const matrixRenderOrder: ReadonlyArray<"nodes" | "edges"> = ["nodes", "edges"]
const generalRenderOrder: ReadonlyArray<"nodes" | "edges"> = ["edges", "nodes"]

const projectedCoordinateNames = { y: "y", x: "x" }

const xScale = scaleLinear()
const yScale = scaleLinear()

import { GenericObject } from "./types/generalTypes"

import {
  NodeType,
  NetworkFrameProps,
  NetworkFrameState
} from "./types/networkTypes"
import { AnnotationLayerProps } from "./AnnotationLayer"
import { useDerivedStateFromProps } from "./useDerivedStateFromProps"
import { useLegacyUnmountCallback } from "./useLegacyUnmountCallback"

const defaultProps = {
  annotations: [],
  foregroundGraphics: [],
  size: [500, 500],
  className: "",
  name: "networkframe",
  networkType: { type: "force", iterations: 500 },
  filterRenderedNodes: (d: NodeType) => d.id !== "root-generated"
}

const NetworkFrame = React.memo(function NetworkFrame(
  allProps: NetworkFrameProps
) {
  const props: NetworkFrameProps = { ...defaultProps, ...allProps }
  const baseState = {
    dataVersion: undefined,
    nodeData: [],
    edgeData: [],
    adjustedPosition: [],
    adjustedSize: [],
    backgroundGraphics: null,
    foregroundGraphics: null,
    projectedNodes: [],
    projectedEdges: [],
    renderNumber: 0,
    nodeLabelAnnotations: [],
    graphSettings: {
      type: "empty-start",
      nodes: [],
      edges: [],
      nodeHash: new Map(),
      edgeHash: new Map(),
      hierarchicalNetwork: false
    },
    edgeWidthAccessor: stringToFn<number>("weight"),
    legendSettings: undefined,
    margin: { top: 0, left: 0, right: 0, bottom: 0 },
    networkFrameRender: {},
    nodeIDAccessor: stringToFn<string>("id"),
    nodeSizeAccessor: genericFunction(5),
    overlay: [],
    projectedXYPoints: [],
    sourceAccessor: stringToFn<string | GenericObject>("source"),
    targetAccessor: stringToFn<string | GenericObject>("target"),
    title: { title: undefined },
    props
  }

  const initialState = useMemo(
    () => ({
      ...baseState,
      ...calculateNetworkFrame(props, baseState)
    }),
    []
  )

  const state = useDerivedStateFromProps(
    deriveNetworkFrameState,
    props,
    initialState
  )

  useLegacyUnmountCallback(props, state)

  const {
    annotations = [],
    annotationSettings,
    className,
    customClickBehavior,
    customDoubleClickBehavior,
    customHoverBehavior,
    size,
    matte,
    hoverAnnotation,
    beforeElements,
    afterElements,
    interaction,
    disableContext,
    canvasPostProcess,
    baseMarkProps,
    useSpans,
    canvasNodes,
    canvasEdges,
    additionalDefs,
    renderOrder = state.graphSettings && state.graphSettings.type === "matrix"
      ? matrixRenderOrder
      : generalRenderOrder,
    sketchyRenderingEngine,
    frameRenderOrder,
    disableCanvasInteraction,
    interactionSettings,
    disableProgressiveRendering
  } = props
  const {
    backgroundGraphics,
    foregroundGraphics,
    projectedXYPoints,
    margin,
    legendSettings,
    adjustedPosition,
    adjustedSize,
    networkFrameRender,
    nodeLabelAnnotations,
    overlay,
    title
  } = state

  let formattedOverlay

  if (overlay && overlay.length > 0) {
    formattedOverlay = overlay
  }

  let activeHoverAnnotation
  if (Array.isArray(hoverAnnotation)) {
    activeHoverAnnotation = hoverAnnotation
  } else if (
    customClickBehavior ||
    customDoubleClickBehavior ||
    customHoverBehavior
  ) {
    activeHoverAnnotation = blankArray
  } else {
    activeHoverAnnotation = !!hoverAnnotation
  }

  return (
    <Frame
      name="networkframe"
      renderPipeline={networkFrameRender}
      adjustedPosition={adjustedPosition}
      adjustedSize={adjustedSize}
      size={size}
      xScale={xScale}
      yScale={yScale}
      title={title}
      matte={matte}
      className={className}
      additionalDefs={additionalDefs}
      frameKey={"none"}
      projectedCoordinateNames={projectedCoordinateNames}
      defaultSVGRule={(args) => defaultNetworkSVGRule(props, state, args)}
      defaultHTMLRule={(args) => defaultNetworkHTMLRule(props, state, args)}
      hoverAnnotation={activeHoverAnnotation}
      annotations={[...annotations, ...nodeLabelAnnotations]}
      annotationSettings={annotationSettings}
      legendSettings={legendSettings}
      interaction={interaction}
      customClickBehavior={customClickBehavior}
      customHoverBehavior={customHoverBehavior}
      customDoubleClickBehavior={customDoubleClickBehavior}
      points={projectedXYPoints}
      margin={margin}
      overlay={formattedOverlay}
      backgroundGraphics={backgroundGraphics}
      foregroundGraphics={foregroundGraphics}
      beforeElements={beforeElements}
      afterElements={afterElements}
      disableContext={disableContext}
      canvasPostProcess={canvasPostProcess}
      baseMarkProps={baseMarkProps}
      useSpans={!!useSpans}
      canvasRendering={!!(canvasNodes || canvasEdges)}
      renderOrder={renderOrder}
      disableCanvasInteraction={disableCanvasInteraction}
      sketchyRenderingEngine={sketchyRenderingEngine}
      frameRenderOrder={frameRenderOrder}
      interactionSettings={interactionSettings}
      disableProgressiveRendering={disableProgressiveRendering}
    />
  )
})

function deriveNetworkFrameState(
  nextProps: NetworkFrameProps,
  prevState: NetworkFrameState
) {
  const { props } = prevState
  if (
    (prevState.dataVersion &&
      prevState.dataVersion !== nextProps.dataVersion) ||
    (!prevState.projectedNodes && !prevState.projectedEdges) ||
    props.size[0] !== nextProps.size[0] ||
    props.size[1] !== nextProps.size[1] ||
    (!prevState.dataVersion &&
      networkFrameChangeProps.find((d) => {
        return props[d] !== nextProps[d]
      }))
  ) {
    return {
      ...calculateNetworkFrame(nextProps, prevState),
      props: nextProps
    }
  }
  return { props: nextProps }
}

function defaultNetworkSVGRule(
  props: NetworkFrameProps,
  state: NetworkFrameState,
  {
    d: baseD,
    i,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: AnnotationLayerProps
  }
) {
  const {
    projectedNodes,
    projectedEdges,
    nodeIDAccessor,
    nodeSizeAccessor,
    networkFrameRender,
    adjustedSize,
    adjustedPosition
  } = state
  //TODO PASS FRAME STYLE FNs TO HIGHLIGHT
  const { svgAnnotationRules } = props

  const d = baseD.ids
    ? baseD
    : baseD.edge
    ? {
        ...(projectedEdges.find((p) => {
          return (
            nodeIDAccessor(p.source) === nodeIDAccessor(baseD.edge.source) &&
            nodeIDAccessor(p.target) === nodeIDAccessor(baseD.edge.target)
          )
        }) || {}),
        ...baseD
      }
    : {
        ...(projectedNodes.find((p) => nodeIDAccessor(p) === baseD.id) || {}),
        ...baseD
      }

  const { voronoiHover } = annotationLayer

  if (svgAnnotationRules) {
    const customAnnotation = svgAnnotationRules({
      d,
      i,
      networkFrameProps: props,
      networkFrameState: state,
      nodes: projectedNodes,
      edges: projectedEdges,
      voronoiHover,
      screenCoordinates: [d.x, d.y],
      adjustedPosition,
      adjustedSize,
      annotationLayer
    })
    if (customAnnotation !== null) {
      return customAnnotation
    }
  }
  if (d.type === "node") {
    return svgNodeRule({
      d,
      i,
      nodeSizeAccessor
    })
  } else if (d.type === "desaturation-layer") {
    return desaturationLayer({
      style: d.style instanceof Function ? d.style(d, i) : d.style,
      size: adjustedSize,
      i,
      key: d.key
    })
  } else if (d.type === "basic-node-label") {
    return (
      <g key={d.key || `basic-${i}`} transform={`translate(${d.x},${d.y})`}>
        {baseD.element || baseD.label}
      </g>
    )
  } else if (d.type === "react-annotation" || typeof d.type === "function") {
    return svgReactAnnotationRule({
      d,
      i,
      projectedNodes,
      nodeIDAccessor
    })
  } else if (d.type === "enclose") {
    return svgEncloseRule({
      d,
      i,
      projectedNodes,
      nodeIDAccessor,
      nodeSizeAccessor
    })
  } else if (d.type === "enclose-rect") {
    return svgRectEncloseRule({
      d,
      i,
      projectedNodes,
      nodeIDAccessor,
      nodeSizeAccessor
    })
  } else if (d.type === "enclose-hull") {
    return svgHullEncloseRule({
      d,
      i,
      projectedNodes,
      nodeIDAccessor,
      nodeSizeAccessor
    })
  } else if (d.type === "highlight") {
    return svgHighlightRule({
      d,
      i,
      networkFrameRender
    })
  }
  return null
}

function defaultNetworkHTMLRule(
  props: NetworkFrameProps,
  state: NetworkFrameState,
  {
    d: baseD,
    i,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: AnnotationLayerProps
  }
) {
  const {
    tooltipContent,
    optimizeCustomTooltipPosition,
    htmlAnnotationRules,
    useSpans
  } = props
  const {
    projectedNodes,
    projectedEdges,
    nodeIDAccessor,
    adjustedSize,
    adjustedPosition
  } = state

  const { voronoiHover } = annotationLayer

  const d = baseD.ids
    ? baseD
    : baseD.edge
    ? {
        ...(projectedEdges.find(
          (p) =>
            nodeIDAccessor(p.source) === nodeIDAccessor(baseD.source) &&
            nodeIDAccessor(p.target) === nodeIDAccessor(baseD.target)
        ) || {}),
        ...baseD
      }
    : {
        ...(projectedNodes.find((p) => nodeIDAccessor(p) === baseD.id) || {}),
        ...baseD
      }

  if (htmlAnnotationRules) {
    const customAnnotation = htmlAnnotationRules({
      d,
      i,
      networkFrameProps: props,
      networkFrameState: state,
      nodes: projectedNodes,
      edges: projectedEdges,
      voronoiHover,
      screenCoordinates: [d.x, d.y],
      adjustedPosition,
      adjustedSize,
      annotationLayer
    })
    if (customAnnotation !== null) {
      return customAnnotation
    }
  }
  if (d.type === "frame-hover") {
    return htmlFrameHoverRule({
      d,
      i,
      tooltipContent,
      optimizeCustomTooltipPosition,
      useSpans,
      nodes: projectedNodes,
      edges: projectedEdges,
      nodeIDAccessor
    })
  }
  return null
}

NetworkFrame.displayName = "NetworkFrame"
export default NetworkFrame
