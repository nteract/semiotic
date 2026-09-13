import * as React from "react"
import { PhysicsCustomChart } from "../../charts/physics/PhysicsCustomChart"
import {
  flowCircuitChartProps,
  type FlowCircuitChartProps
} from "./flowCircuitChartProps"

export { flowCircuitChartProps }
export type { FlowCircuitChartProps }

/** NA4 source recipe: replay/model state lives in its admitted upstream tape. */
export function FlowCircuitChart(props: FlowCircuitChartProps) {
  const { key, ...chartProps } = flowCircuitChartProps(props)
  return (
    <PhysicsCustomChart
      key={key}
      {...chartProps}
      onClick={(datum) => {
        const id = datum?.id
        if (
          typeof id === "string" &&
          props.circuit.modules.some((module) => module.nodeId === id)
        )
          props.onSelectNode?.(id)
      }}
    />
  )
}
