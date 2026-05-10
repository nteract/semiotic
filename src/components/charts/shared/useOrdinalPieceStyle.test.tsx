import { describe, it, expect } from "vitest"
import React from "react"
import { renderHook } from "@testing-library/react"
import { useOrdinalPieceStyle } from "./useOrdinalPieceStyle"
import { TooltipProvider } from "../../store/TooltipStore"

const wrapper = ({ children }: { children: React.ReactNode }) =>
  <TooltipProvider>{children}</TooltipProvider>

const baseInput = {
  themeCategorical: undefined,
  categoryIndexMap: new Map<string, number>(),
  effectiveSelectionHook: null,
  resolvedSelection: undefined,
}

describe("useOrdinalPieceStyle", () => {
  it("returns base fill from getColor when colorBy is set", () => {
    // colorScale that maps category names to specific colors
    const colorScale = (v: string) => ({ A: "#aaa", B: "#bbb" }[v] || "#000")
    const { result } = renderHook(
      () => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: "category",
        colorScale,
        colorScheme: undefined,
      }),
      { wrapper },
    )
    const style = result.current({ category: "A", value: 5 } as Record<string, unknown>)
    expect(style.fill).toBe("#aaa")
  })

  it("falls back to resolveDefaultFill when colorBy is unset", () => {
    const { result } = renderHook(
      () => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: undefined,
        colorScale: undefined,
        colorScheme: ["#abc"],
      }),
      { wrapper },
    )
    const style = result.current({ category: "A", value: 5 } as Record<string, unknown>)
    expect(style.fill).toBeDefined()
  })

  it("merges user pieceStyle (function form) over base", () => {
    const { result } = renderHook(
      () => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: "category",
        colorScale: () => "#000",
        userPieceStyle: (d: Record<string, unknown>) => ({ stroke: `cat-${d.category}` }),
      }),
      { wrapper },
    )
    const style = result.current({ category: "X" } as Record<string, unknown>)
    expect(style.fill).toBe("#000")
    expect(style.stroke).toBe("cat-X")
  })

  it("merges user pieceStyle (object form) over base", () => {
    const { result } = renderHook(
      () => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: "category",
        colorScale: () => "#000",
        userPieceStyle: { stroke: "user-stroke" },
      }),
      { wrapper },
    )
    const style = result.current({ category: "X" } as Record<string, unknown>)
    expect(style.stroke).toBe("user-stroke")
  })

  it("primitive props win over both base and user pieceStyle", () => {
    const { result } = renderHook(
      () => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: "category",
        colorScale: () => "#000",
        userPieceStyle: { stroke: "user-stroke" },
        stroke: "primitive-stroke",
        strokeWidth: 2,
        opacity: 0.5,
      }),
      { wrapper },
    )
    const style = result.current({ category: "X" } as Record<string, unknown>)
    // Top-level primitive props applied via mergeShapeStyle — they
    // overlay onto whatever the base + user produced.
    expect(style.stroke).toBe("primitive-stroke")
    expect(style.strokeWidth).toBe(2)
    expect(style.opacity).toBe(0.5)
  })

  it("returns a stable function reference when inputs don't change", () => {
    const colorScale = () => "#000"
    const idxMap = new Map<string, number>()
    const { result, rerender } = renderHook(
      (props: Record<string, unknown>) => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: "category",
        colorScale,
        categoryIndexMap: idxMap,
        ...props,
      }),
      { wrapper, initialProps: {} },
    )
    const first = result.current
    rerender({})
    expect(result.current).toBe(first)
  })

  it("preserves baseStyleExtras through the merge pipeline", () => {
    // Charts like DotPlot / SwarmPlot pass `r` / `fillOpacity`
    // intrinsic defaults — those must survive the color/user/primitive
    // overlays.
    const { result } = renderHook(
      () => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: "category",
        colorScale: () => "#000",
        baseStyleExtras: { r: 5, fillOpacity: 0.7 },
      }),
      { wrapper },
    )
    const style = result.current({ category: "A" } as Record<string, unknown>)
    expect(style.r).toBe(5)
    expect(style.fillOpacity).toBe(0.7)
    expect(style.fill).toBe("#000")
  })

  it("baseStyleExtras returns alone when colorBy set but colorScale undefined (push mode)", () => {
    // Frame-fallback branch — only the extras flow through.
    const { result } = renderHook(
      () => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: "category",
        colorScale: undefined,
        baseStyleExtras: { r: 5 },
      }),
      { wrapper },
    )
    const style = result.current({ category: "A" } as Record<string, unknown>)
    expect(style.r).toBe(5)
    expect(style.fill).toBeUndefined()
  })

  it("user pieceStyle can override baseStyleExtras", () => {
    const { result } = renderHook(
      () => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: "category",
        colorScale: () => "#000",
        baseStyleExtras: { r: 5 },
        userPieceStyle: { r: 10 },
      }),
      { wrapper },
    )
    const style = result.current({ category: "A" } as Record<string, unknown>)
    expect(style.r).toBe(10)
  })

  it("rebuilds when colorScale changes", () => {
    let scale: (v: string) => string = () => "#aaa"
    const { result, rerender } = renderHook(
      () => useOrdinalPieceStyle({
        ...baseInput,
        colorBy: "category",
        colorScale: scale,
      }),
      { wrapper },
    )
    const first = result.current({ category: "X" } as Record<string, unknown>).fill
    expect(first).toBe("#aaa")
    scale = () => "#bbb"
    rerender()
    const second = result.current({ category: "X" } as Record<string, unknown>).fill
    expect(second).toBe("#bbb")
  })
})
