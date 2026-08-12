import * as React from "react"
import { act, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import {
  createFrameGraphicsScaleTracker,
  resolveSubscribedFrameLayers
} from "./frameGraphicsSubscription"

describe("frame graphics scale subscription", () => {
  it("notifies once per new scale bundle only while the committed tree subscribes", () => {
    const initial = { value: 1 }
    const tracker = createFrameGraphicsScaleTracker(initial)
    const listener = vi.fn()
    const next = { value: 2 }

    tracker.sync(initial)
    tracker.sync(next)
    expect(listener).not.toHaveBeenCalled()
    expect(tracker.getSnapshot()).toBe(1)

    const unsubscribe = tracker.subscribe(listener)
    const subscribed = { value: 3 }
    tracker.sync(subscribed)
    tracker.sync(subscribed)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    tracker.sync({ value: 4 })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(tracker.getSnapshot()).toBe(3)
  })

  it("keeps a committed subscriber live without render-time configuration", () => {
    const initial = { value: 1 }
    const next = { value: 2 }
    const tracker = createFrameGraphicsScaleTracker(initial)
    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.sync(next)
    tracker.sync(next)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("re-resolves only function-form layers against the latest scales", () => {
    let scales = { value: 1 }
    const tracker = createFrameGraphicsScaleTracker(scales)
    const foregroundGraphics = vi.fn(({ scales: current }) => (
      <text data-testid="scale-value">{current?.value}</text>
    ))
    const layers = resolveSubscribedFrameLayers({
      foregroundGraphics,
      backgroundGraphics: <rect data-testid="static-background" />,
      size: [200, 100],
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      scales,
      themeBackgroundColor: "#fff",
      tracker,
      readScales: () => scales
    })
    const { getByTestId } = render(<svg>{layers.resolvedBackground}{layers.resolvedForeground}</svg>)

    expect(getByTestId("scale-value")).toHaveTextContent("1")
    expect(foregroundGraphics).toHaveBeenCalledTimes(1)
    scales = { value: 2 }
    act(() => tracker.sync(scales))
    expect(getByTestId("scale-value")).toHaveTextContent("2")
    expect(foregroundGraphics).toHaveBeenCalledTimes(2)
    expect(getByTestId("static-background")).toBeTruthy()
  })

  it("catches a StrictMode scale change before subscription and cleans up on unmount", () => {
    let scales = { value: 1 }
    const tracker = createFrameGraphicsScaleTracker(scales)
    const foregroundGraphics = vi.fn(({ scales: current }) => (
      <text data-testid="strict-scale-value">{current?.value}</text>
    ))
    const layers = resolveSubscribedFrameLayers({
      foregroundGraphics,
      size: [200, 100],
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      scales,
      themeBackgroundColor: "#fff",
      tracker,
      readScales: () => scales
    })

    function SyncBeforePassiveSubscription() {
      React.useLayoutEffect(() => {
        scales = { value: 2 }
        tracker.sync(scales)
      }, [])
      return null
    }

    const { getByTestId, unmount } = render(
      <React.StrictMode>
        <svg>
          {layers.resolvedForeground}
          <SyncBeforePassiveSubscription />
        </svg>
      </React.StrictMode>
    )

    expect(getByTestId("strict-scale-value")).toHaveTextContent("2")
    unmount()
    const callsAfterUnmount = foregroundGraphics.mock.calls.length
    act(() => {
      scales = { value: 3 }
      tracker.sync(scales)
    })
    expect(foregroundGraphics).toHaveBeenCalledTimes(callsAfterUnmount)
  })
})
