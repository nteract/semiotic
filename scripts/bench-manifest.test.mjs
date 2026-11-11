/**
 * Run: node --test scripts/bench-manifest.test.mjs
 */
import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { benchmarkCaptureArgs, overlayBenchmarkManifest } from "./lib/bench-manifest.mjs"

const tempRoots = []

function tempRoot(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix))
  tempRoots.push(root)
  return root
}

function write(root, relativePath, contents = "") {
  const path = join(root, relativePath)
  mkdirSync(join(path, ".."), { recursive: true })
  writeFileSync(path, contents)
}

afterEach(() => {
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop(), { recursive: true, force: true })
  }
})

describe("benchmark capture commands", () => {
  for (const [version, reportArgs] of [
    ["4.1.12", ["--outputJson=/tmp/bench results.json"]],
    ["5.1.0", ["--reporter=json", "--outputFile=/tmp/bench results.json"]]
  ]) {
    it(`uses the installed ${version} runner's report format`, () => {
      const root = tempRoot("semiotic-bench-command-")
      write(
        root,
        "node_modules/vitest/package.json",
        JSON.stringify({ version })
      )
      assert.deepEqual(benchmarkCaptureArgs(root, "/tmp/bench results.json"), [
        join(root, "node_modules/vitest/vitest.mjs"),
        "bench",
        "--run",
        ...reportArgs
      ])
    })
  }

  for (const version of ["4.1.12", "5.1.0"]) {
    it(`captures and compares with Vitest ${version} without npm shims on PATH`, () => {
      const root = tempRoot("semiotic bench & capture-")
      for (const file of [
        "save-bench-baseline.mjs", "compare-bench-baseline.mjs",
        "lib/bench-manifest.mjs", "lib/bench-results.mjs"
      ]) {
        const target = join(root, "scripts", file)
        mkdirSync(join(target, ".."), { recursive: true })
        cpSync(new URL(file, import.meta.url), target)
      }
      write(root, "node_modules/vitest/package.json", JSON.stringify({ version }))
      const entry = { name: "example", mean: 1.25, sampleCount: 42 }
      const report = version.startsWith("4.")
        ? { files: [{ groups: [{ benchmarks: [entry] }] }] }
        : {
            success: true,
            testResults: [{ status: "passed", assertionResults: [{
              status: "passed", benchmarks: [{ tasks: [{
                name: entry.name,
                latency: { mean: entry.mean, samplesCount: entry.sampleCount }
              }] }]
            }] }]
          }
      write(root, "node_modules/vitest/vitest.mjs", `
        import { appendFileSync, writeFileSync } from "node:fs"
        const args = process.argv.slice(2)
        appendFileSync("calls.jsonl", JSON.stringify(args) + "\\n")
        const output = args.find(arg => arg.startsWith("--output"))
        writeFileSync(output.slice(output.indexOf("=") + 1), ${JSON.stringify(JSON.stringify(report))})
      `)
      const baseline = join(root, "baseline with spaces.json")
      // Windows treats PATH names case-insensitively; remove all spellings.
      const env = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH")
      )
      Object.assign(env, { PATH: "", TMPDIR: root, TMP: root, TEMP: root })
      for (const [script, args] of [
        ["save-bench-baseline.mjs", [`--output=${baseline}`]],
        ["compare-bench-baseline.mjs", [`--baseline=${baseline}`]]
      ]) {
        const result = spawnSync(process.execPath, [join(root, "scripts", script), ...args], {
          cwd: root, env, encoding: "utf8"
        })
        assert.ifError(result.error)
        assert.equal(result.status, 0, result.stdout + result.stderr)
      }
      assert.deepEqual(JSON.parse(readFileSync(baseline, "utf8")).benchmarks, {
        example: { mean: 1.25, sampleCount: 42, unit: "ms" }
      })
      const calls = readFileSync(join(root, "calls.jsonl"), "utf8").trim().split("\n").map(JSON.parse)
      assert.equal(calls.length, 2)
      for (const args of calls) {
        assert.deepEqual(args.slice(0, 2), ["bench", "--run"])
        const output = args.at(-1)
        assert(output.startsWith(version.startsWith("4.") ? "--outputJson=" : "--outputFile="))
        assert(output.includes(root), "report paths with spaces remain a single argument")
      }
    })
  }
})

describe("overlayBenchmarkManifest", () => {
  it("copies the caller's complete manifest and removes stale target benchmarks", () => {
    const source = tempRoot("semiotic-bench-manifest-source-")
    const target = tempRoot("semiotic-bench-manifest-target-")
    write(source, "benchmarks/unit/current.bench.ts", "current benchmark")
    write(source, "benchmarks/setup/data.ts", "current fixture")
    write(target, "benchmarks/unit/stale.bench.ts", "stale benchmark")
    write(target, "src/runtime.ts", "main runtime remains")

    overlayBenchmarkManifest(source, target)

    assert.equal(existsSync(join(target, "benchmarks/unit/current.bench.ts")), true)
    assert.equal(existsSync(join(target, "benchmarks/setup/data.ts")), true)
    assert.equal(existsSync(join(target, "benchmarks/unit/stale.bench.ts")), false)
    assert.equal(existsSync(join(target, "src/runtime.ts")), true)
  })

  it("refuses to overwrite the source checkout", () => {
    const root = tempRoot("semiotic-bench-manifest-self-")
    write(root, "benchmarks/unit/current.bench.ts")

    assert.throws(
      () => overlayBenchmarkManifest(root, root),
      /onto itself/,
    )
  })
})
