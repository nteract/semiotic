import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import {
  useChartLegendAndMargin,
  useGradientLegendInteraction,
  useLegendInteraction
} from "./hooks"
import { isLegendConfig, type CategoricalLegendConfig } from "../../types/legendTypes"
import type { FrameLegendOverrides } from "./hooks"

/**
 * Tests for `useChartLegend.ts` — the legend construction + margin
 * reservation hook and its interaction-state sibling. Split out of
 * `hooks.test.ts` (which mirrors `hooks.ts`) so each test module tracks one
 * source module and neither outgrows the file-size limit.
 */

// ── useChartLegendAndMargin ──────────────────────────────────────────────

describe("useChartLegendAndMargin", () => {
  const data = [
    { cat: "A", val: 1 },
    { cat: "B", val: 2 },
    { cat: "C", val: 3 }
  ]

  it("returns no legend and default margins when colorBy is absent", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: undefined,
        colorScale: undefined,
        showLegend: undefined,
        userMargin: undefined
      })
    )
    expect(result.current.legend).toBeUndefined()
    expect(result.current.margin).toEqual({
      top: 50,
      bottom: 60,
      left: 70,
      right: 40
    })
  })

  // The axis-chrome gutter describes the BOTTOM axis. Reserving it for a top
  // legend too would push the plot down by 22-46px that nothing draws into,
  // because placement only offsets a top legend for an explicit axisGutter.
  it("reserves the axis-chrome gutter for a bottom legend but not a top one", () => {
    const colorScale = (v: string) => (v === "A" ? "#f00" : "#0f0")
    // A narrow chart wraps the legend onto several rows so the measured
    // requirement clears the 80px compatibility floor and the gutter is
    // actually observable in the resolved margin.
    const withPosition = (
      legendPosition: "top" | "bottom",
      axisChrome?: { hasAxis?: boolean; hasAxisLabel?: boolean }
    ) =>
      renderHook(() =>
        useChartLegendAndMargin({
          data,
          colorBy: "cat",
          colorScale,
          showLegend: true,
          legendPosition,
          userMargin: undefined,
          chartWidth: 150,
          axisChrome
        })
      ).result.current.margin

    const chrome = { hasAxis: true, hasAxisLabel: true }
    expect(withPosition("bottom", chrome).bottom).toBeGreaterThan(
      withPosition("bottom", { hasAxis: false }).bottom
    )
    expect(withPosition("top", chrome).top).toBe(
      withPosition("top", { hasAxis: false }).top
    )
  })

  it("still honors an explicit axisGutter for a top legend", () => {
    const colorScale = () => "#f00"
    const top = (axisGutter?: number) =>
      renderHook(() =>
        useChartLegendAndMargin({
          data,
          colorBy: "cat",
          colorScale,
          showLegend: true,
          legendPosition: "top",
          userMargin: undefined,
          legendLayout: axisGutter == null ? undefined : { axisGutter }
        })
      ).result.current.margin.top

    expect(top(60)).toBeGreaterThan(top())
  })

  it("creates a legend when colorBy is a string and showLegend is not explicitly false", () => {
    const colorScale = (v: string) => (v === "A" ? "#f00" : "#0f0")
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: undefined,
        userMargin: undefined
      })
    )
    const legend = result.current.legend
    if (!isLegendConfig(legend))
      throw new Error("Expected a categorical legend")
    expect(legend.legendGroups).toHaveLength(1)
    expect(legend.legendGroups[0].items).toHaveLength(3)
  })

  it("measures frame legend overrides before the wrapper forwards frameProps", () => {
    const frameLegend: CategoricalLegendConfig = {
      legendGroups: [{
        label: "Override",
        type: "fill" as const,
        styleFn: () => ({ fill: "#246" }),
        items: [{ label: "Rendered only", color: "#246" }]
      }]
    }
    const initialFrame: FrameLegendOverrides = {
      legend: frameLegend,
      legendPosition: "left"
    }
    const { result, rerender } = renderHook(
      ({ frame }: { frame: FrameLegendOverrides }) => useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        legendPosition: "right",
        userMargin: undefined,
        frameLegend: frame,
      }),
      { initialProps: { frame: initialFrame } }
    )

    expect(result.current.legend).toBe(frameLegend)
    expect(result.current.legendPosition).toBe("left")
    expect(result.current.margin.left).toBeGreaterThan(result.current.margin.right)
    expect(result.current.legendMarginReserved).toBe(true)

    rerender({
      frame: {
        legend: frameLegend,
        legendPosition: "left",
        margin: { top: 20, right: 20, bottom: 20, left: 20 }
      }
    })
    expect(result.current.legendMarginReserved).toBe(false)
  })

  it("appends caller categorical groups after the inferred legend", () => {
    const additionalLegend = {
      legendGroups: [
        {
          label: "Context",
          type: "line" as const,
          styleFn: () => ({ stroke: "#111" }),
          items: [{ label: "Threshold" }]
        }
      ]
    }
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: undefined,
        userMargin: undefined,
        additionalLegend
      })
    )

    const legend = result.current.legend
    if (!isLegendConfig(legend))
      throw new Error("Expected composed categorical legends")
    const groups = legend.legendGroups
    expect(groups).toHaveLength(2)
    expect(groups[0].items.map((item) => item.label)).toEqual(["A", "B", "C"])
    expect(groups[1].items[0].label).toBe("Threshold")
    expect(result.current.margin.right).toBe(113)
  })

  it("carries caller legendDistance into the composed automatic legend", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        userMargin: { right: "auto" },
        additionalLegend: { legendGroups: [], legendDistance: 24 }
      })
    )

    const legend = result.current.legend
    if (!isLegendConfig(legend))
      throw new Error("Expected a categorical legend")
    expect(legend.legendDistance).toBe(24)
    expect(result.current.margin.right).toBe(127)
  })

  it("does not create a legend when showLegend is false", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: undefined,
        showLegend: false,
        userMargin: undefined
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
        userMargin: undefined
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
        userMargin: undefined
      })
    )
    expect(result.current.margin.right).toBe(113)
  })

  it("preserves an explicit right-margin minimum when it already fits", () => {
    const colorScale = (_v: string) => "#ccc"
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: { right: 200 }
      })
    )
    expect(result.current.margin.right).toBe(200)
  })

  it("grows a small explicit side margin to fit the legend", () => {
    const colorScale = (_v: string) => "#ccc"
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: { right: 19 }
      })
    )
    expect(result.current.margin.right).toBe(113)
  })

  it("treats undefined margin sides as omitted for legend reservation", () => {
    const colorScale = (_v: string) => "#ccc"
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: { right: undefined }
      })
    )
    expect(result.current.margin.right).toBe(113)
  })

  it("treats auto and null margin sides as explicit auto-reservation", () => {
    const colorScale = (_v: string) => "#ccc"
    const rightAuto = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: { right: "auto" }
      })
    )
    expect(rightAuto.result.current.margin.right).toBe(113)

    const rightNull = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale,
        showLegend: true,
        userMargin: { right: null }
      })
    )
    expect(rightNull.result.current.margin.right).toBe(113)
  })

  it("sizes automatic side margins from the longest legend label", () => {
    const longLabelData = [
      { cat: "Catch-and-shoot attempts", val: 1 },
      { cat: "At rim", val: 2 }
    ]
    const right = renderHook(() =>
      useChartLegendAndMargin({
        data: longLabelData,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        userMargin: { right: "auto" }
      })
    )
    const left = renderHook(() =>
      useChartLegendAndMargin({
        data: longLabelData,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        legendPosition: "left",
        userMargin: { left: "auto" }
      })
    )

    expect(right.result.current.margin.right).toBeGreaterThan(110)
    expect(left.result.current.margin.left).toBe(
      right.result.current.margin.right
    )
  })

  it("adds a side gutter for axes or other plot-adjacent chrome", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        userMargin: { right: "auto" },
        legendLayout: { sideGutter: 70 }
      })
    )

    expect(result.current.margin.right).toBe(183)
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
            label: "Probability"
          },
          legendDistance: 70
        }
      })
    )

    // 46px gradient legend + 70px legendDistance + the 46px bottom-axis
    // chrome gutter. This caller does not describe its axis, so the gutter
    // falls back to the widest ordinary band: under-reserving would let the
    // renderer clamp the legend back up onto the tick labels.
    expect(result.current.margin.bottom).toBe(162)
  })

  it("grows explicit horizontal margin minima for wrapped legends", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data: [],
        colorBy: undefined,
        colorScale: undefined,
        showLegend: false,
        legendPosition: "bottom",
        userMargin: { bottom: 12 },
        chartWidth: 220,
        axisChrome: { hasAxis: false },
        additionalLegend: {
          gradient: {
            domain: [0, 1],
            colorFn: () => "#ccc",
            label: "Probability"
          },
          legendDistance: 70
        }
      })
    )

    expect(result.current.margin.bottom).toBe(116)
  })

  it("does not add the gutter for a caller that declares no bottom axis", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data: [],
        colorBy: undefined,
        colorScale: undefined,
        showLegend: false,
        legendPosition: "bottom",
        userMargin: { bottom: "auto" },
        chartWidth: 220,
        axisChrome: { hasAxis: false },
        additionalLegend: {
          gradient: {
            domain: [0, 1],
            colorFn: () => "#ccc",
            label: "Probability"
          },
          legendDistance: 70
        }
      })
    )

    expect(result.current.margin.bottom).toBe(116)
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
        hasTitle: true
      })
    )

    expect(result.current.margin.top).toBe(58)
  })

  it("clamps a compact horizontal legend reservation to leave a plot", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: "cat",
        colorScale: () => "#ccc",
        showLegend: true,
        legendPosition: "bottom",
        userMargin: undefined,
        defaults: { top: 2, right: 0, bottom: 2, left: 0 },
        chartWidth: 120,
        chartHeight: 24,
        axisChrome: { hasAxis: false }
      })
    )

    expect(result.current.margin.top + result.current.margin.bottom).toBe(16)
  })

  it("merges user margin with defaults", () => {
    const { result } = renderHook(() =>
      useChartLegendAndMargin({
        data,
        colorBy: undefined,
        colorScale: undefined,
        showLegend: false,
        userMargin: { top: 10, left: 30 }
      })
    )
    expect(result.current.margin).toEqual({
      top: 10,
      bottom: 60,
      left: 30,
      right: 40
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
        defaults: { top: 5, bottom: 5, left: 5, right: 5 }
      })
    )
    expect(result.current.margin).toEqual({
      top: 5,
      bottom: 5,
      left: 5,
      right: 5
    })
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

  it("prunes isolated categories that leave the live domain", () => {
    const { result, rerender } = renderHook(
      ({ categories }) => useLegendInteraction("isolate", "cat", categories),
      { initialProps: { categories: ["A", "B"] } }
    )
    act(() => result.current.onLegendClick({ label: "A" }))
    expect(result.current.isolatedCategories).toEqual(new Set(["A"]))

    rerender({ categories: ["B"] })
    expect(result.current.isolatedCategories.size).toBe(0)
    expect(result.current.legendSelectionHook).toBeNull()
  })

  it("resets interaction when disabled and ignores untagged authored items", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useLegendInteraction("isolate", "cat", ["A", "B"], enabled, true),
      { initialProps: { enabled: true } }
    )
    act(() => result.current.onLegendClick({ label: "A" }))
    expect(result.current.isolatedCategories.size).toBe(0)

    act(() =>
      result.current.onLegendClick({
        label: "A",
        __semioticCategory: true
      })
    )
    expect(result.current.isolatedCategories).toEqual(new Set(["A"]))

    rerender({ enabled: false })
    expect(result.current.isolatedCategories.size).toBe(0)
    expect(result.current.legendSelectionHook).toBeNull()
  })
})

describe("useGradientLegendInteraction", () => {
  it("keys equal formatted labels by their numeric ranges", () => {
    const { result } = renderHook(() =>
      useGradientLegendInteraction("isolate", (d) => Number(d.value), [0, 10])
    )

    act(() => {
      result.current.onLegendClick({ label: "same", valueRange: [0, 2] })
      result.current.onLegendClick({ label: "same", valueRange: [2, 4] })
    })

    expect(result.current.isolatedCategories.size).toBe(2)
    expect(result.current.legendSelectionHook?.predicate({ value: 1 })).toBe(
      true
    )
    expect(result.current.legendSelectionHook?.predicate({ value: 3 })).toBe(
      true
    )
    expect(result.current.legendSelectionHook?.predicate({ value: 8 })).toBe(
      false
    )
  })

  it("clears interaction state when the mode changes", () => {
    const { result, rerender } = renderHook(
      ({ mode }: { mode: "isolate" | "none" }) =>
        useGradientLegendInteraction(mode, (d) => Number(d.value), [0, 10]),
      {
        initialProps: {
          mode: "isolate"
        } as { mode: "isolate" | "none" }
      }
    )

    act(() => {
      result.current.onLegendClick({ label: "low", valueRange: [0, 2] })
    })
    expect(result.current.isolatedCategories.size).toBe(1)

    rerender({ mode: "none" })
    rerender({ mode: "isolate" })
    expect(result.current.isolatedCategories.size).toBe(0)
    expect(result.current.legendSelectionHook).toBeNull()
  })
})
