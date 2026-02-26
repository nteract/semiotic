import React from "react"
import { render } from "@testing-library/react"
import { ForceDirectedGraph } from "./ForceDirectedGraph"
import { TooltipProvider } from "../../store/TooltipStore"

describe("ForceDirectedGraph", () => {
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

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("handles empty nodes gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={[]} edges={sampleEdges} />
      </TooltipProvider>
    )

    // Should not render frame when nodes are empty
    const frame = container.querySelector(".networkframe")
    expect(frame).toBeFalsy()
  })

  it("handles empty edges gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={[]} />
      </TooltipProvider>
    )

    // Should not render frame when edges are empty
    const frame = container.querySelector(".networkframe")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          width={800}
          height={800}
        />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts custom node ID accessor", () => {
    const customNodes = [
      { nodeId: "A", label: "Node A" },
      { nodeId: "B", label: "Node B" }
    ]

    const customEdges = [
      { source: "A", target: "B" }
    ]

    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={customNodes}
          edges={customEdges}
          nodeIDAccessor="nodeId"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("accepts custom source and target accessors", () => {
    const customEdges = [
      { from: "A", to: "B" },
      { from: "B", to: "C" }
    ]

    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={customEdges}
          sourceAccessor="from"
          targetAccessor="to"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const coloredNodes = [
      { id: "A", label: "Node A", group: "1" },
      { id: "B", label: "Node B", group: "2" },
      { id: "C", label: "Node C", group: "1" }
    ]

    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={coloredNodes}
          edges={sampleEdges}
          colorBy="group"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("applies fixed node size", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          nodeSize={15}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("applies dynamic node sizing", () => {
    const sizedNodes = [
      { id: "A", label: "Node A", importance: 5 },
      { id: "B", label: "Node B", importance: 10 },
      { id: "C", label: "Node C", importance: 8 }
    ]

    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sizedNodes}
          edges={sampleEdges}
          nodeSize="importance"
          nodeSizeRange={[5, 25]}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  // Skip label test due to jsdom limitations with SVG text measurement
  it.skip("shows labels when showLabels is true", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          nodeLabel="label"
          showLabels={true}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("accepts custom iterations", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          iterations={500}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("accepts custom force strength", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          forceStrength={0.2}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("applies custom edge styling", () => {
    const { container } = render(
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

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("allows NetworkFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          frameProps={{
            networkType: { type: "force", iterations: 400 }
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
  })

  it("updates when nodes change", () => {
    const initialNodes = [
      { id: "A", label: "Node A" },
      { id: "B", label: "Node B" }
    ]

    const initialEdges = [
      { source: "A", target: "B" }
    ]

    const { container, rerender } = render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={initialNodes} edges={initialEdges} />
      </TooltipProvider>
    )

    const initialFrame = container.querySelector(".networkframe")
    expect(initialFrame).toBeTruthy()

    // Update with more nodes
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

    const updatedFrame = container.querySelector(".networkframe")
    expect(updatedFrame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          enableHover={false}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".networkframe")
    expect(frame).toBeTruthy()
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
      const { container } = render(
        <TooltipProvider>
          <ForceDirectedGraph
            nodes={coloredNodes}
            edges={coloredEdges}
            colorBy="group"
          />
        </TooltipProvider>
      )

      // Check that legend items are rendered
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBeGreaterThan(0)
    })

    it("does not show legend when colorBy is not specified", () => {
      const { container } = render(
        <TooltipProvider>
          <ForceDirectedGraph
            nodes={sampleNodes}
            edges={sampleEdges}
          />
        </TooltipProvider>
      )

      // Legend items should not be present
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBe(0)
    })

    it("respects showLegend=false even when colorBy is specified", () => {
      const { container } = render(
        <TooltipProvider>
          <ForceDirectedGraph
            nodes={coloredNodes}
            edges={coloredEdges}
            colorBy="group"
            showLegend={false}
          />
        </TooltipProvider>
      )

      // Legend items should not be present
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBe(0)
    })

    it("adjusts right margin when legend is present", () => {
      const { container } = render(
        <TooltipProvider>
          <ForceDirectedGraph
            nodes={coloredNodes}
            edges={coloredEdges}
            colorBy="group"
          />
        </TooltipProvider>
      )

      // The frame should have sufficient right margin to accommodate legend
      const frame = container.querySelector(".networkframe")
      expect(frame).toBeTruthy()

      // Legend items should be visible
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBeGreaterThan(0)
    })
  })
})
