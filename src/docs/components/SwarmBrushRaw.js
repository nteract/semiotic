import * as React from "react"
import { OrdinalFrame } from "../../components"
import ProcessViz from "./ProcessViz"
/*

*/

const settings = {
  size: [200, 700],
  rAccessor: d => d.value,
  oAccessor: () => "singleColumn",
  style: () => ({ fill: "#007190", stroke: "white", strokeWidth: 1 }),
  type: "swarm",
  summaryType: "violin",
  summaryStyle: () => ({
    fill: "#007190",
    stroke: "white",
    strokeWidth: 1
  }),
  projection: "vertical",
  axes: [
    { orient: "left" },
    { orient: "right", marginalSummaryType: "violin", showPoints: true }
  ],
  rExtent: [0, 100],
  margin: { left: 20, top: 0, bottom: 100, right: 50 },
  oPadding: 0
}

export default (data, event, resetExtent) => {
  const swarmBrushChart = {
    ...settings,
    data: data,
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
