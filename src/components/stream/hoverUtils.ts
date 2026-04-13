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
 * Spread raw datum properties onto HoverData if it's a non-null,
 * non-array object. Class instances (Date, etc.) are included —
 * this matches the historical behavior where all datum fields are
 * accessible directly on the hover object (d.fieldName).
 */
export function spreadDatum(rawDatum: any): Record<string, any> {
  return typeof rawDatum === "object" && rawDatum !== null && !Array.isArray(rawDatum)
    ? rawDatum
    : {}
}

/**
 * Build a HoverData object from a raw datum and pixel coordinates.
 * Spreads plain-object datum properties for backwards compatibility
 * (consumers can access d.fieldName directly in addition to d.data.fieldName).
 */
export function buildHoverData(
  rawDatum: any,
  x: number,
  y: number,
  extra?: Partial<HoverData>
): HoverData {
  return {
    ...spreadDatum(rawDatum),
    data: rawDatum,
    x,
    y,
    time: x,
    value: y,
    ...extra,
  }
}
