import React from "react"
import AnnotationCalloutCircle from "react-annotation/lib/Types/AnnotationCalloutCircle"
import AnnotationCalloutRect from "react-annotation/lib/Types/AnnotationCalloutRect"
import AnnotationCalloutCustom from "react-annotation/lib/Types/AnnotationCalloutCustom"

import Annotation from "../Annotation"
import { polygonHull } from "d3-polygon"
import Offset from "polygon-offset"

export const circleEnclosure = ({ d, i, circle }) => {
  const { radiusPadding = 2, label } = d

  const noteData = Object.assign(
    {
      dx: 0,
      dy: 0,
      note: { label },
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
        radiusPadding
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
  const { padding = 0, dx = -25, dy = -25, label } = d
  const bbox = [
    [
      Math.min(...bboxNodes.map(p => p.x0)) - padding,
      Math.min(...bboxNodes.map(p => p.y0)) - padding
    ],
    [
      Math.max(...bboxNodes.map(p => p.x1)) + padding,
      Math.max(...bboxNodes.map(p => p.y1)) + padding
    ]
  ]

  const noteData = Object.assign(
    {
      dx: dx,
      dy: dy,
      note: { label },
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

export const hullEnclosure = ({ points, d, i }) => {
  const {
    color = "black",
    dx = -25,
    dy = -25,
    label,
    buffer = 10,
    strokeWidth = 10
  } = d

  const hullPoints = polygonHull(points)

  const offset = new Offset()

  const bufferedHull = offset
    .data([...hullPoints, hullPoints[0]])
    .margin(buffer)[0]

  const hullD = `M${bufferedHull.map(d => d.join(",")).join("L")}Z`

  const noteData = Object.assign(
    {
      dx: dx,
      dy: dy,
      note: { label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationCalloutCustom,
      x: bufferedHull[0][0],
      y: bufferedHull[0][1],
      subject: {
        custom: [
          <path
            key="hull-drawing"
            d={hullD}
            strokeWidth={strokeWidth}
            strokeMiterlimit="10"
            strokeLinejoin="miter"
            strokeLinecap="butt"
            fill="none"
            stroke={color}
            transform={`translate(${-bufferedHull[0][0]},${-bufferedHull[0][1]})`}
          />
        ],
        customID: "hull-annotation"
      }
    }
  )

  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}
