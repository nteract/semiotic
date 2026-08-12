
import React from "react"
import { render, act, waitFor } from "@testing-library/react"
import { RealtimeHeatmap } from "./RealtimeHeatmap"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { getSequentialInterpolator } from "../shared/colorPalettes"

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
