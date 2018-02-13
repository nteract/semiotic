import React from "react"
import { NetworkFrame } from "../../components"
import { network_data, or_data } from "../sampledata/energy_time"
import ProcessViz from "./ProcessViz"

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

const cyclicalData = [...network_data]

if (true) {
  cyclicalData.push({
    source: "Gas",
    target: "Gas reserves",
    value: 2500
  })
  cyclicalData.push({
    source: "Oil",
    target: "Oil reserves",
    value: 2500
  })
  cyclicalData.push({
    source: "Thermal generation",
    target: "Oil reserves",
    value: 2500
  })
}

const colors = {
  Oil: "#b3331d",
  Gas: "rgb(182, 167, 86)",
  Coal: "#00a2ce",
  Other: "grey"
}

const areaLegendGroups = [
  {
    styleFn: d => ({ fill: colors[d.label], stroke: "black" }),
    items: [
      { label: "Oil" },
      { label: "Gas" },
      { label: "Coal" },
      { label: "Other" }
    ]
  }
]

export default ({
  annotations = [],
  type = "sankey",
  orient = "left",
  cyclical = false
}) => {
  const sankeyChart = {
    size: [700, 400],
    nodes: or_data.map(d => Object.assign({}, d)),
    edges:
      type === "chord"
        ? mirroredNetworkData
        : cyclical ? cyclicalData : network_data,
    nodeStyle: d => ({
      fill: colors[d.category],
      stroke: "black"
    }),
    edgeStyle: d => ({
      stroke: colors[d.source.category],
      fill: colors[d.source.category],
      strokeWidth: 0.5,
      fillOpacity: 0.75,
      strokeOpacity: 0.75
    }),
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    nodeSizeAccessor: 5,
    zoomToFit: type === "force",
    hoverAnnotation: true,
    networkType: { type: type, orient: orient, iterations: 500 },
    legend: { legendGroups: areaLegendGroups },
    nodeLabels: d => <text textAnchor="middle">{d.id}</text>,
    margin: { right: 130 },
    canvasEdges: (d, i) =>
      d.source.category === "Oil" || d.source.category === "Coal"
  }

  if (type === "chord") {
    sankeyChart.edgeWidthAccessor = d => d.value
  }

  return (
    <div>
      <ProcessViz frameSettings={sankeyChart} frameType="NetworkFrame" />
      <NetworkFrame {...sankeyChart} />
    </div>
  )
}
