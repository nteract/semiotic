import type { EvaluateChartResult } from "../ai/evaluateChart"
import type {
  ArtifactEvaluation,
  RepairProposal
} from "./evaluateArtifactTypes"
import type { ArtifactRelation, ObligationResult } from "./types"

function relationForChartStage(
  stage: EvaluateChartResult["findings"][number]["stage"]
): ArtifactRelation {
  if (stage === "accessibility") return "reception"
  if (stage === "render" || stage === "data") return "claim-support"
  return "representation-fit"
}

export function chartObligations(
  chart: EvaluateChartResult
): ObligationResult[] {
  const findings = chart.findings.map<ObligationResult>((finding) => ({
    id: `chart.${finding.id}`,
    relation: relationForChartStage(finding.stage),
    status:
      finding.severity === "error"
        ? "fail"
        : finding.severity === "warning"
          ? "warn"
          : "manual",
    message: finding.message,
    ...(finding.fix ? { repair: finding.fix } : {}),
    ...(finding.field ? { path: `props.${finding.field}` } : {})
  }))
  if (findings.length === 0) {
    findings.push({
      id: "chart.deterministic-checks",
      relation: "representation-fit",
      status: "pass",
      message: "The chart passed the configured deterministic checks."
    })
  }
  return findings
}

export function renderEvidenceObligations(
  chart: EvaluateChartResult,
  required: boolean
): ObligationResult[] {
  if (!required) return []
  const proven = chart.evidence?.component === chart.component
  return [
    {
      id: "policy.render-evidence-required",
      relation: "claim-support",
      status: proven ? "pass" : "fail",
      path: "render",
      message: proven
        ? "The renderer supplied evidence for the painted chart scene."
        : chart.evidence
          ? "The active policy requires render evidence for the evaluated component, but the evidence names a different component."
          : "The active policy requires render evidence, but no renderer was provided.",
      ...(!proven
        ? {
            repair:
              "Evaluate with a renderChartWithEvidence-compatible renderer before release."
          }
        : {})
    }
  ]
}

export function repairProposals(
  obligations: ReadonlyArray<ObligationResult>
): RepairProposal[] {
  const seen = new Set<string>()
  return obligations.flatMap((obligation) => {
    if (!obligation.repair || seen.has(obligation.repair)) return []
    seen.add(obligation.repair)
    const category = obligation.id.startsWith("identity.")
      ? "identity"
      : obligation.id.startsWith("chart.") ||
          obligation.id === "policy.render-evidence-required"
        ? "configuration"
        : "contract"
    return [
      {
        id: `repair.${obligation.id}`,
        category,
        path: obligation.path,
        action: obligation.repair,
        reason: obligation.message,
        changesClaim:
          category === "contract" &&
          (obligation.relation === "claim-support" ||
            obligation.relation === "time")
      }
    ]
  })
}

export function hasCriticalAccessibilityFailure(
  chart: EvaluateChartResult
): boolean {
  return chart.accessibility.findings.some(
    ({ critical, status }) => critical && status === "fail"
  )
}

/** Explain a policy refusal in stable, user-facing language. */
export function explainArtifactRefusal(evaluation: ArtifactEvaluation): string {
  if (evaluation.status !== "refuse") {
    return `Artifact status is ${evaluation.status}; no refusal is active.`
  }
  const failures = evaluation.obligations.filter(
    ({ status }) => status === "fail"
  )
  const lines = [
    `Policy ${evaluation.policy.id}@${evaluation.policy.version} refused this artifact.`
  ]
  failures.slice(0, 8).forEach((finding, index) => {
    lines.push(`${index + 1}. ${finding.message}`)
    if (finding.repair) lines.push(`   Repair: ${finding.repair}`)
  })
  if (evaluation.recommendation?.status === "refuse") {
    lines.push(
      `Recommended outcome: ${evaluation.recommendation.selected.label}.`
    )
  }
  return lines.join("\n")
}
