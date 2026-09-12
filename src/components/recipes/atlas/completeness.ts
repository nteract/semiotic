import { idDictionary, setOwnValue } from "./ids"
import type {
  CompletenessReport,
  CompletenessStatus,
  MotifMatchIndex,
  MotifTemplate,
  NetworkAtlasSource
} from "./types"

export function buildCompleteness(
  source: NetworkAtlasSource,
  motifs: MotifMatchIndex
): CompletenessReport {
  const nodes = idDictionary<CompletenessStatus>()
  for (const node of source.nodes) {
    setOwnValue(nodes, node.id, node.completeness ?? "known")
  }

  const motifStatus = idDictionary<CompletenessStatus>()
  for (const template of motifs.unsupportedTemplates) {
    setOwnValue(motifStatus, template, "unsupported-template")
  }
  if (motifs.incompleteCandidates.length > 0) {
    const templates = new Set(
      motifs.incompleteCandidates.map((row) => row.template)
    )
    for (const template of templates) {
      setOwnValue(motifStatus, template, "incomplete")
    }
  }

  const truncated = motifs.matches.find((match) => match.truncation)
  const traces: CompletenessStatus = source.occurrences?.some(
    (row) => row.missingPrehistory || row.complete === false
  )
    ? "incomplete"
    : source.nodes.some((node) => node.completeness === "unknown")
      ? "unknown"
      : "known"

  const report: CompletenessReport = { nodes, motifs: motifStatus, traces }
  if (truncated?.truncation) {
    report.truncation = {
      disclosed: true,
      template: truncated.template as MotifTemplate,
      omitted: truncated.truncation.omitted
    }
  }
  return report
}
