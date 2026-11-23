import { isDataRecord } from "../../charts/shared/dataRecords"
import { measureSubjectKey } from "./ledger"
import { ownValue } from "./ids"
import { validateAtlasShape } from "./validateShape"
import {
  NETWORK_ATLAS_SCHEMA_VERSION,
  PHASE2_MOTIF_MATCHERS,
  type AtlasIssue,
  type NetworkAtlasSource,
  type NetworkAtlasSpec
} from "./types"

export type AtlasValidation = {
  ok: boolean
  issues: AtlasIssue[]
}

export function isOutcomeMeasure(spec: NetworkAtlasSpec, id: string, population: string) {
  const outcome = ownValue(spec.measures, id)
  const denominator = ownValue(spec.measures, population)
  return outcome?.unitKind === "stock" && denominator?.unitKind === "stock" && outcome.countUnit === denominator.countUnit
}

export function validateAtlas(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource
): AtlasValidation {
  const issues = validateAtlasShape(spec, source)
  function fatal(kind: string, message: string, id?: string) {
    issues.push({ kind, severity: "fatal", message, id })
  }
  function checkRoots(roots: string[], kind: string, message: string) {
    for (const root of roots) if (!nodeIds.has(root)) fatal(kind, message, root)
  }
  function recordId(ids: Set<string>, id: string, kind: string, message: string, subjectId = id) {
    if (ids.has(id)) fatal(kind, message, subjectId)
    ids.add(id)
  }
  if (issues.length) return { ok: false, issues }
  if (spec.schemaVersion !== NETWORK_ATLAS_SCHEMA_VERSION) {
    fatal(
      "schema-version",
      `expected schemaVersion ${NETWORK_ATLAS_SCHEMA_VERSION}`
    )
  }
  if (
    spec.relations.directed !== true ||
    spec.relations.edgeIdRequired !== true ||
    spec.relations.parallelEdges !== "keep-by-id" ||
    spec.relations.selfLoops !== "keep-by-id"
  ) {
    fatal("relations", "Phase 1 requires directed edges, preserving parallel edges and self-loops by id")
  }
  if (
    spec.forest.display.kind !== "rooted-backbone" &&
    spec.forest.display.kind !== "observed-prefix"
  ) {
    fatal("forest", "supported display kinds: rooted-backbone, observed-prefix")
  }
  if (spec.coordinate.kind !== "ordinal") {
    fatal("coordinate", "Phase 1 kernel uses ordinal sections")
  }

  const nodeIds = new Set<string>()
  for (const node of source.nodes) {
    if (!node.id) {
      fatal("node-id", "node is missing id")
      continue
    }
    recordId(nodeIds, node.id, "duplicate-node", "duplicate node id")
    if (
      spec.coordinate.kind === "ordinal" &&
      node.sectionId &&
      !spec.coordinate.sectionIds.includes(node.sectionId)
    ) {
      fatal(
        "section-membership",
        `node section ${node.sectionId} is not in the coordinate`,
        node.id
      )
    }
  }

  const edgeIds = new Set<string>()
  for (const edge of source.edges) {
    if (!edge.id) {
      fatal("edge-id", "edge is missing id")
      continue
    }
    recordId(edgeIds, edge.id, "duplicate-edge", "duplicate edge id")
    for (const key of ["source", "target"] as const) {
      if (!nodeIds.has(edge[key])) fatal(`dangling-${key}`, `edge ${key} is not a node`, edge.id)
    }
  }

  checkRoots(spec.forest.display.roots ?? [], "missing-root", "display root is not a node")
  const required = spec.forest.requiredPaths
  if (required) {
    if (required.relationScopeId !== "directed-admitted") {
      fatal("required-path-scope", "required paths use the full directed-admitted relation scope")
    }
    if (required.roots.length === 0) {
      fatal("required-path-roots", "required paths need declared roots")
    }
    checkRoots(required.roots, "required-path-roots", "required-path root is not a node")
  }
  if (
    spec.forest.display.kind === "rooted-backbone" &&
    spec.forest.display.roots.length === 0
  ) {
    fatal("missing-root", "rooted-backbone requires at least one root")
  }
  if (spec.comparison) {
    const {
      partitions,
      referencePartition,
      denominatorMeasureId,
      outcomeMeasureIds,
      motifTemplates
    } = spec.comparison
    if (partitions.length < 2) fatal("comparison", "comparison requires at least two partitions")
    if (
      new Set(partitions).size !== partitions.length ||
      (referencePartition !== undefined &&
        !partitions.includes(referencePartition))
    ) {
      fatal(
        "comparison-partitions",
        "use distinct partitions and a listed reference"
      )
    }
    for (const id of outcomeMeasureIds ?? []) {
      if (!isOutcomeMeasure(spec, id, denominatorMeasureId)) {
        fatal(
          "comparison-outcome",
          "outcome must be a comparable stock measure",
          id
        )
      }
    }
    for (const template of motifTemplates ?? []) {
      if (!PHASE2_MOTIF_MATCHERS.includes(template))
        fatal(
          "comparison-template",
          "unsupported comparison motif",
          template
        )
    }
    if (!ownValue(spec.measures, denominatorMeasureId)) {
      fatal(
        "comparison-denominator",
        "comparison denominatorMeasureId is not a declared measure"
      )
    }
  }

  for (const [measureId, measure] of Object.entries(spec.measures)) {
    if (measure.unitKind === "rate" && !measure.timeDenominator) {
      fatal(
        "rate-denominator",
        "rate measures require a timeDenominator",
        measureId
      )
    }
  }

  const measureSubjects = new Set<string>()
  for (const row of source.measureValues) {
    const key = measureSubjectKey(row.measureId, row.subjectId)
    recordId(measureSubjects, key, "duplicate-measure-value",
      "measureValue must be unique per measureId and subjectId", row.subjectId)
    const measure = ownValue(spec.measures, row.measureId)
    if (!measure) {
      fatal(
        "unknown-measure",
        "measureValue refers to an undeclared measure",
        row.measureId
      )
      continue
    }
    if (!Number.isFinite(row.value)) {
      fatal("non-finite-measure", "measure value is not finite", row.measureId)
    }
  }

  const occurrenceIds = new Set<string>()
  for (const occurrence of source.occurrences ?? []) {
    if (!occurrence.id || !occurrence.entityId) {
      fatal("occurrence", "occurrence needs id and entityId")
      continue
    }
    recordId(occurrenceIds, occurrence.id, "duplicate-occurrence", "occurrence id must be unique")
    if (
      occurrence.stepEntityCounts !== undefined &&
      (!Array.isArray(occurrence.stepEntityCounts) ||
        occurrence.stepEntityCounts.length !== occurrence.nodePath.length ||
        Array.from(occurrence.stepEntityCounts).some(
          (count) => !Number.isFinite(count) || count < 0
        ))
    ) {
      fatal(
        "occurrence-step-counts",
        "stepEntityCounts must contain one finite, nonnegative count per nodePath step",
        occurrence.id
      )
    }
    for (const nodeId of occurrence.nodePath) {
      if (!nodeIds.has(nodeId)) {
        fatal(
          "occurrence-node",
          "occurrence path references a missing node",
          occurrence.id
        )
      }
    }
  }

  return { ok: issues.length === 0, issues }
}

export function measuresAreComparable(
  leftId: string,
  rightId: string,
  spec: NetworkAtlasSpec
): { ok: true } | { ok: false; reason: string } {
  const measures = isDataRecord(spec?.measures) ? spec.measures : {}
  const left = ownValue(measures, leftId)
  const right = ownValue(measures, rightId)
  if (!isDataRecord(left) || !isDataRecord(right)) return { ok: false, reason: "unknown-measure" }
  if (left.countUnit !== right.countUnit) {
    return { ok: false, reason: "count-unit-mismatch" }
  }
  const involvesRate = left.unitKind === "rate" || right.unitKind === "rate"
  if (involvesRate) {
    if (left.unitKind !== right.unitKind) {
      return {
        ok: false,
        reason: "stock-or-capacity-cannot-compare-to-rate"
      }
    }
    if (left.timeDenominator !== right.timeDenominator) {
      return { ok: false, reason: "rate-time-denominator-mismatch" }
    }
  }
  return { ok: true }
}
