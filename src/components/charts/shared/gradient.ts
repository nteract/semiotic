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

export function reverseGradient(gradient: GradientConfig): GradientConfig {
  return {
    stops: gradient.stops
      .map((stop) => ({ ...stop, offset: 1 - stop.offset }))
      .sort((a, b) => a.offset - b.offset),
  }
}
