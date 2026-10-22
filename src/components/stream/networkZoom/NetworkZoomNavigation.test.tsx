import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { NetworkCustomLayout } from "../networkCustomLayout"
import type { NetworkViewTransform, NetworkViewportRect } from "../networkViewportTypes"
import { ZoomableNetworkCustomChart } from "./ZoomableNetworkCustomChart"
import { useNetworkZoom } from "./NetworkZoomContext"
import type { NetworkZoomOptions, ZoomableNetworkCustomChartHandle } from "./types"

type PlacedNode = { id: string; x: number; y: number }

const cardLayout: NetworkCustomLayout = (ctx) => ({
  sceneNodes: ctx.nodes.map((node) => ({
    type: "circle" as const,
    id: `dot-${node.id}`,
    cx: Number(node.data?.x) + 50,
    cy: Number(node.data?.y) + 20,
    r: 10,
    style: { fill: "#888" },
    datum: node
  })),
  sceneEdges: [],
  htmlMarks: ctx.nodes.map((node) => ({
    id: node.id,
    x: Number(node.data?.x),
    y: Number(node.data?.y),
    width: 100,
    height: 40,
    content: <span>{node.id}</span>
  }))
})

const margin = { top: 0, right: 0, bottom: 0, left: 0 }
const initial: NetworkViewTransform = { x: 0, y: 0, k: 1 }

function screenRect(rect: NetworkViewportRect, view: NetworkViewTransform) {
  return {
    x: view.x + rect.x * view.k,
    y: view.y + rect.y * view.k,
    width: rect.width * view.k,
    height: rect.height * view.k
  }
}

function renderChart(
  nodes: PlacedNode[],
  zoomOptions: NetworkZoomOptions = {},
  size: [number, number] = [1400, 600]
) {
  const ref = React.createRef<ZoomableNetworkCustomChartHandle>()
  const chart = (next: PlacedNode[], options = zoomOptions) => (
    <ZoomableNetworkCustomChart
      ref={ref}
      nodes={next}
      layout={cardLayout}
      width={size[0]}
      height={size[1]}
      margin={margin}
      animate={false}
      defaultZoom={initial}
      zoomControls={false}
      zoomOptions={{ duration: 0, ...options }}
    />
  )
  const view = render(chart(nodes))
  act(() => vi.advanceTimersByTime(32))
  return { ref, view, rerender: async (next: PlacedNode[], options?: NetworkZoomOptions) => {
    view.rerender(chart(next, options))
    await act(async () => vi.advanceTimersByTime(32))
  } }
}

let restoreCanvas: () => void
beforeEach(() => {
  vi.useFakeTimers()
  restoreCanvas = setupCanvasMock({ stubRaf: false })
})
afterEach(() => {
  cleanup()
  restoreCanvas()
  vi.useRealTimers()
})

const cards: PlacedNode[] = [
  { id: "a", x: 100, y: 100 },
  { id: "b", x: 500, y: 300 }
]

describe("zoomable network navigation", () => {
  it("applies a zero-duration zoomTo without waiting for an animation frame", async () => {
    const { ref, view } = renderChart(cards)
    const next = { x: -120, y: 40, k: 1.5 }
    await act(async () => ref.current!.zoomTo(next, 0))
    expect(ref.current!.getZoom()).toEqual(next)
    const wrapper = view.container.querySelector<HTMLElement>(
      ".semiotic-network-html-marks > div"
    )
    expect(wrapper?.style.transform).toBe("translate(-120px, 40px) scale(1.5)")
  })

  it("reads mark bounds from HTML marks before scene nodes", async () => {
    const { ref } = renderChart(cards)
    expect(ref.current!.getMarkBounds("a")).toEqual({ x: 100, y: 100, width: 100, height: 40 })
    expect(ref.current!.getMarkBounds("dot-b")).toEqual({ x: 540, y: 310, width: 20, height: 20 })
    expect(ref.current!.getMarkBounds("missing")).toBeNull()
  })

  it("fits and centers inside the usable viewport left by insets", async () => {
    const { ref } = renderChart(cards, { insets: { right: 690 }, maxZoom: 4 })
    await act(async () => ref.current!.fitToContent())
    const content = { x: 100, y: 100, width: 500, height: 240 }
    const fitted = screenRect(content, ref.current!.getZoom())
    expect(fitted.x).toBeGreaterThanOrEqual(24 - 1e-9)
    expect(fitted.x + fitted.width).toBeLessThanOrEqual(710 - 24 + 1e-9)
    expect(fitted.x + fitted.width / 2).toBeCloseTo(355, 6)

    await act(async () => ref.current!.fitToContent(undefined, { maxZoom: 1 }))
    expect(ref.current!.getZoom().k).toBe(1)

    await act(async () => ref.current!.centerOnMark("b"))
    const centered = screenRect(ref.current!.getMarkBounds("b")!, ref.current!.getZoom())
    expect(Math.abs(centered.x + centered.width / 2 - 355)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(centered.y + centered.height / 2 - 300)).toBeLessThanOrEqual(0.5)

    await act(async () => ref.current!.centerOn({ x: 0, y: 0 }, { k: 2, insets: {} }))
    expect(ref.current!.getZoom()).toEqual({ x: 700, y: 300, k: 2 })
  })

  it("centerOnMark matches centerOn of the mark bounds, and fitToMarks fits their union", async () => {
    const { ref } = renderChart(cards, { insets: { right: 690 } })
    await act(async () => ref.current!.centerOnMark("a", { k: 1.25 }))
    const viaMark = ref.current!.getZoom()
    await act(async () => ref.current!.zoomTo(initial, 0))
    await act(async () => ref.current!.centerOn(ref.current!.getMarkBounds("a")!, { k: 1.25 }))
    expect(ref.current!.getZoom()).toEqual(viaMark)

    await act(async () => ref.current!.fitToMarks(["a", "b", "missing"]))
    const fittedMarks = ref.current!.getZoom()
    await act(async () => ref.current!.fitToContent({ x: 100, y: 100, width: 500, height: 240 }))
    expect(ref.current!.getZoom()).toEqual(fittedMarks)
  })

  it("reveals a mark by the least pan inside the usable viewport", async () => {
    const { ref } = renderChart(cards, { insets: { right: 690 } })
    await act(async () => ref.current!.zoomTo({ x: 300, y: 0, k: 1 }, 0))
    await act(async () => ref.current!.revealMark("b"))
    const revealed = screenRect(ref.current!.getMarkBounds("b")!, ref.current!.getZoom())
    expect(revealed.x + revealed.width).toBe(710 - 12)
    expect(ref.current!.getZoom().y).toBe(0)
    await act(async () => ref.current!.revealMark("b"))
    expect(ref.current!.getZoom()).toEqual({ x: 98, y: 0, k: 1 })
  })

  it.each([true, false])(
    "keeps an anchored mark on screen across a layout run (anchored: %s)",
    async (anchored) => {
      const options = anchored ? { anchor: { markId: "a" } } : {}
      const { ref, rerender } = renderChart(cards, options)
      await act(async () => ref.current!.zoomTo({ x: -40, y: 25, k: 1.5 }, 0))
      const before = screenRect(ref.current!.getMarkBounds("a")!, ref.current!.getZoom())
      await rerender([{ id: "a", x: 400, y: 100 }, cards[1]], options)
      const after = screenRect(ref.current!.getMarkBounds("a")!, ref.current!.getZoom())
      if (anchored) {
        expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(0.5)
        expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(0.5)
        expect(ref.current!.getZoom().k).toBe(1.5)
      } else {
        expect(after.x - before.x).toBeCloseTo(450, 6)
      }
    }
  )

  it("reports each layout run from the commit that renders its marks", async () => {
    const ref = React.createRef<ZoomableNetworkCustomChartHandle>()
    const commits: Array<{ x: string | undefined; previous: boolean }> = []
    const moved = { x: -30, y: 10, k: 2 }
    const chart = (x: number, move: boolean) => (
      <ZoomableNetworkCustomChart
        ref={ref}
        nodes={[{ id: "a", x, y: 100 }]}
        layout={cardLayout}
        width={800}
        height={600}
        margin={margin}
        animate={false}
        zoomControls={false}
        defaultZoom={initial}
        zoomOptions={{ duration: 0 }}
        onLayoutCommit={(result, previous) => {
          const mark = document.querySelector<HTMLElement>('[data-mark-id="a"]')
          commits.push({ x: mark?.style.transform, previous: previous !== null })
          expect(result?.htmlMarks?.[0]?.x).toBe(x)
          if (move) ref.current!.zoomTo(moved, 0)
        }}
      />
    )
    const view = render(chart(100, false))
    act(() => vi.advanceTimersByTime(32))
    expect(commits).toEqual([{ x: "translate(100px, 100px)", previous: false }])
    view.rerender(chart(420, true))
    await act(async () => vi.advanceTimersByTime(32))
    // The run's own marks are in the DOM when it reports, and a zero-duration
    // move made there lands with them.
    expect(commits).toEqual([
      { x: "translate(100px, 100px)", previous: false },
      { x: "translate(420px, 100px)", previous: true }
    ])
    expect(ref.current!.getZoom()).toEqual(moved)
  })

  it("leaves a tween running across a layout run that keeps the anchored mark in place", async () => {
    const options = { anchor: { markId: "a" }, duration: 300 }
    const { ref, rerender } = renderChart(cards, options)
    const target = { x: -200, y: 0, k: 2 }
    act(() => ref.current!.zoomTo(target, 300))
    await act(async () => vi.advanceTimersByTime(64))
    // The same placements in fresh objects: a new layout run, nothing moved.
    await rerender(cards.map((card) => ({ ...card })), options)
    await act(async () => vi.advanceTimersByTime(400))
    expect(ref.current!.getZoom()).toEqual(target)
  })

  it("anchors layouts that reuse and update their mark objects", async () => {
    const reused = { id: "a", x: 100, y: 100, width: 100, height: 40, content: null }
    const reusingLayout: NetworkCustomLayout = (ctx) => {
      reused.x = Number(ctx.nodes[0]?.data?.x)
      return { sceneNodes: [], sceneEdges: [], htmlMarks: [reused] }
    }
    const ref = React.createRef<ZoomableNetworkCustomChartHandle>()
    const chart = (x: number) => (
      <ZoomableNetworkCustomChart
        ref={ref}
        nodes={[{ id: "a", x, y: 100 }]}
        layout={reusingLayout}
        width={800}
        height={600}
        margin={margin}
        animate={false}
        zoomControls={false}
        zoomOptions={{ duration: 0, anchor: { markId: "a" } }}
      />
    )
    const view = render(chart(100))
    act(() => vi.advanceTimersByTime(32))
    const before = screenRect(ref.current!.getMarkBounds("a")!, ref.current!.getZoom())
    view.rerender(chart(420))
    await act(async () => vi.advanceTimersByTime(32))
    const after = screenRect(ref.current!.getMarkBounds("a")!, ref.current!.getZoom())
    expect(ref.current!.getMarkBounds("a")!.x).toBe(420)
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(0.5)
  })

  it("re-renders selector consumers only when the selection changes", async () => {
    const ref = React.createRef<ZoomableNetworkCustomChartHandle>()
    let renders = 0
    function ScaleReadout() {
      const k = useNetworkZoom((state) => state.zoom.k)
      renders++
      return <output data-testid="scale">{k}</output>
    }
    const scaleLayout: NetworkCustomLayout = (ctx) => ({
      ...cardLayout(ctx),
      htmlMarks: [
        { id: "readout", x: 0, y: 0, width: 100, height: 40, content: <ScaleReadout /> }
      ]
    })
    const view = render(
      <ZoomableNetworkCustomChart
        ref={ref}
        nodes={cards}
        layout={scaleLayout}
        width={800}
        height={600}
        margin={margin}
        animate={false}
        zoomControls={false}
        zoomOptions={{ duration: 0 }}
      />
    )
    act(() => vi.advanceTimersByTime(32))
    const settled = renders
    await act(async () => ref.current!.panBy(30, 10))
    await act(async () => ref.current!.panBy(-5, 4))
    expect(renders).toBe(settled)
    await act(async () => ref.current!.zoomTo({ x: 0, y: 0, k: 2 }, 0))
    expect(view.getByTestId("scale").textContent).toBe("2")
    expect(renders).toBe(settled + 1)
  })
})
