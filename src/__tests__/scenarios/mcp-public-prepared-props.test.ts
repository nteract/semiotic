import { afterEach, expect, it } from "vitest"
import type { ChildProcess } from "node:child_process"
import { atlasStory } from "../../../scripts/network-atlas/stories/atlasStories"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"
import { waitForProcessExit } from "./mcpHttpServerHarness"

const processes: ChildProcess[] = []
afterEach(async () => {
  for (const proc of processes) {
    proc.kill("SIGTERM")
    await waitForProcessExit(proc)
  }
  processes.length = 0
})
async function server(env: NodeJS.ProcessEnv = {}) {
  const proc = spawnServer(["--profile", "public"], env)
  processes.push(proc)
  await initializeServer(proc)
  return proc
}

it.each(["checkout", "supplier", "etl"] as const)(
  "redacts prepared %s artifacts from successful and blocked public suggestions",
  async (id) => {
    const story = atlasStory(id)
    const proc = await server()
    const props = {
      ...story.props,
      title: "Prepared reader",
      description: story.question,
      summary: story.takeaway
    }
    for (const patch of [{}, { width: "invalid" }]) {
      const { result } = await sendRequest(proc, "tools/call", {
        name: "createChart",
        arguments: {
          component: story.component,
          data: [{ category: "Prepared reader", value: 1 }],
          props: { ...props, ...patch }
        }
      })
      expect(result.structuredContent?.status, JSON.stringify(result)).toBe(
        "width" in patch ? "blocked" : "render-proven"
      )
      for (const config of [
        result.structuredContent.props,
        result.structuredContent.suggestion.props
      ]) {
        expect(config).toMatchObject({ title: "Prepared reader" })
        for (const key of ["data", "atlas", "forest", "circuit", "edition"])
          expect(config).not.toHaveProperty(key)
        if (story.component === "FlowCircuitChart")
          expect(config).not.toHaveProperty("reading")
      }
    }
  },
  30_000
)

it("applies the widget byte limit to the final public envelope after rendering succeeds", async () => {
  const args = {
    component: "BarChart",
    data: [
      { category: "A", value: 2 },
      { category: "B", value: 3 }
    ],
    props: { title: "Two categories", description: "Compare their values." }
  }
  const uncapped = await server()
  const { result } = await sendRequest(uncapped, "tools/call", {
    name: "createChart",
    arguments: args
  })
  expect(result.isError).not.toBe(true)
  const inner = {
    ...result,
    structuredContent: result.structuredContent.render
  }
  const innerBytes = Buffer.byteLength(JSON.stringify(inner))
  const finalBytes = Buffer.byteLength(JSON.stringify(result))
  expect(finalBytes).toBeGreaterThan(innerBytes + 1000)
  const limit = Math.floor((innerBytes + finalBytes) / 2)
  const capped = await server({ MCP_MAX_WIDGET_OUTPUT_BYTES: String(limit) })
  const { result: limited } = await sendRequest(capped, "tools/call", {
    name: "createChart",
    arguments: args
  })
  expect(limited).toMatchObject({
    isError: true,
    structuredContent: { code: "OUTPUT_LIMIT_EXCEEDED", maximumBytes: limit }
  })
  expect(limited.structuredContent.observedBytes).toBeGreaterThan(limit)
  expect(JSON.stringify(limited)).not.toContain("Two categories")
}, 30_000)
