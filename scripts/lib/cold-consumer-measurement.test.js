// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  EXCLUDED_EXPORTS,
  NAMED_IMPORT_CASES,
  README_MARKER_END,
  README_MARKER_START,
  coldConsumerSizeTolerance,
  compareColdConsumerReports,
  importPathFor,
  readmeMarkerBlockError,
  renderReadmeBlock,
  replaceMarkerBlock,
  reportForMeasurements,
  stableModuleExportKeys,
  validateColdConsumerReport,
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
    expect(EXCLUDED_EXPORTS).toContain("./spec/*")
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
    const report = sampleReport()
    const block = renderReadmeBlock(report)

    expect(block).toContain(README_MARKER_START)
    expect(block).toContain(README_MARKER_END)
    expect(block).toContain('npm pack --ignore-scripts')
    expect(block).toContain('import { LineChart } from "semiotic"')
    expect(block).toContain("0.5 KiB")
  })

  it("permits only the documented cross-runner byte variance", () => {
    const baseline = sampleReport()
    const current = copy(baseline)
    const measurement = current.measurements[0]
    measurement.rawBytes += coldConsumerSizeTolerance("rawBytes", measurement.rawBytes)
    measurement.gzipBytes -= coldConsumerSizeTolerance("gzipBytes", measurement.gzipBytes)

    expect(compareColdConsumerReports(baseline, current)).toMatchObject({
      current: true,
      structuralErrors: [],
      sizeDeltas: [],
    })
  })

  it("allows observed zlib gzip variation without relaxing raw bundle checks", () => {
    const baseline = sampleReport()
    baseline.measurements[0].rawBytes = 1001699
    baseline.measurements[0].gzipBytes = 293604
    const linuxMeasurement = copy(baseline)
    linuxMeasurement.measurements[0].gzipBytes = 294807
    const atGzipBoundary = copy(baseline)
    const overGzipBoundary = copy(baseline)
    const gzipTolerance = coldConsumerSizeTolerance("gzipBytes", 293604)
    atGzipBoundary.measurements[0].gzipBytes += gzipTolerance
    overGzipBoundary.measurements[0].gzipBytes += gzipTolerance + 1

    expect(coldConsumerSizeTolerance("rawBytes", 1001699)).toBe(1002)
    expect(gzipTolerance).toBe(2937)
    expect(compareColdConsumerReports(baseline, linuxMeasurement)).toMatchObject({
      current: true,
      structuralErrors: [],
      sizeDeltas: [],
    })
    expect(compareColdConsumerReports(baseline, atGzipBoundary).current).toBe(true)
    expect(compareColdConsumerReports(baseline, overGzipBoundary).sizeDeltas).toEqual([
      expect.objectContaining({ metric: "gzipBytes", delta: gzipTolerance + 1 }),
    ])
  })

  it("reports row-level byte differences beyond the allowed variance", () => {
    const baseline = sampleReport()
    const current = copy(baseline)
    const measurement = current.measurements[0]
    const tolerance = coldConsumerSizeTolerance("gzipBytes", measurement.gzipBytes)
    measurement.gzipBytes += tolerance + 1

    const result = compareColdConsumerReports(baseline, current)

    expect(result.current).toBe(false)
    expect(result.structuralErrors).toEqual([])
    expect(result.sizeDeltas).toEqual([
      expect.objectContaining({
        importPath: "semiotic",
        metric: "gzipBytes",
        baselineBytes: 512,
        currentBytes: 512 + tolerance + 1,
        delta: tolerance + 1,
        tolerance,
      }),
    ])
  })

  it("reports raw-byte regressions in either direction beyond the allowed variance", () => {
    const baseline = sampleReport()
    const current = copy(baseline)
    const measurement = current.measurements[0]
    const tolerance = coldConsumerSizeTolerance("rawBytes", measurement.rawBytes)
    measurement.rawBytes -= tolerance + 1

    expect(compareColdConsumerReports(baseline, current).sizeDeltas).toEqual([
      expect.objectContaining({
        metric: "rawBytes",
        delta: -(tolerance + 1),
        tolerance,
      }),
    ])
  })

  it("keeps measurement identity and package graph shape exact", () => {
    const baseline = sampleReport()
    const current = copy(baseline)
    current.measurements[0].packedPackageInputFiles = 2
    current.measurements[0].symbol = "DifferentSymbol"

    const result = compareColdConsumerReports(baseline, current)

    expect(result.current).toBe(false)
    expect(result.structuralErrors).toContain(
      'measurement 1 symbol differs (baseline "LineChart"; current "DifferentSymbol")',
    )
    expect(result.structuralErrors).toContain(
      "measurement 1 packedPackageInputFiles differs (baseline 1; current 2)",
    )
  })

  it("rejects malformed baselines before comparing their byte counts", () => {
    const baseline = sampleReport()
    baseline.measurements.push(copy(baseline.measurements[0]))

    expect(validateColdConsumerReport(baseline, "baseline")).toContain(
      "baseline.measurements contains duplicate exportKey .",
    )
    expect(compareColdConsumerReports(baseline, sampleReport())).toMatchObject({
      current: false,
      sizeDeltas: [],
    })
  })

  it("keeps the schema and measurement method exact", () => {
    const baseline = sampleReport()
    const methodChanged = copy(baseline)
    methodChanged.method.bundler.version = "different"
    const wrongSchema = copy(baseline)
    wrongSchema.schemaVersion = 2

    expect(compareColdConsumerReports(baseline, methodChanged).structuralErrors).toContain(
      "measurement method differs",
    )
    expect(validateColdConsumerReport(wrongSchema, "baseline")).toContain(
      "baseline.schemaVersion must be 1",
    )
  })

  it("rejects zero-byte reports instead of granting them an allowance", () => {
    const baseline = sampleReport()
    baseline.measurements[0].rawBytes = 0

    expect(validateColdConsumerReport(baseline, "baseline")).toContain(
      "baseline.measurements[0].rawBytes must be a positive integer",
    )
    expect(() => coldConsumerSizeTolerance("rawBytes", 0)).toThrow("invalid byte count 0")
  })

  it("renders README from the committed baseline, not a tolerated live variance", () => {
    const baseline = sampleReport()
    baseline.measurements[0].gzipBytes = 563
    const live = copy(baseline)
    live.measurements[0].gzipBytes += coldConsumerSizeTolerance("gzipBytes", 563)
    const readme = `Before\n${renderReadmeBlock(baseline)}\nAfter\n`

    expect(compareColdConsumerReports(baseline, live).current).toBe(true)
    expect(renderReadmeBlock(live)).not.toBe(renderReadmeBlock(baseline))
    expect(replaceMarkerBlock(readme, renderReadmeBlock(baseline))).toBe(readme)
  })

  it("rejects duplicate or malformed README measurement markers", () => {
    const duplicateStarts = `${README_MARKER_START}\n${README_MARKER_START}\n${README_MARKER_END}`
    const reversedMarkers = `${README_MARKER_END}\n${README_MARKER_START}`

    expect(readmeMarkerBlockError(duplicateStarts)).toContain("multiple")
    expect(readmeMarkerBlockError(reversedMarkers)).toContain("before its start")
    expect(readmeMarkerBlockError(README_MARKER_START)).toContain("missing the cold-consumer measurement end")
    expect(replaceMarkerBlock(duplicateStarts, "replacement")).toBeNull()
  })
})

function sampleReport() {
  const first = NAMED_IMPORT_CASES[0]
  return reportForMeasurements(packageJson, [
    {
      ...first,
      importPath: importPathFor(first.exportKey),
      rawBytes: 1024,
      gzipBytes: 512,
      packedPackageInputFiles: 1,
    },
  ])
}

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}
