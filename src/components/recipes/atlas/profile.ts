import type {
  EvidenceStatus,
  MotifTemplate,
  PreparedNetworkAtlas
} from "./types"
import { assignedDenominator } from "./compare"

export type MotifProfileCell = {
  template: MotifTemplate
  sectionId: string
  partition?: string
  completionCount: number
  intersectionCount: number
  denominator: number
  status: EvidenceStatus
}

export type MotifProfileStrip = {
  templates: MotifTemplate[]
  sections: string[]
  cells: MotifProfileCell[]
}

export function buildMotifProfile(
  atlas: PreparedNetworkAtlas,
  options: { templates?: MotifTemplate[]; partition?: string } = {}
): MotifProfileStrip {
  const templates = options.templates ?? ["repeated-state-episode"]
  const sections =
    atlas.spec.coordinate.kind === "ordinal" ? atlas.spec.coordinate.sectionIds : []
  const denominator =
    (options.partition ? assignedDenominator(atlas, options.partition) : undefined) ??
    (atlas.spec.comparison
      ? atlas.comparison?.rows.reduce((sum, row) => sum + row.assigned, 0)
      : undefined) ??
    0
  const cells: MotifProfileCell[] = []
  const incomplete = atlas.motifs.incompleteCandidates.length > 0
  for (const template of templates) {
    for (const sectionId of sections) {
      const matches = atlas.motifs.matches.filter((match) => {
        if (match.template !== template) return false
        if (!options.partition) return true
        return match.entityIds.some((id) =>
          (atlas.source.occurrences ?? []).some(
            (occurrence) =>
              occurrence.entityId === id && occurrence.partition === options.partition
          )
        )
      })
      const completionCount = matches
        .filter((match) => match.completionSectionId === sectionId)
        .reduce((sum, match) => sum + partitionWeight(atlas, match.entityWeights, options.partition), 0)
      const intersectionCount = matches
        .filter((match) => match.intersectSectionIds.includes(sectionId))
        .reduce((sum, match) => sum + partitionWeight(atlas, match.entityWeights, options.partition), 0)
      cells.push({
        template,
        sectionId,
        partition: options.partition,
        completionCount,
        intersectionCount,
        denominator,
        status: incomplete ? "incomplete" : "exact"
      })
    }
  }
  return { templates, sections, cells }
}

function partitionWeight(
  atlas: PreparedNetworkAtlas,
  weights: Record<string, number>,
  partition?: string
): number {
  if (!partition) {
    return Object.values(weights).reduce((sum, value) => sum + value, 0)
  }
  let total = 0
  for (const occurrence of atlas.source.occurrences ?? []) {
    if (occurrence.partition !== partition) continue
    total += weights[occurrence.entityId] ?? 0
  }
  return total
}
