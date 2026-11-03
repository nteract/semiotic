import { describe, it, expect } from "vitest"
import * as palettes from "./colorPalettes"
import {
  schemeCategory10,
  interpolateBlues,
  interpolateViridis,
  interpolateTurbo,
  interpolateRdBu,
  getSequentialInterpolator,
} from "./colorPalettes"

// Exact paint fixtures cover endpoints, fractional channel rounding,
// leading zeroes, and channel boundaries.
const interpolationSamples = {
  interpolateBlues: ["#f7fbff", "#f1f7fd", "#abd0e6", "#6baed6", "#083877", "#08306b"],
  interpolateBrBG: ["#543005", "#663a07", "#e7cf94", "#f5f5f5", "#00493e", "#003c30"],
  interpolateCividis: ["#00224e", "#062859", "#5f646f", "#8a8678", "#ffe942", "#ffea46"],
  interpolateGreens: ["#f7fcf5", "#f3faf0", "#aedea7", "#74c476", "#004e1f", "#00441b"],
  interpolateGreys: ["#ffffff", "#fbfbfb", "#c6c6c6", "#969696", "#090909", "#000000"],
  interpolateInferno: ["#000004", "#070315", "#781c6c", "#bc3754", "#faf387", "#fcffa4"],
  interpolateMagma: ["#000004", "#060414", "#711f80", "#b73779", "#fdefb1", "#fcfdbf"],
  interpolateOranges: ["#fff5eb", "#fff1e4", "#fdb97d", "#fd8d3c", "#892b04", "#7f2704"],
  interpolatePRGn: ["#40004b", "#510d5d", "#ceb5d7", "#f7f7f7", "#085424", "#00441b"],
  interpolatePiYG: ["#8e0152", "#9f095f", "#f5c4e1", "#f7f7f7", "#33721c", "#276419"],
  interpolatePlasma: ["#0d0887", "#1d078e", "#9a179d", "#cb4679", "#f4ec22", "#f0f921"],
  interpolatePurples: ["#fcfbfd", "#f9f8fb", "#c6c7e1", "#9e9ac8", "#440a82", "#3f007d"],
  interpolateRdBu: ["#67001f", "#7e0823", "#f7b799", "#f7f7f7", "#0e4178", "#053061"],
  interpolateRdYlBu: ["#a50026", "#b50f26", "#fdbf71", "#ffffbf", "#374a9f", "#313695"],
  interpolateRdYlGn: ["#a50026", "#b50f26", "#fdbf6f", "#ffffbf", "#08773f", "#006837"],
  interpolateReds: ["#fff5f0", "#fff0e9", "#fca082", "#fb6a4a", "#77040f", "#67000d"],
  interpolateSpectral: ["#9e0142", "#af1446", "#fdbf6f", "#ffffbf", "#5061aa", "#5e4fa2"],
  interpolateTurbo: ["#23171b", "#2e2952", "#46c7af", "#a6ef47", "#8f1004", "#7a0403"],
  interpolateViridis: ["#440154", "#450c5e", "#31688e", "#23908c", "#e9e427", "#fde725"]
} as const

describe("colorPalettes — interpolator output shape", () => {
  it.each(Object.entries(interpolationSamples))("preserves %s paints and boundary handling", (name, expected) => {
    const interpolate = palettes[name as keyof typeof interpolationSamples]
    expect([0, 0.03125, 1 / 3, 0.5, 0.96875, 1].map(interpolate)).toEqual(expected)
    for (const value of [NaN, -Infinity, -1, -0]) expect(interpolate(value)).toBe(expected[0])
    for (const value of [Infinity, 2]) expect(interpolate(value)).toBe(expected[5])
  })

  it("emits Semiotic's `#rrggbb` output format", () => {
    // Output format is load-bearing: the SSR snapshot tests assert on
    // hex and JSX `stroke=` consumers expect the same format. A drift to
    // `rgb(r, g, b)` would silently break those established expectations.
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

  it.each(["__proto__", "constructor", "toString"])(
    "falls back for prototype-like sequential scheme %s",
    (scheme) => {
      const interpolator = getSequentialInterpolator(scheme)
      expect(interpolator).toBe(interpolateBlues)
      expect(interpolator(0.5)).toMatch(/^#[0-9a-f]{6}$/)
    }
  )
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
