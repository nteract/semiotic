import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { ForceDirectedGraph } from "./ForceDirectedGraph"
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

describe("ForceDirectedGraph", () => {
  beforeEach(() => {
    lastNetworkFrameProps = null
  })

  const sampleNodes = [
    { id: "A", label: "Node A" },
    { id: "B", label: "Node B" },
    { id: "C", label: "Node C" }
  ]

  const sampleEdges = [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "A" }
  ]

  it("handles empty nodes gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={[]} edges={sampleEdges} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeFalsy()
  })

  it("handles empty edges gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={[]} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-network-frame")
    expect(frame).toBeFalsy()
  })

  it("sets chartType to force", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.chartType).toBe("force")
  })

  it("forwards nodeIDAccessor", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} nodeIDAccessor="id" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodeIDAccessor).toBe("id")
  })

  it("forwards iterations", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} iterations={500} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.iterations).toBe(500)
  })

  it("defaults iterations to 300", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.iterations).toBe(300)
  })

  it("nodeStyle produces correct fill from colorBy", () => {
    const coloredNodes = [
      { id: "A", group: "X" },
      { id: "B", group: "Y" },
      { id: "C", group: "X" }
    ]

    render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={coloredNodes}
          edges={sampleEdges}
          colorBy="group"
        />
      </TooltipProvider>
    )

    const styleFn = lastNetworkFrameProps.nodeStyle
    expect(typeof styleFn).toBe("function")
    // When colorBy is set, fill should be a string (a color)
    const style = styleFn({ data: { group: "X" } })
    expect(typeof style.fill).toBe("string")
    expect(style.fill).not.toBe("")
  })

  it("nodeStyle uses DEFAULT_COLOR when no colorBy", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} />
      </TooltipProvider>
    )

    const style = lastNetworkFrameProps.nodeStyle({ data: { id: "A" } })
    expect(style.fill).toBe("#1f77b4")
  })

  it("nodeStyle includes r when nodeSize is a number", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} nodeSize={15} />
      </TooltipProvider>
    )

    const style = lastNetworkFrameProps.nodeStyle({ data: { id: "A" } })
    expect(style.r).toBe(15)
  })

  it("edgeStyle produces correct stroke and width", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          edgeWidth={2}
          edgeColor="#000"
          edgeOpacity={0.8}
        />
      </TooltipProvider>
    )

    const styleFn = lastNetworkFrameProps.edgeStyle
    expect(typeof styleFn).toBe("function")
    const style = styleFn({})
    expect(style.stroke).toBe("#000")
    expect(style.strokeWidth).toBe(2)
    expect(style.opacity).toBe(0.8)
  })

  it("edgeStyle defaults", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} />
      </TooltipProvider>
    )

    const style = lastNetworkFrameProps.edgeStyle({})
    expect(style.stroke).toBe("#999")
    expect(style.strokeWidth).toBe(1)
    expect(style.opacity).toBe(0.6)
  })

  it("applies custom width and height", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} width={800} height={800} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.size).toEqual([800, 800])
  })

  it("defaults to 600x600", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.size).toEqual([600, 600])
  })

  it("forwards sourceAccessor and targetAccessor", () => {
    const customEdges = [
      { from: "A", to: "B" },
      { from: "B", to: "C" }
    ]

    render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={customEdges}
          sourceAccessor="from"
          targetAccessor="to"
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.sourceAccessor).toBe("from")
    expect(lastNetworkFrameProps.targetAccessor).toBe("to")
  })

  it("forwards forceStrength", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} forceStrength={0.2} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.forceStrength).toBe(0.2)
  })

  it("enables hover by default", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.enableHover).toBe(true)
  })

  it("disables hover when enableHover is false", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} enableHover={false} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.enableHover).toBe(false)
  })

  it("updates when nodes change", () => {
    const initialNodes = [
      { id: "A", label: "Node A" },
      { id: "B", label: "Node B" }
    ]
    const initialEdges = [{ source: "A", target: "B" }]

    const { rerender } = render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={initialNodes} edges={initialEdges} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.nodes).toEqual(initialNodes)

    const newNodes = [
      { id: "A", label: "Node A" },
      { id: "B", label: "Node B" },
      { id: "C", label: "Node C" }
    ]
    const newEdges = [
      { source: "A", target: "B" },
      { source: "B", target: "C" }
    ]

    rerender(
      <TooltipProvider>
        <ForceDirectedGraph nodes={newNodes} edges={newEdges} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps.nodes).toEqual(newNodes)
    expect(lastNetworkFrameProps.edges).toEqual(newEdges)
  })

  // Legend Tests
  describe("Legend behavior", () => {
    const coloredNodes = [
      { id: "A", group: "X" },
      { id: "B", group: "Y" },
      { id: "C", group: "X" }
    ]

    const coloredEdges = [
      { source: "A", target: "B" },
      { source: "B", target: "C" }
    ]

    it("shows legend automatically when colorBy is specified", () => {
      render(
        <TooltipProvider>
          <ForceDirectedGraph
            nodes={coloredNodes}
            edges={coloredEdges}
            colorBy="group"
          />
        </TooltipProvider>
      )
      expect(lastNetworkFrameProps.legend).toBeDefined()
    })

    it("does not show legend when colorBy is not specified", () => {
      render(
        <TooltipProvider>
          <ForceDirectedGraph
            nodes={sampleNodes}
            edges={sampleEdges}
          />
        </TooltipProvider>
      )
      expect(lastNetworkFrameProps.legend).toBeUndefined()
    })

    it("respects showLegend=false even when colorBy is specified", () => {
      render(
        <TooltipProvider>
          <ForceDirectedGraph
            nodes={coloredNodes}
            edges={coloredEdges}
            colorBy="group"
            showLegend={false}
          />
        </TooltipProvider>
      )
      expect(lastNetworkFrameProps.legend).toBeUndefined()
    })
  })
})
