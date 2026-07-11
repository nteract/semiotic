// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  EXCLUDED_EXPORTS,
  NAMED_IMPORT_CASES,
  README_MARKER_END,
  README_MARKER_START,
  importPathFor,
  renderReadmeBlock,
  reportForMeasurements,
  stableModuleExportKeys,
  validateNamedImportCases,
} from "./cold-consumer-measurement.mjs"

const packageJson = JSON.parse(readFileSync("package.json", "utf8"))

describe("cold-consumer named import manifest", () => {
  it("covers each stable public package export exactly once", () => {
    expect(validateNamedImportCases(packageJson)).toEqual([])
    expect(new Set(NAMED_IMPORT_CASES.map((entry) => entry.exportKey))).toEqual(
      new Set(stableModuleExportKeys(packageJson)),
    )
    expect(EXCLUDED_EXPORTS).toContain("./experimental")
  })

  it("fails closed when a stable export has no named-import measurement", () => {
    const packageWithNewExport = {
      ...packageJson,
      exports: {
        ...packageJson.exports,
        "./new-stable-export": { import: "./dist/new.module.min.js" },
      },
    }

    expect(validateNamedImportCases(packageWithNewExport)).toContain(
      "Stable package export ./new-stable-export has no cold-consumer named import case",
    )
  })

  it("renders a README block that names public imports and the cold-consumer method", () => {
    const first = NAMED_IMPORT_CASES[0]
    const report = reportForMeasurements(packageJson, [
      {
        ...first,
        importPath: importPathFor(first.exportKey),
        rawBytes: 1024,
        gzipBytes: 512,
        packedPackageInputFiles: 1,
      },
    ])
    const block = renderReadmeBlock(report)

    expect(block).toContain(README_MARKER_START)
    expect(block).toContain(README_MARKER_END)
    expect(block).toContain('npm pack --ignore-scripts')
    expect(block).toContain('import { LineChart } from "semiotic"')
    expect(block).toContain("0.5 KiB")
  })
})
