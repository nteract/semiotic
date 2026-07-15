import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import { NetworkCustomChart } from "./NetworkCustomChart"
import type { NetworkCustomLayout } from "../../stream/networkCustomLayout"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { nodeAnchorId, nodeCenter } from "../../stream/NetworkSVGOverlay"
import { resolveAnchoredPosition } from "../shared/annotationResolvers"
import { symbolRadius } from "../../stream/symbolPath"

// Mock StreamNetworkFrame to inspect the props NetworkCustomChart forwards —
// same seam the XY/Ordinal custom-chart tests use. The contract under test:
// the user's layout reaches the frame as `customNetworkLayout`, sparse
// node/edge rows are filtered, and accessors pass through.
let lastNetworkFrameProps: {
  customNetworkLayout?: NetworkCustomLayout
  layoutConfig?: Record<string, unknown>
  onLayoutError?: unknown
  chartType?: string
  nodes?: unknown[]
  edges?: unknown[]
  nodeIDAccessor?: unknown
  sourceAccessor?: unknown
  targetAccessor?: unknown
  colorBy?: unknown
  annotations?: unknown
  autoPlaceAnnotations?: unknown
  title?: unknown
  description?: unknown
  summary?: unknown
  accessibleTable?: unknown
  animate?: unknown
} | null = null
vi.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: {
      customNetworkLayout?: NetworkCustomLayout
      layoutConfig?: Record<string, unknown>
      onLayoutError?: unknown
      chartType?: string
      nodes?: unknown[]
      edges?: unknown[]
      colorBy?: unknown
    }, _ref: unknown) => {
      lastNetworkFrameProps = props
      return <div className="stream-network-frame"><canvas /><svg /></div>
    })
  }
})

describe("NetworkCustomChart", () => {
  let cleanup: () => void
  beforeEach(() => {
    lastNetworkFrameProps = null
    cleanup = setupCanvasMock()
  })
  afterEach(() => { cleanup() })

  const trivialLayout: NetworkCustomLayout = (ctx) => ({
    sceneNodes: ctx.nodes.map((n, i) => ({
      type: "circle" as const,
      cx: i * 10,
      cy: i * 10,
      r: 4,
      style: { fill: ctx.resolveColor(String(i)) },
      datum: n,
    })),
    sceneEdges: [],
  })

  const nodes = [{ id: "a" }, { id: "b" }]
  const edges = [{ source: "a", target: "b" }]

  it("forwards the layout as customNetworkLayout", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart
          nodes={nodes}
          edges={edges}
          layout={trivialLayout}
          width={400}
          height={300}
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps?.customNetworkLayout).toBe(trivialLayout)
    expect(lastNetworkFrameProps?.layoutConfig).toBeUndefined()
  })

  it("forwards layoutConfig and accessors", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart
          nodes={nodes}
          edges={edges}
          layout={trivialLayout}
          layoutConfig={{ edgeStyle: "smooth" }}
          nodeIDAccessor="key"
          sourceAccessor="from"
          targetAccessor="to"
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps?.layoutConfig).toEqual({ edgeStyle: "smooth" })
    expect(lastNetworkFrameProps?.nodeIDAccessor).toBe("key")
    expect(lastNetworkFrameProps?.sourceAccessor).toBe("from")
    expect(lastNetworkFrameProps?.targetAccessor).toBe("to")
  })

  it("forwards onLayoutError", () => {
    const onLayoutError = vi.fn()
    render(
      <TooltipProvider>
        <NetworkCustomChart nodes={nodes} edges={edges} layout={trivialLayout} onLayoutError={onLayoutError} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps?.onLayoutError).toBe(onLayoutError)
  })

  it("forwards colorBy to the network frame", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart
          nodes={[{ id: "a", group: "alpha" }]}
          edges={[]}
          layout={trivialLayout}
          colorBy="group"
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps?.colorBy).toBe("group")
  })

  it("filters sparse rows out of nodes and edges", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart
          nodes={[{ id: "a" }, null as never, { id: "b" }, undefined as never]}
          edges={[{ source: "a", target: "b" }, null as never]}
          layout={trivialLayout}
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps?.nodes).toEqual([{ id: "a" }, { id: "b" }])
    expect(lastNetworkFrameProps?.edges).toEqual([{ source: "a", target: "b" }])
  })

  it("omits nodes/edges props entirely when not supplied (push mode)", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart layout={trivialLayout} />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps).not.toBeNull()
    expect("nodes" in (lastNetworkFrameProps ?? {})).toBe(false)
    expect("edges" in (lastNetworkFrameProps ?? {})).toBe(false)
  })

  it("forwards annotations + autoPlaceAnnotations to the frame", () => {
    const annotations = [{ type: "callout", pointId: "a", label: "Peak" }]
    render(
      <TooltipProvider>
        <NetworkCustomChart nodes={nodes} layout={trivialLayout} annotations={annotations} autoPlaceAnnotations />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps?.annotations).toBe(annotations)
    expect(lastNetworkFrameProps?.autoPlaceAnnotations).toBe(true)
  })

  it("forwards shared chart metadata and animation", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart
          nodes={nodes}
          layout={trivialLayout}
          title="Network title"
          description="Network description"
          summary="Network summary"
          accessibleTable={false}
          animate={false}
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps).toMatchObject({
      title: "Network title",
      description: "Network description",
      summary: "Network summary",
      accessibleTable: false,
      animate: false,
    })
  })

  it("resolves responsive metadata before explicit frame overrides", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart
          nodes={nodes}
          layout={trivialLayout}
          width={320}
          description="Base description"
          summary="Base summary"
          responsiveRules={[{
            when: { maxWidth: 400 },
            transform: { description: "Responsive description", summary: "Responsive summary" },
          }]}
          frameProps={{ summary: "Frame summary" }}
        />
      </TooltipProvider>
    )
    expect(lastNetworkFrameProps).toMatchObject({
      description: "Responsive description",
      summary: "Frame summary",
    })
  })

  it("omits the annotations prop entirely when not supplied", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart nodes={nodes} layout={trivialLayout} />
      </TooltipProvider>
    )
    expect("annotations" in (lastNetworkFrameProps ?? {})).toBe(false)
  })

  it("uses the shared loading state without mounting a frame", () => {
    const { container } = render(
      <TooltipProvider>
        <NetworkCustomChart nodes={nodes} edges={edges} layout={trivialLayout} loading />
      </TooltipProvider>
    )

    expect(container.querySelectorAll(".semiotic-loading-bar")).toHaveLength(5)
    expect(lastNetworkFrameProps).toBeNull()
  })

  it("uses the shared empty state only when supplied node and edge data are both empty", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart nodes={[]} edges={[]} layout={trivialLayout} />
      </TooltipProvider>
    )

    expect(screen.getByText("No data available")).toBeInTheDocument()
    expect(lastNetworkFrameProps).toBeNull()
  })

  it("allows a node-only custom layout without showing an empty state", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart nodes={nodes} edges={[]} layout={trivialLayout} />
      </TooltipProvider>
    )

    expect(lastNetworkFrameProps?.nodes).toEqual(nodes)
  })
})

describe("custom-layout marks are annotation-anchorable by id", () => {
  // A custom layout's symbol mark: carries `id`, `cx/cy`, and a d3-symbol `size`
  // (no `r`/`outerR`/`w`/`h`). The network overlay harvests it into the
  // annotation `pointNodes`, so a `pointId` annotation resolves to its center.
  const symbolNode = { type: "symbol", id: "sat-42", cx: 120, cy: 80, size: 200, datum: { id: "sat-42" } }

  it("nodeAnchorId resolves the mark id", () => {
    expect(nodeAnchorId(symbolNode)).toBe("sat-42")
  })

  it("nodeCenter uses the glyph's effective radius for a symbol node", () => {
    const c = nodeCenter(symbolNode)
    expect(c).not.toBeNull()
    expect(c!.x).toBe(120)
    expect(c!.y).toBe(80)
    expect(c!.r).toBeCloseTo(symbolRadius(200))
  })

  it("resolveAnchoredPosition anchors a pointId annotation to the emitted mark", () => {
    const center = nodeCenter(symbolNode)!
    const context = {
      scales: null,
      width: 600,
      height: 400,
      frameType: "network" as const,
      pointNodes: [{ pointId: nodeAnchorId(symbolNode), ...center }],
    }
    const pos = resolveAnchoredPosition({ type: "callout", pointId: "sat-42", label: "L" }, 0, context)
    expect(pos).toEqual({ x: 120, y: 80 })
  })
})
