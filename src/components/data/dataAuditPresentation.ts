import type { DataAuditDiagnosis, DataAuditResult } from "./auditData"

export interface DataAuditChartNotification {
  readonly id: string
  readonly level: "warning" | "error"
  readonly title: string
  readonly message: string
  readonly source: "Semiotic data audit"
  readonly dismissible: true
}

export interface DataAuditNotificationOptions {
  /** Maximum individual findings before a final overflow notice. Default 6. */
  readonly max?: number
  /** Omit non-blocking warnings. Default false. */
  readonly errorsOnly?: boolean
}

export function formatDataAudit(result: DataAuditResult): string {
  const status = result.ok ? "✓ numerically safe" : "✗ numeric hazards found"
  const lines = [
    `${result.component}: ${status}`,
    `${result.rowCount} rows · ${result.summary.fieldsChecked} numeric fields · ${result.summary.errors} errors · ${result.summary.warnings} warnings`,
  ]
  for (const item of result.diagnoses) {
    lines.push(
      `${item.severity === "error" ? "ERROR" : "WARN"} ${item.code}${item.field ? ` [${item.field}]` : ""}: ${item.message}`,
    )
    if (item.fix) lines.push(`  Fix: ${item.fix}`)
  }
  return lines.join("\n")
}

function findingTitle(item: DataAuditDiagnosis): string {
  return item.code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/** Map audit findings directly onto ChartContainer's notification contract. */
export function toDataAuditNotifications(
  result: DataAuditResult,
  options: DataAuditNotificationOptions = {},
): DataAuditChartNotification[] {
  const max = Math.max(0, Math.floor(options.max ?? 6))
  const visible = result.diagnoses
    .map((item, diagnosisIndex) => ({ item, diagnosisIndex }))
    .filter(({ item }) => !options.errorsOnly || item.severity === "error")
  const notifications = visible.slice(0, max).map(({ item, diagnosisIndex }) => ({
    id: `data-audit:${item.code}:${item.role ?? "chart"}:${item.field ?? "chart"}:${diagnosisIndex}`,
    level: item.severity,
    title: item.field
      ? `${findingTitle(item)} · ${item.field}`
      : findingTitle(item),
    message: item.fix ? `${item.message} ${item.fix}` : item.message,
    source: "Semiotic data audit" as const,
    dismissible: true as const,
  }))
  if (visible.length > max) {
    notifications.push({
      id: "data-audit:overflow:chart",
      level: visible.slice(max).some(({ item }) => item.severity === "error")
        ? "error"
        : "warning",
      title: `${visible.length - max} more numeric finding${visible.length - max === 1 ? "" : "s"}`,
      message: "Run auditData() or diagnoseConfig() to inspect the complete report.",
      source: "Semiotic data audit",
      dismissible: true,
    })
  }
  return notifications
}
