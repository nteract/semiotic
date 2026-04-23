/**
 * Scenario tests for the packaged semiotic-ai CLI.
 *
 * These paths must work without building dist because they read packaged AI
 * context files directly.
 */
import { spawnSync } from "child_process"
import * as path from "path"
import { describe, expect, it } from "vitest"

const CLI_PATH = path.resolve(__dirname, "../../../ai/cli.js")

function runCLI(args: string[]) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: "utf-8",
  })
}

describe("semiotic-ai CLI", () => {
  it("--list prints component categories and renderability", () => {
    const result = runCLI(["--list"])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Semiotic components (43 total, 38 renderable)")
    expect(result.stdout).toContain("GaugeChart [renderable] import semiotic/ordinal")
    expect(result.stdout).toContain("FlowMap [renderable] import semiotic/geo")
    expect(result.stdout).toContain("RealtimeLineChart [browser-only] import semiotic/realtime")
  })

  it("--list --json prints a machine-readable component index", () => {
    const result = runCLI(["--list", "--json"])

    expect(result.status).toBe(0)
    const index = JSON.parse(result.stdout) as {
      totalComponents: number
      renderableComponents: number
      browserOnlyComponents: number
      components: Array<{
        name: string
        category: string
        importPath: string
        renderable: boolean
      }>
    }

    expect(index.totalComponents).toBe(43)
    expect(index.renderableComponents).toBe(38)
    expect(index.browserOnlyComponents).toBe(5)
    expect(index.components).toContainEqual(
      expect.objectContaining({
        name: "GaugeChart",
        category: "ordinal",
        importPath: "semiotic/ordinal",
        renderable: true,
      })
    )
  })

  it("--schema Component prints one component schema with metadata", () => {
    const result = runCLI(["--schema", "GaugeChart"])

    expect(result.status).toBe(0)
    const schema = JSON.parse(result.stdout) as {
      name: string
      parameters: { required: string[] }
      metadata: { category: string; importPath: string; renderable: boolean }
    }

    expect(schema.name).toBe("GaugeChart")
    expect(schema.parameters.required).toEqual(["value"])
    expect(schema.metadata).toEqual(
      expect.objectContaining({
        category: "ordinal",
        importPath: "semiotic/ordinal",
        renderable: true,
      })
    )
  })

  it("--schema unknown component exits non-zero with available components", () => {
    const result = runCLI(["--schema", "NopeChart"])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Unknown component: NopeChart")
    expect(result.stderr).toContain("LineChart")
    expect(result.stderr).toContain("GaugeChart")
  })
})
