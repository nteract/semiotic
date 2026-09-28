/**
 * LineChart `gapStrategy` handling for missing x/y values.
 *
 * - "break" splits a line at each gap into separate segment lines.
 * - "interpolate" drops gap points so the line connects across them.
 *   This must happen before the frame, whose accessors coerce null to 0.
 * - "zero" sets a gap point's y to 0 so the line drops to the baseline.
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
  /** Field "zero" writes 0 into. */
  yField: string
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
