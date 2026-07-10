import type { Datum } from "../charts/shared/datumTypes"
import {
  auditAccessibility,
  formatAccessibilityAudit,
  type AccessibilityAuditResult,
  type AuditAccessibilityOptions,
} from "../charts/shared/auditAccessibility"
import {
  diagnoseConfig,
  type DiagnosisResult,
} from "../charts/shared/diagnoseConfig"
import {
  configToJSX,
  toConfig,
  type ChartConfig,
  type ToConfigOptions,
} from "../export/chartConfig"
import {
  buildReaderGrounding,
  type ChartReaderGrounding,
  type ChartReaderGroundingOptions,
} from "./readerGrounding"

export type DataPitfallsImageMediaType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"

export interface DataPitfallsImageSource {
  content: string
  mediaType: DataPitfallsImageMediaType
  filename?: string
}

export interface DataPitfallsTextInput {
  kind: "code" | "text"
  content: string
  language?: string
  filename?: string
}

export interface DataPitfallsImageInput {
  kind: "image"
  images: DataPitfallsImageSource[]
}

export interface DataPitfallsDocumentInput {
  kind: "document"
  content: string
  mediaType: "application/pdf"
  filename?: string
}

export interface DataPitfallsSlideContent {
  text: string
  images: DataPitfallsImageSource[]
}

export interface DataPitfallsSlidesInput {
  kind: "slides"
  slides: DataPitfallsSlideContent[]
  filename?: string
}

export type DataPitfallsSingleArtifactInput =
  | DataPitfallsTextInput
  | DataPitfallsImageInput
  | DataPitfallsDocumentInput
  | DataPitfallsSlidesInput

export interface DataPitfallsChainStage {
  role: string
  artifact: DataPitfallsSingleArtifactInput
}

export interface DataPitfallsChainInput {
  kind: "chain"
  stages: DataPitfallsChainStage[]
}

export interface DataPitfallsRenderedChart {
  /** SVG markup from `semiotic/server` renderChart/renderChartWithEvidence or MCP renderChart. */
  svg?: string
  /** Render evidence from `renderChartWithEvidence` or MCP renderChart. */
  evidence?: unknown
  /** Optional rendered chart image for Data Pitfalls' Vision path. */
  image?: DataPitfallsImageSource | DataPitfallsImageSource[]
}

export interface DataPitfallsBridgeOptions {
  /** Default true. Include the serializable Semiotic chart config as JSON. */
  includeConfig?: boolean
  /** Default true. Include JSX reconstructed from the serializable chart config. */
  includeJSX?: boolean
  /** Default true. Include describeChart/buildReaderGrounding text and structure. */
  includeGrounding?: boolean
  /** Default true. Include diagnoseConfig output. */
  includeDiagnostics?: boolean
  /** Default true. Include auditAccessibility output. */
  includeAccessibility?: boolean
  /** Optional author or app context, such as the analytical question or intended claim. */
  context?: string
  /** Optional narrative/caption/claim that will be reviewed alongside the chart. */
  narrative?: string
  /** Optional output from a render path. */
  rendered?: DataPitfallsRenderedChart
  /** Forwarded to toConfig. Use includeData: false to omit raw rows from config/JSX stages; other stages may still summarize data. */
  config?: ToConfigOptions
  /** Forwarded to buildReaderGrounding. */
  grounding?: ChartReaderGroundingOptions
  /** Forwarded to auditAccessibility. */
  accessibility?: AuditAccessibilityOptions
  /** Prefix used for generated filenames. Default: component name. */
  filenamePrefix?: string
  /** Extra caller-supplied chain stages, appended last. */
  additionalStages?: DataPitfallsChainStage[]
}

export interface DataPitfallsBridgeResult {
  input: DataPitfallsChainInput
  config: ChartConfig
  grounding?: ChartReaderGrounding
  diagnosis?: DiagnosisResult
  accessibility?: AccessibilityAuditResult
}

export type DataPitfallsSeverity =
  | "info"
  | "warning"
  | "error"
  | (string & {})

export type DataPitfallsInputKind =
  | "text"
  | "code"
  | "image"
  | "document"
  | "slides"
  | "chain"
  | (string & {})

export interface DataPitfallsFinding {
  ruleId: string
  name: string
  domain: string
  severity: DataPitfallsSeverity
  evidence?: string
  remediation?: string
  explanation?: string
  condition?: string
  [key: string]: unknown
}

export interface DataPitfallsReport {
  kind: DataPitfallsInputKind
  findings: DataPitfallsFinding[]
  [key: string]: unknown
}

export type DataPitfallsNotificationLevel =
  | "info"
  | "warning"
  | "error"
  | "neutral"

export interface DataPitfallsChartNotification {
  id?: string
  level?: DataPitfallsNotificationLevel
  title?: string
  message: string
  source?: string
  dismissible?: boolean
}

export type DataPitfallsNotificationMessage =
  (
    finding: DataPitfallsFinding,
    index: number,
    report: DataPitfallsReport
  ) => string

export interface DataPitfallsNotificationBridgeOptions {
  /** Cap emitted notifications. `meta.count` keeps the uncapped finding count. */
  max?: number
  /** Prefix for the source tag. Default: "datapitfalls". */
  sourcePrefix?: string
  /** Passed through to ChartContainer notifications when set. */
  dismissible?: boolean
  /** Custom message mapper. Defaults to remediation, explanation, evidence, then condition. */
  message?: DataPitfallsNotificationMessage
}

export interface DataPitfallsNotificationBridge {
  notifications: DataPitfallsChartNotification[]
  meta: { count: number; kind: DataPitfallsInputKind }
}

export type DataPitfallsAnnotationType = "label" | "text"

export interface DataPitfallsSemioticAnnotation {
  type: DataPitfallsAnnotationType
  title: string
  label: string
  wrap: number
  color: string
  className: string
  emphasis: "primary" | "secondary"
  provenance: {
    author: "datapitfalls"
    authorKind: "watcher"
    source: "computed"
    basis: "llm-inference"
    stableId: string
  }
  dataPitfall: {
    ruleId: string
    domain: string
    severity: DataPitfallsSeverity
    evidence: string
  }
  [key: string]: unknown
}

export interface DataPitfallsAnnotationBridgeOptions {
  /** Override severity colors. Merged over the defaults. */
  palette?: Partial<Record<string, string>>
  /** Cap emitted annotations. `meta.count` keeps the uncapped finding count. */
  max?: number
  /** Text wrap width passed through to Semiotic v3 annotations. Default: 240. */
  wrap?: number
  /** Semiotic v3 annotation type. Default: "label". */
  type?: DataPitfallsAnnotationType
  /**
   * Optional host-owned anchoring. Return `{ x, y }`, data accessors, or any
   * other Semiotic annotation fields for findings you can position.
   */
  anchorFor?: (
    finding: DataPitfallsFinding,
    index: number,
    report: DataPitfallsReport
  ) => Record<string, unknown> | null | undefined
}

export interface DataPitfallsAnnotationBridge {
  annotations: DataPitfallsSemioticAnnotation[]
  meta: { count: number; kind: DataPitfallsInputKind }
}

export const DEFAULT_DATA_PITFALLS_ANNOTATION_PALETTE = {
  info: "#2563eb",
  warning: "#d97706",
  error: "#dc2626",
} as const

const DEFAULT_DATA_PITFALLS_WRAP = 240

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

function cappedFindings(
  report: DataPitfallsReport,
  max: number | undefined
): DataPitfallsFinding[] {
  return max == null
    ? report.findings
    : report.findings.slice(0, Math.max(0, max))
}

function firstText(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return "Review this finding."
}

function findingMessage(finding: DataPitfallsFinding): string {
  return firstText(
    finding.remediation,
    finding.explanation,
    finding.evidence,
    finding.condition
  )
}

function findingTitle(finding: DataPitfallsFinding): string {
  return firstText(finding.name, finding.ruleId)
}

function notificationLevel(severity: DataPitfallsSeverity): DataPitfallsNotificationLevel {
  if (severity === "error") return "error"
  if (severity === "warning") return "warning"
  if (severity === "info") return "info"
  return "neutral"
}

function findingSource(finding: DataPitfallsFinding, prefix: string): string {
  return finding.domain ? `${prefix} · ${finding.domain}` : prefix
}

function paletteColor(
  severity: DataPitfallsSeverity,
  palette: Partial<Record<string, string>>
): string {
  return palette[severity] ?? palette.info ?? DEFAULT_DATA_PITFALLS_ANNOTATION_PALETTE.info
}

function findingId(finding: DataPitfallsFinding): string {
  return firstText(finding.ruleId, finding.name)
}

function indexedFindingId(finding: DataPitfallsFinding, index: number): string {
  return `${findingId(finding)}:${index}`
}

function severityClassName(severity: DataPitfallsSeverity): string {
  return `pitfall-${String(severity).toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`
}

export function dataPitfallsFindingToNotification(
  finding: DataPitfallsFinding,
  options: DataPitfallsNotificationBridgeOptions = {},
  index = 0,
  report: DataPitfallsReport = { kind: "image", findings: [finding] }
): DataPitfallsChartNotification {
  const prefix = options.sourcePrefix ?? "datapitfalls"
  return {
    id: indexedFindingId(finding, index),
    level: notificationLevel(finding.severity),
    title: findingTitle(finding),
    message: options.message
      ? options.message(finding, index, report)
      : findingMessage(finding),
    source: findingSource(finding, prefix),
    ...(options.dismissible === undefined ? {} : { dismissible: options.dismissible }),
  }
}

export function toDataPitfallsNotifications(
  report: DataPitfallsReport,
  options: DataPitfallsNotificationBridgeOptions = {}
): DataPitfallsChartNotification[] {
  return cappedFindings(report, options.max).map((finding, index) =>
    dataPitfallsFindingToNotification(finding, options, index, report)
  )
}

export function buildDataPitfallsNotificationBridge(
  report: DataPitfallsReport,
  options: DataPitfallsNotificationBridgeOptions = {}
): DataPitfallsNotificationBridge {
  return {
    notifications: toDataPitfallsNotifications(report, options),
    meta: { count: report.findings.length, kind: report.kind },
  }
}

export function dataPitfallsFindingToAnnotation(
  finding: DataPitfallsFinding,
  options: DataPitfallsAnnotationBridgeOptions = {},
  index = 0,
  report: DataPitfallsReport = { kind: "image", findings: [finding] }
): DataPitfallsSemioticAnnotation {
  const palette = {
    ...DEFAULT_DATA_PITFALLS_ANNOTATION_PALETTE,
    ...options.palette,
  }
  const anchor = options.anchorFor?.(finding, index, report)

  return {
    ...(anchor ?? {}),
    type: options.type ?? "label",
    title: findingTitle(finding),
    label: findingMessage(finding),
    wrap: options.wrap ?? DEFAULT_DATA_PITFALLS_WRAP,
    color: paletteColor(finding.severity, palette),
    className: severityClassName(finding.severity),
    emphasis: finding.severity === "error" ? "primary" : "secondary",
    provenance: {
      author: "datapitfalls",
      authorKind: "watcher",
      source: "computed",
      basis: "llm-inference",
      stableId: finding.ruleId,
    },
    dataPitfall: {
      ruleId: finding.ruleId,
      domain: finding.domain,
      severity: finding.severity,
      evidence: finding.evidence ?? "",
    },
  }
}

export function toDataPitfallsAnnotations(
  report: DataPitfallsReport,
  options: DataPitfallsAnnotationBridgeOptions = {}
): DataPitfallsSemioticAnnotation[] {
  return cappedFindings(report, options.max).map((finding, index) =>
    dataPitfallsFindingToAnnotation(finding, options, index, report)
  )
}

export function buildDataPitfallsAnnotationBridge(
  report: DataPitfallsReport,
  options: DataPitfallsAnnotationBridgeOptions = {}
): DataPitfallsAnnotationBridge {
  return {
    annotations: toDataPitfallsAnnotations(report, options),
    meta: { count: report.findings.length, kind: report.kind },
  }
}

function textStage(role: string, content: string, filename?: string): DataPitfallsChainStage {
  return {
    role,
    artifact: {
      kind: "text",
      content,
      ...(filename ? { filename } : {}),
    },
  }
}

function codeStage(
  role: string,
  content: string,
  language: string,
  filename?: string
): DataPitfallsChainStage {
  return {
    role,
    artifact: {
      kind: "code",
      content,
      language,
      ...(filename ? { filename } : {}),
    },
  }
}

function imageStage(
  role: string,
  images: DataPitfallsImageSource[]
): DataPitfallsChainStage | null {
  return images.length > 0
    ? { role, artifact: { kind: "image", images } }
    : null
}

function formatDiagnosis(component: string, result: DiagnosisResult): string {
  const errors = result.diagnoses.filter((d) => d.severity === "error").length
  const warnings = result.diagnoses.filter((d) => d.severity === "warning").length
  const lines = [
    `${component}: Semiotic diagnoseConfig report`,
    `ok: ${result.ok}`,
    `errors: ${errors}`,
    `warnings: ${warnings}`,
  ]

  if (result.diagnoses.length === 0) {
    lines.push("", "No Semiotic config issues detected.")
    return lines.join("\n")
  }

  lines.push("")
  for (const d of result.diagnoses) {
    lines.push(`[${d.severity}] ${d.code}: ${d.message}`)
    if (d.fix) lines.push(`Fix: ${d.fix}`)
  }

  return lines.join("\n")
}

function formatGrounding(grounding: ChartReaderGrounding): string {
  return [
    `${grounding.component}: Semiotic reader grounding`,
    "",
    grounding.text,
    "",
    "Structured grounding JSON:",
    "```json",
    stringify(grounding),
    "```",
  ].join("\n")
}

/**
 * Build a Data Pitfalls-compatible chain input from a Semiotic chart config.
 *
 * The returned `input` is intentionally dependency-free: pass it to
 * `detectPitfalls(input, options)` from the `datapitfalls` package in your app,
 * CI job, or research harness. Semiotic contributes the chart config,
 * reader-grounding payload, config diagnostics, accessibility audit, and
 * optional rendered output; Data Pitfalls remains responsible for model-backed
 * pitfall detection.
 */
export function buildDataPitfallsBridge(
  component: string,
  props: Datum,
  options: DataPitfallsBridgeOptions = {}
): DataPitfallsBridgeResult {
  const stages: DataPitfallsChainStage[] = []
  const includeConfig = options.includeConfig !== false
  const includeJSX = options.includeJSX !== false
  const includeGrounding = options.includeGrounding !== false
  const includeDiagnostics = options.includeDiagnostics !== false
  const includeAccessibility = options.includeAccessibility !== false
  const prefix = options.filenamePrefix ?? component

  const config = toConfig(component, props, options.config)

  if (options.context?.trim()) {
    stages.push(textStage(
      "Analysis context",
      options.context.trim(),
      `${prefix}.context.md`
    ))
  }

  if (includeConfig) {
    stages.push(codeStage(
      "Semiotic chart config",
      stringify(config),
      "json",
      `${prefix}.semiotic-config.json`
    ))
  }

  if (includeJSX) {
    stages.push(codeStage(
      "Semiotic chart JSX",
      configToJSX(config),
      "jsx",
      `${prefix}.semiotic.jsx`
    ))
  }

  const renderedImages = asArray(options.rendered?.image)
  const renderedImageStage = imageStage("Rendered chart image", renderedImages)
  if (renderedImageStage) stages.push(renderedImageStage)

  if (options.rendered?.svg?.trim()) {
    stages.push(codeStage(
      "Rendered chart SVG",
      options.rendered.svg.trim(),
      "svg",
      `${prefix}.rendered.svg`
    ))
  }

  if (options.rendered?.evidence != null) {
    stages.push(textStage(
      "Semiotic render evidence",
      [
        `${component}: Semiotic render evidence`,
        "",
        "```json",
        stringify(options.rendered.evidence),
        "```",
      ].join("\n"),
      `${prefix}.render-evidence.md`
    ))
  }

  let grounding: ChartReaderGrounding | undefined
  if (includeGrounding) {
    grounding = buildReaderGrounding(component, props, options.grounding)
    stages.push(textStage(
      "Semiotic reader grounding",
      formatGrounding(grounding),
      `${prefix}.reader-grounding.md`
    ))
  }

  let diagnosis: DiagnosisResult | undefined
  if (includeDiagnostics) {
    diagnosis = diagnoseConfig(component, props)
    stages.push(textStage(
      "Semiotic config diagnostics",
      formatDiagnosis(component, diagnosis),
      `${prefix}.diagnose-config.md`
    ))
  }

  let accessibility: AccessibilityAuditResult | undefined
  if (includeAccessibility) {
    accessibility = auditAccessibility(component, props, options.accessibility)
    stages.push(textStage(
      "Semiotic accessibility audit",
      formatAccessibilityAudit(accessibility),
      `${prefix}.accessibility.md`
    ))
  }

  if (options.narrative?.trim()) {
    stages.push(textStage(
      "Author narrative",
      options.narrative.trim(),
      `${prefix}.narrative.md`
    ))
  }

  if (options.additionalStages?.length) {
    stages.push(...options.additionalStages)
  }

  if (stages.length === 0) {
    stages.push(codeStage(
      "Semiotic chart config",
      stringify(config),
      "json",
      `${prefix}.semiotic-config.json`
    ))
  }

  return {
    input: { kind: "chain", stages },
    config,
    ...(grounding ? { grounding } : {}),
    ...(diagnosis ? { diagnosis } : {}),
    ...(accessibility ? { accessibility } : {}),
  }
}

/** Convenience wrapper when you only need the Data Pitfalls input object. */
export function toDataPitfallsChain(
  component: string,
  props: Datum,
  options: DataPitfallsBridgeOptions = {}
): DataPitfallsChainInput {
  return buildDataPitfallsBridge(component, props, options).input
}
