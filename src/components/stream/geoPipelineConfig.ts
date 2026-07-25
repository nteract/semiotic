import type { GeoPipelineConfig } from "./geoTypes"

const MAX_FIT_PADDING = 0.5

/**
 * `fitPadding` is applied to both sides of the plot, so 0.5 would leave a
 * zero-sized extent (and a clipped globe with radius zero). Normalize nullish
 * values at the public config boundary, and reject invalid values before they
 * can reach d3 with a negative or non-finite projection extent.
 */
export function normalizeFitPadding(value: unknown): number {
  if (value == null) return 0
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value < MAX_FIT_PADDING
  ) {
    return value
  }
  throw new RangeError(
    `[semiotic] fitPadding must be a finite fraction in [0, ${MAX_FIT_PADDING}); received ${String(value)}.`,
  )
}

export function normalizeInitialGeoPipelineConfig(
  config: GeoPipelineConfig
): GeoPipelineConfig {
  return {
    ...config,
    fitPadding: normalizeFitPadding(config.fitPadding)
  }
}

export function normalizeGeoPipelineConfigUpdate(
  config: Partial<GeoPipelineConfig>
): Partial<GeoPipelineConfig> {
  if (!("fitPadding" in config)) return config
  return {
    ...config,
    fitPadding: normalizeFitPadding(config.fitPadding)
  }
}
