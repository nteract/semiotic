/**
 * Evidence publication gate for ChartEvidenceEnvelope@1.
 *
 * This is deliberately conservative: it fails on provable publication risks
 * and records uncertainty rather than inventing semantic or visual agreement.
 */
import type { ChartEvidenceEnvelope } from "./chartEvidenceEnvelope"

export type EvidenceGateStatus = "pass" | "fail"

export interface EvidenceGateFinding {
  id: string
  severity: "error" | "warning"
  message: string
}

export interface EvidenceGateResult {
  status: EvidenceGateStatus
  ok: boolean
  findings: EvidenceGateFinding[]
}

export interface EvidenceGateOptions {
  requireRenderEvidence?: boolean
  requireAccessTable?: boolean
  requireNavigation?: boolean
  failOnCrossModalConflicts?: boolean
  /** Treat accessibility audit warnings as advisory rather than blocking. */
  allowAccessibilityWarnings?: boolean
}

function finding(
  id: string,
  severity: "error" | "warning",
  message: string
): EvidenceGateFinding {
  return { id, severity, message }
}

/** Check whether an envelope is safe to publish under the requested policy. */
export function evaluateEvidenceGate(
  envelope: ChartEvidenceEnvelope,
  options: EvidenceGateOptions = {}
): EvidenceGateResult {
  const findings: EvidenceGateFinding[] = []
  const requireRenderEvidence = options.requireRenderEvidence !== false
  const requireAccessTable = options.requireAccessTable !== false
  const failOnConflicts = options.failOnCrossModalConflicts !== false

  if (requireRenderEvidence && !envelope.render.evidence) {
    findings.push(
      finding(
        "render.missing-evidence",
        "error",
        "Publication requires render evidence proving that intended marks were observed."
      )
    )
  }

  if (requireRenderEvidence && !envelope.access.ssr.supported) {
    findings.push(
      finding(
        "access.ssr-unsupported",
        "error",
        "Publication requires a chart surface registered for server rendering; supplied evidence cannot promote an unsupported capability claim."
      )
    )
  }

  if (
    envelope.render.parity === "mismatch" ||
    envelope.render.evidence?.status === "empty"
  ) {
    findings.push(
      finding(
        "render.parity-mismatch",
        "error",
        "Intended data did not produce matching observed marks."
      )
    )
  }

  if (
    envelope.render.evidence?.semanticStatus === "degenerate" ||
    envelope.render.evidence?.semanticStatus === "degraded"
  ) {
    findings.push(
      finding(
        "render.semantic-viability",
        "error",
        `Render evidence marks the encoding ${envelope.render.evidence.semanticStatus}.`
      )
    )
  }

  if (requireAccessTable && !envelope.access.table.enabled) {
    findings.push(
      finding(
        "access.table-disabled",
        "error",
        "A required exact-value access route is disabled."
      )
    )
  }

  if (
    !envelope.access.navigation.supported &&
    options.requireNavigation === true
  ) {
    findings.push(
      finding(
        "access.navigation-missing",
        "error",
        "Structured navigation was required but is not available."
      )
    )
  }

  const audit = envelope.audit.accessibility as
    | {
        ok?: boolean
        findings?: Array<{ critical?: boolean; status?: string }>
      }
    | undefined
  if (audit && typeof audit === "object") {
    const blockingAccessibility =
      audit.ok === false &&
      (options.allowAccessibilityWarnings !== true ||
        (audit.findings ?? []).some(
          (item) => item.critical === true && item.status === "fail"
        ))
    if (blockingAccessibility) {
      findings.push(
        finding(
          "audit.accessibility-blocking",
          "error",
          options.allowAccessibilityWarnings === true
            ? "Accessibility audit contains critical failures."
            : "Accessibility audit is not passing."
        )
      )
    }
  }

  if (failOnConflicts && envelope.modalityChecks.tandem.conflicts.length > 0) {
    const unresolved = envelope.modalityChecks.tandem.conflicts.filter(
      (conflict) => !conflict.resolution || conflict.resolution === "unresolved"
    )
    if (unresolved.length > 0) {
      findings.push(
        finding(
          "modality.unresolved-conflicts",
          "error",
          `${unresolved.length} cross-modal disagreement(s) remain unresolved.`
        )
      )
    }
  }

  for (const claim of envelope.meaning.claims ?? []) {
    const unsupported =
      claim.supported === false ||
      claim.confidence === 0 ||
      !claim.evidenceIds?.length

    if (unsupported) {
      if (!envelope.limits.unsupportedClaims.includes(claim.claim)) {
        envelope.limits.unsupportedClaims.push(claim.claim)
      }
      findings.push(
        finding(
          "claim.unsupported",
          "error",
          claim.supported === false
            ? `Claim is explicitly unsupported: ${claim.claim}`
            : `Claim lacks evidence links: ${claim.claim}`
        )
      )
    }
  }

  return {
    status: findings.some((item) => item.severity === "error")
      ? "fail"
      : "pass",
    ok: !findings.some((item) => item.severity === "error"),
    findings
  }
}
