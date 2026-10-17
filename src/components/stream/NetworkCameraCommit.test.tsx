import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, expect, it, vi } from "vitest"
import { NetworkHtmlMarksLayer } from "./NetworkHtmlMarksLayer"
import { NetworkViewGroup } from "./networkViewTransform"
import { createNetworkZoomStore } from "./networkZoom/NetworkZoomStore"
import type {
  NetworkViewTransform,
  NetworkViewportSnapshot
} from "./networkViewportTypes"

afterEach(cleanup)

const marks = [0, 1, 2].map((i) => ({
  id: String(i),
  x: i * 200,
  y: 0,
  width: 80,
  height: 40,
  content: <input aria-label={`Card ${i}`} defaultValue="Draft" />
}))

it("commits transforms and snapshots without React work until membership changes, and cleans up subscriptions", () => {
  const store = createNetworkZoomStore()
  const commits = vi.fn()
  let root: HTMLDivElement
  const reports: NetworkViewportSnapshot[] = []
  const report = (snapshot: NetworkViewportSnapshot) => {
    // Reports must describe DOM that has already committed, including culling.
    expect(
      [...root.querySelectorAll<HTMLElement>("[data-mark-id]")].map(
        (n) => n.dataset.markId
      )
    ).toEqual(snapshot.mountedMarkIds)
    expect(
      root.querySelector("[data-network-view] > g")?.getAttribute("transform")
    ).toBe(`translate(${store.view.x},${store.view.y}) scale(${store.view.k})`)
    reports.push(snapshot)
    store.update({ visibleRect: snapshot.visibleRect })
  }
  const live = vi.fn()
  const unsubscribe = store.subscribe(live)
  const view = render(
    <React.StrictMode>
      <div
        ref={(element) => {
          if (element) root = element
        }}
      >
        <React.Profiler id="carriers" onRender={commits}>
          <svg>
            <NetworkViewGroup view={store.view} width={100} height={100}>
              <rect width={80} height={40} />
            </NetworkViewGroup>
          </svg>
          <NetworkHtmlMarksLayer
            marks={marks}
            margin={{ left: 0, top: 0 }}
            width={100}
            height={100}
            viewTransform={store.view}
            htmlMarkCulling={{ overscan: 0 }}
            onViewportChange={report}
          />
        </React.Profiler>
      </div>
    </React.StrictMode>
  )
  const input = view.getByLabelText("Card 0") as HTMLInputElement
  input.value = "Unsaved edit"
  commits.mockClear()
  live.mockClear()
  for (let i = 1; i <= 50; i++) {
    act(() =>
      store.update({ zoom: { x: -i, y: 0, k: 1 }, isInteracting: true })
    )
  }
  expect(commits).not.toHaveBeenCalled()
  expect(live).toHaveBeenCalledTimes(50) // Nested viewport echo is batched.
  expect(reports.at(-1)?.visibleRect).toEqual({
    x: 50,
    y: 0,
    width: 100,
    height: 100
  })
  expect(view.getByLabelText("Card 0")).toBe(input)
  expect(input.value).toBe("Unsaved edit")
  const carrier = view.container.querySelector<HTMLElement>(
    ".semiotic-network-html-marks > div"
  )!
  expect(carrier.style.transform).toBe("translate(-50px, 0px) scale(1)")
  act(() => store.update({ zoom: { x: -200, y: 0, k: 1 } }))
  expect(commits).toHaveBeenCalledTimes(1)
  expect(view.queryByLabelText("Card 0")).toBeNull()
  expect(view.getByLabelText("Card 1")).toBeInTheDocument()
  expect(reports.at(-1)?.mountedMarkIds).toEqual(["1"])
  const lastTransform = carrier.style.transform
  const lastReports = reports.length
  view.unmount()
  unsubscribe()
  store.update({ zoom: { x: -400, y: 0, k: 1 } })
  expect(carrier.style.transform).toBe(lastTransform)
  expect(reports).toHaveLength(lastReports)
})

it("serializes exactly the same HTML and SVG with a live camera as with a plain transform", () => {
  const store = createNetworkZoomStore()
  store.update({ zoom: { x: -25, y: 15, k: 2 } })
  const tree = (view: NetworkViewTransform) => (
    <>
      <svg>
        <NetworkViewGroup view={view} width={100} height={100}>
          <rect width={80} height={40} />
        </NetworkViewGroup>
      </svg>
      <NetworkHtmlMarksLayer
        marks={marks}
        margin={{ left: 0, top: 0 }}
        width={100}
        height={100}
        viewTransform={view}
      />
    </>
  )
  expect(renderToString(tree(store.view))).toBe(
    renderToString(tree(store.getSnapshot().zoom))
  )
})

it("refreshes culling when a layout reuses its array and mutable mark records", () => {
  const store = createNetworkZoomStore()
  const reused = marks.map((mark) => ({ ...mark }))
  const report = vi.fn()
  const tree = () => (
    <NetworkHtmlMarksLayer
      marks={reused}
      margin={{ left: 0, top: 0 }}
      width={100}
      height={100}
      viewTransform={store.view}
      htmlMarkCulling={{ overscan: 0 }}
      onViewportChange={report}
    />
  )
  const view = render(tree())
  expect(view.getByLabelText("Card 0")).toBeInTheDocument()
  reused[0].x = 400
  reused[1].x = 0
  view.rerender(tree())
  expect(view.queryByLabelText("Card 0")).toBeNull()
  expect(view.getByLabelText("Card 1")).toBeInTheDocument()
  expect(report.mock.lastCall?.[0].mountedMarkIds).toEqual(["1"])
})

it.each([-20, -200])(
  "never reports a stale viewport when a controlled camera commits in its parent layout effect (x: %s)",
  (x) => {
    const store = createNetworkZoomStore()
    const report = vi.fn((snapshot: NetworkViewportSnapshot) => {
      expect(snapshot.visibleRect?.x).toBe(0 - store.view.x)
      expect(
        [...document.querySelectorAll<HTMLElement>("[data-mark-id]")].map(
          (n) => n.dataset.markId
        )
      ).toEqual(snapshot.mountedMarkIds)
    })
    function Host({ x }: { x: number }) {
      React.useLayoutEffect(
        () => store.update({ zoom: { x, y: 0, k: 1 } }),
        [x]
      )
      return (
        <NetworkHtmlMarksLayer
          marks={marks}
          margin={{ left: 0, top: 0 }}
          width={100}
          height={100}
          viewTransform={store.view}
          htmlMarkCulling={{ overscan: 0 }}
          onViewportChange={report}
        />
      )
    }
    const view = render(<Host x={0} />)
    report.mockClear()
    view.rerender(<Host x={x} />)
    expect(report.mock.lastCall?.[0].visibleRect?.x).toBe(-x)
  }
)
