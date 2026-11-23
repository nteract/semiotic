import { evaluateChart, getIntent, profileData, scoreChart } from "semiotic/ai"
import { chartProfileInput } from "../mcp-chart-profile"

type CritiqueInput = {
  component: string
  props: Record<string, unknown>
  intent?: string
}

function assessFit(args: CritiqueInput, valid: boolean) {
  const { component, intent } = args
  if (!valid) return { status: "unavailable" as const, reason: "Correct the configuration before assessing fit." }
  if (intent && !getIntent(intent)) return { status: "unavailable" as const, reason: `Unknown analytical intent “${intent}”.` }
  const { data, rawInput } = chartProfileInput(args)
  if (!data.length && !rawInput) return { status: "unavailable" as const, reason: "The configuration provides no dataset to score." }
  const result = scoreChart(component, data, { intent, profile: profileData(data, { rawInput }) })
  if (result.status === "rejected") return result
  const { status, score, intentScores, reasons, caveats } = result
  return { status, score, intentScores, reasons, caveats }
}

export function critiqueChart(args: CritiqueInput) {
  const { component, props, intent } = args
  const evaluation = evaluateChart(component, props)
  const configurationValid = evaluation.validation.valid && evaluation.data.ok
  const fit = assessFit(args, configurationValid)
  const fitFinding = fit.status === "rejected"
    ? { code: "FIT_REJECTED", message: fit.reason }
    : fit.status === "ok" && intent && (fit.intentScores[intent] ?? 0) === 0
      ? { code: "INTENT_UNSUPPORTED", message: `The ${component} capability scores zero for the requested ${intent} intent.` }
      : undefined
  const ordered = [
    ...evaluation.findings.filter(f => f.severity !== "manual"),
    ...(fitFinding ? [{ ...fitFinding, stage: "fit", severity: "warning", fix: undefined }] : []),
    ...evaluation.findings.filter(f => f.severity === "manual")
  ]
  const findings = ordered.map(({ stage, severity, code, message, fix }, i) =>
    ({ rank: i + 1, stage, severity, code, message, ...(fix ? { fix } : {}) })
  )
  const narrative = [
    `${component} ${configurationValid ? "passes" : "fails"} configuration and data validation.`,
    intent ? `Requested intent: ${intent}.` : "No analytical intent was supplied.",
    fit.status === "ok"
      ? `Dataset fit: ${Number(fit.score.toFixed(2))}/5. ${fit.reasons[0] ?? ""}`.trim()
      : fit.reason,
    findings.find(f => f.stage !== "fit")?.message,
    "No render evidence was collected."
  ].filter(Boolean).join(" ")
  return { component, intent: intent ?? null, configurationValid, fit, findings, narrative, renderEvidence: null }
}
