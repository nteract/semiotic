import * as React from "react"
import { fireEvent, render } from "@testing-library/react"
import StreamNetworkFrame from "./StreamNetworkFrame"
import type { StreamNetworkFrameHandle } from "./networkFrameHandleTypes"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import "./layouts/sankeyLayoutPlugin"
import "./layouts/forceLayoutPlugin"

const nodes = [
  { id: "A", name: "Alpha" },
  { id: "B", name: "Beta" },
  { id: "C", name: "Gamma" }
]
const edges = [
  { source: "A", target: "B", value: 2 },
  { source: "B", target: "C", value: 2 }
]
const margin = { left: 20, right: 20, top: 20, bottom: 20 }

function focusCenter(container: HTMLElement) {
  const ring = container.querySelector('[stroke-dasharray="4,2"]')!
  if (ring.tagName === "circle")
    return [Number(ring.getAttribute("cx")), Number(ring.getAttribute("cy"))]
  return [
    Number(ring.getAttribute("x")) + Number(ring.getAttribute("width")) / 2,
    Number(ring.getAttribute("y")) + Number(ring.getAttribute("height")) / 2
  ]
}

describe("network keyboard focus follows layout", () => {
  beforeEach(() => setupCanvasMock())
  afterEach(() => vi.restoreAllMocks())

  it.each(["sankey", "force"] as const)(
    "preserves %s node identity and tooltip through resize and removal",
    (chartType) => {
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const onObservation = vi.fn()
      const props = {
        ref,
        chartType,
        nodes,
        edges,
        margin,
        animate: false as const,
        onObservation
      }
      const { container, rerender } = render(
        <StreamNetworkFrame {...props} size={[600, 400]} />
      )
      const frame = container.querySelector<HTMLElement>(
        ".stream-network-frame"
      )!
      fireEvent.keyDown(frame, { key: "Home" })
      fireEvent.keyDown(frame, { key: "End" })
      const focusedId = onObservation.mock.calls.at(-1)![0].datum.id as string
      const name = nodes.find((node) => node.id === focusedId)!.name
      expect(
        container.querySelector(".stream-network-tooltip")!.textContent
      ).toContain(name)
      const originalCenter = focusCenter(container)
      onObservation.mockClear()
      rerender(<StreamNetworkFrame {...props} size={[420, 240]} />)
      const target = ref
        .current!.getTopology()
        .nodes.find((node) => node.id === focusedId)!
      const resizedCenter = focusCenter(container)
      expect(resizedCenter).not.toEqual(originalCenter)
      expect(resizedCenter[0]).toBeCloseTo(target.x + margin.left)
      expect(resizedCenter[1]).toBeCloseTo(target.y + margin.top)
      expect(
        container.querySelector(".stream-network-tooltip")!.textContent
      ).toContain(name)
      expect(onObservation).not.toHaveBeenCalled()

      const otherId = nodes.find((node) => node.id !== focusedId)!.id
      const remaining = nodes.filter((node) => node.id !== otherId)
      const remainingEdges = edges.filter(
        (edge) => edge.source !== otherId && edge.target !== otherId
      )
      rerender(
        <StreamNetworkFrame
          {...props}
          nodes={remaining}
          edges={remainingEdges}
          size={[420, 240]}
        />
      )
      fireEvent.keyDown(frame, { key: " " })
      expect(onObservation.mock.calls.at(-1)![0]).toMatchObject({
        type: "activate",
        datum: { id: focusedId }
      })
      rerender(
        <StreamNetworkFrame
          {...props}
          nodes={remaining.filter((node) => node.id !== focusedId)}
          edges={[]}
          size={[420, 240]}
        />
      )
      expect(container.querySelector('[stroke-dasharray="4,2"]')).toBeNull()
      expect(container.querySelector(".stream-network-tooltip")).toBeNull()
    }
  )
})
