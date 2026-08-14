
import { useEffect } from "react"
import { render, waitFor } from "@testing-library/react"
import { Heatmap } from "./Heatmap"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { LinkedCharts, useSelectionActions } from "../../LinkedCharts"

function SelectHeatmapRow() {
  const { selectPoints } = useSelectionActions("heatmap-row", "test-producer")

  useEffect(() => {
    selectPoints({ y: [1] })
  }, [selectPoints])

  return null
}

describe("Heatmap", () => {
  const sampleData = [
    { x: 1, y: 1, value: 10 },
    { x: 1, y: 2, value: 20 },
    { x: 2, y: 1, value: 15 },
    { x: 2, y: 2, value: 25 }
  ]

  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} width={800} height={600} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    const canvas = frame?.querySelector("canvas")
    expect(canvas).toBeTruthy()
  })

  it("accepts xLabel and yLabel props", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap
          data={sampleData}
          xLabel="Time"
          yLabel="Category"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom color scheme", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} colorScheme="reds" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies viridis color scheme", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} colorScheme="viridis" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("uses customColorScale for canvas cell fills", () => {
    const ctx = document.createElement("canvas").getContext("2d")!
    const fillStyles: string[] = []
    const originalFillRect = ctx.fillRect
    ctx.fillRect = ((...args: [number, number, number, number]) => {
      fillStyles.push(String(ctx.fillStyle))
      return originalFillRect.apply(ctx, args)
    }) as typeof ctx.fillRect
    const customColorScale = (value: number) => `rgb(${value}, 7, 9)`

    render(
      <TooltipProvider>
        <Heatmap
          data={sampleData}
          colorScheme="custom"
          customColorScale={customColorScale}
        />
      </TooltipProvider>
    )

    expect(fillStyles).toEqual(expect.arrayContaining([
      "rgb(10, 7, 9)",
      "rgb(15, 7, 9)",
      "rgb(20, 7, 9)",
      "rgb(25, 7, 9)",
    ]))
  })

  it("falls back to the scheme LUT when customColorScale is not callable", () => {
    const ctx = document.createElement("canvas").getContext("2d")!
    const fillStyles: string[] = []
    const originalFillRect = ctx.fillRect
    ctx.fillRect = ((...args: [number, number, number, number]) => {
      fillStyles.push(String(ctx.fillStyle))
      return originalFillRect.apply(ctx, args)
    }) as typeof ctx.fillRect

    // A non-callable scale used to reach the scene builder and throw on
    // invocation, while the server path silently dropped it. Both now degrade
    // to the named scheme, so the two render paths agree.
    expect(() =>
      render(
        <TooltipProvider>
          <Heatmap
            data={sampleData}
            colorScheme="custom"
            customColorScale={{ range: ["#000", "#fff"] } as unknown as (value: number) => string}
          />
        </TooltipProvider>
      )
    ).not.toThrow()

    expect(fillStyles.length).toBeGreaterThan(0)
    expect(fillStyles.some((fill) => fill.includes("NaN") || fill === "")).toBe(false)
  })

  it("uses frameProps.colorScheme as the final custom-scale override", () => {
    const ctx = document.createElement("canvas").getContext("2d")!
    const fillStyles: string[] = []
    const originalFillRect = ctx.fillRect
    ctx.fillRect = ((...args: [number, number, number, number]) => {
      fillStyles.push(String(ctx.fillStyle))
      return originalFillRect.apply(ctx, args)
    }) as typeof ctx.fillRect

    render(
      <TooltipProvider>
        <Heatmap
          data={sampleData}
          colorScheme="blues"
          customColorScale={(value) => `rgb(${value}, 17, 19)`}
          frameProps={{ colorScheme: "custom" }}
        />
      </TooltipProvider>
    )

    expect(fillStyles).toEqual(expect.arrayContaining([
      "rgb(10, 17, 19)",
      "rgb(25, 17, 19)",
    ]))
  })

  it("shows values when showValues is true", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} showValues={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom valueAccessor", () => {
    const customData = [
      { x: 1, y: 1, count: 10 },
      { x: 1, y: 2, count: 20 }
    ]

    const { container } = render(
      <TooltipProvider>
        <Heatmap data={customData} valueAccessor="count" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom cell border styling", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap
          data={sampleData}
          cellBorderColor="#000"
          cellBorderWidth={2}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("dims cells that do not match an active selection", async () => {
    const ctx = document.createElement("canvas").getContext("2d")!
    const alphaValues: number[] = []
    let currentAlpha = 1
    Object.defineProperty(ctx, "globalAlpha", {
      configurable: true,
      get: () => currentAlpha,
      set: (value: number) => {
        currentAlpha = value
        alphaValues.push(value)
      },
    })

    render(
      <TooltipProvider>
        <LinkedCharts showLegend={false}>
          <SelectHeatmapRow />
          <Heatmap
            data={sampleData}
            selection={{ name: "heatmap-row", unselectedOpacity: 0.24 }}
          />
        </LinkedCharts>
      </TooltipProvider>
    )

    await waitFor(() => expect(alphaValues).toContain(0.24))
  })

  it("allows XYFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap
          data={sampleData}
          frameProps={{
            hoverAnnotation: false
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("updates when data changes", () => {
    const initialData = [
      { x: 1, y: 1, value: 10 },
      { x: 1, y: 2, value: 20 }
    ]

    const { container, rerender } = render(
      <TooltipProvider>
        <Heatmap data={initialData} />
      </TooltipProvider>
    )

    const initialFrame = container.querySelector(".stream-xy-frame")
    expect(initialFrame).toBeTruthy()

    const newData = [
      { x: 1, y: 1, value: 10 },
      { x: 1, y: 2, value: 20 },
      { x: 2, y: 1, value: 15 }
    ]

    rerender(
      <TooltipProvider>
        <Heatmap data={newData} />
      </TooltipProvider>
    )

    const updatedFrame = container.querySelector(".stream-xy-frame")
    expect(updatedFrame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with showLegend", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} showLegend />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with showLegend and legendPosition bottom", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} showLegend legendPosition="bottom" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("passes a gradient legendDistance override to the frame legend", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap
          data={sampleData}
          showLegend
          legendPosition="bottom"
          legend={{ legendDistance: 42 }}
        />
      </TooltipProvider>
    )

    const gradient = container.querySelector("[aria-label='value']")
    // 42px legendDistance is measured from the *outside* of the bottom axis
    // chrome rather than the plot edge, so the legend clears the tick labels.
    // The bottom margin grows to hold chrome + distance + legend, which moves
    // the plot up; the labeled gradient's shared 46px layout box starts at
    // 354 and ends flush at the 400px canvas edge, with the 22px tick band
    // above it.
    expect(gradient?.parentElement?.getAttribute("transform")).toBe(
      "translate(70, 354)"
    )
  })

  it("reserves a side gutter from the rendered gradient label and distance", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap
          data={sampleData}
          valueAccessor={() => 1}
          showLegend
          legend={{ legendDistance: 30 }}
        />
      </TooltipProvider>
    )

    const gradient = container.querySelector("[aria-label='value']")
    const transform = gradient?.parentElement?.getAttribute("transform") ?? ""
    const x = Number(transform.match(/translate\(([-\d.]+)/)?.[1])
    // The measured gradient determines the automatic right margin. Its 3px
    // edge gutter keeps the interactive focus ring inside the SVG.
    expect(x).toBe(497)
  })
})
