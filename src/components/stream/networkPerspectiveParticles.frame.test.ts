import { afterEach, expect, it, vi } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { ParticlePool } from "./ParticlePool"
import { paintNetworkFrame } from "./networkFramePaint"
import { registerNetworkPerspective } from "./networkPerspectiveRuntime"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import type { NetworkLineEdge } from "./networkTypes"

let restore: (() => void) | undefined
afterEach(() => restore?.())

it("paints particles on elevated edges through a perspective tween and back to flat", () => {
  restore = setupCanvasMock({ stubRaf: false })
  registerNetworkPerspective()
  const store = new NetworkPipelineStore({
    chartType: "force",
    perspective: { type: "isometric", elevation: "tier", elevationScale: 1, edges: { elevation: "nodes" }, transition: { duration: 100 } },
    customNetworkLayout: (ctx) => ({
      sceneNodes: ctx.nodes.map((node, i) => ({
        type: "circle", cx: 50 + i * 200, cy: 50 + i * 100, r: 5, id: node.id, datum: node, style: { fill: "#369" }
      })),
      sceneEdges: [{ type: "line", x1: 50, y1: 50, x2: 250, y2: 150, datum: ctx.edges[0], style: { stroke: "#369" } }]
    })
  })
  store.ingestBounded([{ id: "a", tier: 0 }, { id: "b", tier: 60 }], [{ source: "a", target: "b" }], [400, 300])
  store.buildScene([400, 300])
  store.particlePool = new ParticlePool(1)
  Object.assign(store.particlePool.spawn(0)!, { t: 0.25, x: 100, y: 75 })
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")!
  const paint = () => {
    vi.mocked(context.arc).mockClear()
    paintNetworkFrame({
      canvas, store, size: [400, 300], adjustedWidth: 400, adjustedHeight: 300,
      margin: { left: 0, top: 0, right: 0, bottom: 0 }, cameraOnly: true,
      dirtyRef: { current: false }, lastFrameTimeRef: { current: 0 }, now: 0,
      random: () => 0.5, reducedMotion: false, showParticles: true, isContinuous: true,
      animate: false, particleStyle: {}, getParticleColor: () => "#369",
      pendingAnnotationFrameRef: { current: false }, lastAnnotationFrameTimeRef: { current: 0 },
      setAnnotationFrame: vi.fn(), scheduleNextFrame: vi.fn()
    })
    const edge = store.sceneEdges[0] as NetworkLineEdge
    const call = vi.mocked(context.arc).mock.lastCall!
    expect(call[0]).toBeCloseTo(edge.x1 + (edge.x2 - edge.x1) * 0.25, 6)
    expect(call[1]).toBeCloseTo(edge.y1 + (edge.y2 - edge.y1) * 0.25, 6)
  }
  paint()
  store.updateConfig({ perspective: "flat" })
  store.buildScene([400, 300])
  store.advancePerspectiveTransition(0)
  store.advancePerspectiveTransition(50)
  store.buildScene([400, 300])
  paint()
  store.advancePerspectiveTransition(100)
  store.buildScene([400, 300])
  paint()
  expect(store.perspective.projectParticle).toBeUndefined()
})
