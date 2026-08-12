#!/usr/bin/env node
/**
 * Run the bench gate against a freshly captured git-ref baseline in the same
 * job, on the same hardware, against the same Node version.
 *
 * Why: comparing absolute means across architectures (e.g. M-series Mac
 * local capture → x86 Linux GitHub runner) produces uniform 60–90% "slowdowns"
 * across every benchmark — environment drift, not real regressions. This
 * orchestrator captures main's numbers in the same CI run so the gate is
 * apples-to-apples.
 *
 * Flow:
 *   1. Run `npx vitest bench` on the candidate → raw Vitest JSON
 *   2. `git worktree add` the requested baseline ref into a fresh dir
 *   3. `npm ci` in the worktree (fast with warm npm cache on CI)
 *   4. Overlay the candidate's `benchmarks/` manifest into the worktree
 *   5. Run `npx vitest bench` there → raw vitest JSON for baseline runtime
 *   6. Normalize and validate both, then hand them to compare-bench-baseline.mjs
 *
 * The orchestrator runs from the candidate checkout and never assumes its
 * sibling scripts exist in the baseline worktree.
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import {
  collectVitestBenchmarks,
  printBenchmarkValidationErrors,
} from "./lib/bench-results.mjs"
import { overlayBenchmarkManifest } from "./lib/bench-manifest.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const args = process.argv.slice(2)
const packageVersion = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version

if (args.some((arg) => arg !== "--previous-tag" && !arg.startsWith("--baseline-ref="))) {
  throw new Error(
    "Usage: node scripts/bench-pr-vs-main.mjs [--previous-tag|--baseline-ref=<git-ref>]",
  )
}

const explicitRef = args.find((arg) => arg.startsWith("--baseline-ref="))?.slice("--baseline-ref=".length)
if (args.includes("--previous-tag") && explicitRef) {
  throw new Error("Choose either --previous-tag or --baseline-ref, not both")
}

function run(command, commandArgs, opts = {}) {
  return execFileSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    ...opts,
  })
}

function output(command, commandArgs, opts = {}) {
  return execFileSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    ...opts,
  }).trim()
}

function previousReleaseTag() {
  console.log("▶ ensuring release tags are available")
  try {
    const shallow = output("git", ["rev-parse", "--is-shallow-repository"]) === "true"
    run(
      "git",
      ["fetch", "origin", "--tags", "--force", ...(shallow ? ["--unshallow"] : [])],
      { stdio: "ignore" },
    )
  } catch {
    // Offline local runs can use already-fetched tags.
  }
  const head = output("git", ["rev-parse", "HEAD"])
  const tags = output("git", ["tag", "--merged", "HEAD", "--sort=-version:refname"])
    .split("\n")
    .filter((tag) => /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag))
  // On an actual release tag, compare that release candidate with its prior
  // tag. On later commits, the latest merged tag is the correct baseline even
  // though package.json still carries the same version until the next bump.
  const previous = tags.find(
    (tag) => output("git", ["rev-list", "-n", "1", tag]) !== head,
  )
  if (!previous) {
    throw new Error(`Could not find a release tag before HEAD (${packageVersion})`)
  }
  return previous
}

const baselineRef = explicitRef || (args.includes("--previous-tag") ? previousReleaseTag() : "origin/main")
const currentLabel = args.includes("--previous-tag") ? `v${packageVersion} candidate` : "PR head"
const baselineLabel = `${baselineRef} runtime`

function captureBench(cwd, outputPath) {
  // `npx vitest bench` works from any directory that has its own
  // `node_modules/vitest`. The baseline worktree gets that via `npm ci`.
  run("npx", ["vitest", "bench", "--run", `--outputJson=${outputPath}`], { cwd })
}

function normalize(rawJsonPath, label) {
  const raw = JSON.parse(readFileSync(rawJsonPath, "utf8"))
  const { benchmarks, errors } = collectVitestBenchmarks(raw, `${label} Vitest output`)
  if (errors.length > 0) {
    printBenchmarkValidationErrors(errors)
    throw new Error(`${label} benchmark capture is incomplete`)
  }
  console.log(`  [${label}] ${Object.keys(benchmarks).length} valid benchmarks`)
  return {
    timestamp: new Date().toISOString(),
    git_commit: label,
    node_version: process.version,
    benchmarks,
  }
}

const candidateRaw = join(tmpdir(), `semiotic-bench-candidate-raw-${Date.now()}.json`)
const baselineRaw = join(tmpdir(), `semiotic-bench-baseline-raw-${Date.now()}.json`)
const candidateNorm = join(tmpdir(), `semiotic-bench-candidate-${Date.now()}.json`)
const baselineNorm = join(tmpdir(), `semiotic-bench-baseline-${Date.now()}.json`)
const worktree = mkdtempSync(join(tmpdir(), "semiotic-baseline-"))

if (baselineRef === "origin/main") {
  console.log("▶ ensuring origin/main is up-to-date")
  try { run("git", ["fetch", "origin", "main", "--depth=1"]) } catch { /* offline / already fresh */ }
}

// Fail early with a useful message instead of after the candidate benchmark.
output("git", ["rev-parse", "--verify", `${baselineRef}^{commit}`])

let exitCode = 0
try {
  console.log(`▶ capturing candidate bench (${currentLabel})`)
  captureBench(repoRoot, candidateRaw)
  writeFileSync(candidateNorm, JSON.stringify(normalize(candidateRaw, currentLabel), null, 2))

  console.log(`▶ creating ${baselineRef} worktree at ${worktree}`)
  run("git", ["worktree", "add", "--detach", worktree, baselineRef])

  console.log("▶ installing deterministic baseline dependencies")
  run("npm", [
    "ci",
    "--legacy-peer-deps",
    "--prefer-offline",
    "--no-audit",
    "--no-fund",
    "--silent",
    "--registry=https://registry.npmjs.org",
  ], { cwd: worktree })

  // Benchmark source is the measurement manifest: it controls the cases,
  // names, and fixtures, but imports `../../src/...` relative to this
  // worktree. Overlay the candidate manifest so both captures have exact
  // membership while the second capture still executes the baseline runtime.
  console.log("▶ overlaying candidate benchmark manifest onto baseline runtime")
  overlayBenchmarkManifest(repoRoot, worktree)

  console.log(`▶ capturing ${baselineLabel} with candidate benchmark manifest`)
  captureBench(worktree, baselineRaw)
  writeFileSync(baselineNorm, JSON.stringify(normalize(baselineRaw, baselineLabel), null, 2))

  console.log(`▶ comparing ${currentLabel} vs ${baselineRef} on identical hardware`)
  run(process.execPath, [
    "scripts/compare-bench-baseline.mjs",
    `--baseline=${baselineNorm}`,
    `--current=${candidateNorm}`,
  ])
} catch (err) {
  exitCode = err?.status ?? 1
} finally {
  // Best-effort cleanup; CI runners are ephemeral but local invocations
  // should leave a tidy temp dir and no orphaned worktrees.
  try { run("git", ["worktree", "remove", "--force", worktree], { stdio: "ignore" }) } catch { /* noop */ }
  for (const f of [candidateRaw, baselineRaw, candidateNorm, baselineNorm]) {
    if (existsSync(f)) try { rmSync(f, { force: true }) } catch { /* noop */ }
  }
  try { rmSync(worktree, { recursive: true, force: true }) } catch { /* noop */ }
}

process.exit(exitCode)
