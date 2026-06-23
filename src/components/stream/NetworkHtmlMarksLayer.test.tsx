import * as React from "react"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { act, render } from "@testing-library/react"
import { NetworkHtmlMarksLayer } from "./NetworkHtmlMarksLayer"
import { useCustomLayoutSelection } from "./customLayoutSelection"
import StreamNetworkFrame from "./StreamNetworkFrame"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import { setupCanvasMock } from "../../test-utils/canvasMock"

const margin = { top: 20, left: 80 }

describe("NetworkHtmlMarksLayer", () => {
  it("renders nothing when there are no marks", () => {
    const { container, rerender } = render(<NetworkHtmlMarksLayer marks={[]} margin={margin} />)
    expect(container.querySelector(".semiotic-network-html-marks")).toBeNull()
    rerender(<NetworkHtmlMarksLayer marks={undefined} margin={margin} />)
    expect(container.querySelector(".semiotic-network-html-marks")).toBeNull()
  })

  it("offsets the container by the frame margin so marks align with the canvas/SVG", () => {
    const { container } = render(
      <NetworkHtmlMarksLayer
        marks={[{ id: "a", x: 0, y: 0, width: 10, height: 10, content: null }]}
        margin={margin}
      />
    )
    const layer = container.querySelector<HTMLDivElement>(".semiotic-network-html-marks")!
    expect(layer.style.position).toBe("absolute")
    expect(layer.style.transform).toBe("translate(80px, 20px)")
    expect(layer.style.pointerEvents).toBe("none")
  })

  it("positions each mark at its plot (x, y) and sizes the wrapper", () => {
    const { container } = render(
      <NetworkHtmlMarksLayer
        margin={margin}
        marks={[
          { id: "a", x: 12, y: 34, width: 40, height: 24, content: <span>card-a</span> },
          { id: "b", x: 56, y: 78, width: 50, height: 30, content: <span>card-b</span> },
        ]}
      />
    )
    const a = container.querySelector<HTMLDivElement>('[data-mark-id="a"]')!
    expect(a.style.transform).toBe("translate(12px, 34px)")
    expect(a.style.width).toBe("40px")
    expect(a.style.height).toBe("24px")
    expect(a.style.position).toBe("absolute")
    expect(a.style.pointerEvents).toBe("none")
    expect(a.textContent).toBe("card-a")

    const b = container.querySelector<HTMLDivElement>('[data-mark-id="b"]')!
    expect(b.style.transform).toBe("translate(56px, 78px)")
    expect(b.textContent).toBe("card-b")
  })

  it("keeps the same DOM element across a position-only update (keyed by id)", () => {
    const { container, rerender } = render(
      <NetworkHtmlMarksLayer
        margin={margin}
        marks={[{ id: "a", x: 0, y: 0, width: 10, height: 10, content: <span>a</span> }]}
      />
    )
    const before = container.querySelector('[data-mark-id="a"]')
    rerender(
      <NetworkHtmlMarksLayer
        margin={margin}
        marks={[{ id: "a", x: 99, y: 88, width: 10, height: 10, content: <span>a</span> }]}
      />
    )
    const after = container.querySelector<HTMLDivElement>('[data-mark-id="a"]')!
    expect(after).toBe(before) // not remounted
    expect(after.style.transform).toBe("translate(99px, 88px)")
  })

  it("provides the shared selection to mark content via useCustomLayoutSelection", () => {
    function Probe() {
      const { isActive, predicate } = useCustomLayoutSelection()
      return <span>{isActive ? (predicate({ id: "a" }) ? "lit" : "dim") : "none"}</span>
    }
    // With an active selection whose predicate excludes this datum → "dim".
    const { container } = render(
      <NetworkHtmlMarksLayer
        margin={margin}
        selection={{ isActive: true, predicate: (d) => d.id === "b" }}
        marks={[{ id: "a", x: 0, y: 0, width: 10, height: 10, content: <Probe /> }]}
      />
    )
    expect(container.querySelector('[data-mark-id="a"]')!.textContent).toBe("dim")
  })

  it("renders mark content with the inactive default when no selection is wired", () => {
    function Probe() {
      const { isActive } = useCustomLayoutSelection()
      return <span>{isActive ? "active" : "none"}</span>
    }
    const { container } = render(
      <NetworkHtmlMarksLayer
        margin={margin}
        marks={[{ id: "a", x: 0, y: 0, width: 10, height: 10, content: <Probe /> }]}
      />
    )
    expect(container.querySelector('[data-mark-id="a"]')!.textContent).toBe("none")
  })
})

describe("StreamNetworkFrame — htmlMarks integration", () => {
  let restoreCanvas: (() => void) | null = null
  // "noop" rAF: the frame's continuous-render loop reschedules itself, and a
  // synchronous rAF stub would recurse forever (same reason StreamNetworkFrame's
  // own spec uses noop). Marks are populated by buildScene in the ingestion
  // effect; a second render pass reads them off the store.
  beforeEach(() => { restoreCanvas = setupCanvasMock({ stubRaf: "noop" }) })
  afterEach(() => { restoreCanvas?.(); restoreCanvas = null })

  const layout: NetworkCustomLayout = (ctx) => ({
    // Transparent hit-rect per node keeps the canvas authoritative.
    // (Network rect nodes use w/h; only htmlMarks use width/height.)
    sceneNodes: ctx.nodes.map((n, i) => ({
      type: "rect" as const, x: i * 100, y: 0, w: 80, h: 40,
      style: { fill: "transparent" }, datum: n, id: n.id,
    })),
    htmlMarks: ctx.nodes.map((n, i) => ({
      id: n.id, x: i * 100, y: 0, width: 80, height: 40,
      content: <div className="kcard">{n.id}</div>,
    })),
  })

  function renderFrame() {
    const el = (
      <StreamNetworkFrame
        chartType="force"
        customNetworkLayout={layout}
        nodes={[{ id: "alpha" }, { id: "beta" }]}
        size={[400, 200]}
        margin={{ top: 10, right: 10, bottom: 10, left: 30 }}
        animate={false}
      />
    )
    let result!: ReturnType<typeof render>
    act(() => { result = render(el) })
    // Effects have run buildScene → store.customLayoutHtmlMarks is populated.
    // Re-render to read it (stable layout ref → no re-ingest, no reschedule).
    act(() => { result.rerender(el) })
    return result.container
  }

  it("renders a custom layout's htmlMarks into the DOM layer above the canvas", () => {
    const container = renderFrame()
    const layer = container.querySelector<HTMLElement>(".semiotic-network-html-marks")
    expect(layer).not.toBeNull()
    expect(container.querySelectorAll(".semiotic-network-html-mark")).toHaveLength(2)
    expect(container.querySelector('[data-mark-id="alpha"] .kcard')?.textContent).toBe("alpha")
    expect(container.querySelector('[data-mark-id="beta"] .kcard')?.textContent).toBe("beta")
  })

  it("offsets the layer by the frame's left/top margin (alignment with the canvas)", () => {
    const container = renderFrame()
    const layer = container.querySelector<HTMLElement>(".semiotic-network-html-marks")!
    expect(layer.style.transform).toBe("translate(30px, 10px)")
    // The layer sits after the SVG overlay in DOM order → painted above it.
    const canvas = container.querySelector("canvas")!
    const pos = canvas.compareDocumentPosition(layer)
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
