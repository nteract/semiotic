#!/usr/bin/env node
/**
 * Keeps agent-visible behavior rules synchronized across AI docs.
 *
 * The source of truth is `ai/behaviorContracts.cjs`; this script writes or
 * checks generated sections in CLAUDE.md, docs/public/llms-full.txt, and the
 * compact MCP/system prompt guidance.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const {
  DOC_MARKER_END,
  DOC_MARKER_START,
  formatBehaviorContractsMarkdown,
} = require("../ai/behaviorContracts.cjs")

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const checkOnly = process.argv.includes("--check")

const targets = [
  {
    path: "CLAUDE.md",
    anchor: "\n## Accessibility",
    compact: false,
  },
  {
    path: "docs/public/llms-full.txt",
    anchor: "\n## Accessibility",
    compact: false,
  },
  {
    path: "ai/system-prompt.md",
    anchor: "\n## Key Patterns",
    compact: true,
  },
]

function generatedSection(compact) {
  return formatBehaviorContractsMarkdown({ compact })
}

function upsertGeneratedSection(filePath, content, section, anchor) {
  const start = content.indexOf(DOC_MARKER_START)
  const end = content.indexOf(DOC_MARKER_END)
  if (start !== -1 && end !== -1 && end > start) {
    const beforeHeading = content.lastIndexOf("\n## ", start)
    const replaceStart = beforeHeading === -1 ? start : beforeHeading + 1
    const replaceEnd = end + DOC_MARKER_END.length
    return `${content.slice(0, replaceStart)}${section}${content.slice(replaceEnd)}`
  }

  const anchorIndex = content.indexOf(anchor)
  if (anchorIndex === -1) {
    throw new Error(`Could not find insertion anchor ${JSON.stringify(anchor)} in ${filePath}`)
  }

  return `${content.slice(0, anchorIndex)}\n\n${section}\n${content.slice(anchorIndex)}`
}

const stale = []

for (const target of targets) {
  const filePath = resolve(repoRoot, target.path)
  const original = readFileSync(filePath, "utf8")
  const next = upsertGeneratedSection(
    target.path,
    original,
    generatedSection(target.compact),
    target.anchor
  )

  if (next === original) continue

  if (checkOnly) {
    stale.push(target.path)
  } else {
    writeFileSync(filePath, next)
    console.log(`updated ${target.path}`)
  }
}

if (stale.length > 0) {
  console.error("AI behavior contract docs are stale:")
  for (const path of stale) {
    console.error(`- ${path}`)
  }
  console.error("\nRun: npm run docs:ai-contracts")
  process.exit(1)
}

if (checkOnly) {
  console.log("AI behavior contract docs are in sync")
}
