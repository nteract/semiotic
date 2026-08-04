import { describe, expect, it } from "vitest"
import { diagnoseConfig } from "../../shared/diagnoseConfig"
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
