import { describe, expect, it } from "vitest"
import {
  compileMotionEncoding,
  deriveMotionVector,
  opacityFromAge,
  resolveMotionAccessor,
  resolveMotionAge,
  resolveMotionVector
} from "./motionEncoding"

describe("resolveMotionAccessor", () => {
  it("reads a field, calls a function, and unwraps a constant", () => {
    const row = { id: "a", value: 7 }
    expect(resolveMotionAccessor("value", row, 0)).toBe(7)
    expect(resolveMotionAccessor((d: typeof row) => d.value * 2, row, 0)).toBe(14)
    // The constant wrapper keeps literal strings from being read as field names.
    expect(resolveMotionAccessor({ constant: "value" }, row, 0)).toBe("value")
    expect(resolveMotionAccessor(undefined, row, 0)).toBeUndefined()
  })
})

describe("opacityFromAge", () => {
  it("linear ramps from full at age 0 to the floor at the extent", () => {
    expect(opacityFromAge({ age: 0, extent: 10, type: "linear", minOpacity: 0.1 })).toBeCloseTo(1)
    expect(opacityFromAge({ age: 10, extent: 10, type: "linear", minOpacity: 0.1 })).toBeCloseTo(0.1)
    expect(opacityFromAge({ age: 5, extent: 10, type: "linear", minOpacity: 0.1 })).toBeCloseTo(0.55)
  })

  it("exponential halves toward the floor every half-life", () => {
    const o = opacityFromAge({ age: 4, extent: 10, type: "exponential", halfLife: 4, minOpacity: 0 })
    expect(o).toBeCloseTo(0.5)
  })

  it("step holds full until the threshold, then drops to the floor", () => {
    expect(opacityFromAge({ age: 3, extent: 10, type: "step", threshold: 5, minOpacity: 0.2 })).toBe(1)
    expect(opacityFromAge({ age: 6, extent: 10, type: "step", threshold: 5, minOpacity: 0.2 })).toBe(0.2)
  })

  it("handles NaN, Infinity, and degenerate extents", () => {
    expect(opacityFromAge({ age: NaN, extent: 10, type: "linear" })).toBe(1)
    expect(opacityFromAge({ age: Infinity, extent: 10, type: "linear", minOpacity: 0.1 })).toBe(0.1)
    expect(opacityFromAge({ age: 5, extent: 0, type: "linear" })).toBe(1)
    // minOpacity is clamped into [0, 1].
    expect(opacityFromAge({ age: 10, extent: 10, type: "linear", minOpacity: 5 })).toBe(1)
  })
})

describe("compileMotionEncoding", () => {
  const data = [
    { id: "a", t: 100, x: 1, y: 2, vx: 3, vy: 4, stage: "queue", note: "first" },
    { id: "b", t: 200, x: 5, y: 6, vx: 0, vy: 0, stage: "done", note: "second" }
  ]

  it("resolves every channel and derives the accessible group from stage", () => {
    const { rows, byId } = compileMotionEncoding({
      data,
      encoding: {
        id: "id",
        time: { arrival: "t", basis: "event", unit: "milliseconds" },
        placement: { x: "x", y: "y", space: "data" },
        kinematics: { velocityX: "vx", velocityY: "vy" },
        process: { stage: "stage" },
        evidence: { note: "note" },
        accessible: { label: (d) => `Row ${d.id}` }
      }
    })
    expect(rows).toHaveLength(2)
    const a = byId.get("a")!
    expect(a.time).toMatchObject({ arrival: 100, basis: "event", unit: "milliseconds" })
    expect(a.placement).toMatchObject({ x: 1, y: 2, space: "data" })
    expect(a.kinematics).toMatchObject({ velocityX: 3, velocityY: 4 })
    expect(a.evidence.note).toBe("first")
    expect(a.accessible.label).toBe("Row a")
    // group falls back to process.stage when no explicit accessible.group.
    expect(a.accessible.group).toBe("queue")
  })

  it("defaults the accessible label to the id", () => {
    const { byId } = compileMotionEncoding({ data, encoding: { id: "id" } })
    expect(byId.get("a")!.accessible.label).toBe("a")
  })

  it("throws on an empty or duplicate id", () => {
    expect(() =>
      compileMotionEncoding({ data: [{ id: "" }], encoding: { id: "id" } })
    ).toThrow(/empty id/)
    expect(() =>
      compileMotionEncoding({ data: [{ id: "x" }, { id: "x" }], encoding: { id: "id" } })
    ).toThrow(/Duplicate/)
  })
})

describe("resolveMotionAge", () => {
  it("derives age, progress, and the lifecycle band from a common clock", () => {
    expect(resolveMotionAge({ now: 100, arrival: 90, ttl: 20 })).toMatchObject({
      age: 10,
      progress: 0.5,
      lifecycle: "fresh"
    })
    // age 40 against ttl 20: past 1.5×ttl (aging) but under 3×ttl (expired) → stale.
    expect(resolveMotionAge({ now: 130, arrival: 90, ttl: 20 }).lifecycle).toBe("stale")
  })
})

describe("motion vectors", () => {
  it("resolves speed and direction, and derives velocity over elapsed time", () => {
    const v = resolveMotionVector(3, 4)
    expect(v.speed).toBeCloseTo(5)
    expect(v.direction).toBeCloseTo(Math.atan2(4, 3))

    const derived = deriveMotionVector({ x: 0, y: 0 }, { x: 10, y: 0 }, 2)
    expect(derived.velocityX).toBe(5)
    // Non-positive elapsed yields a zero vector rather than dividing by zero.
    expect(deriveMotionVector({ x: 0, y: 0 }, { x: 10, y: 0 }, 0).speed).toBe(0)
  })
})
