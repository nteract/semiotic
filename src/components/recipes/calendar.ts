import type { CustomLayout } from "../stream/customLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"
import { interpolateRgb } from "d3-interpolate"

export interface CalendarConfig {
  /** Field name (or function) yielding a Date, date string, or epoch ms per datum. */
  dateAccessor: string | ((d: Datum) => Date | number | string)
  /** Field name (or function) yielding the value used to color each day. */
  valueAccessor: string | ((d: Datum) => number)
  /**
   * Two-stop color ramp: [low, high]. By default, this uses the active
   * theme's semantic colors from `surface` to `primary` — pass explicit
   * colors here for non-default ramps.
   */
  colorRamp?: [string, string]
  /**
   * Calendar year to render. If omitted, infers the year from the first datum.
   * For multi-year series, render one XYCustomChart per year.
   */
  year?: number
  /** Calendar-day interpretation for dates and timestamps. @default "local" */
  timeZone?: "local" | "utc"
  /** First weekday: 0 (Sunday) or 1 (Monday). @default 0 */
  weekStart?: 0 | 1
  /** Fill for days without a finite measurement. Defaults to the theme grid color. */
  missingColor?: string
  /** Pixel gap between cells. @default 2 */
  gutter?: number
  /** Inset on the left to leave room for weekday labels. @default 0 */
  labelInset?: number
}

/**
 * GitHub-style calendar heatmap — up to 54 week columns × 7 weekday rows,
 * color-encoded by daily value. Weeks start on Sunday by default; these are
 * calendar columns, not ISO week numbers. One year per layout.
 *
 * @example
 * ```tsx
 * <XYCustomChart
 *   data={dailyEvents}
 *   layout={calendarLayout}
 *   layoutConfig={{
 *     dateAccessor: "date",
 *     valueAccessor: "count",
 *     year: 2025,
 *   }}
 *   width={900}
 *   height={140}
 * />
 * ```
 */
export const calendarLayout: CustomLayout<CalendarConfig> = (ctx) => {
  const cfg = ctx.config
  const { plot } = ctx.dimensions
  if (plot.width <= 0 || plot.height <= 0) return { nodes: [] }

  const utc = cfg.timeZone === "utc"
  const dateAt = (year: number, month: number, day: number) => {
    // Full-year setters preserve years 1–99 instead of treating them as 1901–1999.
    const date = new Date(0)
    if (utc) {
      date.setUTCFullYear(year, month, day)
      date.setUTCHours(0, 0, 0, 0)
    } else {
      date.setFullYear(year, month, day)
      date.setHours(0, 0, 0, 0)
    }
    return date
  }
  const yearOf = (date: Date) =>
    utc ? date.getUTCFullYear() : date.getFullYear()
  const dayKey = (date: Date) =>
    `${yearOf(date)}-${pad2(utc ? date.getUTCMonth() + 1 : date.getMonth() + 1)}-${pad2(utc ? date.getUTCDate() : date.getDate())}`

  const getDate = (d: Datum): Date => {
    const v =
      typeof cfg.dateAccessor === "function"
        ? cfg.dateAccessor(d)
        : d[cfg.dateAccessor]
    if (v instanceof Date) return v
    // A date-only string names a calendar day, rather than a UTC instant.
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [year, month, day] = v.split("-").map(Number)
      return dateAt(year, month - 1, day)
    }
    return new Date(v as number | string)
  }
  const getValue = (d: Datum): number => {
    const v =
      typeof cfg.valueAccessor === "function"
        ? cfg.valueAccessor(d)
        : d[cfg.valueAccessor]
    return v == null ? NaN : Number(v)
  }

  // Index data by day key.
  const valueByDay = new Map<string, number>()
  let inferredYear: number | null = null
  for (const d of ctx.data) {
    const date = getDate(d)
    if (!isFinite(date.getTime())) continue
    if (inferredYear == null) inferredYear = yearOf(date)
    const key = dayKey(date)
    const v = getValue(d)
    if (Number.isFinite(v)) valueByDay.set(key, (valueByDay.get(key) ?? 0) + v)
  }
  const year = cfg.year ?? inferredYear ?? yearOf(new Date())

  // Compute value extent for color scaling.
  let vMin = Infinity
  let vMax = -Infinity
  for (const [key, v] of valueByDay) {
    if (!key.startsWith(`${year}-`)) continue
    if (v < vMin) vMin = v
    if (v > vMax) vMax = v
  }
  if (vMin === Infinity) {
    vMin = 0
    vMax = 0
  }

  const [low, high] = cfg.colorRamp ?? [
    ctx.theme.semantic.surface ?? "#ebedf0",
    ctx.theme.semantic.primary ?? "#216e39"
  ]
  const missingColor = cfg.missingColor ?? ctx.theme.semantic.grid ?? "#d1d5db"
  const colorAt = (v: number) => {
    if (vMax === vMin) return low
    const t = (v - vMin) / (vMax - vMin)
    return interpolateRgb(low, high)(t)
  }

  // Cell side = min so cells stay square.
  const gutter = cfg.gutter ?? 2
  const labelInset = cfg.labelInset ?? 0
  // A leap year starting on the last weekday can span 54 columns.
  const cols = 54
  const rows = 7
  const innerW = plot.width - labelInset
  const innerH = plot.height
  const cellSide = Math.min(
    (innerW - gutter * (cols - 1)) / cols,
    (innerH - gutter * (rows - 1)) / rows
  )
  if (cellSide <= 0) return { nodes: [] }

  const yearStart = dateAt(year, 0, 1)
  const startDow =
    ((utc ? yearStart.getUTCDay() : yearStart.getDay()) -
      (cfg.weekStart ?? 0) +
      7) %
    7

  const nodes: RectSceneNode[] = []
  for (let week = 0; week < cols; week++) {
    for (let dow = 0; dow < rows; dow++) {
      // Construct each calendar date independently so DST never skips/repeats a day.
      const cellDate = dateAt(year, 0, 1 - startDow + week * 7 + dow)
      if (yearOf(cellDate) !== year) continue
      const key = dayKey(cellDate)
      const v = valueByDay.get(key)
      const fill = v == null ? missingColor : colorAt(v)
      nodes.push({
        type: "rect",
        x: plot.x + labelInset + week * (cellSide + gutter),
        y: plot.y + dow * (cellSide + gutter),
        w: cellSide,
        h: cellSide,
        style: { fill, stroke: "none" },
        datum: { date: cellDate, value: v ?? null, missing: v == null }
      })
    }
  }

  return { nodes }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}
