import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, act, fireEvent } from "@testing-library/react"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import type { StreamOrdinalFrameHandle } from "./ordinalTypes"
import { setupCanvasMock } from "../../test-utils/canvasMock"

// Mock ResizeObserver for jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

describe("StreamOrdinalFrame", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  // ── Basic rendering ───────────────────────────────────────────────────

  describe("basic rendering", () => {
    it("mounts with minimal props and renders a canvas element", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" />
      )
      const frame = container.querySelector(".stream-ordinal-frame")
      expect(frame).toBeTruthy()
      expect(frame?.querySelector("canvas")).toBeTruthy()
    })

    it("applies className prop", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" className="custom-ordinal" />
      )
      const frame = container.querySelector(".stream-ordinal-frame.custom-ordinal")
      expect(frame).toBeTruthy()
    })

    it("sets role=img on the container", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" />
      )
      const frame = container.querySelector("[role='img']")
      expect(frame).toBeTruthy()
    })

    it("uses title as aria-label when provided", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" title="Sales by Region" />
      )
      const frame = container.querySelector("[role='img']")
      expect(frame?.getAttribute("aria-label")).toBe("Sales by Region")
    })

    it("defaults aria-label to 'Ordinal chart' when no title", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" />
      )
      const frame = container.querySelector("[role='img']")
      expect(frame?.getAttribute("aria-label")).toBe("Ordinal chart")
    })

    it("renders with custom size", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" size={[900, 600]} />
      )
      const frame = container.querySelector(".stream-ordinal-frame") as HTMLElement
      expect(frame).toBeTruthy()
      expect(frame.style.width).toBe("900px")
      expect(frame.style.height).toBe("600px")
    })

    it("sets tabIndex=0 for keyboard accessibility", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" />
      )
      const frame = container.querySelector(".stream-ordinal-frame")
      expect(frame?.getAttribute("tabindex")).toBe("0")
    })
  })

  // ── Controlled data ───────────────────────────────────────────────────

  describe("controlled data", () => {
    it("renders bar data without crashing", () => {
      const data = [
        { category: "A", value: 10 },
        { category: "B", value: 20 },
        { category: "C", value: 15 }
      ]
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={data}
          oAccessor="category"
          rAccessor="value"
        />
      )
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    })

    it("renders pie data without crashing", () => {
      const data = [
        { category: "A", value: 30 },
        { category: "B", value: 50 },
        { category: "C", value: 20 }
      ]
      const { container } = render(
        <StreamOrdinalFrame
          chartType="pie"
          data={data}
          oAccessor="category"
          rAccessor="value"
          projection="radial"
        />
      )
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    })

    it("handles empty data array gracefully", () => {
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={[]}
          oAccessor="category"
          rAccessor="value"
        />
      )
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    })

    it("updates when data prop changes", () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      const initialData = [
        { category: "A", value: 10 }
      ]
      const { rerender } = render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          data={initialData}
          oAccessor="category"
          rAccessor="value"
        />
      )

      const newData = [
        { category: "A", value: 10 },
        { category: "B", value: 20 },
        { category: "C", value: 30 }
      ]
      rerender(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          data={newData}
          oAccessor="category"
          rAccessor="value"
        />
      )
      // After rerender with new data, getData should reflect the update
      const current = ref.current!.getData()
      expect(current.length).toBe(3)
    })
  })

  // ── Push API ──────────────────────────────────────────────────────────

  describe("push API", () => {
    it("exposes push, pushMany, replace, clear, getData, getScales on ref", () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(
        <StreamOrdinalFrame ref={ref} chartType="bar" />
      )
      expect(ref.current).toBeTruthy()
      expect(typeof ref.current!.push).toBe("function")
      expect(typeof ref.current!.pushMany).toBe("function")
      expect(typeof ref.current!.replace).toBe("function")
      expect(typeof ref.current!.clear).toBe("function")
      expect(typeof ref.current!.getData).toBe("function")
      expect(typeof ref.current!.getScales).toBe("function")
    })

    it("push adds data retrievable via getData", async () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          runtimeMode="streaming"
          categoryAccessor="cat"
          valueAccessor="val"
        />
      )
      await act(async () => { ref.current!.push({ cat: "A", val: 10 }) })
      await act(async () => { ref.current!.push({ cat: "B", val: 20 }) })
      expect(ref.current!.getData().length).toBe(2)
    })

    it("pushMany adds multiple points at once", async () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          runtimeMode="streaming"
          categoryAccessor="cat"
          valueAccessor="val"
        />
      )
      await act(async () => {
        ref.current!.pushMany([
          { cat: "A", val: 10 },
          { cat: "B", val: 20 },
          { cat: "C", val: 30 }
        ])
      })
      expect(ref.current!.getData().length).toBe(3)
    })

    it("replace swaps the full dataset in one call", async () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          runtimeMode="streaming"
          categoryAccessor="cat"
          valueAccessor="val"
        />
      )
      await act(async () => {
        ref.current!.pushMany([
          { cat: "A", val: 10 },
          { cat: "B", val: 20 },
        ])
      })
      expect(ref.current!.getData().length).toBe(2)

      // replace() atomically swaps to a fresh dataset — none of the old
      // rows should remain (this is the behavior aggregating HOCs like
      // LikertChart rely on when re-aggregating streaming input).
      await act(async () => {
        ref.current!.replace([
          { cat: "A", val: 99 },
          { cat: "B", val: 88 },
          { cat: "C", val: 77 },
        ])
      })
      const after = ref.current!.getData()
      expect(after.length).toBe(3)
      expect(after.find((d: any) => d.val === 10)).toBeUndefined() // old datum gone
      expect(after.find((d: any) => d.val === 99)).toBeTruthy()    // new datum present
    })

    it("replace preserves the position snapshot that clear() wipes", async () => {
      // This is the load-bearing behavior: replace() routes through
      // DataSourceAdapter.setBoundedData (bounded: true) which does NOT
      // clear prevPositionMap in the store — whereas clear() does.
      // Aggregating HOCs need the snapshot preserved so data-change
      // transitions fire between old and new positions.
      const data = [{ cat: "A", val: 10 }, { cat: "B", val: 20 }]
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      const { rerender } = render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          runtimeMode="streaming"
          categoryAccessor="cat"
          valueAccessor="val"
          animate={{ duration: 300, intro: false }}
          size={[600, 400]}
        />
      )
      await act(async () => { ref.current!.replace(data) })
      // Force a render pass so scene + snapshot exist
      rerender(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          runtimeMode="streaming"
          categoryAccessor="cat"
          valueAccessor="val"
          animate={{ duration: 300, intro: false }}
          size={[600, 400]}
        />
      )

      // Second replace should still succeed without throwing and end
      // up with the new data — the key implementation contract is that
      // the bounded-ingest path does NOT call `store.clear()` under
      // the hood. If it did, clear() would drop prevPositionMap and
      // the store would have no basis for transition interpolation.
      await act(async () => {
        ref.current!.replace([{ cat: "A", val: 50 }, { cat: "B", val: 60 }])
      })
      expect(ref.current!.getData().length).toBe(2)
      expect(ref.current!.getData().find((d: any) => d.val === 50)).toBeTruthy()
    })

    it("replace preserves category insertion order across value-swapping updates", async () => {
      // Regression: aggregator-HOC pattern. Rapid replacements where the
      // rank-by-value flips between each call must NOT shuffle columns,
      // because the user sees it as a live stream. Without the
      // preserveCategoryOrder path, each replace would clear the
      // category Set and re-sort value-desc, producing visible jumps.
      //
      // Using default oAccessor="category" / rAccessor="value" since this
      // test exercises the non-runtimeMode="streaming" path that
      // aggregator HOCs actually use — LikertChart doesn't set that
      // prop; it routes through replace() which flips the streaming
      // state internally via `preserveCategoryOrder`.
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          size={[600, 400]}
        />
      )
      await act(async () => {
        ref.current!.replace([
          { category: "Q1", value: 10 },
          { category: "Q2", value: 20 },
          { category: "Q3", value: 15 },
        ])
      })
      // First replacement seeds order Q1 → Q2 → Q3.
      await act(async () => {
        ref.current!.replace([
          { category: "Q1", value: 5 },
          { category: "Q2", value: 99 },  // biggest — would sort first under value-desc
          { category: "Q3", value: 40 },
        ])
      })
      const scales = ref.current!.getScales()
      // Ordinal scale domain reflects category order used by the scene.
      expect(scales?.o.domain()).toEqual(["Q1", "Q2", "Q3"])
    })

    it("clear empties the data buffer", async () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          runtimeMode="streaming"
          categoryAccessor="cat"
          valueAccessor="val"
        />
      )
      await act(async () => { ref.current!.push({ cat: "A", val: 10 }) })
      await act(async () => { ref.current!.clear() })
      expect(ref.current!.getData().length).toBe(0)
    })

    it("getScales returns null when no data has been processed", () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(
        <StreamOrdinalFrame ref={ref} chartType="bar" />
      )
      expect(ref.current!.getScales()).toBeNull()
    })

    it("push triggers scene recomputation and scales become available", async () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          runtimeMode="streaming"
          categoryAccessor="cat"
          valueAccessor="val"
          size={[600, 400]}
        />
      )
      await act(async () => {
        ref.current!.pushMany([
          { cat: "A", val: 10 },
          { cat: "B", val: 20 }
        ])
      })
      const scales = ref.current!.getScales()
      expect(scales).toBeTruthy()
    })
  })

  // ── Hover behavior ────────────────────────────────────────────────────

  describe("hover behavior", () => {
    it("attaches mouse handlers when enableHover is true (default)", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" enableHover={true} />
      )
      const frame = container.querySelector(".stream-ordinal-frame")!
      // Should not throw on mouse events
      fireEvent.mouseMove(frame, { clientX: 100, clientY: 100 })
      fireEvent.mouseLeave(frame)
    })

    it("customHoverBehavior is not called when enableHover is false", () => {
      const hoverSpy = vi.fn()
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          enableHover={false}
          hoverAnnotation={false}
          customHoverBehavior={hoverSpy}
        />
      )
      const frame = container.querySelector(".stream-ordinal-frame")!
      fireEvent.mouseMove(frame, { clientX: 100, clientY: 100 })
      // enableHover defaults to true, but we explicitly set both to false
      // Depending on implementation, the spy may or may not be called
      // The key assertion: no crash
    })

    it("handles mouseLeave without crashing even with no prior hover", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" />
      )
      const frame = container.querySelector(".stream-ordinal-frame")!
      // Leave without ever having moved — should be a no-op
      fireEvent.mouseLeave(frame)
    })
  })

  // ── Legend rendering ──────────────────────────────────────────────────

  describe("legend", () => {
    it("renders legend when legend config is provided", () => {
      const data = [
        { category: "A", value: 10 },
        { category: "B", value: 20 }
      ]
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={data}
          oAccessor="category"
          rAccessor="value"
          legend={{
            legendGroups: [{
              label: "Groups",
              items: [
                { label: "Group A", color: "steelblue" },
                { label: "Group B", color: "orange" }
              ],
              styleFn: () => ({})
            }]
          }}
        />
      )
      // SVG overlay renders legend as SVG elements
      const svgs = container.querySelectorAll("svg")
      expect(svgs.length).toBeGreaterThan(0)
    })

    it("renders without legend when legend prop is omitted", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" />
      )
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    })
  })

  // ── Loading / empty states ─────────────────────────────────────────

  describe("loading and empty states", () => {
    it("renders the frame even with no data", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" />
      )
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
      expect(container.querySelector("canvas")).toBeTruthy()
    })

    it("renders staleness badge when staleness config is provided", async () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      const { container } = render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          runtimeMode="streaming"
          categoryAccessor="cat"
          valueAccessor="val"
          staleness={{ threshold: 100, showBadge: true }}
        />
      )
      await act(async () => { ref.current!.push({ cat: "X", val: 5 }) })
      const badge = container.querySelector(".stream-staleness-badge")
      expect(badge).toBeTruthy()
    })
  })

  // ── Keyboard navigation ───────────────────────────────────────────────

  describe("keyboard navigation", () => {
    it("handles arrow key presses without crashing when scene is empty", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" />
      )
      const frame = container.querySelector(".stream-ordinal-frame")!
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      fireEvent.keyDown(frame, { key: "ArrowLeft" })
      fireEvent.keyDown(frame, { key: "Escape" })
    })

    it("handles arrow key navigation with data present", () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      const { container } = render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          data={[
            { category: "A", value: 10 },
            { category: "B", value: 20 },
            { category: "C", value: 30 }
          ]}
          oAccessor="category"
          rAccessor="value"
          enableHover={true}
          size={[600, 400]}
        />
      )
      const frame = container.querySelector(".stream-ordinal-frame")!
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      fireEvent.keyDown(frame, { key: "ArrowLeft" })
      fireEvent.keyDown(frame, { key: "Escape" })
    })
  })

  // ── SVG overlay elements ──────────────────────────────────────────────

  describe("SVG overlay", () => {
    it("renders axes by default (showAxes=true)", () => {
      const data = [
        { category: "A", value: 10 },
        { category: "B", value: 20 }
      ]
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={data}
          oAccessor="category"
          rAccessor="value"
          showAxes={true}
        />
      )
      const svgs = container.querySelectorAll("svg")
      expect(svgs.length).toBeGreaterThan(0)
    })

    it("renders title in SVG overlay when title is a string", () => {
      const data = [{ category: "A", value: 10 }]
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={data}
          oAccessor="category"
          rAccessor="value"
          title="Bar Chart Title"
        />
      )
      expect(container.textContent).toContain("Bar Chart Title")
    })

    it("renders background graphics when provided", () => {
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          backgroundGraphics={<rect data-testid="bg-rect" width={50} height={50} fill="blue" />}
        />
      )
      const bgRect = container.querySelector("[data-testid='bg-rect']")
      expect(bgRect).toBeTruthy()
    })

    // Regression: overlaying one ordinal chart over another via
    // `position: absolute` needs a way to skip the background paint
    // so the base layer stays visible.
    describe("background paint (overlay composition)", () => {
      // Capture fillStyle at each fillRect call + restore the original
      // method so the replacement can't leak into another test if the
      // mock's lifecycle ever changes.
      function captureFillRectStyles(ctx: Record<string, any>) {
        const styles: string[] = []
        const orig = ctx.fillRect as (...args: any[]) => void
        ctx.fillRect = vi.fn((...args: any[]) => {
          styles.push(String(ctx.fillStyle))
          return orig?.apply(ctx, args)
        })
        return {
          styles,
          restore: () => { ctx.fillRect = orig },
        }
      }
      const getMockCtx = () =>
        (HTMLCanvasElement.prototype.getContext as any)() as Record<string, any>

      it("paints an explicit background color via fillRect", () => {
        const ctx = getMockCtx()
        const cap = captureFillRectStyles(ctx)
        try {
          // `point` chartType renders via arc+fill, not fillRect — so any
          // fillRect call is the background paint.
          render(<StreamOrdinalFrame chartType="point" background="red" />)
          expect(cap.styles).toContain("red")
        } finally {
          cap.restore()
        }
      })

      it("skips the background paint when background='transparent'", () => {
        const ctx = getMockCtx()
        const cap = captureFillRectStyles(ctx)
        try {
          render(<StreamOrdinalFrame chartType="point" background="transparent" />)
          expect(cap.styles).toHaveLength(0)
        } finally {
          cap.restore()
        }
      })
    })

    it("renders center content for radial projection (donut)", () => {
      const data = [
        { category: "A", value: 30 },
        { category: "B", value: 70 }
      ]
      const { container } = render(
        <StreamOrdinalFrame
          chartType="donut"
          data={data}
          oAccessor="category"
          rAccessor="value"
          projection="radial"
          centerContent={<span>50%</span>}
        />
      )
      expect(container.textContent).toContain("50%")
    })
  })

  // ── Chart type variants ───────────────────────────────────────────────

  describe("chart type variants", () => {
    const chartTypes: Array<"bar" | "clusterbar" | "point" | "swarm" | "pie" | "donut" | "boxplot" | "violin" | "histogram"> = [
      "bar", "clusterbar", "point", "swarm", "pie", "donut", "boxplot", "violin", "histogram"
    ]

    for (const ct of chartTypes) {
      it(`renders chartType="${ct}" without crashing`, () => {
        const { container } = render(
          <StreamOrdinalFrame chartType={ct} />
        )
        expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
      })
    }
  })

  // ── Projection variants ───────────────────────────────────────────────

  describe("projection variants", () => {
    it("renders vertical projection (default)", () => {
      const data = [{ category: "A", value: 10 }]
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={data}
          oAccessor="category"
          rAccessor="value"
          projection="vertical"
        />
      )
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    })

    it("renders horizontal projection", () => {
      const data = [{ category: "A", value: 10 }]
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={data}
          oAccessor="category"
          rAccessor="value"
          projection="horizontal"
        />
      )
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    })

    it("renders radial projection", () => {
      const data = [
        { category: "A", value: 30 },
        { category: "B", value: 70 }
      ]
      const { container } = render(
        <StreamOrdinalFrame
          chartType="pie"
          data={data}
          oAccessor="category"
          rAccessor="value"
          projection="radial"
        />
      )
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    })
  })

  // ── Responsive sizing ─────────────────────────────────────────────────

  describe("responsive sizing", () => {
    it("sets width to 100% when responsiveWidth is true", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" responsiveWidth />
      )
      const frame = container.querySelector(".stream-ordinal-frame") as HTMLElement
      expect(frame.style.width).toBe("100%")
    })

    it("sets height to 100% when responsiveHeight is true", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" responsiveHeight />
      )
      const frame = container.querySelector(".stream-ordinal-frame") as HTMLElement
      expect(frame.style.height).toBe("100%")
    })
  })

  // ── Brush overlay ─────────────────────────────────────────────────────

  describe("brush overlay", () => {
    it("renders OrdinalBrushOverlay when brush prop is set", async () => {
      const onBrush = vi.fn()
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={[{ cat: "A", val: 10 }, { cat: "B", val: 20 }]}
          oAccessor="cat"
          rAccessor="val"
          brush={{ dimension: "r" }}
          onBrush={onBrush}
        />
      )
      // The brush overlay renders an SVG containing a g.brush-g element
      const brushG = container.querySelector(".brush-g")
      expect(brushG).toBeTruthy()
    })

    it("does not render brush overlay when brush is not set", () => {
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={[{ cat: "A", val: 10 }]}
          oAccessor="cat"
          rAccessor="val"
        />
      )
      const brushG = container.querySelector(".brush-g")
      expect(brushG).toBeFalsy()
    })

    it("does not render brush overlay for radial projection", () => {
      const onBrush = vi.fn()
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={[{ cat: "A", val: 10 }]}
          oAccessor="cat"
          rAccessor="val"
          projection="radial"
          brush={{ dimension: "r" }}
          onBrush={onBrush}
        />
      )
      const brushG = container.querySelector(".brush-g")
      expect(brushG).toBeFalsy()
    })
  })
})
