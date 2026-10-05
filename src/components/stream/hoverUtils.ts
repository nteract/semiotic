/**
 * Shared hover data utilities for stream frames.
 *
 * Centralizes the common HoverData construction pattern used by
 * XY, Ordinal, and Network stream frames for hover and click events.
 * Geo frame and keyboard navigation use variants with additional
 * property flattening that are handled at the call site.
 */
import type { HoverData } from "../realtime/types"
import type { Datum } from "../charts/shared/datumTypes"

export type RawHoverDatum = Datum | Datum[] | null

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
  pointerType?: string
}

export const TOUCH_HIT_RADIUS = 24

export function getPointerHitRadius(baseRadius: number, pointerType?: string): number {
  return pointerType === "touch" ? Math.max(baseRadius, TOUCH_HIT_RADIUS) : baseRadius
}

export function normalizeHoverDatum(rawDatum: RawHoverDatum): Datum | null {
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
  rawDatum: RawHoverDatum,
  x: number,
  y: number,
  extra?: Partial<HoverData>
): HoverData {
  const datum = normalizeHoverDatum(rawDatum)
  return {
    data: datum,
    x,
    y,
    __semioticHoverData: true,
    ...extra,
  }
}

/**
 * Temporal histogram producers use bin boundaries, independent of clipping or
 * pixel-rounding. Other charts may author these fields and must keep their x.
 */
export function resolveHistogramHoverXValue(
  datum: Datum | null | undefined,
  fallback: HoverData["xValue"]
): HoverData["xValue"] {
  if (typeof datum?.binStart !== "number" || typeof datum.binEnd !== "number") return fallback
  const center = datum.binStart + (datum.binEnd - datum.binStart) / 2
  if (!Number.isFinite(center)) return fallback
  return fallback instanceof Date ? new Date(center) : center
}
