import type { LinearBrushScale, LinearBrushValue } from "./linearBrushTypes"

// Pure LinearBrush geometry: value <-> track mapping, pointer gestures, and
// keyboard steps. No React, so the static minimap can share it.

/** Maps values to positions along the track: 0 at the left (x) or top (y) edge, 1 at the other. */
export interface LinearBrushTrack {
  min: number
  max: number
  toFraction(value: number): number
  /** The exact domain bound at either track end; values between drop float noise. */
  fromFraction(fraction: number): number
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** Drop float noise from stepped arithmetic (0.1 + 0.2). */
export const roundBrushValue = (value: number) => Number(value.toPrecision(15))

/**
 * A track from a scale (its pixel range sets the direction) or a linear
 * domain. Null when the domain or range is empty or not finite.
 */
export function createLinearBrushTrack({
  domain,
  scale,
  orientation,
  reverse = false,
}: {
  domain?: readonly [number, number]
  scale?: LinearBrushScale
  orientation: "x" | "y"
  reverse?: boolean
}): LinearBrushTrack | null {
  if (scale) {
    const range = scale.range().map(Number)
    const values = scale.domain().map(Number)
    const r0 = Math.min(range[0], range[range.length - 1])
    const length = Math.max(range[0], range[range.length - 1]) - r0
    const min = Math.min(values[0], values[values.length - 1])
    const max = Math.max(values[0], values[values.length - 1])
    if (![r0, length, min, max].every(Number.isFinite) || length <= 0 || max <= min) return null
    const minAtStart = Math.abs(scale(min) - r0) <= Math.abs(scale(max) - r0)
    return {
      min,
      max,
      toFraction: (value) => (scale(value) - r0) / length,
      fromFraction: (fraction) => {
        if (fraction <= 0) return minAtStart ? min : max
        if (fraction >= 1) return minAtStart ? max : min
        return clamp(roundBrushValue(Number(scale.invert(r0 + fraction * length))), min, max)
      },
    }
  }
  if (!domain) return null
  const min = Math.min(Number(domain[0]), Number(domain[1]))
  const max = Math.max(Number(domain[0]), Number(domain[1]))
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null
  const span = max - min
  // x runs left to right and y bottom to top unless reversed.
  const minAtStart = orientation === "x" ? !reverse : reverse
  return {
    min,
    max,
    toFraction: (value) => {
      const t = (value - min) / span
      return minAtStart ? t : 1 - t
    },
    fromFraction: (fraction) => {
      if (fraction <= 0) return minAtStart ? min : max
      if (fraction >= 1) return minAtStart ? max : min
      return roundBrushValue(minAtStart ? min + fraction * span : max - fraction * span)
    },
  }
}

/** Order, coerce, and clamp a value into the track's domain. */
export function normalizeBrushValue(
  value: readonly [number, number] | null | undefined,
  track: LinearBrushTrack
): LinearBrushValue {
  if (!value || value.length < 2) return null
  const a = Number(value[0])
  const b = Number(value[1])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return [clamp(Math.min(a, b), track.min, track.max), clamp(Math.max(a, b), track.min, track.max)]
}

export function sameBrushValue(a: LinearBrushValue, b: LinearBrushValue): boolean {
  if (!a || !b) return a === b
  return a[0] === b[0] && a[1] === b[1]
}

export function brushEdgeFlags(value: LinearBrushValue, track: LinearBrushTrack) {
  return {
    atDomainStart: !value || value[0] <= track.min,
    atDomainEnd: !value || value[1] >= track.max,
  }
}

/** Round to the nearest step from the domain minimum. */
export function snapBrushValue(value: number, step: number, track: LinearBrushTrack): number {
  if (!(step > 0)) return value
  return clamp(roundBrushValue(track.min + Math.round((value - track.min) / step) * step), track.min, track.max)
}

const effectiveMinSpan = (minSpan: number, track: LinearBrushTrack) =>
  clamp(minSpan, 0, track.max - track.min)

/** Move one end to `pointer`; the other stays put and the ends stay `minSpan` apart. */
export function resizeBrush(
  value: [number, number],
  edge: "start" | "end",
  pointer: number,
  track: LinearBrushTrack,
  minSpan = 0
): [number, number] {
  const span = effectiveMinSpan(minSpan, track)
  if (edge === "start") return [clamp(pointer, track.min, Math.max(track.min, value[1] - span)), value[1]]
  return [value[0], clamp(pointer, Math.min(track.max, value[0] + span), track.max)]
}

/** Shift a selection along the track, stopping flush at either end. */
export function moveBrush(value: [number, number], deltaFraction: number, track: LinearBrushTrack): [number, number] {
  const f0 = track.toFraction(value[0])
  const f1 = track.toFraction(value[1])
  const width = Math.abs(f1 - f0)
  const low = clamp(Math.min(f0, f1) + deltaFraction, 0, 1 - width)
  const a = track.fromFraction(low <= 0 ? 0 : low)
  const b = track.fromFraction(low >= 1 - width ? 1 : low + width)
  return a <= b ? [a, b] : [b, a]
}

/** Shift a selection by a value delta without changing its span. */
export function shiftBrush(value: [number, number], delta: number, track: LinearBrushTrack): [number, number] {
  const width = value[1] - value[0]
  const low = clamp(value[0] + delta, track.min, track.max - width)
  return [low, Math.min(track.max, low + width)]
}

/** A new selection from the pointer-down value to the pointer, at least `minSpan` wide. */
export function createBrush(anchor: number, pointer: number, track: LinearBrushTrack, minSpan = 0): [number, number] {
  const span = effectiveMinSpan(minSpan, track)
  let low = Math.min(anchor, pointer)
  let high = Math.max(anchor, pointer)
  if (high - low < span) {
    if (pointer >= anchor) {
      high = Math.min(track.max, anchor + span)
      low = high - span
    } else {
      low = Math.max(track.min, anchor - span)
      high = low + span
    }
  }
  return [clamp(low, track.min, track.max), clamp(high, track.min, track.max)]
}

export interface LinearBrushKeyOptions {
  step: number
  largeStep: number
  minSpan: number
  clearable: boolean
}

/**
 * The value after a key on the range slider or an end's slider, or null when
 * the key does nothing. Arrows step by `step` (Shift, PageUp/PageDown by
 * `largeStep`), Home/End go to the limits, Escape clears. With no selection,
 * the range slider starts from the middle fifth of the domain and the end
 * sliders from the whole domain.
 */
export function brushValueForKey(
  part: "start" | "end" | "range",
  key: string,
  shiftKey: boolean,
  current: LinearBrushValue,
  track: LinearBrushTrack,
  options: LinearBrushKeyOptions
): { value: LinearBrushValue } | null {
  if (key === "Escape") return options.clearable && current ? { value: null } : null
  const direction =
    key === "ArrowRight" || key === "ArrowUp" || key === "PageUp" ? 1
      : key === "ArrowLeft" || key === "ArrowDown" || key === "PageDown" ? -1
        : 0
  const home = key === "Home"
  const end = key === "End"
  if (!direction && !home && !end) return null
  const large = shiftKey || key === "PageUp" || key === "PageDown"
  const increment = (large ? options.largeStep : options.step) * direction
  const span = track.max - track.min
  const minSpan = effectiveMinSpan(options.minSpan, track)

  if (part === "range") {
    const base: [number, number] = current ?? [track.min + span * 0.4, track.min + span * 0.6]
    const width = base[1] - base[0]
    const low = home ? track.min : end ? track.max - width : roundBrushValue(base[0] + increment)
    const next = shiftBrush([low, low + width], 0, track)
    return { value: [roundBrushValue(next[0]), roundBrushValue(next[1])] }
  }

  const base: [number, number] = current ?? [track.min, track.max]
  if (part === "start") {
    const limit = Math.max(track.min, base[1] - minSpan)
    const next = home ? track.min : end ? limit : roundBrushValue(base[0] + increment)
    return { value: [clamp(next, track.min, limit), base[1]] }
  }
  const limit = Math.min(track.max, base[0] + minSpan)
  const next = home ? limit : end ? track.max : roundBrushValue(base[1] + increment)
  return { value: [base[0], clamp(next, limit, track.max)] }
}
