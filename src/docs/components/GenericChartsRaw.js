import React from "react"
import { scaleLinear } from "d3-scale"
import { ORFrame, XYFrame, NetworkFrame } from "../../components"
import { testData } from "../example_settings/xyframe"
import { funnelData } from "../example_settings/orframe"
import { edgeData } from "../example_settings/networkframe"

const lineType = Math.random() < 0.5 ? "stackedarea" : "line"

export const genericLineChart = (
  <XYFrame
    size={[500, 500]}
    lines={testData}
    lineDataAccessor={"data"}
    xAccessor={"px"}
    yAccessor={"py"}
    lineStyle={d => ({
      fill: d.color,
      fillOpacity: 0.5,
      stroke: d.color,
      strokeWidth: "3px"
    })}
    pointStyle={d => ({
      fill: d.parentLine.color,
      fillOpacity: 1,
      stroke: d.parentLine.color,
      strokeWidth: 3
    })}
    lineType={lineType}
    showLinePoints={lineType === "line" && Math.random() < 0.5 ? true : false}
    canvasLines={true}
    axes={[{ orient: "left" }, { orient: "bottom" }]}
    margin={0}
  />
)

export const genericBarChart = (
  <ORFrame
    size={[500, 500]}
    data={funnelData}
    oAccessor={"stepName"}
    rAccessor={"stepValue"}
    type={Math.random() < 0.5 ? "clusterbar" : "bar"}
    projection={"horizontal"}
    axis={{ orient: "left" }}
    oPadding={10}
    style={d => ({ fill: d.funnelKey, stroke: "black" })}
  />
)

const edgeType = Math.random() < 0.5 ? "halfarrow" : "linearc"

export const genericNetworkChart = (
  <NetworkFrame
    size={[750, 500]}
    edges={edgeData}
    edgeStyle={() => ({
      stroke: "#4d430c",
      fill: edgeType === "halfarrow" ? "#4d430c" : "none",
      fillOpacity: 0.25,
      strokeWidth: "1px"
    })}
    nodeStyle={d => ({
      fill: d.createdByFrame ? "#1aa962" : "rgb(179, 51, 29)"
    })}
    edgeType={edgeType}
    nodeSizeAccessor={d => d.degree + 2}
    zoomToFit={true}
  />
)
