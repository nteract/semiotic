import { sourceSetValues } from "./sets"
import type {
  EdgeHistory,
  PreparedNetworkResolution,
  QueryEnvelope,
  SetRef
} from "./types"

export function envelope<T>(
  resolution: PreparedNetworkResolution,
  value: T
): QueryEnvelope<T> {
  return {
    revision: resolution.revision,
    analysisRevision: resolution.analysisRevision,
    scopeId: resolution.spec.relationScopeId,
    coverage: { status: "complete" },
    limitations: [],
    value
  }
}

export function expandSourceSet(
  resolution: PreparedNetworkResolution,
  ref: SetRef,
  cursor = 0,
  limit = 100
) {
  if (
    !Number.isSafeInteger(cursor) ||
    cursor < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1
  )
    throw new Error("Invalid source-set pagination")
  const ids = sourceSetValues(resolution.sets, ref)
  return envelope(resolution, {
    ids: ids.slice(cursor, cursor + limit),
    total: ids.length,
    nextCursor: cursor + limit < ids.length ? cursor + limit : null
  })
}

export function getEdgeHistory(
  resolution: PreparedNetworkResolution,
  edgeId: string
): QueryEnvelope<EdgeHistory> {
  const edge = resolution.source.edges.find((e) => e.id === edgeId)
  if (!edge) throw new Error(`Unknown source edge: ${edgeId}`)
  const owners = resolution.pages.map((page) => ({
    pageId: page.id,
    sourceOwner: page.nodeOwner[edge.source],
    targetOwner: page.nodeOwner[edge.target]
  }))
  const first = owners.findIndex(
    (owner) => owner.sourceOwner === owner.targetOwner
  )
  return envelope(resolution, {
    originalEdgeId: edgeId,
    firstInternalPage: first < 0 ? null : first,
    owners
  })
}

export function getCycleLedger(
  resolution: PreparedNetworkResolution,
  pageId: string
) {
  const page = resolution.pages.find((p) => p.id === pageId)
  if (!page) throw new Error("Unknown resolution page")
  return envelope(resolution, page.cycles)
}

export function explainGroup(
  resolution: PreparedNetworkResolution,
  pageId: string,
  groupId: string
) {
  const page = resolution.pages.find((p) => p.id === pageId)
  const group = resolution.groups.find((g) => g.id === groupId)
  if (!page?.groupIds.includes(groupId) || !group)
    throw new Error("Group does not belong to the selected page")
  const result = envelope(resolution, {
    group,
    events: resolution.events.filter(
      (e) =>
        e.afterGroupIds.includes(groupId) || e.beforeGroupIds.includes(groupId)
    ),
    ports: resolution.ports.filter((p) => p.groupId === groupId)
  })
  result.limitations.push(
    "Weak connectivity is not directed or observed route support"
  )
  return result
}

export function listBoundaryEdges(
  resolution: PreparedNetworkResolution,
  pageId: string,
  groupId: string,
  cursor = 0,
  limit = 100
) {
  if (
    !Number.isSafeInteger(cursor) ||
    cursor < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1
  )
    throw new Error("Invalid edge pagination")
  const page = resolution.pages.find((p) => p.id === pageId)
  if (!page?.groupIds.includes(groupId))
    throw new Error("Group does not belong to the selected page")
  const edges = resolution.source.edges.filter(
    (edge) =>
      page.nodeOwner[edge.source] !== page.nodeOwner[edge.target] &&
      (page.nodeOwner[edge.source] === groupId ||
        page.nodeOwner[edge.target] === groupId)
  )
  return envelope(resolution, {
    edges: edges.slice(cursor, cursor + limit),
    total: edges.length,
    nextCursor: cursor + limit < edges.length ? cursor + limit : null
  })
}
