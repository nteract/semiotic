import type { HoverData } from "../realtime/types"
import type { NavPoint } from "./navigationGraph"

/**
 * Convert a NavPoint to HoverData for the tooltip system.
 */
export function navPointToHover(point: NavPoint): HoverData {
  const rawDatum = point.datum || {}
  return {
    data: rawDatum,
    ...(point.stats && { stats: point.stats }),
    ...(point.category != null && { category: point.category }),
    x: point.x,
    y: point.y,
    __semioticHoverData: true,
  }
}
