import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const run = promisify(execFile)

describe("docs example integrity", () => {
  it("publishes Atlas examples without private source imports", () => {
    for (const file of ["FlowCircuitExamplePage.tsx", "DependencyXRayExamplePage.tsx", "flow-circuit/CircuitGrammar.tsx", "flow-circuit/CircuitInspector.tsx"]) {
      const source = readFileSync(`docs/src/pages/examples/${file}`, "utf8")
      expect(source).not.toMatch(/src\/components/)
      expect(source).toContain("semiotic/atlas")
    }
  })
  it("keeps examples, routes, source loaders, previews, and architecture profiles aligned", async () => {
    const { stdout } = await run(
      process.execPath,
      ["scripts/check-docs-example-integrity.mjs", "--json"],
      { cwd: process.cwd() }
    )
    const result = JSON.parse(stdout)
    expect(result.ok, result.failures.join("\n")).toBe(true)
    const counts = [
      result.exampleCount,
      result.routeCount,
      result.sourceLoaderCount,
      result.previewCount,
      result.architectureProfileCount
    ]
    expect(counts[0]).toBeGreaterThan(0)
    expect(new Set(counts).size).toBe(1)
  })
})
