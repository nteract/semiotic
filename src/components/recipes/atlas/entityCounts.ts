import type { AtlasOccurrence, MotifMatch } from "./types"
import { idDictionary } from "./ids"

export function totalEntityWeight(weights: Record<string, number>): number {
  return Object.values(weights).reduce((sum, weight) => sum + weight, 0)
}

export function traceStatus(rows: readonly AtlasOccurrence[] = []) {
  if (!rows.length) return "unknown"
  return rows.some(row => row.missingPrehistory || row.complete === false) ? "incomplete" : "exact"
}

export function entityCountOf(occurrence: AtlasOccurrence): number {
  return occurrence.entityCount ?? 1
}

export function structuralWitnesses(nodePath: readonly string[], occurrences: readonly AtlasOccurrence[] = []) {
  const nodes = new Set(nodePath)
  return occurrences.filter(row => !row.missingPrehistory && row.nodePath.some(id => nodes.has(id)))
}

/** Count each entity once across matching episodes, optionally within a partition. */
export function countMotifEntities(
  matches: readonly MotifMatch[],
  occurrences?: readonly AtlasOccurrence[]
): number {
  const weights = idDictionary<number>()
  let total = 0
  if (occurrences === undefined) {
    for (const match of matches) {
      if (Object.keys(match.entityWeights).length) Object.assign(weights, match.entityWeights)
      else total += match.entityCount
    }
  } else {
    const episodeIds = new Set<string>()
    const structuralNodes = new Set<string>()
    for (const match of matches) {
      const id = match.roles.occurrence
      if (typeof id === "string") episodeIds.add(id)
      else for (const node of match.nodePath) structuralNodes.add(node)
    }
    for (const occurrence of occurrences) {
      if (occurrence.missingPrehistory) continue
      if (
        episodeIds.has(occurrence.id) ||
        occurrence.nodePath.some((node) => structuralNodes.has(node))
      )
        weights[occurrence.entityId] = entityCountOf(occurrence)
    }
  }
  return total + totalEntityWeight(weights)
}
