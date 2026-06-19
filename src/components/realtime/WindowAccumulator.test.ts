import {
  WindowAccumulator,
  statValue,
  bandBounds,
  type AggregatedWindow,
} from "./WindowAccumulator"

function byStart(rows: AggregatedWindow[]) {
  return rows.map(r => ({ start: r.start, ...r }))
}

describe("WindowAccumulator — tumbling", () => {
  it("buckets events into fixed-width windows and tracks full stats", () => {
    const acc = new WindowAccumulator({ window: "tumbling", size: 10 })
    acc.push(1, 2)
    acc.push(3, 4)
    acc.push(8, 6) // window [0,10): values 2,4,6
    acc.push(12, 10) // window [10,20): value 10

    const rows = acc.emit()
    expect(rows).toHaveLength(2)

    const [w0, w1] = rows
    expect(w0.start).toBe(0)
    expect(w0.end).toBe(10)
    expect(w0.count).toBe(3)
    expect(w0.sum).toBe(12)
    expect(w0.mean).toBeCloseTo(4, 9)
    expect(w0.min).toBe(2)
    expect(w0.max).toBe(6)

    expect(w1.start).toBe(10)
    expect(w1.count).toBe(1)
    expect(w1.sum).toBe(10)
  })

  it("is independent of event order", () => {
    const ordered = new WindowAccumulator({ size: 10 })
    const shuffled = new WindowAccumulator({ size: 10 })
    const events: [number, number][] = [
      [1, 5], [3, 7], [12, 2], [25, 9], [8, 1], [22, 4],
    ]
    events.forEach(([t, v]) => ordered.push(t, v))
    ;[...events].reverse().forEach(([t, v]) => shuffled.push(t, v))

    expect(byStart(ordered.emit())).toEqual(byStart(shuffled.emit()))
  })

  it("flags the trailing window as partial until the watermark passes its end", () => {
    const acc = new WindowAccumulator({ size: 10 })
    acc.push(5, 1) // window [0,10), watermark 5 < 10 → partial
    expect(acc.emit()[0].partial).toBe(true)

    acc.push(11, 1) // watermark 11 → [0,10) now complete, [10,20) partial
    const rows = acc.emit()
    expect(rows.find(r => r.start === 0)!.partial).toBe(false)
    expect(rows.find(r => r.start === 10)!.partial).toBe(true)
  })

  it("defaults to tumbling when no window type is given", () => {
    const acc = new WindowAccumulator({ size: 100 })
    acc.push(50, 1)
    acc.push(150, 2)
    expect(acc.windowCount).toBe(2)
  })
})

describe("WindowAccumulator — hopping", () => {
  it("places an event in every overlapping window", () => {
    // size 10, hop 5 → each event is in two windows (except edges).
    const acc = new WindowAccumulator({ window: "hopping", size: 10, hop: 5 })
    acc.push(7, 3)
    // windows containing t=7: starts in (7-10, 7] multiples of 5 → 0 and 5
    const rows = acc.emit()
    const starts = rows.map(r => r.start).sort((a, b) => a - b)
    expect(starts).toEqual([0, 5])
    rows.forEach(r => {
      expect(r.count).toBe(1)
      expect(r.sum).toBe(3)
    })
  })

  it("produces overlapping window means", () => {
    const acc = new WindowAccumulator({ window: "hopping", size: 10, hop: 5 })
    acc.push(2, 10) // in [0,10) only (start 0; start -5 excluded as negative? k from floor((2-10)/5)+1 = -1, to floor(2/5)=0)
    acc.push(7, 20) // in [0,10) and [5,15)
    const rows = acc.emit()
    const w0 = rows.find(r => r.start === 0)!
    const w5 = rows.find(r => r.start === 5)!
    expect(w0.count).toBe(2) // both events
    expect(w0.sum).toBe(30)
    expect(w5.count).toBe(1) // only t=7
    expect(w5.sum).toBe(20)
  })

  it("degenerates to tumbling when hop >= size", () => {
    const acc = new WindowAccumulator({ window: "hopping", size: 10, hop: 10 })
    acc.push(3, 1)
    acc.push(8, 2)
    expect(acc.windowCount).toBe(1)
    expect(acc.emit()[0].sum).toBe(3)
  })

  it("clamps an invalid hop to the window size", () => {
    const acc = new WindowAccumulator({ window: "hopping", size: 10, hop: 0 })
    acc.push(3, 1)
    acc.push(13, 2)
    expect(acc.windowCount).toBe(2) // behaves as tumbling
  })
})

describe("WindowAccumulator — session", () => {
  it("groups events within the gap into one session", () => {
    const acc = new WindowAccumulator({ window: "session", gap: 5, size: 0 })
    acc.push(0, 1)
    acc.push(3, 2) // within 5 of 0 → same session
    acc.push(4, 3) // within 5 of 3 → same session
    const rows = acc.emit()
    expect(rows).toHaveLength(1)
    expect(rows[0].start).toBe(0)
    expect(rows[0].end).toBe(4)
    expect(rows[0].count).toBe(3)
    expect(rows[0].sum).toBe(6)
  })

  it("starts a new session past the gap", () => {
    const acc = new WindowAccumulator({ window: "session", gap: 5, size: 0 })
    acc.push(0, 1)
    acc.push(20, 2) // gap > 5 → new session
    const rows = acc.emit()
    expect(rows).toHaveLength(2)
    expect(rows[0].start).toBe(0)
    expect(rows[1].start).toBe(20)
  })

  it("merges two sessions when a bridging event arrives", () => {
    const acc = new WindowAccumulator({ window: "session", gap: 5, size: 0 })
    acc.push(0, 1)
    acc.push(20, 2)
    expect(acc.emit()).toHaveLength(2)
    // 12 is within gap of both (20-12=8>5? no). Use a true bridge:
    acc.push(15, 3) // within 5 of 20; not of 0
    acc.push(12, 4) // within 5 of 15; bridges toward first? 12-0=12>5 no
    // Now sessions: {0}, {12,15,20}. Add a real bridge at 6 & 8 chain:
    acc.push(6, 5) // within 5 of 0? 6-0=6>5 no; within 5 of 12? 12-6=6>5 no → own session
    // Force a merge: event at 10 bridges {6} and {12,15,20}? 12-10=2<=5 yes, 10-6=4<=5 yes
    acc.push(10, 6)
    const rows = acc.emit()
    // {0}, and {6,10,12,15,20} merged
    const big = rows.find(r => r.start === 6)!
    expect(big.end).toBe(20)
    expect(big.count).toBe(5) // 6,10,12,15,20 events: values 5,6,3,4,2
    expect(big.sum).toBe(20)
  })

  it("is order-independent for sessions", () => {
    const a = new WindowAccumulator({ window: "session", gap: 5, size: 0 })
    const b = new WindowAccumulator({ window: "session", gap: 5, size: 0 })
    const events: [number, number][] = [[0, 1], [3, 2], [20, 3], [22, 4], [10, 5]]
    events.forEach(([t, v]) => a.push(t, v))
    ;[...events].reverse().forEach(([t, v]) => b.push(t, v))
    expect(byStart(a.emit())).toEqual(byStart(b.emit()))
  })
})

describe("WindowAccumulator — retention", () => {
  it("prunes to the most recent N tumbling windows", () => {
    const acc = new WindowAccumulator({ size: 10, retain: 3 })
    for (let t = 0; t < 100; t += 10) acc.push(t, 1)
    const rows = acc.emit()
    expect(rows).toHaveLength(3)
    expect(rows.map(r => r.start)).toEqual([70, 80, 90])
  })

  it("prunes the oldest sessions", () => {
    const acc = new WindowAccumulator({ window: "session", gap: 1, size: 0, retain: 2 })
    for (let t = 0; t < 50; t += 10) acc.push(t, 1) // each isolated session
    const rows = acc.emit()
    expect(rows).toHaveLength(2)
    expect(rows.map(r => r.start)).toEqual([30, 40])
  })
})

describe("WindowAccumulator — hygiene", () => {
  it("ignores non-finite time/value", () => {
    const acc = new WindowAccumulator({ size: 10 })
    acc.push(NaN, 1)
    acc.push(5, Infinity)
    acc.push(5, 3)
    expect(acc.windowCount).toBe(1)
    expect(acc.emit()[0].count).toBe(1)
  })

  it("clears state", () => {
    const acc = new WindowAccumulator({ size: 10 })
    acc.push(5, 1)
    acc.clear()
    expect(acc.windowCount).toBe(0)
    expect(acc.emit()).toHaveLength(0)
    expect(acc.watermark).toBe(-Infinity)
  })
})

describe("statValue / bandBounds", () => {
  const w: AggregatedWindow = {
    start: 0, end: 10, count: 4, mean: 10, sum: 40,
    min: 6, max: 16, stddev: 2, partial: false,
  }

  it("reads each stat", () => {
    expect(statValue(w, "mean")).toBe(10)
    expect(statValue(w, "sum")).toBe(40)
    expect(statValue(w, "min")).toBe(6)
    expect(statValue(w, "max")).toBe(16)
    expect(statValue(w, "count")).toBe(4)
  })

  it("computes stddev band around the chosen stat", () => {
    expect(bandBounds(w, "stddev", "mean", 1)).toEqual([8, 12])
    expect(bandBounds(w, "stddev", "mean", 2)).toEqual([6, 14])
  })

  it("computes minmax band", () => {
    expect(bandBounds(w, "minmax", "mean")).toEqual([6, 16])
  })

  it("returns null for no band", () => {
    expect(bandBounds(w, "none", "mean")).toBeNull()
  })
})
