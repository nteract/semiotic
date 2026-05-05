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
import { buildDefaultRealtimeTooltip, buildWaterfallTooltip } from "./defaultRealtimeTooltip"
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
