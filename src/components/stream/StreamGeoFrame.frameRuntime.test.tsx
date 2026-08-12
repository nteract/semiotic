import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render } from "@testing-library/react"
import StreamGeoFrame from "./StreamGeoFrame"
import { GeoParticlePool } from "./GeoParticlePool"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import type { StreamGeoFrameHandle } from "./geoTypes"

const flowLines = [{
  id: "route",
  coordinates: [
    { lon: -122.4, lat: 37.8 },
    { lon: -74, lat: 40.7 }
  ]
}]

describe("StreamGeoFrame frame runtime", () => {
  let restoreCanvas: (() => void) | null = null

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => {
    restoreCanvas?.()
    restoreCanvas = null
    vi.restoreAllMocks()
  })

  it("cancels particle work while paused and resumes without wall-clock catch-up", () => {
    const scheduler = createFrameScheduler(0)
    const step = vi.spyOn(GeoParticlePool.prototype, "step")
    let wallTime = 1
    const clock = () => wallTime
    const random = () => 0.25

    const { rerender } = render(
      <StreamGeoFrame
        projection="mercator"
        xAccessor="lon"
        yAccessor="lat"
        lines={flowLines}
        showParticles
        particleStyle={{ maxPerLine: 1, spawnRate: 1 }}
        frameScheduler={scheduler.scheduler}
        clock={clock}
        random={random}
      />
    )

    act(() => scheduler.flush(wallTime))
    expect(step).toHaveBeenCalled()
    const initialStepCount = step.mock.calls.length
    expect(scheduler.pendingCount).toBe(1)

    wallTime = 16
    act(() => {
      rerender(
        <StreamGeoFrame
          projection="mercator"
          xAccessor="lon"
          yAccessor="lat"
          lines={flowLines}
          showParticles
          particleStyle={{ maxPerLine: 1, spawnRate: 1 }}
          frameScheduler={scheduler.scheduler}
          clock={clock}
          random={random}
          paused
        />
      )
    })
    expect(scheduler.pendingCount).toBe(0)

    wallTime = 10_000
    act(() => {
      rerender(
        <StreamGeoFrame
          projection="mercator"
          xAccessor="lon"
          yAccessor="lat"
          lines={flowLines}
          showParticles
          particleStyle={{ maxPerLine: 1, spawnRate: 1 }}
          frameScheduler={scheduler.scheduler}
          clock={clock}
          random={random}
          paused={false}
        />
      )
    })
    expect(scheduler.pendingCount).toBe(1)

    wallTime = 10_016
    act(() => scheduler.flush(wallTime))
    expect(step.mock.calls.length).toBeGreaterThan(initialStepCount)
    const resumedDelta = step.mock.calls[step.mock.calls.length - 1]?.[0]
    expect(resumedDelta).toBeLessThan(0.05)
  })

  it("suspends Geo continuation while hidden and schedules a resume", () => {
    const scheduler = createFrameScheduler(10)
    const originalHiddenDescriptor = Object.getOwnPropertyDescriptor(document, "hidden")
    const setVisibility = (hidden: boolean) => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => hidden
      })
      document.dispatchEvent(new Event("visibilitychange"))
    }

    try {
      render(
        <StreamGeoFrame
          projection="mercator"
          xAccessor="lon"
          yAccessor="lat"
          lines={flowLines}
          showParticles
          particleStyle={{ maxPerLine: 1, spawnRate: 1 }}
          frameScheduler={scheduler.scheduler}
          random={() => 0.25}
        />
      )

      act(() => scheduler.flush())
      expect(scheduler.pendingCount).toBe(1)

      act(() => setVisibility(true))
      expect(scheduler.pendingCount).toBe(0)

      act(() => setVisibility(false))
      expect(scheduler.pendingCount).toBe(1)
    } finally {
      if (originalHiddenDescriptor) {
        Object.defineProperty(document, "hidden", originalHiddenDescriptor)
      } else {
        Reflect.deleteProperty(document, "hidden")
      }
    }
  })

  it("uses an authored point cursor with hover disabled and resets it on leave", () => {
    const scheduler = createFrameScheduler(0)
    const ref = React.createRef<StreamGeoFrameHandle>()
    const { container } = render(
      <StreamGeoFrame
        ref={ref}
        projection="mercator"
        xAccessor="lon"
        yAccessor="lat"
        points={[
          { lon: 0, lat: 0 },
          { lon: 20, lat: 10 }
        ]}
        pointStyle={() => ({ r: 8, cursor: "pointer" })}
        enableHover={false}
        animate={false}
        size={[300, 200]}
        frameScheduler={scheduler.scheduler}
      />
    )

    act(() => scheduler.flush())
    const projected = ref.current!.getProjection()!([0, 0])!
    expect(projected.every(Number.isFinite)).toBe(true)
    const image = container.querySelector<HTMLElement>('[role="img"]')!
    const canvas = container.querySelector("canvas")!

    fireEvent.pointerMove(image, {
      clientX: 10 + projected[0],
      clientY: 10 + projected[1]
    })
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("pointer")

    const requestsBeforeLeave = scheduler.requestedHandles.length
    fireEvent.pointerLeave(image)
    expect(canvas.style.cursor).toBe("")
    expect(scheduler.requestedHandles).toHaveLength(requestsBeforeLeave)
  })

  it("does not schedule pointer work with hover disabled and no authored cursor", () => {
    const scheduler = createFrameScheduler(0)
    const { container } = render(
      <StreamGeoFrame
        projection="mercator"
        xAccessor="lon"
        yAccessor="lat"
        points={[{ lon: 0, lat: 0 }]}
        enableHover={false}
        animate={false}
        size={[300, 200]}
        frameScheduler={scheduler.scheduler}
      />
    )

    act(() => scheduler.flush())
    expect(scheduler.pendingCount).toBe(0)
    const requestsBeforeMove = scheduler.requestedHandles.length
    const image = container.querySelector<HTMLElement>('[role="img"]')!

    fireEvent.pointerMove(image, { clientX: 150, clientY: 100 })
    fireEvent.pointerLeave(image)

    expect(scheduler.pendingCount).toBe(0)
    expect(scheduler.requestedHandles).toHaveLength(requestsBeforeMove)
  })

  it("does not schedule authored-cursor-only work for direct touch input", () => {
    const scheduler = createFrameScheduler(0)
    const { container } = render(
      <StreamGeoFrame
        projection="mercator"
        xAccessor="lon"
        yAccessor="lat"
        points={[{ lon: 0, lat: 0 }]}
        pointStyle={() => ({ r: 8, cursor: "pointer" })}
        enableHover={false}
        animate={false}
        size={[300, 200]}
        frameScheduler={scheduler.scheduler}
      />
    )

    act(() => scheduler.flush())
    const requestsBeforeTouch = scheduler.requestedHandles.length
    const image = container.querySelector<HTMLElement>('[role="img"]')!
    fireEvent.pointerMove(image, {
      clientX: 150,
      clientY: 100,
      pointerType: "touch"
    })

    expect(container.querySelector("canvas")!.style.cursor).toBe("")
    expect(scheduler.requestedHandles).toHaveLength(requestsBeforeTouch)
  })
})
