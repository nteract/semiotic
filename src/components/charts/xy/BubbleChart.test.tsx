import { vi } from "vitest"
import { render, fireEvent, act } from "@testing-library/react"
import { createRef } from "react"
import { BubbleChart, type BubbleChartProps } from "./BubbleChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { MultiLineTooltip } from "../../Tooltip/Tooltip"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { RealtimeFrameHandle } from "../../realtime/types"

describe("BubbleChart", () => {
  const sampleData = [
    { x: 1, y: 10, size: 50 },
    { x: 2, y: 20, size: 30 },
    { x: 3, y: 15, size: 70 }
  ]
  type BubbleDatum = (typeof sampleData)[number]
  type BubbleSizeBy = BubbleChartProps<BubbleDatum>["sizeBy"]

  const plotProps = {
    width: 400,
    height: 300,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    xExtent: [0, 4] as [number, number],
    yExtent: [0, 40] as [number, number],
    showAxes: false,
    showGrid: false,
    showLegend: false
  }
  let cleanup: () => void
  let ctx: CanvasRenderingContext2D
  beforeEach(() => {
    cleanup = setupCanvasMock()
    ctx = document.createElement("canvas").getContext("2d")!
  })
  afterEach(() => { cleanup() })

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("survives the loading→data transition without a hooks-count error", () => {
    // Mounting empty (loading skeleton) then re-rendering as data arrives must
    // not call a different number of hooks between renders — otherwise React
    // throws "Rendered more hooks than during the previous render". Regression
    // guard for the misplaced `setup.earlyReturn` return.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const ref = createRef<RealtimeFrameHandle>()
    try {
      const { rerender } = render(
        <TooltipProvider>
          <BubbleChart ref={ref} sizeBy="size" loading />
        </TooltipProvider>
      )
      expect(() =>
        rerender(
          <TooltipProvider>
            <BubbleChart ref={ref} data={sampleData} sizeBy="size" xAccessor="x" yAccessor="y" />
          </TooltipProvider>
        )
      ).not.toThrow()
      expect(ref.current?.getData()).toHaveLength(sampleData.length)
      const hookErr = errSpy.mock.calls.some((c) =>
        String(c[0]).includes("Rendered more hooks") ||
        String(c[0]).includes("change in the order of Hooks")
      )
      expect(hookErr).toBe(false)
    } finally {
      errSpy.mockRestore()
    }
  })

  it("draws every bubble at its scaled position with the size-domain endpoints", () => {
    render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={sampleData} sizeBy="size" />
      </TooltipProvider>
    )

    expect(vi.mocked(ctx.arc).mock.calls.slice(-3)).toEqual([
      [100, 225, 22.5, 0, Math.PI * 2],
      [200, 150, 5, 0, Math.PI * 2],
      [300, 187.5, 40, 0, Math.PI * 2]
    ])
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={[]} sizeBy="size" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  it("shows error when sizeBy is missing", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy={undefined as unknown as BubbleSizeBy} />
      </TooltipProvider>
    )

    const errorEl = container.querySelector("[role='alert']")
    expect(errorEl).toBeTruthy()
    expect(errorEl!.textContent).toContain("sizeBy")
  })

  it("applies custom width and height to both the canvas and bubble positions", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={sampleData} sizeBy="size" width={800} height={600} />
      </TooltipProvider>
    )

    const canvas = container.querySelector("canvas")!
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
    expect(vi.mocked(ctx.arc).mock.calls.slice(-3).map(([x, y]) => [x, y])).toEqual([
      [200, 450], [400, 300], [600, 375]
    ])
  })

  it("renders the authored x and y axis labels", () => {
    const { getByText } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" xLabel="Time" yLabel="Value" />
      </TooltipProvider>
    )

    expect(getByText("Time").tagName).toBe("text")
    expect(getByText("Value").tagName).toBe("text")
  })

  it("paints each category with its explicit color", () => {
    const fill = vi.fn(() => ctx.fillStyle)
    vi.mocked(ctx.fill).mockImplementation(fill)
    const coloredData = [
      { x: 1, y: 10, size: 50, category: "A" },
      { x: 2, y: 20, size: 30, category: "B" },
      { x: 3, y: 15, size: 70, category: "A" }
    ]
    render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={coloredData} sizeBy="size" colorBy="category"
          colorScheme={{ A: "#ff0000", B: "#0000ff" }} />
      </TooltipProvider>
    )

    expect(fill.mock.results.slice(-3).map((result) => result.value)).toEqual([
      "#ff0000", "#0000ff", "#ff0000"
    ])
  })

  it("uses the function sizeBy result for both the domain and the painted radii", () => {
    render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={sampleData} sizeBy={(d) => -d.size} />
      </TooltipProvider>
    )

    // Negating the accessor reverses the size ordering; simply forwarding the
    // original size field would leave the second bubble smallest.
    expect(vi.mocked(ctx.arc).mock.calls.slice(-3).map((call) => call[2])).toEqual([
      22.5, 40, 5
    ])
  })

  it("maps the observed size domain onto the custom radius range", () => {
    render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={sampleData} sizeBy="size" sizeRange={[10, 50]} />
      </TooltipProvider>
    )

    expect(vi.mocked(ctx.arc).mock.calls.slice(-3).map((call) => call[2])).toEqual([
      30, 10, 50
    ])
  })

  it("applies bubble opacity to the fill without dimming the outline", () => {
    const fill = vi.fn(() => ctx.globalAlpha)
    const stroke = vi.fn(() => ctx.globalAlpha)
    vi.mocked(ctx.fill).mockImplementation(fill)
    vi.mocked(ctx.stroke).mockImplementation(stroke)
    render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={sampleData} sizeBy="size" bubbleOpacity={0.8} />
      </TooltipProvider>
    )

    expect(fill.mock.results.slice(-3).map((result) => result.value)).toEqual([0.8, 0.8, 0.8])
    expect(stroke.mock.results.slice(-3).map((result) => result.value)).toEqual([1, 1, 1])
  })

  it("paints bubble outlines with the authored stroke color and width", () => {
    const stroke = vi.fn(() => ({ color: ctx.strokeStyle, width: ctx.lineWidth }))
    vi.mocked(ctx.stroke).mockImplementation(stroke)
    render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={sampleData} sizeBy="size"
          bubbleStrokeWidth={2} bubbleStrokeColor="#000" />
      </TooltipProvider>
    )

    expect(stroke.mock.results.slice(-3).map((result) => result.value)).toEqual([
      { color: "#000", width: 2 },
      { color: "#000", width: 2 },
      { color: "#000", width: 2 }
    ])
  })

  it("allows frameProps to override point styles", () => {
    const fill = vi.fn(() => ctx.fillStyle)
    vi.mocked(ctx.fill).mockImplementation(fill)
    render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={sampleData} sizeBy="size"
          frameProps={{ pointStyle: () => ({ fill: "gold", r: 12 }) }} />
      </TooltipProvider>
    )

    expect(fill.mock.results.map((result) => result.value)).toContain("gold")
    expect(vi.mocked(ctx.arc).mock.calls.slice(-3).map((call) => call[2])).toEqual([12, 12, 12])
  })

  it("repaints replacement data and recalculates its size domain", () => {
    const ref = createRef<RealtimeFrameHandle>()
    const { rerender } = render(
      <TooltipProvider>
        <BubbleChart {...plotProps} ref={ref} data={sampleData} sizeBy="size" />
      </TooltipProvider>
    )
    expect(ref.current!.getData()).toEqual(sampleData)
    vi.mocked(ctx.arc).mockClear()
    const replacement = [
      { x: 1, y: 20, size: 70 },
      { x: 3, y: 10, size: 90 }
    ]
    rerender(
      <TooltipProvider>
        <BubbleChart {...plotProps} ref={ref} data={replacement} sizeBy="size" />
      </TooltipProvider>
    )

    expect(ref.current!.getData()).toEqual(replacement)
    // The synchronous scheduler may paint while replacement effects settle.
    // Check the complete final paint so removed marks cannot linger on canvas.
    const lastClear = vi.mocked(ctx.clearRect).mock.invocationCallOrder.at(-1)!
    const arcs = vi.mocked(ctx.arc).mock
    const finalPaint = arcs.calls.filter((_, index) => arcs.invocationCallOrder[index] > lastClear)
    expect(finalPaint).toEqual([
      [100, 150, 5, 0, Math.PI * 2],
      [300, 225, 40, 0, Math.PI * 2]
    ])
  })

  it.each([
    { label: "enableHover", props: { enableHover: false } },
    { label: "frame hoverAnnotation", props: { frameProps: { hoverAnnotation: false } } }
  ])("clears an active tooltip and disables subsequent hover via $label", async ({ props }) => {
    const tooltip = vi.fn(() => <div>Bubble details</div>)
    const { container, getByText, queryByText, rerender } = render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={sampleData} sizeBy="size" tooltip={tooltip} />
      </TooltipProvider>
    )
    const plot = container.querySelector('.stream-xy-frame > div[role="img"]')!
    fireEvent.mouseMove(plot, { clientX: 100, clientY: 225 })
    await act(async () => { await Promise.resolve() })
    expect(getByText("Bubble details").textContent).toBe("Bubble details")
    expect(tooltip).toHaveBeenCalledWith({ ...sampleData[0], xValue: 1 })
    tooltip.mockClear()

    rerender(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={sampleData} sizeBy="size" tooltip={tooltip} {...props} />
      </TooltipProvider>
    )
    expect(queryByText("Bubble details")).toBeNull()
    fireEvent.mouseMove(plot, { clientX: 200, clientY: 150 })
    await act(async () => { await Promise.resolve() })
    expect(queryByText("Bubble details")).toBeNull()
    expect(tooltip).not.toHaveBeenCalled()
  })

  it("shows the docs MultiLineTooltip for the hovered bubble and dismisses it on leave", async () => {
    const bubbleData = [
      { x: 1, y: 10, size: 30, category: "Tech", name: "Company A" },
      { x: 3, y: 30, size: 50, category: "Finance", name: "Company B" }
    ]
    const { container, getByText, queryByText } = render(
      <TooltipProvider>
        <BubbleChart {...plotProps} data={bubbleData} sizeBy="size" colorBy="category"
          tooltip={MultiLineTooltip({ title: "name", fields: ["category", "x", "y", "size"] })} />
      </TooltipProvider>
    )
    const plot = container.querySelector('.stream-xy-frame > div[role="img"]')!
    fireEvent.mouseMove(plot, { clientX: 100, clientY: 225 })
    await act(async () => { await Promise.resolve() })
    expect(getByText("Company A").textContent).toBe("Company A")
    expect(getByText("Tech").textContent).toBe("category: Tech")
    expect(container.querySelector(".stream-frame-tooltip")?.textContent).toContain("size: 30")
    expect(queryByText("Company B")).toBeNull()

    fireEvent.mouseMove(plot, { clientX: 300, clientY: 75 })
    await act(async () => { await Promise.resolve() })
    expect(getByText("Company B").textContent).toBe("Company B")
    expect(getByText("Finance").textContent).toBe("category: Finance")
    expect(queryByText("Company A")).toBeNull()
    fireEvent.mouseLeave(plot)
    expect(queryByText("Company B")).toBeNull()
  })

  // Legend Tests
  describe("Legend behavior", () => {
    const coloredData = [
      { x: 1, y: 10, size: 50, category: "A" },
      { x: 2, y: 20, size: 30, category: "B" },
      { x: 3, y: 15, size: 70, category: "A" }
    ]

    it("renders without error when colorBy is specified", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart data={coloredData} sizeBy="size" colorBy="category" showLegend={false} />
        </TooltipProvider>
      )

      // Should render the frame successfully
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("renders without error when colorBy is not specified", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart data={sampleData} sizeBy="size" />
        </TooltipProvider>
      )

      // Should still render the frame
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("respects showLegend=false without errors", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart
            data={coloredData}
            sizeBy="size"
            colorBy="category"
            showLegend={false}
          />
        </TooltipProvider>
      )

      // Should render the frame
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("respects showLegend=true without errors", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart
            data={coloredData}
            sizeBy="size"
            colorBy="category"
            showLegend={true}
          />
        </TooltipProvider>
      )

      // Should render the frame
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("adjusts margin without errors when legend configuration is present", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart
            data={coloredData}
            sizeBy="size"
            colorBy="category"
          />
        </TooltipProvider>
      )

      // The frame should render successfully with adjusted margins
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("allows user to override margin even with legend", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart
            data={coloredData}
            sizeBy="size"
            colorBy="category"
            margin={{ top: 10, bottom: 10, left: 10, right: 200 }}
          />
        </TooltipProvider>
      )

      // Custom margin should be respected
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })
  })
})
