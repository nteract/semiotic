import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { MinimapChart } from "./MinimapChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Track all StreamXYFrame render calls to verify main + overview frames
const xyFrameRenders: any[] = []
vi.mock("../../stream/StreamXYFrame", () => {
  const ForwardRef = React.forwardRef((props: any, ref: any) => {
    xyFrameRenders.push(props)
    return <div className="stream-xy-frame"><svg /></div>
  })
  return {
    __esModule: true,
    default: ForwardRef
  }
})

describe("MinimapChart", () => {
  beforeEach(() => {
    xyFrameRenders.length = 0
    // rAF mock: call callback once then become a no-op to avoid infinite recursion
    // from MinimapChart's scale polling loop
    let rafCallCount = 0
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallCount++
      if (rafCallCount <= 2) {
        cb(performance.now())
      }
      return rafCallCount
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  })
  afterEach(() => {
    if ((window.requestAnimationFrame as any).mockRestore) (window.requestAnimationFrame as any).mockRestore()
    if ((window.cancelAnimationFrame as any).mockRestore) (window.cancelAnimationFrame as any).mockRestore()
  })

  const sampleData = [
    { x: 0, y: 10 },
    { x: 1, y: 20 },
    { x: 2, y: 15 },
    { x: 3, y: 25 },
    { x: 4, y: 18 }
  ]

  it("renders without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <MinimapChart data={sampleData} />
      </TooltipProvider>
    )
    const chart = container.querySelector(".minimap-chart")
    expect(chart).toBeTruthy()
  })

  it("contains two frames (main + overview)", () => {
    const { container } = render(
      <TooltipProvider>
        <MinimapChart data={sampleData} />
      </TooltipProvider>
    )
    const frames = container.querySelectorAll(".stream-xy-frame")
    expect(frames.length).toBe(2)
  })

  it("renders two StreamXYFrame instances with different props", () => {
    render(
      <TooltipProvider>
        <MinimapChart data={sampleData} />
      </TooltipProvider>
    )
    // Should have rendered 2 frames
    expect(xyFrameRenders.length).toBe(2)
    // Main chart should have enableHover true, overview should have enableHover false
    const mainProps = xyFrameRenders.find((p: any) => p.enableHover === true)
    const overviewProps = xyFrameRenders.find((p: any) => p.enableHover === false)
    expect(mainProps).toBeDefined()
    expect(overviewProps).toBeDefined()
  })

  it("applies custom overviewHeight via minimap config", () => {
    render(
      <TooltipProvider>
        <MinimapChart data={sampleData} minimap={{ height: 100 }} />
      </TooltipProvider>
    )
    // The overview frame should have a smaller size based on minimap height
    const overviewProps = xyFrameRenders.find((p: any) => p.enableHover === false)
    expect(overviewProps).toBeDefined()
    // Size height should include minimap height + margins
    expect(overviewProps.size[1]).toBeGreaterThanOrEqual(100)
  })

  it("default overview height is 60", () => {
    render(
      <TooltipProvider>
        <MinimapChart data={sampleData} />
      </TooltipProvider>
    )
    const overviewProps = xyFrameRenders.find((p: any) => p.enableHover === false)
    // Size[1] = minimapHeight(60) + top(0) + bottom(20) = 80
    expect(overviewProps.size[1]).toBe(80)
  })

  it("renders brush overlay for minimap", () => {
    const { container } = render(
      <TooltipProvider>
        <MinimapChart data={sampleData} />
      </TooltipProvider>
    )
    // BrushOverlay renders a svg with a .brush-group g element
    const brushGroup = container.querySelector(".brush-group")
    expect(brushGroup).toBeTruthy()
  })

  it("handles data update via rerender", () => {
    const { container, rerender } = render(
      <TooltipProvider>
        <MinimapChart data={sampleData} />
      </TooltipProvider>
    )

    const initialFrameCount = xyFrameRenders.length
    expect(initialFrameCount).toBe(2)

    const newData = [
      { x: 0, y: 5 },
      { x: 1, y: 30 },
      { x: 2, y: 10 }
    ]

    rerender(
      <TooltipProvider>
        <MinimapChart data={newData} />
      </TooltipProvider>
    )

    // Should have re-rendered both frames
    expect(xyFrameRenders.length).toBeGreaterThan(initialFrameCount)
  })

  it("applies custom width and height to main chart", () => {
    render(
      <TooltipProvider>
        <MinimapChart data={sampleData} width={800} height={500} />
      </TooltipProvider>
    )
    const mainProps = xyFrameRenders.find((p: any) => p.enableHover === true)
    expect(mainProps.size[0]).toBe(800)
    expect(mainProps.size[1]).toBe(500)
  })

  it("overview chart uses same width as main", () => {
    render(
      <TooltipProvider>
        <MinimapChart data={sampleData} width={800} />
      </TooltipProvider>
    )
    const overviewProps = xyFrameRenders.find((p: any) => p.enableHover === false)
    expect(overviewProps.size[0]).toBe(800)
  })

  it("passes xAccessor and yAccessor to both frames", () => {
    render(
      <TooltipProvider>
        <MinimapChart data={sampleData} xAccessor="x" yAccessor="y" />
      </TooltipProvider>
    )
    for (const props of xyFrameRenders) {
      expect(props.xAccessor).toBe("x")
      expect(props.yAccessor).toBe("y")
    }
  })

  it("applies className", () => {
    const { container } = render(
      <TooltipProvider>
        <MinimapChart data={sampleData} className="custom-minimap" />
      </TooltipProvider>
    )
    const chart = container.querySelector(".minimap-chart.custom-minimap")
    expect(chart).toBeTruthy()
  })

  it("renders overview before main when renderBefore is true", () => {
    const { container } = render(
      <TooltipProvider>
        <MinimapChart data={sampleData} renderBefore={true} />
      </TooltipProvider>
    )
    // Both frames should still render
    const frames = container.querySelectorAll(".stream-xy-frame")
    expect(frames.length).toBe(2)
  })

  it("uses fillArea chart type when fillArea is true", () => {
    render(
      <TooltipProvider>
        <MinimapChart data={sampleData} fillArea={true} />
      </TooltipProvider>
    )
    for (const props of xyFrameRenders) {
      expect(props.chartType).toBe("area")
    }
  })

  it("defaults to line chart type", () => {
    render(
      <TooltipProvider>
        <MinimapChart data={sampleData} />
      </TooltipProvider>
    )
    for (const props of xyFrameRenders) {
      expect(props.chartType).toBe("line")
    }
  })

  it("applies controlled brushExtent to main chart", () => {
    render(
      <TooltipProvider>
        <MinimapChart data={sampleData} brushExtent={[1, 3]} />
      </TooltipProvider>
    )
    const mainProps = xyFrameRenders.find((p: any) => p.enableHover === true)
    expect(mainProps.xExtent).toEqual([1, 3])
  })
})
