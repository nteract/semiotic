/**
 * Pure reference-envelope helpers for physics evidence traces.
 *
 * Physics motion does not provide its own baseline. These helpers align
 * repeated or supplied scalar traces onto one clock, summarize their
 * distribution, and compare a live trace with the resulting reference band.
 */

export type PhysicsTraceInterpolation = "step" | "linear"
export type PhysicsTraceOutsideDomain = "omit" | "clamp"

export type PhysicsTraceAccessor<TSample> =
  string | ((sample: TSample, index: number, traceId: string) => unknown)

export interface PhysicsReferenceTrace<TSample = PhysicsScalarTraceSample> {
  id: string
  samples: readonly TSample[]
}

export interface PhysicsScalarTraceSample {
  time: number
  value: number
}

export type PhysicsReferenceSampleGrid =
  | readonly number[]
  | {
      start: number
      end: number
      step: number
    }

export interface PhysicsReferenceEnvelopeOptions<TSample> {
  runs: readonly PhysicsReferenceTrace<TSample>[]
  sampleAt: PhysicsReferenceSampleGrid
  timeAccessor?: PhysicsTraceAccessor<TSample>
  valueAccessor?: PhysicsTraceAccessor<TSample>
  /** Quantiles use the R-7 linear estimator. Defaults to 0.1, 0.5, and 0.9. */
  quantiles?: readonly number[]
  interpolation?: PhysicsTraceInterpolation
  /** Whether values outside each run's authored domain are omitted or held. */
  outsideDomain?: PhysicsTraceOutsideDomain
}

export interface PhysicsReferenceEnvelopePoint {
  time: number
  count: number
  min: number | null
  max: number | null
  median: number | null
  /** Keys are normalized decimal quantiles, for example `quantiles[0.9]`. */
  quantiles: Partial<Record<number, number | null>>
}

export interface PhysicsReferenceEnvelope {
  points: PhysicsReferenceEnvelopePoint[]
  quantiles: number[]
  interpolation: PhysicsTraceInterpolation
  outsideDomain: PhysicsTraceOutsideDomain
  runCount: number
}

export type PhysicsReferenceBandSelector = "min" | "median" | "max" | number

export type PhysicsTraceComparisonStatus =
  "below" | "inside" | "above" | "unobserved"

export interface PhysicsTraceComparisonPoint {
  time: number
  value: number | null
  lower: number | null
  upper: number | null
  status: PhysicsTraceComparisonStatus
}

export interface PhysicsTraceComparisonOptions<TSample> {
  timeAccessor?: PhysicsTraceAccessor<TSample>
  valueAccessor?: PhysicsTraceAccessor<TSample>
  /** Defaults to the envelope's interpolation. */
  interpolation?: PhysicsTraceInterpolation
  /** Defaults to the envelope's outside-domain policy. */
  outsideDomain?: PhysicsTraceOutsideDomain
  /** Defaults to the envelope's lowest quantile, then `min`. */
  lower?: PhysicsReferenceBandSelector
  /** Defaults to the envelope's highest quantile, then `max`. */
  upper?: PhysicsReferenceBandSelector
  /** Identifier supplied to function accessors. Defaults to `trace`. */
  traceId?: string
}

export interface PhysicsTraceComparison {
  points: PhysicsTraceComparisonPoint[]
  sampleCount: number
  observedSamples: number
  belowSamples: number
  insideSamples: number
  aboveSamples: number
  totalDuration: number
  observedDuration: number
  unobservedDuration: number
  belowDuration: number
  insideDuration: number
  aboveDuration: number
  peakExcess: number
  peakExcessAt: number | null
  peakDeficit: number
  peakDeficitAt: number | null
}

interface NormalizedTracePoint {
  time: number
  value: number
}

const DEFAULT_QUANTILES = [0.1, 0.5, 0.9] as const
const MAX_GRID_POINTS = 1_000_000
const FLOAT_PRECISION = 12

function finiteNumber(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN
  return Number.isFinite(number) ? number : null
}

function valueAtPath(source: unknown, path: string): unknown {
  let current = source
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function readAccessor<TSample>(
  sample: TSample,
  index: number,
  traceId: string,
  accessor: PhysicsTraceAccessor<TSample> | undefined,
  fallback: "time" | "value"
): unknown {
  if (typeof accessor === "function") {
    return accessor(sample, index, traceId)
  }
  return valueAtPath(sample, accessor ?? fallback)
}

function normalizedDecimal(value: number): number {
  const rounded = Number(value.toFixed(FLOAT_PRECISION))
  return Object.is(rounded, -0) ? 0 : rounded
}

function normalizeQuantiles(values: readonly number[] | undefined): number[] {
  const source = values ?? DEFAULT_QUANTILES
  const quantiles = source.map((value) => {
    const quantile = finiteNumber(value)
    if (quantile == null || quantile < 0 || quantile > 1) {
      throw new RangeError(
        `physicsReferenceEnvelope quantiles must be finite values from 0 to 1; received ${String(value)}`
      )
    }
    return normalizedDecimal(quantile)
  })
  return Array.from(new Set(quantiles)).sort((a, b) => a - b)
}

function normalizeSampleGrid(grid: PhysicsReferenceSampleGrid): number[] {
  if (Array.isArray(grid)) {
    return Array.from(
      new Set(
        grid
          .map(finiteNumber)
          .filter((value): value is number => value != null)
          .map(normalizedDecimal)
      )
    ).sort((a, b) => a - b)
  }

  const authored = grid as Exclude<
    PhysicsReferenceSampleGrid,
    readonly number[]
  >
  const start = finiteNumber(authored.start)
  const end = finiteNumber(authored.end)
  const step = finiteNumber(authored.step)
  if (
    start == null ||
    end == null ||
    step == null ||
    step <= 0 ||
    end < start
  ) {
    throw new RangeError(
      "physicsReferenceEnvelope sampleAt requires finite start/end values with end >= start and step > 0"
    )
  }

  const estimatedCount = Math.floor((end - start) / step) + 1
  if (estimatedCount > MAX_GRID_POINTS) {
    throw new RangeError(
      `physicsReferenceEnvelope sampleAt exceeds ${MAX_GRID_POINTS} points`
    )
  }

  const points: number[] = []
  const tolerance = Math.max(1, Math.abs(end), Math.abs(start)) * 1e-10
  for (let index = 0; index < estimatedCount; index += 1) {
    const time = start + index * step
    if (time > end + tolerance) break
    points.push(normalizedDecimal(Math.min(time, end)))
  }
  if (!points.length || Math.abs(points[points.length - 1] - end) > tolerance) {
    points.push(normalizedDecimal(end))
  }
  if (points.length > MAX_GRID_POINTS) {
    throw new RangeError(
      `physicsReferenceEnvelope sampleAt exceeds ${MAX_GRID_POINTS} points`
    )
  }
  return Array.from(new Set(points)).sort((a, b) => a - b)
}

function normalizeTrace<TSample>(
  samples: readonly TSample[],
  traceId: string,
  timeAccessor: PhysicsTraceAccessor<TSample> | undefined,
  valueAccessor: PhysicsTraceAccessor<TSample> | undefined
): NormalizedTracePoint[] {
  const finite = samples.flatMap((sample, index) => {
    const time = finiteNumber(
      readAccessor(sample, index, traceId, timeAccessor, "time")
    )
    const value = finiteNumber(
      readAccessor(sample, index, traceId, valueAccessor, "value")
    )
    return time == null || value == null
      ? []
      : [{ time: normalizedDecimal(time), value, index }]
  })
  finite.sort((a, b) => a.time - b.time || a.index - b.index)

  const collapsed: NormalizedTracePoint[] = []
  for (const point of finite) {
    const previous = collapsed[collapsed.length - 1]
    if (previous?.time === point.time) {
      // Later authored samples win at a duplicate timestamp.
      previous.value = point.value
    } else {
      collapsed.push({ time: point.time, value: point.value })
    }
  }
  return collapsed
}

function lowerBound(
  points: readonly NormalizedTracePoint[],
  time: number
): number {
  let low = 0
  let high = points.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (points[middle].time < time) low = middle + 1
    else high = middle
  }
  return low
}

function traceValueAt(
  points: readonly NormalizedTracePoint[],
  time: number,
  interpolation: PhysicsTraceInterpolation,
  outsideDomain: PhysicsTraceOutsideDomain
): number | null {
  if (!points.length) return null
  const first = points[0]
  const last = points[points.length - 1]
  if (time < first.time) {
    return outsideDomain === "clamp" ? first.value : null
  }
  if (time > last.time) {
    return outsideDomain === "clamp" ? last.value : null
  }

  const rightIndex = lowerBound(points, time)
  const right = points[rightIndex]
  if (right?.time === time) return right.value
  const left = points[Math.max(0, rightIndex - 1)]
  if (interpolation === "step" || !right || right.time === left.time) {
    return left.value
  }
  const progress = (time - left.time) / (right.time - left.time)
  return left.value + (right.value - left.value) * progress
}

/** R-7 quantile, matching the common `(n - 1) * q` linear estimator. */
function quantile(sorted: readonly number[], probability: number): number {
  if (sorted.length === 1) return sorted[0]
  const position = (sorted.length - 1) * probability
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  const fraction = position - lower
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction
}

/**
 * Align irregular scalar traces to a common clock and derive a deterministic
 * quantile envelope. Invalid samples are omitted; inputs are never mutated.
 */
export function physicsReferenceEnvelope<TSample = PhysicsScalarTraceSample>(
  options: PhysicsReferenceEnvelopeOptions<TSample>
): PhysicsReferenceEnvelope {
  const interpolation = options.interpolation ?? "step"
  const outsideDomain = options.outsideDomain ?? "omit"
  const quantiles = normalizeQuantiles(options.quantiles)
  const sampleAt = normalizeSampleGrid(options.sampleAt)
  const runs = options.runs.map((run) =>
    normalizeTrace(
      run.samples,
      run.id,
      options.timeAccessor,
      options.valueAccessor
    )
  )

  const points = sampleAt.map((time): PhysicsReferenceEnvelopePoint => {
    const values = runs
      .map((run) => traceValueAt(run, time, interpolation, outsideDomain))
      .filter((value): value is number => value != null)
      .sort((a, b) => a - b)
    const quantileValues: Partial<Record<number, number | null>> = {}
    for (const probability of quantiles) {
      quantileValues[probability] = values.length
        ? quantile(values, probability)
        : null
    }
    return {
      time,
      count: values.length,
      min: values.length ? values[0] : null,
      max: values.length ? values[values.length - 1] : null,
      median: values.length ? quantile(values, 0.5) : null,
      quantiles: quantileValues
    }
  })

  return {
    points,
    quantiles,
    interpolation,
    outsideDomain,
    runCount: options.runs.length
  }
}

function defaultBandSelector(
  envelope: PhysicsReferenceEnvelope,
  side: "lower" | "upper"
): PhysicsReferenceBandSelector {
  if (!envelope.quantiles.length) return side === "lower" ? "min" : "max"
  return side === "lower"
    ? envelope.quantiles[0]
    : envelope.quantiles[envelope.quantiles.length - 1]
}

function selectorValue(
  point: PhysicsReferenceEnvelopePoint,
  selector: PhysicsReferenceBandSelector
): number | null {
  if (selector === "min" || selector === "median" || selector === "max") {
    return point[selector]
  }
  const probability = finiteNumber(selector)
  if (probability == null || probability < 0 || probability > 1) {
    throw new RangeError(
      `comparePhysicsTrace quantile selectors must be from 0 to 1; received ${String(selector)}`
    )
  }
  const normalized = normalizedDecimal(probability)
  if (!Object.prototype.hasOwnProperty.call(point.quantiles, normalized)) {
    throw new Error(
      `comparePhysicsTrace could not find quantile ${normalized} in the reference envelope`
    )
  }
  return point.quantiles[normalized] ?? null
}

function comparisonStatus(
  value: number,
  lower: number,
  upper: number
): Exclude<PhysicsTraceComparisonStatus, "unobserved"> {
  if (value < lower) return "below"
  if (value > upper) return "above"
  return "inside"
}

function linearIntervalDurations(
  current: PhysicsTraceComparisonPoint,
  next: PhysicsTraceComparisonPoint
): { below: number; inside: number; above: number; observed: number } {
  const duration = Math.max(0, next.time - current.time)
  if (
    !(duration > 0) ||
    current.value == null ||
    current.lower == null ||
    current.upper == null ||
    next.value == null ||
    next.lower == null ||
    next.upper == null
  ) {
    return { below: 0, inside: 0, above: 0, observed: 0 }
  }

  const lowerStart = current.value - current.lower
  const lowerEnd = next.value - next.lower
  const upperStart = current.value - current.upper
  const upperEnd = next.value - next.upper
  const stops = [0, 1]
  for (const [start, end] of [
    [lowerStart, lowerEnd],
    [upperStart, upperEnd]
  ]) {
    if ((start < 0 && end > 0) || (start > 0 && end < 0)) {
      stops.push(-start / (end - start))
    }
  }
  stops.sort((a, b) => a - b)

  let below = 0
  let inside = 0
  let above = 0
  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index]
    const end = stops[index + 1]
    if (!(end > start)) continue
    const middle = (start + end) / 2
    const value = current.value + (next.value - current.value) * middle
    const lower = current.lower + (next.lower - current.lower) * middle
    const upper = current.upper + (next.upper - current.upper) * middle
    const span = (end - start) * duration
    const status = comparisonStatus(value, lower, upper)
    if (status === "below") below += span
    else if (status === "above") above += span
    else inside += span
  }
  return { below, inside, above, observed: duration }
}

/**
 * Compare one irregular trace with a reference envelope. Durations use
 * left-held intervals for step traces and exact linear boundary crossings for
 * linear traces. Equality with either band edge is inside the reference.
 */
export function comparePhysicsTrace<TSample = PhysicsScalarTraceSample>(
  trace: readonly TSample[],
  envelope: PhysicsReferenceEnvelope,
  options: PhysicsTraceComparisonOptions<TSample> = {}
): PhysicsTraceComparison {
  const interpolation = options.interpolation ?? envelope.interpolation
  const outsideDomain = options.outsideDomain ?? envelope.outsideDomain
  const traceId = options.traceId ?? "trace"
  const normalizedTrace = normalizeTrace(
    trace,
    traceId,
    options.timeAccessor,
    options.valueAccessor
  )
  const lowerSelector = options.lower ?? defaultBandSelector(envelope, "lower")
  const upperSelector = options.upper ?? defaultBandSelector(envelope, "upper")

  const points = envelope.points.map(
    (reference): PhysicsTraceComparisonPoint => {
      const value = traceValueAt(
        normalizedTrace,
        reference.time,
        interpolation,
        outsideDomain
      )
      const lower = selectorValue(reference, lowerSelector)
      const upper = selectorValue(reference, upperSelector)
      if (lower != null && upper != null && lower > upper) {
        throw new RangeError(
          `comparePhysicsTrace lower band exceeds upper band at time ${reference.time}`
        )
      }
      return {
        time: reference.time,
        value,
        lower,
        upper,
        status:
          value == null || lower == null || upper == null
            ? "unobserved"
            : comparisonStatus(value, lower, upper)
      }
    }
  )

  let belowSamples = 0
  let insideSamples = 0
  let aboveSamples = 0
  let peakExcess = 0
  let peakExcessAt: number | null = null
  let peakDeficit = 0
  let peakDeficitAt: number | null = null
  for (const point of points) {
    if (point.status === "below") belowSamples += 1
    else if (point.status === "inside") insideSamples += 1
    else if (point.status === "above") aboveSamples += 1
    if (point.value == null || point.lower == null || point.upper == null) {
      continue
    }
    const excess = Math.max(0, point.value - point.upper)
    const deficit = Math.max(0, point.lower - point.value)
    if (excess > peakExcess) {
      peakExcess = excess
      peakExcessAt = point.time
    }
    if (deficit > peakDeficit) {
      peakDeficit = deficit
      peakDeficitAt = point.time
    }
  }

  let belowDuration = 0
  let insideDuration = 0
  let aboveDuration = 0
  let observedDuration = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const duration = Math.max(0, next.time - current.time)
    if (!(duration > 0)) continue
    if (interpolation === "linear") {
      const result = linearIntervalDurations(current, next)
      belowDuration += result.below
      insideDuration += result.inside
      aboveDuration += result.above
      observedDuration += result.observed
      continue
    }
    if (current.status === "unobserved") continue
    observedDuration += duration
    if (current.status === "below") belowDuration += duration
    else if (current.status === "above") aboveDuration += duration
    else insideDuration += duration
  }

  const firstTime = points[0]?.time
  const lastTime = points[points.length - 1]?.time
  const totalDuration =
    firstTime == null || lastTime == null
      ? 0
      : Math.max(0, lastTime - firstTime)
  const observedSamples = belowSamples + insideSamples + aboveSamples

  return {
    points,
    sampleCount: points.length,
    observedSamples,
    belowSamples,
    insideSamples,
    aboveSamples,
    totalDuration,
    observedDuration,
    unobservedDuration: Math.max(0, totalDuration - observedDuration),
    belowDuration,
    insideDuration,
    aboveDuration,
    peakExcess,
    peakExcessAt,
    peakDeficit,
    peakDeficitAt
  }
}
