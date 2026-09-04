import { auditClaims } from "./claims"
import {
  artifactDeclaresRelation,
  hasActiveArtifactClaims
} from "./policyRelations"
import {
  resolveArtifactPolicy,
  type ArtifactPolicy,
  type BuiltInArtifactPolicyId
} from "./policies"
import { auditTemporalContext } from "./temporal"
import type { ArtifactCollectionContract } from "./collection"
import type { RenderEvidence } from "../server/renderEvidence"
import type { ArtifactContract, ObligationResult } from "./types"

/** The bounded renderer fields a collection policy consumes for each artifact. */
export type ArtifactCollectionRenderEvidence = Pick<
  RenderEvidence,
  "component" | "status" | "empty" | "markCount" | "semanticStatus"
>

export interface ArtifactCollectionAuditOptions {
  /** Explicit reference clock for review, freshness, and expiry checks. */
  now?: string
  /**
   * Renderer results keyed by artifact ID. The audit reads at most one own
   * entry for each artifact in the collection and never adds this input to the
   * portable collection contract.
   */
  renderEvidenceByArtifactId?: Readonly<
    Record<string, ArtifactCollectionRenderEvidence>
  >
}

export interface ArtifactCollectionPolicyAudit {
  policy?: Pick<ArtifactPolicy, "id" | "version">
  findings: ObligationResult[]
}

function resolveCollectionPolicy(
  policyId: string | undefined,
  findings: ObligationResult[]
): ArtifactPolicy | undefined {
  if (policyId === undefined) return undefined
  try {
    return resolveArtifactPolicy(policyId as BuiltInArtifactPolicyId)
  } catch {
    findings.push({
      id: "collection.policy.unknown",
      relation: "accountability",
      status: "fail",
      path: "policyId",
      message: `Collection policy "${policyId}" is not a known versioned policy.`,
      repair:
        "Choose a registered policy identifier before relying on the collection audit."
    })
    return undefined
  }
}

function renderEvidenceObligation(
  artifact: ArtifactContract,
  evidenceValue: unknown,
  policyLabel: string
): ObligationResult {
  const artifactId = artifact.artifact.id
  const path = `renderEvidenceByArtifactId.${artifactId}`
  if (
    !evidenceValue ||
    typeof evidenceValue !== "object" ||
    Array.isArray(evidenceValue)
  ) {
    return {
      id: `collection.policy.render-evidence-missing.${artifactId}`,
      relation: "claim-support",
      status: "fail",
      path,
      message: `Collection policy "${policyLabel}" requires renderer proof for artifact "${artifactId}", but no evidence was supplied.`,
      repair:
        "Supply evidence emitted by renderChartWithEvidence for this artifact before release."
    }
  }

  const evidence = evidenceValue as Partial<ArtifactCollectionRenderEvidence>
  const expectedComponent = artifact.artifact.component
  if (
    typeof expectedComponent !== "string" ||
    !expectedComponent.trim() ||
    evidence.component !== expectedComponent
  ) {
    return {
      id: `collection.policy.render-evidence-component.${artifactId}`,
      relation: "claim-support",
      status: "fail",
      path,
      message: expectedComponent
        ? `Renderer proof for artifact "${artifactId}" names component "${String(evidence.component)}" instead of "${expectedComponent}".`
        : `Artifact "${artifactId}" does not declare the component needed to verify its renderer proof.`,
      repair:
        "Supply renderer evidence whose component exactly matches the artifact component identity."
    }
  }

  if (
    evidence.status !== "ok" ||
    evidence.empty !== false ||
    !Number.isSafeInteger(evidence.markCount) ||
    (evidence.markCount ?? 0) <= 0
  ) {
    return {
      id: `collection.policy.render-evidence-empty.${artifactId}`,
      relation: "claim-support",
      status: "fail",
      path,
      message: `Renderer proof for artifact "${artifactId}" does not establish a non-empty painted scene.`,
      repair:
        "Render the artifact again and resolve its data, accessor, scale, or filter problem before release."
    }
  }

  if (
    evidence.semanticStatus !== undefined &&
    evidence.semanticStatus !== "meaningful" &&
    evidence.semanticStatus !== "not-assessed"
  ) {
    return {
      id: `collection.policy.render-evidence-semantic.${artifactId}`,
      relation: "representation-fit",
      status: "fail",
      path,
      message: `Renderer proof for artifact "${artifactId}" reports a ${String(evidence.semanticStatus)} encoding.`,
      repair:
        "Resolve the renderer's semantic viability findings before release."
    }
  }

  return {
    id: `collection.policy.render-evidence.${artifactId}`,
    relation: "claim-support",
    status: "pass",
    path,
    message: `Artifact "${artifactId}" has compatible, non-empty renderer proof.`
  }
}

/** Apply collection policy rules without changing structural validation. */
export function auditArtifactCollectionPolicy(
  collection: ArtifactCollectionContract,
  options: ArtifactCollectionAuditOptions = {}
): ArtifactCollectionPolicyAudit {
  const findings: ObligationResult[] = []
  const policy = resolveCollectionPolicy(collection.policyId, findings)
  if (!policy) return { findings }

  const policyLabel = `${policy.id}@${policy.version}`

  for (const artifact of collection.artifacts) {
    const artifactId = artifact.artifact.id
    const artifactPath = `artifacts[${artifactId}]`
    if (policy.rules.requireRenderEvidence) {
      const evidenceByArtifactId = options.renderEvidenceByArtifactId
      const evidence =
        evidenceByArtifactId &&
        Object.prototype.hasOwnProperty.call(evidenceByArtifactId, artifactId)
          ? evidenceByArtifactId[artifactId]
          : undefined
      findings.push(renderEvidenceObligation(artifact, evidence, policyLabel))
    }
    const baselineClaimFailures = new Set(
      auditClaims(artifact)
        .findings.filter(({ status }) => status === "fail")
        .map(({ id }) => id)
    )
    const claimAudit = auditClaims(artifact, {
      requireEvidenceIdentity: policy.rules.requireEvidenceIdentity,
      requireReviewForModelClaims: policy.rules.requireReviewForModelClaims,
      ...(options.now ? { now: options.now } : {})
    })
    for (const finding of claimAudit.findings) {
      if (finding.status !== "fail" || baselineClaimFailures.has(finding.id)) {
        continue
      }
      findings.push({
        ...finding,
        id: `collection.policy.artifact.${artifactId}.${finding.id}`,
        path: finding.path ? `${artifactPath}.${finding.path}` : artifactPath
      })
    }

    if (policy.rules.requireClaims && !hasActiveArtifactClaims(artifact)) {
      findings.push({
        id: `collection.policy.claims-required.${artifactId}`,
        relation: "claim-support",
        status: "fail",
        path: `${artifactPath}.claims`,
        message: `Collection policy "${policyLabel}" requires artifact "${artifactId}" to declare at least one active claim.`,
        repair:
          "Add bounded claim records or choose a less strict collection policy."
      })
    }
    const unidentifiedEvidence = claimAudit.findings.filter(
      ({ id, status }) =>
        id.startsWith("evidence.identity.") && status === "unknown"
    )
    if (
      policy.rules.requireEvidenceIdentity &&
      unidentifiedEvidence.length > 0
    ) {
      findings.push({
        id: `collection.policy.evidence-identity-required.${artifactId}`,
        relation: "claim-support",
        status: "fail",
        path: `${artifactPath}.evidence`,
        message: `Collection policy "${policyLabel}" requires identity for evidence used by artifact "${artifactId}" claims.`,
        repair:
          "Add a source URI/version, data version, or deterministic fingerprint to each unidentified evidence record.",
        evidenceIds: unidentifiedEvidence
          .map(({ id }) => id.slice("evidence.identity.".length))
          .filter(Boolean)
      })
    }

    for (const claim of artifact.claims) {
      if (
        policy.rules.refuseUnsupportedClaims &&
        claim.status === "unsupported"
      ) {
        findings.push({
          id: `collection.policy.unsupported-claim.${artifactId}.${claim.id}`,
          relation: "abstention",
          status: "fail",
          path: `${artifactPath}.claims`,
          message: `Collection policy "${policyLabel}" refuses unsupported claim "${claim.id}" in artifact "${artifactId}".`
        })
      }
      if (policy.rules.refuseUnknownClaims && claim.status === "unknown") {
        findings.push({
          id: `collection.policy.unknown-claim.${artifactId}.${claim.id}`,
          relation: "abstention",
          status: "fail",
          path: `${artifactPath}.claims`,
          message: `Collection policy "${policyLabel}" refuses unknown claim "${claim.id}" in artifact "${artifactId}".`
        })
      }
    }

    const temporalAudit = auditTemporalContext(artifact.time, {
      claims: artifact.claims,
      corrections: artifact.contestability?.corrections,
      referenceTime: options.now,
      requireSettled: policy.rules.requireSettledTime,
      requireFreshnessForLive: policy.rules.requireFreshnessForLive
    })
    for (const finding of temporalAudit.findings) {
      if (finding.status !== "fail") continue
      findings.push({
        ...finding,
        id: `collection.policy.artifact.${artifactId}.${finding.id}`,
        path: finding.path ? `${artifactPath}.${finding.path}` : artifactPath
      })
    }
    if (
      policy.rules.refuseUnknownTime &&
      (!artifact.time || temporalAudit.summary.unknown > 0)
    ) {
      findings.push({
        id: `collection.policy.time-required.${artifactId}`,
        relation: "time",
        status: "fail",
        path: `${artifactPath}.time`,
        message: `Collection policy "${policyLabel}" refuses unknown time state for artifact "${artifactId}".`,
        repair:
          "Declare the relevant clocks, window, completeness, and freshness state."
      })
    }

    for (const relation of policy.requiredRelations) {
      if (artifactDeclaresRelation(artifact, relation)) continue
      findings.push({
        id: `collection.policy.relation.${artifactId}.${relation}`,
        relation,
        status: policy.id === "exploratory" ? "unknown" : "fail",
        path: artifactPath,
        message: `Collection policy "${policyLabel}" requires artifact "${artifactId}" to declare information for ${relation}.`,
        repair: `Add an explicit ${relation} record or choose a collection policy that does not require it.`
      })
    }
  }

  return {
    policy: { id: policy.id, version: policy.version },
    findings
  }
}
