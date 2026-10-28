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

  it.each([
    "ArrowRight",
    "ArrowLeft",
    "ArrowDown",
    "ArrowUp",
    "Home",
    "End",
    "PageDown",
    "PageUp",
    "Enter"
  ])("starts ungrouped navigation with %s, including after Escape", (key) => {
    const onObservation = vi.fn()
    const { container } = render(
      <StreamNetworkFrame
        size={[700, 300]}
        nodes={nodes}
        edges={edges}
        chartType="force"
        animate={false}
        onObservation={onObservation}
        customNetworkLayout={() => ({
          sceneNodes: nodes.map((datum, i) => ({
            type: "rect" as const,
            id: datum.id,
            x: i * 200,
            y: 0,
            w: 100,
            h: 100,
            datum,
            style: {}
          }))
        })}
        tooltipContent={(hover) => hover.data?.name}
      />
    )
    const frame = container.querySelector<HTMLElement>(".stream-network-frame")!
    for (let attempt = 0; attempt < 2; attempt++) {
      fireEvent.keyDown(frame, { key })
      expect(onObservation.mock.calls.at(-1)![0]).toMatchObject({
        type: "focus",
        datum: { id: key === "End" ? "C" : "A" }
      })
      expect(
        container.querySelector(".stream-network-tooltip")
      ).toHaveTextContent(key === "End" ? "Gamma" : "Alpha")
      fireEvent.keyDown(frame, { key: "Home" })
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      expect(
        container.querySelector(".stream-network-tooltip")
      ).toHaveTextContent("Beta")
      fireEvent.blur(frame, { relatedTarget: document.body })
      expect(container.querySelector(".stream-network-tooltip")).toBeNull()
      expect(container.querySelector('[stroke-dasharray="4,2"]')).toBeNull()
      fireEvent.keyDown(frame, { key: "Escape" })
    }
  })

  it("notifies the current hover listener when focused data disappears", () => {
    const previousListener = vi.fn()
    const currentListener = vi.fn()
    const props = {
      nodes,
      edges,
      size: [600, 400] as [number, number],
      chartType: "sankey" as const,
      animate: false as const
    }
    const { container, rerender } = render(
      <StreamNetworkFrame {...props} customHoverBehavior={previousListener} />
    )
    const frame = container.querySelector<HTMLElement>(".stream-network-frame")!
    fireEvent.keyDown(frame, { key: "End" })
    expect(
      container.querySelector(".stream-network-tooltip")
    ).toHaveTextContent("Gamma")
    previousListener.mockClear()
    rerender(
      <StreamNetworkFrame {...props} customHoverBehavior={currentListener} />
    )
    expect(currentListener).not.toHaveBeenCalled()
    rerender(
      <StreamNetworkFrame
        {...props}
        nodes={nodes.slice(0, 2)}
        edges={edges.slice(0, 1)}
        customHoverBehavior={currentListener}
      />
    )
    expect(container.querySelector(".stream-network-tooltip")).toBeNull()
    expect(currentListener).toHaveBeenCalledTimes(1)
    expect(currentListener.mock.lastCall?.[0]).toBeNull()
    expect(previousListener).not.toHaveBeenCalled()
  })

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

it("navigates nested card rows through the frame and dismisses after ascending", () => {
  setupCanvasMock()
  const onObservation = vi.fn()
  const { container } = render(
    <StreamNetworkFrame
      size={[700, 300]}
      nodes={nodes}
      edges={[]}
      chartType="force"
      animate={false}
      onObservation={onObservation}
      customNetworkLayout={() => ({
        sceneNodes: nodes.flatMap((n, i) => [
          {
            type: "rect" as const,
            id: n.id,
            x: 200 * i,
            y: 0,
            w: 100,
            h: 100,
            datum: n,
            style: {}
          },
          ...[0, 1].map((row) => ({
            type: "rect" as const,
            id: `${n.id}-${row}`,
            navParentId: n.id,
            x: i * 200,
            y: 40 + row * 20,
            w: 100,
            h: 20,
            datum: { id: `${n.id}-${row}` },
            style: {}
          }))
        ])
      })}
      tooltipContent={(hover) => hover.data?.id}
    />
  )
  const frame = container.querySelector<HTMLElement>(".stream-network-frame")!
  const step = (key: string, id: string) => {
    fireEvent.keyDown(frame, { key })
    expect(onObservation.mock.calls.at(-1)![0].datum.id).toBe(id)
    expect(
      container.querySelector(".stream-network-tooltip")
    ).toHaveTextContent(id)
  }
  step("ArrowRight", "B")
  step("ArrowRight", "C")
  step("Enter", "C-0")
  step("ArrowDown", "C-1")
  step("Escape", "C")
  fireEvent.keyDown(frame, { key: "Escape" })
  expect(container.querySelector(".stream-network-tooltip")).toBeNull()
  vi.restoreAllMocks()
})
