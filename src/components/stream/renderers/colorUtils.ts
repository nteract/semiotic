/**
 * Color utilities shared across canvas renderers.
 *
 * Kept here (not in layouts/hierarchyUtils or a deeper shared module) so
 * renderers don't reach into unrelated layers for primitive helpers.
 */

/**
 * Resolve any valid CSS color string to an [r, g, b] tuple.
 *
 * Uses the canvas's own fillStyle round-trip to normalize first: assigning a
 * CSS color to `ctx.fillStyle` and reading it back always yields `#rrggbb`
 * or `rgba(r, g, b, a)`. That means named colors (`red`, `steelblue`), hsl(),
 * and any other valid CSS form work the same as hex and rgb. Without the
 * normalization pass a bare regex parser silently falls back on anything it
 * doesn't match — gradients from named colors would render gray.
 *
 * The prior fillStyle is restored so this is callable from the middle of a
 * draw without disturbing in-progress paint state.
 */
export function parseCanvasColor(ctx: CanvasRenderingContext2D, color: string): [number, number, number] {
  const prev = ctx.fillStyle
  // Force a known sentinel before trying the user's color so we can detect
  // silent rejections. The browser ignores invalid CSS color assignments
  // without throwing — fillStyle is left at whatever was there before. If
  // that previous value happened to be a string, a naive round-trip check
  // would parse the prior color as if it were the user's input. Setting the
  // sentinel first means a rejected assignment leaves fillStyle === sentinel.
  const SENTINEL = "#010203"
  try {
    ctx.fillStyle = SENTINEL
    ctx.fillStyle = color
  } catch {
    ctx.fillStyle = prev
    return [78, 121, 167]  // fallback: semiotic primary
  }
  const normalized = ctx.fillStyle
  ctx.fillStyle = prev
  // Guard against non-string fillStyle (CanvasGradient/CanvasPattern — can't
  // happen after our sentinel assignment, but defensive).
  if (typeof normalized !== "string") return [78, 121, 167]
  // Sentinel unchanged means the browser rejected the user's color. Only
  // treat this as rejection if the input wasn't literally the sentinel.
  if (normalized.toLowerCase() === SENTINEL && color.trim().toLowerCase() !== SENTINEL) {
    return [78, 121, 167]
  }

  if (normalized.startsWith("#")) {
    // Canvas returns #rrggbb (never the short form after round-trip)
    return [
      parseInt(normalized.slice(1, 3), 16),
      parseInt(normalized.slice(3, 5), 16),
      parseInt(normalized.slice(5, 7), 16),
    ]
  }
  const m = normalized.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return [+m[1], +m[2], +m[3]]
  return [78, 121, 167]
}
