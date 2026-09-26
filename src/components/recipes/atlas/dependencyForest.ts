import { stronglyConnectedComponents } from "./directedGraph"
import { buildRootedForest } from "./rootedForest"
import { assertEdgeCoverage } from "./forests"
import type { PreparedNetworkAtlas } from "./types"
import { ownValue } from "./ids"

/** Prepared once outside rendering. Layout choices cannot change atlas facts. */
export function prepareDependencyForest(
  atlas: PreparedNetworkAtlas,
  options: {
    rankingPolicyId?: "rooted-traversal:id-asc" | "rooted-traversal:id-desc"
  } = {}
) {
  const classified = buildRootedForest(
    atlas.source,
    atlas.spec.forest.display.roots ?? atlas.forest.roots,
    options.rankingPolicyId ?? "rooted-traversal:id-asc"
  )
  assertEdgeCoverage(classified.residual, classified.forest)
  const children = new Map(
    atlas.source.nodes.map((node) => [node.id, [] as string[]])
  )
  const chosen = new Set(classified.forest.backboneEdgeIds)
  for (const edge of atlas.source.edges) {
    if (chosen.has(edge.id)) children.get(edge.source)!.push(edge.target)
  }
  for (const ids of children.values()) ids.sort()
  const order: string[] = []
  const stack = [...classified.forest.roots].reverse()
  while (stack.length) {
    const id = stack.pop()!
    order.push(id)
    stack.push(...[...children.get(id)!].reverse())
  }
  const components = stronglyConnectedComponents(atlas.source)
  const requiredChildren = new Map(
    atlas.source.nodes.map((node) => [node.id, [] as string[]])
  )
  for (const [id, parent] of Object.entries(
    atlas.requiredPaths?.immediateDominatorByNode ?? {}
  )) {
    if (
      !requiredChildren.has(id) ||
      (parent !== null && !requiredChildren.has(parent))
    )
      throw new Error("Invalid required-path dominator parent")
    if (parent !== null) requiredChildren.get(parent)!.push(id)
  }
  return {
    atlas,
    ...classified,
    order,
    children: Object.fromEntries(children),
    components,
    requiredChildren: Object.fromEntries(requiredChildren),
    sceneSeeds: { nodes: atlas.source.nodes, edges: atlas.source.edges }
  }
}

export type DependencyForestProjection = ReturnType<
  typeof prepareDependencyForest
>

export function branchMembers(
  projection: DependencyForestProjection,
  root: string
) {
  const members = new Set<string>()
  const stack = [root]
  while (stack.length) {
    const id = stack.pop()!
    if (members.has(id)) continue
    members.add(id)
    const children = ownValue(projection.children, id)
    if (Array.isArray(children)) stack.push(...children)
  }
  return members
}

export function requiredTargets(
  projection: DependencyForestProjection,
  root: string
) {
  const result: string[] = []
  const initial = ownValue(projection.requiredChildren, root)
  if (initial === undefined) return result
  if (!Array.isArray(initial))
    throw new Error("Invalid required-path dominator children")
  const stack = [...initial]
  const visited = new Set([root])
  while (stack.length) {
    const id = stack.pop()!
    const children = ownValue(projection.requiredChildren, id)
    if (typeof id !== "string" || visited.has(id) || !Array.isArray(children))
      throw new Error("Invalid required-path dominator chain")
    visited.add(id)
    result.push(id)
    for (const child of children) stack.push(child)
  }
  return result.sort()
}

/** Include all incident residual edges, including every branch-boundary tie. */
export function getBranchResidualConnections(
  projection: DependencyForestProjection,
  root: string
) {
  const members = branchMembers(projection, root)
  const residual = new Set(projection.residual.residualEdgeIds)
  return projection.atlas.source.edges.filter(
    (edge) =>
      residual.has(edge.id) &&
      (members.has(edge.source) || members.has(edge.target))
  )
}

/** Matrix cells retain parallel edges and self-loops by original ID. */
export function dependencyMatrix(
  projection: DependencyForestProjection,
  nodeIds: readonly string[]
) {
  const members = new Set(nodeIds)
  const cells = new Map<
    string,
    { source: string; target: string; edgeIds: string[] }
  >()
  for (const edge of projection.atlas.source.edges) {
    if (!members.has(edge.source) || !members.has(edge.target)) continue
    const key = JSON.stringify([edge.source, edge.target])
    if (!cells.has(key))
      cells.set(key, { source: edge.source, target: edge.target, edgeIds: [] })
    cells.get(key)!.edgeIds.push(edge.id)
  }
  return [...cells.values()]
}
