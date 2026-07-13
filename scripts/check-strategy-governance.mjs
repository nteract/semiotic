#!/usr/bin/env node
/* global console, process */

/**
 * Keep the active architecture strategy reviewable.
 *
 * Strategy scratch work can remain ignored, but the accepted strategy and its
 * ChartDefinition RFC are release-facing records: a release must not silently
 * lose the plan that documents its open operational prerequisites.
 */
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const requiredRecords = [
  "docs/strategy/future-of-semiotic.md",
  "docs/strategy/chart-definition-rfc.md",
]

const failures = []
const warnings = []

for (const record of requiredRecords) {
  const recordPath = resolve(repoRoot, record)
  if (!existsSync(recordPath)) {
    failures.push(`missing required strategy record: ${record}`)
    continue
  }

  const ignored = git(["check-ignore", "--quiet", record])
  if (ignored.status === 0) {
    failures.push(`strategy record is ignored by Git: ${record}`)
  } else if (ignored.status !== 1) {
    warnings.push(`could not determine ignore status for ${record}`)
  }

  const tracked = git(["ls-files", "--error-unmatch", record])
  if (tracked.status !== 0) {
    const message = `strategy record is not tracked yet: ${record}`
    // A working tree can legitimately be in the middle of introducing the
    // record. CI runs from a checkout, where an existing untracked file would
    // be a configuration error rather than an in-progress edit.
    if (process.env.CI) failures.push(message)
    else warnings.push(`${message} (stage it before merging)`)
  }
}

const strategyPath = resolve(repoRoot, requiredRecords[0])
if (existsSync(strategyPath)) {
  const strategy = readFileSync(strategyPath, "utf8")
  if (!strategy.includes("### Milestone 0.5")) {
    failures.push("strategy is missing the Milestone 0.5 operational-release section")
  }

  const openMilestone05Items = sectionCheckboxes(strategy, "### Milestone 0.5", "### Milestone 1")
    .filter((line) => line.startsWith("- [ ]"))
  console.log(`Strategy review: ${openMilestone05Items.length} open Milestone 0.5 item(s).`)
  for (const item of openMilestone05Items) console.log(`  ${item}`)
}

for (const warning of warnings) console.warn(`! ${warning}`)
if (failures.length > 0) {
  console.error("✗ strategy governance check failed:")
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log("✓ accepted strategy and ChartDefinition RFC are reviewable")

function git(args) {
  return spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  })
}

function sectionCheckboxes(source, startHeading, endHeading) {
  const start = source.indexOf(startHeading)
  if (start === -1) return []
  const end = source.indexOf(endHeading, start + startHeading.length)
  return source.slice(start, end === -1 ? undefined : end).split("\n")
}
