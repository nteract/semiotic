import { describe, expect, it } from "vitest"
import {
  evaluateEvidenceGate,
  fromEvidenceEnvelope,
  toEvidenceEnvelope
} from "../semiotic-evidence"
import { buildArtifactContract } from "../artifact/contract"
import { auditClaims } from "../artifact/claims"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import type { EvidenceRef } from "../artifact/types"

const props = {
  data: [{ category: "A", value: 3 }],
  categoryAccessor: "category",
  valueAccessor: "value",
  title: "Measured values",
  description: "A has value three.",
  accessibleTable: true
}

function fixture(inputId: string, source?: EvidenceRef) {
  const contract = buildArtifactContract("BarChart", props, {
    evidence: [
      ...(source ? [source] : []),
      {
        id: "middle",
        role: "transformation",
        transformation: {
          id: "aggregate",
          kind: "aggregation",
          inputEvidenceIds: [inputId]
        }
      },
      {
        id: "derived",
        role: "transformation",
        transformation: {
          id: "summarize",
          kind: "aggregation",
          inputEvidenceIds: ["middle"]
        }
      }
    ]
  })
  const envelope = toEvidenceEnvelope("BarChart", props, {
    artifactContract: contract,
    ssrEvidence: renderChartWithEvidence("BarChart", props, {
      artifactContract: contract
    }).evidence,
    claims: [{ claim: "Derived result", evidenceIds: ["derived"] }]
  })
  envelope.modalityChecks.structured.observations = [
    { id: "observed-input", channel: "structured", finding: "Observed three" }
  ]
  return { contract, envelope }
}

const gate = (envelope: ReturnType<typeof fixture>["envelope"]) =>
  evaluateEvidenceGate(envelope, { allowAccessibilityWarnings: true })

describe("artifact-local transformation support", () => {
  it.each([
    ["input.hash", "outer"],
    ["observed-input", "outer"],
    ["input.hash", "render-only"],
    ["observed-input", "render-only"]
  ])(
    "does not resolve missing artifact input %s from %s envelope records",
    (id, attachment) => {
      const { contract, envelope } = fixture(id)
      if (attachment === "render-only") delete envelope.artifact
      // Resolve the legitimate envelope reference first, then encounter the same
      // spelling through a different scope within the same claim traversal.
      envelope.meaning.claims![0].evidenceIds!.push(id)
      expect(auditClaims(contract).findings).toContainEqual(
        expect.objectContaining({
          id: `evidence.transformation-input.middle.${id}`,
          status: "fail"
        })
      )
      const before = JSON.stringify(envelope)
      for (const input of [
        envelope,
        fromEvidenceEnvelope(JSON.parse(before))
      ]) {
        const result = gate(input)
        expect(result.ok).toBe(false)
        expect(result.findings).toContainEqual(
          expect.objectContaining({
            id: "claim.unknown-evidence",
            severity: "error",
            message: expect.stringContaining(id)
          })
        )
        expect(result.limits?.unsupportedClaims).toContain("Derived result")
      }
      expect(JSON.stringify(envelope)).toBe(before)
    }
  )

  it.each(["input.hash", "observed-input"])(
    "resolves a declared artifact-local %s without ambiguity from other scopes",
    (id) => {
      const { envelope } = fixture(id, { id, role: "source-data" })
      expect(
        gate(fromEvidenceEnvelope(JSON.parse(JSON.stringify(envelope)))).ok
      ).toBe(true)
      // An unqualified top-level claim remains ambiguous when both declarations
      // exist, even though the transformation's local reference is unambiguous.
      envelope.meaning.claims![0].evidenceIds = [id]
      expect(gate(envelope).findings).toContainEqual(
        expect.objectContaining({ id: "claim.ambiguous-evidence" })
      )
    }
  )

  it("retains model review requirements across artifact-local inputs", () => {
    const { envelope } = fixture("observed-input", {
      id: "observed-input",
      role: "model-output"
    })
    expect(gate(envelope).findings).toContainEqual(
      expect.objectContaining({ id: "claim.unreviewed-model" })
    )
    envelope.audit.humanReview = { status: "passed" }
    expect(gate(envelope).ok).toBe(true)
  })

  it("detects artifact-local cycles despite an observation with the same id", () => {
    const { envelope } = fixture("observed-input", {
      id: "observed-input",
      role: "transformation",
      transformation: {
        id: "cycle",
        kind: "aggregation",
        inputEvidenceIds: ["derived"]
      }
    })
    expect(gate(envelope).findings).toContainEqual(
      expect.objectContaining({ id: "claim.evidence-cycle" })
    )
  })

  it("rejects duplicate artifact-local inputs even when they have matching envelope names", () => {
    const { contract } = fixture("input.hash", {
      id: "input.hash",
      role: "source-data"
    })
    contract.evidence.push({ id: "input.hash", role: "source-data" })
    const envelope = toEvidenceEnvelope("BarChart", props, {
      artifactContract: contract,
      ssrEvidence: renderChartWithEvidence("BarChart", props).evidence,
      claims: [{ claim: "Derived result", evidenceIds: ["derived"] }]
    })
    expect(gate(envelope).findings).toContainEqual(
      expect.objectContaining({ id: "claim.ambiguous-evidence" })
    )
  })
})
