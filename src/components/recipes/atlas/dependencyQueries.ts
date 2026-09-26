import { graphAdjacency } from "./directedGraph"
import type { StructuralPath } from "./dependencyTypes"
import type { PreparedNetworkAtlas, QueryResult } from "./types"
import { ownValue } from "./ids"

const limitations = [
  "Structural paths in the admitted directed graph; not capacity, AND prerequisites, or failure probability.",
  "Unknown upstream dependencies cannot establish independence."
]

function result<T>(atlas: PreparedNetworkAtlas, value?: T): QueryResult<T> {
  return {
    status: atlas.requiredPaths?.status ?? "unknown",
    value,
    scope: atlas.requiredPaths
      ? JSON.stringify({
          roots: atlas.requiredPaths.roots,
          relationScopeId: atlas.requiredPaths.relationScopeId
        })
      : "required-paths-not-prepared",
    sourceRevision: atlas.provenance.sourceRevision,
    analysisRevision: atlas.analysisRevision,
    evidenceRefs: [],
    limitations: [...limitations]
  }
}

/**
 * Ancestry is a derived relation, not a series of original transport edges.
 * Malformed or cyclic serialized chains return unknown with no partial value.
 */
export function getRequiredPaths(atlas: PreparedNetworkAtlas, target: string) {
  const answer = result<{
    target: string
    reachable: boolean
    dominatorIds: string[]
  }>(atlas)
  const required = atlas.requiredPaths
  if (!required || !atlas.source.nodes.some((node) => node.id === target)) {
    answer.status = "unknown"
    return answer
  }
  const dominatorIds: string[] = []
  const parents = required.immediateDominatorByNode
  const invalid = () => {
    answer.status = "unknown"
    answer.limitations.push(
      "Invalid required-path dominator chain; ancestry cannot be established."
    )
    return answer
  }
  if (!parents || typeof parents !== "object" || Array.isArray(parents))
    return invalid()
  const nodeIds = new Set(atlas.source.nodes.map((node) => node.id))
  const reachableIds = new Set(required.reachableNodeIds)
  const reachable = reachableIds.has(target)
  const visited = new Set([target])
  let parent = ownValue(parents, target)
  // Unreachable nodes have no dominator entry; reachable chains end at null.
  if (!reachable && parent !== undefined) return invalid()
  if (!reachable && parent === undefined) parent = null
  while (parent !== null) {
    if (
      typeof parent !== "string" ||
      !reachable ||
      !nodeIds.has(parent) ||
      !reachableIds.has(parent) ||
      visited.has(parent)
    )
      return invalid()
    visited.add(parent)
    dominatorIds.push(parent)
    parent = ownValue(parents, parent)
  }
  answer.value = {
    target,
    reachable,
    dominatorIds: dominatorIds.reverse()
  }
  answer.evidenceRefs = atlas.source.edges.map((edge) => edge.id)
  return answer
}

/** Shortest admitted directed path; capacity is intentionally not an edge filter. */
export function getBypassWitness(
  atlas: PreparedNetworkAtlas,
  query: { target: string; avoiding: string[] }
): QueryResult<{ exists: boolean; path?: StructuralPath }> {
  const answer = result<{ exists: boolean; path?: StructuralPath }>(atlas)
  if (
    !atlas.requiredPaths ||
    !atlas.source.nodes.some((node) => node.id === query.target) ||
    query.avoiding.some(
      (id) => !atlas.source.nodes.some((node) => node.id === id)
    )
  ) {
    answer.status = "unknown"
    return answer
  }
  const avoided = new Set(query.avoiding)
  const { outgoing } = graphAdjacency(atlas.source)
  const queue = atlas.requiredPaths.roots.filter((id) => !avoided.has(id))
  const visited = new Set(queue)
  const via = new Map<string, { source: string; edgeId: string }>()
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const node = queue[cursor]
    if (node === query.target) {
      const nodeIds = [node]
      const edgeIds: string[] = []
      let step = node
      while (via.has(step)) {
        const hop = via.get(step)!
        edgeIds.unshift(hop.edgeId)
        nodeIds.unshift(hop.source)
        step = hop.source
      }
      answer.status = "exact"
      answer.value = { exists: true, path: { nodeIds, edgeIds } }
      answer.evidenceRefs = edgeIds
      return answer
    }
    for (const edge of outgoing.get(node)!) {
      if (avoided.has(edge.target) || visited.has(edge.target)) continue
      visited.add(edge.target)
      via.set(edge.target, { source: node, edgeId: edge.id })
      queue.push(edge.target)
    }
  }
  answer.value = { exists: false }
  answer.evidenceRefs = atlas.source.edges.map((edge) => edge.id)
  return answer
}

/** Removal asks only which previously reachable vertices lose every path. */
export function getDependencyExclusion(
  atlas: PreparedNetworkAtlas,
  avoiding: string[]
) {
  const answer = result<{ lostNodeIds: string[] }>(atlas)
  if (
    !atlas.requiredPaths ||
    avoiding.some((id) => !atlas.source.nodes.some((node) => node.id === id))
  ) {
    answer.status = "unknown"
    return answer
  }
  const excluded = new Set(avoiding)
  const { outgoing } = graphAdjacency(atlas.source)
  const queue = atlas.requiredPaths.roots.filter((id) => !excluded.has(id))
  const reachable = new Set(queue)
  for (let i = 0; i < queue.length; i++) {
    for (const edge of outgoing.get(queue[i])!) {
      if (excluded.has(edge.target) || reachable.has(edge.target)) continue
      reachable.add(edge.target)
      queue.push(edge.target)
    }
  }
  answer.value = {
    lostNodeIds: atlas.requiredPaths.reachableNodeIds.filter(
      (id) => !reachable.has(id)
    )
  }
  answer.evidenceRefs = atlas.source.edges.map((edge) => edge.id)
  return answer
}
