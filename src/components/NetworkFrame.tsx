"use client"
import * as React from "react"
import { useCallback, useMemo, useRef } from "react"

import Frame from "./Frame"

import { stringToFn } from "./data/dataFunctions"

import {
  networkFrameChangeProps,
  networkFrameDataAffectingProps,
  networkFrameScaleAffectingProps,
  networkFrameStylingProps
} from "./constants/frame_props"

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
import { createNetworkPipelineCache, NetworkPipelineCache } from "./data/networkPipelineCache"
import { allNetworkLayouts } from "./processing/layouts"

const blankArray = []

const matrixRenderOrder: ReadonlyArray<"nodes" | "edges"> = ["nodes", "edges"]
const generalRenderOrder: ReadonlyArray<"nodes" | "edges"> = ["edges", "nodes"]

const projectedCoordinateNames = { y: "y", x: "x" }

const xScale = scaleLinear()
const yScale = scaleLinear()


import {
  NodeType,
  NetworkFrameProps,
  NetworkFrameState
} from "./types/networkTypes"
import { UpdatedAnnotationLayerProps } from "./AnnotationLayer/AnnotationLayer"
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

export function NetworkFrameInner<TNode = Record<string, any>, TEdge = Record<string, any>>(
  allProps: NetworkFrameProps<TNode, TEdge>
) {
  const props: NetworkFrameProps<TNode, TEdge> = { ...defaultProps, ...allProps }
  const pipelineCacheRef = useRef(createNetworkPipelineCache())
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
    sourceAccessor: stringToFn<string | Record<string, any>>("source"),
    targetAccessor: stringToFn<string | Record<string, any>>("target"),
    title: { title: undefined },
    props: props as NetworkFrameProps
  }

  const initialState = useMemo(
    () => ({
      ...baseState,
      ...calculateNetworkFrame(props as NetworkFrameProps, baseState, pipelineCacheRef.current, (props as NetworkFrameProps)._layoutMap || allNetworkLayouts)
    } as NetworkFrameState),
    []
  )

  const state = useDerivedStateFromProps(
    (nextProps, prevState) => deriveNetworkFrameState(nextProps as NetworkFrameProps, prevState, pipelineCacheRef.current, (nextProps as NetworkFrameProps)._layoutMap || allNetworkLayouts),
    props as NetworkFrameProps,
    initialState
  )

  useLegacyUnmountCallback(props, state)

  const propsRef = useRef(props)
  propsRef.current = props
  const stateRef = useRef(state)
  stateRef.current = state

  const defaultSVGRuleCb = useCallback(
    (args) => defaultNetworkSVGRule(propsRef.current as NetworkFrameProps, stateRef.current, args),
    []
  )
  const defaultHTMLRuleCb = useCallback(
    (args) => defaultNetworkHTMLRule(propsRef.current as NetworkFrameProps, stateRef.current, args),
    []
  )

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
    disableProgressiveRendering,
    transition
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

  // Memoize overlay formatting
  const formattedOverlay = useMemo(
    () => (overlay && overlay.length > 0 ? overlay : undefined),
    [overlay]
  )

  // Memoize active hover annotation logic
  const activeHoverAnnotation = useMemo(() => {
    if (Array.isArray(hoverAnnotation)) {
      return hoverAnnotation
    } else if (
      (customClickBehavior ||
        customDoubleClickBehavior ||
        customHoverBehavior) &&
      (hoverAnnotation === undefined || hoverAnnotation === false)
    ) {
      return blankArray
    } else {
      return !!hoverAnnotation
    }
  }, [
    hoverAnnotation,
    customClickBehavior,
    customDoubleClickBehavior,
    customHoverBehavior
  ])

  // Memoize merged annotations to prevent unnecessary array creation
  const mergedAnnotations = useMemo(
    () => [...annotations, ...nodeLabelAnnotations],
    [annotations, nodeLabelAnnotations]
  )

  // Memoize canvas rendering flag
  const canvasRendering = useMemo(
    () => !!(canvasNodes || canvasEdges),
    [canvasNodes, canvasEdges]
  )

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
      defaultSVGRule={defaultSVGRuleCb}
      defaultHTMLRule={defaultHTMLRuleCb}
      hoverAnnotation={activeHoverAnnotation}
      annotations={mergedAnnotations}
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
      canvasRendering={canvasRendering}
      renderOrder={renderOrder}
      disableCanvasInteraction={disableCanvasInteraction}
      sketchyRenderingEngine={sketchyRenderingEngine}
      frameRenderOrder={frameRenderOrder}
      interactionSettings={interactionSettings}
      disableProgressiveRendering={disableProgressiveRendering}
      transition={transition}
    />
  )
}

function deriveNetworkFrameState(
  nextProps: NetworkFrameProps,
  prevState: NetworkFrameState,
  cache?: NetworkPipelineCache,
  layoutMap?: Record<string, any>
) {
  const { props } = prevState

  // Check which category of props changed
  const dataPropsChanged = !prevState.dataVersion && networkFrameDataAffectingProps.some(
    (prop) => props[prop] !== nextProps[prop]
  )

  const scalePropsChanged = !prevState.dataVersion && networkFrameScaleAffectingProps.some(
    (prop) => props[prop] !== nextProps[prop]
  )

  const sizeChanged = props.size[0] !== nextProps.size[0] || props.size[1] !== nextProps.size[1]

  // Force full recalc if dataVersion changed or no projected data exists
  if (
    (prevState.dataVersion && prevState.dataVersion !== nextProps.dataVersion) ||
    (!prevState.projectedNodes && !prevState.projectedEdges)
  ) {
    return {
      ...calculateNetworkFrame(nextProps, prevState, cache, layoutMap),
      props: nextProps
    }
  }

  // Full data recalculation needed if data-affecting props changed
  if (dataPropsChanged) {
    return {
      ...calculateNetworkFrame(nextProps, prevState, cache, layoutMap),
      props: nextProps
    }
  }

  // Scale/layout recalculation needed if size or scale-affecting props changed
  // Note: For network layouts (especially force), size changes might affect positioning
  if (sizeChanged || scalePropsChanged) {
    return {
      ...calculateNetworkFrame(nextProps, prevState, cache, layoutMap),
      props: nextProps
    }
  }

  // Only styling changed - no recalc needed, React will re-render with existing state
  return { props: nextProps }
}

const annotationTypeStrings = new Set([
  "label", "callout", "callout-circle", "callout-rect",
  "callout-custom", "xy-threshold", "bracket"
])

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
    annotationLayer: UpdatedAnnotationLayerProps
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
        {(baseD.element || baseD.label) as React.ReactNode}
      </g>
    )
  } else if (typeof d.type === "function" || annotationTypeStrings.has(d.type)) {
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
    annotationLayer: UpdatedAnnotationLayerProps
  }
) {
  const {
    tooltipContent,
    optimizeCustomTooltipPosition,
    htmlAnnotationRules
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
      nodes: projectedNodes,
      edges: projectedEdges,
      nodeIDAccessor
    })
  }
  return null
}

NetworkFrameInner.displayName = "NetworkFrame"
const NetworkFrame = React.memo(NetworkFrameInner) as typeof NetworkFrameInner
export default NetworkFrame
