import React from "react"
import { OrdinalFrame } from "../../components"
import ProcessViz from "./ProcessViz"
/*

*/

export default (data, event, resetExtent) => {
  const swarmBrushChart = {
    size: [700, 200],
    data: data,
    rAccessor: d => d.value,
    oAccessor: () => "singleColumn",
    style: (d, i) => ({ fill: "#007190", stroke: "white", strokeWidth: 1 }),
    type: "swarm",
    summaryType: "violin",
    summaryStyle: (d, i) => ({
      fill: "#007190",
      stroke: "white",
      strokeWidth: 1
    }),
    projection: "horizontal",
    axis: { orient: "left" },
    rExtent: [0, 100],
    margin: { left: 20, top: 0, bottom: 50, right: 20 },
    oPadding: 0,
    interaction: {
      columnsBrush: true,
      extent: { singleColumn: resetExtent },
      end: event
    }
  }

  return (
    <div>
      <ProcessViz frameSettings={swarmBrushChart} frameType="OrdinalFrame" />
      <OrdinalFrame {...swarmBrushChart} />
    </div>
  )
}
