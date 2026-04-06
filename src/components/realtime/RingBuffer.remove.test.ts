import { RingBuffer } from "./RingBuffer"

describe("RingBuffer.update", () => {
  it("updates items matching predicate in place", () => {
    const buf = new RingBuffer<{ id: string; value: number }>(10)
    buf.push({ id: "a", value: 1 })
    buf.push({ id: "b", value: 2 })
    buf.push({ id: "c", value: 3 })

    const previous = buf.update(
      item => item.id === "b",
      item => ({ ...item, value: 99 })
    )

    expect(previous).toHaveLength(1)
    expect(previous[0].value).toBe(2) // old value
    expect(buf.toArray().find(d => d.id === "b")?.value).toBe(99) // new value
    expect(buf.size).toBe(3) // size unchanged
  })

  it("preserves buffer position (no compaction)", () => {
    const buf = new RingBuffer<{ id: string; value: number }>(10)
    buf.push({ id: "a", value: 1 })
    buf.push({ id: "b", value: 2 })
    buf.push({ id: "c", value: 3 })

    buf.update(item => item.id === "b", item => ({ ...item, value: 99 }))

    // Order preserved
    expect(buf.toArray().map(d => d.id)).toEqual(["a", "b", "c"])
  })

  it("returns empty when nothing matches", () => {
    const buf = new RingBuffer<{ id: string }>(10)
    buf.push({ id: "a" })

    const previous = buf.update(item => item.id === "z", item => item)
    expect(previous).toHaveLength(0)
  })

  it("works after circular wrap", () => {
    const buf = new RingBuffer<{ id: string; value: number }>(3)
    buf.push({ id: "a", value: 1 })
    buf.push({ id: "b", value: 2 })
    buf.push({ id: "c", value: 3 })
    buf.push({ id: "d", value: 4 }) // evicts "a"

    buf.update(item => item.id === "c", item => ({ ...item, value: 99 }))

    expect(buf.toArray().find(d => d.id === "c")?.value).toBe(99)
    expect(buf.size).toBe(3)
  })
})

describe("RingBuffer.remove", () => {
  it("removes items matching predicate", () => {
    const buf = new RingBuffer<{ id: string; value: number }>(10)
    buf.push({ id: "a", value: 1 })
    buf.push({ id: "b", value: 2 })
    buf.push({ id: "c", value: 3 })

    const removed = buf.remove(item => item.id === "b")

    expect(removed).toHaveLength(1)
    expect(removed[0].id).toBe("b")
    expect(buf.size).toBe(2)
    expect(buf.toArray().map(d => d.id)).toEqual(["a", "c"])
  })

  it("removes multiple items", () => {
    const buf = new RingBuffer<{ id: string }>(10)
    buf.push({ id: "a" })
    buf.push({ id: "b" })
    buf.push({ id: "c" })
    buf.push({ id: "d" })

    const ids = new Set(["a", "c"])
    const removed = buf.remove(item => ids.has(item.id))

    expect(removed).toHaveLength(2)
    expect(buf.size).toBe(2)
    expect(buf.toArray().map(d => d.id)).toEqual(["b", "d"])
  })

  it("returns empty array when nothing matches", () => {
    const buf = new RingBuffer<{ id: string }>(10)
    buf.push({ id: "a" })

    const removed = buf.remove(item => item.id === "z")

    expect(removed).toHaveLength(0)
    expect(buf.size).toBe(1)
  })

  it("works after buffer has wrapped (circular)", () => {
    const buf = new RingBuffer<{ id: string }>(3)
    buf.push({ id: "a" })
    buf.push({ id: "b" })
    buf.push({ id: "c" })
    buf.push({ id: "d" }) // evicts "a"

    expect(buf.size).toBe(3)
    const removed = buf.remove(item => item.id === "c")

    expect(removed).toHaveLength(1)
    expect(buf.size).toBe(2)
    expect(buf.toArray().map(d => d.id)).toEqual(["b", "d"])
  })

  it("can remove all items", () => {
    const buf = new RingBuffer<{ id: string }>(5)
    buf.push({ id: "a" })
    buf.push({ id: "b" })

    const removed = buf.remove(() => true)

    expect(removed).toHaveLength(2)
    expect(buf.size).toBe(0)
  })

  it("allows push after remove", () => {
    const buf = new RingBuffer<{ id: string }>(5)
    buf.push({ id: "a" })
    buf.push({ id: "b" })
    buf.push({ id: "c" })

    buf.remove(item => item.id === "b")
    buf.push({ id: "d" })

    expect(buf.size).toBe(3)
    expect(buf.toArray().map(d => d.id)).toEqual(["a", "c", "d"])
  })
})
