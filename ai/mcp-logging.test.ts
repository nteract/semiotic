import { describe, expect, it } from "vitest"
import {
  DEFAULT_MCP_LOG_LEVEL,
  DEFAULT_MCP_LOG_MAX_EVENT_BYTES,
  DEFAULT_MCP_LOG_RETENTION_DAYS,
  MAX_MCP_LOG_MAX_EVENT_BYTES,
  MAX_MCP_LOG_RETENTION_DAYS,
  MIN_MCP_LOG_MAX_EVENT_BYTES,
  createMcpMetadataLogger,
  resolveMcpLoggingPolicy,
  type McpLogMetadataInput,
} from "./mcp-logging"

describe("MCP metadata-only logging", () => {
  it("resolves bounded logging configuration with conservative defaults", () => {
    expect(resolveMcpLoggingPolicy({
      MCP_LOG_LEVEL: "info",
      MCP_LOG_RETENTION_DAYS: "14",
      MCP_LOG_MAX_EVENT_BYTES: "512",
    })).toEqual({ level: "info", retentionDays: 14, maxEventBytes: 512 })

    expect(resolveMcpLoggingPolicy({
      MCP_LOG_LEVEL: "verbose",
      MCP_LOG_RETENTION_DAYS: "0",
      MCP_LOG_MAX_EVENT_BYTES: "not-a-number",
    })).toEqual({
      level: DEFAULT_MCP_LOG_LEVEL,
      retentionDays: DEFAULT_MCP_LOG_RETENTION_DAYS,
      maxEventBytes: DEFAULT_MCP_LOG_MAX_EVENT_BYTES,
    })

    expect(resolveMcpLoggingPolicy({
      MCP_LOG_RETENTION_DAYS: "9999",
      MCP_LOG_MAX_EVENT_BYTES: "999999",
    })).toMatchObject({
      retentionDays: MAX_MCP_LOG_RETENTION_DAYS,
      maxEventBytes: MAX_MCP_LOG_MAX_EVENT_BYTES,
    })
  })

  it("drops request/header/error content and preserves only normalized metadata", () => {
    const lines: string[] = []
    const secret = "super-secret-chart-payload-and-token"
    const logger = createMcpMetadataLogger(
      { level: "info", retentionDays: 30, maxEventBytes: 512 },
      (_severity, line) => lines.push(line),
    )

    logger.warn("request_rejected", {
      method: "POST",
      route: `/mcp?access_token=${secret}`,
      status: 401,
      reason: "unauthorized",
      durationMs: 12,
      bodyBytes: 123,
      retentionDays: 30,
      protocolVersionPresent: true,
      // Simulate the regression-prone shapes that must never be serialized.
      headers: { authorization: `Bearer ${secret}`, cookie: secret },
      payload: { props: { data: [{ salary: secret }] } },
      error: new Error(secret),
      stack: secret,
    } as unknown as McpLogMetadataInput)

    expect(lines).toHaveLength(1)
    expect(lines[0]).not.toContain(secret)
    expect(Buffer.byteLength(lines[0], "utf8")).toBeLessThanOrEqual(512)

    const record = JSON.parse(lines[0])
    expect(record).toMatchObject({
      schema: "semiotic-mcp-log/v1",
      service: "semiotic-mcp",
      severity: "WARN",
      event: "request_rejected",
      metadata: {
        method: "POST",
        // A query-bearing path is intentionally reduced to a fixed category.
        route: "other",
        status: 401,
        reason: "unauthorized",
        durationMs: 12,
        bodyBytes: 123,
        retentionDays: 30,
        protocolVersionPresent: true,
      },
    })
    expect(record.metadata).not.toHaveProperty("headers")
    expect(record.metadata).not.toHaveProperty("payload")
    expect(record.metadata).not.toHaveProperty("error")

    const smallestPolicyLines: string[] = []
    createMcpMetadataLogger(
      { level: "info", retentionDays: 30, maxEventBytes: MIN_MCP_LOG_MAX_EVENT_BYTES },
      (_severity, line) => smallestPolicyLines.push(line),
    ).warn("request_rejected", {
      route: `/mcp?access_token=${secret}`,
      // A future caller trying to add a large free-text field must not defeat
      // the size ceiling or turn it into a content leak.
      unexpectedText: secret.repeat(100),
    } as unknown as McpLogMetadataInput)
    expect(Buffer.byteLength(smallestPolicyLines[0], "utf8")).toBeLessThanOrEqual(MIN_MCP_LOG_MAX_EVENT_BYTES)
    expect(smallestPolicyLines[0]).not.toContain(secret)
  })

  it("uses severity filtering and never coerces unknown event/reason strings into logs", () => {
    const lines: string[] = []
    const logger = createMcpMetadataLogger(
      { level: "error", retentionDays: 30, maxEventBytes: 512 },
      (_severity, line) => lines.push(line),
    )

    logger.warn("request_rejected", { reason: "unauthorized" })
    logger.error("untrusted-event-name-with-a-secret", {
      reason: "untrusted-reason-with-a-secret",
      method: "PATCH super-secret",
      route: "/mcp?super-secret",
    })

    expect(lines).toHaveLength(1)
    expect(lines[0]).not.toContain("super-secret")
    expect(JSON.parse(lines[0])).toMatchObject({
      severity: "ERROR",
      event: "other",
      metadata: { reason: "other", method: "other", route: "other" },
    })

    const silentLines: string[] = []
    const silent = createMcpMetadataLogger(
      { level: "silent", retentionDays: 30, maxEventBytes: 512 },
      (_severity, line) => silentLines.push(line),
    )
    silent.error("service_fatal", { reason: "service_startup_failure" })
    expect(silentLines).toEqual([])
  })
})
