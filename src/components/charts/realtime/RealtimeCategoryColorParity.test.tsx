import * as React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CategoryColorProvider } from "../../CategoryColors"
import { LinkedCharts } from "../../LinkedCharts"
import type { StreamXYFrameProps } from "../../stream/types"
import { LIGHT_THEME, ThemeProvider } from "../../ThemeProvider"
import { DEFAULT_COLORS } from "../shared/colorUtils"
import { RealtimeHistogram } from "./RealtimeHistogram"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"

const capturedFrames: StreamXYFrameProps[] = []

vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((props: StreamXYFrameProps, _ref) => {
    capturedFrames.push(props)
    return <div data-testid={`stream-${props.chartType}`} />
  })
}))

interface LegendConfigShape {
  legendGroups?: Array<{
    items: Array<{ label: string; color?: string }>
  }>
}

function latestFrame(chartType: "bar" | "swarm"): StreamXYFrameProps {
  const frame = capturedFrames
    .filter((candidate) => candidate.chartType === chartType)
    .at(-1)
  if (!frame) throw new Error(`No ${chartType} frame was captured`)
  return frame
}

function legendColors(frame: StreamXYFrameProps): Record<string, string> {
  const configs = Array.isArray(frame.legend) ? frame.legend : [frame.legend]
  const result: Record<string, string> = {}
  for (const config of configs) {
    const groups = (config as LegendConfigShape | undefined)?.legendGroups ?? []
    for (const group of groups) {
      for (const item of group.items) {
        if (item.color) result[item.label] = item.color
      }
    }
  }
  return result
}

function markColors(
  frame: StreamXYFrameProps,
  categories: string[]
): Record<string, string | undefined> {
  return Object.fromEntries(
    categories.map((category) => {
      const fill =
        frame.chartType === "swarm"
          ? frame.pointStyle?.({ category }).fill
          : frame.areaStyle?.({ category }).fill
      return [category, typeof fill === "string" ? fill : undefined]
    })
  )
}

const controlledData = [
  { time: 1, value: 4, category: "alpha" },
  { time: 2, value: 8, category: "beta" }
]

describe("realtime categorical mark and legend color parity", () => {
  beforeEach(() => {
    capturedFrames.length = 0
  })

  it("preserves each wrapper's historical implicit-legend behavior", () => {
    render(
      <>
        <RealtimeSwarmChart data={controlledData} categoryAccessor="category" />
        <RealtimeHistogram
          data={controlledData}
          binSize={10}
          categoryAccessor="category"
        />
      </>
    )
    expect(latestFrame("swarm").legend).toBeUndefined()
    expect(latestFrame("bar").legend).toBeTruthy()
  })

  it("uses the controlled-data legend colors for swarm points and histogram stacks", () => {
    render(
      <>
        <RealtimeSwarmChart
          data={controlledData}
          categoryAccessor="category"
          showLegend
        />
        <RealtimeHistogram
          data={controlledData}
          binSize={10}
          categoryAccessor="category"
          showLegend
        />
      </>
    )

    for (const chartType of ["swarm", "bar"] as const) {
      const frame = latestFrame(chartType)
      const marks = markColors(frame, ["alpha", "beta"])
      const swatches = legendColors(frame)
      expect(marks.alpha).toBeTruthy()
      expect(marks.beta).toBeTruthy()
      expect(marks.alpha).not.toBe(marks.beta)
      expect(swatches).toEqual(marks)
    }
  })

  it("treats CSS-looking values from function category accessors as categories", () => {
    const cssNamedCategories = [
      { time: 1, value: 4, category: "red" },
      { time: 2, value: 8, category: "blue" }
    ]
    const categoryAccessor = (datum: (typeof cssNamedCategories)[number]) =>
      datum.category
    render(
      <>
        <RealtimeSwarmChart
          data={cssNamedCategories}
          categoryAccessor={categoryAccessor}
          showLegend
        />
        <RealtimeHistogram
          data={cssNamedCategories}
          binSize={10}
          categoryAccessor={categoryAccessor}
          showLegend
        />
      </>
    )

    for (const chartType of ["swarm", "bar"] as const) {
      const frame = latestFrame(chartType)
      const marks = markColors(frame, ["red", "blue"])
      expect(marks.red).not.toBe("red")
      expect(marks.blue).not.toBe("blue")
      expect(legendColors(frame)).toEqual(marks)
    }
  })

  it("resolves hidden-legend push colors lazily without installing a domain scan", () => {
    render(
      <>
        <RealtimeSwarmChart categoryAccessor="category" showLegend={false} />
        <RealtimeHistogram
          binSize={10}
          categoryAccessor="category"
          showLegend={false}
        />
      </>
    )

    for (const chartType of ["swarm", "bar"] as const) {
      const frame = latestFrame(chartType)
      const marks = markColors(frame, ["alpha", "beta"])
      expect(frame.legend).toBeUndefined()
      expect(frame.onCategoriesChange).toBeUndefined()
      expect(marks.alpha).toBeTruthy()
      expect(marks.alpha).not.toBe(marks.beta)
      if (chartType === "swarm") expect(frame.barColors).toBeUndefined()
    }
  })

  it("uses the eventual LinkedCharts palette on the first retained scene", async () => {
    render(
      <LinkedCharts showLegend>
        <RealtimeSwarmChart categoryAccessor="category" />
      </LinkedCharts>
    )

    const beforeRegistration = markColors(latestFrame("swarm"), ["alpha"])
    expect(beforeRegistration.alpha).toBe(DEFAULT_COLORS[0])

    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["alpha"])
    })

    await waitFor(() => {
      expect(markColors(latestFrame("swarm"), ["alpha"])).toEqual(
        beforeRegistration
      )
    })
  })

  it("keeps themed linked colors stable through registration with parent overrides", async () => {
    const themedColors = ["#123456", "#abcdef"]
    const theme = {
      ...LIGHT_THEME,
      colors: { ...LIGHT_THEME.colors, categorical: themedColors }
    }
    const expected = { alpha: "#parent-alpha", beta: themedColors[1] }
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CategoryColorProvider colors={{ alpha: "#parent-alpha" }}>
          <LinkedCharts showLegend>
            <RealtimeSwarmChart categoryAccessor="category" />
            <RealtimeHistogram
              binSize={10}
              categoryAccessor="category"
            />
          </LinkedCharts>
        </CategoryColorProvider>
      </ThemeProvider>
    )

    const beforeRegistration = {
      swarm: markColors(latestFrame("swarm"), ["alpha", "beta"]),
      histogram: markColors(latestFrame("bar"), ["alpha", "beta"])
    }
    expect(beforeRegistration).toEqual({
      swarm: expected,
      histogram: expected
    })

    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["alpha", "beta"])
      latestFrame("bar").onCategoriesChange?.(["alpha", "beta"])
    })

    await waitFor(() => {
      expect(container.textContent).toContain("beta")
      expect(markColors(latestFrame("swarm"), ["alpha", "beta"])).toEqual(
        expected
      )
      expect(markColors(latestFrame("bar"), ["alpha", "beta"])).toEqual(
        expected
      )
    })
  })

  it("keeps Histogram colors equal across reversed controlled data and the first push scene", () => {
    const reversed = [
      { time: 1, value: 4, category: "beta" },
      { time: 2, value: 8, category: "alpha" }
    ]
    const controlled = render(
      <RealtimeHistogram
        data={reversed}
        binSize={10}
        categoryAccessor="category"
        colors={{ alpha: "#explicit-alpha", future: "#future" }}
        showLegend={false}
      />
    )
    const controlledColors = markColors(latestFrame("bar"), ["alpha", "beta"])

    controlled.unmount()
    capturedFrames.length = 0
    render(
      <RealtimeHistogram
        binSize={10}
        categoryAccessor="category"
        colors={{ alpha: "#explicit-alpha", future: "#future" }}
        showLegend={false}
      />
    )
    const pushFrame = latestFrame("bar")
    expect(pushFrame.barColors?.future).toBe("#future")
    // The first bar scene visits the explicit active key, then the remaining
    // active keys alphabetically. The inactive authored key must not reserve
    // a palette slot merely by being present in barColors.
    expect(markColors(pushFrame, ["alpha", "beta"])).toEqual(controlledColors)
  })

  it("disables local interaction when LinkedCharts suppresses the inferred legend", () => {
    render(
      <CategoryColorProvider colors={{ alpha: "#111111", beta: "#222222" }}>
        <LinkedCharts>
          <RealtimeHistogram
            data={controlledData}
            binSize={10}
            categoryAccessor="category"
            legendInteraction="highlight"
          />
        </LinkedCharts>
      </CategoryColorProvider>
    )
    const frame = latestFrame("bar")
    expect(frame.legend).toBeUndefined()

    act(() => {
      frame.legendHoverBehavior?.({
        label: "alpha",
        __semioticCategory: true
      })
    })

    expect(latestFrame("bar").legendHighlightedCategory).toBeNull()
  })

  it("keeps push-domain emission active for a unified linked legend", () => {
    render(
      <LinkedCharts showLegend>
        <RealtimeSwarmChart categoryAccessor="category" />
      </LinkedCharts>
    )

    const frame = latestFrame("swarm")
    expect(frame.legend).toBeUndefined()
    expect(frame.onCategoriesChange).toEqual(expect.any(Function))
  })

  it("keeps discovered push marks, visible legends, and highlight interaction aligned", async () => {
    render(
      <>
        <RealtimeSwarmChart
          categoryAccessor="category"
          showLegend
          legendInteraction="highlight"
        />
        <RealtimeHistogram
          binSize={10}
          categoryAccessor="category"
          showLegend
          legendInteraction="highlight"
        />
      </>
    )

    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["alpha", "beta"])
      latestFrame("bar").onCategoriesChange?.(["alpha", "beta"])
    })

    await waitFor(() => {
      for (const chartType of ["swarm", "bar"] as const) {
        const frame = latestFrame(chartType)
        const marks = markColors(frame, ["alpha", "beta"])
        expect(legendColors(frame)).toEqual(marks)
        expect(frame.legendHoverBehavior).toEqual(expect.any(Function))
      }
    })

    act(() => {
      latestFrame("swarm").legendHoverBehavior?.({
        label: "alpha",
        __semioticCategory: true
      })
      latestFrame("bar").legendHoverBehavior?.({
        label: "alpha",
        __semioticCategory: true
      })
    })

    await waitFor(() => {
      expect(latestFrame("swarm").legendHighlightedCategory).toBe("alpha")
      expect(latestFrame("bar").legendHighlightedCategory).toBe("alpha")
      expect(legendColors(latestFrame("swarm"))).toEqual(
        markColors(latestFrame("swarm"), ["alpha", "beta"])
      )
      expect(legendColors(latestFrame("bar"))).toEqual(
        latestFrame("bar").barColors
      )
    })
  })

  it("uses the ambient categorical theme for controlled and push marks", async () => {
    const themedColors = ["#123456", "#abcdef"]
    const theme = {
      ...LIGHT_THEME,
      colors: { ...LIGHT_THEME.colors, categorical: themedColors }
    }
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <RealtimeSwarmChart
          data={controlledData}
          categoryAccessor="category"
          showLegend
        />
        <RealtimeHistogram
          data={controlledData}
          binSize={10}
          categoryAccessor="category"
          showLegend
        />
      </ThemeProvider>
    )

    const expectedControlledTheme = {
      alpha: themedColors[0],
      beta: themedColors[1]
    }
    expect(markColors(latestFrame("swarm"), ["alpha", "beta"])).toEqual(
      expectedControlledTheme
    )
    expect(markColors(latestFrame("bar"), ["alpha", "beta"])).toEqual(
      expectedControlledTheme
    )

    capturedFrames.length = 0
    rerender(
      <ThemeProvider theme={theme}>
        <RealtimeSwarmChart categoryAccessor="category" showLegend />
        <RealtimeHistogram
          binSize={10}
          categoryAccessor="category"
          showLegend
        />
      </ThemeProvider>
    )
    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["alpha", "beta"])
      latestFrame("bar").onCategoriesChange?.(["alpha", "beta"])
    })

    await waitFor(() => {
      const expected = { alpha: themedColors[0], beta: themedColors[1] }
      expect(markColors(latestFrame("swarm"), ["alpha", "beta"])).toEqual(
        expected
      )
      expect(latestFrame("bar").barColors).toEqual(expected)
    })
  })

  it("keeps palette assignments stable across controlled reorder and push eviction", async () => {
    const first = [
      { time: 1, value: 4, category: "alpha" },
      { time: 2, value: 8, category: "beta" },
      { time: 3, value: 5, category: "alpha" }
    ]
    const reordered = [
      { time: 2, value: 8, category: "beta" },
      { time: 3, value: 5, category: "alpha" },
      { time: 4, value: 9, category: "beta" }
    ]
    const { rerender } = render(
      <>
        <RealtimeSwarmChart
          data={first}
          categoryAccessor="category"
          showLegend
        />
        <RealtimeHistogram
          data={first}
          binSize={10}
          categoryAccessor="category"
          showLegend
        />
      </>
    )
    const controlledBefore = {
      swarm: markColors(latestFrame("swarm"), ["alpha", "beta"]),
      bar: markColors(latestFrame("bar"), ["alpha", "beta"])
    }

    rerender(
      <>
        <RealtimeSwarmChart
          data={reordered}
          categoryAccessor="category"
          showLegend
        />
        <RealtimeHistogram
          data={reordered}
          binSize={10}
          categoryAccessor="category"
          showLegend
        />
      </>
    )
    expect(markColors(latestFrame("swarm"), ["alpha", "beta"])).toEqual(
      controlledBefore.swarm
    )
    expect(markColors(latestFrame("bar"), ["alpha", "beta"])).toEqual(
      controlledBefore.bar
    )

    rerender(
      <>
        <RealtimeSwarmChart categoryAccessor="category" showLegend />
        <RealtimeHistogram
          binSize={10}
          categoryAccessor="category"
          showLegend
        />
      </>
    )
    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["alpha", "beta"])
      latestFrame("bar").onCategoriesChange?.(["alpha", "beta"])
    })
    await waitFor(() => {
      expect(
        markColors(latestFrame("swarm"), ["alpha", "beta"]).beta
      ).toBeTruthy()
      expect(latestFrame("bar").barColors?.beta).toBeTruthy()
    })
    const pushBefore = {
      swarm: markColors(latestFrame("swarm"), ["alpha", "beta"]),
      bar: latestFrame("bar").barColors
    }

    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["beta"])
      latestFrame("bar").onCategoriesChange?.(["beta"])
    })
    await waitFor(() => {
      expect(markColors(latestFrame("swarm"), ["beta"]).beta).toBe(
        pushBefore.swarm.beta
      )
      expect(latestFrame("bar").barColors).toEqual({
        beta: pushBefore.bar?.beta
      })
    })

    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["beta", "alpha"])
      latestFrame("bar").onCategoriesChange?.(["beta", "alpha"])
    })
    await waitFor(() => {
      expect(markColors(latestFrame("swarm"), ["alpha", "beta"])).toEqual(
        pushBefore.swarm
      )
      expect(latestFrame("bar").barColors).toEqual(pushBefore.bar)
    })
  })

  it("keeps assignments when an equivalent inline accessor is recreated", () => {
    const first = [
      { time: 1, value: 4, category: "alpha" },
      { time: 2, value: 8, category: "beta" }
    ]
    const { rerender } = render(
      <RealtimeSwarmChart
        data={first}
        categoryAccessor={(datum) => datum.category}
        showLegend
      />
    )
    const before = markColors(latestFrame("swarm"), ["alpha", "beta"])

    rerender(
      <RealtimeSwarmChart
        data={[...first].reverse()}
        categoryAccessor={(datum) => datum.category}
        showLegend
      />
    )

    expect(markColors(latestFrame("swarm"), ["alpha", "beta"])).toEqual(before)
  })

  it("keeps a push legend populated across equivalent inline accessor renders", async () => {
    const { rerender } = render(
      <RealtimeSwarmChart
        categoryAccessor={(datum) => String(datum.category)}
        showLegend
      />
    )
    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["alpha", "beta"])
    })
    await waitFor(() => {
      expect(Object.keys(legendColors(latestFrame("swarm")))).toEqual([
        "alpha",
        "beta"
      ])
    })

    rerender(
      <RealtimeSwarmChart
        categoryAccessor={(datum) => String(datum.category)}
        showLegend
      />
    )

    expect(Object.keys(legendColors(latestFrame("swarm")))).toEqual([
      "alpha",
      "beta"
    ])
  })

  it("prunes expired isolate state and ignores authored legend items", async () => {
    const authoredLegend = {
      legendGroups: [
        {
          label: "Authored",
          type: "line" as const,
          styleFn: () => ({ stroke: "#111" }),
          // Deliberately collides with a real category label.
          items: [{ label: "alpha" }]
        }
      ]
    }
    render(
      <RealtimeHistogram
        binSize={10}
        categoryAccessor="category"
        showLegend
        legendInteraction="isolate"
        legend={authoredLegend}
      />
    )
    act(() => {
      latestFrame("bar").onCategoriesChange?.(["alpha", "beta"])
    })
    await waitFor(() => {
      expect(latestFrame("bar").legendClickBehavior).toEqual(
        expect.any(Function)
      )
    })

    act(() => {
      latestFrame("bar").legendClickBehavior?.({ label: "alpha" })
    })
    expect(latestFrame("bar").legendIsolatedCategories?.size).toBe(0)

    act(() => {
      latestFrame("bar").legendClickBehavior?.({
        label: "alpha",
        __semioticCategory: true
      })
    })
    await waitFor(() => {
      expect(latestFrame("bar").legendIsolatedCategories).toEqual(
        new Set(["alpha"])
      )
    })

    act(() => {
      latestFrame("bar").onCategoriesChange?.(["beta"])
    })
    await waitFor(() => {
      expect(latestFrame("bar").legendIsolatedCategories?.size).toBe(0)
    })
  })

  it("orders the histogram legend exactly like its stack color keys", () => {
    render(
      <RealtimeHistogram
        data={[
          { time: 1, value: 4, category: "beta" },
          { time: 2, value: 8, category: "alpha" },
          { time: 3, value: 3, category: "gamma" }
        ]}
        binSize={10}
        categoryAccessor="category"
        colors={{ gamma: "#333333", alpha: "#111111" }}
        showLegend
      />
    )
    const frame = latestFrame("bar")
    const labels = (
      frame.legend as LegendConfigShape
    ).legendGroups?.[0].items.map((item) => item.label)
    expect(labels).toEqual(["gamma", "alpha", "beta"])
    expect(labels).toEqual(
      Object.keys(frame.barColors ?? {}).filter((category) =>
        ["alpha", "beta", "gamma"].includes(category)
      )
    )
  })

  it("resets push domains when data mode or category accessor changes", async () => {
    const { rerender } = render(
      <RealtimeSwarmChart categoryAccessor="category" showLegend />
    )
    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["old"])
    })
    await waitFor(() => {
      expect(legendColors(latestFrame("swarm"))).toHaveProperty("old")
    })

    rerender(
      <RealtimeSwarmChart
        data={[{ time: 1, value: 1, category: "controlled" }]}
        categoryAccessor="category"
        showLegend
      />
    )
    expect(legendColors(latestFrame("swarm"))).toHaveProperty("controlled")
    expect(legendColors(latestFrame("swarm"))).not.toHaveProperty("old")

    rerender(<RealtimeSwarmChart categoryAccessor="category" showLegend />)
    expect(latestFrame("swarm").legend).toBeUndefined()

    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["fresh"])
    })
    await waitFor(() => {
      expect(legendColors(latestFrame("swarm"))).toHaveProperty("fresh")
    })
    rerender(<RealtimeSwarmChart categoryAccessor="other" showLegend />)
    expect(latestFrame("swarm").legend).toBeUndefined()
  })

  it("coerces nullish categories consistently for marks and legends", () => {
    render(
      <>
        <RealtimeSwarmChart
          data={[
            { time: 1, value: 4, category: null },
            { time: 2, value: 8 }
          ]}
          categoryAccessor="category"
          showLegend
        />
        <RealtimeHistogram
          data={[
            { time: 1, value: 4, category: null },
            { time: 2, value: 8 }
          ]}
          binSize={10}
          categoryAccessor="category"
          showLegend
        />
      </>
    )
    const categories = ["null", "undefined"]
    expect(Object.keys(latestFrame("bar").barColors ?? {})).toEqual(categories)
    for (const chartType of ["swarm", "bar"] as const) {
      const frame = latestFrame(chartType)
      expect(Object.keys(legendColors(frame))).toEqual(categories)
      expect(markColors(frame, categories)).toEqual(legendColors(frame))
    }
  })

  it("falls through partial explicit maps to the themed palette in both data modes", async () => {
    const data = [...controlledData, { time: 3, value: 12, category: "gamma" }]
    const themedColors = ["#100001", "#200002", "#300003"]
    const theme = {
      ...LIGHT_THEME,
      colors: { ...LIGHT_THEME.colors, categorical: themedColors }
    }
    const expected = {
      alpha: "#explicit-alpha",
      beta: themedColors[1],
      gamma: themedColors[2]
    }
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <RealtimeSwarmChart
          data={data}
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha" }}
          showLegend
        />
        <RealtimeHistogram
          data={data}
          binSize={10}
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha" }}
          showLegend
        />
      </ThemeProvider>
    )

    expect(
      markColors(latestFrame("swarm"), ["alpha", "beta", "gamma"])
    ).toEqual(expected)
    expect(markColors(latestFrame("bar"), ["alpha", "beta", "gamma"])).toEqual(
      expected
    )
    expect(legendColors(latestFrame("swarm"))).toEqual(expected)
    expect(legendColors(latestFrame("bar"))).toEqual(expected)

    capturedFrames.length = 0
    rerender(
      <ThemeProvider theme={theme}>
        <RealtimeSwarmChart
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha" }}
          showLegend
        />
        <RealtimeHistogram
          binSize={10}
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha" }}
          showLegend
        />
      </ThemeProvider>
    )
    act(() => {
      latestFrame("swarm").onCategoriesChange?.(["alpha", "beta", "gamma"])
      latestFrame("bar").onCategoriesChange?.(["alpha", "beta", "gamma"])
    })

    await waitFor(() => {
      expect(
        markColors(latestFrame("swarm"), ["alpha", "beta", "gamma"])
      ).toEqual(expected)
      expect(latestFrame("bar").barColors).toEqual(expected)
      expect(legendColors(latestFrame("swarm"))).toEqual(expected)
      expect(legendColors(latestFrame("bar"))).toEqual(expected)
    })
  })

  it("keeps an explicit fill as the fallback beneath exact category colors", () => {
    render(
      <>
        <RealtimeSwarmChart
          data={controlledData}
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha" }}
          fill="#authored-fallback"
          pointStyle={() => ({ fill: "#point-override" })}
          showLegend
        />
        <RealtimeHistogram
          data={controlledData}
          binSize={10}
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha" }}
          fill="#authored-fallback"
          showLegend
        />
      </>
    )

    const expected = {
      alpha: "#explicit-alpha",
      beta: "#authored-fallback"
    }
    expect(latestFrame("bar").barColors).toEqual(expected)
    expect(legendColors(latestFrame("swarm"))).toEqual(expected)
    expect(legendColors(latestFrame("bar"))).toEqual(expected)
    expect(latestFrame("swarm").pointStyle?.(controlledData[1]).fill).toBe(
      "#point-override"
    )
  })

  it("preserves provider, explicit color, fill, pointStyle, and cursor precedence", () => {
    const userPointStyle = () => ({ fill: "#user", cursor: "zoom-in" as const })
    const { rerender } = render(
      <CategoryColorProvider colors={{ alpha: "#provider" }}>
        <RealtimeSwarmChart
          data={controlledData}
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha", beta: "#explicit-beta" }}
          cursor="grab"
          pointStyle={userPointStyle}
          showLegend
        />
        <RealtimeHistogram
          data={controlledData}
          binSize={10}
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha", beta: "#explicit-beta" }}
          cursor="pointer"
          showLegend
        />
      </CategoryColorProvider>
    )

    const swarm = latestFrame("swarm")
    const histogram = latestFrame("bar")
    const expectedProviderColors = {
      alpha: "#provider",
      beta: "#explicit-beta"
    }
    expect(markColors(histogram, ["alpha", "beta"])).toEqual(
      expectedProviderColors
    )
    expect(legendColors(swarm)).toEqual(expectedProviderColors)
    expect(legendColors(histogram)).toEqual(expectedProviderColors)
    expect(swarm.swarmStyle?.cursor).toBe("grab")
    expect(swarm.pointStyle?.(controlledData[0])).toMatchObject({
      fill: "#user",
      cursor: "zoom-in"
    })
    expect(histogram.barStyle?.cursor).toBe("pointer")

    rerender(
      <CategoryColorProvider
        colors={{ alpha: "#provider-updated", beta: "#provider-beta" }}
      >
        <RealtimeSwarmChart
          data={controlledData}
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha", beta: "#explicit-beta" }}
          cursor="grab"
          pointStyle={userPointStyle}
          showLegend
        />
        <RealtimeHistogram
          data={controlledData}
          binSize={10}
          categoryAccessor="category"
          colors={{ alpha: "#explicit-alpha", beta: "#explicit-beta" }}
          cursor="pointer"
          showLegend
        />
      </CategoryColorProvider>
    )
    const expectedUpdatedProviderColors = {
      alpha: "#provider-updated",
      beta: "#provider-beta"
    }
    expect(markColors(latestFrame("bar"), ["alpha", "beta"])).toEqual(
      expectedUpdatedProviderColors
    )
    expect(legendColors(latestFrame("swarm"))).toEqual(
      expectedUpdatedProviderColors
    )
    expect(legendColors(latestFrame("bar"))).toEqual(
      expectedUpdatedProviderColors
    )

    rerender(
      <>
        <RealtimeSwarmChart data={controlledData} fill="#swarm-fill" />
        <RealtimeHistogram
          data={controlledData}
          binSize={10}
          fill="#histogram-fill"
        />
      </>
    )
    expect(latestFrame("swarm").swarmStyle?.fill).toBe("#swarm-fill")
    expect(latestFrame("bar").barStyle?.fill).toBe("#histogram-fill")
  })
})
