import { areaLabelCases, collidingSeries, encodingLossExamples, flatSeriesCases, impliedAggregateAxes, invalidAggregateGroups, malformedAggregateFields, malformedChannelTypes, normalizedArea, nullableMeasures, tickOrientations, temporalExtrema, temporalGroupCases, temporalLossCases, translucentBubbles } from "../fixtures/vegaLiteEncodingLoss"
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

  it("imports UTC axes when the native frame can infer dates", async () => {
    const dateSpec = (x: string | number) => ({ mark: "line", data: { values: [{ x, y: 1 }] }, encoding: {
      x: { field: "x", type: "temporal", scale: { type: "utc" } }, y: { field: "y", type: "quantitative" }
    } })
    const dates = await call(dateSpec("2024-01-01"))
    expect(dates.isError).not.toBe(true)
    expect(dates.structuredContent.props.data).toEqual([{ x: "2024-01-01", y: 1 }])
    expect(dates.structuredContent.props.xScaleType).toBeUndefined()
    const epochs = await call(dateSpec(Date.UTC(2024, 0, 1)))
    expect(epochs.isError).toBe(true)
    expect(epochs.structuredContent.diagnostics).toContainEqual(expect.objectContaining({ path: "/encoding/x/scale/type" }))
  })

  it.each(temporalGroupCases)("groups equivalent date representations for $aggregate", async ({ spec, expected }) => {
    for (const mode of [undefined, "lossy"] as const) {
      const result = await call(spec, mode)
      expect(result.isError).not.toBe(true)
      const { data, xAccessor, yAccessor, colorBy } = result.structuredContent.props
      expect(data.map((row: Record<string, unknown>) => [row[xAccessor], row[colorBy], row[yAccessor]])).toEqual(expected)
    }
  })

  it.each(temporalExtrema)("converts temporal $aggregate to an epoch coordinate", async ({ spec, expected }) => {
    for (const mode of [undefined, "lossy"] as const) {
      const result = await call(spec, mode)
      expect(result.isError).not.toBe(true)
      const { data, xAccessor } = result.structuredContent.props
      expect(data).toEqual([{ v: 1, [xAccessor]: expected }])
    }
  })

  it.each(areaLabelCases)("retains the Vega default linear area geometry for $component", async ({ component, spec }) => {
    const result = await call(spec)
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({ component, props: { curve: "linear" } })
  })

  it.each(areaLabelCases)("renders $component with ordinary object-property names as series", async ({ component, spec }) => {
    const result = await call(spec)
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent.component).toBe(component)
    const render = (await sendRequest(server, "tools/call", {
      name: "renderChart", arguments: { component, props: result.structuredContent.props }
    })).result
    expect(render.isError).not.toBe(true)
    expect(render.content[0].text).toContain("<path")
  })

  it.each(flatSeriesCases)("keeps flat $component observations with coordinates arrays", async ({ component, spec }) => {
    const result = await call(spec)
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent.component).toBe(component)
    const { data, lineDataAccessor } = result.structuredContent.props
    expect(data).toEqual(spec.data.values)
    expect(typeof lineDataAccessor).toBe("string")
    expect(spec.data.values.every(row => !Object.hasOwn(row, lineDataAccessor))).toBe(true)
  })

  it("sums numeric strings under an implied quantitative type while preserving nominal IDs", async () => {
    for (const mode of [undefined, "lossy"] as const) {
      const result = await call({ mark: "tick", ...impliedAggregateAxes }, mode)
      expect(result.isError).not.toBe(true)
      const { data, valueAccessor } = result.structuredContent.props
      expect(data).toEqual([{ team: "01", [valueAccessor]: 5 }, { team: "1", [valueAccessor]: 4 }])
    }
  })

  it("preserves the normalized y stack independently of the x stack", async () => {
    const result = await call(normalizedArea)
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({ component: "StackedAreaChart", props: { areaBy: "team", normalize: true } })
  })

  it.each(tickOrientations)("preserves the $orientation tick axes", async ({ spec, orientation }) => {
    const result = await call(spec)
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({ component: "DotPlot", props: {
      orientation, categoryAccessor: "team", valueAccessor: "orders"
    } })
  })

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

  it("converts sized points to translucent bubbles", async () => {
    const result = await call(translucentBubbles)
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({ component: "BubbleChart", props: { bubbleOpacity: 0.25 } })
  })

  it.each([...malformedAggregateFields, ...malformedChannelTypes])("returns a structured error for malformed $path", async ({ spec, path }) => {
    for (const mode of [undefined, "lossy"] as const) {
      const result = await call(spec, mode)
      expect(result.isError).toBe(true)
      expect(result.structuredContent.diagnostics).toContainEqual(expect.objectContaining({ path }))
    }
  })

  it.each([...encodingLossExamples, ...temporalLossCases, ...collidingSeries, ...nullableMeasures, ...invalidAggregateGroups])("exposes $path on a $spec.mark over MCP", async ({ spec, path }) => {
    const strict = await call(spec)
    expect(strict.isError).toBe(true)
    expect(strict.structuredContent.diagnostics).toContainEqual(expect.objectContaining({ path }))
    const lossy = await call(spec, "lossy")
    expect(lossy.structuredContent.warnings).toContainEqual(expect.stringContaining(path))
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

  it("refuses independent arc positions and nested coordinate fields over MCP", async () => {
    const positioned = { mark: "arc", data: { values: rows }, encoding: {
      theta: { field: "orders", type: "quantitative" }, color: { field: "team", type: "nominal" },
      x: { field: "orders", type: "quantitative" }, y: { field: "orders", type: "quantitative" }
    } }
    const nested = { mark: "point", data: { values: [{ metrics: { x: 4, y: 7 } }] }, encoding: {
      x: { field: "metrics.x", type: "quantitative" }, y: { field: "metrics.y", type: "quantitative" }
    } }
    for (const [spec, paths] of [[positioned, ["/encoding/x", "/encoding/y"]], [nested, ["/encoding/x/field", "/encoding/y/field"]]] as const) {
      const strict = await call(spec)
      expect(strict.isError).toBe(true)
      const lossy = await call(spec, "lossy")
      for (const path of paths) {
        expect(strict.structuredContent.diagnostics).toContainEqual(expect.objectContaining({ path }))
        expect(lossy.structuredContent.warnings).toContainEqual(expect.stringContaining(path))
      }
    }
  })

  it("returns independent area series when stacking is explicitly disabled", async () => {
    const spec = {
      mark: "area",
      data: { values: [{ x: 1, y: 4, series: "A" }, { x: 1, y: 3, series: "B" }] },
      encoding: {
        x: { type: "quantitative", field: "x" },
        y: { type: "quantitative", field: "y", stack: null },
        color: { type: "nominal", field: "series" }
      }
    }
    const result = await call(spec)
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({
      component: "AreaChart",
      props: { data: spec.data.values, areaBy: "series", colorBy: "series" }
    })
    expect(result.structuredContent.warnings).toBeUndefined()
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
