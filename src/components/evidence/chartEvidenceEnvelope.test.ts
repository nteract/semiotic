import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import {
  CHART_EVIDENCE_ENVELOPE_VERSION,
  fromEvidenceEnvelope,
  stableEvidenceHash,
  toEvidenceEnvelope,
} from "./chartEvidenceEnvelope"
import { evaluateEvidenceGate } from "./evidenceGate"

const lineData = [
  { date: "2026-01-01", value: 12 },
  { date: "2026-02-01", value: 18 },
  { date: "2026-03-01", value: 15 },
]

const lineProps = {
  data: lineData,
  xAccessor: "date",
  yAccessor: "value",
  title: "Weekly active users",
  description: "Daily active users with a February peak.",
}

describe("ChartEvidenceEnvelope@1", () => {
  it("composes profile, grounding, access contract, and render evidence", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      ...lineProps,
      width: 320,
      height: 180,
    })
    const envelope = toEvidenceEnvelope("LineChart", lineProps, {
      chartId: "chart-1",
      sourceId: "fixture-users",
      ssrEvidence: evidence,
      transformOperations: [{ operation: "sort", options: { by: "date" } }],
    })

    expect(envelope.schemaVersion).toBe(CHART_EVIDENCE_ENVELOPE_VERSION)
    expect(envelope.chart).toMatchObject({
      component: "LineChart",
      chartId: "chart-1",
    })
    expect(envelope.input.rowCount).toBe(3)
    expect(envelope.input.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(envelope.render.parity).toBe("unknown")
    expect(envelope.render.marksObserved).toBeGreaterThan(0)
    expect(envelope.render.evidence?.status).toBe("ok")
    expect(envelope.access.component).toBe("LineChart")
    expect(envelope.access.navigation.composition).toBe("chart-container")
    expect(envelope.access.text.description).toBe(
      "Daily active users with a February peak."
    )
    expect(envelope.meaning.grounding.description.levels.l1).toContain(
      "line chart"
    )
    expect(envelope.meaning.grounding.text).toContain("value ranges from 12")
    const accessibilityAudit = envelope.audit.accessibility as
      | { ok?: boolean }
      | undefined
    expect(accessibilityAudit?.ok).toBe(true)
  })

  it("redacts raw records from profile samples and navigation trees", () => {
    const envelope = toEvidenceEnvelope("LineChart", {
      ...lineProps,
      title: "Secret dataset",
    })
    const serialized = JSON.stringify(envelope)

    expect(serialized).not.toContain('"secret"')
    expect(JSON.stringify(envelope.input.profile)).not.toContain(
      '"sample":'
    )
    expect(JSON.stringify(envelope.access.navigation.tree ?? {})).not.toContain(
      '"datum":'
    )
    expect(JSON.stringify(envelope.access.navigation.tree ?? {})).not.toContain(
      '"datum":'
    )
  })

  it("hashes normalized source records before discarding them", () => {
    const left = toEvidenceEnvelope("LineChart", {
      ...lineProps,
      data: [...lineData, { date: "2026-04-01", value: 99 }],
    })
    const right = toEvidenceEnvelope("LineChart", {
      ...lineProps,
      data: [...lineData, { date: "2026-04-01", value: 100 }],
    })

    expect(left.input.hash).not.toBe(right.input.hash)
    expect(JSON.stringify(left.input.profile)).not.toContain('"sample":')
  })

  it("counts network records rather than reporting zero rows", () => {
    const envelope = toEvidenceEnvelope("ForceDirectedGraph", {
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ source: "a", target: "b" }],
    })
    expect(envelope.input.rowCount).toBe(3)
  })

  it("round-trips through fromEvidenceEnvelope and rejects malformed input", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      ...lineProps,
      width: 240,
      height: 140,
    })
    const envelope = toEvidenceEnvelope("LineChart", lineProps, {
      ssrEvidence: evidence,
    })
    expect(fromEvidenceEnvelope(structuredClone(envelope))).toEqual(envelope)

    expect(() =>
      fromEvidenceEnvelope({ ...envelope, schemaVersion: 99 })
    ).toThrow(TypeError)
    expect(() => fromEvidenceEnvelope({})).toThrow(TypeError)
  })

  it("detects empty-render parity mismatch", () => {
    const empty = renderChartWithEvidence(
      "LineChart",
      { ...lineProps, data: [], width: 200, height: 120 }
    )
    const envelope = toEvidenceEnvelope("LineChart", lineProps, {
      ssrEvidence: empty.evidence,
    })
    const gate = evaluateEvidenceGate(envelope)

    expect(envelope.render.parity).toBe("mismatch")
    expect(gate.ok).toBe(false)
    expect(gate.findings.map((item) => item.id)).toContain(
      "render.parity-mismatch"
    )
  })

  it("fails unsupported claims and unresolved cross-modal conflicts", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      ...lineProps,
      width: 220,
      height: 130,
    })
    const envelope = toEvidenceEnvelope("LineChart", lineProps, {
      ssrEvidence: evidence,
      claims: [
        {
          claim: "February is the peak",
          supported: true,
          evidenceIds: ["input.hash"],
        },
        { claim: "Revenue will double", supported: false },
      ],
      modalityChecks: {
        tandem: {
          agreements: [],
          conflicts: [
            {
              id: "semantic-vision-1",
              structuredFinding: "Three points are visible.",
              visualFinding: "Only two points appear.",
              resolution: "unresolved",
            },
          ],
        },
      },
    })
    const gate = evaluateEvidenceGate(envelope)

    expect(gate.findings.map((item) => item.id)).toContain("claim.unsupported")
    expect(gate.findings.map((item) => item.id)).toContain(
      "modality.unresolved-conflicts"
    )
    expect(envelope.limits.unsupportedClaims).toContain(
      "Revenue will double"
    )
  })

  it("produces deterministic hashes for identical envelopes", () => {
    const left = toEvidenceEnvelope("LineChart", lineProps)
    const right = toEvidenceEnvelope("LineChart", structuredClone(lineProps))
    expect(stableEvidenceHash(left.input.profile)).toBe(
      stableEvidenceHash(right.input.profile)
    )
    expect(stableEvidenceHash(left.transform)).toBe(
      stableEvidenceHash(right.transform)
    )
  })
})
