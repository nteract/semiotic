import type {
  CircuitEdition,
  CircuitMode,
  CircuitReading,
  FlowCircuitProjection,
  CircuitSelection
} from "./flowCircuitTypes"

const rateKeys = ["arrivals", "completions", "capacity", "queued"] as const
const totalKeys = [
  ...rateKeys,
  "roots",
  "attempts",
  "retries",
  "successes",
  "errors"
] as const
const units = ["records", "roots", "attempts"]

/** Validate identity, measurement domains and tape order before any playback. */
export function admitCircuitEdition(
  circuit: FlowCircuitProjection,
  edition: CircuitEdition
) {
  if (
    edition.analysisRevision !== circuit.atlas.analysisRevision ||
    edition.sourceRevision !== circuit.atlas.provenance.sourceRevision
  )
    throw new Error("Circuit edition belongs to a different atlas revision")
  if (!edition.id || !edition.entries.length || !edition.assumptions.length)
    throw new Error(
      "Circuit editions need an identity, tape and declared assumptions"
    )
  if (
    !units.includes(edition.unit) ||
    !["observed", "modeled"].includes(edition.kind)
  )
    throw new Error("Circuit editions require a declared reading kind and unit")
  if ((edition.kind === "modeled") !== Boolean(edition.model))
    throw new Error("Modeled editions require separate model provenance")
  if (
    edition.model &&
    (!edition.model.id ||
      !edition.model.observedEditionId ||
      edition.model.observedEditionId === edition.id ||
      !edition.model.guardrails.length)
  )
    throw new Error("A model must name its observed edition and guardrails")
  const edges = new Set(circuit.atlas.source.edges.map((edge) => edge.id))
  const nodes = new Set(circuit.modules.map((module) => module.nodeId))
  const ids = new Set<string>()
  let previous = -Infinity
  for (const entry of edition.entries) {
    if (
      !Number.isFinite(entry.at) ||
      entry.at < 0 ||
      entry.at <= previous ||
      !entry.id ||
      ids.has(entry.id)
    )
      throw new Error(
        "Circuit tape needs unique IDs and strictly increasing nonnegative times"
      )
    previous = entry.at
    ids.add(entry.id)
    if (
      Object.keys(entry.nodes).length !== nodes.size ||
      Object.keys(entry.nodes).some((id) => !nodes.has(id)) ||
      Object.values(entry.nodes).some(
        (node) =>
          !["exact", "estimated", "unknown", "incomplete"].includes(node.status)
      )
    )
      throw new Error(
        "Every tape event must declare every canonical node reading"
      )
    if (
      entry.flows.length !== edges.size ||
      new Set(entry.flows.map((flow) => flow.edgeId)).size !== edges.size ||
      entry.flows.some(
        (flow) => !edges.has(flow.edgeId) || !units.includes(flow.unit)
      )
    )
      throw new Error(
        "Every tape event must retain every original edge, with null for unmeasured flow"
      )
    const values = [
      ...totalKeys.map((key) => entry.totals[key]),
      ...Object.values(entry.nodes).flatMap((reading) =>
        rateKeys.map((key) => reading[key])
      ),
      ...entry.flows.map((flow) => flow.perSecond)
    ]
    if (
      values.some(
        (value) => value !== null && (!Number.isFinite(value) || value < 0)
      )
    )
      throw new Error(
        "Circuit measurements must be nonnegative finite numbers or null"
      )
  }
  return edition
}

/** A cursor reads the tape. It never integrates physics time or invents samples. */
export function readCircuitEdition(
  edition: CircuitEdition,
  mode: CircuitMode,
  time: number
): CircuitReading {
  if (!Number.isFinite(time)) throw new Error("Circuit time must be finite")
  if (
    !edition.entries.length ||
    !["observed-snapshot", "observed-replay", "modeled-scenario"].includes(mode)
  )
    throw new Error(
      "Circuit reading needs a nonempty tape and a supported mode"
    )
  if ((mode === "modeled-scenario") !== (edition.kind === "modeled"))
    throw new Error(
      "Observed and modeled reading modes cannot share an edition"
    )
  const first = edition.entries[0]
  const last = edition.entries[edition.entries.length - 1]
  let entry = first
  for (const event of edition.entries) {
    if (event.at > time) break
    entry = event
  }
  return {
    editionId: edition.id,
    kind: edition.kind,
    mode,
    requestedTime: time,
    observedAt: entry.at,
    entry,
    status:
      edition.timing === "incomplete" ||
      time < first.at ||
      time > last.at ||
      Object.values(entry.nodes).some((node) => node.status !== "exact")
        ? "incomplete"
        : "exact"
  }
}

export function exportCircuitEvidence(
  circuit: FlowCircuitProjection,
  edition: CircuitEdition,
  reading: CircuitReading,
  selection?: CircuitSelection
) {
  admitCircuitEdition(circuit, edition)
  if (reading.editionId !== edition.id)
    throw new Error("Reading and edition differ")
  const sampled = readCircuitEdition(
    edition,
    reading.mode,
    reading.requestedTime
  )
  if (
    reading.entry.id !== sampled.entry.id ||
    reading.kind !== sampled.kind ||
    reading.observedAt !== sampled.observedAt
  )
    throw new Error("Reading does not match the admitted tape cursor")
  return {
    synthetic: edition.synthetic,
    sourceRevision: edition.sourceRevision,
    analysisRevision: edition.analysisRevision,
    relationScopeId: "directed-admitted",
    selection:
      selection?.analysisRevision === edition.analysisRevision &&
      selection.relationScopeId === "directed-admitted" &&
      circuit.modules.some((module) => module.nodeId === selection.nodeId)
        ? selection
        : undefined,
    // Reattach the admitted event so exported counts cannot be replaced by a
    // caller-supplied copy of a reading with the same event identity.
    reading: sampled,
    edition,
    overlapPolicy: circuit.overlapPolicy,
    modules: circuit.modules,
    originalEdges: circuit.atlas.source.edges,
    backboneEdgeIds: circuit.backboneEdgeIds,
    residualEdgeIds: circuit.residualEdgeIds,
    matches: circuit.matches,
    requiredPaths: circuit.atlas.requiredPaths,
    limitations: [
      "Aggregate interval tape; individual routing and service times are unavailable.",
      "Particles are direction cues, not analytical jobs or completion events.",
      "Geometry, particle budget, seed and frame rate do not change the ledger."
    ]
  }
}
