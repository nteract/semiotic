import { describe, expect, it } from "vitest"
import { scaleLinear, scaleLog, scaleTime } from "d3-scale"
import {
  brushEdgeFlags,
  brushValueForKey,
  createBrush,
  createLinearBrushTrack,
  moveBrush,
  normalizeBrushValue,
  resizeBrush,
  snapBrushValue,
  type LinearBrushTrack,
} from "./linearBrushGeometry"

const track = createLinearBrushTrack({ domain: [0, 100], orientation: "x" })!
const keys = { step: 5, largeStep: 20, minSpan: 0, clearable: true }

describe("createLinearBrushTrack", () => {
  it("runs x left to right and y bottom to top, unless reversed", () => {
    expect([track.toFraction(25), track.fromFraction(0.25)]).toEqual([0.25, 25])
    const y = createLinearBrushTrack({ domain: [0, 100], orientation: "y" })!
    expect([y.toFraction(25), y.fromFraction(0), y.fromFraction(1)]).toEqual([0.75, 100, 0])
    const reversed = createLinearBrushTrack({ domain: [0, 100], orientation: "x", reverse: true })!
    expect(reversed.toFraction(25)).toBe(0.75)
  })

  it("follows a scale's range, including a y scale's inverted range", () => {
    const x = createLinearBrushTrack({ scale: scaleLinear().domain([10, 20]).range([0, 200]), orientation: "x" })!
    expect([x.min, x.max, x.toFraction(15), x.fromFraction(0.5)]).toEqual([10, 20, 0.5, 15])
    const y = createLinearBrushTrack({ scale: scaleLinear().domain([0, 50]).range([60, 0]), orientation: "y" })!
    expect(y.toFraction(40)).toBeCloseTo(0.2)
    expect([y.fromFraction(0), y.fromFraction(0.2), y.fromFraction(1)]).toEqual([50, 40, 0])
    const log = createLinearBrushTrack({ scale: scaleLog().domain([1, 100]).range([0, 100]), orientation: "x" })!
    expect(log.fromFraction(0.5)).toBeCloseTo(10)
  })

  it("inverts time scales to numbers", () => {
    const time = createLinearBrushTrack({
      scale: scaleTime().domain([new Date(0), new Date(1000)]).range([0, 100]),
      orientation: "x",
    })!
    expect(time.fromFraction(0.5)).toBe(500)
  })

  it("returns null for an empty or non-finite domain", () => {
    expect(createLinearBrushTrack({ domain: [5, 5], orientation: "x" })).toBeNull()
    expect(createLinearBrushTrack({ domain: [0, NaN], orientation: "x" })).toBeNull()
    expect(createLinearBrushTrack({ scale: scaleLinear().domain([0, 1]).range([0, 0]), orientation: "x" })).toBeNull()
    expect(createLinearBrushTrack({ orientation: "x" })).toBeNull()
  })
})

describe("brush values", () => {
  it("orders, coerces, and clamps a value into the domain", () => {
    expect(normalizeBrushValue([80, -10], track)).toEqual([0, 80])
    expect(normalizeBrushValue([NaN, 3], track)).toBeNull()
    expect(normalizeBrushValue(null, track)).toBeNull()
  })

  it("flags selections at the domain ends, and an empty one at both", () => {
    expect(brushEdgeFlags([0, 40], track)).toEqual({ atDomainStart: true, atDomainEnd: false })
    expect(brushEdgeFlags(null, track)).toEqual({ atDomainStart: true, atDomainEnd: true })
  })

  it("snaps to steps from the domain minimum", () => {
    const offset = createLinearBrushTrack({ domain: [3, 103], orientation: "x" })!
    expect(snapBrushValue(14.9, 5, offset)).toBe(13)
    expect(snapBrushValue(0.1 + 0.2, 0.1, track)).toBe(0.3)
  })
})

describe("pointer gestures", () => {
  it("resizes one end without crossing the other or leaving the domain", () => {
    expect(resizeBrush([20, 60], "start", 70, track, 5)).toEqual([55, 60])
    expect(resizeBrush([20, 60], "end", 150, track)).toEqual([20, 100])
    expect(resizeBrush([20, 60], "start", -5, track)).toEqual([0, 60])
  })

  it("moves a selection and stops flush at the domain ends", () => {
    expect(moveBrush([20, 40], 0.1, track)).toEqual([30, 50])
    expect(moveBrush([20, 40], 0.9, track)).toEqual([80, 100])
    expect(moveBrush([20, 40], -0.5, track)).toEqual([0, 20])
  })

  it("moves in track space on a y track", () => {
    const y = createLinearBrushTrack({ domain: [0, 100], orientation: "y" })!
    // Moving down the track lowers the values.
    expect(moveBrush([60, 80], 0.1, y)).toEqual([50, 70])
  })

  it("creates a selection at least minSpan wide, away from the anchor", () => {
    expect(createBrush(50, 30, track)).toEqual([30, 50])
    expect(createBrush(50, 51, track, 10)).toEqual([50, 60])
    expect(createBrush(95, 96, track, 10)).toEqual([90, 100])
    expect(createBrush(3, 1, track, 10)).toEqual([0, 10])
  })
})

describe("brushValueForKey", () => {
  const key = (part: "start" | "end" | "range", name: string, current: [number, number] | null, shift = false, t: LinearBrushTrack = track) =>
    brushValueForKey(part, name, shift, current, t, keys)?.value

  it("steps the range and each end, with Shift and PageUp/PageDown for large steps", () => {
    expect(key("range", "ArrowRight", [20, 40])).toEqual([25, 45])
    expect(key("range", "ArrowDown", [20, 40], true)).toEqual([0, 20])
    expect(key("start", "PageUp", [20, 40])).toEqual([40, 40])
    expect(key("end", "ArrowLeft", [20, 40])).toEqual([20, 35])
    expect(key("range", "ArrowRight", [90, 100])).toEqual([90, 100])
  })

  it("goes to the limits with Home and End, keeping ends minSpan apart", () => {
    const withSpan = { ...keys, minSpan: 10 }
    expect(brushValueForKey("range", "End", false, [20, 40], track, keys)?.value).toEqual([80, 100])
    expect(brushValueForKey("start", "End", false, [20, 40], track, withSpan)?.value).toEqual([30, 40])
    expect(brushValueForKey("end", "Home", false, [20, 40], track, withSpan)?.value).toEqual([20, 30])
  })

  it("starts from the middle fifth on an empty range, and from the domain on an end", () => {
    expect(key("range", "ArrowRight", null)).toEqual([45, 65])
    expect(key("end", "ArrowLeft", null)).toEqual([0, 95])
  })

  it("clears with Escape only when clearable and selected, and ignores other keys", () => {
    expect(brushValueForKey("range", "Escape", false, [20, 40], track, keys)).toEqual({ value: null })
    expect(brushValueForKey("range", "Escape", false, [20, 40], track, { ...keys, clearable: false })).toBeNull()
    expect(brushValueForKey("range", "Escape", false, null, track, keys)).toBeNull()
    expect(brushValueForKey("range", "a", false, [20, 40], track, keys)).toBeNull()
  })

  it("rounds away float noise from fractional steps", () => {
    const small = createLinearBrushTrack({ domain: [0, 1], orientation: "x" })!
    expect(brushValueForKey("start", "ArrowRight", false, [0.2, 0.9], small, { ...keys, step: 0.1 })?.value).toEqual([0.3, 0.9])
  })
})
