import { describe, expect, it } from "vitest"
import {
  estimateBumpLabelWidth,
  resolveBumpLabelLayout,
  resolveBumpLabelSpace,
  truncateBumpLabel,
  type BumpLabelLayoutInput,
} from "./bumpLabelMargins"

const input = (overrides: Partial<BumpLabelLayoutInput> = {}): BumpLabelLayoutInput => ({
  labels: ["A", "B"],
  showLabels: true,
  width: 600,
  showAxes: true,
  rankCount: 2,
  yLabel: "Rank",
  ...overrides,
})
const width = (text: string) => estimateBumpLabelWidth(text, 12)

describe("estimateBumpLabelWidth", () => {
  it("tracks the drawn text instead of a flat per-character width", () => {
    // Chromium draws 12px "clickstream-enrichment" 135px wide in Arial.
    const measured = 135
    const estimate = width("clickstream-enrichment")
    expect(estimate).toBeGreaterThanOrEqual(measured)
    expect(estimate).toBeLessThan(measured * 1.15)
    expect(estimate).toBeLessThan("clickstream-enrichment".length * 12 * 0.65)
  })

  it("weighs narrow, wide, capital, and wide-script glyphs", () => {
    expect(width("iiii")).toBeLessThan(width("aaaa"))
    expect(width("aaaa")).toBeLessThan(width("AAAA"))
    expect(width("AAAA")).toBeLessThan(width("MMMM"))
    expect(width("É")).toBe(width("E"))
    expect(width("東京")).toBeGreaterThanOrEqual(2 * 12)
    expect(width("…")).toBeGreaterThanOrEqual(12 * 0.99)
    expect(estimateBumpLabelWidth("Northern", 20)).toBeCloseTo(width("Northern") * 20 / 12)
  })
})

describe("resolveBumpLabelLayout", () => {
  it("keeps today's margins for short labels", () => {
    expect(resolveBumpLabelLayout(input()).margin).toEqual({ top: 20, right: 110, bottom: 48, left: 48 })
    expect(resolveBumpLabelLayout(input({ showLabels: false })).margin).toEqual({ top: 20, right: 24, bottom: 48, left: 48 })
    expect(resolveBumpLabelLayout(input({ showLabels: "start" })).margin.right).toBe(110)
  })

  it("grows the end side to the widest label plus its gap and padding", () => {
    const long = "Northern Territories"
    const layout = resolveBumpLabelLayout(input({ labels: ["A", long] }))
    expect(layout.margin.right).toBeCloseTo(8 + width(long) + 4)
    expect(layout.margin.left).toBe(48)
  })

  it("clears the rank ticks and axis title on the start side", () => {
    const long = "Northern Territories"
    const layout = resolveBumpLabelLayout(input({ labels: [long], showLabels: "both", rankCount: 12 }))
    const tickWidth = width("12")
    expect(layout.startLabelOffset).toBeCloseTo(8 + tickWidth + 6)
    expect(layout.margin.left).toBeCloseTo(24 + 4 + width(long) + 8 + tickWidth + 6)
    const withoutAxes = resolveBumpLabelLayout(input({ labels: [long], showLabels: "start", showAxes: false }))
    expect(withoutAxes.startLabelOffset).toBe(8)
    expect(withoutAxes.margin.left).toBeCloseTo(4 + width(long) + 8)
  })

  it("caps each labeled side at 38% of the width", () => {
    const layout = resolveBumpLabelLayout(input({ labels: ["x".repeat(80)], showLabels: "both", width: 500 }))
    expect([layout.margin.left, layout.margin.right]).toEqual([190, 190])
  })

  it("estimates with a numeric label font size", () => {
    const layout = resolveBumpLabelLayout(input({ labels: ["Southeastern"], fontSize: 20 }))
    expect(layout.margin.right).toBeCloseTo(8 + estimateBumpLabelWidth("Southeastern", 20) + 4)
  })
})

describe("resolveBumpLabelLayout with a side legend", () => {
  it("fits the labels and the legend inside the legend side's cap, keeping a few glyphs", () => {
    const labels = ["Northern Territories", "Southern Highlands Region"]
    const alone = resolveBumpLabelLayout(input({ labels, width: 640 }))
    const shared = resolveBumpLabelLayout(input({ labels, width: 640, legendSide: "right" }))
    expect(shared.room.end).toBeLessThan(alone.room.end)
    expect(shared.room.end).toBeGreaterThanOrEqual(8 + 4 + width("MMM"))
    expect(shared.room.start).toBe(alone.room.start)
    const left = resolveBumpLabelLayout(input({ labels, width: 640, showLabels: "both", legendSide: "left" }))
    expect(left.room.start).toBeLessThan(resolveBumpLabelLayout(input({ labels, width: 640, showLabels: "both" })).room.start)
  })
})

describe("resolveBumpLabelSpace", () => {
  it("budgets the text inside the final margins and gutters a legend past it", () => {
    const layout = resolveBumpLabelLayout(input({ labels: ["Northern Territories"], showLabels: "both" }))
    const space = resolveBumpLabelSpace({ top: 20, right: 64, bottom: 48, left: layout.margin.left }, layout)
    expect(space.budget.end).toBe(64 - 12)
    expect(space.budget.start).toBeCloseTo(layout.labelWidth)
    expect(space.sideGutter.right).toBe(64)
    expect(space.sideGutter.left).toBeCloseTo(layout.margin.left)
  })

  it("leaves unlabeled sides without a budget or gutter", () => {
    const layout = resolveBumpLabelLayout(input())
    const space = resolveBumpLabelSpace(layout.margin, layout)
    expect(space.budget.start).toBe(0)
    expect(space.sideGutter.left).toBeUndefined()
  })
})

describe("truncateBumpLabel", () => {
  it("keeps labels that fit and shortens the rest with an ellipsis", () => {
    expect(truncateBumpLabel("North", 100, 12)).toEqual({ text: "North", truncated: false })
    const short = truncateBumpLabel("Northern Territories", 60, 12)
    expect(short.truncated).toBe(true)
    expect(short.text.endsWith("…")).toBe(true)
    expect(width(short.text)).toBeLessThanOrEqual(60)
    const kept = short.text.slice(0, -1)
    const next = "Northern Territories".slice(kept.length, kept.length + 1)
    expect(width(`${kept}${next}…`)).toBeGreaterThan(60)
  })
})
