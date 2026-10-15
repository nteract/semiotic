/** Run: node --test scripts/browser-baseline.test.mjs */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { delimiter, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  compareBrowserBaselines,
  DEFAULT_BROWSER_VARIANCE_POLICY,
  validateBrowserBaseline
} from "./lib/browser-baseline.mjs"

function timing(samples = [10, 11, 12]) {
  return {
    samplesMs: samples,
    minMs: Math.min(...samples),
    p50Ms: samples[Math.floor(samples.length / 2)],
    p95Ms: Math.max(...samples),
    p99Ms: Math.max(...samples),
    maxMs: Math.max(...samples),
    meanMs: samples.reduce((total, value) => total + value, 0) / samples.length
  }
}

function environment(browserVersion = "140.0") {
  return {
    timingFingerprint: {
      platform: "darwin",
      arch: "arm64",
      nodeMajorMinor: "22.23",
      cpuModel: "baseline cpu",
      logicalCpuCount: 10
    },
    browser: {
      engine: "chromium",
      version: browserVersion,
      userAgent: "baseline browser"
    }
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
          retainedDataUpdate: {
            width: 640,
            height: 360,
            changesCanvasFingerprint: true
          },
          forceWorker: {
            response: "finite normalized positions",
            positionCount: 12
          }
        }
      },
      timings: {
        hydration: timing(),
        initialCanvasPaint: timing(),
        updateCanvasPaint: timing(),
        scatter10kPaint: timing(),
        scatter10kHover: timing(),
        scatter50kUnbatchedPaint: timing(),
        scatter50kBatchedPaint: timing(),
        scatter50kHover: timing(),
        heatmap50kExplicitPaint: timing(),
        heatmap50kAutoPaint: timing(),
        forceWorkerRoundTrip: timing()
      }
    }
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
    assert.equal(
      validateBrowserBaseline(value).some((error) =>
        error.includes("retained-data-canvas-paint")
      ),
      true
    )

    const withoutBrowser = baseline()
    delete withoutBrowser.referenceEnvironment.browser
    assert.equal(
      validateBrowserBaseline(withoutBrowser).some((error) =>
        error.includes("browser timing fingerprints")
      ),
      true
    )
  })

  it("fails structural paint/worker contract drift on every host", () => {
    const expected = baseline()
    const current = clone(expected)
    current.referenceEnvironment = environment("different browser")
    current.metrics.browser.checks.forceWorker.positionCount = 11

    const comparison = compareBrowserBaselines(expected, current)
    assert.equal(comparison.timingEnvironment.compatible, false)
    assert.equal(comparison.timingRegressions.length, 0)
    assert.equal(
      comparison.structuralDifferences.some((error) =>
        error.includes("positionCount")
      ),
      true
    )
    assert.equal(comparison.ok, false)
  })

  it("can report reviewed snapshot drift without weakening validation or timing checks", () => {
    const expected = baseline()
    const changedFixture = clone(expected)
    changedFixture.referenceEnvironment = environment("different browser")
    changedFixture.metrics.browser.checks.forceWorker.positionCount = 11

    const candidate = compareBrowserBaselines(expected, changedFixture, {
      enforceStatic: false
    })
    assert.equal(candidate.snapshotDifferences.length > 0, true)
    assert.deepEqual(candidate.blockingStructuralDifferences, [])
    assert.equal(candidate.ok, true)

    const invalid = clone(changedFixture)
    delete invalid.metrics.timings.updateCanvasPaint
    assert.equal(
      compareBrowserBaselines(expected, invalid, { enforceStatic: false }).ok,
      false
    )

    const slow = clone(expected)
    slow.metrics.timings.initialCanvasPaint.p50Ms = 100
    assert.equal(
      compareBrowserBaselines(expected, slow, { enforceStatic: false }).ok,
      false
    )
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
    assert.deepEqual(
      comparison.timingRegressions.map((entry) => entry.id),
      ["browser:initial-canvas-paint"]
    )
    assert.equal(comparison.ok, false)
  })

  it("allows intentional timing-surface additions without allowing removals", () => {
    const expected = baseline()
    for (const key of [
      "scatter10kPaint",
      "scatter10kHover",
      "scatter50kUnbatchedPaint",
      "scatter50kBatchedPaint",
      "scatter50kHover",
      "heatmap50kExplicitPaint",
      "heatmap50kAutoPaint"
    ]) {
      delete expected.metrics.timings[key]
    }
    const current = baseline()

    assert.equal(
      compareBrowserBaselines(expected, current, { enforceStatic: false }).ok,
      false
    )
    assert.equal(
      compareBrowserBaselines(expected, current, {
        enforceStatic: false,
        allowTimingRowAdditions: true
      }).ok,
      true
    )

    delete current.metrics.timings.updateCanvasPaint
    assert.equal(
      compareBrowserBaselines(expected, current, {
        enforceStatic: false,
        allowTimingRowAdditions: true
      }).ok,
      false
    )
  })
})

it("Linux snapshot generation uses CI architecture and production bundles", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "semiotic-snapshot-command-"))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const capture = join(directory, "docker-args.json")
  writeFileSync(join(directory, "docker"), `#!/usr/bin/env node
const { writeFileSync } = require("node:fs")
if (process.argv[2] !== "version") {
  writeFileSync(process.env.SEMIOTIC_DOCKER_CAPTURE, JSON.stringify(process.argv.slice(2)))
}
`, { mode: 0o755 })

  execFileSync(process.execPath, [
    fileURLToPath(new URL("./run-playwright-linux-bootstrap.mjs", import.meta.url)),
    "integration-tests/chart-features.spec.ts",
    "--project=webkit",
    "--update-snapshots=none",
    "--grep=threshold end caps|renders xy-minimap$"
  ], {
    env: {
      ...process.env,
      PATH: `${directory}${delimiter}${process.env.PATH}`,
      SEMIOTIC_DOCKER_CAPTURE: capture,
      PW_DOCKER_IMAGE: "",
      PW_DOCKER_PLATFORM: ""
    },
    stdio: "pipe"
  })

  const args = JSON.parse(readFileSync(capture, "utf8"))
  assert.equal(args[args.indexOf("--platform") + 1], "linux/amd64")
  assert.ok(args.includes("mcr.microsoft.com/playwright:v1.61.1-noble"))
  const command = args.at(-1)
  assert.match(command, /^npm ci && npm run dist:prod && npx playwright test /)
  assert.ok(command.includes("'--update-snapshots=none'"))
  assert.ok(command.includes("'--grep=threshold end caps|renders xy-minimap$'"))
})
