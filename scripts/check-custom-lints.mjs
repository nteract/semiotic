#!/usr/bin/env node
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { ESLint } from "eslint"
import {
  ACTIVE_STATUSES,
  RULE_CHANGE_EVIDENCE,
  validateEvidenceCursor,
  validateCustomLintRegistry
} from "./lib/custom-lint-lifecycle.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const registryPath = join(__dirname, "custom-lint/registry.json")
const baselinePath = join(__dirname, "custom-lint/baseline.json")
const configPath = join(__dirname, "custom-lint/eslint.config.mjs")
const syncMode = process.argv.find(arg => arg.startsWith("--sync-baseline="))?.split("=")[1]
const initialBaseline = process.argv.includes("--initial-baseline")

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function normalizedSourceLine(filePath, line) {
  const sourceLine = readFileSync(filePath, "utf8").split(/\r?\n/)[line - 1] || ""
  return sourceLine.replace(/\s+/g, " ").trim()
}

function fingerprint(finding) {
  return [finding.ruleId, finding.file, finding.messageId || finding.message, finding.source].join(" :: ")
}

function countFingerprints(findings) {
  const counts = {}
  for (const finding of findings) {
    const key = fingerprint(finding)
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}

function evidenceDigest(rule) {
  return createHash("sha256").update(JSON.stringify(rule.evidence || [])).digest("hex").slice(0, 16)
}

function writeBaseline(registry, findings) {
  const evidenceCursor = Object.fromEntries(registry.rules.map(rule => [rule.id, {
    count: (rule.evidence || []).length,
    digest: evidenceDigest(rule)
  }]))
  writeFileSync(baselinePath, `${JSON.stringify({
    schemaVersion: 1,
    initialized: true,
    description: "Grandfathered findings for unstable custom lints. Managed by scripts/check-custom-lints.mjs; do not edit by hand.",
    evidenceCursor,
    findings: countFingerprints(findings)
  }, null, 2)}\n`)
}

function diffCounts(current, baseline) {
  const added = []
  const removed = []
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)])
  for (const key of [...keys].sort()) {
    const now = current[key] || 0
    const before = baseline[key] || 0
    if (now > before) added.push({ key, delta: now - before })
    if (now < before) removed.push({ key, delta: before - now })
  }
  return { added, removed }
}

function ruleIdFromFingerprint(key) {
  return key.split(" :: ")[0]
}

function printDisposition(ruleById, affectedRuleIds) {
  console.error("\nCUSTOM LINT DISPOSITION REQUIRED")
  for (const id of [...affectedRuleIds].sort()) {
    const rule = ruleById.get(id)
    if (!rule) continue
    console.error(`  [${rule.status.toUpperCase()} ${rule.score}/10] ${id}`)
  }
  console.error("  1. FIX BUG: change the code/test, add confirmed_bug evidence for a true unstable-rule finding, and remove any stale baseline debt.")
  console.error("  2. CHANGE RULE: adjust, demote, or retire it; record negative/rule_revision evidence before syncing a changed baseline.")
  console.error("  3. PROMOTE RULE: only at 10/10 with five distinct positive references, focused tests, and zero grandfathered findings.")
  console.error("  Combinations are valid. Promotion never suppresses an unfixed violation.")
  console.error("  Policy: scripts/custom-lint/README.md")
}

function githubError(finding) {
  if (!process.env.GITHUB_ACTIONS) return
  const escape = value => String(value).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")
  console.error(`::error file=${escape(finding.file)},line=${finding.line},col=${finding.column},title=${escape(finding.ruleId)}::${escape(finding.message)}`)
}

if (!existsSync(registryPath) || !existsSync(baselinePath)) {
  console.error("CUSTOM LINT GATE: missing registry or baseline")
  process.exit(1)
}

const registry = readJson(registryPath)
const baseline = readJson(baselinePath)
const activeIds = new Set(registry.rules.filter(rule => ACTIVE_STATUSES.has(rule.status)).map(rule => rule.id))
const eslint = new ESLint({ cwd: repoRoot, overrideConfigFile: configPath })
const effectiveConfig = await eslint.calculateConfigForFile(join(repoRoot, "src/components/stream/SVGOverlay.tsx"))
const configuredRuleIds = new Set(
  Object.entries(effectiveConfig.rules || {})
    .filter(([id, setting]) => {
      const severity = Array.isArray(setting) ? setting[0] : setting
      return id.startsWith("semiotic/") && (severity === 2 || severity === "error")
    })
    .map(([id]) => id)
)
const missingConfiguredRules = [...activeIds].filter(id => !configuredRuleIds.has(id))
const untrackedConfiguredRules = [...configuredRuleIds].filter(id => !activeIds.has(id))
if (missingConfiguredRules.length > 0 || untrackedConfiguredRules.length > 0) {
  console.error("CUSTOM LINT POLICY: registry and ESLint configuration disagree")
  if (missingConfiguredRules.length > 0) console.error(`  active but not configured: ${missingConfiguredRules.join(", ")}`)
  if (untrackedConfiguredRules.length > 0) console.error(`  configured but not active: ${untrackedConfiguredRules.join(", ")}`)
  process.exit(1)
}
const results = await eslint.lintFiles(["src/**/*.{js,jsx,ts,tsx}", "docs/src/**/*.{js,jsx,ts,tsx}"])
const findings = []
for (const result of results) {
  const relPath = relative(repoRoot, result.filePath).replace(/\\/g, "/")
  for (const message of result.messages) {
    if (!message.ruleId || !activeIds.has(message.ruleId)) continue
    findings.push({
      ruleId: message.ruleId,
      messageId: message.messageId,
      message: message.message,
      file: relPath,
      absoluteFile: result.filePath,
      line: message.line || 1,
      column: message.column || 1,
      source: normalizedSourceLine(result.filePath, message.line || 1)
    })
  }
}

const baselineCounts = {}
for (const [key, count] of Object.entries(baseline.findings || {})) {
  const id = ruleIdFromFingerprint(key)
  baselineCounts[id] = (baselineCounts[id] || 0) + count
}
const registryErrors = [
  ...validateCustomLintRegistry(registry, { repoRoot, baselineCounts }),
  ...validateEvidenceCursor(registry, baseline.evidenceCursor)
]
if (registryErrors.length > 0) {
  console.error("CUSTOM LINT POLICY: INVALID")
  for (const error of registryErrors) console.error(`  - ${error}`)
  process.exit(1)
}

if (initialBaseline) {
  if (baseline.initialized) {
    console.error("Initial custom-lint baseline already exists; use an evidence-backed sync mode instead.")
    process.exit(1)
  }
  writeBaseline(registry, findings)
  console.log(`Initialized custom-lint baseline with ${findings.length} findings.`)
  process.exit(0)
}

if (!baseline.initialized) {
  console.error("CUSTOM LINT GATE: baseline is not initialized. Run once with --initial-baseline during initial adoption.")
  process.exit(1)
}

const current = countFingerprints(findings)
const diff = diffCounts(current, baseline.findings || {})
const ruleById = new Map(registry.rules.map(rule => [rule.id, rule]))

if (syncMode) {
  if (syncMode === "bug-fix") {
    if (diff.added.length > 0) {
      console.error("Bug-fix baseline sync refused because it would grandfather new findings.")
      process.exit(1)
    }
  } else if (syncMode === "rule-change") {
    const affected = new Set([...diff.added, ...diff.removed].map(item => ruleIdFromFingerprint(item.key)))
    for (const id of affected) {
      const rule = ruleById.get(id)
      const cursor = baseline.evidenceCursor?.[id]?.count || 0
      const newEvidence = (rule?.evidence || []).slice(cursor)
      if (!newEvidence.some(event => RULE_CHANGE_EVIDENCE.has(event.kind))) {
        console.error(`Rule-change baseline sync refused for ${id}: add false-positive, remediation, noise, redundancy, or rule-revision evidence first.`)
        process.exit(1)
      }
    }
  } else {
    console.error(`Unknown baseline sync mode ${syncMode}`)
    process.exit(1)
  }
  writeBaseline(registry, findings)
  console.log(`Custom-lint baseline synced for ${syncMode} (${findings.length} findings).`)
  process.exit(0)
}

if (diff.added.length === 0 && diff.removed.length === 0) {
  const unstable = registry.rules.filter(rule => rule.status === "unstable").length
  const official = registry.rules.filter(rule => rule.status === "official").length
  console.log(`CUSTOM LINT GATE: PASS (${unstable} unstable, ${official} official, ${findings.length} grandfathered findings)`)
  process.exit(0)
}

console.error("CUSTOM LINT GATE: FAIL")
const affectedRuleIds = new Set()
for (const item of diff.added.slice(0, 30)) {
  const id = ruleIdFromFingerprint(item.key)
  affectedRuleIds.add(id)
  const matches = findings.filter(finding => fingerprint(finding) === item.key).slice(0, item.delta)
  for (const finding of matches) {
    console.error(`  ${finding.file}:${finding.line}:${finding.column} ${finding.ruleId} ${finding.message}`)
    githubError(finding)
  }
}
for (const item of diff.removed.slice(0, 30)) {
  const id = ruleIdFromFingerprint(item.key)
  affectedRuleIds.add(id)
  console.error(`  stale baseline -${item.delta}: ${item.key}`)
}
printDisposition(ruleById, affectedRuleIds)
process.exit(1)
