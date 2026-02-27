import { IncrementalExtent } from "./IncrementalExtent"

describe("IncrementalExtent", () => {
  describe("empty state", () => {
    it("has Infinity/-Infinity extent when empty", () => {
      const ext = new IncrementalExtent()
      expect(ext.min).toBe(Infinity)
      expect(ext.max).toBe(-Infinity)
      expect(ext.dirty).toBe(false)
    })
  })

  describe("single push", () => {
    it("sets both min and max to the value", () => {
      const ext = new IncrementalExtent()
      ext.push(42)
      expect(ext.min).toBe(42)
      expect(ext.max).toBe(42)
      expect(ext.extent).toEqual([42, 42])
    })
  })

  describe("expanding pushes", () => {
    it("expands extent when new values exceed bounds", () => {
      const ext = new IncrementalExtent()
      ext.push(10)
      ext.push(5)
      ext.push(20)
      expect(ext.min).toBe(5)
      expect(ext.max).toBe(20)
      expect(ext.extent).toEqual([5, 20])
    })
  })

  describe("push within bounds", () => {
    it("does not change extent", () => {
      const ext = new IncrementalExtent()
      ext.push(0)
      ext.push(100)
      ext.push(50) // within bounds
      expect(ext.min).toBe(0)
      expect(ext.max).toBe(100)
    })
  })

  describe("evict non-extreme", () => {
    it("does not set dirty flag", () => {
      const ext = new IncrementalExtent()
      ext.push(0)
      ext.push(50)
      ext.push(100)
      ext.evict(50) // not min or max
      expect(ext.dirty).toBe(false)
    })
  })

  describe("evict min", () => {
    it("sets dirty flag", () => {
      const ext = new IncrementalExtent()
      ext.push(0)
      ext.push(50)
      ext.push(100)
      ext.evict(0) // is the min
      expect(ext.dirty).toBe(true)
    })
  })

  describe("evict max", () => {
    it("sets dirty flag", () => {
      const ext = new IncrementalExtent()
      ext.push(0)
      ext.push(50)
      ext.push(100)
      ext.evict(100) // is the max
      expect(ext.dirty).toBe(true)
    })
  })

  describe("recalculate", () => {
    it("clears dirty flag and recalculates from values", () => {
      const ext = new IncrementalExtent()
      ext.push(0)
      ext.push(50)
      ext.push(100)
      ext.evict(0) // dirty
      expect(ext.dirty).toBe(true)
      ext.recalculate([50, 100])
      expect(ext.dirty).toBe(false)
      expect(ext.min).toBe(50)
      expect(ext.max).toBe(100)
    })

    it("supports accessor function", () => {
      const ext = new IncrementalExtent()
      ext.push(10)
      ext.push(20)
      ext.evict(10)
      const data = [{ v: 15 }, { v: 25 }]
      ext.recalculate(data, (d: any) => d.v)
      expect(ext.min).toBe(15)
      expect(ext.max).toBe(25)
      expect(ext.dirty).toBe(false)
    })
  })

  describe("clear", () => {
    it("resets to empty state", () => {
      const ext = new IncrementalExtent()
      ext.push(10)
      ext.push(20)
      ext.clear()
      expect(ext.min).toBe(Infinity)
      expect(ext.max).toBe(-Infinity)
      expect(ext.dirty).toBe(false)
    })
  })

  describe("all-same-values edge case", () => {
    it("handles all same values", () => {
      const ext = new IncrementalExtent()
      ext.push(5)
      ext.push(5)
      ext.push(5)
      expect(ext.min).toBe(5)
      expect(ext.max).toBe(5)
      ext.evict(5) // is both min and max
      expect(ext.dirty).toBe(true)
    })
  })

  describe("NaN handling", () => {
    it("ignores NaN values in push", () => {
      const ext = new IncrementalExtent()
      ext.push(10)
      ext.push(NaN)
      ext.push(20)
      expect(ext.min).toBe(10)
      expect(ext.max).toBe(20)
    })
  })
})
