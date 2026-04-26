#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const baselinePath = join(__dirname, "test-quality-baseline.json")
const updateBaseline = process.argv.includes("--update-baseline")

const TEST_ROOTS = ["src", "integration-tests"]
const TEST_FILE_RE = /\.(test|spec)\.(js|jsx|ts|tsx)$/
const EXISTENCE_ASSERTION_RE = /\b(toBeTruthy|toBeInTheDocument|toBeVisible|not\.toBeNull|toBeGreaterThan\(0\)|toBeGreaterThanOrEqual\(1\))\b/
const SUSPICIOUS_SELECTOR_RE = /(stream-(xy|ordinal|network|geo)-frame|querySelector(All)?\(["'`](canvas|svg|\.stream-|svg\.visualization-layer|canvas\[aria-label\]|\.semiotic-chart-grid)|locator\(["'`](canvas|svg|\.stream-|svg\.visualization-layer)|container\.firstChild)/
const SELECTOR_ASSIGNMENT_RE = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+)/

function walk(dir) {
  if (!existsSync(dir)) return []
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "build") continue
      files.push(...walk(fullPath))
    } else if (TEST_FILE_RE.test(entry)) {
      files.push(fullPath)
    }
  }
  return files
}

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim()
}

function isAllowed(line) {
  return /test-quality-gate:\s*allow-mount-only/.test(line)
}

function scanFile(filePath) {
  const relPath = relative(repoRoot, filePath)
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/)
  const suspiciousVars = new Map()
  const findings = []

  lines.forEach((line, index) => {
    const normalized = normalizeLine(line)
    if (!normalized || isAllowed(line)) return

    const assignment = normalized.match(SELECTOR_ASSIGNMENT_RE)
    if (assignment && SUSPICIOUS_SELECTOR_RE.test(assignment[2])) {
      suspiciousVars.set(assignment[1], assignment[2])
    }

    if (!EXISTENCE_ASSERTION_RE.test(normalized)) return

    const directSelector = SUSPICIOUS_SELECTOR_RE.test(normalized)
    const assertedVar = normalized.match(/expect\((?:await\s+)?([A-Za-z_$][\w$]*)/)
    const suspiciousVar = assertedVar ? suspiciousVars.get(assertedVar[1]) : undefined
    const countedVar = normalized.match(/expect\(await\s+([A-Za-z_$][\w$]*)\.count\(\)/)
    const suspiciousCountedVar = countedVar ? suspiciousVars.get(countedVar[1]) : undefined

    if (!directSelector && !suspiciousVar && !suspiciousCountedVar) return

    const selectorContext = suspiciousVar || suspiciousCountedVar || "direct selector"
    const fingerprint = `${relPath} :: ${normalized} :: ${selectorContext}`
    findings.push({
      file: relPath,
      line: index + 1,
      fingerprint,
      assertion: normalized,
      selectorContext,
    })
  })

  return findings
}

function countByFingerprint(findings) {
  const counts = {}
  for (const finding of findings) {
    counts[finding.fingerprint] = (counts[finding.fingerprint] || 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}

function readBaseline() {
  if (!existsSync(baselinePath)) return null
  const parsed = JSON.parse(readFileSync(baselinePath, "utf8"))
  return parsed.candidates || parsed
}

const files = TEST_ROOTS.flatMap(root => walk(join(repoRoot, root)))
const findings = files.flatMap(scanFile)
const current = countByFingerprint(findings)

if (updateBaseline) {
  writeFileSync(
    baselinePath,
    `${JSON.stringify({
      description: "Known mount-only assertion candidates. check:test-quality fails when this set changes; replace candidates with semantic assertions where practical.",
      candidates: current,
    }, null, 2)}\n`
  )
  console.log(`Updated ${relative(repoRoot, baselinePath)} with ${findings.length} mount-only assertion candidates.`)
  process.exit(0)
}

const baseline = readBaseline()
if (!baseline) {
  console.error(`Missing ${relative(repoRoot, baselinePath)}. Run: node scripts/check-test-quality-gate.mjs --update-baseline`)
  process.exit(1)
}

const added = []
const removed = []
const keys = new Set([...Object.keys(current), ...Object.keys(baseline)])
for (const key of [...keys].sort()) {
  const now = current[key] || 0
  const before = baseline[key] || 0
  if (now > before) added.push({ key, delta: now - before })
  if (now < before) removed.push({ key, delta: before - now })
}

if (added.length || removed.length) {
  if (added.length) {
    console.error("New mount-only assertion candidates found:")
    for (const item of added.slice(0, 20)) {
      console.error(`+${item.delta} ${item.key}`)
    }
  }
  if (removed.length) {
    console.error("Mount-only assertion baseline is stale after cleanup:")
    for (const item of removed.slice(0, 20)) {
      console.error(`-${item.delta} ${item.key}`)
    }
  }
  console.error("\nPrefer semantic assertions against scene summaries, SVG/canvas output, callbacks, or user-visible behavior.")
  console.error("If the change is intentional, run: node scripts/check-test-quality-gate.mjs --update-baseline")
  process.exit(1)
}

console.log(`Test quality gate passed (${findings.length} mount-only assertion candidates, no baseline drift).`)
