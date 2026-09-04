import type { ObligationResult, ObligationSummary } from "./types"

export function summarizeObligations(
  findings: ReadonlyArray<ObligationResult>
): ObligationSummary {
  return {
    pass: findings.filter(({ status }) => status === "pass").length,
    fail: findings.filter(({ status }) => status === "fail").length,
    warn: findings.filter(({ status }) => status === "warn").length,
    manual: findings.filter(({ status }) => status === "manual").length,
    unknown: findings.filter(({ status }) => status === "unknown").length,
    notApplicable: findings.filter(({ status }) => status === "not-applicable")
      .length
  }
}

export function formatObligations(
  findings: ReadonlyArray<ObligationResult>
): string {
  const summary = summarizeObligations(findings)
  const lines = [
    `${summary.fail} failure(s) · ${summary.warn} warning(s) · ${summary.manual} manual check(s) · ${summary.unknown} unknown`
  ]
  findings.forEach((finding, index) => {
    lines.push(
      `${index + 1}. [${finding.status}/${finding.relation}] ${finding.message}`
    )
  })
  return lines.join("\n")
}
