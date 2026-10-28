import "../../test-utils/registerBuiltInXYPlugins"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { GeoPipelineStore } from "./GeoPipelineStore"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { NetworkPerspectiveState } from "./networkPerspectiveState"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { PipelineStore } from "./PipelineStore"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamXYFrame from "./StreamXYFrame"
import { paintNetworkFrame } from "./networkFramePaint"
import { registerNetworkPerspective } from "./networkPerspectiveRuntime"
import type { FrameScheduler } from "./useFrame"
import {
  setupCanvasMock,
  type CanvasContextMock
} from "../../test-utils/canvasMock"

type ManualScheduler = {
  scheduler: FrameScheduler
  drain: (time: number) => void
  replayLatest: (time: number) => void
}

function required<T>(value: T | null, message: string): T {
  if (!value) throw new Error(message)
  return value
}

function createManualScheduler(): ManualScheduler {
  let nextHandle = 0
  let pending: FrameRequestCallback[] = []
  let latest: FrameRequestCallback | null = null

  return {
    scheduler: {
      requestAnimationFrame(callback) {
        latest = callback
        pending.push(callback)
        return ++nextHandle
      },
      cancelAnimationFrame() {}
    },
    drain(time) {
      for (let frame = 0; frame < 20 && pending.length > 0; frame++) {
        const batch = pending
        pending = []
        act(() => {
          for (const callback of batch) callback(time)
        })
      }
      if (pending.length > 0) {
        throw new Error("frame did not settle")
      }
    },
    replayLatest(time) {
      if (!latest) throw new Error("expected a scheduled frame callback")
      act(() => latest?.(time))
    }
  }
}

describe("terminal transition paint", () => {
  let restoreCanvas: (() => void) | null = null
  let context: CanvasContextMock

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: false })
    context = HTMLCanvasElement.prototype.getContext.call(
      document.createElement("canvas"),
      "2d"
    ) as unknown as CanvasContextMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
    restoreCanvas?.()
    restoreCanvas = null
  })

  it("paints and commits XY's final snap without recomputing the scene", () => {
    let clock = 1000
    let store: PipelineStore | null = null
    const captureStore = (value: PipelineStore) => {
      store = value
    }
    let finishOnNextFrame = false
    const originalAdvance = PipelineStore.prototype.advanceTransition
    vi.spyOn(PipelineStore.prototype, "advanceTransition").mockImplementation(
      function terminalAdvance(this: PipelineStore, now: number) {
        captureStore(this)
        if (!finishOnNextFrame) return originalAdvance.call(this, now)
        this.scene = []
        this.activeTransition = null
        return false
      }
    )

    const annotationRule = vi.fn((): ReactNode => null)
    const frames = createManualScheduler()
    const result = render(
      <StreamXYFrame
        chartType="scatter"
        data={[{ x: 1, y: 2 }]}
        xAccessor="x"
        yAccessor="y"
        annotations={[{ type: "label", x: 1, y: 2, label: "point" }]}
        svgAnnotationRules={annotationRule}
        accessibleTable={false}
        animate={false}
        size={[200, 100]}
        clock={() => clock}
        frameScheduler={frames.scheduler}
      />
    )
    frames.drain(clock)

    const capturedStore = required<PipelineStore>(
      store,
      "expected XY pipeline store"
    )
    const canvas = result.container.querySelector("canvas")
    if (!canvas) throw new Error("expected XY data canvas")
    const ariaBefore = canvas.getAttribute("aria-label")
    const annotationCallsBefore = annotationRule.mock.calls.length
    ;(context.clearRect as ReturnType<typeof vi.fn>).mockClear()
    const computeScene = vi.spyOn(capturedStore, "computeScene")

    capturedStore.activeTransition = { startTime: clock, duration: 100 }
    finishOnNextFrame = true
    clock += 10
    frames.replayLatest(clock)

    expect(computeScene).not.toHaveBeenCalled()
    expect(context.clearRect as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    expect(canvas.getAttribute("aria-label")).toBe("scatter chart, empty")
    expect(canvas.getAttribute("aria-label")).not.toBe(ariaBefore)
    expect(annotationRule.mock.calls.length).toBeGreaterThan(annotationCallsBefore)
  })

  it("paints and commits Geo's final snap inside the annotation throttle window", () => {
    let clock = 1000
    let store: GeoPipelineStore | null = null
    const captureStore = (value: GeoPipelineStore) => {
      store = value
    }
    let finishOnNextFrame = false
    const originalAdvance = GeoPipelineStore.prototype.advanceTransition
    vi.spyOn(GeoPipelineStore.prototype, "advanceTransition").mockImplementation(
      function terminalAdvance(this: GeoPipelineStore, now: number) {
        captureStore(this)
        if (!finishOnNextFrame) return originalAdvance.call(this, now)
        this.scene = []
        this.activeTransition = null
        return false
      }
    )

    const annotationRule = vi.fn((): ReactNode => null)
    const frames = createManualScheduler()
    const result = render(
      <StreamGeoFrame
        projection="mercator"
        points={[{ id: "a", lon: 0, lat: 0 }]}
        xAccessor="lon"
        yAccessor="lat"
        annotations={[{ type: "label", x: 0, y: 0, label: "point" }]}
        svgAnnotationRules={annotationRule}
        accessibleTable={false}
        animate={false}
        size={[200, 100]}
        clock={() => clock}
        frameScheduler={frames.scheduler}
      />
    )
    frames.drain(clock)

    const capturedStore = required<GeoPipelineStore>(
      store,
      "expected Geo pipeline store"
    )
    const canvas = result.container.querySelector("canvas")
    if (!canvas) throw new Error("expected Geo data canvas")
    const ariaBefore = canvas.getAttribute("aria-label")
    const annotationCallsBefore = annotationRule.mock.calls.length
    ;(context.clearRect as ReturnType<typeof vi.fn>).mockClear()

    capturedStore.activeTransition = { startTime: clock, duration: 100 }
    finishOnNextFrame = true
    clock += 10
    frames.replayLatest(clock)

    expect(context.clearRect as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    expect(canvas.getAttribute("aria-label")).toBe("Geographic chart, empty")
    expect(canvas.getAttribute("aria-label")).not.toBe(ariaBefore)
    expect(annotationRule.mock.calls.length).toBeGreaterThan(annotationCallsBefore)
  })

  it("rebuilds, paints, and commits Network's final snap", () => {
    const canvas = document.createElement("canvas")
    canvas.setAttribute("aria-label", "stale")
    const setAnnotationFrame = vi.fn()
    const buildScene = vi.fn()
    let activeTransition: { startTime: number; duration: number } | null = {
      startTime: 0,
      duration: 100
    }
    const store = {
      get transition() {
        return activeTransition
      },
      advanceTransition() {
        activeTransition = null
        return false
      },
      tickAnimation: vi.fn(() => false),
      buildScene,
      sceneNodes: [],
      sceneEdges: [],
      particlePool: null,
      consumeStylePaintPending: vi.fn(() => false),
      hasActiveTopologyDiff: false,
      hasActivePulses: false,
      hasActiveThresholds: false,
      lastIngestTime: 0,
      activity: { elapsed: () => 0 },
      perspective: new NetworkPerspectiveState(),
      advancePerspectiveTransition: () => false
    } as unknown as NetworkPipelineStore

    paintNetworkFrame({
      canvas,
      store,
      size: [200, 100],
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      adjustedWidth: 200,
      adjustedHeight: 100,
      dirtyRef: { current: false },
      lastFrameTimeRef: { current: 0 },
      now: 100,
      random: () => 0.5,
      reducedMotion: false,
      showParticles: false,
      isContinuous: false,
      animate: false,
      particleStyle: {},
      getParticleColor: () => "#000",
      pendingAnnotationFrameRef: { current: false },
      // Stay inside the normal 33ms throttle: the terminal snap still needs
      // an immediate overlay commit because no animation frame follows it.
      lastAnnotationFrameTimeRef: { current: 90 },
      setAnnotationFrame,
      scheduleNextFrame: vi.fn()
    })

    expect(buildScene).toHaveBeenCalledWith([200, 100])
    expect(context.clearRect as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    expect(canvas.getAttribute("aria-label")).toBe("Network chart, empty")
    expect(setAnnotationFrame).toHaveBeenCalledOnce()
  })

  it("commits Ordinal's final exit removal inside the annotation throttle window", () => {
    let clock = 1000
    let store: OrdinalPipelineStore | null = null
    const captureStore = (value: OrdinalPipelineStore) => {
      store = value
    }
    const originalAdvance = OrdinalPipelineStore.prototype.advanceTransition
    vi.spyOn(OrdinalPipelineStore.prototype, "advanceTransition").mockImplementation(
      function captureAdvance(this: OrdinalPipelineStore, now: number) {
        captureStore(this)
        return originalAdvance.call(this, now)
      }
    )
    const annotationRule = vi.fn((): ReactNode => null)
    const frames = createManualScheduler()
    const result = render(
      <StreamOrdinalFrame
        chartType="bar"
        data={[{ category: "a", value: 2 }]}
        oAccessor="category"
        rAccessor="value"
        annotations={[{ type: "label", category: "a", value: 2, label: "bar" }]}
        svgAnnotationRules={annotationRule}
        accessibleTable={false}
        animate={false}
        size={[200, 100]}
        clock={() => clock}
        frameScheduler={frames.scheduler}
      />
    )
    frames.drain(clock)
    const capturedStore = required<OrdinalPipelineStore>(store, "expected Ordinal pipeline store")
    const canvas = required(result.container.querySelector("canvas"), "expected Ordinal data canvas")
    const annotationCallsBefore = annotationRule.mock.calls.length
    expect(capturedStore.scene.length).toBeGreaterThan(0)
    const computeScene = vi.spyOn(capturedStore, "computeScene")

    capturedStore.exitNodes = [...capturedStore.scene]
    capturedStore.activeTransition = { startTime: clock - 100, duration: 100 }
    clock += 10
    frames.replayLatest(clock)

    expect(capturedStore.scene).toEqual([])
    expect(computeScene).not.toHaveBeenCalled()
    expect(canvas.getAttribute("aria-label")).toBe("bar chart, empty")
    expect(annotationRule.mock.calls.length).toBeGreaterThan(annotationCallsBefore)
  })

  it.each(["flat", "isometric"] as const)(
    "updates Network's %s scene label and commits each rebuild in the frame that paints it",
    (perspective) => {
      registerNetworkPerspective()
      const store = new NetworkPipelineStore({
        chartType: "force",
        perspective,
        customNetworkLayout: ({ nodes, edges }) => ({
          sceneNodes: nodes.map((node, i) => ({
            type: "circle",
            cx: 50 + i * 50,
            cy: 50,
            r: 5,
            datum: node,
            style: { fill: "navy" }
          })),
          sceneEdges: edges.map((edge) => ({
            type: "line",
            x1: 50,
            y1: 50,
            x2: 100,
            y2: 50,
            datum: edge,
            style: { stroke: "navy" }
          }))
        })
      })
      const canvas = document.createElement("canvas")
      const setAnnotationFrame = vi.fn()
      const pendingAnnotationFrameRef = { current: false }
      const lastAnnotationFrameTimeRef = { current: 100 }
      const label =
        perspective === "flat"
          ? "Network chart"
          : "Network chart (isometric perspective)"
      const paint = (now: number, dirty = true) =>
        paintNetworkFrame({
          canvas,
          store,
          size: [200, 100],
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          adjustedWidth: 200,
          adjustedHeight: 100,
          dirtyRef: { current: dirty },
          lastFrameTimeRef: { current: 0 },
          now,
          random: () => 0.5,
          reducedMotion: false,
          showParticles: false,
          isContinuous: false,
          animate: false,
          particleStyle: {},
          getParticleColor: () => "navy",
          pendingAnnotationFrameRef,
          lastAnnotationFrameTimeRef,
          setAnnotationFrame,
          scheduleNextFrame: vi.fn()
        })

      store.ingestBounded(
        [{ id: "a" }, { id: "b" }],
        [{ source: "a", target: "b" }],
        [200, 100]
      )
      paint(110)
      expect(canvas.getAttribute("aria-label")).toBe(
        `${label}, 2 nodes, 1 edge`
      )

      store.ingestBounded([{ id: "a" }], [], [200, 100])
      paint(120)
      expect(canvas.getAttribute("aria-label")).toBe(`${label}, 1 node`)

      store.ingestBounded([], [], [200, 100])
      paint(130)
      expect(canvas.getAttribute("aria-label")).toBe(`${label}, empty`)
      expect(setAnnotationFrame).toHaveBeenCalledTimes(3)
      expect(pendingAnnotationFrameRef.current).toBe(false)

      // A frame that only carries a deferred overlay update keeps the throttle.
      pendingAnnotationFrameRef.current = true
      paint(140, false)
      expect(setAnnotationFrame).toHaveBeenCalledTimes(3)
      expect(pendingAnnotationFrameRef.current).toBe(true)
      paint(170, false)
      expect(setAnnotationFrame).toHaveBeenCalledTimes(4)
      expect(pendingAnnotationFrameRef.current).toBe(false)
    }
  )
})
