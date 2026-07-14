import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"

const run = promisify(execFile)

describe("docs example integrity", () => {
  it("keeps examples, routes, source loaders, previews, and architecture profiles aligned", async () => {
    const { stdout } = await run(
      process.execPath,
      ["scripts/check-docs-example-integrity.mjs", "--json"],
      { cwd: process.cwd() },
    )
    const result = JSON.parse(stdout)
    expect(result.ok, result.failures.join("\n")).toBe(true)
    const counts = [
      result.exampleCount,
      result.routeCount,
      result.sourceLoaderCount,
      result.previewCount,
      result.architectureProfileCount,
    ]
    expect(counts[0]).toBeGreaterThan(0)
    expect(new Set(counts).size).toBe(1)
  })
})
