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
