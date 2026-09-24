import { afterEach, expect, it, vi } from "vitest"
import { paintNetworkFrame } from "../networkFramePaint"
import { NetworkPipelineStore } from "../NetworkPipelineStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

let restore: (() => void) | undefined
afterEach(() => {
  vi.restoreAllMocks()
  restore?.()
})
it("reprojects retained pixels without consuming pending layout, advancing time, or scheduling animation", () => {
  restore = setupCanvasMock({ stubRaf: false })
  const store = new NetworkPipelineStore({ chartType: "force" })
  store.sceneNodes = [
    {
      type: "rect",
      x: 10,
      y: 20,
      w: 40,
      h: 30,
      datum: {},
      style: { fill: "navy" }
    }
  ]
  const build = vi.spyOn(store, "buildScene")
  const transition = vi.spyOn(store, "advanceTransition")
  const tick = vi.spyOn(store, "tickAnimation")
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")!
  const dirtyRef = { current: true },
    lastFrameTimeRef = { current: 50 }
  const schedule = vi.fn(),
    annotation = vi.fn()
  paintNetworkFrame({
    canvas,
    store,
    size: [200, 100],
    margin: { left: 0, top: 0, right: 0, bottom: 0 },
    adjustedWidth: 200,
    adjustedHeight: 100,
    cameraOnly: true,
    viewTransform: { x: 25, y: 15, k: 2 },
    dirtyRef,
    lastFrameTimeRef,
    now: 70,
    random: () => 0.5,
    reducedMotion: false,
    showParticles: false,
    isContinuous: true,
    animate: true,
    particleStyle: {},
    getParticleColor: () => "navy",
    pendingAnnotationFrameRef: { current: false },
    lastAnnotationFrameTimeRef: { current: 0 },
    setAnnotationFrame: annotation,
    scheduleNextFrame: schedule
  })
  expect(context.translate).toHaveBeenCalledWith(25, 15)
  expect(context.scale).toHaveBeenCalledWith(2, 2)
  expect(context.fillStyle).toBe("navy")
  expect(build).not.toHaveBeenCalled()
  expect(transition).not.toHaveBeenCalled()
  expect(tick).not.toHaveBeenCalled()
  expect(dirtyRef.current).toBe(true)
  expect(lastFrameTimeRef.current).toBe(50)
  expect(schedule).not.toHaveBeenCalled()
  expect(annotation).not.toHaveBeenCalled()
})
