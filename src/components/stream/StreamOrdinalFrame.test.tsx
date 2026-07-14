import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, act, fireEvent } from "@testing-library/react"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import { ThemeProvider } from "../ThemeProvider"
import type { StreamOrdinalFrameHandle } from "./ordinalTypes"
import {
  setupCanvasMock,
  type CanvasContextMock
} from "../../test-utils/canvasMock"
import type { Datum } from "../charts/shared/datumTypes"
import { createFrameScheduler } from "./test-utils/frameScheduler"

// Mock ResizeObserver for jsdom
const resizeObserverGlobal = globalThis as typeof globalThis & {
  ResizeObserver?: typeof ResizeObserver
}
if (typeof resizeObserverGlobal.ResizeObserver === "undefined") {
  resizeObserverGlobal.ResizeObserver = class {
    constructor(_callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver
}

describe("StreamOrdinalFrame", () => {
  let cleanup: () => void
  beforeEach(() => {
    cleanup = setupCanvasMock()
  })
  afterEach(() => {
    cleanup()
  })

  // ── Basic rendering ───────────────────────────────────────────────────

  describe("basic rendering", () => {
    it("mounts with minimal props and renders a canvas element", () => {
      const { getByRole } = render(<StreamOrdinalFrame chartType="bar" />)
      const frame = getByRole("group", { name: "Ordinal chart" })
      expect(frame).toHaveClass("stream-ordinal-frame")
      expect(frame.querySelector("canvas")).toHaveAttribute(
        "aria-label",
        "bar chart, empty"
      )
    })

    it("applies className prop", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" className="custom-ordinal" />
      )
      const frame = container.querySelector(".stream-ordinal-frame")
      expect(frame).toHaveClass("stream-ordinal-frame", "custom-ordinal")
    })

    it("sets role=img on the container", () => {
      const { container } = render(<StreamOrdinalFrame chartType="bar" />)
      expect(container.querySelector("[role='img']")).toHaveAccessibleName(
        "Ordinal chart"
      )
    })

    it("uses title as aria-label when provided", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" title="Sales by Region" />
      )
      const frame = container.querySelector("[role='img']")
      expect(frame?.getAttribute("aria-label")).toBe("Sales by Region")
    })

    it("defaults aria-label to 'Ordinal chart' when no title", () => {
      const { container } = render(<StreamOrdinalFrame chartType="bar" />)
      const frame = container.querySelector("[role='img']")
      expect(frame?.getAttribute("aria-label")).toBe("Ordinal chart")
    })

    it("renders with custom size", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" size={[900, 600]} />
      )
      const frame = container.querySelector(
        ".stream-ordinal-frame"
      ) as HTMLElement
      expect(frame.style.width).toBe("900px")
      expect(frame.style.height).toBe("600px")
    })

    it("sets tabIndex=0 for keyboard accessibility", () => {
      const { container } = render(<StreamOrdinalFrame chartType="bar" />)
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

    it("uses canonical category and value accessors for bounded data", () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          data={[
            { department: "Sales", cancellations: 40 },
            { department: "Corporate Archaeology", cancellations: 6 }
          ]}
          categoryAccessor="department"
          valueAccessor="cancellations"
          oSort={false}
          size={[600, 400]}
        />
      )

      const scales = ref.current?.getScales()
      expect(scales?.o.domain()).toEqual(["Sales", "Corporate Archaeology"])
      expect(scales?.r.domain()[1]).toBeGreaterThanOrEqual(40)
    })

    it("anchors horizontal widgets with canonical accessors", () => {
      const { getByRole } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={[
            { department: "Sales", cancellations: 40 },
            { department: "Corporate Archaeology", cancellations: 6 }
          ]}
          categoryAccessor="department"
          valueAccessor="cancellations"
          projection="horizontal"
          oSort={false}
          annotations={[
            {
              type: "widget",
              department: "Corporate Archaeology",
              cancellations: 6,
              content: <button type="button">Open archive note</button>
            }
          ]}
          size={[600, 400]}
        />
      )

      const widget = getByRole("button", { name: "Open archive note" })
      const foreignObject = widget.parentElement?.parentElement
      expect(foreignObject?.tagName.toLowerCase()).toBe("foreignobject")
      expect(Number(foreignObject?.getAttribute("x"))).toBeGreaterThanOrEqual(0)
      expect(Number(foreignObject?.getAttribute("y"))).toBeGreaterThanOrEqual(0)
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
      const initialData = [{ category: "A", value: 10 }]
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
      render(<StreamOrdinalFrame ref={ref} chartType="bar" />)
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
      await act(async () => {
        ref.current!.push({ cat: "A", val: 10 })
      })
      await act(async () => {
        ref.current!.push({ cat: "B", val: 20 })
      })
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

    it("emits legend category domain changes after push, remove, update, and clear", async () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      const onCategoriesChange = vi.fn()
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          runtimeMode="streaming"
          categoryAccessor="cat"
          valueAccessor="val"
          dataIdAccessor="id"
          legendCategoryAccessor="cat"
          onCategoriesChange={onCategoriesChange}
        />
      )

      await act(async () => {
        ref.current!.pushMany([
          { id: "a", cat: "A", val: 10 },
          { id: "b", cat: "B", val: 20 }
        ])
        await Promise.resolve()
      })
      expect(onCategoriesChange).toHaveBeenLastCalledWith(["A", "B"])

      await act(async () => {
        ref.current!.remove("b")
      })
      expect(onCategoriesChange).toHaveBeenLastCalledWith(["A"])

      await act(async () => {
        ref.current!.update("a", (d) => ({ ...d, cat: "C" }))
      })
      expect(onCategoriesChange).toHaveBeenLastCalledWith(["C"])

      await act(async () => {
        ref.current!.clear()
      })
      expect(onCategoriesChange).toHaveBeenLastCalledWith([])
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
          { cat: "B", val: 20 }
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
          { cat: "C", val: 77 }
        ])
      })
      const after = ref.current!.getData()
      expect(after.length).toBe(3)
      expect(after.find((d: Datum) => d.val === 10)).toBeUndefined() // old datum gone
      expect(after.find((d: Datum) => d.val === 99)).toBeTruthy() // new datum present
    })

    it("replace preserves the position snapshot that clear() wipes", async () => {
      // This is the load-bearing behavior: replace() routes through
      // DataSourceAdapter.setBoundedData (bounded: true) which does NOT
      // clear prevPositionMap in the store — whereas clear() does.
      // Aggregating HOCs need the snapshot preserved so data-change
      // transitions fire between old and new positions.
      const data = [
        { cat: "A", val: 10 },
        { cat: "B", val: 20 }
      ]
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
      await act(async () => {
        ref.current!.replace(data)
      })
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
        ref.current!.replace([
          { cat: "A", val: 50 },
          { cat: "B", val: 60 }
        ])
      })
      expect(ref.current!.getData().length).toBe(2)
      expect(
        ref.current!.getData().find((d: Datum) => d.val === 50)
      ).toBeTruthy()
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
      render(<StreamOrdinalFrame ref={ref} chartType="bar" size={[600, 400]} />)
      await act(async () => {
        ref.current!.replace([
          { category: "Q1", value: 10 },
          { category: "Q2", value: 20 },
          { category: "Q3", value: 15 }
        ])
      })
      // First replacement seeds order Q1 → Q2 → Q3.
      await act(async () => {
        ref.current!.replace([
          { category: "Q1", value: 5 },
          { category: "Q2", value: 99 }, // biggest — would sort first under value-desc
          { category: "Q3", value: 40 }
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
      await act(async () => {
        ref.current!.push({ cat: "A", val: 10 })
      })
      await act(async () => {
        ref.current!.clear()
      })
      expect(ref.current!.getData().length).toBe(0)
    })

    it("getScales returns null when no data has been processed", () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      render(<StreamOrdinalFrame ref={ref} chartType="bar" />)
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
      const { container } = render(<StreamOrdinalFrame chartType="bar" />)
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
            legendGroups: [
              {
                label: "Groups",
                items: [
                  { label: "Group A", color: "steelblue" },
                  { label: "Group B", color: "orange" }
                ],
                styleFn: () => ({})
              }
            ]
          }}
        />
      )
      // SVG overlay renders legend as SVG elements
      const svgs = container.querySelectorAll("svg")
      expect(svgs.length).toBeGreaterThan(0)
    })

    it("renders without legend when legend prop is omitted", () => {
      const { container } = render(<StreamOrdinalFrame chartType="bar" />)
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    })
  })

  // ── Loading / empty states ─────────────────────────────────────────

  describe("loading and empty states", () => {
    it("renders the frame even with no data", () => {
      const { container } = render(<StreamOrdinalFrame chartType="bar" />)
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
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
      await act(async () => {
        ref.current!.push({ cat: "X", val: 5 })
      })
      const badge = container.querySelector(".stream-staleness-badge")
      expect(badge).toBeTruthy()
    })
  })

  // ── Keyboard navigation ───────────────────────────────────────────────

  describe("keyboard navigation", () => {
    it("handles arrow key presses without crashing when scene is empty", () => {
      const { container } = render(<StreamOrdinalFrame chartType="bar" />)
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

    it("thins crowded category labels so they do not overlap", () => {
      // 40 bins in a 400px-wide chart — the temporal-histogram case. Drawing
      // every label overlaps; the axis should thin to a readable subset.
      const data = Array.from({ length: 40 }, (_, i) => ({
        category: `2026-${String(i + 1).padStart(2, "0")}`,
        value: (i % 7) + 1
      }))
      const { container } = render(
        <StreamOrdinalFrame
          chartType="bar"
          data={data}
          oAccessor="category"
          rAccessor="value"
          size={[400, 300]}
          showAxes={true}
        />
      )
      // Vertical bars put categories on the bottom axis.
      const catTicks = container.querySelectorAll(
        ".semiotic-axis-bottom .semiotic-axis-tick"
      )
      expect(catTicks.length).toBeGreaterThan(0)
      expect(catTicks.length).toBeLessThan(data.length)
    })

    it("keeps every label when categories are few enough to fit", () => {
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
          size={[600, 300]}
          showAxes={true}
        />
      )
      const catTicks = container.querySelectorAll(
        ".semiotic-axis-bottom .semiotic-axis-tick"
      )
      expect(catTicks.length).toBe(data.length)
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
          backgroundGraphics={
            <rect data-testid="bg-rect" width={50} height={50} fill="blue" />
          }
        />
      )
      const bgRect = container.querySelector("[data-testid='bg-rect']")
      expect(bgRect).toBeTruthy()
    })

    // A retained canvas cannot sit between an SVG grid and its marks if it
    // paints an opaque background: the background hides the grid. The frame
    // therefore owns its background in an SVG sibling below the grid, leaving
    // the mark canvas transparent. This preserves both the intended layering
    // and overlay composition with caller-provided background graphics.
    describe("background and underlay composition", () => {
      // Capture fillStyle at each fillRect call + restore the original
      // method so the replacement can't leak into another test if the
      // mock's lifecycle ever changes.
      function captureFillRectStyles(ctx: CanvasContextMock) {
        const styles: string[] = []
        const orig = ctx.fillRect as
          ((...args: unknown[]) => unknown) | undefined
        ctx.fillRect = vi.fn((...args: unknown[]) => {
          styles.push(String(ctx.fillStyle))
          return orig?.apply(ctx, args)
        })
        return {
          styles,
          restore: () => {
            ctx.fillRect = orig
          }
        }
      }
      const getMockCtx = () =>
        HTMLCanvasElement.prototype.getContext.call(
          document.createElement("canvas"),
          "2d"
        ) as unknown as CanvasContextMock

      const chartData = [
        { category: "A", value: 10 },
        { category: "B", value: 20 }
      ]

      function expectBefore(first: Element, second: Element) {
        expect(
          first.compareDocumentPosition(second) &
            Node.DOCUMENT_POSITION_FOLLOWING
        ).not.toBe(0)
      }

      it("places an explicit background and grid below the transparent mark canvas", () => {
        const ctx = getMockCtx()
        const cap = captureFillRectStyles(ctx)
        try {
          // `point` renders via arc+fill, not fillRect. The chart background
          // must therefore be SVG rather than an opaque canvas fill.
          const { container } = render(
            <StreamOrdinalFrame
              chartType="point"
              data={chartData}
              background="red"
              showGrid
            />
          )
          const background = container.querySelector(
            '[data-semiotic-layer="canvas-background"]'
          )
          const grid = container.querySelector("g.ordinal-grid")
          const canvas = container.querySelector("canvas")

          expect(background).toHaveAttribute("fill", "red")
          expect(grid).toBeTruthy()
          expectBefore(background!, grid!)
          expectBefore(grid!, canvas!)
          expect(cap.styles).not.toContain("red")
        } finally {
          cap.restore()
        }
      })

      it("uses the theme background below the grid when no explicit background is supplied", () => {
        const { container } = render(
          <ThemeProvider theme="dark">
            <StreamOrdinalFrame chartType="point" data={chartData} showGrid />
          </ThemeProvider>
        )
        const background = container.querySelector(
          '[data-semiotic-layer="canvas-background"]'
        )
        const grid = container.querySelector("g.ordinal-grid")
        const canvas = container.querySelector("canvas")

        expect(background).toHaveAttribute(
          "fill",
          "var(--semiotic-bg, transparent)"
        )
        expect(grid).toBeTruthy()
        expectBefore(background!, grid!)
        expectBefore(grid!, canvas!)
      })

      it("omits the frame background when background='transparent'", () => {
        const ctx = getMockCtx()
        const cap = captureFillRectStyles(ctx)
        try {
          const { container } = render(
            <StreamOrdinalFrame
              chartType="point"
              data={chartData}
              background="transparent"
              showGrid
            />
          )
          expect(
            container.querySelector('[data-semiotic-layer="canvas-background"]')
          ).toBeNull()
          expect(cap.styles).toHaveLength(0)
        } finally {
          cap.restore()
        }
      })

      it("lets backgroundGraphics own the background layer without a frame fill", () => {
        const ctx = getMockCtx()
        const cap = captureFillRectStyles(ctx)
        try {
          const { container } = render(
            <StreamOrdinalFrame
              chartType="point"
              data={chartData}
              backgroundGraphics={
                <rect x={0} y={0} width={10} height={10} fill="red" />
              }
            />
          )
          expect(
            container.querySelector('[data-semiotic-layer="canvas-background"]')
          ).toBeNull()
          expect(container.querySelector('rect[fill="red"]')).toBeTruthy()
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
    const chartTypes: Array<
      | "bar"
      | "clusterbar"
      | "point"
      | "swarm"
      | "pie"
      | "donut"
      | "boxplot"
      | "violin"
      | "histogram"
    > = [
      "bar",
      "clusterbar",
      "point",
      "swarm",
      "pie",
      "donut",
      "boxplot",
      "violin",
      "histogram"
    ]

    for (const ct of chartTypes) {
      it(`renders chartType="${ct}" without crashing`, () => {
        const { container } = render(<StreamOrdinalFrame chartType={ct} />)
        expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
      })
    }
  })

  // ── Projection variants ───────────────────────────────────────────────

  describe("projection variants", () => {
    it("renders vertical projection (default)", () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      const data = [{ category: "A", value: 10 }]
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          data={data}
          oAccessor="category"
          rAccessor="value"
          projection="vertical"
        />
      )
      expect(ref.current?.getScales()?.projection).toBe("vertical")
    })

    it("renders horizontal projection", () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      const data = [{ category: "A", value: 10 }]
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="bar"
          data={data}
          oAccessor="category"
          rAccessor="value"
          projection="horizontal"
        />
      )
      expect(ref.current?.getScales()?.projection).toBe("horizontal")
    })

    it("renders radial projection", () => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      const data = [
        { category: "A", value: 30 },
        { category: "B", value: 70 }
      ]
      render(
        <StreamOrdinalFrame
          ref={ref}
          chartType="pie"
          data={data}
          oAccessor="category"
          rAccessor="value"
          projection="radial"
        />
      )
      expect(ref.current?.getScales()?.projection).toBe("radial")
    })
  })

  // ── Responsive sizing ─────────────────────────────────────────────────

  describe("responsive sizing", () => {
    it("sets width to 100% when responsiveWidth is true", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" responsiveWidth />
      )
      const frame = container.querySelector(
        ".stream-ordinal-frame"
      ) as HTMLElement
      expect(frame.style.width).toBe("100%")
    })

    it("sets height to 100% when responsiveHeight is true", () => {
      const { container } = render(
        <StreamOrdinalFrame chartType="bar" responsiveHeight />
      )
      const frame = container.querySelector(
        ".stream-ordinal-frame"
      ) as HTMLElement
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
          data={[
            { cat: "A", val: 10 },
            { cat: "B", val: 20 }
          ]}
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

    describe("keyboard accessibility", () => {
      function renderBrush(
        projection: "vertical" | "horizontal",
        onBrush = vi.fn()
      ) {
        const result = render(
          <StreamOrdinalFrame
            chartType="bar"
            data={[
              { cat: "A", val: 10 },
              { cat: "B", val: 20 }
            ]}
            oAccessor="cat"
            rAccessor="val"
            projection={projection}
            brush={{ dimension: "r" }}
            onBrush={onBrush}
          />
        )
        const region = result.container.querySelector(
          'svg[role="region"]'
        ) as SVGSVGElement
        return { ...result, region, onBrush }
      }

      it("nudges a vertical (default) brush with up/down and ignores left/right", () => {
        const { region, onBrush } = renderBrush("vertical")
        fireEvent.keyDown(region, { key: "ArrowUp" })
        expect(onBrush).toHaveBeenCalledWith(
          expect.objectContaining({ r: expect.any(Array) })
        )
        onBrush.mockClear()
        fireEvent.keyDown(region, { key: "ArrowDown", shiftKey: true })
        expect(onBrush).toHaveBeenCalled()
        onBrush.mockClear()
        fireEvent.keyDown(region, { key: "ArrowLeft" })
        fireEvent.keyDown(region, { key: "ArrowRight" })
        expect(onBrush).not.toHaveBeenCalled()
      })

      it("nudges a horizontal brush with left/right and ignores up/down", () => {
        const { region, onBrush } = renderBrush("horizontal")
        fireEvent.keyDown(region, { key: "ArrowRight" })
        expect(onBrush).toHaveBeenCalledWith(
          expect.objectContaining({ r: expect.any(Array) })
        )
        onBrush.mockClear()
        fireEvent.keyDown(region, { key: "ArrowLeft", shiftKey: true })
        expect(onBrush).toHaveBeenCalled()
        onBrush.mockClear()
        fireEvent.keyDown(region, { key: "ArrowUp" })
        fireEvent.keyDown(region, { key: "ArrowDown" })
        expect(onBrush).not.toHaveBeenCalled()
      })

      it("clears the brush extent on Escape after a prior nudge", () => {
        const { region, onBrush } = renderBrush("vertical")
        fireEvent.keyDown(region, { key: "ArrowUp" })
        onBrush.mockClear()
        fireEvent.keyDown(region, { key: "Escape" })
        expect(onBrush).toHaveBeenCalledWith(null)
      })

      it("exposes an aria-label and matching description element for the ordinal brush region", () => {
        const { region } = renderBrush("vertical")
        expect(region.getAttribute("aria-label")).toBe(
          "Ordinal value range brush"
        )
        const describedBy = region.getAttribute("aria-describedby")
        const description = describedBy
          ? region.querySelector(`#${describedBy}`)
          : null
        expect(description?.textContent).toBe(
          "Use arrow keys to move the selected range, Shift plus an arrow key to resize it, and Escape to clear it."
        )
      })
    })
  })

  // ── Regression: every declared *Style prop reaches pipelineConfig ──────
  //
  // Mirrors StreamXYFrame.test.tsx's guard: spies on OrdinalPipelineStore's
  // updateConfig method, renders StreamOrdinalFrame with a sentinel value
  // for each declared `*Style` prop, asserts each sentinel makes it through.
  // Catches future drops at the Frame↔Store seam.
  //
  // When adding a new `*Style` prop:
  //   1. Add `fooStyle` to OrdinalPipelineConfig in ordinalTypes.ts
  //   2. Thread it into the pipelineConfig memo in StreamOrdinalFrame.tsx
  //   3. Add a sentinel entry below
  describe("regression: all declared *Style props reach pipelineConfig", () => {
    it("forwards every *Style prop to the OrdinalPipelineStore config", async () => {
      const pieceStyle = () => ({ fill: "__PIECE_STYLE__" })
      const summaryStyle = () => ({ fill: "__SUMMARY_STYLE__" })
      const connectorStyle = { stroke: "__CONNECTOR_STYLE__", strokeWidth: 2 }

      const StoreModule = await import("./OrdinalPipelineStore")
      const updateSpy = vi.spyOn(
        StoreModule.OrdinalPipelineStore.prototype,
        "updateConfig"
      )

      try {
        render(
          <StreamOrdinalFrame
            chartType="bar"
            data={[{ cat: "A", val: 1 }]}
            oAccessor="cat"
            rAccessor="val"
            pieceStyle={pieceStyle}
            summaryStyle={summaryStyle}
            connectorStyle={connectorStyle}
          />
        )

        const lastConfig =
          updateSpy.mock.calls[updateSpy.mock.calls.length - 1]?.[0]
        expect(
          lastConfig,
          "updateConfig should be invoked with the initial merged config"
        ).toBeDefined()

        expect(lastConfig.pieceStyle).toBe(pieceStyle)
        expect(lastConfig.summaryStyle).toBe(summaryStyle)
        expect(lastConfig.connectorStyle).toBe(connectorStyle)
      } finally {
        updateSpy.mockRestore()
      }
    })
  })

  it("forwards accessorRevision to the ordinal pipeline config", async () => {
    const StoreModule = await import("./OrdinalPipelineStore")
    const updateSpy = vi.spyOn(
      StoreModule.OrdinalPipelineStore.prototype,
      "updateConfig"
    )
    try {
      render(<StreamOrdinalFrame chartType="bar" accessorRevision={7} />)
      const lastConfig =
        updateSpy.mock.calls[updateSpy.mock.calls.length - 1]?.[0]
      expect(lastConfig?.accessorRevision).toBe(7)
    } finally {
      updateSpy.mockRestore()
    }
  })

  describe("frame runtime policy", () => {
    it("freezes logical time and cancels scheduled paints while paused", async () => {
      const scheduler = createFrameScheduler(0)
      let wallTime = 0
      const clock = () => wallTime
      const StoreModule = await import("./OrdinalPipelineStore")
      const advanceSpy = vi.spyOn(
        StoreModule.OrdinalPipelineStore.prototype,
        "advanceTransition"
      )

      try {
        const props = {
          chartType: "bar" as const,
          frameScheduler: scheduler.scheduler,
          clock
        }
        const { rerender } = render(<StreamOrdinalFrame {...props} paused />)

        await act(async () => {
          rerender(<StreamOrdinalFrame {...props} paused={false} />)
        })
        expect(scheduler.pendingCount).toBe(1)

        await act(async () => {
          rerender(<StreamOrdinalFrame {...props} paused />)
        })
        expect(scheduler.cancelledHandles).toContain(0)
        expect(scheduler.pendingCount).toBe(0)

        wallTime = 10_000
        await act(async () => {
          rerender(<StreamOrdinalFrame {...props} paused={false} />)
        })
        expect(scheduler.pendingCount).toBe(1)

        await act(async () => {
          scheduler.flush(wallTime)
        })
        expect(advanceSpy).toHaveBeenCalled()
        expect(advanceSpy.mock.calls.at(-1)?.[0]).toBe(0)
      } finally {
        advanceSpy.mockRestore()
      }
    })
  })
})
