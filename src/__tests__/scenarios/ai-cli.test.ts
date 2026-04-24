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

function runCLI(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
  })
}

describe("semiotic-ai CLI", () => {
  it("--list prints component categories and renderability", () => {
    const result = runCLI(["--list"])

    expect(result.status).toBe(0)
    // Assert the header shape, not the exact counts — otherwise this test
    // has to be edited every time a chart is added or removed, even though
    // the CLI's output contract hasn't changed.
    const header = result.stdout.match(/Semiotic components \((\d+) total, (\d+) renderable\)/)
    expect(header).not.toBeNull()
    const [, total, renderable] = header!
    expect(Number(total)).toBeGreaterThan(Number(renderable))
    expect(Number(renderable)).toBeGreaterThan(0)
    // Sample a few representative entries across categories so a regression
    // in category wiring or renderability flagging still fails loudly.
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

    // Invariants, not pinned counts — `renderable + browserOnly === total`
    // is the actual contract. Pinning exact numbers makes every chart
    // addition a mandatory test edit.
    expect(index.totalComponents).toBeGreaterThan(0)
    expect(index.renderableComponents).toBeGreaterThan(0)
    expect(index.browserOnlyComponents).toBeGreaterThanOrEqual(0)
    expect(index.renderableComponents + index.browserOnlyComponents).toBe(index.totalComponents)
    expect(index.components).toHaveLength(index.totalComponents)
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

  it("--doctor falls back to schema-only validation when dist is unavailable", () => {
    const result = runCLI(
      ["--doctor", JSON.stringify({ component: "GaugeChart", props: { value: 72 } })],
      { SEMIOTIC_AI_SCHEMA_ONLY: "1" }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("GaugeChart: schema-only validation passed")
  })

  it("--doctor schema-only fallback reports missing required props", () => {
    const result = runCLI(
      ["--doctor", JSON.stringify({ component: "GaugeChart", props: {} })],
      { SEMIOTIC_AI_SCHEMA_ONLY: "1" }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("GaugeChart: schema-only validation failed")
    expect(result.stdout).toContain('"value" is required for GaugeChart')
  })

  it("--suggest recommends charts from sample data", () => {
    const result = runCLI([
      "--suggest",
      JSON.stringify({
        intent: "comparison",
        data: [
          { category: "A", value: 10 },
          { category: "B", value: 20 },
        ],
      }),
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("BarChart")
    expect(result.stdout).toContain("categoryAccessor")
    expect(result.stdout).toContain("valueAccessor")
  })

  it("--suggest rejects invalid input", () => {
    const result = runCLI(["--suggest", JSON.stringify({ data: [] })])

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("Pass { data:")
  })
})
