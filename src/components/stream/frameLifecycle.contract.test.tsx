import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render } from "@testing-library/react"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamPhysicsFrame from "./physics/StreamPhysicsFrame"
import { FrameRuntime } from "./FrameRuntime"
import type { FrameScheduler } from "./useFrame"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import { setupCanvasMock } from "../../test-utils/canvasMock"

interface LifecycleProps {
  clock: () => number
  frameScheduler: FrameScheduler
  paused: boolean
  seed: number
  suspendWhenHidden: boolean
}

interface FrameFamily {
  name: string
  makeFrame: (props: LifecycleProps) => React.ReactElement
}

const XY_DATA = [{ id: "xy", x: 1, y: 2 }]
const ORDINAL_DATA = [{ id: "ordinal", category: "A", value: 2 }]
const NETWORK_NODES = [{ id: "source" }, { id: "target" }]
const NETWORK_EDGES = [{ id: "edge", source: "source", target: "target", value: 1 }]
const GEO_POINTS = [{ id: "geo", lon: -122.4, lat: 37.8 }]

const FRAME_FAMILIES: readonly FrameFamily[] = [
  {
    name: "XY",
    makeFrame: props => (
      <StreamXYFrame
        chartType="scatter"
        data={XY_DATA}
        xAccessor="x"
        yAccessor="y"
        size={[160, 100]}
        accessibleTable={false}
        {...props}
      />
    ),
  },
  {
    name: "ordinal",
    makeFrame: props => (
      <StreamOrdinalFrame
        chartType="bar"
        data={ORDINAL_DATA}
        oAccessor="category"
        rAccessor="value"
        size={[160, 100]}
        accessibleTable={false}
        {...props}
      />
    ),
  },
  {
    name: "network",
    makeFrame: props => (
      <StreamNetworkFrame
        chartType="sankey"
        nodes={NETWORK_NODES}
        edges={NETWORK_EDGES}
        size={[160, 100]}
        accessibleTable={false}
        {...props}
      />
    ),
  },
  {
    name: "geo",
    makeFrame: props => (
      <StreamGeoFrame
        projection="mercator"
        points={GEO_POINTS}
        xAccessor="lon"
        yAccessor="lat"
        size={[160, 100]}
        accessibleTable={false}
        {...props}
      />
    ),
  },
  {
    name: "physics",
    makeFrame: props => (
      <StreamPhysicsFrame
        size={[160, 100]}
        continuous
        config={{ fixedDt: 0.1 }}
        {...props}
      />
    ),
  },
]

function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  })
  document.dispatchEvent(new Event("visibilitychange"))
}

describe("FrameRuntime common lifecycle contract", () => {
  it("keeps a zero-origin clock frozen through pause and visibility gaps", () => {
    let wallTime = 0
    const runtime = new FrameRuntime({ clock: () => wallTime })
    const listener = vi.fn()
    const unsubscribe = runtime.subscribe(listener)

    expect(runtime.now()).toBe(0)
    wallTime = 16
    expect(runtime.now()).toBe(16)

    runtime.setPaused(true)
    expect(listener).toHaveBeenCalledTimes(1)
    wallTime = 10_000
    expect(runtime.now()).toBe(16)

    unsubscribe()
    runtime.setPaused(false)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(runtime.now()).toBe(16)
    wallTime = 10_016
    expect(runtime.now()).toBe(32)

    runtime.setVisible(false)
    wallTime = 20_000
    expect(runtime.now()).toBe(32)
    runtime.setVisible(true)
    expect(runtime.now()).toBe(32)
    wallTime = 20_016
    expect(runtime.now()).toBe(48)
  })

  it("replays the same seeded random sequence for every frame family host", () => {
    const replay = () => {
      const runtime = new FrameRuntime({ seed: 41 })
      return [runtime.random(), runtime.random(), runtime.random(), runtime.random()]
    }

    const first = replay()
    for (const _family of FRAME_FAMILIES) {
      expect(replay()).toEqual(first)
    }
  })
})

describe("all frame families share lifecycle scheduling", () => {
  let restoreCanvas: (() => void) | null = null
  let originalHiddenDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
    originalHiddenDescriptor = Object.getOwnPropertyDescriptor(document, "hidden")
    setDocumentHidden(false)
  })

  afterEach(() => {
    if (originalHiddenDescriptor) {
      Object.defineProperty(document, "hidden", originalHiddenDescriptor)
    } else {
      Reflect.deleteProperty(document, "hidden")
    }
    restoreCanvas?.()
    restoreCanvas = null
    vi.restoreAllMocks()
  })

  it.each(FRAME_FAMILIES)(
    "$name cancels pending work while paused or hidden, then reschedules and tears down cleanly",
    family => {
      const scheduler = createFrameScheduler(0)
      let wallTime = 0
      const baseProps: LifecycleProps = {
        clock: () => wallTime,
        frameScheduler: scheduler.scheduler,
        paused: true,
        seed: 41,
        suspendWhenHidden: true,
      }
      const view = render(family.makeFrame(baseProps))

      // A family may queue an initial effect before its paused guard runs.
      // Flush that work at timestamp zero, then assert the shared policy.
      act(() => scheduler.flush(wallTime))
      expect(scheduler.pendingCount).toBe(0)

      act(() => {
        view.rerender(family.makeFrame({ ...baseProps, paused: false }))
      })
      expect(scheduler.requestedHandles[0]).toBe(0)
      expect(scheduler.pendingCount).toBeGreaterThan(0)

      act(() => {
        view.rerender(family.makeFrame(baseProps))
      })
      expect(scheduler.pendingCount).toBe(0)
      expect(scheduler.cancelledHandles).toContain(0)

      // A long paused interval must not revive canceled work. Resume queues
      // fresh work, and visibility uses the same cancellation path.
      wallTime = 10_000
      act(() => {
        view.rerender(family.makeFrame({ ...baseProps, paused: false }))
      })
      expect(scheduler.pendingCount).toBeGreaterThan(0)

      act(() => setDocumentHidden(true))
      expect(scheduler.pendingCount).toBe(0)

      act(() => setDocumentHidden(false))
      expect(scheduler.pendingCount).toBeGreaterThan(0)

      view.unmount()
      expect(scheduler.pendingCount).toBe(0)
    },
  )
})
