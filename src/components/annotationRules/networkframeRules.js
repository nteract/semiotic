import React from "react"
import Annotation from "../Annotation"
import AnnotationCalloutCircle from "react-annotation/lib/Types/AnnotationCalloutCircle"

import { packEnclose } from "d3-hierarchy"
import { circleEnclosure, rectangleEnclosure, hullEnclosure } from "./baseRules"
import SpanOrDiv from "../SpanOrDiv"

export const htmlFrameHoverRule = ({
  d: baseD,
  i,
  tooltipContent,
  useSpans,
  nodes,
  edges,
  nodeIDAccessor
}) => {
  const d =
    baseD.x && baseD.y
      ? baseD
      : baseD.edge
        ? {
            ...(edges.find(
              p =>
                nodeIDAccessor(p.source) === nodeIDAccessor(baseD.source) &&
                nodeIDAccessor(p.target) === nodeIDAccessor(baseD.target)
            ) || {}),
            ...baseD
          }
        : nodes.find(p => nodeIDAccessor(p) === baseD.id)

  if (!d) return null

  let content = d.edge ? (
    <SpanOrDiv span={useSpans} className="tooltip-content">
      <p key="html-annotation-content-1">
        {(d.source || d.edge.source).id} to {(d.target || d.edge.target).id}
      </p>
    </SpanOrDiv>
  ) : (
    <SpanOrDiv span={useSpans} className="tooltip-content">
      <p key="html-annotation-content-1">{d.id}</p>
      <p key="html-annotation-content-2">Degree: {d.degree}</p>
    </SpanOrDiv>
  )

  if (d.type === "frame-hover" && tooltipContent) {
    content = tooltipContent(d)
  }

  return (
    <SpanOrDiv
      span={useSpans}
      key={`xylabel${i}`}
      className={`annotation annotation-network-label ${d.className || ""}`}
      style={{
        position: "absolute",
        top: `${d.y}px`,
        left: `${d.x}px`
      }}
    >
      {content}
    </SpanOrDiv>
  )
}

export const svgNodeRule = ({ d, i, nodeSizeAccessor }) => {
  if (!d) {
    return null
  }
  const noteData = Object.assign(
    {
      dx: d.dx || -25,
      dy: d.dy || -25,
      x: d.x,
      y: d.y,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationCalloutCircle,
      subject: {
        radius: d.radius || d.radius || nodeSizeAccessor(d)
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
    if (p.shapeNode) {
      return {
        x0: p.x0,
        x1: p.x1,
        y0: p.y0,
        y1: p.y1
      }
    }
    const nodeSize = nodeSizeAccessor(p)
    return {
      x0: p.x - nodeSize,
      x1: p.x + nodeSize,
      y0: p.y - nodeSize,
      y1: p.y + nodeSize
    }
  })

  return rectangleEnclosure({ bboxNodes, d, i })
}

export const svgHullEncloseRule = ({
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

  const projectedPoints = []

  selectedNodes.forEach(p => {
    if (p.shapeNode) {
      projectedPoints.push({ x: p.x0, y: p.y0 })
      projectedPoints.push({ x: p.x0, y: p.y1 })
      projectedPoints.push({ x: p.x1, y: p.y0 })
      projectedPoints.push({ x: p.x1, y: p.y1 })
    } else {
      const nodeSize = nodeSizeAccessor(p)
      projectedPoints.push({ x: p.x - nodeSize, y: p.y - nodeSize })
      projectedPoints.push({ x: p.x + nodeSize, y: p.y - nodeSize })
      projectedPoints.push({ x: p.x - nodeSize, y: p.y + nodeSize })
      projectedPoints.push({ x: p.x + nodeSize, y: p.y + nodeSize })
    }
  })

  return hullEnclosure({ points: projectedPoints.map(d => [d.x, d.y]), d, i })
}

export const svgHighlightRule = ({ d, networkFrameRender }) => {
  const { nodes } = networkFrameRender
  const { customMark } = nodes

  let styleFn = () => ({})
  if (d.style && typeof d.style === "function") {
    styleFn = d.style
  } else if (d.style) {
    styleFn = () => d.style
  }

  const transform = `translate(${d.x},${d.y})`
  const baseMarkProps = { forceUpdate: true }

  const HighlightMark = customMark({ d, styleFn, transform, baseMarkProps })

  return HighlightMark
}
