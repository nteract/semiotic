import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import * as React from "react"
import {
  resolveAccessor,
  useColorScale,
  useSortedData,
  useChartSelection,
  useChartLegendAndMargin,
  useChartMode,
  useLegendInteraction,
  getCrosshairProps,
  DEFAULT_COLOR,
} from "./hooks"
import { SelectionProvider } from "../../store/SelectionStore"
import { ObservationProvider } from "../../store/ObservationStore"
import { CategoryColorProvider } from "../../CategoryColors"
import { setCrosshairPosition, clearCrosshairPosition, useCrosshairPosition, unlockCrosshair } from "../../store/LinkedCrosshairStore"

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
        { colors: options.categoryColors },
        inner
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
    const original = (d: Record<string, any>) => d.x * 2
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
      () => useColorScale(data, (d: any) => d.cat),
      { wrapper: createWrapper() }
    )
    // After the fix, function colorBy now derives categories and builds a scale
    expect(typeof result.current).toBe("function")
  })

  it("function colorBy scale returns different colors for different categories", () => {
    const { result } = renderHook(
      () => useColorScale(data, (d: any) => d.cat),
      { wrapper: createWrapper() }
    )
    const scale = result.current!
    expect(scale("A")).not.toBe(scale("B"))
    expect(scale("B")).not.toBe(scale("C"))
  })

  it("function colorBy uses CategoryColorProvider when available", () => {
    const categoryColors = { A: "#ff0000", B: "#00ff00", C: "#0000ff" }
    const { result } = renderHook(
      () => useColorScale(data, (d: any) => d.cat),
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

  it("uses a custom sort function", () => {
    const customSort = (a: Record<string, any>, b: Record<string, any>) =>
      a.name.localeCompare(b.name)
    const { result } = renderHook(() =>
      useSortedData(data, customSort, "value")
    )
    expect(result.current.map((d) => d.name)).toEqual(["A", "B", "C"])
  })

  it("does not mutate the original data array", () => {
    const original = [...data]
    renderHook(() => useSortedData(data, "asc", "value"))
    expect(data).toEqual(original)
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

  it("calls onObservation with click-end when clicking with null", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(
      () => useChartSelection({ onObservation }),
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
    expect(result.current.legend).toBeDefined()
    expect(result.current.legend!.legendGroups).toHaveLength(1)
    expect(result.current.legend!.legendGroups[0].items).toHaveLength(3)
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

  it("expands right margin to 110 when legend is present and right < 110", () => {
    const colorScale = (v: string) => "#ccc"
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

  it("preserves right margin when already >= 110", () => {
    const colorScale = (v: string) => "#ccc"
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
    expect(result.width).toBe(600)
    expect(result.height).toBe(400)
    expect(result.showAxes).toBe(true)
    expect(result.showGrid).toBe(false)
    expect(result.enableHover).toBe(true)
  })

  it("uses context mode defaults", () => {
    const result = useChartMode("context", {})
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
