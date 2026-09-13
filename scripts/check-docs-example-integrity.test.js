import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"
import { resolve } from "node:path"
import { isAtlasSourcePreviewImport } from "./network-atlas/source-previews.mjs"

const run = promisify(execFile)

describe("docs example integrity", () => {
  it("limits atlas source previews to named page/module pairs until NA5", () => {
    const root = process.cwd()
    const page = resolve(
      root,
      "docs/src/pages/examples/FlowCircuitExamplePage.tsx"
    )
    const allowed = "../../../../src/components/recipes/atlas/FlowCircuitChart"
    expect(isAtlasSourcePreviewImport(root, page, allowed)).toBe(true)
    expect(
      isAtlasSourcePreviewImport(
        root,
        page,
        "../../../../src/components/stream/physics/StreamPhysicsFrame"
      )
    ).toBe(false)
    expect(
      isAtlasSourcePreviewImport(
        root,
        page,
        "../../../../src/components/recipes/atlas/dependencyForest"
      )
    ).toBe(false)
    expect(
      isAtlasSourcePreviewImport(
        root,
        resolve(root, "docs/src/pages/examples/OtherPage.tsx"),
        allowed
      )
    ).toBe(false)
    expect(
      isAtlasSourcePreviewImport(
        root,
        page,
        "../../../../../src/components/recipes/atlas/FlowCircuitChart"
      )
    ).toBe(false)
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
