import { readFile, readdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { execFileSync } from "node:child_process"

// Run after each of the two camera configurations. Measurements are evidence,
// not timing thresholds; this never changes a release budget.
const input = resolve(process.argv[2] ?? "test-results")
const destination = resolve("benchmarks/setup/network-camera-scale.json")
const reports = []
for (const entry of await readdir(input, { withFileTypes: true })) {
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
if (
  reports.length !== 5 ||
  reports.some((report) => report.rows.length !== 4)
) {
  throw new Error(
    "Expected all five completed camera scenarios with four scales each"
  )
}
const profiling = reports[0].productionProfiling
if (reports.some((report) => report.productionProfiling !== profiling)) {
  throw new Error(
    "Cannot combine production and profiling measurements in one run"
  )
}
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
    "Includes the camera measurement harness and pointer capture fix",
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
