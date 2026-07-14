import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render } from "@testing-library/react"
import StreamGeoFrame from "./StreamGeoFrame"
import { GeoParticlePool } from "./GeoParticlePool"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { createFrameScheduler } from "./test-utils/frameScheduler"

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
})
