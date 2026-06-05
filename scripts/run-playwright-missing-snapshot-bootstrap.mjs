#!/usr/bin/env node
import { spawnSync } from "node:child_process"

const args = [
  "playwright",
  "test",
  "--update-snapshots=missing",
  "--reporter=json",
  ...process.argv.slice(2),
]

const result = spawnSync("npx", args, {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
})

if (result.stderr) process.stderr.write(result.stderr)

function collectFailedResults(node, failures = []) {
  if (!node || typeof node !== "object") return failures
  if (Array.isArray(node.tests)) {
    for (const test of node.tests) {
      for (const result of test.results ?? []) {
        if (result.status === "failed" || result.status === "timedOut" || result.status === "interrupted") {
          failures.push({
            title: test.title,
            errors: (result.errors ?? []).map((error) => error.message ?? String(error)),
          })
        }
      }
    }
  }
  for (const suite of node.suites ?? []) collectFailedResults(suite, failures)
  for (const spec of node.specs ?? []) collectFailedResults(spec, failures)
  return failures
}

let report
try {
  report = JSON.parse(result.stdout)
} catch {
  if (result.stdout) process.stdout.write(result.stdout)
  process.exit(result.status ?? 1)
}

if (result.status === 0) {
  console.log("Playwright visual suite passed.")
  process.exit(0)
}

const failures = collectFailedResults(report)
const missingSnapshotRe = /A snapshot doesn't exist at .*?, writing actual\./
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
