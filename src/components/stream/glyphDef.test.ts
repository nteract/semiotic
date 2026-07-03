import { describe, expect, it } from "vitest"
import {
  glyphExtent,
  glyphFractionClipRect,
  glyphPlacement,
  resolveGlyphPaint,
} from "./glyphDef"
import type { GlyphDef } from "./glyphDef"

const SQUARE: GlyphDef = { parts: [{ d: "M0 0h40v40H0z" }] }
const WIDE: GlyphDef = {
  viewBox: [80, 40],
  anchor: [0.5, 1],
  parts: [{ d: "M0 0h80v40H0z" }],
}

describe("glyphPlacement", () => {
  it("sizes by height and keeps the viewBox aspect", () => {
    const placement = glyphPlacement(WIDE, 20)
    expect(placement.height).toBe(20)
    expect(placement.width).toBe(40)
    expect(placement.scale).toBe(0.5)
  })

  it("honors the anchor: bottom-center feet land on the node point", () => {
    const placement = glyphPlacement(WIDE, 20)
    expect(placement.offsetX).toBe(-20)
    expect(placement.offsetY).toBe(-20)
  })

  it("defaults to a centered 40×40 definition", () => {
    const placement = glyphPlacement(SQUARE, 40)
    expect(placement.width).toBe(40)
    expect(placement.offsetX).toBe(-20)
    expect(placement.offsetY).toBe(-20)
  })
})

describe("glyphExtent", () => {
  it("bounds a centered glyph by its half-diagonal", () => {
    expect(glyphExtent(SQUARE, 40)).toBeCloseTo(Math.sqrt(20 * 20 + 20 * 20))
  })

  it("reaches the far corners of an anchored glyph", () => {
    // Bottom-anchored: the top corners are the farthest points.
    expect(glyphExtent(WIDE, 20)).toBeCloseTo(Math.sqrt(20 * 20 + 20 * 20))
  })
})

describe("resolveGlyphPaint", () => {
  it("maps role tokens onto the node's paints", () => {
    expect(resolveGlyphPaint("color", "#d72f3f", "#fffdf4")).toBe("#d72f3f")
    expect(resolveGlyphPaint("accent", "#d72f3f", "#fffdf4")).toBe("#fffdf4")
    expect(resolveGlyphPaint(undefined, "#d72f3f", "#fffdf4")).toBe("#d72f3f")
    expect(resolveGlyphPaint("none", "#d72f3f", "#fffdf4")).toBeUndefined()
    expect(resolveGlyphPaint("#123456", "#d72f3f", "#fffdf4")).toBe("#123456")
  })

  it("falls back when the node has no color", () => {
    expect(resolveGlyphPaint("color", undefined, undefined, "#000")).toBe("#000")
  })
})

describe("glyphFractionClipRect", () => {
  it("returns null when no clipping is needed", () => {
    expect(glyphFractionClipRect(SQUARE, 1)).toBeNull()
    expect(glyphFractionClipRect(SQUARE, 1.4, -2)).toBeNull()
  })

  it("clips horizontally from the left by default", () => {
    expect(glyphFractionClipRect(SQUARE, 0.56)).toEqual({
      x: 0,
      y: 0,
      width: 40 * 0.56,
      height: 40,
    })
  })

  it("supports a fraction window for range boundary signs", () => {
    const rect = glyphFractionClipRect(SQUARE, 1, 0.5)
    expect(rect).toEqual({ x: 20, y: 0, width: 20, height: 40 })
  })

  it("clips vertical fills from the bottom", () => {
    const rect = glyphFractionClipRect(SQUARE, 0.25, 0, "vertical")
    expect(rect).toEqual({ x: 0, y: 30, width: 40, height: 10 })
  })

  it("collapses inverted windows to zero", () => {
    expect(glyphFractionClipRect(SQUARE, 0.2, 0.6)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
  })
})
