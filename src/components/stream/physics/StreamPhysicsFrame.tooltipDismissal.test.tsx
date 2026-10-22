import * as React from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { StreamPhysicsFrame, type StreamPhysicsFrameHandle } from "./StreamPhysicsFrame"
import type { PhysicsSemanticItem } from "./StreamPhysicsTypes"

const pipe: PhysicsSemanticItem = {
  id: "pipe:a-b",
  label: "A → B: 4 rec/s",
  description: "Original edge a-b.",
  x: 120,
  y: 40,
  datum: { id: "a-b", kind: "circuit-pipe", perSecond: 4 }
}

function frame(props: Partial<React.ComponentProps<typeof StreamPhysicsFrame>> = {}) {
  return (
    <StreamPhysicsFrame
      size={[200, 120]}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      paused
      enableHover
      initialSpawns={[
        {
          id: "module",
          x: 50,
          y: 50,
          shape: { type: "circle", radius: 6 },
          datum: { units: 12 }
        }
      ]}
      semanticItems={[pipe]}
      foregroundGraphics={
        <svg width={200} height={120}>
          <path
            data-testid="pipe-hit"
            data-semiotic-semantic-id="pipe:a-b"
            d="M100,40 L140,40"
            stroke="transparent"
            strokeWidth={12}
          />
        </svg>
      }
      {...props}
    />
  )
}

const tooltip = (container: HTMLElement) =>
  container.querySelector(".stream-physics-tooltip")
const escape = () => act(() => {
  fireEvent.keyDown(document, { key: "Escape" })
})

describe("physics pointer tooltips", () => {
  let restoreCanvas: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    cleanup()
    restoreCanvas()
  })

  it("dismisses a body tooltip on Escape until the pointer moves, even across repaints", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const onObservation = vi.fn()
    const { container } = render(frame({ ref, onObservation }))
    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 })
    expect(tooltip(container)).toHaveTextContent("units: 12")
    escape()
    expect(tooltip(container)).toBeNull()
    expect(onObservation).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "hover-end" })
    )
    // A repaint at the unchanged pointer position must not reopen it.
    act(() => ref.current!.push({ id: "other", x: 160, y: 90, shape: { type: "circle", radius: 4 } }))
    expect(tooltip(container)).toBeNull()
    fireEvent.pointerMove(canvas, { clientX: 51, clientY: 50 })
    expect(tooltip(container)).toHaveTextContent("units: 12")
  })

  it("shows overlay semantic items with chrome, observes them and dismisses on Escape or leave", () => {
    const onObservation = vi.fn()
    const { container, getByTestId } = render(frame({ onObservation }))
    fireEvent.pointerMove(getByTestId("pipe-hit"), { clientX: 120, clientY: 40 })
    const shown = tooltip(container)!
    expect(shown).toHaveTextContent("A → B: 4 rec/s")
    expect(shown).toHaveTextContent("Original edge a-b.")
    // The default item tooltip owns the standard chrome.
    expect(shown.querySelector(".semiotic-tooltip")).not.toBeNull()
    expect(onObservation).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "hover", datum: pipe.datum })
    )
    escape()
    expect(tooltip(container)).toBeNull()
    fireEvent.pointerMove(getByTestId("pipe-hit"), { clientX: 121, clientY: 40 })
    expect(tooltip(container)).not.toBeNull()
    fireEvent.pointerLeave(container.querySelector('[role="img"]')!)
    expect(tooltip(container)).toBeNull()
    expect(onObservation).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "hover-end" })
    )
  })

  it("renders custom item content and hands off to the body under the pointer", () => {
    const { container, getByTestId } = render(
      frame({
        semanticItemTooltipContent: (item) => `Pipe ${String((item.datum as { id: string }).id)}`
      })
    )
    fireEvent.pointerMove(getByTestId("pipe-hit"), { clientX: 120, clientY: 40 })
    expect(tooltip(container)).toHaveTextContent("Pipe a-b")
    fireEvent.pointerMove(container.querySelector("canvas")!, { clientX: 50, clientY: 50 })
    expect(container.querySelectorAll(".stream-physics-tooltip")).toHaveLength(1)
    expect(tooltip(container)).toHaveTextContent("units: 12")
  })

  it("hands keyboard body focus to a pointer item and keeps it through repaint", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const onBodyHover = vi.fn()
    const onSemanticItemFocus = vi.fn()
    const { container, getByTestId } = render(
      frame({
        ref,
        bodySemanticItems: true,
        onBodyHover,
        onSemanticItemFocus
      })
    )
    act(() => ref.current!.step(0))
    const host = container.querySelector('[role="img"]')!
    fireEvent.keyDown(host, { key: "End" })
    fireEvent.keyDown(host, { key: "End" })
    expect(tooltip(container)).toHaveTextContent("units: 12")
    fireEvent.pointerLeave(container.querySelector("canvas")!)
    fireEvent.pointerMove(getByTestId("pipe-hit"), { clientX: 120, clientY: 40 })
    expect(onSemanticItemFocus).toHaveBeenLastCalledWith(null)
    expect(onBodyHover).toHaveBeenLastCalledWith(null, null)
    expect(tooltip(container)).toHaveTextContent("A → B: 4 rec/s")
    act(() => ref.current!.step(0))
    expect(tooltip(container)).toHaveTextContent("A → B: 4 rec/s")
    fireEvent.pointerLeave(host)
    expect(tooltip(container)).toBeNull()
  })

  it("reports item hover in logical plot coordinates under a scaled ancestor", () => {
    const onObservation = vi.fn()
    const { container, getByTestId } = render(
      frame({
        onObservation,
        margin: { left: 10, top: 20, right: 0, bottom: 0 }
      })
    )
    const host = container.querySelector<HTMLElement>('[role="img"]')!
    Object.defineProperties(host, {
      clientWidth: { value: 200 },
      clientHeight: { value: 120 }
    })
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue({
      left: 30,
      top: 40,
      width: 100,
      height: 60,
      right: 130,
      bottom: 100,
      x: 30,
      y: 40,
      toJSON: () => ({})
    })
    fireEvent.pointerMove(getByTestId("pipe-hit"), { clientX: 95, clientY: 70 })
    expect(onObservation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "hover",
        x: 120,
        y: 40,
        datum: pipe.datum
      })
    )
  })

})
