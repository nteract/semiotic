import * as React from "react"

import Frame from "./Frame"

import { stringToFn } from "./data/dataFunctions"

import {
  networkFrameChangeProps,
  xyframeproptypes,
  ordinalframeproptypes,
  networkframeproptypes
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

class NetworkFrame extends React.Component<
  NetworkFrameProps,
  NetworkFrameState
  > {
  static defaultProps = {
    annotations: [],
    foregroundGraphics: [],
    annotationSettings: {},
    size: [500, 500],
    className: "",
    name: "networkframe",
    networkType: { type: "force", iterations: 500 },
    filterRenderedNodes: (d: NodeType) => d.id !== "root-generated"
  }

  static displayName = "NetworkFrame"

  constructor(props: NetworkFrameProps) {
    super(props)

    Object.keys(props).forEach(propName => {
      if (!networkframeproptypes[propName]) {
        if (xyframeproptypes[propName]) {
          console.error(
            `${propName} is an XYFrame prop are you sure you're using the right frame?`
          )
        } else if (ordinalframeproptypes[propName]) {
          console.error(
            `${propName} is an OrdinalFrame prop are you sure you're using the right frame?`
          )
        } else {
          console.error(`${propName} is not a valid NetworkFrame prop`)
        }
      }
    })

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
      legendSettings: {},
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
    this.state = {
      ...baseState,
      ...calculateNetworkFrame(props, baseState)
    }
  }

  componentWillUnmount() {
    const { onUnmount } = this.props
    if (onUnmount) {
      onUnmount(this.props, this.state)
    }
  }

  static getDerivedStateFromProps(nextProps: NetworkFrameProps, prevState: NetworkFrameState) {
    const { props } = prevState
    if ((
      (prevState.dataVersion &&
        prevState.dataVersion !== nextProps.dataVersion) ||
      (!prevState.projectedNodes && !prevState.projectedEdges)
    ) || (
        props.size[0] !== nextProps.size[0] ||
        props.size[1] !== nextProps.size[1] ||
        (!prevState.dataVersion &&
          networkFrameChangeProps.find(d => {
            return props[d] !== nextProps[d]
          }))
      )) {
      return { ...calculateNetworkFrame(nextProps, prevState), props: nextProps }
    }
    return { props: nextProps }
  }

  onNodeClick(d: Object, i: number) {
    const { onNodeClick } = this.props
    if (onNodeClick) {
      onNodeClick(d, i)
    }
  }

  onNodeEnter(d: Object, i: number) {
    const { onNodeEnter } = this.props
    if (onNodeEnter) {
      onNodeEnter(d, i)
    }
  }

  onNodeOut(d: Object, i: number) {
    const { onNodeOut } = this.props
    if (onNodeOut) {
      onNodeOut(d, i)
    }
  }

  defaultNetworkSVGRule = ({
    d: baseD,
    i,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: AnnotationLayerProps
  }) => {
    const {
      projectedNodes,
      projectedEdges,
      nodeIDAccessor,
      nodeSizeAccessor,
      networkFrameRender,
      adjustedSize,
      adjustedPosition
    } = this.state
    //TODO PASS FRAME STYLE FNs TO HIGHLIGHT
    const { svgAnnotationRules } = this.props

    const d = baseD.ids
      ? baseD
      : baseD.edge
        ? {
          ...(projectedEdges.find(
            p =>
              nodeIDAccessor(p.source) === nodeIDAccessor(baseD.source) &&
              nodeIDAccessor(p.target) === nodeIDAccessor(baseD.target)
          ) || {}),
          ...baseD
        }
        : {
          ...(projectedNodes.find(p => nodeIDAccessor(p) === baseD.id) || {}),
          ...baseD
        }

    const { voronoiHover } = annotationLayer

    if (svgAnnotationRules) {
      const customAnnotation = svgAnnotationRules({
        d,
        i,
        networkFrameProps: this.props,
        networkFrameState: this.state,
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

  defaultNetworkHTMLRule = ({
    d: baseD,
    i,
    annotationLayer
  }: {
    d: AnnotationType
    i: number
    annotationLayer: AnnotationLayerProps
  }) => {
    const {
      tooltipContent,
      optimizeCustomTooltipPosition,
      htmlAnnotationRules,
      useSpans
    } = this.props
    const {
      projectedNodes,
      projectedEdges,
      nodeIDAccessor,
      adjustedSize,
      adjustedPosition
    } = this.state

    const { voronoiHover } = annotationLayer

    const d = baseD.ids
      ? baseD
      : baseD.edge
        ? {
          ...(projectedEdges.find(
            p =>
              nodeIDAccessor(p.source) === nodeIDAccessor(baseD.source) &&
              nodeIDAccessor(p.target) === nodeIDAccessor(baseD.target)
          ) || {}),
          ...baseD
        }
        : {
          ...(projectedNodes.find(p => nodeIDAccessor(p) === baseD.id) || {}),
          ...baseD
        }

    if (htmlAnnotationRules) {
      const customAnnotation = htmlAnnotationRules({
        d,
        i,
        networkFrameProps: this.props,
        networkFrameState: this.state,
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

  render() {
    const {
      annotations,
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
      renderOrder = this.state.graphSettings &&
        this.state.graphSettings.type === "matrix"
        ? matrixRenderOrder
        : generalRenderOrder,
      sketchyRenderingEngine
    } = this.props
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
    } = this.state

    let formattedOverlay

    if (overlay && overlay.length > 0) {
      formattedOverlay = overlay
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
        defaultSVGRule={this.defaultNetworkSVGRule}
        defaultHTMLRule={this.defaultNetworkHTMLRule}
        hoverAnnotation={
          Array.isArray(hoverAnnotation) ? hoverAnnotation : !!hoverAnnotation
        }
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
        disableCanvasInteraction={true}
        sketchyRenderingEngine={sketchyRenderingEngine}
      />
    )
  }
}

export default NetworkFrame
