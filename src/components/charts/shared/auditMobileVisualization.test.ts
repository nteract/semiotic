import { describe, expect, it } from "vitest"
import { auditMobileVisualization } from "./auditMobileVisualization"

describe("auditMobileVisualization", () => {
  it("credits the default point hover radius as the effective touch target", () => {
    const result = auditMobileVisualization(
      "Scatterplot",
      {
        data: [{ x: 1, y: 2 }],
        width: 390,
        height: 300,
        xAccessor: "x",
        yAccessor: "y",
      },
      { viewportWidth: 390, targetSize: 44 }
    )

    const targetFinding = result.findings.find(
      (finding) => finding.id === "interaction.target-size-comfort"
    )
    expect(targetFinding?.status).toBe("pass")
    expect(targetFinding?.message).toContain("60px")
  })

  it("does not treat a built-in chart layout prop as a custom-chart contract", () => {
    const result = auditMobileVisualization("TreeDiagram", {
      nodes: [{ id: "a" }],
      edges: [],
      layout: "tree",
    })

    expect(
      result.findings.some((finding) => finding.id === "semantics.custom-mobile-contract")
    ).toBe(false)
  })

  it("does not let label props substitute for a responsive transform", () => {
    const result = auditMobileVisualization(
      "LineChart",
      {
        data: [{ x: 1, y: 2, series: "A" }],
        width: 390,
        height: 300,
        xAccessor: "x",
        yAccessor: "y",
        colorBy: "series",
        directLabel: true,
      },
      { viewportWidth: 390 }
    )

    const responsiveFinding = result.findings.find(
      (finding) => finding.id === "layout.no-responsive-transform"
    )
    expect(responsiveFinding?.status).toBe("manual")
  })
})
