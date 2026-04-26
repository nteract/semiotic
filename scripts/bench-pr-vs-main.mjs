#!/usr/bin/env node
/**
 * Run the bench gate against a CI-fresh baseline captured from `origin/main`
 * in the same job, on the same hardware, against the same Node version.
 *
 * Why: comparing absolute means across architectures (e.g. M-series Mac
 * local capture → x86 Linux GitHub runner) produces uniform 60–90% "slowdowns"
 * across every benchmark — environment drift, not real regressions. This
 * orchestrator captures main's numbers in the same CI run so the gate is
 * apples-to-apples.
 *
 * Flow:
 *   1. Run `npx vitest bench` on PR head → raw vitest JSON
 *   2. `git worktree add` origin/main into a fresh dir
 *   3. `npm install` in the worktree (fast with warm npm cache on CI)
 *   4. Run `npx vitest bench` in the worktree → raw vitest JSON
 *   5. Normalize both (vitest emits sibling-compare benchmarks without `mean`
 *      — drop those) and hand to compare-bench-baseline.mjs
 *
 * The orchestrator runs from the PR branch and never assumes its sibling
 * scripts exist in the main worktree — main may not yet have them merged.
 */
import { execSync } from "node:child_process"
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

function runInherit(cmd, opts = {}) {
  execSync(cmd, { cwd: repoRoot, stdio: "inherit", ...opts })
}

function captureBench(cwd, outputPath) {
  // `npx vitest bench` works from any directory that has its own
  // `node_modules/vitest`. The main worktree gets that via `npm install`.
  execSync(`npx vitest bench --run --outputJson="${outputPath}"`, {
    cwd, stdio: "inherit",
  })
}

function normalize(rawJsonPath, label) {
  const raw = JSON.parse(readFileSync(rawJsonPath, "utf8"))
  const benchmarks = {}
  let total = 0
  let skipped = 0
  for (const file of raw.files || []) {
    for (const group of file.groups || []) {
      for (const b of group.benchmarks || []) {
        total++
        // Vitest emits sibling-compare benchmarks (multiple `bench()` calls
        // inside one `describe`) with id/name/rank/rme but no numeric `mean`.
        // Skip them rather than write entries that would NaN out comparisons.
        if (!Number.isFinite(b.mean)) {
          skipped++
          continue
        }
        benchmarks[b.name] = { mean: b.mean, unit: "ms" }
      }
    }
  }
  console.log(`  [${label}] ${Object.keys(benchmarks).length} benchmarks (${skipped}/${total} skipped — no numeric mean)`)
  return {
    timestamp: new Date().toISOString(),
    git_commit: label,
    node_version: process.version,
    benchmarks,
  }
}

const prRaw = join(tmpdir(), `semiotic-bench-pr-raw-${Date.now()}.json`)
const mainRaw = join(tmpdir(), `semiotic-bench-main-raw-${Date.now()}.json`)
const prNorm = join(tmpdir(), `semiotic-bench-pr-${Date.now()}.json`)
const mainNorm = join(tmpdir(), `semiotic-bench-main-${Date.now()}.json`)
const worktree = mkdtempSync(join(tmpdir(), "semiotic-main-"))

console.log("▶ ensuring origin/main is up-to-date")
try { runInherit("git fetch origin main --depth=1") } catch { /* offline / already fresh */ }

let exitCode = 0
try {
  console.log("▶ capturing PR bench (current checkout)")
  captureBench(repoRoot, prRaw)
  writeFileSync(prNorm, JSON.stringify(normalize(prRaw, "PR head"), null, 2))

  console.log(`▶ creating main worktree at ${worktree}`)
  runInherit(`git worktree add --detach "${worktree}" origin/main`)

  console.log("▶ installing deps in main worktree (fresh node_modules)")
  runInherit("npm install --prefer-offline --no-audit --no-fund --silent", { cwd: worktree })

  console.log("▶ capturing main bench")
  captureBench(worktree, mainRaw)
  writeFileSync(mainNorm, JSON.stringify(normalize(mainRaw, "origin/main"), null, 2))

  console.log("▶ comparing PR vs main (CI-native baseline)")
  runInherit(`node scripts/compare-bench-baseline.mjs --baseline="${mainNorm}" --current="${prNorm}"`)
} catch (err) {
  exitCode = err?.status ?? 1
} finally {
  // Best-effort cleanup; CI runners are ephemeral but local invocations
  // should leave a tidy temp dir and no orphaned worktrees.
  try { runInherit(`git worktree remove --force "${worktree}"`, { stdio: "ignore" }) } catch { /* noop */ }
  for (const f of [prRaw, mainRaw, prNorm, mainNorm]) {
    if (existsSync(f)) try { rmSync(f, { force: true }) } catch { /* noop */ }
  }
  try { rmSync(worktree, { recursive: true, force: true }) } catch { /* noop */ }
}

process.exit(exitCode)
