import type { AreaSceneNode } from "../types"

type ResolvedAreaGradient = NonNullable<AreaSceneNode["fillGradient"]>
type OpacityGradient = { topOpacity: number; bottomOpacity: number }
type ColorStopGradient = { colorStops: Array<{ offset: number; color: string }> }
type OpacityGradientConfig = { topOpacity?: number; bottomOpacity?: number }

export type AreaGradientConfig = boolean | OpacityGradientConfig | ColorStopGradient

export const DEFAULT_AREA_GRADIENT: OpacityGradient = {
  topOpacity: 0.8,
  bottomOpacity: 0.05,
}

export function resolveAreaGradient(gradient: AreaGradientConfig | undefined): ResolvedAreaGradient | undefined {
  if (!gradient) return undefined
  if (gradient === true) return DEFAULT_AREA_GRADIENT
  if ("colorStops" in gradient) return gradient
  return {
    topOpacity: gradient.topOpacity ?? DEFAULT_AREA_GRADIENT.topOpacity,
    bottomOpacity: gradient.bottomOpacity ?? DEFAULT_AREA_GRADIENT.bottomOpacity,
  }
}
