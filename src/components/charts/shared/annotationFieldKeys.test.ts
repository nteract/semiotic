import { describe, expect, it } from "vitest"
import { findAnnotationFieldTypos } from "./annotationFieldKeys"
import { diagnoseConfig } from "./diagnoseConfig"

describe("annotation field typos", () => {
  it("suggests the field a misspelled key most likely meant", () => {
    expect(findAnnotationFieldTypos([
      { type: "band", y0: 1, y1: 2, fil: "#eee" },
      { type: "y-threshold", value: 3, labelPositon: "right", Fill: "red" }
    ])).toEqual([
      { index: 0, type: "band", key: "fil", suggestion: "fill" },
      { index: 1, type: "y-threshold", key: "labelPositon", suggestion: "labelPosition" },
      { index: 1, type: "y-threshold", key: "Fill", suggestion: "fill" }
    ])
  })

  it("never reports data-field coordinates, accessor fields, or distant custom keys", () => {
    expect(findAnnotationFieldTypos(
      [{ type: "label", month: 3, revenue: 1200, val: 2, notes: "q3 launch", owner: "ops" }],
      { dataKeys: ["month", "revenue", "val"], accessorFields: ["notes"] }
    )).toEqual([])
  })

  it("surfaces as a diagnoseConfig warning", () => {
    const { diagnoses } = diagnoseConfig("LineChart", {
      data: [{ month: 1, revenue: 10 }, { month: 2, revenue: 12 }],
      xAccessor: "month",
      yAccessor: "revenue",
      annotations: [{ type: "label", month: 2, revenue: 12, label: "peak", colr: "red" }]
    })
    const finding = diagnoses.find((diagnosis) => diagnosis.code === "ANNOTATION_UNKNOWN_FIELD")
    expect(finding?.severity).toBe("warning")
    expect(finding?.message).toContain('"colr"')
    expect(finding?.fix).toContain('"color"')
  })
})
