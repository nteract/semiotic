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
  }
)
