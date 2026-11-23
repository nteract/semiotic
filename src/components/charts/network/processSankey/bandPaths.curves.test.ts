import { describe, expect, it } from "vitest"
import { buildBandPath } from "./bandPaths"

const sample = (
  t: number,
  topMass: number,
  botMass: number,
  boundaryOffset = 0
) => ({ t, topMass, botMass, boundaryOffset })
const identity = (x: number) => x

describe("ProcessSankey inventory contours", () => {
  const events = [
    sample(0, 1, 2),
    sample(4, 1, 2),
    sample(4, 3, 5),
    sample(8, 3, 5)
  ]
  const original = "M0,9 L4,9 L4,7 L8,7 L8,15 L4,15 L4,12 L0,12 Z"

  it("preserves the discrete event on the default and straight paths", () => {
    expect(buildBandPath(events, 10, 1, identity, null)).toBe(original)
    expect(buildBandPath(events, 10, 1, identity, null, "straight")).toBe(
      original
    )
  })

  it("maintains each attachment and the observed inventory at interval midpoints", () => {
    expect(buildBandPath(events, 10, 1, identity, null, "smooth")).toBe(
      "M0,9 L2,9 C3,9 3,7 4,7 L6,7 L8,7 L8,15 L6,15 L4,15 C3,15 3,12 2,12 L0,12 Z"
    )
  })

  it("keeps the edges paired while a narrow ribbon crosses its centerline", () => {
    const samples = [sample(0, 1, 1, -5), sample(0.001, 2, 2, 6)]
    const path = buildBandPath(samples, 0, 1, identity, null, "smooth")
    expect(path).toBe(
      "M0,-6 C0.0005,-6 0.0005,4 0.001,4 L0.001,8 C0.0005,8 0.0005,-4 0,-4 Z"
    )
    // Both edges share x(t). Their separation is a convex blend of the two endpoint widths.
    const segments = [...path!.matchAll(/C([^ ]+) ([^ ]+) ([^ ]+)/g)].map(
      (match) => match.slice(1).map((pair) => Number(pair.split(",")[1]))
    )
    const top = [-6, ...segments[0]]
    const bottom = [8, ...segments[1]].reverse()
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const d = top.map((y, i) => bottom[i] - y)
      const width =
        (1 - t) ** 3 * d[0] +
        3 * t * (1 - t) ** 2 * d[1] +
        3 * (1 - t) * t * t * d[2] +
        t ** 3 * d[3]
      expect(width).toBeGreaterThanOrEqual(2)
      expect(width).toBeLessThanOrEqual(4)
    }
  })

  it("retains zero-width gaps, degenerate end sections and competing simultaneous slots", () => {
    expect(buildBandPath([], 0, 1, identity, null, "smooth")).toBeNull()
    expect(
      buildBandPath([sample(3, 0, 0)], 10, 1, identity, null, "smooth")
    ).toBe("M3,10 L3,10 Z")
    const gap = [
      sample(0, 2, 0),
      sample(0, 0, 0),
      sample(4, 0, 0),
      sample(4, 0, 3)
    ]
    expect(buildBandPath(gap, 0, 1, identity, null, "smooth")).toBe(
      "M0,-2 L0,0 L2,0 L4,0 L4,0 L4,3 L4,0 L2,0 L0,0 L0,0 Z"
    )
    const coincident = [sample(-2, 2, 0), sample(-1, 0, 3)]
    expect(buildBandPath(coincident, 0, 1, identity, [0, 1], "smooth")).toBe(
      "M0,-2 L0,0 L0,3 L0,0 Z"
    )
  })
})
