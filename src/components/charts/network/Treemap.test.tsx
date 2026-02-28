import React from "react"
import { render } from "@testing-library/react"
import { Treemap } from "./Treemap"
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

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("handles missing data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <Treemap data={null as any} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeFalsy()
  })

  it("sets treemap network type", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.networkType).toEqual({ type: "treemap" })
  })

  it("sets hierarchySum from valueAccessor", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(typeof lastNetworkFrameProps.hierarchySum).toBe("function")
    expect(lastNetworkFrameProps.hierarchySum({ value: 42 })).toBe(42)
  })

  it("sets hierarchyChildren from childrenAccessor", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(typeof lastNetworkFrameProps.hierarchyChildren).toBe("function")
    expect(lastNetworkFrameProps.hierarchyChildren({ children: [1, 2] })).toEqual([1, 2])
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
    expect(lastNetworkFrameProps.hierarchyChildren({ items: [1] })).toEqual([1])
    expect(lastNetworkFrameProps.hierarchySum({ size: 42 })).toBe(42)
  })

  it("passes edges as the data", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.edges).toBe(sampleData)
  })

  it("enables hover by default", () => {
    render(
      <TooltipProvider>
        <Treemap data={sampleData} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.hoverAnnotation).toBe(true)
  })

  it("allows NetworkFrame prop overrides via frameProps", () => {
    render(
      <TooltipProvider>
        <Treemap
          data={sampleData}
          frameProps={{ filterRenderedNodes: (d: any) => d.depth > 0 }}
        />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.filterRenderedNodes).toBeDefined()
  })
})
