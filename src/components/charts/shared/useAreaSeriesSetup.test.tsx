import { describe, it, expect } from "vitest"
import React from "react"
import { renderHook } from "@testing-library/react"
import { useAreaSeriesSetup } from "./useAreaSeriesSetup"
import { TooltipProvider } from "../../store/TooltipStore"

const wrapper = ({ children }: { children: React.ReactNode }) =>
  <TooltipProvider>{children}</TooltipProvider>

const baseInput = {
  lineDataAccessor: "coordinates",
  colorScale: undefined as ((v: string) => string) | undefined,
  effectiveSelectionHook: null,
  resolvedSelection: undefined,
  areaOpacity: 0.7,
  showLine: true,
  lineWidth: 2,
  showPoints: false,
  pointRadius: 3,
  xAccessor: "x",
  yAccessor: "y",
}

describe("useAreaSeriesSetup", () => {
  describe("flattenedData", () => {
    it("returns empty array when no `data` prop (push mode)", () => {
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: undefined,
        }),
        { wrapper },
      )
      expect(result.current.flattenedData).toEqual([])
    })

    it("passes flat data through unchanged when no areaBy and not pre-grouped", () => {
      const data = [{ x: 1, y: 10 }, { x: 2, y: 20 }]
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: data,
          data,
        }),
        { wrapper },
      )
      expect(result.current.flattenedData).toBe(data)
    })

    it("groups by areaBy then re-flattens, re-injecting the areaBy key", () => {
      const data = [
        { x: 1, y: 10, cat: "A" },
        { x: 2, y: 20, cat: "A" },
        { x: 1, y: 5, cat: "B" },
      ]
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: data,
          data,
          areaBy: "cat",
        }),
        { wrapper },
      )
      const flat = result.current.flattenedData
      expect(flat).toHaveLength(3)
      // Each row carries the cat key
      expect(flat.every((d) => "cat" in d)).toBe(true)
      // Group A has 2 rows, group B has 1
      expect(flat.filter((d) => d.cat === "A")).toHaveLength(2)
      expect(flat.filter((d) => d.cat === "B")).toHaveLength(1)
    })

    it("flattens pre-grouped area-object format", () => {
      const data: any[] = [
        { coordinates: [{ x: 1, y: 10 }, { x: 2, y: 20 }] },
        { coordinates: [{ x: 1, y: 5 }] },
      ]
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: data,
          data,
        }),
        { wrapper },
      )
      expect(result.current.flattenedData).toHaveLength(3)
    })
  })

  describe("lineStyle", () => {
    it("resolves fill+stroke from colorBy + colorScale", () => {
      const colorScale = (v: string) => ({ A: "#aaa", B: "#bbb" }[v] || "#000")
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          colorBy: "cat",
          colorScale,
        }),
        { wrapper },
      )
      const style = result.current.lineStyle({ cat: "A" } as any)
      expect(style.fill).toBe("#aaa")
      expect(style.stroke).toBe("#aaa")
      expect(style.strokeWidth).toBe(2)
    })

    it("falls back to color || DEFAULT_COLOR when colorBy unset", () => {
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          color: "tomato",
        }),
        { wrapper },
      )
      const style = result.current.lineStyle({} as any)
      expect(style.fill).toBe("tomato")
      expect(style.stroke).toBe("tomato")
    })

    it("returns empty style when colorBy set but colorScale undefined (push mode)", () => {
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          colorBy: "cat",
          colorScale: undefined,
        }),
        { wrapper },
      )
      const style = result.current.lineStyle({ cat: "A" } as any)
      // No fill / stroke — frame paints from its own palette
      expect(style.fill).toBeUndefined()
      expect(style.stroke).toBeUndefined()
    })

    it("sets stroke=\"none\" when showLine=false", () => {
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          showLine: false,
        }),
        { wrapper },
      )
      const style = result.current.lineStyle({} as any)
      expect(style.stroke).toBe("none")
      expect(style.strokeWidth).toBeUndefined()
    })

    it("respects areaOpacity through fillOpacity", () => {
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          areaOpacity: 0.4,
        }),
        { wrapper },
      )
      const style = result.current.lineStyle({} as any)
      expect(style.fillOpacity).toBe(0.4)
    })

    it("primitive props (stroke/strokeWidth/opacity) win over base", () => {
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          color: "#aaa",
          stroke: "purple",
          strokeWidth: 7,
          opacity: 0.3,
        }),
        { wrapper },
      )
      const style = result.current.lineStyle({} as any)
      expect(style.stroke).toBe("purple")
      expect(style.strokeWidth).toBe(7)
      expect(style.opacity).toBe(0.3)
    })
  })

  describe("pointStyle", () => {
    it("returns undefined when showPoints=false", () => {
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          showPoints: false,
        }),
        { wrapper },
      )
      expect(result.current.pointStyle).toBeUndefined()
    })

    it("returns a fn that emits r=pointRadius when showPoints=true", () => {
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          showPoints: true,
          pointRadius: 5,
        }),
        { wrapper },
      )
      const ps = result.current.pointStyle!
      const style = ps({} as any)
      expect(style.r).toBe(5)
      expect(style.fillOpacity).toBe(1)
    })

    it("uses parentLine for color when present (stacked-area row)", () => {
      const colorScale = (v: string) => `c-${v}`
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          showPoints: true,
          colorBy: "cat",
          colorScale,
        }),
        { wrapper },
      )
      const ps = result.current.pointStyle!
      // Row carries parentLine with the group key
      const style = ps({ x: 1, y: 2, parentLine: { cat: "A" } } as any)
      expect(style.fill).toBe("c-A")
    })

    it("falls back to color || DEFAULT_COLOR when colorBy unset", () => {
      const { result } = renderHook(
        () => useAreaSeriesSetup({
          ...baseInput,
          safeData: [],
          data: [],
          showPoints: true,
          color: "tomato",
        }),
        { wrapper },
      )
      const ps = result.current.pointStyle!
      const style = ps({} as any)
      expect(style.fill).toBe("tomato")
    })
  })
})
