import React from "react"
import { Mark } from "semiotic-mark"
import Annotation from "../Annotation"
import {
  AnnotationXYThreshold,
  AnnotationCalloutCircle,
  AnnotationCalloutRect,
  AnnotationBracket
} from "react-annotation"
import { packEnclose } from "d3-hierarchy"
import { max, min, sum, extent } from "d3-array"
import { pointOnArcAtAngle } from "../svg/pieceDrawing"
import { arc } from "d3-shape"
import { circleEnclosure, rectangleEnclosure } from "./baseRules"

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
  return circleEnclosure({ circle, d })
}

export const svgRectEncloseRule = ({
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

  const bboxNodes = selectedNodes.map(p => {
    const nodeSize = nodeSizeAccessor(p)
    return {
      x0: p.x0 === undefined ? p.x - nodeSize : p.x0,
      x1: p.x1 === undefined ? p.x + nodeSize : p.x1,
      y0: p.y0 === undefined ? p.y - nodeSize : p.y0,
      y1: p.y1 === undefined ? p.y + nodeSize : p.y1
    }
  })
  return rectangleEnclosure({ bboxNodes, d, i })
}
