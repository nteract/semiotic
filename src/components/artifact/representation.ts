import type { Datum } from "../charts/shared/datumTypes"
import type { AudienceProfile } from "../ai/audienceProfile"
import type { IntentId } from "../ai/intents"
import { profileData } from "../ai/profileData"
import { scoreChart, suggestCharts } from "../ai/suggestCharts"
import { auditClaims } from "./claims"
import {
  activePolicyRules,
  resolveArtifactPolicy,
  type ArtifactPolicyException,
  type ArtifactPolicyInput
} from "./policies"
import { auditTemporalContext } from "./temporal"
import type { ArtifactContract, JsonValue } from "./types"

export type RepresentationKind =
  | "chart"
  | "custom-recipe"
  | "table"
  | "text"
  | "small-multiples"
  | "collect-more-data"
  | "wait-for-settlement"
  | "no-comparison"
  | "no-claim"
  | "no-action"

export interface RepresentationCandidate {
  id: string
  kind: RepresentationKind
  label: string
  component?: string
  props?: Record<string, unknown>
  score?: number
  reasons: string[]
  caveats?: string[]
}

export interface RejectedRepresentation extends RepresentationCandidate {
  rejectedBecause: string
}

export interface RecommendRepresentationOptions {
  policy?: ArtifactPolicyInput
  /** Accountable, time-bounded exceptions evaluated against the reference clock. */
  exceptions?: ReadonlyArray<ArtifactPolicyException>
  /** Explicit reference clock for review, freshness, and expiry checks. */
  now?: string
  intent?: IntentId | IntentId[]
  audience?: AudienceProfile
  preferredComponent?: string
  maxChartCandidates?: number
  identifiers?: ReadonlyArray<string>
}

export interface RepresentationRecommendation {
  status: "recommended" | "conditional" | "refuse"
  selected: RepresentationCandidate
  alternatives: RepresentationCandidate[]
  rejected: RejectedRepresentation[]
  policy: {
    id: string
    version: string
    appliedExceptions?: ArtifactPolicyException[]
    rejectedExceptions?: ArtifactPolicyException[]
  }
  reasons: string[]
}

function scopeUnits(contract: ArtifactContract): string[] {
  const units = new Set<string>()
  const add = (value: JsonValue | undefined) => {
    if (typeof value === "string" && value) units.add(value)
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string" && entry) units.add(entry)
      })
    }
  }
  contract.claims.forEach((claim) => {
    add(claim.scope?.unit)
    add(claim.scope?.units)
  })
  contract.evidence.forEach((evidence) => {
    add(evidence.scope?.unit)
    add(evidence.scope?.units)
  })
  return [...units]
}

function noChartCandidate(
  kind: Exclude<
    RepresentationKind,
    "chart" | "custom-recipe" | "table" | "text" | "small-multiples"
  >,
  label: string,
  reason: string
): RepresentationCandidate {
  return { id: kind, kind, label, reasons: [reason] }
}

function nonChartAlternatives(
  data: ReadonlyArray<Datum>,
  contract: ArtifactContract
): RepresentationCandidate[] {
  const result: RepresentationCandidate[] = []
  if (data.length > 0) {
    result.push({
      id: "table",
      kind: "table",
      label: "Data table",
      reasons: [
        data.length <= 30
          ? "A table preserves exact values for this bounded dataset."
          : "A paginated table preserves exact values without adding visual comparison claims."
      ]
    })
  }
  if (contract.claims.some(({ text }) => Boolean(text))) {
    result.push({
      id: "text",
      kind: "text",
      label: "Bounded text summary",
      reasons: [
        "The declared claims can be stated without implying an additional visual comparison."
      ]
    })
  }
  return result
}

function smallMultiplesOpportunity(
  data: ReadonlyArray<Datum>,
  identifiers: ReadonlyArray<string> | undefined
): { candidate: RepresentationCandidate; preferred: boolean } | undefined {
  const profile = profileData(data, { identifiers })
  const facetField = profile.primary.series ?? profile.primary.category
  const facetCount = profile.primary.series
    ? profile.seriesCount
    : profile.categoryCount
  if (
    !facetField ||
    !facetCount ||
    facetCount < 2 ||
    facetCount > 12 ||
    !profile.primary.x ||
    !profile.primary.y
  ) {
    return undefined
  }
  const counts = new Map<unknown, number>()
  data.forEach((row) =>
    counts.set(row[facetField], (counts.get(row[facetField]) ?? 0) + 1)
  )
  if ([...counts.values()].filter((count) => count >= 2).length < 2) {
    return undefined
  }
  return {
    candidate: {
      id: `small-multiples.${facetField}`,
      kind: "small-multiples",
      label: `Small multiples by ${facetField}`,
      score: Math.min(5, 3.5 + facetCount * 0.2),
      reasons: [
        `${facetCount} ${facetField} groups contain repeated ${profile.primary.x} observations; separate panels reduce overlap while retaining a shared comparison basis.`
      ],
      caveats: [
        "Use shared scales and consistent axes so differences between panels remain comparable."
      ]
    },
    preferred: facetCount >= 5
  }
}

function normalizedPurposeTokens(value: string): string[] {
  return (
    value
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.map((token) =>
        token.length > 4 && token.endsWith("s") && !token.endsWith("ss")
          ? token.slice(0, -1)
          : token
      ) ?? []
  )
}

function purposeRequestsProhibitedUse(
  contract: ArtifactContract,
  intent: IntentId | IntentId[] | undefined
): string | undefined {
  const requestedPurpose = [
    contract.purpose.communicativeAct,
    contract.purpose.decisionContext,
    ...(contract.purpose.allowedUses ?? []),
    ...(intent === undefined
      ? contract.purpose.intents.map(({ id }) => id)
      : Array.isArray(intent)
        ? intent
        : [intent])
  ].filter((value): value is string => Boolean(value?.trim()))

  return contract.purpose.prohibitedUses?.find((prohibitedUse) => {
    const prohibitedTokens = normalizedPurposeTokens(prohibitedUse)
    return (
      prohibitedTokens.length > 0 &&
      requestedPurpose.some((requestedUse) => {
        const requestedTokens = new Set(normalizedPurposeTokens(requestedUse))
        return prohibitedTokens.every((token) => requestedTokens.has(token))
      })
    )
  })
}

/**
 * Choose among charts and non-chart outcomes. Hard evidence and time gates run
 * before chart scores, so a polished candidate cannot outweigh an unsupported
 * comparison or an unsettled operational window.
 */
export function recommendRepresentation(
  data: ReadonlyArray<Datum> | null | undefined,
  contract: ArtifactContract,
  options: RecommendRepresentationOptions = {}
): RepresentationRecommendation {
  const rows = data ?? []
  const resolvedPolicy = resolveArtifactPolicy(options.policy)
  const active = activePolicyRules(
    resolvedPolicy,
    options.exceptions,
    options.now
  )
  const policy = { ...resolvedPolicy, rules: active.rules }
  const policyResult: RepresentationRecommendation["policy"] = {
    id: policy.id,
    version: policy.version,
    ...(active.appliedExceptions.length > 0
      ? { appliedExceptions: active.appliedExceptions }
      : {}),
    ...(active.rejectedExceptions.length > 0
      ? { rejectedExceptions: active.rejectedExceptions }
      : {})
  }
  const claimAudit = auditClaims(contract, {
    requireEvidenceIdentity: policy.rules.requireEvidenceIdentity,
    requireReviewForModelClaims: policy.rules.requireReviewForModelClaims,
    data: rows,
    now: options.now
  })
  const temporalAudit = auditTemporalContext(contract.time, {
    claims: contract.claims,
    corrections: contract.contestability?.corrections,
    referenceTime: options.now,
    requireSettled: policy.rules.requireSettledTime,
    requireFreshnessForLive: policy.rules.requireFreshnessForLive
  })
  const baseAlternatives = nonChartAlternatives(rows, contract)
  const rejected: RejectedRepresentation[] = []
  const reasons: string[] = []

  if (rows.length === 0 && contract.evidence.length === 0) {
    const selected = noChartCandidate(
      "collect-more-data",
      "Collect more data",
      "No data or evidence is available for a visual or textual claim."
    )
    return {
      status: "refuse",
      selected,
      alternatives: [],
      rejected,
      policy: policyResult,
      reasons: selected.reasons
    }
  }

  const activeClaims = contract.claims.filter(
    ({ status }) => status !== "retracted" && status !== "superseded"
  )
  if (
    activeClaims.length === 0 &&
    (policy.rules.requireClaims || contract.claims.length > 0)
  ) {
    const selected = noChartCandidate(
      "no-claim",
      "No active claim remains",
      contract.claims.length === 0
        ? "The active policy requires at least one active claim; no claims have been declared."
        : "All declared claims are retained as retracted or superseded history; no active claim is available to publish."
    )
    return {
      status: policy.rules.requireClaims ? "refuse" : "conditional",
      selected,
      alternatives: baseAlternatives,
      rejected,
      policy: policyResult,
      reasons: selected.reasons
    }
  }

  const unsupported = activeClaims.filter(
    ({ status }) => status === "unsupported"
  )
  const unknown = activeClaims.filter(({ status }) => status === "unknown")
  if (
    (policy.rules.refuseUnsupportedClaims && unsupported.length > 0) ||
    (policy.rules.refuseUnknownClaims && unknown.length > 0) ||
    claimAudit.summary.fail > 0
  ) {
    const selected = noChartCandidate(
      "no-claim",
      "Do not publish the claim",
      claimAudit.summary.fail > 0
        ? `${claimAudit.summary.fail} claim-support failure(s) must be repaired first.`
        : "The active policy does not permit unsupported or unknown claims."
    )
    return {
      status: "refuse",
      selected,
      alternatives: baseAlternatives,
      rejected,
      policy: policyResult,
      reasons: selected.reasons
    }
  }

  const unsettled =
    contract.time?.window?.status === "open" ||
    contract.time?.window?.status === "provisional" ||
    contract.time?.window?.status === "reopened" ||
    contract.time?.completeness?.status === "partial" ||
    contract.time?.completeness?.status === "provisional"
  const requiredTimeUnknown =
    policy.rules.refuseUnknownTime &&
    (!contract.time || temporalAudit.summary.unknown > 0)
  if (
    temporalAudit.summary.fail > 0 ||
    requiredTimeUnknown ||
    (unsettled &&
      (policy.rules.requireSettledTime ||
        contract.purpose.stakes === "operational" ||
        contract.purpose.stakes === "high"))
  ) {
    const selected = noChartCandidate(
      "wait-for-settlement",
      "Resolve time requirements",
      temporalAudit.summary.fail > 0
        ? `${temporalAudit.summary.fail} time requirement failure(s) must be resolved before choosing a representation.`
        : requiredTimeUnknown
          ? "The active policy requires known time state before choosing a representation."
          : "The current time window is incomplete, so a final representation would overstate completeness."
    )
    return {
      status: "refuse",
      selected,
      alternatives: baseAlternatives,
      rejected,
      policy: policyResult,
      reasons: selected.reasons
    }
  }

  const units = scopeUnits(contract)
  if (units.length > 1) {
    const selected = noChartCandidate(
      "no-comparison",
      "Do not compare these measures",
      `The artifact mixes incompatible or unresolved units: ${units.join(", ")}.`
    )
    return {
      status: "refuse",
      selected,
      alternatives: baseAlternatives,
      rejected,
      policy: policyResult,
      reasons: selected.reasons
    }
  }

  const prohibitedRequestedUse = purposeRequestsProhibitedUse(
    contract,
    options.intent
  )
  if (prohibitedRequestedUse) {
    const selected = noChartCandidate(
      "no-action",
      "Do not act on this artifact",
      `The current purpose requests a prohibited use: ${prohibitedRequestedUse}.`
    )
    return {
      status: "refuse",
      selected,
      alternatives: baseAlternatives,
      rejected,
      policy: policyResult,
      reasons: selected.reasons
    }
  }

  const smallMultiples = smallMultiplesOpportunity(rows, options.identifiers)
  if (smallMultiples) baseAlternatives.unshift(smallMultiples.candidate)
  const intent = options.intent ?? contract.purpose.intents.map(({ id }) => id)
  if (options.preferredComponent) {
    const preferred = scoreChart(options.preferredComponent, rows, {
      intent,
      audience: options.audience,
      identifiers: options.identifiers
    })
    if (preferred.status === "rejected") {
      rejected.push({
        id: `chart.${options.preferredComponent}`,
        kind: "chart",
        label: options.preferredComponent,
        component: options.preferredComponent,
        reasons: [],
        rejectedBecause: preferred.reason
      })
    }
  }

  const suggestions = suggestCharts(rows, {
    intent,
    audience: options.audience,
    identifiers: options.identifiers,
    maxResults: Math.max(1, options.maxChartCandidates ?? 5),
    includeVariants: true
  })
  const chartCandidates: RepresentationCandidate[] = suggestions.map(
    (suggestion, index) => ({
      id: `chart.${suggestion.component}.${suggestion.variant?.key ?? "default"}.${index}`,
      kind: suggestion.candidateKind === "recipe" ? "custom-recipe" : "chart",
      label: suggestion.displayName,
      component: suggestion.component,
      props: suggestion.props,
      score: suggestion.score,
      reasons: [...suggestion.reasons],
      caveats: [...suggestion.caveats]
    })
  )
  const preferredCandidate = options.preferredComponent
    ? chartCandidates.find(
        ({ component }) => component === options.preferredComponent
      )
    : undefined
  const selected =
    preferredCandidate ??
    (smallMultiples?.preferred ? smallMultiples.candidate : undefined) ??
    chartCandidates[0] ??
    baseAlternatives[0]
  if (!selected) {
    const refusal = noChartCandidate(
      "no-claim",
      "No defensible representation",
      "No chart, table, or text candidate can represent the supplied material."
    )
    return {
      status: "refuse",
      selected: refusal,
      alternatives: [],
      rejected,
      policy: policyResult,
      reasons: refusal.reasons
    }
  }

  const alternatives = [...chartCandidates, ...baseAlternatives].filter(
    ({ id }) => id !== selected.id
  )
  if (
    options.preferredComponent &&
    selected.component !== options.preferredComponent
  ) {
    reasons.push(
      `The preferred component lost to ${selected.label}: ${
        rejected[0]?.rejectedBecause ?? "a stronger data fit was available"
      }.`
    )
  }
  reasons.push(...selected.reasons)
  if (alternatives[0]) {
    reasons.push(
      `${alternatives[0].label} remains the strongest alternative; it ranked below the selected form or preserves fewer task-specific cues.`
    )
  }
  const conditional =
    claimAudit.summary.warn > 0 ||
    claimAudit.summary.manual > 0 ||
    claimAudit.summary.unknown > 0 ||
    temporalAudit.summary.warn > 0 ||
    temporalAudit.summary.manual > 0 ||
    temporalAudit.summary.unknown > 0
  return {
    status: conditional ? "conditional" : "recommended",
    selected,
    alternatives,
    rejected,
    policy: policyResult,
    reasons
  }
}
