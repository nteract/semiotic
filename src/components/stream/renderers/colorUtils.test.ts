import { describe, it, expect } from "vitest"
import { parseCanvasColor } from "./colorUtils"

/**
 * Fake canvas context focused on `fillStyle` round-tripping. Real browsers
 * normalize valid CSS color assignments (hex/named/hsl → hex or rgba) and
 * silently ignore invalid ones, leaving fillStyle at the previous value.
 * We simulate both behaviors so the tests don't need a real canvas.
 */
function makeCtx(initial: string | object = "#000000") {
  let fillStyle: string | object = initial
  return {
    get fillStyle() { return fillStyle },
    set fillStyle(v: string | object) {
      if (typeof v === "object" && v !== null) {
        // CanvasGradient / CanvasPattern — accept as-is.
        fillStyle = v
        return
      }
      if (typeof v !== "string") return
      const s = v.trim().toLowerCase()
      // Valid hex — normalize to canonical #rrggbb.
      const hex6 = s.match(/^#([0-9a-f]{6})$/)
      if (hex6) { fillStyle = `#${hex6[1]}` ; return }
      const hex3 = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
      if (hex3) { fillStyle = `#${hex3[1]}${hex3[1]}${hex3[2]}${hex3[2]}${hex3[3]}${hex3[3]}` ; return }
      // A handful of named colors (enough for our tests).
      const named: Record<string, string> = {
        red: "#ff0000", blue: "#0000ff", steelblue: "#4682b4", black: "#000000",
      }
      if (s in named) { fillStyle = named[s] ; return }
      // rgb(r,g,b) — accept and normalize to a uniform rgba string like Firefox.
      const rgb = s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
      if (rgb) { fillStyle = `rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})` ; return }
      // Anything else — reject silently (browser behavior).
    },
  } as unknown as CanvasRenderingContext2D
}

describe("parseCanvasColor", () => {
  it("parses #rrggbb hex", () => {
    expect(parseCanvasColor(makeCtx(), "#4e79a7")).toEqual([78, 121, 167])
  })

  it("expands #rgb short-form via canvas normalization", () => {
    expect(parseCanvasColor(makeCtx(), "#f00")).toEqual([255, 0, 0])
  })

  it("resolves named colors", () => {
    expect(parseCanvasColor(makeCtx(), "steelblue")).toEqual([70, 130, 180])
  })

  it("parses rgb() strings", () => {
    expect(parseCanvasColor(makeCtx(), "rgb(200, 100, 50)")).toEqual([200, 100, 50])
  })

  it("returns the fallback for invalid color strings, even when prev was a string", () => {
    // Previous fillStyle is a valid color. An invalid assignment leaves
    // fillStyle at that string. A naive round-trip would mis-parse as the
    // prior color; the sentinel probe prevents that.
    const ctx = makeCtx("#abcdef")
    expect(parseCanvasColor(ctx, "not a color")).toEqual([78, 121, 167])
  })

  it("returns the fallback when prev fillStyle is a non-string (CanvasGradient)", () => {
    const ctx = makeCtx({ __kind: "gradient" })
    expect(parseCanvasColor(ctx, "not a color")).toEqual([78, 121, 167])
  })

  it("restores the previous fillStyle after the probe", () => {
    const ctx = makeCtx("#abcdef")
    parseCanvasColor(ctx, "steelblue")
    expect(ctx.fillStyle).toBe("#abcdef")
  })

  it("parses the sentinel itself as a valid color (no false rejection)", () => {
    // #010203 is used internally as the rejection sentinel. Make sure a user
    // actually passing that color doesn't get the fallback.
    expect(parseCanvasColor(makeCtx(), "#010203")).toEqual([1, 2, 3])
  })
})
