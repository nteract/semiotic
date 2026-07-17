/**
 * Lived-distance / cost-cartogram helpers.
 *
 * Pure, SSR-safe utilities for turning geographic positions + friction factors
 * into the numeric `cost` field a `DistanceCartogram` (or any cost-ranked chart)
 * expects. The high-touch "Miles Are a Lie" example is the flagship consumer;
 * agents and apps should import these instead of re-deriving haversine math and
 * threshold style rules.
 */

import type { StyleRule } from "../charts/shared/styleRules"
import type { HatchFill } from "../charts/shared/hatchFill"

// ── Geography ──────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371
const DEG_TO_RAD = Math.PI / 180

/** Great-circle distance in kilometres between two WGS84 points. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const lat1 = a.lat * DEG_TO_RAD
  const lat2 = b.lat * DEG_TO_RAD
  const dLat = (b.lat - a.lat) * DEG_TO_RAD
  const dLon = (b.lon - a.lon) * DEG_TO_RAD
  const sinLat = Math.sin(dLat / 2)
  const sinLon = Math.sin(dLon / 2)
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Convert great-circle distance to travel minutes at a constant effective speed.
 * Default 48 km/h ≈ urban effective road speed including signals and congestion.
 */
export function greatCircleMinutes(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  options: { speedKmh?: number } = {},
): number {
  const speed = options.speedKmh ?? 48
  if (!(speed > 0)) return Number.POSITIVE_INFINITY
  return (haversineKm(a, b) / speed) * 60
}

// ── Cost composition ───────────────────────────────────────────────────────

export type CostFactor = {
  /** Machine id for provenance ledgers */
  id: string
  /** Human label */
  label?: string
  /** Multiplier applied to baseline (≥ 0). 1 = no change. */
  multiplier: number
  /** Optional source string for UI provenance */
  source?: string
}

/**
 * Compose a lived cost from a baseline and ordered friction factors.
 * `cost = baseline * Π multipliers` (non-finite / negative multipliers treated as 1).
 */
export function composeCost(
  baseline: number,
  factors: ReadonlyArray<CostFactor | number> = [],
): number {
  if (!Number.isFinite(baseline) || baseline < 0) return 0
  let cost = baseline
  for (const factor of factors) {
    const multiplier =
      typeof factor === "number" ? factor : Number(factor?.multiplier)
    if (!Number.isFinite(multiplier) || multiplier < 0) continue
    cost *= multiplier
  }
  return cost
}

/**
 * Stretch index: lived cost relative to pure geographic minutes.
 * 1 = geography is honest; 1.4 = 40% farther in time/cost than miles imply.
 */
export function stretchIndex(cost: number, geographicMinutes: number): number {
  if (!(geographicMinutes > 0) || !Number.isFinite(cost)) return 1
  return cost / geographicMinutes
}

export type CostedPoint<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  geographicMinutes: number
  baselineMinutes: number
  cost: number
  /**
   * Lived cost relative to the authored/normal baseline (friction only).
   * Calm weather + no alerts ⇒ ~1. Prefer this for thresholds / styleRules.
   */
  stretch: number
  /**
   * Lived cost relative to crow-flies minutes — how much “miles lie” even
   * before weather. Often ≫ 1 for urban baselines.
   */
  geographicStretch: number
  factors: CostFactor[]
}

export type CostPointInput = {
  id: string
  lat: number
  lon: number
  /** Authored baseline minutes; falls back to great-circle minutes when omitted. */
  baselineMinutes?: number
  [key: string]: unknown
}

/**
 * Attach geographic minutes, baseline, composed cost, and stretch to each point
 * relative to a center. Ready to pass as `points` to `DistanceCartogram` with
 * `costAccessor="cost"`.
 */
export function costPointsFromCenter<T extends CostPointInput>(
  center: { lat: number; lon: number },
  points: ReadonlyArray<T>,
  options: {
    factorsForPoint?: (point: T, geographicMinutes: number) => ReadonlyArray<CostFactor | number>
    /** Global factors applied to every point after per-point factors */
    globalFactors?: ReadonlyArray<CostFactor | number>
    speedKmh?: number
  } = {},
): CostedPoint<T>[] {
  const { factorsForPoint, globalFactors = [], speedKmh } = options
  return points.map((point) => {
    const geographicMinutes = greatCircleMinutes(center, point, { speedKmh })
    const baselineMinutes =
      typeof point.baselineMinutes === "number" && Number.isFinite(point.baselineMinutes)
        ? Math.max(0, point.baselineMinutes)
        : geographicMinutes
    const local = factorsForPoint?.(point, geographicMinutes) ?? []
    const factors: CostFactor[] = [...local, ...globalFactors].map((factor, index) =>
      typeof factor === "number"
        ? { id: `factor-${index}`, multiplier: factor }
        : factor,
    )
    const cost = composeCost(baselineMinutes, factors)
    // Prefer baseline as the stretch denominator when present so threshold
    // rules encode *today's friction*, not permanent urban geometry.
    const stretchReference =
      baselineMinutes > 0 ? baselineMinutes : Math.max(geographicMinutes, 1e-6)
    return {
      ...point,
      geographicMinutes,
      baselineMinutes,
      cost,
      stretch: stretchIndex(cost, stretchReference),
      geographicStretch: stretchIndex(cost, Math.max(geographicMinutes, 1e-6)),
      factors,
    }
  })
}

export type StretchSummary = {
  /** Median stretch across points (center excluded if cost≈0). */
  medianStretch: number
  meanStretch: number
  maxStretch: number
  worstId: string | null
  count: number
}

/** Aggregate how warped a destination set is under current costs. */
export function summarizeStretch(
  points: ReadonlyArray<{ id?: string; cost: number; geographicMinutes: number; stretch?: number }>,
): StretchSummary {
  const rows = points
    .map((point) => ({
      id: point.id ?? null,
      stretch:
        typeof point.stretch === "number"
          ? point.stretch
          : stretchIndex(point.cost, point.geographicMinutes),
    }))
    .filter((row) => Number.isFinite(row.stretch) && row.stretch > 0)

  if (rows.length === 0) {
    return { medianStretch: 1, meanStretch: 1, maxStretch: 1, worstId: null, count: 0 }
  }

  const sorted = [...rows].sort((a, b) => a.stretch - b.stretch)
  const mid = Math.floor(sorted.length / 2)
  const medianStretch =
    sorted.length % 2 === 0
      ? (sorted[mid - 1].stretch + sorted[mid].stretch) / 2
      : sorted[mid].stretch
  const meanStretch = rows.reduce((sum, row) => sum + row.stretch, 0) / rows.length
  const worst = sorted[sorted.length - 1]
  return {
    medianStretch,
    meanStretch,
    maxStretch: worst.stretch,
    worstId: worst.id,
    count: rows.length,
  }
}

// ── Friction models ────────────────────────────────────────────────────────

export type WeatherFrictionInput = {
  /** Daily precipitation sum, mm */
  precipitationMm?: number
  /** Max wind speed, km/h */
  windKmh?: number
  /** Minimum visibility, metres (Open-Meteo visibility) */
  visibilityM?: number
  /** Mean temperature °C — extreme heat/cold adds friction */
  temperatureC?: number
}

/**
 * Map coarse weather observations to a travel-friction multiplier.
 * Tuned for storytelling clarity, not traffic engineering certification.
 *
 * Returns ≥ 1. Provenance-friendly: always emits a labeled CostFactor.
 */
export function weatherFrictionFactor(input: WeatherFrictionInput = {}): CostFactor {
  const precip = Math.max(0, input.precipitationMm ?? 0)
  const wind = Math.max(0, input.windKmh ?? 0)
  const visibility = input.visibilityM
  const temp = input.temperatureC

  let multiplier = 1
  // Rain: +2% per mm up to +35%
  multiplier += Math.min(0.35, precip * 0.02)
  // Wind: +0.3% per km/h above 25, up to +20%
  if (wind > 25) multiplier += Math.min(0.2, (wind - 25) * 0.003)
  // Low visibility
  if (typeof visibility === "number" && Number.isFinite(visibility)) {
    if (visibility < 1000) multiplier += 0.25
    else if (visibility < 4000) multiplier += 0.12
    else if (visibility < 8000) multiplier += 0.05
  }
  // Temperature extremes
  if (typeof temp === "number" && Number.isFinite(temp)) {
    if (temp >= 38) multiplier += 0.08
    else if (temp <= -10) multiplier += 0.12
    else if (temp <= 0) multiplier += 0.05
  }

  multiplier = Math.round(multiplier * 1000) / 1000
  return {
    id: "weather",
    label: "Weather friction",
    multiplier: Math.max(1, multiplier),
    source: "modeled from precipitation, wind, visibility, temperature",
  }
}

export type AlertSeverity = "minor" | "moderate" | "severe" | "extreme" | string

/**
 * Map an alert severity (e.g. NWS) to a friction multiplier.
 * Multiple alerts should be composed with `composeCost` (multiplicative).
 */
export function alertFrictionFactor(
  severity: AlertSeverity | null | undefined,
  options: { id?: string; label?: string; source?: string } = {},
): CostFactor {
  const key = String(severity ?? "").toLowerCase()
  let multiplier = 1
  if (key === "extreme") multiplier = 1.35
  else if (key === "severe") multiplier = 1.22
  else if (key === "moderate" || key === "warning") multiplier = 1.12
  else if (key === "minor" || key === "watch" || key === "advisory") multiplier = 1.05

  return {
    id: options.id ?? `alert-${key || "none"}`,
    label: options.label ?? (severity ? `${severity} alert` : "No alert"),
    multiplier,
    source: options.source ?? "alert severity",
  }
}

// ── Style rules & annotations ──────────────────────────────────────────────

export type StretchStyleThresholds = {
  /** Stretch ≥ this → warning color @default 1.15 */
  warnAt?: number
  /** Stretch ≥ this → danger color @default 1.35 */
  dangerAt?: number
  warnColor?: string
  dangerColor?: string
  /**
   * Datum field encoding stretch. Defaults to `"stretch"` so the same rules
   * work on DistanceCartogram points and ranked corridor bars. Pass `null` to
   * compare against the host-resolved `ctx.value` (e.g. BarChart valueAccessor).
   */
  field?: string | null
  /** Optional hatch on the danger band for CVD-safe encoding */
  hatchDanger?: boolean | HatchFill
}

/**
 * Declarative `styleRules` for marks whose stretch field (or host `ctx.value`)
 * encodes lived-cost warp. Last applicable rule wins — danger overrides warn.
 *
 * Serializable (no predicate closures) so the same array works in React,
 * `renderChart`, and MCP configs.
 */
export function stretchStyleRules(options: StretchStyleThresholds = {}): StyleRule[] {
  const warnAt = options.warnAt ?? 1.15
  const dangerAt = options.dangerAt ?? 1.35
  const warnColor = options.warnColor ?? "var(--semiotic-warning)"
  const dangerColor = options.dangerColor ?? "var(--semiotic-danger)"
  const field = options.field === undefined ? "stretch" : options.field
  const hatch =
    options.hatchDanger === false
      ? null
      : typeof options.hatchDanger === "object"
        ? options.hatchDanger
        : ({
            type: "hatch",
            background: dangerColor,
            // Literal stroke — offscreen hatch tiles don't resolve CSS vars.
            stroke: "rgba(255,255,255,0.65)",
            spacing: 6,
            angle: -35,
            lineWidth: 1.25,
            lineOpacity: 0.55,
          } satisfies HatchFill)

  const warnWhen =
    field == null ? { gte: warnAt, lt: dangerAt } : { field, gte: warnAt, lt: dangerAt }
  const dangerWhen = field == null ? { gte: dangerAt } : { field, gte: dangerAt }

  const rules: StyleRule[] = [
    {
      when: warnWhen,
      style: { fill: warnColor },
    },
    {
      when: dangerWhen,
      style: hatch ? { fill: hatch } : { fill: dangerColor },
    },
  ]
  return rules
}

export type AlertAnnotationInput = {
  id: string
  label: string
  /** Epoch ms when the alert became active */
  createdAt: number
  /** ISO-8601 duration or ms — drives freshness bands */
  ttlHint?: string | number
  severity?: AlertSeverity
  /** Geographic or data anchor fields for the chart family */
  [key: string]: unknown
}

/**
 * Stamp system-authored alert notes with provenance + lifecycle so
 * `applyAnnotationLifecycle` can age them on the chart.
 */
export function alertToAnnotation<T extends AlertAnnotationInput>(
  alert: T,
  options: {
    author?: string
    source?: string
    confidence?: number
  } = {},
): T & {
  provenance: {
    author: string
    authorKind: "system"
    source: string
    basis: "external-source"
    confidence?: number
    createdAt: string
    stableId: string
  }
  lifecycle: {
    ttlHint: string | number
    anchor: "fixed"
  }
} {
  const createdAtIso = new Date(alert.createdAt).toISOString()
  return {
    ...alert,
    provenance: {
      author: options.author ?? "alert-feed",
      authorKind: "system",
      source: options.source ?? "external-alert",
      basis: "external-source",
      confidence: options.confidence,
      createdAt: createdAtIso,
      stableId: alert.id,
    },
    lifecycle: {
      ttlHint: alert.ttlHint ?? "P2D",
      anchor: "fixed",
    },
  }
}
