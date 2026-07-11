import {
  DEFAULT_MCP_MAX_RENDER_OUTPUT_BYTES,
  DEFAULT_MCP_MAX_WIDGET_OUTPUT_BYTES,
  createWidgetDataPreview,
  createWidgetEvidencePreview,
  formatMcpOutputLimitError,
  inspectMcpOutputLimit,
  resolveMcpRenderOutputLimits,
  serializedMcpOutputBytes,
  truncateUtf8,
  type McpRenderOutputLimits,
} from "./mcp-render-output-limits"

const smallLimits: McpRenderOutputLimits = {
  maxRenderOutputBytes: 1_024,
  maxWidgetOutputBytes: 1_024,
  maxWidgetMetadataBytes: 800,
  maxWidgetRows: 2,
  maxWidgetColumns: 3,
  maxWidgetValueBytes: 12,
}

describe("MCP render output limits", () => {
  it("uses independent safe render and widget caps", () => {
    expect(resolveMcpRenderOutputLimits({
      MCP_MAX_RENDER_OUTPUT_BYTES: "1234",
      MCP_MAX_WIDGET_OUTPUT_BYTES: "5678",
    })).toMatchObject({
      maxRenderOutputBytes: 1234,
      maxWidgetOutputBytes: 5678,
    })

    expect(resolveMcpRenderOutputLimits({
      MCP_MAX_RENDER_OUTPUT_BYTES: "0",
      MCP_MAX_WIDGET_OUTPUT_BYTES: "invalid",
    })).toMatchObject({
      maxRenderOutputBytes: DEFAULT_MCP_MAX_RENDER_OUTPUT_BYTES,
      maxWidgetOutputBytes: DEFAULT_MCP_MAX_WIDGET_OUTPUT_BYTES,
    })
  })

  it("projects only a bounded, redacted data preview", () => {
    const preview = createWidgetDataPreview({
      data: [
        {
          label: "abcdefghijklmnopqrstuvwxyz",
          accessToken: "super-secret-token",
          nested: { shouldNot: "leave the service" },
          ignoredAfterColumnCap: "not returned",
        },
        {
          label: "second row",
          accessToken: "another-secret",
          nested: ["also", "not", "returned"],
        },
        { label: "third row is beyond the preview cap" },
      ],
    }, smallLimits)

    expect(preview.collection).toBe("data")
    expect(preview.totalRows).toBe(3)
    expect(preview.returnedRows).toBe(2)
    expect(preview.returnedColumns).toBe(3)
    expect(preview.truncated).toBe(true)
    expect(preview.redactedFields).toBe(2)
    expect(preview.rows[0].label).toMatch(/…$/)
    expect(preview.rows[0].accessToken).toBe("[redacted]")
    expect(preview.rows[0].nested).toBe("[object]")
    expect(JSON.stringify(preview)).not.toContain("super-secret-token")
    expect(JSON.stringify(preview)).not.toContain("ignoredAfterColumnCap")
    expect(serializedMcpOutputBytes(preview)).toBeLessThanOrEqual(smallLimits.maxWidgetMetadataBytes)
  })

  it("stops at the metadata byte cap instead of spilling later rows", () => {
    const metadataLimited = createWidgetDataPreview({
      data: Array.from({ length: 10 }, (_, index) => ({
        label: `${index}:${"x".repeat(128)}`,
        detail: "y".repeat(128),
      })),
    }, {
      ...smallLimits,
      maxWidgetRows: 10,
      maxWidgetColumns: 2,
      maxWidgetValueBytes: 128,
      maxWidgetMetadataBytes: 400,
    })

    expect(metadataLimited.totalRows).toBe(10)
    expect(metadataLimited.returnedRows).toBeLessThan(10)
    expect(metadataLimited.truncated).toBe(true)
    expect(serializedMcpOutputBytes(metadataLimited)).toBeLessThanOrEqual(400)
  })

  it("allowlists and bounds evidence before it reaches the widget", () => {
    const evidence = createWidgetEvidencePreview({
      component: "BarChart",
      markCount: 3,
      categories: Array.from({ length: 40 }, (_, index) => `category-${index}`),
      markCountByType: { rect: 3 },
      internalInputEcho: "must not be forwarded",
    }, smallLimits)

    expect(evidence).toMatchObject({
      component: "BarChart",
      markCount: 3,
      markCountByType: { rect: 3 },
      categoriesTruncated: true,
    })
    expect((evidence?.categories as string[])).toHaveLength(32)
    expect(evidence).not.toHaveProperty("internalInputEcho")
  })

  it("uses a deterministic error instead of returning an oversized payload", () => {
    const limit = inspectMcpOutputLimit({ content: "x".repeat(128) }, 32)
    expect(limit).toEqual({ ok: false, observed: expect.any(Number), maximum: 32 })
    expect(formatMcpOutputLimitError({
      label: "Rendered chart",
      limit,
      setting: "MCP_MAX_RENDER_OUTPUT_BYTES",
    })).toContain("MCP_MAX_RENDER_OUTPUT_BYTES")
    expect(truncateUtf8("😀😀😀", 9)).toBe("😀…")
  })
})
