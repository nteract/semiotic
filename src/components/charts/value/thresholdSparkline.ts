/**
 * Threshold zone resolution + inline sparkline path builder for
 * BigNumber. Lifted out so the component file stays focused on layout.
 */
import type { BigNumberLevel, BigNumberThreshold } from "./types"

/**
 * Resolve a numeric value against an ordered threshold list. Zones are
 * tested by "highest `at` whose bound is ≤ value." `-Infinity` works
 * as a "catch-all" lower zone.
 *
 * Returns `null` when no threshold fits (caller falls back to neutral).
 */
export function resolveThreshold(
  value: number,
  thresholds: ReadonlyArray<BigNumberThreshold> | undefined
): BigNumberThreshold | null {
  if (!thresholds || thresholds.length === 0) return null
  if (!Number.isFinite(value)) return null
  // Sort defensively — capability-authored thresholds occasionally land
  // out of order. Stable + cheap on the ≤10-zone real-world case.
  const sorted = thresholds
    .filter((t) => Number.isFinite(t.at) || t.at === -Infinity)
    .slice()
    .sort((a, b) => a.at - b.at)
  let best: BigNumberThreshold | null = null
  for (const t of sorted) {
    if (value >= t.at) best = t
    else break
  }
  return best
}

/**
 * Map a level + explicit-color override to a CSS color string. The
 * neutral level falls through to `--semiotic-text` so the value reads
 * as the regular text colour when no thresholds fire.
 */
export function colorForLevel(level: BigNumberLevel, explicit?: string): string {
  if (explicit) return explicit
  if (level === "neutral") return "var(--semiotic-text, currentColor)"
  return `var(--semiotic-${level}, currentColor)`
}

// ── Sparkline path builder ───────────────────────────────────────────

export interface SparklinePoint {
  x: number
  y: number
}

/**
 * Build the SVG path string for a polyline sparkline. Maps values into
 * a [0..width] × [0..height] box; auto-fits the y-domain by default.
 *
 * Empty / single-point input returns an empty string.
 */
export function buildSparklinePath(
  values: ReadonlyArray<number>,
  opts: {
    width: number
    height: number
    padding?: number
    yMin?: number
    yMax?: number
  }
): { line: string; area: string; points: SparklinePoint[] } {
  const padding = opts.padding ?? 1
  if (values.length === 0) return { line: "", area: "", points: [] }
  if (values.length === 1) {
    const cx = opts.width / 2
    const cy = opts.height / 2
    return {
      line: `M${cx},${cy}`,
      area: "",
      points: [{ x: cx, y: cy }],
    }
  }

  const yMin =
    opts.yMin ??
    values.reduce((m, v) => (Number.isFinite(v) && v < m ? v : m), Infinity)
  const yMax =
    opts.yMax ??
    values.reduce((m, v) => (Number.isFinite(v) && v > m ? v : m), -Infinity)
  const yRange = yMax - yMin || 1

  const innerW = Math.max(0, opts.width - padding * 2)
  const innerH = Math.max(0, opts.height - padding * 2)
  const stepX = values.length === 1 ? 0 : innerW / (values.length - 1)

  const points: SparklinePoint[] = []
  let line = ""
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!Number.isFinite(v)) continue
    const x = padding + i * stepX
    const y = padding + innerH - ((v - yMin) / yRange) * innerH
    // Use the emitted-point counter to decide M vs L so a leading NaN
    // doesn't start the path with an L (which is invalid SVG).
    line += `${points.length === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    points.push({ x, y })
  }
  if (points.length === 0) return { line: "", area: "", points: [] }
  const first = points[0]
  const last = points[points.length - 1]
  const baseY = padding + innerH
  const area = `${line} L${last.x.toFixed(2)},${baseY.toFixed(2)} L${first.x.toFixed(2)},${baseY.toFixed(2)} Z`
  return { line, area, points }
}
