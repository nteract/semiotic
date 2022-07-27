import * as React from "react"
import { OrdinalFrame } from "../../components"

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]
const data = [5, 8, 10, 15]
const data2 = [15, 8, 5, 10]
const data3 = [
  { x: 0, y: 150 },
  { x: 1, y: 115698 }
]

export default (state) => {
  const donutSettings = {
    size: [600, 400],
    data: state.changeData ? data2 : data,
    projection: "radial",
    style: (d, i) => ({
      fill: colors[i],
      stroke: "darkgray",
      strokeWidth: 1
    }),
    type: { type: "bar", innerRadius: +state.innerRadius },
    oLabel: {
      orient: "stem",
      labelFormatter: (d) => (
        <div>
          <tspan>Hey</tspan>
          <tspan x="0" y="16">
            Hey
          </tspan>
          <tspan x="0" y="32">
            {d}
          </tspan>
        </div>
      )
    },
    margin: { left: 100, top: 100, bottom: 100, right: 100 },
    tooltipContent: "pie",
    hoverAnnotation: true
  }

  if (state.padding !== "0") {
    donutSettings.oPadding = +state.padding
  }

  if (state.kind !== "pie") {
    donutSettings.axes = {
      orient: "left",
      tickFormat: (d) => +(d * 10) / 10,
      label: { name: "Radial Label", locationDistance: 15 }
    }
  } else {
    donutSettings.rAccessor = () => 1
    donutSettings.dynamicColumnWidth = "value"
  }

  return (
    <div>
      <OrdinalFrame {...donutSettings} />
      <OrdinalFrame
        {...donutSettings}
        oAccessor={"x"}
        rAccessor={() => 1}
        dynamicColumnWidth={"y"}
        data={data3}
      />
    </div>
  )
}
