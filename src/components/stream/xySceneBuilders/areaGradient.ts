import {
  DEFAULT_GRADIENT,
  normalizeGradient,
  type GradientConfig,
  type GradientInput,
} from "../../charts/shared/gradient"

export type AreaGradientConfig = GradientInput

export const DEFAULT_AREA_GRADIENT: GradientConfig = DEFAULT_GRADIENT

export function resolveAreaGradient(
  gradient: AreaGradientConfig | undefined,
): GradientConfig | undefined {
  return normalizeGradient(gradient)
}

/**
 * Pixel y positions for a fill gradient's offsets 0 and 1 when it is
 * anchored to the y-domain (`extent: "domain"`); undefined for the default
 * per-area span.
 */
export function resolveAreaGradientSpan(
  gradient: GradientConfig,
  yScale: ((value: number) => number) & { domain: () => unknown[] },
): [number, number] | undefined {
  if (gradient.extent !== "domain") return undefined
  const [min, max] = yScale.domain() as [number, number]
  const top = yScale(max)
  const bottom = yScale(min)
  return Number.isFinite(top) && Number.isFinite(bottom) ? [top, bottom] : undefined
}
