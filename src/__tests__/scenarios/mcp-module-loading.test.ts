import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"
import { waitForProcessExit } from "./mcpHttpServerHarness"

const observer = path.resolve(
  __dirname,
  "../../../ai/__fixtures__/mcp-module-load-trace.cjs"
)
const props = {
  data: [{ category: "A", value: 2 }],
  categoryAccessor: "category",
  valueAccessor: "value"
}

describe("MCP optional rendering dependencies", () => {
  it.each(["developer", "public"])(
    "loads the DOM only in the %s widget operation, never in the protocol process",
    async (profile) => {
      const directory = mkdtempSync(path.join(tmpdir(), "mcp-module-loading-"))
      const trace = path.join(directory, "jsdom-pids")
      writeFileSync(trace, "")
      const server = spawnServer(["--profile", profile], {
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(observer)}`,
        SEMIOTIC_TEST_MODULE_TRACE: trace
      })
      try {
        await initializeServer(server)
        const schema = await sendRequest(server, "tools/call", {
          name: profile === "public" ? "getChartSchema" : "getSchema",
          arguments: { component: "BarChart" }
        })
        expect(schema.result.isError).not.toBe(true)
        expect(schema.result.content[0].text).toContain("BarChart")
        if (profile === "developer") {
          const rendered = await sendRequest(server, "tools/call", {
            name: "renderChart",
            arguments: { component: "BarChart", props }
          })
          expect(rendered.result.isError).not.toBe(true)
          expect(rendered.result.content[0].text).toContain("<svg")
        }
        expect(readFileSync(trace, "utf8")).toBe("")

        const widget = await sendRequest(server, "tools/call", {
          name: profile === "public" ? "createChart" : "renderInteractiveChart",
          arguments: { component: "BarChart", props, data: props.data }
        })
        expect(widget.result.isError).not.toBe(true)
        expect(widget.result._meta?.svg).toContain("<svg")
        const loadedBy = readFileSync(trace, "utf8")
          .trim()
          .split("\n")
          .map(Number)
        expect(loadedBy.length).toBeGreaterThan(0)
        expect(loadedBy.every((pid) => pid > 0 && pid !== server.pid)).toBe(
          true
        )
      } finally {
        server.kill("SIGTERM")
        await waitForProcessExit(server)
        rmSync(directory, { recursive: true, force: true })
      }
    },
    20_000
  )
})
