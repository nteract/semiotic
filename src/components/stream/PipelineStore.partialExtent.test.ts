/**
 * Regression coverage for partial `yExtent` overrides on chart-type-
 * specific extent paths.
 *
 * The stackedarea, bar+binSize, and waterfall branches replace
 * `yDomain` wholesale with their cumulative-sum / signed-bar geometry,
 * which historically dropped a user's `yExtent={[0, undefined]}`-style
 * partial bound on the floor. The fix re-applies the user's partial
 * bounds at the end of the extent pipeline; these tests pin the
 * behavior so a regression that strips the merge ships with a failing
 * gate.
 */
import { describe, it, expect } from "vitest"
import { PipelineStore } from "./PipelineStore"

describe("PipelineStore — partial yExtent override on chart-type-specific paths", () => {
  describe("stackedarea (cumulative-sum auto-extent)", () => {
    function buildStore(yExtent: [number | undefined, number | undefined] | undefined) {
      const store = new PipelineStore({
        chartType: "stackedarea",
        runtimeMode: "bounded",
        windowSize: 200,
        windowMode: "sliding",
        arrowOfTime: "right",
        extentPadding: 0,
        baseline: "zero",
        stackOrder: "key",
        xAccessor: "x",
        yAccessor: "y",
        groupAccessor: "g",
        ...(yExtent && { yExtent }),
      })
      // Two groups, summing to 30 at the peak.
      store.ingest({
        inserts: [
          { x: 0, g: "A", y: 5 },  { x: 1, g: "A", y: 10 }, { x: 2, g: "A", y: 15 },
          { x: 0, g: "B", y: 8 },  { x: 1, g: "B", y: 12 }, { x: 2, g: "B", y: 15 },
        ],
        bounded: true,
      })
      store.computeScene({ width: 400, height: 200 })
      return store
    }

    it("auto-fits both bounds when yExtent is omitted (cumulative-sum max wins)", () => {
      const store = buildStore(undefined)
      const [lo, hi] = store.scales!.y.domain() as [number, number]
      // Default zero baseline + max stacked total of 30.
      expect(lo).toBe(0)
      expect(hi).toBe(30)
    })

    it("respects yExtent=[min, undefined] — pins min, leaves max at cumulative-sum top", () => {
      const store = buildStore([-5, undefined])
      const [lo, hi] = store.scales!.y.domain() as [number, number]
      expect(lo).toBe(-5) // user-pinned, no longer 0
      expect(hi).toBe(30) // still cumulative-sum-derived
    })

    it("respects yExtent=[undefined, max] — pins max, leaves min at cumulative-sum baseline", () => {
      const store = buildStore([undefined, 100])
      const [lo, hi] = store.scales!.y.domain() as [number, number]
      expect(lo).toBe(0)   // still cumulative-sum-derived (zero baseline)
      expect(hi).toBe(100) // user-pinned, no longer 30
    })

    it("respects fully-specified yExtent (skips the chart-type branch entirely)", () => {
      const store = buildStore([-10, 50])
      const [lo, hi] = store.scales!.y.domain() as [number, number]
      expect(lo).toBe(-10)
      expect(hi).toBe(50)
    })
  })

  describe("waterfall (signed-bar auto-extent)", () => {
    function buildStore(yExtent: [number | undefined, number | undefined] | undefined) {
      const store = new PipelineStore({
        chartType: "waterfall",
        runtimeMode: "bounded",
        windowSize: 200,
        windowMode: "sliding",
        arrowOfTime: "right",
        extentPadding: 0,
        xAccessor: "x",
        yAccessor: "y",
        ...(yExtent && { yExtent }),
      })
      // Cumulative path: 0 → 10 → 25 → 15 → 5
      store.ingest({
        inserts: [
          { x: 0, y: 10 }, { x: 1, y: 15 }, { x: 2, y: -10 }, { x: 3, y: -10 },
        ],
        bounded: true,
      })
      store.computeScene({ width: 400, height: 200 })
      return store
    }

    it("respects yExtent=[min, undefined] — pins min, leaves max at cumulative top", () => {
      const store = buildStore([-100, undefined])
      const [lo, hi] = store.scales!.y.domain() as [number, number]
      expect(lo).toBe(-100) // user-pinned, no longer auto-extended to min(0, ...)
      expect(hi).toBe(25)   // cumulative max
    })

    it("respects yExtent=[undefined, max] — pins max, leaves min at signed baseline", () => {
      const store = buildStore([undefined, 100])
      const [lo, hi] = store.scales!.y.domain() as [number, number]
      // Waterfall always extends to include 0 unless user overrides;
      // here the cumulative path stays positive so lo==0 from auto.
      expect(lo).toBe(0)
      expect(hi).toBe(100) // user-pinned, no longer 25
    })
  })
})
