import * as React from "react"
import * as ReactDOMServer from "react-dom/server"

import { scaleLinear } from "d3-scale"
import { scaleBand } from "d3-scale"

import { calculateXYFrame } from "../processing/xyDrawing"
import { createXYPipelineCache } from "../data/xyPipelineCache"

import { calculateOrdinalFrame } from "../processing/ordinal"
import { createOrdinalPipelineCache } from "../data/ordinalPipelineCache"

import { calculateNetworkFrame } from "../processing/network"
import { createNetworkPipelineCache } from "../data/networkPipelineCache"

import { generateFinalDefs } from "../constants/jsx"
import { generateFrameTitle } from "../svg/frameFunctions"

import { stringToFn, stringToArrayFn } from "../data/dataFunctions"
import { genericFunction } from "../generic_utilities/functions"

import {
  projectedX,
  projectedY,
  projectedYTop,
  projectedYMiddle,
  projectedYBottom,
  projectedXMiddle,
  projectedXTop,
  projectedXBottom
} from "../constants/coordinateNames"

import { XYFrameProps, XYFrameState } from "../types/xyTypes"
import { OrdinalFrameProps, OrdinalFrameState } from "../types/ordinalTypes"
import { NetworkFrameProps, NetworkFrameState } from "../types/networkTypes"
import { RenderPipelineType } from "../types/generalTypes"

type FrameType = "xy" | "ordinal" | "network"

const xyProjectedCoordinateNames = {
  y: projectedY,
  x: projectedX,
  yMiddle: projectedYMiddle,
  yTop: projectedYTop,
  yBottom: projectedYBottom,
  xMiddle: projectedXMiddle,
  xTop: projectedXTop,
  xBottom: projectedXBottom
}

const ordinalProjectedCoordinateNames = { y: "y", x: "x" }
const networkProjectedCoordinateNames = { y: "y", x: "x" }

const defaultFrameRenderOrder = [
  "axes-tick-lines",
  "viz-layer",
  "matte",
  "axes-labels",
  "labels"
]

function runVisualizationPipeline(
  renderPipeline: RenderPipelineType,
  renderOrder: ReadonlyArray<string>,
  xScale: Function,
  yScale: Function,
  projectedCoordinateNames: object
): React.ReactNode[] {
  const renderedElements: React.ReactNode[] = []
  const renderVizKeys = Object.keys(renderPipeline)
  const renderKeys = [
    ...renderOrder,
    ...renderVizKeys.filter((d) => renderOrder.indexOf(d) === -1)
  ]

  renderKeys.forEach((k) => {
    const pipe = renderPipeline[k]
    if (
      pipe &&
      ((pipe.data &&
        typeof pipe.data === "object" &&
        !Array.isArray(pipe.data)) ||
        (pipe.data && (pipe.data as any[]).length > 0))
    ) {
      const renderedPipe = pipe.behavior({
        xScale,
        yScale,
        canvasDrawing: [],
        projectedCoordinateNames,
        ...pipe
      })

      if (renderedPipe && renderedPipe.length > 0) {
        renderedElements.push(
          <g key={k} className={k} role="group">
            {renderedPipe}
          </g>
        )
      }
    }
  })
  return renderedElements
}

function buildXYBaseState(props: XYFrameProps): XYFrameState {
  return {
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
  } as XYFrameState
}

function buildOrdinalBaseState(props: OrdinalFrameProps): OrdinalFrameState {
  return {
    adjustedPosition: [],
    adjustedSize: [],
    backgroundGraphics: undefined,
    foregroundGraphics: undefined,
    axisData: undefined,
    renderNumber: 0,
    oLabels: { labels: [] },
    oAccessor: stringToArrayFn<string>("renderKey"),
    rAccessor: stringToArrayFn<number>("value"),
    oScale: scaleBand(),
    rScale: scaleLinear(),
    axes: undefined,
    calculatedOExtent: [],
    calculatedRExtent: [0, 1],
    columnOverlays: [],
    dataVersion: undefined,
    legendSettings: undefined,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    oExtent: [],
    oScaleType: scaleBand(),
    orFrameRender: {},
    pieceDataXY: [],
    pieceIDAccessor: stringToFn<string>("semioticPieceID"),
    projectedColumns: {},
    rExtent: [],
    rScaleType: scaleLinear(),
    summaryType: { type: "none" },
    title: {},
    type: { type: "none" },
    props
  } as OrdinalFrameState
}

function buildNetworkBaseState(props: NetworkFrameProps): NetworkFrameState {
  return {
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
    props
  } as NetworkFrameState
}

function renderXYFrame(props: XYFrameProps): string {
  const xyDefaultProps = {
    annotations: [],
    foregroundGraphics: undefined,
    size: [500, 500] as number[],
    className: "",
    lineType: "line",
    name: "xyframe",
    dataVersion: undefined
  }
  const mergedProps = { ...xyDefaultProps, ...props }
  const cache = createXYPipelineCache()
  const baseState = buildXYBaseState(mergedProps)

  const state = {
    ...baseState,
    ...calculateXYFrame(mergedProps, baseState, true, cache)
  } as XYFrameState

  const {
    margin,
    adjustedPosition,
    adjustedSize,
    xyFrameRender,
    xScale,
    yScale,
    axes,
    axesTickLines,
    annotatedSettings
  } = state

  const size = mergedProps.size || [500, 500]
  const renderOrder = mergedProps.renderOrder || []
  const frameRenderOrder = mergedProps.frameRenderOrder || defaultFrameRenderOrder

  const renderedElements = runVisualizationPipeline(
    xyFrameRender,
    renderOrder,
    xScale,
    yScale,
    xyProjectedCoordinateNames
  )

  return assembleAndRender({
    size,
    margin,
    renderedElements,
    axes,
    axesTickLines,
    title: annotatedSettings.title,
    frameRenderOrder,
    additionalDefs: mergedProps.additionalDefs,
    name: "xyframe",
    matte: mergedProps.matte,
    frameKey: mergedProps.frameKey || "static"
  })
}

function renderOrdinalFrame(props: OrdinalFrameProps): string {
  const ordinalDefaultProps: Partial<OrdinalFrameProps> = {
    annotations: [],
    foregroundGraphics: [],
    projection: "vertical",
    size: [500, 500],
    className: "",
    data: [],
    type: "none"
  }
  const mergedProps = { ...ordinalDefaultProps, ...props } as OrdinalFrameProps
  const cache = createOrdinalPipelineCache()
  const baseState = buildOrdinalBaseState(mergedProps)

  const state = {
    ...baseState,
    ...calculateOrdinalFrame(mergedProps, baseState, cache)
  } as OrdinalFrameState

  const {
    margin,
    adjustedSize,
    orFrameRender,
    axes,
    axesTickLines,
    title
  } = state

  const size = [
    adjustedSize[0] + margin.left + margin.right,
    adjustedSize[1] + margin.top + margin.bottom
  ]

  const oXScale = scaleLinear()
  const oYScale = scaleLinear()
  const renderOrder = mergedProps.renderOrder || []
  const frameRenderOrder = mergedProps.frameRenderOrder || defaultFrameRenderOrder

  const renderedElements = runVisualizationPipeline(
    orFrameRender,
    renderOrder,
    oXScale,
    oYScale,
    ordinalProjectedCoordinateNames
  )

  return assembleAndRender({
    size,
    margin,
    renderedElements,
    axes,
    axesTickLines,
    title,
    frameRenderOrder,
    additionalDefs: mergedProps.additionalDefs,
    name: "ordinalframe",
    matte: mergedProps.matte,
    frameKey: "static"
  })
}

function renderNetworkFrame(props: NetworkFrameProps): string {
  const networkDefaultProps = {
    annotations: [],
    foregroundGraphics: [],
    size: [500, 500] as number[],
    className: "",
    name: "networkframe",
    networkType: { type: "force", iterations: 500 }
  }
  const mergedProps = { ...networkDefaultProps, ...props }
  const cache = createNetworkPipelineCache()
  const baseState = buildNetworkBaseState(mergedProps)

  const state = {
    ...baseState,
    ...calculateNetworkFrame(mergedProps, baseState, cache)
  } as NetworkFrameState

  const {
    margin,
    networkFrameRender,
    title,
    graphSettings
  } = state

  const size = mergedProps.size || [500, 500]

  const nXScale = scaleLinear()
  const nYScale = scaleLinear()

  const matrixRenderOrder: ReadonlyArray<string> = ["nodes", "edges"]
  const generalRenderOrder: ReadonlyArray<string> = ["edges", "nodes"]
  const renderOrder = mergedProps.renderOrder ||
    (graphSettings && graphSettings.type === "matrix"
      ? matrixRenderOrder
      : generalRenderOrder)
  const frameRenderOrder = mergedProps.frameRenderOrder || defaultFrameRenderOrder

  const renderedElements = runVisualizationPipeline(
    networkFrameRender,
    renderOrder,
    nXScale,
    nYScale,
    networkProjectedCoordinateNames
  )

  return assembleAndRender({
    size,
    margin,
    renderedElements,
    title,
    frameRenderOrder,
    additionalDefs: mergedProps.additionalDefs,
    name: "networkframe",
    matte: mergedProps.matte,
    frameKey: "static"
  })
}

interface AssembleOptions {
  size: number[]
  margin: { top: number; bottom: number; left: number; right: number }
  renderedElements: React.ReactNode[]
  axes?: React.ReactNode[]
  axesTickLines?: React.ReactNode | Object[]
  title?: any
  frameRenderOrder: string[]
  additionalDefs?: React.ReactNode
  name: string
  matte?: any
  frameKey: string
}

function assembleAndRender({
  size,
  margin,
  renderedElements,
  axes,
  axesTickLines,
  title,
  frameRenderOrder,
  additionalDefs,
  name,
  matte,
  frameKey
}: AssembleOptions): string {
  const renderHash: Record<string, React.ReactNode> = {
    "axes-tick-lines": axesTickLines ? (
      <g
        key="visualization-tick-lines"
        className="axis axis-tick-lines"
        aria-hidden={true}
      >
        {axesTickLines as React.ReactNode}
      </g>
    ) : null,
    "axes-labels": axes ? (
      <g key="visualization-axis-labels" className="axis axis-labels">
        {axes}
      </g>
    ) : null,
    "viz-layer":
      renderedElements && renderedElements.length > 0
        ? renderedElements
        : null
  }

  const orderedElements: React.ReactNode[] = []
  frameRenderOrder.forEach((r) => {
    if (renderHash[r]) {
      orderedElements.push(renderHash[r])
    }
  })

  const generatedTitle = generateFrameTitle({
    title: title || { title: undefined },
    size
  })

  const { defs } = generateFinalDefs({
    matte: null,
    size,
    margin,
    frameKey,
    additionalDefs,
    name
  })

  const svgElement = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${name} frame`}
      width={size[0]}
      height={size[1]}
    >
      {defs}
      {orderedElements.length > 0 && (
        <g
          className="data-visualization"
          key="visualization-clip-path"
          role="group"
          transform={`translate(${margin.left},${margin.top})`}
        >
          {orderedElements}
        </g>
      )}
      {generatedTitle && <g className="frame-title">{generatedTitle}</g>}
    </svg>
  )

  return ReactDOMServer.renderToStaticMarkup(svgElement)
}

export function renderToStaticSVG(
  frameType: FrameType,
  props: XYFrameProps | OrdinalFrameProps | NetworkFrameProps
): string {
  switch (frameType) {
    case "xy":
      return renderXYFrame(props as XYFrameProps)
    case "ordinal":
      return renderOrdinalFrame(props as OrdinalFrameProps)
    case "network":
      return renderNetworkFrame(props as NetworkFrameProps)
    default:
      throw new Error(
        `Unknown frame type: ${frameType}. Must be "xy", "ordinal", or "network".`
      )
  }
}

export function renderXYToStaticSVG(props: XYFrameProps): string {
  return renderXYFrame(props)
}

export function renderOrdinalToStaticSVG(props: OrdinalFrameProps): string {
  return renderOrdinalFrame(props)
}

export function renderNetworkToStaticSVG(props: NetworkFrameProps): string {
  return renderNetworkFrame(props)
}
