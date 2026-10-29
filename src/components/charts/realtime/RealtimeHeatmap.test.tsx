
import React from "react"
import { render, act, waitFor } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { RealtimeHeatmap } from "./RealtimeHeatmap"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { getSequentialInterpolator } from "../shared/colorPalettes"
import { LIGHT_THEME, ThemeProvider } from "../../ThemeProvider"

describe("RealtimeHeatmap", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("renders a canvas-based frame", () => {
    const { container } = render(
      <TooltipProvider><RealtimeHeatmap /></TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    expect(frame?.querySelector("canvas")).toBeTruthy()
  })

  it("ref exposes push, pushMany, getData, and clear", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeHeatmap>>()
    render(<TooltipProvider><RealtimeHeatmap ref={ref} /></TooltipProvider>)
    expect(typeof ref.current!.push).toBe("function")
    expect(typeof ref.current!.pushMany).toBe("function")
    expect(typeof ref.current!.getData).toBe("function")
    expect(typeof ref.current!.clear).toBe("function")
  })

  it("push and getData track data", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeHeatmap>>()
    render(<TooltipProvider><RealtimeHeatmap ref={ref} timeAccessor="t" valueAccessor="v" /></TooltipProvider>)
    act(() => { ref.current!.push({ t: 1, v: 5 }) })
    act(() => { ref.current!.push({ t: 2, v: 10 }) })
    expect(ref.current!.getData().length).toBe(2)
  })

  it("clear empties the buffer", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeHeatmap>>()
    render(<TooltipProvider><RealtimeHeatmap ref={ref} timeAccessor="t" valueAccessor="v" /></TooltipProvider>)
    act(() => { ref.current!.push({ t: 1, v: 5 }) })
    act(() => { ref.current!.clear() })
    expect(ref.current!.getData().length).toBe(0)
  })

  it("accepts all heatmap-specific props without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeHeatmap
          heatmapXBins={30}
          heatmapYBins={15}
          aggregation="sum"
          width={800}
          height={400}
          timeAccessor="ts"
          valueAccessor="val"
          decay={{ type: "exponential", halfLife: 80 }}
          pulse={{ duration: 300 }}
          staleness={{ threshold: 3000 }}
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  it("renders with controlled data prop", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeHeatmap
          data={[{ time: 1, value: 5 }, { time: 2, value: 10 }]}
          timeAccessor="time"
          valueAccessor="value"
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  it("uses a custom color scale for aggregated cells", () => {
    const customColorScale = vi.fn((value: number) => `rgb(${value}, 11, 13)`)

    render(
      <TooltipProvider>
        <RealtimeHeatmap
          data={[{ x: 5, y: 5, value: 2 }, { x: 95, y: 95, value: 7 }]}
          timeAccessor="x"
          valueAccessor="value"
          timeExtent={[0, 100]}
          valueExtent={[0, 100]}
          aggregation="sum"
          colorScheme="custom"
          customColorScale={customColorScale}
        />
      </TooltipProvider>
    )

    expect(customColorScale).toHaveBeenCalledWith(2)
    expect(customColorScale).toHaveBeenCalledWith(7)
  })

  it.each(["__proto__", "constructor", "toString"])(
    "falls back safely for prototype-like scheme %s",
    async (colorScheme) => {
      const { container } = render(
        <TooltipProvider>
          <RealtimeHeatmap
            data={[{ x: 2, value: 2 }, { x: 8, value: 7 }]}
            timeAccessor="x"
            valueAccessor="value"
            timeExtent={[0, 10]}
            valueExtent={[0, 10]}
            aggregation="sum"
            colorScheme={colorScheme}
            showLegend
          />
        </TooltipProvider>
      )

      const blues = getSequentialInterpolator(undefined)
      await waitFor(() => {
        const stopColors = Array.from(
          container.querySelectorAll("stop"),
          (stop) => stop.getAttribute("stop-color")
        )
        // The default side legend runs from the high end to the low end.
        // Asserting both endpoints proves the unsafe name selected the full
        // Blues interpolator rather than an inherited object property.
        expect(stopColors[0]).toBe(blues(1))
        expect(stopColors.at(-1)).toBe(blues(0))
      })
    }
  )

  it("renders an interactive continuous legend over the aggregated value domain", async () => {
    const { container, getByText } = render(
      <TooltipProvider>
        <RealtimeHeatmap
          data={[{ x: 5, y: 5, value: 2 }, { x: 95, y: 95, value: 7 }]}
          timeAccessor="x"
          valueAccessor="value"
          timeExtent={[0, 100]}
          valueExtent={[0, 100]}
          aggregation="sum"
          showLegend
          legendInteraction="highlight"
        />
      </TooltipProvider>
    )
    await waitFor(() => {
      expect(getByText("sum")).toBeTruthy()
      expect(container.querySelectorAll(".semiotic-gradient-legend-bin")).toHaveLength(5)
    })
  })
})

describe("RealtimeHeatmap live colour legend", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  // One time column and two value rows over a fixed value domain, so each
  // pushed row lands in a known cell and the count domain is predictable.
  const binned = {
    timeAccessor: "t",
    valueAccessor: "v",
    valueExtent: [0, 10] as [number, number],
    heatmapXBins: 1,
    heatmapYBins: 2
  }
  const rows = (v: number, count: number) =>
    Array.from({ length: count }, (_, t) => ({ t, v }))
  type HeatmapRef = React.ElementRef<typeof RealtimeHeatmap>

  // The canvas mock fires frames synchronously, so one flushed batch is
  // one rebuilt scene.
  async function pushFrame(ref: React.RefObject<HeatmapRef | null>, data: object[]) {
    await act(async () => {
      ref.current!.pushMany(data)
      await Promise.resolve()
    })
  }

  // The side legend lists its label, then the high and low domain ends.
  function legendEnds(container: HTMLElement): (string | null)[] {
    const legend = container.querySelector('g[aria-label="count"]')
    return Array.from(
      legend?.querySelectorAll(":scope > text") ?? [],
      (text) => text.textContent
    ).slice(1)
  }

  it("tracks the live count domain while rows stream in", async () => {
    const ref = React.createRef<HeatmapRef>()
    const { container } = render(
      <TooltipProvider>
        <RealtimeHeatmap ref={ref} {...binned} showLegend />
      </TooltipProvider>
    )
    await pushFrame(ref, [...rows(1, 3), ...rows(9, 1)])
    expect(legendEnds(container)).toEqual(["3", "1"])
    await pushFrame(ref, rows(9, 4))
    expect(legendEnds(container)).toEqual(["5", "3"])
  })

  it("shows the current domain when the legend is enabled mid-stream", async () => {
    const ref = React.createRef<HeatmapRef>()
    const { container, rerender } = render(
      <TooltipProvider>
        <RealtimeHeatmap ref={ref} {...binned} />
      </TooltipProvider>
    )
    await pushFrame(ref, [...rows(1, 3), ...rows(9, 5)])
    rerender(
      <TooltipProvider>
        <RealtimeHeatmap ref={ref} {...binned} showLegend />
      </TooltipProvider>
    )
    expect(legendEnds(container)).toEqual(["5", "3"])
  })

  it("does not add a commit per frame for a domain no legend reads", async () => {
    const ref = React.createRef<HeatmapRef>()
    let commits = 0
    render(
      <TooltipProvider>
        <React.Profiler id="heatmap" onRender={() => { commits++ }}>
          <RealtimeHeatmap ref={ref} {...binned} />
        </React.Profiler>
      </TooltipProvider>
    )
    // Two warm-up frames settle the first data-driven layout.
    await pushFrame(ref, rows(1, 1))
    await pushFrame(ref, rows(9, 2))
    commits = 0
    // Raising one cell each frame moves the colour domain every frame. The
    // frame still commits once per rebuilt scene to move its axes.
    for (let count = 3; count <= 6; count++) await pushFrame(ref, rows(9, count))
    expect(commits).toBeLessThanOrEqual(4)
  })

  it("draws the legend ramp from the theme's sequential scheme like the cells", async () => {
    const ref = React.createRef<HeatmapRef>()
    const theme = {
      ...LIGHT_THEME,
      colors: { ...LIGHT_THEME.colors, sequential: "viridis" }
    }
    const { container } = render(
      <ThemeProvider theme={theme}>
        <TooltipProvider>
          <RealtimeHeatmap ref={ref} {...binned} showLegend />
        </TooltipProvider>
      </ThemeProvider>
    )
    await pushFrame(ref, [...rows(1, 3), ...rows(9, 1)])
    const viridis = getSequentialInterpolator("viridis")
    const stopColors = Array.from(
      container.querySelectorAll("stop"),
      (stop) => stop.getAttribute("stop-color")
    )
    expect(stopColors[0]).toBe(viridis(1))
    expect(stopColors.at(-1)).toBe(viridis(0))
  })
})

describe("RealtimeHeatmap server-rendered legend", () => {
  // Frames never fire, so after hydration only the scene built during the
  // hydration pass can supply the legend domain.
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock({ stubRaf: "noop" }) })
  afterEach(() => { cleanup() })

  // One time column and two value rows: three rows in one cell and one in
  // the other, so the legend should read 1-3 rather than the 0-1 fallback.
  const data = [
    ...Array.from({ length: 3 }, (_, t) => ({ t, v: 1 })),
    { t: 3, v: 9 }
  ]
  const chart = (
    <TooltipProvider>
      <RealtimeHeatmap
        data={data}
        timeAccessor="t"
        valueAccessor="v"
        valueExtent={[0, 10]}
        heatmapXBins={1}
        heatmapYBins={2}
        showLegend
      />
    </TooltipProvider>
  )

  function legendEnds(root: ParentNode): (string | null)[] {
    const legend = root.querySelector('g[aria-label="count"]')
    return Array.from(
      legend?.querySelectorAll(":scope > text") ?? [],
      (text) => text.textContent
    ).slice(1)
  }

  it("labels the server legend from the drawn cells and keeps it through hydration", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    container.innerHTML = renderToString(chart)
    expect(legendEnds(container)).toEqual(["3", "1"])

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    let root: ReturnType<typeof hydrateRoot> | undefined
    act(() => { root = hydrateRoot(container, chart) })
    const mismatches = errorSpy.mock.calls.filter((call) =>
      /did not match|hydration failed|hydration error/i.test(String(call[0] ?? ""))
    )
    errorSpy.mockRestore()
    expect(mismatches).toEqual([])
    // The first client paint after hydration keeps the scene domain.
    expect(container.querySelector("canvas")).not.toBeNull() // test-quality-gate: allow-mount-only - proves the post-hydration canvas branch is the one being asserted.
    expect(legendEnds(container)).toEqual(["3", "1"])

    act(() => root?.unmount())
    container.remove()
  })
})
