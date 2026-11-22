import type { ArtifactContract, ObligationResult } from "./types"

export type ArtifactInspectorOutcome =
  "acceptable" | "conditional" | "refuse" | "unknown"

/** The evaluation fields consumed by the inspector. Full evaluations fit this shape. */
export interface ArtifactInspectorEvaluation {
  status: "acceptable" | "conditional" | "refuse"
  policy: {
    id: string
    version: string
  }
  obligations: ReadonlyArray<ObligationResult>
  manualChecks?: ReadonlyArray<string>
  alternatives?: ReadonlyArray<{
    id: string
    label: string
    reasons?: ReadonlyArray<string>
    caveats?: ReadonlyArray<string>
  }>
}

export interface ArtifactInspectionSummary {
  outcome: ArtifactInspectorOutcome
  outcomeLabel: string
  time: {
    status: string
    label: string
  }
  claims: {
    total: number
    active: number
    supported: number
    unresolved: number
  }
  evidence: {
    total: number
    referenced: number
    unreferenced: number
    missingReferences: number
  }
  policy: {
    status: "known" | "unknown"
    label: string
  }
  review: {
    status: "required" | "clear" | "unknown"
    count: number
    items: string[]
  }
  unknowns: {
    count: number
    items: string[]
  }
}

function outcomeLabel(outcome: ArtifactInspectorOutcome): string {
  if (outcome === "acceptable") return "Acceptable under the active policy"
  if (outcome === "conditional") return "Conditional — follow-up is required"
  if (outcome === "refuse") return "Refused by the active policy"
  return "Not evaluated — policy outcome is unknown"
}

function timeSummary(contract: ArtifactContract): {
  status: string
  label: string
} {
  const time = contract.time
  if (!time) {
    const field = Object.entries(contract.fieldStatus ?? {}).find(
      ([path]) => path === "time" || path.startsWith("time.")
    )?.[1]
    return {
      status: field?.status ?? "unknown",
      label: field?.reason ?? "Unknown — no time context is declared"
    }
  }

  const status =
    time.window?.status ??
    time.completeness?.status ??
    time.freshness?.status ??
    time.presentation?.state ??
    "unknown"
  if (time.presentation?.label) {
    return { status, label: time.presentation.label }
  }
  if (time.window) {
    return {
      status,
      label: `${time.window.start} through ${time.window.end}`
    }
  }
  if (time.eventTime?.value) {
    return { status, label: `Event time ${time.eventTime.value}` }
  }
  const recordedAt =
    time.snapshotAt ?? time.publishedAt ?? time.observedAt ?? time.processedAt
  return recordedAt
    ? { status, label: `Recorded at ${recordedAt}` }
    : { status, label: "Unknown — time context has no readable timestamp" }
}

/** Build the concise, deterministic signals rendered above the disclosures. */
export function summarizeArtifactInspection(
  contract: ArtifactContract,
  evaluation?: ArtifactInspectorEvaluation
): ArtifactInspectionSummary {
  const manual = new Set(contract.reception?.manualChecks)
  const unknown = new Set<string>()
  for (const [path, field] of Object.entries(contract.fieldStatus ?? {})) {
    if (field.status === "manual") manual.add(field.reason ?? `${path} requires manual review`)
    if (field.status === "unknown") unknown.add(field.reason ?? `${path} is unknown`)
  }
  for (const item of evaluation?.manualChecks ?? []) manual.add(item)
  for (const { status, message } of evaluation?.obligations ?? []) {
    if (status === "manual") manual.add(message)
    if (status === "unknown") unknown.add(message)
  }

  const referencedIds = new Set<string>()
  let active = 0
  let supported = 0
  for (const { id, status, evidenceIds } of contract.claims) {
    if (status !== "superseded" && status !== "retracted") active++
    if (status === "supported") supported++
    if (status === "unknown") unknown.add(`Claim ${id} has unknown status`)
    for (const ref of evidenceIds) referencedIds.add(ref)
  }
  const missing = new Set(referencedIds)
  let referenced = 0
  for (const { id } of contract.evidence) {
    if (referencedIds.has(id)) referenced++
    missing.delete(id)
  }
  const manualItems = [...manual].filter(Boolean)
  const unknownItems = [...unknown].filter(Boolean)
  if (!evaluation) unknownItems.push("Policy evaluation has not been supplied")
  const outcome = evaluation?.status ?? "unknown"

  return {
    outcome,
    outcomeLabel: outcomeLabel(outcome),
    time: timeSummary(contract),
    claims: {
      total: contract.claims.length,
      active,
      supported,
      unresolved: active - supported
    },
    evidence: {
      total: contract.evidence.length,
      referenced,
      unreferenced: contract.evidence.length - referenced,
      missingReferences: missing.size
    },
    policy: evaluation
      ? {
          status: "known",
          label: `${evaluation.policy.id}@${evaluation.policy.version}`
        }
      : { status: "unknown", label: "Unknown — no evaluation was supplied" },
    review: {
      status:
        manualItems.length > 0 ? "required" : evaluation ? "clear" : "unknown",
      count: manualItems.length,
      items: manualItems
    },
    unknowns: {
      count: unknownItems.length,
      items: unknownItems
    }
  }
}
