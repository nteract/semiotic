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

const RESOLVED_CLAIM_STATUSES = new Set([
  "supported",
  "superseded",
  "retracted"
])

function unique(values: ReadonlyArray<string>): string[] {
  return [...new Set(values.filter(Boolean))]
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
  const activeClaims = contract.claims.filter(
    ({ status }) => status !== "superseded" && status !== "retracted"
  )
  const referencedEvidenceIds = new Set(
    contract.claims.flatMap(({ evidenceIds }) => evidenceIds)
  )
  const knownEvidenceIds = new Set(contract.evidence.map(({ id }) => id))
  const manualItems = unique([
    ...(contract.reception?.manualChecks ?? []),
    ...Object.entries(contract.fieldStatus ?? {}).flatMap(([path, field]) =>
      field.status === "manual"
        ? [field.reason ?? `${path} requires manual review`]
        : []
    ),
    ...(evaluation?.manualChecks ?? []),
    ...(evaluation?.obligations.flatMap((obligation) =>
      obligation.status === "manual" ? [obligation.message] : []
    ) ?? [])
  ])
  const unknownItems = unique([
    ...Object.entries(contract.fieldStatus ?? {}).flatMap(([path, field]) =>
      field.status === "unknown" ? [field.reason ?? `${path} is unknown`] : []
    ),
    ...(evaluation?.obligations.flatMap((obligation) =>
      obligation.status === "unknown" ? [obligation.message] : []
    ) ?? []),
    ...contract.claims.flatMap((claim) =>
      claim.status === "unknown" ? [`Claim ${claim.id} has unknown status`] : []
    )
  ])
  const outcome = evaluation?.status ?? "unknown"

  return {
    outcome,
    outcomeLabel: outcomeLabel(outcome),
    time: timeSummary(contract),
    claims: {
      total: contract.claims.length,
      active: activeClaims.length,
      supported: activeClaims.filter(({ status }) => status === "supported")
        .length,
      unresolved: activeClaims.filter(
        ({ status }) => !RESOLVED_CLAIM_STATUSES.has(status)
      ).length
    },
    evidence: {
      total: contract.evidence.length,
      referenced: contract.evidence.filter(({ id }) =>
        referencedEvidenceIds.has(id)
      ).length,
      unreferenced: contract.evidence.filter(
        ({ id }) => !referencedEvidenceIds.has(id)
      ).length,
      missingReferences: [...referencedEvidenceIds].filter(
        (id) => !knownEvidenceIds.has(id)
      ).length
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
      count: unknownItems.length + (evaluation ? 0 : 1),
      items: evaluation
        ? unknownItems
        : [...unknownItems, "Policy evaluation has not been supplied"]
    }
  }
}
