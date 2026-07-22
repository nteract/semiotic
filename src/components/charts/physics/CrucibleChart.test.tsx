import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type {
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import {
  CrucibleChart,
  type CrucibleChartHandle,
  type CrucibleChartProps,
  type CrucibleEvent,
  type CruciblePhase,
  type CrucibleProductDefinition
} from "./CrucibleChart"

let lastFrameProps = {} as StreamPhysicsFrameProps
let frameInstances = 0

function mockControls(): StreamPhysicsFrameHandle {
  let bodies: ReturnType<StreamPhysicsFrameHandle["readBodies"]> = []
  return {
    applyImpulse: vi.fn(),
    bodyBudgetStatus: vi.fn(() => ({
      action: "allow",
      allowed: 100,
      limit: 100,
      overflow: 0,
      projected: 0,
      requested: 0,
      warning: false
    })),
    clear: vi.fn(() => {
      bodies = []
    }),
    clearRegionState: vi.fn(),
    getData: vi.fn(() => bodies),
    getRegionState: vi.fn(),
    getStore: vi.fn(),
    hitTest: vi.fn(() => null),
    pause: vi.fn(),
    popBodies: vi.fn(() => []),
    push: vi.fn(),
    pushMany: vi.fn(),
    readBodies: vi.fn(() => bodies),
    readSediment: vi.fn(() => []),
    recordObservation: vi.fn((event) => ({
      ...event,
      timestamp: 0,
      chartType: "CrucibleChart",
      chartId: "test"
    })),
    remove: vi.fn(() => []),
    restore: vi.fn(),
    resume: vi.fn(),
    sedimentHeightfield: vi.fn(() => []),
    sedimentTotals: vi.fn(() => ({ total: 0, byBin: {} })),
    settle: vi.fn(() => 0),
    settleWithObservations: vi.fn(),
    snapshot: vi.fn(),
    step: vi.fn()
  } as unknown as StreamPhysicsFrameHandle
}

vi.mock("../../stream/physics/StreamPhysicsFrame", () => ({
  __esModule: true,
  default: React.forwardRef<StreamPhysicsFrameHandle, StreamPhysicsFrameProps>(
    (props, ref) => {
      lastFrameProps = props
      const instanceRef = React.useRef(0)
      if (instanceRef.current === 0) instanceRef.current = ++frameInstances
      const controls = React.useMemo(() => mockControls(), [])
      React.useImperativeHandle(ref, () => controls, [controls])
      return <div data-testid="mock-stream-physics-frame" />
    }
  )
}))

type Word = { id: string; label: string; category: string; count: number }

const words: Word[] = [
  { id: "tax", label: "tax", category: "economy", count: 12 },
  { id: "jobs", label: "jobs", category: "economy", count: 9 }
]

const phases: CruciblePhase[] = [
  { id: "test", label: "Test", duration: 1, motion: "mix" },
  { id: "pour", label: "Pour", duration: 1, motion: "pour" }
]

const products: CrucibleProductDefinition[] = [
  {
    id: "tax-jobs",
    label: "tax + jobs",
    category: "alloy",
    outletId: "product"
  }
]

const events: CrucibleEvent[] = [
  {
    id: "form",
    at: { phaseId: "test", progress: 0.5 },
    effects: [
      {
        type: "combine",
        sourceIds: ["tax", "jobs"],
        productId: "tax-jobs"
      }
    ]
  }
]

function chart(
  ref: React.Ref<CrucibleChartHandle<Word>>,
  extra: Partial<CrucibleChartProps<Word>> = {}
) {
  return (
    <CrucibleChart
      ref={ref}
      data={words}
      phases={phases}
      products={products}
      events={events}
      idAccessor="id"
      labelAccessor="label"
      categoryAccessor="category"
      amountAccessor="count"
      controls={false}
      size={[490, 410]}
      {...extra}
    />
  )
}

describe("CrucibleChart replay HOC", () => {
  beforeEach(() => {
    lastFrameProps = {} as StreamPhysicsFrameProps
    frameInstances = 0
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("does not reset phase progress for inline-fresh but semantically equal programs", () => {
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    const { rerender } = render(chart(ref))

    act(() => ref.current?.stepPhase())
    expect(ref.current?.getCrucibleState().elapsed).toBe(1)
    const instanceCount = frameInstances

    rerender(
      <CrucibleChart
        ref={ref}
        data={words.map((word) => ({ ...word }))}
        phases={phases.map((phase) => ({ ...phase }))}
        products={products.map((product) => ({ ...product }))}
        events={events.map((event) => ({
          ...event,
          effects: event.effects.map((effect) => ({ ...effect }))
        }))}
        idAccessor="id"
        labelAccessor="label"
        categoryAccessor="category"
        amountAccessor="count"
        controls={false}
        size={[490, 410]}
      />
    )

    expect(ref.current?.getCrucibleState().elapsed).toBe(1)
    expect(frameInstances).toBe(instanceCount)
  })

  it("canonicalizes object snapshotAt values and defaults snapshots to terminal", () => {
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    const onStateChange = vi.fn()
    const { rerender } = render(
      chart(ref, {
        playback: "snapshot",
        snapshotAt: { phaseId: "test", progress: 0.5 },
        onStateChange
      })
    )
    expect(ref.current?.getCrucibleState().elapsed).toBe(0.5)
    const calls = onStateChange.mock.calls.length

    rerender(
      chart(ref, {
        playback: "snapshot",
        snapshotAt: { phaseId: "test", progress: 0.5 },
        onStateChange
      })
    )
    expect(ref.current?.getCrucibleState().elapsed).toBe(0.5)
    expect(onStateChange).toHaveBeenCalledTimes(calls)

    rerender(chart(ref, { playback: "snapshot", onStateChange }))
    expect(ref.current?.getCrucibleState().complete).toBe(true)
    expect(Object.keys(ref.current?.getCrucibleState().products ?? {})).toEqual(
      ["tax-jobs"]
    )
  })

  it("gates local play intent with controlled paused without rewinding", () => {
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    const controlsSurface = mockControls()
    const { rerender } = render(chart(ref))

    act(() => {
      lastFrameProps.onTick?.({ elapsedSeconds: 0.4 } as never, controlsSurface)
    })
    expect(ref.current?.getCrucibleState()).toMatchObject({
      elapsed: 0.4,
      playing: true
    })

    rerender(chart(ref, { paused: true }))
    expect(ref.current?.getCrucibleState()).toMatchObject({
      elapsed: 0.4,
      playing: false
    })

    rerender(chart(ref, { paused: false }))
    expect(ref.current?.getCrucibleState()).toMatchObject({
      elapsed: 0.4,
      playing: true
    })
  })

  it("supports settle, phase stepping, and deterministic reset through the bounded handle", () => {
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    render(chart(ref))

    act(() => ref.current?.stepPhase())
    expect(ref.current?.getCrucibleState().elapsed).toBe(1)
    expect(ref.current?.getCrucibleState().eventsApplied).toEqual(["form"])

    act(() => ref.current?.settle())
    expect(ref.current?.getCrucibleState()).toMatchObject({
      complete: true,
      elapsed: 2,
      playing: false
    })

    act(() => ref.current?.reset())
    expect(ref.current?.getCrucibleState()).toMatchObject({
      complete: false,
      elapsed: 0,
      playing: false
    })
  })

  it("atomically replays from the origin without a caller-owned remount key", () => {
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    const controlsSurface = mockControls()
    render(chart(ref))

    act(() => {
      lastFrameProps.onTick?.({ elapsedSeconds: 0.8 } as never, controlsSurface)
    })
    expect(ref.current?.getCrucibleState()).toMatchObject({
      elapsed: 0.8,
      playing: true
    })
    const instanceCount = frameInstances

    act(() => ref.current?.replay())

    expect(frameInstances).toBeGreaterThan(instanceCount)
    expect(ref.current?.getCrucibleState()).toMatchObject({
      complete: false,
      elapsed: 0,
      playing: true
    })
  })

  it("keeps replay static at the configured snapshot", () => {
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    render(
      chart(ref, {
        playback: "snapshot",
        snapshotAt: { phaseId: "test", progress: 0.5 }
      })
    )
    const instanceCount = frameInstances

    act(() => ref.current?.replay())

    expect(frameInstances).toBeGreaterThan(instanceCount)
    expect(ref.current?.getCrucibleState()).toMatchObject({
      complete: false,
      elapsed: 0.5,
      playing: false
    })
  })

  it("labels the built-in play control Replay after completion", () => {
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    const { getByRole } = render(
      chart(ref, {
        controls: {
          playPause: true,
          reset: false,
          stepPhase: false,
          timeline: false,
          speed: false
        }
      })
    )
    expect(getByRole("button", { name: "Pause" })).toBeDefined()

    act(() => ref.current?.settle())
    const replayButton = getByRole("button", { name: "Replay" })
    expect(replayButton).toBeDefined()

    act(() => replayButton.click())
    expect(ref.current?.getCrucibleState()).toMatchObject({
      complete: false,
      elapsed: 0,
      playing: true
    })
  })

  it("uses the real settled-state signal before rerunning after rerunMS", () => {
    vi.useFakeTimers()
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    render(chart(ref, { rerunMS: 120 }))
    const initialInstances = frameInstances

    act(() => ref.current?.settle())
    expect(frameInstances).toBe(initialInstances)

    act(() => vi.advanceTimersByTime(119))
    expect(frameInstances).toBe(initialInstances)
    act(() => vi.advanceTimersByTime(1))

    expect(frameInstances).toBeGreaterThan(initialInstances)
    expect(ref.current?.getCrucibleState()).toMatchObject({
      complete: false,
      elapsed: 0,
      playing: true
    })
  })

  it("starts rerunMS from natural semantic completion", () => {
    vi.useFakeTimers()
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    const controlsSurface = mockControls()
    render(chart(ref, { rerunMS: 80 }))
    const initialInstances = frameInstances

    act(() => {
      lastFrameProps.onTick?.({ elapsedSeconds: 2 } as never, controlsSurface)
    })
    expect(ref.current?.getCrucibleState().complete).toBe(true)

    act(() => vi.advanceTimersByTime(80))
    expect(frameInstances).toBeGreaterThan(initialInstances)
    expect(ref.current?.getCrucibleState()).toMatchObject({
      complete: false,
      elapsed: 0,
      playing: true
    })
  })

  it("passes playbackRate only as physics timeScale", () => {
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    render(chart(ref, { playbackRate: 0.25 }))
    expect(lastFrameProps.config?.timeScale).toBe(0.25)
    expect(ref.current?.getCrucibleState().elapsed).toBe(0)
  })

  it("compiles the vessel to the controls wrapper's measured responsive width", () => {
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
    const ref = React.createRef<CrucibleChartHandle<Word>>()
    const { container } = render(
      <div style={{ width: 330 }}>{chart(ref, { responsiveWidth: true })}</div>
    )

    expect(observed).toBe(container.querySelector(".semiotic-crucible-chart"))
    act(() => {
      resizeCallback?.(
        [
          {
            target: observed,
            contentRect: { width: 330, height: 410 }
          } as unknown as ResizeObserverEntry
        ],
        {} as ResizeObserver
      )
    })

    expect(lastFrameProps.size).toEqual([330, 410])
    expect(lastFrameProps.responsiveWidth).toBe(false)
  })
})
