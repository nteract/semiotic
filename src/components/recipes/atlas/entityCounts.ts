import type { AtlasOccurrence, MotifMatch } from "./types"

/** Count each entity once across matching episodes, optionally within a partition. */
export function countMotifEntities(
  matches: readonly MotifMatch[],
  occurrences: readonly AtlasOccurrence[] = [],
  partition?: string | readonly string[]
): number {
  const partitions =
    partition === undefined
      ? undefined
      : new Set(typeof partition === "string" ? [partition] : partition)
  const admitted = occurrences.filter(
    (occurrence) =>
      !occurrence.missingPrehistory &&
      occurrence.partition !== undefined &&
      partitions?.has(occurrence.partition)
  )
  const occurrenceIds = new Set(admitted.map((occurrence) => occurrence.id))
  const entityIds = new Set(admitted.map((occurrence) => occurrence.entityId))
  const weights = new Map<string, number>()
  let structuralCount = 0
  for (const match of matches) {
    if (
      partition !== undefined &&
      typeof match.roles.occurrence === "string" &&
      !occurrenceIds.has(match.roles.occurrence)
    )
      continue
    const entries = Object.entries(match.entityWeights)
    if (entries.length === 0 && partition === undefined)
      structuralCount += match.entityCount
    for (const [id, weight] of entries) {
      if (partition === undefined || entityIds.has(id)) weights.set(id, weight)
    }
  }
  return [...weights.values()].reduce(
    (sum, weight) => sum + weight,
    structuralCount
  )
}
