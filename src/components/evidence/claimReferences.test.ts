import { describe, expect, it } from "vitest"
import {
  toEvidenceEnvelope,
  fromEvidenceEnvelope,
  evaluateEvidenceGate
} from "../semiotic-evidence"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import { buildArtifactContract } from "../artifact/contract"

const props = {
  data: [{ category: "A", value: 3 }],
  categoryAccessor: "category",
  valueAccessor: "value",
  title: "Measured values",
  description: "Category A has a value of three.",
  accessibleTable: true
}
function envelope() {
  return toEvidenceEnvelope("BarChart", props, {
    ssrEvidence: renderChartWithEvidence("BarChart", props).evidence,
    claims: [{ claim: "A has value three", evidenceIds: ["input.hash"] }]
  })
}
const gate = (input: ReturnType<typeof envelope>) =>
  evaluateEvidenceGate(input, { allowAccessibilityWarnings: true })

describe("public evidence-claim reference integrity", () => {
  it.each([
    "missing",
    "__proto__",
    "constructor",
    "render.imageHash",
    "meaning.grounding.physics"
  ])("rejects absent reference %s", (id) => {
    const input = envelope()
    input.meaning.claims![0].evidenceIds = ["input.hash", id]
    const before = JSON.stringify(input)
    for (const value of [input, fromEvidenceEnvelope(JSON.parse(before))]) {
      const result = gate(value)
      expect(result.ok).toBe(false)
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          id: "claim.unknown-evidence",
          severity: "error"
        })
      )
      expect(result.limits?.unsupportedClaims).toContain("A has value three")
    }
    expect(JSON.stringify(input)).toBe(before)
  })

  it("accepts present canonical references and scoped observation ids", () => {
    const input = envelope()
    input.modalityChecks.structured.observations = [
      {
        id: "observed-three",
        channel: "structured",
        finding: "A is three",
        evidenceRefs: ["input.hash", "render.evidence"]
      }
    ]
    input.meaning.claims![0].evidenceIds = [
      "observed-three",
      "meaning.grounding",
      "render.sceneHash"
    ]
    expect(
      gate(fromEvidenceEnvelope(JSON.parse(JSON.stringify(input)))).ok
    ).toBe(true)
    delete input.render.sceneHash
    delete input.render.sceneHashVersion
    delete input.render.evidence!.sceneHash
    delete input.render.evidence!.sceneHashVersion
    expect(gate(input).findings).toContainEqual(
      expect.objectContaining({ id: "claim.unknown-evidence" })
    )
  })

  it.each(["duplicate observation", "reserved path"])(
    "rejects ambiguous ids (%s)",
    (kind) => {
      const input = envelope()
      const id = kind === "reserved path" ? "input.hash" : "same"
      input.modalityChecks.structured.observations = [
        { id, channel: "structured", finding: "first" }
      ]
      if (kind === "duplicate observation")
        input.modalityChecks.vision.observations = [
          { id, channel: "vision", finding: "other" }
        ]
      input.meaning.claims![0].evidenceIds = [id]
      expect(gate(input).findings).toContainEqual(
        expect.objectContaining({ id: "claim.ambiguous-evidence" })
      )
    }
  )

  it.each(["missing upstream", "cycle"])(
    "checks transitive observation references (%s)",
    (kind) => {
      const input = envelope()
      input.modalityChecks.structured.observations = [
        {
          id: "first",
          channel: "structured",
          finding: "one",
          evidenceRefs: ["second"]
        },
        {
          id: "second",
          channel: "structured",
          finding: "two",
          evidenceRefs: [kind === "cycle" ? "first" : "absent"]
        }
      ]
      input.meaning.claims![0].evidenceIds = ["first"]
      expect(gate(input).findings).toContainEqual(
        expect.objectContaining({
          id:
            kind === "cycle" ? "claim.evidence-cycle" : "claim.unknown-evidence"
        })
      )
    }
  )

  it.each(["claim", "observation", "channel"])(
    "requires explicit human review for model-authored %s",
    (kind) => {
      const input = envelope()
      if (kind === "claim") input.meaning.claims![0].model = "test-model"
      else {
        input.modalityChecks.vision.observations = [
          {
            id: "visual",
            channel: "vision",
            finding: "three",
            ...(kind === "observation" ? { model: "test-model" } : {})
          }
        ]
        if (kind === "channel") input.modalityChecks.vision.model = "test-model"
        input.meaning.claims![0].evidenceIds = ["visual"]
      }
      expect(gate(input).findings).toContainEqual(
        expect.objectContaining({ id: "claim.unreviewed-model" })
      )
      input.audit.humanReview = { status: "passed" }
      expect(gate(input).ok).toBe(true)
      input.meaning.claims![0].evidenceIds!.push("still-absent")
      expect(gate(input).ok).toBe(false)
    }
  )

  it("resolves artifact evidence without conflating its mirrored attachment", () => {
    const contract = buildArtifactContract("BarChart", props, {
      id: "reference-test",
      evidence: [{ id: "source-v1", role: "source-data", dataVersion: "1" }]
    })
    const input = toEvidenceEnvelope("BarChart", props, {
      artifactContract: contract,
      ssrEvidence: renderChartWithEvidence("BarChart", props, {
        artifactContract: contract
      }).evidence,
      claims: [{ claim: "A has value three", evidenceIds: ["source-v1"] }]
    })
    expect(gate(input).ok).toBe(true)
    input.meaning.claims![0].evidenceIds = ["source-v2"]
    expect(gate(input).findings).toContainEqual(
      expect.objectContaining({ id: "claim.unknown-evidence" })
    )
  })

  it("follows artifact transformation inputs and requires review of upstream model output", () => {
    const contract = buildArtifactContract("BarChart", props, {
      evidence: [
        { id: "model", role: "model-output" },
        {
          id: "derived",
          role: "transformation",
          transformation: {
            id: "derive",
            kind: "aggregation",
            inputEvidenceIds: ["model"]
          }
        }
      ]
    })
    const input = toEvidenceEnvelope("BarChart", props, {
      artifactContract: contract,
      ssrEvidence: renderChartWithEvidence("BarChart", props).evidence,
      claims: [{ claim: "A has value three", evidenceIds: ["derived"] }]
    })
    expect(gate(input).findings).toContainEqual(
      expect.objectContaining({ id: "claim.unreviewed-model" })
    )
    input.audit.humanReview = { status: "passed" }
    expect(gate(input).ok).toBe(true)
  })

  it("reports invalid artifact evidence without throwing during reference resolution", () => {
    const contract = buildArtifactContract("BarChart", props)
    Object.assign(contract, { evidence: null })
    const input = toEvidenceEnvelope("BarChart", props, {
      artifactContract: contract,
      ssrEvidence: renderChartWithEvidence("BarChart", props).evidence,
      claims: [{ claim: "A has value three", evidenceIds: ["invented"] }]
    })
    expect(gate(input)).toMatchObject({ ok: false })
    expect(gate(input).findings).toContainEqual(
      expect.objectContaining({ id: "claim.unknown-evidence" })
    )
  })

  it("resolves deep shared reference graphs without recursion or false cycles", () => {
    const input = envelope()
    input.modalityChecks.structured.observations = Array.from(
      { length: 12000 },
      (_, i) => ({
        id: `observation-${i}`,
        channel: "structured",
        finding: "derived",
        evidenceRefs:
          i === 0 ? ["input.hash"] : [`observation-${i - 1}`, "input.hash"]
      })
    )
    input.meaning.claims![0].evidenceIds = ["observation-11999"]
    expect(gate(input).ok).toBe(true)
  })

  it.each([
    "refs string",
    "refs nonstring",
    "refs blank",
    "supported",
    "model"
  ])("rejects malformed claim metadata (%s)", (kind) => {
    const input = envelope()
    Object.assign(
      input.meaning.claims![0],
      kind === "refs string"
        ? { evidenceIds: "input.hash" }
        : kind === "refs nonstring"
          ? { evidenceIds: [3] }
          : kind === "refs blank"
            ? { evidenceIds: [" "] }
            : kind === "supported"
              ? { supported: "yes" }
              : { model: {} }
    )
    expect(() => fromEvidenceEnvelope(input)).toThrow()
    expect(gate(input)).toMatchObject({
      ok: false,
      findings: [expect.objectContaining({ id: "envelope.invalid" })]
    })
  })
})
