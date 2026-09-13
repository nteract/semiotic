"use client"
import * as React from "react"
import { PhysicsCustomChart } from "../../charts/physics/PhysicsCustomChart"
import { useSelection } from "../../store/useSelection"
import {
  flowCircuitChartProps,
  type FlowCircuitChartProps
} from "./flowCircuitChartProps"

export { flowCircuitChartProps }
export type { FlowCircuitChartProps }

/**
 * Flow Circuit reader: replay/model state lives in its admitted upstream tape.
 *
 * @example
 * import { FlowCircuitChart } from "semiotic/atlas"
 * import { readCircuitEdition } from "semiotic/atlas/core"
 * const reading = readCircuitEdition(edition, "observed-replay", 60)
 * <FlowCircuitChart circuit={circuit} edition={edition} reading={reading} />
 *
 * @example
 * import { renderChartWithEvidence } from "semiotic/server"
 * const { svg, evidence } = renderChartWithEvidence("FlowCircuitChart", {
 *   circuit, edition, reading, title: "Observed process", reducedMotion: true
 * })
 */
export function FlowCircuitChart(props: FlowCircuitChartProps) {
  const linked = useSelection({
    name: props.linkedSelection?.name ?? "__atlas_unused__",
    fields: ["nodeId"]
  })
  const { key, ...chartProps } = flowCircuitChartProps({
    ...props,
    layoutSelection:
      props.linkedSelection && linked.isActive ? linked : props.layoutSelection
  })
  const selectNode = (id: unknown) => {
    if (
      typeof id === "string" &&
      props.circuit.modules.some((module) => module.nodeId === id)
    )
      props.onSelectNode?.(id)
  }
  return (
    <PhysicsCustomChart
      key={key}
      {...chartProps}
      onClick={(datum) => selectNode(datum?.id)}
      frameProps={{
        ...props.frameProps,
        onSemanticItemActivate: (item) => {
          if (item.bodyId) selectNode(item.bodyId)
          props.frameProps?.onSemanticItemActivate?.(item)
        }
      }}
    />
  )
}
