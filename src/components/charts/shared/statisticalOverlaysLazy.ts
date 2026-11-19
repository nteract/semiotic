/**
 * Lazy-loaded wrapper for statistical overlays.
 * Only loads the LOESS/forecast logic when forecast or anomaly props are actually used.
 */

export type { ForecastResult } from "./statisticalOverlays"
export type { SegmentType as ForecastSegment } from "./statisticalOverlays"

// The row fields below are duplicated in the heavy statisticalOverlays module
// (and the resolved keys in lineSeriesSsr and StreamXYFrame) so importing
// them does not pull that module in at import time. `semiotic/xy` and
// `semiotic/line` export these copies.

/**
 * The row field naming each row's forecast segment (`ForecastSegment`), on
 * every row a `forecast` chart draws. Exported as `FORECAST_SEGMENT_FIELD`.
 */
export const SEGMENT_FIELD = "__forecastSegment" as const

/**
 * Set to `true` on each row the `anomaly` overlay flags as an outlier (a dot);
 * other rows have no such field.
 */
export const ANOMALY_FIELD = "__anomaly" as const

/**
 * Where a function `xAccessor` / `yAccessor`'s value is written on the rows
 * the `forecast` and `anomaly` overlays draw. A computed forecast row carries
 * its x and y only there when the accessors are functions.
 */
export const RESOLVED_X_FIELD = "__semiotic_resolvedX" as const
export const RESOLVED_Y_FIELD = "__semiotic_resolvedY" as const

let _module: typeof import("./statisticalOverlays") | null = null

async function load() {
  if (!_module) {
    _module = await import("./statisticalOverlays")
  }
  return _module
}

export async function buildForecastLazy(
  ...args: Parameters<typeof import("./statisticalOverlays")["buildForecast"]>
) {
  const mod = await load()
  return mod.buildForecast(...args)
}

export async function buildAnomalyOverlayLazy(
  ...args: Parameters<typeof import("./statisticalOverlays")["buildAnomalyOverlay"]>
) {
  const mod = await load()
  return mod.buildAnomalyOverlay(...args)
}

export async function createSegmentLineStyleLazy(
  ...args: Parameters<typeof import("./statisticalOverlays")["createSegmentLineStyle"]>
) {
  const mod = await load()
  return mod.createSegmentLineStyle(...args)
}
