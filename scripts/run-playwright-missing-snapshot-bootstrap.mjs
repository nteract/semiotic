#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

// Write the JSON report to a file rather than stdout. Playwright pipes the
// `webServer` output and any test `console.log` to the same stdout
// the JSON reporter would use, so capturing stdout and `JSON.parse`-ing it is
// unreliable — the interleaved logs make it invalid JSON, which previously
// dropped this script into its fallback path and surfaced a raw exit code 1
// even on a clean missing-snapshot bootstrap run. A dedicated report file is
// the only output we parse; `list` stays on the console for human-readable CI
// logs.
const reportDir = mkdtempSync(join(tmpdir(), "pw-bootstrap-"))
const reportPath = join(reportDir, "results.json")

const args = [
  "playwright",
  "test",
  "--update-snapshots=missing",
  "--reporter=list,json",
  ...process.argv.slice(2),
]

const result = spawnSync("npx", args, {
  cwd: process.cwd(),
  encoding: "utf8",
  env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath },
  stdio: "inherit",
})

function collectFailedResults(node, failures = []) {
  if (!node || typeof node !== "object") return failures
  // In Playwright's JSON report the human-readable title lives on the
  // `spec`, while the per-attempt status/errors live on `spec.tests[].results`.
  // Read both from the spec so failures print a real title rather than
  // `undefined`.
  for (const spec of node.specs ?? []) {
    const title = [spec.title, spec.tests?.[0]?.projectName]
      .filter(Boolean)
      .join(" — ")
    for (const test of spec.tests ?? []) {
      for (const result of test.results ?? []) {
        if (result.status === "failed" || result.status === "timedOut" || result.status === "interrupted") {
          failures.push({
            title: title || spec.title || "(unknown test)",
            errors: (result.errors ?? []).map((error) => error.message ?? String(error)),
          })
        }
      }
    }
  }
  for (const suite of node.suites ?? []) collectFailedResults(suite, failures)
  return failures
}

if (result.status === 0) {
  console.log("Playwright visual suite passed.")
  process.exit(0)
}

let report
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"))
} catch (error) {
  console.error(
    `Could not read Playwright JSON report at ${reportPath}: ${error.message}`
  )
  process.exit(result.status ?? 1)
}

const failures = collectFailedResults(report)
// All phrasings Playwright uses when `--update-snapshots=missing` writes a
// fresh baseline instead of comparing against an existing one. A failure whose
// errors are *only* these is a bootstrap write, not a regression.
const missingSnapshotRe =
  /A snapshot doesn't exist at .*?, writing actual\.|A snapshot is not provided, generating new baseline\.|A snapshot is generated at /
const nonBootstrapFailures = failures.filter(
  (failure) =>
    failure.errors.length === 0 ||
    failure.errors.some((message) => !missingSnapshotRe.test(message))
)

if (failures.length > 0 && nonBootstrapFailures.length === 0) {
  console.log(
    `Playwright wrote ${failures.length} missing snapshot baseline(s); ` +
      "treating this bootstrap run as passing. Existing snapshot diffs still fail."
  )
  process.exit(0)
}

console.error("Playwright reported non-bootstrap failures:")
for (const failure of nonBootstrapFailures.slice(0, 20)) {
  console.error(`- ${failure.title}`)
  for (const message of failure.errors) {
    console.error(`  ${message.split("\n")[0]}`)
  }
}
if (nonBootstrapFailures.length > 20) {
  console.error(`...and ${nonBootstrapFailures.length - 20} more failure(s).`)
}
process.exit(result.status ?? 1)
