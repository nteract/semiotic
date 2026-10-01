import type { HatchPatternOptions } from "./hatchPattern"

/**
 * Hatch drawn over bar-funnel dropoff bars (the bar's own color underneath).
 * Shared by the canvas renderer and the static SVG path so both draw the
 * same lines.
 */
export const BAR_FUNNEL_DROPOFF_HATCH: Readonly<Required<Omit<HatchPatternOptions, "background">>> = {
  stroke: "rgba(255,255,255,0.5)",
  lineWidth: 1.5,
  spacing: 6,
  angle: 45,
  lineOpacity: 1,
}
