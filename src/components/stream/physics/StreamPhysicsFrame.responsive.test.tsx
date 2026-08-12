import * as React from "react"
import { act } from "react"
import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "./StreamPhysicsFrame"

const quietKernel = {
  gravity: { x: 0, y: 0 },
  velocityDamping: 1,
  sleepSpeed: 100,
  sleepAfter: 0.01
}

describe("StreamPhysicsFrame responsive bounds", () => {
  let cleanupCanvas: () => void

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => {
    cleanupCanvas()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("rebuilds frame-owned annotation bounds at the measured size", async () => {
    let resizeCallback: ResizeObserverCallback | undefined
    let observed: Element | undefined
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback
        }
        observe(target: Element) {
          observed = target
        }
        disconnect() {}
        unobserve() {}
      }
    )
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const { container, rerender } = render(
      <StreamPhysicsFrame
        ref={ref}
        responsiveWidth
        responsiveHeight
        size={[100, 80]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        annotations={[
          {
            id: "responsive-wall",
            type: "x-threshold",
            axis: "x",
            x: 40,
            physics: "barrier"
          }
        ]}
      />
    )
    const colliderShape = () =>
      ref.current
        ?.snapshot()
        .world.colliders.find((collider) =>
          collider.id.includes("responsive-wall")
        )?.shape

    expect(colliderShape()).toMatchObject({
      type: "segment",
      x1: 40,
      x2: 40,
      y1: 0,
      y2: 80
    })
    expect(observed).toBe(container.querySelector(".stream-physics-frame"))
    act(() => {
      resizeCallback?.(
        [
          {
            target: observed,
            contentRect: { width: 180, height: 140 }
          } as unknown as ResizeObserverEntry
        ],
        {} as ResizeObserver
      )
    })
    await waitFor(() => {
      expect(colliderShape()).toMatchObject({
        type: "segment",
        x1: 40,
        x2: 40,
        y1: 0,
        y2: 140
      })
      expect(container.querySelector("canvas")).toHaveAttribute("width", "180")
    })
    const wrapper = container.querySelector(
      ".stream-physics-frame"
    ) as HTMLElement
    expect(wrapper.style.width).toBe("100%")
    expect(wrapper.style.height).toBe("100%")

    rerender(
      <StreamPhysicsFrame
        ref={ref}
        responsiveWidth
        responsiveHeight
        size={[100, 80]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        annotations={[]}
      />
    )
    await waitFor(() => expect(colliderShape()).toBeUndefined())
  })
})
