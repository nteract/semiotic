#!/usr/bin/env node
/**
 * Run the descriptor quality scorecard against the canonical fixture set.
 *
 * Prints a human-readable summary and writes the full report to
 * `ai/capability-scorecard.json` for vizmart / tooling to consume.
 *
 * Not in `release:check` by default — the scorecard is a tuning tool, not
 * a release gate. Run with `npm run scorecard`.
 *
 * Rationale: `docs/strategy/chart-capability-layer.md` § Phase 2.1 + V.8.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Use the built dist — keeps the script Node-runnable without ts-node.
const { runQualityScorecard } = await import("../dist/semiotic-ai.module.min.js")
const { CANONICAL_FIXTURES } = await import("../dist/semiotic-ai.module.min.js")

if (!runQualityScorecard || !CANONICAL_FIXTURES) {
  console.error("❌ Scorecard helpers not found in dist/semiotic-ai.module.min.js — rebuild with `npm run dist`.")
  process.exit(1)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")

const report = runQualityScorecard(CANONICAL_FIXTURES)

// Write machine-readable copy
const outPath = path.join(repoRoot, "ai", "capability-scorecard.json")
fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

// Human-readable summary
const fmtPct = (n) => `${(n * 100).toFixed(0)}%`
const fmtScore = (n) => n.toFixed(2)

console.log("Capability Quality Scorecard")
console.log("============================")
console.log(`Fixtures evaluated:        ${report.summary.fixtureCount}`)
console.log(`Capabilities tested:       ${report.summary.capabilityCount}`)
console.log(`Expert agreement rate:     ${fmtPct(report.summary.expertAgreementRate)}`)
console.log(`Overall caveat coverage:   ${fmtPct(report.summary.overallCaveatCoverage)}`)
console.log(`Overall variant utilization: ${fmtPct(report.summary.overallVariantUtilization)}`)
console.log("")

console.log("Per-fixture results:")
for (const f of report.perFixture) {
  const top = f.topPick ? `${f.topPick.component}${f.topPick.variantKey ? "/" + f.topPick.variantKey : ""} (${fmtScore(f.topPick.score)})` : "—"
  const agreement = f.expertAgreement === null ? "  " : f.expertAgreement ? "✓ " : "✗ "
  const intent = f.intent ? ` [${f.intent}]` : ""
  console.log(`  ${agreement}${f.fixture}${intent}`)
  console.log(`     top: ${top}, fitting=${f.fittingCount}, rejected=${f.rejectedCount}`)
  if (f.expected && f.expected.length) {
    console.log(`     expected: ${f.expected.join(", ")}`)
  }
}
console.log("")

console.log("Weakest descriptors (sorted by expert-agreement count, ascending):")
const weakest = report.perCapability.slice(0, 12)
for (const c of weakest) {
  console.log(`  ${c.component.padEnd(28)} fits=${String(c.fitsOn).padStart(2)}  reject=${String(c.rejectedOn).padStart(2)}  top3=${String(c.inTopThreeOn).padStart(2)}  agree=${c.expertAgreementCount}  avg=${fmtScore(c.averageScore)}  caveat=${fmtPct(c.caveatCoverage)}  variant=${fmtPct(c.variantUtilization)}`)
}
console.log("")
console.log(`Full report written to: ${path.relative(repoRoot, outPath)}`)
