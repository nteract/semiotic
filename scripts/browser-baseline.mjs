#!/usr/bin/env node
/** Record, print, or verify the versioned local Chromium baseline. */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  BROWSER_BASELINE_PATH,
  collectBrowserBaseline,
  compareBrowserBaselines,
  validateBrowserBaseline,
} from "./lib/browser-baseline.mjs"
import { REPO_ROOT } from "./lib/machine-baseline.mjs"

export async function runBrowserBaseline(rawArgs = process.argv.slice(2)) {
  const args = new Set(rawArgs)
  const write = args.has("--write")
  const check = args.has("--check")
  const print = args.has("--print")

  if ([...args].some((arg) => !["--write", "--check", "--print"].includes(arg))) {
    throw new Error("Usage: node scripts/browser-baseline.mjs --write|--check|--print")
  }
  if ([write, check, print].filter(Boolean).length !== 1) {
    throw new Error("Choose exactly one of --write, --check, or --print")
  }

  const executablePath = process.env.SEMIOTIC_BROWSER_EXECUTABLE_PATH
  const current = await collectBrowserBaseline(executablePath ? { executablePath } : undefined)
  const currentErrors = validateBrowserBaseline(current)
  if (currentErrors.length > 0) {
    throw new Error("Collected an invalid browser baseline:\n" + currentErrors.map((error) => "  - " + error).join("\n"))
  }

  if (print) {
    process.stdout.write(JSON.stringify(current, null, 2) + "\n")
    return 0
  }

  if (write) {
    writeFileSync(BROWSER_BASELINE_PATH, JSON.stringify(current, null, 2) + "\n")
    process.stdout.write("✓ wrote " + relative(REPO_ROOT, BROWSER_BASELINE_PATH) + "\n")
    process.stdout.write("  " + current.metrics.browser.harness.chart + "; " + current.metrics.browser.harness.worker + "\n")
    return 0
  }

  if (!existsSync(BROWSER_BASELINE_PATH)) {
    throw new Error("Missing " + relative(REPO_ROOT, BROWSER_BASELINE_PATH) + ". Run npm run baseline:browser for an intentional baseline refresh.")
  }

  let baseline
  try {
    baseline = JSON.parse(readFileSync(BROWSER_BASELINE_PATH, "utf8"))
  } catch (error) {
    throw new Error("Could not parse " + relative(REPO_ROOT, BROWSER_BASELINE_PATH) + ": " + error.message)
  }
  const baselineErrors = validateBrowserBaseline(baseline)
  if (baselineErrors.length > 0) {
    throw new Error("Invalid " + relative(REPO_ROOT, BROWSER_BASELINE_PATH) + ":\n" + baselineErrors.map((error) => "  - " + error).join("\n"))
  }

  const comparison = compareBrowserBaselines(baseline, current)
  if (comparison.structuralDifferences.length > 0) {
    process.stderr.write("✗ browser baseline structural metrics changed:\n")
    for (const difference of comparison.structuralDifferences) process.stderr.write("  - " + difference + "\n")
  }

  if (!comparison.timingEnvironment.compatible) {
    process.stdout.write("ℹ browser timing comparison skipped because this is not the recorded reference environment:\n")
    for (const reason of comparison.timingEnvironment.reasons) process.stdout.write("  - " + reason + "\n")
  } else if (comparison.timingRegressions.length > 0) {
    process.stderr.write("✗ browser baseline p50 timing regressions beyond the documented variance:\n")
    for (const regression of comparison.timingRegressions) {
      process.stderr.write("  - " + regression.id + ": " + regression.baselineP50Ms + "ms → " + regression.currentP50Ms + "ms (limit " + regression.limitMs + "ms)\n")
    }
  }

  if (comparison.timingWarnings.length > 0) {
    process.stdout.write("ℹ browser p95 timing changes (diagnostic only):\n")
    for (const warning of comparison.timingWarnings) {
      process.stdout.write("  - " + warning.id + ": " + warning.baselineP95Ms + "ms → " + warning.currentP95Ms + "ms\n")
    }
  }

  if (!comparison.ok) {
    process.stderr.write("\nFor an intentional fixture or artifact change, regenerate explicitly with:\n")
    process.stderr.write("  npm run baseline:browser\n")
    return 1
  }

  process.stdout.write("✓ browser baseline is current")
  process.stdout.write(comparison.timingEnvironment.compatible ? " (structural metrics and p50 timing checked)\n" : " (structural metrics checked; timing reported only)\n")
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runBrowserBaseline()
}
