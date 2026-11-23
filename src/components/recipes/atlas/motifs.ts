import { entityCountOf, structuralWitnesses, totalEntityWeight } from "./entityCounts"
import { idDictionary } from "./ids"
import {
  MOTIF_CATALOG_TEMPLATES,
  PHASE2_MOTIF_MATCHERS,
  type AtlasOccurrence,
  type MotifMatch,
  type MotifMatchIndex,
  type NetworkAtlasSource,
  type NetworkAtlasSpec
} from "./types"

/** One input-order-preserving index per matching pass. Parallel edge IDs stay
 * distinct while neighbor roles remain unique, as in the original scans.
 */
function motifGraphIndex(source: NetworkAtlasSource) {
  const nodes = new Map(
    source.nodes.map((node) => [
      node.id,
      {
        sectionId: node.sectionId,
        incoming: new Set<string>(),
        edgesTo: new Map<string, string[]>()
      }
    ])
  )
  for (const edge of source.edges) {
    const edgesTo = nodes.get(edge.source)!.edgesTo
    const parallel = edgesTo.get(edge.target)
    if (parallel) parallel.push(edge.id)
    else edgesTo.set(edge.target, [edge.id])
    nodes.get(edge.target)!.incoming.add(edge.source)
  }
  return nodes
}
type MotifGraphIndex = ReturnType<typeof motifGraphIndex>

function sectionOf(index: MotifGraphIndex, nodeId: string): string | undefined {
  return index.get(nodeId)?.sectionId
}

function sectionsAlong(
  index: MotifGraphIndex,
  nodeIds: readonly string[]
): string[] {
  return [
    ...new Set(
      nodeIds
        .map((id) => sectionOf(index, id))
        .filter((id): id is string => Boolean(id))
    )
  ]
}

function edgesBetween(
  index: MotifGraphIndex,
  from: string,
  to: string
): string[] {
  return index.get(from)?.edgesTo.get(to) ?? []
}

function matchEvidence(
  nodePath: string[],
  edgeIds: string[],
  interval: string[],
  occurrences: AtlasOccurrence[],
  [startSectionId, completionSectionId]: (string | undefined)[] = [interval[0], interval.at(-1)]
) {
  const entityWeights = idDictionary<number>()
  for (const occurrence of occurrences)
    entityWeights[occurrence.entityId] = entityCountOf(occurrence)
  const entityIds = Object.keys(entityWeights)
  const observed = entityIds.length > 0
  return {
    nodePath, edgeIds, startSectionId, completionSectionId, intersectSectionIds: interval,
    entityIds,
    entityWeights,
    entityCount: totalEntityWeight(entityWeights),
    flags: {
      occurrence: observed,
      temporal: false,
      trajectorySupported: observed,
      enriched: false
    }
  }
}

function fanMatch(
  template: "fan-out" | "fan-in",
  hubId: string,
  others: string[],
  source: NetworkAtlasSource,
  index: MotifGraphIndex,
  budget: number | undefined
): MotifMatch | undefined {
  if (others.length < 2) return undefined
  const kept = budget === undefined ? others : others.slice(0, budget)
  const truncation = kept.length < others.length
    ? { disclosed: true as const, omitted: others.length - kept.length, fullCount: others.length }
    : undefined
  const nodePath = [hubId, ...kept]
  const outgoing = template === "fan-out"
  const edgeIds = kept.flatMap(other =>
    outgoing ? edgesBetween(index, hubId, other) : edgesBetween(index, other, hubId)
  )
  const interval = sectionsAlong(index, [hubId, ...others])
  const roles: Record<string, string | string[]> =
    outgoing
      ? { source: hubId, destinations: kept }
      : { destination: hubId, sources: kept }
  return {
    id: `${template}:${hubId}`,
    template,
    roles,
    ...matchEvidence(nodePath, edgeIds, interval, structuralWitnesses(nodePath, source.occurrences)),
    truncation
  }
}

function serialChains(
  source: NetworkAtlasSource,
  index: MotifGraphIndex
): MotifMatch[] {
  const internal = (id: string) => {
    const node = index.get(id)!
    return node.incoming.size === 1 && node.edgesTo.size === 1
  }
  const matches: MotifMatch[] = []
  for (const [id, node] of index) {
    if (node.edgesTo.size !== 1) continue
    if (
      node.incoming.size === 1 &&
      internal(node.incoming.values().next().value!)
    )
      continue
    const path = [id]
    const guard = new Set(path)
    let cursor = id
    while (true) {
      const next = index.get(cursor)!.edgesTo.keys().next().value
      if (!next || guard.has(next)) break
      path.push(next)
      guard.add(next)
      if (!internal(next)) break
      cursor = next
    }
    if (path.length < 2) continue
    const edgeIds: string[] = []
    for (let i = 0; i < path.length - 1; i++) {
      edgeIds.push(...edgesBetween(index, path[i], path[i + 1]))
    }
    const interval = sectionsAlong(index, path)
    matches.push({
      id: `serial-chain:${path.join(">")}`,
      template: "serial-chain",
      roles: { nodes: path, start: path[0], end: path[path.length - 1] },
      ...matchEvidence(path, edgeIds, interval, structuralWitnesses(path, source.occurrences))
    })
  }
  return matches
}

function repeatedStateEpisodes(
  source: NetworkAtlasSource,
  graph: MotifGraphIndex
): MotifMatch[] {
  const matches: MotifMatch[] = []
  for (const occurrence of source.occurrences ?? []) {
    if (occurrence.missingPrehistory) continue
    const firstVisits = new Map<string, number | null>()
    for (const [index, stateId] of occurrence.nodePath.entries()) {
      const first = firstVisits.get(stateId)
      if (first === undefined) {
        firstVisits.set(stateId, index)
        continue
      }
      if (first === null) continue
      firstVisits.set(stateId, null)
      const episodePath = occurrence.nodePath.slice(first, index + 1)
      const interval = sectionsAlong(graph, episodePath)
      const section = sectionOf(graph, stateId)
      matches.push({
        id: `repeated-state-episode:${occurrence.id}:${stateId}`,
        template: "repeated-state-episode",
        roles: { state: stateId, occurrence: occurrence.id },
        ...matchEvidence(episodePath, [], interval, [occurrence], [section, section])
      })
    }
  }
  return matches
}

export function matchMotifs(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource
): MotifMatchIndex {
  const budget = spec.motifs.matchBudget
  const index = motifGraphIndex(source)
  const matches: MotifMatch[] = []
  for (const [id, node] of index) {
    for (const template of ["fan-out", "fan-in"] as const) {
      const neighbors = template === "fan-out" ? node.edgesTo.keys() : node.incoming
      const match = fanMatch(template, id, [...neighbors], source, index, budget)
      if (match) matches.push(match)
    }
  }
  matches.push(...serialChains(source, index))
  matches.push(...repeatedStateEpisodes(source, index))

  const incompleteCandidates: MotifMatchIndex["incompleteCandidates"] = []
  for (const occurrence of source.occurrences ?? []) {
    if (!occurrence.missingPrehistory) continue
    for (const template of ["serial-chain", "repeated-state-episode"] as const) {
      incompleteCandidates.push({ template, occurrenceId: occurrence.id, reason: "missing-prehistory" })
    }
  }

  const unsupportedTemplates = MOTIF_CATALOG_TEMPLATES.filter(
    (template) => !PHASE2_MOTIF_MATCHERS.includes(template)
  )

  return {
    catalogId: spec.motifs.catalogId,
    catalogVersion: spec.motifs.catalogVersion,
    matches,
    incompleteCandidates,
    unsupportedTemplates
  }
}

export function operationalLabel(_match: MotifMatch): undefined {
  return undefined
}
