import { describe, expect, it, vi } from "vitest"
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { execFileSync } from "node:child_process"
import {
  loadConsumerContracts,
  validatePortableConfig
} from "../../../scripts/check-consumer-contracts"
import { contractFailures } from "../../../consumer-contracts/assertions"
import { diagnoseChart } from "../../../ai/operations/diagnose"
import { diagnoseConfig } from "../charts/shared/diagnoseConfig"
import { auditAccessibility } from "../charts/shared/auditAccessibility"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import { CHART_CONFIGS } from "./serverChartConfigs"

const root = resolve(import.meta.dirname, "../../..")
const schema = JSON.parse(readFileSync(resolve(root, "ai/schema.json"), "utf8"))
const contracts = loadConsumerContracts(root)
const documentFor = (svg: string) =>
  new DOMParser().parseFromString(svg, "text/html")

describe("portable consumer contracts — source renderer", () => {
  for (const { contract, config } of contracts) {
    it(contract.id, () => {
      // Same static diagnosis operation used by MCP/CLI, not schema-only success.
      const diagnosis = diagnoseChart(
        { ...config, usageMode: "static" },
        { diagnoseConfig },
        () => schema
      )
      expect(diagnosis.ok).toBe(true)
      expect(diagnosis.mode).toBe("diagnose")
      if (diagnosis.mode !== "diagnose")
        throw new Error("Runtime diagnosis was skipped")
      expect(
        diagnosis.diagnoses.map((d) => `${d.severity}:${d.code}`).sort()
      ).toEqual([...contract.expected.diagnoses].sort())
      const accessibility = auditAccessibility(config.component, config.props)
      expect(
        accessibility.findings
          .filter((f) => f.status === "fail")
          .map((f) => f.id)
          .sort()
      ).toEqual([...contract.expected.accessibilityFailures].sort())
      const { svg, evidence } = renderChartWithEvidence(
        config.component,
        structuredClone(config.props)
      )
      expect(contractFailures(contract, evidence, documentFor(svg))).toEqual([])
    })
  }

  it("rejects a dropped valueExtent at the real server prop-forwarding boundary", () => {
    const { contract, config } = contracts.find(
      (c) => c.contract.id === "swimlane-value-extent"
    )!
    const server = CHART_CONFIGS.SwimlaneChart
    const original = server.buildProps
    const forwarding = vi
      .spyOn(server, "buildProps")
      .mockImplementation((...args) => {
        const props = original(...args)
        // The public valueExtent is forwarded to the ordinal frame as rExtent.
        delete props.rExtent
        return props
      })
    try {
      const { svg, evidence } = renderChartWithEvidence(
        config.component,
        structuredClone(config.props)
      )
      expect(evidence.yDomain).toEqual([0, 40])
      expect(contractFailures(contract, evidence, documentFor(svg))).toContain(
        "swimlane-value-extent: evidence.yDomain: expected [0,100], got [0,40]"
      )
    } finally {
      forwarding.mockRestore()
    }
    const restored = renderChartWithEvidence(
      config.component,
      structuredClone(config.props)
    )
    expect(
      contractFailures(contract, restored.evidence, documentFor(restored.svg))
    ).toEqual([])
  })
})

describe("consumer corpus source validation", () => {
  function sourceCheckout(run: (directory: string) => void) {
    const directory = mkdtempSync(resolve(tmpdir(), "semiotic-contracts-"))
    try {
      for (const path of [
        "scripts/check-consumer-contracts.ts",
        "consumer-contracts",
        "ai/schema.json",
        "integration-tests/ssr-parity-fixtures.js",
        "src/components/server/ssr-iris-parity.test.tsx"
      ]) {
        cpSync(resolve(root, path), resolve(directory, path), {
          recursive: true
        })
      }
      symlinkSync(
        resolve(root, "node_modules"),
        resolve(directory, "node_modules"),
        "dir"
      )
      run(directory)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }

  it("runs the CLI against a checkout with no dist or browser artifacts", () => {
    sourceCheckout((directory) => {
      const result = execFileSync(
        process.execPath,
        [resolve(directory, "scripts/check-consumer-contracts.ts")],
        { encoding: "utf8", cwd: directory }
      )
      expect(result).toContain(
        "9 portable fixtures, metadata and schemas valid"
      )
    })
  })

  it.each([
    [
      "duplicate ID",
      (m: { contracts: (typeof contracts)[number]["contract"][] }) => {
        m.contracts[1].id = m.contracts[0].id
      },
      /Duplicate consumer contract ID/
    ],
    [
      "missing sources",
      (m: { contracts: (typeof contracts)[number]["contract"][] }) => {
        m.contracts[0].sources = []
      },
      /sources/
    ],
    [
      "missing source file",
      (m: { contracts: (typeof contracts)[number]["contract"][] }) => {
        m.contracts[0].sources[0].path = "missing.ts"
      },
      /missing\/invalid source/
    ],
    [
      "stale source reference",
      (m: { contracts: (typeof contracts)[number]["contract"][] }) => {
        m.contracts[0].sources[0].reference = "removed-fixture"
      },
      /lacks reference/
    ],
    [
      "absent prop",
      (m: { contracts: (typeof contracts)[number]["contract"][] }) => {
        m.contracts[0].coveredProps = ["frameProps.doesNotExist"]
      },
      /covered prop.*absent/
    ],
    [
      "empty evidence",
      (m: { contracts: (typeof contracts)[number]["contract"][] }) => {
        m.contracts[0].expected.evidence.markCountByType = {}
      },
      /markCountByType/
    ]
  ])("rejects %s with actionable diagnostics", (_name, mutate, error) => {
    sourceCheckout((directory) => {
      const path = resolve(directory, "consumer-contracts/manifest.json")
      const manifest = JSON.parse(readFileSync(path, "utf8"))
      mutate(manifest)
      writeFileSync(path, JSON.stringify(manifest))
      expect(() => loadConsumerContracts(directory)).toThrow(error)
    })
  })

  it("rejects malformed on-disk configs before a renderer runs", () => {
    sourceCheckout((directory) => {
      const path = resolve(
        directory,
        "consumer-contracts",
        contracts[0].contract.file
      )
      const config = structuredClone(contracts[0].config)
      config.props.width = "wide"
      writeFileSync(path, JSON.stringify(config))
      expect(() => loadConsumerContracts(directory)).toThrow(
        /bar-axis-exact.*width/
      )
      writeFileSync(path, "{invalid json")
      expect(() => loadConsumerContracts(directory)).toThrow(SyntaxError)
    })
  })

  it.each([
    ["callback", () => "label", /non-JSON function/],
    ["undefined", undefined, /non-JSON undefined/],
    ["NaN", NaN, /non-JSON number/],
    ["date object", new Date(0), /plain JSON object/]
  ])(
    "rejects %s values before serialization can hide them",
    (_label, value, error) => {
      const config = structuredClone(contracts[0].config)
      config.props.frameProps = { nested: { value } }
      expect(() => validatePortableConfig(config, schema)).toThrow(error)
    }
  )

  it("rejects empty data and unknown components", () => {
    const config = structuredClone(contracts[0].config)
    config.props.data = []
    expect(() => validatePortableConfig(config, schema)).toThrow(
      /real data rows/
    )
    config.component = "ImaginaryChart"
    expect(() => validatePortableConfig(config, schema)).toThrow(
      /unknown component/
    )
  })

  it("rejects array properties, sparse rows, accessors, and cycles without evaluating callbacks", () => {
    const config = structuredClone(contracts[0].config)
    const callback = vi.fn(() => "hidden")
    config.props.data = Object.assign([{}], { format: callback })
    expect(() => validatePortableConfig(config, schema)).toThrow(
      /non-JSON array property/
    )
    config.props.data = Array(1)
    expect(() => validatePortableConfig(config, schema)).toThrow(/sparse array/)
    config.props.data = [
      Object.defineProperty({}, "label", { enumerable: true, get: callback })
    ]
    expect(() => validatePortableConfig(config, schema)).toThrow(
      /JSON value property/
    )
    expect(callback).not.toHaveBeenCalled()
    config.props.data = [config]
    expect(() => validatePortableConfig(config, schema)).toThrow(
      /circular value/
    )
  })
})
