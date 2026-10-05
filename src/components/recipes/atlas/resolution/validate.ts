import type { PreparedNetworkAtlas } from "../types"
import type { Issue, ResolutionBindings, ResolutionSpec } from "./types"

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
const id = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0

/** Validate the JSON boundary before any graph indexing or derived publication. */
export function validateResolution(
  atlas: PreparedNetworkAtlas,
  spec: ResolutionSpec,
  bindings: ResolutionBindings
): Issue[] {
  const issues: Issue[] = []
  const fail = (code: string, message: string, subjectIds: string[] = []) => {
    issues.push({ code, message, subjectIds, severity: "fatal" })
  }
  if (
    !record(atlas) ||
    !record(atlas.source) ||
    !record(atlas.spec) ||
    !record(atlas.provenance) ||
    !Array.isArray(atlas.source.nodes) ||
    !Array.isArray(atlas.source.edges)
  ) {
    fail(
      "atlas-shape",
      "Expected a prepared atlas with admitted nodes and edges"
    )
    return issues
  }
  if (
    atlas.spec.schemaVersion !== "0.2" ||
    atlas.spec.temporal?.kind !== "snapshot" ||
    atlas.spec.relations?.directed !== true ||
    atlas.spec.relations.parallelEdges !== "keep-by-id" ||
    atlas.spec.relations.selfLoops !== "keep-by-id"
  )
    fail(
      "atlas-contract",
      "Resolution requires a directed schema 0.2 static snapshot retaining edge IDs"
    )
  if (
    !id(atlas.source.graphRef) ||
    !id(atlas.source.revision) ||
    !id(atlas.analysisRevision) ||
    !id(atlas.spec.evidencePolicyId) ||
    atlas.sourceGraphRef !== atlas.source.graphRef ||
    atlas.provenance.sourceRevision !== atlas.source.revision ||
    atlas.provenance.analysisRevision !== atlas.analysisRevision ||
    atlas.spec.dataRevision !== atlas.source.revision ||
    atlas.provenance.evidencePolicyId !== atlas.spec.evidencePolicyId
  ) {
    fail("stale-atlas", "Atlas source and analysis references must agree")
  }
  const nodes = new Set<string>(),
    edges = new Set<string>()
  for (const node of atlas.source.nodes) {
    if (!record(node) || !id(node.id)) {
      fail("node-id", "Every node needs a nonempty string ID")
      continue
    }
    if (nodes.has(node.id))
      fail("duplicate-node", "Duplicate node ID", [node.id])
    nodes.add(node.id)
    if (node.sectionId !== undefined && !id(node.sectionId))
      fail("section-id", "Section IDs must be strings", [node.id])
  }
  for (const edge of atlas.source.edges) {
    if (!record(edge) || !id(edge.id)) {
      fail("edge-id", "Every edge needs a nonempty string ID")
      continue
    }
    if (edges.has(edge.id))
      fail("duplicate-edge", "Duplicate edge ID", [edge.id])
    edges.add(edge.id)
    if (!nodes.has(edge.source) || !nodes.has(edge.target))
      fail("dangling-edge", "Edge endpoints must be admitted nodes", [edge.id])
  }
  const occurrenceIds = new Set<string>()
  const pairs = new Set(
    atlas.source.edges
      .filter((edge) => record(edge))
      .map((edge) => JSON.stringify([edge.source, edge.target]))
  )
  if (
    atlas.source.occurrences !== undefined &&
    !Array.isArray(atlas.source.occurrences)
  )
    fail("occurrences", "Occurrences must be an array when present")
  else
    for (const occurrence of atlas.source.occurrences ?? []) {
      if (
        !record(occurrence) ||
        !id(occurrence.id) ||
        occurrenceIds.has(occurrence.id) ||
        !Array.isArray(occurrence.nodePath) ||
        typeof occurrence.complete !== "boolean" ||
        occurrence.nodePath.some(
          (node, i) =>
            !nodes.has(node) ||
            (i > 0 &&
              !pairs.has(JSON.stringify([occurrence.nodePath[i - 1], node])))
        )
      ) {
        fail(
          "occurrence",
          "Occurrences need unique IDs and contiguous admitted node paths with declared completeness"
        )
      } else occurrenceIds.add(occurrence.id)
    }
  if (
    !record(spec) ||
    spec.schemaVersion !== "0.1" ||
    !id(spec.id) ||
    !id(spec.relationScopeId) ||
    !Array.isArray(spec.rules) ||
    !Array.isArray(spec.pins) ||
    !record(spec.limits)
  ) {
    fail(
      "spec-shape",
      "Expected resolution schema 0.1, IDs, rules, pins, and limits"
    )
    return issues
  }
  for (const name of [
    "maxPages",
    "maxCandidates",
    "maxWitnessEdges",
    "maxExploredEdges"
  ] as const) {
    const value = spec.limits[name]
    if (name === "maxExploredEdges" && value === undefined) continue
    if (!Number.isSafeInteger(value) || value! < (name === "maxPages" ? 1 : 0))
      fail(
        "limit",
        `${name} must be a nonnegative safe integer (maxPages at least 1)`
      )
  }
  if (
    spec.pageRuleCounts !== undefined &&
    (!Array.isArray(spec.pageRuleCounts) ||
      spec.pageRuleCounts.some(
        (count) => !Number.isSafeInteger(count) || count < 1
      ) ||
      spec.pageRuleCounts.reduce((sum, count) => sum + count, 0) !==
        spec.rules.length)
  ) {
    fail(
      "page-rules",
      "Page rule counts must be positive integers summing to rules.length"
    )
  }
  for (const pin of spec.pins) {
    if (
      !record(pin) ||
      !nodes.has(pin.nodeId) ||
      !["keep-visible", "keep-label"].includes(pin.kind)
    )
      fail("pin", "Pin must name an admitted node and pin kind")
  }
  const kinds = [
    "fold-serial-interiors",
    "fold-pendant-fans",
    "contain-scc",
    "group-authored",
    "annotate-dag-transitivity"
  ]
  for (const rule of spec.rules) {
    if (!record(rule) || rule.version !== "1" || !kinds.includes(rule.kind)) {
      fail("rule-version", "Unsupported rule kind or version")
      continue
    }
    if (
      rule.kind === "fold-pendant-fans" &&
      (!Number.isSafeInteger(rule.minLeaves) || rule.minLeaves < 2)
    )
      fail("fan-leaves", "A pendant fan needs at least two leaves")
    if (rule.kind === "group-authored" && !id(rule.hierarchyRef))
      fail("hierarchy-ref", "Authored rules need a hierarchy reference")
    if (rule.kind === "annotate-dag-transitivity" && !id(rule.semanticPolicyId))
      fail(
        "semantic-policy",
        "Transitive readings need an explicit semantic policy ID"
      )
  }
  if (
    !record(bindings) ||
    !Array.isArray(bindings.edgeSemantics) ||
    !Array.isArray(bindings.authoredHierarchies)
  ) {
    fail(
      "bindings",
      "Bindings require edge semantics and authored hierarchy arrays"
    )
    return issues
  }
  const semanticIds = new Set<string>()
  for (const semantics of bindings.edgeSemantics) {
    if (
      !record(semantics) ||
      !edges.has(semantics.edgeId) ||
      semanticIds.has(semantics.edgeId) ||
      !id(semantics.relationClass) ||
      typeof semantics.reachabilitySubduingAllowed !== "boolean" ||
      (semantics.measurePolicyId !== undefined &&
        !id(semantics.measurePolicyId))
    ) {
      fail(
        "edge-semantics",
        "Semantics must uniquely name an admitted edge and explicit relation/measure policies"
      )
    } else semanticIds.add(semantics.edgeId)
  }
  const hierarchyIds = new Set<string>()
  for (const hierarchy of bindings.authoredHierarchies) {
    if (
      !record(hierarchy) ||
      !id(hierarchy.id) ||
      hierarchyIds.has(hierarchy.id) ||
      !Array.isArray(hierarchy.groups)
    ) {
      fail("hierarchy", "Hierarchies need unique IDs and group arrays")
      continue
    }
    hierarchyIds.add(hierarchy.id)
    const groups = new Map<string, Set<string>>()
    for (const group of hierarchy.groups) {
      if (
        !record(group) ||
        !id(group.id) ||
        groups.has(group.id) ||
        !id(group.label) ||
        !Array.isArray(group.sourceNodeIds) ||
        group.sourceNodeIds.length === 0 ||
        group.sourceNodeIds.some((node) => !nodes.has(node)) ||
        new Set(group.sourceNodeIds).size !== group.sourceNodeIds.length
      ) {
        fail(
          "authored-group",
          "Groups need unique IDs, labels, and nonempty unique admitted members"
        )
        continue
      }
      groups.set(group.id, new Set(group.sourceNodeIds))
    }
    const entries = [...groups]
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [aId, a] = entries[i],
          [bId, b] = entries[j]
        const overlap = [...a].filter((node) => b.has(node)).length
        if (overlap && overlap < a.size && overlap < b.size)
          fail(
            "nonnested-hierarchy",
            "Groups in one hierarchy must be nested or disjoint",
            [aId, bId]
          )
        if (overlap === a.size && overlap === b.size)
          fail(
            "duplicate-membership",
            "One hierarchy cannot give identical membership two owners",
            [aId, bId]
          )
      }
    }
    for (const group of hierarchy.groups) {
      if (
        !record(group) ||
        !groups.has(group.id) ||
        group.parentId === undefined
      )
        continue
      const parent = groups.get(group.parentId),
        child = groups.get(group.id)!
      if (
        !parent ||
        parent.size <= child.size ||
        [...child].some((node) => !parent.has(node))
      )
        fail(
          "authored-parent",
          "Parent must strictly contain all child members",
          [group.id]
        )
    }
  }
  for (const rule of spec.rules) {
    if (rule?.kind === "group-authored" && !hierarchyIds.has(rule.hierarchyRef))
      fail("missing-hierarchy", "Authored hierarchy binding was not supplied", [
        rule.hierarchyRef
      ])
  }
  for (const row of atlas.source.measureValues ?? []) {
    if (!Number.isFinite(row?.value))
      fail("nonfinite-metadata", "Source measure values must be finite")
  }
  return issues
}
