/**
 * Lazy-loaded wrapper for statistical overlays.
 * Only loads the LOESS/forecast logic when forecast or anomaly props are actually used.
 */

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

export async function buildAnomalyAnnotationsLazy(
  ...args: Parameters<typeof import("./statisticalOverlays")["buildAnomalyAnnotations"]>
) {
  const mod = await load()
  return mod.buildAnomalyAnnotations(...args)
}

export async function createSegmentLineStyleLazy(
  ...args: Parameters<typeof import("./statisticalOverlays")["createSegmentLineStyle"]>
) {
  const mod = await load()
  return mod.createSegmentLineStyle(...args)
}
