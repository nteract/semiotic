import { regressionNumber } from "../shared/leastSquaresRegression"
import type { Datum } from "../shared/datumTypes"

/**
 * Crossover-segmented record used by the area pipeline. One row per
 * vertex along either the upper or lower boundary; `__diffSegment` is a
 * group key per segment so the area scene builder produces one polygon
 * per id with the correct fill color.
 */
export interface SegmentRow {
  __x: number
  /** Upper boundary y value (max of A, B). The area pipeline reads this. */
  __y: number
  /** Lower boundary y value (min of A, B) — picked up as per-datum y0. */
  __y0: number
  /** Segment id. Format: `"seg-<index>-<winner>"`. */
  __diffSegment: string
  /** Which series is on top in this segment ("A" or "B"). Drives fill. */
  __diffWinner: "A" | "B"
  /** Original A value at this x (or interpolated at crossovers). */
  __valA: number
  /** Original B value at this x (or interpolated at crossovers). */
  __valB: number
  /** Original datum (for tooltip lookup at non-crossover vertices). */
  __sourceDatum?: Datum
}

export interface DifferencePoint {
  datum: Datum
  x: number
  a: number
  b: number
}

export const differenceFrameAccessors = {
  chartType: "mixed",
  xAccessor: "__x",
  yAccessor: "__y",
  y0Accessor: "__y0",
  groupAccessor: "__diffSegment"
} as const

function segmentBuilder() {
  const rows: SegmentRow[] = []
  let ties: DifferencePoint[] = []
  let last: DifferencePoint | undefined
  let winner: "A" | "B" = "A"
  const groups: string[] = []
  let key = "seg-0-A"
  function start(next: "A" | "B") {
    winner = next
    key = `seg-${groups.length}-${next}`
    groups.push(key)
  }

  function vertex({ x, a, b, datum }: Omit<DifferencePoint, "datum"> & { datum?: Datum }): SegmentRow {
    return {
      __x: x, __y: Math.max(a, b), __y0: Math.min(a, b),
      __diffSegment: key, __diffWinner: winner,
      __valA: a, __valB: b, ...(datum && { __sourceDatum: datum })
    }
  }

  return {
    append(point: DifferencePoint) {
      const { x, a, b } = point
      if (!Number.isFinite(a) || !Number.isFinite(b)) return
      if (a === b) {
        ties.push(point)
        return
      }
      const next = a > b ? "A" : "B"
      if (last && next !== winner) {
        const tie = ties.shift()
        let crossing: { x: number; a: number; b: number }
        if (tie) {
          crossing = { x: tie.x, a: tie.a, b: tie.b }
        } else {
          const gap = last.b - last.a
          const ratio = gap / (gap + (a - b))
          const y = last.a + ratio * (a - last.a)
          crossing = { x: last.x + ratio * (x - last.x), a: y, b: y }
        }
        rows.push(vertex(crossing))
        start(next)
        rows.push(vertex(crossing))
      } else if (!last) start(next)
      for (const tie of ties) rows.push(vertex(tie))
      ties = []
      rows.push(vertex(point))
      last = point
    },
    snapshot: () => ({
      segmented: rows.concat(ties.map(vertex)),
      areaGroups: !groups.length && ties.length ? [key] : groups.slice()
    })
  }
}

type Accessor<T> = string | ((d: T) => unknown)

function coordinate<T extends Datum>(accessor: Accessor<T>, row: T): number {
  const value = typeof accessor === "function" ? accessor(row) : row[accessor]
  return regressionNumber(value) ?? NaN
}

/** Extend the existing segments on ordered appends. Re-sort cached coordinates only for a late x. */
export function createDifferenceProjection<TDatum extends Datum>(
  xAccessor: Accessor<TDatum>,
  aAccessor: Accessor<TDatum>,
  bAccessor: Accessor<TDatum>
) {
  let builder = segmentBuilder()
  const points: DifferencePoint[] = []
  let consumed = 0
  return {
    read(raw: TDatum[]) {
      if (raw.length < consumed) {
        builder = segmentBuilder()
        points.length = 0
        consumed = 0
      }
      let late = false
      for (; consumed < raw.length; consumed++) {
        if (!(consumed in raw)) continue
        const datum = raw[consumed]
        const x = coordinate(xAccessor, datum)
        if (!Number.isFinite(x)) continue
        const point = { datum, x, a: coordinate(aAccessor, datum), b: coordinate(bAccessor, datum) }
        if (points.length && x < points[points.length - 1].x) late = true
        points.push(point)
        if (!late) builder.append(point)
      }
      if (late) {
        builder = segmentBuilder()
        points.sort((p, q) => p.x - q.x)
        for (const point of points) builder.append(point)
      }
      return { ...builder.snapshot(), points: points.slice() }
    }
  }
}

export function computeDifferenceSegments<TDatum extends Datum>(
  raw: TDatum[],
  getX: (d: TDatum) => number,
  getA: (d: TDatum) => number,
  getB: (d: TDatum) => number
): SegmentRow[] {
  return createDifferenceProjection(getX, getA, getB).read(raw).segmented
}

/** A vertex on one of the two continuous overlay lines. */
export interface LineRow {
  __x: number
  __y: number
  /** Either `"line-A"` or `"line-B"`. Acts as the line group key. */
  __diffSegment: string
  /** Retained on line vertices so selection can match area and line marks. */
  __diffWinner: "A" | "B"
  /** Original source row for field-based styleRules. */
  __sourceDatum?: Datum
}

/**
 * Build the parallel line-data rows so we can render the two original
 * series as continuous lines on top of the difference fill in the same
 * frame. Returning two groups (`"line-A"` and `"line-B"`) keyed by
 * `__diffSegment` lets the mixed scene builder pick them up as line
 * groups while the segment groups go to the area builder.
 */
export function buildOverlayLineRows(points: DifferencePoint[]): LineRow[] {
  const out: LineRow[] = []
  for (const { datum, x, a, b } of points) {
    const append = (series: "A" | "B", value: number) => {
      if (Number.isFinite(value)) out.push({
        __x: x, __y: value, __diffSegment: `line-${series}`, __diffWinner: series, __sourceDatum: datum
      })
    }
    append("A", a)
    append("B", b)
  }
  return out
}
