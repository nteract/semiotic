import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"

describe("developer MCP chart critique", () => {
  let server: ReturnType<typeof spawnServer>
  beforeAll(async () => {
    server = spawnServer(["--profile", "developer"])
    await initializeServer(server)
  })
  afterAll(() => server?.kill())

  const data = [
    { month: "2025-01-01", sales: 12 },
    { month: "2025-02-01", sales: 18 },
    { month: "2025-03-01", sales: 15 }
  ]
  const props = { data, xAccessor: "month", yAccessor: "sales", title: "Sales over time" }

  async function critique(component: string, config: Record<string, unknown>, intent?: string) {
    const { result } = await sendRequest(server, "tools/call", {
      name: "critiqueChart", arguments: { component, props: config, intent }
    }, component + (intent ?? ""))
    expect(result.content[0].text).toBe(result.structuredContent.narrative)
    expect(result.structuredContent.renderEvidence).toBeNull()
    return result
  }

  it("reports misleading encodings separately from validity and uses the requested intent", async () => {
    const result = await critique("LineChart", { ...props, curve: "basis" }, "trend")
    expect(result.isError).not.toBe(true)
    const report = result.structuredContent
    expect(report).toMatchObject({ configurationValid: true, intent: "trend", fit: { status: "ok" } })
    expect(report.fit.intentScores.trend).toEqual(expect.any(Number))
    expect(report.findings).toContainEqual(expect.objectContaining({ code: "NON_PASSING_CURVE", stage: "deception" }))
    expect(report.findings.map((f: { rank: number }) => f.rank)).toEqual(report.findings.map((_: unknown, i: number) => i + 1))
    expect(report.narrative).toMatch(/requested intent: trend/i)
    const other = await critique("LineChart", props, "distribution")
    expect(other.structuredContent.fit.score).toBe(0)
    expect(other.structuredContent.findings).toContainEqual(expect.objectContaining({ stage: "fit", code: "INTENT_UNSUPPORTED" }))
  })

  it("reports missing intent and invalid input without claiming a rendering result", async () => {
    const good = await critique("LineChart", props)
    expect(good.structuredContent.intent).toBeNull()
    expect(good.structuredContent.narrative).toMatch(/no analytical intent was supplied/i)
    const unknown = await critique("NotAChart", { data })
    expect(unknown.isError).toBe(true)
    expect(unknown.structuredContent).toMatchObject({ configurationValid: false, fit: { status: "unavailable" } })
    expect(unknown.structuredContent.findings).toContainEqual(expect.objectContaining({ code: "VALIDATION", severity: "error" }))
  })

  it("explains unregistered intents and distinguishes capability rejection from invalid props", async () => {
    const unknownIntent = await critique("LineChart", props, "unregistered-intent")
    expect(unknownIntent.structuredContent.fit).toMatchObject({ status: "unavailable", reason: expect.stringContaining("unregistered-intent") })
    const stacked = await critique("StackedBarChart", {
      data: [{ product: "Widget", units: 30 }, { product: "Gadget", units: 50 }, { product: "Spindle", units: 15 }],
      categoryAccessor: "product", valueAccessor: "units", stackBy: "product"
    }, "compare-categories")
    expect(stacked.structuredContent).toMatchObject({ configurationValid: true, fit: { status: "rejected" } })
    expect(stacked.structuredContent.findings).toContainEqual(expect.objectContaining({ stage: "fit", code: "FIT_REJECTED", severity: "warning" }))
  })

  it("scores inline choropleth features and keeps unresolved references unavailable", async () => {
    const areas = [1, 2].map((value) => ({
      type: "Feature", properties: { value },
      geometry: { type: "Polygon", coordinates: [[[value, 0], [value, 1], [value + 1, 0], [value, 0]]] }
    }))
    const inline = await critique("ChoroplethMap", { areas, valueAccessor: "value" }, "geo")
    expect(inline.structuredContent).toMatchObject({ configurationValid: true, fit: { status: "ok" } })
    const reference = await critique("ChoroplethMap", { areas: "world", valueAccessor: "value" }, "geo")
    expect(reference.structuredContent.fit.status).toBe("unavailable")
  })

  const points = [
    { id: "a", lon: 0, lat: 0, cost: 1, value: 5 },
    { id: "b", lon: 2, lat: 3, cost: 4, value: 7 }
  ]

  it.each([
    ["ProportionalSymbolMap", { sizeBy: "value" }],
    ["DistanceCartogram", { center: "a", costAccessor: "cost" }]
  ] as const)("scores %s from points alone", async (component, options) => {
    const report = await critique(component, { points, ...options }, "geo")
    expect(report.structuredContent).toMatchObject({ configurationValid: true, fit: { status: "ok" } })
  })

  it.each([{}, { areas: [] }])("scores FlowMap's flow nodes independently of its background %j", async background => {
    const report = await critique("FlowMap", {
      ...background, nodes: points, flows: [{ source: "a", target: "b", value: 3 }]
    }, "flow")
    expect(report.structuredContent).toMatchObject({ configurationValid: true, fit: { status: "ok" } })
  })

  it.each(["SankeyDiagram", "ChordDiagram"])("infers %s nodes using the configured endpoint accessors", async component => {
    const edges = [{ from: "a", to: "b", value: 2 }, { from: "b", to: "c", value: 1 }, { from: "a", to: "c", value: 3 }]
    const report = await critique(component, { edges, sourceAccessor: "from", targetAccessor: "to" }, "flow")
    expect(report.structuredContent).toMatchObject({ configurationValid: true, fit: { status: "ok" } })
  })

  it("returns network alternatives and variants whose accessors resolve the authored edges", async () => {
    const edge = { from: "a", to: "b", amount: 3 }
    const props = { edges: [edge], sourceAccessor: "from", targetAccessor: "to", valueAccessor: "amount" }
    const publicServer = spawnServer(["--profile", "public"])
    try {
      await initializeServer(publicServer)
      const improved = await sendRequest(publicServer, "tools/call", {
        name: "improveChart", arguments: { component: "SankeyDiagram", props }
      }, "network-repair-endpoints")
      expect(improved.result.isError, JSON.stringify(improved.result.content)).not.toBe(true)
      const alternative = improved.result.structuredContent.repair.alternatives.find(
        (entry: { component: string }) => entry.component === "ForceDirectedGraph"
      )
      expect(alternative.props).toMatchObject({
        edges: [{ ...edge, source: "a", target: "b", value: 3 }],
        nodes: [{ id: "a" }, { id: "b" }], sourceAccessor: "source", targetAccessor: "target"
      })
    } finally {
      publicServer.kill()
    }
    const second = { from: "b", to: "c", amount: 4 }
    const proposed = await sendRequest(server, "tools/call", {
      name: "proposeChartVariants", arguments: {
        component: "ForceDirectedGraph", intent: "flow",
        props: { ...props, edges: [edge, second], nodeIdAccessor: "code", nodes: ["a", "b", "c"].map(code => ({ code })) }
      }
    }, "network-variant-endpoints")
    expect(proposed.result.isError, JSON.stringify(proposed.result.content)).not.toBe(true)
    expect(proposed.result.structuredContent.proposals).toContainEqual(expect.objectContaining({
      proposal: expect.objectContaining({ baseComponent: "SankeyDiagram" }),
      props: expect.objectContaining({
        nodes: ["a", "b", "c"].map(code => ({ code, id: code })),
        edges: [
          { ...edge, source: "a", target: "b", value: 3 },
          { ...second, source: "b", target: "c", value: 4 }
        ],
        nodeIdAccessor: "id", sourceAccessor: "source", targetAccessor: "target", valueAccessor: "value"
      })
    }))
  })

  it.each(["coordinates", "observations"])("scores the observations in a line's %s array", async key => {
    const report = await critique("LineChart", {
      data: [{ label: "North", [key]: [{ x: 1, y: 10 }, { x: 2, y: 20 }] }],
      ...(key === "coordinates" ? {} : { lineDataAccessor: key }), lineBy: "label"
    }, "trend")
    expect(report.structuredContent).toMatchObject({ configurationValid: true, fit: { status: "ok" } })
  })

  it("scores distinct line objects as series when every observation has the same category", async () => {
    const report = await critique("LineChart", {
      data: [
        { coordinates: [{ x: 1, y: 10, category: "sales" }, { x: 2, y: 20, category: "sales" }] },
        { coordinates: [{ x: 3, y: 30, category: "sales" }, { x: 4, y: 40, category: "sales" }] }
      ]
    }, "compare-series")
    expect(report.structuredContent).toMatchObject({
      configurationValid: true,
      fit: { status: "ok", intentScores: { "compare-series": 4 } }
    })
  })

  it.each(["TreeDiagram", "CirclePack", "Treemap", "OrbitDiagram"])("scores the authored children field for %s", async component => {
    const data = { name: "Root", reports: [{ name: "Team", reports: [
      { name: "One", value: 2 }, { name: "Two", value: 1 }
    ] }] }
    const report = await critique(component, { data, childrenAccessor: "reports" }, "hierarchy")
    expect(report.structuredContent).toMatchObject({ configurationValid: true, fit: { status: "ok" } })
  })

  it("scores ProcessSankey edges with custom time fields", async () => {
    const report = await critique("ProcessSankey", {
      domain: [0, 10], startTimeAccessor: "entered", endTimeAccessor: "left",
      edges: [{ source: "a", target: "b", value: 5, entered: 1, left: 4 }]
    }, "flow")
    expect(report.structuredContent).toMatchObject({ configurationValid: true, fit: { status: "ok" } })
  })

  it("scores timed ProcessSankey edges without a nodes array", async () => {
    const report = await critique("ProcessSankey", {
      domain: [0, 10], edges: [{ source: "a", target: "b", value: 5, startTime: 1, endTime: 4 }]
    }, "flow")
    expect(report.structuredContent).toMatchObject({ configurationValid: true, fit: { status: "ok" } })
  })

  it("scores graph inputs supplied through nodes and edges", async () => {
    const graph = await critique("ForceDirectedGraph", {
      nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }]
    }, "flow")
    expect(graph.structuredContent.fit.status).toBe("ok")
  })
})
