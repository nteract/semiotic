import React from "react"

import {
  AnnotationCalloutCircle,
  AnnotationCalloutRect
} from "react-annotation"
import Annotation from "../Annotation"
export const circleEnclosure = ({ d, i, circle }) => {
  const noteData = Object.assign(
    {
      dx: 0,
      dy: 0,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      coordinates: undefined,
      x: circle.x,
      y: circle.y,
      type: AnnotationCalloutCircle,
      subject: {
        radius: circle.r,
        radiusPadding: d.radiusPadding || 2
      }
    }
  )

  if (noteData.rp) {
    switch (noteData.rp) {
      case "top":
        noteData.dx = 0
        noteData.dy = -circle.r - noteData.rd
        break
      case "bottom":
        noteData.dx = 0
        noteData.dy = circle.r + noteData.rd
        break
      case "left":
        noteData.dx = -circle.r - noteData.rd
        noteData.dy = 0
        break
      default:
        noteData.dx = circle.r + noteData.rd
        noteData.dy = 0
    }
  }
  //TODO: Support .ra (setting angle)

  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}

export const rectangleEnclosure = ({ bboxNodes, d, i }) => {
  const { padding = 0 } = d
  const bbox = [
    [
      Math.min(...bboxNodes.map(d => d.x0)) - padding,
      Math.min(...bboxNodes.map(d => d.y0)) - padding
    ],
    [
      Math.max(...bboxNodes.map(d => d.x1)) + padding,
      Math.max(...bboxNodes.map(d => d.y1)) + padding
    ]
  ]

  const noteData = Object.assign(
    {
      dx: d.dx || -25,
      dy: d.dy || -25,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationCalloutRect,
      x: bbox[0][0],
      y: bbox[0][1],
      subject: {
        width: bbox[1][0] - bbox[0][0],
        height: bbox[1][1] - bbox[0][1]
      }
    }
  )

  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}
