import { countMotifEntities } from "./entityCounts"
import { ledgerValue } from "./ledger"
import type { PreparedComparison, PreparedNetworkAtlas } from "./types"

export function buildComparison(
  atlas: PreparedNetworkAtlas
): PreparedComparison | undefined {
  const spec = atlas.spec.comparison
  if (!spec) return undefined
  const rows = spec.partitions.map((partition) => {
    const assigned =
      ledgerValue(atlas.ledger, spec.denominatorMeasureId, partition)?.value ??
      0
    const motifUsers: Record<string, number> = {}
    motifUsers["repeated-state-episode"] = countMotifEntities(
      atlas.motifs.matches.filter(
        (match) => match.template === "repeated-state-episode"
      ),
      atlas.source.occurrences,
      partition
    )
    const purchases =
      ledgerValue(atlas.ledger, "purchases", partition)?.value ?? 0
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
  const measureId =
    atlas.spec.comparison?.denominatorMeasureId ??
    atlas.spec.motifs.denominatorRef ??
    "assigned"
  return ledgerValue(atlas.ledger, measureId, subjectId)?.value
}

export function signedDifferenceBps(
  left: number,
  right: number,
  denominator: number
): number {
  if (denominator === 0 || (left * 10000) % denominator !== 0) {
    return Math.round(((right - left) / Math.max(denominator, 1)) * 10000)
  }
  return ((right - left) * 10000) / denominator
}
