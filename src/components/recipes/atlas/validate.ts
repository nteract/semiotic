import { idDictionary, ownValue, setOwnValue } from "./ids"
import { validateAtlasShape } from "./validateShape"
import {
  NETWORK_ATLAS_SCHEMA_VERSION,
  type AtlasIssue,
  type NetworkAtlasSource,
  type NetworkAtlasSpec
} from "./types"

export type AtlasValidation = {
  ok: boolean
  issues: AtlasIssue[]
}

function fatal(
  issues: AtlasIssue[],
  kind: string,
  message: string,
  id?: string
): void {
  issues.push({ kind, severity: "fatal", message, id })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function validateAtlas(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource
): AtlasValidation {
  const issues = validateAtlasShape(spec, source)
  if (issues.length) return { ok: false, issues }
  if (spec.schemaVersion !== NETWORK_ATLAS_SCHEMA_VERSION) {
    fatal(
      issues,
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
    fatal(issues, "relations", "Phase 1 requires directed edges, preserving parallel edges and self-loops by id")
  }
  if (
    spec.forest.display.kind !== "rooted-backbone" &&
    spec.forest.display.kind !== "observed-prefix"
  ) {
    fatal(issues, "forest", "supported display kinds: rooted-backbone, observed-prefix")
  }
  if (spec.coordinate.kind !== "ordinal") {
    fatal(issues, "coordinate", "Phase 1 kernel uses ordinal sections")
  }

  const nodeIds = idDictionary<true>()
  for (const node of source.nodes) {
    if (!node.id) {
      fatal(issues, "node-id", "node is missing id")
      continue
    }
    if (nodeIds[node.id]) {
      fatal(issues, "duplicate-node", "duplicate node id", node.id)
    }
    setOwnValue(nodeIds, node.id, true)
    if (
      spec.coordinate.kind === "ordinal" &&
      node.sectionId &&
      !spec.coordinate.sectionIds.includes(node.sectionId)
    ) {
      fatal(
        issues,
        "section-membership",
        `node section ${node.sectionId} is not in the coordinate`,
        node.id
      )
    }
  }

  const edgeIds = idDictionary<true>()
  for (const edge of source.edges) {
    if (!edge.id) {
      fatal(issues, "edge-id", "edge is missing id")
      continue
    }
    if (edgeIds[edge.id]) {
      fatal(issues, "duplicate-edge", "duplicate edge id", edge.id)
    }
    setOwnValue(edgeIds, edge.id, true)
    if (!nodeIds[edge.source]) {
      fatal(issues, "dangling-source", "edge source is not a node", edge.id)
    }
    if (!nodeIds[edge.target]) {
      fatal(issues, "dangling-target", "edge target is not a node", edge.id)
    }
  }

  for (const root of spec.forest.display.roots ?? []) {
    if (!nodeIds[root]) {
      fatal(issues, "missing-root", "display root is not a node", root)
    }
  }
  const required = spec.forest.requiredPaths
  if (required) {
    if (required.relationScopeId !== "directed-admitted") {
      fatal(issues, "required-path-scope", "required paths use the full directed-admitted relation scope")
    }
    if (!Array.isArray(required.roots) || required.roots.length === 0) {
      fatal(issues, "required-path-roots", "required paths need declared roots")
    } else {
      for (const root of required.roots) {
        if (!nodeIds[root]) fatal(issues, "required-path-roots", "required-path root is not a node", root)
      }
    }
  }
  if (
    spec.forest.display.kind === "rooted-backbone" &&
    spec.forest.display.roots.length === 0
  ) {
    fatal(issues, "missing-root", "rooted-backbone requires at least one root")
  }
  if (spec.comparison) {
    if (spec.comparison.partitions.length < 2) {
      fatal(issues, "comparison", "comparison requires at least two partitions")
    }
    if (!ownValue(spec.measures, spec.comparison.denominatorMeasureId)) {
      fatal(
        issues,
        "comparison-denominator",
        "comparison denominatorMeasureId is not a declared measure"
      )
    }
  }

  if (!isRecord(spec.measures)) {
    fatal(issues, "measures", "measures must be an object")
  } else {
    for (const [measureId, measure] of Object.entries(spec.measures)) {
      if (measure.unitKind === "rate" && !measure.timeDenominator) {
        fatal(
          issues,
          "rate-denominator",
          "rate measures require a timeDenominator",
          measureId
        )
      }
    }
  }

  const measureSubjects = new Map<string, Set<string>>()
  for (const row of source.measureValues) {
    let subjects = measureSubjects.get(row.measureId)
    if (!subjects) {
      subjects = new Set()
      measureSubjects.set(row.measureId, subjects)
    }
    if (subjects.has(row.subjectId)) {
      fatal(
        issues,
        "duplicate-measure-value",
        "measureValue must be unique per measureId and subjectId",
        row.subjectId
      )
    }
    subjects.add(row.subjectId)
    const measure = ownValue(spec.measures, row.measureId)
    if (!measure) {
      fatal(
        issues,
        "unknown-measure",
        "measureValue refers to an undeclared measure",
        row.measureId
      )
      continue
    }
    if (!Number.isFinite(row.value)) {
      fatal(issues, "non-finite-measure", "measure value is not finite", row.measureId)
    }
  }

  const occurrenceIds = new Set<string>()
  for (const occurrence of source.occurrences ?? []) {
    if (!occurrence.id || !occurrence.entityId) {
      fatal(issues, "occurrence", "occurrence needs id and entityId")
      continue
    }
    if (occurrenceIds.has(occurrence.id)) {
      fatal(
        issues,
        "duplicate-occurrence",
        "occurrence id must be unique",
        occurrence.id
      )
    }
    occurrenceIds.add(occurrence.id)
    if (
      occurrence.stepEntityCounts !== undefined &&
      (!Array.isArray(occurrence.stepEntityCounts) ||
        occurrence.stepEntityCounts.length !== occurrence.nodePath.length ||
        Array.from(occurrence.stepEntityCounts).some(
          (count) => !Number.isFinite(count) || count < 0
        ))
    ) {
      fatal(
        issues,
        "occurrence-step-counts",
        "stepEntityCounts must contain one finite, nonnegative count per nodePath step",
        occurrence.id
      )
    }
    for (const nodeId of occurrence.nodePath) {
      if (!nodeIds[nodeId]) {
        fatal(
          issues,
          "occurrence-node",
          "occurrence path references a missing node",
          occurrence.id
        )
      }
    }
  }

  return { ok: issues.every((issue) => issue.severity !== "fatal"), issues }
}

export function measuresAreComparable(
  leftId: string,
  rightId: string,
  spec: NetworkAtlasSpec
): { ok: true } | { ok: false; reason: string } {
  const left = isRecord(spec?.measures) ? ownValue(spec.measures, leftId) : undefined
  const right = isRecord(spec?.measures) ? ownValue(spec.measures, rightId) : undefined
  if (!isRecord(left) || !isRecord(right)) {
    return { ok: false, reason: "unknown-measure" }
  }
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
