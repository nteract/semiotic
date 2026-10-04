import { envelope } from "./queries"
import { indexGraph } from "./indexGraph"
import { sourceSetValues } from "./sets"
import { searchPath } from "./witnesses"
import { cutawayContext } from "./cutawayContext"
import type {
  ObservedWitness,
  PortPathQuery,
  PortPathResult,
  PreparedNetworkResolution
} from "./types"

/** Query real component endpoints. Quotient adjacency is never used as path evidence. */
export function traceComponentPort(
  resolution: PreparedNetworkResolution,
  query: PortPathQuery
): PortPathResult {
  const base = {
    revision: resolution.revision,
    analysisRevision: resolution.analysisRevision,
    query,
    coverage: { status: "unknown" as const },
    limitations: [
      "Claims apply only to the admitted source and evidence policy"
    ]
  }
  const unknown = (
    reason: string,
    status: "unknown" | "truncated" | "incomplete" = "unknown"
  ): PortPathResult => ({
    ...base,
    coverage: { status, reason },
    verdict: "unknown"
  })
  const page = resolution.pages.find((p) => p.id === query.pageId)
  const group = resolution.groups.find((g) => g.id === query.groupId)
  const ingress = resolution.ports.find((p) => p.id === query.ingressId)
  const egress = resolution.ports.find((p) => p.id === query.egressId)
  if (
    query.scopeId !== resolution.spec.relationScopeId ||
    !page?.groupIds.includes(query.groupId) ||
    !group ||
    ingress?.groupId !== group.id ||
    egress?.groupId !== group.id ||
    ingress.direction !== "in" ||
    egress.direction !== "out" ||
    !["structural", "observed"].includes(query.basis) ||
    !["inside-only", "boundary-context"].includes(query.continuation)
  )
    return unknown("invalid-or-stale-query")
  const members = new Set(sourceSetValues(resolution.sets, group.sourceNodes))
  let inIds: string[], outIds: string[]
  try {
    inIds = sourceSetValues(
      resolution.sets,
      query.ingressEdges ?? ingress.incidentEdges
    )
    outIds = sourceSetValues(
      resolution.sets,
      query.egressEdges ?? egress.incidentEdges
    )
    const admittedIn = new Set(
      sourceSetValues(resolution.sets, ingress.incidentEdges)
    )
    const admittedOut = new Set(
      sourceSetValues(resolution.sets, egress.incidentEdges)
    )
    if (
      (query.ingressEdges && query.ingressEdges.domain !== "edge") ||
      (query.egressEdges && query.egressEdges.domain !== "edge") ||
      !inIds.length ||
      !outIds.length ||
      inIds.some((id) => !admittedIn.has(id)) ||
      outIds.some((id) => !admittedOut.has(id))
    )
      return unknown("invalid-edge-restriction")
  } catch {
    return unknown("invalid-edge-restriction")
  }
  const edgeById = new Map(resolution.source.edges.map((e) => [e.id, e]))
  const incoming = inIds.map((id) => edgeById.get(id)!),
    outgoing = outIds.map((id) => edgeById.get(id)!)
  if (query.basis === "structural") {
    const contextEdges = query.continuation === "boundary-context" ? 2 : 0
    if (resolution.spec.limits.maxWitnessEdges < contextEdges)
      return unknown("witness-output-budget", "truncated")
    const result = searchPath(
      indexGraph(resolution.source),
      ingress.internalNodeId,
      egress.internalNodeId,
      query.scopeId,
      {
        ...resolution.spec.limits,
        maxWitnessEdges: resolution.spec.limits.maxWitnessEdges - contextEdges
      },
      (_id, from, to) => members.has(from) && members.has(to)
    )
    if (result.verdict === "yes") {
      const witness = result.witness!
      if (contextEdges) {
        witness.nodeIds = [
          incoming[0].source,
          ...witness.nodeIds,
          outgoing[0].target
        ]
        witness.edgeIds = [incoming[0].id, ...witness.edgeIds, outgoing[0].id]
      }
      return { ...base, coverage: result.coverage, verdict: "yes", witness }
    }
    return result.verdict === "no"
      ? {
          ...base,
          coverage: result.coverage,
          verdict: "no",
          exhaustedScopeRef: `${resolution.analysisRevision}:${group.id}:induced-directed`
        }
      : { ...base, coverage: result.coverage, verdict: "unknown" }
  }
  if (resolution.source.occurrences === undefined)
    return unknown("missing-traces")
  const byPair = new Map<string, string[]>()
  for (const edge of resolution.source.edges) {
    const key = JSON.stringify([edge.source, edge.target]),
      ids = byPair.get(key) ?? []
    ids.push(edge.id)
    byPair.set(key, ids)
  }
  let examined = 0,
    ambiguousRestriction = false
  for (const occurrence of resolution.source.occurrences) {
    const path = occurrence.nodePath
    for (let start = 0; start < path.length; start++) {
      if (++examined > (resolution.spec.limits.maxExploredEdges ?? 100000))
        return unknown("observation-budget", "truncated")
      if (path[start] !== ingress.internalNodeId) continue
      for (
        let end = start;
        end < path.length && members.has(path[end]);
        end++
      ) {
        if (++examined > (resolution.spec.limits.maxExploredEdges ?? 100000))
          return unknown("observation-budget", "truncated")
        if (path[end] !== egress.internalNodeId) continue
        let first = start,
          last = end
        if (query.continuation === "boundary-context") {
          if (
            start === 0 ||
            end + 1 >= path.length ||
            !incoming.some((e) => e.source === path[start - 1]) ||
            !outgoing.some((e) => e.target === path[end + 1])
          )
            continue
          first--
          last++
        }
        const nodeIds = path.slice(first, last + 1)
        if (last - first > resolution.spec.limits.maxWitnessEdges)
          return unknown("witness-output-budget", "truncated")
        const choices = nodeIds
          .slice(1)
          .map((to, i) => byPair.get(JSON.stringify([nodeIds[i], to])) ?? [])
        if (choices.some((ids) => ids.length === 0)) continue
        if (
          query.continuation === "boundary-context" &&
          (choices[0].some((id) => !inIds.includes(id)) ||
            choices[choices.length - 1].some((id) => !outIds.includes(id)))
        ) {
          ambiguousRestriction = true
          continue
        }
        const resolved = choices.every((ids) => ids.length === 1)
        const witness: ObservedWitness = {
          kind: "observed-segment",
          occurrenceId: occurrence.id,
          startOffset: first,
          endOffset: last,
          nodeIds,
          edgeIdentity: resolved ? "resolved" : "ambiguous",
          ...(resolved && { edgeIds: choices.map((ids) => ids[0]) })
        }
        return {
          ...base,
          coverage: { status: "complete", examined },
          verdict: "yes",
          witness,
          limitations: [
            ...base.limitations,
            ...(!resolved
              ? ["Node-only observations cannot identify parallel edge records"]
              : [])
          ]
        }
      }
    }
  }
  if (ambiguousRestriction) return unknown("parallel-edge-identity-unavailable")
  if (resolution.traceCoverage.status !== "complete")
    return unknown("incomplete-observations", "incomplete")
  return {
    ...base,
    coverage: { status: "complete", examined },
    verdict: "no",
    exhaustedScopeRef: `${resolution.analysisRevision}:admitted-occurrences`
  }
}

/** Lazy, bounded exact cells; a blank/unqueried cell is explicitly unknown. */
export function projectComponentCutaway(
  resolution: PreparedNetworkResolution,
  pageId: string,
  groupId: string,
  options: {
    basis?: "structural" | "observed"
    continuation?: "inside-only" | "boundary-context"
    /** Zero-based matrix tile, traversing egress pages before ingress pages. */
    offset?: number
    limit?: number
    query?: boolean
  } = {}
) {
  const page = resolution.pages.find((p) => p.id === pageId)
  if (!page?.groupIds.includes(groupId))
    throw new Error("Unknown component on this page")
  const offset = options.offset ?? 0,
    limit = options.limit ?? 8
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 8
  )
    throw new Error(
      "Cutaway pages support one to eight exact ports per direction"
    )
  const ports = resolution.ports.filter((p) => p.groupId === groupId)
  const allIn = ports.filter((p) => p.direction === "in"),
    allOut = ports.filter((p) => p.direction === "out")
  const columnPages = Math.max(1, Math.ceil(allOut.length / limit))
  const rowStart = Math.floor(offset / columnPages) * limit
  const columnStart = (offset % columnPages) * limit
  const ingress = allIn.slice(rowStart, rowStart + limit),
    egress = allOut.slice(columnStart, columnStart + limit)
  const cells = ingress.flatMap((from) =>
    egress.map((to) => {
      const query: PortPathQuery = {
        pageId,
        groupId,
        ingressId: from.id,
        egressId: to.id,
        basis: options.basis ?? "structural",
        continuation:
          options.continuation ??
          (options.basis === "observed" ? "boundary-context" : "inside-only"),
        scopeId: resolution.spec.relationScopeId
      }
      const result: PortPathResult =
        options.query === false
          ? {
              revision: resolution.revision,
              analysisRevision: resolution.analysisRevision,
              query,
              verdict: "unknown",
              coverage: { status: "unknown", reason: "unqueried" },
              limitations: []
            }
          : traceComponentPort(resolution, query)
      return { query, result }
    })
  )
  return envelope(resolution, {
    context: cutawayContext(
      resolution,
      groupId,
      cells.map((c) => c.result)
    ),
    ingress,
    egress,
    cells,
    totalPairs: allIn.length * allOut.length,
    pageCount:
      Math.ceil(allIn.length / limit) * Math.ceil(allOut.length / limit),
    queriedPairs: options.query === false ? 0 : cells.length,
    supportedPairs: cells.filter((c) => c.result.verdict === "yes").length
  })
}
