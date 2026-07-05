import { describe, expect, it } from "vitest"
import { mobileAnnotationStrategy } from "./mobileAnnotationStrategy"
import type { Datum } from "../charts/shared/datumTypes"

describe("mobileAnnotationStrategy", () => {
  it("keeps labeled structural annotations in the plot instead of moving them to callouts", () => {
    const annotations: Datum[] = [
      { type: "y-threshold", y: 10, label: "Target" },
      { type: "label", x: 1, y: 2, label: "Primary note", emphasis: "primary" },
      { type: "label", x: 2, y: 3, label: "Secondary note" },
    ]

    const result = mobileAnnotationStrategy(annotations, {
      active: true,
      strategy: "callout-list",
      maxPlotAnnotations: 1,
    })

    expect(result.visible.some((annotation) => annotation.type === "y-threshold")).toBe(true)
    expect(result.calloutList.map((item) => item.label)).toEqual(["Secondary note"])
  })
})
