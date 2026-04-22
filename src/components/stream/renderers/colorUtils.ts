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
  try {
    ctx.fillStyle = color
  } catch {
    ctx.fillStyle = prev as string
    return [78, 121, 167]  // fallback: semiotic primary
  }
  const normalized = ctx.fillStyle as string
  ctx.fillStyle = prev as string

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
