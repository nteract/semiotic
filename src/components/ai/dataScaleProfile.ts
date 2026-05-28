/**
 * Scale-aware suggestion overlay. The companion to AudienceProfile: where
 * AudienceProfile describes *who* reads the chart, DataScaleProfile and
 * DataQualityProfile describe *how big* and *how clean* the data actually is.
 *
 * Semiotic does not measure scale or quality from the data passed to it —
 * the row data may be a sample, a future projection, or completely absent.
 * Orgs declare these facts up front and the suggestion engine biases
 * rankings accordingly. Identical philosophy to AudienceProfile.
 *
 * The two profiles compose additively with the audience overlay:
 *
 *   composite = baseScore
 *             + scaleBias(scale,   capability, profile)
 *             + qualityBias(quality, capability, profile)
 *             + audienceBias(audience, capability)
 *
 * Each layer can be omitted independently. Most adjust ranking only, but
 * per-chart scale preferences can also hard-filter via `minBand`/`maxBand`
 * exclusions in addition to `fits()`.
 */

import type { ChartCapability, ChartDataProfile } from "./chartCapabilityTypes"

// ----------------------------------------------------------------------------
// Bands
// ----------------------------------------------------------------------------

/**
 * Coarse row-count band. Used for grouping suggestions ("show me charts that
 * work at small scale") and for surfacing scale-band on each suggestion.
 *
 * Defaults below are research-backed starting points — see DEFAULT_SCALE_THRESHOLDS.
 */
export type ScaleBand = "tiny" | "small" | "medium" | "large" | "huge"

/**
 * Coarse cardinality band. A "low"-cardinality field is bar-chart-able;
 * "high" almost always wants treemap, force layout, or aggregation.
 */
export type CardinalityBand = "low" | "medium" | "high"

/**
 * Field-count band. "narrow" datasets need at most one mark per column;
 * "wide" datasets typically need a matrix-style layout (parallel coords,
 * scatterplot matrix, heatmap of fields).
 */
export type FieldBand = "narrow" | "typical" | "wide"

// ----------------------------------------------------------------------------
// Default thresholds
// ----------------------------------------------------------------------------

/**
 * Research-backed default breakpoints. Treat as starting points — orgs override
 * via `DataScaleProfile.thresholds`.
 *
 * Row thresholds:
 *   • tiny ≤ 3      — single-value territory; recommendation often "a value, not a chart"
 *   • small ≤ 25    — Miller's 7±2 plus a comfortable buffer; bar/pie/dot legible
 *   • medium ≤ 250  — line/scatter/area sweet spot (Cleveland-McGill, position channel)
 *   • large ≤ 5000  — dense scatter/heatmap/ridgeline (Munzner ch. 10 quantitative encoding)
 *   • huge > 5000   — aggregation, sampling, density reduction required (Few, "Now You See It")
 *
 * Cardinality (per categorical field):
 *   • low ≤ 7       — Miller (1956); robust bar chart
 *   • medium ≤ 25   — bar still legible with care; treemap competitive
 *   • high > 25     — treemap, packed force, or aggregation
 *
 * Field count:
 *   • narrow ≤ 3    — single-mark-per-row layouts dominate
 *   • typical ≤ 10  — standard catalog applies
 *   • wide > 10     — parallel coords / scatterplot matrix territory
 *
 * References:
 *   - Miller, G.A. (1956). "The Magical Number Seven, Plus or Minus Two."
 *     Psychological Review, 63(2), 81–97.
 *   - Cleveland, W.S. & McGill, R. (1984). "Graphical Perception: Theory,
 *     Experimentation, and Application to the Development of Graphical Methods."
 *     JASA, 79(387), 531–554.
 *   - Munzner, T. (2014). Visualization Analysis and Design, ch. 10.
 *   - Few, S. (2009). Now You See It: Simple Visualization Techniques for
 *     Quantitative Analysis.
 */
export const DEFAULT_SCALE_THRESHOLDS = {
  rows: { tiny: 3, small: 25, medium: 250, large: 5000 },
  cardinality: { low: 7, medium: 25 },
  fields: { narrow: 3, typical: 10 },
} as const

export interface ScaleThresholds {
  rows?: { tiny?: number; small?: number; medium?: number; large?: number }
  cardinality?: { low?: number; medium?: number }
  fields?: { narrow?: number; typical?: number }
}

// ----------------------------------------------------------------------------
// User-declared profiles
// ----------------------------------------------------------------------------

/**
 * Per-chart scale preference — analogous to AudienceProfile.targets but scoped
 * to scale fit. Lets orgs say "we'd rather not see Heatmap below 100 rows even
 * when the engine thinks it's competitive."
 */
export interface ChartScalePreference {
  /** Add this many points to the composite score for this chart. Range -3..+3. */
  bias?: number
  /** Restrict suggestion of this chart to data with rows in this band or above. */
  minBand?: ScaleBand
  /** Restrict suggestion of this chart to data with rows in this band or below. */
  maxBand?: ScaleBand
  /** Human-readable rationale. Surfaces in suggestion.reasons when the rule fires. */
  reason?: string
}

/**
 * Forward-looking declaration of how big the user's data actually is. The row
 * data passed to suggestCharts may be a sample, a stub, or a future projection;
 * DataScaleProfile is what the chart needs to actually handle at production.
 *
 * Every field is optional. Omitting a field falls back to what profileData()
 * measured from the sample. Specifying a field overrides the measurement.
 */
export interface DataScaleProfile {
  /**
   * Production row count. May be larger than the sample passed to suggestCharts.
   * Accepts a band string ("medium") for hand-waving estimates, or an exact number.
   */
  rows?: number | ScaleBand
  /**
   * Production field/column count. Affects parallel-coords / matrix recommendations.
   */
  fields?: number | FieldBand
  /**
   * Per-field cardinality. Use field name as key; value is distinct count or band.
   * @example cardinality: { region: 12, status: "low" }
   */
  cardinality?: Partial<Record<string, number | CardinalityBand>>
  /**
   * Aggregate cardinality fallback when per-field isn't declared. The "typical"
   * categorical field in this dataset has this much cardinality.
   */
  typicalCardinality?: number | CardinalityBand
  /**
   * How does this dataset grow?
   *   • "static"    — fixed, or refreshed periodically as a whole
   *   • "appending" — grows by adding rows; old rows are stable
   *   • "windowed"  — sliding window of recent data (e.g. last 7 days)
   * Affects streaming recommendations and decay/staleness defaults.
   */
  growth?: "static" | "appending" | "windowed"
  /**
   * Override the default scale thresholds for this profile. Orgs use this to
   * encode their own definition of "small" / "medium" / "large" — e.g. a BI
   * shop where 10k rows is "small" because dashboards typically run 100k+.
   */
  thresholds?: ScaleThresholds
  /**
   * Per-chart preferences. Like AudienceProfile.familiarity / .targets,
   * orgs can override scale fit on a per-component basis.
   * @example charts: { Heatmap: { minBand: "medium", reason: "below 50 rows the cells are dominant noise" } }
   */
  charts?: Partial<Record<string, ChartScalePreference>>
  /** Display name. Surfaced in suggestion.reasons when scale bias fires. */
  name?: string
}

/**
 * User-declared data-quality profile. Quality issues affect *which treatment*
 * of a chart is recommended (broken vs connected lines, log vs linear, with vs
 * without regression overlay), and can add caveats. Quality biases score
 * modestly but biases caveats heavily.
 */
export interface DataQualityProfile {
  /**
   * Fraction of non-null values (0..1). Map of field name → completeness, or
   * a single aggregate. 1.0 = complete; 0.5 = half the values missing.
   * @example completeness: { revenue: 0.98, cohort: 0.62 }
   */
  completeness?: Partial<Record<string, number>> | number
  /**
   * Fraction of values flagged as outliers (0..1). Affects recommendations
   * for regression overlays, log scales, and outlier-detection intent.
   * @example outliers: { revenue: 0.04 }
   */
  outliers?: Partial<Record<string, number>> | number
  /**
   * Fraction of values that don't match the dominant type for the field (0..1).
   * Strings mixed into a numeric column, dates in arbitrary formats, etc.
   * High heterogeneity → caveats and possibly reject from numeric-required charts.
   */
  typeHeterogeneity?: Partial<Record<string, number>> | number
  /** Display name. Surfaced in suggestion.reasons when quality bias fires. */
  name?: string
}

// ----------------------------------------------------------------------------
// Classification
// ----------------------------------------------------------------------------

const BAND_ORDER: ScaleBand[] = ["tiny", "small", "medium", "large", "huge"]

/**
 * Resolve declared thresholds against the defaults. Merges shallowly so a
 * partial override is honored without losing the unrelated bands.
 */
function resolveThresholds(thresholds?: ScaleThresholds) {
  return {
    rows: { ...DEFAULT_SCALE_THRESHOLDS.rows, ...(thresholds?.rows ?? {}) },
    cardinality: { ...DEFAULT_SCALE_THRESHOLDS.cardinality, ...(thresholds?.cardinality ?? {}) },
    fields: { ...DEFAULT_SCALE_THRESHOLDS.fields, ...(thresholds?.fields ?? {}) },
  }
}

/**
 * Classify a row count into a ScaleBand using the profile's thresholds (or defaults).
 */
export function classifyRowBand(rows: number, scale?: DataScaleProfile): ScaleBand {
  if (!Number.isFinite(rows) || rows < 0) return "tiny"
  const t = resolveThresholds(scale?.thresholds).rows
  if (rows <= t.tiny) return "tiny"
  if (rows <= t.small) return "small"
  if (rows <= t.medium) return "medium"
  if (rows <= t.large) return "large"
  return "huge"
}

/**
 * Classify cardinality. Per-field if the field is named; otherwise the aggregate.
 */
export function classifyCardinalityBand(
  count: number,
  scale?: DataScaleProfile,
): CardinalityBand {
  if (!Number.isFinite(count) || count < 0) return "low"
  const t = resolveThresholds(scale?.thresholds).cardinality
  if (count <= t.low) return "low"
  if (count <= t.medium) return "medium"
  return "high"
}

/**
 * Classify field count.
 */
export function classifyFieldBand(count: number, scale?: DataScaleProfile): FieldBand {
  if (!Number.isFinite(count) || count < 0) return "narrow"
  const t = resolveThresholds(scale?.thresholds).fields
  if (count <= t.narrow) return "narrow"
  if (count <= t.typical) return "typical"
  return "wide"
}

/**
 * Compare two bands by order (tiny < small < medium < large < huge).
 * Returns negative if a < b, zero if equal, positive if a > b.
 */
export function compareBands(a: ScaleBand, b: ScaleBand): number {
  return BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b)
}

/**
 * Resolve a declared `rows` value (number, band, or undefined) to an effective
 * row count for bias calculations. Bands resolve to the midpoint of their range.
 *
 * When the user declares a number, we use it directly. When they declare a band,
 * we use a representative point inside that band. When they declare nothing,
 * we fall back to the profile's measured rowCount.
 */
export function resolveRowsToNumber(
  declared: number | ScaleBand | undefined,
  measuredRows: number,
  scale?: DataScaleProfile,
): number {
  if (typeof declared === "number" && Number.isFinite(declared)) return declared
  if (declared !== undefined) {
    // Band → representative midpoint
    const t = resolveThresholds(scale?.thresholds).rows
    switch (declared) {
      case "tiny": return Math.max(1, Math.floor(t.tiny / 2))
      case "small": return Math.floor((t.tiny + t.small) / 2)
      case "medium": return Math.floor((t.small + t.medium) / 2)
      case "large": return Math.floor((t.medium + t.large) / 2)
      case "huge": return Math.floor(t.large * 2)
    }
  }
  return measuredRows
}

/**
 * Resolve a declared cardinality value to a number.
 */
export function resolveCardinalityToNumber(
  declared: number | CardinalityBand | undefined,
  measured: number | undefined,
  scale?: DataScaleProfile,
): number | undefined {
  if (typeof declared === "number" && Number.isFinite(declared)) return declared
  if (declared !== undefined) {
    const t = resolveThresholds(scale?.thresholds).cardinality
    switch (declared) {
      case "low": return Math.max(1, Math.floor(t.low / 2))
      case "medium": return Math.floor((t.low + t.medium) / 2)
      case "high": return Math.floor(t.medium * 2)
    }
  }
  return measured
}

// ----------------------------------------------------------------------------
// Effective scale — what the engine reasons over
// ----------------------------------------------------------------------------

/**
 * The effective scale view the engine reasons over. Merges the declared
 * DataScaleProfile with the profile's measured stats. Surfaced on each
 * Suggestion so callers can detect threshold crossings ("you outgrew this
 * chart") and so the conversational layer can narrate scale rationale.
 */
export interface EffectiveScale {
  /** Effective row count after merging declared scale with measured profile. */
  rows: number
  /** Band classification of the effective row count. */
  rowBand: ScaleBand
  /** Effective field count. */
  fields: number
  /** Band classification of the effective field count. */
  fieldBand: FieldBand
  /** Typical-category cardinality, if known. */
  typicalCardinality?: number
  /** Band of that cardinality. */
  cardinalityBand?: CardinalityBand
  /** Pass-through of growth mode (defaults to "static"). */
  growth: "static" | "appending" | "windowed"
  /** Source of the rows number: "declared" if user provided, "measured" otherwise. */
  rowsSource: "declared" | "measured"
}

/**
 * Compute the effective scale for a profile under the optional declared scale.
 * When no scale is declared, the profile's measured stats define everything.
 */
export function computeEffectiveScale(
  profile: ChartDataProfile,
  scale?: DataScaleProfile,
): EffectiveScale {
  const measuredRows = profile.rowCount ?? 0
  const declaredRows = scale?.rows
  const rows = resolveRowsToNumber(declaredRows, measuredRows, scale)
  const rowBand = classifyRowBand(rows, scale)

  const measuredFields = Object.keys(profile.fields ?? {}).length
  const declaredFields = scale?.fields
  const fields = typeof declaredFields === "number"
    ? declaredFields
    : typeof declaredFields === "string"
      ? resolveFieldBandToNumber(declaredFields, scale)
      : measuredFields
  const fieldBand = classifyFieldBand(fields, scale)

  // Cardinality: prefer per-field declared on the *primary category field*; fall
  // back to typical declared, then to measured categoryCount.
  const primaryCat = profile.primary.category
  const perFieldDeclared = primaryCat ? scale?.cardinality?.[primaryCat] : undefined
  const typical = resolveCardinalityToNumber(
    perFieldDeclared ?? scale?.typicalCardinality,
    profile.categoryCount,
    scale,
  )
  const cardinalityBand = typical !== undefined ? classifyCardinalityBand(typical, scale) : undefined

  return {
    rows,
    rowBand,
    fields,
    fieldBand,
    typicalCardinality: typical,
    cardinalityBand,
    growth: scale?.growth ?? "static",
    rowsSource: declaredRows !== undefined ? "declared" : "measured",
  }
}

function resolveFieldBandToNumber(band: FieldBand, scale?: DataScaleProfile): number {
  const t = resolveThresholds(scale?.thresholds).fields
  switch (band) {
    case "narrow": return Math.max(1, Math.floor(t.narrow / 2))
    case "typical": return Math.floor((t.narrow + t.typical) / 2)
    case "wide": return Math.floor(t.typical * 2)
  }
}

// ----------------------------------------------------------------------------
// Bias
// ----------------------------------------------------------------------------

// Scale bias has to be strong enough to reorder rankings — a 5.0 chart in its
// wrong scale band should be able to lose to a 3.0 chart in its right band.
// Audience target bias maxes at ±3.0 (weight 3); scale bias sits below that so
// audience preferences still dominate scale fit when they conflict, but above
// familiarity (±1.0) since scale is a stronger claim about data than literacy.
const SCALE_BIAS_MAX = 2.5
const QUALITY_BIAS_MAX = 1.0
const PREFERENCE_BIAS_MAX = 3.0

export interface ScaleBiasResult {
  /** Score delta to apply to the suggestion composite. */
  delta: number
  /** Reasons to append to the suggestion.reasons[] array. */
  reasons: string[]
  /** Caveats to append (mostly from quality). */
  caveats: string[]
  /** True if a per-chart minBand/maxBand restriction excluded this chart. */
  excluded: boolean
}

/**
 * Apply scale and quality bias to a chart's composite score.
 *
 * Two terms compose additively beyond the audience bias:
 *   • Capability scale-fit: each capability optionally declares a `scaleFit`
 *     function returning {delta, reason?, caveat?}. Range ±SCALE_BIAS_MAX.
 *   • Org per-chart preference: `DataScaleProfile.charts[component]` can
 *     pin a chart to a band range (excludes outside it) and add an
 *     org-defined bias. Range ±PREFERENCE_BIAS_MAX.
 *
 * Pure function — used by both `suggestCharts` and any caller that needs
 * to reason about a single (capability × variant × scale) tuple.
 */
export function applyScaleBias(
  capability: ChartCapability,
  profile: ChartDataProfile,
  effectiveScale: EffectiveScale,
  scale: DataScaleProfile | undefined,
  quality: DataQualityProfile | undefined,
): ScaleBiasResult {
  const reasons: string[] = []
  const caveats: string[] = []
  let delta = 0
  let excluded = false

  // 1. Capability self-declared scale fit.
  if (capability.scaleFit) {
    const fit = capability.scaleFit(profile, effectiveScale, scale)
    if (fit) {
      const clamped = Math.max(-SCALE_BIAS_MAX, Math.min(SCALE_BIAS_MAX, fit.delta ?? 0))
      delta += clamped
      if (fit.reason) reasons.push(fit.reason)
      if (fit.caveats) for (const c of fit.caveats) caveats.push(c)
    }
  }

  // 2. Org per-chart preference.
  const pref = scale?.charts?.[capability.component]
  if (pref) {
    if (pref.minBand && compareBands(effectiveScale.rowBand, pref.minBand) < 0) {
      excluded = true
    } else if (pref.maxBand && compareBands(effectiveScale.rowBand, pref.maxBand) > 0) {
      excluded = true
    } else if (typeof pref.bias === "number") {
      const clamped = Math.max(-PREFERENCE_BIAS_MAX, Math.min(PREFERENCE_BIAS_MAX, pref.bias))
      delta += clamped
      if (pref.reason) {
        const prefix = scale?.name ? `${scale.name}: ` : ""
        reasons.push(`${prefix}${pref.reason}`)
      }
    } else if (pref.reason) {
      const prefix = scale?.name ? `${scale.name}: ` : ""
      reasons.push(`${prefix}${pref.reason}`)
    }
  }

  // 3. Quality bias. Capabilities can optionally declare a qualityFit; absent
  //    that, we add caveats based on completeness/outlier heuristics.
  if (quality && capability.qualityFit) {
    const fit = capability.qualityFit(profile, quality)
    if (fit) {
      const clamped = Math.max(-QUALITY_BIAS_MAX, Math.min(QUALITY_BIAS_MAX, fit.delta ?? 0))
      delta += clamped
      if (fit.reason) reasons.push(fit.reason)
      if (fit.caveats) for (const c of fit.caveats) caveats.push(c)
    }
  } else if (quality) {
    // Default heuristic: low completeness on the primary y field is worth a caveat
    // for any chart that consumes y.
    const yField = profile.primary.y
    if (yField) {
      const c = pickFieldNumber(quality.completeness, yField)
      if (c !== undefined && c < 0.85) {
        caveats.push(`${yField} is only ${Math.round(c * 100)}% complete — expect gaps`)
      }
    }
  }

  return { delta, reasons, caveats, excluded }
}

function pickFieldNumber(
  source: Partial<Record<string, number>> | number | undefined,
  field: string,
): number | undefined {
  if (source === undefined) return undefined
  if (typeof source === "number") return source
  const v = source[field]
  return typeof v === "number" ? v : undefined
}

/**
 * Declarative sugar for capability authors. Convert a hint object into a
 * scaleFit function. The hint object expresses the sweet-spot row range and
 * optional cardinality range; the engine derives a smooth bias curve.
 *
 * Use this when the chart's scale behavior is straightforward. For more
 * sophisticated logic (e.g. "smoothing variant degrades faster at high cardinality"),
 * write a scaleFit function directly.
 *
 * @example
 * scaleFit: scaleHints({
 *   rows: { sweetSpot: [25, 1000], caveatAbove: 5000 },
 *   cardinality: { sweetSpot: [3, 15], caveatAbove: 30 },
 * })
 */
export interface ScaleHintInput {
  rows?: {
    sweetSpot: [number, number]
    caveatAbove?: number
    caveatBelow?: number
  }
  cardinality?: {
    sweetSpot: [number, number]
    caveatAbove?: number
  }
}

export type ScaleFitFn = (
  profile: ChartDataProfile,
  effective: EffectiveScale,
  scale: DataScaleProfile | undefined,
) => ScaleFitResult | null

export interface ScaleFitResult {
  delta: number
  reason?: string
  caveats?: string[]
}

export type QualityFitFn = (
  profile: ChartDataProfile,
  quality: DataQualityProfile,
) => ScaleFitResult | null

/**
 * Build a scaleFit function from a declarative hint shape. Smooth bias —
 * positive inside the sweet spot, decays toward zero, and tips negative
 * past the caveat thresholds. The decay is gradual rather than a cliff
 * so a chart isn't all-or-nothing at the boundary.
 */
export function scaleHints(hint: ScaleHintInput): ScaleFitFn {
  return (_profile, effective) => {
    let delta = 0
    const caveats: string[] = []
    let reason: string | undefined

    if (hint.rows) {
      const [lo, hi] = hint.rows.sweetSpot
      if (effective.rows >= lo && effective.rows <= hi) {
        delta += 0.6
        reason = `${effective.rows} rows is in the sweet spot for this chart`
      } else if (effective.rows < lo) {
        // Below sweet spot: linear penalty proportional to how far we are
        const distance = lo === 0 ? 1 : (lo - effective.rows) / lo
        delta -= Math.min(SCALE_BIAS_MAX, distance * 0.8)
        if (hint.rows.caveatBelow !== undefined && effective.rows <= hint.rows.caveatBelow) {
          caveats.push(`only ${effective.rows} rows — chart may feel sparse`)
        }
      } else {
        // Above sweet spot: linear penalty proportional to how far past
        const distance = hi === 0 ? 1 : (effective.rows - hi) / hi
        delta -= Math.min(SCALE_BIAS_MAX, distance * 0.4)
        if (hint.rows.caveatAbove !== undefined && effective.rows >= hint.rows.caveatAbove) {
          caveats.push(`${effective.rows} rows is past this chart's comfortable density`)
        }
      }
    }

    if (hint.cardinality && effective.typicalCardinality !== undefined) {
      const card = effective.typicalCardinality
      const [lo, hi] = hint.cardinality.sweetSpot
      if (card >= lo && card <= hi) {
        delta += 0.4
      } else if (card > hi) {
        const distance = hi === 0 ? 1 : (card - hi) / hi
        delta -= Math.min(SCALE_BIAS_MAX, distance * 0.5)
        if (hint.cardinality.caveatAbove !== undefined && card >= hint.cardinality.caveatAbove) {
          caveats.push(`${card} distinct categories may overwhelm this chart`)
        }
      }
    }

    if (delta === 0 && caveats.length === 0 && !reason) return null
    return { delta, reason, caveats }
  }
}
