import type { Datum } from "../charts/shared/datumTypes"
import { aiNumericValue, aiScalarLabel } from "./aiData"
import {
  parseDateLikeString,
  coerceUtcTimeValue
} from "../charts/shared/temporalStrings"

/**
 * Shared chart-family classification + measure/dimension role resolution.
 *
 * `describeChart` (prose) and `buildNavigationTree` (structure) both need to
 * know which family a component belongs to and which props carry its measure
 * (quantitative) and dimension (categorical/ordered) accessors. This is the
 * single source of truth so the two surfaces can't drift apart.
 *
 * Pure and dependency-light.
 */

export const XY_FAMILY = new Set([
  "LineChart",
  "AreaChart",
  "StackedAreaChart",
  "DifferenceChart",
  "Scatterplot",
  "BubbleChart",
  "ConnectedScatterplot",
  "QuadrantChart",
  "MultiAxisLineChart",
  "MinimapChart"
])
export const BAR_FAMILY = new Set([
  "BarChart",
  "StackedBarChart",
  "GroupedBarChart",
  "DotPlot"
])
export const PART_TO_WHOLE = new Set(["PieChart", "DonutChart", "FunnelChart"])
export const DISTRIBUTION = new Set([
  "Histogram",
  "BoxPlot",
  "ViolinPlot",
  "RidgelinePlot",
  "SwarmPlot"
])

export interface ChartRoles {
  measure?: string
  measureFallback: string
  dimension?: string
  dimensionFallback: string
}

/** Shared by built-in and recipe introductions read aloud by assistive tech. */
export function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? "An" : "A"
}

/** Built-in and recipe descriptions use the same fallback for invalid locales. */
export function descriptionNumberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions = { maximumFractionDigits: 2 }
): (value: number) => string {
  try {
    return new Intl.NumberFormat(locale, options).format
  } catch {
    return new Intl.NumberFormat("en", options).format
  }
}

/** The measure (quantitative) and dimension (categorical/ordered) accessors, by family. */
export function roles(component: string, props: Datum): ChartRoles {
  const funnel = component === "FunnelChart"
  if (
    BAR_FAMILY.has(component) ||
    PART_TO_WHOLE.has(component) ||
    component === "SwimlaneChart" ||
    component === "GaugeChart"
  ) {
    return {
      measure: props.valueAccessor as string | undefined,
      measureFallback: "value",
      dimension: (funnel ? props.stepAccessor : props.categoryAccessor) as
        string | undefined,
      dimensionFallback: funnel ? "step" : "category"
    }
  }
  // XY + distribution default
  return {
    measure: (props.yAccessor ?? props.valueAccessor) as string | undefined,
    measureFallback: "y",
    dimension: props.xAccessor as string | undefined,
    dimensionFallback: "x"
  }
}

/** Structural series accessors; coloring an ordinal mark does not split it. */
export function seriesField(
  props: Datum,
  component = ""
): string | ((d: Datum) => unknown) | undefined {
  const fields =
    component === "FunnelChart"
      ? ["categoryAccessor"]
      : ["lineBy", "areaBy", "stackBy", "groupBy", "colorBy"]
  for (const k of fields) {
    if (
      k === "colorBy" &&
      (BAR_FAMILY.has(component) || PART_TO_WHOLE.has(component))
    )
      continue
    const v = props[k]
    if ((typeof v === "string" && v) || typeof v === "function") return v
  }
  return undefined
}

/** PipelineStore selects its x parser from the first usable observation.
 * Keep the description API's authored categorical order when no continuous
 * values or explicit scale are supplied (for example, Jan/Feb/Mar labels).
 */
export function resolveChartDimension(
  component: string,
  data: Datum[],
  read: (d: Datum) => unknown,
  scaleType?: unknown
) {
  let type: "number" | "time" | undefined
  let categorical = false
  if (XY_FAMILY.has(component)) {
    for (const row of data) {
      const value = read(row)
      if (value == null || value === "") continue
      if (
        (value instanceof Date || typeof value === "string") &&
        Number.isFinite(dimensionNumber(value, true))
      )
        type = "time"
      else if (Number.isFinite(dimensionNumber(value))) type = "number"
      if (type) break
      if (typeof value === "string") categorical = true
    }
    if (!type && (!categorical || scaleType)) type = "number"
  }
  return {
    read: type
      ? (row: Datum) => dimensionNumber(read(row), type === "time")
      : read,
    continuous: !!type,
    temporal: type === "time" || scaleType === "time" || scaleType === "utc"
  }
}

/** Renderer coercion for supported scalar values, without invoking user objects. */
function dimensionNumber(value: unknown, temporal = false): number {
  if (typeof value === "string")
    return temporal ? parseDateLikeString(value) : Number(value)
  return value === null || typeof value === "boolean"
    ? Number(value)
    : aiNumericValue(value)
}

/** Keep intraday instants distinguishable and their timezone explicit. */
export function fmtDim(
  v: unknown,
  fmtNum: (n: number) => string,
  temporal = false
): string {
  if (v == null) return "—"
  if (temporal) v = new Date(coerceUtcTimeValue(v))
  if (v instanceof Date)
    return aiScalarLabel(v)?.replace(/T00:00:00\.000Z$/, "") ?? "—"
  if (typeof v === "number") return fmtNum(v)
  return aiScalarLabel(v) ?? "—"
}

// ---------------------------------------------------------------------------
// Statistics over the measure
// ---------------------------------------------------------------------------

export interface MeasureStats {
  count: number
  missing: number
  negative: number
  sum: number
  second?: { label: string; value: number }
  min: number
  max: number
  mean: number
  minLabel: string
  maxLabel: string
  minLabels: string
  maxLabels: string
  minCount: number
  maxCount: number
  first: number
  last: number
  firstLabel: string
  lastLabel: string
}

export function computeStats(
  data: Datum[],
  getMeasure: (d: Datum) => number,
  getDim: (d: Datum) => unknown,
  fmtNum: (n: number) => string,
  options: {
    aggregate?: boolean
    absolute?: boolean
    ordered?: boolean
    reverse?: boolean
    temporal?: boolean
    continuous?: boolean
    group?: (d: Datum) => unknown
  }
): MeasureStats | null {
  type Sample = { value: number; dimension: unknown; group?: unknown }
  const categories = options.aggregate
    ? new Map<string, Map<string, Sample>>()
    : null
  let missing = 0,
    negative = 0,
    count = 0,
    sum = 0
  let min = Infinity,
    max = -Infinity,
    minCount = 0,
    maxCount = 0
  let first: Sample | undefined,
    last: Sample | undefined,
    second: Sample | undefined
  let firstOrder = Infinity,
    lastOrder = -Infinity
  const lows: Sample[] = [],
    highs: Sample[] = []

  // Trajectory prose needs endpoints and extrema, not a sorted copy of every
  // row. Match projected x order in one pass; categorical x keeps authored order.
  const accumulate = (sample: Sample, order = count) => {
    const m = sample.value
    if (order < firstOrder) {
      firstOrder = order
      first = sample
    }
    if (order >= lastOrder) {
      lastOrder = order
      last = sample
    }
    if (m < min) {
      min = m
      minCount = 0
      lows.length = 0
    }
    if (m > max) {
      second = highs[0]
      max = m
      maxCount = 0
      highs.length = 0
    } else if (!second || m > second.value) second = sample
    if (m === min) {
      minCount++
      if (lows.length < 3) lows.push(sample)
    }
    if (m === max) {
      maxCount++
      if (highs.length < 3) highs.push(sample)
    }
    count++
    sum += m
  }
  for (const d of data) {
    const raw = getMeasure(d)
    const dimension = getDim(d)
    if (
      !Number.isFinite(raw) ||
      (options.continuous && !Number.isFinite(dimension))
    ) {
      missing++
      continue
    }
    if (raw < 0) negative++
    const value = options.absolute ? Math.abs(raw) : raw,
      group = options.group?.(d)
    if (categories) {
      const category = aiScalarLabel(dimension) ?? "—",
        key = aiScalarLabel(group) ?? ""
      let groups = categories.get(category)
      if (!groups) {
        groups = new Map()
        categories.set(category, groups)
      }
      const previous = groups.get(key)
      if (previous) previous.value += value
      else groups.set(key, { value, dimension, group })
    } else
      accumulate(
        { value, dimension, group },
        options.ordered
          ? (dimension as number) * (options.reverse ? -1 : 1)
          : count
      )
  }
  if (categories) {
    for (const groups of categories.values()) {
      for (const sample of groups.values()) accumulate(sample)
    }
  }
  if (!first || !last) return null
  const label = (sample: Sample) =>
    fmtDim(sample.dimension, fmtNum, options.temporal) +
    (options.group ? ` / ${fmtDim(sample.group, fmtNum)}` : "")
  const labels = (values: Sample[], total: number) => {
    const names = values.map(label)
    const remaining = total - names.length
    if (remaining > 0)
      names.push(`${remaining} ${remaining === 1 ? "other" : "others"}`)
    return names.length < 2
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
  }
  return {
    count,
    missing,
    negative,
    sum,
    min,
    max,
    minCount,
    maxCount,
    second: second ? { value: second.value, label: label(second) } : undefined,
    mean: sum / count,
    minLabel: label(lows[0]),
    maxLabel: label(highs[0]),
    minLabels: labels(lows, minCount),
    maxLabels: labels(highs, maxCount),
    first: first.value,
    last: last.value,
    firstLabel: label(first),
    lastLabel: label(last)
  }
}

/** Count nouns shared by chart descriptions and reader grounding. */
export function plural(count: number, noun: string): string {
  if (count === 1) return noun
  if (noun === "body") return "bodies"
  if (noun === "category") return "categories"
  return `${noun}s`
}

/** One pass shared by physics descriptions and reader grounding; ties keep input order. */
export function summarizePhysicsRows<
  T extends {
    count: number
    secondary?: number
    total?: number
    secondaryLabel?: string
  }
>(rows: readonly T[] | undefined) {
  let total = 0
  let populated = 0
  let secondaryTotal = 0
  let secondaryLabel: string | null = null
  let leader: T | null = null
  let runnerUp: T | null = null
  if (rows)
    for (const row of rows) {
      total += row.count
      if (row.count > 0) populated++
      secondaryTotal += row.secondary ?? row.total ?? 0
      if (!secondaryLabel && row.secondaryLabel)
        secondaryLabel = row.secondaryLabel
      if (!leader || row.count > leader.count) {
        runnerUp = leader
        leader = row
      } else if (!runnerUp || row.count > runnerUp.count) {
        runnerUp = row
      }
    }
  return {
    total,
    populated,
    secondaryTotal,
    secondaryLabel,
    leader,
    runnerUp: runnerUp && runnerUp.count > 0 ? runnerUp : null
  }
}
