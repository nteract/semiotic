import { idDictionary, setOwnValue } from "./ids"
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
  const incoming = new Map(
    source.nodes.map((node) => [node.id, new Set<string>()])
  )
  const outgoing = new Map(
    source.nodes.map((node) => [node.id, new Set<string>()])
  )
  const pairs = new Map<string, Map<string, string[]>>()
  for (const edge of source.edges) {
    incoming.get(edge.target)?.add(edge.source)
    outgoing.get(edge.source)?.add(edge.target)
    let targets = pairs.get(edge.source)
    if (!targets) pairs.set(edge.source, (targets = new Map()))
    const ids = targets.get(edge.target)
    if (ids) ids.push(edge.id)
    else targets.set(edge.target, [edge.id])
  }
  return {
    incoming: new Map(
      [...incoming].map(([id, neighbors]) => [id, [...neighbors]])
    ),
    outgoing: new Map(
      [...outgoing].map(([id, neighbors]) => [id, [...neighbors]])
    ),
    sectionByNode: new Map(
      source.nodes.map((node) => [node.id, node.sectionId])
    ),
    pairs
  }
}
type MotifGraphIndex = ReturnType<typeof motifGraphIndex>

function sectionOf(index: MotifGraphIndex, nodeId: string): string | undefined {
  return index.sectionByNode.get(nodeId)
}

function sectionsAlong(
  index: MotifGraphIndex,
  nodeIds: readonly string[]
): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const nodeId of nodeIds) {
    const sectionId = sectionOf(index, nodeId)
    if (!sectionId || seen.has(sectionId)) continue
    seen.add(sectionId)
    ordered.push(sectionId)
  }
  return ordered
}

function edgesBetween(
  index: MotifGraphIndex,
  from: string,
  to: string
): string[] {
  return index.pairs.get(from)?.get(to) ?? []
}

function entityCountOf(occurrence: AtlasOccurrence): number {
  return occurrence.entityCount ?? 1
}

function entitiesVisiting(
  occurrences: readonly AtlasOccurrence[],
  hubId: string
): { entityIds: string[]; entityCount: number } {
  const entityIds: string[] = []
  let entityCount = 0
  for (const occurrence of occurrences) {
    if (!occurrence.nodePath.includes(hubId) || occurrence.missingPrehistory) {
      continue
    }
    entityIds.push(occurrence.entityId)
    entityCount += entityCountOf(occurrence)
  }
  return { entityIds, entityCount }
}

function applyBudget(
  destinations: string[],
  budget: number | undefined
): { kept: string[]; truncation?: MotifMatch["truncation"] } {
  if (budget == null || destinations.length <= budget) {
    return { kept: destinations }
  }
  return {
    kept: destinations.slice(0, budget),
    truncation: {
      disclosed: true,
      omitted: destinations.length - budget,
      fullCount: destinations.length
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
  const { kept, truncation } = applyBudget(others, budget)
  const nodePath = [hubId, ...kept]
  const edgeIds: string[] = []
  for (const other of kept) {
    const pair =
      template === "fan-out"
        ? edgesBetween(index, hubId, other)
        : edgesBetween(index, other, hubId)
    edgeIds.push(...pair)
  }
  const interval = sectionsAlong(index, [hubId, ...others])
  const bound = entitiesVisiting(source.occurrences ?? [], hubId)
  const roles: Record<string, string | string[]> =
    template === "fan-out"
      ? { source: hubId, destinations: kept }
      : { destination: hubId, sources: kept }
  return {
    id: `${template}:${hubId}`,
    template,
    roles,
    nodePath,
    edgeIds,
    startSectionId: interval[0],
    completionSectionId: interval[interval.length - 1],
    intersectSectionIds: interval,
    entityIds: bound.entityIds,
    entityWeights: idDictionary<number>(),
    entityCount: bound.entityCount,
    flags: {
      occurrence: bound.entityIds.length > 0,
      temporal: false,
      trajectorySupported: bound.entityIds.length > 0,
      enriched: false
    },
    truncation
  }
}

function isChainInternal(
  nodeId: string,
  ins: string[],
  outs: string[]
): boolean {
  return ins.length === 1 && outs.length === 1
}

function serialChains(
  source: NetworkAtlasSource,
  index: MotifGraphIndex
): MotifMatch[] {
  const ins = index.incoming
  const outs = index.outgoing
  const matches: MotifMatch[] = []
  for (const node of source.nodes) {
    const inN = ins.get(node.id) ?? []
    const outN = outs.get(node.id) ?? []
    if (outN.length !== 1) continue
    const predecessorIsInternal =
      inN.length === 1 &&
      isChainInternal(inN[0], ins.get(inN[0]) ?? [], outs.get(inN[0]) ?? [])
    if (isChainInternal(node.id, inN, outN) && predecessorIsInternal) continue
    const path = [node.id]
    let cursor = node.id
    const guard = new Set<string>([cursor])
    while (true) {
      const next = (outs.get(cursor) ?? [])[0]
      if (!next || guard.has(next)) break
      path.push(next)
      guard.add(next)
      if (!isChainInternal(next, ins.get(next) ?? [], outs.get(next) ?? []))
        break
      cursor = next
    }
    if (path.length < 2) continue
    const edgeIds: string[] = []
    for (let i = 0; i < path.length - 1; i++) {
      edgeIds.push(...edgesBetween(index, path[i], path[i + 1]))
    }
    const interval = sectionsAlong(index, path)
    const bound = entitiesVisiting(source.occurrences ?? [], path[0])
    matches.push({
      id: `serial-chain:${path.join(">")}`,
      template: "serial-chain",
      roles: { nodes: path, start: path[0], end: path[path.length - 1] },
      nodePath: path,
      edgeIds,
      startSectionId: interval[0],
      completionSectionId: interval[interval.length - 1],
      intersectSectionIds: interval,
      entityIds: bound.entityIds,
      entityWeights: idDictionary<number>(),
      entityCount: bound.entityCount,
      flags: {
        occurrence: bound.entityIds.length > 0,
        temporal: false,
        trajectorySupported: bound.entityIds.length > 0,
        enriched: false
      }
    })
  }
  return matches
}

function bindOccurrenceEntities(
  matches: MotifMatch[],
  source: NetworkAtlasSource
): void {
  const occurrences = source.occurrences ?? []
  if (occurrences.length === 0) return
  for (const match of matches) {
    if (match.template === "repeated-state-episode") continue
    const roleNodes = match.nodePath
    const weights = idDictionary<number>()
    for (const occurrence of occurrences) {
      if (occurrence.missingPrehistory) continue
      const visitsHub = roleNodes.some((nodeId) =>
        occurrence.nodePath.includes(nodeId)
      )
      if (!visitsHub) continue
      setOwnValue(weights, occurrence.entityId, entityCountOf(occurrence))
    }
    const entityIds = Object.keys(weights)
    match.entityIds = entityIds
    match.entityWeights = weights
    match.entityCount = entityIds.reduce(
      (sum, id) => sum + (weights[id] ?? 0),
      0
    )
    match.flags = {
      ...match.flags,
      occurrence: entityIds.length > 0,
      trajectorySupported: entityIds.length > 0
    }
  }
}

function repeatedStateEpisodes(
  source: NetworkAtlasSource,
  graph: MotifGraphIndex
): MotifMatch[] {
  const matches: MotifMatch[] = []
  for (const occurrence of source.occurrences ?? []) {
    if (occurrence.missingPrehistory) continue
    const firstVisits = new Map<string, number>()
    const completed = new Set<string>()
    for (const [index, stateId] of occurrence.nodePath.entries()) {
      const first = firstVisits.get(stateId)
      if (first == null) {
        firstVisits.set(stateId, index)
        continue
      }
      if (completed.has(stateId)) continue
      completed.add(stateId)
      const episodePath = occurrence.nodePath.slice(first, index + 1)
      const interval = sectionsAlong(graph, episodePath)
      const weights = idDictionary<number>()
      setOwnValue(weights, occurrence.entityId, entityCountOf(occurrence))
      matches.push({
        id: `repeated-state-episode:${occurrence.id}:${stateId}`,
        template: "repeated-state-episode",
        roles: { state: stateId, occurrence: occurrence.id },
        nodePath: episodePath,
        edgeIds: [],
        startSectionId: sectionOf(graph, episodePath[0]),
        completionSectionId: sectionOf(
          graph,
          episodePath[episodePath.length - 1]
        ),
        intersectSectionIds: interval,
        entityIds: [occurrence.entityId],
        entityWeights: weights,
        entityCount: entityCountOf(occurrence),
        flags: {
          occurrence: true,
          temporal: false,
          trajectorySupported: true,
          enriched: false
        }
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
  for (const node of source.nodes) {
    const fanOut = fanMatch(
      "fan-out",
      node.id,
      index.outgoing.get(node.id) ?? [],
      source,
      index,
      budget
    )
    if (fanOut) matches.push(fanOut)
    const fanIn = fanMatch(
      "fan-in",
      node.id,
      index.incoming.get(node.id) ?? [],
      source,
      index,
      budget
    )
    if (fanIn) matches.push(fanIn)
  }
  matches.push(...serialChains(source, index))
  matches.push(...repeatedStateEpisodes(source, index))
  bindOccurrenceEntities(matches, source)

  const incompleteCandidates: MotifMatchIndex["incompleteCandidates"] = []
  for (const occurrence of source.occurrences ?? []) {
    if (!occurrence.missingPrehistory) continue
    incompleteCandidates.push({
      template: "serial-chain",
      occurrenceId: occurrence.id,
      reason: "missing-prehistory"
    })
    incompleteCandidates.push({
      template: "repeated-state-episode",
      occurrenceId: occurrence.id,
      reason: "missing-prehistory"
    })
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
