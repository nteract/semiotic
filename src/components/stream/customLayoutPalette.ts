import { COLOR_SCHEMES, STREAMING_PALETTE } from "../charts/shared/colorUtils"
import { schemeCategory10 } from "../charts/shared/colorPalettes"

/**
 * Shared palette resolution for the network and ordinal customLayout
 * escape hatches. XY's customLayout uses `PipelineStore.resolveGroupColor`
 * (richer cascade with CategoryColorProvider integration) so it doesn't
 * call this helper.
 *
 * Precedence:
 *   1. Explicit `colorScheme` array — used as-is.
 *   2. Named scheme string (e.g. "tableau10") — looked up in
 *      `COLOR_SCHEMES`. Unknown names fall through.
 *   3. Theme categorical (when non-empty).
 *   4. The provided fallback palette.
 *
 * @param colorScheme   `colorScheme` from the chart's pipeline config
 * @param themeCategorical  `themeCategorical` from theme resolution
 * @param fallback      Palette to use when nothing else matches.
 *                      Network passes `schemeCategory10`; ordinal passes
 *                      `STREAMING_PALETTE`. Caller's choice.
 */
export function resolveCustomLayoutPalette(
  colorScheme: string | string[] | undefined,
  themeCategorical: string[] | undefined,
  fallback: readonly string[]
): readonly string[] {
  if (Array.isArray(colorScheme)) return colorScheme
  if (typeof colorScheme === "string") {
    const named = (COLOR_SCHEMES as Record<string, unknown>)[colorScheme]
    if (Array.isArray(named)) return named as string[]
    // Unknown name — fall through to theme/fallback.
  }
  if (themeCategorical && themeCategorical.length > 0) return themeCategorical
  return fallback
}

/**
 * Build a stable hash → palette index resolver. Used by the network and
 * ordinal customLayout contexts so the same key always returns the same
 * color for the lifetime of the closure.
 */
export function buildResolveColor(palette: readonly string[]): (key: string) => string {
  return (key: string): string => {
    let hash = 0
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
    return palette[Math.abs(hash) % palette.length] ?? "#4e79a7"
  }
}

// Re-export the fallbacks the helper takes so call sites can pass the
// right one without separately importing from charts/shared.
export { schemeCategory10, STREAMING_PALETTE }
