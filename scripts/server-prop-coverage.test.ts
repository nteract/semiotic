import { describe, expect, it } from "vitest"
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import {
  reviewServerPropCoverage,
  schemaPropPaths,
  type ServerPropInventory
} from "./lib/server-prop-coverage"
import type {
  ServerPropContract,
  ServerPropExclusion
} from "../consumer-contracts/server-props"

function inputs() {
  const inventory: ServerPropInventory = {
    Chart: {
      supported: true,
      props: {
        opacity: { runtimeTypes: ["number"], wire: true },
        onClick: { runtimeTypes: ["function"], wire: false },
        format: { runtimeTypes: ["string", "function"], wire: true },
        "frameProps.showAxes": { runtimeTypes: ["boolean"], wire: false }
      }
    }
  }
  const contracts: ServerPropContract[] = [
    {
      id: "opacity",
      component: "Chart",
      props: ["opacity"],
      fixture: "seed",
      observable: "Painted opacity matches the explicit value and default."
    }
  ]
  const exclusions: ServerPropExclusion[] = [
    {
      component: "Chart",
      prop: "onClick",
      status: "runtime-callback-only",
      reason: "Static rendering has no click events."
    }
  ]
  return {
    inventory,
    contracts,
    exclusions,
    legacy: { Chart: ["format", "frameProps.showAxes"] },
    fixtures: new Set(["seed"]),
    assertions: new Set(["opacity"]),
    unsupportedCharts: {} as Record<string, string>
  }
}

describe("server prop coverage metadata", () => {
  it("distinguishes verified behavior, callbacks, and visible legacy gaps", () => {
    const result = reviewServerPropCoverage(inputs())
    expect(result.errors).toEqual([])
    expect(result.rows.map(({ prop, status }) => [prop, status])).toEqual([
      ["opacity", "server-behavior-tested"],
      ["onClick", "runtime-callback-only"],
      ["format", "unclassified"],
      ["frameProps.showAxes", "unclassified"]
    ])
  })
  it("requires classification for a new supported prop, including nested fields", () => {
    const input = inputs()
    input.inventory.Chart.props["frameProps.newSetting"] = {
      runtimeTypes: ["boolean"],
      wire: true
    }
    expect(reviewServerPropCoverage(input).errors).toContain(
      "Chart.frameProps.newSetting: new supported prop needs explicit coverage classification"
    )
  })
  it("does not let a removed tested contract fall back into legacy coverage", () => {
    const input = inputs()
    input.contracts = []
    input.assertions.clear()
    expect(reviewServerPropCoverage(input).errors).toContain(
      "Chart.opacity: new supported prop needs explicit coverage classification"
    )
  })
  it("rejects missing assertions and fixture links", () => {
    const input = inputs()
    input.assertions.clear()
    input.fixtures.clear()
    expect(reviewServerPropCoverage(input).errors).toEqual([
      "contract opacity: missing executable assertion",
      "contract opacity: unknown consumer fixture seed"
    ])
  })
  it("rejects duplicate IDs, duplicate paths, and empty observables", () => {
    const input = inputs()
    input.contracts.push({
      ...input.contracts[0],
      props: ["opacity", "opacity"],
      observable: " "
    })
    expect(reviewServerPropCoverage(input).errors).toEqual([
      "contract opacity: duplicate/empty ID",
      "contract opacity: observable result is required",
      "contract opacity: duplicate prop opacity"
    ])
  })
  it("rejects invented nested paths and stale legacy entries", () => {
    const input = inputs()
    input.contracts[0].props = ["frameProps.typo"]
    input.legacy.Chart.push("removed")
    const errors = reviewServerPropCoverage(input).errors
    expect(errors).toContain(
      "contract opacity: unknown/unsupported path Chart.frameProps.typo"
    )
    expect(errors).toContain("Chart.removed: stale legacy path; remove it")
  })
  it("requires reasons and rejects contradictory exclusions", () => {
    const input = inputs()
    input.exclusions.push({
      component: "Chart",
      prop: "opacity",
      status: "intentionally-client-only",
      reason: " "
    })
    expect(reviewServerPropCoverage(input).errors).toEqual([
      "Chart.opacity: conflicting coverage classifications",
      "Chart.opacity: exclusion needs a reason"
    ])
  })
  it("does not classify a mixed serializable/accessor prop as callback-only", () => {
    const input = inputs()
    input.exclusions.push({
      component: "Chart",
      prop: "format",
      status: "runtime-callback-only",
      reason: "Has a function branch."
    })
    input.legacy.Chart = ["frameProps.showAxes"]
    expect(reviewServerPropCoverage(input).errors).toContain(
      "Chart.format: callback-only exclusion requires a function-only prop; mixed/server values need their own review"
    )
  })
  it("distinguishes an unsupported chart from an excluded prop", () => {
    const input = inputs()
    input.inventory.LiveOnly = {
      supported: false,
      props: { data: { runtimeTypes: ["array"], wire: true } }
    }
    expect(reviewServerPropCoverage(input).errors).toEqual([
      "LiveOnly: unsupported chart needs a chart-level reason"
    ])
    input.unsupportedCharts.LiveOnly =
      "Requires a running stream; no bounded renderer is registered."
    expect(reviewServerPropCoverage(input).errors).toEqual([])
    input.unsupportedCharts.Chart = "Cannot exempt a registered chart."
    expect(reviewServerPropCoverage(input).errors).toContain(
      "Chart: supported chart cannot be excluded as unsupported"
    )
  })
  it("requires legacy gaps to shrink when classification is added", () => {
    const input = inputs()
    input.contracts[0].props = ["opacity", "frameProps.showAxes"]
    expect(reviewServerPropCoverage(input).errors).toContain(
      "Chart.frameProps.showAxes: classified path must leave the legacy inventory"
    )
  })
  it("walks arrays and alternatives without treating an open dictionary as coverage", () => {
    const paths = schemaPropPaths({
      properties: {
        annotations: {
          type: "array",
          items: {
            oneOf: [{ properties: { type: {} } }, { properties: { label: {} } }]
          }
        },
        frameProps: { properties: { showAxes: {} }, additionalProperties: true }
      }
    })
    expect([...paths].sort()).toEqual([
      "annotations",
      "annotations[].label",
      "annotations[].type",
      "frameProps",
      "frameProps.showAxes"
    ])
    expect(() =>
      schemaPropPaths({ properties: { thing: { $ref: "#/missing" } } })
    ).toThrow(/Unresolved schema reference/)
  })
  it("runs the full inventory in a source checkout without dist or browsers", () => {
    const root = resolve(import.meta.dirname, "..")
    const directory = mkdtempSync(resolve(tmpdir(), "semiotic-server-props-"))
    try {
      for (const file of [
        "scripts/check-server-prop-coverage.ts",
        "scripts/check-ssr-alignment.js",
        "scripts/check-consumer-contracts.ts",
        "scripts/lib",
        "consumer-contracts",
        "ai/schema.json",
        "integration-tests/ssr-parity-fixtures.js",
        "src"
      ]) {
        cpSync(resolve(root, file), resolve(directory, file), {
          recursive: true
        })
      }
      // Only installed tools are shared; source references stay in this checkout.
      symlinkSync(
        resolve(root, "node_modules"),
        resolve(directory, "node_modules"),
        "dir"
      )
      expect(existsSync(resolve(directory, "dist"))).toBe(false)
      const result = spawnSync(
        process.execPath,
        ["--import", "tsx", "scripts/check-server-prop-coverage.ts", "--json"],
        {
          cwd: directory,
          encoding: "utf8",
          timeout: 20_000,
          maxBuffer: 8 * 1024 * 1024
        }
      )
      expect(result.status, `${result.error ?? ""}${result.stderr}`).toBe(0)
      const report = JSON.parse(result.stdout)
      expect(report.errors).toEqual([])
      expect(report.rows).toContainEqual({
        component: "LineChart",
        prop: "fillArea",
        wire: true,
        status: "server-behavior-tested",
        contracts: ["line-area"]
      })
      expect(
        report.rows.some(
          (row: { status: string }) => row.status === "unclassified"
        )
      ).toBe(true)
      // Add a real canonical prop and its generated wire counterpart to this
      // disposable source checkout. The integrated SSR gate must fail before
      // any build, even though registry and serializer parity still pass.
      const specsPath = resolve(
        directory,
        "src/components/charts/shared/chartSpecsXY.ts"
      )
      const source = readFileSync(specsPath, "utf8")
      const changed = source.replace(
        "ownProps: {",
        'ownProps: { supplierProbe: { type: "number" },'
      )
      expect(changed).not.toBe(source)
      writeFileSync(specsPath, changed)
      const schemaPath = resolve(directory, "ai/schema.json")
      const schema = JSON.parse(readFileSync(schemaPath, "utf8"))
      schema.tools.find(
        (tool: { function: { name: string } }) =>
          tool.function.name === "LineChart"
      ).function.parameters.properties.supplierProbe = { type: "number" }
      writeFileSync(schemaPath, JSON.stringify(schema))
      const failed = spawnSync(
        process.execPath,
        ["scripts/check-ssr-alignment.js"],
        { cwd: directory, encoding: "utf8", timeout: 20_000 }
      )
      expect(failed.status, `${failed.error ?? ""}${failed.stderr}`).toBe(1)
      expect(failed.stderr).toContain(
        "LineChart.supplierProbe: new supported prop needs explicit coverage classification"
      )
      expect(failed.stderr).toContain("Server prop coverage inventory failed")
      expect(failed.stdout).toContain("xy: 8 emitted / 8 handled")
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 25_000)
})
