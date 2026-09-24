// @vitest-environment node
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  loadArchitectureProfilePaths,
  validateExamplePreviews
} from "./check-docs-example-integrity.mjs"

const run = promisify(execFile)

describe("docs example integrity", () => {
  it("rejects a missing explicit architecture profile before prerendering", async () => {
    const directory = mkdtempSync(join(tmpdir(), "semiotic-profile-check-"))
    const file = join(directory, "architecture.mjs")
    try {
      writeFileSync(
        file,
        `
        const EXAMPLE_DEFINITIONS = [{id: "present"}, {id: "missing"}]
        const profiles = new Map([["present", {path: "/examples/present"}]])
        export const SEMIOTIC_EXAMPLE_PROFILES = EXAMPLE_DEFINITIONS.map((definition) => {
          const profile = profiles.get(definition.id)
          if (!profile) throw new Error("Missing profile: " + definition.id)
          return profile
        })
      `
      )
      await expect(loadArchitectureProfilePaths(file)).rejects.toThrow(
        "Missing profile: missing"
      )
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it("accepts distinct preview keys for each example", () => {
    expect(
      validateExamplePreviews(
        [
          { path: "/examples/atlas-acceptance", preview: "atlas-acceptance" },
          { path: "/examples/dependency-xray", preview: "dependency-xray" }
        ],
        new Set(["atlas-acceptance", "dependency-xray"])
      )
    ).toEqual([])
  })

  it("rejects reused and unused preview keys even when registry counts match", () => {
    expect(
      validateExamplePreviews(
        [
          { path: "/examples/atlas-acceptance", preview: "dependency-xray" },
          { path: "/examples/dependency-xray", preview: "dependency-xray" }
        ],
        new Set(["atlas-acceptance", "dependency-xray"])
      )
    ).toEqual([
      'Examples /examples/atlas-acceptance and /examples/dependency-xray share preview key "dependency-xray"; register a distinct key for each example (renderer components may be shared)',
      'Preview renderer "atlas-acceptance" has no example in the manifest'
    ])
  })

  it("rejects a preview key without a registered renderer", () => {
    expect(
      validateExamplePreviews(
        [{ path: "/examples/atlas-acceptance", preview: "atlas-acceptance" }],
        new Set()
      )
    ).toEqual([
      'Example /examples/atlas-acceptance has no explicit preview renderer for "atlas-acceptance"'
    ])
  })

  it("rejects a renderer without an example", () => {
    expect(validateExamplePreviews([], new Set(["atlas-acceptance"]))).toEqual([
      'Preview renderer "atlas-acceptance" has no example in the manifest'
    ])
  })

  it("publishes Atlas examples without private source imports", () => {
    for (const file of [
      "FlowCircuitExamplePage.tsx",
      "DependencyXRayExamplePage.tsx",
      "flow-circuit/CircuitGrammar.tsx",
      "flow-circuit/CircuitInspector.tsx"
    ]) {
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
