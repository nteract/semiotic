import { describe, it, expect } from "vitest"
import { hasAnyCornerRadius, clampCornerRadii } from "./cornerRadii"
import type { RectSceneNode } from "../types"

function makeRect(cornerRadii?: RectSceneNode["cornerRadii"]): RectSceneNode {
  return {
    type: "rect",
    x: 0, y: 0, w: 100, h: 40,
    style: { fill: "#000" },
    datum: {},
    ...(cornerRadii && { cornerRadii }),
  }
}

describe("hasAnyCornerRadius", () => {
  it("returns true when any corner has a positive radius", () => {
    expect(hasAnyCornerRadius({ tl: 4 })).toBe(true)
    expect(hasAnyCornerRadius({ tr: 0, br: 5, bl: 0 })).toBe(true)
  })

  it("returns false when every corner is zero or missing", () => {
    expect(hasAnyCornerRadius({})).toBe(false)
    expect(hasAnyCornerRadius({ tl: 0, tr: 0, br: 0, bl: 0 })).toBe(false)
  })
})

describe("clampCornerRadii", () => {
  it("returns all zeros when cornerRadii is absent", () => {
    expect(clampCornerRadii(makeRect())).toEqual({ tl: 0, tr: 0, br: 0, bl: 0 })
  })

  it("clamps each corner to min(w, h) / 2", () => {
    // limit = min(100, 40) / 2 = 20
    const out = clampCornerRadii(makeRect({ tl: 30, tr: 5, br: 100, bl: 12 }))
    expect(out).toEqual({ tl: 20, tr: 5, br: 20, bl: 12 })
  })

  it("clamps negative radii to 0 instead of letting them through", () => {
    // Without the lower-bound clamp, the renderer's moveTo / lineTo
    // math would offset start points into invalid space (the path
    // would visibly bend outward), even though the arcTo calls are
    // gated on radius > 0. Reject the input cleanly here.
    const out = clampCornerRadii(makeRect({ tl: -5, tr: -1, br: -100, bl: -0.5 }))
    expect(out).toEqual({ tl: 0, tr: 0, br: 0, bl: 0 })
  })

  it("mixed positive / negative / out-of-range values all clamp correctly", () => {
    // limit = 20; -5 → 0, 30 → 20, 8 → 8 (unchanged), unset → 0.
    const out = clampCornerRadii(makeRect({ tl: -5, tr: 30, br: 8 }))
    expect(out).toEqual({ tl: 0, tr: 20, br: 8, bl: 0 })
  })
})
