import * as React from "react"
import { RefObject, useEffect, useState } from "react"

import {
  MarginType,
  RenderPipelineType,
  VizLayerTypes,
  RoughType
} from "./types/generalTypes"

import { ContextType } from "./types/canvasTypes"
import { batchWork } from "./batchWork"

type Props = {
  axes?: Array<React.ReactNode>
  frameKey?: string
  xScale: Function
  yScale: Function
  dataVersion?: string
  canvasContext?: RefObject<ContextType>
  width: number
  height: number
  margin: MarginType
  canvasPostProcess?: Function
  title?: JSX.Element | string
  ariaTitle?: string
  matte?: React.ReactNode
  matteClip?: boolean
  voronoiHover: Function
  renderPipeline: RenderPipelineType
  baseMarkProps?: object
  projectedCoordinateNames: object
  position: Array<number>
  disableContext?: boolean
  renderOrder: ReadonlyArray<VizLayerTypes>
  sketchyRenderingEngine?: RoughType
  axesTickLines?: React.ReactNode
  frameRenderOrder: Array<string>
  additionalVizElements: object
  disableProgressiveRendering?: boolean
}

type State = {
  canvasDrawing: Array<{
    tx: number
    ty: number
    i: number
    d: { data: object }
    styleFn: Function
    markProps: {
      renderMode?: object
      markType: string
      width: number
      height: number
      x: number
      y: number
      r: number
      rx: number
      d: string
    }
    renderFn?: Function
  }>
  dataVersion?: string
  renderedElements: Array<React.ReactNode>
  focusedPieceIndex: number | null
  focusedVisualizationGroup?: string
  piecesGroup: object
  props: Props
  handleKeyDown: Function
}

const updateVisualizationLayer = (props: Props, handleKeyDown: Function) => {
  const {
    xScale,
    yScale,
    dataVersion,
    projectedCoordinateNames,
    renderPipeline = {},
    baseMarkProps = {},
    renderOrder = [],
    sketchyRenderingEngine
  } = props

  const canvasDrawing = []

  const piecesGroup = {}

  const renderedElements = []
  const renderVizKeys: Array<VizLayerTypes> = Object.keys(
    renderPipeline
  ) as VizLayerTypes[]
  const renderKeys = renderOrder.concat(
    renderVizKeys.filter((d) => renderOrder.indexOf(d) === -1)
  )

  renderKeys.forEach((k) => {
    const pipe = renderPipeline[k]
    if (
      pipe &&
      ((pipe.data &&
        typeof pipe.data === "object" &&
        !Array.isArray(pipe.data)) ||
        (pipe.data && pipe.data.length > 0))
    ) {
      const additionalMarkProps = {
        sketchyGenerator:
          sketchyRenderingEngine && sketchyRenderingEngine.generator,
        "aria-label":
          (pipe.ariaLabel && pipe.ariaLabel.items) || "dataviz-element",
        role: "img",
        tabIndex: -1
      }

      const renderedPipe = pipe.behavior({
        xScale,
        yScale,
        canvasDrawing,
        projectedCoordinateNames,
        baseMarkProps: { ...baseMarkProps, ...additionalMarkProps },
        ...pipe
      })

      if (renderedPipe && renderedPipe.length > 0) {
        renderedElements.push(
          <g
            key={k}
            className={k}
            role={"group"}
            tabIndex={0}
            aria-label={
              (pipe.ariaLabel &&
                `${renderedPipe.length} ${pipe.ariaLabel.items}s in a ${pipe.ariaLabel.chart}`) ||
              k
            }
            onKeyDown={(e) => handleKeyDown({ e, k, props, piecesGroup })}
            onBlur={() => {
              props.voronoiHover(undefined)
            }}
            ref={(thisNode) =>
              thisNode && (piecesGroup[k] = thisNode.childNodes)
            }
          >
            {renderedPipe}
          </g>
        )
      }
    }
  })

  return {
    renderedElements,
    dataVersion,
    canvasDrawing,
    piecesGroup
  }
}

const handleKeyDown =
  ({
    focusedPieceIndex,
    changeFocusedPieceIndex,
    changeFocusedVisualizationGroup
  }) =>
  ({ e: { keyCode }, vizgroup, props, piecesGroup }) => {
    // If enter, focus on the first element

    const { renderPipeline, voronoiHover } = props
    const pushed = keyCode
    if (pushed !== 37 && pushed !== 39 && pushed !== 13) return

    let newPieceIndex = 0
    const vizGroupSetting: { focusedVisualizationGroup?: string } = {}

    // If a user pressed enter, highlight the first one
    // Let a user move up and down in stacked bar by getting keys of bars?
    if (focusedPieceIndex === null || pushed === 13) {
      vizGroupSetting.focusedVisualizationGroup = vizgroup
    } else if (pushed === 37) {
      newPieceIndex = focusedPieceIndex - 1
    } else if (pushed === 39) {
      newPieceIndex = focusedPieceIndex + 1
    }

    newPieceIndex =
      newPieceIndex < 0
        ? piecesGroup[vizgroup].length + newPieceIndex
        : newPieceIndex % piecesGroup[vizgroup].length

    const piece = renderPipeline[vizgroup].accessibleTransform(
      renderPipeline[vizgroup].data,
      newPieceIndex,
      piecesGroup[vizgroup][newPieceIndex]
    )

    voronoiHover(piece)

    changeFocusedPieceIndex(newPieceIndex)
    changeFocusedVisualizationGroup(vizGroupSetting.focusedVisualizationGroup)
  }

export default function VisualizationLayer(props: Props) {
  const {
    matte,
    matteClip,
    axes,
    frameKey = "",
    margin,
    title,
    ariaTitle,
    axesTickLines,
    frameRenderOrder,
    additionalVizElements
  } = props

  const [updateCtrl, setupdateCtrl] = useState(() => new AbortController())

  const [focusedPieceIndex, changeFocusedPieceIndex] = useState(null)
  const [focusedVisualizationGroup, changeFocusedVisualizationGroup] =
    useState(null)
  const decoratedKeydown = handleKeyDown({
    focusedPieceIndex,
    changeFocusedPieceIndex,
    changeFocusedVisualizationGroup
  })

  const vizState = updateVisualizationLayer(props, decoratedKeydown)

  const { renderedElements } = vizState

  useEffect(() => {
    const canvasContext = props.canvasContext.current

    if (props.disableContext || !canvasContext) return

    const {
      sketchyRenderingEngine,
      width,
      height,
      margin,
      disableProgressiveRendering = false
    } = props

    const size = [
      width + margin.left + margin.right,
      height + margin.top + margin.bottom
    ]

    let rc
    const devicePixelRatio = window.devicePixelRatio || 1

    canvasContext.width = size[0] * devicePixelRatio
    canvasContext.height = size[1] * devicePixelRatio
    canvasContext.style.width = size[0]
    canvasContext.style.height = size[1]

    const context = canvasContext.getContext("2d")

    context.scale(devicePixelRatio, devicePixelRatio)

    context.setTransform(1, 0, 0, 1, margin.left, margin.top)

    context.clearRect(-margin.left, -margin.top, size[0], size[1])

    const renderCanvasPiece = renderCanvas(
      canvasContext,
      context,
      margin,
      props,
      sketchyRenderingEngine,
      rc
    )

    context.clearRect(-margin.left, -margin.top, size[0], size[1])

    if (disableProgressiveRendering) {
      vizState.canvasDrawing.forEach((piece) => renderCanvasPiece(piece))
    } else {
      //     updateCtrl.abort()
      //      const newUpdateCtrol = new AbortController()
      //      setupdateCtrl(newUpdateCtrol)

      batchCollectionWork(renderCanvasPiece, vizState.canvasDrawing, {
        signal: updateCtrl.signal
      })
    }

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1

    if (props.canvasPostProcess) {
      props.canvasPostProcess(props.canvasContext, context, size)
    }

    if (
      focusedVisualizationGroup !== null &&
      vizState.piecesGroup[focusedVisualizationGroup] &&
      focusedPieceIndex !== null
    ) {
      const focusElParent =
        vizState.piecesGroup[focusedVisualizationGroup][focusedPieceIndex]

      const focusEl =
        (focusElParent &&
          [...focusElParent.childNodes].find((child) =>
            child.getAttribute("aria-label")
          )) ||
        focusElParent

      focusEl && focusEl.focus && focusEl.focus()
    }

    return function cleanup() {
      updateCtrl.abort()
    }
  }, [
    matte,
    matteClip,
    axes,
    frameKey,
    margin,
    ariaTitle,
    axesTickLines,
    frameRenderOrder,
    additionalVizElements
  ])

  const renderHash = {
    ["axes-tick-lines"]: axesTickLines && (
      <g
        key="visualization-tick-lines"
        className={"axis axis-tick-lines"}
        aria-hidden={true}
      >
        {axesTickLines}
      </g>
    ),
    ["axes-labels"]: axes && (
      <g key="visualization-axis-labels" className="axis axis-labels">
        {axes}
      </g>
    ),
    matte: matte,
    ["viz-layer"]:
      renderedElements && renderedElements.length > 0 ? renderedElements : null,
    ...additionalVizElements
  }

  let ariaLabel = ""

  const finalTitle =
    (title && ariaTitle) || title
      ? typeof title !== "string" &&
        title.props &&
        typeof title.props.children === "string"
        ? `titled ${title.props.children}`
        : "with a complex title"
      : "with no title"
  ariaLabel = `Visualization ${finalTitle}. Use arrow keys to navigate elements.`

  const orderedElements = []

  frameRenderOrder.forEach((r) => {
    if (renderHash[r]) {
      orderedElements.push(renderHash[r])
    }
  })

  const renderedDataVisualization =
    (orderedElements.length > 0 && (
      <g
        className="data-visualization"
        key="visualization-clip-path"
        aria-label={ariaLabel}
        role="group"
        clipPath={
          matteClip && matte ? `url(#matte-clip${frameKey})` : undefined
        }
        transform={`translate(${margin.left},${margin.top})`}
      >
        {orderedElements}
      </g>
    )) ||
    null

  return renderedDataVisualization
}

function renderCanvas(
  canvasContext,
  context,
  margin,
  np,
  sketchyRenderingEngine,
  rc
) {
  const defaultStyle = {
    fill: "black",
    stroke: "black",
    opacity: 1,
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeWidth: 1
  }

  return (piece) => {
    const combinedDatum = { ...piece.d, ...piece.d.data }
    const style = piece.styleFn
      ? piece.styleFn(combinedDatum, piece.i) || defaultStyle
      : defaultStyle

    const fill = style.fill ? style.fill : "black"
    const stroke = style.stroke ? style.stroke : "black"
    context.setTransform(1, 0, 0, 1, margin.left, margin.top)
    context.translate(np.position[0], np.position[1])
    context.translate(piece.tx, piece.ty)
    context.fillStyle = fill
    context.strokeStyle = stroke
    context.lineWidth = style.strokeWidth ? style.strokeWidth : 0

    let rcSettings = {}
    const renderObject =
      piece.markProps.renderMode ||
      (piece.renderFn && piece.renderFn(combinedDatum, piece.i))
    let actualRenderMode =
      (renderObject && renderObject.renderMode) || renderObject

    if (actualRenderMode) {
      if (!sketchyRenderingEngine) {
        console.error(
          "You cannot render sketchy graphics without specifying a Rough.js-like library as the sketchyRenderingEngine prop of your frame"
        )
        actualRenderMode = undefined
      } else {
        const RoughCanvas = sketchyRenderingEngine.canvas
        if (!RoughCanvas) {
          console.error(
            "The sketchyRenderingEngine you specify does not expose a prop `RoughCanvas` and so cannot render sketchy HTML5 Canvas graphics"
          )
        } else {
          rc = rc || RoughCanvas(canvasContext)
          const rcExtension =
            (typeof renderObject === "object" && renderObject) || {}
          rcSettings = {
            fill,
            stroke,
            strokeWidth: context.lineWidth,
            ...rcExtension
          }
        }
      }
    }

    if (
      piece.markProps.markType === "circle" ||
      (piece.markProps.markType === "rect" && piece.markProps.rx > 0)
    ) {
      let vizX = 0,
        vizY = 0,
        r = style.r || piece.markProps.r
      if (piece.markProps.width) {
        const halfWidth = piece.markProps.width / 2
        vizX = piece.markProps.x + halfWidth
        vizY = piece.markProps.y + halfWidth
        r = halfWidth
      }
      if (actualRenderMode === "sketchy") {
        if (context.globalAlpha !== 0) rc.circle(vizX, vizY, r, rcSettings)
      } else {
        context.beginPath()
        context.arc(vizX, vizY, r, 0, 2 * Math.PI)
        context.globalAlpha = style.fillOpacity || style.opacity || 1
        if (style.fill && style.fill !== "none" && context.globalAlpha !== 0)
          context.fill()
        context.globalAlpha = style.strokeOpacity || style.opacity || 1
        if (
          style.stroke &&
          style.stroke !== "none" &&
          context.globalAlpha !== 0
        )
          context.stroke()
      }
    } else if (piece.markProps.markType === "rect") {
      if (actualRenderMode === "sketchy") {
        context.globalAlpha = style.opacity || 1
        if (context.globalAlpha !== 0)
          rc.rectangle(
            piece.markProps.x,
            piece.markProps.y,
            piece.markProps.width,
            piece.markProps.height,
            rcSettings
          )
      } else {
        context.globalAlpha = style.fillOpacity || style.opacity || 1
        if (style.fill && style.fill !== "none" && context.globalAlpha !== 0)
          context.fillRect(
            piece.markProps.x,
            piece.markProps.y,
            piece.markProps.width,
            piece.markProps.height
          )
        context.globalAlpha = style.strokeOpacity || style.opacity || 1
        if (
          style.stroke &&
          style.stroke !== "none" &&
          context.globalAlpha !== 0
        )
          context.strokeRect(
            piece.markProps.x,
            piece.markProps.y,
            piece.markProps.width,
            piece.markProps.height
          )
      }
    } else if (piece.markProps.markType === "path") {
      if (actualRenderMode === "sketchy") {
        context.globalAlpha = style.opacity || 1
        rc.path(piece.markProps.d, rcSettings)
      } else {
        const p = new Path2D(piece.markProps.d)
        context.globalAlpha = style.strokeOpacity || style.opacity || 1
        if (
          style.stroke &&
          style.stroke !== "none" &&
          context.globalAlpha !== 0
        )
          context.stroke(p)
        context.globalAlpha = style.fillOpacity || style.opacity || 1
        if (style.fill && style.fill !== "none" && context.globalAlpha !== 0)
          context.fill(p)
      }
    } else {
      console.error("CURRENTLY UNSUPPORTED MARKTYPE FOR CANVAS RENDERING")
    }
  }
}

// using batchWork utility, this function iterates over a collection of data
// in batches of 1000 and invokes `process` function for each data point
function batchCollectionWork(process, data, options) {
  let pointer = 0
  let batchSize = 1000

  return batchWork(() => {
    let limit = Math.min(pointer + batchSize, data.length)
    for (let i = pointer; i < limit; i++) {
      process(data[i])
    }
    pointer = pointer + batchSize
    return data.length > pointer
  }, options)
}
