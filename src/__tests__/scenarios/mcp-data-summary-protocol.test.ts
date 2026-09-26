import { describe, expect, it } from "vitest"
import { initializeServer, sendRequest, SERVER_DEPS_READY, spawnServer } from "./mcpStdioHarness"

describe.skipIf(!SERVER_DEPS_READY)("MCP dataset summary semantics", () => {
  it("discloses exclusions and preserves categories and UTC dates in structured and text responses", async () => {
    const server = spawnServer(["--profile", "developer"], { TZ: "America/Los_Angeles" })
    try {
      await initializeServer(server)
      const response = await sendRequest(server, "tools/call", {
        name: "interrogateChart",
        arguments: {
          component: "LineChart",
          props: {
            data: [
              { mixed: "1", zip: "02134", value: ".5", time: "2020-01-01" },
              { mixed: "A", zip: "02135", value: "+5", time: "2020-01-01T00:00:00" },
              { mixed: "B", zip: "02136", value: "bad", time: "2019-12-31T16:00:00-08:00" },
              { mixed: "C", zip: "02137", value: null, time: "2020/01/01" }
            ]
          }
        }
      }, "summary")
      expect(response.result.isError).not.toBe(true)
      const summary = response.result.structuredContent.summary
      expect(summary.fields).toMatchObject({
        mixed: { type: "categorical", distinctCount: 4 },
        zip: { type: "categorical", distinctValues: ["02134", "02135", "02136", "02137"] },
        value: { type: "numeric", min: 0.5, max: 5, mean: 2.75, median: 2.75, observedCount: 3, missingCount: 1, excludedCount: 1 },
        time: { type: "date", min: "2020-01-01T00:00:00.000Z", max: "2020-01-01T00:00:00.000Z", excludedCount: 1 }
      })
      const text = response.result.content[0].text
      expect(JSON.parse(text.slice(text.indexOf("\n") + 1))).toEqual(summary)
      const empty = await sendRequest(server, "tools/call", {
        name: "interrogateChart", arguments: { component: "LineChart", props: { data: [] } }
      }, "empty")
      expect(empty.result.structuredContent.summary).toEqual({ rowCount: 0, fields: {}, sample: [] })
    } finally {
      server.kill()
    }
  }, 20000)
})
