import { computeBins, computeBinExtent } from "./BinAccumulator"

const getTime = (d: any) => d.time
const getValue = (d: any) => d.value

describe("computeBins", () => {
  it("places a single point in the correct bin", () => {
    const data = [{ time: 7, value: 3 }]
    const bins = computeBins(data, getTime, getValue, 10)

    expect(bins.size).toBe(1)
    const bin = bins.get(0)!
    expect(bin.start).toBe(0)
    expect(bin.end).toBe(10)
    expect(bin.total).toBe(3)
  })

  it("sums multiple points in the same bin", () => {
    const data = [
      { time: 1, value: 5 },
      { time: 3, value: 10 },
      { time: 8, value: 2 }
    ]
    const bins = computeBins(data, getTime, getValue, 10)

    expect(bins.size).toBe(1)
    expect(bins.get(0)!.total).toBe(17)
  })

  it("handles points spanning multiple bins", () => {
    const data = [
      { time: 5, value: 1 },
      { time: 15, value: 2 },
      { time: 25, value: 3 }
    ]
    const bins = computeBins(data, getTime, getValue, 10)

    expect(bins.size).toBe(3)
    expect(bins.get(0)!.total).toBe(1)
    expect(bins.get(10)!.total).toBe(2)
    expect(bins.get(20)!.total).toBe(3)
  })

  it("skips NaN points", () => {
    const data = [
      { time: 1, value: 5 },
      { time: NaN, value: 10 },
      { time: 3, value: NaN },
      { time: 7, value: 2 }
    ]
    const bins = computeBins(data, getTime, getValue, 10)

    expect(bins.size).toBe(1)
    expect(bins.get(0)!.total).toBe(7)
  })

  it("groups by category", () => {
    const data = [
      { time: 1, value: 5, cat: "errors" },
      { time: 2, value: 3, cat: "warnings" },
      { time: 3, value: 7, cat: "errors" }
    ]
    const getCat = (d: any) => d.cat
    const bins = computeBins(data, getTime, getValue, 10, getCat)

    const bin = bins.get(0)!
    expect(bin.total).toBe(15)
    expect(bin.categories.get("errors")).toBe(12)
    expect(bin.categories.get("warnings")).toBe(3)
  })

  it("does not populate categories when no getCategory provided", () => {
    const data = [{ time: 1, value: 5 }]
    const bins = computeBins(data, getTime, getValue, 10)

    expect(bins.get(0)!.categories.size).toBe(0)
  })
})

describe("computeBinExtent", () => {
  it("returns [0, maxBinTotal]", () => {
    const data = [
      { time: 1, value: 5 },
      { time: 2, value: 10 },
      { time: 15, value: 3 }
    ]
    const extent = computeBinExtent(data, getTime, getValue, 10)

    expect(extent).toEqual([0, 15])
  })

  it("returns [0, 0] for empty data", () => {
    const extent = computeBinExtent([], getTime, getValue, 10)
    expect(extent).toEqual([0, 0])
  })

  it("works with categories", () => {
    const data = [
      { time: 1, value: 5, cat: "a" },
      { time: 2, value: 10, cat: "b" },
      { time: 15, value: 20, cat: "a" }
    ]
    const getCat = (d: any) => d.cat
    const extent = computeBinExtent(data, getTime, getValue, 10, getCat)

    // bin 0 total = 15, bin 10 total = 20
    expect(extent).toEqual([0, 20])
  })
})
