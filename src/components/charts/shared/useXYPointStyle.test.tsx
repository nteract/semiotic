import { describe, it, expect } from "vitest"
import React from "react"
import { renderHook } from "@testing-library/react"
import { useXYPointStyle } from "./useXYPointStyle"
import { TooltipProvider } from "../../store/TooltipStore"

const wrapper = ({ children }: { children: React.ReactNode }) =>
  <TooltipProvider>{children}</TooltipProvider>

const baseInput = {
  colorScale: undefined as ((v: string) => string) | undefined,
  effectiveSelectionHook: null,
  resolvedSelection: undefined,
}

describe("useXYPointStyle", () => {
  it("resolves fill from colorBy + colorScale", () => {
    const colorScale = (v: string) => ({ A: "#aaa", B: "#bbb" }[v] || "#000")
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        colorBy: "cat",
        colorScale,
      }),
      { wrapper },
    )
    const style = result.current({ cat: "A" })
    expect(style.fill).toBe("#aaa")
  })

  it("falls back to color || DEFAULT_COLOR when colorBy unset", () => {
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        color: "tomato",
      }),
      { wrapper },
    )
    const style = result.current({})
    expect(style.fill).toBe("tomato")
  })

  it("returns no fill when colorBy set but colorScale undefined (push mode)", () => {
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        colorBy: "cat",
        colorScale: undefined,
      }),
      { wrapper },
    )
    const style = result.current({ cat: "A" })
    expect(style.fill).toBeUndefined()
  })

  it("uses fallbackFill when colorBy unset and fallback provided", () => {
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        fallbackFill: (d) => `#q-${d.q}`,
      }),
      { wrapper },
    )
    const style = result.current({ q: "TR" })
    expect(style.fill).toBe("#q-TR")
  })

  it("uses fixed pointRadius when no radiusFn", () => {
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        pointRadius: 8,
      }),
      { wrapper },
    )
    const style = result.current({})
    expect(style.r).toBe(8)
  })

  it("radiusFn wins over fixed pointRadius (sizeBy path)", () => {
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        pointRadius: 5,
        radiusFn: (d) => d.size as number,
      }),
      { wrapper },
    )
    const style = result.current({ size: 25 })
    expect(style.r).toBe(25)
  })

  it("applies fillOpacity default", () => {
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        fillOpacity: 0.4,
      }),
      { wrapper },
    )
    const style = result.current({})
    expect(style.fillOpacity).toBe(0.4)
  })

  it("baseStyleExtras supplies static defaults like BubbleChart's stroke", () => {
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        baseStyleExtras: { stroke: "#fff", strokeWidth: 1.5 },
      }),
      { wrapper },
    )
    const style = result.current({})
    expect(style.stroke).toBe("#fff")
    expect(style.strokeWidth).toBe(1.5)
  })

  it("baseStyleExtras supplying fill bypasses standard color resolution (ConnectedScatterplot)", () => {
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        colorBy: "cat",
        colorScale: () => "#never",
        baseStyleExtras: () => ({ fill: "#viridis-7" }),
      }),
      { wrapper },
    )
    const style = result.current({ cat: "A" })
    expect(style.fill).toBe("#viridis-7")
  })

  it("primitive props win over base + extras", () => {
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        baseStyleExtras: { stroke: "#fff", strokeWidth: 1 },
        stroke: "purple",
        strokeWidth: 4,
        opacity: 0.2,
      }),
      { wrapper },
    )
    const style = result.current({})
    expect(style.stroke).toBe("purple")
    expect(style.strokeWidth).toBe(4)
    expect(style.opacity).toBe(0.2)
  })

  it("colorDatumAccessor lets stacked-area-style points read parentLine", () => {
    const colorScale = (v: string) => `c-${v}`
    const { result } = renderHook(
      () => useXYPointStyle({
        ...baseInput,
        colorBy: "cat",
        colorScale,
        colorDatumAccessor: (d) => d.parentLine || d,
      }),
      { wrapper },
    )
    const style = result.current({ x: 1, y: 2, parentLine: { cat: "A" } })
    expect(style.fill).toBe("c-A")
  })
})
