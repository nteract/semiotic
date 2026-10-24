import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"
import {
  spawnReadyHTTPServer,
  waitForProcessExit
} from "./mcpHttpServerHarness"

const fixtures = path.resolve(__dirname, "../../../ai/__fixtures__")
const environment = (file: string) => ({
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(path.join(fixtures, "mcp-widget-svg.cjs"))}`,
  SEMIOTIC_TEST_WIDGET_SVG: file
})
const props = {
  data: [
    { region: "North", revenue: 10 },
    { region: "South", revenue: 18 }
  ],
  categoryAccessor: "region",
  valueAccessor: "revenue"
}

describe("shipped widget SVG boundary", () => {
  it.each([
    ["developer", "stdio"],
    ["public", "stdio"],
    ["developer", "http"],
    ["public", "http"]
  ])(
    "sanitizes hostile renderer output through %s over %s",
    async (profile, transport) => {
      const env = environment(path.join(fixtures, "widget-hostile.svg"))
      const args = ["--profile", profile]
      const http =
        transport === "http" ? await spawnReadyHTTPServer(env, args) : null
      const proc = http?.proc ?? spawnServer(args, env)
      const client = new Client({ name: "widget-sanitization", version: "1.0" })
      try {
        const request = {
          name: profile === "public" ? "createChart" : "renderInteractiveChart",
          arguments: { component: "BarChart", props, data: props.data }
        }
        let result
        if (http) {
          await client.connect(
            new StreamableHTTPClientTransport(
              new URL(`http://127.0.0.1:${http.port}/mcp`)
            )
          )
          result = await client.callTool(request)
        } else {
          await initializeServer(proc)
          result = (await sendRequest(proc, "tools/call", request)).result
        }
        expect(result.isError).not.toBe(true)
        const svg = result._meta?.svg as string
        const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
        expect(doc.querySelector("parsererror")).toBeNull()
        expect(doc.querySelector("#revenue")?.getAttribute("aria-label")).toBe(
          "North revenue: 10"
        )
        expect(doc.querySelector("#revenue")?.getAttribute("fill")).toBe(
          "url(#paint)"
        )
        expect(doc.querySelector("#revenue")?.hasAttribute("formaction")).toBe(
          false
        )
        expect(doc.querySelector('use[href="#local-path"]')).not.toBeNull()
        expect(svg).not.toContain("evil.test")
        expect(svg).not.toContain("__widgetExecuted")
        expect(doc.querySelector("foreignObject, script, animate")).toBeNull()
        expect(doc.querySelector("#remote-paint")?.getAttribute("style")).toBe(
          "opacity: 0.5"
        )
      } finally {
        await client.close()
        proc.kill("SIGTERM")
        await waitForProcessExit(proc)
      }
    },
    15_000
  )

  it("returns an explicit tool error for malformed rendered SVG", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "widget-invalid-"))
    const file = path.join(directory, "invalid.svg")
    writeFileSync(file, "<svg>")
    const proc = spawnServer([], environment(file))
    try {
      await initializeServer(proc)
      const response = await sendRequest(proc, "tools/call", {
        name: "renderInteractiveChart",
        arguments: { component: "BarChart", props }
      })
      expect(response.result.isError).toBe(true)
      expect(response.result.content[0].text).toBe(
        "Interactive SVG sanitization failed."
      )
      expect(response.result._meta).toBeUndefined()
    } finally {
      proc.kill("SIGTERM")
      await waitForProcessExit(proc)
      rmSync(directory, { recursive: true, force: true })
    }
  }, 15_000)
})
