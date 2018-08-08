import React from "react"
import { NetworkFrame } from "../../components"
import data from "../sampledata/flare"
import ProcessViz from "./ProcessViz"

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]
const sunburstSettings = {
  size: [700, 700],
  edges: data,
  nodeStyle: d => ({
    fill: colors[d.depth],
    stroke: "black",
    opacity: 0.75
  }),
  nodeIDAccessor: "name",
  hoverAnnotation: [
    {
      type: "highlight",
      style: { fill: "red", stroke: "orange", strokeWidth: 3 }
    }
  ],
  networkType: {
    type: "partition",
    projection: "radial",
    nodePadding: 1,
    hierarchySum: d => d.size
  },
  tooltipContent: d => (
    <div className="tooltip-content">
      {d.parent ? <p>{d.parent.data.name}</p> : undefined}
      <p>{d.data.name}</p>
    </div>
  ),
  nodeLabels: d => {
    return d.x1 - d.x0 < 8 ? null : (
      <g transform="translate(0,5)">
        <text textAnchor="middle" strokeWidth={2} stroke="white" fill="white">
          {d.id}
        </text>
        <text textAnchor="middle">{d.id}</text>
      </g>
    )
  },
  margin: 10,
  filterRenderedNodes: d => d.depth !== 0
}
export default (
  <div>
    <ProcessViz frameSettings={sunburstSettings} frameType="NetworkFrame" />
    <NetworkFrame {...sunburstSettings} />
  </div>
)
