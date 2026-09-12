import { ledgerValue } from "./ledger"
import type { PreparedComparison, PreparedNetworkAtlas } from "./types"

export function buildComparison(atlas: PreparedNetworkAtlas): PreparedComparison | undefined {
  const spec = atlas.spec.comparison
  if (!spec) return undefined
  const rows = spec.partitions.map((partition) => {
    const assigned =
      ledgerValue(atlas.ledger, spec.denominatorMeasureId, partition)?.value ?? 0
    const motifUsers: Record<string, number> = {}
    const seen = new Set<string>()
    for (const match of atlas.motifs.matches) {
      if (match.template !== "repeated-state-episode") continue
      for (const occurrence of atlas.source.occurrences ?? []) {
        if (occurrence.missingPrehistory) continue
        if (occurrence.partition !== partition) continue
        if (!match.entityWeights[occurrence.entityId]) continue
        const key = `${match.template}:${occurrence.entityId}`
        if (seen.has(key)) continue
        seen.add(key)
        motifUsers[match.template] =
          (motifUsers[match.template] ?? 0) + (occurrence.entityCount ?? 1)
      }
    }
    const purchases = ledgerValue(atlas.ledger, "purchases", partition)?.value ?? 0
    return {
      partition,
      assigned,
      motifUsers,
      outcomes: { purchases }
    }
  })
  return {
    partitions: [...spec.partitions],
    denominatorMeasureId: spec.denominatorMeasureId,
    referencePartition: spec.referencePartition,
    rows
  }
}

export function assignedDenominator(
  atlas: PreparedNetworkAtlas,
  subjectId: string
): number | undefined {
  const measureId = atlas.spec.comparison?.denominatorMeasureId ?? "assigned"
  return ledgerValue(atlas.ledger, measureId, subjectId)?.value
}

export function signedDifferenceBps(left: number, right: number, denominator: number): number {
  if (denominator === 0 || (left * 10000) % denominator !== 0) {
    return Math.round(((right - left) / Math.max(denominator, 1)) * 10000)
  }
  return ((right - left) * 10000) / denominator
}
