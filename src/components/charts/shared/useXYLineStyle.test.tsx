import { describe, it, expect } from "vitest"
import React from "react"
import { renderHook } from "@testing-library/react"
import { useXYLineStyle } from "./useXYLineStyle"
import { TooltipProvider } from "../../store/TooltipStore"
import type { Datum } from "./datumTypes"
import type { SelectionHookResult } from "./selectionUtils"

const wrapper = ({ children }: { children: React.ReactNode }) =>
  <TooltipProvider>{children}</TooltipProvider>

describe("useXYLineStyle", () => {
  describe("color resolution", () => {
    it("resolves stroke via colorBy + colorScale", () => {
      const colorScale = (key: string) => key === "A" ? "#abc" : "#def"
      const { result } = renderHook(
        () => useXYLineStyle({ colorBy: "series", colorScale, lineWidth: 3 }),
        { wrapper },
      )
      const styleFor = result.current
      expect(styleFor({ series: "A", x: 1, y: 2 })).toMatchObject({ stroke: "#abc", strokeWidth: 3 })
      expect(styleFor({ series: "B", x: 1, y: 2 })).toMatchObject({ stroke: "#def", strokeWidth: 3 })
    })

    it("falls back to `color` prop when colorBy is unset", () => {
      const { result } = renderHook(
        () => useXYLineStyle({ color: "#f00", lineWidth: 1 }),
        { wrapper },
      )
      expect(result.current({ x: 1, y: 2 })).toMatchObject({ stroke: "#f00", strokeWidth: 1 })
    })

    it("falls back to DEFAULT_COLOR when neither colorBy nor color is set", () => {
      const { result } = renderHook(
        () => useXYLineStyle({}),
        { wrapper },
      )
      // DEFAULT_COLOR is exported from hooks.ts; just assert stroke is present
      // and is a string. The exact hex is an implementation detail of theme.
      const style = result.current({ x: 1, y: 2 })
      expect(typeof style.stroke).toBe("string")
      expect((style.stroke as string).length).toBeGreaterThan(0)
    })

    it("resolveStroke wins over colorBy+colorScale (MultiAxisLineChart path)", () => {
      // MultiAxisLineChart hands in a series-map resolver. Even when
      // colorBy + colorScale are also supplied, the resolver wins.
      const seriesColors = new Map([["mpg", "#111"], ["hp", "#222"]])
      const { result } = renderHook(
        () => useXYLineStyle({
          colorBy: "series", colorScale: () => "#ignored",
          resolveStroke: (d) => seriesColors.get((d as Datum).series as string) || "#fallback",
        }),
        { wrapper },
      )
      expect(result.current({ series: "mpg" }).stroke).toBe("#111")
      expect(result.current({ series: "hp" }).stroke).toBe("#222")
      expect(result.current({ series: "unknown" }).stroke).toBe("#fallback")
    })

    it("passes the `group` argument through to resolveStroke", () => {
      // The frame's `resolveLineStyle` invokes the callback with
      // `(datum, group?)`. Verify the group flows to the resolver.
      const seen: string[] = []
      const { result } = renderHook(
        () => useXYLineStyle({
          resolveStroke: (_d, group) => { seen.push(group ?? "<none>"); return "#000" },
        }),
        { wrapper },
      )
      result.current({ x: 1 }, "series-a")
      result.current({ x: 2 }, "series-b")
      result.current({ x: 3 })
      expect(seen).toEqual(["series-a", "series-b", "<none>"])
    })

    it("leaves stroke undefined when colorBy is set but colorScale is missing (push-mode)", () => {
      // Push-mode initial state: `useColorScale` returns undefined for
      // empty data. The hook must NOT back-fill `style.stroke` here —
      // `PipelineStore.resolveLineStyle` injects per-group palette colors
      // when stroke is missing, and a back-filled fallback would lock
      // every push-mode series into a single color.
      const { result } = renderHook(
        () => useXYLineStyle({ colorBy: "series", color: "#fallback" }),
        { wrapper },
      )
      const style = result.current({ series: "A" })
      expect(style.stroke).toBeUndefined()
      // strokeWidth is still emitted so the line draws with default sizing
      // until the frame back-fills color on the next render.
      expect(style.strokeWidth).toBe(2)
    })
  })

  describe("fillArea", () => {
    it("sets fill + fillOpacity when fillArea is true", () => {
      const { result } = renderHook(
        () => useXYLineStyle({
          color: "#abc", fillArea: true, areaOpacity: 0.5,
        }),
        { wrapper },
      )
      expect(result.current({ x: 1, y: 2 })).toMatchObject({
        stroke: "#abc",
        fill: "#abc",
        fillOpacity: 0.5,
      })
    })

    it("omits fill when fillArea is false/undefined", () => {
      const { result } = renderHook(
        () => useXYLineStyle({ color: "#abc" }),
        { wrapper },
      )
      const style = result.current({ x: 1, y: 2 })
      expect(style.stroke).toBe("#abc")
      expect(style.fill).toBeUndefined()
      expect(style.fillOpacity).toBeUndefined()
    })

    it("group-aware fillArea — only fills matching series", () => {
      const { result } = renderHook(
        () => useXYLineStyle({
          color: "#abc",
          fillArea: ["A", "C"],
          areaOpacity: 0.4,
        }),
        { wrapper },
      )
      expect(result.current({ x: 1 }, "A").fill).toBe("#abc")
      expect(result.current({ x: 1 }, "B").fill).toBeUndefined()
      expect(result.current({ x: 1 }, "C").fill).toBe("#abc")
      // No group: behaves as "not in the list" → no fill
      expect(result.current({ x: 1 }).fill).toBeUndefined()
    })
  })

  describe("primitive overlay", () => {
    it("top-level `stroke` overrides the resolved stroke (color resolution loses)", () => {
      const { result } = renderHook(
        () => useXYLineStyle({
          colorBy: "series", colorScale: () => "#resolved",
          stroke: "var(--brand-primary)",
        }),
        { wrapper },
      )
      expect(result.current({ series: "A" }).stroke).toBe("var(--brand-primary)")
    })

    it("top-level `strokeWidth` wins over `lineWidth`", () => {
      const { result } = renderHook(
        () => useXYLineStyle({ lineWidth: 2, strokeWidth: 8, color: "#000" }),
        { wrapper },
      )
      expect(result.current({ x: 1 }).strokeWidth).toBe(8)
    })

    it("top-level `opacity` is applied as a flat field", () => {
      const { result } = renderHook(
        () => useXYLineStyle({ color: "#000", opacity: 0.6 }),
        { wrapper },
      )
      expect(result.current({ x: 1 }).opacity).toBe(0.6)
    })
  })

  describe("selection wrapping", () => {
    function makeHook(active: boolean, matches: (d: Datum) => boolean): SelectionHookResult {
      return {
        isActive: active,
        predicate: matches,
        toggle: () => {},
        clear: () => {},
        selection: null,
        selectionList: [],
        notify: () => {},
      } as unknown as SelectionHookResult
    }

    it("dims non-matching datums when a selection is active", () => {
      const hook = makeHook(true, (d) => d.series === "A")
      const { result } = renderHook(
        () => useXYLineStyle({
          color: "#000", effectiveSelectionHook: hook,
        }),
        { wrapper },
      )
      const styleFor = result.current
      // Matched: opacity stays at base
      const matched = styleFor({ series: "A" })
      expect(matched.opacity).toBeUndefined() // not dimmed
      // Unmatched: dimmed (opacity/fillOpacity/strokeOpacity set)
      const unmatched = styleFor({ series: "B" })
      expect(typeof unmatched.opacity).toBe("number")
      expect(unmatched.opacity as number).toBeLessThan(1)
    })

    it("is a no-op when effectiveSelectionHook is null/undefined (minimap path)", () => {
      const { result } = renderHook(
        () => useXYLineStyle({ color: "#000" }),
        { wrapper },
      )
      const style = result.current({ x: 1 })
      expect(style.opacity).toBeUndefined()
    })

    it("forwards the `group` argument through the selection wrap", () => {
      // When a selection is active, `wrapStyleWithSelection` builds a new
      // function — but the variadic forwarding must preserve the
      // `(datum, group)` calling convention. Verify group-aware
      // `fillArea: string[]` still fills the right series with selection on.
      const hook = makeHook(true, () => true) // every datum selected
      const { result } = renderHook(
        () => useXYLineStyle({
          color: "#000",
          fillArea: ["A"],
          areaOpacity: 0.5,
          effectiveSelectionHook: hook,
        }),
        { wrapper },
      )
      const styleFor = result.current
      // group "A" → fill present (group-aware fillArea hit)
      expect(styleFor({ x: 1 }, "A").fill).toBe("#000")
      // group "B" → no fill (group-aware fillArea miss)
      expect(styleFor({ x: 1 }, "B").fill).toBeUndefined()
    })
  })

  describe("memoization", () => {
    it("returns referentially-stable function when inputs are unchanged", () => {
      const { result, rerender } = renderHook(
        ({ stroke }: { stroke?: string }) => useXYLineStyle({ color: "#000", stroke }),
        { wrapper, initialProps: { stroke: undefined as string | undefined } },
      )
      const first = result.current
      rerender({ stroke: undefined })
      expect(result.current).toBe(first)
    })

    it("returns a new function when stroke changes", () => {
      const { result, rerender } = renderHook(
        ({ stroke }: { stroke?: string }) => useXYLineStyle({ color: "#000", stroke }),
        { wrapper, initialProps: { stroke: undefined as string | undefined } },
      )
      const first = result.current
      rerender({ stroke: "#f00" })
      expect(result.current).not.toBe(first)
    })
  })
})
