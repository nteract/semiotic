import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { DifferenceChart, computeDifferenceSegments, type DifferenceChartProps } from "./DifferenceChart"
import { TooltipProvider } from "../../store/TooltipStore"
import type { Datum } from "../shared/datumTypes"

// Mock StreamXYFrame to capture props
let lastXYFrameProps: any = null
vi.mock("../../stream/StreamXYFrame", () => {
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastXYFrameProps = props
      return <div className="stream-xy-frame"><svg /></div>
    }),
  }
})

beforeEach(() => {
  lastXYFrameProps = null
})

// ── Pure segment algorithm ──────────────────────────────────────────────
describe("computeDifferenceSegments", () => {
  const getX = (d: Datum) => d.x as number
  const getA = (d: Datum) => d.a as number
  const getB = (d: Datum) => d.b as number

  it("returns empty array for empty input", () => {
    expect(computeDifferenceSegments([], getX, getA, getB)).toEqual([])
  })

  it("single segment when A is always above B", () => {
    const rows = computeDifferenceSegments(
      [{ x: 0, a: 10, b: 5 }, { x: 1, a: 12, b: 6 }, { x: 2, a: 14, b: 7 }],
      getX, getA, getB,
    )
    expect(rows.length).toBe(3)
    const winners = new Set(rows.map(r => r.__diffWinner))
    expect(winners.size).toBe(1)
    expect(winners.has("A")).toBe(true)
    // Upper boundary should be A, lower should be B.
    expect(rows[0].__y).toBe(10)
    expect(rows[0].__y0).toBe(5)
    expect(rows[2].__y).toBe(14)
    expect(rows[2].__y0).toBe(7)
  })

  it("two segments around a single crossover with interpolated vertex", () => {
    // A=5,15 and B=10,8 cross between x=0 (B>A) and x=1 (A>B).
    // Solve: 5 + t*10 = 10 + t*(-2) → t = 5/12 ≈ 0.4167
    const rows = computeDifferenceSegments(
      [{ x: 0, a: 5, b: 10 }, { x: 1, a: 15, b: 8 }],
      getX, getA, getB,
    )
    // Expected: B-segment vertex at x=0, then TWO crossover vertices
    // (one closing the B segment, one opening the A segment) at the
    // same x, then A-segment vertex at x=1 → 4 rows total.
    expect(rows.length).toBe(4)
    expect(rows[0].__diffWinner).toBe("B")
    expect(rows[1].__diffWinner).toBe("B")
    expect(rows[2].__diffWinner).toBe("A")
    expect(rows[3].__diffWinner).toBe("A")
    // Closing-B and opening-A vertices share the same crossover x and y.
    expect(rows[1].__x).toBeCloseTo(rows[2].__x, 5)
    expect(rows[1].__y).toBeCloseTo(rows[2].__y, 5)
    // At a crossover the upper === lower (zero-width).
    expect(rows[1].__y).toBe(rows[1].__y0)
    expect(rows[2].__y).toBe(rows[2].__y0)
    // Crossover x in (0, 1)
    expect(rows[1].__x).toBeGreaterThan(0)
    expect(rows[1].__x).toBeLessThan(1)
  })

  it("skips non-finite rows", () => {
    const rows = computeDifferenceSegments(
      [
        { x: 0, a: 5, b: 3 },
        { x: 1, a: NaN, b: 4 },
        { x: 2, a: 8, b: 6 },
      ],
      getX, getA, getB,
    )
    // Two valid points; both have A>B so one segment, two vertices.
    expect(rows.length).toBe(2)
    expect(rows.every(r => r.__diffWinner === "A")).toBe(true)
  })

  it("sorts input by x before processing", () => {
    const rows = computeDifferenceSegments(
      [{ x: 2, a: 10, b: 5 }, { x: 0, a: 4, b: 6 }, { x: 1, a: 7, b: 7 }],
      getX, getA, getB,
    )
    // Sorted by x: (0,4,6) → B-win, (1,7,7) → tie, (2,10,5) → A-win.
    // First and last x reflect sorted order.
    expect(rows[0].__x).toBe(0)
    expect(rows[rows.length - 1].__x).toBe(2)
  })

  it("preserves source datum on non-crossover vertices", () => {
    const source = { x: 0, a: 10, b: 5, meta: "first" }
    const rows = computeDifferenceSegments([source], getX, getA, getB)
    expect(rows[0].__sourceDatum).toBe(source)
  })

  it("attaches valA/valB for tooltip lookup", () => {
    const rows = computeDifferenceSegments(
      [{ x: 0, a: 10, b: 5 }, { x: 1, a: 12, b: 8 }],
      getX, getA, getB,
    )
    expect(rows[0].__valA).toBe(10)
    expect(rows[0].__valB).toBe(5)
    expect(rows[1].__valA).toBe(12)
    expect(rows[1].__valB).toBe(8)
  })

  it("leading tie rows flush into the first real winner's segment", () => {
    // Regression: the previous algorithm defaulted `currentWinner` to
    // "A" on the very first tie row, then emitted the subsequent
    // (B-winning) row in the stale A segment with the wrong fill.
    const rows = computeDifferenceSegments(
      [
        { x: 0, a: 5,  b: 5 },   // tie
        { x: 1, a: 4,  b: 9 },   // B > A
        { x: 2, a: 3,  b: 12 },  // B > A
      ],
      getX, getA, getB,
    )
    // Expect a single B segment containing all three rows.
    const segKeys = new Set(rows.map(r => r.__diffSegment))
    expect(segKeys.size).toBe(1)
    expect([...segKeys][0]).toMatch(/-B$/)
    expect(rows.every(r => r.__diffWinner === "B")).toBe(true)
    // The leading tie is in the B segment as a zero-width vertex.
    const tieRow = rows.find(r => r.__x === 0)!
    expect(tieRow.__y).toBe(5)
    expect(tieRow.__y0).toBe(5)
  })

  it("multiple leading ties flush into the first non-tie segment", () => {
    const rows = computeDifferenceSegments(
      [
        { x: 0, a: 5, b: 5 },
        { x: 1, a: 6, b: 6 },
        { x: 2, a: 10, b: 4 },  // A > B (first real winner)
      ],
      getX, getA, getB,
    )
    const segKeys = new Set(rows.map(r => r.__diffSegment))
    expect(segKeys.size).toBe(1)
    expect([...segKeys][0]).toMatch(/-A$/)
    // All three rows in the A segment.
    expect(rows.map(r => r.__x).sort()).toEqual([0, 1, 2])
  })

  it("uses the tie row as the crossover when A→tie→B", () => {
    // Without tie-aware handling, the winner of the post-tie row would
    // be stale (the segment would keep the pre-tie winner) and/or the
    // crossover would land at a linear-interpolated x that ignores the
    // user-supplied zero-difference point. With it, the segment splits
    // AT the tie row, which is what the data actually says.
    const rows = computeDifferenceSegments(
      [
        { x: 0, a: 10, b: 5 },  // A > B
        { x: 2, a: 8,  b: 8 },  // tie
        { x: 3, a: 4,  b: 9 },  // B > A
      ],
      getX, getA, getB,
    )
    // Expect two segments split AT x=2 (the tie point).
    const segKeys = new Set(rows.map(r => r.__diffSegment))
    expect(segKeys.size).toBe(2)
    // The crossover vertices (close A, open B) sit at the tie's x=2,y=8.
    const crossovers = rows.filter(r => r.__x === 2 && r.__y === 8 && r.__y0 === 8)
    expect(crossovers.length).toBeGreaterThanOrEqual(2)
    // The post-tie row must be in the B segment (the new winner), not
    // stranded in the A segment.
    const postRow = rows.find(r => r.__x === 3)!
    expect(postRow.__diffWinner).toBe("B")
  })

  it("flushes a tie row into the current segment when winner does not change", () => {
    // A > B → tie → A > B: the tie sits inside one continuous A segment
    // (zero-width point), no new segment opens.
    const rows = computeDifferenceSegments(
      [
        { x: 0, a: 10, b: 5 },
        { x: 1, a: 8,  b: 8 },  // tie
        { x: 2, a: 12, b: 4 },
      ],
      getX, getA, getB,
    )
    const segKeys = new Set(rows.map(r => r.__diffSegment))
    expect(segKeys.size).toBe(1)
    expect([...segKeys][0]).toMatch(/-A$/)
    // The tie row is in the segment as a zero-width vertex.
    const tieRow = rows.find(r => r.__x === 1)!
    expect(tieRow.__y).toBe(8)
    expect(tieRow.__y0).toBe(8)
  })

  it("multi-tie run with winner switch splits at the first tie", () => {
    // A > B → tie, tie, tie → B > A. First tie is the segment boundary;
    // subsequent ties belong to the new (B) segment.
    const rows = computeDifferenceSegments(
      [
        { x: 0, a: 10, b: 5 },
        { x: 1, a: 8,  b: 8 },
        { x: 2, a: 7,  b: 7 },
        { x: 3, a: 6,  b: 6 },
        { x: 4, a: 4,  b: 9 },
      ],
      getX, getA, getB,
    )
    const segKeys = [...new Set(rows.map(r => r.__diffSegment))]
    expect(segKeys.length).toBe(2)
    // First-tie x=1 is the boundary: vertices at (1, 8) close A, open B.
    const aRows = rows.filter(r => r.__diffWinner === "A")
    const bRows = rows.filter(r => r.__diffWinner === "B")
    // A segment ends at x=1 (no later non-tie rows are A-winning).
    expect(Math.max(...aRows.map(r => r.__x))).toBe(1)
    // B segment opens at x=1 (the first tie) and includes the remaining
    // ties + the final non-tie row.
    expect(Math.min(...bRows.map(r => r.__x))).toBe(1)
    expect(bRows.some(r => r.__x === 2)).toBe(true)
    expect(bRows.some(r => r.__x === 3)).toBe(true)
    expect(bRows.some(r => r.__x === 4)).toBe(true)
  })

  it("non-finite-x rows don't scramble the sort of finite-x rows", () => {
    // Regression: `Array.sort` treats NaN-comparator returns as 0
    // (equal), so interleaving finite-x rows with non-finite-x rows
    // could leave the finite rows out of order. The filter-then-sort
    // path keeps the total ordering well-defined.
    const rows = computeDifferenceSegments(
      [
        { x: 5,   a: 10, b: 5 },   // valid, ends up last after sort
        { x: NaN, a: 10, b: 5 },   // invalid, dropped
        { x: 0,   a: 12, b: 4 },   // valid, ends up first after sort
        { x: 3,   a: 8,  b: 6 },   // valid, middle
      ],
      getX, getA, getB,
    )
    // Strip out crossover-only zero-width vertices (they share x/y
    // with neighbors); the source rows should be in ascending x order.
    const sourceXs = rows.filter(r => r.__sourceDatum).map(r => r.__x)
    // Three valid source rows in order.
    expect(sourceXs).toEqual([0, 3, 5])
  })

  it("detects a crossover that straddles a non-finite row", () => {
    // Earlier implementation compared against `sorted[i - 1]` even when
    // that row was non-finite — losing the crossover. The fix tracks the
    // last valid point. Data: A>B at x=0, gap at x=1 (NaN), B>A at x=2.
    const rows = computeDifferenceSegments(
      [
        { x: 0, a: 10, b: 5 },
        { x: 1, a: NaN, b: NaN },
        { x: 2, a: 4, b: 9 },
      ],
      getX, getA, getB,
    )
    // Expect the crossover between x=0 (A-winner) and x=2 (B-winner)
    // to produce both segments — the NaN row in between must not
    // suppress the segment break.
    const winners = new Set(rows.map(r => r.__diffWinner))
    expect(winners.has("A")).toBe(true)
    expect(winners.has("B")).toBe(true)
    // Two segment groups → ≥ 1 crossover-vertex pair emitted.
    const segKeys = new Set(rows.map(r => r.__diffSegment))
    expect(segKeys.size).toBe(2)
  })
})

// ── HOC prop forwarding ─────────────────────────────────────────────────
describe("DifferenceChart", () => {
  const sampleData = [
    { date: 0, actual: 50, forecast: 45 },
    { date: 1, actual: 52, forecast: 60 },
    { date: 2, actual: 70, forecast: 58 },
  ]

  it("sets chartType to 'mixed' for area+line composition", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.chartType).toBe("mixed")
  })

  it("forwards segmented data via __x/__y/__y0 accessors", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.xAccessor).toBe("__x")
    expect(lastXYFrameProps.yAccessor).toBe("__y")
    expect(lastXYFrameProps.y0Accessor).toBe("__y0")
    expect(lastXYFrameProps.groupAccessor).toBe("__diffSegment")
  })

  it("emits both area segment groups AND overlay line groups when showLines is true (default)", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
        />
      </TooltipProvider>
    )
    const segments = new Set(lastXYFrameProps.data.map((d: any) => d.__diffSegment))
    // At least the two overlay line groups
    expect(segments.has("line-A")).toBe(true)
    expect(segments.has("line-B")).toBe(true)
    // Plus area segment(s) — actual cross-over count depends on data
    const areaSegments = lastXYFrameProps.areaGroups
    expect(Array.isArray(areaSegments)).toBe(true)
    expect(areaSegments.length).toBeGreaterThan(0)
    // None of the line groups should be in areaGroups
    expect(areaSegments).not.toContain("line-A")
    expect(areaSegments).not.toContain("line-B")
  })

  it("omits overlay lines when showLines is false", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          showLines={false}
        />
      </TooltipProvider>
    )
    const segments = new Set(lastXYFrameProps.data.map((d: any) => d.__diffSegment))
    expect(segments.has("line-A")).toBe(false)
    expect(segments.has("line-B")).toBe(false)
  })

  it("areaStyle resolves color from the segment-key suffix", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          seriesAColor="#ff0000"
          seriesBColor="#0000ff"
        />
      </TooltipProvider>
    )
    const areaStyle = lastXYFrameProps.areaStyle
    expect(areaStyle({ __diffSegment: "seg-0-A" }).fill).toBe("#ff0000")
    expect(areaStyle({ __diffSegment: "seg-3-B" }).fill).toBe("#0000ff")
  })

  it("lineStyle resolves color from the line-key", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          seriesAColor="#ff0000"
          seriesBColor="#0000ff"
        />
      </TooltipProvider>
    )
    const lineStyle = lastXYFrameProps.lineStyle
    expect(lineStyle({ __diffSegment: "line-A" }).stroke).toBe("#ff0000")
    expect(lineStyle({ __diffSegment: "line-B" }).stroke).toBe("#0000ff")
  })

  it("forwards a custom legend with series labels", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          seriesALabel="Actual"
          seriesBLabel="Forecast"
        />
      </TooltipProvider>
    )
    const legend = lastXYFrameProps.legend
    expect(legend).toBeDefined()
    expect(legend.legendGroups[0].items[0].label).toBe("Actual")
    expect(legend.legendGroups[0].items[1].label).toBe("Forecast")
  })

  it("omits legend when showLegend is false", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          showLegend={false}
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.legend).toBeUndefined()
  })

  it("forwards gradientFill to the frame", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          gradientFill
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.gradientFill).toEqual({ topOpacity: 0.85, bottomOpacity: 0.15 })
  })

  it("forwards explicit gradientFill object unchanged", () => {
    const stops = { colorStops: [{ offset: 0, color: "#aaa" }, { offset: 1, color: "#fff" }] }
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          gradientFill={stops}
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.gradientFill).toEqual(stops)
  })

  it("forwards curve, xExtent, yExtent, annotations", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          curve="monotoneX"
          xExtent={[0, 10]}
          yExtent={[0, 100]}
          annotations={[{ type: "x-threshold", value: 1 }]}
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.curve).toBe("monotoneX")
    expect(lastXYFrameProps.xExtent).toEqual([0, 10])
    expect(lastXYFrameProps.yExtent).toEqual([0, 100])
    expect(lastXYFrameProps.annotations).toHaveLength(1)
  })

  it("forwards axisExtent to the frame", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          axisExtent="exact"
        />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.axisExtent).toBe("exact")
  })

  it("forwards pointStyle when showPoints is true", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={sampleData}
          xAccessor="date"
          seriesAAccessor="actual"
          seriesBAccessor="forecast"
          showPoints
        />
      </TooltipProvider>
    )
    expect(typeof lastXYFrameProps.pointStyle).toBe("function")
  })
})

// ── Push API ──────────────────────────────────────────────────────────
describe("DifferenceChart push API", () => {
  it("exposes push/pushMany/clear/getData via ref", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <DifferenceChart
          ref={ref}
          xAccessor="x"
          seriesAAccessor="a"
          seriesBAccessor="b"
        />
      </TooltipProvider>
    )
    expect(typeof ref.current.push).toBe("function")
    expect(typeof ref.current.pushMany).toBe("function")
    expect(typeof ref.current.clear).toBe("function")
    expect(typeof ref.current.getData).toBe("function")
  })

  it("push() updates the segmented data flowing to the frame", () => {
    const ref = React.createRef<any>()
    const { rerender } = render(
      <TooltipProvider>
        <DifferenceChart
          ref={ref}
          xAccessor="x"
          seriesAAccessor="a"
          seriesBAccessor="b"
        />
      </TooltipProvider>
    )
    // Push two rows where A > B at both points (one segment).
    ref.current.push({ x: 0, a: 10, b: 5 })
    ref.current.push({ x: 1, a: 12, b: 7 })
    rerender(
      <TooltipProvider>
        <DifferenceChart
          ref={ref}
          xAccessor="x"
          seriesAAccessor="a"
          seriesBAccessor="b"
        />
      </TooltipProvider>
    )
    // Frame should see both segment rows (2) + two line rows (2 each → 4).
    const segmentRows = lastXYFrameProps.data.filter((d: any) => d.__diffSegment.startsWith("seg-"))
    expect(segmentRows.length).toBe(2)
    expect(ref.current.getData().length).toBe(2)
  })

  it("clear() empties the push buffer", () => {
    const ref = React.createRef<any>()
    const { rerender } = render(
      <TooltipProvider>
        <DifferenceChart ref={ref} xAccessor="x" seriesAAccessor="a" seriesBAccessor="b" />
      </TooltipProvider>
    )
    ref.current.push({ x: 0, a: 10, b: 5 })
    ref.current.clear()
    rerender(
      <TooltipProvider>
        <DifferenceChart ref={ref} xAccessor="x" seriesAAccessor="a" seriesBAccessor="b" />
      </TooltipProvider>
    )
    expect(ref.current.getData()).toEqual([])
  })

  it("remove() returns the actually-removed records synchronously", () => {
    // Verifies the ref-backed path: results must be deterministic at
    // call time, not dependent on when React flushes the setState.
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <DifferenceChart
          ref={ref}
          xAccessor="x"
          seriesAAccessor="a"
          seriesBAccessor="b"
          pointIdAccessor="id"
        />
      </TooltipProvider>
    )
    ref.current.pushMany([
      { id: "r1", x: 0, a: 10, b: 5 },
      { id: "r2", x: 1, a: 12, b: 8 },
      { id: "r3", x: 2, a: 9, b: 14 },
    ])
    const removed = ref.current.remove(["r1", "r3"])
    expect(removed).toHaveLength(2)
    expect(removed.map((d: any) => d.id).sort()).toEqual(["r1", "r3"])
    // Live buffer should now contain only r2.
    expect(ref.current.getData()).toHaveLength(1)
    expect(ref.current.getData()[0].id).toBe("r2")
  })

  it("update() returns the updated records synchronously", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <DifferenceChart
          ref={ref}
          xAccessor="x"
          seriesAAccessor="a"
          seriesBAccessor="b"
          pointIdAccessor="id"
        />
      </TooltipProvider>
    )
    ref.current.push({ id: "r1", x: 0, a: 10, b: 5 })
    const updated = ref.current.update("r1", (d: any) => ({ ...d, a: 99 }))
    expect(updated).toHaveLength(1)
    expect(updated[0].a).toBe(99)
    expect(ref.current.getData()[0].a).toBe(99)
  })

  it("windowSize bounds the push buffer (FIFO eviction)", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <DifferenceChart
          ref={ref}
          xAccessor="x"
          seriesAAccessor="a"
          seriesBAccessor="b"
          windowSize={3}
        />
      </TooltipProvider>
    )
    ref.current.pushMany([
      { x: 0, a: 10, b: 5 },
      { x: 1, a: 11, b: 6 },
      { x: 2, a: 12, b: 7 },
      { x: 3, a: 13, b: 8 },
      { x: 4, a: 14, b: 9 },
    ])
    const live = ref.current.getData()
    expect(live).toHaveLength(3)
    // Oldest two rows (x=0, x=1) evicted; last three retained.
    expect(live.map((d: any) => d.x)).toEqual([2, 3, 4])
  })
})

// ── Accessor coercion ─────────────────────────────────────────────────
describe("DifferenceChart accessor coercion", () => {
  it("accepts Date values for the x accessor (time series)", () => {
    const date0 = new Date(2024, 0, 1)
    const date1 = new Date(2024, 0, 2)
    render(
      <TooltipProvider>
        <DifferenceChart
          data={[
            { date: date0, a: 10, b: 5 },
            { date: date1, a: 4, b: 9 },
          ]}
          xAccessor="date"
          seriesAAccessor="a"
          seriesBAccessor="b"
        />
      </TooltipProvider>
    )
    // Segment rows should carry x as milliseconds (Date.getTime()).
    const segmentRows = lastXYFrameProps.data.filter(
      (d: any) => d.__diffSegment.startsWith("seg-")
    )
    expect(segmentRows.length).toBeGreaterThan(0)
    expect(typeof segmentRows[0].__x).toBe("number")
    expect(segmentRows[0].__x).toBe(date0.getTime())
  })

  it("accepts numeric-string values from CSV-style data", () => {
    render(
      <TooltipProvider>
        <DifferenceChart
          data={[
            { x: "0", a: "10", b: "5" },
            { x: "1", a: "4", b: "9" },
          ] as unknown as DifferenceChartProps["data"]}
          xAccessor="x"
          seriesAAccessor="a"
          seriesBAccessor="b"
        />
      </TooltipProvider>
    )
    const segmentRows = lastXYFrameProps.data.filter(
      (d: any) => d.__diffSegment.startsWith("seg-")
    )
    expect(segmentRows.length).toBeGreaterThan(0)
    // x and y values must be numbers after coercion, not strings.
    expect(typeof segmentRows[0].__x).toBe("number")
    expect(typeof segmentRows[0].__y).toBe("number")
  })
})
