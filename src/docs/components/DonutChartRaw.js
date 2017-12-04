import React from "react"
import { ORFrame } from "../../components"

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]
const data = [5, 8, 10, 15]

export default state => (
  <ORFrame
    size={[400, 400]}
    data={data}
    projection={"radial"}
    style={(d, i) => ({ fill: colors[i], stroke: "darkgray", strokeWidth: 1 })}
    type={{ type: "bar", innerRadius: parseInt(state.innerRadius) }}
    oLabel={true}
    dynamicColumnWidth={state.kind === "pie" ? "value" : undefined}
    rAccessor={state.kind === "pie" ? () => 1 : d => d.value}
    margin={{ left: 20, top: 20, bottom: 20, right: 20 }}
    oPadding={parseInt(state.padding)}
    axis={
      state.kind === "pie" ? (
        undefined
      ) : (
        {
          orient: "left",
          tickFormat: d => parseInt(d * 10) / 10,
          label: { name: "Radial Label", locationDistance: 15 }
        }
      )
    }
  />
)
