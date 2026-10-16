import { describe, expect, it } from "vitest"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"

describe("MCP own-key-safe component and field lookup", () => {
  it("reports unknown components consistently through schema, render, and diagnosis tools", async () => {
    const server = spawnServer(["--profile", "developer"])
    try {
      await initializeServer(server)
      for (const component of [
        "constructor",
        "toString",
        "__proto__",
        "hasOwnProperty"
      ]) {
        for (const name of ["getSchema", "renderChart", "diagnoseConfig"]) {
          const response = await sendRequest(
            server,
            "tools/call",
            {
              name,
              arguments: { component, props: {} }
            },
            `${name}-${component}`
          )
          const text = JSON.stringify(response.result)
          expect(text).toMatch(/Unknown component|UNKNOWN_COMPONENT/)
          expect(text).not.toMatch(
            /not iterable|metadata category|native code|TypeError/
          )
        }
      }
    } finally {
      server.kill()
    }
  }, 20000)

  it("preserves prototype-named data fields in recommendation and summary responses", async () => {
    const server = spawnServer(["--profile", "developer"])
    try {
      await initializeServer(server)
      for (const field of ["constructor", "toString", "__proto__"]) {
        const data = ["A", "B", "A"].map((category, index) => ({
          [field]: category,
          value: index + 1
        }))
        const suggestions = await sendRequest(
          server,
          "tools/call",
          {
            name: "suggestCharts",
            arguments: { data, fieldRoles: { [field]: "category" } }
          },
          `suggest-${field}`
        )
        expect(suggestions.result.isError).not.toBe(true)
        expect(JSON.stringify(suggestions.result)).toContain(
          `"categoryAccessor":"${field}"`
        )
        const summary = await sendRequest(
          server,
          "tools/call",
          {
            name: "interrogateChart",
            arguments: {
              component: "BarChart",
              props: { data, categoryAccessor: field, valueAccessor: "value" }
            }
          },
          `summary-${field}`
        )
        expect(summary.result.isError).not.toBe(true)
        expect(
          summary.result.structuredContent.summary.fields[field]
        ).toMatchObject({
          type: "categorical",
          distinctCount: 2
        })
      }
    } finally {
      server.kill()
    }
  }, 20000)
})
