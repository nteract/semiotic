import React from "react"
import { render } from "@testing-library/react"
import { CirclePack } from "./CirclePack"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock NetworkFrame to capture props
let lastNetworkFrameProps: any = null
jest.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastNetworkFrameProps = props
      return <div className="stream-network-frame"><svg /></div>
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

    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeTruthy()
  })

  it("handles missing data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <CirclePack data={null as any} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeFalsy()
  })

  it("sets circlepack chartType with hierarchy accessors", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.chartType).toBe("circlepack")
    expect(lastNetworkFrameProps.childrenAccessor).toBe("children")
    expect(typeof lastNetworkFrameProps.hierarchySum).toBe("function")
  })

  it("sets hierarchySum from valueAccessor as a direct prop", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

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

    expect(lastNetworkFrameProps.enableHover).toBe(true)
  })

  it("passes data as the data prop", () => {
    render(
      <TooltipProvider>
        <CirclePack data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.data).toBe(sampleData)
  })

  it("allows NetworkFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <CirclePack
          data={sampleData}
          frameProps={{}}
        />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps).toBeDefined()
  })
})
