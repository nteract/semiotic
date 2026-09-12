import { ledgerValue } from "./ledger"
import { graphWalkExists, isSupportedRoute, nextSupportedNodes } from "./support"
import type {
  MotifMatch,
  MotifTemplate,
  PreparedNetworkAtlas,
  QueryResult
} from "./types"

function baseResult(
  atlas: PreparedNetworkAtlas,
  scope: string,
  evidenceRefs: string[],
  limitations: string[] = []
): Omit<QueryResult<never>, "status"> {
  return {
    scope,
    sourceRevision: atlas.provenance.sourceRevision,
    analysisRevision: atlas.analysisRevision,
    evidenceRefs,
    limitations
  }
}

export function getSectionMeasures(
  atlas: PreparedNetworkAtlas,
  sectionId: string,
  countingPolicy: { measureId: string }
): QueryResult<number> {
  const entry = atlas.ledger.entries.find(
    (row) =>
      row.measureId === countingPolicy.measureId &&
      row.subjectId === sectionId &&
      row.subjectKind === "section"
  )
  const fallback = ledgerValue(atlas.ledger, countingPolicy.measureId, sectionId)
  const resolved = entry ?? fallback
  if (!resolved) {
    return {
      ...baseResult(atlas, sectionId, [], ["no-measure-for-section"]),
      status: "unknown"
    }
  }
  return {
    ...baseResult(atlas, sectionId, [`ledger:${resolved.measureId}:${resolved.subjectId}`]),
    status: resolved.status,
    value: resolved.value,
    units: resolved.timeDenominator
      ? `${resolved.countUnit}/${resolved.timeDenominator}`
      : resolved.countUnit,
    countUnit: resolved.countUnit,
    unitKind: resolved.unitKind
  }
}

export type PrevalenceWindow =
  | { kind: "completion"; sectionId: string }
  | { kind: "intersection"; sectionId: string }

export function getMotifPrevalence(
  atlas: PreparedNetworkAtlas,
  query: {
    template: MotifTemplate
    window?: PrevalenceWindow
  }
): QueryResult<{ matchCount: number; entityCount: number }> {
  const incomplete = atlas.motifs.incompleteCandidates.filter(
    (row) => row.template === query.template
  )
  if (atlas.motifs.unsupportedTemplates.includes(query.template)) {
    return {
      ...baseResult(atlas, query.template, [], ["unsupported-template"]),
      status: "unknown"
    }
  }
  const matches = atlas.motifs.matches.filter((match) => {
    if (match.template !== query.template) return false
    if (!query.window) return true
    if (query.window.kind === "completion") {
      return match.completionSectionId === query.window.sectionId
    }
    return match.intersectSectionIds.includes(query.window.sectionId)
  })
  const truncated = matches.some((match) => match.truncation)
  const weights: Record<string, number> = Object.create(null)
  let structuralCount = 0
  for (const match of matches) {
    const entries = Object.entries(match.entityWeights ?? {})
    if (entries.length === 0) {
      structuralCount += match.entityCount
      continue
    }
    for (const [id, weight] of entries) {
      Object.defineProperty(weights, id, {
        value: weight,
        enumerable: true,
        configurable: true,
        writable: true
      })
    }
  }
  const uniqueEntities =
    Object.values(weights).reduce((sum: number, value: number) => sum + value, 0) +
    structuralCount
  const limitations: string[] = []
  if (incomplete.length > 0) limitations.push("missing-prehistory")
  if (truncated) limitations.push("truncated-match-budget")
  let status: QueryResult<never>["status"] = "exact"
  if (incomplete.length > 0 && matches.length === 0) status = "incomplete"
  else if (truncated) status = "truncated"
  else if (incomplete.length > 0) status = "incomplete"
  return {
    ...baseResult(
      atlas,
      query.window ? `${query.template}:${query.window.kind}:${query.window.sectionId}` : query.template,
      matches.map((match) => match.id),
      limitations
    ),
    status,
    value: { matchCount: matches.length, entityCount: uniqueEntities },
    countUnit: atlas.spec.motifs.countUnit
  }
}

export function getMotifWitness(
  atlas: PreparedNetworkAtlas,
  matchId: string
): QueryResult<MotifMatch> {
  const match = atlas.motifs.matches.find((row) => row.id === matchId)
  if (!match) {
    const incomplete = atlas.motifs.incompleteCandidates.find(
      (row) => row.occurrenceId === matchId
    )
    if (incomplete) {
      return {
        ...baseResult(atlas, matchId, [incomplete.occurrenceId], ["missing-prehistory"]),
        status: "incomplete"
      }
    }
    return {
      ...baseResult(atlas, matchId, [], ["unknown-match"]),
      status: "unknown"
    }
  }
  return {
    ...baseResult(atlas, matchId, [match.id]),
    status: match.truncation ? "truncated" : "exact",
    value: match
  }
}

export function followSupportedRoute(
  atlas: PreparedNetworkAtlas,
  selection: { fromNode?: string; viaNode?: string; route?: string[] }
): QueryResult<{ nextNodes: string[]; supported: boolean; graphWalkExists: boolean }> {
  const scope = selection.route?.join(">") ?? selection.fromNode ?? "route"
  if (!atlas.source.occurrences?.length) {
    return {
      ...baseResult(atlas, scope, [], ["missing-traces"]),
      status: "unknown"
    }
  }
  if (selection.route) {
    const supported = isSupportedRoute(atlas.source, selection.route)
    const walk = graphWalkExists(atlas.source, selection.route)
    return {
      ...baseResult(atlas, selection.route.join(">"), [], supported ? [] : ["unsupported-composite"]),
      status: "exact",
      value: {
        nextNodes: supported
          ? [selection.route[selection.route.length - 1]]
          : [],
        supported,
        graphWalkExists: walk
      }
    }
  }
  if (!selection.fromNode) {
    return {
      ...baseResult(atlas, scope, [], ["missing-from-node"]),
      status: "unknown"
    }
  }
  const nextNodes = nextSupportedNodes(
    atlas.source,
    selection.fromNode,
    selection.viaNode
  )
  return {
    ...baseResult(atlas, selection.fromNode, atlas.ports.hops.map((hop) => hop.from)),
    status: "exact",
    value: {
      nextNodes,
      supported: nextNodes.length > 0,
      graphWalkExists: atlas.ports.graphAdjacency.some(
        (hop) => hop.source === selection.fromNode
      )
    }
  }
}

export function getResidualConnections(
  atlas: PreparedNetworkAtlas,
  nodeId: string
): QueryResult<Array<{ edgeId: string; source: string; target: string }>> {
  const residual = new Set(atlas.residualEdges.residualEdgeIds)
  const connections = atlas.source.edges
    .filter(
      (edge) =>
        residual.has(edge.id) && (edge.source === nodeId || edge.target === nodeId)
    )
    .map((edge) => ({
      edgeId: edge.id,
      source: edge.source,
      target: edge.target
    }))
  return {
    ...baseResult(
      atlas,
      nodeId,
      connections.map((row) => row.edgeId)
    ),
    status: "exact",
    value: connections
  }
}

export function uniqueEntityCount(atlas: PreparedNetworkAtlas): number {
  const ids = new Set<string>()
  let counted = 0
  for (const occurrence of atlas.source.occurrences ?? []) {
    ids.add(occurrence.entityId)
    counted += occurrence.entityCount ?? 1
  }
  if (ids.size > 0) return ids.size
  return counted
}
