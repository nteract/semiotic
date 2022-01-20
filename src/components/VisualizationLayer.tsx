import * as React from "react"
import { RefObject } from "react"

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
            onKeyDown={(e) => handleKeyDown(e, k)}
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

export default class VisualizationLayer extends React.PureComponent<
  Props,
  State
> {
  static defaultProps = {
    position: [0, 0],
    margin: { left: 0, top: 0, right: 0, bottom: 0 }
  }

  constructor(props: Props) {
    super(props)
    this.state = {
      canvasDrawing: [],
      dataVersion: "",
      renderedElements: [],
      focusedPieceIndex: null,
      focusedVisualizationGroup: null,
      piecesGroup: {},
      props,
      handleKeyDown: this.handleKeyDown,
      ...updateVisualizationLayer(props, this.handleKeyDown)
    }
  }

  updateCtrl = new AbortController()

  componentDidUpdate(lp: object) {
    const np = this.props
    const propKeys = Object.keys(np)

    let update = false
    propKeys.forEach((key) => {
      if (key !== "title" && lp[key] !== np[key]) {
        update = true
      }
    })

    const canvasContext = np.canvasContext.current
    if (update === false || np.disableContext || !canvasContext) return

    const {
      sketchyRenderingEngine,
      width,
      height,
      margin,
      disableProgressiveRendering = false
    } = np

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
      np,
      sketchyRenderingEngine,
      rc
    )

    context.clearRect(-margin.left, -margin.top, size[0], size[1])

    if (disableProgressiveRendering) {
      this.state.canvasDrawing.forEach((piece) => renderCanvasPiece(piece))
    } else {
      this.updateCtrl.abort()
      this.updateCtrl = new AbortController()

      batchCollectionWork(renderCanvasPiece, this.state.canvasDrawing, {
        signal: this.updateCtrl.signal
      })
    }

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1

    if (np.canvasPostProcess) {
      np.canvasPostProcess(np.canvasContext, context, size)
    }

    if (
      this.state.focusedVisualizationGroup !== null &&
      this.state.piecesGroup[this.state.focusedVisualizationGroup] &&
      this.state.focusedPieceIndex !== null
    ) {
      const focusElParent =
        this.state.piecesGroup[this.state.focusedVisualizationGroup][
          this.state.focusedPieceIndex
        ]

      const focusEl =
        (focusElParent &&
          [...focusElParent.childNodes].find((child) =>
            child.getAttribute("aria-label")
          )) ||
        focusElParent

      focusEl && focusEl.focus && focusEl.focus()
    }
  }

  componentWillUnmount() {
    this.updateCtrl.abort()
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const { props } = prevState
    const lp = props
    const propKeys = Object.keys(nextProps)

    let update = false
    propKeys.forEach((key) => {
      if (key !== "title" && lp[key] !== nextProps[key]) {
        update = true
      }
    })

    if (
      update ||
      (nextProps.dataVersion && nextProps.dataVersion !== prevState.dataVersion)
    ) {
      return {
        ...updateVisualizationLayer(nextProps, prevState.handleKeyDown),
        props: nextProps
      }
    }
    return null
  }

  handleKeyDown = (e: { keyCode }, vizgroup: string) => {
    // If enter, focus on the first element

    const { renderPipeline, voronoiHover } = this.props
    const pushed = e.keyCode
    if (pushed !== 37 && pushed !== 39 && pushed !== 13) return

    let newPieceIndex = 0
    const vizGroupSetting: { focusedVisualizationGroup?: string } = {}

    // If a user pressed enter, highlight the first one
    // Let a user move up and down in stacked bar by getting keys of bars?
    if (this.state.focusedPieceIndex === null || pushed === 13) {
      vizGroupSetting.focusedVisualizationGroup = vizgroup
    } else if (pushed === 37) {
      newPieceIndex = this.state.focusedPieceIndex - 1
    } else if (pushed === 39) {
      newPieceIndex = this.state.focusedPieceIndex + 1
    }

    newPieceIndex =
      newPieceIndex < 0
        ? this.state.piecesGroup[vizgroup].length + newPieceIndex
        : newPieceIndex % this.state.piecesGroup[vizgroup].length

    const piece = renderPipeline[vizgroup].accessibleTransform(
      renderPipeline[vizgroup].data,
      newPieceIndex,
      this.state.piecesGroup[vizgroup][newPieceIndex]
    )

    voronoiHover(piece)

    this.setState({
      focusedPieceIndex: newPieceIndex,
      ...vizGroupSetting
    })
  }

  render() {
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
    } = this.props
    const { renderedElements } = this.state

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
        renderedElements && renderedElements.length > 0
          ? renderedElements
          : null,
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
