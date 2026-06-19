import {
  createAccumulator,
  aggregatedRows,
  hasBand,
  AGG_TIME,
  AGG_VALUE,
  AGG_LOWER,
  AGG_UPPER,
  AGG_COUNT,
  AGG_PARTIAL,
} from "./aggregate"

describe("createAccumulator", () => {
  it("parses duration strings for the window size", () => {
    const acc = createAccumulator({ window: "tumbling", size: "1m" })
    expect(acc).not.toBeNull()
    acc!.push(0, 1)
    acc!.push(30_000, 3) // same 1-minute window
    acc!.push(70_000, 5) // next window
    expect(acc!.windowCount).toBe(2)
  })

  it("returns null for an unparseable size", () => {
    expect(createAccumulator({ size: "nonsense" })).toBeNull()
    expect(createAccumulator({ size: 0 })).toBeNull()
  })

  it("uses gap as the width for session windows", () => {
    const acc = createAccumulator({ window: "session", size: 0, gap: "5s" })
    expect(acc).not.toBeNull()
    acc!.push(0, 1)
    acc!.push(3000, 2) // within 5s
    acc!.push(20_000, 3) // new session
    expect(acc!.windowCount).toBe(2)
  })
})

describe("aggregatedRows", () => {
  it("emits mean rows with window midpoint as time", () => {
    const acc = createAccumulator({ size: 10 })!
    acc.push(2, 10)
    acc.push(6, 20) // window [0,10): mean 15, midpoint 5
    const rows = aggregatedRows(acc, { size: 10, stat: "mean" })
    expect(rows).toHaveLength(1)
    expect(rows[0][AGG_TIME]).toBe(5)
    expect(rows[0][AGG_VALUE]).toBe(15)
    expect(rows[0][AGG_COUNT]).toBe(2)
    expect(rows[0][AGG_PARTIAL]).toBe(true)
  })

  it("honors the chosen stat", () => {
    const acc = createAccumulator({ size: 10 })!
    acc.push(2, 10)
    acc.push(6, 20)
    expect(aggregatedRows(acc, { size: 10, stat: "sum" })[0][AGG_VALUE]).toBe(30)
    expect(aggregatedRows(acc, { size: 10, stat: "max" })[0][AGG_VALUE]).toBe(20)
    expect(aggregatedRows(acc, { size: 10, stat: "min" })[0][AGG_VALUE]).toBe(10)
    expect(aggregatedRows(acc, { size: 10, stat: "count" })[0][AGG_VALUE]).toBe(2)
  })

  it("emits band bounds only when a band is configured", () => {
    const acc = createAccumulator({ size: 10 })!
    acc.push(2, 10)
    acc.push(6, 20)
    const plain = aggregatedRows(acc, { size: 10 })[0]
    expect(plain[AGG_LOWER]).toBeUndefined()
    expect(plain[AGG_UPPER]).toBeUndefined()

    const minmax = aggregatedRows(acc, { size: 10, band: "minmax" })[0]
    expect(minmax[AGG_LOWER]).toBe(10)
    expect(minmax[AGG_UPPER]).toBe(20)

    const stddev = aggregatedRows(acc, { size: 10, stat: "mean", band: "stddev", sigma: 1 })[0]
    // mean 15, population σ of {10,20} = 5
    expect(stddev[AGG_LOWER]).toBeCloseTo(10, 9)
    expect(stddev[AGG_UPPER]).toBeCloseTo(20, 9)
  })
})

describe("hasBand", () => {
  it("is false by default and for none", () => {
    expect(hasBand({ size: 10 })).toBe(false)
    expect(hasBand({ size: 10, band: "none" })).toBe(false)
  })
  it("is true for stddev/minmax", () => {
    expect(hasBand({ size: 10, band: "stddev" })).toBe(true)
    expect(hasBand({ size: 10, band: "minmax" })).toBe(true)
  })
})
