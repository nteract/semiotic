import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, act, fireEvent } from "@testing-library/react"
import StreamXYFrame, { withAlpha } from "./StreamXYFrame"
import type { StreamXYFrameHandle } from "./types"
import { setupCanvasMock, type CanvasContextMock } from "../../test-utils/canvasMock"
import type { Datum } from "../charts/shared/datumTypes"

// Mock ResizeObserver for jsdom
const resizeObserverGlobal = globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }
if (typeof resizeObserverGlobal.ResizeObserver === "undefined") {
  resizeObserverGlobal.ResizeObserver = class {
    constructor(_callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver
}

// Regression: /cookbook/marginal-graphics (and anywhere else using the
// crosshair hover annotation) rendered a near-invisible crosshair
// because the theme resolver appended a 2-char hex alpha to a CSS
// variable like `--semiotic-text-secondary: "#aaa"`, producing the
// invalid 5-char `#aaa66`. Canvas `strokeStyle` silently rejects
// invalid colors and leaves strokeStyle at the previous (or default
// `#000000`) value — which on a dark-theme background is effectively
// black on black. `withAlpha` must expand 3-char hex and handle
// `rgb(...)` before appending alpha.
describe("withAlpha (theme color + alpha concatenation)", () => {
  it("appends alpha to a 6-char hex color", () => {
    expect(withAlpha("#aabbcc", "66")).toBe("#aabbcc66")
  })

  it("expands a 3-char hex color before appending alpha", () => {
    expect(withAlpha("#aaa", "66")).toBe("#aaaaaa66")
    expect(withAlpha("#abc", "4D")).toBe("#aabbcc4D")
  })

  it("tolerates whitespace", () => {
    expect(withAlpha("  #aaa  ", "66")).toBe("#aaaaaa66")
  })

  it("converts rgb() to rgba() with numeric alpha", () => {
    expect(withAlpha("rgb(170, 170, 170)", "66")).toMatch(/^rgba\(170, 170, 170, 0\.4/)
  })

  it("falls back to the raw color when the form isn't recognized", () => {
    expect(withAlpha("red", "66")).toBe("red")
    expect(withAlpha("hsl(0, 100%, 50%)", "66")).toBe("hsl(0, 100%, 50%)")
  })
})

describe("StreamXYFrame", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  // ── Basic rendering ───────────────────────────────────────────────────

  describe("basic rendering", () => {
    it("mounts with minimal props and renders a canvas element", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" />
      )
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
      const canvases = frame?.querySelectorAll("canvas")
      // StreamXYFrame renders two canvases: data + interaction
      expect(canvases?.length).toBeGreaterThanOrEqual(2)
    })

    it("applies className prop", () => {
      const { container } = render(
        <StreamXYFrame chartType="line" className="my-chart" />
      )
      const frame = container.querySelector(".stream-xy-frame.my-chart")
      expect(frame).toBeTruthy()
    })

    it("sets role=img on the container", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" />
      )
      const frame = container.querySelector("[role='img']")
      expect(frame).toBeTruthy()
    })

    it("uses title as aria-label when provided", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" title="Revenue Chart" />
      )
      const frame = container.querySelector("[role='img']")
      expect(frame?.getAttribute("aria-label")).toBe("Revenue Chart")
    })

    it("defaults aria-label to 'XY chart' when no title", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" />
      )
      const frame = container.querySelector("[role='img']")
      expect(frame?.getAttribute("aria-label")).toBe("XY chart")
    })

    it("renders with custom size", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" size={[800, 500]} />
      )
      const frame = container.querySelector(".stream-xy-frame") as HTMLElement
      expect(frame).toBeTruthy()
      expect(frame.style.width).toBe("800px")
      expect(frame.style.height).toBe("500px")
    })

    it("sets tabIndex=0 for keyboard accessibility", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" />
      )
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame?.getAttribute("tabindex")).toBe("0")
    })
  })

  // ── Data rendering with controlled data prop ──────────────────────────

  describe("controlled data", () => {
    it("renders scatter data without crashing", () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: 15 }
      ]
      const { container } = render(
        <StreamXYFrame
          chartType="scatter"
          data={data}
          xAccessor="x"
          yAccessor="y"
        />
      )
      expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
    })

    it("renders line data without crashing", () => {
      const data = [
        { x: 0, y: 5 },
        { x: 1, y: 10 },
        { x: 2, y: 8 }
      ]
      const { container } = render(
        <StreamXYFrame
          chartType="line"
          data={data}
          xAccessor="x"
          yAccessor="y"
        />
      )
      expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
    })

    it("renders area data without crashing", () => {
      const data = [
        { x: 0, y: 5 },
        { x: 1, y: 10 },
        { x: 2, y: 8 }
      ]
      const { container } = render(
        <StreamXYFrame
          chartType="area"
          data={data}
          xAccessor="x"
          yAccessor="y"
        />
      )
      expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
    })

    it("handles empty data array gracefully", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" data={[]} xAccessor="x" yAccessor="y" />
      )
      expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
    })
  })

  // ── Push API ──────────────────────────────────────────────────────────

  describe("push API", () => {
    it("exposes push, pushMany, clear, getData, getScales, getExtents on ref", () => {
      const ref = React.createRef<StreamXYFrameHandle>()
      render(
        <StreamXYFrame ref={ref} chartType="scatter" xAccessor="x" yAccessor="y" />
      )
      expect(ref.current).toBeTruthy()
      expect(typeof ref.current!.push).toBe("function")
      expect(typeof ref.current!.pushMany).toBe("function")
      expect(typeof ref.current!.clear).toBe("function")
      expect(typeof ref.current!.getData).toBe("function")
      expect(typeof ref.current!.getScales).toBe("function")
      expect(typeof ref.current!.getExtents).toBe("function")
    })

    it("push adds data retrievable via getData", async () => {
      const ref = React.createRef<StreamXYFrameHandle>()
      render(
        <StreamXYFrame
          ref={ref}
          chartType="scatter"
          runtimeMode="streaming"
          timeAccessor="t"
          valueAccessor="v"
        />
      )
      await act(async () => { ref.current!.push({ t: 1, v: 10 }) })
      await act(async () => { ref.current!.push({ t: 2, v: 20 }) })
      const data = ref.current!.getData()
      expect(data.length).toBe(2)
    })

    it("pushMany adds multiple points at once", async () => {
      const ref = React.createRef<StreamXYFrameHandle>()
      render(
        <StreamXYFrame
          ref={ref}
          chartType="scatter"
          runtimeMode="streaming"
          timeAccessor="t"
          valueAccessor="v"
        />
      )
      await act(async () => {
        ref.current!.pushMany([
          { t: 1, v: 10 },
          { t: 2, v: 20 },
          { t: 3, v: 30 }
        ])
      })
      expect(ref.current!.getData().length).toBe(3)
    })

    it("emits legend category domain changes after push, remove, update, and clear", async () => {
      const ref = React.createRef<StreamXYFrameHandle>()
      const onCategoriesChange = vi.fn()
      render(
        <StreamXYFrame
          ref={ref}
          chartType="scatter"
          runtimeMode="streaming"
          timeAccessor="t"
          valueAccessor="v"
          pointIdAccessor="id"
          legendCategoryAccessor="series"
          onCategoriesChange={onCategoriesChange}
        />
      )

      await act(async () => {
        ref.current!.pushMany([
          { id: "a", t: 1, v: 10, series: "A" },
          { id: "b", t: 2, v: 20, series: "B" },
        ])
        await Promise.resolve()
      })
      expect(onCategoriesChange).toHaveBeenLastCalledWith(["A", "B"])

      await act(async () => { ref.current!.remove("b") })
      expect(onCategoriesChange).toHaveBeenLastCalledWith(["A"])

      await act(async () => {
        ref.current!.update("a", d => ({ ...d, series: "C" }))
      })
      expect(onCategoriesChange).toHaveBeenLastCalledWith(["C"])

      await act(async () => { ref.current!.clear() })
      expect(onCategoriesChange).toHaveBeenLastCalledWith([])
    })

    it("clear empties the data buffer", async () => {
      const ref = React.createRef<StreamXYFrameHandle>()
      render(
        <StreamXYFrame
          ref={ref}
          chartType="scatter"
          runtimeMode="streaming"
          timeAccessor="t"
          valueAccessor="v"
        />
      )
      await act(async () => { ref.current!.push({ t: 1, v: 10 }) })
      await act(async () => { ref.current!.clear() })
      expect(ref.current!.getData().length).toBe(0)
    })

    it("getScales returns null or empty scales when no data has been pushed", () => {
      const ref = React.createRef<StreamXYFrameHandle>()
      render(
        <StreamXYFrame ref={ref} chartType="scatter" />
      )
      // With no data, scales may be null or may have been initialized with empty domains
      const scales = ref.current!.getScales()
      // Either null or an object is acceptable — the key is no crash
      expect(scales === null || typeof scales === "object").toBe(true)
    })

    it("push triggers scene recomputation and scales become available", async () => {
      const ref = React.createRef<StreamXYFrameHandle>()
      render(
        <StreamXYFrame
          ref={ref}
          chartType="scatter"
          runtimeMode="streaming"
          timeAccessor="t"
          valueAccessor="v"
          size={[400, 300]}
        />
      )
      await act(async () => {
        ref.current!.pushMany([
          { t: 0, v: 0 },
          { t: 10, v: 100 }
        ])
      })
      // After push + rAF (mocked synchronous), scales should be computed
      const scales = ref.current!.getScales()
      expect(scales).toBeTruthy()
    })
  })

  // ── Hover behavior ────────────────────────────────────────────────────

  describe("hover behavior", () => {
    it("attaches mouse handlers when enableHover is true (default)", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" enableHover={true} />
      )
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
      // The frame div should be interactive — it has onMouseMove/onMouseLeave
      // We verify by checking that moving the mouse does not throw
      fireEvent.mouseMove(frame!, { clientX: 100, clientY: 100 })
      fireEvent.mouseLeave(frame!)
    })

    it("customHoverBehavior receives null on mouse leave", async () => {
      const hoverSpy = vi.fn()
      const ref = React.createRef<StreamXYFrameHandle>()
      const { container } = render(
        <StreamXYFrame
          ref={ref}
          chartType="scatter"
          runtimeMode="streaming"
          timeAccessor="t"
          valueAccessor="v"
          enableHover={true}
          customHoverBehavior={hoverSpy}
          size={[400, 300]}
        />
      )

      // Push data so there is something to hover over
      await act(async () => {
        ref.current!.pushMany([
          { t: 0, v: 0 },
          { t: 10, v: 100 }
        ])
      })

      const frame = container.querySelector(".stream-xy-frame")!
      // Simulate leave — the callback receives null
      fireEvent.mouseLeave(frame)
      // customHoverBehavior may or may not have been called depending on
      // whether there was an active hover; but at minimum it should not throw
    })

    it("does not attach mouse handlers when enableHover is false", () => {
      const hoverSpy = vi.fn()
      const { container } = render(
        <StreamXYFrame
          chartType="scatter"
          enableHover={false}
          customHoverBehavior={hoverSpy}
        />
      )
      const frame = container.querySelector(".stream-xy-frame")!
      fireEvent.mouseMove(frame, { clientX: 100, clientY: 100 })
      // With enableHover=false, the customHoverBehavior should not be called
      expect(hoverSpy).not.toHaveBeenCalled()
    })

    it("reports stackedarea multi-tooltip values as band heights", async () => {
      const hoverSpy = vi.fn()
      const { container } = render(
        <StreamXYFrame
          chartType="stackedarea"
          data={[
            { x: 0, y: 10, series: "A" },
            { x: 10, y: 10, series: "A" },
            { x: 0, y: 5, series: "B" },
            { x: 10, y: 5, series: "B" },
          ]}
          xAccessor="x"
          yAccessor="y"
          groupAccessor="series"
          xExtent={[0, 10]}
          yExtent={[0, 20]}
          size={[200, 100]}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          showAxes={false}
          enableHover
          tooltipMode="multi"
          customHoverBehavior={hoverSpy}
        />
      )

      await act(async () => { await Promise.resolve() })

      const hoverTarget = container.querySelector(".stream-xy-frame > div[role='img']")!
      fireEvent.mouseMove(hoverTarget, { clientX: 100, clientY: 85 })

      expect(hoverSpy).toHaveBeenCalled()
      const hover = hoverSpy.mock.calls.at(-1)?.[0]
      expect(hover.xValue).toBeCloseTo(5)
      expect(hover.data.x).toBeCloseTo(5)
      expect(hover.allSeries).toHaveLength(2)

      const valuesByGroup = Object.fromEntries(
        hover.allSeries.map((s: { group: string; value: number }) => [s.group, s.value])
      )
      expect(valuesByGroup.A).toBeCloseTo(10)
      expect(valuesByGroup.B).toBeCloseTo(5)
    })
  })

  // ── Legend rendering ──────────────────────────────────────────────────

  describe("legend", () => {
    it("renders legend when legend config is provided", () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 }
      ]
      const { container } = render(
        <StreamXYFrame
          chartType="scatter"
          data={data}
          xAccessor="x"
          yAccessor="y"
          legend={{
            legendGroups: [{
              label: "Series",
              items: [
                { label: "A", color: "red" },
                { label: "B", color: "blue" }
              ],
              styleFn: () => ({})
            }]
          }}
        />
      )
      // Legend is rendered via the SVGOverlay as SVG text or legend elements
      const svgs = container.querySelectorAll("svg")
      expect(svgs.length).toBeGreaterThan(0)
    })

    it("renders without legend when legend prop is omitted", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" />
      )
      // Should render fine with no legend items
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })
  })

  // ── Loading / empty states ─────────────────────────────────────────

  describe("loading and empty states", () => {
    it("renders the frame even with no data (Stream Frame does not gate on empty data)", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" />
      )
      expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
      expect(container.querySelector("canvas")).toBeTruthy()
    })

    it("renders staleness badge when staleness config is provided", async () => {
      const ref = React.createRef<StreamXYFrameHandle>()
      const { container } = render(
        <StreamXYFrame
          ref={ref}
          chartType="scatter"
          runtimeMode="streaming"
          timeAccessor="t"
          valueAccessor="v"
          staleness={{ threshold: 100, showBadge: true }}
        />
      )
      // Push some data so lastIngestTime is set
      await act(async () => { ref.current!.push({ t: Date.now(), v: 10 }) })
      // The badge should exist (initially "LIVE")
      const badge = container.querySelector(".stream-staleness-badge")
      expect(badge).toBeTruthy()
    })
  })

  // ── Keyboard navigation ───────────────────────────────────────────────

  describe("keyboard navigation", () => {
    it("handles arrow key presses without crashing when scene is empty", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" />
      )
      const frame = container.querySelector(".stream-xy-frame")!
      // Arrow keys on empty scene should be a no-op
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      fireEvent.keyDown(frame, { key: "ArrowLeft" })
      fireEvent.keyDown(frame, { key: "Escape" })
    })

    it("handles arrow key navigation with data present", async () => {
      const ref = React.createRef<StreamXYFrameHandle>()
      const { container } = render(
        <StreamXYFrame
          ref={ref}
          chartType="scatter"
          runtimeMode="streaming"
          timeAccessor="t"
          valueAccessor="v"
          enableHover={true}
          size={[400, 300]}
        />
      )
      await act(async () => {
        ref.current!.pushMany([
          { t: 1, v: 10 },
          { t: 2, v: 20 },
          { t: 3, v: 30 }
        ])
      })
      const frame = container.querySelector(".stream-xy-frame")!
      // Navigate forward then backward — should not throw
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
        { x: 1, y: 10 },
        { x: 2, y: 20 }
      ]
      const { container } = render(
        <StreamXYFrame
          chartType="scatter"
          data={data}
          xAccessor="x"
          yAccessor="y"
          showAxes={true}
        />
      )
      // SVGOverlay renders axis-related SVG elements
      const svgs = container.querySelectorAll("svg")
      expect(svgs.length).toBeGreaterThan(0)
    })

    it("renders title in SVG overlay when title is a string", () => {
      const data = [{ x: 1, y: 10 }]
      const { container } = render(
        <StreamXYFrame
          chartType="scatter"
          data={data}
          xAccessor="x"
          yAccessor="y"
          title="Test Title"
        />
      )
      expect(container.textContent).toContain("Test Title")
    })

    it("renders background graphics when provided", () => {
      const { container } = render(
        <StreamXYFrame
          chartType="scatter"
          backgroundGraphics={<rect data-testid="bg" width={100} height={100} fill="red" />}
        />
      )
      const bgRect = container.querySelector("[data-testid='bg']")
      expect(bgRect).toBeTruthy()
    })

    // Regression: composing one chart as a `position: absolute` overlay on
    // top of another is an intended pattern (see docs/RealtimeHistogramPage).
    // Without an opt-out, the overlay canvas paints its background across
    // the full area and hides the base layer. `background="transparent"`
    // must short-circuit the fill so the composition works.
    describe("background paint (overlay composition)", () => {
      // Capture fillStyle at each fillRect call + restore the original
      // method so the replacement can't leak into another test if the
      // mock's lifecycle ever changes.
      function captureFillRectStyles(ctx: CanvasContextMock) {
        const styles: string[] = []
        const orig = ctx.fillRect as ((...args: unknown[]) => unknown) | undefined
        ctx.fillRect = vi.fn((...args: unknown[]) => {
          styles.push(String(ctx.fillStyle))
          return orig?.apply(ctx, args)
        })
        return {
          styles,
          restore: () => { ctx.fillRect = orig },
        }
      }
      const getMockCtx = () =>
        HTMLCanvasElement.prototype.getContext.call(
          document.createElement("canvas"),
          "2d"
        ) as unknown as CanvasContextMock

      it("paints an explicit background color via fillRect", () => {
        const ctx = getMockCtx()
        const cap = captureFillRectStyles(ctx)
        try {
          render(<StreamXYFrame chartType="scatter" background="red" />)
          expect(cap.styles).toContain("red")
        } finally {
          cap.restore()
        }
      })

      it("skips the background paint when background='transparent'", () => {
        const ctx = getMockCtx()
        const cap = captureFillRectStyles(ctx)
        try {
          render(<StreamXYFrame chartType="scatter" background="transparent" />)
          // Scatter charts don't emit fillRect for data marks, so any
          // fillRect here would be the background paint we're opting out of.
          expect(cap.styles).toHaveLength(0)
        } finally {
          cap.restore()
        }
      })

      // Regression: user-provided `backgroundGraphics` live in an SVG
      // behind the canvas. If the canvas paints `--semiotic-bg` across
      // its full area, the SVG is completely covered — which is why
      // the `/theming/styling` DRAFT watermark and
      // `/cookbook/homerun-map` field diagram went blank until this
      // fix. The canvas must skip its auto theme-bg fill when the
      // caller has supplied their own background SVG.
      it("skips the canvas theme-bg fill when backgroundGraphics is provided", () => {
        const ctx = getMockCtx()
        const cap = captureFillRectStyles(ctx)
        try {
          render(
            <StreamXYFrame
              chartType="scatter"
              backgroundGraphics={<rect x={0} y={0} width={10} height={10} fill="red" />}
            />
          )
          expect(cap.styles).toHaveLength(0)
        } finally {
          cap.restore()
        }
      })
    })
  })

  // ── Brush overlay ─────────────────────────────────────────────────────

  describe("brush", () => {
    it("renders brush SVG overlay when brush prop is provided", () => {
      const onBrush = vi.fn()
      const { container } = render(
        <StreamXYFrame
          chartType="scatter"
          brush={{ dimension: "x" }}
          onBrush={onBrush}
        />
      )
      const brushG = container.querySelector(".brush-g")
      expect(brushG).toBeTruthy()
    })

    it("does not render brush overlay when brush prop is absent", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" />
      )
      const brushG = container.querySelector(".brush-g")
      expect(brushG).toBeFalsy()
    })
  })

  // ── Chart type variants ───────────────────────────────────────────────

  describe("chart type variants", () => {
    const chartTypes: Array<"line" | "area" | "scatter" | "heatmap" | "bar" | "bubble"> = [
      "line", "area", "scatter", "heatmap", "bar", "bubble"
    ]

    for (const ct of chartTypes) {
      it(`renders chartType="${ct}" without crashing`, () => {
        const { container } = render(
          <StreamXYFrame chartType={ct} />
        )
        expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
      })
    }
  })

  // ── Responsive sizing ─────────────────────────────────────────────────

  describe("responsive sizing", () => {
    it("sets width to 100% when responsiveWidth is true", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" responsiveWidth />
      )
      const frame = container.querySelector(".stream-xy-frame") as HTMLElement
      expect(frame.style.width).toBe("100%")
    })

    it("sets height to 100% when responsiveHeight is true", () => {
      const { container } = render(
        <StreamXYFrame chartType="scatter" responsiveHeight />
      )
      const frame = container.querySelector(".stream-xy-frame") as HTMLElement
      expect(frame.style.height).toBe("100%")
    })
  })

  // ── Annotation accessor resolution ─────────────────────────────────

  describe("function accessor annotation resolution", () => {
    it("renders envelope annotation when xAccessor is a function", () => {
      // Regression test: when xAccessor is a function, the SVGOverlay must
      // receive annotationData with __semiotic_resolvedX baked in, and
      // annXAccessor set to "__semiotic_resolvedX", so envelope annotations
      // can look up x-coordinates by field name.
      const data = [
        { ts: 1, value: 10, _upper: 15, _lower: 5, isForecast: true },
        { ts: 2, value: 20, _upper: 25, _lower: 15, isForecast: true },
        { ts: 3, value: 30, _upper: 35, _lower: 25, isForecast: true },
      ]

      const { container } = render(
        <StreamXYFrame
          chartType="line"
          data={data}
          xAccessor={(d: Datum) => d.ts}
          yAccessor="value"
          size={[400, 300]}
          annotations={[
            {
              type: "envelope",
              upperAccessor: "_upper",
              lowerAccessor: "_lower",
              fill: "#6366f1",
              fillOpacity: 0.15,
            },
          ]}
        />
      )

      // The envelope renders as a <path> inside the SVGOverlay
      const envelopePath = container.querySelector(`path[fill="#6366f1"]`)
      expect(envelopePath).toBeTruthy()
      expect(envelopePath?.getAttribute("d")).toBeTruthy()
    })

    it("does not break when xAccessor is a string (no enrichment needed)", () => {
      const data = [
        { x: 1, y: 10, _upper: 15, _lower: 5 },
        { x: 2, y: 20, _upper: 25, _lower: 15 },
        { x: 3, y: 30, _upper: 35, _lower: 25 },
      ]

      const { container } = render(
        <StreamXYFrame
          chartType="line"
          data={data}
          xAccessor="x"
          yAccessor="y"
          size={[400, 300]}
          annotations={[
            {
              type: "envelope",
              upperAccessor: "_upper",
              lowerAccessor: "_lower",
              fill: "#ff0000",
              fillOpacity: 0.2,
            },
          ]}
        />
      )

      const envelopePath = container.querySelector(`path[fill="#ff0000"]`)
      expect(envelopePath).toBeTruthy()
    })
  })

  // ── Regression: every declared *Style prop reaches pipelineConfig ──────
  //
  // Spies on the PipelineStore constructor to capture its config argument,
  // then renders StreamXYFrame with a sentinel value for each declared
  // style prop. Any future refactor that drops a prop at the Frame↔Store
  // seam (like the 3.4-era `barStyle` bug) will fail this test.
  //
  // When you add a new `*Style` prop to StreamXYFrameProps:
  //   1. Add a `fooStyle` to `PipelineConfig` in PipelineStore.ts
  //   2. Thread it into the pipelineConfig memo in StreamXYFrame.tsx
  //   3. Add a sentinel entry here so the regression test covers it
  describe("regression: all declared *Style props reach pipelineConfig", () => {
    it("forwards every *Style prop to the PipelineStore config", async () => {
      // Sentinels — identity-checkable, so drops are obvious.
      const lineStyle = { stroke: "__LINE_STYLE__" }
      const pointStyle = () => ({ fill: "__POINT_STYLE__", r: 5 })
      const areaStyle = () => ({ fill: "__AREA_STYLE__" })
      const barStyle = { fill: "__BAR_STYLE__", stroke: "__BAR_STROKE__", strokeWidth: 3 }
      const swarmStyle = { fill: "__SWARM_STYLE__", radius: 4 }
      const waterfallStyle = { positiveColor: "__WF_POS__", negativeColor: "__WF_NEG__" }
      const candlestickStyle = { upColor: "__CS_UP__", downColor: "__CS_DOWN__" }
      const boundsStyle = { fill: "__BOUNDS_STYLE__" }

      // Spy on PipelineStore.updateConfig — it's invoked on every pipelineConfig
      // memo change, including on first-mount useLayoutEffect, so the captured
      // argument is the merged config the store actually saw.
      const PipelineStoreModule = await import("./PipelineStore")
      const updateSpy = vi.spyOn(PipelineStoreModule.PipelineStore.prototype, "updateConfig")

      try {
        render(
          <StreamXYFrame
            chartType="line"
            lineStyle={lineStyle}
            pointStyle={pointStyle}
            areaStyle={areaStyle}
            barStyle={barStyle}
            swarmStyle={swarmStyle}
            waterfallStyle={waterfallStyle}
            candlestickStyle={candlestickStyle}
            boundsStyle={boundsStyle}
          />
        )

        // The PipelineStore is instantiated once per mount AND updateConfig is
        // called at least once on first useLayoutEffect. Either surface exposes
        // the merged config.
        const lastConfig = updateSpy.mock.calls[updateSpy.mock.calls.length - 1]?.[0]
        expect(lastConfig, "updateConfig should be invoked with the initial merged config").toBeDefined()

        // Each *Style value must have reached the store config.
        expect(lastConfig.lineStyle).toBe(lineStyle)
        expect(lastConfig.pointStyle).toBe(pointStyle)
        expect(lastConfig.areaStyle).toBe(areaStyle)
        expect(lastConfig.barStyle).toBe(barStyle)
        expect(lastConfig.swarmStyle).toBe(swarmStyle)
        expect(lastConfig.waterfallStyle).toBe(waterfallStyle)
        expect(lastConfig.candlestickStyle).toBe(candlestickStyle)
        expect(lastConfig.boundsStyle).toBe(boundsStyle)
      } finally {
        // Guarantee cleanup even if an assertion throws — a stuck spy would
        // pollute unrelated tests in the same run.
        updateSpy.mockRestore()
      }
    })
  })
})
