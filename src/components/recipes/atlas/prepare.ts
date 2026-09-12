import { buildCompleteness } from "./completeness"
import { assertEdgeCoverage, classifyForest } from "./forests"
import { buildLedger } from "./ledger"
import { matchMotifs } from "./motifs"
import { buildSections } from "./sections"
import { buildRouteSupportIndex } from "./support"
import type {
  AtlasIssue,
  NetworkAtlasSource,
  NetworkAtlasSpec,
  PreparedNetworkAtlas
} from "./types"
import { validateAtlas } from "./validate"

export type PrepareOptions = {
  generation?: number
}

export type PrepareResult =
  | { ok: true; atlas: PreparedNetworkAtlas; issues: AtlasIssue[] }
  | { ok: false; atlas?: undefined; issues: AtlasIssue[] }

function analysisRevision(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource,
  generation: number
): string {
  const sections =
    spec.coordinate.kind === "ordinal" ? spec.coordinate.sectionIds.join(",") : spec.coordinate.field
  return [
    generation,
    source.revision,
    spec.dataRevision,
    spec.motifs.catalogVersion,
    spec.forest.display.rankingPolicyId,
    spec.forest.display.roots.join(","),
    sections
  ].join("|")
}

export function prepareNetworkAtlas(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource,
  options: PrepareOptions = {}
): PrepareResult {
  const validation = validateAtlas(spec, source)
  if (!validation.ok) {
    return { ok: false, issues: validation.issues }
  }
  const generation = options.generation ?? 1
  const sections = buildSections(spec, source)
  const motifs = matchMotifs(spec, source)
  const classified = classifyForest(spec, source)
  assertEdgeCoverage(classified.residual, classified.forest)
  const ledger = buildLedger(spec, source, sections)
  const completeness = buildCompleteness(source, motifs)
  const ports = buildRouteSupportIndex(source)
  const revision = analysisRevision(spec, source, generation)
  const atlas: PreparedNetworkAtlas = {
    sourceGraphRef: source.graphRef,
    analysisRevision: revision,
    spec,
    source,
    sections,
    motifs,
    forest: classified.forest,
    residualEdges: classified.residual,
    ports,
    ledger,
    completeness,
    provenance: {
      sourceRevision: source.revision,
      analysisRevision: revision,
      generation,
      relationScope: "directed-admitted",
      motifCatalogVersion: spec.motifs.catalogVersion,
      coordinatePolicy:
        spec.coordinate.kind === "ordinal"
          ? `ordinal:${spec.coordinate.sectionIds.join(",")}`
          : `numeric:${spec.coordinate.field}`,
      forestRoots: [...spec.forest.display.roots],
      rankingPolicyId: spec.forest.display.rankingPolicyId,
      population: spec.motifs.countUnit,
      temporalHorizon: spec.temporal.kind,
      evidencePolicyId: spec.evidencePolicyId
    }
  }
  return { ok: true, atlas, issues: validation.issues }
}
