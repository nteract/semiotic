// @flow

import labeler from "./d3labeler"
// import { AnnotationHandling, AnnotationLayerProps } from "../types/annotationTypes"

type AnnotationTypes = "marginalia" | "bump" | false

type AnnotationLayerProps = {
  useSpans: boolean,
  legendSettings?: {
    position: "right" | "left",
    title: string,
    legendGroups: Array<Object>
  },
  margin: Object,
  size: Array<number>,
  axes?: Array<Object>,
  annotationHandling?: Object | AnnotationTypes,
  annotations: Array<Object>,
  pointSizeFunction?: Function,
  labelSizeFunction?: Function,
  svgAnnotationRule: Function,
  htmlAnnotationRule: Function
}

type Layout = {
  type: AnnotationTypes,
  orient?: "nearest" | "left" | "right" | "top" | "bottom" | Array<string>,
  characterWidth?: number,
  lineWidth?: number,
  lineHeight?: number,
  padding?: number,
  iterations?: number,
  pointSizeFunction?: Function,
  labelSizeFunction?: Function,
  marginOffset?: number
}

const basicLabelSizeFunction = (
  noteData,
  characterWidth,
  lineHeight,
  padding
) => {
  const text = noteData.note.label || noteData.note.title

  const textLength = text.length
  const wrap = noteData.note.wrap || 120
  const width = Math.min(wrap, textLength * characterWidth) + padding * 2
  const height =
    Math.ceil(textLength * characterWidth / 120) * lineHeight + padding * 2
  return [width, height]
}

export function bumpAnnotations(
  adjustableNotes: Array<Object>,
  props: AnnotationLayerProps,
  processor: Layout
) {
  const {
    size,
    pointSizeFunction: propsPointSizeFunction,
    labelSizeFunction: propsLabelSizeFunction
  } = props

  const {
    padding = 1,
    characterWidth = 8,
    lineHeight = 20,
    iterations = 500,
    pointSizeFunction = propsPointSizeFunction,
    labelSizeFunction = propsLabelSizeFunction || basicLabelSizeFunction
  } = processor

  const labels = adjustableNotes.map((d, i) => {
    const anchorX =
      d.props.noteData.x +
      (d.props.noteData.dx !== undefined
        ? d.props.noteData.dx
        : (i % 3 - 1) * -10)
    const anchorY =
      d.props.noteData.y +
      (d.props.noteData.dy !== undefined
        ? d.props.noteData.dy
        : (i % 3 - 1) * 10)

    const [labelWidth, labelHeight] = labelSizeFunction(
      d.props.noteData,
      characterWidth,
      lineHeight,
      padding
    )
    return {
      x: anchorX,
      y: anchorY,
      above: anchorY < d.props.noteData.y,
      left: anchorX < d.props.noteData.x,
      width: labelWidth,
      height: labelHeight,
      type: "label",
      name: "",
      originalNote: d
    }
  })

  const points = adjustableNotes.map(d => ({
    x: d.props.noteData.x,
    y: d.props.noteData.y,
    fx: d.props.noteData.x,
    fy: d.props.noteData.y,
    r: (pointSizeFunction && pointSizeFunction(d.props.noteData)) || 5,
    type: "point",
    originalNote: d
  }))

  labeler()
    .label(labels)
    .anchor(points)
    .width(size[0])
    .height(size[1])
    .start(iterations)

  labels.forEach(d => {
    if (d.type === "label") {
      const adjusted = adjustedXY(d.originalNote.props.noteData, d, padding)
      d.originalNote.props.noteData.nx = adjusted[0]
      d.originalNote.props.noteData.ny = adjusted[1]
    }
  })

  return adjustableNotes
}

function adjustedXY(note, calculated, padding) {
  if (note.y > calculated.y) {
    //below
    return [
      calculated.x + calculated.width / 2 + padding / 2,
      calculated.y - calculated.height + padding / 2
    ]
  }
  return [calculated.x + calculated.width / 2, calculated.y]
}
