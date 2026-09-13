import { graphAdjacency } from "./directedGraph"
import type { NetworkAtlasSource } from "./types"
import type { ForestClassification } from "./forests"

/** Select actual edges by root-aware traversal, retaining every other edge. */
export function buildRootedForest(
  source: NetworkAtlasSource,
  roots: readonly string[],
  rankingPolicyId = "rooted-traversal:id-asc"
): ForestClassification {
  const { outgoing } = graphAdjacency(source)
  const direction = rankingPolicyId.endsWith("id-desc") ? -1 : 1
  for (const edges of outgoing.values()) {
    edges.sort((a, b) => direction * a.id.localeCompare(b.id))
  }
  const visited = new Set(roots)
  const parents: Array<[string, string]> = []
  const forestRoots = [...new Set(roots)]
  const traverse = (root: string) => {
    const stack = [{ node: root, next: 0 }]
    while (stack.length) {
      const frame = stack[stack.length - 1]
      const edge = outgoing.get(frame.node)?.[frame.next++]
      if (!edge) {
        stack.pop()
        continue
      }
      if (visited.has(edge.target)) continue
      visited.add(edge.target)
      parents.push([edge.target, edge.id])
      stack.push({ node: edge.target, next: 0 })
    }
  }
  for (const root of forestRoots) traverse(root)
  // Keep unrooted regions visible, while requiredPaths separately marks them
  // unreachable from the declared analytical roots.
  for (const id of source.nodes.map((node) => node.id).sort()) {
    if (visited.has(id)) continue
    forestRoots.push(id)
    visited.add(id)
    traverse(id)
  }
  const backboneEdgeIds = parents.map(([, edgeId]) => edgeId)
  const backbone = new Set(backboneEdgeIds)
  return {
    forest: {
      kind: "rooted-backbone",
      roots: forestRoots,
      rankingPolicyId,
      backboneEdgeIds,
      primaryParentEdgeIdByNode: Object.fromEntries(parents)
    },
    residual: {
      originalEdgeIds: source.edges.map((edge) => edge.id),
      residualEdgeIds: source.edges
        .filter((edge) => !backbone.has(edge.id))
        .map((edge) => edge.id)
    }
  }
}
