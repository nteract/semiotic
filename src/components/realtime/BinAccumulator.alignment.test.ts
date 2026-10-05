import { describe, expect, it } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import { computeBins } from "./BinAccumulator"

const time = (d: Datum) => d.time
const value = (d: Datum) => d.value

describe("centered temporal bins", () => {
  it("uses half-open centered boundaries, including negative timestamps and provenance", () => {
    const rows = [-15, -5, 0, 4.99, 5, 10, 15].map((t) => ({
      time: t,
      value: 1,
      category: "a"
    }))
    const bins = computeBins(
      rows,
      time,
      value,
      10,
      (d) => d.category,
      true,
      "center"
    )
    expect([...bins.keys()]).toEqual([-15, -5, 5, 15])
    expect(
      [...bins.values()].map((bin) => [bin.start, bin.end, bin.total])
    ).toEqual([
      [-15, -5, 1],
      [-5, 5, 3],
      [5, 15, 2],
      [15, 25, 1]
    ])
    expect(bins.get(-5)?.categories.get("a")).toBe(3)
    expect(bins.get(-5)?.rows).toEqual(rows.slice(1, 4))
    expect(bins.get(-5)?.categoryRows?.get("a")).toEqual(rows.slice(1, 4))
  })

  it("preserves default start-aligned aggregation", () => {
    const rows = [0, 5, 10].map((t) => ({ time: t, value: 1 }))
    expect(
      [...computeBins(rows, time, value, 10).values()].map((bin) => [
        bin.start,
        bin.total
      ])
    ).toEqual([
      [0, 2],
      [10, 1]
    ])
  })
})
