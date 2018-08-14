import React from "react"
import { OrdinalFrame } from "../../components"
import ProcessViz from "./ProcessViz"

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]
const data = [5, 8, 10, 15]
const data2 = [15, 8, 5, 10]

export default state => {
  const donutSettings = {
    size: [400, 400],
    data: state.changeData ? data2 : data,
    projection: "radial",
    style: (d, i) => ({
      fill: colors[i],
      stroke: "darkgray",
      strokeWidth: 1
    }),
    type: { type: "bar", innerRadius: +state.innerRadius },
    oLabel: true,
    margin: { left: 20, top: 20, bottom: 20, right: 20 },
    tooltipContent: "pie",
    hoverAnnotation: true
  }

  if (state.padding !== "0") {
    donutSettings.oPadding = +state.padding
  }

  if (state.kind !== "pie") {
    donutSettings.axis = {
      orient: "left",
      tickFormat: d => +(d * 10) / 10,
      label: { name: "Radial Label", locationDistance: 15 }
    }
  } else {
    donutSettings.rAccessor = () => 1
    donutSettings.dynamicColumnWidth = "value"
  }

  return (
    <div>
      <ProcessViz frameSettings={donutSettings} frameType="OrdinalFrame" />
      <OrdinalFrame {...donutSettings} />
    </div>
  )
}
