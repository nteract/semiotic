import React from "react"
//import ReactDOM from 'react-dom'

//import MarkContext from './MarkContext'
import { hexToRgb } from "./svg/SvgHelper"

//import Rx from 'rxjs/Rx'

import PropTypes from "prop-types"

import { chuckCloseCanvasTransform } from "./canvas/basicCanvasEffects"

class VisualizationLayer extends React.PureComponent {
  static defaultProps = {
    position: [0, 0],
    margin: { left: 0, top: 0, right: 0, bottom: 0 }
  }

  constructor(props) {
    super(props)
    this.updateVisualizationLayer = this.updateVisualizationLayer.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
  }

  piecesGroup = {}

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

    const context = this.props.canvasContext.getContext("2d")
    context.setTransform(
      1,
      0,
      0,
      1,
      this.props.margin.left,
      this.props.margin.top
    )
    context.clearRect(0, 0, size[0], size[1])

    this.canvasDrawing.forEach(piece => {
      const style = piece.styleFn
        ? piece.styleFn(piece.d, piece.i)
        : { fill: "black", stroke: "black" }
      let fill = style.fill ? style.fill : "black"
      let stroke = style.stroke ? style.stroke : "black"
      fill = !style.fillOpacity
        ? fill
        : `rgba(${[...hexToRgb(fill), style.fillOpacity]})`
      stroke = !style.strokeOpacity
        ? stroke
        : `rgba(${[...hexToRgb(stroke), style.strokeOpacity]})`
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
      context.lineWidth = style.strokeWidth ? style.strokeWidth : "black"

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
        context.beginPath()
        context.arc(vizX, vizY, r, 0, 2 * Math.PI)
        context.fill()
        context.stroke()
      } else if (piece.markProps.markType === "rect") {
        context.fillRect(
          piece.markProps.x,
          piece.markProps.y,
          piece.markProps.width,
          piece.markProps.height
        )
        context.strokeRect(
          piece.markProps.x,
          piece.markProps.y,
          piece.markProps.width,
          piece.markProps.height
        )
      } else if (piece.markProps.markType === "path") {
        const p = new Path2D(piece.markProps.d)
        context.stroke(p)
        context.fill(p)
      } else {
        console.error("CURRENTLY UNSUPPORTED MARKTYPE FOR CANVAS RENDERING")
      }
    })
    context.setTransform(1, 0, 0, 1, 0, 0)

    if (this.props.canvasPostProcess === "chuckClose") {
      chuckCloseCanvasTransform(this.props.canvasContext, context, size)
    } else if (typeof this.props.canvasPostProcess === "function") {
      this.props.canvasPostProcess(this.props.canvasContext, context, size)
    }

    if (
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

      focusEl && focusEl.focus()
    }
  }

  updateVisualizationLayer(props) {
    const {
      xScale,
      yScale,
      dataVersion,
      projectedCoordinateNames,
      renderKeyFn,
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
          renderKeyFn,
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

  componentWillReceiveProps(np) {
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

  handleKeyDown(e, vizgroup) {
    // If enter, focus on the first element
    const pushed = e.keyCode
    if (pushed !== 37 && pushed !== 39 && pushed !== 13) return

    let newPieceIndex
    const vizGroupSetting = {}

    // If a user pressed enter, highlight the first one
    // Let a user move up and down in stacked bar by getting keys of bars?
    if (this.state.focusedPieceIndex === null || pushed === 13) {
      newPieceIndex = 0
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

    this.setState({
      focusedPieceIndex: newPieceIndex,
      ...vizGroupSetting
    })
  }

  render() {
    const props = this.props
    const { matte, matteClip, axes, axesTickLines, frameKey, margin } = props

    const { renderedElements } = this.state

    const renderedAxes = axes && (
      <g key="visualization-axis-labels" className="axis axis-labels">
        {axes}
      </g>
    )
    const renderedAxesTickLines = axesTickLines && (
      <g key="visualization-tick-lines" className="axis axis-tick-lines">
        {axesTickLines}
      </g>
    )
    let ariaLabel = ""
    const title = this.props.title
      ? `titled ${this.props.title.children}`
      : "with no title"
    ariaLabel = `Visualization ${title}. Use arrow keys to navigate elements.`

    const renderedDataVisualization =
      ((renderedAxes ||
        renderedAxesTickLines ||
        (renderedElements && renderedElements.length > 0)) && (
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
          {renderedAxesTickLines}
          {renderedElements}
          {matte}
          {renderedAxes}
        </g>
      )) ||
      null

    return renderedDataVisualization
  }
}

VisualizationLayer.propTypes = {
  axes: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  frameKey: PropTypes.string,
  xScale: PropTypes.func,
  yScale: PropTypes.func,
  pointData: PropTypes.array,
  lineData: PropTypes.array,
  areaData: PropTypes.array,
  dataVersion: PropTypes.string,
  canvasContext: PropTypes.object,
  size: PropTypes.array.isRequired,
  margin: PropTypes.object
}

export default VisualizationLayer
