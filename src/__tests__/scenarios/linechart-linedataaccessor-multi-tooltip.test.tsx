/**
 * Regression: LineChart's line-object input (`lineDataAccessor`) combined
 * with `tooltip="multi"`.
 *
 * A review flagged that this combination has "zero real test coverage" —
 * the only existing spec (callback-wiring.test.tsx, "tooltip='multi' on
 * LineChart") mocks StreamXYFrame entirely and only asserts the render
 * doesn't throw; it never simulates a hover or checks that `allSeries`
 * is populated, and it uses flat rows + `lineBy`, not `lineDataAccessor`.
 *
 * This test renders LineChart with real (unmocked) StreamXYFrame, feeds it
 * line-object data via `lineDataAccessor`, simulates a real mouse move, and
 * asserts the multi-tooltip hover payload actually contains both series.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { render, act, fireEvent } from "@testing-library/react"
import { LineChart } from "../../components/charts/xy/LineChart"
import type { HoverData } from "../../components/realtime/types"
import { setupCanvasMock } from "../../test-utils/canvasMock"

const resizeObserverGlobal = globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }
if (typeof resizeObserverGlobal.ResizeObserver === "undefined") {
  resizeObserverGlobal.ResizeObserver = class {
    constructor(_callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver
}

describe("LineChart: lineDataAccessor + tooltip=\"multi\"", () => {
  let restoreCanvasContext: () => void

  beforeEach(() => {
    restoreCanvasContext = setupCanvasMock()
  })

  afterEach(() => {
    restoreCanvasContext()
  })

  it("populates allSeries on hover for line-object input", async () => {
    let lastHover: HoverData | null = null

    const lineObjectData = [
      {
        series: "A",
        // LineChart reads x/y from the point objects below. Keeping them on
        // the outer type too makes the accessor contract explicit to TS.
        x: 0,
        y: 0,
        points: [
          { x: 0, y: 10 },
          { x: 10, y: 30 },
        ],
      },
      {
        series: "B",
        x: 0,
        y: 0,
        points: [
          { x: 0, y: 5 },
          { x: 10, y: 15 },
        ],
      },
    ]

    const { container } = render(
      <LineChart
        data={lineObjectData}
        lineDataAccessor="points"
        xAccessor="x"
        yAccessor="y"
        lineBy="series"
        tooltip="multi"
        showLegend={false}
        xExtent={[0, 10]}
        yExtent={[0, 30]}
        width={200}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        frameProps={{
          showAxes: false,
          customHoverBehavior: (hover) => {
            lastHover = hover
          },
        }}
      />
    )

    await act(async () => { await Promise.resolve() })

    const hoverTarget = container.querySelector(".stream-xy-frame > div[role='img']")!
    fireEvent.mouseMove(hoverTarget, { clientX: 100, clientY: 50 })

    // The callback mutates this value outside TypeScript's synchronous
    // control-flow analysis; retain its declared nullable HoverData shape.
    const hover = lastHover as HoverData | null
    if (!hover) throw new Error("Expected a multi-series hover payload")
    expect(hover.allSeries).toBeDefined()
    expect((hover.allSeries as unknown[]).length).toBe(2)

    const valuesByGroup = Object.fromEntries(
      (hover.allSeries as Array<{ group: string; value: number }>).map(
        (s) => [s.group, s.value]
      )
    )
    expect(valuesByGroup.A).toBeCloseTo(20)
    expect(valuesByGroup.B).toBeCloseTo(10)
  })

  it("renders a custom multi tooltip's series rows on hover via tooltip={{ mode: 'multi', content }}", async () => {
    // Regression (reported downstream by Iris): with multi mode a *custom*
    // tooltip function used to receive a datum with no `allSeries`, because
    // `normalizeTooltip` unwrapped the hover root down to `.data`. First-class
    // `tooltip={{ mode: "multi", content }}` enables multi hover and preserves
    // allSeries on the unwrapped datum — no frameProps.tooltipMode needed.
    const flatData = [
      { series: "A", x: 0, y: 10 },
      { series: "A", x: 10, y: 30 },
      { series: "B", x: 0, y: 5 },
      { series: "B", x: 10, y: 15 },
    ]

    const { container } = render(
      <LineChart
        data={flatData}
        xAccessor="x"
        yAccessor="y"
        lineBy="series"
        tooltip={{
          mode: "multi",
          content: (d: Record<string, unknown>) => {
            const all = d.allSeries as Array<{ group: string; value: number }> | undefined
            if (!all) return <div data-testid="rows">NO_SERIES</div>
            return (
              <div data-testid="rows">
                {all.map(s => `${s.group}=${Math.round(s.value)}`).join(" ")}
              </div>
            )
          },
        }}
        showLegend={false}
        xExtent={[0, 10]}
        yExtent={[0, 30]}
        width={200}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        frameProps={{ showAxes: false }}
      />
    )

    await act(async () => { await Promise.resolve() })

    const hoverTarget = container.querySelector(".stream-xy-frame > div[role='img']")!
    fireEvent.mouseMove(hoverTarget, { clientX: 100, clientY: 50 })

    await act(async () => { await Promise.resolve() })

    const rows = container.querySelector("[data-testid='rows']")
    expect(rows).not.toBeNull()
    expect(rows!.textContent).not.toContain("NO_SERIES")
    expect(rows!.textContent).toContain("A=20")
    expect(rows!.textContent).toContain("B=10")
  })
})
