import type { ChildProcess } from "child_process"
import {
  spawnServer,
  sendRequest,
  initializeServer
} from "./mcpStdioHarness"

describe(
  "MCP stream recommendation round-trip",
  () => {
    let proc: ChildProcess
    beforeEach(async () => {
      proc = spawnServer()
      await initializeServer(proc)
    })
    afterEach(() => {
      proc.kill("SIGTERM")
    })

    it("recommends stream panels using numeric time roles through MCP", async () => {
      const schema = {
        fields: [
          { name: "timestamp", kind: "numeric", role: "x" },
          { name: "latency", kind: "numeric" }
        ],
        throughput: 10
      }
      const ranked = await sendRequest(
        proc,
        "tools/call",
        {
          name: "suggestStreamCharts",
          arguments: { schema, intent: "trend" }
        },
        "stream-ranking"
      )
      expect(ranked.result.isError).not.toBe(true)
      expect(ranked.result.structuredContent.suggestions[0]).toMatchObject({
        component: "RealtimeLineChart",
        props: { timeAccessor: "timestamp", valueAccessor: "latency" }
      })
      const dashboard = await sendRequest(
        proc,
        "tools/call",
        {
          name: "suggestStreamDashboard",
          arguments: { schemas: [schema], intent: "trend", budget: 1 }
        },
        "stream-dashboard"
      )
      expect(dashboard.result.isError).not.toBe(true)
      expect(dashboard.result.structuredContent.panels).toHaveLength(1)
      expect(dashboard.result.structuredContent.panels[0]).toMatchObject({
        schemaIndex: 0,
        intent: "trend",
        suggestion: { props: { valueAccessor: "latency" } }
      })
    })

    it("keeps field hints and reports the inferred ranking intents", async () => {
      const ranked = await sendRequest(
        proc,
        "tools/call",
        {
          name: "suggestStreamCharts",
          arguments: {
            schema: {
              fields: [
                { name: "ts", kind: "date" },
                { name: "price", kind: "numeric", additive: false },
                { name: "brand", kind: "categorical", cardinality: 400 }
              ]
            }
          }
        },
        "stream-hints"
      )
      expect(ranked.result.isError).not.toBe(true)
      const content = ranked.result.structuredContent
      expect(content.rankingIntents[0]).toBe("trend")
      expect(content.warnings).toEqual([])
      const excluded = Object.fromEntries(
        content.excluded.map((e: { component: string; reason: string }) => [
          e.component,
          e.reason
        ])
      )
      expect(excluded.PieChart).toMatch(/400 slices/)
      expect(excluded.RealtimeWaterfallChart).toMatch(/non-additive/)
      expect(ranked.result.content[0].text).toMatch(/inferred intents: trend/)
    })

    const tools = [
      { name: "suggestStreamCharts", input: "schema", multiple: false },
      { name: "suggestStreamDashboard", input: "schemas", multiple: false },
      { name: "suggestStreamDashboard", input: "schemas", multiple: true }
    ]

    it.each(tools)("$name reports unknown schema and field keys (array: $multiple)", async ({ name, input, multiple }) => {
      const schema = {
        fields: [
          { name: "time", kind: "date" },
          { name: "amount", kind: "numeric", additive: true },
          { name: "brand", kind: "categorical", cardinalty: 4 }
        ],
        throughpu: 10
      }
      const response = await sendRequest(proc, "tools/call", {
        name,
        arguments: { [input]: multiple ? [schema] : schema }
      })
      expect(response.result.isError).not.toBe(true)
      const warnings = response.result.structuredContent.warnings.join("\n")
      expect(warnings).toContain('unknown schema key "throughpu"')
      expect(warnings).toContain('did you mean "throughput"?')
      expect(warnings).toContain('field "brand" has unknown key "cardinalty"')
      expect(warnings).toContain('did you mean "cardinality"?')
      expect(response.result.content[0].text).toContain("throughpu")
      expect(response.result.content[0].text).toContain("cardinalty")
    })

    it.each(tools)("$name still validates recognized schema fields (array: $multiple)", async ({ name, input, multiple }) => {
      const field = { name: "amount", kind: "numeric" }
      for (const schema of [
        { fields: [{ ...field, kind: "number" }] },
        { fields: [{ ...field, role: "measure" }] },
        { fields: [{ ...field, cardinality: -1 }] },
        { fields: [{ ...field, additive: "false" }] },
        { fields: [field], throughput: "fast" },
        { fields: [field], retention: "forever" }
      ]) {
        const response = await sendRequest(proc, "tools/call", {
          name,
          arguments: { [input]: multiple ? [schema] : schema }
        })
        expect(response.result.isError).toBe(true)
      }
    })
  }
)
