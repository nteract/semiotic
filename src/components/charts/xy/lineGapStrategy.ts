/**
 * LineChart `gapStrategy` handling for missing x/y values.
 *
 * - "break" splits a line at each gap into separate segment lines.
 * - "interpolate" drops gap points so the line connects across them.
 *   This must happen before the frame, whose accessors coerce null to 0.
 * - "zero" drops a gap point to the baseline. A string y field is written on a
 *   copy. A function y accessor cannot be written through, so those points stay
 *   the caller's objects and are listed in `zeroedPoints` for a wrapped accessor.
 *
 * Segment lines are keyed by index and held off the data (no marker field),
 * so frame grouping never merges two series and datums reach tooltips,
 * callbacks, and observations exactly as authored.
 */
import type { ReactNode } from "react"
import type { Datum } from "../shared/datumTypes"
import { hasOwnTooltipChrome, markTooltipChrome } from "../../Tooltip/tooltipChrome"

export type LineGapStrategy = "break" | "interpolate" | "zero"

/** Identity of the segment lines produced by `gapStrategy="break"`. */
export interface LineGapSegments {
  /** Frame group key of each segment line object. */
  keyOf: WeakMap<Datum, string>
  /** Authored series label behind each segment key. */
  seriesOf: ReadonlyMap<string, string>
}

export interface LineGapResult {
  lines: Datum[]
  hasGaps: boolean
  /** Present when "break" split the data at one or more gaps. */
  segments?: LineGapSegments
  /**
   * Gap points whose plotted y is 0 when the y accessor is a function.
   * Absent for string accessors, which write the field onto a copy instead.
   */
  zeroedPoints?: WeakSet<Datum>
}

/**
 * Group flat rows into line objects.
 *
 * A `Map` keeps first-seen series order (numeric keys are not re-sorted) and
 * treats names such as "constructor" or "toString" as ordinary series. A plain
 * object would read those names from `Object.prototype` and throw on `.push`.
 */
export function groupRowsIntoLines(
  rows: readonly Datum[],
  lineDataAccessor: string,
  keyOf: (row: Datum) => unknown,
  annotate?: (line: Datum, key: unknown, row: Datum) => void,
): Datum[] {
  const grouped = new Map<string, Datum>()
  for (const row of rows) {
    const rawKey = keyOf(row)
    // Match ordinary property-key coercion (`null` → "null", `undefined` →
    // "undefined") without ever consulting Object.prototype.
    const key = String(rawKey)
    let line = grouped.get(key)
    if (!line) {
      line = { [lineDataAccessor]: [] }
      annotate?.(line, rawKey, row)
      grouped.set(key, line)
    }
    ;(line[lineDataAccessor] as Datum[]).push(row)
  }
  return [...grouped.values()]
}

/** LineChart's flat-row grouping, including forecast compound keys. */
export function groupLineChartRows(
  rows: readonly Datum[],
  {
    lineDataAccessor,
    groupAccessor,
    lineBy,
    segmentField,
  }: {
    lineDataAccessor: string
    groupAccessor: string | ((row: Datum) => unknown)
    lineBy?: string | ((row: Datum) => unknown)
    /** Set when forecast segments must stay on the line object. */
    segmentField?: string
  },
): Datum[] {
  return groupRowsIntoLines(
    rows,
    lineDataAccessor,
    (row) => typeof groupAccessor === "function" ? groupAccessor(row) : row[groupAccessor],
    (line, key, row) => {
      if (typeof groupAccessor === "string") line[groupAccessor] = key
      if (!segmentField) return
      line[segmentField] = row[segmentField]
      if (typeof lineBy === "string") line[lineBy] = row[lineBy]
    },
  )
}

/** Plot listed gap points at y = 0 without copying them onto a synthetic field. */
export function yAccessorForZeroedGaps<TDatum extends Datum>(
  yAccessor: string | ((datum: TDatum) => number),
  zeroedPoints: WeakSet<Datum> | undefined,
): string | ((datum: TDatum) => number) {
  if (!zeroedPoints || typeof yAccessor !== "function") return yAccessor
  return (datum) => (zeroedPoints.has(datum) ? 0 : yAccessor(datum))
}

export function applyLineGapStrategy({
  lineData,
  strategy,
  lineDataAccessor,
  isGap,
  yField,
  seriesOfLine,
}: {
  lineData: Datum[]
  strategy: LineGapStrategy
  lineDataAccessor: string
  isGap: (d: Datum) => boolean
  /**
   * Field "zero" writes 0 into. Omit it when y is read by a function;
   * those gap points are returned in `zeroedPoints` instead of copied.
   */
  yField?: string
  /** Authored series label of a line object before it is split. */
  seriesOfLine: (line: Datum) => string
}): LineGapResult {
  const coordsOf = (line: Datum): Datum[] => line[lineDataAccessor] || []

  if (strategy === "interpolate") {
    let found = false
    const lines: Datum[] = []
    for (const line of lineData) {
      const filtered = coordsOf(line).filter(d => {
        if (isGap(d)) { found = true; return false }
        return true
      })
      if (filtered.length > 0) lines.push({ ...line, [lineDataAccessor]: filtered })
    }
    return { lines, hasGaps: found }
  }

  if (strategy === "zero") {
    if (!yField) {
      const zeroedPoints = new WeakSet<Datum>()
      let found = false
      for (const line of lineData) {
        for (const d of coordsOf(line)) {
          if (!isGap(d)) continue
          found = true
          zeroedPoints.add(d)
        }
      }
      return found
        ? { lines: lineData, hasGaps: true, zeroedPoints }
        : { lines: lineData, hasGaps: false }
    }
    let found = false
    const lines = lineData.map(line => ({
      ...line,
      [lineDataAccessor]: coordsOf(line).map(d => {
        if (!isGap(d)) return d
        found = true
        return { ...d, [yField]: 0 }
      }),
    }))
    return { lines, hasGaps: found }
  }

  if (!lineData.some(line => coordsOf(line).some(isGap))) {
    return { lines: lineData, hasGaps: false }
  }

  const lines: Datum[] = []
  const keyOf = new WeakMap<Datum, string>()
  const seriesOf = new Map<string, string>()
  lineData.forEach((line, lineIndex) => {
    const series = seriesOfLine(line)
    let segment: Datum[] = []
    let segmentIndex = 0
    const flush = () => {
      if (segment.length === 0) return
      const segmentLine = { ...line, [lineDataAccessor]: segment }
      const key = `seg:${lineIndex}:${segmentIndex}`
      keyOf.set(segmentLine, key)
      seriesOf.set(key, series)
      lines.push(segmentLine)
      segment = []
      segmentIndex++
    }
    for (const d of coordsOf(line)) {
      if (isGap(d)) flush()
      else segment.push(d)
    }
    flush()
  })
  return { lines, hasGaps: true, segments: { keyOf, seriesOf } }
}

/** Segment keys whose authored series is listed in `fillArea`. */
export function segmentAreaGroups(
  fillArea: string[],
  segments: LineGapSegments | undefined
): string[] {
  if (!segments) return fillArea
  const filled = new Set(fillArea)
  const keys: string[] = []
  for (const [key, series] of segments.seriesOf) {
    if (filled.has(series)) keys.push(key)
  }
  return keys
}

/** Resolve a line style against the authored series, not the segment key. */
export function withSegmentSeriesStyle(
  style: (d: Datum, group?: string) => Datum,
  segments: LineGapSegments | undefined
): (d: Datum, group?: string) => Datum {
  if (!segments) return style
  return (d, group) =>
    style(d, group === undefined ? group : segments.seriesOf.get(group) ?? group)
}

/** Relabel multi-series tooltip rows from segment keys to authored series. */
export function withSegmentSeriesTooltip<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { tooltipContent: (d: any) => ReactNode }
>(tooltipProps: T, segments: LineGapSegments | undefined): T {
  if (!segments) return tooltipProps
  const content = tooltipProps.tooltipContent
  const relabeled = (hover: Datum) => {
    const allSeries = hover?.allSeries
    if (!Array.isArray(allSeries)) return content(hover)
    return content({
      ...hover,
      allSeries: allSeries.map((row: Datum) => ({
        ...row,
        group: segments.seriesOf.get(row.group) ?? row.group,
      })),
    })
  }
  return {
    ...tooltipProps,
    tooltipContent: hasOwnTooltipChrome(content) ? markTooltipChrome(relabeled) : relabeled,
  }
}
