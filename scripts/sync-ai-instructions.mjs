#!/usr/bin/env node
/**
 * Verify concise vendor bridges and synchronize the public AI reference.
 *
 * The library build must be hermetic: generated tracked files are refreshed
 * deliberately with this command and verified in CI with --check.
 */

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const checkOnly = process.argv.includes("--check")
const mirrorGroups = [
  {
    source: "ai/reference.md",
    targets: ["docs/public/llms-full.txt"],
  },
]
const stale = []
const instructionBridges = [
  { path: "CLAUDE.md", required: ["@AGENTS.md"] },
  {
    path: ".github/copilot-instructions.md",
    required: ["AGENTS.md", "ai/system-prompt.md", "ai/reference.md"],
  },
  {
    path: "rules/semiotic.mdc",
    required: ["AGENTS.md", "ai/system-prompt.md", "https://semiotic.nteract.io/api-reference.md"],
  },
  { path: ".github/skills/code-review/SKILL.md", required: ["AGENTS.md"] },
]

// Source archives can still check the file contents without a Git index.
if (checkOnly && existsSync(resolve(repoRoot, ".git"))) {
  const declared = new Set([
    ...mirrorGroups.flatMap((group) => group.targets),
    ...instructionBridges.map((bridge) => bridge.path),
    // Owned by generate-llms-txt.mjs.
    "llms.txt",
    "docs/public/llms.txt",
    // Independent workflows validated by check-agent-skill.mjs.
    "agent-skill/semiotic-charts/SKILL.md",
    ".agents/skills/blog-post/SKILL.md",
    "chatgpt-app-submission/SKILL.md",
  ])
  const tracked = execFileSync("git", [
    "ls-files", "-z", "--", ":(glob)**/*.mdc", ":(glob)**/SKILL.md", ":(glob)**/llms*.txt",
  ], { cwd: repoRoot, encoding: "utf8" })
  for (const file of tracked.split("\0").filter(Boolean)) {
    if (!declared.has(file)) stale.push(`${file} (instruction file has no declared owner)`)
  }
}

for (const group of mirrorGroups) {
  const source = readFileSync(resolve(repoRoot, group.source), "utf8")
  for (const target of group.targets) {
    const targetPath = resolve(repoRoot, target)
    const current = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : undefined
    if (current === source) continue

    if (checkOnly) {
      stale.push(`${target} (from ${group.source})`)
      continue
    }

    writeFileSync(targetPath, source)
    console.log(`updated ${target} from ${group.source}`)
  }
}

for (const bridge of instructionBridges) {
  const content = readFileSync(resolve(repoRoot, bridge.path), "utf8")
  const missing = bridge.required.filter((snippet) => !content.includes(snippet))
  if (missing.length > 0) {
    stale.push(`${bridge.path} (missing ${missing.join(", ")})`)
  }
}

if (stale.length > 0) {
  console.error("AI instruction/reference mirrors are stale:")
  for (const target of stale) console.error(`- ${target}`)
  console.error(
    "\nRun `npm run docs:ai-instructions` for reference-mirror drift; " +
      "edit an instruction bridge if one of its required references is missing."
  )
  process.exit(1)
}

if (checkOnly) console.log("AI instruction bridges and reference mirror are in sync")
