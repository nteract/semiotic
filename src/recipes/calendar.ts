import type { CustomLayout } from "../components/stream/customLayout"
import type { Datum } from "../components/charts/shared/datumTypes"
import type { RectSceneNode } from "../components/stream/types"
import { interpolateRgb } from "d3-interpolate"

export interface CalendarConfig {
  /** Field name (or function) yielding a Date or epoch ms per datum. */
  dateAccessor: string | ((d: Datum) => Date | number)
  /** Field name (or function) yielding the value used to color each day. */
  valueAccessor: string | ((d: Datum) => number)
  /**
   * Two-stop color ramp: [low, high]. Defaults pick from the active theme's
   * sequential scheme — pass explicit colors here for non-default ramps.
   */
  colorRamp?: [string, string]
  /**
   * Calendar year to render. If omitted, infers the year from the first datum.
   * For multi-year series, render one CustomChart per year.
   */
  year?: number
  /** Pixel gap between cells. @default 2 */
  gutter?: number
  /** Inset on the left to leave room for weekday labels. @default 0 */
  labelInset?: number
}

const DAY_MS = 86_400_000

/**
 * GitHub-style calendar heatmap — 53 columns (ISO weeks) × 7 rows (days of
 * week), color-encoded by daily value. One year per layout.
 *
 * @example
 * ```tsx
 * <CustomChart
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

  const getDate = (d: Datum): Date => {
    const v = typeof cfg.dateAccessor === "function" ? cfg.dateAccessor(d) : d[cfg.dateAccessor]
    return v instanceof Date ? v : new Date(v as number)
  }
  const getValue = (d: Datum): number => {
    const v = typeof cfg.valueAccessor === "function" ? cfg.valueAccessor(d) : d[cfg.valueAccessor]
    return Number(v)
  }

  // Index data by day key.
  const valueByDay = new Map<string, number>()
  let inferredYear: number | null = null
  for (const d of ctx.data) {
    const date = getDate(d)
    if (!isFinite(date.getTime())) continue
    if (inferredYear == null) inferredYear = date.getUTCFullYear()
    const key = isoDayKey(date)
    const v = getValue(d)
    valueByDay.set(key, (valueByDay.get(key) ?? 0) + (Number.isFinite(v) ? v : 0))
  }
  const year = cfg.year ?? inferredYear ?? new Date().getUTCFullYear()

  // Compute value extent for color scaling.
  let vMin = Infinity
  let vMax = -Infinity
  for (const v of valueByDay.values()) {
    if (v < vMin) vMin = v
    if (v > vMax) vMax = v
  }
  if (vMin === Infinity) {
    // Empty data — render a blank grid in the low color.
    vMin = 0
    vMax = 0
  }

  const [low, high] = cfg.colorRamp ?? [
    ctx.theme.semantic.surface ?? "#ebedf0",
    ctx.theme.semantic.primary ?? "#216e39",
  ]
  const colorAt = (v: number) => {
    if (vMax === vMin) return low
    const t = (v - vMin) / (vMax - vMin)
    return interpolateRgb(low, high)(t)
  }

  // Layout math: 53 weeks × 7 days. Cell side = min so cells stay square.
  const gutter = cfg.gutter ?? 2
  const labelInset = cfg.labelInset ?? 0
  // 53 standard ISO weeks + 1 spillover slot for years where Jan 1 lands so
  // late in the week that Dec 31 falls into a 54th column under a
  // Sunday-anchored grid (e.g. leap years starting Saturday).
  const cols = 54
  const rows = 7
  const innerW = plot.width - labelInset
  const innerH = plot.height
  const cellSide = Math.min(
    (innerW - gutter * (cols - 1)) / cols,
    (innerH - gutter * (rows - 1)) / rows
  )
  if (cellSide <= 0) return { nodes: [] }

  const yearStart = new Date(Date.UTC(year, 0, 1))
  // Find the week-0 anchor (the Sunday on or before Jan 1).
  const startDow = yearStart.getUTCDay() // 0=Sun
  const week0Anchor = new Date(yearStart.getTime() - startDow * DAY_MS)

  const nodes: RectSceneNode[] = []
  for (let week = 0; week < cols; week++) {
    for (let dow = 0; dow < rows; dow++) {
      const cellDate = new Date(week0Anchor.getTime() + (week * 7 + dow) * DAY_MS)
      if (cellDate.getUTCFullYear() !== year) continue
      const key = isoDayKey(cellDate)
      const v = valueByDay.get(key)
      const fill = v == null ? low : colorAt(v)
      nodes.push({
        type: "rect",
        x: plot.x + labelInset + week * (cellSide + gutter),
        y: plot.y + dow * (cellSide + gutter),
        w: cellSide,
        h: cellSide,
        style: { fill, stroke: "none" },
        datum: { date: cellDate, value: v ?? 0 },
      })
    }
  }

  return { nodes }
}

function isoDayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}
