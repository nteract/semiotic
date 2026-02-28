import React from "react"
import { render } from "@testing-library/react"
import { CirclePack } from "./CirclePack"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock NetworkFrame to capture props
let lastNetworkFrameProps: any = null
jest.mock("../../NetworkFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastNetworkFrameProps = props
      return <div className="networkframe"><svg /></div>
    }
  }
})

describe("CirclePack", () => {
  beforeEach(() => {
    lastNetworkFrameProps = null
  })

  const sampleData = {
    name: "root",
    children: [
      { name: "A", value: 100 },
      { name: "B", value: 200 },
      { name: "C", children: [
        { name: "C1", value: 50 },
        { name: "C2", value: 30 }
      ]}
    ]
  }

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("handles missing data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <CirclePack data={null as any} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeFalsy()
  })

  it("sets circlepack network type", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.networkType).toEqual({ type: "circlepack" })
  })

  it("sets hierarchySum from valueAccessor", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

    expect(typeof lastNetworkFrameProps.hierarchySum).toBe("function")
    expect(lastNetworkFrameProps.hierarchySum({ value: 42 })).toBe(42)
  })

  it("defaults to square dimensions", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.size).toEqual([600, 600])
  })

  it("applies circle opacity to node style", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} circleOpacity={0.5} />
      </TooltipProvider>
    )

    const style = lastNetworkFrameProps.nodeStyle({ depth: 0 })
    expect(style.fillOpacity).toBe(0.5)
  })

  it("uses default circle opacity of 0.7", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

    const style = lastNetworkFrameProps.nodeStyle({ depth: 0 })
    expect(style.fillOpacity).toBe(0.7)
  })

  it("enables hover by default", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.hoverAnnotation).toBe(true)
  })

  it("passes edges as the data", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.edges).toBe(sampleData)
  })

  it("allows NetworkFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <CirclePack
          data={sampleData}
          frameProps={{ filterRenderedNodes: (d: any) => d.depth > 0 }}
        />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.filterRenderedNodes).toBeDefined()
  })
})
