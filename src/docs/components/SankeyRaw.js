import React from "react"
import { NetworkFrame } from "../../components"
import { network_data, or_data } from "../sampledata/energy_time"

const oldColors = ["#000000", "#FFDD89", "#957244", "#F26223"]

const mirroredNetworkData = [
  ...network_data.map(d => ({
    source: d.source.id ? d.source.id : d.source,
    target: d.target.id ? d.target.id : d.target,
    value: d["2010"]
  })),
  ...network_data.map(d => ({
    target: d.source.id ? d.source.id : d.source,
    source: d.target.id ? d.target.id : d.target,
    value: d["2050"]
  }))
]

export default ({ annotations = [], type = "sankey", orient = "left" }) => (
  <NetworkFrame
    size={[700, 400]}
    nodes={or_data}
    edges={network_data}
    nodeStyle={d => ({
      fill: d.id === "Oil" ? "#b3331d" : "rgb(182, 167, 86)",
      stroke: "black"
    })}
    edgeStyle={d => ({
      stroke: "#00a2ce",
      fill: "none",
      strokeWidth: d.sankeyWidth,
      fillOpacity: 0.25,
      strokeOpacity: 0.75
    })}
    nodeIDAccessor="id"
    sourceAccessor="source"
    targetAccessor="target"
    nodeSizeAccessor={5}
    zoomToFit={type === "force"}
    hoverAnnotation={true}
    edgeWidthAccessor={type === "chord" ? d => d.value : undefined}
    networkType={{ type: type, orient: orient, iterations: 500 }}
    annotations={annotations}
  />
)
