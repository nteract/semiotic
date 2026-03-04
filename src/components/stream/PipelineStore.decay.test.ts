import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "scatter",
    windowSize: 10,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    ...overrides
  }
}

describe("PipelineStore — Decay", () => {
  describe("computeDecayOpacity", () => {
    it("returns 1 for all items when no decay config", () => {
      const store = new PipelineStore(makeConfig())
      expect(store.computeDecayOpacity(0, 10)).toBe(1)
      expect(store.computeDecayOpacity(9, 10)).toBe(1)
    })

    it("linear decay: newest=1, oldest=minOpacity", () => {
      const store = new PipelineStore(makeConfig({
        decay: { type: "linear", minOpacity: 0.1 }
      }))
      // bufferIndex 9 = newest, bufferIndex 0 = oldest
      expect(store.computeDecayOpacity(9, 10)).toBe(1)
      expect(store.computeDecayOpacity(0, 10)).toBeCloseTo(0.1)
      // midpoint
      const mid = store.computeDecayOpacity(5, 10)
      expect(mid).toBeGreaterThan(0.1)
      expect(mid).toBeLessThan(1)
    })

    it("exponential decay: newest=1, oldest approaches minOpacity", () => {
      const store = new PipelineStore(makeConfig({
        decay: { type: "exponential", halfLife: 5, minOpacity: 0.1 }
      }))
      const newest = store.computeDecayOpacity(9, 10)
      expect(newest).toBe(1)

      // At half-life distance from newest (index 4, age=5):
      const atHalfLife = store.computeDecayOpacity(4, 10)
      // Should be ~0.5 * 0.9 + 0.1 = 0.55
      expect(atHalfLife).toBeCloseTo(0.55, 1)

      const oldest = store.computeDecayOpacity(0, 10)
      expect(oldest).toBeGreaterThanOrEqual(0.1)
      expect(oldest).toBeLessThan(0.55)
    })

    it("step decay: above threshold=1, below threshold=minOpacity", () => {
      const store = new PipelineStore(makeConfig({
        decay: { type: "step", stepThreshold: 5, minOpacity: 0.2 }
      }))
      // Newest 5 items (age < 5) should be fully opaque
      expect(store.computeDecayOpacity(9, 10)).toBe(1) // age=0
      expect(store.computeDecayOpacity(5, 10)).toBe(1) // age=4
      // Older items (age >= 5) should be minOpacity
      expect(store.computeDecayOpacity(4, 10)).toBe(0.2) // age=5
      expect(store.computeDecayOpacity(0, 10)).toBe(0.2) // age=9
    })

    it("returns 1 for single item buffer", () => {
      const store = new PipelineStore(makeConfig({
        decay: { type: "linear" }
      }))
      expect(store.computeDecayOpacity(0, 1)).toBe(1)
    })
  })

  describe("decay applied to scene nodes", () => {
    it("modifies point opacity based on buffer position", () => {
      const store = new PipelineStore(makeConfig({
        chartType: "scatter",
        decay: { type: "linear", minOpacity: 0 },
        xAccessor: "x",
        yAccessor: "y"
      }))

      // Push 5 points
      const data = Array.from({ length: 5 }, (_, i) => ({ x: i, y: i }))
      store.ingest({ inserts: data, bounded: true })
      store.computeScene({ width: 100, height: 100 })

      const points = store.scene.filter(n => n.type === "point")
      expect(points.length).toBe(5)

      // Newest point should have highest opacity
      const opacities = points.map(p => p.type === "point" ? (p.style.opacity ?? 1) : 1)
      // The last point pushed is the newest (highest index in buffer)
      // With linear decay from 0 to 1, opacity should increase with buffer index
      for (let i = 1; i < opacities.length; i++) {
        expect(opacities[i]).toBeGreaterThanOrEqual(opacities[i - 1])
      }
    })
  })
})
