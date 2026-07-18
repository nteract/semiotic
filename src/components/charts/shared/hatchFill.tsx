// NOTE: intentionally no "use client" directive — this module is imported by
// the server SVG path (semiotic/server via staticAnnotations + geo configs) and
// must stay server-importable in RSC frameworks. It has no hooks or top-level
// browser access; the only canvas API (resolveHatchCanvasPattern) runs at call
// time, not module eval.
/**
 * Declarative hatch-fill descriptor — a single value that renders as a
 * diagonal-line pattern on BOTH rendering backends.
 *
 * The library historically had two disjoint hatch primitives: a canvas
 * `createHatchPattern` (→ `CanvasPattern`) and an SVG `<pattern>` builder
 * (`hatchFill` recipe / `createSVGHatchPattern`). A caller had to know
 * which medium they were painting into and hand-produce the right thing —
 * which is why a `CanvasPattern` returned from a `pieceStyle` silently
 * collapses to a solid color in SSR (`svgFill` drops non-string fills).
 *
 * `HatchFill` closes that gap: it is a plain, serializable descriptor that
 * can be set directly as `style.fill`. The canvas renderer resolves it to a
 * `CanvasPattern` (`resolveHatchCanvasPattern`); the SVG serializer resolves
 * it to a `<pattern>` def + `url(#id)` (`hatchPatternDef` / `hatchFillId`).
 * One declaration, both mediums — so a bar hatched via a style rule looks
 * identical whether it is drawn to canvas in the browser or serialized to
 * SVG on the server.
 *
 * @example
 * ```tsx
 * <BarChart
 *   styleRules={[
 *     { when: { gt: 10 }, style: { fill: { type: "hatch", background: "#ffd166", stroke: "#e0a92a" } } },
 *   ]}
 * />
 * ```
 */
import * as React from "react"
import { createHatchPattern } from "./hatchPattern"

/**
 * A declarative diagonal-hatch fill. Assign it anywhere a `style.fill`
 * is accepted (`pieceStyle`, `styleRules`, annotation region `fill`).
 * Backend-agnostic: resolved to a `CanvasPattern` for canvas and an SVG
 * `<pattern>` for SSR / the SVG overlay.
 */
export interface HatchFill {
  /** Discriminator — marks this fill as a hatch descriptor. */
  type: "hatch"
  /** Tile background color painted under the lines. @default "transparent" */
  background?: string
  /** Color of the diagonal lines. @default "#000" */
  stroke?: string
  /** Width of the diagonal lines in px. @default 1.5 */
  lineWidth?: number
  /** Spacing between lines in px. @default 6 */
  spacing?: number
  /** Angle of the lines in degrees (0 = horizontal, 45 = diagonal). @default 45 */
  angle?: number
  /** Opacity applied to the hatch lines (SVG `<line>` stroke opacity). @default 1 */
  lineOpacity?: number
}

/** Type guard — is a resolved `style.fill` a `HatchFill` descriptor? */
export function isHatchFill(fill: unknown): fill is HatchFill {
  return (
    typeof fill === "object" &&
    fill !== null &&
    (fill as { type?: unknown }).type === "hatch"
  )
}

/**
 * Stable, content-derived key for a hatch descriptor. Used to cache canvas
 * patterns and to mint deterministic SVG `<pattern>` ids so identical
 * descriptors dedupe rather than proliferate.
 */
export function hatchFillKey(h: HatchFill): string {
  return [
    "hatch",
    h.background ?? "transparent",
    h.stroke ?? "#000",
    h.lineWidth ?? 1.5,
    h.spacing ?? 6,
    h.angle ?? 45,
    h.lineOpacity ?? 1,
  ].join("|")
}

/** Deterministic, SVG-id-safe identifier for a hatch descriptor. */
export function hatchFillId(prefix: string, h: HatchFill): string {
  // Hash the content key to a short, charset-safe suffix. A tiny FNV-1a is
  // plenty here — collisions only cost a shared (identical) pattern def.
  let hash = 0x811c9dc5
  const key = hatchFillKey(h)
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${prefix}-hatch-${(hash >>> 0).toString(36)}`
}

// Canvas patterns are cached by (content key + device-pixel-ratio) so a
// per-frame repaint reuses one pattern rather than rebuilding a tile canvas
// on every draw. DPR is part of the key because a pattern baked at 1x reads
// blurry on a 2x context. Mirrors `barFunnelCanvasRenderer`'s cache.
const _canvasPatternCache = new Map<string, CanvasPattern | null>()

/**
 * Resolve a `HatchFill` descriptor to a `CanvasPattern` for the given
 * context. Cached by descriptor content + DPR. Returns `null` only when
 * the environment can't create a pattern (SSR/test) — callers fall back
 * to the descriptor's `background` color.
 */
export function resolveHatchCanvasPattern(
  h: HatchFill,
  ctx: CanvasRenderingContext2D,
): CanvasPattern | null {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  const key = `${hatchFillKey(h)}@${dpr}`
  const cached = _canvasPatternCache.get(key)
  if (cached !== undefined) return cached
  const result = createHatchPattern(
    {
      background: h.background,
      stroke: h.stroke,
      lineWidth: h.lineWidth,
      spacing: h.spacing,
      angle: h.angle,
    },
    ctx,
  )
  // A real `ctx` is only ever passed on canvas, so `result` is a CanvasPattern
  // here; the descriptor branch (SSR) can't be reached. Guard anyway to keep
  // the cache strictly CanvasPattern | null.
  const pattern = isHatchFill(result) ? null : result
  _canvasPatternCache.set(key, pattern)
  return pattern
}

/**
 * Render a `HatchFill` descriptor as an SVG `<pattern>` element.
 * Place the returned element inside `<defs>` (or anywhere valid) and set
 * `fill="url(#id)"` on the target shape. Mirrors the canvas tile exactly:
 * parallel lines rotated by `angle` so the two backends read identically.
 */
export function hatchPatternDef(h: HatchFill, id: string): React.ReactElement {
  const {
    background = "transparent",
    stroke = "#000",
    lineWidth = 1.5,
    spacing = 6,
    angle = 45,
    lineOpacity = 1,
  } = h
  const size = Math.max(8, Math.ceil(spacing * 2))
  return (
    <pattern
      key={id}
      id={id}
      width={size}
      height={size}
      patternUnits="userSpaceOnUse"
      patternTransform={angle !== 0 ? `rotate(${angle})` : undefined}
    >
      {background && background !== "transparent" && (
        <rect width={size} height={size} fill={background} />
      )}
      {/* Parallel vertical lines; patternTransform rotates them to `angle`. */}
      <line x1={0} y1={0} x2={0} y2={size} stroke={stroke} strokeWidth={lineWidth} strokeOpacity={lineOpacity} />
      <line x1={spacing} y1={0} x2={spacing} y2={size} stroke={stroke} strokeWidth={lineWidth} strokeOpacity={lineOpacity} />
    </pattern>
  )
}

/**
 * Resolve a `style.fill` for an SVG shape. Returns the paint string to use
 * plus, when the fill is a `HatchFill`, the `<pattern>` def to inject.
 *
 * @param fill    the raw `style.fill` (string color, `HatchFill`, or `CanvasPattern`)
 * @param idBase  prefix for the generated pattern id (should be node-unique-ish)
 * @param fallback solid color used when `fill` is null/undefined or a raw CanvasPattern
 */
export function resolveSvgFill(
  fill: string | HatchFill | CanvasPattern | null | undefined,
  idBase: string,
  fallback = "#4e79a7",
): { fill: string; def?: React.ReactElement } {
  if (isHatchFill(fill)) {
    const id = hatchFillId(idBase, fill)
    return { fill: `url(#${id})`, def: hatchPatternDef(fill, id) }
  }
  if (!fill || typeof fill !== "string") return { fill: fallback }
  return { fill }
}
