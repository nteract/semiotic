/**
 * Shared hover data utilities for stream frames.
 *
 * Consolidates the HoverData construction pattern that was duplicated
 * across all 4 stream frames and keyboard navigation.
 */
import type { HoverData } from "../realtime/types"

/**
 * Spread raw datum properties onto HoverData if it's a plain object.
 * Arrays and non-objects are skipped (they go in `data` field only).
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
