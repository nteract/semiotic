// modules
import React from "react"
//import { load } from 'opentype.js'
import { bumpAnnotations } from "./annotationLayerBehavior/annotationHandling"
import PropTypes from "prop-types"
import Legend from "./Legend"
import Annotation from "./Annotation"
import labella from "labella"
import SpanOrDiv from "./SpanOrDiv"

function adjustedAnnotationKeyMapper(d) {
  return d.props.noteData.id || `${d.props.noteData.x}-${d.props.noteData.y}`
}

function noteDataWidth(noteData, charWidth = 8) {
  const wrap = (noteData.note && noteData.note.wrap) || 120
  const noteText = noteData.note.label || noteData.note.label || ""
  return Math.min(wrap, noteText.length * charWidth)
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

    let { margin = { top: 0, bottom: 0, left: 0, right: 0 } } = props

    const { size, axes = [] } = props

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
      const { marginOffset } = annotationProcessor
      const finalOrientation =
        !annotationProcessor.orient || annotationProcessor.orient === "nearest"
          ? ["left", "right", "top", "bottom"]
          : Array.isArray(annotationProcessor.orient)
            ? annotationProcessor.orient
            : [annotationProcessor.orient]
      let marginOffsetFn = (orient, axisSettings) => {
        if (axisSettings && axisSettings.find(d => d.props.orient === orient)) {
          return 50
        }
        return 10
      }
      if (typeof marginOffset === "number") {
        marginOffsetFn = () => marginOffset
      }

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
        const rightDist = rightOn ? size[0] - noteData.x : Infinity
        const topDist = topOn ? noteData.y : Infinity
        const bottomDist = bottomOn ? size[1] - noteData.y : Infinity

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
        minPos: 0 - margin.top,
        maxPos: bottomOn ? size[1] : size[1] + margin.bottom
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
        minPos: topOn ? 0 : 0 - margin.top,
        maxPos: size[1] + margin.bottom
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
        minPos: leftOn ? 0 : 0 - margin.left,
        maxPos: size[0] + margin.right
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
        minPos: 0 - margin.left,
        maxPos: rightOn ? size[0] : size[0] + margin.right
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

      //      const nodeOffsetHeight = Math.max()

      const leftSortedNodes = leftForce.nodes()
      const rightSortedNodes = rightForce.nodes()
      const topSortedNodes = topForce.nodes()
      const bottomSortedNodes = bottomForce.nodes()

      leftNodes.forEach((note, i) => {
        note.props.noteData.ny = leftSortedNodes[i].currentPos
        note.props.noteData.nx =
          0 -
          leftSortedNodes[i].layerIndex * leftOffset -
          marginOffsetFn("left", axes)
        if (note.props.noteData.note) {
          note.props.noteData.note.orientation =
            note.props.noteData.note.orientation || "leftRight"
          note.props.noteData.note.align =
            note.props.noteData.note.align || "right"
        }
      })

      rightNodes.forEach((note, i) => {
        note.props.noteData.ny = rightSortedNodes[i].currentPos
        note.props.noteData.nx =
          size[0] +
          rightSortedNodes[i].layerIndex * rightOffset +
          marginOffsetFn("right", axes)
        if (note.props.noteData.note) {
          note.props.noteData.note.orientation =
            note.props.noteData.note.orientation || "leftRight"
          note.props.noteData.note.align =
            note.props.noteData.note.align || "left"
        }
      })

      topNodes.forEach((note, i) => {
        note.props.noteData.nx = topSortedNodes[i].currentPos
        note.props.noteData.ny =
          0 -
          topSortedNodes[i].layerIndex * topOffset -
          marginOffsetFn("top", axes)
      })

      bottomNodes.forEach((note, i) => {
        note.props.noteData.nx = bottomSortedNodes[i].currentPos
        note.props.noteData.ny =
          size[1] +
          bottomSortedNodes[i].layerIndex * bottomOffset +
          marginOffsetFn("bottom", axes)
      })
      return adjustableAnnotations
    }
    return adjustableAnnotations
  }

  createAnnotations(props) {
    let renderedSVGAnnotations = this.state.svgAnnotations,
      renderedHTMLAnnotations = [],
      adjustedAnnotations = this.state.adjustedAnnotations,
      adjustableAnnotationsKey = this.state.adjustedAnnotationsKey

    const adjustedAnnotationsKey = this.state.adjustedAnnotationsKey,
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
      adjustableAnnotationsKey = `${adjustableAnnotations
        .map(adjustedAnnotationKeyMapper)
        .join(",")}${objectStringKey(
        Object.assign(annotationProcessor, {
          point: props.pointSizeFunction,
          label: props.labelSizeFunction
        })
      )}${props.size}`

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
    const { useSpans, legendSettings, margin } = this.props

    let renderedLegend
    if (legendSettings) {
      const positionHash = {
        left: [15, 15],
        right: [this.props.size[0] + 15, 15]
      }
      const { position = "right", title = "Legend" } = legendSettings
      const legendPosition = positionHash[position] || position
      renderedLegend = (
        <g transform={`translate(${legendPosition})`}>
          <Legend {...legendSettings} title={title} position={position} />
        </g>
      )
    }
    const svgStyle = {
      background: "none",
      pointerEvents: "none",
      position: "absolute",
      left: `${margin.left}px`,
      top: `${margin.top}px`
    }
    //    if (useSpans) {
    svgStyle.overflow = "visible"
    //    }

    return (
      <SpanOrDiv
        span={useSpans}
        className="annotation-layer"
        style={{
          position: "absolute",
          pointerEvents: "none",
          background: "none"
        }}
      >
        <svg
          className="annotation-layer-svg"
          height={this.props.size[1]}
          width={this.props.size[0]}
          style={svgStyle}
        >
          <g>
            {renderedLegend}
            {svgAnnotations}
          </g>
        </svg>
        <SpanOrDiv
          span={useSpans}
          className="annotation-layer-html"
          style={{
            background: "none",
            pointerEvents: "none",
            position: "absolute",
            height: `${this.props.size[1]}px`,
            width: `${this.props.size[0]}px`,
            left: `${margin.left}px`,
            top: `${margin.top}px`
          }}
        >
          {htmlAnnotations}
        </SpanOrDiv>
      </SpanOrDiv>
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
