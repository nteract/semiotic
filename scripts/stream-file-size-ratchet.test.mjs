/** Run: node --test scripts/stream-file-size-ratchet.test.mjs */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  STREAM_FILE_SIZE_BASELINE_KIND,
  compareStreamFileSizeBaseline,
  countPhysicalLines,
  createStreamFileSizeBaseline,
  formatStreamFileSizeReport,
  validateStreamFileSizeBaseline,
} from "./stream-file-size-ratchet.mjs"

function baseline(files = [{ path: "src/components/stream/PipelineStore.ts", lines: 10, bytes: 100 }]) {
  return {
    schemaVersion: 1,
    baselineKind: STREAM_FILE_SIZE_BASELINE_KIND,
    capturedAt: "2026-07-13T00:00:00.000Z",
    policy: { mode: "advisory" },
    files,
  }
}

describe("stream file-size advisory baseline", () => {
  it("counts physical lines with and without a trailing newline", () => {
    assert.equal(countPhysicalLines(Buffer.from("one\ntwo\n")), 2)
    assert.equal(countPhysicalLines(Buffer.from("one\ntwo")), 2)
    assert.equal(countPhysicalLines(Buffer.alloc(0)), 0)
  })

  it("requires an explicit stream-only advisory baseline", () => {
    assert.deepEqual(validateStreamFileSizeBaseline(baseline()), [])

    const invalid = baseline([
      { path: "ai/mcp-server.ts", lines: 1, bytes: 1 },
      { path: "src/components/stream/PipelineStore.ts", lines: -1, bytes: 1 },
    ])
    const errors = validateStreamFileSizeBaseline(invalid)
    assert.equal(errors.some((error) => error.includes("stay inside src/components/stream/")), true)
    assert.equal(errors.some((error) => error.includes("non-negative integer")), true)
  })

  it("reports growth as advisory drift without a hard ceiling", () => {
    const comparison = compareStreamFileSizeBaseline(baseline(), [
      { path: "src/components/stream/PipelineStore.ts", lines: 9000, bytes: 900000 },
    ])

    assert.equal(comparison.growth.length, 1)
    assert.equal(comparison.reductions.length, 0)
    const report = formatStreamFileSizeReport(comparison)
    assert.match(report, /\+8990 lines/)
    assert.match(report, /advisory and exits successfully/)
  })

  it("preserves exact measurements when intentionally refreshing a baseline", () => {
    const refreshed = createStreamFileSizeBaseline([
      { path: "src/components/stream/StreamXYFrame.tsx", lines: 12, bytes: 120 },
      { path: "src/components/stream/PipelineStore.ts", lines: 10, bytes: 100 },
    ], "2026-07-13T00:00:00.000Z")

    assert.deepEqual(refreshed.files.map((entry) => entry.path), [
      "src/components/stream/PipelineStore.ts",
      "src/components/stream/StreamXYFrame.tsx",
    ])
    assert.deepEqual(validateStreamFileSizeBaseline(refreshed), [])
  })
})
