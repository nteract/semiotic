/**
 * Smoke tests for the file-size gate (node:test).
 * Run: node --test scripts/check-file-size.test.mjs
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

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
    assert.equal(report.limits.test.maxLines, 1500)
    assert.ok(Array.isArray(report.violations))
    assert.equal(report.violations.length, 0)
    assert.equal(report.growth.length, 0)
  })
})
