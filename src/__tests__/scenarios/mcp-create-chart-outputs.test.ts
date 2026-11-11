import { afterEach, describe, expect, it } from "vitest"
import type { ChildProcess } from "node:child_process"
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

async function createChart(env: NodeJS.ProcessEnv = {}) {
  const proc = spawnServer(["--profile", "public"], env)
  processes.push(proc)
  await initializeServer(proc)
  const { result } = await sendRequest(proc, "tools/call", {
    name: "createChart",
    arguments: {
      component: "BarChart",
      data: [
        { region: "North", revenue: 12, owner: "UNENCODED-OWNER-A" },
        { region: "South", revenue: 8, owner: "UNENCODED-OWNER-B" }
      ],
      props: { title: "Revenue by region" }
    }
  })
  return result
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string }

const PNG_SIGNATURE = "89504e470d0a1a0a"

describe("public createChart outputs for hosts without app widgets", () => {
  it("returns a PNG image, React code, and reader grounding beside the widget payload", async () => {
    const result = await createChart()
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent.status).toBe("render-proven")

    const content = result.content as ContentBlock[]
    const image = content.find((block) => block.type === "image")
    expect(image).toMatchObject({ type: "image", mimeType: "image/png" })
    const png = Buffer.from((image as { data: string }).data, "base64")
    expect(png.subarray(0, 8).toString("hex")).toBe(PNG_SIGNATURE)

    const text = content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("\n")
    expect(text).toContain('import { BarChart } from "semiotic/ordinal"')
    expect(text).toContain("data={data}")
    expect(text).toContain("Reading guide")

    expect(result.structuredContent.code).toMatchObject({
      language: "tsx",
      bindings: [{ prop: "data", source: "input-data" }]
    })
    expect(result.structuredContent.config).toMatchObject({
      component: "BarChart",
      props: { title: "Revenue by region" }
    })
    expect(result.structuredContent.config.props.data).toBeUndefined()
    expect(result.structuredContent.grounding).toMatchObject({
      component: "BarChart",
      bounds: { structure: "bounded", sourceRows: "omitted" }
    })
    expect(result.structuredContent.grounding.text).toMatch(/North/)
    expect(result.structuredContent.attachments).toMatchObject({
      image: { included: true, mimeType: "image/png", bytes: png.byteLength },
      code: { included: true },
      grounding: { included: true }
    })

    // The widget still receives its sanitized SVG.
    expect(result._meta.svg).toContain("<svg")
    // Nothing the model reads carries a field the chart does not encode.
    expect(
      JSON.stringify({
        content: result.content,
        structuredContent: result.structuredContent
      })
    ).not.toContain("UNENCODED-OWNER")
  }, 30_000)

  it("still proves the render when the image cannot be produced", async () => {
    const disabled = await createChart({ MCP_CREATE_CHART_IMAGE: "off" })
    expect(disabled.structuredContent.status).toBe("render-proven")
    expect(disabled.structuredContent.attachments.image).toEqual({
      included: false,
      reason: "disabled"
    })
    expect(
      (disabled.content as ContentBlock[]).some(
        (block) => block.type === "image"
      )
    ).toBe(false)

    const failed = await createChart({ MCP_MAX_RASTER_PIXELS: "1" })
    expect(failed.isError).not.toBe(true)
    expect(failed.structuredContent.status).toBe("render-proven")
    expect(failed.structuredContent.attachments).toMatchObject({
      image: { included: false, reason: "conversion-failed" },
      code: { included: true },
      grounding: { included: true }
    })
  }, 30_000)

  it("drops the image, not the result, when it would exceed the response limit", async () => {
    const full = await createChart()
    const fullBytes = Buffer.byteLength(JSON.stringify(full))
    const withoutImage = await createChart({ MCP_CREATE_CHART_IMAGE: "off" })
    const withoutImageBytes = Buffer.byteLength(JSON.stringify(withoutImage))
    expect(fullBytes).toBeGreaterThan(withoutImageBytes + 1000)

    // A limit the image does not fit under, with room for everything else.
    const limit = Math.floor((fullBytes + withoutImageBytes) / 2)
    const capped = await createChart({
      MCP_MAX_WIDGET_OUTPUT_BYTES: String(limit)
    })
    expect(capped.isError).not.toBe(true)
    expect(capped.structuredContent.status).toBe("render-proven")
    expect(capped.structuredContent.attachments).toMatchObject({
      image: { included: false, reason: "output-limit" },
      code: { included: true },
      grounding: { included: true }
    })
    expect(Buffer.byteLength(JSON.stringify(capped))).toBeLessThanOrEqual(limit)

    // The general tool-output limit bounds the same budget.
    const toolCapped = await createChart({
      MCP_MAX_TOOL_OUTPUT_BYTES: String(limit)
    })
    expect(toolCapped.isError).not.toBe(true)
    expect(toolCapped.structuredContent.attachments.image).toEqual({
      included: false,
      reason: "output-limit"
    })
  }, 60_000)
})
