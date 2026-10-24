import type { ChildProcess } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"
import { waitForProcessExit } from "./mcpHttpServerHarness"

const observer = path.resolve(
  __dirname,
  "../../../ai/__fixtures__/mcp-stage-trace.cjs"
)
const props = {
  nodes: Array.from({ length: 80 }, (_, id) => ({ id: `node${id}` })),
  edges: Array.from({ length: 79 }, (_, id) => ({
    source: `node${id}`,
    target: `node${id + 1}`,
    value: 1
  })),
  iterations: 1_000_000,
  width: 300,
  height: 200
}
const swarmData = Array.from({ length: 9000 }, (_, index) => ({
  group: "A",
  value: 1 + (index % 3) * 0.0001
}))

describe("shipped MCP cancellation identities", () => {
  let proc: ChildProcess | undefined
  let directory: string | undefined
  afterEach(async () => {
    proc?.kill("SIGTERM")
    if (proc) await waitForProcessExit(proc)
    if (directory) rmSync(directory, { recursive: true, force: true })
    proc = undefined
    directory = undefined
  })

  for (const profile of ["developer", "public"] as const) {
    it.each([0, "", 7, "7"])(
      `cancels ${profile} renderer work for request ID %j`,
      async (id) => {
        directory = mkdtempSync(path.join(tmpdir(), "mcp-cancel-id-"))
        const trace = path.join(directory, "stages.jsonl")
        writeFileSync(trace, "")
        proc = spawnServer([`--profile=${profile}`], {
          MCP_MAX_CONCURRENT_OPERATIONS: "1",
          MCP_MAX_RENDER_WORK_MS: "10000",
          MCP_MAX_OPERATION_MS: "15000",
          NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(observer)}`,
          SEMIOTIC_TEST_STAGE_TRACE: trace
        })
        await initializeServer(proc)
        proc.stdin!.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            method: "tools/call",
            params:
              profile === "public"
                ? {
                    name: "createChart",
                    arguments: {
                      data: swarmData.slice(0, 100),
                      component: "SwarmPlot",
                      props: { data: swarmData, width: 300, height: 200 }
                    }
                  }
                : {
                    name: "renderChart",
                    arguments: { component: "ForceDirectedGraph", props }
                  }
          }) + "\n"
        )
        await vi.waitFor(
          () => {
            const stages = readFileSync(trace, "utf8")
              .trim()
              .split("\n")
              .filter(Boolean)
              .map((line) => JSON.parse(line) as { pid: number; label: string })
            expect(
              stages.some(
                (stage) =>
                  stage.pid !== proc!.pid && stage.label === "render work"
              )
            ).toBe(true)
          },
          { timeout: 5000 }
        )
        const name = profile === "public" ? "getChartSchema" : "getSchema"
        const args = { name, arguments: { component: "BarChart" } }
        const busy = await sendRequest(
          proc,
          "tools/call",
          args,
          "before-cancel"
        )
        expect(busy.result.structuredContent.code).toBe("MCP_OPERATION_BUSY")
        proc.stdin!.write(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/cancelled",
            params: { requestId: id }
          }) + "\n"
        )
        let attempt = 0
        await vi.waitFor(
          async () => {
            const recovered = await sendRequest(
              proc!,
              "tools/call",
              args,
              `after-cancel-${attempt++}`
            )
            expect(recovered.result.isError).not.toBe(true)
            expect(recovered.result.structuredContent.status).toBe(
              "component-schema"
            )
          },
          { timeout: 4000, interval: 50 }
        )
        const reused = await sendRequest(proc, "tools/list", {}, id)
        expect(reused.id).toBe(id)
        expect(reused.result.tools).toHaveLength(profile === "public" ? 5 : 24)
      },
      15_000
    )
  }
})
