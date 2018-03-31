import React from "react"
import { NetworkFrame } from "../../components"
import { data } from "../sampledata/d3_api"
import ProcessViz from "./ProcessViz"

const colors = ["#00a2ce", "#b6a756", "#4d430c", "#b3331d"]

export default ({
  annotation = "rectangle",
  type = "dendrogram",
  projection
}) => {
  const hierarchicalChart = {
    title: "D3v3 API",
    size: [700, 700],
    edges: data,
    nodeStyle: (d, i) => ({
      fill: colors[d.depth],
      stroke: "black",
      strokeOpacity: 0.25,
      fillOpacity: 0.25
    }),
    edgeStyle: (d, i) => ({
      fill: colors[d.source.depth],
      stroke: colors[d.source.depth],
      opacity: 0.5
    }),
    nodeIDAccessor: "name",
    hoverAnnotation: "edge",
    networkType: {
      type,
      projection: projection,
      nodePadding: 1,
      forceManyBody: -15,
      edgeStrength: 1.5,
      padding: type === "treemap" ? 3 : type === "circlepack" ? 2 : 0,
      hierarchySum: d => d.blockCalls
    },
    tooltipContent: d => {
      return d.edge ? (
        <div className="tooltip-content">
          <p>{d.edge.source.name}</p>
          <p>{d.edge.target.name}</p>
        </div>
      ) : (
        <div className="tooltip-content">
          {d.parent ? <p>{d.parent.data.name}</p> : undefined}
          <p>{d.data.name}</p>
        </div>
      )
    },
    annotations: [
      {
        type: annotation === "rectangle" ? "enclose-rect" : "enclose",
        ids: [
          "identity",
          "linear",
          "pow",
          "category20",
          "category20",
          "log",
          "sqrt",
          "ordinal",
          "threshold",
          "quantize"
        ],
        label: "Scales",
        padding: 5,
        dy: -150,
        nx: 660
      }
    ],
    margin: 50
  }
  return (
    <div>
      <iframe
        title="dendrogram-video"
        width="560"
        height="315"
        src="https://www.youtube.com/embed/diE5ywpQNjU"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
      <ProcessViz frameSettings={hierarchicalChart} frameType="NetworkFrame" />
      <NetworkFrame {...hierarchicalChart} />
    </div>
  )
}
