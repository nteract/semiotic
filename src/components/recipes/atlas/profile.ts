import type {
  EvidenceStatus,
  MotifTemplate,
  PreparedNetworkAtlas
} from "./types"
import { countMotifEntities, traceStatus } from "./entityCounts"
import { ledgerValue, leastCertain } from "./ledger"
import { availableValue, denominatorId, countsEntities, observedTemplates, templateEvidence } from "./compare"

export type MotifProfileCell = {
  template: MotifTemplate
  sectionId: string
  partition?: string
  completionCount: number
  intersectionCount: number
  /** Population total, or NaN when the ledger cannot supply a full total. */
  denominator: number
  denominatorStatus?: EvidenceStatus
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
  const templates = observedTemplates(atlas.motifs.matches, options.templates ?? atlas.spec.comparison?.motifTemplates)
  const sections = atlas.sections.sectionIds
  const partitions = options.partition === undefined ? atlas.spec.comparison?.partitions : [options.partition]
  const measure = denominatorId(atlas)
  const populations = partitions
    ? partitions.map(id => ledgerValue(atlas.ledger, measure, id))
    : [atlas.ledger.entries.find(entry => entry.subjectKind === "global" && entry.measureId === measure)]
  let denominatorStatus: EvidenceStatus = "exact"
  let denominator = 0
  for (const entry of populations) {
    denominatorStatus = leastCertain(denominatorStatus, entry?.status ?? "unknown")
    denominator += availableValue(entry) ?? NaN
  }
  const selected = partitions && new Set(partitions)
  const rows = (atlas.source.occurrences ?? []).filter(row => !selected || selected.has(row.partition!))
  const evidence = countsEntities(atlas) ? traceStatus(rows) : "unknown"
  const partial = selected && new Set(rows.map(row => row.partition)).size < selected.size
  function count(matches: typeof atlas.motifs.matches) {
    return countMotifEntities(matches, partitions ? rows : undefined)
  }
  const cells: MotifProfileCell[] = []
  for (const template of templates) {
    const { matches, truncated } = templateEvidence(atlas, template)
    const status = atlas.motifs.unsupportedTemplates.includes(template) ? "unknown"
      : evidence === "exact" && (partial || truncated) ? "incomplete" : evidence
    for (const sectionId of sections) {
      cells.push({
        template,
        sectionId,
        partition: options.partition,
        completionCount: count(matches.filter(match => match.completionSectionId === sectionId)),
        intersectionCount: count(matches.filter(match => match.intersectSectionIds.includes(sectionId))),
        denominator,
        denominatorStatus,
        status: leastCertain(status, denominatorStatus)
      })
    }
  }
  return { templates, sections, cells }
}
