import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { ChordDiagram } from "./ChordDiagram"
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

describe("ChordDiagram", () => {
  beforeEach(() => {
    lastNetworkFrameProps = null
  })

  const sampleEdges = [
    { source: "A", target: "B", value: 100 },
    { source: "B", target: "A", value: 80 },
    { source: "A", target: "A", value: 50 },
    { source: "B", target: "C", value: 60 },
    { source: "C", target: "B", value: 40 },
    { source: "C", target: "A", value: 30 }
  ]

  const sampleNodes = [
    { id: "A", category: "Group1" },
    { id: "B", category: "Group2" },
    { id: "C", category: "Group3" }
  ]

  it("handles empty edges gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <ChordDiagram edges={[]} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeFalsy()
  })

  it("sets chartType to chord", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.chartType).toBe("chord")
  })

  it("forwards padAngle", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} padAngle={0.05} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.padAngle).toBe(0.05)
  })

  it("defaults padAngle to 0.01", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.padAngle).toBe(0.01)
  })

  it("forwards groupWidth", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} groupWidth={30} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.groupWidth).toBe(30)
  })

  it("defaults groupWidth to 20", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.groupWidth).toBe(20)
  })

  it("forwards edgeColorBy", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} edgeColorBy="target" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeColorBy).toBe("target")
  })

  it("defaults edgeColorBy to source", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeColorBy).toBe("source")
  })

  it("forwards custom sourceAccessor, targetAccessor, valueAccessor", () => {
    const customEdges = [
      { from: "A", to: "B", weight: 100 },
      { from: "B", to: "A", weight: 80 }
    ]

    render(
      <TooltipProvider>
        <ChordDiagram
          edges={customEdges}
          sourceAccessor="from"
          targetAccessor="to"
          valueAccessor="weight"
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.sourceAccessor).toBe("from")
    expect(lastNetworkFrameProps.targetAccessor).toBe("to")
    expect(lastNetworkFrameProps.valueAccessor).toBe("weight")
  })

  it("defaults valueAccessor to 'value'", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.valueAccessor).toBe("value")
  })

  it("accepts nodes prop", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} nodes={sampleNodes} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodes).toBeDefined()
    expect(lastNetworkFrameProps.nodes.length).toBeGreaterThan(0)
  })

  it("infers nodes from edges when nodes not provided", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodes).toBeDefined()
    expect(lastNetworkFrameProps.nodes.length).toBeGreaterThan(0)
  })

  it("forwards edgeOpacity", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} edgeOpacity={0.8} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeOpacity).toBe(0.8)
  })

  it("defaults edgeOpacity to 0.5", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.edgeOpacity).toBe(0.5)
  })

  it("defaults to 600x600", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.size).toEqual([600, 600])
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} width={800} height={800} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.size).toEqual([800, 800])
  })

  it("forwards sortGroups", () => {
    const sortFn = (a: any, b: any) => b.value - a.value
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} sortGroups={sortFn} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.sortGroups).toBe(sortFn)
  })

  it("applies color encoding via colorBy", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} nodes={sampleNodes} colorBy="category" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.colorBy).toBe("category")
    expect(typeof lastNetworkFrameProps.nodeStyle).toBe("function")
  })

  it("enables hover by default", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.enableHover).toBe(true)
  })

  it("disables hover when enableHover is false", () => {
    render(
      <TooltipProvider>
        <ChordDiagram edges={sampleEdges} enableHover={false} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.enableHover).toBe(false)
  })

})
