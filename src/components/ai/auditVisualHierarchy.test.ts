import { describe, expect, it } from "vitest"
import { auditVisualHierarchy } from "./auditVisualHierarchy"

describe("auditVisualHierarchy", () => {
  it("passes marks that clearly lead subtle scaffolding", () => {
    const result = auditVisualHierarchy({
      backgroundColor: "#fbf7ed",
      dataColors: ["#173f5f", "#b43b2d"],
      scaffoldColor: "#d9d2c1"
    })

    expect(result.status).toBe("pass")
    expect(result.evidence?.hierarchyRatio).toBeGreaterThanOrEqual(2)
  })

  it("warns when dark scaffolding competes with a data color", () => {
    const result = auditVisualHierarchy({
      backgroundColor: "#ffffff",
      dataColors: ["#4682b4"],
      scaffoldColor: "#18201f"
    })

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        status: "warn",
        finding: expect.objectContaining({ code: "SCAFFOLD_DOMINANCE" })
      })
    )
  })

  it("warns when scaffolding disappears into the background", () => {
    const result = auditVisualHierarchy({
      backgroundColor: "#ffffff",
      dataColors: ["#173f5f"],
      scaffoldColor: "#ffffff"
    })

    expect(result.status).toBe("warn")
    expect(result.finding.code).toBe("SCAFFOLD_VISIBILITY")
  })

  it("keeps unresolved CSS colors as an explicit manual check", () => {
    const result = auditVisualHierarchy({
      backgroundColor: "var(--surface)",
      dataColors: ["#173f5f"],
      scaffoldColor: "var(--grid)"
    })

    expect(result.status).toBe("manual")
    expect(result.finding.code).toBe("VISUAL_HIERARCHY_MANUAL")
  })

  it("computes evidence from opaque rgb and composited rgba colors", () => {
    const result = auditVisualHierarchy({
      backgroundColor: "rgb(255, 255, 255)",
      dataColors: ["rgba(23, 63, 95, 0.95)"],
      scaffoldColor: "rgba(0, 0, 0, 0.12)"
    })

    expect(result.status).toBe("pass")
    expect(result.evidence?.weakestDataContrast).toBeGreaterThan(8)
    expect(result.evidence?.scaffoldContrast).toBeGreaterThan(1.1)
  })

  it("keeps a translucent background manual when no underlay is known", () => {
    const result = auditVisualHierarchy({
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      dataColors: ["rgb(23, 63, 95)"],
      scaffoldColor: "rgb(217, 210, 193)"
    })

    expect(result.status).toBe("manual")
  })
})
