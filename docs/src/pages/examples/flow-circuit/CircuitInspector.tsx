import * as React from "react"
import { useMemo } from "react"
import { DependencyMatrix } from "../../../../../src/components/recipes/atlas/DependencyMatrix"
import { prepareDependencyForest } from "../../../../../src/components/recipes/atlas/dependencyForest"
import { explainCircuitModule } from "../../../../../src/components/recipes/atlas/flowCircuit"
import { getRequiredPaths } from "../../../../../src/components/recipes/atlas/dependencyQueries"
import type {
  FlowCircuitProjection,
  CircuitReading,
  CircuitEdition,
} from "../../../../../src/components/recipes/atlas/flowCircuitTypes"

export const fullNumber = (value: number | null) =>
  value === null ? "Unmeasured" : value.toLocaleString("en-US", { maximumFractionDigits: 0 })

export function CircuitTotalsTable({
  observed,
  modeled,
  unit,
}: {
  observed: CircuitReading
  modeled?: CircuitReading
  unit: "records" | "attempts"
}) {
  const metrics =
    unit === "records"
      ? ([
          ["arrivals", "Arrivals (records/s)"],
          ["completions", "Completions (records/s)"],
          ["capacity", "Installed capacity (records/s)"],
          ["queued", "Queued records"],
        ] as const)
      : ([
          ["roots", "External roots/s"],
          ["attempts", "Offered attempts/s"],
          ["retries", "Retry attempts/s"],
          ["successes", "Successful roots/s"],
          ["errors", "Failed roots/s"],
          ["queued", "Queued attempts"],
        ] as const)
  return (
    <table className="flow-circuit__totals" aria-label="Observed and modeled readings">
      <caption>Rates describe an interval; queue counts describe its observation time.</caption>
      <thead>
        <tr>
          <th scope="col">Measure</th>
          <th scope="col">Observed</th>
          {modeled && <th scope="col">Modeled</th>}
        </tr>
      </thead>
      <tbody>
        {metrics.map(([metric, label]) => (
          <tr key={metric}>
            <th scope="row">{label}</th>
            <td data-testid={`observed-${metric}`}>{fullNumber(observed.entry.totals[metric])}</td>
            {modeled && (
              <td data-testid={`modeled-${metric}`}>{fullNumber(modeled.entry.totals[metric])}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function CircuitInspector({
  circuit,
  reading,
  selected,
  onSelect,
  onSelectEdges,
}: {
  circuit: FlowCircuitProjection
  reading: CircuitReading
  selected: string
  onSelect: (id: string) => void
  onSelectEdges: (ids: string[]) => void
}) {
  const forest = useMemo(() => prepareDependencyForest(circuit.atlas), [circuit])
  const detail = explainCircuitModule(circuit, selected)
  const node = reading.entry.nodes[selected]
  const neighbors = new Set([selected, ...detail.ports.map((port) => port.endpointId)])
  const ids = circuit.order.filter((id) => neighbors.has(id))
  const required = getRequiredPaths(circuit.atlas, selected)
  return (
    <section className="flow-circuit__inspector" aria-label="Module and original-edge inspector">
      <div>
        <h2>Inspect the apparatus</h2>
        <label>
          Module{" "}
          <select value={selected} onChange={(event) => onSelect(event.target.value)}>
            {circuit.modules.map((module) => (
              <option key={module.id} value={module.nodeId}>
                {module.semantics.label}
              </option>
            ))}
          </select>
        </label>
        <p>
          {detail.semantics.label}: <strong>{detail.kind.replaceAll("-", " ")}</strong>.
        </p>
        <p data-testid="selected-module-reading">
          Arrivals {fullNumber(node.arrivals)}; completions {fullNumber(node.completions)}; capacity{" "}
          {fullNumber(node.capacity)} {detail.semantics.unit}/s. Queue: {fullNumber(node.queued)}{" "}
          {detail.semantics.unit}.
        </p>
        <p>
          Recognized patterns:{" "}
          {[...new Set(detail.matches.map((match) => match.template.replaceAll("-", " ")))].join(
            ", ",
          ) || "none admitted"}
          . Overlapping patterns share this module's work.
        </p>
        <p>
          Required upstream in the admitted graph:{" "}
          {required.value?.dominatorIds.join(", ") ||
            (required.status === "exact" ? "none" : "unknown")}
          .
          {required.status !== "exact" &&
            " Upstream coverage is incomplete; this cannot establish independence."}
        </p>
        <ul>
          {detail.originalEdges.map((edge) => (
            <li key={edge.id}>
              <button type="button" onClick={() => onSelectEdges([edge.id])}>
                {edge.source} → {edge.target} <small>({edge.id})</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Original neighborhood</h2>
        <DependencyMatrix forest={forest} nodeIds={ids} onSelectEdges={onSelectEdges} />
        <p>Cells retain original edges. Parallel links and returns remain separate evidence.</p>
      </div>
    </section>
  )
}

export function CircuitAssumptions({
  edition,
  dictionary,
}: {
  edition: CircuitEdition
  dictionary: Record<string, string>
}) {
  return (
    <details className="flow-circuit__assumptions">
      <summary>Data dictionary and assumptions</summary>
      <dl>
        {Object.entries(dictionary).map(([term, meaning]) => (
          <React.Fragment key={term}>
            <dt>{term}</dt>
            <dd>{meaning}</dd>
          </React.Fragment>
        ))}
      </dl>
      <ul>
        {edition.assumptions.map((assumption) => (
          <li key={assumption}>{assumption}</li>
        ))}
      </ul>
      <p>
        Source: {edition.evidenceRefs.join(", ")}. The supplied tape contains aggregate
        observations; it cannot recover individual service times.
      </p>
    </details>
  )
}
