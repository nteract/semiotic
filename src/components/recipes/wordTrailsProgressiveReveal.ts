import type { WordTrailsConfig } from "./wordTrails"
import { clamp } from "./recipeUtils"

/** Options for a stable, progressive Word Trails reveal. */
export interface WordTrailsProgressiveRevealOptions {
  /** Segment that is currently active/reached. Values are clamped to `segmentDomain`. */
  currentSegment: number
  /** Ordered `[oldest, newest]` segment extent used for the fade. */
  segmentDomain: readonly [number, number]
  /** Opacity of the oldest reached segment. @default 0.25 */
  oldestOpacity?: number
  /** Opacity of the current segment. @default 1 */
  currentOpacity?: number
  /** Opacity of unreached segments. `0` hides their glyphs and hit targets. @default 0 */
  futureOpacity?: number
  /** Also multiply the reveal by Word Trails' built-in weight fade. @default false */
  combineWeightOpacity?: boolean
}

/**
 * Build the two config fields for a stable, progressive segment reveal.
 *
 * Reached rows fade linearly from `oldestOpacity` at the start of the domain
 * to `currentOpacity` at `currentSegment`; future rows use `futureOpacity`.
 * Word Trails still lays out zero-opacity rows, so playback changes visibility
 * without reflow. The returned config disables the independent weight-opacity
 * encoding unless `combineWeightOpacity` is explicitly enabled.
 *
 * This is the Word Trails composition counterpart to the runtime-neutral
 * `opacityFromAge` helper: it keeps the same linear newest-to-oldest reading,
 * then adds future hiding, layout reservation, and exact weight-opacity
 * semantics without making the recipes entry point depend on a motion runtime.
 *
 * @example
 * ```tsx
 * layoutConfig={{
 *   ...config,
 *   ...wordTrailsProgressiveReveal({
 *     currentSegment: iteration,
 *     segmentDomain: [0, lastIteration]
 *   })
 * }}
 * ```
 */
export function wordTrailsProgressiveReveal(
  options: WordTrailsProgressiveRevealOptions
): Pick<WordTrailsConfig, "wordOpacity" | "weightOpacity"> {
  const rawStart = Number(options.segmentDomain?.[0])
  const rawEnd = Number(options.segmentDomain?.[1])
  const start = Number.isFinite(rawStart) ? rawStart : 0
  const end = Number.isFinite(rawEnd) ? rawEnd : start
  const direction = end < start ? -1 : 1
  const extent = Math.abs(end - start)
  const rawCurrent = Number(options.currentSegment)
  const currentOffset = Number.isFinite(rawCurrent)
    ? clamp((rawCurrent - start) * direction, 0, extent)
    : 0

  const opacity = (value: number | undefined, fallback: number): number => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? clamp(numeric, 0, 1) : fallback
  }
  const oldestOpacity = opacity(options.oldestOpacity, 0.25)
  const currentOpacity = opacity(options.currentOpacity, 1)
  const futureOpacity = opacity(options.futureOpacity, 0)

  return {
    weightOpacity: options.combineWeightOpacity === true,
    wordOpacity: ({ segment }) => {
      const numericSegment = Number(segment)
      if (!Number.isFinite(numericSegment)) return futureOpacity
      const offset = (numericSegment - start) * direction
      if (offset > currentOffset) return futureOpacity
      if (currentOffset === 0) return currentOpacity
      const progress = clamp(offset / currentOffset, 0, 1)
      return oldestOpacity + (currentOpacity - oldestOpacity) * progress
    }
  }
}
