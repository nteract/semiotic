import { linearBrushHandleThickness } from "../../controls/linearBrushMetrics"

export const MINIMAP_DEFAULT_HEIGHT = 60

export function minimapOverviewHeight(config: { height?: number; margin?: { top?: number; bottom?: number }; handles?: unknown; showExtentLabels?: unknown }): number {
  const margin = minimapChromeMargins(config)
  return (config.height || MINIMAP_DEFAULT_HEIGHT) + (config.margin?.top ?? margin.top) + (config.margin?.bottom ?? margin.bottom)
}

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
