import * as React from "react"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import {
  dependencyForestChartProps,
  type DependencyForestChartProps
} from "./dependencyForestChartProps"

export { dependencyForestChartProps }
export type { DependencyForestChartProps }

/** NA3 recipe; graph preparation belongs outside the rendering callback. */
export function DependencyForestChart(props: DependencyForestChartProps) {
  return (
    <NetworkCustomChart
      {...dependencyForestChartProps(props)}
      onClick={(observation) => {
        const id = observation?.datum?.id
        if (
          typeof id === "string" &&
          props.forest.atlas.source.nodes.some((node) => node.id === id)
        ) {
          props.onSelectNode?.(id)
        }
      }}
    />
  )
}
