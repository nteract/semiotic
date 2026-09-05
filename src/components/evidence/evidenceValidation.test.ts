import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import {
  fromEvidenceEnvelope,
  toEvidenceEnvelope,
  type ChartEvidenceEnvelope
} from "./chartEvidenceEnvelope"
import { evaluateEvidenceGate } from "./evidenceGate"

const props = {
  data: [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 }
  ],
  xAccessor: "x",
  yAccessor: "y",
  title: "Observed values",
  description: "Three observations increase from one to three.",
  summary: "The values increase.",
  accessibleTable: true
}

function envelope(): ChartEvidenceEnvelope {
  return toEvidenceEnvelope("LineChart", props, {
    ssrEvidence: renderChartWithEvidence("LineChart", props).evidence
  })
}

function expectInvalid(input: ChartEvidenceEnvelope): void {
  const serialized = JSON.stringify(input)
  const restored = JSON.parse(serialized) as ChartEvidenceEnvelope
  expect(() => fromEvidenceEnvelope(restored)).toThrow(TypeError)
  for (const options of [
    {},
    {
      allowAccessibilityWarnings: true,
      requireRenderEvidence: false,
      requireAccessTable: false
    }
  ]) {
    expect(evaluateEvidenceGate(restored, options)).toMatchObject({
      status: "fail",
      ok: false,
      findings: [{ id: "envelope.invalid", severity: "error" }]
    })
  }
  expect(JSON.stringify(restored)).toBe(serialized)
}

describe("serialized scene hash validation", () => {
  it.each(["envelope", "evidence"] as const)(
    "rejects removed or downgraded %s versions, even when the hashes match",
    (side) => {
      for (const version of [undefined, null, 1, 3, "2"]) {
        for (const changeHash of [false, true]) {
          const input = envelope()
          const section = (side === "envelope"
            ? input.render
            : input.render.evidence!) as unknown as Record<string, unknown>
          if (version === undefined) delete section.sceneHashVersion
          else section.sceneHashVersion = version
          if (changeHash) section.sceneHash = "0".repeat(64)
          expectInvalid(input)
        }
      }
    }
  )

  it.each(["envelope", "evidence"] as const)(
    "rejects invalid or missing %s digests with a declared v2 version",
    (side) => {
      for (const hash of [
        undefined,
        null,
        12,
        "",
        "not-a-digest",
        "0".repeat(64)
      ]) {
        const input = envelope()
        const section = (side === "envelope"
          ? input.render
          : input.render.evidence!) as unknown as Record<string, unknown>
        if (hash === undefined) delete section.sceneHash
        else section.sceneHash = hash
        expectInvalid(input)
      }
    }
  )

  it("rejects unsupported nested versions even without an envelope version", () => {
    const input = envelope()
    delete input.render.sceneHashVersion
    const evidence = input.render.evidence! as unknown as Record<
      string,
      unknown
    >
    evidence.sceneHashVersion = 99
    expectInvalid(input)
  })

  it("accepts matching v2 hashes through restoration and the gate", () => {
    const input = JSON.parse(
      JSON.stringify(envelope())
    ) as ChartEvidenceEnvelope
    expect(fromEvidenceEnvelope(input)).toBe(input)
    expect(evaluateEvidenceGate(input)).toMatchObject({
      status: "pass",
      ok: true
    })
  })

  it("rejects v2 hashes when both version fields are removed", () => {
    const input = envelope()
    delete input.render.sceneHashVersion
    delete input.render.evidence!.sceneHashVersion
    expectInvalid(input)
  })

  it("rejects a rendered-scene hash disguised as an outer-only legacy hash", () => {
    const input = envelope()
    delete input.render.sceneHashVersion
    delete input.render.evidence!.sceneHashVersion
    delete input.render.evidence!.sceneHash
    delete input.render.markInventoryHash
    expectInvalid(input)
  })

  it("retains legacy envelopes with neither version advertised", () => {
    const input = envelope()
    delete input.render.sceneHashVersion
    delete input.render.evidence!.sceneHashVersion
    input.render.sceneHash = input.render.markInventoryHash
    // Legacy envelopes stored the inventory digest only in sceneHash.
    delete input.render.markInventoryHash
    delete input.render.evidence!.sceneHash
    const restored = JSON.parse(JSON.stringify(input)) as ChartEvidenceEnvelope
    expect(fromEvidenceEnvelope(restored)).toBe(restored)
    expect(evaluateEvidenceGate(restored).ok).toBe(true)
  })

  it("allows a valid standalone v2 hash when no nested evidence is supplied", () => {
    const input = envelope()
    delete input.render.evidence
    expect(fromEvidenceEnvelope(input)).toBe(input)
    expect(evaluateEvidenceGate(input).findings).toContainEqual(
      expect.objectContaining({ id: "render.missing-evidence" })
    )
    expect(
      evaluateEvidenceGate(input, { requireRenderEvidence: false }).ok
    ).toBe(true)
  })
})

describe("serialized accessibility audit validation", () => {
  const malformed: Array<[string, unknown]> = [
    ["null audit", null],
    ["array audit", []],
    ["primitive audit", true],
    ["nonboolean summary", { ok: "true" }],
    ["null findings", { ok: true, findings: null }],
    ["object findings", { ok: true, findings: {} }],
    ["string findings", { ok: true, findings: "pass" }],
    ["numeric findings", { ok: true, findings: 1 }],
    ["null finding", { ok: true, findings: [null] }],
    ["array finding", { ok: true, findings: [[]] }],
    ["string finding", { ok: true, findings: ["pass"] }],
    ["numeric finding", { ok: true, findings: [0] }],
    ["boolean finding", { ok: true, findings: [false] }],
    [
      "nonboolean critical flag",
      { ok: true, findings: [{ critical: "true", status: "fail" }] }
    ],
    [
      "nonnumeric status",
      { ok: true, findings: [{ critical: true, status: 1 }] }
    ],
    [
      "unsupported status",
      { ok: true, findings: [{ critical: true, status: "failed" }] }
    ]
  ]

  describe.each(["envelope", "access"] as const)("%s audit", (side) => {
    it.each(malformed)(
      "rejects %s without crashing the gate",
      (_label, audit) => {
        const input = envelope()
        if (side === "envelope") input.audit.accessibility = audit
        else {
          const evidence = input.access.evidence as unknown as Record<
            string,
            unknown
          >
          evidence.audit = audit
        }
        expectInvalid(input)
      }
    )
  })

  it.each([
    undefined,
    {},
    { ok: true },
    { ok: true, findings: [] },
    {
      ok: true,
      findings: ["pass", "warn", "manual", "not-applicable"].map((status) => ({
        status,
        critical: false
      }))
    }
  ])("retains optional and well-formed partial audits: %j", (audit) => {
    const input = envelope()
    input.audit.accessibility = audit
    expect(fromEvidenceEnvelope(input)).toBe(input)
    expect(evaluateEvidenceGate(input).ok).toBe(true)
  })

  it("still blocks well-formed critical failures", () => {
    const input = envelope()
    input.audit.accessibility = {
      ok: true,
      findings: [{ critical: true, status: "fail" }]
    }
    expect(fromEvidenceEnvelope(input)).toBe(input)
    expect(
      evaluateEvidenceGate(input, { allowAccessibilityWarnings: true })
    ).toMatchObject({
      ok: false,
      findings: [{ id: "audit.accessibility-blocking" }]
    })
  })
})
