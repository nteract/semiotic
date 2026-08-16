import type { SemanticViabilityDiagnostic } from "./chartCapabilityTypes"
import type { RenderEvidence } from "../server/renderEvidence"

const FALLBACK_DIAGNOSTIC: SemanticViabilityDiagnostic = {
  code: "SEMANTIC_DEGENERATE",
  severity: "error",
  message: "Marks painted, but the capability reported a semantically degenerate encoding.",
  fix: "Choose fields that support the chart's intended encoding."
}

export function semanticEvidenceDiagnostics(
  evidence: RenderEvidence
): ReadonlyArray<SemanticViabilityDiagnostic> {
  if (evidence.semanticDiagnostics?.length) return evidence.semanticDiagnostics
  return evidence.semanticStatus === "degenerate" ? [FALLBACK_DIAGNOSTIC] : []
}

export function semanticFailureReasons(evidence: RenderEvidence): string[] {
  if (evidence.semanticStatus !== "degenerate") return []
  return semanticEvidenceDiagnostics(evidence).map(
    (diagnostic) =>
      `${diagnostic.code}: ${diagnostic.message}${diagnostic.fix ? ` ${diagnostic.fix}` : ""}`
  )
}
