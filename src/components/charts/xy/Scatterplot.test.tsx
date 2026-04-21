import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { Scatterplot } from "./Scatterplot"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

// Mock StreamXYFrame so we can inspect the props Scatterplot forwards —
// particularly `pointStyle`, which is the output of the merge chain that
// combines HOC color resolution + top-level primitive props.
let lastXYFrameProps: any = null
vi.mock("../../stream/StreamXYFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastXYFrameProps = props
      // Match the real frame's DOM shape (canvas inside frame div) so the
      // pre-existing smoke tests that check for <canvas> continue to pass.
      return <div className="stream-xy-frame"><canvas /><svg /></div>
    })
  }
})

describe("Scatterplot", () => {
  beforeEach(() => {
    lastXYFrameProps = null
  })
  const sampleData = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 }
  ]

  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup()
  })

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders points correctly", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, so verify the frame with canvas exists
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    const canvas = frame?.querySelector("canvas")
    expect(canvas).toBeTruthy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} width={800} height={600} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    const canvas = frame?.querySelector("canvas")
    expect(canvas).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={[]} />
      </TooltipProvider>
    )

    // Should not render frame when data is empty
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  it("accepts xLabel and yLabel props", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot
          data={sampleData}
          xLabel="Time"
          yLabel="Value"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts custom accessors", () => {
    const customData = [
      { time: 1, value: 10 },
      { time: 2, value: 20 }
    ]

    const { container } = render(
      <TooltipProvider>
        <Scatterplot
          data={customData}
          xAccessor="time"
          yAccessor="value"
        />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts function accessors", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot
          data={sampleData}
          xAccessor={(d) => d.x * 2}
          yAccessor={(d) => d.y}
        />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const coloredData = [
      { x: 1, y: 10, category: "A" },
      { x: 2, y: 20, category: "B" },
      { x: 3, y: 15, category: "A" }
    ]

    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={coloredData} colorBy="category" showLegend={false} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies size encoding", () => {
    const sizedData = [
      { x: 1, y: 10, size: 5 },
      { x: 2, y: 20, size: 10 },
      { x: 3, y: 15, size: 8 }
    ]

    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sizedData} sizeBy="size" sizeRange={[3, 20]} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("allows XYFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot
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
      { x: 1, y: 10 },
      { x: 2, y: 20 }
    ]

    const { container, rerender } = render(
      <TooltipProvider>
        <Scatterplot data={initialData} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const initialFrame = container.querySelector(".stream-xy-frame")
    expect(initialFrame).toBeTruthy()

    // Update with more data
    const newData = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 }
    ]

    rerender(
      <TooltipProvider>
        <Scatterplot data={newData} />
      </TooltipProvider>
    )

    const updatedFrame = container.querySelector(".stream-xy-frame")
    expect(updatedFrame).toBeTruthy()
  })

  it("respects pointRadius prop", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} pointRadius={10} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("respects pointOpacity prop", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} pointOpacity={0.5} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  // ── Top-level primitive style props (Phase B) ─────────────────────────
  describe("primitive style props", () => {
    it("top-level stroke + strokeWidth reach pointStyle output", () => {
      render(
        <TooltipProvider>
          <Scatterplot data={sampleData} stroke="#ff00aa" strokeWidth={3} />
        </TooltipProvider>
      )
      const pointStyleFn = lastXYFrameProps.pointStyle
      const style = pointStyleFn({ x: 1, y: 10 })
      expect(style.stroke).toBe("#ff00aa")
      expect(style.strokeWidth).toBe(3)
    })

    it("top-level opacity reaches pointStyle output", () => {
      render(
        <TooltipProvider>
          <Scatterplot data={sampleData} opacity={0.3} />
        </TooltipProvider>
      )
      const pointStyleFn = lastXYFrameProps.pointStyle
      const style = pointStyleFn({ x: 1, y: 10 })
      expect(style.opacity).toBe(0.3)
    })

    it("does not add primitive keys when none of the three props are set", () => {
      render(
        <TooltipProvider>
          <Scatterplot data={sampleData} />
        </TooltipProvider>
      )
      const pointStyleFn = lastXYFrameProps.pointStyle
      const style = pointStyleFn({ x: 1, y: 10 })
      expect(style).not.toHaveProperty("stroke")
      expect(style).not.toHaveProperty("strokeWidth")
      expect(style).not.toHaveProperty("opacity")
    })

    it("point-level fill from colorBy still resolves alongside the top-level primitives", () => {
      const dataWithCat = [
        { x: 1, y: 10, cat: "A" },
        { x: 2, y: 20, cat: "B" },
      ]
      render(
        <TooltipProvider>
          <Scatterplot
            data={dataWithCat}
            colorBy="cat"
            colorScheme={["#aaa111", "#bbb222"]}
            stroke="#strokeOverride"
          />
        </TooltipProvider>
      )
      const pointStyleFn = lastXYFrameProps.pointStyle
      const styleA = pointStyleFn(dataWithCat[0])
      const styleB = pointStyleFn(dataWithCat[1])
      // Per-category fills preserved; stroke comes from the top-level prop for both.
      expect(styleA.fill).toBe("#aaa111")
      expect(styleB.fill).toBe("#bbb222")
      expect(styleA.stroke).toBe("#strokeOverride")
      expect(styleB.stroke).toBe("#strokeOverride")
    })
  })
})
