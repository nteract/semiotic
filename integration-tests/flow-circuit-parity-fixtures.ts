import { flowCircuitChartProps } from "../src/components/recipes/atlas/flowCircuitChartProps"
import { flowCircuitStory } from "../src/components/recipes/atlas/flowCircuitStories"
import { flowCircuitGrammar } from "../src/components/recipes/atlas/flowCircuitGrammar"
import { readCircuitEdition } from "../src/components/recipes/atlas/flowCircuitTape"
import type {
  CircuitEdition,
  CircuitMode,
  FlowCircuitProjection
} from "../src/components/recipes/atlas/flowCircuitTypes"

export interface FlowCircuitEvidence {
  nodeCount: number
  edges: {
    id: string
    source: string
    target: string
    flow: string
    unit: string
  }[]
  modules: { id: string; kind: string; queued: string }[]
  kind: string
  time: number
  labels: string[]
}

// Source recipes, built public PhysicsCustomChart on both renderers. Keep the
// fixture free of source HOC imports so Playwright and Vite share pure layouts.
export function makeFlowCircuitParityCases() {
  const etl = flowCircuitStory("etl")
  const retry = flowCircuitStory("retry")
  const grammar = flowCircuitGrammar()
  const makeCase = (
    name: string,
    circuit: FlowCircuitProjection,
    edition: CircuitEdition,
    mode: CircuitMode,
    time: number,
    height: number,
    labels: string[]
  ) => {
    const reading = readCircuitEdition(edition, mode, time)
    return {
      id: `physics-custom-flow-circuit-${name}`,
      component: "PhysicsCustomChart",
      props: flowCircuitChartProps({
        circuit,
        edition,
        reading,
        width: 980,
        height,
        particleBudget: 12,
        placementSeed: 7
      }),
      circuitEvidence: {
        nodeCount: circuit.modules.length,
        edges: circuit.atlas.source.edges.map(({ id, source, target }) => {
          const flow = reading.entry.flows.find((item) => item.edgeId === id)!
          return {
            id,
            source,
            target,
            flow: String(flow.perSecond ?? "unmeasured"),
            unit: `${flow.unit}/s`
          }
        }),
        modules: circuit.modules.map((module) => ({
          id: module.nodeId,
          kind: module.kind,
          queued: String(
            reading.entry.nodes[module.nodeId].queued ?? "unmeasured"
          )
        })),
        kind: edition.kind,
        time: reading.observedAt,
        labels
      } satisfies FlowCircuitEvidence
    }
  }
  return [
    makeCase(
      "etl-observed",
      etl.circuit,
      etl.observed,
      "observed-snapshot",
      60,
      860,
      ["Queue 1.2m", "10k / 10k rec/s", "Partition 1"]
    ),
    makeCase(
      "etl-modeled",
      etl.circuit,
      etl.modeled,
      "modeled-scenario",
      60,
      860,
      ["Queue 0", "7.5k / 10k rec/s", "Partition 1"]
    ),
    makeCase(
      "retry-observed",
      retry.circuit,
      retry.observed,
      "observed-snapshot",
      60,
      430,
      ["30k att/s offered", "Queue unmeasured", "retry episode"]
    ),
    makeCase(
      "retry-replay",
      retry.circuit,
      retry.observed,
      "observed-replay",
      10,
      430,
      ["20k att/s offered", "Queue unmeasured", "retry episode"]
    ),
    makeCase(
      "retry-modeled",
      retry.circuit,
      retry.modeled,
      "modeled-scenario",
      60,
      430,
      ["12k att/s complete", "10k roots/s complete", "Queue unmeasured"]
    ),
    makeCase(
      "module-grammar",
      grammar.circuit,
      grammar.edition,
      "observed-snapshot",
      0,
      610,
      [
        "all-member join",
        "first success",
        "Requires a",
        "unclassified junction"
      ]
    )
  ]
}
