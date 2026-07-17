import { STREAMING_PALETTE, resolveCategoricalPalette, resolveExplicitColor } from "../charts/shared/colorUtils"
import { schemeCategory10 } from "../charts/shared/colorPalettes"

/**
 * Shared palette resolution for the network and ordinal customLayout
 * escape hatches. XY's customLayout uses `PipelineStore.resolveGroupColor`
 * (richer cascade with CategoryColorProvider integration) so it doesn't
 * call this helper.
 *
 * Precedence:
 *   1. Object map `{ key: color }` — its values become the palette (so
 *      `theme.categorical` reflects the map). Pair with `buildResolveColor`,
 *      which returns the *exact* mapped color per key; this palette only
 *      feeds unmapped keys and `theme.categorical`.
 *   2. Explicit `colorScheme` array — used as-is.
 *   3. Named scheme string (e.g. "tableau10") — looked up in
 *      `COLOR_SCHEMES`. Unknown names fall through.
 *   4. Theme categorical (when non-empty).
 *   5. The provided fallback palette.
 *
 * @param colorScheme   `colorScheme` from the chart's pipeline config
 * @param themeCategorical  `themeCategorical` from theme resolution
 * @param fallback      Palette to use when nothing else matches.
 *                      Network passes `schemeCategory10`; ordinal passes
 *                      `STREAMING_PALETTE`. Caller's choice.
 */
export function resolveCustomLayoutPalette(
  colorScheme: string | string[] | Record<string, string> | undefined,
  themeCategorical: string[] | undefined,
  fallback: readonly string[]
): readonly string[] {
  return resolveCategoricalPalette(colorScheme, themeCategorical, fallback)
}

/**
 * Build a stable key → color resolver. Used by the network and ordinal
 * customLayout contexts so the same key always returns the same color for
 * the lifetime of the closure.
 *
 * When `colorScheme` is an object map `{ key: color }`, a key present in the
 * map resolves to its *exact* color (the documented "exact per-category
 * colors" contract); keys absent from the map hash into `palette` as usual.
 * Non-object `colorScheme` values are ignored here — pass the already-resolved
 * `palette` from `resolveCustomLayoutPalette` for those.
 */
export function buildResolveColor(
  palette: readonly string[],
  colorScheme?: string | string[] | Record<string, string>
): (key: string) => string {
  const colorMap =
    colorScheme && typeof colorScheme === "object" && !Array.isArray(colorScheme)
      ? (colorScheme as Record<string, string>)
      : undefined

  // Defense in depth — `resolveCustomLayoutPalette` should never return
  // an empty palette, but if it ever did `Math.abs(hash) % 0` is NaN
  // and `palette[NaN]` is undefined. Bail out to a fixed primary so the
  // recipe still draws *something* readable instead of silently
  // falling all the way through to scene-renderer fallbacks. An explicit
  // map still wins even when the fallthrough palette is empty.
  if (palette.length === 0) {
    return (key: string): string =>
      (colorMap && resolveExplicitColor(colorMap, key)) || "#4e79a7"
  }
  return (key: string): string => {
    if (colorMap) {
      const mapped = resolveExplicitColor(colorMap, key)
      if (mapped) return mapped
    }
    let hash = 0
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
    return palette[Math.abs(hash) % palette.length] ?? "#4e79a7"
  }
}

// Re-export the fallbacks the helper takes so call sites can pass the
// right one without separately importing from charts/shared.
export { schemeCategory10, STREAMING_PALETTE }
