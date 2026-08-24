/**
 * Smoke tests for the file-size gate (node:test).
 * Run: node --test scripts/check-file-size.test.mjs
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  classifyAllowlistedGrowth,
  formatAllowlistedGrowthWarning
} from "./check-file-size.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const script = resolve(__dirname, "check-file-size.mjs")

function run(args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  })
}

describe("check-file-size", () => {
  it("gives allowlisted growth a warning runway before failure", () => {
    assert.deepEqual(classifyAllowlistedGrowth(1562, 1562, 50), {
      severity: "none",
      blockingLines: 1612
    })
    assert.deepEqual(classifyAllowlistedGrowth(1567, 1562, 50), {
      severity: "warning",
      blockingLines: 1612
    })
    assert.deepEqual(classifyAllowlistedGrowth(1613, 1562, 50), {
      severity: "failure",
      blockingLines: 1612
    })

    const warning = formatAllowlistedGrowthWarning([
      {
        path: "src/components/stream/NetworkPipelineStore.ts",
        lines: 1567,
        maxLines: 1562,
        blockingLines: 1612,
        hard: 800,
        reason: "Grandfathered production file"
      }
    ])
    assert.match(warning, /warning; CI remains green/)
    assert.match(warning, /1567 lines .*blocking ceiling 1612/)
    assert.match(warning, /actionable architecture debt/)
  })

  it("passes against the current allowlist", () => {
    const result = run()
    assert.equal(
      result.status,
      0,
      `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`
    )
    assert.match(result.stdout, /file size gate passed/)
  })

  it("emits a JSON report", () => {
    const result = run(["--json"])
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.ok(report.scanned > 100)
    assert.equal(report.limits.production.maxLines, 800)
    assert.equal(report.limits.production.ratchetGraceLines, 50)
    assert.equal(report.limits.test.maxLines, 1500)
    assert.equal(report.limits.test.ratchetGraceLines, 100)
    assert.ok(Array.isArray(report.violations))
    assert.equal(report.violations.length, 0)
    assert.equal(report.growth.length, 0)
    assert.ok(Array.isArray(report.growthWarnings))
  })
})
