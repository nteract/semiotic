export interface GradientStop {
  /** Position along the gradient, clamped to 0–1. */
  offset: number
  /** Stop color. Omit to inherit the mark's resolved color. */
  color?: string
  /** Stop opacity, clamped to 0–1. */
  opacity?: number
}

export interface GradientConfig {
  stops: GradientStop[]
}

interface ColorStopsConfig {
  colorStops: Array<{ offset: number; color: string }>
}

interface OpacityEndpointsConfig {
  topOpacity?: number
  bottomOpacity?: number
}

export interface SemanticGradientStopInput {
  at: number
  color: string
  opacity?: number
}

export type GradientInput =
  | GradientConfig
  | boolean
  | ColorStopsConfig
  | OpacityEndpointsConfig

export type ColorGradientInput = GradientConfig | ColorStopsConfig
export type SemanticGradientInput = GradientConfig | SemanticGradientStopInput[]

/** A semantic stop after it has been made safe for an area's top stroke. */
export interface SemanticLineStop {
  offset: number
  color: string
  opacity?: number
}

export const DEFAULT_GRADIENT: GradientConfig = {
  stops: [
    { offset: 0, opacity: 0.8 },
    { offset: 1, opacity: 0.05 },
  ],
}

export function normalizeGradient(
  input: GradientInput | null | undefined,
  defaultGradient: GradientConfig = DEFAULT_GRADIENT,
): GradientConfig | undefined {
  if (!input) return undefined
  if (input === true) return defaultGradient
  // Guard the array shape at runtime: an untyped caller (SSR / JSON config)
  // can pass { stops: null } or { colorStops: "…" }, which would otherwise
  // reach a downstream `.filter(...)` and throw. Return undefined instead.
  if ("stops" in input) {
    return Array.isArray(input.stops) ? input : undefined
  }
  if ("colorStops" in input) {
    return Array.isArray(input.colorStops)
      ? { stops: input.colorStops.map(({ offset, color }) => ({ offset, color })) }
      : undefined
  }
  return {
    stops: [
      { offset: 0, opacity: input.topOpacity ?? defaultGradient.stops[0]?.opacity ?? 0.8 },
      { offset: 1, opacity: input.bottomOpacity ?? defaultGradient.stops.at(-1)?.opacity ?? 0.05 },
    ],
  }
}

export function normalizeColorGradient(
  input: ColorGradientInput | null | undefined,
): GradientConfig | undefined {
  return input ? normalizeGradient(input) : undefined
}

export function normalizeSemanticGradient(
  input: SemanticGradientInput | null | undefined,
): GradientConfig | undefined {
  if (!input) return undefined
  // Same runtime array guard as normalizeGradient: the `{ stops }` branch must
  // carry a real array before downstream renderers/serializers filter it.
  if (!Array.isArray(input)) return Array.isArray(input.stops) ? input : undefined
  return {
    stops: input.map(({ at, color, opacity }) => ({
      offset: at / 100,
      color,
      ...(opacity != null && { opacity }),
    })),
  }
}

/**
 * Build the top-stroke counterpart of a semantic fill gradient.
 *
 * SVG gradients naturally extend their first stop down to zero. The segmented
 * area stroke used to leave that range uncoloured, exposing the chart's normal
 * brand stroke below the first semantic threshold. Carry the first coloured
 * stop to zero so canvas, SVG, and static rendering have matching coverage;
 * opacity is part of the same contract.
 */
export function semanticLineStopsForGradient(
  gradient: GradientConfig | undefined,
): SemanticLineStop[] | undefined {
  const stops = gradient?.stops
    .filter((stop): stop is GradientStop & { color: string } =>
      typeof stop.color === "string" && Number.isFinite(stop.offset),
    )
    .map(({ offset, color, opacity }) => ({
      offset: Math.max(0, Math.min(1, offset)),
      color,
      ...(Number.isFinite(opacity) && { opacity: Math.max(0, Math.min(1, opacity!)) }),
    }))
    .sort((a, b) => a.offset - b.offset)

  if (!stops?.length) return undefined
  const first = stops[0]
  return first.offset > 0 ? [{ ...first, offset: 0 }, ...stops] : stops
}

export function reverseGradient(gradient: GradientConfig): GradientConfig {
  return {
    stops: gradient.stops
      .map((stop) => ({ ...stop, offset: 1 - stop.offset }))
      .sort((a, b) => a.offset - b.offset),
  }
}
