import { describe, expect, it } from "vitest"
import { assessAxisLabelBoxes } from "./axisLabelAssessment"

describe("painted axis label assessment", () => {
  it("reports collisions within each axis and overflow with bounded identifiers", () => {
    const labels = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      axis: "bottom",
      box: { x: 90, y: 0, width: 20, height: 12 }
    }))
    const result = assessAxisLabelBoxes(labels, {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })
    expect(result.collisions).toBe(435)
    expect(result.overflows).toBe(30)
    expect(result.findings.every((f) => f.labelIds.length <= 20)).toBe(true)
    expect(result.findings.map((f) => f.code)).toEqual([
      "LABEL_COLLISION",
      "LABEL_OVERFLOW"
    ])
  })

  it("uses one-pixel tolerance and discloses unmeasured custom tick geometry", () => {
    const result = assessAxisLabelBoxes(
      [
        {
          id: "a",
          axis: "bottom",
          box: { x: -0.5, y: 0, width: 20, height: 12 }
        },
        { id: "b", axis: "bottom", box: { x: 19, y: 0, width: 20, height: 12 } }
      ],
      { x: 0, y: 0, width: 100, height: 100 },
      1
    )
    expect(result).toMatchObject({
      status: "incomplete",
      checked: 2,
      unsupported: 1,
      collisions: 0,
      overflows: 0
    })
  })
})
