import type {
  EvidenceStatus,
  MotifTemplate,
  PreparedNetworkAtlas
} from "./types"
import { countMotifEntities } from "./entityCounts"
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
    atlas.spec.coordinate.kind === "ordinal"
      ? atlas.spec.coordinate.sectionIds
      : []
  const denominator =
    options.partition !== undefined
      ? (assignedDenominator(atlas, options.partition) ?? 0)
      : atlas.spec.comparison
        ? (atlas.comparison?.rows.reduce((sum, row) => sum + row.assigned, 0) ??
          0)
        : (atlas.ledger.entries.find(
            (entry) =>
              entry.subjectKind === "global" &&
              entry.measureId === atlas.spec.motifs.denominatorRef
          )?.value ?? 0)
  const count = (matches: typeof atlas.motifs.matches) =>
    countMotifEntities(
      matches,
      atlas.source.occurrences,
      options.partition ?? atlas.spec.comparison?.partitions
    )
  const cells: MotifProfileCell[] = []
  const incomplete = atlas.motifs.incompleteCandidates.length > 0
  for (const template of templates) {
    for (const sectionId of sections) {
      const matches = atlas.motifs.matches.filter(
        (match) => match.template === template
      )
      const completionCount = count(
        matches.filter((match) => match.completionSectionId === sectionId)
      )
      const intersectionCount = count(
        matches.filter((match) => match.intersectSectionIds.includes(sectionId))
      )
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
