import { COLOR_SCHEMES, STREAMING_PALETTE } from "../charts/shared/colorUtils"
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
  // Object map `{ key: color }` — the map's values are the palette. Exact
  // per-key colors come from `buildResolveColor` (which is handed the same
  // map); this array backs `theme.categorical` and unmapped-key hashing.
  if (colorScheme && typeof colorScheme === "object" && !Array.isArray(colorScheme)) {
    const values = Object.values(colorScheme).filter(
      (c): c is string => typeof c === "string" && c.length > 0
    )
    if (values.length > 0) return values
    // Empty/invalid map — fall through to theme/fallback.
  }
  // Treat an empty array the same as `undefined`. Downstream callers
  // (`buildResolveColor`) hash by `palette.length`, so a 0-length
  // palette would produce NaN modulos — fall through to theme/fallback
  // instead so the resolver always has at least one color to work with.
  if (Array.isArray(colorScheme) && colorScheme.length > 0) return colorScheme
  if (typeof colorScheme === "string") {
    const named = (COLOR_SCHEMES as Record<string, unknown>)[colorScheme]
    if (Array.isArray(named) && named.length > 0) return named as string[]
    // Unknown name (or empty named scheme) — fall through.
  }
  if (themeCategorical && themeCategorical.length > 0) return themeCategorical
  return fallback
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
      colorMap && typeof colorMap[key] === "string" ? colorMap[key] : "#4e79a7"
  }
  return (key: string): string => {
    if (colorMap && typeof colorMap[key] === "string") return colorMap[key]
    let hash = 0
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
    return palette[Math.abs(hash) % palette.length] ?? "#4e79a7"
  }
}

// Re-export the fallbacks the helper takes so call sites can pass the
// right one without separately importing from charts/shared.
export { schemeCategory10, STREAMING_PALETTE }
