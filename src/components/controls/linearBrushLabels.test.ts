import { describe, expect, it } from "vitest"
import { createLinearBrushTrack } from "./linearBrushGeometry"
import { estimateBrushLabelSize, formatBrushValue, placeLinearBrushLabels } from "./linearBrushLabels"

const track = createLinearBrushTrack({ domain: [0, 100], orientation: "x" })!
// 11px labels: 6.6px per glyph.
const layout = (value: [number, number], extra: Partial<Parameters<typeof placeLinearBrushLabels>[0]> = {}) =>
  placeLinearBrushLabels({ value, track, length: 400, orientation: "x", format: (v) => `v${v}`, fontSize: 11, ...extra })
const summary = (labels: ReturnType<typeof layout>) => labels.map(({ kind, placement, row }) => [kind, placement, row])

describe("formatBrushValue", () => {
  it("keeps at most two decimals and normalizes negative zero", () => {
    expect([formatBrushValue(12.3456), formatBrushValue(1700000000000), formatBrushValue(-0.001), formatBrushValue(NaN)])
      .toEqual(["12.35", "1700000000000", "0", ""])
  })
})

describe("estimateBrushLabelSize", () => {
  it("measures the longest line on x and the line stack on y", () => {
    expect(estimateBrushLabelSize(["Jan 1", "12:00:00"], "x", 10)).toBe(8 * 10 * 0.6)
    expect(estimateBrushLabelSize(["Jan 1", "12:00:00"], "y", 10)).toBe(2 * 12)
    expect(estimateBrushLabelSize(["anything"], "x", 10, 12, 50)).toBe(50)
  })
})

describe("placeLinearBrushLabels", () => {
  it("puts the start label before its handle and the end label after", () => {
    const labels = layout([25, 75])
    expect(summary(labels)).toEqual([["start", "before", 0], ["end", "after", 0]])
    expect([labels[0].to, labels[1].from]).toEqual([100, 300])
  })

  it("flips labels inward at the bounds", () => {
    expect(summary(layout([1, 99]))).toEqual([["start", "after", 0], ["end", "before", 0]])
    // Wider bounds (a chart's margins) leave room outside the track.
    expect(summary(layout([1, 99], { bounds: [-40, 440] }))).toEqual([["start", "before", 0], ["end", "after", 0]])
  })

  it("steps the second label down a row when the two collide", () => {
    expect(summary(layout([1, 3]))).toEqual([["start", "after", 0], ["end", "after", 1]])
  })

  it("orders by track position on a y track", () => {
    const y = createLinearBrushTrack({ domain: [0, 100], orientation: "y" })!
    const labels = placeLinearBrushLabels({ value: [25, 75], track: y, length: 400, orientation: "y", format: String, fontSize: 10 })
    // The end (75) is nearer the top, so it comes first and sits above its handle.
    expect(summary(labels)).toEqual([["end", "before", 0], ["start", "after", 0]])
  })

  it("adds domain labels only where they fit beside the extent labels", () => {
    expect(summary(layout([40, 60], { showDomainLabels: true }))).toEqual([
      ["domain-start", "after", 0], ["domain-end", "before", 0], ["start", "before", 0], ["end", "after", 0],
    ])
    // "v5" fits before its handle at 20px, but leaves no room for "v0".
    expect(summary(layout([5, 60], { showDomainLabels: true }))).toEqual([
      ["domain-end", "before", 0], ["start", "before", 0], ["end", "after", 0],
    ])
  })
})
