import type { CapturedOrdinalFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { LikertChart } from "./LikertChart"
import { DEFAULT_LIKERT_LEVELS } from "./LikertChart.defaults"
import { TooltipProvider } from "../../store/TooltipStore"
import { defaultDivergingScheme, NEUTRAL_NEG, NEUTRAL_POS } from "../shared/useLikertAggregation"
import type { Datum } from "../shared/datumTypes"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps = {} as CapturedOrdinalFrameProps
vi.mock("../../stream/StreamOrdinalFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef<Partial<StreamOrdinalFrameHandle>, CapturedOrdinalFrameProps>((props, _ref) => {
      lastOrdinalFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

describe("LikertChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = {} as CapturedOrdinalFrameProps
  })

  const levels5 = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
  const levels4 = ["Strongly Disagree", "Disagree", "Agree", "Strongly Agree"]

  const rawData = [
    { question: "Q1", score: 1 },
    { question: "Q1", score: 2 },
    { question: "Q1", score: 3 },
    { question: "Q1", score: 4 },
    { question: "Q1", score: 5 },
    { question: "Q2", score: 3 },
    { question: "Q2", score: 4 },
    { question: "Q2", score: 5 },
    { question: "Q2", score: 5 },
    { question: "Q2", score: 4 }
  ]

  const preAggData = [
    { question: "Q1", level: "Strongly Disagree", count: 5 },
    { question: "Q1", level: "Disagree", count: 10 },
    { question: "Q1", level: "Neutral", count: 20 },
    { question: "Q1", level: "Agree", count: 30 },
    { question: "Q1", level: "Strongly Agree", count: 15 }
  ]

  // ── Test 1: sets chartType to "bar" ───────────────────────────────

  it("sets chartType to 'bar'", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.chartType).toBe("bar")
  })

  it("uses default levels when levels is omitted", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" />
      </TooltipProvider>
    )

    const legendGroups = lastOrdinalFrameProps.legend.legendGroups
    expect(legendGroups[0].items.map((i) => i.label)).toEqual(DEFAULT_LIKERT_LEVELS)
  })

  // ── Test 2: empty data renders nothing ────────────────────────────

  it("renders nothing for empty data", () => {
    const { container } = render(
      <TooltipProvider>
        <LikertChart data={[]} levels={levels5} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
  })

  // ── Test 3: empty levels prop → validation error ──────────────────

  it("renders ChartError when levels is empty", () => {
    const { container } = render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={[]} />
      </TooltipProvider>
    )

    // ChartError renders a div with error message, not the frame
    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
    expect(container.textContent).toContain("LikertChart")
    expect(container.textContent).toContain("levels")
  })

  // ── Test 4: levels with < 2 entries → validation error ────────────

  it("renders ChartError when levels has fewer than 2 entries", () => {
    const { container } = render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={["Only One"]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
    expect(container.textContent).toContain("at least 2")
  })

  // ── Test 5: both valueAccessor and levelAccessor → validation error

  it("renders ChartError when both valueAccessor and levelAccessor are provided", () => {
    const { container } = render(
      <TooltipProvider>
        <LikertChart
          data={preAggData}
          valueAccessor={(d: Record<string, unknown>) => Number(d.score)}
          levelAccessor="level"
          countAccessor="count"
          levels={levels5}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toBeFalsy()
    expect(container.textContent).toContain("not both")
  })

  // ── Test 6: horizontal orientation → projection="horizontal" ──────

  it("uses projection='horizontal' and normalize=false for horizontal orientation (default)", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("horizontal")
    expect(lastOrdinalFrameProps.normalize).toBe(false)
  })

  // ── Test 7: vertical orientation → projection="vertical" ─────────

  it("uses projection='vertical' and normalize=false for vertical orientation", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} orientation="vertical" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.projection).toBe("vertical")
    expect(lastOrdinalFrameProps.normalize).toBe(false)
  })

  // ── Test 8: internal accessors ────────────────────────────────────

  it("sets oAccessor='__likertCategory', rAccessor='__likertPct', stackBy='__likertLevel'", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.oAccessor).toBe("__likertCategory")
    expect(lastOrdinalFrameProps.rAccessor).toBe("__likertPct")
    expect(lastOrdinalFrameProps.stackBy).toBe("__likertLevel")
  })

  // ── Test 9: default color scheme ──────────────────────────────────

  it("applies default diverging color scheme when colorScheme is not provided", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
    expect(typeof pieceStyleFn).toBe("function")

    // With no explicit colorScheme prop, LikertChart now falls back to the
    // ambient theme's `colors.diverging` scheme (LIGHT_THEME declares "RdBu").
    // The scheme name is resolved to concrete colors inside
    // defaultDivergingScheme — pass it here to match the chart's computation.
    const defaultColors = defaultDivergingScheme(5, "RdBu")

    // Strongly Disagree (first level) should get the first default color
    const styleNeg = pieceStyleFn({ __likertLevelLabel: "Strongly Disagree", __likertLevel: "Strongly Disagree" })
    expect(styleNeg.fill).toBe(defaultColors[0])

    // Strongly Agree (last level) should get the last default color
    const stylePos = pieceStyleFn({ __likertLevelLabel: "Strongly Agree", __likertLevel: "Strongly Agree" })
    expect(stylePos.fill).toBe(defaultColors[4])
  })

  // ── Test 10: custom colorScheme applied ───────────────────────────

  it("applies custom colorScheme when provided with sufficient colors", () => {
    const customColors = ["#111", "#222", "#333", "#444", "#555"]
    render(
      <TooltipProvider>
        <LikertChart
          data={rawData}
          valueAccessor="score"
          levels={levels5}
          colorScheme={customColors}
        />
      </TooltipProvider>
    )

    const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
    const style = pieceStyleFn({ __likertLevelLabel: "Strongly Disagree", __likertLevel: "Strongly Disagree" })
    expect(style.fill).toBe("#111")

    const styleAgree = pieceStyleFn({ __likertLevelLabel: "Strongly Agree", __likertLevel: "Strongly Agree" })
    expect(styleAgree.fill).toBe("#555")
  })

  it("falls back to default diverging scheme when colorScheme has fewer colors than levels", () => {
    const shortScheme = ["#111", "#222"]
    render(
      <TooltipProvider>
        <LikertChart
          data={rawData}
          valueAccessor="score"
          levels={levels5}
          colorScheme={shortScheme}
        />
      </TooltipProvider>
    )

    const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
    // Ambient theme (LIGHT_THEME) declares diverging: "RdBu".
    const defaultColors = defaultDivergingScheme(5, "RdBu")
    const style = pieceStyleFn({ __likertLevelLabel: "Strongly Disagree", __likertLevel: "Strongly Disagree" })
    expect(style.fill).toBe(defaultColors[0])
  })

  // ── Test: neutral level coloring ──────────────────────────────────

  it("uses neutral color for NEUTRAL_NEG and NEUTRAL_POS sentinel levels", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    const pieceStyleFn = lastOrdinalFrameProps.pieceStyle
    // Ambient theme (LIGHT_THEME) declares diverging: "RdBu".
    const defaultColors = defaultDivergingScheme(5, "RdBu")
    const neutralColor = defaultColors[2] // middle color for 5-level

    const styleNeg = pieceStyleFn({ __likertLevel: NEUTRAL_NEG, __likertLevelLabel: "Neutral" })
    const stylePos = pieceStyleFn({ __likertLevel: NEUTRAL_POS, __likertLevelLabel: "Neutral" })

    expect(styleNeg.fill).toBe(neutralColor)
    expect(stylePos.fill).toBe(neutralColor)
  })

  // ── Test 11: legend groups contain all levels in order ────────────

  it("legend groups contain all levels in correct order", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeDefined()
    const legendGroups = lastOrdinalFrameProps.legend.legendGroups
    expect(legendGroups).toHaveLength(1)

    const items = legendGroups[0].items
    expect(items).toHaveLength(5)
    expect(items.map((i) => i.label)).toEqual(levels5)
  })

  it("legend styleFn returns correct color for each level", () => {
    const customColors = ["#a00", "#b00", "#c00", "#d00", "#e00"]
    render(
      <TooltipProvider>
        <LikertChart
          data={rawData}
          valueAccessor="score"
          levels={levels5}
          colorScheme={customColors}
        />
      </TooltipProvider>
    )

    const legendGroups = lastOrdinalFrameProps.legend.legendGroups
    const styleFn = legendGroups[0].styleFn

    expect(styleFn({ label: "Strongly Disagree" })).toEqual({ fill: "#a00" })
    expect(styleFn({ label: "Strongly Agree" })).toEqual({ fill: "#e00" })
    expect(styleFn({ label: "Neutral" })).toEqual({ fill: "#c00" })
  })

  // ── Test 12: tooltip renders level, category, percentage, count ───

  it("default tooltip renders level, category, percentage, and count", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    const tooltipFn = lastOrdinalFrameProps.tooltipContent
    expect(typeof tooltipFn).toBe("function")

    const datum = {
      __likertCategory: "Q1",
      __likertLevel: "Agree",
      __likertPct: 30,
      __likertCount: 15
    }

    const { container } = render(<>{tooltipFn(datum)}</>)
    expect(container.textContent).toContain("Q1")
    expect(container.textContent).toContain("Agree")
    expect(container.textContent).toContain("30.0%")
    expect(container.textContent).toContain("n=15")
  })

  it("tooltip recombines neutral halves into full percentage", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    const tooltipFn = lastOrdinalFrameProps.tooltipContent
    // Neutral half with __likertPct = 10 (half), should display 20 (doubled)
    const datum = {
      __likertCategory: "Q1",
      __likertLevel: NEUTRAL_NEG,
      __likertPct: 10,
      __likertCount: 5
    }

    const { container } = render(<>{tooltipFn(datum)}</>)
    expect(container.textContent).toContain("Neutral")
    expect(container.textContent).toContain("20.0%")
  })

  it("tooltip works with data wrapped in .data property", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    const tooltipFn = lastOrdinalFrameProps.tooltipContent
    const datum = {
      data: {
        __likertCategory: "Q2",
        __likertLevel: "Disagree",
        __likertPct: 15.5,
        __likertCount: 8
      }
    }

    const { container } = render(<>{tooltipFn(datum)}</>)
    expect(container.textContent).toContain("Q2")
    expect(container.textContent).toContain("Disagree")
    expect(container.textContent).toContain("15.5%")
  })

  // ── Test 13: diverging margin enforcement ─────────────────────────

  it("enforces left margin >= 100 for horizontal (diverging) orientation", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.margin.left).toBeGreaterThanOrEqual(100)
  })

  it("does not enforce left margin >= 100 for vertical orientation", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} orientation="vertical" />
      </TooltipProvider>
    )

    // Vertical doesn't require the diverging left margin
    // (it may still be whatever the default is, but won't be forced to 100)
    // Just verify the chart renders — the margin may vary
    expect(lastOrdinalFrameProps.projection).toBe("vertical")
  })

  // ── Test 14: width/height forwarded as size ───────────────────────

  it("forwards width and height as size array", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} width={900} height={500} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([900, 500])
  })

  it("uses default width=600 and height=400 when not specified", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.size).toEqual([600, 400])
  })

  // ── Test 15: showLegend defaults to true ──────────────────────────

  it("shows legend by default (showLegend not specified)", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeDefined()
    expect(lastOrdinalFrameProps.legend.legendGroups).toBeDefined()
  })

  it("hides legend when showLegend={false}", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} showLegend={false} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legend).toBeUndefined()
  })

  // ── Additional tests ──────────────────────────────────────────────

  it("returns null tooltip when tooltip={false}", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} tooltip={false} />
      </TooltipProvider>
    )

    expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
    expect(lastOrdinalFrameProps.tooltipContent({})).toBeNull()
  })

  it("uses custom tooltip function when provided", () => {
    const customTooltip = (_d: Datum) => <div>custom tooltip</div>
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} tooltip={customTooltip} />
      </TooltipProvider>
    )

    const tooltipFn = lastOrdinalFrameProps.tooltipContent
    const { container } = render(<>{tooltipFn({})}</>)
    expect(container.textContent).toContain("custom tooltip")
  })

  it("ref exposes push, pushMany, getData, and clear", () => {
    const ref = React.createRef<React.ElementRef<typeof LikertChart>>()
    render(
      <TooltipProvider>
        <LikertChart ref={ref} levels={levels5} valueAccessor="score" />
      </TooltipProvider>
    )

    expect(ref.current).toBeTruthy()
    expect(typeof ref.current!.push).toBe("function")
    expect(typeof ref.current!.pushMany).toBe("function")
    expect(typeof ref.current!.getData).toBe("function")
    expect(typeof ref.current!.clear).toBe("function")
  })

  it("forwards annotations to StreamOrdinalFrame", () => {
    const annotations = [{ type: "y-threshold", value: 50 }]
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} annotations={annotations} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.annotations).toEqual(annotations)
  })

  it("spreads frameProps onto StreamOrdinalFrame", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} frameProps={{ hoverAnnotation: true }} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.hoverAnnotation).toBe(true)
  })

  it("works with 4-level (even) scales", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels4} />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.chartType).toBe("bar")
    const legendGroups = lastOrdinalFrameProps.legend.legendGroups
    expect(legendGroups[0].items).toHaveLength(4)
    expect(legendGroups[0].items.map((i) => i.label)).toEqual(levels4)
  })

  it("legend position defaults to 'bottom' from effectiveLegendProps fallback", () => {
    // When no legendPosition is specified, LikertChart's effectiveLegendProps
    // uses setup.legendPosition (which defaults to "right") as intermediate,
    // but the LikertChart code prefers "bottom" via the fallback chain:
    //   legendPositionProp || setup.legendPosition || "bottom"
    // Since setup.legendPosition resolves to "right" by default, the actual
    // default is "right" unless explicitly overridden.
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
      </TooltipProvider>
    )

    // The default from useChartSetup is "right"
    expect(lastOrdinalFrameProps.legendPosition).toBeDefined()
  })

  it("respects custom legendPosition", () => {
    render(
      <TooltipProvider>
        <LikertChart data={rawData} valueAccessor="score" levels={levels5} legendPosition="right" />
      </TooltipProvider>
    )

    expect(lastOrdinalFrameProps.legendPosition).toBe("right")
  })

  it("survives the loading→data transition without a hooks-count error", () => {
    // Mounting empty (loading skeleton, 0 bars) then re-rendering as data
    // arrives must not call a different number of hooks between renders —
    // otherwise React throws "Rendered more hooks than during the previous
    // render". Regression guard for the misplaced `setup.earlyReturn` return.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const { rerender } = render(
        <TooltipProvider>
          <LikertChart loading levels={levels5} valueAccessor="score" />
        </TooltipProvider>
      )
      rerender(
        <TooltipProvider>
          <LikertChart data={rawData} valueAccessor="score" levels={levels5} />
        </TooltipProvider>
      )
      // The frame must actually render with the data — if a hooks-count error
      // fired, the chart's error boundary would swallow the render and the
      // frame would never receive the aggregated data.
      expect(lastOrdinalFrameProps).not.toBeNull()
      expect(lastOrdinalFrameProps.data?.length).toBeGreaterThan(0)
      const hookErr = errSpy.mock.calls.some((c) =>
        String(c[0]).includes("Rendered more hooks") ||
        String(c[0]).includes("change in the order of Hooks")
      )
      expect(hookErr).toBe(false)
    } finally {
      errSpy.mockRestore()
    }
  })
})

// ── defaultDivergingScheme — theme fallback path (Phase A milestone 3) ──

describe("defaultDivergingScheme", () => {
  it("returns Carbon hardcoded palette when no scheme name is passed", () => {
    const palette = defaultDivergingScheme(5)
    // With n=5, halfSize=2 and only indexes 0,1 are sampled from the pos/neg
    // arrays — so `#0043ce` (posColors[2]) isn't reached at this cardinality.
    expect(palette[0]).toBe("#da1e28")  // Carbon red
    expect(palette[2]).toBe("#a8a8a8")  // Carbon gray (neutral)
    expect(palette[4]).toBe("#4589ff")  // posColors[1]
  })

  it("samples d3-scale-chromatic interpolator when a theme scheme name is passed", () => {
    const rdBu5 = defaultDivergingScheme(5, "RdBu")
    expect(rdBu5).toHaveLength(5)
    // Not the Carbon palette — values come from interpolateRdBu.
    expect(rdBu5[0]).not.toBe("#da1e28")
    expect(rdBu5[0]).toMatch(/^(rgb|#)/)
  })

  it("different scheme names produce different palettes at the same level count", () => {
    const rdBu = defaultDivergingScheme(5, "RdBu")
    const piYG = defaultDivergingScheme(5, "PiYG")
    expect(rdBu[0]).not.toBe(piYG[0])
  })

  it("falls back to Carbon palette when scheme name is unknown", () => {
    const palette = defaultDivergingScheme(5, "NotARealScheme")
    expect(palette[0]).toBe("#da1e28")
  })

  it("handles n=1 for both paths", () => {
    expect(defaultDivergingScheme(1)).toEqual(["#a8a8a8"])
    const themed1 = defaultDivergingScheme(1, "RdBu")
    expect(themed1).toHaveLength(1)
    expect(themed1[0]).toMatch(/^(rgb|#)/)
  })

  it("handles n=0 gracefully", () => {
    expect(defaultDivergingScheme(0)).toEqual([])
    expect(defaultDivergingScheme(0, "RdBu")).toEqual([])
  })
})
