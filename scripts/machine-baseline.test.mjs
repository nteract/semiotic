/**
 * Run: node --test scripts/machine-baseline.test.mjs
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  DEFAULT_VARIANCE_POLICY,
  assertPrerenderedDocsBuild,
  compareMachineBaselines,
  summarizeTimingSamples,
  validateMachineBaseline
} from "./lib/machine-baseline.mjs"

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

function referenceEnvironment(cpuModel = "baseline cpu") {
  return {
    timingFingerprint: {
      platform: "darwin",
      arch: "arm64",
      nodeMajorMinor: "22.23",
      cpuModel,
      logicalCpuCount: 10
    }
  }
}

function validBaseline() {
  return {
    schemaVersion: 1,
    baselineKind: "semiotic-machine-baseline",
    referenceEnvironment: referenceEnvironment(),
    variancePolicy: JSON.parse(JSON.stringify(DEFAULT_VARIANCE_POLICY)),
    metrics: {
      tarball: {
        files: [{ path: "dist/example.js", size: 10, mode: 420 }]
      },
      parser: [
        {
          id: "xy",
          path: "dist/xy.module.min.js",
          sourceBytes: 10,
          timing: timing()
        }
      ],
      evaluation: [
        { id: "xy", specifier: "semiotic/xy", exportCount: 2, timing: timing() }
      ],
      ssr: {
        fixture: { component: "LineChart" },
        svgBytes: 100,
        svgSha256: "fixture-hash",
        timing: timing()
      },
      workers: [
        {
          id: "force-layout",
          path: "dist/forceLayoutWorker.js",
          sourceBytes: 10,
          timing: timing()
        }
      ],
      docs: {
        total: { fileCount: 1, rawBytes: 10, gzipBytes: 10 }
      },
      mcp: {
        entry: { path: "ai/dist/mcp-server.js", sourceBytes: 10 },
        profile: "public",
        protocolVersion: "2025-06-18",
        toolCount: 5,
        initialize: { timing: timing() },
        toolsList: { timing: timing() }
      }
    }
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

describe("machine baseline helpers", () => {
  it("rejects a Vite-only docs shell as an incomplete emitted site", () => {
    const root = mkdtempSync(join(tmpdir(), "semiotic-machine-docs-"))
    try {
      mkdirSync(join(root, "docs/build"), { recursive: true })
      mkdirSync(join(root, "docs/src"), { recursive: true })
      writeFileSync(join(root, "docs/src/App.jsx"), "export default null\n")
      writeFileSync(join(root, "docs/build/index.html"), "<!doctype html>\n")

      assert.throws(
        () => assertPrerenderedDocsBuild(root),
        /Vite-only SPA build is not the emitted documentation surface/
      )

      writeFileSync(
        join(root, "docs/build/llms-routes.json"),
        '{"routes":[]}\n'
      )
      assert.equal(assertPrerenderedDocsBuild(root), join(root, "docs/build"))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("summarizes timing samples without treating their insertion order as a percentile", () => {
    const summary = summarizeTimingSamples([7, 1, 5, 3])
    assert.deepEqual(summary.samplesMs, [7, 1, 5, 3])
    assert.equal(summary.minMs, 1)
    assert.equal(summary.p50Ms, 4)
    assert.equal(summary.p95Ms, 6.7)
    assert.equal(summary.maxMs, 7)
  })

  it("requires every measured surface and finite timing samples", () => {
    const baseline = validBaseline()
    assert.deepEqual(validateMachineBaseline(baseline), [])

    delete baseline.metrics.mcp.toolsList
    const errors = validateMachineBaseline(baseline)
    assert.equal(
      errors.some((error) => error.includes("metrics.mcp")),
      true
    )

    const invalidTiming = validBaseline()
    invalidTiming.metrics.parser[0].timing.p50Ms = Number.NaN
    assert.equal(
      validateMachineBaseline(invalidTiming).some((error) =>
        error.includes("parser:xy has non-finite p50Ms")
      ),
      true
    )
  })

  it("reports cross-host artifact drift without failing the local check", () => {
    const baseline = validBaseline()
    const current = clone(baseline)
    current.referenceEnvironment = referenceEnvironment("different cpu")
    current.metrics.tarball.files[0].size = 11
    current.metrics.parser[0].timing.p50Ms = 999

    const comparison = compareMachineBaselines(baseline, current)
    assert.equal(comparison.timingEnvironment.compatible, false)
    assert.equal(comparison.timingRegressions.length, 0)
    assert.equal(
      comparison.structuralDifferences.some((error) => error.includes("size")),
      true
    )
    assert.equal(comparison.ok, true)
  })

  it("fails exact artifact drift on the recorded reference environment", () => {
    const baseline = validBaseline()
    const current = clone(baseline)
    current.metrics.tarball.files[0].size = 11

    const comparison = compareMachineBaselines(baseline, current)
    assert.equal(comparison.timingEnvironment.compatible, true)
    assert.equal(
      comparison.structuralDifferences.some((error) => error.includes("size")),
      true
    )
    assert.equal(comparison.ok, false)
  })

  it("reports candidate snapshot drift without masking validation or timing regressions", () => {
    const baseline = validBaseline()
    const changedArtifact = clone(baseline)
    changedArtifact.referenceEnvironment = referenceEnvironment("different cpu")
    changedArtifact.metrics.tarball.files[0].size = 11

    const candidate = compareMachineBaselines(baseline, changedArtifact, {
      enforceStatic: false
    })
    assert.equal(candidate.snapshotDifferences.length > 0, true)
    assert.deepEqual(candidate.blockingStructuralDifferences, [])
    assert.equal(candidate.ok, true)

    const invalid = clone(changedArtifact)
    delete invalid.metrics.mcp.toolsList
    assert.equal(
      compareMachineBaselines(baseline, invalid, { enforceStatic: false }).ok,
      false
    )

    const slow = clone(baseline)
    slow.metrics.evaluation[0].timing.p50Ms = 100
    assert.equal(
      compareMachineBaselines(baseline, slow, { enforceStatic: false }).ok,
      false
    )
  })

  it("enforces p50 variance only on the recorded reference environment", () => {
    const baseline = validBaseline()
    const current = clone(baseline)
    current.metrics.evaluation[0].timing.p50Ms = 100

    const comparison = compareMachineBaselines(baseline, current)
    assert.equal(comparison.timingEnvironment.compatible, true)
    assert.deepEqual(
      comparison.timingRegressions.map((entry) => entry.id),
      ["evaluation:xy"]
    )
    assert.equal(comparison.ok, false)
  })
})
