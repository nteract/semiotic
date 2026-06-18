import type { Datum } from "../charts/shared/datumTypes"

export interface CustomTooltipEntry {
  key: string
  label: string
  value: unknown
  formatted: string
}

export interface CustomTooltipEntryOptions {
  /** Maximum number of rows to return. @default 8 */
  maxEntries?: number
  /** Extra keys to omit in addition to underscore-prefixed internals. */
  excludeKeys?: readonly string[] | Set<string>
  /** Include underscore-prefixed keys. @default false */
  includeInternal?: boolean
  /** Include null, undefined, and empty-string values. @default false */
  includeEmpty?: boolean
  /** Optional display labels by key. */
  labels?: Record<string, string> | ((key: string) => string)
  /** Optional value formatter. */
  valueFormat?: (value: unknown, key: string, datum: Record<string, unknown>) => string
}

const DEFAULT_EXCLUDED_KEYS = new Set(["rows"])

/**
 * Extract the user-facing datum from Semiotic hover/observation payloads.
 *
 * Custom charts can surface hover payloads as `hover.datum`,
 * `hover.datum.data`, `hover.data`, or `hover.data.data` depending on the
 * frame family and scene node type. This helper normalizes those shapes and
 * drops internal/function fields so tooltips do not render empty chrome.
 */
export function extractTooltipDatum(payload: unknown): Record<string, unknown> | null {
  const p = payload as Record<string, unknown> | null | undefined
  const candidates = [
    getPath(p, ["datum", "data"]),
    getPath(p, ["datum"]),
    getPath(p, ["data", "data"]),
    getPath(p, ["data"]),
    getPath(p, ["node", "datum", "data"]),
    getPath(p, ["node", "datum"]),
    payload,
  ]

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(candidate)) {
      if (key.startsWith("_") || typeof value === "function") continue
      out[key] = value
    }
    if (Object.keys(out).length > 0) return out
  }
  return null
}

export function buildTooltipEntries(
  payload: unknown,
  options: CustomTooltipEntryOptions = {}
): CustomTooltipEntry[] {
  const datum = extractTooltipDatum(payload)
  if (!datum) return []

  const exclude = new Set(DEFAULT_EXCLUDED_KEYS)
  if (options.excludeKeys) {
    for (const key of options.excludeKeys) exclude.add(key)
  }

  const entries: CustomTooltipEntry[] = []
  for (const [key, value] of Object.entries(datum)) {
    if (!options.includeInternal && key.startsWith("_")) continue
    if (exclude.has(key)) continue
    if (!options.includeEmpty && (value == null || value === "")) continue
    if (typeof value === "function") continue

    entries.push({
      key,
      label: tooltipLabel(key, options.labels),
      value,
      formatted: options.valueFormat
        ? options.valueFormat(value, key, datum)
        : formatTooltipValue(value),
    })
    if (entries.length >= (options.maxEntries ?? 8)) break
  }
  return entries
}

export function formatTooltipValue(value: unknown): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? String(value)
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  if (Array.isArray(value)) return `${value.length} items`
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function tooltipLabel(key: string, labels?: CustomTooltipEntryOptions["labels"]): string {
  if (typeof labels === "function") return labels(key)
  if (labels && labels[key]) return labels[key]
  return key
}

function getPath(source: Record<string, unknown> | null | undefined, path: string[]): unknown {
  let current: unknown = source
  for (const key of path) {
    if (!isRecord(current)) return undefined
    current = current[key]
  }
  return current
}

function isRecord(value: unknown): value is Datum {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
