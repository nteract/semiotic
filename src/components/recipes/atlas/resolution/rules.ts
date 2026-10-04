import type { GraphIndex } from "./indexGraph"
import { connectedParts } from "./indexGraph"
import { compareIds, contentId, sortedIds } from "./identity"
import type {
  ResolutionBindings,
  ResolutionGroup,
  ResolutionSpec,
  RuleSpec
} from "./types"

export interface Candidate {
  key: string
  kind: Exclude<ResolutionGroup["kind"], "singleton">
  label: string
  members: string[]
  roles: Record<string, string[]>
  supplied: boolean
  authoredId?: string
}

/** Source features are independent of the current partition and capsule packing. */
export function ruleCandidateBatches(
  graph: GraphIndex,
  rule: RuleSpec,
  spec: ResolutionSpec,
  bindings: ResolutionBindings
): Candidate[][] {
  const result: Candidate[] = []
  const add = (
    kind: Candidate["kind"],
    members: string[],
    label: string,
    roles: Candidate["roles"],
    authoredId?: string
  ) => {
    if (members.length < (kind === "authored-group" ? 1 : 2)) return
    const canonical = sortedIds(members)
    result.push({
      key: contentId("candidate", [rule, canonical, authoredId]),
      kind,
      members: canonical,
      label,
      roles,
      supplied: kind === "authored-group",
      ...(authoredId && { authoredId })
    })
  }
  if (rule.kind === "contain-scc") {
    for (const members of graph.components)
      add("scc", members, `Feedback component (${members.length})`, { members })
  } else if (rule.kind === "fold-serial-interiors") {
    const eligible = new Set(
      graph.nodes
        .filter(
          ({ id }) =>
            !graph.cyclicNodes.has(id) &&
            graph.predecessors.get(id)!.size === 1 &&
            graph.successors.get(id)!.size === 1
        )
        .map(({ id }) => id)
    )
    const visited = new Set<string>()
    for (const start of [...eligible].sort(compareIds)) {
      const predecessor = [...graph.predecessors.get(start)!][0]
      if (eligible.has(predecessor)) continue
      const members: string[] = []
      let current = start
      while (eligible.has(current) && !visited.has(current)) {
        visited.add(current)
        members.push(current)
        current = [...graph.successors.get(current)!][0]
      }
      // Split at anticipated authored boundaries and visible pins; never enlarge a motif.
      let run: string[] = []
      let previousSignature: string | undefined
      const visible = new Set(
        spec.pins.filter((p) => p.kind === "keep-visible").map((p) => p.nodeId)
      )
      for (const node of members) {
        const signature = authoredSignature(node, spec, bindings)
        if (
          visible.has(node) ||
          (run.length && signature !== previousSignature)
        ) {
          add("chain", run, `Serial interior (${run.length})`, { ordered: run })
          run = []
        }
        if (!visible.has(node)) run.push(node)
        previousSignature = signature
      }
      add("chain", run, `Serial interior (${run.length})`, { ordered: run })
    }
  } else if (rule.kind === "fold-pendant-fans") {
    for (const { id: hub } of graph.nodes) {
      for (const direction of ["in", "out"] as const) {
        const leaves = [
          ...(direction === "out" ? graph.successors : graph.predecessors).get(
            hub
          )!
        ]
          .filter(
            (leaf) =>
              leaf !== hub &&
              !graph.cyclicNodes.has(leaf) &&
              graph.neighbors.get(leaf)!.size === 1 &&
              (direction === "out" ? graph.successors : graph.predecessors).get(
                leaf
              )!.size === 0
          )
          .sort(compareIds)
        if (leaves.length >= rule.minLeaves)
          add(
            "pendant-fan",
            [hub, ...leaves],
            `Pendant fan (${leaves.length} leaves)`,
            { hub: [hub], leaves, [direction]: leaves }
          )
      }
    }
  } else if (rule.kind === "group-authored") {
    const hierarchy = bindings.authoredHierarchies.find(
      (h) => h.id === rule.hierarchyRef
    )!
    for (const group of [...hierarchy.groups].sort((a, b) =>
      compareIds(a.id, b.id)
    )) {
      const parts = connectedParts(group.sourceNodeIds, graph)
      for (let i = 0; i < parts.length; i++) {
        add(
          "authored-group",
          parts[i],
          parts.length > 1
            ? `${group.label} (${i + 1}/${parts.length})`
            : group.label,
          { authoredMembers: sortedIds(group.sourceNodeIds) },
          group.id
        )
      }
    }
  }
  if (rule.kind !== "group-authored") return [result]
  const hierarchy = bindings.authoredHierarchies.find(
    (h) => h.id === rule.hierarchyRef
  )!
  const memberships = hierarchy.groups.map((group) => ({
    id: group.id,
    nodes: new Set(group.sourceNodeIds)
  }))
  // Validated memberships are nested or disjoint. Count strict ancestors even
  // when parentId is omitted, and plan disjoint levels from children to parents.
  const depth = new Map(
    memberships.map((group) => [
      group.id,
      memberships.filter(
        (parent) =>
          parent.nodes.size > group.nodes.size &&
          [...group.nodes].every((id) => parent.nodes.has(id))
      ).length
    ])
  )
  const levels = [...new Set(depth.values())].sort((a, b) => b - a)
  return levels.length
    ? levels.map((level) =>
        result.filter((c) => depth.get(c.authoredId!) === level)
      )
    : [[]]
}

export function authoredSignature(
  node: string,
  spec: ResolutionSpec,
  bindings: ResolutionBindings
): string {
  const active = new Set(
    spec.rules
      .filter((r) => r.kind === "group-authored")
      .map((r) => r.hierarchyRef)
  )
  return JSON.stringify(
    bindings.authoredHierarchies
      .filter((h) => active.has(h.id))
      .flatMap((h) =>
        h.groups
          .filter((g) => g.sourceNodeIds.includes(node))
          .map((g) => [h.id, g.id])
      )
      .sort((a, b) => compareIds(JSON.stringify(a), JSON.stringify(b)))
  )
}
