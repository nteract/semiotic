import { describe, expect, it } from "vitest"
import { FirstAvailableTrack } from "./firstAvailableTrack"
import { packIntervals } from "./intervals"
import { packSpanLevels } from "./sequenceLayout"

describe("FirstAvailableTrack", () => {
  it("chooses the first free track, even when a later track ended earlier", () => {
    const tracks = new FirstAvailableTrack()
    expect(tracks.assign(0, 10)).toBe(0)
    expect(tracks.assign(0, 5)).toBe(1)
    expect(tracks.assign(10, 20)).toBe(0)
    expect(tracks.assign(10, 15)).toBe(1)
    expect(tracks.count).toBe(2)
  })

  it("supports backwards starts and replacing an end with an earlier value", () => {
    const tracks = new FirstAvailableTrack()
    expect(tracks.assign(0, 10)).toBe(0)
    expect(tracks.assign(1, 20)).toBe(1)
    expect(tracks.assign(20, 2)).toBe(0)
    expect(tracks.assign(3, 4)).toBe(0)
    expect(tracks.assign(-10, -5)).toBe(2)
    expect(tracks.assign(-5, 0)).toBe(2)
    expect(tracks.count).toBe(3)
  })

  it("distinguishes NaN ends, infinite ends, and unused capacity", () => {
    const tracks = new FirstAvailableTrack()
    expect(tracks.assign(0, NaN)).toBe(0)
    expect(tracks.assign(0, Infinity)).toBe(1)
    expect(tracks.assign(Infinity, Infinity)).toBe(1)
    expect(tracks.assign(NaN, -Infinity)).toBe(2)
    expect(tracks.assign(-Infinity, 0)).toBe(2)
    expect(tracks.assign(Infinity, NaN)).toBe(1)
    expect(tracks.assign(Infinity, NaN)).toBe(2)
    expect(tracks.assign(Infinity, 1)).toBe(3)
    expect(tracks.count).toBe(4)
  })

  it("preserves track order through growth and reuse of every track", () => {
    const tracks = new FirstAvailableTrack()
    for (let i = 0; i < 1025; i++) expect(tracks.assign(0, 10)).toBe(i)
    for (let i = 0; i < 1025; i++) expect(tracks.assign(10, 20)).toBe(i)
    expect(tracks.assign(5, 15)).toBe(1025)
    expect(tracks.count).toBe(1026)
  })

  it("matches a linear first-fit reference across varied update orders", () => {
    let seed = 12345
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    const value = () => {
      const exceptional = [NaN, Infinity, -Infinity]
      return random() < 0.1
        ? exceptional[Math.floor(random() * exceptional.length)]
        : Math.floor(random() * 100) - 50
    }
    for (let trial = 0; trial < 20; trial++) {
      const tracks = new FirstAvailableTrack()
      const ends: number[] = []
      for (let i = 0; i < 500; i++) {
        const start = value()
        const end = value()
        let expected = ends.findIndex((lastEnd) => lastEnd <= start)
        if (expected === -1) expected = ends.length
        ends[expected] = end
        expect(tracks.assign(start, end)).toBe(expected)
        expect(tracks.count).toBe(ends.length)
      }
    }
  })
})

describe("public track packers", () => {
  it("preserves unsorted interval input order and item references", () => {
    const items = Object.freeze([
      { start: 5, end: 10 },
      { start: 0, end: 2 },
      { start: 10, end: 20 },
      { start: 3, end: 4 }
    ])
    const { packed, trackCount } = packIntervals(items, { sort: false })
    expect(packed.map((row) => row.track)).toEqual([0, 1, 0, 1])
    packed.forEach((row, i) => expect(row.item).toBe(items[i]))
    expect(trackCount).toBe(2)
  })

  it("keeps longest-first sorting and reuses a track at a shared endpoint", () => {
    const items = [
      { start: 2, end: 3 },
      { start: 0, end: 1 },
      { start: 0, end: 2 }
    ]
    const result = packIntervals(items)
    expect(result.packed.map(({ item, track }) => [item.end, track])).toEqual([
      [2, 0],
      [1, 1],
      [3, 0]
    ])
    expect(result.trackCount).toBe(2)
  })

  it("normalizes reversed spans and packs shorter arcs before longer arcs", () => {
    const spans = [
      { id: "long", a: 10, b: 0 },
      { id: "left", a: 0, b: 2 },
      { id: "right", a: 4, b: 2 },
      { id: "point", a: 3, b: 3 }
    ]
    const { packed, levelCount, maxLevel } = packSpanLevels(spans)
    expect(packed.map(({ span, level }) => [span.id, level])).toEqual([
      ["point", 0],
      ["left", 1],
      ["right", 1],
      ["long", 2]
    ])
    expect(packed[3].span).toBe(spans[0])
    expect(levelCount).toBe(3)
    expect(maxLevel).toBe(2)
  })

  it("retains the minimum row count for empty input", () => {
    expect(packIntervals([])).toEqual({ packed: [], trackCount: 1 })
    expect(packSpanLevels([])).toEqual({
      packed: [],
      levelCount: 1,
      maxLevel: 0
    })
  })
})
