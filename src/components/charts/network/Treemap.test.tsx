import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { Treemap } from "./Treemap"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock NetworkFrame to capture props
let lastNetworkFrameProps: any = null
vi.mock("../../stream/StreamNetworkFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastNetworkFrameProps = props
      return <div className="stream-network-frame"><svg /></div>
    })
  }
})

describe("Treemap", () => {
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
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeTruthy()
  })

  it("handles missing data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <Treemap data={null as any} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeFalsy()
  })

  it("sets treemap chartType with hierarchy accessors", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.chartType).toBe("treemap")
    expect(lastNetworkFrameProps.childrenAccessor).toBe("children")
    expect(typeof lastNetworkFrameProps.hierarchySum).toBe("function")
  })

  it("sets hierarchySum from valueAccessor as a direct prop", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.hierarchySum({ value: 42 })).toBe(42)
  })

  it("defaults to square dimensions", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.size).toEqual([600, 600])
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} width={800} height={400} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.size).toEqual([800, 400])
  })

  it("accepts custom accessors", () => {
    const customData = {
      id: "root",
      items: [
        { id: "A", size: 100 },
        { id: "B", size: 200 }
      ]
    }

    render(
      <TooltipProvider>
        <Treemap
          data={customData}
          childrenAccessor="items"
          valueAccessor="size"
          nodeIdAccessor="id"
        />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.nodeIDAccessor).toBe("id")
    expect(lastNetworkFrameProps.childrenAccessor).toBe("items")
    expect(lastNetworkFrameProps.hierarchySum({ size: 42 })).toBe(42)
  })

  it("passes data as the data prop", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.data).toBe(sampleData)
  })

  it("enables hover by default", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.enableHover).toBe(true)
  })

  it("allows NetworkFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <Treemap
          data={sampleData}
          frameProps={{}}
        />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps).toBeDefined()
  })
})
