// modules
import React from "react"
//import { load } from 'opentype.js'
import { bumpAnnotations } from "./annotationLayerBehavior/annotationHandling"
import PropTypes from "prop-types"
import Legend from "./Legend"
import Annotation from "./Annotation"
import labella from "labella"

function adjustedAnnotationKeyMapper(d) {
  return d.props.noteData.id || `${d.props.noteData.x}-${d.props.noteData.y}`
}

function noteDataWidth(noteData, charWidth = 8) {
  const wrap = (noteData.note && noteData.note.wrap) || 120
  return Math.min(wrap, noteData.note.label.length * charWidth)
}

function noteDataHeight(noteData, charWidth = 8, lineHeight = 20) {
  const wrap = (noteData.note && noteData.note.wrap) || 120
  const text = noteData.note.label || noteData.note.title || ""
  return (
    Math.ceil(text.length * charWidth / wrap) * lineHeight +
    (noteData.note.label && noteData.note.title ? lineHeight : 0)
  )
}

function objectStringKey(object) {
  let finalKey = ""
  Object.keys(object).forEach(key => {
    finalKey +=
      !object[key] || !object[key].toString
        ? object[key]
        : object[key].toString()
  })

  return finalKey
}

class AnnotationLayer extends React.Component {
  constructor(props) {
    super(props)

    this.generateSVGAnnotations = this.generateSVGAnnotations.bind(this)
    this.generateHTMLAnnotations = this.generateHTMLAnnotations.bind(this)

    this.state = {
      font: undefined,
      svgAnnotations: [],
      htmlAnnotations: [],
      adjustedAnnotations: 0,
      adjustedAnnotationsKey: "",
      adjustedAnnotationsDataVersion: ""
    }
  }

  /*    componentWillMount() {
      const fontLocation = this.props.fontLocation

      if (fontLocation) {
        load(fontLocation, function(err, font) {
            if (err) {
                return null
            } else {
                this.setState({ font });
            }
        });
      }
    } */

  generateSVGAnnotations(props, annotations) {
    const renderedAnnotations = annotations
      .map((d, i) => props.svgAnnotationRule(d, i, props))
      .filter(d => d !== null && d !== undefined)

    return renderedAnnotations
  }

  generateHTMLAnnotations(props, annotations) {
    const renderedAnnotations = annotations
      .map((d, i) => props.htmlAnnotationRule(d, i, props))
      .filter(d => d !== null && d !== undefined)

    return renderedAnnotations
  }

  processAnnotations(adjustableAnnotations, annotationProcessor, props) {
    if (annotationProcessor.type === false) {
      return adjustableAnnotations
    }

    let {
      margin = { top: 0, bottom: 0, left: 0, right: 0 },
      size,
      axes
    } = props

    margin =
      typeof margin === "number"
        ? { top: margin, left: margin, right: margin, bottom: margin }
        : margin

    const { padding = 2 } = annotationProcessor

    if (annotationProcessor.type === "bump") {
      const adjustedAnnotations = bumpAnnotations(
        adjustableAnnotations,
        props,
        annotationProcessor
      )
      return adjustedAnnotations
    } else if (annotationProcessor.type === "marginalia") {
      const finalOrientation =
        !annotationProcessor.orient || annotationProcessor.orient === "nearest"
          ? ["left", "right", "top", "bottom"]
          : Array.isArray(annotationProcessor.orient)
            ? annotationProcessor.orient
            : [annotationProcessor.orient]

      const leftOn = finalOrientation.find(d => d === "left")
      const rightOn = finalOrientation.find(d => d === "right")
      const topOn = finalOrientation.find(d => d === "top")
      const bottomOn = finalOrientation.find(d => d === "bottom")

      const leftNodes = []
      const rightNodes = []
      const topNodes = []
      const bottomNodes = []

      adjustableAnnotations.forEach(aNote => {
        const noteData = aNote.props.noteData
        const leftDist = leftOn ? noteData.x : Infinity
        const rightDist = rightOn ? 700 - noteData.x : Infinity
        const topDist = topOn ? noteData.y : Infinity
        const bottomDist = bottomOn ? 700 - noteData.y : Infinity

        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist)

        if (leftDist === minDist) {
          leftNodes.push(aNote)
        } else if (rightDist === minDist) {
          rightNodes.push(aNote)
        } else if (topDist === minDist) {
          topNodes.push(aNote)
        } else {
          bottomNodes.push(aNote)
        }
      })

      //Adjust the margins based on which regions are active

      const leftForce = new labella.Force({
        minPos: 0,
        maxPos: bottomOn ? size[1] - margin.bottom : size[1]
      })
        .nodes(
          leftNodes.map(
            d =>
              new labella.Node(
                d.props.noteData.y,
                noteDataHeight(
                  d.props.noteData,
                  annotationProcessor.characterWidth,
                  annotationProcessor.lineHeight
                ) + padding
              )
          )
        )
        .compute()

      const rightForce = new labella.Force({
        minPos: topOn ? margin.top : 0,
        maxPos: size[1]
      })
        .nodes(
          rightNodes.map(
            d =>
              new labella.Node(
                d.props.noteData.y,
                noteDataHeight(
                  d.props.noteData,
                  annotationProcessor.characterWidth,
                  annotationProcessor.lineHeight
                ) + padding
              )
          )
        )
        .compute()

      const topForce = new labella.Force({
        minPos: leftOn ? margin.left : 0,
        maxPos: size[0]
      })
        .nodes(
          topNodes.map(
            d =>
              new labella.Node(
                d.props.noteData.x,
                noteDataWidth(
                  d.props.noteData,
                  annotationProcessor.characterWidth
                ) + padding
              )
          )
        )
        .compute()

      const bottomForce = new labella.Force({
        minPos: 0,
        maxPos: rightOn ? size[0] - margin.right : size[0]
      })
        .nodes(
          bottomNodes.map(
            d =>
              new labella.Node(
                d.props.noteData.x,
                noteDataWidth(
                  d.props.noteData,
                  annotationProcessor.characterWidth
                ) + padding
              )
          )
        )
        .compute()

      const bottomOffset = Math.max(
        ...bottomNodes.map(
          d =>
            noteDataHeight(
              d.props.noteData,
              annotationProcessor.characterWidth,
              annotationProcessor.lineHeight
            ) + padding
        )
      )
      const topOffset = Math.max(
        ...topNodes.map(
          d =>
            noteDataHeight(
              d.props.noteData,
              annotationProcessor.characterWidth,
              annotationProcessor.lineHeight
            ) + padding
        )
      )
      const leftOffset = Math.max(
        ...leftNodes.map(
          d =>
            noteDataWidth(
              d.props.noteData,
              annotationProcessor.characterWidth
            ) + padding
        )
      )
      const rightOffset = Math.max(
        ...rightNodes.map(
          d =>
            noteDataWidth(
              d.props.noteData,
              annotationProcessor.characterWidth
            ) + padding
        )
      )

      const nodeOffsetHeight = Math.max()

      const leftSortedNodes = leftForce.nodes()
      const rightSortedNodes = rightForce.nodes()
      const topSortedNodes = topForce.nodes()
      const bottomSortedNodes = bottomForce.nodes()

      leftNodes.forEach((note, i) => {
        note.props.noteData.ny = leftSortedNodes[i].currentPos
        note.props.noteData.nx =
          margin.left - leftSortedNodes[i].layerIndex * leftOffset - 5
        if (note.props.noteData.note) {
          note.props.noteData.note.orientation = "leftRight"
          note.props.noteData.note.align = "middle"
        }
      })

      rightNodes.forEach((note, i) => {
        note.props.noteData.ny = rightSortedNodes[i].currentPos
        note.props.noteData.nx =
          size[0] -
          margin.right +
          rightSortedNodes[i].layerIndex * rightOffset +
          5
        if (note.props.noteData.note) {
          note.props.noteData.note.orientation = "leftRight"
          note.props.noteData.note.align = "middle"
        }
      })

      topNodes.forEach((note, i) => {
        note.props.noteData.nx = topSortedNodes[i].currentPos
        note.props.noteData.ny =
          margin.top - topSortedNodes[i].layerIndex * topOffset - 5
      })

      bottomNodes.forEach((note, i) => {
        note.props.noteData.nx = bottomSortedNodes[i].currentPos
        note.props.noteData.ny =
          size[1] -
          margin.bottom +
          bottomSortedNodes[i].layerIndex * bottomOffset +
          5
      })
      return adjustableAnnotations
    }
    return adjustableAnnotations
    console.error(
      "Unknown annotation handling function: Must be of a string 'bump' or 'marginalia' or a an object with type of those strings or a function that takes adjustable annotations and returns adjusted annotations"
    )
  }

  createAnnotations(props) {
    let renderedSVGAnnotations = this.state.svgAnnotations,
      renderedHTMLAnnotations = [],
      adjustedAnnotations = this.state.adjustedAnnotations,
      adjustableAnnotationsKey = this.state.adjustedAnnotationsKey,
      adjustedAnnotationsKey = this.state.adjustedAnnotationsKey,
      adjustedAnnotationsDataVersion = this.state.adjustedAnnotationsDataVersion

    const { annotations, annotationHandling = false } = props
    const annotationProcessor =
      typeof annotationHandling !== "object"
        ? { type: annotationHandling }
        : annotationHandling

    const { dataVersion = "" } = annotationProcessor

    if (this.props.svgAnnotationRule) {
      const initialSVGAnnotations = this.generateSVGAnnotations(
        props,
        annotations
      )
      const adjustableAnnotations = initialSVGAnnotations.filter(
        d => d.props && d.props.noteData && !d.props.noteData.fixedPosition
      )
      const fixedAnnotations = initialSVGAnnotations.filter(
        d => !d.props || !d.props.noteData || d.props.noteData.fixedPosition
      )
      adjustableAnnotationsKey =
        adjustableAnnotations.map(adjustedAnnotationKeyMapper).join(",") +
        objectStringKey(
          Object.assign(annotationProcessor, {
            point: props.pointSizeFunction,
            label: props.labelSizeFunction
          })
        )

      if (annotationProcessor.type === false) {
        adjustedAnnotations = adjustableAnnotations
      }

      if (
        adjustedAnnotations.length !== adjustableAnnotations.length ||
        adjustedAnnotationsKey !== adjustableAnnotationsKey ||
        adjustedAnnotationsDataVersion !== dataVersion
      ) {
        adjustedAnnotations = this.processAnnotations(
          adjustableAnnotations,
          annotationProcessor,
          props
        )
      } else {
        //Handle when style or other attributes change
        adjustedAnnotations = adjustedAnnotations.map((d, i) => {
          const newNoteData = Object.assign(
            adjustableAnnotations[i].props.noteData,
            {
              nx: d.props.noteData.nx,
              ny: d.props.noteData.ny,
              note: d.props.noteData.note
            }
          )
          return <Annotation key={d.key} noteData={newNoteData} />
        })
      }

      renderedSVGAnnotations = [...adjustedAnnotations, ...fixedAnnotations]
    }

    if (this.props.htmlAnnotationRule) {
      renderedHTMLAnnotations = this.generateHTMLAnnotations(props, annotations)
    }

    this.setState({
      svgAnnotations: renderedSVGAnnotations,
      htmlAnnotations: renderedHTMLAnnotations,
      adjustedAnnotations: adjustedAnnotations,
      adjustedAnnotationsKey: adjustableAnnotationsKey,
      adjustedAnnotationsDataVersion: dataVersion
    })
  }

  componentWillMount() {
    this.createAnnotations(this.props)
  }

  componentWillReceiveProps(nextProps) {
    this.createAnnotations(nextProps)
  }

  render() {
    const { svgAnnotations, htmlAnnotations } = this.state

    let renderedLegend
    if (this.props.legendSettings) {
      const { width = 100 } = this.props.legendSettings
      const positionHash = {
        left: [15, 15],
        right: [this.props.size[0] - width - 15, 15]
      }
      const { position = "right", title = "Legend" } = this.props.legendSettings
      const legendPosition = positionHash[position] || position
      renderedLegend = (
        <g transform={`translate(${legendPosition})`}>
          <Legend
            {...this.props.legendSettings}
            title={title}
            position={position}
          />
        </g>
      )
    }

    return (
      <div
        className="annotation-layer"
        style={{
          position: "absolute",
          pointerEvents: "none",
          background: "none"
        }}
      >
        <div
          className="annotation-layer-html"
          style={{
            background: "none",
            pointerEvents: "none",
            position: "absolute",
            height: this.props.size[1] + "px",
            width: this.props.size[0] + "px"
          }}
        >
          {htmlAnnotations}
        </div>
        <svg
          className="annotation-layer-svg"
          height={this.props.size[1]}
          width={this.props.size[0]}
          style={{ background: "none", pointerEvents: "none" }}
        >
          {renderedLegend}
          {svgAnnotations}
        </svg>
      </div>
    )
  }
}

AnnotationLayer.propTypes = {
  scale: PropTypes.func,
  orient: PropTypes.string,
  title: PropTypes.string,
  format: PropTypes.string,
  values: PropTypes.array,
  properties: PropTypes.object,
  position: PropTypes.array
}

export default AnnotationLayer
