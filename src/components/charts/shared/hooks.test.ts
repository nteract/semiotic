import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import * as React from "react"
import {
  resolveMobileInteraction,
  resolveAccessor,
  useColorScale,
  useSortedData,
  useChartSelection,
  useChartLegendAndMargin,
  useChartMode,
  useLegendInteraction,
  getCrosshairProps,
} from "./hooks"
import { SelectionProvider } from "../../store/SelectionStore"
import { useSelection } from "../../store/useSelection"
import { ObservationProvider } from "../../store/ObservationStore"
import { CategoryColorProvider } from "../../CategoryColors"
import { setCrosshairPosition, clearCrosshairPosition, useCrosshairPosition, unlockCrosshair } from "../../store/LinkedCrosshairStore"
import type { Datum } from "./datumTypes"
import { useStreamingLegend } from "./useStreamingLegend"
import { isLegendConfig } from "../../types/legendTypes"

/**
 * Wrapper that provides the store providers needed by hooks that
 * depend on SelectionStore and ObservationStore.
 */
function createWrapper(options?: { categoryColors?: Record<string, string> }) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const inner = React.createElement(
      SelectionProvider,
      null,
      React.createElement(ObservationProvider, null, children)
    )
    if (options?.categoryColors) {
      return React.createElement(
        CategoryColorProvider,
        { colors: options.categoryColors, children: inner }
      )
    }
    return inner
  }
}

// ── DEFAULT_COLOR ─────────────────────────────────────────────────────────

// ── resolveAccessor ───────────────────────────────────────────────────────

describe("resolveAccessor", () => {
  it("resolves a string accessor to a property lookup function", () => {
    const fn = resolveAccessor("name")
    expect(fn({ name: "Alice" })).toBe("Alice")
  })

  it("resolves a function accessor by passing it through", () => {
    const original = (d: Datum) => d.x * 2
    const fn = resolveAccessor(original)
    expect(fn).toBe(original)
    expect(fn({ x: 5 })).toBe(10)
  })

  it("returns undefined for missing field", () => {
    const fn = resolveAccessor("missing")
    expect(fn({ other: 1 })).toBeUndefined()
  })
})

// ── useColorScale ─────────────────────────────────────────────────────────

describe("useColorScale", () => {
  const data = [
    { cat: "A", val: 1 },
    { cat: "B", val: 2 },
    { cat: "C", val: 3 },
  ]

  it("returns undefined when colorBy is absent", () => {
    const { result } = renderHook(() => useColorScale(data, undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current).toBeUndefined()
  })

  it("returns a color scale when colorBy is a function", () => {
    const { result } = renderHook(
      () => useColorScale(data, (d: Datum) => d.cat),
      { wrapper: createWrapper() }
    )
    // After the fix, function colorBy now derives categories and builds a scale
    expect(typeof result.current).toBe("function")
  })

  it("function colorBy scale returns different colors for different categories", () => {
    const { result } = renderHook(
      () => useColorScale(data, (d: Datum) => d.cat),
      { wrapper: createWrapper() }
    )
    const scale = result.current!
    expect(scale("A")).not.toBe(scale("B"))
    expect(scale("B")).not.toBe(scale("C"))
  })

  it("function colorBy uses CategoryColorProvider when available", () => {
    const categoryColors = { A: "#ff0000", B: "#00ff00", C: "#0000ff" }
    const { result } = renderHook(
      () => useColorScale(data, (d: Datum) => d.cat),
      { wrapper: createWrapper({ categoryColors }) }
    )
    expect(result.current!("A")).toBe("#ff0000")
    expect(result.current!("B")).toBe("#00ff00")
  })

  it("returns a color scale function when colorBy is a string", () => {
    const { result } = renderHook(() => useColorScale(data, "cat"), {
      wrapper: createWrapper(),
    })
    expect(typeof result.current).toBe("function")
    const colorA = result.current!("A")
    const colorB = result.current!("B")
    expect(typeof colorA).toBe("string")
    expect(colorA).not.toBe(colorB)
  })

  it("uses CategoryColorProvider colors when available", () => {
    const categoryColors = { A: "#ff0000", B: "#00ff00", C: "#0000ff" }
    const { result } = renderHook(() => useColorScale(data, "cat"), {
      wrapper: createWrapper({ categoryColors }),
    })
    expect(result.current!("A")).toBe("#ff0000")
    expect(result.current!("B")).toBe("#00ff00")
  })
})

// ── useStreamingLegend ───────────────────────────────────────────────────

describe("useStreamingLegend", () => {
  it("uses CategoryColorProvider colors for push-mode legend swatches", () => {
    const { result } = renderHook(
      () => useStreamingLegend({
        isPushMode: true,
        colorBy: "cat",
        colorScheme: undefined,
        showLegend: true,
      }),
      { wrapper: createWrapper({ categoryColors: { A: "#ff0000", B: "#00ff00" } }) }
    )

    act(() => {
      const push = result.current.wrapPush(() => {})
      push({ cat: "A" })
      push({ cat: "B" })
    })

    const items = result.current.streamingLegend?.legendGroups[0].items
    expect(items?.map(item => item.color)).toEqual(["#ff0000", "#00ff00"])
  })
})

// ── useSortedData ─────────────────────────────────────────────────────────

describe("useSortedData", () => {
  const data = [
    { name: "C", value: 30 },
    { name: "A", value: 10 },
    { name: "B", value: 20 },
  ]

  it("returns data unchanged when sort is false", () => {
    const { result } = renderHook(() => useSortedData(data, false, "value"))
    expect(result.current).toBe(data) // same reference
  })

  it("sorts ascending by value accessor", () => {
    const { result } = renderHook(() => useSortedData(data, "asc", "value"))
    expect(result.current.map((d) => d.name)).toEqual(["A", "B", "C"])
  })

  it("sorts descending by value accessor", () => {
    const { result } = renderHook(() => useSortedData(data, "desc", "value"))
    expect(result.current.map((d) => d.name)).toEqual(["C", "B", "A"])
  })

  it("sorts descending when sort is true (boolean)", () => {
    const { result } = renderHook(() => useSortedData(data, true, "value"))
    // true is truthy but not "asc", so falls to the else branch: descending
    expect(result.current.map((d) => d.name)).toEqual(["C", "B", "A"])
  })

  it("returns the same array reference when sort is a function (category comparator)", () => {
    // A function `sort` is a category-key comparator forwarded to the
    // frame as `oSort`. It does not sort HOC row data, so
    // useSortedData leaves the array untouched — mirroring the
    // "auto" pass-through.
    const customSort = (a: string, b: string) => a.localeCompare(b)
    const { result } = renderHook(() =>
      useSortedData(data, customSort, "value")
    )
    expect(result.current).toBe(data)
    expect(result.current.map((d) => d.name)).toEqual(["C", "A", "B"])
  })

  it("does not mutate the original data array", () => {
    const original = [...data]
    renderHook(() => useSortedData(data, "asc", "value"))
    expect(data).toEqual(original)
  })

  // `"auto"` is a pass-through at the HOC level: the frame's
  // resolveCategories decides between insertion-order (streaming) and
  // value-desc (static) based on the store's streaming state. HOCs
  // shouldn't pre-sort their row array under "auto", or they'd fight
  // the store's decision.
  it("returns the same array reference when sort is 'auto'", () => {
    const { result } = renderHook(() => useSortedData(data, "auto", "value"))
    expect(result.current).toBe(data)
    expect(result.current.map((d) => d.name)).toEqual(["C", "A", "B"])
  })
})

// ── useChartSelection ─────────────────────────────────────────────────────

describe("useChartSelection", () => {
  it("returns null activeSelectionHook when no selection config is provided", () => {
    const { result } = renderHook(
      () => useChartSelection({}),
      { wrapper: createWrapper() }
    )
    expect(result.current.activeSelectionHook).toBeNull()
  })

  it("returns a selection hook result when selection config is provided", () => {
    const { result } = renderHook(
      () =>
        useChartSelection({
          selection: { name: "hl" },
          fallbackFields: ["category"],
        }),
      { wrapper: createWrapper() }
    )
    expect(result.current.activeSelectionHook).not.toBeNull()
    expect(result.current.activeSelectionHook!.isActive).toBe(false)
    // With no active selection, predicate returns true for everything
    expect(result.current.activeSelectionHook!.predicate({ category: "A" })).toBe(true)
  })

  it("calls onObservation with hover event when hovering with data", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () =>
        useChartSelection({
          onObservation,
          chartType: "LineChart",
          chartId: "chart1",
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customHoverBehavior({ x: 10, y: 20, data: { val: 42 } })
    })

    expect(onObservation).toHaveBeenCalledTimes(1)
    const obs = onObservation.mock.calls[0][0]
    expect(obs.type).toBe("hover")
    expect(obs.chartType).toBe("LineChart")
    expect(obs.chartId).toBe("chart1")
    expect(obs.datum).toEqual({ val: 42 })
    expect(obs.x).toBe(10)
    expect(obs.y).toBe(20)
  })

  it("adds a normalized focus observation for keyboard traversal", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onObservation, chartType: "LineChart", chartId: "trend" }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customHoverBehavior(
        { x: 10, y: 20, data: { id: "point-a" } },
        { type: "focus", inputType: "keyboard" }
      )
    })

    expect(onObservation.mock.calls.map(([event]) => event.type)).toEqual([
      "hover",
      "focus"
    ])
    expect(onObservation.mock.calls[1][0]).toMatchObject({
      type: "focus",
      datum: { id: "point-a" },
      inputType: "keyboard",
      chartId: "trend"
    })
  })

  it("preserves frame-provided xValue in hover observations", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onObservation, chartType: "LineChart" }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customHoverBehavior({ x: 10, y: 20, xValue: 42.5, data: { val: 42 } })
    })

    expect(onObservation.mock.calls[0][0].datum).toEqual({ val: 42, xValue: 42.5 })
  })

  it("calls onObservation with hover-end when hovering with null", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onObservation, chartType: "BarChart" }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customHoverBehavior(null)
    })

    expect(onObservation).toHaveBeenCalledTimes(1)
    expect(onObservation.mock.calls[0][0].type).toBe("hover-end")
  })

  it("calls onObservation with click event", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () =>
        useChartSelection({
          onObservation,
          chartType: "Scatterplot",
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customClickBehavior({ x: 5, y: 15, data: { id: 1 } })
    })

    expect(onObservation).toHaveBeenCalledTimes(1)
    const obs = onObservation.mock.calls[0][0]
    expect(obs.type).toBe("click")
    expect(obs.datum).toEqual({ id: 1 })
  })

  it("adds a normalized touch activation without replacing click", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onObservation, chartType: "Scatterplot" }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customClickBehavior(
        { x: 5, y: 15, data: { id: 1 } },
        { type: "activate", inputType: "touch" }
      )
    })

    expect(onObservation.mock.calls.map(([event]) => event.type)).toEqual([
      "click",
      "activate"
    ])
    expect(onObservation.mock.calls[1][0]).toMatchObject({
      type: "activate",
      datum: { id: 1 },
      inputType: "touch"
    })
  })

  it("does not call onObservation with click-end for desktop null clicks", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onObservation }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customClickBehavior(null)
    })

    expect(onObservation).not.toHaveBeenCalled()
  })

  it("calls onObservation with click-end for mobile background-clear null clicks", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () =>
        useChartSelection({
          onObservation,
          mobileInteraction: {
            enabled: true,
            tapToSelect: true,
            tapToLockTooltip: true,
            clearSelection: "backgroundTap",
            targetSize: 44,
            snap: "nearestDatum",
            brushHandleSize: 44,
            standardControls: false,
          },
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customClickBehavior(null)
    })

    expect(onObservation).toHaveBeenCalledTimes(1)
    expect(onObservation.mock.calls[0][0].type).toBe("click-end")
  })

  it("unwraps datum from .datum property", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onObservation }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customHoverBehavior({ x: 0, y: 0, datum: { name: "test2" } })
    })

    expect(onObservation.mock.calls[0][0].datum).toEqual({ name: "test2" })
  })

  it("uses datum directly when no .data or .datum wrapper exists", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onObservation }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customHoverBehavior({ x: 1, y: 2, name: "direct" })
    })

    expect(onObservation.mock.calls[0][0].datum).toEqual({ x: 1, y: 2, name: "direct" })
  })

  it("accepts hoverHighlight='series' as a series-hover alias", () => {
    const { result } = renderHook(
      () => useChartSelection({ hoverHighlight: "series", colorByField: "series" }),
      { wrapper: createWrapper() }
    )

    expect(result.current.hoverSelectionHook).toBeNull()

    act(() => {
      result.current.customHoverBehavior({ x: 1, y: 2, data: { series: "alpha" } })
    })

    expect(result.current.hoverSelectionHook?.isActive).toBe(true)
    expect(result.current.hoverSelectionHook?.predicate({ series: "alpha" })).toBe(true)
    expect(result.current.hoverSelectionHook?.predicate({ series: "beta" })).toBe(false)
  })

})

// ── useChartLegendAndMargin ──────────────────────────────────────────────

describe("useChartLegendAndMargin", () => {
  const data = [
    { cat: "A", val: 1 },
    { cat: "B", val: 2 },
    { cat: "C", val: 3 },
  ]

  it("returns no legend and default margins when colorBy is absent", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: undefined,
        colorScale: undefined,
        showLegend: undefined,
        userMargin: undefined,
      })
    )
    expect(result.current.legend).toBeUndefined()
    expect(result.current.margin).toEqual({
      top: 50, bottom: 60, left: 70, right: 40,
    })
  })

  it("creates a legend when colorBy is a string and showLegend is not explicitly false", () => {
    const colorScale = (v: string) => (v === "A" ? "#f00" : "#0f0")
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: undefined,
        userMargin: undefined,
      })
    )
    const legend = result.current.legend
    if (!isLegendConfig(legend)) throw new Error("Expected a categorical legend")
    expect(legend.legendGroups).toHaveLength(1)
    expect(legend.legendGroups[0].items).toHaveLength(3)
  })

  it("appends caller categorical groups after the inferred legend", () => {
    const additionalLegend = {
      legendGroups: [{
        label: "Context",
        type: "line" as const,
        styleFn: () => ({ stroke: "#111" }),
        items: [{ label: "Threshold" }],
      }],
    }
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: undefined,
        userMargin: undefined,
        additionalLegend,
      })
    )

    const legend = result.current.legend
    if (!isLegendConfig(legend)) throw new Error("Expected composed categorical legends")
    const groups = legend.legendGroups
    expect(groups).toHaveLength(2)
    expect(groups[0].items.map(item => item.label)).toEqual(["A", "B", "C"])
    expect(groups[1].items[0].label).toBe("Threshold")
    expect(result.current.margin.right).toBe(110)
  })

  it("carries caller legendDistance into the composed automatic legend", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        userMargin: { right: "auto" },
        additionalLegend: { legendGroups: [], legendDistance: 24 },
      })
    )

    const legend = result.current.legend
    if (!isLegendConfig(legend)) throw new Error("Expected a categorical legend")
    expect(legend.legendDistance).toBe(24)
    expect(result.current.margin.right).toBe(124)
  })

  it("does not create a legend when showLegend is false", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: undefined,
        showLegend: false,
        userMargin: undefined,
      })
    )
    expect(result.current.legend).toBeUndefined()
  })

  it("forces legend when showLegend is true even without colorBy", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: undefined,
        colorScale: undefined,
        showLegend: true,
        userMargin: undefined,
      })
    )
    // showLegend is true but colorBy is undefined, so legend creation is skipped
    expect(result.current.legend).toBeUndefined()
  })

  it("reserves the minimum right-side legend width", () => {
    const colorScale = (_v: string) => "#ccc"
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: undefined,
      })
    )
    expect(result.current.margin.right).toBe(110)
  })

  it("preserves an explicitly owned right margin", () => {
    const colorScale = (_v: string) => "#ccc"
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: { right: 200 },
      })
    )
    expect(result.current.margin.right).toBe(200)
  })

  it("treats undefined margin sides as omitted for legend reservation", () => {
    const colorScale = (_v: string) => "#ccc"
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: { right: undefined },
      })
    )
    expect(result.current.margin.right).toBe(110)
  })

  it("treats auto and null margin sides as explicit auto-reservation", () => {
    const colorScale = (_v: string) => "#ccc"
    const rightAuto = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: { right: "auto" },
      })
    )
    expect(rightAuto.result.current.margin.right).toBe(110)

    const rightNull = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: { right: null },
      })
    )
    expect(rightNull.result.current.margin.right).toBe(110)
  })

  it("sizes automatic side margins from the longest legend label", () => {
    const longLabelData = [
      { cat: "Catch-and-shoot attempts", val: 1 },
      { cat: "At rim", val: 2 },
    ]
    const right = renderHook(() =>
      useChartLegendAndMargin({
        data: longLabelData,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        userMargin: { right: "auto" },
      })
    )
    const left = renderHook(() =>
      useChartLegendAndMargin({
        data: longLabelData,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        legendPosition: "left",
        userMargin: { left: "auto" },
      })
    )

    expect(right.result.current.margin.right).toBeGreaterThan(110)
    expect(left.result.current.margin.left).toBe(right.result.current.margin.right)
  })

  it("grows automatic horizontal margins for wrapped or distant legends", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data: [],
        colorBy: undefined,
        colorScale: undefined,
        showLegend: false,
        legendPosition: "bottom",
        userMargin: { bottom: "auto" },
        chartWidth: 220,
        additionalLegend: {
          gradient: {
            domain: [0, 1],
            colorFn: () => "#ccc",
            label: "Probability",
          },
          legendDistance: 70,
        },
      })
    )

    expect(result.current.margin.bottom).toBe(104)
  })

  it("keeps a titled top legend below the title band", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        legendPosition: "top",
        userMargin: { top: "auto" },
        chartWidth: 600,
        hasTitle: true,
      })
    )

    expect(result.current.margin.top).toBe(56)
  })

  it("merges user margin with defaults", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: undefined,
        colorScale: undefined,
        showLegend: false,
        userMargin: { top: 10, left: 30 },
      })
    )
    expect(result.current.margin).toEqual({
      top: 10, bottom: 60, left: 30, right: 40,
    })
  })

  it("uses custom defaults when provided", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: undefined,
        colorScale: undefined,
        showLegend: false,
        userMargin: undefined,
        defaults: { top: 5, bottom: 5, left: 5, right: 5 },
      })
    )
    expect(result.current.margin).toEqual({ top: 5, bottom: 5, left: 5, right: 5 })
  })
})

// ── useChartMode ──────────────────────────────────────────────────────────

describe("useChartMode", () => {
  it("uses primary defaults when mode is undefined", () => {
    const result = useChartMode(undefined, {})
    expect(result.mode).toBe("primary")
    expect(result.width).toBe(600)
    expect(result.height).toBe(400)
    expect(result.showAxes).toBe(true)
    expect(result.showGrid).toBe(false)
    expect(result.enableHover).toBe(true)
  })

  it("uses context mode defaults", () => {
    const result = useChartMode("context", {})
    expect(result.mode).toBe("context")
    expect(result.width).toBe(400)
    expect(result.height).toBe(250)
    expect(result.showAxes).toBe(false)
    expect(result.enableHover).toBe(false)
    expect(result.showLegend).toBe(false)
  })

  it("uses sparkline mode defaults", () => {
    const result = useChartMode("sparkline", {})
    expect(result.width).toBe(120)
    expect(result.height).toBe(24)
    expect(result.showAxes).toBe(false)
    expect(result.enableHover).toBe(false)
    expect(result.showLegend).toBe(false)
    expect(result.showLabels).toBe(false)
    expect(result.marginDefaults).toEqual({ top: 2, bottom: 2, left: 0, right: 0 })
  })

  it("user-provided width/height override mode defaults", () => {
    const result = useChartMode("sparkline", { width: 200, height: 50 })
    expect(result.width).toBe(200)
    expect(result.height).toBe(50)
  })

  it("user-provided showGrid overrides mode default", () => {
    const result = useChartMode("primary", { showGrid: true })
    expect(result.showGrid).toBe(true)
  })

  it("suppresses labels in context mode", () => {
    const result = useChartMode("context", {
      title: "My Title",
      xLabel: "X",
      yLabel: "Y",
    })
    expect(result.title).toBeUndefined()
    expect(result.xLabel).toBeUndefined()
    expect(result.yLabel).toBeUndefined()
  })

  it("suppresses labels in sparkline mode", () => {
    const result = useChartMode("sparkline", {
      title: "Spark",
      categoryLabel: "Cat",
      valueLabel: "Val",
    })
    expect(result.title).toBeUndefined()
    expect(result.categoryLabel).toBeUndefined()
    expect(result.valueLabel).toBeUndefined()
  })

  it("preserves labels in primary mode", () => {
    const result = useChartMode("primary", {
      title: "My Chart",
      xLabel: "Time",
      yLabel: "Value",
    })
    expect(result.title).toBe("My Chart")
    expect(result.xLabel).toBe("Time")
    expect(result.yLabel).toBe("Value")
  })

  it("forces enableHover true when linkedHover is truthy", () => {
    const result = useChartMode("context", {
      linkedHover: { name: "hl", fields: ["cat"] },
    })
    // Context mode normally has enableHover false, but linkedHover overrides
    expect(result.enableHover).toBe(true)
  })

  it("uses primaryDefaults for width/height in primary mode", () => {
    const result = useChartMode(undefined, {}, { width: 800, height: 500 })
    expect(result.width).toBe(800)
    expect(result.height).toBe(500)
  })

  it("ignores primaryDefaults in non-primary modes", () => {
    const result = useChartMode("sparkline", {}, { width: 800, height: 500 })
    expect(result.width).toBe(120)
    expect(result.height).toBe(24)
  })

  it("applies matching responsiveRules before mode defaults", () => {
    const result = useChartMode("primary", {
      width: 390,
      responsiveRules: [
        {
          when: { maxWidth: 430 },
          transform: {
            mode: "mobile",
            showAxes: false,
            showLegend: false,
            mobileInteraction: { targetSize: 48 },
            mobileSemantics: { minimumHitTarget: 48 },
          },
        },
      ],
    })
    expect(result.width).toBe(390)
    expect(result.mode).toBe("mobile")
    expect(result.showAxes).toBe(false)
    expect(result.showLegend).toBe(false)
    expect(result.showLabels).toBe(true)
    expect(result.marginDefaults).toEqual({ top: 28, bottom: 42, left: 44, right: 16 })
    expect(result.mobileInteraction.targetSize).toBe(48)
    expect(result.mobileSemantics?.minimumHitTarget).toBe(48)
  })

  it("keeps explicitly disabled mobile interaction disabled when re-resolved", () => {
    const disabled = resolveMobileInteraction(false)
    const result = resolveMobileInteraction(disabled, { width: 390 })

    expect(result.enabled).toBe(false)
    expect(result.targetSize).toBe(44)
  })
})

// ── useLegendInteraction ─────────────────────────────────────────────────

describe("useLegendInteraction", () => {
  const allCategories = ["A", "B", "C"]

  it("returns null legendSelectionHook when mode is undefined", () => {
    const { result } = renderHook(() =>
      useLegendInteraction(undefined, "cat", allCategories)
    )
    expect(result.current.legendSelectionHook).toBeNull()
  })

  it("returns null legendSelectionHook when mode is 'none'", () => {
    const { result } = renderHook(() =>
      useLegendInteraction("none", "cat", allCategories)
    )
    expect(result.current.legendSelectionHook).toBeNull()
  })

  it("highlight mode: onLegendHover sets highlightedCategory", () => {
    const { result } = renderHook(() =>
      useLegendInteraction("highlight", "cat", allCategories)
    )
    expect(result.current.highlightedCategory).toBeNull()

    act(() => {
      result.current.onLegendHover({ label: "A" })
    })

    expect(result.current.highlightedCategory).toBe("A")
  })

  it("highlight mode: onLegendHover(null) clears highlight", () => {
    const { result } = renderHook(() =>
      useLegendInteraction("highlight", "cat", allCategories)
    )

    act(() => {
      result.current.onLegendHover({ label: "B" })
    })
    expect(result.current.highlightedCategory).toBe("B")

    act(() => {
      result.current.onLegendHover(null)
    })
    expect(result.current.highlightedCategory).toBeNull()
  })

  it("highlight mode: legendSelectionHook predicate matches highlighted category", () => {
    const { result } = renderHook(() =>
      useLegendInteraction("highlight", "cat", allCategories)
    )

    act(() => {
      result.current.onLegendHover({ label: "A" })
    })

    const hook = result.current.legendSelectionHook
    expect(hook).not.toBeNull()
    expect(hook!.isActive).toBe(true)
    expect(hook!.predicate({ cat: "A" })).toBe(true)
    expect(hook!.predicate({ cat: "B" })).toBe(false)
  })

  it("highlight mode: onLegendClick is a no-op", () => {
    const { result } = renderHook(() =>
      useLegendInteraction("highlight", "cat", allCategories)
    )

    act(() => {
      result.current.onLegendClick({ label: "A" })
    })

    // isolatedCategories should remain empty, no state change
    expect(result.current.isolatedCategories.size).toBe(0)
    expect(result.current.legendSelectionHook).toBeNull()
  })

  it("non-isolate mode returns a hook-local empty isolated category set", () => {
    const first = renderHook(() =>
      useLegendInteraction("highlight", "cat", allCategories)
    )
    const second = renderHook(() =>
      useLegendInteraction("highlight", "cat", allCategories)
    )

    const firstEmptySet = first.result.current.isolatedCategories
    first.rerender()

    expect(first.result.current.isolatedCategories).toBe(firstEmptySet)

    firstEmptySet.add("A")
    expect(second.result.current.isolatedCategories.has("A")).toBe(false)
  })

  it("isolate mode: onLegendClick toggles category in isolatedCategories", () => {
    const { result } = renderHook(() =>
      useLegendInteraction("isolate", "cat", allCategories)
    )

    act(() => {
      result.current.onLegendClick({ label: "A" })
    })
    expect(result.current.isolatedCategories.has("A")).toBe(true)
    expect(result.current.isolatedCategories.size).toBe(1)

    // Click again to remove
    act(() => {
      result.current.onLegendClick({ label: "A" })
    })
    expect(result.current.isolatedCategories.has("A")).toBe(false)
    expect(result.current.isolatedCategories.size).toBe(0)
  })

  it("isolate mode: clicking all categories resets to empty set (Carbon behavior)", () => {
    const { result } = renderHook(() =>
      useLegendInteraction("isolate", "cat", allCategories)
    )

    act(() => {
      result.current.onLegendClick({ label: "A" })
    })
    act(() => {
      result.current.onLegendClick({ label: "B" })
    })
    act(() => {
      result.current.onLegendClick({ label: "C" })
    })

    // All 3 categories selected => resets to empty
    expect(result.current.isolatedCategories.size).toBe(0)
  })

  it("isolate mode: legendSelectionHook predicate matches isolated categories", () => {
    const { result } = renderHook(() =>
      useLegendInteraction("isolate", "cat", allCategories)
    )

    act(() => {
      result.current.onLegendClick({ label: "A" })
    })
    act(() => {
      result.current.onLegendClick({ label: "C" })
    })

    const hook = result.current.legendSelectionHook
    expect(hook).not.toBeNull()
    expect(hook!.isActive).toBe(true)
    expect(hook!.predicate({ cat: "A" })).toBe(true)
    expect(hook!.predicate({ cat: "B" })).toBe(false)
    expect(hook!.predicate({ cat: "C" })).toBe(true)
  })

  it("isolate mode: onLegendHover is a no-op", () => {
    const { result } = renderHook(() =>
      useLegendInteraction("isolate", "cat", allCategories)
    )

    act(() => {
      result.current.onLegendHover({ label: "A" })
    })

    // highlightedCategory should remain null, no state change
    expect(result.current.highlightedCategory).toBeNull()
    expect(result.current.legendSelectionHook).toBeNull()
  })
})

// ── useChartSelection: onClick ──────────────────────────────────────────

describe("useChartSelection onClick", () => {
  it("calls onClick with unwrapped datum and coordinates", () => {
    const onClick = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onClick, chartType: "BarChart" }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customClickBehavior({ x: 10, y: 20, data: { id: 1, name: "test" } })
    })

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith(
      { id: 1, name: "test" },
      { x: 10, y: 20 }
    )
  })

  it("unwraps .datum property for onClick", () => {
    const onClick = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onClick }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customClickBehavior({ x: 5, y: 15, datum: { val: 42 } })
    })

    expect(onClick).toHaveBeenCalledWith({ val: 42 }, { x: 5, y: 15 })
  })

  it("does not call onClick when d is null", () => {
    const onClick = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onClick }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customClickBehavior(null)
    })

    expect(onClick).not.toHaveBeenCalled()
  })

  it("defaults x/y to 0 when missing from frame event", () => {
    const onClick = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onClick }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.customClickBehavior({ data: { a: 1 } })
    })

    expect(onClick).toHaveBeenCalledWith({ a: 1 }, { x: 0, y: 0 })
  })
})

// ── useChartSelection: crosshair (x-position mode) ─────────────────────

describe("useChartSelection crosshair x-position mode", () => {
  it("sets crosshair position on hover and clears on hover-end", () => {
    // Render both the selection hook and a crosshair reader in the same tree
    const { result } = renderHook(
      () => {
        const selection = useChartSelection({
          linkedHover: { name: "testCH", mode: "x-position", xField: "time" },
          chartType: "LineChart",
        })
        const crosshair = useCrosshairPosition("testCH")
        return { selection, crosshair }
      },
      { wrapper: createWrapper() }
    )

    // Initially no crosshair
    expect(result.current.crosshair).toBeNull()

    // Hover with valid xField value
    act(() => {
      result.current.selection.customHoverBehavior({ x: 10, y: 20, data: { time: 42, value: 100 } })
    })

    // Crosshair should be set with the xField value
    expect(result.current.crosshair).not.toBeNull()
    expect(result.current.crosshair!.xValue).toBe(42)
    expect(result.current.crosshair!.sourceId).toBe(result.current.selection.crosshairSourceId)

    // Hover-end clears the crosshair
    act(() => {
      result.current.selection.customHoverBehavior(null)
    })

    expect(result.current.crosshair).toBeNull()
  })

  it("prefers frame-provided xValue for cursor-anchored multi hovers", () => {
    const { result } = renderHook(
      () => {
        const selection = useChartSelection({
          linkedHover: { name: "multiCH", mode: "x-position", xField: "time" },
          chartType: "LineChart",
        })
        const crosshair = useCrosshairPosition("multiCH")
        return { selection, crosshair }
      },
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.selection.customHoverBehavior({
        x: 10,
        y: 20,
        xValue: 42.5,
        data: { time: 40, value: 100 },
      })
    })

    expect(result.current.crosshair?.xValue).toBe(42.5)
  })

  it("clears crosshair on unmount", () => {
    const { result, unmount } = renderHook(
      () => {
        const selection = useChartSelection({
          linkedHover: { name: "unmountCH", mode: "x-position", xField: "time" },
        })
        const crosshair = useCrosshairPosition("unmountCH")
        return { selection, crosshair }
      },
      { wrapper: createWrapper() }
    )

    // Set a crosshair position
    act(() => {
      result.current.selection.customHoverBehavior({ x: 1, y: 2, data: { time: 99 } })
    })
    expect(result.current.crosshair).not.toBeNull()

    // Unmount should clear it via cleanup effect
    unmount()

    // Read from store directly after unmount
    const { result: readerResult } = renderHook(
      () => useCrosshairPosition("unmountCH"),
      { wrapper: createWrapper() }
    )
    expect(readerResult.current).toBeNull()
  })

  it("returns a stable crosshairSourceId", () => {
    const { result } = renderHook(
      () => useChartSelection({
        linkedHover: { name: "ch", mode: "x-position", xField: "x" },
      }),
      { wrapper: createWrapper() }
    )

    expect(typeof result.current.crosshairSourceId).toBe("string")
    expect(result.current.crosshairSourceId.length).toBeGreaterThan(0)
  })

  it("does not broadcast crosshair for field-based mode", () => {
    const { result } = renderHook(
      () => {
        const selection = useChartSelection({
          linkedHover: { name: "fieldMode", fields: ["region"] },
        })
        const crosshair = useCrosshairPosition("fieldMode")
        return { selection, crosshair }
      },
      { wrapper: createWrapper() }
    )

    // Hover should not set crosshair in field-based mode
    act(() => {
      result.current.selection.customHoverBehavior({ x: 1, y: 2, data: { region: "North" } })
    })
    expect(result.current.crosshair).toBeNull()

    act(() => {
      result.current.selection.customHoverBehavior(null)
    })
    expect(result.current.crosshair).toBeNull()
  })
})

// ── getCrosshairProps ────────────────────────────────────────────────────

describe("getCrosshairProps", () => {
  it("returns crosshair props for x-position mode", () => {
    const result = getCrosshairProps(
      { name: "myChart", mode: "x-position", xField: "time" },
      "source-123"
    )
    expect(result).toEqual({
      linkedCrosshairName: "myChart",
      linkedCrosshairSourceId: "source-123",
    })
  })

  it("returns undefined for field-based mode", () => {
    expect(getCrosshairProps({ name: "hl", fields: ["cat"] }, "s1")).toBeUndefined()
  })

  it("returns undefined when linkedHover is undefined", () => {
    expect(getCrosshairProps(undefined, "s1")).toBeUndefined()
  })

  it("returns undefined when linkedHover is a string", () => {
    expect(getCrosshairProps("hl", "s1")).toBeUndefined()
  })

  it("defaults name to 'hover' when not provided", () => {
    const result = getCrosshairProps({ mode: "x-position" }, "s1")
    expect(result).toEqual({
      linkedCrosshairName: "hover",
      linkedCrosshairSourceId: "s1",
    })
  })
})

// ── useChartSelection: click-to-lock crosshair ─────────────────────────

describe("useChartSelection click-to-lock crosshair", () => {
  const LOCK_NAME = "lockTest"

  beforeEach(() => {
    // Clean up any leftover locked state
    unlockCrosshair(LOCK_NAME)
    setCrosshairPosition(LOCK_NAME, 0, "__reset__")
    clearCrosshairPosition(LOCK_NAME, "__reset__")
  })

  it("click toggles lock on crosshair in x-position mode", () => {
    const { result } = renderHook(
      () => {
        const selection = useChartSelection({
          linkedHover: { name: LOCK_NAME, mode: "x-position", xField: "time" },
          chartType: "LineChart",
        })
        const crosshair = useCrosshairPosition(LOCK_NAME)
        return { selection, crosshair }
      },
      { wrapper: createWrapper() }
    )

    // Hover to set crosshair
    act(() => {
      result.current.selection.customHoverBehavior({ x: 10, y: 20, data: { time: 42, value: 100 } })
    })
    expect(result.current.crosshair?.xValue).toBe(42)
    expect(result.current.crosshair?.locked).toBeFalsy()

    // Click to lock
    act(() => {
      result.current.selection.customClickBehavior({ x: 10, y: 20, data: { time: 42, value: 100 } })
    })
    expect(result.current.crosshair?.xValue).toBe(42)
    expect(result.current.crosshair?.locked).toBe(true)

    // Hover should be ignored while locked
    act(() => {
      result.current.selection.customHoverBehavior({ x: 30, y: 40, data: { time: 99, value: 200 } })
    })
    expect(result.current.crosshair?.xValue).toBe(42) // still locked at 42

    // Hover-end should not clear while locked
    act(() => {
      result.current.selection.customHoverBehavior(null)
    })
    expect(result.current.crosshair).not.toBeNull()

    // Click again to unlock
    act(() => {
      result.current.selection.customClickBehavior({ x: 10, y: 20, data: { time: 42, value: 100 } })
    })
    expect(result.current.crosshair).toBeNull()
  })

  it("click can lock using frame-provided xValue when the hit datum lacks xField", () => {
    const { result } = renderHook(
      () => {
        const selection = useChartSelection({
          linkedHover: { name: LOCK_NAME, mode: "x-position", xField: "time" },
          chartType: "LineChart",
        })
        const crosshair = useCrosshairPosition(LOCK_NAME)
        return { selection, crosshair }
      },
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.selection.customClickBehavior({ x: 10, y: 20, xValue: 42, data: { value: 100 } })
    })

    expect(result.current.crosshair?.xValue).toBe(42)
    expect(result.current.crosshair?.locked).toBe(true)
  })

  it("click does NOT toggle lock in field-based mode", () => {
    const { result } = renderHook(
      () => {
        const selection = useChartSelection({
          linkedHover: { name: "fieldLock", fields: ["region"] },
          chartType: "BarChart",
        })
        const crosshair = useCrosshairPosition("fieldLock")
        return { selection, crosshair }
      },
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.selection.customClickBehavior({ x: 10, y: 20, data: { region: "North" } })
    })
    // No crosshair should be set in field-based mode
    expect(result.current.crosshair).toBeNull()
  })
})

// ── useChartSelection: series-identity mode ────────────────────────────

describe("useChartSelection series mode", () => {
  it("broadcasts on the auto-resolved series field so a sibling dims by series", () => {
    const { result } = renderHook(
      () => {
        const producer = useChartSelection({
          linkedHover: { name: "seriesSync", mode: "series" },
          colorByField: "region", // resolved series-identity field
          chartType: "LineChart",
        })
        const consumer = useSelection({ name: "seriesSync", fields: ["region"] })
        return { producer, consumer }
      },
      { wrapper: createWrapper() }
    )

    // Nothing hovered yet.
    expect(result.current.consumer.isActive).toBe(false)

    // Hovering a datum that carries the series field broadcasts {region: value}.
    act(() => {
      result.current.producer.customHoverBehavior({ x: 1, y: 2, data: { region: "EU", value: 10 } })
    })
    expect(result.current.consumer.isActive).toBe(true)
    expect(result.current.consumer.predicate({ region: "EU" })).toBe(true)
    expect(result.current.consumer.predicate({ region: "NA" })).toBe(false)

    // Hover-end clears the selection.
    act(() => {
      result.current.producer.customHoverBehavior(null)
    })
    expect(result.current.consumer.isActive).toBe(false)
  })

  it("honors an explicit seriesField override (ignoring colorByField)", () => {
    const { result } = renderHook(
      () => {
        const producer = useChartSelection({
          linkedHover: { name: "ovr", mode: "series", seriesField: "team" },
          colorByField: "region", // overridden by the explicit seriesField
          chartType: "BarChart",
        })
        const consumer = useSelection({ name: "ovr", fields: ["team"] })
        return { producer, consumer }
      },
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.producer.customHoverBehavior({ x: 1, y: 2, data: { region: "EU", team: "Blue" } })
    })
    // Keyed on team, not region.
    expect(result.current.consumer.predicate({ team: "Blue" })).toBe(true)
    expect(result.current.consumer.predicate({ team: "Red" })).toBe(false)
    expect(result.current.consumer.predicate({ team: "Blue", region: "NA" })).toBe(true)
  })
})
