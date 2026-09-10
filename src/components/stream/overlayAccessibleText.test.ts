import {
  overlayAccessibleDescription,
  overlayAccessibleIds,
  overlayAccessibleTitle
} from "./overlayAccessibleText"

describe("overlay accessible text", () => {
  it("prefers an authored string title over the family fallback", () => {
    expect(overlayAccessibleTitle("Rainfall", "Geographic chart")).toBe("Rainfall")
    expect(overlayAccessibleTitle({ type: "span" }, "Geographic chart")).toBe(
      "Geographic chart"
    )
    expect(overlayAccessibleTitle("", "XY Chart")).toBe("XY Chart")
  })

  it("prefers description, then title + family phrase, then the fallback", () => {
    const geo = {
      familyPhrase: "geographic data visualization",
      fallback: "geographic data visualization"
    }
    expect(overlayAccessibleDescription("Rainfall", "Monthly totals", geo)).toBe(
      "Monthly totals"
    )
    expect(overlayAccessibleDescription("Rainfall", undefined, geo)).toBe(
      "Rainfall (geographic data visualization)"
    )
    expect(overlayAccessibleDescription(undefined, undefined, geo)).toBe(
      "geographic data visualization"
    )
  })

  it("builds instance-local title and desc ids from a prefix", () => {
    const ids = overlayAccessibleIds("chart-a")
    expect(ids.titleId).toBe("chart-a-semiotic-title")
    expect(ids.descId).toBe("chart-a-semiotic-desc")
    expect(ids.labelledBy).toBe("chart-a-semiotic-title chart-a-semiotic-desc")
    expect(overlayAccessibleIds(":r1:").titleId).toBe("_r1_-semiotic-title")
    expect(overlayAccessibleIds("12chart").titleId).toBe("c12chart-semiotic-title")
  })
})
