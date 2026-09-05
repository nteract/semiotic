/**
 * Unified, deterministic chart evaluation for agent and application callers.
 *
 * This is intentionally a composition point rather than a second diagnostic
 * engine. The individual audits remain useful on their own; this module gives
 * callers one ranked finding list and one notification feed for the checks
 * that should happen before a chart is shown to a reader.
 */
import type { Datum } from "../charts/shared/datumTypes"
import type {
  A11yFinding,
  AccessibilityAuditResult,
  AuditAccessibilityOptions
} from "../charts/shared/auditAccessibility"
import { auditAccessibility } from "../charts/shared/auditAccessibility"
import type { Diagnosis } from "../charts/shared/diagnoseTypes"
import { diagnoseConfig } from "../charts/shared/diagnoseConfig"
import type { ValidationResult } from "../charts/shared/validateProps"
import { validateProps } from "../charts/shared/validateProps"
import {
  auditData,
  type AuditDataOptions,
  type DataAuditDiagnosis,
  type DataAuditResult
} from "../data/auditData"
import type { RenderEvidence } from "../server/renderEvidence"
import type { RenderFn } from "./generativeChart"
import { semanticEvidenceDiagnostics } from "./semanticEvidence"
import { artifactAttachmentIssues } from "../artifact/attachmentAudit"

export type EvaluateChartStage =
  "data" | "deception" | "accessibility" | "render"
export type EvaluateChartSeverity = "error" | "warning" | "manual"

export interface EvaluateChartFinding {
  readonly id: string
  /** One-based position in the stable, severity-ranked findings list. */
  readonly rank: number
  readonly stage: EvaluateChartStage
  readonly severity: EvaluateChartSeverity
  readonly code: string
  readonly message: string
  readonly fix?: string
  readonly source: string
  readonly critical?: boolean
  readonly principle?: A11yFinding["principle"]
  readonly heuristic?: string
  readonly field?: string
  readonly role?: string
  readonly rows?: ReadonlyArray<number>
  readonly count?: number
}

export interface EvaluateChartNotification {
  readonly id: string
  readonly level: "warning" | "error"
  readonly title: string
  readonly message: string
  readonly source: "Semiotic chart evaluation"
  readonly dismissible: true
}

export interface EvaluateChartOptions extends AuditAccessibilityOptions {
  /** Overrides or extends the built-in numeric data contracts. */
  readonly dataAudit?: AuditDataOptions
  /** Optionally prove the configuration against a server or custom renderer. */
  readonly render?: RenderFn
  /** Maximum number of findings shown in the notification feed. */
  readonly notificationMax?: number
}

export interface EvaluateChartSummary {
  readonly errors: number
  readonly warnings: number
  readonly manual: number
  readonly findings: number
  readonly notifications: number
}

export interface EvaluateChartResult {
  readonly component: string
  /** The independent validation result, retained for callers that need it. */
  readonly validation: ValidationResult
  /** Numeric/domain audit results. */
  readonly data: DataAuditResult
  /** Non-data configuration and representation diagnoses. */
  readonly deception: ReadonlyArray<Diagnosis>
  /** Static Chartability accessibility audit. */
  readonly accessibility: AccessibilityAuditResult
  /** Present only when a renderer was injected. */
  readonly evidence?: RenderEvidence
  readonly ok: boolean
  readonly summary: EvaluateChartSummary
  readonly findings: ReadonlyArray<EvaluateChartFinding>
  readonly notifications: ReadonlyArray<EvaluateChartNotification>
}

const severityWeight: Record<EvaluateChartSeverity, number> = {
  error: 0,
  warning: 1,
  manual: 2
}

const stageWeight: Record<EvaluateChartStage, number> = {
  data: 0,
  deception: 1,
  accessibility: 2,
  render: 3
}

function titleForCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function findingFromDiagnosis(
  diagnosis: Diagnosis | DataAuditDiagnosis,
  stage: EvaluateChartStage,
  index: number
): Omit<EvaluateChartFinding, "rank"> {
  return {
    id: `${stage}.${diagnosis.code.toLowerCase()}.${index + 1}`,
    stage,
    severity: diagnosis.severity,
    code: diagnosis.code,
    message: diagnosis.message,
    ...(diagnosis.fix ? { fix: diagnosis.fix } : {}),
    source: stage === "data" ? "auditData" : "diagnoseConfig",
    ...(diagnosis.field ? { field: diagnosis.field } : {}),
    ...(diagnosis.role ? { role: diagnosis.role } : {}),
    ...(diagnosis.rows ? { rows: diagnosis.rows } : {}),
    ...(diagnosis.count !== undefined ? { count: diagnosis.count } : {})
  }
}

function findingFromAccessibility(
  finding: A11yFinding,
  index: number
): Omit<EvaluateChartFinding, "rank"> {
  const severity: EvaluateChartSeverity =
    finding.status === "fail"
      ? "error"
      : finding.status === "warn"
        ? "warning"
        : "manual"
  return {
    id: finding.id || `accessibility.${index + 1}`,
    stage: "accessibility",
    severity,
    code: finding.id,
    message: finding.message,
    ...(finding.fix ? { fix: finding.fix } : {}),
    source: "auditAccessibility",
    critical: finding.critical,
    principle: finding.principle,
    heuristic: finding.heuristic
  }
}

function sortFindings(
  findings: ReadonlyArray<Omit<EvaluateChartFinding, "rank">>
): EvaluateChartFinding[] {
  return findings
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => {
      const severity =
        severityWeight[a.finding.severity] - severityWeight[b.finding.severity]
      if (severity !== 0) return severity
      const aCritical = a.finding.critical === true
      const bCritical = b.finding.critical === true
      if (aCritical !== bCritical) return aCritical ? -1 : 1
      const stage = stageWeight[a.finding.stage] - stageWeight[b.finding.stage]
      return stage !== 0 ? stage : a.index - b.index
    })
    .map(({ finding }, index) => ({ ...finding, rank: index + 1 }))
}

function renderFindings(
  evidence: RenderEvidence,
  component: string
): Array<Omit<EvaluateChartFinding, "rank">> {
  const findings: Array<Omit<EvaluateChartFinding, "rank">> = []
  if (evidence.component !== component) {
    findings.push({
      id: "render.component-mismatch",
      stage: "render",
      severity: "error",
      code: "RENDER_COMPONENT_MISMATCH",
      message: "The render evidence names a different chart component.",
      source: "renderChartWithEvidence"
    })
  }
  for (const issue of artifactAttachmentIssues({
    contract: evidence.artifactContract,
    transfer: evidence.artifactTransfer,
    binding: evidence.artifactBinding
  })) {
    findings.push({
      id: `render.${issue.id}`,
      stage: "render",
      severity: issue.status === "fail" ? "error" : "manual",
      code: issue.id.toUpperCase().replace(/[.-]/g, "_"),
      message: issue.message,
      source: "artifactAttachmentIssues"
    })
  }
  if (evidence.empty) {
    findings.push({
      id: "render.empty-scene",
      stage: "render",
      severity: "error",
      code: "EMPTY_SCENE",
      message: "The renderer produced no data marks.",
      fix: "Check the data shape, accessors, scales, and filters against the rendered evidence.",
      source: "renderChartWithEvidence"
    })
  }
  const semanticCodes = new Set<string>()
  for (const diagnostic of semanticEvidenceDiagnostics(evidence)) {
    semanticCodes.add(diagnostic.code)
    findings.push({
      id: `render.${diagnostic.code.toLowerCase()}`,
      stage: "render",
      severity: diagnostic.severity,
      code: diagnostic.code,
      message: diagnostic.message,
      ...(diagnostic.fix ? { fix: diagnostic.fix } : {}),
      source: "capability.semanticViability"
    })
  }
  for (const warning of evidence.warnings) {
    if (semanticCodes.has(warning)) continue
    findings.push({
      id: `render.${warning.toLowerCase()}`,
      stage: "render",
      severity: "warning",
      code: warning,
      message: `The renderer reported ${titleForCode(warning).toLowerCase()}.`,
      fix: "Inspect the render evidence and resolve the warning before relying on the chart.",
      source: "renderChartWithEvidence"
    })
  }
  return findings
}

function toNotifications(
  findings: ReadonlyArray<EvaluateChartFinding>,
  max: number
): EvaluateChartNotification[] {
  const actionable = findings.filter((finding) => finding.severity !== "manual")
  const notifications: EvaluateChartNotification[] = actionable
    .slice(0, max)
    .map((finding) => ({
      id: `chart-evaluation-${finding.id}`,
      level: finding.severity === "error" ? "error" : "warning",
      title: `${finding.stage}: ${titleForCode(finding.code)}`,
      message: finding.fix
        ? `${finding.message} ${finding.fix}`
        : finding.message,
      source: "Semiotic chart evaluation" as const,
      dismissible: true as const
    }))
  if (actionable.length > max) {
    notifications.push({
      id: "chart-evaluation-overflow",
      level: "warning",
      title: "Additional chart evaluation findings",
      message: `${actionable.length - max} additional finding(s) are available in the ranked evaluation result.`,
      source: "Semiotic chart evaluation",
      dismissible: true
    })
  }
  return notifications
}

/** Convert a unified evaluation into a compact human-readable report. */
export function formatEvaluateChart(result: EvaluateChartResult): string {
  const status = result.ok ? "PASS" : "ISSUES FOUND"
  const lines = [
    `${result.component}: ${status}`,
    `${result.summary.errors} error(s) · ${result.summary.warnings} warning(s) · ${result.summary.manual} manual check(s)`
  ]
  for (const finding of result.findings) {
    lines.push(
      `${finding.rank}. [${finding.stage}/${finding.code}] ${finding.message}`
    )
    if (finding.fix) lines.push(`   Fix: ${finding.fix}`)
  }
  return lines.join("\n")
}

/**
 * Evaluate a chart through the roadmap's data → deception → accessibility
 * triad. `data` is explicit so callers can evaluate a config without mutating
 * it; when supplied, it is also used as the effective `props.data` input for
 * validation and configuration checks.
 */
export function evaluateChart(
  component: string,
  props: Datum = {},
  data?: ReadonlyArray<Datum>,
  options: EvaluateChartOptions = {}
): EvaluateChartResult {
  const effectiveProps = data === undefined ? props : { ...props, data }
  const validation = validateProps(component, effectiveProps)
  const dataAudit = auditData(
    component,
    effectiveProps,
    data,
    options.dataAudit
  )
  const configDiagnosis = diagnoseConfig(component, effectiveProps)
  const deception = configDiagnosis.diagnoses.filter(
    (diagnosis) =>
      diagnosis.domain !== "data" && diagnosis.code !== "VALIDATION"
  )
  const accessibility = auditAccessibility(component, effectiveProps, {
    inChartContainer: options.inChartContainer,
    describe: options.describe,
    navigable: options.navigable
  })

  const rawFindings: Array<Omit<EvaluateChartFinding, "rank">> = []
  for (const [index, error] of validation.errors.entries()) {
    rawFindings.push({
      id: `validation.${index + 1}`,
      stage: "deception",
      severity: "error",
      code: "VALIDATION",
      message: error,
      fix: "Correct the component name, required props, prop types, and data shape.",
      source: "validateProps"
    })
  }
  dataAudit.diagnoses.forEach((diagnosis, index) => {
    rawFindings.push(findingFromDiagnosis(diagnosis, "data", index))
  })
  deception.forEach((diagnosis, index) => {
    rawFindings.push(findingFromDiagnosis(diagnosis, "deception", index))
  })
  accessibility.findings
    .filter(
      (finding) =>
        finding.status !== "pass" && finding.status !== "not-applicable"
    )
    .forEach((finding, index) => {
      rawFindings.push(findingFromAccessibility(finding, index))
    })

  let evidence: RenderEvidence | undefined
  const hasBlockingPreRenderFinding = rawFindings.some(
    (finding) =>
      finding.severity === "error" && finding.stage !== "accessibility"
  )
  if (options.render && validation.valid && !hasBlockingPreRenderFinding) {
    try {
      evidence = options.render(component, effectiveProps).evidence
      rawFindings.push(...renderFindings(evidence, component))
    } catch {
      rawFindings.push({
        id: "render.failed",
        stage: "render",
        severity: "error",
        code: "RENDER_FAILED",
        message:
          "The injected renderer failed before producing render evidence.",
        fix: "Check the chart configuration and renderer-specific requirements.",
        source: "renderChartWithEvidence"
      })
    }
  }

  const findings = sortFindings(rawFindings)
  const errors = findings.filter(
    (finding) => finding.severity === "error"
  ).length
  const warnings = findings.filter(
    (finding) => finding.severity === "warning"
  ).length
  const manual = findings.filter(
    (finding) => finding.severity === "manual"
  ).length
  const notifications = toNotifications(
    findings,
    Math.max(0, Math.floor(options.notificationMax ?? 8))
  )

  return {
    component,
    validation,
    data: dataAudit,
    deception,
    accessibility,
    ...(evidence ? { evidence } : {}),
    ok: errors === 0,
    summary: {
      errors,
      warnings,
      manual,
      findings: findings.length,
      notifications: notifications.length
    },
    findings,
    notifications
  }
}

export function toEvaluateChartNotifications(
  findings: ReadonlyArray<EvaluateChartFinding>,
  max = 8
): EvaluateChartNotification[] {
  return toNotifications(findings, Math.max(0, Math.floor(max)))
}
