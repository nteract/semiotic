import { countMotifEntities } from "./entityCounts"
import { templateEvidence } from "./compare"
import { ledgerValue } from "./ledger"
import {
  graphWalkExists,
  supportedRouteOccurrences
} from "./support"
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
  const resolved = ledgerValue(atlas.ledger, countingPolicy.measureId, sectionId, "section")
    ?? ledgerValue(atlas.ledger, countingPolicy.measureId, sectionId)
  if (!resolved) return unknownResult(atlas, sectionId, "no-measure-for-section")
  return {
    ...baseResult(atlas, sectionId, [
      `ledger:${resolved.measureId}:${resolved.subjectId}`
    ]),
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

function unknownResult(atlas: PreparedNetworkAtlas, scope: string, limitation: string) {
  return { ...baseResult(atlas, scope, [], [limitation]), status: "unknown" as const }
}

export function getMotifPrevalence(
  atlas: PreparedNetworkAtlas,
  query: {
    template: MotifTemplate
    window?: PrevalenceWindow
  }
): QueryResult<{ matchCount: number; entityCount: number }> {
  const incomplete = atlas.motifs.incompleteCandidates.some(
    (row) => row.template === query.template
  )
  if (atlas.motifs.unsupportedTemplates.includes(query.template)) {
    return unknownResult(atlas, query.template, "unsupported-template")
  }
  const { matches, truncated } = templateEvidence(atlas, query.template, query.window)
  const uniqueEntities = countMotifEntities(matches)
  const limitations: string[] = []
  if (incomplete) limitations.push("missing-prehistory")
  if (truncated) limitations.push("truncated-match-budget")
  const status = truncated ? "truncated" : incomplete ? "incomplete" : "exact"
  return {
    ...baseResult(
      atlas,
      query.window
        ? `${query.template}:${query.window.kind}:${query.window.sectionId}`
        : query.template,
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
    const incomplete = atlas.motifs.incompleteCandidates.some(row => row.occurrenceId === matchId)
    return {
      ...baseResult(atlas, matchId, incomplete ? [matchId] : [], [incomplete ? "missing-prehistory" : "unknown-match"]),
      status: incomplete ? "incomplete" : "unknown"
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
): QueryResult<{
  nextNodes: string[]
  supported: boolean
  graphWalkExists: boolean
}> {
  const scope = selection.route?.join(">") ?? selection.fromNode ?? "route"
  if (!atlas.source.occurrences?.length) {
    return unknownResult(atlas, scope, "missing-traces")
  }
  if (selection.route) {
    const evidenceRefs = [
      ...new Set(
        Array.from(
          supportedRouteOccurrences(atlas.source, selection.route),
          (occurrence) => occurrence.id
        )
      )
    ]
    const supported = evidenceRefs.length > 0
    const walk = graphWalkExists(atlas.source, selection.route)
    return {
      ...baseResult(
        atlas,
        scope,
        evidenceRefs,
        supported ? [] : ["unsupported-composite"]
      ),
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
    return unknownResult(atlas, scope, "missing-from-node")
  }
  const next = new Set<string>()
  const evidenceRefs = new Set<string>()
  for (const hop of atlas.ports.hops) {
    if (hop.from !== selection.fromNode || (selection.viaNode != null && hop.via !== selection.viaNode)) continue
    next.add(hop.to)
    for (const id of hop.occurrenceIds) evidenceRefs.add(id)
  }
  const nextNodes = [...next]
  return {
    ...baseResult(atlas, selection.fromNode, [...evidenceRefs]),
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
        residual.has(edge.id) &&
        (edge.source === nodeId || edge.target === nodeId)
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
  return new Set(atlas.source.occurrences?.map(row => row.entityId)).size
}
