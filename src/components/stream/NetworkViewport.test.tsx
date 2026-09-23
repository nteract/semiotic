import * as React from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NetworkHtmlMarksLayer } from "./NetworkHtmlMarksLayer"
import type { NetworkHtmlMark } from "./networkCustomLayout"
import type { NetworkViewportProps } from "./networkViewportTypes"
import { createFrameScheduler } from "./test-utils/frameScheduler"

const marks: NetworkHtmlMark[] = Array.from({ length: 30 }, (_, i) => ({
  id: String(i),
  x: 0,
  y: i * 80,
  width: 300,
  height: 60,
  content: <input aria-label={`Card ${i}`} defaultValue={`draft ${i}`} />
}))
const margin = { left: 30, top: 20 }
const layer = (props: NetworkViewportProps = {}) => (
  <NetworkHtmlMarksLayer
    marks={marks}
    margin={margin}
    width={800}
    height={2400}
    {...props}
  />
)

describe("network viewport mounting and subscription", () => {
  let scheduler: ReturnType<typeof createFrameScheduler>
  let scrollY = 0
  let rootHeight = 200
  const disconnected = vi.fn()
  beforeEach(() => {
    scrollY = 0
    rootHeight = 200
    disconnected.mockClear()
    scheduler = createFrameScheduler(0)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      scheduler.scheduler.requestAnimationFrame
    )
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
      scheduler.scheduler.cancelAnimationFrame
    )
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {
          disconnected()
        }
      }
    )
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(420)
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      () => rootHeight
    )
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const isLayer = this.classList.contains("semiotic-network-html-marks")
        return new DOMRect(
          isLayer ? 30 : 0,
          isLayer ? 20 - scrollY : 0,
          isLayer ? 0 : 420,
          isLayer ? 0 : rootHeight
        )
      }
    )
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("coalesces scroll bursts, reports movement with unchanged membership, and cancels pending work", () => {
    const onViewportChange = vi.fn()
    const view = render(
      <div data-testid="scroll" style={{ overflow: "auto" }}>
        {layer({ htmlMarkCulling: { overscan: 0 }, onViewportChange })}
      </div>
    )
    expect(onViewportChange.mock.lastCall?.[0]).toMatchObject({
      visibleRect: { x: 0, y: 0, width: 390, height: 180 },
      mountedMarkIds: ["0", "1", "2"]
    })
    onViewportChange.mockClear()
    scrollY = 1
    for (let i = 0; i < 3; i++) fireEvent.scroll(view.getByTestId("scroll"))
    expect(scheduler.pendingCount).toBe(1)
    act(() => scheduler.flush())
    expect(onViewportChange).toHaveBeenCalledTimes(1)
    expect(onViewportChange.mock.lastCall?.[0].visibleRect.height).toBe(181)
    expect(onViewportChange.mock.lastCall?.[0].mountedMarkIds).toEqual([
      "0",
      "1",
      "2"
    ])
    fireEvent.scroll(view.getByTestId("scroll"))
    act(() => scheduler.flush())
    expect(onViewportChange).toHaveBeenCalledTimes(1)
    fireEvent.scroll(view.getByTestId("scroll"))
    view.unmount()
    expect(scheduler.pendingCount).toBe(0)
    expect(disconnected).toHaveBeenCalledTimes(1)
  })

  it("retains pinned and focused content, then culls after blur without counting pins as visible", () => {
    const onViewportChange = vi.fn()
    const view = render(
      <div data-testid="scroll" style={{ overflow: "auto" }}>
        {layer({
          htmlMarkCulling: { overscan: 0, pinnedIds: ["1"] },
          onViewportChange
        })}
      </div>
    )
    const input = view.getByLabelText("Card 0")
    fireEvent.change(input, { target: { value: "unsaved" } })
    act(() => input.focus())
    scrollY = 800
    fireEvent.scroll(view.getByTestId("scroll"))
    act(() => scheduler.flush())
    expect(view.getByLabelText("Card 0")).toBe(input)
    expect(input).toHaveFocus()
    expect(input).toHaveValue("unsaved")
    expect(onViewportChange.mock.lastCall?.[0]).toMatchObject({
      visibleMarkIds: ["9", "10", "11", "12"],
      mountedMarkIds: ["0", "1", "9", "10", "11", "12"]
    })
    act(() => input.blur())
    expect(view.queryByLabelText("Card 0")).toBeNull()
    expect(view.getByLabelText("Card 1")).toBeInTheDocument()
  })

  it("supports explicit null and zero-size fallback, overscan defaults, and disabled culling", () => {
    const onViewportChange = vi.fn()
    const tree = (props: NetworkViewportProps) => (
      <div style={{ overflow: "auto" }}>
        {layer({ ...props, onViewportChange })}
      </div>
    )
    const view = render(tree({ viewport: { scrollContainer: null } }))
    expect(view.getAllByRole("textbox")).toHaveLength(30)
    expect(onViewportChange.mock.lastCall?.[0].visibleRect).toBeNull()
    view.rerender(tree({}))
    expect(view.getAllByRole("textbox")).toHaveLength(8)
    view.rerender(tree({ htmlMarkCulling: { overscan: -1 } }))
    expect(view.getAllByRole("textbox")).toHaveLength(8)
    view.rerender(tree({ htmlMarkCulling: { enabled: false, overscan: 0 } }))
    expect(view.getAllByRole("textbox")).toHaveLength(30)
    expect(onViewportChange.mock.lastCall?.[0].visibleMarkIds).toEqual([
      "0",
      "1",
      "2"
    ])
    rootHeight = 0
    fireEvent.scroll(view.container.firstElementChild!)
    act(() => scheduler.flush())
    expect(onViewportChange.mock.lastCall?.[0].visibleRect).toBeNull()
    expect(view.getAllByRole("textbox")).toHaveLength(30)
  })

  it("reports a viewport without marks and rebinds a replaced explicit ref after commit", () => {
    const onViewportChange = vi.fn()
    const first = document.createElement("div")
    const second = document.createElement("div")
    document.body.append(first, second)
    const scrollContainerRef = { current: first }
    const props = {
      viewport: { scrollContainerRef },
      onViewportChange,
      margin,
      width: 800,
      height: 2400
    }
    const view = render(<NetworkHtmlMarksLayer marks={[]} {...props} />)
    expect(onViewportChange.mock.lastCall?.[0]).toMatchObject({
      visibleRect: { width: 390, height: 180 },
      visibleMarkIds: [],
      mountedMarkIds: []
    })
    scrollContainerRef.current = second
    rootHeight = 100
    view.rerender(<NetworkHtmlMarksLayer marks={[]} {...props} />)
    expect(disconnected).toHaveBeenCalledTimes(1)
    expect(onViewportChange.mock.lastCall?.[0].visibleRect.height).toBe(80)
    view.unmount()
    first.remove()
    second.remove()
  })

  it("keeps the content tree stable when selection becomes active or inactive", () => {
    const view = render(layer())
    const input = view.getByLabelText("Card 0")
    fireEvent.change(input, { target: { value: "edited" } })
    act(() => input.focus())
    view.rerender(
      <NetworkHtmlMarksLayer
        marks={marks}
        margin={margin}
        selection={{ isActive: true, predicate: () => true }}
      />
    )
    expect(view.getByLabelText("Card 0")).toBe(input)
    expect(input).toHaveValue("edited")
    expect(input).toHaveFocus()
    view.rerender(layer())
    expect(view.getByLabelText("Card 0")).toBe(input)
  })

  it("returns focus to the keyboard frame when focused data is deleted inside presentation wrappers", () => {
    const chart = (rows: NetworkHtmlMark[]) => (
      <div className="stream-network-frame" tabIndex={0} data-testid="frame">
        <div role="img" aria-label="Chart">
          {<NetworkHtmlMarksLayer marks={rows} margin={margin} />}
        </div>
      </div>
    )
    const view = render(chart(marks))
    act(() => view.getByLabelText("Card 0").focus())
    view.rerender(chart(marks.slice(1)))
    expect(view.queryByLabelText("Card 0")).toBeNull()
    expect(view.getByTestId("frame")).toHaveFocus()
  })

  it("renders every mark on the server and cleans up Strict Mode subscriptions", () => {
    const onViewportChange = vi.fn()
    expect(
      renderToString(layer({ onViewportChange })).match(/data-mark-id=/g)
    ).toHaveLength(30)
    expect(onViewportChange).not.toHaveBeenCalled()
    const view = render(
      <React.StrictMode>
        <div data-testid="scroll" style={{ overflow: "auto" }}>
          {layer({ onViewportChange })}
        </div>
      </React.StrictMode>
    )
    fireEvent.scroll(view.getByTestId("scroll"))
    expect(scheduler.pendingCount).toBe(1)
    view.unmount()
    expect(scheduler.pendingCount).toBe(0)
    expect(disconnected).toHaveBeenCalledTimes(2)
  })
})
