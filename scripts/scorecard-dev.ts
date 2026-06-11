// Dev-only: run the scorecard against TS source so we can iterate without
// waiting for full dist rebuilds. Invoked via npx tsx.
import { runQualityScorecard } from "../src/components/ai/qualityScorecard"
import { CANONICAL_FIXTURES } from "../src/components/ai/qualityFixtures"

const report = runQualityScorecard(CANONICAL_FIXTURES)
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`
const fmtScore = (n: number) => n.toFixed(2)

console.log(`Expert agreement: top-3 ${fmtPct(report.summary.expertAgreementRate)} / top-1 ${fmtPct(report.summary.top1AgreementRate)} across ${report.summary.fixtureCount} fixtures`)
console.log(`Caveat coverage:  ${fmtPct(report.summary.overallCaveatCoverage)}`)
console.log(`Variant util:     ${fmtPct(report.summary.overallVariantUtilization)}`)
console.log("")

console.log("Per-fixture:")
for (const f of report.perFixture) {
  const top = f.topPick ? `${f.topPick.component}${f.topPick.variantKey ? "/" + f.topPick.variantKey : ""}` : "—"
  const agree = f.expertAgreement === null ? " " : f.expertAgreement ? "✓" : "✗"
  console.log(`  ${agree} ${f.fixture.padEnd(60)} top=${top}`)
}
console.log("")

console.log("Weakest descriptors:")
for (const c of report.perCapability.slice(0, 12)) {
  console.log(`  ${c.component.padEnd(28)} fits=${String(c.fitsOn).padStart(2)} rej=${String(c.rejectedOn).padStart(2)} top3=${String(c.inTopThreeOn).padStart(2)} agree=${c.expertAgreementCount} avg=${fmtScore(c.averageScore)}`)
}
