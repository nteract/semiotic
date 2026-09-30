import * as React from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render } from "@testing-library/react"
import StreamNetworkFrame from "./StreamNetworkFrame"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import type { NetworkCircleNode, StreamNetworkFrameHandle } from "./networkTypes"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import type { NetworkPerspective } from "./networkPerspective"
import { registerNetworkPerspective } from "./networkPerspectiveRuntime"
import { NetworkPerspectiveState } from "./networkPerspectiveState"

const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }
const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }]
const noEdges: never[] = []
const layoutCalls = vi.fn()
const layout: NetworkCustomLayout = (ctx) => {
  layoutCalls(ctx.perspective)
  return {
    sceneNodes: ctx.nodes.map((node, i) => ({
      type: "circle" as const,
      cx: 60 + i * 120,
      cy: 60 + i * 60,
      r: 10,
      style: { fill: "#4e79a7" },
      datum: node,
      id: String(node.id)
    })),
    sceneEdges: []
  }
}

function frame(perspective: NetworkPerspective | undefined, extra: Record<string, unknown> = {}) {
  return (
    <StreamNetworkFrame
      chartType="force"
      customNetworkLayout={layout}
      nodes={nodes}
      edges={noEdges}
      size={[400, 300]}
      margin={NO_MARGIN}
      animate={false}
      perspective={perspective}
      {...extra}
    />
  )
}

describe("StreamNetworkFrame perspective", () => {
  let restoreCanvas: (() => void) | null = null
  beforeAll(() => registerNetworkPerspective())
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
    layoutCalls.mockClear()
  })
  afterEach(() => {
    restoreCanvas?.()
    restoreCanvas = null
  })

  it("hit-tests the projected marks, not their layout positions", async () => {
    const scheduler = createFrameScheduler(0)
    const ref = React.createRef<StreamNetworkFrameHandle>()
    const customHoverBehavior = vi.fn()
    const { container } = render(
      React.cloneElement(frame("isometric", { customHoverBehavior, frameScheduler: scheduler.scheduler }), { ref })
    )
    await act(async () => scheduler.flush())
    const projected = ref.current!.getCustomLayout()!.sceneNodes as NetworkCircleNode[]
    const b = projected.find((n) => n.id === "b")!
    // Layout placed b at (180, 120); the projection moved it.
    expect(Math.hypot(b.cx - 180, b.cy - 120)).toBeGreaterThan(20)
    const image = container.querySelector<HTMLElement>('[role="img"]')!

    // Assistive technology hears that the chart is projected.
    expect(container.querySelector("canvas")!.getAttribute("aria-label")).toContain("(isometric perspective)")

    fireEvent.mouseMove(image, { clientX: b.cx, clientY: b.cy })
    await act(async () => scheduler.flush())
    expect(customHoverBehavior.mock.lastCall?.[0]?.data).toMatchObject({ id: "b" })
    expect(customHoverBehavior.mock.lastCall?.[0]?.x).toBeCloseTo(b.cx, 6)
  })

  it("keeps an inline config stable across parent renders", async () => {
    const scheduler = createFrameScheduler(0)
    const { rerender } = render(frame({ type: "isometric", fit: "contain" }, { frameScheduler: scheduler.scheduler }))
    await act(async () => scheduler.flush())
    const calls = layoutCalls.mock.calls.length
    rerender(frame({ type: "isometric", fit: "contain" }, { frameScheduler: scheduler.scheduler }))
    await act(async () => scheduler.flush())
    expect(layoutCalls.mock.calls.length).toBe(calls)
    // The layout sees the active perspective settings.
    expect(layoutCalls.mock.lastCall?.[0]).toMatchObject({ type: "isometric" })
  })

  it("reprojects when the perspective changes and returns to flat exactly", async () => {
    const scheduler = createFrameScheduler(0)
    const ref = React.createRef<StreamNetworkFrameHandle>()
    const { rerender } = render(React.cloneElement(frame("isometric", { frameScheduler: scheduler.scheduler }), { ref }))
    await act(async () => scheduler.flush())
    const iso = (ref.current!.getCustomLayout()!.sceneNodes as NetworkCircleNode[]).map((n) => [n.cx, n.cy])
    rerender(React.cloneElement(frame("military", { frameScheduler: scheduler.scheduler }), { ref }))
    await act(async () => scheduler.flush())
    const military = (ref.current!.getCustomLayout()!.sceneNodes as NetworkCircleNode[]).map((n) => [n.cx, n.cy])
    expect(military).not.toEqual(iso)
    rerender(React.cloneElement(frame(undefined, { frameScheduler: scheduler.scheduler }), { ref }))
    await act(async () => scheduler.flush())
    const flat = (ref.current!.getCustomLayout()!.sceneNodes as NetworkCircleNode[]).map((n) => [n.cx, n.cy])
    expect(flat).toEqual([[60, 60], [180, 120], [300, 180]])
  })
})

describe("NetworkPerspectiveState", () => {
  beforeAll(() => registerNetworkPerspective())
  const config = (perspective?: NetworkPerspective) => ({ chartType: "force" as const, perspective })
  const parts = () => ({
    sceneNodes: [{ type: "circle" as const, cx: 50, cy: 50, r: 5, style: {}, datum: { id: "a" }, id: "a" }],
    sceneEdges: [],
    labels: []
  })

  it("skips all projection work for flat charts", () => {
    const state = new NetworkPerspectiveState()
    expect(state.project(config(), [200, 200], parts())).toBeNull()
    expect(state.project(config("flat"), [200, 200], parts())).toBeNull()
    expect(state.frame).toBeNull()
  })

  it("tweens between perspectives when transition is set", () => {
    const state = new NetworkPerspectiveState()
    state.project(config(), [200, 200], parts())
    const scene = state.project(config({ type: "isometric", transition: { duration: 100 } }), [200, 200], parts())!
    expect(state.transitioning).toBe(true)
    // Progress 0: the scene still sits where the flat chart drew it.
    expect((scene.sceneNodes[0] as NetworkCircleNode).cx).toBeCloseTo(50, 6)
    expect(state.advance(0)).toBe(true)
    state.advance(50)
    const mid = state.project(config({ type: "isometric", transition: { duration: 100 } }), [200, 200], parts())!
    expect(state.advance(100)).toBe(true)
    expect(state.transitioning).toBe(false)
    const done = state.project(config({ type: "isometric", transition: { duration: 100 } }), [200, 200], parts())!
    const midX = (mid.sceneNodes[0] as NetworkCircleNode).cx
    const endX = (done.sceneNodes[0] as NetworkCircleNode).cx
    expect(midX).not.toBeCloseTo(50, 3)
    expect(Math.abs(midX - 50)).toBeLessThan(Math.abs(endX - 50) + 1e-6)
  })

  it("lands reduced-motion tweens immediately", () => {
    const state = new NetworkPerspectiveState()
    state.project(config(), [200, 200], parts())
    state.project(config({ type: "pixel", transition: true }), [200, 200], parts())
    expect(state.advance(0, true)).toBe(true)
    expect(state.transitioning).toBe(false)
  })
})
