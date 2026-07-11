/**
 * Output-boundary helpers for MCP render tools.
 *
 * Request limits protect the work a caller can ask the service to do. These
 * limits protect the response channel as well: a chart render can expand a
 * compact request into a very large SVG, and Apps metadata must not quietly
 * mirror an entire input config back into an iframe.
 */

export const DEFAULT_MCP_MAX_RENDER_OUTPUT_BYTES = 2 * 1024 * 1024
export const DEFAULT_MCP_MAX_WIDGET_OUTPUT_BYTES = 2 * 1024 * 1024
export const DEFAULT_MCP_MAX_WIDGET_METADATA_BYTES = 64 * 1024
export const DEFAULT_MCP_MAX_WIDGET_ROWS = 50
export const DEFAULT_MCP_MAX_WIDGET_COLUMNS = 16
export const DEFAULT_MCP_MAX_WIDGET_VALUE_BYTES = 256

const WIDGET_COLUMN_LABEL_BYTES = 96
const WIDGET_EVIDENCE_ARRAY_ITEMS = 32
const WIDGET_EVIDENCE_OBJECT_KEYS = 16

type LimitEnvironment = Record<string, string | undefined>

export type McpRenderOutputLimits = {
  maxRenderOutputBytes: number
  maxWidgetOutputBytes: number
  maxWidgetMetadataBytes: number
  maxWidgetRows: number
  maxWidgetColumns: number
  maxWidgetValueBytes: number
}

export type McpOutputLimitResult =
  | { ok: true; observed: number; maximum: number }
  | { ok: false; observed: number; maximum: number }

export type WidgetPreviewCell = string | number | boolean | null

export type WidgetDataPreview = {
  collection: "data" | "nodes" | "edges" | "links" | null
  totalRows: number
  returnedRows: number
  returnedColumns: number
  rows: Array<Record<string, WidgetPreviewCell>>
  redactedFields: number
  truncatedValues: number
  truncated: boolean
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** Resolve caps at the service boundary. Invalid overrides retain safe defaults. */
export function resolveMcpRenderOutputLimits(
  env: LimitEnvironment = process.env,
): McpRenderOutputLimits {
  return {
    maxRenderOutputBytes: positiveInteger(
      env.MCP_MAX_RENDER_OUTPUT_BYTES,
      DEFAULT_MCP_MAX_RENDER_OUTPUT_BYTES,
    ),
    maxWidgetOutputBytes: positiveInteger(
      env.MCP_MAX_WIDGET_OUTPUT_BYTES,
      DEFAULT_MCP_MAX_WIDGET_OUTPUT_BYTES,
    ),
    maxWidgetMetadataBytes: positiveInteger(
      env.MCP_MAX_WIDGET_METADATA_BYTES,
      DEFAULT_MCP_MAX_WIDGET_METADATA_BYTES,
    ),
    maxWidgetRows: positiveInteger(env.MCP_MAX_WIDGET_ROWS, DEFAULT_MCP_MAX_WIDGET_ROWS),
    maxWidgetColumns: positiveInteger(env.MCP_MAX_WIDGET_COLUMNS, DEFAULT_MCP_MAX_WIDGET_COLUMNS),
    maxWidgetValueBytes: positiveInteger(
      env.MCP_MAX_WIDGET_VALUE_BYTES,
      DEFAULT_MCP_MAX_WIDGET_VALUE_BYTES,
    ),
  }
}

export function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8")
}

export function serializedMcpOutputBytes(value: unknown): number {
  const serialized = JSON.stringify(value)
  return utf8ByteLength(serialized === undefined ? "" : serialized)
}

/** A UTF-8-safe, deterministic truncation marker for text exposed to a widget. */
export function truncateUtf8(value: string, maximumBytes: number): string {
  if (maximumBytes <= 0 || !value) return ""
  if (utf8ByteLength(value) <= maximumBytes) return value

  const marker = "…"
  const markerBytes = utf8ByteLength(marker)
  if (maximumBytes < markerBytes) return ""

  const targetBytes = maximumBytes - markerBytes
  let output = ""
  let usedBytes = 0
  for (const character of value) {
    const characterBytes = utf8ByteLength(character)
    if (usedBytes + characterBytes > targetBytes) break
    output += character
    usedBytes += characterBytes
  }
  return `${output}${marker}`
}

export function inspectMcpOutputLimit(value: unknown, maximum: number): McpOutputLimitResult {
  const observed = serializedMcpOutputBytes(value)
  return observed <= maximum
    ? { ok: true, observed, maximum }
    : { ok: false, observed, maximum }
}

export function formatMcpOutputLimitError(args: {
  label: string
  limit: McpOutputLimitResult
  setting: "MCP_MAX_RENDER_OUTPUT_BYTES" | "MCP_MAX_WIDGET_OUTPUT_BYTES"
}): string {
  return `${args.label} output exceeds the configured response limit (${args.limit.observed} > ${args.limit.maximum} bytes; set ${args.setting} to adjust). Reduce chart data or request a smaller render.`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isSensitiveField(name: string): boolean {
  return /password|passwd|secret|token|api[-_]?key|authorization|cookie|credential|private[-_]?key/i.test(name)
}

type PreviewColumn = {
  key: string
  label: string
}

function previewColumnLabel(key: string, used: Set<string>): string {
  const base = truncateUtf8(key || "value", WIDGET_COLUMN_LABEL_BYTES) || "value"
  let label = base
  let suffix = 2
  while (used.has(label)) {
    label = `${base} (${suffix})`
    suffix += 1
  }
  used.add(label)
  return label
}

function selectPreviewCollection(props: Record<string, unknown>): {
  collection: WidgetDataPreview["collection"]
  rows: unknown[]
} {
  for (const collection of ["data", "nodes", "edges", "links"] as const) {
    if (Array.isArray(props[collection])) {
      return { collection, rows: props[collection] }
    }
  }
  return { collection: null, rows: [] }
}

function collectPreviewColumns(rows: unknown[], limits: McpRenderOutputLimits): {
  columns: PreviewColumn[]
  truncated: boolean
} {
  const keys: string[] = []
  const seen = new Set<string>()
  let truncated = false

  for (const row of rows) {
    if (isRecord(row)) {
      for (const key of Object.keys(row)) {
        if (seen.has(key)) continue
        if (keys.length >= limits.maxWidgetColumns) {
          truncated = true
          break
        }
        seen.add(key)
        keys.push(key)
      }
    } else if (!seen.has("value")) {
      if (keys.length >= limits.maxWidgetColumns) {
        truncated = true
      } else {
        seen.add("value")
        keys.push("value")
      }
    }
    if (keys.length >= limits.maxWidgetColumns && truncated) break
  }

  const usedLabels = new Set<string>()
  return {
    columns: keys.map((key) => ({ key, label: previewColumnLabel(key, usedLabels) })),
    truncated,
  }
}

function previewCell(
  value: unknown,
  fieldName: string,
  limits: McpRenderOutputLimits,
): { value: WidgetPreviewCell; redacted: boolean; truncated: boolean } {
  if (isSensitiveField(fieldName)) {
    return { value: "[redacted]", redacted: true, truncated: false }
  }

  if (value === null || value === undefined) {
    return { value: null, redacted: false, truncated: false }
  }
  if (typeof value === "string") {
    const bounded = truncateUtf8(value, limits.maxWidgetValueBytes)
    return { value: bounded, redacted: false, truncated: bounded !== value }
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { value, redacted: false, truncated: false }
      : { value: String(value), redacted: false, truncated: false }
  }
  if (typeof value === "boolean") return { value, redacted: false, truncated: false }
  if (Array.isArray(value)) {
    return { value: `[array: ${value.length} items]`, redacted: false, truncated: true }
  }
  if (typeof value === "object") {
    return { value: "[object]", redacted: false, truncated: true }
  }
  return {
    value: truncateUtf8(String(value), limits.maxWidgetValueBytes),
    redacted: false,
    truncated: true,
  }
}

/**
 * Project one chart collection into a widget-safe table preview. This is
 * deliberately a one-way projection: the original props, nested values, and
 * unselected rows never cross the Apps metadata boundary.
 */
export function createWidgetDataPreview(
  props: Record<string, unknown>,
  limits: McpRenderOutputLimits = resolveMcpRenderOutputLimits(),
): WidgetDataPreview {
  const selected = selectPreviewCollection(props)
  const inputRows = selected.rows.slice(0, limits.maxWidgetRows)
  const columnSelection = collectPreviewColumns(inputRows, limits)
  const rows: Array<Record<string, WidgetPreviewCell>> = []
  let redactedFields = 0
  let truncatedValues = 0
  let metadataBoundReached = false

  for (const input of inputRows) {
    const row: Record<string, WidgetPreviewCell> = {}
    let rowRedactedFields = 0
    let rowTruncatedValues = 0
    for (const column of columnSelection.columns) {
      const hasValue = isRecord(input)
        ? Object.prototype.hasOwnProperty.call(input, column.key)
        : column.key === "value"
      const value = isRecord(input) ? input[column.key] : input
      if (!hasValue) {
        row[column.label] = null
        continue
      }
      const cell = previewCell(value, column.key, limits)
      row[column.label] = cell.value
      if (cell.redacted) rowRedactedFields += 1
      if (cell.truncated) rowTruncatedValues += 1
    }

    // Use a conservative `truncated: true` candidate: the final object is no
    // larger when all rows fit and that flag becomes false.
    const candidate: WidgetDataPreview = {
      collection: selected.collection,
      totalRows: selected.rows.length,
      returnedRows: rows.length + 1,
      returnedColumns: columnSelection.columns.length,
      rows: [...rows, row],
      redactedFields: redactedFields + rowRedactedFields,
      truncatedValues: truncatedValues + rowTruncatedValues,
      truncated: true,
    }
    if (serializedMcpOutputBytes(candidate) > limits.maxWidgetMetadataBytes) {
      metadataBoundReached = true
      break
    }
    rows.push(row)
    redactedFields += rowRedactedFields
    truncatedValues += rowTruncatedValues
  }

  const truncated =
    metadataBoundReached ||
    columnSelection.truncated ||
    selected.rows.length > rows.length ||
    truncatedValues > 0

  return {
    collection: selected.collection,
    totalRows: selected.rows.length,
    returnedRows: rows.length,
    returnedColumns: columnSelection.columns.length,
    rows,
    redactedFields,
    truncatedValues,
    truncated,
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function boundedEvidenceStrings(value: unknown, limits: McpRenderOutputLimits): {
  values: string[]
  truncated: boolean
} | undefined {
  if (!Array.isArray(value)) return undefined
  const values = value
    .slice(0, WIDGET_EVIDENCE_ARRAY_ITEMS)
    .map((item) => truncateUtf8(String(item), limits.maxWidgetValueBytes))
  return { values, truncated: value.length > values.length }
}

/**
 * Render evidence is intentionally allowlisted for the widget. It remains
 * useful for inspection while avoiding future arbitrary fields becoming an
 * accidental second channel for full input data.
 */
export function createWidgetEvidencePreview(
  evidence: Record<string, unknown> | null,
  limits: McpRenderOutputLimits = resolveMcpRenderOutputLimits(),
): Record<string, unknown> | null {
  if (!evidence) return null

  const preview: Record<string, unknown> = {}
  for (const key of ["component", "frameType", "status", "ariaLabel"] as const) {
    if (typeof evidence[key] === "string") {
      preview[key] = truncateUtf8(evidence[key] as string, limits.maxWidgetValueBytes)
    }
  }
  if (typeof evidence.empty === "boolean") preview.empty = evidence.empty

  for (const key of [
    "markCount",
    "width",
    "height",
    "nodeCount",
    "edgeCount",
    "legendItems",
    "annotationCount",
  ] as const) {
    const value = finiteNumber(evidence[key])
    if (value !== undefined) preview[key] = value
  }

  for (const key of ["xDomain", "yDomain"] as const) {
    const domain = evidence[key]
    if (Array.isArray(domain) && domain.length === 2) {
      const values = domain.map(finiteNumber)
      if (values[0] !== undefined && values[1] !== undefined) preview[key] = values
    }
  }

  const categories = boundedEvidenceStrings(evidence.categories, limits)
  if (categories) {
    preview.categories = categories.values
    if (categories.truncated) preview.categoriesTruncated = true
  }
  const warnings = boundedEvidenceStrings(evidence.warnings, limits)
  if (warnings) {
    preview.warnings = warnings.values
    if (warnings.truncated) preview.warningsTruncated = true
  }

  if (isRecord(evidence.markCountByType)) {
    const markCountByType: Record<string, number> = {}
    const entries = Object.entries(evidence.markCountByType)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, WIDGET_EVIDENCE_OBJECT_KEYS)
    for (const [key, value] of entries) {
      const count = finiteNumber(value)
      if (count !== undefined) {
        markCountByType[truncateUtf8(key, WIDGET_COLUMN_LABEL_BYTES)] = count
      }
    }
    preview.markCountByType = markCountByType
    if (Object.keys(evidence.markCountByType).length > entries.length) {
      preview.markCountByTypeTruncated = true
    }
  }

  return preview
}
