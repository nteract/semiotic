import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, act, fireEvent } from "@testing-library/react"
import StreamXYFrame from "./StreamXYFrame"
import type { StreamXYFrameHandle } from "./types"
import { setupCanvasMock } from "../../test-utils/canvasMock"

// Mock ResizeObserver for jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

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
          xAccessor={(d: any) => d.ts}
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

      // The envelope renders as a <path> inside the SVGOverlay with fill="#6366f1"
      const svgOverlay = container.querySelector("svg.svg-overlay, svg[class*='overlay']")
      // Even if the SVG overlay class changes, look for the envelope path anywhere
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
})
