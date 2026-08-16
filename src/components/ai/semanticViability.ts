import type { Datum } from "../charts/shared/datumTypes"
import type {
  SemanticViabilityDiagnostic,
  SemanticViabilityCheck,
  SemanticViabilityCallback
} from "./chartCapabilityTypes"
import {
  BUMP_CHART_SEMANTIC_VIABILITY,
  evaluateRankCompetition
} from "../charts/xy/BumpChart.semanticViability"
import type { RenderEvidence } from "../server/renderEvidence"
import {
  getRegisteredSemanticViability,
  hasRegisteredSemanticViability
} from "./semanticViabilityRegistry"

function semanticCheck(component: string): SemanticViabilityCheck | undefined {
  if (hasRegisteredSemanticViability(component)) {
    return getRegisteredSemanticViability(component)
  }
  return component === "BumpChart" ? BUMP_CHART_SEMANTIC_VIABILITY : undefined
}

function isDiagnostic(
  value: SemanticViabilityDiagnostic
): value is SemanticViabilityDiagnostic {
  return (
    typeof value?.code === "string" &&
    value.code.length > 0 &&
    (value.severity === "warning" || value.severity === "error") &&
    typeof value.message === "string" &&
    value.message.length > 0
  )
}

/**
 * Attach capability-owned semantic viability to scene evidence in place.
 *
 * Paint status remains independent: a semantically degenerate chart still has
 * `status: "ok"` and `empty: false`, while `semanticStatus` explains that the
 * marks do not form a meaningful encoding. Unknown charts and capabilities
 * without a check are explicitly `not-assessed` rather than assumed sound.
 */
export function applySemanticViability(
  evidence: RenderEvidence,
  component: string,
  props: Readonly<Datum>
): void {
  evidence.semanticDiagnostics = []
  evidence.semanticStatus = "not-assessed"
  if (evidence.empty) return

  const check = semanticCheck(component)
  if (!check) return

  let diagnostics: SemanticViabilityDiagnostic[]
  try {
    const results = typeof check === "function"
      ? (check as SemanticViabilityCallback)(props, evidence)
      : evaluateRankCompetition(props)
    diagnostics = Array.from(results).filter(isDiagnostic)
  } catch {
    if (!evidence.warnings.includes("SEMANTIC_VIABILITY_CHECK_FAILED")) {
      evidence.warnings.push("SEMANTIC_VIABILITY_CHECK_FAILED")
    }
    return
  }

  evidence.semanticDiagnostics = diagnostics
  evidence.semanticStatus = diagnostics.some(
    (diagnostic) => diagnostic.severity === "error"
  )
    ? "degenerate"
    : diagnostics.some((diagnostic) => diagnostic.severity === "warning")
      ? "degraded"
      : "meaningful"

  for (const diagnostic of diagnostics) {
    if (!evidence.warnings.includes(diagnostic.code)) {
      evidence.warnings.push(diagnostic.code)
    }
  }
}
