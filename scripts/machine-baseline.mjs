#!/usr/bin/env node
/**
 * Record, inspect, or verify the versioned local machine baseline.
 *
 * --write is the only mode that writes the repository manifest. --check
 * always packs/extracts into a temporary directory and never rebuilds or
 * updates a checked-in artifact.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { relative } from "node:path"
import {
  MACHINE_BASELINE_PATH,
  REPO_ROOT,
  collectMachineBaseline,
  compareMachineBaselines,
  validateMachineBaseline,
} from "./lib/machine-baseline.mjs"

const rawArgs = process.argv.slice(2)
const tarball = optionValue(rawArgs, "--tarball")
const args = new Set(rawArgs.filter((arg) => arg !== "--tarball" && arg !== tarball))
const write = args.has("--write")
const check = args.has("--check")
const print = args.has("--print")
const compare = args.has("--compare")

if ([...args].some((arg) => !["--write", "--check", "--print", "--compare"].includes(arg))) {
  throw new Error("Usage: node scripts/machine-baseline.mjs --write|--check|--compare|--print [--tarball path/to/semiotic.tgz]")
}
if ([write, check, compare, print].filter(Boolean).length !== 1) {
  throw new Error("Choose exactly one of --write, --check, --compare, or --print")
}

const current = await collectMachineBaseline({ tarball })
const currentErrors = validateMachineBaseline(current)
if (currentErrors.length > 0) {
  throw new Error("Collected an invalid machine baseline:\n" + currentErrors.map((error) => "  - " + error).join("\n"))
}

if (print) {
  process.stdout.write(JSON.stringify(current, null, 2) + "\n")
  process.exit(0)
}

if (write) {
  if (existsSync(MACHINE_BASELINE_PATH)) {
    const baseline = readRecordedBaseline()
    const regression = compareMachineBaselines(baseline, current, { enforceStatic: false })
    reportComparison(regression, { snapshotDriftIsError: false })
    if (!regression.ok) {
      process.stderr.write("\nRefusing to overwrite the recorded machine baseline because the candidate regressed.\n")
      process.exit(1)
    }
  } else {
    process.stdout.write("ℹ no prior machine baseline exists; recording an explicitly reviewed bootstrap snapshot\n")
  }
  writeFileSync(MACHINE_BASELINE_PATH, JSON.stringify(current, null, 2) + "\n")
  process.stdout.write("✓ wrote " + relative(REPO_ROOT, MACHINE_BASELINE_PATH) + "\n")
  process.stdout.write("  " + current.metrics.tarball.unpacked.fileCount + " packed files; " + current.metrics.docs.total.fileCount + " emitted docs files\n")
  process.exit(0)
}

if (!existsSync(MACHINE_BASELINE_PATH)) {
  throw new Error("Missing " + relative(REPO_ROOT, MACHINE_BASELINE_PATH) + ". Run npm run baseline:machine for an intentional baseline refresh.")
}

const baseline = readRecordedBaseline()

const comparison = compareMachineBaselines(baseline, current, { enforceStatic: !compare })
reportComparison(comparison, {
  snapshotDriftIsError: !compare && comparison.timingEnvironment.compatible,
})

if (!comparison.ok) {
  if (compare) {
    process.stderr.write("\nThe candidate has a measured regression; the recorded baseline was not changed.\n")
  } else {
    process.stderr.write("\nFor an intentional artifact/fixture change, regenerate explicitly with:\n")
    process.stderr.write("  npm run baseline:machine\n")
  }
  process.exit(1)
}

if (compare) {
  process.stdout.write("✓ machine candidate has no measured regression; the recorded baseline was not changed\n")
} else {
  process.stdout.write("✓ machine baseline is current")
  process.stdout.write(
    comparison.staticComparisonEnforced
      ? " (static metrics and p50 timing checked)\n"
      : " (cross-host static snapshot skipped; timing reported only)\n",
  )
}

function readRecordedBaseline() {
  let baseline
  try {
    baseline = JSON.parse(readFileSync(MACHINE_BASELINE_PATH, "utf8"))
  } catch (error) {
    throw new Error("Could not parse " + relative(REPO_ROOT, MACHINE_BASELINE_PATH) + ": " + error.message)
  }
  const errors = validateMachineBaseline(baseline)
  if (errors.length > 0) {
    throw new Error("Invalid " + relative(REPO_ROOT, MACHINE_BASELINE_PATH) + ":\n" + errors.map((error) => "  - " + error).join("\n"))
  }
  return baseline
}

function reportComparison(comparison, { snapshotDriftIsError }) {
  if (comparison.blockingStructuralDifferences.length > 0) {
    process.stderr.write("✗ machine baseline measurement contract changed:\n")
    for (const difference of comparison.blockingStructuralDifferences) {
      process.stderr.write("  - " + difference + "\n")
    }
  }
  if (comparison.snapshotDifferences.length > 0) {
    const stream = snapshotDriftIsError ? process.stderr : process.stdout
    stream.write((snapshotDriftIsError ? "✗" : "ℹ") + " machine baseline static snapshot changed:\n")
    for (const difference of comparison.snapshotDifferences) stream.write("  - " + difference + "\n")
  }
  if (!comparison.timingEnvironment.compatible) {
    process.stdout.write("ℹ timing comparison skipped because this is not the recorded reference environment:\n")
    for (const reason of comparison.timingEnvironment.reasons) process.stdout.write("  - " + reason + "\n")
  } else if (comparison.timingRegressions.length > 0) {
    process.stderr.write("✗ machine baseline p50 timing regressions beyond the documented variance:\n")
    for (const regression of comparison.timingRegressions) {
      process.stderr.write(
        "  - " + regression.id + ": " + regression.baselineP50Ms + "ms → " +
        regression.currentP50Ms + "ms (limit " + regression.limitMs + "ms)\n",
      )
    }
  }
  if (comparison.timingWarnings.length > 0) {
    process.stdout.write("ℹ p95 timing changes (diagnostic only under the variance policy):\n")
    for (const warning of comparison.timingWarnings) {
      process.stdout.write("  - " + warning.id + ": " + warning.baselineP95Ms + "ms → " + warning.currentP95Ms + "ms\n")
    }
  }
}

function optionValue(args, option) {
  const index = args.indexOf(option)
  if (index === -1) return null
  const value = args[index + 1]
  if (!value || value.startsWith("--") || args.indexOf(option, index + 1) !== -1) {
    throw new Error("Missing value for " + option)
  }
  return value
}
