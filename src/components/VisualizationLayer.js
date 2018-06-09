// @flow

import React from "react"

import { RoughCanvas } from "roughjs/lib/canvas"

import { chuckCloseCanvasTransform } from "./canvas/basicCanvasEffects"

import type { Node } from "react"

import type { AxisType } from "./types/annotationTypes"

type Props = {
  axes?: Array<AxisType>,
  frameKey?: string,
  xScale: Function,
  yScale: Function,
  dataVersion?: string,
  canvasContext?: Object | null,
  size: Array<number>,
  margin: Object,
  canvasPostProcess?: string | Function,
  title?: ?Object | string,
  ariaTitle?: string,
  matte?: Node,
  matteClip?: boolean,
  voronoiHover: Function,
  renderPipeline: Object,
  baseMarkProps?: Object,
  projectedCoordinateNames: Object,
  position: Array<number>,
  disableContext?: boolean
}

type State = {
  canvasDrawing: Array<Object>,
  dataVersion?: string,
  renderedElements: Array<Node>,
  focusedPieceIndex: number | null,
  focusedVisualizationGroup: string | null
}

class VisualizationLayer extends React.PureComponent<Props, State> {
  static defaultProps = {
    position: [0, 0],
    margin: { left: 0, top: 0, right: 0, bottom: 0 }
  }

  piecesGroup = {}
  canvasDrawing = []

  state = {
    canvasDrawing: [],
    dataVersion: "",
    renderedElements: [],
    focusedPieceIndex: null,
    focusedVisualizationGroup: null
  }

  componentDidUpdate() {
    if (
      this.props.disableContext ||
      !this.props.canvasContext ||
      !this.canvasDrawing
    )
      return

    const size = [
      this.props.size[0] + this.props.margin.left + this.props.margin.right,
      this.props.size[1] + this.props.margin.top + this.props.margin.bottom
    ]
    let rc
    const context = this.props.canvasContext.getContext("2d")
    context.setTransform(
      1,
      0,
      0,
      1,
      this.props.margin.left,
      this.props.margin.top
    )
    context.clearRect(
      -this.props.margin.left,
      -this.props.margin.top,
      size[0],
      size[1]
    )

    this.canvasDrawing.forEach(piece => {
      const style = piece.styleFn
        ? piece.styleFn({ ...piece.d, ...piece.d.data }, piece.i) || {}
        : {
            fill: "black",
            stroke: "black",
            opacity: 1,
            fillOpacity: 1,
            strokeOpacity: 1,
            strokeWidth: 1
          }

      const fill = style.fill ? style.fill : "black"
      const stroke = style.stroke ? style.stroke : "black"
      context.setTransform(
        1,
        0,
        0,
        1,
        this.props.margin.left,
        this.props.margin.top
      )
      context.translate(...this.props.position)
      context.translate(piece.tx, piece.ty)
      context.fillStyle = fill
      context.strokeStyle = stroke
      context.lineWidth = style.strokeWidth ? style.strokeWidth : 0

      let rcSettings = {}
      const renderObject =
        piece.markProps.renderMode ||
        (piece.renderFn &&
          piece.renderFn({ ...piece.d, ...piece.d.data }, piece.i))
      const actualRenderMode =
        (renderObject && renderObject.renderMode) || renderObject

      if (actualRenderMode) {
        rc = rc || new RoughCanvas(this.props.canvasContext)
        const rcExtension =
          (typeof renderObject === "object" && renderObject) || {}
        rcSettings = {
          fill,
          stroke,
          strokeWidth: context.lineWidth,
          ...rcExtension
        }
      }

      if (
        piece.markProps.markType === "circle" ||
        (piece.markProps.markType === "rect" && piece.markProps.rx > 0)
      ) {
        let vizX = 0,
          vizY = 0,
          r = piece.markProps.r
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
          // $FlowFixMe
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
    })
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1

    if (this.props.canvasPostProcess === "chuckClose") {
      chuckCloseCanvasTransform(this.props.canvasContext, context, size)
    } else if (typeof this.props.canvasPostProcess === "function") {
      this.props.canvasPostProcess(this.props.canvasContext, context, size)
    }

    if (
      this.state.focusedVisualizationGroup !== null &&
      this.piecesGroup[this.state.focusedVisualizationGroup] &&
      this.state.focusedPieceIndex !== null
    ) {
      const focusElParent = this.piecesGroup[
        this.state.focusedVisualizationGroup
      ][this.state.focusedPieceIndex]

      const focusEl =
        (focusElParent &&
          [...focusElParent.childNodes].find(child =>
            child.getAttribute("aria-label")
          )) ||
        focusElParent

      focusEl && focusEl.focus && focusEl.focus()
    }
  }

  updateVisualizationLayer = (props: Props) => {
    const {
      xScale,
      yScale,
      dataVersion,
      projectedCoordinateNames,
      renderPipeline = {},
      baseMarkProps = {}
    } = props
    this.canvasDrawing = []
    const canvasDrawing = this.canvasDrawing

    const renderedElements = []
    Object.keys(renderPipeline).forEach(k => {
      const pipe = renderPipeline[k]
      if (
        (pipe.data &&
          typeof pipe.data === "object" &&
          !Array.isArray(pipe.data)) ||
        (pipe.data && pipe.data.length > 0)
      ) {
        const renderedPipe = pipe.behavior({
          xScale,
          yScale,
          canvasDrawing,
          projectedCoordinateNames,
          baseMarkProps: Object.assign(baseMarkProps, {
            "aria-label":
              (pipe.ariaLabel && pipe.ariaLabel.items) || "dataviz-element",
            "role": "img",
            "tabIndex": -1
          }),
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
                  `${renderedPipe.length} ${pipe.ariaLabel.items}s in a ${
                    pipe.ariaLabel.chart
                  }`) ||
                k
              }
              onKeyDown={e => this.handleKeyDown(e, k)}
              onBlur={() => {
                this.props.voronoiHover(undefined)
              }}
              ref={thisNode =>
                thisNode && (this.piecesGroup[k] = thisNode.childNodes)
              }
            >
              {renderedPipe}
            </g>
          )
        }
      }
    })

    this.setState({
      renderedElements,
      dataVersion
    })
  }
  componentWillMount() {
    this.updateVisualizationLayer(this.props)
  }

  componentWillReceiveProps(np: Props) {
    const lp = this.props
    const propKeys = Object.keys(np)

    let update = false
    propKeys.forEach(key => {
      if (lp[key] !== np[key]) {
        update = true
      }
    })

    if (
      update === true ||
      (np.dataVersion && np.dataVersion !== this.state.dataVersion)
    ) {
      this.updateVisualizationLayer(np)
    }
  }

  handleKeyDown = (e: Object, vizgroup: string) => {
    // If enter, focus on the first element
    const pushed = e.keyCode
    if (pushed !== 37 && pushed !== 39 && pushed !== 13) return

    let newPieceIndex = 0
    const vizGroupSetting = {}

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
        ? this.piecesGroup[vizgroup].length + newPieceIndex
        : newPieceIndex % this.piecesGroup[vizgroup].length

    /*
    const piece = this.props.renderPipeline[vizgroup].accessibleTransform(
      this.props.renderPipeline[vizgroup].data[newPieceIndex]
    )
    */

    const piece = this.props.renderPipeline[vizgroup].accessibleTransform(
      this.props.renderPipeline[vizgroup].data,
      newPieceIndex,
      this.piecesGroup[vizgroup][newPieceIndex]
    )

    this.props.voronoiHover(piece)

    this.setState({
      focusedPieceIndex: newPieceIndex,
      ...vizGroupSetting
    })
  }

  render() {
    const props = this.props
    const { matte, matteClip, axes, frameKey = "", margin } = props

    const { renderedElements } = this.state

    const renderedAxes = axes && (
      <g key="visualization-axis-labels" className="axis axis-labels">
        {axes}
      </g>
    )

    let ariaLabel = ""

    const title =
      (this.props.title && this.props.ariaTitle) || this.props.title
        ? this.props.title.props &&
          typeof this.props.title.props.children === "string"
          ? `titled ${this.props.title.props.children}`
          : "with a complex title"
        : "with no title"
    ariaLabel = `Visualization ${title}. Use arrow keys to navigate elements.`

    const renderedDataVisualization =
      ((renderedAxes || (renderedElements && renderedElements.length > 0)) && (
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
          {renderedElements}
          {matte}
          {renderedAxes}
        </g>
      )) ||
      null

    return renderedDataVisualization
  }
}

export default VisualizationLayer
