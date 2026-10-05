import { contentId, compareIds } from "./identity"
import { indexGraph, type GraphIndex } from "./indexGraph"
import type { OwnershipBuilder } from "./ownership"
import type {
  Coverage,
  EdgeAlternative,
  PreparedNetworkResolution,
  QueryEnvelope,
  ResolutionPage,
  RuleSpec,
  StructuralWitness
} from "./types"

export interface PathSearch {
  verdict: "yes" | "no" | "unknown"
  witness?: StructuralWitness
  coverage: Coverage
}

/** Bounded BFS. Output limits and unfinished exploration never produce negative claims. */
export function searchPath(
  graph: GraphIndex,
  start: string,
  end: string,
  scopeId: string,
  limits: { maxWitnessEdges: number; maxExploredEdges?: number },
  admits: (edgeId: string, source: string, target: string) => boolean = () =>
    true
): PathSearch {
  const parent = new Map<string, { node: string; edge: string }>()
  const seen = new Set([start]),
    queue = [start]
  let examined = 0
  if (!graph.outgoing.has(start) || !graph.outgoing.has(end))
    return {
      verdict: "unknown",
      coverage: { status: "unknown", reason: "missing-endpoint" }
    }
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]
    if (current === end) {
      const nodeIds = [end],
        edgeIds: string[] = []
      let node = end
      while (node !== start) {
        const previous = parent.get(node)!
        edgeIds.push(previous.edge)
        nodeIds.push(previous.node)
        node = previous.node
      }
      if (edgeIds.length > limits.maxWitnessEdges)
        return {
          verdict: "unknown",
          coverage: {
            status: "truncated",
            reason: "witness-output-budget",
            examined
          }
        }
      return {
        verdict: "yes",
        witness: {
          kind: "structural-path",
          nodeIds: nodeIds.reverse(),
          edgeIds: edgeIds.reverse(),
          scopeId
        },
        coverage: { status: "complete", examined }
      }
    }
    for (const edge of graph.outgoing.get(current)!) {
      if (examined >= (limits.maxExploredEdges ?? Infinity))
        return {
          verdict: "unknown",
          coverage: {
            status: "truncated",
            reason: "exploration-budget",
            examined
          }
        }
      examined++
      if (!admits(edge.id, edge.source, edge.target) || seen.has(edge.target))
        continue
      seen.add(edge.target)
      parent.set(edge.target, { node: current, edge: edge.id })
      queue.push(edge.target)
    }
  }
  return { verdict: "no", coverage: { status: "complete", examined } }
}

export function getEdgeAlternative(
  resolution: PreparedNetworkResolution,
  edgeId: string
): QueryEnvelope<EdgeAlternative> {
  const edge = resolution.source.edges.find((e) => e.id === edgeId)
  const result: PathSearch = edge
    ? searchPath(
        indexGraph(resolution.source),
        edge.source,
        edge.target,
        resolution.spec.relationScopeId,
        resolution.spec.limits,
        (id) => id !== edgeId
      )
    : {
        verdict: "unknown",
        coverage: { status: "unknown", reason: "missing-edge" }
      }
  return {
    revision: resolution.revision,
    analysisRevision: resolution.analysisRevision,
    scopeId: resolution.spec.relationScopeId,
    coverage: result.coverage,
    limitations: [
      "Edge-exclusion reachability does not establish traffic, capacity, or operational equivalence"
    ],
    value: {
      originalEdgeId: edgeId,
      verdict: result.verdict,
      ...(result.witness && { witness: result.witness })
    }
  }
}

/** Remove relations on the whole simple SCC DAG, then certify against the retained reading. */
export function applyTransitiveReading(
  value: PreparedNetworkResolution,
  builder: OwnershipBuilder,
  page: ResolutionPage,
  fromPageId: string,
  rule: Extract<RuleSpec, { kind: "annotate-dag-transitivity" }>
): void {
  const graph = builder.graph
  const semantics = new Map(value.edgeSemantics.map((s) => [s.edgeId, s]))
  const keys = new Set(graph.edges.map((e) => builder.relationKey(e.id)))
  const allowed =
    keys.size <= 1 &&
    graph.edges.every((e) => semantics.get(e.id)?.reachabilitySubduingAllowed)
  if (!allowed) {
    page.coverage = {
      status: "unsupported",
      reason: "heterogeneous-or-unlicensed-reachability-semantics"
    }
    value.issues.push({
      code: "transitivity-semantics",
      severity: "warning",
      message:
        "Transitive reading requires homogeneous, explicitly licensed reachability semantics",
      subjectIds: []
    })
    value.events.push({
      id: contentId("event", [page.id, rule, "unsupported"]),
      fromPageId,
      toPageId: page.id,
      action: "rejected",
      rule,
      featureIds: [],
      beforeGroupIds: [],
      afterGroupIds: [],
      affectedEdges: builder.sets.add("edge", []),
      reason: "heterogeneous-or-unlicensed-reachability-semantics",
      claims: []
    })
    return
  }
  const owner = new Map(
    graph.components.flatMap((members, i) =>
      members.map((node) => [node, String(i)] as const)
    )
  )
  const relations = new Map<
    string,
    { id: string; source: string; target: string }
  >()
  for (const edge of graph.edges) {
    const source = owner.get(edge.source)!,
      target = owner.get(edge.target)!
    if (source !== target) {
      const id = JSON.stringify([source, target])
      relations.set(id, { id, source, target })
    }
  }
  const dag = indexGraph({
    nodes: graph.components.map((_, i) => ({ id: String(i) })),
    edges: [...relations.values()]
  })
  const retained = new Set(relations.keys()),
    removed = new Set<string>()
  let remaining = value.spec.limits.maxExploredEdges ?? 100000
  for (const relation of [...relations.values()].sort((a, b) =>
    compareIds(a.id, b.id)
  )) {
    const result = searchPath(
      dag,
      relation.source,
      relation.target,
      value.spec.relationScopeId,
      { ...value.spec.limits, maxExploredEdges: remaining },
      (id) => id !== relation.id && retained.has(id)
    )
    remaining = Math.max(0, remaining - (result.coverage.examined ?? 0))
    if (result.verdict === "unknown") {
      page.coverage = result.coverage
      break
    }
    if (result.verdict === "yes" && result.witness!.edgeIds.length >= 2) {
      retained.delete(relation.id)
      removed.add(relation.id)
    }
  }
  // A witness may use internal SCC edges and only retained inter-SCC relations.
  for (const edge of graph.edges) {
    if (
      !removed.has(
        JSON.stringify([owner.get(edge.source), owner.get(edge.target)])
      )
    )
      continue
    const result = searchPath(
      graph,
      edge.source,
      edge.target,
      value.spec.relationScopeId,
      { ...value.spec.limits, maxExploredEdges: remaining },
      (_id, from, to) =>
        owner.get(from) === owner.get(to) ||
        retained.has(JSON.stringify([owner.get(from), owner.get(to)]))
    )
    remaining = Math.max(0, remaining - (result.coverage.examined ?? 0))
    if (result.verdict !== "yes") {
      page.coverage = result.coverage
      continue
    }
    const witnessId = contentId("witness", [
      value.analysisRevision,
      rule,
      edge.id,
      result.witness
    ])
    value.witnesses.push({ id: witnessId, value: result.witness! })
    value.events.push({
      id: contentId("event", [page.id, rule, edge.id]),
      fromPageId,
      toPageId: page.id,
      action: "subdued",
      rule,
      featureIds: [],
      beforeGroupIds: [],
      afterGroupIds: [],
      affectedEdges: builder.sets.add("edge", [edge.id]),
      reason: "Direct relation also has an indirect structural path",
      claims: [
        {
          property: "scoped-reachability",
          scopeId: value.spec.relationScopeId,
          status: "checked",
          witnessIds: [witnessId],
          limitations: [
            "Reachability only; the direct source edge remains real and owned",
            "Witness uses retained SCC-condensation relations"
          ]
        }
      ]
    })
  }
}
