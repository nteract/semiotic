import { idDictionary, setOwnValue } from "./ids"
import type {
  AtlasEdge,
  DisplayForest,
  NetworkAtlasSource,
  NetworkAtlasSpec,
  OriginalEdgeIndex
} from "./types"

export type ForestClassification = {
  forest: DisplayForest
  residual: OriginalEdgeIndex
}

function parsePolicy(rankingPolicyId: string): {
  mode: "main-transport" | "tree-only"
  order: "id-asc" | "id-desc"
} {
  const [modeRaw, orderRaw] = rankingPolicyId.split(":")
  const mode = modeRaw === "tree-only" ? "tree-only" : "main-transport"
  const order = orderRaw === "id-desc" ? "id-desc" : "id-asc"
  return { mode, order }
}

function isMainNode(source: NetworkAtlasSource, spec: NetworkAtlasSpec, nodeId: string): boolean {
  if (spec.coordinate.kind !== "ordinal") return true
  const node = source.nodes.find((row) => row.id === nodeId)
  return Boolean(node?.sectionId && spec.coordinate.sectionIds.includes(node.sectionId))
}

function rankEdges(edges: AtlasEdge[], order: "id-asc" | "id-desc"): AtlasEdge[] {
  return [...edges].sort((left, right) =>
    order === "id-asc"
      ? left.id.localeCompare(right.id)
      : right.id.localeCompare(left.id)
  )
}

/**
 * Rooted display backbone. Residual means not chosen for this drawing,
 * not unimportant. Motifs must already have been detected on the full graph.
 */
export function classifyForest(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource
): ForestClassification {
  const originalEdgeIds = source.edges.map((edge) => edge.id)
  const { mode, order } = parsePolicy(spec.forest.display.rankingPolicyId)
  const mainEdge = (edge: AtlasEdge) =>
    isMainNode(source, spec, edge.source) && isMainNode(source, spec, edge.target)

  const incoming = new Map<string, AtlasEdge[]>()
  for (const node of source.nodes) incoming.set(node.id, [])
  for (const edge of source.edges) {
    if (!incoming.has(edge.target)) incoming.set(edge.target, [])
    incoming.get(edge.target)!.push(edge)
  }

  const primaryParentEdgeIdByNode = idDictionary<string>()
  const rootSet = new Set(spec.forest.display.roots)
  for (const node of source.nodes) {
    if (rootSet.has(node.id)) continue
    const candidates = rankEdges(incoming.get(node.id) ?? [], order)
    const preferred = candidates.find((edge) => mainEdge(edge)) ?? candidates[0]
    if (preferred) setOwnValue(primaryParentEdgeIdByNode, node.id, preferred.id)
  }

  let backboneEdgeIds: string[]
  if (mode === "tree-only") {
    backboneEdgeIds = Object.values(primaryParentEdgeIdByNode)
  } else {
    backboneEdgeIds = source.edges.filter((edge) => mainEdge(edge)).map((edge) => edge.id)
  }

  const backboneSet = new Set(backboneEdgeIds)
  const residualEdgeIds = originalEdgeIds.filter((id) => !backboneSet.has(id))

  return {
    forest: {
      kind: "rooted-backbone",
      roots: [...spec.forest.display.roots],
      rankingPolicyId: spec.forest.display.rankingPolicyId,
      backboneEdgeIds,
      primaryParentEdgeIdByNode
    },
    residual: { residualEdgeIds, originalEdgeIds }
  }
}

export function assertEdgeCoverage(residual: OriginalEdgeIndex, forest: DisplayForest): void {
  const original = new Set(residual.originalEdgeIds)
  const backbone = new Set(forest.backboneEdgeIds)
  const rest = new Set(residual.residualEdgeIds)
  if (backbone.size !== forest.backboneEdgeIds.length) {
    throw new Error("duplicate backbone edge id")
  }
  if (rest.size !== residual.residualEdgeIds.length) {
    throw new Error("duplicate residual edge id")
  }
  for (const id of backbone) {
    if (rest.has(id)) throw new Error(`edge ${id} is both backbone and residual`)
    if (!original.has(id)) throw new Error(`backbone edge ${id} is not original`)
  }
  for (const id of rest) {
    if (!original.has(id)) throw new Error(`residual edge ${id} is not original`)
  }
  if (backbone.size + rest.size !== original.size) {
    throw new Error("original edge IDs != backbone ⊎ residual")
  }
}
