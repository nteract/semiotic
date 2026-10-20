import { mulberry32 } from "./random"

export interface ArrivalJitterBucket {
  weight: number
  min: number
  max: number
}

/** Millisecond delay distribution used by the watermarks explainer. */
export const WATERMARK_LONG_TAIL_JITTER: readonly ArrivalJitterBucket[] = [
  { weight: 0.25, min: 0, max: 0 },
  { weight: 0.35, min: 0, max: 2000 },
  { weight: 0.2, min: 2000, max: 5000 },
  { weight: 0.1, min: 5000, max: 10000 },
  { weight: 0.1, min: 10000, max: 15000 }
]

export interface SyntheticSourceSpec {
  id: string
  /** Milliseconds between arrivals, or between bursts when gapMs is omitted. */
  interval?: number
  ratePerSec?: number
  jitter?:
    | "none"
    | "watermarks"
    | {
        kind: "long-tail"
        buckets: readonly ArrivalJitterBucket[]
      }
    | ((rng: () => number) => number)
  burst?: {
    min: number
    max: number
    gapMs?: [number, number]
    intraMs: number
  }
}

export interface SyntheticArrival {
  id: string
  source: string
  eventTime: number
  arrivalTime: number
}

interface SourceCursor {
  spec: SyntheticSourceSpec
  random: () => number
  remaining: number
  burstRemaining: number
  sequence: number
  interval: number
}

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be finite and positive`)
  return value
}

function makeSources(
  specs: readonly SyntheticSourceSpec[],
  seed: number
): SourceCursor[] {
  const ids = new Set<string>()
  return specs.map((spec, index) => {
    if (!spec.id || ids.has(spec.id))
      throw new Error("Synthetic source ids must be nonempty and unique")
    ids.add(spec.id)
    const interval = positive(
      spec.interval ?? 1000 / positive(spec.ratePerSec ?? 1, "ratePerSec"),
      "interval"
    )
    const burst = spec.burst
    if (burst) {
      if (
        !Number.isInteger(burst.min) ||
        !Number.isInteger(burst.max) ||
        burst.min < 1 ||
        burst.max < burst.min
      )
        throw new RangeError("burst bounds must be ordered positive integers")
      positive(burst.intraMs, "intraMs")
      if (burst.gapMs) {
        positive(burst.gapMs[0], "gapMs")
        positive(burst.gapMs[1], "gapMs")
        if (burst.gapMs[1] < burst.gapMs[0])
          throw new RangeError("gapMs must be ordered")
      }
    }
    const jitter = spec.jitter
    if (typeof jitter === "object") {
      if (
        !jitter.buckets.length ||
        !jitter.buckets.some((b) => b.weight > 0) ||
        jitter.buckets.some(
          (b) =>
            !Number.isFinite(b.weight) ||
            b.weight < 0 ||
            !Number.isFinite(b.min) ||
            b.min < 0 ||
            !Number.isFinite(b.max) ||
            b.max < b.min
        )
      )
        throw new RangeError(
          "jitter buckets require nonnegative finite weights and ordered delays"
        )
    }
    return {
      spec,
      random: mulberry32(seed + index * 0x9e3779b9),
      interval,
      remaining: interval,
      burstRemaining: 0,
      sequence: 0
    }
  })
}

function sampleJitter(source: SourceCursor): number {
  const { jitter } = source.spec
  if (!jitter || jitter === "none") return 0
  if (typeof jitter === "function") {
    const value = jitter(source.random)
    if (!Number.isFinite(value) || value < 0)
      throw new RangeError("jitter must return a finite nonnegative delay")
    return value
  }
  const buckets =
    jitter === "watermarks" ? WATERMARK_LONG_TAIL_JITTER : jitter.buckets
  let target = source.random() * buckets.reduce((sum, b) => sum + b.weight, 0)
  for (const bucket of buckets) {
    target -= bucket.weight
    if (target < 0)
      return bucket.min + source.random() * (bucket.max - bucket.min)
  }
  return buckets[buckets.length - 1].max
}

function emit(source: SourceCursor, time: number): SyntheticArrival {
  const event = {
    id: `${source.spec.id}-${source.sequence++}`,
    source: source.spec.id,
    eventTime: time - sampleJitter(source),
    arrivalTime: time
  }
  const burst = source.spec.burst
  if (!burst) source.remaining = source.interval
  else {
    if (source.burstRemaining === 0) {
      source.burstRemaining =
        burst.min + Math.floor(source.random() * (burst.max - burst.min + 1))
    }
    source.burstRemaining--
    source.remaining =
      source.burstRemaining > 0
        ? burst.intraMs
        : burst.gapMs
          ? burst.gapMs[0] + source.random() * (burst.gapMs[1] - burst.gapMs[0])
          : source.interval
  }
  return event
}

/**
 * Deterministic simulator for synthetic sources. Advance with *simulated*
 * milliseconds (e.g. controller `dt * 1000`), never wall-clock deltas.
 * Pausing freezes time; disabled sources keep their remaining interval.
 */
export function createSyntheticEmitter(
  spec: readonly SyntheticSourceSpec[],
  seed = 1
) {
  const sources = makeSources(spec, seed)
  let time = 0
  return {
    getTime: () => time,
    advance(
      deltaMs: number,
      options: {
        paused?: boolean
        rate?: number
        active?: Readonly<Record<string, boolean>>
      } = {}
    ): SyntheticArrival[] {
      if (!Number.isFinite(deltaMs) || deltaMs < 0)
        throw new RangeError("deltaMs must be finite and nonnegative")
      const rate = positive(options.rate ?? 1, "rate")
      if (options.paused || deltaMs === 0) return []
      const events: SyntheticArrival[] = []
      const active = sources.filter(
        (source) => options.active?.[source.spec.id] !== false
      )
      let remainingMs = deltaMs
      while (remainingMs > 0) {
        const next = active.reduce<SourceCursor | undefined>(
          (best, source) =>
            !best || source.remaining < best.remaining ? source : best,
          undefined
        )
        const until = next ? next.remaining / rate : Infinity
        if (until > remainingMs || !next) {
          for (const source of active) source.remaining -= remainingMs * rate
          time += remainingMs
          break
        }
        for (const source of active) source.remaining -= until * rate
        time += until
        remainingMs -= until
        events.push(emit(next, time))
        // Drain tied arrivals at the end of a step in source declaration order.
        for (const source of active)
          if (source !== next && source.remaining <= 0)
            events.push(emit(source, time))
      }
      return events
    }
  }
}

/** Infinite arrival-ordered stream. All timestamps and jitter are milliseconds. */
export function* syntheticArrivals(
  spec: readonly SyntheticSourceSpec[],
  seed = 1
): Generator<SyntheticArrival, void> {
  const sources = makeSources(spec, seed)
  if (!sources.length) return
  let time = 0
  while (true) {
    const source = sources.reduce((a, b) =>
      a.remaining <= b.remaining ? a : b
    )
    const elapsed = source.remaining
    time += elapsed
    for (const cursor of sources) cursor.remaining -= elapsed
    yield emit(source, time)
  }
}
