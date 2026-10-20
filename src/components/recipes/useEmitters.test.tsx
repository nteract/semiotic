import React, { createRef, StrictMode } from "react"
import { act, cleanup, render, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useEmitters, type EmittersHandle } from "./useEmitters"
import type { SyntheticArrival } from "./syntheticArrivals"
import { PhysicsPipelineStore } from "../stream/physics/PhysicsPipelineStore"
import StreamPhysicsFrame from "../stream/physics/StreamPhysicsFrame"
import type { StreamPhysicsFrameHandle } from "../stream/physics/StreamPhysicsTypes"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { createFrameScheduler } from "../stream/test-utils/frameScheduler"

const specs = [{ id: "a", interval: 1000 }]
const identity = (row: SyntheticArrival) => row

describe("useEmitters", () => {
  afterEach(cleanup)

  it("updates rate within the current interval, freezes sources, and composes callbacks", () => {
    const rows: SyntheticArrival[] = []
    const target = {
      current: { pushMany: (batch: SyntheticArrival[]) => rows.push(...batch) }
    }
    const store = new PhysicsPipelineStore({
      fixedDt: 0.1,
      maxSubsteps: 100,
      maxDeltaSeconds: 20
    })
    const observed = vi.fn()
    const { result, rerender } = renderHook(
      ({ rate, active, paused }) =>
        useEmitters(target, [{ ...specs[0] }], {
          rate,
          active: { a: active },
          paused,
          mapArrival: identity,
          onTick: observed
        }),
      {
        initialProps: { rate: 1, active: true, paused: false },
        wrapper: StrictMode
      }
    )
    const tick = (seconds: number) =>
      act(() => {
        store.tick(seconds, {
          onStep: (step) =>
            result.current.frameProps.onTick!(step, store.controls())
        })
      })
    tick(0.5)
    expect(rows).toEqual([])
    rerender({ rate: 2, active: true, paused: false })
    tick(0.3)
    expect(rows[0]).toMatchObject({ id: "a-0", arrivalTime: 750 })
    rerender({ rate: 2, active: false, paused: false })
    tick(10)
    expect(rows).toHaveLength(1)
    rerender({ rate: 2, active: true, paused: false })
    tick(0.4)
    expect(rows).toHaveLength(1)
    tick(0.1)
    expect(rows[1].id).toBe("a-1")
    rerender({ rate: 2, active: true, paused: true })
    const time = result.current.getTime()
    tick(10)
    expect(result.current.getTime()).toBe(time)
    expect(rows).toHaveLength(2)
    rerender({ rate: 2, active: true, paused: false })
    tick(0.5)
    expect(rows[2].id).toBe("a-2")
    expect(observed).toHaveBeenCalled()
  })

  it("rebases after a frame rewind and does not catch up a missing target", () => {
    const pushMany = vi.fn()
    const target: { current: { pushMany: typeof pushMany } | null } = {
      current: null
    }
    const { result } = renderHook(() =>
      useEmitters(target, specs, { mapArrival: identity })
    )
    const store = new PhysicsPipelineStore()
    const tickAt = (elapsedSeconds: number) =>
      act(() => {
        result.current.frameProps.onTick!(
          { ...store.tick(0), elapsedSeconds },
          store.controls()
        )
      })
    tickAt(50)
    tickAt(100)
    target.current = { pushMany }
    tickAt(100.5)
    expect(pushMany).not.toHaveBeenCalled()
    tickAt(0)
    tickAt(0.5)
    expect(pushMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: "a-0", arrivalTime: 1000 })
    ])
    tickAt(0.5)
    expect(pushMany).toHaveBeenCalledTimes(1)
  })

  it("supports explicit manual batches and stops keeping the frame alive at its limit", () => {
    const pushMany = vi.fn()
    const target = { current: { pushMany } }
    const { result, rerender } = renderHook(
      ({ manual }) =>
        useEmitters(target, specs, {
          manual,
          maxEvents: 2,
          mapArrival: identity
        }),
      { initialProps: { manual: true } }
    )
    expect(result.current.frameProps.continuous).toBe(false)
    const store = new PhysicsPipelineStore()
    act(() => {
      result.current.frameProps.onTick!(store.tick(0), store.controls())
      result.current.frameProps.onTick!(
        { ...store.tick(0), elapsedSeconds: 20 },
        store.controls()
      )
    })
    expect(pushMany).not.toHaveBeenCalled()
    act(() => {
      expect(result.current.advance(1000)).toBe(1)
    })
    rerender({ manual: false })
    expect(result.current.frameProps.continuous).toBe(true)
    act(() => {
      expect(result.current.advance(1000)).toBe(1)
    })
    expect(result.current.frameProps.continuous).toBe(false)
    expect(result.current.isComplete()).toBe(true)
    expect(result.current.getEmittedCount()).toBe(2)
  })
})

describe("emitter frame integration", () => {
  let restore: () => void
  beforeEach(() => {
    restore = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    cleanup()
    restore()
    vi.unstubAllGlobals()
  })

  it("observes synchronous reduced-motion settlement inside a manual push", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((media: string) => ({
        media,
        matches: media === "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {}
      }))
    )
    const frame = createRef<StreamPhysicsFrameHandle>()
    let emitters: EmittersHandle
    const arrivals: string[] = []
    function Example() {
      emitters = useEmitters(frame, specs, {
        manual: true,
        maxEvents: 2,
        mapArrival: (row) => ({
          id: row.id,
          x: 20,
          y: 20,
          shape: { type: "circle" as const, radius: 4 }
        }),
        onTick: (_result, controls) => {
          for (const body of controls.readBodies())
            if (!arrivals.includes(body.id)) arrivals.push(body.id)
        }
      })
      return <StreamPhysicsFrame ref={frame} {...emitters.frameProps} />
    }
    render(<Example />)
    act(() => {
      emitters!.advance(1000)
    })
    expect(arrivals).toEqual(["a-0"])
    act(() => {
      emitters!.advance(1000)
    })
    expect(arrivals).toEqual(["a-0", "a-1"])
  })

  it("drives an empty frame on RAF, applies timeScale, pauses, and cancels on unmount", () => {
    const frame = createRef<StreamPhysicsFrameHandle>()
    const scheduler = createFrameScheduler()
    let now = 0
    const clock = () => now
    const flush = (timestamp: number) =>
      act(() => {
        now = timestamp
        scheduler.flush(timestamp)
      })
    const config = {
      fixedDt: 0.01,
      maxSubsteps: 100,
      maxDeltaSeconds: 1,
      timeScale: 2
    }
    function Example({ paused = false }: { paused?: boolean }) {
      const emitter = useEmitters(frame, [{ id: "a", interval: 500 }], {
        maxEvents: 4,
        mapArrival: (row) => ({
          id: row.id,
          x: 20,
          y: 20,
          datum: row,
          shape: { type: "circle" as const, radius: 4 }
        })
      })
      return (
        <StreamPhysicsFrame
          ref={frame}
          size={[200, 100]}
          config={config}
          frameScheduler={scheduler.scheduler}
          clock={clock}
          paused={paused}
          {...emitter.frameProps}
        />
      )
    }
    const view = render(<Example />)
    flush(0)
    flush(250)
    expect(frame.current!.snapshot().elapsedSeconds).toBeCloseTo(0.5)
    // Raw frames enqueue at the boundary; the next refresh materializes it.
    flush(250)
    expect(frame.current!.getData().map((body) => body.id)).toEqual(["a-0"])
    view.rerender(<Example paused />)
    flush(5000)
    expect(frame.current!.getData()).toHaveLength(1)
    view.rerender(<Example />)
    flush(5000)
    flush(5250)
    flush(5250)
    expect(frame.current!.getData().map((body) => body.id)).toEqual([
      "a-0",
      "a-1"
    ])
    expect(
      (frame.current!.getData()[1].datum as SyntheticArrival).arrivalTime
    ).toBeCloseTo(1000)
    view.unmount()
    expect(scheduler.pendingCount).toBe(0)
  })
})
