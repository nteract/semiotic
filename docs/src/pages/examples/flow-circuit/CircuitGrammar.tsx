import * as React from "react"
import { useMemo, useState } from "react"
import { flowCircuitGrammar } from "../../../../../src/components/recipes/atlas/flowCircuitGrammar"
import { FlowCircuitChart } from "../../../../../src/components/recipes/atlas/FlowCircuitChart"
import { readCircuitEdition } from "../../../../../src/components/recipes/atlas/flowCircuitTape"
import { CircuitInspector } from "./CircuitInspector"

export function CircuitGrammar({ width }: { width: number }) {
  const [declared, setDeclared] = useState(true)
  const [selected, setSelected] = useState("join")
  const [edges, setEdges] = useState<string[]>([])
  const { circuit, edition } = useMemo(() => flowCircuitGrammar(declared), [declared])
  const reading = readCircuitEdition(edition, "observed-snapshot", 0)
  return (
    <details className="flow-circuit__grammar">
      <summary>Explore the module grammar</summary>
      <p>
        A split and rejoin cannot establish an all-member or first-success rule. Toggle the declared
        rules to see the same graph become unclassified. Inspect parallel ports, the self-loop, and
        the backward return; none supply missing measurements.
      </p>
      <label>
        <input
          type="checkbox"
          checked={declared}
          onChange={(event) => setDeclared(event.target.checked)}
        />{" "}
        Declare join and selection rules
      </label>
      <p>
        All-member join: requires A and B. Selector: accepts the first success from A or B.
        Dependency gate: requires A separately from transported work. Completed members, winners,
        cancellations, blocked work and all rates remain unmeasured.
      </p>
      <div className="flow-circuit__charts" data-testid="circuit-grammar">
        <FlowCircuitChart
          circuit={circuit}
          edition={edition}
          reading={reading}
          width={width}
          height={610}
          reducedMotion
          particleBudget={0}
          highlightedEdgeIds={edges}
          onSelectNode={setSelected}
          selection={{
            nodeId: selected,
            analysisRevision: circuit.atlas.analysisRevision,
            relationScopeId: "directed-admitted",
          }}
        />
      </div>
      <CircuitInspector
        circuit={circuit}
        reading={reading}
        selected={selected}
        onSelect={setSelected}
        onSelectEdges={setEdges}
      />
    </details>
  )
}
