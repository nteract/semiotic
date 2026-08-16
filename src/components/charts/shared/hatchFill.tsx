// NOTE: intentionally no "use client" directive — this module is imported by
// the server SVG path (semiotic/server via staticAnnotations + geo configs) and
// must stay server-importable in RSC frameworks. It has no hooks or top-level
// browser access; the only canvas API (resolveHatchCanvasPattern) runs at call
// time, not module eval.
/**
 * Declarative hatch-fill descriptor that renders as a diagonal-line pattern
 * on both rendering backends.
 *
 * `HatchFill` is a plain, serializable descriptor that
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
import { resolveCSSColor } from "../../stream/renderers/resolveCSSColor"

type AnnotationGradientDirection = "horizontal" | "vertical"

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

/** Test helper: drop the canvas hatch cache between cases. */
export function clearHatchCanvasPatternCacheForTests(): void {
  _canvasPatternCache.clear()
}

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
  // CSS custom properties cannot be used as fillStyle on an offscreen tile —
  // the browser treats invalid paint as black. Resolve against the live canvas
  // DOM ancestor first; cache key includes the resolved paint so theme toggles
  // still re-bake.
  const backgroundRaw = h.background ?? "transparent"
  const strokeRaw = h.stroke ?? "#000"
  const background = backgroundRaw === "transparent" || backgroundRaw === "none"
    ? backgroundRaw
    : (resolveCSSColor(ctx, backgroundRaw) || backgroundRaw)
  const stroke = resolveCSSColor(ctx, strokeRaw) || strokeRaw || "#000"

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  const key = `${hatchFillKey(h)}|${background}|${stroke}@${dpr}`
  const cached = _canvasPatternCache.get(key)
  if (cached !== undefined) return cached
  const result = createHatchPattern(
    {
      background,
      stroke,
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

/**
 * Resolve the serializable `gradient` option accepted by band annotations.
 *
 * Gradient stops deliberately share the familiar `{ offset: 0..1, color?,
 * opacity? }` contract used by area and legend gradients. The annotation owns
 * its direction: horizontal for an x-band and vertical for a y-band, unless
 * callers explicitly select the other direction. Invalid JSON input simply
 * falls through to the annotation's solid fill instead of breaking rendering.
 */
export function resolveAnnotationGradient(
  gradient: unknown,
  idBase: string,
  defaultDirection: AnnotationGradientDirection,
  fallback: string,
): { fill: string; def: React.ReactElement } | undefined {
  if (!gradient || typeof gradient !== "object") return undefined
  const candidate = gradient as {
    direction?: unknown
    stops?: unknown
  }
  if (!Array.isArray(candidate.stops)) return undefined

  const stops = candidate.stops
    .flatMap((stop) => {
      if (!stop || typeof stop !== "object") return []
      const { offset, color, opacity } = stop as {
        offset?: unknown
        color?: unknown
        opacity?: unknown
      }
      if (typeof offset !== "number" || !Number.isFinite(offset)) return []
      return [{
        offset: Math.max(0, Math.min(1, offset)),
        color: typeof color === "string" && color ? color : fallback,
        opacity: typeof opacity === "number" && Number.isFinite(opacity)
          ? Math.max(0, Math.min(1, opacity))
          : undefined,
      }]
    })
    .sort((a, b) => a.offset - b.offset)
  if (!stops.length) return undefined

  const direction: AnnotationGradientDirection = candidate.direction === "horizontal"
    ? "horizontal"
    : candidate.direction === "vertical"
      ? "vertical"
      : defaultDirection
  const id = `${idBase}-gradient`
  return {
    fill: `url(#${id})`,
    def: (
      <linearGradient
        key={id}
        id={id}
        x1={0}
        y1={0}
        x2={direction === "horizontal" ? "100%" : 0}
        y2={direction === "vertical" ? "100%" : 0}
      >
        {stops.map((stop, index) => (
          <stop
            key={`${stop.offset}-${index}`}
            offset={`${stop.offset * 100}%`}
            stopColor={stop.color}
            stopOpacity={stop.opacity}
          />
        ))}
      </linearGradient>
    ),
  }
}
