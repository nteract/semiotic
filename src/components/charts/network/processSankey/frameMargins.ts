/**
 * Reserve vertical frame space only for chrome that is actually rendered.
 * Eight pixels clear the bare axis rule; telemetry needs its two-line
 * readout, and labeled ticks need their 20px baseline plus font descent.
 */
export function resolveProcessSankeyMarginDefaults(
  hasTitle: boolean,
  showQualityReadout: boolean,
  hasAxisTicks: boolean,
  orientation: "horizontal" | "vertical" = "horizontal",
) {
  if (orientation === "vertical") {
    return {
      top: hasTitle ? 38 : showQualityReadout ? 28 : 16,
      right: 24,
      bottom: 24,
      left: hasAxisTicks ? 72 : 24,
    }
  }
  return {
    top: hasTitle ? 30 : showQualityReadout ? 24 : 8,
    right: 80,
    bottom: hasAxisTicks ? 28 : 8,
    left: 80,
  }
}
