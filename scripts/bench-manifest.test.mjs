/**
 * Run: node --test scripts/bench-manifest.test.mjs
 */
import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { overlayBenchmarkManifest } from "./lib/bench-manifest.mjs"

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
