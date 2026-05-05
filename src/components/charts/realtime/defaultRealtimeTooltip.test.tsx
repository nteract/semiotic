/**
 * Regression coverage for the Realtime HOCs' default tooltip.
 *
 * `buildDefaultRealtimeTooltip` reads the raw datum off `hover.data`
 * using the configured `timeAccessor` / `valueAccessor`. This test
 * pins:
 *   - default field-name lookup ("time" / "value")
 *   - explicit string accessor lookup
 *   - function accessor lookup
 *   - graceful fallback when `hover.data` is null
 */
import * as React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { buildDefaultRealtimeTooltip, buildWaterfallTooltip, buildHeatmapTooltip } from "./defaultRealtimeTooltip"
import type { HoverData } from "../../realtime/types"

function fakeHover(overrides: Partial<HoverData> = {}): HoverData {
  return {
    data: { time: 42, value: 87.5 },
    x: 240,
    y: 128,
    ...overrides,
  } as HoverData
}

describe("buildDefaultRealtimeTooltip", () => {
  it("reads the default `time` / `value` fields from hover.data", () => {
    const Tooltip = buildDefaultRealtimeTooltip()
    const { container } = render(<>{Tooltip(fakeHover())}</>)
    const text = container.textContent ?? ""
    expect(text).toContain("42")
    expect(text).toContain("87.50")
  })

  it("honors a string accessor", () => {
    const Tooltip = buildDefaultRealtimeTooltip({
      timeAccessor: "t" as unknown as never,
      valueAccessor: "v" as unknown as never,
    })
    const { container } = render(
      <>{Tooltip(fakeHover({ data: { t: 7, v: 13 } as Record<string, unknown> }))}</>,
    )
    const text = container.textContent ?? ""
    expect(text).toContain("7")
    expect(text).toContain("13")
  })

  it("honors a function accessor", () => {
    const Tooltip = buildDefaultRealtimeTooltip({
      timeAccessor: ((d: { meta: { ts: number } }) => d.meta.ts) as unknown as never,
      valueAccessor: ((d: { reading: number }) => d.reading * 2) as unknown as never,
    })
    const { container } = render(
      <>{Tooltip(fakeHover({ data: { meta: { ts: 9 }, reading: 50 } as Record<string, unknown> }))}</>,
    )
    const text = container.textContent ?? ""
    // Function accessor result for x.
    expect(text).toContain("9")
    // Function accessor result for y (50 * 2 = 100).
    expect(text).toContain("100")
  })

  it("renders both labeled lines so users can read off x AND y", () => {
    const Tooltip = buildDefaultRealtimeTooltip()
    const { container } = render(<>{Tooltip(fakeHover())}</>)
    expect(container.textContent).toMatch(/x:\s*42/)
    expect(container.textContent).toMatch(/y:\s*87\.50/)
  })

  it("falls back gracefully when hover.data is null (mid-clear, hover-anywhere mode)", () => {
    const Tooltip = buildDefaultRealtimeTooltip()
    expect(() =>
      render(<>{Tooltip(fakeHover({ data: null }))}</>),
    ).not.toThrow()
  })
})

describe("buildWaterfallTooltip", () => {
  it("surfaces time + delta + cumulative total when the enriched fields are present", () => {
    // Mirrors the shape `waterfallScene.buildWaterfallScene` puts on
    // each rect's datum: `{ ...d, baseline, cumEnd, delta }`.
    const Tooltip = buildWaterfallTooltip()
    const hoverData = {
      data: { time: 12, value: 5.2, baseline: 82.2, cumEnd: 87.4, delta: 5.2 },
      x: 240,
      y: 100,
    } as HoverData
    const { container } = render(<>{Tooltip(hoverData)}</>)
    const text = container.textContent ?? ""
    expect(text).toMatch(/x:\s*12/)
    // Positive delta is sign-prefixed so direction is unambiguous.
    expect(text).toMatch(/Δ:\s*\+5\.20/)
    expect(text).toMatch(/total:\s*87\.40/)
  })

  it("renders negative deltas with their sign, no extra plus", () => {
    const Tooltip = buildWaterfallTooltip()
    const hoverData = {
      data: { time: 4, value: -3.1, baseline: 50, cumEnd: 46.9, delta: -3.1 },
      x: 80,
      y: 100,
    } as HoverData
    const { container } = render(<>{Tooltip(hoverData)}</>)
    const text = container.textContent ?? ""
    expect(text).toMatch(/Δ:\s*-3\.10/)
    expect(text).not.toMatch(/Δ:\s*\+/)
  })

  it("omits the total row when cumEnd is missing (non-waterfall fallback)", () => {
    // A consumer that builds a waterfall HOC against a datum source
    // that doesn't go through the scene-level enrichment (or a stale
    // first-render frame) shouldn't crash — it just degrades to a
    // plain x/Δ display.
    const Tooltip = buildWaterfallTooltip()
    const hoverData = {
      data: { time: 1, value: 2.5 },
      x: 0,
      y: 0,
    } as HoverData
    const { container } = render(<>{Tooltip(hoverData)}</>)
    const text = container.textContent ?? ""
    expect(text).toMatch(/x:\s*1/)
    expect(text).toMatch(/Δ:\s*\+2\.50/)
    expect(text).not.toMatch(/total:/)
  })

  it("honors timeAccessor / valueAccessor for the x and delta fallback fields", () => {
    const Tooltip = buildWaterfallTooltip({
      timeAccessor: "ts" as unknown as never,
      valueAccessor: "change" as unknown as never,
    })
    const hoverData = {
      data: { ts: 100, change: 7, baseline: 0, cumEnd: 7, delta: 7 },
      x: 0,
      y: 0,
    } as HoverData
    const { container } = render(<>{Tooltip(hoverData)}</>)
    const text = container.textContent ?? ""
    // `delta` (sourced from the enriched scene datum) wins over the
    // valueAccessor-resolved field when both are present, because
    // they should be equal — and prefering the scene-enriched copy
    // means a future renderer that adjusts delta semantics (e.g.
    // smoothed display delta) flows through automatically.
    expect(text).toMatch(/x:\s*100/)
    expect(text).toMatch(/Δ:\s*\+7/)
    expect(text).toMatch(/total:\s*7/)
  })
})

describe("buildHeatmapTooltip", () => {
  // Shape mirrors what `heatmapScene.buildStreamingHeatmapScene` puts on
  // each cell's datum after the bin-center / agg enrichment pass.
  function heatmapHover(overrides: Record<string, unknown> = {}): HoverData {
    return {
      data: {
        xi: 3, yi: 7,
        value: 12, count: 12, sum: 0,
        xCenter: 14.5, yCenter: 87.25,
        agg: "count",
        ...overrides,
      },
      x: 240, y: 128,
    } as HoverData
  }

  it("prefers xCenter / yCenter from the enriched bin datum over accessor lookup", () => {
    // timeAccessor / valueAccessor would resolve to "time" / "value" on the
    // datum (both undefined here) — the helper has to ignore them when the
    // bin-center fields are present, otherwise the tooltip reads blank.
    const Tooltip = buildHeatmapTooltip()
    const { container } = render(<>{Tooltip(heatmapHover())}</>)
    const text = container.textContent ?? ""
    expect(text).toMatch(/x:\s*14\.50/)
    expect(text).toMatch(/y:\s*87\.25/)
  })

  it("always shows count regardless of aggregation type", () => {
    const Tooltip = buildHeatmapTooltip()
    const { container } = render(<>{Tooltip(heatmapHover({ count: 42 }))}</>)
    expect(container.textContent).toMatch(/count:\s*42/)
  })

  it("shows sum whenever agg === \"sum\", including the sum-equals-count edge case", () => {
    const Tooltip = buildHeatmapTooltip()
    const sumHover = heatmapHover({ agg: "sum", value: 142, count: 12, sum: 142 })
    const text = render(<>{Tooltip(sumHover)}</>).container.textContent ?? ""
    expect(text).toMatch(/sum:\s*142/)
    expect(text).not.toMatch(/mean:/)
    // The metric the heatmap is colored BY when agg="sum" is the sum,
    // so it's surfaced even when sum coincidentally equals count
    // (e.g. every value in the bin is 1). Suppressing on equality used
    // to hide the primary aggregated metric on this realistic case.
    const onesHover = heatmapHover({ agg: "sum", value: 5, count: 5, sum: 5 })
    const onesText = render(<>{Tooltip(onesHover)}</>).container.textContent ?? ""
    expect(onesText).toMatch(/sum:\s*5/)
    // count agg still keeps the sum row hidden — sum isn't the metric there.
    const countText = render(<>{Tooltip(heatmapHover())}</>).container.textContent ?? ""
    expect(countText).not.toMatch(/sum:/)
    expect(countText).not.toMatch(/mean:/)
  })

  it("shows mean only when agg === \"mean\"", () => {
    const Tooltip = buildHeatmapTooltip()
    const meanHover = heatmapHover({ agg: "mean", value: 11.83, count: 12, sum: 142 })
    const text = render(<>{Tooltip(meanHover)}</>).container.textContent ?? ""
    expect(text).toMatch(/mean:\s*11\.83/)
    expect(text).not.toMatch(/sum:/)
  })

  it("falls back to accessor-based x/y when the bin-center fields are absent", () => {
    // Non-streaming render path (or a custom scene) that doesn't produce
    // `xCenter` / `yCenter` on the datum should still degrade to the user's
    // declared accessor fields rather than rendering blank values.
    const Tooltip = buildHeatmapTooltip({
      timeAccessor: "t" as unknown as never,
      valueAccessor: "v" as unknown as never,
    })
    const fallbackHover = {
      data: { t: 5, v: 99, count: 1, agg: "count" },
      x: 0, y: 0,
    } as HoverData
    const text = render(<>{Tooltip(fallbackHover)}</>).container.textContent ?? ""
    expect(text).toMatch(/x:\s*5/)
    expect(text).toMatch(/y:\s*99/)
    expect(text).toMatch(/count:\s*1/)
  })
})
