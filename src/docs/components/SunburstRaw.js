import React from "react"
import { NetworkFrame } from "../../components"
import data from "../sampledata/flare"
import ProcessViz from "./ProcessViz"

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]
const sunburstSettings = {
  size: [700, 700],
  edges: data,
  nodeStyle: (d, i) => ({
    fill: colors[d.depth],
    stroke: "black",
    opacity: 0.75
  }),
  nodeIDAccessor: "name",
  hoverAnnotation: true,
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
  margin: 10
}
export default (
  <div>
    <ProcessViz frameSettings={sunburstSettings} frameType="NetworkFrame" />
    <NetworkFrame {...sunburstSettings} />
  </div>
)
