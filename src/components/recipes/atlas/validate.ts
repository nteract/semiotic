import { idDictionary, setOwnValue } from "./ids"
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
  const issues: AtlasIssue[] = []
  if (spec.schemaVersion !== NETWORK_ATLAS_SCHEMA_VERSION) {
    fatal(
      issues,
      "schema-version",
      `expected schemaVersion ${NETWORK_ATLAS_SCHEMA_VERSION}`
    )
  }
  if (!spec.relations.directed || spec.relations.edgeIdRequired !== true) {
    fatal(issues, "relations", "Phase 1 requires directed edges with ids")
  }
  if (spec.forest.display.kind !== "rooted-backbone") {
    fatal(issues, "forest", "Phase 1 supports only rooted-backbone display")
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

  for (const root of spec.forest.display.roots) {
    if (!nodeIds[root]) {
      fatal(issues, "missing-root", "display root is not a node", root)
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

  for (const row of source.measureValues) {
    const measure = spec.measures[row.measureId]
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

  for (const occurrence of source.occurrences ?? []) {
    if (!occurrence.id || !occurrence.entityId) {
      fatal(issues, "occurrence", "occurrence needs id and entityId")
      continue
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
  const left = spec.measures[leftId]
  const right = spec.measures[rightId]
  if (!left || !right) {
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
