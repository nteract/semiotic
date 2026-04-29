import { describe, it, expect } from "vitest"
import {
  schemeCategory10,
  interpolateBlues,
  interpolateViridis,
  interpolateTurbo,
  interpolateRdBu,
} from "./colorPalettes"

describe("colorPalettes — interpolator output shape", () => {
  it("emits `#rrggbb` (matching d3-color's effective Rgb#toString output)", () => {
    // Output format is load-bearing: the SSR snapshot tests assert on
    // hex, JSX `stroke=` consumers expect hex, and the previous d3
    // dependency stringified to hex via `Rgb#toString()` for opaque
    // colors. A drift to `rgb(r, g, b)` would silently break both.
    expect(interpolateBlues(0)).toMatch(/^#[0-9a-f]{6}$/)
    expect(interpolateBlues(0.5)).toMatch(/^#[0-9a-f]{6}$/)
    expect(interpolateBlues(1)).toMatch(/^#[0-9a-f]{6}$/)
  })

  it("clamps t outside [0,1] to the endpoints", () => {
    const start = interpolateBlues(0)
    const end = interpolateBlues(1)
    expect(interpolateBlues(-1)).toBe(start)
    expect(interpolateBlues(2)).toBe(end)
  })

  it("interpolates smoothly to the final endpoint (no flat last segment)", () => {
    // Regression: viridis and turbo previously had a duplicated final
    // stop, which left the last 1/N of the gradient flat (no color
    // change between the duplicated stops). With the duplicate
    // removed, t=1 differs from t=(N-1)/N for both palettes.
    expect(interpolateViridis(1)).not.toBe(interpolateViridis(0.85))
    expect(interpolateTurbo(1)).not.toBe(interpolateTurbo(0.85))
  })

  it("RdBu (diverging) hits roughly the documented endpoints", () => {
    // ColorBrewer RdBu: t=0 is `#67001f` (deep red), t=1 is `#053061`
    // (deep blue). Linear-RGB interp of the 11-stop palette lands on
    // those exact endpoints because t∈{0,1} hits stop[0] and stop[N].
    expect(interpolateRdBu(0)).toBe("#67001f")
    expect(interpolateRdBu(1)).toBe("#053061")
  })
})

describe("colorPalettes — categorical schemes", () => {
  it("schemeCategory10 has 10 hex strings", () => {
    expect(schemeCategory10).toHaveLength(10)
    for (const c of schemeCategory10) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it("schemeCategory10 first entry is the canonical Vega blue", () => {
    expect(schemeCategory10[0]).toBe("#1f77b4")
  })
})
