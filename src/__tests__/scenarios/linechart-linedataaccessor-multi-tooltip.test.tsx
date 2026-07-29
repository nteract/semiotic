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
    let lastHover: Record<string, unknown> | undefined

    const lineObjectData = [
      {
        series: "A",
        points: [
          { x: 0, y: 10 },
          { x: 10, y: 30 },
        ],
      },
      {
        series: "B",
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
        xExtent={[0, 10]}
        yExtent={[0, 30]}
        width={200}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        showAxes={false}
        frameProps={{
          customHoverBehavior: (hover: Record<string, unknown>) => {
            lastHover = hover
          },
        }}
      />
    )

    await act(async () => { await Promise.resolve() })

    const hoverTarget = container.querySelector(".stream-xy-frame > div[role='img']")!
    fireEvent.mouseMove(hoverTarget, { clientX: 100, clientY: 50 })

    expect(lastHover).toBeDefined()
    expect(lastHover!.allSeries).toBeDefined()
    expect((lastHover!.allSeries as unknown[]).length).toBe(2)

    const valuesByGroup = Object.fromEntries(
      (lastHover!.allSeries as Array<{ group: string; value: number }>).map(
        (s) => [s.group, s.value]
      )
    )
    expect(valuesByGroup.A).toBeCloseTo(20)
    expect(valuesByGroup.B).toBeCloseTo(10)
  })

  it("renders a custom function tooltip's series rows on hover", async () => {
    // Regression (reported downstream by Iris): with `tooltip="multi"` a
    // *custom function* tooltip received a datum with no `allSeries`, because
    // `normalizeTooltip` unwrapped the hover root down to `.data`. The
    // tell-tale symptom was a tooltip header with no series rows. Semiotic's
    // own `MultiPointTooltip` was unaffected — it is wired as `tooltipContent`
    // directly and never passes through `normalizeTooltip`.
    //
    // `tooltip` carries either the string "multi" or a custom function, never
    // both, so multi mode plus a custom renderer is reached through
    // `frameProps.tooltipMode` — the shape the downstream report used.
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
        tooltip={(d: Record<string, unknown>) => {
          const all = d.allSeries as Array<{ group: string; value: number }> | undefined
          if (!all) return <div data-testid="rows">NO_SERIES</div>
          return (
            <div data-testid="rows">
              {all.map(s => `${s.group}=${Math.round(s.value)}`).join(" ")}
            </div>
          )
        }}
        xExtent={[0, 10]}
        yExtent={[0, 30]}
        width={200}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        showAxes={false}
        frameProps={{ tooltipMode: "multi" }}
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
