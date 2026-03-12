import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { SankeyDiagram } from "./SankeyDiagram"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock NetworkFrame to capture props
let lastNetworkFrameProps: any = null
vi.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastNetworkFrameProps = props
      return <div className="stream-network-frame"><svg /></div>
    }
  }
})

describe("SankeyDiagram", () => {
  beforeEach(() => {
    lastNetworkFrameProps = null
  })

  const sampleEdges = [
    { source: "A", target: "D", value: 100 },
    { source: "B", target: "D", value: 80 },
    { source: "C", target: "D", value: 60 },
    { source: "D", target: "E", value: 150 },
    { source: "D", target: "F", value: 90 }
  ]

  const sampleNodes = [
    { id: "A", category: "Source" },
    { id: "B", category: "Source" },
    { id: "C", category: "Source" },
    { id: "D", category: "Middle" },
    { id: "E", category: "Target" },
    { id: "F", category: "Target" }
  ]

  it("handles empty edges gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <SankeyDiagram edges={[]} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeFalsy()
  })

  it("sets chartType to sankey", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.chartType).toBe("sankey")
  })

  it("forwards sourceAccessor and targetAccessor defaults", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.sourceAccessor).toBe("source")
    expect(lastNetworkFrameProps.targetAccessor).toBe("target")
  })

  it("forwards custom sourceAccessor, targetAccessor, and valueAccessor", () => {
    const customEdges = [
      { from: "A", to: "B", flow: 100 },
      { from: "B", to: "C", flow: 80 }
    ]

    render(
      <TooltipProvider>
        <SankeyDiagram
          edges={customEdges}
          sourceAccessor="from"
          targetAccessor="to"
          valueAccessor="flow"
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.sourceAccessor).toBe("from")
    expect(lastNetworkFrameProps.targetAccessor).toBe("to")
    expect(lastNetworkFrameProps.valueAccessor).toBe("flow")
  })

  it("defaults valueAccessor to 'value'", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.valueAccessor).toBe("value")
  })

  it("forwards orientation prop", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} orientation="horizontal" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.orientation).toBe("horizontal")
  })

  it("forwards vertical orientation", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} orientation="vertical" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.orientation).toBe("vertical")
  })

  it("defaults orientation to horizontal", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.orientation).toBe("horizontal")
  })

  it("forwards nodeAlign prop", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodeAlign="left" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodeAlign).toBe("left")
  })

  it("defaults nodeAlign to justify", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodeAlign).toBe("justify")
  })

  it("forwards nodeWidth prop", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodeWidth={25} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodeWidth).toBe(25)
  })

  it("defaults nodeWidth to 15", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodeWidth).toBe(15)
  })

  it("accepts nodes prop and passes it through", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodes={sampleNodes} />
      </TooltipProvider>
    )
    // When nodes are provided, they should be used
    expect(lastNetworkFrameProps.nodes).toBeDefined()
    expect(lastNetworkFrameProps.nodes.length).toBeGreaterThan(0)
  })

  it("infers nodes from edges when nodes not provided", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    // Should infer nodes from the edge source/target values
    expect(lastNetworkFrameProps.nodes).toBeDefined()
    expect(lastNetworkFrameProps.nodes.length).toBeGreaterThan(0)
  })

  it("forwards edgeColorBy", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} edgeColorBy="target" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeColorBy).toBe("target")
  })

  it("defaults edgeColorBy to source", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeColorBy).toBe("source")
  })

  it("forwards edgeOpacity", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} edgeOpacity={0.7} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeOpacity).toBe(0.7)
  })

  it("forwards nodePaddingRatio", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} nodePaddingRatio={0.1} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodePaddingRatio).toBe(0.1)
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} width={1000} height={800} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.size).toEqual([1000, 800])
  })

  it("defaults to 800x600", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.size).toEqual([800, 600])
  })

  it("enables hover by default", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.enableHover).toBe(true)
  })

  it("disables hover when enableHover is false", () => {
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} enableHover={false} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.enableHover).toBe(false)
  })

  it("forwards edgeSort", () => {
    const sortFn = (a: any, b: any) => b.value - a.value
    render(
      <TooltipProvider>
        <SankeyDiagram edges={sampleEdges} edgeSort={sortFn} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeSort).toBe(sortFn)
  })

  describe("tooltip", () => {
    it("renders with tooltip prop without crashing", () => {
      const customTooltip = (d: any) => <div>custom tooltip</div>
      const { container } = render(
        <TooltipProvider>
          <SankeyDiagram edges={sampleEdges} tooltip={customTooltip} />
        </TooltipProvider>
      )
      const frame = container.querySelector(".stream-network-frame")
      expect(frame).toBeTruthy()
      expect(typeof lastNetworkFrameProps.tooltipContent).toBe("function")
    })
  })
})
