import type { AnnotationContext } from "../realtime/types"
import type { Datum } from "../charts/shared/datumTypes"
import { resolveAnchoredPosition } from "../charts/shared/annotationResolvers"

export interface AnnotationLayoutConfig {
  /** Distance from the anchor for the first candidate ring. */
  defaultOffset?: number
  /** Gap around note boxes when testing note-note collisions. */
  notePadding?: number
  /** Gap around point marks when testing note-mark collisions. */
  markPadding?: number
  /** Gap from the plot edge, used as a cheap axis-occlusion proxy. */
  edgePadding?: number
  /** Preserve annotations that already declare either dx or dy. Default true. */
  preserveManualOffsets?: boolean
  /** Use a curved connector when auto-placement has to route far from the target. */
  routeLongConnectors?: boolean
  /** Distance threshold for routeLongConnectors. */
  connectorThreshold?: number
}

export type AutoPlaceAnnotationsConfig = AnnotationLayoutConfig
export type AutoPlaceAnnotations = boolean | AutoPlaceAnnotationsConfig

export interface AnnotationLayoutOptions extends AnnotationLayoutConfig {
  annotations: ReadonlyArray<Datum>
  context: AnnotationContext
}

type Box = { x: number; y: number; width: number; height: number }
type Candidate = { dx: number; dy: number }

const NOTE_TYPES = new Set(["label", "callout", "callout-circle", "callout-rect", "text", "widget"])
const DEFAULT_OFFSET = 32
const DEFAULT_NOTE_PADDING = 6
const DEFAULT_MARK_PADDING = 4
const DEFAULT_EDGE_PADDING = 8
const DEFAULT_CONNECTOR_THRESHOLD = 72

function hasManualOffset(a: Datum): boolean {
  return typeof a.dx === "number" || typeof a.dy === "number"
}

function isPlaceableAnnotation(a: Datum): boolean {
  return !!a && typeof a === "object" && NOTE_TYPES.has(String(a.type || ""))
}

function textLines(text: string | undefined, wrap: number): string[] {
  if (!text) return []
  const maxChars = Math.max(1, Math.floor(wrap / 7))
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    if (line && line.length + word.length + 1 > maxChars) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

function estimateNoteSize(a: Datum): { width: number; height: number } {
  if (a.type === "widget") {
    return {
      width: typeof a.width === "number" ? a.width : 32,
      height: typeof a.height === "number" ? a.height : 32,
    }
  }

  const wrap = typeof a.wrap === "number" ? a.wrap : 120
  const lines = [
    ...textLines(typeof a.title === "string" ? a.title : undefined, wrap),
    ...textLines(typeof a.label === "string" ? a.label : undefined, wrap),
  ]
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0)
  return {
    width: Math.max(24, Math.min(wrap, longest * 7) + 10),
    height: Math.max(18, lines.length * 16 + 6),
  }
}

function noteBox(anchorX: number, anchorY: number, dx: number, dy: number, size: { width: number; height: number }): Box {
  const nx = anchorX + dx
  const ny = anchorY + dy
  const horizontal = Math.abs(dx) > Math.abs(dy)

  if (horizontal) {
    return {
      x: dx >= 0 ? nx + 4 : nx - size.width - 4,
      y: dy < 0 ? ny - size.height : ny,
      width: size.width,
      height: size.height,
    }
  }

  return {
    x: dx >= 0 ? nx : nx - size.width,
    y: dy < 0 ? ny - size.height - 4 : ny + 4,
    width: size.width,
    height: size.height,
  }
}

function expandBox(box: Box, pad: number): Box {
  return {
    x: box.x - pad,
    y: box.y - pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  }
}

function overlapArea(a: Box, b: Box): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  return x * y
}

function outOfBoundsArea(box: Box, width: number, height: number, edgePadding: number): number {
  const left = Math.max(0, edgePadding - box.x)
  const top = Math.max(0, edgePadding - box.y)
  const right = Math.max(0, box.x + box.width - (width - edgePadding))
  const bottom = Math.max(0, box.y + box.height - (height - edgePadding))
  return (left + right) * box.height + (top + bottom) * box.width
}

function candidateOffsets(distance: number): Candidate[] {
  const near = distance
  const far = distance * 1.6
  return [
    { dx: near, dy: -near },
    { dx: -near, dy: -near },
    { dx: near, dy: near },
    { dx: -near, dy: near },
    { dx: near, dy: 0 },
    { dx: -near, dy: 0 },
    { dx: 0, dy: -near },
    { dx: 0, dy: near },
    { dx: far, dy: -far },
    { dx: -far, dy: -far },
    { dx: far, dy: far },
    { dx: -far, dy: far },
  ]
}

function pointObstacleBoxes(context: AnnotationContext, markPadding: number): Box[] {
  return (context.pointNodes || []).map((p) => {
    const r = Math.max(1, p.r || 1) + markPadding
    return { x: p.x - r, y: p.y - r, width: r * 2, height: r * 2 }
  })
}

function scoreCandidate(
  box: Box,
  candidate: Candidate,
  placedBoxes: Box[],
  pointBoxes: Box[],
  width: number,
  height: number,
  notePadding: number,
  edgePadding: number
): number {
  const expanded = expandBox(box, notePadding)
  const distance = Math.hypot(candidate.dx, candidate.dy)
  let score = distance * 0.4 + outOfBoundsArea(expanded, width, height, edgePadding) * 80

  for (const placed of placedBoxes) score += overlapArea(expanded, placed) * 12
  for (const point of pointBoxes) score += overlapArea(expanded, point) * 4
  return score
}

function resolveAnchor(a: Datum, index: number, context: AnnotationContext): { x: number; y: number } | null {
  if (a.type === "widget" && typeof a.px === "number" && typeof a.py === "number") {
    return { x: a.px, y: a.py }
  }
  return resolveAnchoredPosition(a, index, context)
}

/**
 * Pure annotation placement recipe.
 *
 * It clones note-like annotations that do not already declare `dx`/`dy`, picks
 * an adjacent candidate offset, and leaves every other annotation untouched.
 * The pass is deterministic and geometry-only; renderers still own the actual
 * SVG/HTML annotation drawing.
 */
export function annotationLayout(options: AnnotationLayoutOptions): Datum[] {
  const {
    annotations,
    context,
    defaultOffset = DEFAULT_OFFSET,
    notePadding = DEFAULT_NOTE_PADDING,
    markPadding = DEFAULT_MARK_PADDING,
    edgePadding = DEFAULT_EDGE_PADDING,
    preserveManualOffsets = true,
    routeLongConnectors = true,
    connectorThreshold = DEFAULT_CONNECTOR_THRESHOLD,
  } = options

  const width = context.width || 0
  const height = context.height || 0
  if (annotations.length === 0 || width <= 0 || height <= 0) return annotations.slice()

  const placedBoxes: Box[] = []
  const pointBoxes = pointObstacleBoxes(context, markPadding)
  let changed = false

  const output = annotations.map((annotation, index) => {
    if (!isPlaceableAnnotation(annotation)) return annotation

    const anchor = resolveAnchor(annotation, index, context)
    if (!anchor) return annotation

    const size = estimateNoteSize(annotation)
    if (preserveManualOffsets && hasManualOffset(annotation)) {
      const dx = typeof annotation.dx === "number" ? annotation.dx : 0
      const dy = typeof annotation.dy === "number" ? annotation.dy : 0
      placedBoxes.push(expandBox(noteBox(anchor.x, anchor.y, dx, dy, size), notePadding))
      return annotation
    }

    let best: Candidate | null = null
    let bestScore = Infinity
    for (const candidate of candidateOffsets(defaultOffset)) {
      const box = noteBox(anchor.x, anchor.y, candidate.dx, candidate.dy, size)
      const score = scoreCandidate(
        box,
        candidate,
        placedBoxes,
        pointBoxes,
        width,
        height,
        notePadding,
        edgePadding
      )
      if (score < bestScore) {
        best = candidate
        bestScore = score
      }
    }

    if (!best) return annotation

    const placed = expandBox(noteBox(anchor.x, anchor.y, best.dx, best.dy, size), notePadding)
    placedBoxes.push(placed)

    const dist = Math.hypot(best.dx, best.dy)
    const connector =
      routeLongConnectors && dist >= connectorThreshold && annotation.type !== "text" && annotation.type !== "widget"
        ? { ...(annotation.connector || { end: "arrow" }), type: "curve" }
        : annotation.connector
    changed = true
    return {
      ...annotation,
      dx: best.dx,
      dy: best.dy,
      ...(connector ? { connector } : {}),
    }
  })

  return changed ? output : annotations.slice()
}
