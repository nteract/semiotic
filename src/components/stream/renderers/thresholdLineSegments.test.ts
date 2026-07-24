import { describe, expect, it } from "vitest"
import { buildThresholdLineSegments } from "./thresholdLineSegments"

describe("buildThresholdLineSegments", () => {
  it("interpolates every crossing and keeps the normal stroke below the first band", () => {
    const segments = buildThresholdLineSegments(
      [[0, 100], [100, 0]],
      [0, 100],
      [
        { value: 25, color: "#warning", thresholdType: "greater" },
        { value: 75, color: "#critical", thresholdType: "greater" },
      ],
      "#base",
    )

    expect(segments.map(({ color }) => color)).toEqual(["#base", "#warning", "#critical"])
    expect(segments[0].path).toEqual([[0, 100], [25, 75]])
    expect(segments[1].path).toEqual([[25, 75], [75, 25]])
    expect(segments[2].path).toEqual([[75, 25], [100, 0]])
  })

  it("handles a path vertex that lands exactly on a threshold", () => {
    const segments = buildThresholdLineSegments(
      [[0, 100], [50, 50], [100, 0]],
      [0, 50, 100],
      [{ value: 50, color: "#high", thresholdType: "greater" }],
      "#base",
    )

    expect(segments.map(({ color }) => color)).toEqual(["#base", "#high"])
    expect(segments[0].path.at(-1)).toEqual([50, 50])
    expect(segments[1].path[0]).toEqual([50, 50])
  })
})
