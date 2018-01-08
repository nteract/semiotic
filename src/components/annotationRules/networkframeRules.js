import React from "react"
import { Mark } from "semiotic-mark"
import Annotation from "../Annotation"
import {
  AnnotationXYThreshold,
  AnnotationCalloutCircle,
  AnnotationBracket
} from "react-annotation"
import { packEnclose } from "d3-hierarchy"
import { max, min, sum, extent } from "d3-array"
import { pointOnArcAtAngle } from "../svg/pieceDrawing"
import { arc } from "d3-shape"

export const htmlFrameHoverRule = ({ d, i, tooltipContent, size }) => {
  let content = (
    <div className="tooltip-content">
      <p key="html-annotation-content-1">{d.id}</p>
      <p key="html-annotation-content-2">Degree: {d.degree}</p>
    </div>
  )

  if (d.type === "frame-hover" && tooltipContent) {
    content = tooltipContent(d)
  }

  return (
    <div
      key={"xylabel" + i}
      className={`annotation annotation-network-label ${d.className || ""}`}
      style={{
        position: "absolute",
        bottom: size[1] - d.y + "px",
        left: d.x + "px"
      }}
    >
      {content}
    </div>
  )
}

export const svgNodeRule = ({
  d,
  i,
  projectedNodes,
  nodeIDAccessor,
  nodeSizeAccessor
}) => {
  const selectedNode =
    d.x && d.y ? d : projectedNodes.find(p => nodeIDAccessor(p) === d.id)
  if (!selectedNode) {
    return null
  }
  const noteData = Object.assign(
    {
      dx: d.dx || -25,
      dy: d.dy || -25,
      x: selectedNode.x,
      y: selectedNode.y,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationCalloutCircle,
      subject: {
        radius: d.radius || selectedNode.radius || nodeSizeAccessor(d)
      }
    }
  )
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}

export const svgReactAnnotationRule = ({
  d,
  i,
  projectedNodes,
  nodeIDAccessor
}) => {
  const selectedNode =
    d.x && d.y ? d : projectedNodes.find(p => nodeIDAccessor(p) === d.id)
  if (!selectedNode) {
    return null
  }
  const noteData = Object.assign(
    {
      dx: 0,
      dy: 0,
      x: selectedNode.x,
      y: selectedNode.y,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    { type: typeof d.type === "function" ? d.type : undefined }
  )
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
}

export const svgEncloseRule = ({
  d,
  i,
  projectedNodes,
  nodeIDAccessor,
  nodeSizeAccessor
}) => {
  const selectedNodes = projectedNodes.filter(
    p => d.ids.indexOf(nodeIDAccessor(p)) !== -1
  )
  if (selectedNodes.length === 0) {
    return null
  }
  const circle = packEnclose(
    selectedNodes.map(p => ({ x: p.x, y: p.y, r: nodeSizeAccessor(p) }))
  )
  const noteData = Object.assign(
    {
      dx: d.dx || -25,
      dy: d.dy || -25,
      x: circle.x,
      y: circle.y,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationCalloutCircle,
      subject: {
        radius: circle.r,
        radiusPadding: 5 || d.radiusPadding
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
