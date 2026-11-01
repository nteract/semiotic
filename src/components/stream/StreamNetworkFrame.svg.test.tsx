import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render } from "@testing-library/react"
import StreamNetworkFrame from "./StreamNetworkFrame"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { IngestActivity } from "./IngestActivity"

describe("shared network SVG painting", () => {
  let restore: () => void
  beforeEach(() => {
    restore = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    restore()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("repaints graded SVG staleness when idle time crosses each band", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] })
    const elapsed = vi.spyOn(IngestActivity.prototype, "elapsed").mockReturnValue(0)
    const scheduler = createFrameScheduler()
    const { container } = render(
      <StreamNetworkFrame
        chartType="tree"
        data={{ id: "root", children: [{ id: "leaf" }] }}
        size={[300, 180]}
        renderAs="svg"
        animate={false}
        accessibleTable={false}
        staleness={{ threshold: 1000, graded: true }}
        frameScheduler={scheduler.scheduler}
      />
    )
    await act(async () => scheduler.flush())
    const marks = () => container.querySelector("svg[data-network-scene] > g")!
    expect(marks()).toHaveAttribute("opacity", "1")
    for (const [age, opacity] of [[1200, "0.7"], [1700, "0.45"], [3100, "0.25"]] as const) {
      elapsed.mockReturnValue(age)
      await act(async () => vi.advanceTimersByTime(1000))
      await act(async () => scheduler.flush())
      expect(marks()).toHaveAttribute("opacity", opacity)
    }
  })

  it("repaints retained SVG styles without relayout and keeps pointer/keyboard datum identity", async () => {
    const scheduler = createFrameScheduler()
    const data = [
      { id: "a", value: 12 },
      { id: "b", value: 8 }
    ]
    const layout = vi.fn<NetworkCustomLayout>(({ nodes }) => ({
      sceneNodes: nodes.map((node, index) => ({
        type: "rect",
        id: node.id,
        x: 30 + index * 90,
        y: 40,
        w: 50,
        h: 30,
        datum: node.data!,
        style: { fill: "#123456" }
      })),
      restyle: (node, selection) => ({
        opacity:
          !selection?.isActive || selection.predicate(node.datum!) ? 1 : 0.2
      })
    }))
    const click = vi.fn()
    const hover = vi.fn()
    const common = {
      chartType: "force" as const,
      nodes: data,
      customNetworkLayout: layout,
      size: [300, 180] as [number, number],
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      renderAs: "svg" as const,
      keyboardNavigation: "spatial" as const,
      animate: false,
      accessibleTable: false,
      frameScheduler: scheduler.scheduler,
      customClickBehavior: click,
      customHoverBehavior: hover
    }
    const { container, rerender } = render(<StreamNetworkFrame {...common} />)
    await act(async () => scheduler.flush())
    const marks = () =>
      container.querySelectorAll("svg[data-network-scene] rect")
    expect(container.querySelector("canvas")!.style.opacity).toBe("")
    const scene = container.querySelector("svg[data-network-scene]")!
    const particleCanvas = container.querySelector("canvas")!
    expect(scene.compareDocumentPosition(particleCanvas)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(marks()).toHaveLength(2)
    expect(marks()[0]).toHaveAttribute("x", "30")
    const calls = layout.mock.calls.length
    rerender(
      <StreamNetworkFrame
        {...common}
        layoutSelection={{ isActive: true, predicate: (row) => row.id === "b" }}
      />
    )
    await act(async () => scheduler.flush())
    expect(layout).toHaveBeenCalledTimes(calls)
    expect(marks()[0]).toHaveAttribute("opacity", "0.2")
    expect(marks()[1]).toHaveAttribute("opacity", "1")
    const frame = container.querySelector(".stream-network-frame")!
    fireEvent.keyDown(frame, { key: "Home" })
    fireEvent.keyDown(frame, { key: "Enter" })
    expect(click.mock.calls.at(-1)?.[0].data).toBe(data[0])
    fireEvent.keyDown(frame, { key: "ArrowRight" })
    fireEvent.keyDown(frame, { key: " " })
    expect(click.mock.calls.at(-1)?.[0].data).toBe(data[1])
    fireEvent.keyDown(frame, { key: "Escape" })
    expect(hover).toHaveBeenLastCalledWith(null, undefined)
    fireEvent.mouseMove(container.querySelector('[role="img"]')!, {
      clientX: 55,
      clientY: 55
    })
    await act(async () => scheduler.flush())
    expect(hover.mock.calls.at(-1)?.[0].data).toBe(data[0])
    rerender(<StreamNetworkFrame {...common} renderAs="canvas" />)
    await act(async () => scheduler.flush())
    expect(container.querySelector("svg[data-network-scene]")).toBeNull()
    expect(container.querySelector("canvas")!.style.opacity).toBe("")
  })
})
