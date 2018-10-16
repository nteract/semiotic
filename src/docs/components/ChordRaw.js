import React from "react"
import { NetworkFrame } from "../../components"
import ProcessViz from "./ProcessViz"

const dematrixifiedEdges = [
  { source: "a", target: "a", value: 11975 },
  { source: "a", target: "b", value: 5871 },
  { source: "a", target: "c", value: 8916 },
  { source: "a", target: "d", value: 2868 },
  { source: "b", target: "a", value: 1951 },
  { source: "b", target: "b", value: 10048 },
  { source: "b", target: "c", value: 2060 },
  { source: "b", target: "d", value: 6171 },
  { source: "c", target: "a", value: 8010 },
  { source: "c", target: "b", value: 16145 },
  { source: "c", target: "c", value: 8090 },
  { source: "c", target: "d", value: 8045 },
  { source: "d", target: "a", value: 1013 },
  { source: "d", target: "b", value: 990 },
  { source: "d", target: "c", value: 940 },
  { source: "d", target: "d", value: 6907 }
]

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]

const nodes = [
  {
    id: "a",
    color: "orange"
  },
  {
    id: "b",
    color: "purple"
  },
  {
    id: "c",
    color: "red"
  }
]

export default ({ padAngle = 0.01, annotations }) => {
  const chordChart = {
    size: [700, 400],
    edges: dematrixifiedEdges,
    nodes: nodes,
    nodeStyle: d => ({ fill: d.color || colors[d.index], stroke: "black" }),
    edgeStyle: d => ({
      fill: colors[d.source.index],
      stroke: "black",
      opacity: 0.5
    }),
    nodeSizeAccessor: 5,
    sourceAccessor: "source",
    targetAccessor: "target",
    hoverAnnotation: [
      { type: "highlight", style: { fill: "orange" } },
      { type: "frame-hover" }
    ],
    annotations: annotations,
    edgeWidthAccessor: "value",
    networkType: { type: "chord", padAngle }
  }
  return (
    <div>
      <ProcessViz frameSettings={chordChart} frameType="NetworkFrame" />
      <NetworkFrame {...chordChart} />
    </div>
  )
}
