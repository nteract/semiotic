import { createElement } from "react"
import {
  MotifBraidChart,
  DependencyForestChart,
  FlowCircuitChart,
  DependencyMatrix
} from "semiotic/atlas"
import type {
  MotifBraidChartProps,
  DependencyForestChartProps,
  FlowCircuitChartProps
} from "semiotic/atlas"
import {
  prepareNetworkAtlas,
  prepareDependencyForest,
  prepareFlowCircuit,
  admitCircuitEdition,
  readCircuitEdition
} from "semiotic/atlas/core"
import type {
  NetworkAtlasSpec,
  NetworkAtlasSource,
  CircuitNodeSemantics,
  CircuitEdition
} from "semiotic/atlas/core"
import { renderChartWithEvidence } from "semiotic/server"

export function publicAtlasReaders(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource,
  semantics: CircuitNodeSemantics[],
  tape: CircuitEdition
) {
  const result = prepareNetworkAtlas(spec, source)
  if (!result.ok) return result.issues
  const atlas = result.atlas
  const forest = prepareDependencyForest(atlas)
  const circuit = prepareFlowCircuit(atlas, semantics)
  const edition = admitCircuitEdition(circuit, tape)
  const reading = readCircuitEdition(
    edition,
    edition.kind === "modeled" ? "modeled-scenario" : "observed-replay",
    60
  )
  const braidProps: MotifBraidChartProps = {
    atlas,
    title: "Journeys",
    accessibleTable: true
  }
  const forestProps: DependencyForestChartProps = {
    forest,
    reading: "required-paths",
    onSelectNode: (id) => console.log(id)
  }
  const circuitProps: FlowCircuitChartProps = {
    circuit,
    edition,
    reading,
    linkedSelection: { name: "vertices" },
    reducedMotion: true
  }
  return {
    braid: createElement(MotifBraidChart, braidProps),
    forest: createElement(DependencyForestChart, forestProps),
    circuit: createElement(FlowCircuitChart, circuitProps),
    matrix: createElement(DependencyMatrix, { forest, nodeIds: forest.order }),
    svg: renderChartWithEvidence("FlowCircuitChart", circuitProps)
  }
}
