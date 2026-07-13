/**
 * Privacy-preserving logging for the MCP HTTP service.
 *
 * This is intentionally a narrow boundary rather than a general-purpose
 * logger. MCP requests can contain credentials, chart data, labels, JSX/SVG,
 * and other user content. Those values must never reach application logs.
 * Only the fixed event names and normalized operational metadata below are
 * serialized. Unknown fields are dropped at runtime as a second line of
 * defense against future callers accidentally passing a request or an Error.
 *
 * `MCP_LOG_RETENTION_DAYS` is a declared policy value, not a mechanism for
 * deleting provider logs. The deployment must configure its log bucket / sink
 * with the same (or a shorter) retention period; see deploy/cloud-run/README.
 */

// `info` records bounded completion metrics by default. Deployments that only
// want rejection/failure signals can set MCP_LOG_LEVEL=warn; `silent` is an
// explicit opt-out for the process-level logger.
export const DEFAULT_MCP_LOG_LEVEL = "info" as const
export const DEFAULT_MCP_LOG_RETENTION_DAYS = 30
export const DEFAULT_MCP_LOG_MAX_EVENT_BYTES = 1024
export const MIN_MCP_LOG_MAX_EVENT_BYTES = 256
export const MAX_MCP_LOG_MAX_EVENT_BYTES = 4096
export const MAX_MCP_LOG_RETENTION_DAYS = 90

export type McpLogLevel = "silent" | "error" | "warn" | "info"
export type McpLogSeverity = Exclude<McpLogLevel, "silent">

export type McpLoggingPolicy = {
  /** Minimum severity emitted by this process. `silent` disables it entirely. */
  level: McpLogLevel
  /** Deployment-declared maximum retention; Cloud Run must enforce it externally. */
  retentionDays: number
  /** Hard maximum for one serialized JSON log event (not including its newline). */
  maxEventBytes: number
}

/**
 * Inputs accepted by the logging boundary. Deliberately absent: request body,
 * headers, query string, tool name/arguments, output, Error, stack, and free
 * text. Runtime filtering also drops unknown object keys.
 */
export type McpLogMetadataInput = {
  method?: unknown
  route?: unknown
  status?: unknown
  reason?: unknown
  durationMs?: unknown
  bodyBytes?: unknown
  profile?: unknown
  retentionDays?: unknown
  protocolVersionPresent?: unknown
}

export type McpMetadataLogRecord = {
  schema: "semiotic-mcp-log/v1"
  service: "semiotic-mcp"
  timestamp: string
  severity: Uppercase<McpLogSeverity>
  event: string
  metadata: Record<string, string | number | boolean>
}

export type McpLogWriter = (severity: McpLogSeverity, line: string) => void

const LEVEL_RANK: Record<McpLogSeverity, number> = {
  error: 0,
  warn: 1,
  info: 2,
}

const SAFE_EVENTS = new Set([
  "request_completed",
  "request_failed",
  "request_rejected",
  "service_fatal",
  "service_started",
  "log_event_truncated",
])

const SAFE_REASONS = new Set([
  "forbidden_host",
  "forbidden_origin",
  "invalid_json",
  "operation_limit",
  "request_body_too_large",
  "request_concurrency",
  "request_handler_error",
  "request_rate",
  "request_stream_error",
  "service_startup_failure",
  "unauthorized",
  "unsupported_accept",
  "unsupported_protocol_version",
])

const SAFE_ROUTES = new Set([
  "/",
  "/mcp",
  "/health",
  "/healthz",
  "/.well-known/openai-apps-challenge",
])

function boundedPositiveInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback
  return Math.min(max, Math.max(min, parsed))
}

/** Resolve the policy once at process startup; malformed values fail closed. */
export function resolveMcpLoggingPolicy(
  env: Record<string, string | undefined> = process.env,
): McpLoggingPolicy {
  const requestedLevel = env.MCP_LOG_LEVEL?.trim().toLowerCase()
  const level: McpLogLevel =
    requestedLevel === "silent" ||
    requestedLevel === "error" ||
    requestedLevel === "warn" ||
    requestedLevel === "info"
      ? requestedLevel
      : DEFAULT_MCP_LOG_LEVEL

  return {
    level,
    retentionDays: boundedPositiveInteger(
      env.MCP_LOG_RETENTION_DAYS,
      DEFAULT_MCP_LOG_RETENTION_DAYS,
      1,
      MAX_MCP_LOG_RETENTION_DAYS,
    ),
    maxEventBytes: boundedPositiveInteger(
      env.MCP_LOG_MAX_EVENT_BYTES,
      DEFAULT_MCP_LOG_MAX_EVENT_BYTES,
      MIN_MCP_LOG_MAX_EVENT_BYTES,
      MAX_MCP_LOG_MAX_EVENT_BYTES,
    ),
  }
}

function safeMethod(value: unknown): string {
  if (typeof value !== "string") return "other"
  const upper = value.toUpperCase()
  return upper === "GET" || upper === "POST" || upper === "OPTIONS" ? upper : "other"
}

function safeRoute(value: unknown): string {
  return typeof value === "string" && SAFE_ROUTES.has(value) ? value : "other"
}

function safeCode(value: unknown, allowlist: Set<string>): string {
  return typeof value === "string" && allowlist.has(value) ? value : "other"
}

function safeInteger(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max
    ? value
    : undefined
}

/**
 * Project arbitrary caller input to the small, value-free metadata schema.
 * This function intentionally does not stringify unknown values: a secret in
 * an unexpected key is discarded instead of being "helpfully" coerced.
 */
export function sanitizeMcpLogMetadata(
  input: McpLogMetadataInput = {},
): Record<string, string | number | boolean> {
  const metadata: Record<string, string | number | boolean> = {}

  if (input.method !== undefined) metadata.method = safeMethod(input.method)
  if (input.route !== undefined) metadata.route = safeRoute(input.route)

  const status = safeInteger(input.status, 100, 599)
  if (status !== undefined) metadata.status = status

  if (input.reason !== undefined) metadata.reason = safeCode(input.reason, SAFE_REASONS)

  const durationMs = safeInteger(input.durationMs, 0, 86_400_000)
  if (durationMs !== undefined) metadata.durationMs = durationMs

  const bodyBytes = safeInteger(input.bodyBytes, 0, 1_073_741_824)
  if (bodyBytes !== undefined) metadata.bodyBytes = bodyBytes

  if (input.profile !== undefined) {
    metadata.profile = input.profile === "public" || input.profile === "developer"
      ? input.profile
      : "other"
  }

  const retentionDays = safeInteger(input.retentionDays, 1, MAX_MCP_LOG_RETENTION_DAYS)
  if (retentionDays !== undefined) metadata.retentionDays = retentionDays

  if (typeof input.protocolVersionPresent === "boolean") {
    metadata.protocolVersionPresent = input.protocolVersionPresent
  }

  return metadata
}

function defaultMcpLogWriter(_severity: McpLogSeverity, line: string): void {
  // stderr keeps accidental use in stdio mode from corrupting MCP's stdout
  // protocol stream. Cloud Run collects JSON lines from both streams.
  process.stderr.write(`${line}\n`)
}

function serializeBoundedRecord(
  record: McpMetadataLogRecord,
  maxEventBytes: number,
): string {
  const serialized = JSON.stringify(record)
  if (Buffer.byteLength(serialized, "utf8") <= maxEventBytes) return serialized

  // Every permitted configuration allows at least 256 bytes, so this fixed
  // fallback stays below the caller's cap even if a future metadata field
  // accidentally grows beyond the policy.
  return JSON.stringify({
    schema: "semiotic-mcp-log/v1",
    service: "semiotic-mcp",
    timestamp: record.timestamp,
    severity: record.severity,
    event: "log_event_truncated",
    metadata: {},
  } satisfies McpMetadataLogRecord)
}

export type McpMetadataLogger = {
  error(event: string, metadata?: McpLogMetadataInput): void
  warn(event: string, metadata?: McpLogMetadataInput): void
  info(event: string, metadata?: McpLogMetadataInput): void
}

/**
 * Create the only logger used by the hosted MCP transport. A logging failure
 * is deliberately swallowed: observability must never alter a request result.
 */
export function createMcpMetadataLogger(
  policy: McpLoggingPolicy = resolveMcpLoggingPolicy(),
  writer: McpLogWriter = defaultMcpLogWriter,
): McpMetadataLogger {
  const emit = (
    severity: McpLogSeverity,
    event: string,
    metadata: McpLogMetadataInput = {},
  ) => {
    if (policy.level === "silent" || LEVEL_RANK[severity] > LEVEL_RANK[policy.level]) return

    const record: McpMetadataLogRecord = {
      schema: "semiotic-mcp-log/v1",
      service: "semiotic-mcp",
      timestamp: new Date().toISOString(),
      severity: severity.toUpperCase() as Uppercase<McpLogSeverity>,
      event: safeCode(event, SAFE_EVENTS),
      metadata: sanitizeMcpLogMetadata(metadata),
    }

    try {
      writer(severity, serializeBoundedRecord(record, policy.maxEventBytes))
    } catch {
      // A closed stderr, a full disk, or a third-party sink must not make the
      // MCP request fail or trigger a second, potentially unsafe error log.
    }
  }

  return {
    error: (event, metadata) => emit("error", event, metadata),
    warn: (event, metadata) => emit("warn", event, metadata),
    info: (event, metadata) => emit("info", event, metadata),
  }
}
