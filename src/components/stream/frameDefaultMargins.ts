/**
 * Canonical chrome-safe defaults for direct Stream Frame consumers.
 *
 * High-level chart components supply their own mode-aware margins, but the
 * public Stream frame APIs also render axes and labels by default. Keep their
 * live and static defaults in one place so a standalone SVG cannot crop the
 * same chrome that a browser frame contains.
 */
export const AXIS_FRAME_DEFAULT_MARGIN = {
  top: 50,
  right: 40,
  bottom: 60,
  left: 70,
} as const

export const AXIS_FREE_FRAME_DEFAULT_MARGIN = {
  top: 10,
  right: 10,
  bottom: 10,
  left: 10,
} as const

export function ordinalFrameDefaultMargin(chartType: string) {
  return chartType === "pie" || chartType === "donut"
    ? AXIS_FREE_FRAME_DEFAULT_MARGIN
    : AXIS_FRAME_DEFAULT_MARGIN
}

export const NETWORK_FRAME_DEFAULT_MARGIN = {
  top: 20,
  right: 80,
  bottom: 20,
  left: 80,
} as const

export const CENTERED_NETWORK_FRAME_DEFAULT_MARGIN = {
  top: 40,
  right: 40,
  bottom: 40,
  left: 40,
} as const

const CENTERED_NETWORK_CHART_TYPES = new Set([
  "chord",
  "force",
  "circlepack",
  "orbit",
])

export function networkFrameDefaultMargin(chartType: string) {
  // Treemap labels sit inside their cells, so they need no external label band.
  if (chartType === "treemap") return AXIS_FREE_FRAME_DEFAULT_MARGIN
  return CENTERED_NETWORK_CHART_TYPES.has(chartType)
    ? CENTERED_NETWORK_FRAME_DEFAULT_MARGIN
    : NETWORK_FRAME_DEFAULT_MARGIN
}
