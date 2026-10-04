import type { PreparedNetworkAtlas } from "../types"
import { idDictionary } from "../ids"
import { contentId, compareIds } from "./identity"
import { indexGraph } from "./indexGraph"
import { OwnershipBuilder, type GroupSeed } from "./ownership"
import { planCandidates } from "./plan"
import { ruleCandidates } from "./rules"
import { validateResolution } from "./validate"
import type {
  PrepareResult,
  PreparedNetworkResolution,
  ResolutionBindings,
  ResolutionSpec
} from "./types"
import { applyTransitiveReading } from "./witnesses"
import { sourceSetValues } from "./sets"

/** Prepare a coherent, serializable sidecar without changing the atlas or doing layout. */
export function prepareNetworkResolution(
  atlas: PreparedNetworkAtlas,
  spec: ResolutionSpec,
  bindings: ResolutionBindings = { edgeSemantics: [], authoredHierarchies: [] }
): PrepareResult {
  const issues = validateResolution(atlas, spec, bindings)
  if (issues.some((issue) => issue.severity === "fatal"))
    return { ok: false, issues }
  // Snapshot caller-owned inputs. A subsequent source mutation cannot change an issued claim.
  spec = JSON.parse(JSON.stringify(spec)) as ResolutionSpec
  bindings = JSON.parse(JSON.stringify(bindings)) as ResolutionBindings
  bindings.edgeSemantics.sort((a, b) => compareIds(a.edgeId, b.edgeId))
  bindings.authoredHierarchies.sort((a, b) => compareIds(a.id, b.id))
  for (const h of bindings.authoredHierarchies) {
    h.groups.sort((a, b) => compareIds(a.id, b.id))
    for (const g of h.groups) g.sourceNodeIds.sort(compareIds)
  }
  const source = {
    nodes: atlas.source.nodes
      .map((n) => ({
        id: n.id,
        ...(n.sectionId !== undefined && { sectionId: n.sectionId })
      }))
      .sort((a, b) => compareIds(a.id, b.id)),
    edges: atlas.source.edges
      .map((e) => ({ id: e.id, source: e.source, target: e.target }))
      .sort((a, b) => compareIds(a.id, b.id)),
    ...(atlas.source.occurrences && {
      occurrences: JSON.parse(
        JSON.stringify(atlas.source.occurrences)
      ) as typeof atlas.source.occurrences
    })
  }
  source.occurrences?.sort((a, b) => compareIds(a.id, b.id))
  const revision = {
    graphRef: atlas.source.graphRef,
    sourceRevision: atlas.source.revision,
    atlasAnalysisRevision: atlas.analysisRevision,
    evidencePolicyId: atlas.spec.evidencePolicyId
  }
  const sourceFingerprint = contentId("source", [revision, source])
  const analysisRevision = contentId("analysis", [
    sourceFingerprint,
    spec,
    bindings,
    atlas.completeness
  ])
  const context = contentId("context", [
    sourceFingerprint,
    spec.relationScopeId,
    bindings.edgeSemantics
  ])
  const graph = indexGraph(source)
  const builder = new OwnershipBuilder(graph, context, bindings.edgeSemantics)
  for (const edge of graph.edges) builder.sets.add("edge", [edge.id])
  let current: GroupSeed[] = graph.nodes.map((n) => ({
    id: contentId("group", [context, "singleton/v1", n.id]),
    members: [n.id],
    label: n.id,
    kind: "singleton",
    childGroupIds: [],
    explanationEventIds: []
  }))
  const pageId = (ordinal: number) =>
    contentId("page", [analysisRevision, ordinal])
  const original = builder.page(pageId(0), 0, "Original", current, {
    status: "complete"
  })
  const value: PreparedNetworkResolution = {
    schemaVersion: "0.1",
    id: spec.id,
    revision,
    analysisRevision,
    sourceFingerprint,
    source,
    traceCoverage: {
      status:
        source.occurrences === undefined
          ? "unknown"
          : atlas.completeness.traces === "known"
            ? "complete"
            : atlas.completeness.traces === "truncated"
              ? "truncated"
              : "incomplete"
    },
    edgeSemantics: bindings.edgeSemantics,
    sectionOrder: [...atlas.sections.sectionIds],
    spec,
    pages: [original],
    groups: [],
    bundles: [],
    ports: [],
    features: [],
    events: [],
    transitions: [],
    sets: [],
    witnesses: [],
    issues,
    stoppedBecause: "configured-end"
  }
  let ruleIndex = 0,
    examined = 0
  const batches = spec.pageRuleCounts ?? spec.rules.map(() => 1)
  for (const count of batches) {
    if (value.pages.length >= spec.limits.maxPages) {
      value.stoppedBecause = "resource-limit"
      break
    }
    const from = value.pages[value.pages.length - 1]
    const ordinal = value.pages.length,
      toId = pageId(ordinal)
    const fromGroups = current
    const batchEvents: string[] = [],
      labels: string[] = []
    let priorCoverage = from.coverage
    let truncated = false
    let page = from
    for (let step = 0; step < count; step++, ruleIndex++) {
      const rule = spec.rules[ruleIndex]
      labels.push(rule.kind)
      if (rule.kind === "annotate-dag-transitivity") {
        page = builder.page(toId, ordinal, labels.join(" + "), current, {
          status: "complete"
        })
        applyTransitiveReading(value, builder, page, from.id, rule)
        batchEvents.push(
          ...value.events.filter((e) => e.toPageId === toId).map((e) => e.id)
        )
        if (page.coverage.status !== "complete") priorCoverage = page.coverage
        if (page.coverage.status === "truncated") {
          truncated = true
          ruleIndex++
          break
        }
        continue
      }
      const plan = planCandidates(
        ruleCandidates(graph, rule, spec, bindings),
        current,
        builder,
        rule,
        ruleIndex,
        spec,
        bindings,
        from.id,
        toId,
        Math.max(0, spec.limits.maxCandidates - examined)
      )
      current = plan.groups
      examined += plan.examined
      truncated ||= plan.truncated
      value.features.push(
        ...plan.features.filter(
          (f) => !value.features.some((prior) => prior.id === f.id)
        )
      )
      value.events.push(...plan.events)
      batchEvents.push(...plan.events.map((e) => e.id))
      // Materialize intermediate children when several rules share one displayed page.
      page = builder.page(
        toId,
        ordinal,
        labels.join(" + "),
        current,
        truncated
          ? {
              status: "truncated",
              reason: "candidate-budget",
              examined,
              total: examined + plan.total - plan.examined
            }
          : priorCoverage
      )
      if (truncated) {
        ruleIndex++
        break
      }
    }
    if (page.coverage.status === "complete") page.coverage = priorCoverage
    const groupMap = idDictionary<string>()
    for (const old of fromGroups) {
      const owner = page.nodeOwner[old.members[0]]
      if (old.members.some((node) => page.nodeOwner[node] !== owner))
        throw new Error("Resolution partition split")
      groupMap[old.id] = owner
    }
    page.annotationIds = [
      ...new Set([
        ...from.annotationIds,
        ...value.events
          .filter((e) => e.toPageId === toId)
          .flatMap((e) => e.featureIds)
      ])
    ]
    value.pages.push(page)
    value.transitions.push({
      fromPageId: from.id,
      toPageId: toId,
      groupMap,
      eventIds: [...new Set(batchEvents)]
    })
    if (truncated) {
      value.stoppedBecause = "resource-limit"
      break
    }
  }
  if (value.stoppedBecause === "resource-limit") {
    issues.push({
      code: "resource-limit",
      severity: "warning",
      message:
        "Configured rules were not fully examined; ownership and source ledgers remain complete",
      subjectIds: []
    })
    const final = value.pages[value.pages.length - 1]
    if (final.coverage.status === "complete")
      final.coverage = { status: "truncated", reason: "page-budget" }
  }
  value.groups = [...builder.groups.values()]
  value.bundles = [...builder.bundles.values()]
  value.ports = [...builder.ports.values()]
  const subdued = new Map<string, string[]>()
  for (const page of value.pages) {
    for (const event of value.events.filter(
      (e) => e.toPageId === page.id && e.action === "subdued"
    )) {
      for (const id of sourceSetValues(
        builder.sets.values(),
        event.affectedEdges
      ))
        subdued.set(
          id,
          event.claims.flatMap((c) => c.witnessIds)
        )
    }
    page.presentation = page.presentation.flatMap((entry) => {
      const ids = sourceSetValues(builder.sets.values(), entry.edges)
      const plain = ids.filter((id) => !subdued.has(id)),
        dimmed = ids.filter((id) => subdued.has(id))
      return [
        ...(plain.length
          ? [{ ...entry, edges: builder.sets.add("edge", plain) }]
          : []),
        ...(dimmed.length
          ? [
              {
                ...entry,
                edges: builder.sets.add("edge", dimmed),
                subduedForReachability: true,
                witnessIds: [
                  ...new Set(dimmed.flatMap((id) => subdued.get(id)!))
                ]
              }
            ]
          : [])
      ]
    })
  }
  value.sets = builder.sets.values()
  return { ok: true, value, issues }
}
