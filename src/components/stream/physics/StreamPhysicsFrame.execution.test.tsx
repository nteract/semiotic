import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../test-utils/frameScheduler"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "./StreamPhysicsFrame"

const config = {
  fixedDt: 0.1,
  maxSubsteps: 10,
  maxDeltaSeconds: 1,
  settleStepLimit: 10,
  kernel: {
    gravity: { x: 0, y: 0 },
    velocityDamping: 1,
    sleepAfter: 10,
    sleepSpeed: 0
  }
}
const initialSpawns = [
  {
    id: "body",
    x: 40,
    y: 40,
    mass: 1,
    shape: { type: "circle" as const, radius: 5 }
  }
]
const bodyForces = { x: 10, y: 0 }

describe("frame fixed-step execution", () => {
  let restoreCanvas: () => void
  let reduced = false
  beforeEach(() => {
    reduced = false
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
    vi.stubGlobal(
      "matchMedia",
      vi.fn((media: string) => ({
        media,
        get matches() {
          return reduced
        },
        addEventListener() {},
        removeEventListener() {}
      }))
    )
  })
  afterEach(() => {
    cleanup()
    restoreCanvas()
    vi.unstubAllGlobals()
  })

  it("matches bounded reduced motion with imperative batches and ignores decorative rerenders", () => {
    function mount() {
      const ref = React.createRef<StreamPhysicsFrameHandle>()
      const scheduler = createFrameScheduler()
      const props = {
        config,
        initialSpawns,
        bodyForces,
        frameScheduler: scheduler.scheduler,
        size: [200, 120] as [number, number]
      }
      const view = render(<StreamPhysicsFrame {...props} ref={ref} />)
      return { ref, scheduler, props, ...view }
    }
    const animated = mount()
    act(() => {
      animated.ref.current!.step(1)
    })
    const expected = animated.ref.current!.readBodies()
    expect(expected[0].x).toBeCloseTo(44.5, 8)
    expect(expected[0].vx).toBeCloseTo(10, 8)
    animated.unmount()

    reduced = true
    const snapshot = mount()
    expect(snapshot.ref.current!.readBodies()).toEqual(expected)
    expect(snapshot.ref.current!.snapshot().elapsedSeconds).toBeCloseTo(1, 8)
    snapshot.rerender(
      <StreamPhysicsFrame
        {...snapshot.props}
        ref={snapshot.ref}
        bodyStyle={{ fill: "red" }}
        title="Updated title"
      />
    )
    expect(snapshot.ref.current!.readBodies()).toEqual(expected)
    expect(snapshot.ref.current!.snapshot().elapsedSeconds).toBeCloseTo(1, 8)
    expect(snapshot.scheduler.pendingCount).toBe(0)
    snapshot.rerender(
      <StreamPhysicsFrame
        {...snapshot.props}
        ref={snapshot.ref}
        bodyForces={{ x: 20, y: 0 }}
      />
    )
    expect(snapshot.ref.current!.readBodies()[0].vx).toBeCloseTo(30, 8)
    expect(snapshot.ref.current!.readBodies()[0].x).toBeCloseTo(63.5, 8)
  })

  it("observes and removes a body mid-settle without recursively rendering", () => {
    reduced = true
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const times: number[] = []
    const removed: string[] = []
    function Example() {
      const [count, setCount] = React.useState(0)
      return (
        <StreamPhysicsFrame
          ref={ref}
          size={[200, 120]}
          config={config}
          initialSpawns={initialSpawns}
          continuous
          summary={`Removed ${count}`}
          onTick={(result) => {
            if (!result.steps) return
            times.push(result.elapsedSeconds)
            if (!removed.length && result.elapsedSeconds >= 0.3) {
              removed.push(...ref.current!.popBodies(["body"]))
              setCount(removed.length)
            }
          }}
        />
      )
    }
    const view = render(<Example />)
    expect(removed).toEqual(["body"])
    expect(times).toHaveLength(10)
    expect(times[2]).toBeCloseTo(0.3, 8)
    expect(ref.current!.readBodies()).toEqual([])
    expect(view.getByText("Removed 1").textContent).toBe("Removed 1")
  })
})
