import type { Datum } from "../charts/shared/datumTypes"
import {
  type ArtifactContract,
  type Claim,
  type ClaimKind,
  type EvidenceRef,
  type ObligationResult,
  type ObligationSummary
} from "./types"
import { summarizeObligations } from "./obligations"
import { auditClaimCorrections } from "./claimCorrections"
import {
  evidenceUsedByClaims,
  hasIndependentEvidenceBasis,
  supersessionCycles,
  transformationCycles
} from "./claimGraph"
import { parseAbsoluteTime } from "./temporalPresentation"

export {
  challengeClaim,
  claimsFromAnnotations,
  claimsFromDescription,
  retractClaim,
  supersedeClaim,
  type AnnotationClaimOptions,
  type AnnotationClaimProjection,
  type DescriptionClaimOptions
} from "./claimLifecycle"

export interface ClaimAuditOptions {
  /** Require source/version/fingerprint answerability for every used evidence ref. */
  requireEvidenceIdentity?: boolean
  /** Escalate unreviewed model-authored supported claims from warning to failure. */
  requireReviewForModelClaims?: boolean
  /** Optional rows for scoped checks such as category overlap. */
  data?: ReadonlyArray<Datum>
  /** Explicit reference clock used to reject impossible future reviews. */
  now?: string
  /** Allowed clock skew for review timestamps. Defaults to five minutes. */
  maxFutureReviewSkewMs?: number
}

export interface ClaimAudit {
  ok: boolean
  claims: number
  evidence: number
  summary: ObligationSummary
  findings: ObligationResult[]
}

const ASSERTIVE_KINDS: ReadonlyArray<ClaimKind> = [
  "aggregation",
  "inference",
  "forecast",
  "simulation",
  "alert",
  "recommendation",
  "normative"
]

function duplicates<T>(values: ReadonlyArray<T>): Set<T> {
  const seen = new Set<T>()
  const repeated = new Set<T>()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return repeated
}

function evidenceHasIdentity(evidence: EvidenceRef): boolean {
  return [
    evidence.fingerprint,
    evidence.dataVersion,
    evidence.source?.uri,
    evidence.source?.version
  ].some((value) => typeof value === "string" && value.trim().length > 0)
}

function normalizedActorName(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ").toLowerCase()
  return normalized || undefined
}

function causalLanguage(text: string | undefined): boolean {
  return Boolean(
    text &&
    /\b(causes?|caused|drives?|driven by|leads? to|results? in|because of)\b/i.test(
      text
    )
  )
}

function scopeNeedsDenominator(scope: Claim["scope"]): boolean {
  if (!scope) return false
  const unit = typeof scope.unit === "string" ? scope.unit.toLowerCase() : ""
  const metricType =
    typeof scope.metricType === "string" ? scope.metricType.toLowerCase() : ""
  return (
    unit === "%" ||
    unit === "percent" ||
    unit === "percentage" ||
    ["rate", "ratio", "share", "percentage"].includes(metricType) ||
    "numerator" in scope
  )
}

/** Audit referential integrity and the boundary between evidence and prose. */
export function auditClaims(
  contract: Pick<
    ArtifactContract,
    "claims" | "evidence" | "contestability" | "accountability"
  > &
    Partial<Pick<ArtifactContract, "artifact">>,
  options: ClaimAuditOptions = {}
): ClaimAudit {
  const findings: ObligationResult[] = []
  const claimIds = new Set(contract.claims.map(({ id }) => id))
  const claimsById = new Map(contract.claims.map((claim) => [claim.id, claim]))
  const evidenceIds = new Set(contract.evidence.map(({ id }) => id))
  const evidenceById = new Map(contract.evidence.map((item) => [item.id, item]))
  const usedEvidenceIds = evidenceUsedByClaims(contract.claims, evidenceById)

  for (const id of duplicates(contract.claims.map(({ id }) => id))) {
    findings.push({
      id: `claims.duplicate.${id}`,
      relation: "claim-support",
      status: "fail",
      path: "claims",
      message: `Claim identifier "${id}" is not unique.`,
      repair: "Assign a stable, unique identifier to each claim."
    })
  }
  for (const id of duplicates(contract.evidence.map(({ id }) => id))) {
    findings.push({
      id: `evidence.duplicate.${id}`,
      relation: "claim-support",
      status: "fail",
      path: "evidence",
      message: `Evidence identifier "${id}" is not unique.`,
      repair: "Assign a stable, unique identifier to each evidence record."
    })
  }
  const challenges = contract.contestability?.challenges ?? []
  for (const id of duplicates(challenges.map(({ id }) => id))) {
    findings.push({
      id: `challenges.duplicate.${id}`,
      relation: "challenge-and-correction",
      status: "fail",
      path: "contestability.challenges",
      message: `Challenge identifier "${id}" is not unique.`,
      repair: "Assign a stable, unique identifier to each challenge."
    })
  }
  for (const [index, challenge] of challenges.entries()) {
    const path = `contestability.challenges[${index}]`
    if (!claimIds.has(challenge.claimId)) {
      findings.push({
        id: `challenges.missing-claim.${challenge.id}.${challenge.claimId}`,
        relation: "challenge-and-correction",
        status: "fail",
        path: `${path}.claimId`,
        message: `Challenge "${challenge.id}" references missing claim "${challenge.claimId}".`,
        repair: "Add the challenged claim or correct the challenge reference."
      })
    }
    if (challenge.counterclaimId && !claimIds.has(challenge.counterclaimId)) {
      findings.push({
        id: `challenges.missing-counterclaim.${challenge.id}.${challenge.counterclaimId}`,
        relation: "challenge-and-correction",
        status: "fail",
        path: `${path}.counterclaimId`,
        message: `Challenge "${challenge.id}" references missing counterclaim "${challenge.counterclaimId}".`,
        repair: "Add the counterclaim or correct the counterclaim reference."
      })
    }
  }
  const reviews = contract.accountability?.reviews ?? []
  for (const id of duplicates(reviews.map(({ id }) => id))) {
    findings.push({
      id: `reviews.duplicate.${id}`,
      relation: "accountability",
      status: "fail",
      path: "accountability.reviews",
      message: `Review identifier "${id}" is not unique.`,
      repair: "Preserve each review event under a unique identifier."
    })
  }
  for (const [index, review] of reviews.entries()) {
    if (["approved", "changes-requested", "rejected"].includes(review.status)) {
      const attributable = Boolean(
        review.reviewer?.kind?.trim() &&
        (review.reviewer.id?.trim() || review.reviewer.name?.trim())
      )
      const timestamped = Boolean(
        review.reviewedAt &&
        Number.isFinite(parseAbsoluteTime(review.reviewedAt))
      )
      if (!attributable || !timestamped) {
        findings.push({
          id: `reviews.attribution.${review.id}`,
          relation: "accountability",
          status: "warn",
          path: `accountability.reviews[${index}]`,
          message: `Completed review "${review.id}" lacks an attributable reviewer or valid review time.`,
          repair: "Record a named reviewer and the time of the review decision."
        })
      }
    }
  }
  const actions = contract.accountability?.actions ?? []
  for (const id of duplicates(actions.map(({ id }) => id))) {
    findings.push({
      id: `actions.duplicate.${id}`,
      relation: "accountability",
      status: "fail",
      path: "accountability.actions",
      message: `Action identifier "${id}" is not unique.`,
      repair: "Preserve each downstream action under a unique identifier."
    })
  }
  for (const [index, action] of actions.entries()) {
    const path = `accountability.actions[${index}]`
    const missingClaimIds = action.claimIds.filter((id) => !claimIds.has(id))
    if (missingClaimIds.length > 0) {
      findings.push({
        id: `actions.missing-claims.${action.id}`,
        relation: "accountability",
        status: "fail",
        path: `${path}.claimIds`,
        message: `Action "${action.id}" references missing claims: ${missingClaimIds.join(", ")}.`,
        repair:
          "Correct the claim references or preserve the referenced claims."
      })
    }
    if (
      action.artifactId &&
      contract.artifact &&
      action.artifactId !== contract.artifact.id
    ) {
      findings.push({
        id: `actions.artifact-mismatch.${action.id}`,
        relation: "accountability",
        status: "fail",
        path: `${path}.artifactId`,
        message: `Action "${action.id}" names artifact "${action.artifactId}" instead of "${contract.artifact.id}".`
      })
    }
    if (
      action.artifactRevision &&
      contract.artifact?.revision &&
      action.artifactRevision !== contract.artifact.revision
    ) {
      findings.push({
        id: `actions.revision-mismatch.${action.id}`,
        relation: "accountability",
        status: "fail",
        path: `${path}.artifactRevision`,
        message: `Action "${action.id}" is bound to a different artifact revision.`
      })
    }
    if (
      action.invalidatedByClaimId &&
      !claimIds.has(action.invalidatedByClaimId)
    ) {
      findings.push({
        id: `actions.missing-invalidation-claim.${action.id}`,
        relation: "accountability",
        status: "fail",
        path: `${path}.invalidatedByClaimId`,
        message: `Action "${action.id}" names a missing invalidating claim.`
      })
    }
    if (action.invalidatedByClaimId && action.status !== "invalidated") {
      findings.push({
        id: `actions.invalidation-status.${action.id}`,
        relation: "accountability",
        status: "fail",
        path: `${path}.status`,
        message: `Action "${action.id}" names an invalidating claim but is not marked invalidated.`
      })
    }
  }
  if (contract.claims.length === 0) {
    findings.push({
      id: "claims.none",
      relation: "claim-support",
      status: "unknown",
      path: "claims",
      message:
        "The artifact declares no claims, so claim support cannot be assessed."
    })
  }
  for (const [index, claim] of contract.claims.entries()) {
    const path = `claims[${index}]`
    const linked = claim.evidenceIds
      .map((id) => evidenceById.get(id))
      .filter((item): item is EvidenceRef => Boolean(item))
    const missing = claim.evidenceIds.filter((id) => !evidenceIds.has(id))
    if (missing.length > 0) {
      findings.push({
        id: `claims.missing-evidence.${claim.id}`,
        relation: "claim-support",
        status: "fail",
        path: `${path}.evidenceIds`,
        evidenceIds: missing,
        message: `Claim "${claim.id}" references missing evidence: ${missing.join(", ")}.`,
        repair: "Add the evidence records or remove the broken references."
      })
    }
    if (claim.status === "supported" && claim.evidenceIds.length === 0) {
      findings.push({
        id: `claims.unsourced-supported.${claim.id}`,
        relation: "claim-support",
        status: "fail",
        path: `${path}.status`,
        message: `Claim "${claim.id}" is marked supported without evidence.`,
        repair: "Link adequate evidence or change the claim status."
      })
    } else if (
      ASSERTIVE_KINDS.includes(claim.kind) &&
      claim.evidenceIds.length === 0 &&
      !["unsupported", "unknown", "retracted"].includes(claim.status)
    ) {
      findings.push({
        id: `claims.assertion-without-evidence.${claim.id}`,
        relation: "claim-support",
        status: "warn",
        path: `${path}.evidenceIds`,
        message: `The ${claim.kind} claim "${claim.id}" has no linked evidence.`,
        repair: "Supply evidence or expose the claim as unknown or unsupported."
      })
    }
    if (!claim.text && !claim.scope) {
      findings.push({
        id: `claims.no-readable-content.${claim.id}`,
        relation: "reception",
        status: "warn",
        path,
        message: `Claim "${claim.id}" has neither readable text nor a machine-readable scope.`,
        repair: "Add concise text, a structured scope, or both."
      })
    }
    if (claim.kind === "forecast") {
      if (!claim.uncertainty) {
        findings.push({
          id: `claims.forecast-uncertainty.${claim.id}`,
          relation: "claim-support",
          status: "fail",
          path: `${path}.uncertainty`,
          message: `Forecast claim "${claim.id}" does not state uncertainty.`,
          repair:
            "Provide an interval, distribution, or explicit qualitative uncertainty."
        })
      }
      const scope = claim.scope ?? {}
      if (!("observedRange" in scope) || !("projectedRange" in scope)) {
        findings.push({
          id: `claims.forecast-ranges.${claim.id}`,
          relation: "time",
          status: "warn",
          path: `${path}.scope`,
          message: `Forecast claim "${claim.id}" does not distinguish observed and projected ranges.`,
          repair: "Add observedRange and projectedRange to the claim scope."
        })
      }
    }
    if (scopeNeedsDenominator(claim.scope) && !claim.scope?.denominator) {
      findings.push({
        id: `claims.denominator.${claim.id}`,
        relation: "claim-support",
        status: "fail",
        path: `${path}.scope.denominator`,
        message: `Rate or ratio claim "${claim.id}" does not identify its denominator.`,
        repair:
          "Name the denominator and its scope before publishing the comparison."
      })
    }
    const categoryField =
      typeof claim.scope?.categoryField === "string"
        ? claim.scope.categoryField
        : undefined
    if (
      categoryField &&
      claim.scope?.exclusiveCategories === true &&
      options.data?.some((row) => {
        const category = row[categoryField]
        return Array.isArray(category) && category.length > 1
      })
    ) {
      findings.push({
        id: `claims.category-overlap.${claim.id}`,
        relation: "representation-fit",
        status: "fail",
        path: `${path}.scope.exclusiveCategories`,
        message: `Claim "${claim.id}" treats overlapping category memberships as exclusive.`,
        repair:
          "Use non-exclusive totals, de-duplicate membership, or change the comparison claim."
      })
    }
    if (claim.kind === "simulation") {
      const hasAssumptions = linked.some(
        (evidence) => (evidence.transformation?.assumptions?.length ?? 0) > 0
      )
      if (!hasAssumptions) {
        findings.push({
          id: `claims.simulation-assumptions.${claim.id}`,
          relation: "claim-support",
          status: "warn",
          path: `${path}.evidenceIds`,
          message: `Simulation claim "${claim.id}" has no recorded assumptions.`,
          repair: "Link a simulation transformation that lists its assumptions."
        })
      }
    }
    if (claim.kind === "alert") {
      const hasRule = linked.some(
        ({ role }) => role === "policy-rule" || role === "quality-check"
      )
      if (!hasRule) {
        findings.push({
          id: `claims.alert-rule.${claim.id}`,
          relation: "claim-support",
          status: "fail",
          path: `${path}.evidenceIds`,
          message: `Alert claim "${claim.id}" does not name a rule or quality check.`,
          repair: "Link the rule that caused the alert."
        })
      }
      if (!claim.asOf) {
        findings.push({
          id: `claims.alert-time.${claim.id}`,
          relation: "time",
          status: "unknown",
          path: `${path}.asOf`,
          message: `Alert claim "${claim.id}" has no as-of time.`
        })
      }
    }
    const selfEvidence = linked.filter(
      (evidence) =>
        evidence.role === "model-output" &&
        evidence.generatedClaimId === claim.id
    )
    if (selfEvidence.length > 0) {
      findings.push({
        id: `claims.self-evidence.${claim.id}`,
        relation: "claim-support",
        status: "fail",
        path: `${path}.evidenceIds`,
        evidenceIds: selfEvidence.map(({ id }) => id),
        message: `Claim "${claim.id}" uses generated prose derived from itself as evidence.`,
        repair:
          "Bind the claim to an independent source, measurement, transformation, or review."
      })
    }
    if (
      claim.status === "supported" &&
      linked.length > 0 &&
      linked.every(({ role }) => role === "model-output")
    ) {
      findings.push({
        id: `claims.model-only-support.${claim.id}`,
        relation: "claim-support",
        status: "fail",
        path: `${path}.evidenceIds`,
        evidenceIds: linked.map(({ id }) => id),
        message: `Claim "${claim.id}" is supported only by generated model output.`,
        repair:
          "Link an independent source, measurement, transformation, or review record."
      })
    }
    if (
      claim.status === "supported" &&
      claim.evidenceIds.length > 0 &&
      !hasIndependentEvidenceBasis(claim.evidenceIds, evidenceById)
    ) {
      findings.push({
        id: `claims.no-independent-basis.${claim.id}`,
        relation: "claim-support",
        status: "fail",
        path: `${path}.evidenceIds`,
        evidenceIds: claim.evidenceIds,
        message: `Claim "${claim.id}" has no independent ultimate evidence basis.`,
        repair:
          "Link evidence whose transformation ancestry terminates in source data, an external source, a measurement, a rule, or an attributable human observation."
      })
    }
    if (causalLanguage(claim.text)) {
      const hasCausalBasis = linked.some(
        (evidence) => evidence.relationship === "causal"
      )
      if (!hasCausalBasis) {
        findings.push({
          id: `claims.causal-language.${claim.id}`,
          relation: "claim-support",
          status: "warn",
          path: `${path}.text`,
          message: `Claim "${claim.id}" uses causal language without a declared causal basis.`,
          repair:
            "Use associational language or link evidence that supports causal identification."
        })
      }
    }
    const generatedContext = Boolean(
      contract.accountability?.generatedBy?.trim()
    )
    const reviewRequiredForClaim =
      claim.authoredBy?.kind !== "human" &&
      (Boolean(claim.authoredBy) ||
        generatedContext ||
        options.requireReviewForModelClaims === true)
    if (reviewRequiredForClaim && claim.status === "supported") {
      const reviewedAt = claim.review?.reviewedAt
      const reviewer = claim.review?.reviewer
      const reviewerIdentity = reviewer?.id?.trim() || reviewer?.name?.trim()
      const authorId = claim.authoredBy?.id?.trim()
      const authorName = normalizedActorName(claim.authoredBy?.name)
      const reviewerId = reviewer?.id?.trim()
      const reviewerName = normalizedActorName(reviewer?.name)
      const attributableAuthorship = Boolean(authorId || authorName)
      const sameReviewer = Boolean(
        reviewerIdentity &&
        ((authorId && reviewerId === authorId) ||
          (authorName && reviewerName === authorName))
      )
      const referenceTime = options.now
        ? parseAbsoluteTime(options.now)
        : undefined
      const reviewedTime = reviewedAt
        ? parseAbsoluteTime(reviewedAt)
        : Number.NaN
      const maxFutureReviewSkewMs = Math.max(
        0,
        options.maxFutureReviewSkewMs ?? 5 * 60 * 1000
      )
      const referenceClockIsValid =
        referenceTime === undefined
          ? options.requireReviewForModelClaims !== true
          : Number.isFinite(referenceTime)
      const reviewTimeIsPlausible =
        Number.isFinite(reviewedTime) &&
        referenceClockIsValid &&
        (referenceTime === undefined ||
          reviewedTime <= referenceTime + maxFutureReviewSkewMs)
      const reviewed =
        ["reviewed", "approved"].includes(claim.review?.status ?? "") &&
        reviewer?.kind?.trim() === "human" &&
        Boolean(reviewerIdentity) &&
        (options.requireReviewForModelClaims !== true ||
          attributableAuthorship) &&
        !sameReviewer &&
        typeof reviewedAt === "string" &&
        reviewTimeIsPlausible
      if (!reviewed) {
        findings.push({
          id: `claims.model-review.${claim.id}`,
          relation: "accountability",
          status: options.requireReviewForModelClaims ? "fail" : "warn",
          path: `${path}.review`,
          message: `Generated claim "${claim.id}" is marked supported without an attributable, timestamped review.`,
          repair:
            "Record the reviewer and review time, or leave the claim provisional or unknown."
        })
      }
    }
    if (claim.status === "supported" && claim.review?.status === "rejected") {
      findings.push({
        id: `claims.rejected-review.${claim.id}`,
        relation: "accountability",
        status: "fail",
        path: `${path}.review.status`,
        message: `Claim "${claim.id}" is marked supported despite a rejected review.`,
        repair:
          "Resolve the rejection and record a later attributable review, or change the claim status."
      })
    }
    if (
      claim.status === "disputed" &&
      !contract.contestability?.challenges?.some(
        ({ claimId, status }) => claimId === claim.id && status === "open"
      )
    ) {
      findings.push({
        id: `claims.dispute-context.${claim.id}`,
        relation: "challenge-and-correction",
        status: "manual",
        path,
        message: `Claim "${claim.id}" is disputed without an open challenge record.`
      })
    }
    if (
      claim.evidenceIds.length > 0 &&
      missing.length === 0 &&
      claim.status !== "retracted"
    ) {
      findings.push({
        id: `claims.references-valid.${claim.id}`,
        relation: "claim-support",
        status: "pass",
        path: `${path}.evidenceIds`,
        evidenceIds: claim.evidenceIds,
        message: `Claim "${claim.id}" links to existing evidence records.`
      })
    }
  }

  for (const [index, evidence] of contract.evidence.entries()) {
    const path = `evidence[${index}]`
    if (
      options.requireEvidenceIdentity &&
      usedEvidenceIds.has(evidence.id) &&
      !evidenceHasIdentity(evidence)
    ) {
      findings.push({
        id: `evidence.identity.${evidence.id}`,
        relation: "claim-support",
        status: "unknown",
        path,
        message: `Evidence "${evidence.id}" has no source version, URI, data version, or fingerprint.`
      })
    }
    if (evidence.role === "transformation" && !evidence.transformation) {
      findings.push({
        id: `evidence.transformation-record.${evidence.id}`,
        relation: "claim-support",
        status: "fail",
        path: `${path}.transformation`,
        message: `Transformation evidence "${evidence.id}" has no transformation record.`,
        repair:
          "Record the transformation kind and input evidence, or use the evidence role that describes this record."
      })
    }
    if (evidence.role !== "transformation" && evidence.transformation) {
      findings.push({
        id: `evidence.transformation-role.${evidence.id}`,
        relation: "claim-support",
        status: "fail",
        path: `${path}.role`,
        message: `Evidence "${evidence.id}" contains a transformation record but is labeled ${evidence.role}.`,
        repair: "Use the transformation evidence role or remove the record."
      })
    }
    for (const inputId of evidence.transformation?.inputEvidenceIds ?? []) {
      if (!evidenceIds.has(inputId)) {
        findings.push({
          id: `evidence.transformation-input.${evidence.id}.${inputId}`,
          relation: "claim-support",
          status: "fail",
          path: `${path}.transformation.inputEvidenceIds`,
          evidenceIds: [inputId],
          message: `Transformation evidence "${evidence.id}" references missing input "${inputId}".`,
          repair: "Add the source evidence or correct the input reference."
        })
      }
    }
    if (evidence.generatedClaimId && !claimIds.has(evidence.generatedClaimId)) {
      findings.push({
        id: `evidence.generated-claim.${evidence.id}`,
        relation: "claim-support",
        status: "fail",
        path: `${path}.generatedClaimId`,
        message: `Evidence "${evidence.id}" names an unknown generated claim.`
      })
    }
  }

  for (const cycle of transformationCycles(contract.evidence)) {
    findings.push({
      id: `evidence.transformation-cycle.${cycle.join(".")}`,
      relation: "claim-support",
      status: "fail",
      path: "evidence",
      evidenceIds: [...new Set(cycle)],
      message: `Evidence transformations contain a cycle: ${cycle.join(" → ")}.`,
      repair:
        "Replace the cycle with an acyclic chain whose inputs terminate at source evidence."
    })
  }

  for (const claim of contract.claims) {
    for (const prior of claim.supersedes ?? []) {
      if (!claimIds.has(prior)) {
        findings.push({
          id: `claims.supersedes-missing.${claim.id}.${prior}`,
          relation: "challenge-and-correction",
          status: "fail",
          path: "claims",
          message: `Claim "${claim.id}" supersedes missing claim "${prior}".`
        })
      }
      if (prior === claim.id) {
        findings.push({
          id: `claims.supersedes-self.${claim.id}`,
          relation: "challenge-and-correction",
          status: "fail",
          path: "claims",
          message: `Claim "${claim.id}" cannot supersede itself.`
        })
      } else {
        const priorClaim = claimsById.get(prior)
        if (
          priorClaim &&
          priorClaim.status !== "superseded" &&
          priorClaim.status !== "retracted"
        ) {
          findings.push({
            id: `claims.supersedes-active.${claim.id}.${prior}`,
            relation: "challenge-and-correction",
            status: "fail",
            path: "claims",
            message: `Claim "${claim.id}" supersedes claim "${prior}", but the prior claim remains ${priorClaim.status}.`,
            repair:
              "Preserve the prior claim and mark it superseded or retracted."
          })
        }
      }
    }
  }
  for (const cycle of supersessionCycles(contract.claims)) {
    findings.push({
      id: `claims.supersession-cycle.${cycle.join(".")}`,
      relation: "challenge-and-correction",
      status: "fail",
      path: "claims",
      message: `Claim supersession contains a cycle: ${cycle.join(" → ")}.`
    })
  }

  findings.push(...auditClaimCorrections(contract))

  const summary = summarizeObligations(findings)
  return {
    ok: summary.fail === 0,
    claims: contract.claims.length,
    evidence: contract.evidence.length,
    summary,
    findings
  }
}
