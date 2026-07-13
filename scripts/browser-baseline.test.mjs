/** Run: node --test scripts/browser-baseline.test.mjs */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  compareBrowserBaselines,
  DEFAULT_BROWSER_VARIANCE_POLICY,
  validateBrowserBaseline,
} from "./lib/browser-baseline.mjs"

function timing(samples = [10, 11, 12]) {
  return {
    samplesMs: samples,
    minMs: Math.min(...samples),
    p50Ms: samples[Math.floor(samples.length / 2)],
    p95Ms: Math.max(...samples),
    p99Ms: Math.max(...samples),
    maxMs: Math.max(...samples),
    meanMs: samples.reduce((total, value) => total + value, 0) / samples.length,
  }
}

function environment(browserVersion = "140.0") {
  return {
    timingFingerprint: {
      platform: "darwin",
      arch: "arm64",
      nodeMajorMinor: "22.23",
      cpuModel: "baseline cpu",
      logicalCpuCount: 10,
    },
    browser: {
      engine: "chromium",
      version: browserVersion,
      userAgent: "baseline browser",
    },
  }
}

function baseline() {
  return {
    schemaVersion: 1,
    baselineKind: "semiotic-browser-baseline",
    referenceEnvironment: environment(),
    variancePolicy: JSON.parse(JSON.stringify(DEFAULT_BROWSER_VARIANCE_POLICY)),
    coverage: { included: ["fixture"], externalOrDeferred: ["deployed"] },
    methods: { fixture: "test" },
    metrics: {
      browser: {
        engine: "chromium",
        checks: {
          initialCanvas: { width: 640, height: 360, hasVisiblePixels: true },
          retainedDataUpdate: { width: 640, height: 360, changesCanvasFingerprint: true },
          forceWorker: { response: "finite normalized positions", positionCount: 12 },
        },
      },
      timings: {
        hydration: timing(),
        initialCanvasPaint: timing(),
        updateCanvasPaint: timing(),
        forceWorkerRoundTrip: timing(),
      },
    },
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

describe("browser baseline helpers", () => {
  it("requires every browser timing surface and browser fingerprint", () => {
    const value = baseline()
    assert.deepEqual(validateBrowserBaseline(value), [])

    delete value.metrics.timings.updateCanvasPaint
    assert.equal(validateBrowserBaseline(value).some((error) => error.includes("retained-data-canvas-paint")), true)

    const withoutBrowser = baseline()
    delete withoutBrowser.referenceEnvironment.browser
    assert.equal(validateBrowserBaseline(withoutBrowser).some((error) => error.includes("browser timing fingerprints")), true)
  })

  it("fails structural paint/worker contract drift on every host", () => {
    const expected = baseline()
    const current = clone(expected)
    current.referenceEnvironment = environment("different browser")
    current.metrics.browser.checks.forceWorker.positionCount = 11

    const comparison = compareBrowserBaselines(expected, current)
    assert.equal(comparison.timingEnvironment.compatible, false)
    assert.equal(comparison.timingRegressions.length, 0)
    assert.equal(comparison.structuralDifferences.some((error) => error.includes("positionCount")), true)
    assert.equal(comparison.ok, false)
  })

  it("keeps host-specific browser concurrency diagnostic-only", () => {
    const expected = baseline()
    expected.metrics.browser.context = { hardwareConcurrency: 10 }
    const current = clone(expected)
    current.referenceEnvironment.timingFingerprint.cpuModel = "different cpu"
    current.metrics.browser.context.hardwareConcurrency = 2

    const comparison = compareBrowserBaselines(expected, current)
    assert.equal(comparison.timingEnvironment.compatible, false)
    assert.deepEqual(comparison.structuralDifferences, [])
    assert.equal(comparison.ok, true)
  })

  it("enforces p50 timing only when host and Chromium match", () => {
    const expected = baseline()
    const current = clone(expected)
    current.metrics.timings.initialCanvasPaint.p50Ms = 100

    const comparison = compareBrowserBaselines(expected, current)
    assert.equal(comparison.timingEnvironment.compatible, true)
    assert.deepEqual(comparison.timingRegressions.map((entry) => entry.id), ["browser:initial-canvas-paint"])
    assert.equal(comparison.ok, false)
  })
})
