import { sourceSetValues } from "./sets"
import type { PortPathResult, PreparedNetworkResolution } from "./types"

/** A bounded drawing of original records; its limits never change support queries. */
export function cutawayContext(
  resolution: PreparedNetworkResolution,
  groupId: string,
  results: PortPathResult[]
) {
  const group = resolution.groups.find((g) => g.id === groupId)!
  const singletonSets = new Map(
    resolution.sets.flatMap((set) =>
      set.codec === "sorted-string-ids/v1" && set.values.length === 1
        ? [[JSON.stringify([set.ref.domain, set.values[0]]), set.ref] as const]
        : []
    )
  )
  const sourceSet = (domain: "node" | "edge", id: string) => {
    const ref = singletonSets.get(JSON.stringify([domain, id]))
    if (!ref)
      throw new Error("Prepared resolution is missing an original-record set")
    return ref
  }
  const members = new Set(sourceSetValues(resolution.sets, group.sourceNodes))
  const edges = resolution.source.edges.filter(
    (e) => members.has(e.source) || members.has(e.target)
  )
  const entries = new Set(
    edges.filter((e) => !members.has(e.source)).map((e) => e.target)
  )
  const exits = new Set(
    edges.filter((e) => !members.has(e.target)).map((e) => e.source)
  )
  const allNodes = new Set([
    ...members,
    ...edges.flatMap((e) => [e.source, e.target])
  ])
  const witnesses = results.flatMap((r) =>
    r.verdict === "yes" ? [r.witness] : []
  )
  const ports = resolution.ports.filter((p) =>
    results.some((r) => r.query.ingressId === p.id || r.query.egressId === p.id)
  )
  const priority = new Set([
    ...ports.map((p) => p.internalNodeId),
    ...witnesses.flatMap((w) => w.nodeIds),
    ...allNodes
  ])
  const shown = new Set([...priority].slice(0, 32))
  const witnessEdges = new Set(witnesses.flatMap((w) => w.edgeIds ?? []))
  const shownEdges = edges
    .filter((e) => shown.has(e.source) && shown.has(e.target))
    .sort(
      (a, b) => Number(witnessEdges.has(b.id)) - Number(witnessEdges.has(a.id))
    )
    .slice(0, 64)
  return {
    label: group.label,
    nodeCount: members.size,
    internalCycleRank: group.internalCycleRank,
    nodes: [...shown].map((id) => ({
      id,
      sourceSet: sourceSet("node", id),
      inside: members.has(id),
      entry: entries.has(id),
      exit: exits.has(id)
    })),
    edges: shownEdges.map((e) => ({
      id: e.id,
      sourceSet: sourceSet("edge", e.id),
      source: e.source,
      target: e.target,
      internal: members.has(e.source) && members.has(e.target)
    })),
    totalNodes: allNodes.size,
    totalEdges: edges.length
  }
}
