import { ReorderBuffer } from "./ReorderBuffer"

interface Pt { t: number; v: number }
const getTime = (p: Pt) => p.t

describe("ReorderBuffer", () => {
  it("releases in-order events once they exit the grace window", () => {
    const rb = new ReorderBuffer<Pt>({ lateness: 5, getTime })
    // t=0 held (watermark 0, threshold -5)
    expect(rb.push({ t: 0, v: 1 }).released).toEqual([])
    // t=10 advances watermark to 10, threshold 5 → t=0 released
    const r = rb.push({ t: 10, v: 2 })
    expect(r.released.map(p => p.t)).toEqual([0])
    expect(rb.heldCount).toBe(1) // t=10 still held
  })

  it("reorders out-of-order arrivals into event-time order", () => {
    const rb = new ReorderBuffer<Pt>({ lateness: 10, getTime })
    // Arrive jumbled but within grace; nothing released yet.
    rb.push({ t: 5, v: 1 })
    rb.push({ t: 2, v: 2 })
    rb.push({ t: 8, v: 3 })
    // Push far ahead to flush the grace window: watermark 30, threshold 20.
    const r = rb.push({ t: 30, v: 4 })
    expect(r.released.map(p => p.t)).toEqual([2, 5, 8]) // sorted by event time
  })

  it("counts and drops late events by default", () => {
    const rb = new ReorderBuffer<Pt>({ lateness: 5, getTime })
    rb.push({ t: 100, v: 1 }) // watermark 100, threshold 95
    const r = rb.push({ t: 50, v: 2 }) // 50 < 95 → late
    expect(r.released).toEqual([]) // dropped
    expect(r.late.map(p => p.t)).toEqual([50])
    expect(rb.lateCount).toBe(1)
  })

  it("keeps late events when policy is keep", () => {
    const rb = new ReorderBuffer<Pt>({ lateness: 5, getTime, latePolicy: "keep" })
    rb.push({ t: 100, v: 1 })
    const r = rb.push({ t: 50, v: 2 }) // late
    expect(r.released.map(p => p.t)).toEqual([50]) // emitted out of order
    expect(r.late.map(p => p.t)).toEqual([50])
    expect(rb.lateCount).toBe(1)
  })

  it("does not treat the first event as late", () => {
    const rb = new ReorderBuffer<Pt>({ lateness: 5, getTime })
    const r = rb.push({ t: 1000, v: 1 })
    expect(r.late).toEqual([])
    expect(rb.lateCount).toBe(0)
  })

  it("passes through events with non-finite time without reordering", () => {
    const rb = new ReorderBuffer<Pt>({ lateness: 5, getTime })
    const r = rb.push({ t: NaN, v: 1 })
    expect(r.released).toHaveLength(1)
    expect(r.late).toEqual([])
  })

  it("flush releases everything held in order", () => {
    const rb = new ReorderBuffer<Pt>({ lateness: 100, getTime })
    rb.push({ t: 5, v: 1 })
    rb.push({ t: 1, v: 2 })
    rb.push({ t: 3, v: 3 })
    expect(rb.heldCount).toBe(3)
    expect(rb.flush().map(p => p.t)).toEqual([1, 3, 5])
    expect(rb.heldCount).toBe(0)
  })

  it("clear resets watermark and counters", () => {
    const rb = new ReorderBuffer<Pt>({ lateness: 5, getTime })
    rb.push({ t: 100, v: 1 })
    rb.push({ t: 50, v: 2 }) // late
    rb.clear()
    expect(rb.lateCount).toBe(0)
    expect(rb.heldCount).toBe(0)
    expect(rb.watermark).toBe(-Infinity)
    // After clear, a new event is not late.
    expect(rb.push({ t: 10, v: 3 }).late).toEqual([])
  })

  it("preserves all released events across a full ordered stream", () => {
    const rb = new ReorderBuffer<Pt>({ lateness: 3, getTime })
    const arrivals = [0, 2, 1, 4, 3, 6, 5, 9, 8, 7, 20]
    const released: number[] = []
    arrivals.forEach((t, i) => {
      released.push(...rb.push({ t, v: i }).released.map(p => p.t))
    })
    released.push(...rb.flush().map(p => p.t))
    // Nothing was late (all within 3ms jitter), everything emitted, sorted.
    expect(released).toEqual([...arrivals].sort((a, b) => a - b))
    expect(rb.lateCount).toBe(0)
  })
})
