import { describe, expect, it } from "vitest"
import { diagnoseConfig } from "../../shared/diagnoseConfig"
import { validateProps } from "../../shared/validateProps"
import {
  diagnoseProcessSankeyLayout,
  diagnoseProcessSankeyProps,
  explainProcessSankeyLayout,
} from "./layoutQualityProduct"
import type { ProcessSankeyLayout } from "./processSankeyTypes"

describe("ProcessSankey layout quality product (M10)", () => {
  it("flags missing domain on props", () => {
    const findings = diagnoseProcessSankeyProps({ edges: [{ source: "A", target: "B" }] })
    expect(findings.some((f) => f.code === "PROCESS_SANKEY_MISSING_DOMAIN")).toBe(true)
  })

  it("wires into diagnoseConfig for ProcessSankey", () => {
    const result = diagnoseConfig("ProcessSankey", {
      edges: [{ source: "A", target: "B", value: 1 }],
      // no domain
    })
    expect(result.diagnoses.some((d) => d.code === "PROCESS_SANKEY_MISSING_DOMAIN")).toBe(true)
  })

  it.each([
    { label: "numeric", domain: [12, 14] },
    { label: "numeric strings", domain: ["12", "14"] },
    { label: "Dates", domain: [new Date("2026-01-01"), new Date("2026-02-01")] },
    { label: "ISO dates", domain: ["2026-01-01", "2026-02-01"] },
    { label: "ISO datetimes", domain: ["2026-01-01T12:30", "2026-01-01T14:30+01:00"] },
    { label: "equal endpoints", domain: ["2026-01-01T12:30", "2026-01-01T13:30+01:00"] }
  ])("accepts $label domains through public config diagnostics", ({ domain }) => {
    const props = { domain, edges: [] }
    expect(validateProps("ProcessSankey", props)).toEqual({ valid: true, errors: [] })
    expect(diagnoseProcessSankeyProps(props)).toEqual([])
    expect(diagnoseConfig("ProcessSankey", props).diagnoses)
      .not.toContainEqual(expect.objectContaining({ code: "PROCESS_SANKEY_BAD_DOMAIN" }))
  })

  it.each([
    { label: "non-array", domain: "2026-01-01" },
    { label: "one endpoint", domain: [12] },
    { label: "three endpoints", domain: [12, 14, 16] },
    { label: "inverted numbers", domain: [14, 12] },
    { label: "inverted numeric strings", domain: ["14", "12"] },
    { label: "inverted ISO dates", domain: ["2026-02-01", "2026-01-01"] },
    { label: "invalid date", domain: [new Date(NaN), new Date(0)] },
    { label: "impossible date", domain: ["2026-02-30", "2026-03-01"] },
    { label: "ambiguous date", domain: ["01/02/2026", "2026-03-01"] },
    { label: "missing endpoint", domain: [null, 14] },
    { label: "blank endpoint", domain: [" ", 14] },
    { label: "boolean endpoint", domain: [false, 14] },
    { label: "infinite endpoint", domain: [0, Infinity] }
  ])("rejects $label domains consistently with layout validation", ({ domain }) => {
    const props = { domain, edges: [] }
    expect(diagnoseProcessSankeyProps(props))
      .toContainEqual(expect.objectContaining({ code: "PROCESS_SANKEY_BAD_DOMAIN", severity: "error" }))
    expect(diagnoseConfig("ProcessSankey", props).diagnoses)
      .toContainEqual(expect.objectContaining({ code: "PROCESS_SANKEY_BAD_DOMAIN", severity: "error" }))
  })

  it("diagnoses high transit / compressed padding from a layout snapshot", () => {
    const layout = {
      compressedPadding: true,
      crossingsAfter: 5,
      layoutQualityBefore: {
        crossings: 12,
        weightedLength: 100,
        pixelLength: 1000,
        transitOcclusion: 12,
        verticalUtilization: 0.95,
        cost: 0,
      },
      layoutQuality: {
        crossings: 5,
        weightedLength: 80,
        pixelLength: 800,
        transitOcclusion: 10,
        verticalUtilization: 0.95,
        cost: 0,
      },
      slots: [{}, {}, {}],
    } as unknown as ProcessSankeyLayout

    const findings = diagnoseProcessSankeyLayout(layout)
    expect(findings.map((f) => f.code)).toEqual(
      expect.arrayContaining([
        "PROCESS_SANKEY_COMPRESSED_PADDING",
        "PROCESS_SANKEY_HIGH_TRANSIT",
        "PROCESS_SANKEY_HIGH_UTILIZATION",
        "PROCESS_SANKEY_RESIDUAL_CROSSINGS",
      ]),
    )

    const text = explainProcessSankeyLayout(layout)
    expect(text).toMatch(/3 packed lane/)
    expect(text).toMatch(/Transit occlusion/)
  })
})
