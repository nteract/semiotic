import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React, { useEffect } from "react"
import { render, waitFor } from "@testing-library/react"
import { NetworkCustomChart } from "./NetworkCustomChart"
import type { NetworkCustomLayout, NetworkLayoutSelection } from "../../stream/networkCustomLayout"
import { LinkedCharts } from "../../LinkedCharts"
import { useSelection } from "../../store/useSelection"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

// Capture the props NetworkCustomChart forwards to the frame — same seam as
// the sibling NetworkCustomChart.test.tsx.
let lastProps: {
  customHoverBehavior?: unknown
  customClickBehavior?: unknown
  layoutSelection?: NetworkLayoutSelection | null
} | null = null
vi.mock("../../stream/StreamNetworkFrame", () => ({
  __esModule: true,
  default: React.forwardRef((props: Record<string, unknown>, _ref: unknown) => {
    lastProps = props as typeof lastProps
    return <div className="stream-network-frame"><canvas /><svg /></div>
  }),
}))

const trivialLayout: NetworkCustomLayout = (ctx) => ({
  sceneNodes: ctx.nodes.map((n, i) => ({ type: "circle" as const, cx: i * 10, cy: 0, r: 4, style: {}, datum: n, id: n.id })),
  sceneEdges: [],
  labels: [],
})

describe("NetworkCustomChart — selection / LinkedCharts wiring", () => {
  let cleanup: () => void
  beforeEach(() => {
    lastProps = null
    cleanup = setupCanvasMock()
  })
  afterEach(() => cleanup())

  it("wires hover/click behaviors and a layoutSelection slot when selection/linkedHover/onClick are set", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart
          nodes={[{ id: "a" }]}
          edges={[]}
          layout={trivialLayout}
          selection={{ name: "s" }}
          linkedHover={{ name: "s", fields: ["id"] }}
          onClick={() => {}}
        />
      </TooltipProvider>
    )
    expect(typeof lastProps!.customHoverBehavior).toBe("function")
    expect(typeof lastProps!.customClickBehavior).toBe("function")
    expect("layoutSelection" in (lastProps as object)).toBe(true)
  })

  it("does not wire hover/click behaviors when nothing consumes them", () => {
    render(
      <TooltipProvider>
        <NetworkCustomChart nodes={[{ id: "a" }]} edges={[]} layout={trivialLayout} />
      </TooltipProvider>
    )
    expect(lastProps!.customHoverBehavior).toBeUndefined()
    expect(lastProps!.customClickBehavior).toBeUndefined()
  })

  it("activates layoutSelection from a shared selection store (LinkedCharts)", async () => {
    function Emitter() {
      const sel = useSelection({ name: "s", fields: ["id"] })
      useEffect(() => {
        sel.selectPoints({ id: ["a"] })
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
      return null
    }
    render(
      <TooltipProvider>
        <LinkedCharts>
          <Emitter />
          <NetworkCustomChart nodes={[{ id: "a" }, { id: "b" }]} edges={[]} layout={trivialLayout} selection={{ name: "s" }} />
        </LinkedCharts>
      </TooltipProvider>
    )
    // After the emitter sets a clause, the chart re-renders and forwards an
    // active predicate the custom layout can read as ctx.selection.
    await waitFor(() => {
      expect(lastProps!.layoutSelection).toBeTruthy()
      expect(lastProps!.layoutSelection!.isActive).toBe(true)
    })
    expect(lastProps!.layoutSelection!.predicate({ id: "a" })).toBe(true)
    expect(lastProps!.layoutSelection!.predicate({ id: "b" })).toBe(false)
  })
})
