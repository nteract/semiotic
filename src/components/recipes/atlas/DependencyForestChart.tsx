"use client"
import * as React from "react"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import {
  dependencyForestChartProps,
  type DependencyForestChartProps
} from "./dependencyForestChartProps"

export { dependencyForestChartProps }
export type { DependencyForestChartProps }

/**
 * Dependency reader; graph preparation belongs outside the rendering callback.
 *
 * @example
 * import { DependencyForestChart } from "semiotic/atlas"
 * import { prepareDependencyForest } from "semiotic/atlas/core"
 * const forest = prepareDependencyForest(atlas)
 * <DependencyForestChart forest={forest} reading="required-paths" />
 *
 * @example
 * import { renderChartWithEvidence } from "semiotic/server"
 * const { svg, evidence } = renderChartWithEvidence("DependencyForestChart", {
 *   forest, reading: "organize", title: "Original supply paths"
 * })
 */
export function DependencyForestChart(props: DependencyForestChartProps) {
  return (
    <NetworkCustomChart
      {...dependencyForestChartProps(props)}
      onClick={(datum) => {
        const id = datum?.id
        if (
          datum?.kind === "dependency-node" &&
          typeof id === "string" &&
          props.forest.atlas.source.nodes.some((node) => node.id === id)
        ) {
          props.onSelectNode?.(id)
        }
      }}
    />
  )
}
