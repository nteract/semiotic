#!/usr/bin/env node
/**
 * Synchronize AI instruction mirrors from CLAUDE.md.
 *
 * The library build must be hermetic: generated tracked files are refreshed
 * deliberately with this command and verified in CI with --check.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const checkOnly = process.argv.includes("--check")
const sourcePath = resolve(repoRoot, "CLAUDE.md")
const targets = [
  ".cursorrules",
  ".github/copilot-instructions.md",
  ".windsurfrules",
  "docs/public/llms-full.txt",
  ".clinerules",
]

const source = readFileSync(sourcePath, "utf8")
const stale = []

for (const target of targets) {
  const targetPath = resolve(repoRoot, target)
  const current = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : undefined
  if (current === source) continue

  if (checkOnly) {
    stale.push(target)
    continue
  }

  writeFileSync(targetPath, source)
  console.log(`updated ${target}`)
}

if (stale.length > 0) {
  console.error("AI instruction mirrors are stale:")
  for (const target of stale) console.error(`- ${target}`)
  console.error("\nRun: npm run docs:ai-instructions")
  process.exit(1)
}

if (checkOnly) {
  console.log("AI instruction mirrors are in sync")
}
