/**
 * Run: node --test scripts/bench-results.test.mjs
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  collectCapturedBenchmarks,
  collectVitestBenchmarks,
  exactBenchmarkMembershipErrors,
} from "./lib/bench-results.mjs"

function rawBenchmark(entry) {
  return {
    files: [{
      filepath: "benchmarks/unit/example.bench.ts",
      groups: [{
        fullName: "example",
        benchmarks: [entry],
      }],
    }],
  }
}

describe("benchmark result validation", () => {
  it("normalizes a timed Vitest benchmark with its sample count", () => {
    const result = collectVitestBenchmarks(rawBenchmark({
      name: "example",
      mean: 1.25,
      sampleCount: 42,
      samples: [],
    }))

    assert.deepEqual(result.errors, [])
    assert.deepEqual(result.benchmarks.example, {
      mean: 1.25,
      sampleCount: 42,
      unit: "ms",
    })
  })

  it("rejects missing, non-finite, zero-mean, and zero-sample results", () => {
    const cases = [
      [{ name: "missing-mean", sampleCount: 1 }, /mean must be a finite/],
      [{ name: "infinite-mean", mean: Infinity, sampleCount: 1 }, /mean must be a finite/],
      [{ name: "zero-mean", mean: 0, sampleCount: 1 }, /mean must be a finite/],
      [{ name: "zero-samples", mean: 1, sampleCount: 0 }, /sampleCount must be a positive/],
      [{ name: "missing-samples", mean: 1 }, /sampleCount must be a positive/],
    ]

    for (const [entry, expected] of cases) {
      const result = collectVitestBenchmarks(rawBenchmark(entry))
      assert.equal(result.errors.some((error) => expected.test(error)), true)
    }
  })

  it("requires captures to retain a positive sample count", () => {
    const result = collectCapturedBenchmarks({
      benchmarks: { example: { mean: 1 } },
    })

    assert.equal(result.errors.length, 1)
    assert.match(result.errors[0], /sampleCount must be a positive/)
  })

  it("reports membership drift in either direction", () => {
    const errors = exactBenchmarkMembershipErrors(
      { retained: {}, removed: {} },
      { retained: {}, added: {} },
    )

    assert.deepEqual(errors, [
      "baseline benchmark missing from current run: removed",
      "current benchmark missing from baseline: added",
    ])
  })
})
