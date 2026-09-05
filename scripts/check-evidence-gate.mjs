#!/usr/bin/env node
/**
 * Evidence envelope fixture gate.
 *
 * Runs the deterministic publication gate over seeded fixtures. This is not a
 * model benchmark: it proves that empty renders, disabled exact-value routes,
 * unsupported claims, and unresolved cross-modal conflicts fail before
 * publication.
 */
import { spawnSync } from "node:child_process"

const code = `
import { renderChartWithEvidence } from "semiotic/server"
import { buildArtifactContract, evaluateArtifact } from "semiotic/artifact"
import {
  toEvidenceEnvelope,
  evaluateEvidenceGate,
} from "semiotic/evidence"

const props = {
  data: [
    { date: "2026-01-01", value: 12 },
    { date: "2026-02-01", value: 18 },
  ],
  xAccessor: "date",
  yAccessor: "value",
  title: "Weekly active users",
}

const healthy = renderChartWithEvidence("LineChart", {
  ...props,
  width: 240,
  height: 140,
})
const healthyEnvelope = toEvidenceEnvelope("LineChart", props, {
  ssrEvidence: healthy.evidence,
})
const healthyGate = evaluateEvidenceGate(healthyEnvelope)
if (!healthyGate.ok) {
  console.error(JSON.stringify({ fixture: "healthy", findings: healthyGate.findings }, null, 2))
  process.exit(1)
}

const empty = renderChartWithEvidence("LineChart", {
  ...props,
  data: [],
  width: 200,
  height: 120,
})
const emptyEnvelope = toEvidenceEnvelope("LineChart", props, {
  ssrEvidence: empty.evidence,
})
if (evaluateEvidenceGate(emptyEnvelope).ok) process.exit(2)

const inaccessible = toEvidenceEnvelope("LineChart", {
  ...props,
  accessibleTable: false,
}, { ssrEvidence: healthy.evidence })
if (evaluateEvidenceGate(inaccessible).ok) process.exit(3)

const conflictEnvelope = toEvidenceEnvelope("LineChart", props, {
  ssrEvidence: healthy.evidence,
  modalityChecks: {
    tandem: {
      agreements: [],
      conflicts: [{
        id: "seeded",
        structuredFinding: "two marks",
        visualFinding: "one mark",
        resolution: "unresolved",
      }],
    },
  },
})
if (evaluateEvidenceGate(conflictEnvelope).ok) process.exit(4)

const contract = buildArtifactContract("LineChart", props)
contract.artifact.dataFingerprint = "sha256:other-data"
const mismatched = toEvidenceEnvelope("LineChart", props, {
  ssrEvidence: healthy.evidence,
  artifactContract: contract,
})
if (evaluateEvidenceGate(mismatched).ok) process.exit(5)
if (evaluateArtifact("LineChart", props, contract).status !== "refuse") process.exit(6)
const reversedProps = { ...props, data: [...props.data].reverse().map((row, index) => ({ ...row, date: props.data[index].date })) }
const reversed = renderChartWithEvidence("LineChart", { ...reversedProps, width: 240, height: 140 })
if (healthy.evidence.sceneHashVersion !== 2 || healthy.evidence.sceneHash === reversed.evidence.sceneHash) process.exit(7)

console.log("evidence publication gate passed: healthy pass; empty, inaccessible, conflicted, and identity-mismatched fixtures fail; geometry hashes differ")
`

const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
  stdio: "inherit",
})
process.exit(result.status ?? 1)
