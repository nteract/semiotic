// ProcessSankey data validation.

import type {
  ProcessSankeyEdge,
  ProcessSankeyIssue,
  ProcessSankeyIssueSeverity,
  ProcessSankeyNode,
} from "./processSankeyTypes"

/**
 * Usage mode for validation policy (M6).
 * - `static` / `mcp`: snapshots for renderChart, SSR, MCP — strict.
 * - `push`: live React ingestion — prefer warn so a bad tick doesn't blank the chart.
 */
export type ProcessSankeyUsageMode = "static" | "push" | "mcp"

export interface ProcessSankeyValidationPolicy {
  /** Duplicate node/edge ids. */
  duplicateIds: "fatal" | "warn"
  /**
   * Non-finite systemInTime / systemOutTime.
   * `warn` keeps the field and reports; `strip` clears invalid fields before layout.
   */
  invalidSystemTime: "warn" | "strip"
}

/** Product policy table — keep Claude.md / strategy in sync with this object. */
export const PROCESS_SANKEY_VALIDATION_POLICY: Record<
  ProcessSankeyUsageMode,
  ProcessSankeyValidationPolicy
> = {
  static: { duplicateIds: "fatal", invalidSystemTime: "warn" },
  mcp: { duplicateIds: "fatal", invalidSystemTime: "warn" },
  push: { duplicateIds: "warn", invalidSystemTime: "strip" },
}

export function resolveProcessSankeyValidationPolicy(
  usageMode: ProcessSankeyUsageMode = "static",
): ProcessSankeyValidationPolicy {
  return PROCESS_SANKEY_VALIDATION_POLICY[usageMode] ?? PROCESS_SANKEY_VALIDATION_POLICY.static
}

/** Issue kinds that always block layout (missing structure / true reverse time). */
const FATAL_ISSUE_KINDS = new Set([
  "invalid-domain",
  "missing-node",
  "backward-edge",
  "invalid-edge-time",
  "invalid-value",
  "invalid-node-time",
])

export function processSankeyIssueSeverity(issue: ProcessSankeyIssue): ProcessSankeyIssueSeverity {
  if (issue.severity === "fatal" || issue.severity === "warn") return issue.severity
  return FATAL_ISSUE_KINDS.has(issue.kind) ? "fatal" : "warn"
}

export function partitionProcessSankeyIssues(issues: readonly ProcessSankeyIssue[]): {
  fatal: ProcessSankeyIssue[]
  warnings: ProcessSankeyIssue[]
} {
  const fatal: ProcessSankeyIssue[] = []
  const warnings: ProcessSankeyIssue[] = []
  for (const issue of issues) {
    if (processSankeyIssueSeverity(issue) === "fatal") fatal.push(issue)
    else warnings.push(issue)
  }
  return { fatal, warnings }
}

export function validateProcessSankey(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  domain: [number, number],
  options: { usageMode?: ProcessSankeyUsageMode } = {},
): ProcessSankeyIssue[] {
  const policy = resolveProcessSankeyValidationPolicy(options.usageMode ?? "static")
  const issues: ProcessSankeyIssue[] = []
  const nodeIds = new Set<string>()
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({
        kind: "duplicate-node",
        id: node.id,
        severity: policy.duplicateIds,
      })
    }
    nodeIds.add(node.id)
  }
  const edgeIds = new Set<string>()
  // Domain must be [start, end] with finite numbers and start <= end.
  // An inverted/malformed domain otherwise flows silently into scaleTime
  // and produces a chart with the x-axis wired backward.
  const domainShapeOk = Array.isArray(domain) && domain.length === 2
  const domainFinite = domainShapeOk && Number.isFinite(domain[0]) && Number.isFinite(domain[1])
  const domainOrdered = domainFinite && domain[0] <= domain[1]
  if (!domainShapeOk || !domainFinite || !domainOrdered) {
    issues.push({ kind: "invalid-domain" })
  }
  for (const n of nodes) {
    if (n.xExtent != null) {
      const valid = Array.isArray(n.xExtent)
        && n.xExtent.length === 2
        && Number.isFinite(n.xExtent[0])
        && Number.isFinite(n.xExtent[1])
        && n.xExtent[0] <= n.xExtent[1]
      if (!valid) issues.push({ kind: "invalid-node-time", id: n.id })
    }
  }
  for (const e of edges) {
    if (edgeIds.has(e.id)) {
      issues.push({
        kind: "duplicate-edge",
        id: e.id,
        severity: policy.duplicateIds,
      })
    }
    edgeIds.add(e.id)
    if (!nodeIds.has(e.source)) {
      issues.push({ kind: "missing-node", id: e.id, endpoint: "source", nodeId: e.source })
    }
    if (!nodeIds.has(e.target)) {
      issues.push({ kind: "missing-node", id: e.id, endpoint: "target", nodeId: e.target })
    }
    if (!Number.isFinite(e.startTime) || !Number.isFinite(e.endTime)) {
      issues.push({ kind: "invalid-edge-time", id: e.id })
      continue
    }
    if ((e.systemInTime != null && !Number.isFinite(e.systemInTime)) ||
        (e.systemOutTime != null && !Number.isFinite(e.systemOutTime))) {
      issues.push({ kind: "invalid-system-time", id: e.id, severity: "warn" })
    }
    if (!Number.isFinite(e.value) || e.value <= 0) {
      issues.push({ kind: "invalid-value", id: e.id })
    }
    // Instantaneous events (endTime === startTime) are legal — admissions,
    // round closures, stage openings. Only true reverse time is fatal.
    if (e.endTime < e.startTime) {
      issues.push({ kind: "backward-edge", severity: "fatal", id: e.id, source: e.source, target: e.target })
    }
  }
  return issues
}

/**
 * Apply non-fatal policy rewrites (e.g. strip bad system times in push mode)
 * so layout can continue with clean fields.
 */
export function applyProcessSankeyValidationPolicy(
  edges: ProcessSankeyEdge[],
  issues: readonly ProcessSankeyIssue[],
  usageMode: ProcessSankeyUsageMode = "static",
): ProcessSankeyEdge[] {
  const policy = resolveProcessSankeyValidationPolicy(usageMode)
  if (policy.invalidSystemTime !== "strip") return edges
  const bad = new Set(
    issues.filter((i) => i.kind === "invalid-system-time").map((i) => i.id),
  )
  if (bad.size === 0) return edges
  return edges.map((edge) => {
    if (!bad.has(edge.id)) return edge
    const next = { ...edge }
    if (next.systemInTime != null && !Number.isFinite(next.systemInTime)) delete next.systemInTime
    if (next.systemOutTime != null && !Number.isFinite(next.systemOutTime)) delete next.systemOutTime
    return next
  })
}

export function formatProcessSankeyIssue(issue: ProcessSankeyIssue): string {
  if (issue.kind === "invalid-node-time") return `node ${issue.id} has an invalid xExtent (must be [start, end] with start <= end)`
  if (issue.kind === "invalid-edge-time") return `edge ${issue.id} has an invalid startTime or endTime`
  if (issue.kind === "invalid-domain") return "time domain must be a 2-tuple of finite times [start, end] with start <= end"
  if (issue.kind === "invalid-value") return `edge ${issue.id} must have a positive finite value`
  if (issue.kind === "missing-node") return `edge ${issue.id} references missing ${issue.endpoint} node "${issue.nodeId}"`
  if (issue.kind === "backward-edge") return `edge ${issue.id} (${issue.source}->${issue.target}) ends before it starts`
  if (issue.kind === "duplicate-node") return `node id "${issue.id}" is duplicated`
  if (issue.kind === "duplicate-edge") return `edge id "${issue.id}" is duplicated`
  if (issue.kind === "invalid-system-time") return `edge ${issue.id} has an invalid systemInTime or systemOutTime`
  return issue.kind
}
