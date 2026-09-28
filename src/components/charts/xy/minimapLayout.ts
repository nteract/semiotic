import { linearBrushHandleThickness } from "../../controls/linearBrushMetrics"

/**
 * Default overview margins for opted-in brush chrome, shared by MinimapChart
 * and its static rendering: a move handle sits on the top edge, and extent
 * labels (up to two lines) sit below the overview.
 */
export function minimapChromeMargins(config: { handles?: unknown; showExtentLabels?: unknown }): { top: number; bottom: number } {
  const handles = config.handles && typeof config.handles === "object"
    ? (config.handles as { move?: unknown; size?: unknown })
    : config.handles ? {} : null
  const size = typeof handles?.size === "number" && Number.isFinite(handles.size) ? handles.size : 12
  return {
    top: handles?.move ? Math.ceil(linearBrushHandleThickness(size) / 2) + 2 : 0,
    bottom: config.showExtentLabels ? 34 : 20,
  }
}
