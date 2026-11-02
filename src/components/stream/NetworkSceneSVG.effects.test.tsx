import * as React from "react"
import { afterEach, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { ParticlePool } from "./ParticlePool"
import { paintNetworkFrame } from "./networkFramePaint"
import { NetworkSceneSVG } from "./NetworkSceneSVG"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { renderToStaticSVG } from "../server/renderToStaticSVG"

let restore: (() => void) | undefined
afterEach(() => {
  restore?.()
  vi.restoreAllMocks()
})

it("keeps particles on a transparent canvas above the SVG scene and suppresses them when stale or motion is reduced", () => {
  restore = setupCanvasMock({ stubRaf: false })
  const store = new NetworkPipelineStore({ chartType: "force", iterations: 0 })
  store.ingestBounded(
    [{ id: "a" }, { id: "b" }],
    [{ source: "a", target: "b", value: 1 }],
    [300, 200]
  )
  store.buildScene([300, 200])
  store.particlePool = new ParticlePool(1)
  Object.assign(store.particlePool.spawn(0)!, { x: 80, y: 90, t: 0.5 })
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")!
  const drawCanvas = vi.fn(() => true)
  const paint = (stale = false, reducedMotion = false) => {
    vi.mocked(context.arc).mockClear()
    paintNetworkFrame({
      canvas,
      store,
      size: [300, 200],
      adjustedWidth: 300,
      adjustedHeight: 200,
      margin: { left: 0, right: 0, top: 0, bottom: 0 },
      cameraOnly: true,
      svgScene: true,
      renderMode: { id: "test", drawCanvas, cacheKey: () => "test", renderStaticSVG: () => null },
      dirtyRef: { current: false },
      lastFrameTimeRef: { current: 0 },
      now: 0,
      random: () => 0.5,
      reducedMotion,
      showParticles: true,
      isContinuous: true,
      animate: false,
      particleStyle: { radius: 3 },
      getParticleColor: () => "#369",
      staleness: stale ? { state: "stopped", dimOpacity: 0.3 } : undefined,
      pendingAnnotationFrameRef: { current: false },
      lastAnnotationFrameTimeRef: { current: 0 },
      setAnnotationFrame: vi.fn(),
      scheduleNextFrame: vi.fn()
    })
  }
  paint()
  expect(drawCanvas).not.toHaveBeenCalled()
  expect(context.fillRect).not.toHaveBeenCalled()
  expect(context.arc).toHaveBeenCalledExactlyOnceWith(80, 90, 3, 0, Math.PI * 2)
  paint(true)
  expect(context.arc).not.toHaveBeenCalled()
  paint(false, true)
  expect(context.arc).not.toHaveBeenCalled()
})

it("uses the same graded and explicit staleness opacity in live SVG and static rendering", () => {
  const store = new NetworkPipelineStore({ chartType: "force", iterations: 0 })
  store.ingestBounded([{ id: "a" }], [], [300, 200])
  store.buildScene([300, 200])
  vi.spyOn(store.activity, "elapsed").mockReturnValue(1200)
  const html = renderToStaticMarkup(
    <NetworkSceneSVG
      store={store}
      size={[300, 200]}
      margin={{ left: 12, top: 8 }}
      width={288}
      height={192}
      props={{
        chartType: "force",
        staleness: { threshold: 1000, graded: true }
      }}
    />
  )
  expect(html).toContain('transform="translate(12,8)" opacity="0.7"')
  const svg = renderToStaticSVG("network", {
    chartType: "force",
    nodes: [{ id: "a" }],
    size: [300, 200],
    staleness: { state: "stopped", dimOpacity: 0.3 }
  })
  expect(svg).toContain('<g opacity="0.3">')
})
