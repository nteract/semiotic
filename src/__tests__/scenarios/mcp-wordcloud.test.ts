import fixture from "../../components/wordcloud/wordCloud.fixture.json"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"
import { waitForProcessExit } from "./mcpHttpServerHarness"

describe("portable WordCloud through the shipped MCP server", () => {
  it("accepts authored composite charts while keeping validation and exact-value access gates", async () => {
    const proc = spawnServer(["--profile", "public"])
    try {
      await initializeServer(proc)
      const data = [
        { x: 1, y: 3 },
        { x: 2, y: 5 },
        { x: 4, y: 2 }
      ]
      const props = {
        data,
        fields: ["x", "y"],
        title: "Paired values",
        description: "Three authored observations."
      }
      for (const [patch, allowed] of [
        [{}, true],
        [{ fields: undefined }, false],
        [{ accessibleTable: false }, false]
      ] as const) {
        const { result } = await sendRequest(proc, "tools/call", {
          name: "createChart",
          arguments: {
            component: "ScatterplotMatrix",
            data,
            props: { ...props, ...patch }
          }
        })
        expect(result.isError !== true, JSON.stringify(result)).toBe(allowed)
        expect(result.structuredContent.status).toBe(
          allowed ? "render-proven" : "blocked"
        )
        expect(result.structuredContent.suggestion.selection).toBe("explicit")
      }
    } finally {
      proc.kill("SIGTERM")
      await waitForProcessExit(proc)
    }
  }, 30_000)

  it.each(["public", "developer"])(
    "%s discovers the chart, renders prepared text, and rejects missing or stale geometry",
    async (profile) => {
      const proc = spawnServer(["--profile", profile])
      try {
        await initializeServer(proc)
        const publicProfile = profile === "public"
        const schema = await sendRequest(proc, "tools/call", {
          name: publicProfile ? "getChartSchema" : "getSchema",
          arguments: { component: "WordCloud" }
        })
        expect(schema.result.isError).not.toBe(true)
        expect(JSON.stringify(schema.result)).toContain("maskThreshold")

        const render = (props: Record<string, unknown>) =>
          sendRequest(proc, "tools/call", {
            name: publicProfile ? "createChart" : "renderChart",
            arguments: {
              component: "WordCloud",
              data: fixture.options.data,
              props,
              ...(publicProfile ? {} : { format: "svg" })
            }
          })
        const props = {
          ...fixture.options,
          layout: fixture.layout,
          title: "Three authored terms",
          description: "Care has weight 12, trust 8, and wonder 3."
        }
        const prepared = await render(props)
        expect(
          prepared.result.isError,
          JSON.stringify(prepared.result)
        ).not.toBe(true)
        const output = JSON.stringify(prepared.result)
        expect(output).toContain("care")
        expect(output).toContain("fontFingerprint")
        if (publicProfile) {
          expect(prepared.result.structuredContent.status).toBe("render-proven")
          expect(
            prepared.result.structuredContent.evidenceEnvelope.render.evidence
          ).toMatchObject({
            frameType: "network",
            markCount: 3,
            wordCloud: { placedCount: 3, inputCount: 3 }
          })
        } else {
          const block = prepared.result.content.find(
            (item: { text?: string }) =>
              item.text?.startsWith("Render evidence:\n")
          )
          expect(
            JSON.parse(block.text.slice("Render evidence:\n".length))
          ).toMatchObject({ frameType: "network", markCount: 3 })
        }
        const missing = await render({ ...props, layout: undefined })
        expect(missing.result.isError).toBe(true)
        expect(JSON.stringify(missing.result)).toContain(
          "requires a prepared layout"
        )
        const stale = await render({ ...props, width: props.width + 20 })
        expect(stale.result.isError).toBe(true)
        expect(JSON.stringify(stale.result)).toContain("does not match")
      } finally {
        proc.kill("SIGTERM")
        await waitForProcessExit(proc)
      }
    },
    30_000
  )
})
