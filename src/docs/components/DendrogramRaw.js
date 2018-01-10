import React from "react"
import { NetworkFrame } from "../../components"
import { data } from "../sampledata/d3_api"
import { scaleLinear } from "d3-scale"

const colors = ["#00a2ce", "#b6a756", "#4d430c", "#b3331d"]

export default ({
  annotation = "rectangle",
  type = "dendrogram",
  projection
}) => {
  const sizeScale = scaleLinear()
    .domain([0, 1000])
    .range([1, 10])
    .clamp(true)

  return (
    <NetworkFrame
      title={"D3v3 API"}
      size={[700, 700]}
      edges={data}
      nodeStyle={(d, i) => ({
        fill: colors[d.depth],
        stroke: "black",
        strokeOpacity: 0.25,
        fillOpacity: 0.25
      })}
      edgeStyle={(d, i) => ({
        fill: colors[d.source.depth],
        stroke: colors[d.source.depth],
        opacity: 0.5
      })}
      nodeIDAccessor={"name"}
      hoverAnnotation={true}
      networkType={{
        type,
        projection: projection,
        nodePadding: 1,
        forceManyBody: -15,
        edgeStrength: 1.5,
        padding: type === "treemap" ? 3 : type === "circlepack" ? 2 : 0,
        hierarchySum: d => d.blockCalls
      }}
      tooltipContent={d => (
        <div className="tooltip-content">
          {d.parent ? <p>{d.parent.data.name}</p> : undefined}
          <p>{d.data.name}</p>
        </div>
      )}
      annotations={[
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
      ]}
      margin={50}
    />
  )
}
