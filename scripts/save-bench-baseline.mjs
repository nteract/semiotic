#!/usr/bin/env node
/**
 * Capture the current bench run as the regression baseline.
 *
 * Run after merging an intentional perf change. Writes
 * `benchmarks/setup/baseline.json` with one row per benchmark name and
 * its observed mean (ms). Commit the file alongside the perf change so
 * `npm run bench:compare` has something to compare against in CI.
 */
import { execSync } from "node:child_process"
import { writeFileSync, readFileSync, rmSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

// `--output=<path>` overrides the destination so callers (e.g. the
// PR-vs-main orchestrator) can write to a temp file without disturbing
// the committed baseline.
const outArg = process.argv.find((a) => a.startsWith("--output="))
const baselinePath = outArg
  ? resolve(process.cwd(), outArg.slice("--output=".length))
  : join(repoRoot, "benchmarks/setup/baseline.json")

const tmpJson = join(tmpdir(), `semiotic-bench-${Date.now()}.json`)
console.log(`▶ running benchmarks → ${tmpJson}`)
execSync(`npx vitest bench --run --outputJson="${tmpJson}"`, {
  cwd: repoRoot,
  stdio: "inherit",
})

let raw
try {
  raw = JSON.parse(readFileSync(tmpJson, "utf8"))
} finally {
  // Don't leak the captured-output JSON to the OS temp dir — it can be
  // megabytes per run and accumulates across CI/local invocations.
  try { rmSync(tmpJson, { force: true }) } catch { /* best-effort */ }
}

const benchmarks = {}
const skipped = []
for (const file of raw.files || []) {
  for (const group of file.groups || []) {
    for (const b of group.benchmarks || []) {
      // Vitest sometimes emits benchmarks (e.g. siblings inside a `describe`)
      // with no numeric `mean` — only `id`/`name`/`rank`/`rme`. Skip those
      // rather than write a partial entry that would silently NaN-out the
      // comparison gate downstream.
      if (!Number.isFinite(b.mean)) {
        skipped.push({ name: b.name, file: file.filepath, group: group.fullName })
        continue
      }
      // Use the benchmark `name` as the key — these are stable strings
      // authored in the .bench.ts files (e.g. "chord-matrix-20-nodes-400ops").
      // The mean is in ms.
      benchmarks[b.name] = {
        mean: b.mean,
        unit: "ms",
      }
    }
  }
}

let gitCommit = "unknown"
try {
  gitCommit = execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim()
} catch { /* noop */ }

const baseline = {
  timestamp: new Date().toISOString(),
  git_commit: gitCommit,
  node_version: process.version,
  benchmarks,
}

writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n")
console.log(`✅ wrote ${Object.keys(benchmarks).length} benchmarks → ${baselinePath.replace(repoRoot + "/", "")}`)
if (skipped.length > 0) {
  console.log(`ℹ skipped ${skipped.length} benchmarks with no numeric mean (likely vitest sibling-compare quirk):`)
  for (const s of skipped) console.log(`  - ${s.name} (${s.group})`)
}
