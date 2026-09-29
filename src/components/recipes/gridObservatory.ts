/**
 * Pure grid-operations helpers for multi-series power observatories.
 *
 * These turn balancing-authority hourly rows into the chart-ready series used by
 * StackedAreaChart, DifferenceChart, BigNumber, styleRules factories, and
 * provenanced event annotations. They are domain math — not a React kit — so
 * agents and pages can share the same pipeline.
 *
 * Honesty: {@link reserveMarginPct} is a **readability proxy** from public
 * demand / net-generation (+ optional interchange) series. It is *not* an ISO
 * contingency-reserve product. Label it as such in UI and `describeChart` copy.
 */

import type { StyleRule } from "../charts/shared/styleRules"
import type { HatchFill } from "../charts/shared/hatchFill"

/** Stable fuel keys used across regions when present. */
export const GRID_FUEL_KEYS = [
  "naturalGas",
  "coal",
  "nuclear",
  "hydro",
  "wind",
  "solar",
  "other"
] as const

export type GridFuelKey = (typeof GRID_FUEL_KEYS)[number]

/** Human labels for fuel keys (legend / tooltips). */
export const GRID_FUEL_LABELS: Record<GridFuelKey, string> = {
  naturalGas: "Natural gas",
  coal: "Coal",
  nuclear: "Nuclear",
  hydro: "Hydro",
  wind: "Wind",
  solar: "Solar",
  other: "Other"
}

/**
 * One hour (or finest grain) in one balancing authority.
 * Fields are source-agnostic so callers can provide any compatible dataset.
 */
export type GridHour = {
  t: number
  ba: string
  demandMw: number
  forecastMw?: number
  netGenMw: number
  interchangeMw?: number
  fuels: Partial<Record<GridFuelKey, number>>
}

export type ReserveSnapshot = {
  t: number
  ba: string
  /** Rough operational headroom proxy — never claim ISO-grade contingency reserve. */
  reserveMarginPct: number
  /**
   * Net load: demand minus variable renewables (wind + solar), the load the
   * dispatchable fleet has to serve. Equals demand when the hour reports no
   * wind or solar.
   */
  netLoadMw: number
  demandMw: number
  netGenMw: number
}

/**
 * Reserve-margin thresholds, in percent. Levels that would cross (for
 * example `watch` below `tight`) are raised to the level beneath them.
 */
export type ReserveLevels = {
  /** Margin below this % is "tight" / danger. Default 5. */
  tight?: number
  /** Margin below this % (and at or above `tight`) is "watch" / warning. Default 12. */
  watch?: number
  /**
   * Margin at or above this % is comfortable / success. Default 20. Between
   * `watch` and `comfortable` is "moderate" / info.
   */
  comfortable?: number
}

export type ReserveClassId = "tight" | "watch" | "moderate" | "comfortable"

/** One reserve class: a half-open `[min, max)` margin range; open ends are omitted. */
export type ReserveClass = {
  id: ReserveClassId
  /** Display label, e.g. `"Watch (5% to < 12%)"`. */
  label: string
  /** Short name: `"Tight"`, `"Watch"`, `"Moderate"`, `"Comfortable"`. */
  name: string
  /** Inclusive lower bound in %; omitted for the lowest class. */
  min?: number
  /** Exclusive upper bound in %; omitted for the highest class. */
  max?: number
  /** Semantic theme color for the class. */
  color: string
}

export type FuelStackRow = {
  t: number
  fuel: GridFuelKey
  fuelLabel: string
  mw: number
  ba: string
}

export type DemandForecastRow = {
  t: number
  a: number
  b: number
  demandMw: number
  forecastMw: number
  errorMw: number
  ba: string
}

export type OperatingPointSummary = {
  t: number
  ba: string
  demandMw: number
  forecastMw: number | null
  forecastErrorMw: number | null
  netGenMw: number
  reserveMarginPct: number
  topFuel: GridFuelKey | null
  topFuelShare: number
  topFuelMw: number
  fuelShares: Partial<Record<GridFuelKey, number>>
}

export type GridEventWindow = {
  id: string
  /** Inclusive start epoch ms. */
  start: number
  /** Inclusive end epoch ms. */
  end: number
  label: string
  /** Optional longer note for callouts. */
  note?: string
  /** "heat-wave" | "outage" | "demand-spike" | open string. */
  kind?: string
  /** ISO 8601 duration or ms; default "P14D". */
  ttlHint?: string | number
  y?: number
  /** Data y for y-threshold style notes. */
  value?: number
}

const DEFAULT_LEVELS: Required<ReserveLevels> = {
  tight: 5,
  watch: 12,
  comfortable: 20
}

function finite(n: unknown, fallback = 0): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback
}

const CLASS_COLORS: Record<ReserveClassId, string> = {
  tight: "var(--semiotic-danger, #c2410c)",
  watch: "var(--semiotic-warning, #d97706)",
  moderate: "var(--semiotic-info, #0891b2)",
  comfortable: "var(--semiotic-success, #16a34a)"
}

function resolveLevels(levels: ReserveLevels): Required<ReserveLevels> {
  const tight = finite(levels.tight, DEFAULT_LEVELS.tight)
  const watch = Math.max(tight, finite(levels.watch, DEFAULT_LEVELS.watch))
  const comfortable = Math.max(watch, finite(levels.comfortable, DEFAULT_LEVELS.comfortable))
  return { tight, watch, comfortable }
}

/**
 * The reserve classes for `levels`, lowest first: tight `< tight`, watch
 * `[tight, watch)`, moderate `[watch, comfortable)`, comfortable
 * `>= comfortable`. {@link thresholdBandsForReserve},
 * {@link reserveAnnotationBands}, and {@link classifyReserve} all read this
 * table, so a mark's style and the band behind it always agree. A class whose
 * range is empty (equal levels) is left out.
 */
export function reserveClasses(levels: ReserveLevels = {}): ReserveClass[] {
  const { tight, watch, comfortable } = resolveLevels(levels)
  const classes: ReserveClass[] = [
    { id: "tight", name: "Tight", label: `Tight (< ${tight}%)`, max: tight, color: CLASS_COLORS.tight },
    { id: "watch", name: "Watch", label: `Watch (${tight}% to < ${watch}%)`, min: tight, max: watch, color: CLASS_COLORS.watch },
    { id: "moderate", name: "Moderate", label: `Moderate (${watch}% to < ${comfortable}%)`, min: watch, max: comfortable, color: CLASS_COLORS.moderate },
    { id: "comfortable", name: "Comfortable", label: `Comfortable (≥ ${comfortable}%)`, min: comfortable, color: CLASS_COLORS.comfortable }
  ]
  return classes.filter((c) => c.min == null || c.max == null || c.max > c.min)
}

/** The reserve class a margin % falls in (see {@link reserveClasses}); null for a non-finite value. */
export function classifyReserve(value: number, levels: ReserveLevels = {}): ReserveClass | null {
  if (!Number.isFinite(value)) return null
  return reserveClasses(levels).find((c) => (c.min == null || value >= c.min) && (c.max == null || value < c.max)) ?? null
}

/**
 * Stackable long-form fuel series for StackedAreaChart (`areaBy: "fuel"`).
 * Zero / missing fuels are omitted so empty keys do not invent area layers.
 */
export function stackFuelSeries(
  hours: readonly GridHour[],
  options: { fuels?: readonly GridFuelKey[]; includeZero?: boolean } = {}
): FuelStackRow[] {
  const fuels = options.fuels ?? GRID_FUEL_KEYS
  const includeZero = options.includeZero === true
  const out: FuelStackRow[] = []
  for (const hour of hours) {
    if (!hour || typeof hour.t !== "number") continue
    for (const fuel of fuels) {
      const mw = finite(hour.fuels?.[fuel])
      if (!includeZero && mw <= 0) continue
      out.push({
        t: hour.t,
        fuel,
        fuelLabel: GRID_FUEL_LABELS[fuel],
        mw,
        ba: hour.ba
      })
    }
  }
  return out
}

/**
 * DifferenceChart rows: series A = demand, series B = forecast.
 * Hours without a finite forecast are skipped.
 */
export function demandForecastRows(
  hours: readonly GridHour[]
): DemandForecastRow[] {
  const out: DemandForecastRow[] = []
  for (const hour of hours) {
    if (!hour || typeof hour.t !== "number") continue
    const demand = finite(hour.demandMw)
    const forecast = hour.forecastMw
    if (typeof forecast !== "number" || !Number.isFinite(forecast)) continue
    out.push({
      t: hour.t,
      a: demand,
      b: forecast,
      demandMw: demand,
      forecastMw: forecast,
      errorMw: demand - forecast,
      ba: hour.ba
    })
  }
  return out
}

/**
 * Readability proxy for operational headroom.
 *
 * ```
 * reserveMarginPct = ((supply - demand) / demand) * 100
 * supply = capacityOrNetGen + max(0, -interchange)  // imports add supply
 * ```
 *
 * When demand is 0, returns 0. Negative values mean demand exceeds supply.
 *
 * **Not** ISO contingency reserve (spinning + non-spinning + regulation).
 * Document that distinction wherever this number is shown.
 */
export function reserveMarginPct(input: {
  demand: number
  capacityOrNetGen: number
  interchange?: number
}): number {
  const demand = finite(input.demand)
  if (demand <= 0) return 0
  const gen = finite(input.capacityOrNetGen)
  const interchange = finite(input.interchange)
  // Negative interchange = imports into the BA (extra supply available).
  const importMw = interchange < 0 ? -interchange : 0
  const supply = gen + importMw
  return ((supply - demand) / demand) * 100
}

/** Per-hour reserve snapshots derived from {@link GridHour} rows. */
export function reserveSeries(hours: readonly GridHour[]): ReserveSnapshot[] {
  return hours
    .filter((h) => h && typeof h.t === "number")
    .map((hour) => {
      const demandMw = finite(hour.demandMw)
      const netGenMw = finite(hour.netGenMw)
      const margin = reserveMarginPct({
        demand: demandMw,
        capacityOrNetGen: netGenMw,
        interchange: hour.interchangeMw
      })
      const variableRenewablesMw =
        Math.max(0, finite(hour.fuels?.wind)) + Math.max(0, finite(hour.fuels?.solar))
      return {
        t: hour.t,
        ba: hour.ba,
        reserveMarginPct: margin,
        netLoadMw: demandMw - variableRenewablesMw,
        demandMw,
        netGenMw
      }
    })
}

/**
 * Declarative `styleRules` for marks whose primary value is reserve margin %,
 * one rule per {@link reserveClasses} class, highest first. Hatch on the tight
 * class so color is not the only encoding.
 *
 * Works on BarChart / DotPlot (ordinal) and LineChart / Scatterplot when the
 * mark value (or `field: "reserveMarginPct"`) is the margin percent.
 */
export function thresholdBandsForReserve(
  levels: ReserveLevels = {},
  options: {
    field?: string
    /** Override hatch for the tight band. */
    tightHatch?: HatchFill
    tightFill?: string
    watchFill?: string
    moderateFill?: string
    comfortableFill?: string
  } = {}
): StyleRule[] {
  const field = options.field
  const whenField = field ? { field } : {}

  const tightHatch: HatchFill =
    options.tightHatch ??
    ({
      type: "hatch",
      background: CLASS_COLORS.tight,
      stroke: "rgba(255, 240, 200, 0.55)",
      spacing: 5,
      angle: -35,
      lineWidth: 1.25,
      lineOpacity: 0.9
    } as HatchFill)

  const styles: Record<ReserveClassId, StyleRule["style"]> = {
    comfortable: { fill: options.comfortableFill ?? CLASS_COLORS.comfortable, fillOpacity: 0.85 },
    moderate: { fill: options.moderateFill ?? CLASS_COLORS.moderate, fillOpacity: 0.85 },
    watch: { fill: options.watchFill ?? CLASS_COLORS.watch, fillOpacity: 0.9 },
    tight: {
      fill: tightHatch,
      stroke: options.tightFill ?? CLASS_COLORS.tight,
      strokeWidth: 1,
      fillOpacity: 1
    }
  }

  return reserveClasses(levels).reverse().map((c) => ({
    id: `reserve-${c.id}`,
    label: c.label,
    when: {
      ...whenField,
      ...(c.min != null ? { gte: c.min } : {}),
      ...(c.max != null ? { lt: c.max } : {})
    },
    style: styles[c.id]
  }))
}

/**
 * Annotation band descriptors for reserve threshold strips (y-band style), one
 * per {@link reserveClasses} class, lowest first, named like the matching
 * {@link thresholdBandsForReserve} rule. Pair with chart `annotations` — not
 * the same object as styleRules.
 *
 * `extent` is the value axis' `[min, max]` margin (for example the shown
 * reserves' range); the lowest band starts at its min and the highest ends
 * at its max, widened to reach the levels. Without it the outer bands span
 * `-50` to `max(comfortable + 30, 40)`.
 */
export function reserveAnnotationBands(
  levels: ReserveLevels = {},
  options: { extent?: readonly [number, number] } = {}
): Array<{
  type: "band"
  y0: number
  y1: number
  label: string
  color: string
  fillOpacity: number
  emphasis: "secondary"
}> {
  const { tight, comfortable } = resolveLevels(levels)
  const [extentMin, extentMax] = options.extent ?? []
  const low = Math.min(tight, finite(extentMin, -50))
  const high = Math.max(comfortable, finite(extentMax, Math.max(comfortable + 30, 40)))
  const fillOpacity: Record<ReserveClassId, number> = { tight: 0.12, watch: 0.1, moderate: 0.08, comfortable: 0.06 }
  return reserveClasses(levels).map((c) => ({
    type: "band" as const,
    y0: c.min ?? low,
    y1: c.max ?? high,
    label: c.name,
    color: c.color,
    fillOpacity: fillOpacity[c.id],
    emphasis: "secondary" as const
  }))
}

/** Summarize the operating point at `now` (or the last hour ≤ now). */
export function summarizeOperatingPoint(
  hours: readonly GridHour[],
  now?: number
): OperatingPointSummary | null {
  if (!hours.length) return null
  const sorted = [...hours]
    .filter((h) => h && typeof h.t === "number")
    .sort((a, b) => a.t - b.t)
  if (!sorted.length) return null

  let hour = sorted[sorted.length - 1]
  if (typeof now === "number" && Number.isFinite(now)) {
    const atOrBefore = sorted.filter((h) => h.t <= now)
    hour = atOrBefore.length ? atOrBefore[atOrBefore.length - 1] : sorted[0]
  }

  const demandMw = finite(hour.demandMw)
  const netGenMw = finite(hour.netGenMw)
  const forecastMw =
    typeof hour.forecastMw === "number" && Number.isFinite(hour.forecastMw)
      ? hour.forecastMw
      : null
  const margin = reserveMarginPct({
    demand: demandMw,
    capacityOrNetGen: netGenMw,
    interchange: hour.interchangeMw
  })

  const fuelShares: Partial<Record<GridFuelKey, number>> = {}
  let topFuel: GridFuelKey | null = null
  let topFuelMw = 0
  let totalFuel = 0
  for (const key of GRID_FUEL_KEYS) {
    const mw = finite(hour.fuels?.[key])
    if (mw <= 0) continue
    totalFuel += mw
    fuelShares[key] = mw
    if (mw > topFuelMw) {
      topFuelMw = mw
      topFuel = key
    }
  }
  // Convert absolute MW map to shares when we have a total.
  if (totalFuel > 0) {
    for (const key of Object.keys(fuelShares) as GridFuelKey[]) {
      fuelShares[key] = (fuelShares[key] as number) / totalFuel
    }
  }

  return {
    t: hour.t,
    ba: hour.ba,
    demandMw,
    forecastMw,
    forecastErrorMw: forecastMw == null ? null : demandMw - forecastMw,
    netGenMw,
    reserveMarginPct: margin,
    topFuel,
    topFuelShare: totalFuel > 0 ? topFuelMw / totalFuel : 0,
    topFuelMw,
    fuelShares
  }
}

/**
 * Convert authored event windows into annotation objects with provenance + lifecycle
 * fields suitable for `applyAnnotationLifecycle`.
 *
 * Returns plain annotation dicts (not React nodes). Callers may pass the array to
 * chart `annotations` after lifecycle treatment.
 */
export function gridEventAnnotations(
  events: readonly GridEventWindow[],
  options: {
    now?: number
    author?: string
    source?: string
    /**
     * Provenance confidence (0–1) stamped on every event. Omitted by default:
     * authored windows carry no measured confidence.
     */
    confidence?: number
  } = {}
): Array<Record<string, unknown>> {
  const now = options.now ?? Date.now()
  const author = options.author ?? "system"
  const source = options.source ?? "authored-scenario"
  return events.map((event) => {
    const mid = (event.start + event.end) / 2
    const createdAt = new Date(event.start).toISOString()
    return {
      type: "x-band",
      x0: event.start,
      x1: event.end,
      label: event.label,
      color:
        event.kind === "outage"
          ? "var(--semiotic-danger)"
          : "var(--semiotic-warning)",
      fillOpacity: 0.12,
      emphasis: "secondary",
      // Anchor mid-window for callout-style notes if consumers re-map type.
      x: mid,
      y: event.y ?? event.value,
      note: event.note,
      provenance: {
        author,
        authorKind: "system",
        source,
        basis: "rule",
        ...(typeof options.confidence === "number" && Number.isFinite(options.confidence)
          ? { confidence: Math.min(1, Math.max(0, options.confidence)) }
          : {}),
        createdAt,
        stableId: event.id,
        dataVersion: String(event.start)
      },
      lifecycle: {
        status: "accepted",
        ttlHint: event.ttlHint ?? "P14D",
        anchor: "fixed"
      },
      // Stamped so applyAnnotationLifecycle can age relative to scenario "now".
      _eventKind: event.kind,
      _createdAtMs: event.start,
      _nowMs: now
    }
  })
}

/** Pick the top N tightest-margin hours for a ranked risk strip. */
export function tightestHours(
  reserves: readonly ReserveSnapshot[],
  n = 12
): ReserveSnapshot[] {
  return [...reserves]
    .filter((r) => Number.isFinite(r.reserveMarginPct))
    .sort((a, b) => a.reserveMarginPct - b.reserveMarginPct)
    .slice(0, Math.max(0, n))
}

/** Format MW with locale grouping; returns "—" for non-finite. */
export function formatMw(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "—"
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  })} MW`
}

/** Format reserve margin percent with sign awareness. */
export function formatReservePct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}%`
}
