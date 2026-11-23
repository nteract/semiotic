import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { ChildProcess } from "node:child_process"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"

describe("developer MCP Vega-Lite conversion", () => {
  let server: ChildProcess
  beforeAll(async () => {
    server = spawnServer(["--profile", "developer"])
    await initializeServer(server)
  })
  afterAll(() => server?.kill())

  const rows = [
    { team: "East", orders: 12 },
    { team: "West", orders: 8 }
  ]
  const base = {
    mark: "bar",
    data: { values: rows },
    encoding: {
      x: { field: "team", type: "nominal" },
      y: { field: "orders", type: "quantitative" }
    }
  }
  const call = async (spec: unknown, mode?: "lossy") =>
    (
      await sendRequest(server, "tools/call", {
        name: "convertVegaLite",
        arguments: { spec, mode }
      })
    ).result

  it("publishes the input and config schemas and returns a directly renderable config", async () => {
    const listing = (await sendRequest(server, "tools/list")).result.tools
    const tool = listing.find(
      (t: { name: string }) => t.name === "convertVegaLite"
    )
    expect(tool).toMatchObject({
      inputSchema: {
        required: ["spec"],
        properties: { mode: { enum: ["strict", "lossy"] } }
      },
      outputSchema: {
        required: ["component", "props", "version", "createdAt"]
      },
      annotations: { readOnlyHint: true, openWorldHint: false }
    })
    const result = await call(base)
    expect(result.isError).not.toBe(true)
    const config = result.structuredContent
    expect(config).toEqual({
      component: "BarChart",
      props: { data: rows, categoryAccessor: "team", valueAccessor: "orders" },
      version: "1",
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
    })
    expect(JSON.parse(result.content[0].text)).toEqual(config)
    const rendered = (
      await sendRequest(server, "tools/call", {
        name: "renderChart",
        arguments: { component: config.component, props: config.props }
      })
    ).result
    expect(rendered.isError).not.toBe(true)
    expect(rendered.content[0].text).toContain("<svg")
  })

  it("refuses semantic loss by default and names every dropped feature in lossy output", async () => {
    const spec = {
      ...base,
      transform: [{ filter: "datum.orders > 10" }],
      params: [{ name: "chosen", select: "point" }],
      encoding: { ...base.encoding, shape: { field: "team", type: "nominal" } }
    }
    const strict = await call(spec)
    expect(strict.isError).toBe(true)
    expect(strict.structuredContent.component).toBeUndefined()
    const partial = await call(spec, "lossy")
    expect(partial.isError).not.toBe(true)
    expect(partial.structuredContent).toMatchObject({
      component: "BarChart",
      props: { data: rows }
    })
    for (const path of ["/transform", "/params", "/encoding/shape"]) {
      expect(strict.structuredContent.diagnostics).toContainEqual(
        expect.objectContaining({ path, severity: "error" })
      )
      expect(partial.structuredContent.warnings).toContainEqual(
        expect.stringContaining(path)
      )
    }
    expect(partial.structuredContent.warnings).toContain(
      "Materialize Vega-Lite transforms before import."
    )
  })

  it.each([
    [{ ...base, transform: { filter: "datum.orders > 10" } }, "INVALID_SPEC"],
    [{ ...base, encoding: { x: null } }, "INVALID_SPEC"],
    [{ ...base, width: "container" }, "INVALID_CHART_CONFIG"],
    [{ ...base, data: { url: "sales.csv" } }, "INVALID_CHART_CONFIG"]
  ])(
    "returns actionable diagnostics without a config for invalid input or output",
    async (spec, code) => {
      const response = await call(spec, "lossy")
      expect(response.isError).toBe(true)
      expect(response.structuredContent.props).toBeUndefined()
      expect(response.structuredContent.diagnostics).toContainEqual(
        expect.objectContaining({ code, severity: "error" })
      )
    }
  )
})
