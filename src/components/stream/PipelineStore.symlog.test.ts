import { describe, expect, it } from "vitest"
import { PipelineStore } from "./PipelineStore"

describe("PipelineStore symlog scales", () => {
  it("uses a signed nonlinear value scale for streaming charts and preserves it on resize", () => {
    const store = new PipelineStore({
      chartType: "swarm",
      runtimeMode: "streaming",
      windowSize: 20,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      timeAccessor: "time",
      valueAccessor: "value",
      yExtent: [-1000, 1000],
      yScaleType: "symlog",
    })

    store.ingest({
      inserts: [
        { time: 1, value: -1000 },
        { time: 2, value: -10 },
        { time: 3, value: 0 },
        { time: 4, value: 10 },
        { time: 5, value: 1000 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 500, height: 300 })

    const y = store.scales!.y
    expect(y(0)).toBeCloseTo(150)
    expect(y(-10)).toBeGreaterThan(y(0))
    expect(y(10)).toBeLessThan(y(0))
    // A linear [-1000, 1000] scale would put ±10 only 1.5px from zero.
    expect(Math.abs(y(10) - y(0))).toBeGreaterThan(40)
    expect(y(-10) - y(0)).toBeCloseTo(y(0) - y(10))

    // A size-only scene recompute takes the remap path; it must not silently
    // replace symlog with linear.
    store.computeScene({ width: 800, height: 600 })
    const resizedY = store.scales!.y
    expect(resizedY(0)).toBeCloseTo(300)
    expect(Math.abs(resizedY(10) - resizedY(0))).toBeGreaterThan(80)
  })
})
