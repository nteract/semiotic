import { readFile, readdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { execFileSync } from "node:child_process"
import {
  cameraBudgetFailures,
  pointerBudgetFailures,
  validateCameraReports,
  validatePointerReport
} from "./lib/network-camera-budgets.ts"

// Run after each of the two camera configurations. Measurements are evidence,
// not timing thresholds; this never changes a release budget.
const mode =
  process.env.NETWORK_CAMERA_PROFILE === "1" ? "profiling" : "production"
const input = resolve(process.argv[2] ?? `test-results/network-camera/${mode}`)
const destination = resolve(
  process.argv[3] ?? "benchmarks/setup/network-camera-scale.json"
)
const reports = []
const edgeReports = {}
let densePan
for (const entry of await readdir(input, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    try {
      const report = JSON.parse(
        await readFile(resolve(input, entry.name, "dense-pan.json"), "utf8")
      )
      if (densePan) throw new Error("Duplicate dense-pan report")
      densePan = report
    } catch (error) {
      if (error.code !== "ENOENT") throw error
    }
  }
  if (
    entry.isDirectory() &&
    entry.name.startsWith("network-edge-performance-")
  ) {
    for (const [file, key] of [
      ["edge-pointer.json", "edgePointer"],
      ["edge-cold.json", "edgeQueries"]
    ]) {
      try {
        const report = JSON.parse(
          await readFile(resolve(input, entry.name, file), "utf8")
        )
        if (edgeReports[key]) throw new Error(`Duplicate ${key} report`)
        edgeReports[key] = report
      } catch (error) {
        if (error.code !== "ENOENT") throw error
      }
    }
  }
  if (
    !entry.isDirectory() ||
    !entry.name.startsWith("network-camera-scale-measu")
  )
    continue
  const path = resolve(input, entry.name, "measurements.json")
  try {
    reports.push(JSON.parse(await readFile(path, "utf8")))
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
}
validateCameraReports(reports)
const profiling = reports[0].productionProfiling
validatePointerReport(edgeReports.edgePointer, reports[0])
const timingBudgetFailures = [
  ...cameraBudgetFailures(reports),
  ...pointerBudgetFailures(edgeReports.edgePointer)
]
let baseline = { version: 1 }
try {
  baseline = JSON.parse(await readFile(destination, "utf8"))
} catch (error) {
  if (error.code !== "ENOENT") throw error
}
baseline[profiling ? "profiling" : "production"] = {
  measuredAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  sourceWorktree:
    process.argv[4] ??
    "Working tree at measurement time; see the strategy notes",
  timingBudgets: {
    status: profiling
      ? "diagnostic"
      : timingBudgetFailures.length
        ? "failed"
        : "passed",
    failures: timingBudgetFailures
  },
  ...(densePan ? { densePan } : {}),
  ...edgeReports,
  reports: reports.sort(
    (a, b) =>
      a.rows[0].nodes - b.rows[0].nodes ||
      a.rows[0].cards.localeCompare(b.rows[0].cards) ||
      Number(a.rows[0].edgeHits) - Number(b.rows[0].edgeHits)
  )
}
await writeFile(destination, JSON.stringify(baseline, null, 2) + "\n")
console.log(
  `Recorded ${profiling ? "profiling" : "production"} camera measurements in ${destination}`
)
if (timingBudgetFailures.length) {
  console.error(timingBudgetFailures.join("\n"))
  process.exitCode = 1
}
