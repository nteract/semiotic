import * as React from "react"
import { act } from "react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, renderHook, screen } from "@testing-library/react"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "./StreamPhysicsFrame"
import type {
  PhysicsPipelineStore,
  PhysicsQueuedSpawn
} from "./PhysicsPipelineStore"
import type { PhysicsBodyState } from "./PhysicsKernel"
import { usePhysicsCanvasPointer } from "./usePhysicsCanvasPointer"
import { createFrameScheduler } from "../test-utils/frameScheduler"

const quietKernel = {
  gravity: { x: 0, y: 0 },
  velocityDamping: 1,
  sleepSpeed: 100,
  sleepAfter: 0.01
}

function circle(id: string, x = 30, y = 30): PhysicsQueuedSpawn {
  return { id, x, y, shape: { type: "circle", radius: 5 }, mass: 1 }
}

describe("StreamPhysicsFrame authored cursors", () => {
  let cleanupCanvas: () => void

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => cleanupCanvas())

  it("reuses and resets its lazy cursor collection between paints", () => {
    const { result } = renderHook(() =>
      usePhysicsCanvasPointer({
        canvasRef: React.createRef<HTMLCanvasElement>(),
        clearHover: vi.fn(),
        emitObservation: vi.fn(),
        enableHover: false,
        hoverRadius: 0,
        onBodyHover: undefined,
        setHoverData: vi.fn(),
        storeRef: React.createRef<PhysicsPipelineStore>()
      })
    )
    const body: PhysicsBodyState = {
      id: "cursor-body",
      x: 10,
      y: 10,
      prevX: 10,
      prevY: 10,
      vx: 0,
      vy: 0,
      angle: 0,
      mass: 1,
      shape: { type: "circle", radius: 5 },
      sleeping: false
    }

    const first = result.current.begin()
    expect(first.targets).toBeUndefined()
    result.current.collect(first, body, { cursor: "pointer" }, false)
    const targets = first.targets
    expect(targets?.size).toBe(1)
    expect(first.maxSearchRadius).toBeGreaterThan(0)

    const second = result.current.begin()
    expect(second).toBe(first)
    expect(second.targets).toBe(targets)
    expect(second.targets?.size).toBe(0)
    expect(second.maxSearchRadius).toBe(0)
  })

  it("clears a hit-tested cursor on miss, leave, or style removal with hover disabled", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const { container, rerender, unmount } = render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        paused
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        enableHover={false}
        initialSpawns={[circle("cursor-body", 50, 50)]}
        bodyStyle={{ cursor: "pointer" }}
      />
    )

    const hitTest = vi.spyOn(ref.current!.getStore(), "hitTest")
    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 })
    expect(hitTest).toHaveBeenCalledWith(
      50,
      50,
      0,
      expect.objectContaining({ searchRadius: expect.any(Number) })
    )
    expect(canvas.style.cursor).toBe("pointer")
    expect(screen.queryByText("cursor-body")).toBeNull()

    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 100 })
    expect(canvas.style.cursor).toBe("")
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 })
    expect(canvas.style.cursor).toBe("pointer")
    fireEvent.pointerLeave(canvas)
    expect(canvas.style.cursor).toBe("")

    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 })
    rerender(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        paused
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        enableHover={false}
        initialSpawns={[circle("cursor-body", 50, 50)]}
        bodyStyle={{ fill: "#abcdef" }}
      />
    )
    expect(canvas.style.cursor).toBe("")

    rerender(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        paused
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        enableHover={false}
        initialSpawns={[circle("cursor-body", 50, 50)]}
        bodyStyle={{ cursor: "pointer" }}
      />
    )
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 })
    expect(canvas.style.cursor).toBe("pointer")
    unmount()
    expect(canvas.style.cursor).toBe("")
  })

  it("re-hit-tests an in-canvas pointer as authored cursor bodies move", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const { container } = render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        config={{
          fixedDt: 0.1,
          kernel: {
            gravity: { x: 0, y: 0 },
            velocityDamping: 1,
            sleepSpeed: 0.001,
            sleepAfter: 999
          }
        }}
        enableHover={false}
        initialSpawns={[{ ...circle("moving-cursor", 50, 50), vx: 200 }]}
        bodyStyle={{ cursor: "pointer" }}
      />
    )

    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 })
    expect(canvas.style.cursor).toBe("pointer")
    act(() => ref.current!.step(0.1))
    expect(ref.current!.getData()[0].x).toBeGreaterThan(55)
    expect(canvas.style.cursor).toBe("")
  })

  it("hits the built-in authored visual radius, while custom rendering keeps collision geometry", () => {
    const baseProps = {
      size: [200, 120] as [number, number],
      paused: true,
      config: { fixedDt: 0.1, kernel: quietKernel },
      enableHover: false,
      initialSpawns: [circle("styled-radius", 50, 50)],
      bodyStyle: { r: 12, cursor: "pointer" as const }
    }
    const { container, rerender } = render(
      <StreamPhysicsFrame {...baseProps} />
    )
    const canvas = container.querySelector("canvas")!

    // Ten pixels from center is outside the 5px collision circle but inside
    // the built-in mark's authored 12px radius.
    fireEvent.pointerMove(canvas, { clientX: 60, clientY: 50 })
    expect(canvas.style.cursor).toBe("pointer")

    rerender(<StreamPhysicsFrame {...baseProps} renderBody={() => {}} />)
    fireEvent.pointerMove(canvas, { clientX: 60, clientY: 50 })
    expect(canvas.style.cursor).toBe("")
  })

  it("skips cursor-only touch hit testing", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const { container } = render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        paused
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        enableHover={false}
        initialSpawns={[circle("touch-cursor", 50, 50)]}
        bodyStyle={{ cursor: "pointer" }}
      />
    )
    const hitTest = vi.spyOn(ref.current!.getStore(), "hitTest")
    fireEvent.pointerMove(container.querySelector("canvas")!, {
      clientX: 50,
      clientY: 50,
      pointerType: "touch"
    })
    expect(hitTest).not.toHaveBeenCalled()
  })

  it("keeps touch hover behavior without applying a cursor", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const { container } = render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        paused
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        enableHover
        initialSpawns={[circle("touch-hover", 50, 50)]}
        bodyStyle={{ cursor: "pointer" }}
      />
    )
    const hitTest = vi.spyOn(ref.current!.getStore(), "hitTest")
    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(canvas, {
      clientX: 50,
      clientY: 50,
      pointerType: "touch"
    })

    expect(hitTest).toHaveBeenCalledTimes(1)
    expect(canvas.style.cursor).toBe("")
    expect(screen.getAllByText("touch-hover").length).toBeGreaterThan(0)
  })

  it("skips hit-testing and scheduling without hover or authored cursors", () => {
    const scheduler = createFrameScheduler(0)
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const { container } = render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        paused
        frameScheduler={scheduler.scheduler}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        enableHover={false}
        initialSpawns={[circle("plain-body", 50, 50)]}
      />
    )

    const hitTest = vi.spyOn(ref.current!.getStore(), "hitTest")
    const canvas = container.querySelector("canvas")!
    const readBounds = vi.spyOn(canvas, "getBoundingClientRect")
    const scheduledBeforeMove = scheduler.requestedHandles.length
    fireEvent.pointerMove(canvas, {
      clientX: 50,
      clientY: 50
    })
    expect(hitTest).not.toHaveBeenCalled()
    expect(readBounds).not.toHaveBeenCalled()
    expect(scheduler.requestedHandles).toHaveLength(scheduledBeforeMove)
  })

  it("preserves authored body cursors in the direct server SVG", () => {
    const html = renderToString(
      <StreamPhysicsFrame
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("server-cursor", 50, 50)]}
        bodyStyle={{ cursor: "pointer" }}
      />
    )

    expect(html).toContain('data-semiotic-mark-cursor="pointer"')
    expect(html).toContain('style="cursor:pointer"')
  })
})
