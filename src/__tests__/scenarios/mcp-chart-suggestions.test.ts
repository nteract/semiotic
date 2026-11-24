import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { ChildProcess } from "node:child_process"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"

describe("chart suggestions over MCP", () => {
  let proc: ChildProcess

  beforeEach(async () => {
    proc = spawnServer()
    await initializeServer(proc)
  })

  afterEach(() => { proc.kill("SIGTERM") })

  it("suggestChart returns recommendations for tabular data", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "suggestChart",
      arguments: {
        data: [
          { category: "A", value: 10 },
          { category: "B", value: 20 },
          { category: "C", value: 30 },
        ],
      },
    }, "suggest-1")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("BarChart")
    expect(result.result.structuredContent.ok).toBe(true)
    expect(result.result.structuredContent.suggestions[0].component).toBe("BarChart")
  })

  it("keeps GauntletChart suggestions grounded in the input property IDs", async () => {
    const recommend = async (data: Record<string, unknown>[]) => {
      const { result } = await sendRequest(proc, "tools/call", {
        name: "suggestCharts", arguments: { data, allow: ["GauntletChart"] }
      })
      expect(result.isError).not.toBe(true)
      return result.structuredContent.suggestions
    }
    expect(await recommend([{ id: "A", cost: 4 }])).toEqual([])
    const [suggestion] = await recommend([{ id: "A", negatives: ["delay", "delay"] }, { id: "B" }])
    expect(suggestion.props).toMatchObject({
      negativeProperties: [{ id: "delay" }], positiveProperties: [],
      data: [{ id: "A", negatives: ["delay", "delay"] }, { id: "B", positives: [], negatives: [] }]
    })
  })

  it("suggestChart with empty data returns error", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "suggestChart",
      arguments: { data: [] },
    }, "suggest-err")

    expect(result.result.isError).toBe(true)
  })

  it("suggestChart accepts the broader suggestCharts intent vocabulary", async () => {
    // "compare-categories" is part of the suggestCharts (plural) 13-intent
    // taxonomy. It used to be hard-rejected by suggestChart's zod enum; now it
    // is translated into this engine's space rather than erroring.
    const result = await sendRequest(proc, "tools/call", {
      name: "suggestChart",
      arguments: {
        data: [{ category: "A", value: 10 }, { category: "B", value: 20 }],
        intent: "compare-categories",
      },
    }, "suggest-vocab")

    expect(result.result.isError).toBeFalsy()
    expect(result.result.structuredContent.ok).toBe(true)
  })
})
