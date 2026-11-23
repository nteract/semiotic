import { buildComparison } from "./compare"
import { buildCompleteness } from "./completeness"
import { assertEdgeCoverage, classifyForest } from "./forests"
import { buildLedger } from "./ledger"
import { matchMotifs } from "./motifs"
import { buildPrefixForest } from "./prefixForest"
import { buildSections } from "./sections"
import { buildRouteSupportIndex } from "./support"
import { buildRequiredPaths } from "./requiredPaths"
import type {
  AtlasIssue,
  NetworkAtlasSource,
  NetworkAtlasSpec,
  PreparedNetworkAtlas
} from "./types"
import { validateAtlas } from "./validate"
import { isDataRecord } from "../../charts/shared/dataRecords"

export type PrepareOptions = {
  generation?: number
}

export type PrepareResult =
  | { ok: true; atlas: PreparedNetworkAtlas; issues: AtlasIssue[] }
  | { ok: false; atlas?: undefined; issues: AtlasIssue[] }

function invalidPreparation(kind: string, message: string): PrepareResult {
  return { ok: false, issues: [{ kind, severity: "fatal", message }] }
}

function analysisRevision(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource,
  generation: number
): string {
  // Include the complete spec and preserve array order without delimiter collisions.
  // Sorting object keys makes equivalent specs independent of property insertion order.
  return JSON.stringify(
    [generation, source.graphRef, source.revision, spec],
    (_, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, value[key]])
          )
        : value
  )
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
  if (
    !isDataRecord(options) ||
    (options.generation !== undefined &&
      (!Number.isSafeInteger(options.generation) || options.generation < 0))
  ) {
    return invalidPreparation("generation", "generation must be a nonnegative safe integer")
  }
  const generation = options.generation ?? 1
  let revision: string
  try {
    revision = analysisRevision(spec, source, generation)
  } catch {
    // Optional extension fields still contribute to the revision. Cycles and
    // non-JSON values must fail before any derived atlas is built.
    return invalidPreparation("spec-serialization", "atlas spec must be serializable as JSON")
  }
  const sections = buildSections(spec, source)
  const motifs = matchMotifs(spec, source)
  const classified = classifyForest(spec, source)
  assertEdgeCoverage(classified.residual, classified.forest)
  const ledger = buildLedger(spec, source, sections)
  const completeness = buildCompleteness(source, motifs)
  const ports = buildRouteSupportIndex(source)
  const display = spec.forest.display
  const occurrences = source.occurrences ?? []
  const observed = display.kind === "observed-prefix"
  const prefixForest = observed || occurrences.length
    ? buildPrefixForest(occurrences, {
        referencePartition: (observed ? display.referencePartition : undefined) ?? spec.comparison?.referencePartition
      })
    : undefined
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
      forestRoots: [...(spec.forest.display.roots ?? classified.forest.roots)],
      rankingPolicyId: classified.forest.rankingPolicyId,
      population: spec.motifs.countUnit,
      temporalHorizon: spec.temporal.kind,
      evidencePolicyId: spec.evidencePolicyId
    },
    prefixForest,
    ...(spec.forest.requiredPaths && {
      requiredPaths: buildRequiredPaths(source, spec.forest.requiredPaths)
    })
  }
  atlas.comparison = buildComparison(atlas)
  return { ok: true, atlas, issues: validation.issues }
}
