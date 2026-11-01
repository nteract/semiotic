import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render } from "@testing-library/react"
import StreamNetworkFrame from "./StreamNetworkFrame"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import { setupCanvasMock } from "../../test-utils/canvasMock"

describe("shared network SVG painting", () => {
  let restore: () => void
  beforeEach(() => {
    restore = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => restore())

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
