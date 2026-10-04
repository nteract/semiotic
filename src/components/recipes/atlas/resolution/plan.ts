import { contentId, compareIds, sortedIds } from "./identity"
import type { GroupSeed } from "./ownership"
import type { OwnershipBuilder } from "./ownership"
import { authoredSignature, type Candidate } from "./rules"
import type {
  ResolutionBindings,
  ResolutionEvent,
  ResolutionSpec,
  RuleSpec,
  SourceFeature
} from "./types"

export function planCandidates(
  candidates: Candidate[],
  current: GroupSeed[],
  builder: OwnershipBuilder,
  rule: RuleSpec,
  ruleIndex: number,
  spec: ResolutionSpec,
  bindings: ResolutionBindings,
  fromPageId: string,
  toPageId: string,
  remaining: number
) {
  const owners = new Map(
    current.flatMap((group) =>
      group.members.map((node) => [node, group] as const)
    )
  )
  const reduction = (candidate: Candidate) =>
    new Set(candidate.members.map((id) => owners.get(id)!.id)).size - 1
  const ordered = [...candidates].sort(
    (a, b) =>
      reduction(b) - reduction(a) ||
      compareIds(JSON.stringify(a.members), JSON.stringify(b.members)) ||
      compareIds(a.key, b.key)
  )
  const examined = ordered.slice(0, remaining)
  const visible = new Set(
    spec.pins.filter((pin) => pin.kind === "keep-visible").map((p) => p.nodeId)
  )
  const claimed = new Set<string>(),
    removed = new Set<string>()
  const added: GroupSeed[] = [],
    features: SourceFeature[] = [],
    events: ResolutionEvent[] = []
  for (const candidate of examined) {
    const members = new Set(candidate.members)
    const before = [
      ...new Map(
        candidate.members.map((node) => {
          const owner = owners.get(node)!
          return [owner.id, owner]
        })
      ).values()
    ]
    const edges = builder.graph.edges
      .filter((edge) => members.has(edge.source) && members.has(edge.target))
      .map((edge) => edge.id)
    const featureId = contentId("feature", [
      builder.contextId,
      rule,
      candidate.key
    ])
    features.push({
      id: featureId,
      kind: candidate.kind,
      nodes: builder.sets.add("node", candidate.members),
      edges: builder.sets.add("edge", edges),
      roles: candidate.roles,
      discovery: candidate.supplied ? "supplied" : "exact-structural",
      coverage: { status: "complete" },
      scopeId: spec.relationScopeId
    })
    const groupId = contentId("group", [
      builder.contextId,
      rule,
      candidate.members,
      candidate.authoredId ?? null
    ])
    let reason = ""
    if (candidate.members.some((node) => claimed.has(node)))
      reason = "overlapping-candidate"
    else if (
      before.some((group) => group.members.some((node) => !members.has(node)))
    )
      reason = "crosses-current-block"
    else if (
      before.length < 2 &&
      (rule.kind !== "group-authored" || before[0].id === groupId)
    )
      reason = "already-contained"
    else if (candidate.members.some((node) => visible.has(node)))
      reason = "keep-visible-pin"
    else if (
      rule.kind !== "group-authored" &&
      new Set(
        candidate.members.map((node) => authoredSignature(node, spec, bindings))
      ).size > 1
    )
      reason = "anticipated-authored-boundary"
    const eventId = contentId("event", [toPageId, ruleIndex, candidate.key])
    const accepted = !reason
    if (accepted) {
      for (const node of candidate.members) claimed.add(node)
      for (const group of before) removed.add(group.id)
      added.push({
        id: groupId,
        kind: candidate.kind,
        label: candidate.label,
        members: candidate.members,
        childGroupIds: sortedIds(before.map((group) => group.id)),
        explanationEventIds: [eventId]
      })
    }
    events.push({
      id: eventId,
      fromPageId,
      toPageId,
      action: accepted ? "grouped" : "rejected",
      rule,
      featureIds: [featureId],
      beforeGroupIds: sortedIds(before.map((g) => g.id)),
      afterGroupIds: accepted ? [groupId] : [],
      affectedEdges: builder.sets.add("edge", edges),
      reason: accepted
        ? `Applied ${rule.kind}; original members and edge IDs retained`
        : reason,
      claims: accepted
        ? [
            "source-ownership",
            "weak-connectivity",
            "cycle-account",
            "source-path-recovery"
          ].map((property) => ({
            property: property as
              | "source-ownership"
              | "weak-connectivity"
              | "cycle-account"
              | "source-path-recovery",
            scopeId: spec.relationScopeId,
            status: "checked",
            witnessIds: [],
            limitations: [
              "Summary adjacency does not certify directed or observed continuation"
            ]
          }))
        : []
    })
  }
  return {
    groups: [...current.filter((g) => !removed.has(g.id)), ...added].sort(
      (a, b) => compareIds(a.members[0], b.members[0])
    ),
    features,
    events,
    examined: examined.length,
    total: ordered.length,
    truncated: examined.length < ordered.length
  }
}
