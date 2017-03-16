'use strict';

// modules
import React from 'react'
//import ReactDOM from 'react-dom'

//import MarkContext from './MarkContext'
import { hexToRgb } from '../svg/SvgHelper'
import { createPoints, createLines, createAreas } from '../visualizationLayerBehavior/general'

//import Rx from 'rxjs/Rx'

let PropTypes = React.PropTypes;

class VisualizationLayer extends React.Component {
    constructor(props){
        super(props)

        this.canvasDrawing = []

        this.state = {
          canvasDrawing: [],
          dataVersion: "",
          lines: [],
          points: [],
          areas: []
        }
    }


    componentDidUpdate() {
        const adjustedPosition = this.props.position || [ 0,0 ]
      if (this.props.canvasContext && this.canvasDrawing.length > 0) {
        const context = this.props.canvasContext.getContext("2d")

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0,0,this.props.size[0] * 2,this.props.size[1] * 2)

    this.canvasDrawing.forEach(piece => {
      const style = piece.styleFn ? piece.styleFn(piece.d, piece.i) : "black"
      let fill = style.fill ? style.fill : "black"
      let stroke = style.stroke ? style.stroke : "black"
      fill = !style.fillOpacity ? fill : "rgba(" + [ ...hexToRgb(fill), style.fillOpacity ] + ")"
      stroke = !style.strokeOpacity ? stroke : "rgba(" + [ ...hexToRgb(stroke), style.strokeOpacity ] + ")"
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.translate(...adjustedPosition)
      context.translate(piece.tx, piece.ty)
      context.fillStyle = fill
      context.strokeStyle = stroke
      context.lineWidth = style.strokeWidth ? style.strokeWidth : "black"
      if (piece.markProps.markType === "circle") {
        context.beginPath();
        context.arc(0,0,piece.markProps.r,0,2*Math.PI);
        context.stroke()
        context.fill()
      }
      else if (piece.markProps.markType === "rect") {
        context.fillRect(piece.markProps.x,piece.markProps.y, piece.markProps.width,piece.markProps.height)
        context.strokeRect(piece.markProps.x,piece.markProps.y, piece.markProps.width,piece.markProps.height)
      }
      else if (piece.markProps.markType === "path") {
        const p = new Path2D(piece.markProps.d);
        context.stroke(p);
        context.fill(p);
      }
      else {
        console.log("CURRENTLY UNSUPPORTED MARKTYPE")
      }
      })
    }
    }
    componentWillReceiveProps(nextProps) {
      if (!nextProps.dataVersion || nextProps.dataVersion && nextProps.dataVersion !== this.state.dataVersion) {
        let lines, points, areas
        const dataVersion = nextProps.dataVersion
        this.canvasDrawing = []
        const canvasDrawing = this.canvasDrawing

        const { xScale, yScale, pointData, lineData, areaData } = nextProps
          if (pointData && pointData.length > 0) {
              points = createPoints({ xScale, yScale, props: nextProps, canvasDrawing, data: pointData })
          }
          if (lineData && lineData.length > 0) {
              lines = createLines({ xScale, yScale, props: nextProps, canvasDrawing, lineData })
          }
          if (areaData && areaData.length > 0) {
              areas = createAreas(xScale, yScale, nextProps, canvasDrawing)
          }
          this.setState({
            lines,
            points,
            areas,
            dataVersion
          })
      }
    }

    render() {
        const props = this.props
        const { axes, xyframeKey, adjustedPosition = [ 0,0 ] } = props
        let { points, lines, areas } = this.state

        return <g transform={"translate(" + adjustedPosition + ")"}>
          {axes}
          <g clipPath={this.props.zoomable ? "url(#matte-clip" + xyframeKey +")" : undefined}>
            {lines}
            {points}
            {areas}
          </g>
        </g>

/*        return <MarkContext
          position={this.props.adjustedPosition}
          size={this.props.adjustedSize}
          xyFrameChildren={true}
          renderNumber={this.props.renderNumber}
          canvasContext={this.props.canvasContext}
        >
        </MarkContext> */
    }
}

VisualizationLayer.propTypes = {
    position: PropTypes.array,
    size: PropTypes.array
}

export default VisualizationLayer;
