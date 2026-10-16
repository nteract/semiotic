import { isDataRecord } from "../../charts/shared/dataRecords"
import type { AtlasIssue } from "./types"

type Rule =
  | "string"
  | "boolean"
  | "count"
  | "budget"
  | "strings"
  | "object"
  | readonly string[]
const countUnits = ["entity", "occurrence", "embedding", "work-item"]

function matches(value: unknown, rule: Rule): boolean {
  if (Array.isArray(rule)) return rule.includes(value)
  if (rule === "strings")
    return (
      Array.isArray(value) &&
      Array.from(value).every((entry) => typeof entry === "string")
    )
  if (rule === "object") return isDataRecord(value)
  if (rule === "count" || rule === "budget")
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      (rule !== "budget" || Number.isSafeInteger(value))
    )
  return typeof value === rule
}

/** Check public containers and scalar contracts before deriving an atlas. */
export function validateAtlasShape(
  spec: unknown,
  source: unknown
): AtlasIssue[] {
  const issues: AtlasIssue[] = []
  const reject = (kind: string, field: string, expected: string) => {
    issues.push({
      kind,
      severity: "fatal",
      message: `${field} must be ${expected}`
    })
  }
  // A trailing ? marks an optional field; explicit null is still invalid.
  const check = (
    value: unknown,
    rules: Record<string, Rule>,
    kind: string
  ): boolean => {
    if (!isDataRecord(value)) {
      reject(kind, kind, "an object")
      return false
    }
    for (const [key, rule] of Object.entries(rules)) {
      const optional = key.endsWith("?")
      const field = optional ? key.slice(0, -1) : key
      if (optional && value[field] === undefined) continue
      if (!matches(value[field], rule))
        reject(
          kind,
          field,
          Array.isArray(rule) ? rule.join(" or ") : String(rule)
        )
    }
    return true
  }
  if (
    !check(
      spec,
      {
        relations: "object",
        coordinate: "object",
        forest: "object",
        measures: "object",
        motifs: "object",
        temporal: "object",
        dataRevision: "string",
        evidencePolicyId: "string"
      },
      "input-shape"
    ) ||
    !check(
      source,
      { graphRef: "string", revision: "string" },
      "source-shape"
    ) ||
    issues.length
  )
    return issues
  // The container checks above establish records; scalar failures return before
  // semantic validation, so no coercion or arithmetic runs on malformed values.
  const input = spec as Record<string, Record<string, unknown>>
  const data = source as Record<string, unknown>
  const { coordinate, forest, measures, motifs, temporal } = input
  if (coordinate.kind === "ordinal")
    check(coordinate, { sectionIds: "strings" }, "coordinate")
  if (
    check(
      forest.display,
      {
        "roots?": "strings",
        "rankingPolicyId?": "string",
        "referencePartition?": "string"
      },
      "forest"
    ) &&
    (forest.display as Record<string, unknown>).kind === "rooted-backbone"
  ) {
    check(forest.display, { roots: "strings" }, "missing-root")
    check(forest.display, { rankingPolicyId: "string" }, "forest")
  }
  if (forest.requiredPaths !== undefined)
    check(forest.requiredPaths, { roots: "strings" }, "required-path-roots")
  if (input.comparison !== undefined)
    check(
      input.comparison,
      {
        partitions: "strings",
        denominatorMeasureId: "string",
        "referencePartition?": "string"
      },
      "comparison"
    )
  for (const measure of Object.values(measures))
    check(
      measure,
      {
        unitKind: ["stock", "rate", "capacity"],
        countUnit: countUnits,
        "timeDenominator?": "string",
        "description?": "string"
      },
      "measures"
    )
  check(
    motifs,
    {
      catalogId: "string",
      catalogVersion: "string",
      countUnit: countUnits,
      anchor: ["completion"],
      "denominatorRef?": "string",
      "timeWindowMs?": "count",
      "matchBudget?": "budget"
    },
    "motifs"
  )
  check(temporal, { kind: ["snapshot", "window"] }, "temporal")
  if (
    temporal.kind === "window" &&
    (!Number.isFinite(temporal.start) ||
      !Number.isFinite(temporal.end) ||
      (temporal.end as number) < (temporal.start as number))
  )
    reject("temporal", "window bounds", "finite and ordered")
  for (const key of ["nodes", "edges", "measureValues", "occurrences"]) {
    const rows = data[key]
    if (key === "occurrences" && rows === undefined) continue
    if (!Array.isArray(rows)) {
      reject("source-shape", key, "an array")
      continue
    }
    const rules: Record<string, Rule> =
      key === "nodes"
        ? {
            id: "string",
            "sectionId?": "string",
            "completeness?": [
              "known",
              "unknown",
              "incomplete",
              "truncated",
              "unsupported-template"
            ]
          }
        : key === "edges"
          ? { id: "string", source: "string", target: "string" }
          : key === "measureValues"
            ? {
                measureId: "string",
                subjectId: "string",
                status: ["exact", "estimated", "unknown", "incomplete"]
              }
            : {
                id: "string",
                entityId: "string",
                complete: "boolean",
                "missingPrehistory?": "boolean",
                "entityCount?": "count",
                "partition?": "string"
              }
    for (const row of rows) {
      if (
        !check(
          row,
          rules,
          key === "occurrences" ? "occurrence" : "source-shape"
        )
      )
        continue
      if (key === "occurrences") {
        check(row, { nodePath: "strings" }, "occurrence-node")
        if (
          row.groupKeys !== undefined &&
          (!isDataRecord(row.groupKeys) ||
            Object.values(row.groupKeys).some(
              (value) => typeof value !== "string"
            ))
        )
          reject("occurrence", "groupKeys", "a string map")
      }
    }
  }
  return issues
}
