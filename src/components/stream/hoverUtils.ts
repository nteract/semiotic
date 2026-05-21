/**
 * Shared hover data utilities for stream frames.
 *
 * Centralizes the common HoverData construction pattern used by
 * XY, Ordinal, and Network stream frames for hover and click events.
 * Geo frame and keyboard navigation use variants with additional
 * property flattening that are handled at the call site.
 */
import type { HoverData } from "../realtime/types"

/**
 * Minimal shape a Stream Frame's internal hover handler needs from a pointer
 * event. React.MouseEvent satisfies this structurally, as does the plain
 * `{clientX, clientY}` object the rAF-coalescing path synthesizes. Using this
 * narrower type on `hoverHandlerRef` (instead of `React.MouseEvent`) prevents
 * downstream code from reading event fields — `currentTarget`, `target`,
 * `preventDefault` — that wouldn't survive the coalescing cast.
 */
export interface HoverPointerCoords {
  clientX: number
  clientY: number
}

export function normalizeHoverDatum(rawDatum: any): any {
  return Array.isArray(rawDatum) ? rawDatum[0] : rawDatum
}

/**
 * Build a HoverData object from a raw datum and pixel coordinates.
 * The raw datum is preserved as `hover.data` for tooltip / callback
 * consumers; pixel coordinates land on `x` / `y`. Anything else
 * relevant to a specific frame family — `category`, `stats`,
 * `nodeOrEdge`, `xValue`, etc. — is layered in via `extra`.
 */
export function buildHoverData(
  rawDatum: any,
  x: number,
  y: number,
  extra?: Partial<HoverData>
): HoverData {
  return {
    data: normalizeHoverDatum(rawDatum),
    x,
    y,
    __semioticHoverData: true,
    ...extra,
  }
}
