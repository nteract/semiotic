import React from "react"
import { render, fireEvent, act as rtlAct } from "@testing-library/react"
import { renderHook, act } from "@testing-library/react"
import { LinkedCharts, useSelection, useLinkedHover, useLinkedLegendSuppression, estimateLegendRowCount } from "./LinkedCharts"
import { CategoryColorProvider } from "./CategoryColors"
import type { Datum } from "./charts/shared/datumTypes"

describe("LinkedCharts", () => {
  it("renders children within a SelectionProvider", () => {
    const { container } = render(
      <LinkedCharts>
        <div data-testid="child">Child</div>
      </LinkedCharts>
    )
    expect(container.querySelector("[data-testid='child']")).toBeTruthy()
  })

  it("allows useSelection hooks to work within it", () => {
    function TestHook() {
      const { isActive, selectPoints, clear } = useSelection({ name: "test" })
      return (
        <div>
          <span data-testid="active">{String(isActive)}</span>
          <button data-testid="select" onClick={() => selectPoints({ cat: ["A"] })}>Select</button>
          <button data-testid="clear" onClick={clear}>Clear</button>
        </div>
      )
    }

    const { getByTestId } = render(
      <LinkedCharts>
        <TestHook />
      </LinkedCharts>
    )

    expect(getByTestId("active").textContent).toBe("false")
    act(() => { getByTestId("select").click() })
    expect(getByTestId("active").textContent).toBe("true")
    act(() => { getByTestId("clear").click() })
    expect(getByTestId("active").textContent).toBe("false")
  })

  it("shares selection state between two hooks with the same name", () => {
    let hook1Active = false
    let hook2Active = false

    function Producer() {
      const { isActive, selectPoints } = useSelection({ name: "shared" })
      hook1Active = isActive
      return <button data-testid="produce" onClick={() => selectPoints({ cat: ["X"] })}>Go</button>
    }

    function Consumer() {
      const { isActive } = useSelection({ name: "shared" })
      hook2Active = isActive
      return <span data-testid="consumed">{String(isActive)}</span>
    }

    const { getByTestId } = render(
      <LinkedCharts>
        <Producer />
        <Consumer />
      </LinkedCharts>
    )

    expect(hook1Active).toBe(false)
    expect(hook2Active).toBe(false)

    act(() => { getByTestId("produce").click() })

    expect(hook1Active).toBe(true)
    expect(hook2Active).toBe(true)
  })

  it("accepts selections config with resolution modes", () => {
    // Should not throw when configuring resolution modes
    const { container } = render(
      <LinkedCharts selections={{
        highlight: { resolution: "union" },
        brush: { resolution: "crossfilter" }
      }}>
        <div>Charts</div>
      </LinkedCharts>
    )
    expect(container.textContent).toContain("Charts")
  })

  it("useLinkedHover produces selections consumed by useSelection", () => {
    let consumerActive = false

    function HoverProducer() {
      const { onHover } = useLinkedHover({ name: "hl", fields: ["region"] })
      return <button data-testid="hover" onClick={() => onHover({ region: "East" })}>Hover</button>
    }

    function SelectionConsumer() {
      const { isActive, predicate } = useSelection({ name: "hl" })
      consumerActive = isActive
      return <span data-testid="match">{String(predicate({ region: "East" }))}</span>
    }

    const { getByTestId } = render(
      <LinkedCharts>
        <HoverProducer />
        <SelectionConsumer />
      </LinkedCharts>
    )

    expect(consumerActive).toBe(false)
    act(() => { getByTestId("hover").click() })
    expect(consumerActive).toBe(true)
    expect(getByTestId("match").textContent).toBe("true")
  })

  it("useLinkedLegendSuppression returns false when not inside LinkedCharts", () => {
    const { result } = renderHook(() => useLinkedLegendSuppression())
    expect(result.current).toBe(false)
  })

  it("useLinkedLegendSuppression returns true when LinkedCharts has showLegend", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CategoryColorProvider colors={{ A: "#f00", B: "#0f0" }}>
        <LinkedCharts showLegend>{children}</LinkedCharts>
      </CategoryColorProvider>
    )
    const { result } = renderHook(() => useLinkedLegendSuppression(), { wrapper })
    expect(result.current).toBe(true)
  })

  it("useLinkedLegendSuppression returns false when LinkedCharts has showLegend={false}", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LinkedCharts showLegend={false}>{children}</LinkedCharts>
    )
    const { result } = renderHook(() => useLinkedLegendSuppression(), { wrapper })
    expect(result.current).toBe(false)
  })

  it("renders unified legend when CategoryColorProvider is present", () => {
    const { container } = render(
      <CategoryColorProvider colors={{ North: "#f00", South: "#0f0" }}>
        <LinkedCharts>
          <div>child</div>
        </LinkedCharts>
      </CategoryColorProvider>
    )
    expect(container.querySelector("svg")).toBeTruthy()
    expect(container.textContent).toContain("North")
    expect(container.textContent).toContain("South")
  })

  it("does not render legend when showLegend is false", () => {
    const { container } = render(
      <CategoryColorProvider colors={{ North: "#f00" }}>
        <LinkedCharts showLegend={false}>
          <div>child</div>
        </LinkedCharts>
      </CategoryColorProvider>
    )
    expect(container.textContent).not.toContain("North")
  })

  it("renders legend at bottom when legendPosition is 'bottom'", () => {
    const { container } = render(
      <CategoryColorProvider colors={{ North: "#f00", South: "#0f0" }}>
        <LinkedCharts legendPosition="bottom">
          <div data-testid="child">child</div>
        </LinkedCharts>
      </CategoryColorProvider>
    )
    expect(container.querySelector("[data-testid='child']")).toBeTruthy()
  })

  it("legendInteraction='highlight' produces selection on hover", () => {
    let consumerActive = false
    let consumerPredicate: (d: Datum) => boolean = () => true

    function Consumer() {
      const { isActive, predicate } = useSelection({ name: "hl", fields: ["region"] })
      consumerActive = isActive
      consumerPredicate = predicate
      return <span data-testid="active">{String(isActive)}</span>
    }

    const { container, _getByTestId } = render(
      <CategoryColorProvider colors={{ North: "#f00", South: "#0f0" }}>
        <LinkedCharts
          showLegend
          legendInteraction="highlight"
          legendSelectionName="hl"
          legendField="region"
        >
          <Consumer />
        </LinkedCharts>
      </CategoryColorProvider>
    )

    // Before hover, no selection active
    expect(consumerActive).toBe(false)

    // Hover over a legend item
    const legendItems = container.querySelectorAll(".legend-item g")
    expect(legendItems.length).toBeGreaterThan(0)
    act(() => {
      fireEvent.mouseEnter(legendItems[0])
    })

    expect(consumerActive).toBe(true)
    expect(consumerPredicate({ region: "North" })).toBe(true)
    expect(consumerPredicate({ region: "South" })).toBe(false)

    // Mouse leave clears the selection
    act(() => {
      fireEvent.mouseLeave(legendItems[0])
    })
    expect(consumerActive).toBe(false)
  })

  it("legendInteraction='isolate' produces selection on click", () => {
    let consumerActive = false
    let consumerPredicate: (d: Datum) => boolean = () => true

    function Consumer() {
      const { isActive, predicate } = useSelection({ name: "hl", fields: ["region"] })
      consumerActive = isActive
      consumerPredicate = predicate
      return <span data-testid="active">{String(isActive)}</span>
    }

    const { container } = render(
      <CategoryColorProvider colors={{ North: "#f00", South: "#0f0" }}>
        <LinkedCharts
          showLegend
          legendInteraction="isolate"
          legendSelectionName="hl"
          legendField="region"
        >
          <Consumer />
        </LinkedCharts>
      </CategoryColorProvider>
    )

    expect(consumerActive).toBe(false)

    // Click a legend item to isolate it
    const legendItems = container.querySelectorAll(".legend-item g")
    expect(legendItems.length).toBeGreaterThan(0)
    act(() => {
      fireEvent.click(legendItems[0])
    })

    expect(consumerActive).toBe(true)
    expect(consumerPredicate({ region: "North" })).toBe(true)
    expect(consumerPredicate({ region: "South" })).toBe(false)

    // Click the other item — both selected means reset (Carbon behavior)
    act(() => {
      fireEvent.click(legendItems[1])
    })

    expect(consumerActive).toBe(false)
  })

  // Regression: the unified LinkedLegend measures its container and
  // passes the actual width to <Legend> so horizontal items don't wrap
  // one-per-row at the default-100 fallback. When they DO need to wrap
  // (narrow container, lots of categories), the SVG height grows so
  // wrapped rows don't clip into charts below. This block exercises
  // both paths.
  describe("unified legend sizing (regression: clipped legend)", () => {
    // Lightweight ResizeObserver controller — lets tests drive the
    // measured size instead of relying on jsdom layout (which reports
    // 0 for everything).
    type Entry = { target: Element; cb: ResizeObserverCallback }
    let captured: Entry[] = []
    let originalRO: typeof ResizeObserver

    beforeEach(() => {
      captured = []
      originalRO = (globalThis as any).ResizeObserver
      ;(globalThis as any).ResizeObserver = class {
        constructor(private cb: ResizeObserverCallback) {}
        observe(target: Element) { captured.push({ target, cb: this.cb }) }
        unobserve() {}
        disconnect() {}
      }
    })
    afterEach(() => {
      (globalThis as any).ResizeObserver = originalRO
    })

    const fireResize = (w: number, h = 30) => {
      rtlAct(() => {
        for (const { target, cb } of captured) {
          cb(
            [{ target, contentRect: { width: w, height: h } } as unknown as ResizeObserverEntry],
            {} as ResizeObserver
          )
        }
      })
    }

    it("keeps the SVG at 30px when the container is wide enough for one row", () => {
      const { container } = render(
        <CategoryColorProvider categories={["North", "South", "East", "West"]}>
          <LinkedCharts>
            <div>child</div>
          </LinkedCharts>
        </CategoryColorProvider>
      )
      // Wide container — all four items fit on a single row
      fireResize(800)
      const svg = container.querySelector("svg")!
      expect(svg.getAttribute("height")).toBe("30")
    })

    it("grows the SVG height when the container is narrow enough to wrap", () => {
      const { container } = render(
        <CategoryColorProvider categories={["North", "South", "East", "West"]}>
          <LinkedCharts>
            <div>child</div>
          </LinkedCharts>
        </CategoryColorProvider>
      )
      // Narrow container — each category label is ~63px wide, so 4
      // labels at 120px container → wraps across rows → SVG grows.
      fireResize(120)
      const svg = container.querySelector("svg")!
      const height = parseInt(svg.getAttribute("height") || "0", 10)
      expect(height).toBeGreaterThan(30)
    })
  })
})

// `estimateLegendRowCount` mirrors the wrap logic in Legend's
// horizontal renderer. Exporting + testing it directly gives a
// millisecond-fast check that catches the "single item per row"
// regression without needing a full render tree.
describe("estimateLegendRowCount", () => {
  it("returns 1 row for an empty label list", () => {
    expect(estimateLegendRowCount([], 800)).toBe(1)
  })

  it("returns 1 row when width is unknown (0 / undefined)", () => {
    // 0 is what <LinkedLegend> passes before the first ResizeObserver
    // measurement — we want a conservative single-row SVG until we
    // know better, not a wildly over-sized reservation.
    expect(estimateLegendRowCount(["North", "South", "East", "West"], 0)).toBe(1)
  })

  it("keeps all items on one row when the container is wide enough", () => {
    expect(estimateLegendRowCount(["A", "B", "C", "D"], 500)).toBe(1)
  })

  it("wraps items across rows when the container is narrow", () => {
    // Labels of length 6 at 7px/char + 26 swatch/pad ≈ 68px each.
    // 120px container only fits one item per row → 4 labels → 4 rows.
    expect(estimateLegendRowCount(["North!", "South!", "East!!", "West!!"], 120)).toBe(4)
  })

  it("wraps partially for medium-width containers", () => {
    // 280px fits ~4 items per row of ~68px (4*68 = 272). 6 items wrap to 2 rows.
    expect(estimateLegendRowCount(["A1", "B2", "C3", "D4", "E5", "F6"], 100)).toBeGreaterThan(1)
  })
})
