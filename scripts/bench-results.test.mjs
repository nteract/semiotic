/**
 * Run: node --test scripts/bench-results.test.mjs
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
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

function capture(means) {
  return {
    timestamp: "2026-09-27T20:04:39Z",
    git_commit: "test capture",
    benchmarks: Object.fromEntries(Object.entries(means).map(([name, mean]) => [
      name, { mean, sampleCount: 30, unit: "ms" },
    ])),
  }
}

function compare(t, baseline, current) {
  const root = mkdtempSync(join(tmpdir(), "semiotic-bench-comparison-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const baselinePath = join(root, "baseline.json")
  const currentPath = join(root, "current.json")
  writeFileSync(baselinePath, JSON.stringify(baseline))
  writeFileSync(currentPath, JSON.stringify(current))
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL("./compare-bench-baseline.mjs", import.meta.url)),
    `--baseline=${baselinePath}`,
    `--current=${currentPath}`,
  ], { encoding: "utf8" })
  assert.ifError(result.error)
  return { status: result.status, output: result.stdout + result.stderr }
}

function comparePairs(t, pairs, rawCurrent = false) {
  const baseline = capture(Object.fromEntries(pairs.map(([name, base]) => [name, base])))
  let current = capture(Object.fromEntries(pairs.map(([name, , mean]) => [name, mean])))
  if (rawCurrent) {
    current = { files: [{ groups: [{ benchmarks: Object.entries(current.benchmarks)
      .map(([name, entry]) => ({ name, ...entry })) }] }] }
  }
  return compare(t, baseline, current)
}

describe("benchmark comparison gate", () => {
  for (const rawCurrent of [false, true]) {
    it(`keeps the reported millisecond slowdowns visible without failing (${rawCurrent ? "Vitest" : "normalized"})`, (t) => {
      const pairs = [
        ["project-points-50k", 1.61, 1.02],
        ["csv-parse-10k-rows", 6.03, 7.55],
        ["rollup-100k-10-groups-mean", 3.06, 4.94],
        ["rollup-100k-10-groups-count", 1.86, 3.50],
        ["rollup-100k-10-groups-sum", 1.90, 5.06],
        ["rollup-100k-10-groups-min", 2.01, 5.01],
        ["rollup-100k-1000-groups-sum", 3.10, 8.59],
        ["rollup-100k-1000-groups-mean", 3.02, 8.92],
        ["rollup-100k-1000-groups-min", 2.96, 8.42],
        ["rollup-100k-1000-groups-count", 2.84, 6.57],
      ]
      const result = comparePairs(t, pairs, rawCurrent)
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /improvements \(1\)/)
      assert.match(result.output, /warnings \(9,/)
      assert.match(result.output, /3\/5 systemic-warning quota/)
      assert.match(result.output, /\+3\.16ms\) — informational/)
      for (const [name] of pairs) assert.ok(result.output.includes(name), name)
      assert.doesNotMatch(result.output, /gate fail/)
    })
  }

  for (const [base, current, status] of [
    [1, 10.99, 0], // Relative threshold alone cannot fail a single case.
    [1, 11, 1], // Exact absolute boundary.
    [100, 199.99, 0], // Absolute threshold alone cannot fail a single case.
    [100, 200, 1], // Exact relative boundary.
    [10, 20, 1], // Both exact boundaries.
    [68, 5000, 1], // Historical catastrophic regression.
    [0.05, 50, 1], // Tiny baselines cannot hide a large regression.
  ]) {
    it(`${base}ms → ${current}ms ${status ? "fails" : "passes"} the single-case gate`, (t) => {
      const result = comparePairs(t, [["example", base, current]])
      assert.equal(result.status, status, result.output)
      if (status) assert.match(result.output, /catastrophic regressions \(1,/)
    })
  }

  for (const [base, current, count, status] of [
    [20, 25, 4, 0], // One warning short of the systemic quota.
    [20, 25, 5, 1], // Exact percentage, absolute, and count boundaries.
    [10, 14.99, 6, 0], // Informational warnings cannot fill the quota.
    [100, 124.99, 6, 0], // Absolute growth still requires ≥25%.
  ]) {
    it(`${count} cases at ${base}ms → ${current}ms ${status ? "fail" : "pass"} the systemic gate`, (t) => {
      const pairs = Array.from({ length: count }, (_, i) => [`case-${i}`, base, current])
      const result = comparePairs(t, pairs)
      assert.equal(result.status, status, result.output)
      if (status) assert.match(result.output, /systemic regression \(5 warnings/)
    })
  }

  it("reports improvements without allowing them to cancel systemic regressions", (t) => {
    const pairs = Array.from({ length: 5 }, (_, i) => [`case-${i}`, 20, 25])
    const result = comparePairs(t, [...pairs, ["improvement", 5000, 1]])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /improvements \(1\)/)
    assert.match(result.output, /systemic regression \(5 warnings/)
  })

  it("suppresses relative noise when both means remain below 1ms", (t) => {
    const result = comparePairs(t, [["tiny", 0.05, 0.5]])
    assert.equal(result.status, 0, result.output)
    assert.match(result.output, /1 benchmarks have both means below the 1ms/)
    assert.doesNotMatch(result.output, /warnings \(/)
  })

  it("still rejects membership drift among sub-millisecond results", (t) => {
    const result = compare(t, capture({ removed: 0.05 }), capture({ added: 0.05 }))
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /baseline benchmark missing from current run: removed/)
    assert.match(result.output, /current benchmark missing from baseline: added/)
  })

  for (const invalidSide of ["baseline", "current"]) {
    it(`still rejects an invalid ${invalidSide} below the reporting floor`, (t) => {
      const captures = { baseline: capture({ tiny: 0.05 }), current: capture({ tiny: 0.05 }) }
      captures[invalidSide].benchmarks.tiny.sampleCount = 0
      const result = compare(t, captures.baseline, captures.current)
      assert.equal(result.status, 2, result.output)
      assert.match(result.output, /sampleCount must be a positive integer/)
    })
  }
})
