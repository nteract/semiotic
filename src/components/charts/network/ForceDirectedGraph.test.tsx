import type { CapturedNetworkFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamNetworkFrameHandle } from "../../stream/networkTypes"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { ForceDirectedGraph, type ForceDirectedGraphProps } from "./ForceDirectedGraph"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock NetworkFrame to capture props
let lastNetworkFrameProps = {} as CapturedNetworkFrameProps
vi.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef<Partial<StreamNetworkFrameHandle>, CapturedNetworkFrameProps>((props, _ref) => {
      lastNetworkFrameProps = props
      return <div className="stream-network-frame"><svg /></div>
    })
  }
})

describe("ForceDirectedGraph", () => {
  beforeEach(() => {
    lastNetworkFrameProps = {} as CapturedNetworkFrameProps
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

  it("forwards nodeIdAccessor (canonical camelCase form)", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} nodeIdAccessor="id" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodeIDAccessor).toBe("id")
  })

  it("forwards the deprecated nodeIDAccessor alias for backwards compat", () => {
    // Regression: the historical casing was `nodeIDAccessor` (uppercase
    // ID), which was inconsistent with the rest of the network HOCs
    // (Sankey/Chord/Tree/Orbit all used `nodeIdAccessor`). Both forms
    // resolve to the same internal value; the deprecated alias is
    // removed in 4.0.
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} nodeIDAccessor="id" />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.nodeIDAccessor).toBe("id")
  })

  it("nodeIdAccessor wins when both are passed", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          nodeIdAccessor="id"
          nodeIDAccessor={"legacy_id_field" as unknown as ForceDirectedGraphProps<typeof sampleNodes[number], typeof sampleEdges[number]>["nodeIDAccessor"]}
        />
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

  it("edgeStyle reads width from a string field on the wrapped edge data", () => {
    const weightedEdges = [
      { source: "A", target: "B", weight: 5 },
      { source: "B", target: "C", weight: 2 },
      { source: "C", target: "A", weight: 1 }
    ]
    render(
      <TooltipProvider>
        <ForceDirectedGraph nodes={sampleNodes} edges={weightedEdges} edgeWidth="weight" />
      </TooltipProvider>
    )

    const styleFn = lastNetworkFrameProps.edgeStyle
    // Frame callbacks receive a RealtimeEdge wrapper; user data is on .data
    expect(styleFn({ data: { source: "A", target: "B", weight: 5 } }).strokeWidth).toBe(5)
    // Missing / non-positive weight falls back to 1
    expect(styleFn({ data: { source: "A", target: "B" } }).strokeWidth).toBe(1)
    expect(styleFn({ data: { source: "A", target: "B", weight: 0 } }).strokeWidth).toBe(1)
  })

  it("edgeStyle reads width from a function accessor against raw edge data", () => {
    render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          edgeWidth={(e: { weight?: number }) => (e.weight ?? 1) * 2}
        />
      </TooltipProvider>
    )

    const styleFn = lastNetworkFrameProps.edgeStyle
    expect(styleFn({ data: { source: "A", target: "B", weight: 3 } }).strokeWidth).toBe(6)
  })

  describe("independent node / edge stroking", () => {
    const renderFDG = (extra: Partial<ForceDirectedGraphProps>) =>
      render(
        <TooltipProvider>
          <ForceDirectedGraph nodes={sampleNodes} edges={sampleEdges} {...extra} />
        </TooltipProvider>
      )

    it("generic `stroke` styles both nodes and edges (uniform baseline)", () => {
      renderFDG({ stroke: "red", strokeWidth: 3 })
      const node = lastNetworkFrameProps.nodeStyle({ data: { id: "A" } })
      const edge = lastNetworkFrameProps.edgeStyle({})
      expect(node.stroke).toBe("red")
      expect(node.strokeWidth).toBe(3)
      expect(edge.stroke).toBe("red")
      expect(edge.strokeWidth).toBe(3)
    })

    it("`nodeStroke` strokes nodes only, leaving edges at their default", () => {
      renderFDG({ nodeStroke: "none", nodeStrokeWidth: 0 })
      const node = lastNetworkFrameProps.nodeStyle({ data: { id: "A" } })
      const edge = lastNetworkFrameProps.edgeStyle({})
      expect(node.stroke).toBe("none")
      expect(node.strokeWidth).toBe(0)
      // Edges untouched — still the built-in default.
      expect(edge.stroke).toBe("#999")
      expect(edge.strokeWidth).toBe(1)
    })

    it("`edgeColor` strokes edges only, leaving the node outline untouched", () => {
      renderFDG({ edgeColor: "#4c78a8" })
      const node = lastNetworkFrameProps.nodeStyle({ data: { id: "A" } })
      const edge = lastNetworkFrameProps.edgeStyle({})
      expect(edge.stroke).toBe("#4c78a8")
      // No generic/node stroke set ⟹ node carries no stroke override.
      expect(node.stroke).toBeUndefined()
    })

    it("node- and edge-specific props override the generic `stroke` per side", () => {
      renderFDG({ stroke: "gray", strokeWidth: 2, nodeStroke: "white", edgeColor: "black" })
      const node = lastNetworkFrameProps.nodeStyle({ data: { id: "A" } })
      const edge = lastNetworkFrameProps.edgeStyle({})
      // nodeStroke wins over generic stroke for nodes…
      expect(node.stroke).toBe("white")
      // …edgeColor wins over generic stroke for edges (fixes the clobber footgun)…
      expect(edge.stroke).toBe("black")
      // …and the un-overridden width still falls through from the generic prop.
      expect(node.strokeWidth).toBe(2)
      expect(edge.strokeWidth).toBe(2)
    })

    it("edge opacity/width fall back to the generic props, then built-ins", () => {
      renderFDG({ opacity: 0.4 })
      const edge = lastNetworkFrameProps.edgeStyle({})
      // No edgeOpacity ⟹ generic opacity applies to edges.
      expect(edge.opacity).toBe(0.4)
      // No edgeWidth/strokeWidth ⟹ built-in edge width.
      expect(edge.strokeWidth).toBe(1)
    })
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

  it("forwards worker-layout controls", () => {
    const loading = <span>Arranging</span>
    const onState = vi.fn()
    render(
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={sampleNodes}
          edges={sampleEdges}
          layoutExecution="worker"
          layoutLoadingContent={loading}
          onLayoutStateChange={onState}
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps.layoutExecution).toBe("worker")
    expect(lastNetworkFrameProps.layoutLoadingContent).toBe(loading)
    expect(lastNetworkFrameProps.onLayoutStateChange).toBe(onState)
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
