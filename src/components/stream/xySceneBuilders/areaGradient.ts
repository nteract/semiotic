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
