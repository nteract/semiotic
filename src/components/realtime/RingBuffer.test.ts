import { RingBuffer } from "./RingBuffer"

describe("RingBuffer", () => {
  describe("construction", () => {
    it("creates a buffer with the given capacity", () => {
      const buf = new RingBuffer<number>(10)
      expect(buf.capacity).toBe(10)
      expect(buf.size).toBe(0)
      expect(buf.full).toBe(false)
    })

    it("throws on capacity 0", () => {
      expect(() => new RingBuffer(0)).toThrow()
    })

    it("throws on negative capacity", () => {
      expect(() => new RingBuffer(-1)).toThrow()
    })
  })

  describe("push single", () => {
    it("adds an item and increases size", () => {
      const buf = new RingBuffer<number>(5)
      const evicted = buf.push(42)
      expect(buf.size).toBe(1)
      expect(evicted).toBeUndefined()
    })

    it("returns undefined when not full", () => {
      const buf = new RingBuffer<number>(3)
      expect(buf.push(1)).toBeUndefined()
      expect(buf.push(2)).toBeUndefined()
    })
  })

  describe("push to capacity", () => {
    it("fills the buffer", () => {
      const buf = new RingBuffer<number>(3)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      expect(buf.size).toBe(3)
      expect(buf.full).toBe(true)
    })
  })

  describe("push past capacity (eviction)", () => {
    it("evicts oldest item and returns it", () => {
      const buf = new RingBuffer<number>(3)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      const evicted = buf.push(4)
      expect(evicted).toBe(1)
      expect(buf.size).toBe(3)
    })

    it("maintains correct order after wrapping", () => {
      const buf = new RingBuffer<number>(3)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      buf.push(4)
      buf.push(5)
      expect(buf.toArray()).toEqual([3, 4, 5])
    })
  })

  describe("iteration order", () => {
    it("iterates oldest to newest", () => {
      const buf = new RingBuffer<number>(5)
      buf.push(10)
      buf.push(20)
      buf.push(30)
      const result = [...buf]
      expect(result).toEqual([10, 20, 30])
    })

    it("iterates correctly after wrapping", () => {
      const buf = new RingBuffer<number>(3)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      buf.push(4)
      expect([...buf]).toEqual([2, 3, 4])
    })
  })

  describe("toArray", () => {
    it("returns empty array for empty buffer", () => {
      const buf = new RingBuffer<number>(5)
      expect(buf.toArray()).toEqual([])
    })

    it("returns items in oldest-to-newest order", () => {
      const buf = new RingBuffer<number>(4)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      expect(buf.toArray()).toEqual([1, 2, 3])
    })
  })

  describe("get()", () => {
    it("returns items by logical index (0 = oldest)", () => {
      const buf = new RingBuffer<number>(5)
      buf.push(10)
      buf.push(20)
      buf.push(30)
      expect(buf.get(0)).toBe(10)
      expect(buf.get(1)).toBe(20)
      expect(buf.get(2)).toBe(30)
    })

    it("returns undefined for out-of-bounds index", () => {
      const buf = new RingBuffer<number>(5)
      buf.push(1)
      expect(buf.get(1)).toBeUndefined()
      expect(buf.get(-1)).toBeUndefined()
    })

    it("works correctly across wrap boundary", () => {
      const buf = new RingBuffer<number>(3)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      buf.push(4) // evicts 1, wraps
      buf.push(5) // evicts 2, wraps
      expect(buf.get(0)).toBe(3)
      expect(buf.get(1)).toBe(4)
      expect(buf.get(2)).toBe(5)
    })
  })

  describe("peek and peekOldest", () => {
    it("peek returns newest item", () => {
      const buf = new RingBuffer<number>(5)
      buf.push(10)
      buf.push(20)
      expect(buf.peek()).toBe(20)
    })

    it("peekOldest returns oldest item", () => {
      const buf = new RingBuffer<number>(5)
      buf.push(10)
      buf.push(20)
      expect(buf.peekOldest()).toBe(10)
    })

    it("both return undefined for empty buffer", () => {
      const buf = new RingBuffer<number>(5)
      expect(buf.peek()).toBeUndefined()
      expect(buf.peekOldest()).toBeUndefined()
    })

    it("works after wrapping", () => {
      const buf = new RingBuffer<number>(2)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      expect(buf.peekOldest()).toBe(2)
      expect(buf.peek()).toBe(3)
    })
  })

  describe("pushMany", () => {
    it("pushes multiple items at once", () => {
      const buf = new RingBuffer<number>(5)
      const evicted = buf.pushMany([1, 2, 3])
      expect(buf.size).toBe(3)
      expect(buf.toArray()).toEqual([1, 2, 3])
      expect(evicted).toEqual([])
    })

    it("returns evicted items on overflow", () => {
      const buf = new RingBuffer<number>(3)
      buf.push(1)
      buf.push(2)
      const evicted = buf.pushMany([3, 4, 5])
      expect(evicted).toEqual([1, 2])
      expect(buf.toArray()).toEqual([3, 4, 5])
    })

    it("handles pushMany larger than capacity", () => {
      const buf = new RingBuffer<number>(3)
      const evicted = buf.pushMany([1, 2, 3, 4, 5])
      expect(buf.toArray()).toEqual([3, 4, 5])
      expect(evicted).toEqual([1, 2])
    })
  })

  describe("clear", () => {
    it("resets buffer to empty", () => {
      const buf = new RingBuffer<number>(5)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      buf.clear()
      expect(buf.size).toBe(0)
      expect(buf.full).toBe(false)
      expect(buf.toArray()).toEqual([])
    })
  })

  describe("resize", () => {
    it("resize larger keeps all items", () => {
      const buf = new RingBuffer<number>(3)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      const evicted = buf.resize(5)
      expect(evicted).toEqual([])
      expect(buf.capacity).toBe(5)
      expect(buf.toArray()).toEqual([1, 2, 3])
    })

    it("resize smaller evicts oldest items", () => {
      const buf = new RingBuffer<number>(5)
      buf.push(1)
      buf.push(2)
      buf.push(3)
      buf.push(4)
      buf.push(5)
      const evicted = buf.resize(3)
      expect(evicted).toEqual([1, 2])
      expect(buf.capacity).toBe(3)
      expect(buf.toArray()).toEqual([3, 4, 5])
    })

    it("resize throws on invalid capacity", () => {
      const buf = new RingBuffer<number>(5)
      expect(() => buf.resize(0)).toThrow()
    })
  })

  describe("capacity 1 edge case", () => {
    it("works with capacity of 1", () => {
      const buf = new RingBuffer<number>(1)
      expect(buf.push(1)).toBeUndefined()
      expect(buf.full).toBe(true)
      expect(buf.push(2)).toBe(1)
      expect(buf.peek()).toBe(2)
      expect(buf.peekOldest()).toBe(2)
      expect(buf.toArray()).toEqual([2])
    })
  })
})
