import { traceStatus } from "./entityCounts"
import { idDictionary } from "./ids"
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
    nodes[node.id] = node.completeness ?? "known"
  }

  const motifStatus = idDictionary<CompletenessStatus>()
  for (const template of motifs.unsupportedTemplates) {
    motifStatus[template] = "unsupported-template"
  }
  for (const { template } of motifs.incompleteCandidates) {
    motifStatus[template] = "incomplete"
  }

  const truncated = motifs.matches.find((match) => match.truncation)
  const traces: CompletenessStatus = traceStatus(source.occurrences) === "incomplete"
    ? "incomplete"
    : Object.values(nodes).includes("unknown")
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
