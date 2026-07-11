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

function runCLI(args: string[], env: NodeJS.ProcessEnv = {}, input?: string) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
    input,
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
      metadata: {
        category: string
        importPath: string
        renderable: boolean
        usageModes: { static: { dataRequired: boolean }; push: { dataRequired: boolean } }
      }
      behaviorContracts: Array<{ id: string }>
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
    expect(schema.metadata.usageModes.static.dataRequired).toBe(false)
    expect(schema.metadata.usageModes.push.dataRequired).toBe(false)
    expect(schema.behaviorContracts.map((contract) => contract.id)).toContain("rendering.renderchart-static-props")
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

    // A missing required prop is an error — doctor must exit nonzero so CI/agents
    // can gate on it (previously it always exited 0, hiding the failure).
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("GaugeChart: schema-only validation failed")
    expect(result.stdout).toContain('"value" is required for GaugeChart')
  })

  it("--doctor --json emits a stable machine-readable report and exits nonzero on error", () => {
    const bad = runCLI(
      ["--doctor", "--json", JSON.stringify({ component: "GaugeChart", props: {} })],
      { SEMIOTIC_AI_SCHEMA_ONLY: "1" }
    )
    expect(bad.status).toBe(1)
    const report = JSON.parse(bad.stdout) as { component: string; ok: boolean; errors: string[] }
    expect(report.component).toBe("GaugeChart")
    expect(report.ok).toBe(false)
    expect(report.errors.some((e) => e.includes("value"))).toBe(true)

    const good = runCLI(
      ["--doctor", "--json", JSON.stringify({ component: "GaugeChart", props: { value: 72 } })],
      { SEMIOTIC_AI_SCHEMA_ONLY: "1" }
    )
    expect(good.status).toBe(0)
    expect((JSON.parse(good.stdout) as { ok: boolean }).ok).toBe(true)
  })

  it("--doctor includes behavior contracts from structured metadata", () => {
    const result = runCLI(
      ["--doctor", JSON.stringify({
        component: "LineChart",
        props: {
          data: [{ x: 1, y: 2, series: "A" }],
          xAccessor: "x",
          yAccessor: "y",
          colorBy: "series",
        },
      })],
      { SEMIOTIC_AI_SCHEMA_ONLY: "1" }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Behavior contracts:")
    expect(result.stdout).toContain("color.category-precedence")
    expect(result.stdout).toContain("streaming.push-mode-data")
  })

  it("--doctor usageMode=push allows HOC configs that omit data", () => {
    const result = runCLI(
      ["--doctor", JSON.stringify({
        component: "LineChart",
        usageMode: "push",
        props: {
          xAccessor: "x",
          yAccessor: "y",
          colorBy: "series",
        },
      })],
      { SEMIOTIC_AI_SCHEMA_ONLY: "1" }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Usage mode: push")
    expect(result.stdout).toContain("LineChart: schema-only validation passed")
    expect(result.stdout).not.toContain('"data" is required for LineChart')
  })

  it("--doctor static mode still requires data for HOC configs", () => {
    const result = runCLI(
      ["--doctor", JSON.stringify({
        component: "LineChart",
        props: {
          xAccessor: "x",
          yAccessor: "y",
        },
      })],
      { SEMIOTIC_AI_SCHEMA_ONLY: "1" }
    )

    // Static mode requires data; its absence is an error, so doctor exits nonzero.
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("LineChart: schema-only validation failed")
    expect(result.stdout).toContain('"data" is required for LineChart')
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
    expect(result.stdout).toContain("data={data}")
    expect(result.stdout).toContain("categoryAccessor")
    expect(result.stdout).toContain("valueAccessor")
    expect(result.stdout).toContain("semiotic/themes")
  })

  it("--suggest reads JSON from stdin", () => {
    const result = runCLI(
      ["--suggest"],
      {},
      JSON.stringify({
        intent: "comparison",
        data: [{ category: "A", value: 10 }],
      })
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("BarChart")
  })

  it("--suggest escapes unusual JSON field names in TSX snippets", () => {
    const categoryKey = 'cat"egory'
    const valueKey = "value\\amount"
    const result = runCLI([
      "--suggest",
      JSON.stringify({
        intent: "comparison",
        data: [
          { [categoryKey]: "A", [valueKey]: 10 },
          { [categoryKey]: "B", [valueKey]: 20 },
        ],
      }),
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain(`categoryAccessor=${JSON.stringify(categoryKey)}`)
    expect(result.stdout).toContain(`valueAccessor=${JSON.stringify(valueKey)}`)
  })

  it("--suggest rejects oversized samples", () => {
    const result = runCLI([
      "--suggest",
      JSON.stringify({
        data: Array.from({ length: 6 }, (_, i) => ({ category: `C${i}`, value: i })),
      }),
    ])

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("Pass 1-5 sample data objects")
  })

  it("--suggest makes network recommendations copy-pasteable", () => {
    const result = runCLI([
      "--suggest",
      JSON.stringify({
        intent: "network",
        data: [
          { source: "A", target: "B", value: 3 },
          { source: "B", target: "C", value: 2 },
        ],
      }),
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("ForceDirectedGraph")
    expect(result.stdout).toContain("const nodes =")
    expect(result.stdout).toContain("nodes={nodes}")
    expect(result.stdout).not.toContain("auto-inferred")
  })

  it("--suggest points hierarchy charts at the provided root sample", () => {
    const result = runCLI([
      "--suggest",
      JSON.stringify({
        intent: "hierarchy",
        data: [
          {
            name: "root",
            children: [{ name: "leaf", value: 10 }],
          },
        ],
      }),
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Treemap")
    expect(result.stdout).toContain("data={data[0]}")
    expect(result.stdout).not.toContain("rootObject")
  })

  it("--suggest only recommends heatmaps for two dimensions plus a value", () => {
    const relationship = runCLI([
      "--suggest",
      JSON.stringify({
        intent: "relationship",
        data: [
          { x: 1, y: 2, group: "A" },
          { x: 2, y: 4, group: "B" },
        ],
      }),
    ])

    expect(relationship.status).toBe(0)
    expect(relationship.stdout).toContain("Scatterplot")
    expect(relationship.stdout).not.toContain("Heatmap")

    const heatmap = runCLI([
      "--suggest",
      JSON.stringify({
        intent: "relationship",
        data: [
          { region: "West", quarter: "Q1", sales: 10 },
          { region: "West", quarter: "Q2", sales: 15 },
        ],
      }),
    ])

    expect(heatmap.status).toBe(0)
    expect(heatmap.stdout).toContain("Heatmap")
    expect(heatmap.stdout).toContain('xAccessor="region"')
    expect(heatmap.stdout).toContain('yAccessor="quarter"')
    expect(heatmap.stdout).toContain('valueAccessor="sales"')
  })

  it("--suggest rejects invalid input", () => {
    const result = runCLI(["--suggest", JSON.stringify({ data: [] })])

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("Pass { data:")
  })

  it("--suggest reports invalid JSON parse errors", () => {
    const result = runCLI(["--suggest", "{not json"])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Failed to parse input:")
  })
})
