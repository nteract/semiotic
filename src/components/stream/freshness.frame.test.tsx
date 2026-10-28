import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, render } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { FrameRuntime } from "./FrameRuntime"
import { IngestActivity } from "./IngestActivity"

let restoreCanvas: () => void
beforeEach(() => {
  vi.useFakeTimers()
  restoreCanvas = setupCanvasMock()
})
afterEach(() => {
  restoreCanvas()
  vi.useRealTimers()
})

const data = [{ x: 1, y: 2, category: "A", value: 2, lon: 0, lat: 0 }]

describe("wall-clock freshness across frame families", () => {
  it.each(["xy", "ordinal", "geo", "network"])(
    "announces stale data while %s is paused",
    (family) => {
      let wallTime = 0
      const props = {
        clock: () => wallTime,
        paused: true,
        size: [300, 200] as [number, number],
        staleness: { threshold: 500, showBadge: true },
        accessibleTable: false as const
      }
      const result = render(
        family === "xy" ? (
          <StreamXYFrame
            {...props}
            data={data}
            chartType="scatter"
            xAccessor="x"
            yAccessor="y"
          />
        ) : family === "ordinal" ? (
          <StreamOrdinalFrame
            {...props}
            data={data}
            chartType="bar"
            oAccessor="category"
            rAccessor="value"
          />
        ) : family === "geo" ? (
          <StreamGeoFrame
            {...props}
            projection="mercator"
            points={data}
            xAccessor="lon"
            yAccessor="lat"
          />
        ) : (
          <StreamNetworkFrame
            {...props}
            chartType="force"
            nodes={[{ id: "a" }, { id: "b" }]}
            edges={[{ source: "a", target: "b" }]}
          />
        )
      )
      const badge = result.getByRole("status")
      expect(badge.textContent).toBe("LIVE")
      expect(badge.closest('[role="img"]')).toBeNull()
      wallTime = 10_000
      act(() => vi.advanceTimersByTime(1000))
      expect(badge.textContent).toBe("STALE")
      expect(badge.getAttribute("aria-live")).toBe("polite")
    }
  )

  it("keeps hidden-time freshness separate from animations and handles ingestion at clock zero", () => {
    let time = 0
    const runtime = new FrameRuntime({ clock: () => time })
    const activity = new IngestActivity(runtime.wallNow)
    activity.touch()
    runtime.setVisible(false)
    time = 10_000
    runtime.setVisible(true)
    expect(runtime.now()).toBe(0)
    expect(activity.elapsed()).toBe(10_000)
    activity.touch()
    expect(activity.elapsed()).toBe(0)
    time += 500
    expect(activity.elapsed()).toBe(500)
    activity.clear()
    expect(activity.elapsed()).toBe(0)
  })
})
