import * as React from "react"
import type { ReactElement, ReactNode } from "react"

/**
 * Recipe chrome kit — small, framework-level building blocks for the decoration
 * that custom-layout recipes draw in their `overlays` layer: group enclosures,
 * band/axis labels, and leader-line callouts to a mark.
 *
 * These were each hand-rolled per recipe (packedClusterMatrix drew enclosures,
 * marimekko/bullet/parallelCoordinates placed band labels, the satellites
 * graphic needed callouts to specific marks). Centralizing them keeps chrome
 * consistent and lets new recipes opt in instead of re-deriving the geometry.
 *
 * All return plain SVG React elements with `pointerEvents: "none"`, so they
 * decorate without intercepting canvas hit-testing. Pure / SSR-safe.
 */

// ── Group enclosure ──────────────────────────────────────────────────────────

export interface RoundedEnclosureProps {
  x: number
  y: number
  width: number
  height: number
  /** Corner radius. @default 10 */
  radius?: number
  stroke?: string
  /** @default 1.5 */
  strokeWidth?: number
  /** @default 0.6 */
  opacity?: number
  /** @default "none" */
  fill?: string
  strokeDasharray?: string
  className?: string
  keyId?: string | number
}

/** A rounded rectangle around a group of marks (a cell, a row/column band, a cluster). */
export function roundedEnclosure(p: RoundedEnclosureProps): ReactElement {
  return (
    <rect
      key={p.keyId}
      className={p.className}
      x={p.x}
      y={p.y}
      width={Math.max(0, p.width)}
      height={Math.max(0, p.height)}
      rx={p.radius ?? 10}
      ry={p.radius ?? 10}
      fill={p.fill ?? "none"}
      stroke={p.stroke}
      strokeWidth={p.strokeWidth ?? 1.5}
      strokeDasharray={p.strokeDasharray}
      opacity={p.opacity ?? 0.6}
      style={{ pointerEvents: "none" }}
    />
  )
}

/** Bounding box of a set of points (each optionally a circle of radius `r`), padded.
 *  The usual precursor to {@link roundedEnclosure}. Returns null for an empty set. */
export function boundsOf(
  points: ReadonlyArray<{ x: number; y: number; r?: number }>,
  pad = 0
): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    const r = p.r ?? 0
    if (p.x - r < minX) minX = p.x - r
    if (p.x + r > maxX) maxX = p.x + r
    if (p.y - r < minY) minY = p.y - r
    if (p.y + r > maxY) maxY = p.y + r
  }
  if (!Number.isFinite(minX)) return null
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 }
}

/** Axis-aligned box with a top-left origin (chip, card, scene rect). */
export interface HullBox {
  x: number
  y: number
  width: number
  height: number
}

export type HullPadding = number | { x?: number; y?: number }

/**
 * Axis-aligned hull of discrete mark boxes, with optional padding. Use this when
 * marks are chips/cards with known extents (not just points): the result fully
 * surrounds the marks so a stroke drawn *after* the marks reads as a true
 * enclosure (fill under, stroke over). Returns null for an empty set.
 *
 * @example
 * ```ts
 * const hull = hullFromBoxes(chips, { x: 12, y: 10 })
 * // overlays: fill rect (under) then marks then stroke-only rect (over)
 * ```
 */
export function hullFromBoxes(
  boxes: ReadonlyArray<HullBox>,
  padding: HullPadding = 0
): HullBox | null {
  if (!boxes.length) return null
  const padX = typeof padding === "number" ? padding : (padding.x ?? 0)
  const padY = typeof padding === "number" ? padding : (padding.y ?? 0)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const box of boxes) {
    if (!Number.isFinite(box.x) || !Number.isFinite(box.y)) continue
    if (!Number.isFinite(box.width) || !Number.isFinite(box.height)) continue
    const w = Math.max(0, box.width)
    const h = Math.max(0, box.height)
    if (box.x < minX) minX = box.x
    if (box.y < minY) minY = box.y
    if (box.x + w > maxX) maxX = box.x + w
    if (box.y + h > maxY) maxY = box.y + h
  }
  if (!Number.isFinite(minX)) return null
  return {
    x: minX - padX,
    y: minY - padY,
    width: maxX - minX + padX * 2,
    height: maxY - minY + padY * 2
  }
}

// ── Band / axis label ────────────────────────────────────────────────────────

export interface BandLabelProps {
  text: string
  x: number
  y: number
  /** @default "middle" */
  anchor?: "start" | "middle" | "end"
  /** @default "middle" */
  baseline?: "middle" | "hanging" | "auto"
  /** Hide the label if its estimated width exceeds this (px). */
  maxWidth?: number
  /** @default 12 */
  fontSize?: number
  fontWeight?: number | string
  color?: string
  className?: string
  keyId?: string | number
}

/** A label placed at a band/axis position, suppressed when it would overflow
 *  `maxWidth` (the dedup pattern marimekko/parallelCoordinates hand-roll). */
export function bandLabel(p: BandLabelProps): ReactElement | null {
  const fontSize = p.fontSize ?? 12
  if (p.maxWidth != null && p.text.length * fontSize * 0.56 > p.maxWidth) return null
  return (
    <text
      key={p.keyId}
      className={p.className}
      x={p.x}
      y={p.y}
      textAnchor={p.anchor ?? "middle"}
      dominantBaseline={p.baseline ?? "middle"}
      fontSize={fontSize}
      fontWeight={p.fontWeight}
      fill={p.color}
      style={{ pointerEvents: "none" }}
    >
      {p.text}
    </text>
  )
}

// ── Hatch / pattern fill ───────────────────────────────────────────────────────

export interface HatchFillOptions {
  /** Unique pattern id, referenced by the returned `fill`. */
  id: string
  /** Line color. @default "currentColor" */
  color?: string
  /** Hatch angle in degrees. @default 45 */
  angle?: number
  /** Spacing between lines, px. @default 8 */
  spacing?: number
  /** Line width, px. @default 1 */
  strokeWidth?: number
  /** Line opacity. @default 0.5 */
  opacity?: number
}

/**
 * A diagonal-hatch SVG fill — for percentile envelopes, uncertainty bands, and
 * "projected/estimated" regions. Returns a `<pattern>` `def` to drop in (any
 * `<defs>`, or anywhere in the SVG tree) and a `fill` URL referencing it, so the
 * chart band and a {@link legendSwatches} hatch swatch read identically instead
 * of each hand-rolling a `<pattern>` (the per-example drift this removes).
 *
 * The SVG analogue of the canvas `createHatchPattern` (`semiotic/utils`); use
 * this for SVG overlays / `foregroundGraphics`, that one for canvas pieceStyle.
 *
 * @example
 * ```ts
 * const hatch = hatchFill({ id: "envelope", color: "var(--semiotic-text-secondary)" })
 * // <>{hatch.def}<path d={bandPath} fill={hatch.fill} /></>
 * ```
 */
export function hatchFill(opts: HatchFillOptions): { def: ReactElement; fill: string } {
  const spacing = opts.spacing ?? 8
  const color = opts.color ?? "currentColor"
  const def = (
    <pattern
      key={opts.id}
      id={opts.id}
      width={spacing}
      height={spacing}
      patternUnits="userSpaceOnUse"
      patternTransform={`rotate(${opts.angle ?? 45})`}
    >
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={spacing}
        stroke={color}
        strokeWidth={opts.strokeWidth ?? 1}
        opacity={opts.opacity ?? 0.5}
      />
    </pattern>
  )
  return { def, fill: `url(#${opts.id})` }
}

// ── Linear tick axis ───────────────────────────────────────────────────────────

export type AxisOrient = "bottom" | "top" | "left" | "right"

export interface LinearAxisProps {
  /** Value → pixel along the axis. Pass any scale function — a `radiusScale`,
   *  a d3 scale, or an inline `(v) => (v - d0) / (d1 - d0) * width`. */
  scale: (value: number) => number
  /** The tick values to draw. */
  ticks: number[]
  /** Axis side. `bottom`/`top` run horizontally (ticks vary x); `left`/`right`
   *  run vertically (ticks vary y). @default "bottom" */
  orient?: AxisOrient
  /** Cross-axis position of the axis line — the `y` for a horizontal axis, the
   *  `x` for a vertical one. @default 0 */
  offset?: number
  /** Tick-mark length (px), drawn outward from the axis toward the labels.
   *  `0` draws labels with no tick marks (the bare year-axis case). @default 6 */
  tickLength?: number
  /** Extend each tick *into* the plot as a gridline of this length (px). The
   *  tick + gridline render as one continuous line. @default 0 */
  gridLength?: number
  /** Dash pattern for the gridline portion (e.g. `"3 5"`). */
  gridDasharray?: string
  /** Format a tick value for its label. @default `String` */
  format?: (v: number) => string
  /** @default 11 */
  fontSize?: number
  fontWeight?: number | string
  /** Tick + label color. @default "var(--semiotic-text-secondary, #888)" */
  color?: string
  /** Gridline color, if different from `color`. */
  gridColor?: string
  /** Gap between a tick's end and its label (px). @default 4 */
  labelGap?: number
  /** Override label `text-anchor`. Defaults follow `orient`. */
  labelAnchor?: "start" | "middle" | "end"
  /** Anchor the first tick label `start` and the last `end` so edge labels stay
   *  inside the plot (pairs with `axisExtent="exact"`). Horizontal axes only.
   *  @default false */
  edgeAnchor?: boolean
  className?: string
  keyId?: string | number
}

/**
 * A linear tick axis drawn from *any* scale, for custom-layout `overlays` — the
 * bespoke-scale escape hatch for axes (the built-in `showAxes` only works for
 * layouts that respect the standard scale). Sibling to {@link bandLabel}: emits
 * tick marks, optional gridlines, and labels as `pointerEvents: "none"` SVG.
 *
 * @example a top time-axis with gridlines running down the plot
 * ```ts
 * linearAxis({
 *   scale: (year) => ((year - 1775) / (2015 - 1775)) * plot.width,
 *   ticks: [1800, 1850, 1900, 1950, 2000],
 *   orient: "top", gridLength: plot.height, gridDasharray: "3 5", edgeAnchor: true,
 * })
 * ```
 */
export function linearAxis(p: LinearAxisProps): ReactElement {
  const orient = p.orient ?? "bottom"
  const horizontal = orient === "bottom" || orient === "top"
  const offset = p.offset ?? 0
  const tickLength = p.tickLength ?? 6
  const gridLength = p.gridLength ?? 0
  const labelGap = p.labelGap ?? 4
  const fontSize = p.fontSize ?? 11
  const color = p.color ?? "var(--semiotic-text-secondary, #888)"
  const gridColor = p.gridColor ?? color
  const format = p.format ?? ((v: number) => String(v))
  // Outward = toward the label; inward = into the plot (gridline).
  const outward = orient === "top" || orient === "left" ? -1 : 1
  const lastIndex = p.ticks.length - 1

  const children: ReactElement[] = p.ticks.map((value, i) => {
    const pos = p.scale(value)
    const tickEnd = offset + outward * tickLength
    const gridEnd = offset - outward * gridLength
    const labelPos = tickEnd + outward * labelGap

    let anchor: "start" | "middle" | "end"
    if (p.labelAnchor) anchor = p.labelAnchor
    else if (horizontal) {
      anchor = p.edgeAnchor && i === 0 ? "start" : p.edgeAnchor && i === lastIndex ? "end" : "middle"
    } else {
      anchor = orient === "left" ? "end" : "start"
    }

    const lineProps = horizontal
      ? { x1: pos, x2: pos, y1: tickEnd, y2: gridEnd }
      : { x1: tickEnd, x2: gridEnd, y1: pos, y2: pos }
    const baseline: "auto" | "hanging" | "middle" = horizontal
      ? orient === "top"
        ? "auto"
        : "hanging"
      : "middle"
    const text = horizontal ? { x: pos, y: labelPos } : { x: labelPos, y: pos }

    return (
      <g key={`tick-${value}-${i}`}>
        {(tickLength > 0 || gridLength > 0) && (
          <line
            {...lineProps}
            stroke={gridLength > 0 ? gridColor : color}
            strokeWidth={1}
            strokeDasharray={gridLength > 0 ? p.gridDasharray : undefined}
            opacity={gridLength > 0 ? 0.7 : 1}
          />
        )}
        <text
          x={text.x}
          y={text.y}
          textAnchor={anchor}
          dominantBaseline={baseline}
          fontSize={fontSize}
          fontWeight={p.fontWeight}
          fill={color}
        >
          {format(value)}
        </text>
      </g>
    )
  })

  return (
    <g key={p.keyId} className={p.className} style={{ pointerEvents: "none" }}>
      {children}
    </g>
  )
}

// ── Leader-line callout to a mark ──────────────────────────────────────────────

export type CalloutConnector = "straight" | "elbow" | "curve"

export interface MarkCalloutProps {
  /** The anchored mark (a position a custom layout emitted). */
  markX: number
  markY: number
  /** Where the label text sits. */
  labelX: number
  labelY: number
  label: ReactNode
  /** @default "straight" */
  connector?: CalloutConnector
  /** Draw a ring of this radius around the mark (editorial highlight). */
  markRadius?: number
  stroke?: string
  /** @default 1 */
  strokeWidth?: number
  color?: string
  /** @default 11 */
  fontSize?: number
  fontWeight?: number | string
  /** text-anchor for the label. @default "middle" */
  labelAnchor?: "start" | "middle" | "end"
  /** @default "hanging" */
  labelBaseline?: "middle" | "hanging" | "auto"
  className?: string
  keyId?: string | number
}

/**
 * A leader line connecting a label to a mark, with an optional ring around the
 * mark — the editorial-callout pattern. Custom-layout recipes use it because
 * the annotation system can't anchor to a mark a layout emits at runtime; the
 * recipe knows the packed position and can call this directly.
 */
export function markCallout(p: MarkCalloutProps): ReactElement {
  const stroke = p.stroke ?? "var(--semiotic-text, #f4f4f8)"
  const strokeWidth = p.strokeWidth ?? 1
  const ring = p.markRadius ?? 0

  // Connector starts at the ring edge (or mark center) and runs to the label.
  const dx = p.labelX - p.markX
  const dy = p.labelY - p.markY
  const len = Math.hypot(dx, dy) || 1
  const sx = p.markX + (dx / len) * ring
  const sy = p.markY + (dy / len) * ring

  let d: string
  if (p.connector === "elbow") {
    d = `M${sx},${sy} L${sx},${p.labelY} L${p.labelX},${p.labelY}`
  } else if (p.connector === "curve") {
    const mx = (sx + p.labelX) / 2
    d = `M${sx},${sy} Q${mx},${sy} ${p.labelX},${p.labelY}`
  } else {
    d = `M${sx},${sy} L${p.labelX},${p.labelY}`
  }

  return (
    <g key={p.keyId} className={p.className} style={{ pointerEvents: "none" }}>
      {ring > 0 && (
        <circle cx={p.markX} cy={p.markY} r={ring} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      )}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <text
        x={p.labelX}
        y={p.labelY}
        textAnchor={p.labelAnchor ?? "middle"}
        dominantBaseline={p.labelBaseline ?? "hanging"}
        fontSize={p.fontSize ?? 11}
        fontWeight={p.fontWeight}
        fill={p.color ?? stroke}
      >
        {p.label}
      </text>
    </g>
  )
}
