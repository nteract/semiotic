import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { NetworkCustomChart } from "./NetworkCustomChart"
import type { NetworkCustomLayout } from "../../stream/networkCustomLayout"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

// Mock StreamNetworkFrame to inspect the props NetworkCustomChart forwards —
// same seam the XY/Ordinal custom-chart tests use. The contract under test:
// the user's layout reaches the frame as `customNetworkLayout`, sparse
// node/edge rows are filtered, and accessors pass through.
let lastNetworkFrameProps: {
  customNetworkLayout?: NetworkCustomLayout
  layoutConfig?: Record<string, unknown>
  chartType?: string
  nodes?: unknown[]
  edges?: unknown[]
  nodeIDAccessor?: unknown
  sourceAccessor?: unknown
  targetAccessor?: unknown
} | null = null
vi.mock("../../stream/StreamNetworkFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: {
      customNetworkLayout?: NetworkCustomLayout
      layoutConfig?: Record<string, unknown>
      chartType?: string
      nodes?: unknown[]
      edges?: unknown[]
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
})
