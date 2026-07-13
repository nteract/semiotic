import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render } from "@testing-library/react"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import { setupCanvasMock, type CanvasContextMock } from "../../test-utils/canvasMock"

// ── Regression: a custom-layout restyle-only selection change repaints ──────
//
// The custom-layout selection path mutates scene styles in place via
// `restyleScene` and schedules a paint WITHOUT setting the dirty flag (the
// whole point of the restyle fast path is to avoid a relayout/rebuild). XY,
// Network, and Geo gate their data-canvas paint, so before the fix a
// style-only selection change scheduled a frame that painted nothing — the
// dimmed marks never appeared on screen. `restyleScene` now flags a
// style-only repaint that the three gated render loops fold into their paint
// gate (without triggering a rebuild). Ordinal repaints unconditionally, so it
// never had the dropped-paint bug, but it still needs an integration case: the
// selection bridge must reach its retained scene and that scheduled frame must
// paint the resulting style.
//
// Assertion: after flipping `layoutSelection`, the data canvas clears and
// repaints (a `clearRect` on the shared mock context). A programmatic
// selection change drives no hover, so the interaction canvas stays idle and
// the observed clear is the data canvas re-running its renderers off the
// mutated scene.

const restyle = (
  node: { datum: { id?: string } },
  sel: { isActive: boolean; predicate: (d: { id?: string }) => boolean } | null,
) => (sel?.isActive && !sel.predicate(node.datum) ? { opacity: 0.1 } : { opacity: 1 })
const selectA = { isActive: true, predicate: (d: { id?: string }) => d.id === "a" }

describe("custom-layout restyle-only selection repaints the data canvas", () => {
  let restore: (() => void) | null = null
  let ctx: CanvasContextMock
  // Manual rAF pump: capture scheduled callbacks and drain a snapshot per
  // flush. Snapshotting means a frame that reschedules itself (Network's
  // continuous loop) piles up instead of recursing to a stack overflow.
  let pending: FrameRequestCallback[] = []

  function flushFrames(max = 30): void {
    for (let i = 0; i < max && pending.length > 0; i++) {
      const batch = pending
      pending = []
      for (const cb of batch) cb(performance.now())
    }
    // Do not discard a continuation that outlives this bounded test pump.
    // The frame still holds its rAF token; dropping only our callback would
    // create an impossible browser state and hide the next scheduled paint.
  }

  beforeEach(() => {
    restore = setupCanvasMock({ stubRaf: false }) // shared mock ctx; we own rAF
    ctx = HTMLCanvasElement.prototype.getContext.call(
      document.createElement("canvas"),
      "2d",
    ) as unknown as CanvasContextMock
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      pending.push(cb)
      // `0` is a valid rAF token. The shared scheduler must retain/coalesce it
      // just like any other pending callback while this test drives frames
      // manually.
      return 0
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  })
  afterEach(() => {
    pending = []
    vi.restoreAllMocks()
    restore?.()
    restore = null
  })

  it("StreamXYFrame", () => {
    const data = [{ id: "a", x: 0, y: 0 }, { id: "b", x: 1, y: 1 }]
    const layout = (c: { data: Array<{ id: string }> }) => ({
      nodes: c.data.map((d, i) => ({
        type: "point" as const, x: i * 10, y: 0, r: 4,
        style: { fill: "#abc", opacity: 1 }, datum: d, pointId: d.id,
      })),
      restyle,
    })
    const { rerender } = render(
      <StreamXYFrame chartType="custom" customLayout={layout as never} data={data} size={[200, 100]} />,
    )
    flushFrames()
    ;(ctx.clearRect as ReturnType<typeof vi.fn>).mockClear()

    rerender(
      <StreamXYFrame chartType="custom" customLayout={layout as never} data={data} size={[200, 100]}
        layoutSelection={selectA as never} />,
    )
    flushFrames()
    expect((ctx.clearRect as ReturnType<typeof vi.fn>)).toHaveBeenCalled()
  })

  it("StreamOrdinalFrame", () => {
    const data = [
      { id: "a", category: "A", value: 1 },
      { id: "b", category: "B", value: 2 },
    ]
    const layout = (c: { data: Array<{ id: string }> }) => ({
      nodes: c.data.map((d, i) => ({
        type: "point" as const, x: i * 10, y: 0, r: 4,
        style: { fill: "#abc", opacity: 1 }, datum: d, pointId: d.id,
      })),
      restyle,
    })
    const { rerender } = render(
      <StreamOrdinalFrame chartType="bar" customLayout={layout as never} data={data} size={[200, 100]} />,
    )
    flushFrames()
    ;(ctx.clearRect as ReturnType<typeof vi.fn>).mockClear()

    rerender(
      <StreamOrdinalFrame chartType="bar" customLayout={layout as never} data={data} size={[200, 100]}
        layoutSelection={selectA as never} />,
    )
    flushFrames()
    expect((ctx.clearRect as ReturnType<typeof vi.fn>)).toHaveBeenCalled()
  })

  it("StreamGeoFrame", () => {
    const data = [{ id: "a", lon: -100, lat: 40 }, { id: "b", lon: -80, lat: 35 }]
    const layout = (c: { points: Array<{ id: string }> }) => ({
      nodes: (c.points ?? []).map((p, i) => ({
        type: "point" as const, x: i * 10 + 10, y: 10, r: 4,
        style: { fill: "#abc", opacity: 1 }, datum: p, pointId: p.id,
      })),
      restyle,
    })
    const { rerender } = render(
      <StreamGeoFrame projection="mercator" customLayout={layout as never} points={data} xAccessor="lon" yAccessor="lat" size={[200, 100]} />,
    )
    flushFrames()
    ;(ctx.clearRect as ReturnType<typeof vi.fn>).mockClear()

    rerender(
      <StreamGeoFrame projection="mercator" customLayout={layout as never} points={data} xAccessor="lon" yAccessor="lat" size={[200, 100]}
        layoutSelection={selectA as never} />,
    )
    flushFrames()
    expect((ctx.clearRect as ReturnType<typeof vi.fn>)).toHaveBeenCalled()
  })

  it("StreamNetworkFrame", () => {
    const nodes = [{ id: "a" }, { id: "b" }]
    const edges = [{ source: "a", target: "b", value: 1 }]
    const layout = (c: { nodes: Array<{ id: string }> }) => ({
      sceneNodes: c.nodes.map((n, i) => ({
        type: "circle" as const, cx: i * 20 + 10, cy: 10, r: 5,
        style: { fill: "#abc", opacity: 1 }, datum: n, id: n.id,
      })),
      restyle,
    })
    // animate={false} disables the topology-diff animation so the frame does
    // not continuously reschedule once settled.
    const { rerender } = render(
      <StreamNetworkFrame chartType="force" customNetworkLayout={layout as never} nodes={nodes} edges={edges} size={[200, 100]} animate={false} />,
    )
    flushFrames()
    ;(ctx.clearRect as ReturnType<typeof vi.fn>).mockClear()

    rerender(
      <StreamNetworkFrame chartType="force" customNetworkLayout={layout as never} nodes={nodes} edges={edges} size={[200, 100]} animate={false}
        layoutSelection={selectA as never} />,
    )
    flushFrames()
    expect((ctx.clearRect as ReturnType<typeof vi.fn>)).toHaveBeenCalled()
  })
})
