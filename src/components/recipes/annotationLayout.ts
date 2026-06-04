import type { AnnotationContext } from "../realtime/types"
import type { Datum } from "../charts/shared/datumTypes"
import { resolveAnchoredPosition } from "../charts/shared/annotationResolvers"
import { annotationDensity, annotationBudget, type AnnotationDensityConfig } from "./annotationDensity"

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
  /**
   * M3 — amount & density management. When set, after placement the lowest-
   * priority note-like annotations are shed so the plot is not over-crowded
   * (`true` uses the area-derived default budget; an object tunes it). Reference
   * lines, bands and overlays are never shed. Off by default.
   */
  density?: boolean | AnnotationDensityConfig
  /**
   * M3 — progressive disclosure. When `true`, density-deferred notes are kept
   * in the output tagged `_annotationDeferred` (hidden by default, revealed on
   * chart hover/focus) instead of dropped. Requires `density`. The persistent
   * set is always rendered, so a non-hover reader still sees the core notes.
   */
  progressiveDisclosure?: boolean
  /**
   * M4 — redundant-cue default (Rahman et al.'s "Association"). A colored
   * `text` note is the one note type that never draws a connector, so it ties
   * to its target by color alone — invisible to a color-blind or non-visual
   * reader. When `true`, an offset colored `text` note is flagged
   * `_redundantConnector` so the renderer adds a faint leader line from the
   * anchor to the text: a spatial cue, not another color. Off by default.
   */
  redundantCues?: boolean
  /**
   * M5 — responsive annotation behavior. As the plot narrows past `minWidth`
   * (default 480px), `secondary`-emphasis notes are shed by *importance* — a
   * complement to `density`'s count budget. Pass `true` for the default
   * breakpoint or `{ minWidth }` to tune it. With `progressiveDisclosure`,
   * shed notes are deferred (revealable) rather than dropped. Primary and
   * unmarked notes are always kept. Off by default.
   */
  responsive?: boolean | { minWidth?: number }
  /**
   * M5 — cohesion mode (Rahman et al.'s "Cohesion"). `"blended"` lets notes
   * adopt the chart's visual language (mark colors / chart typography — the
   * default look); `"layer"` presents them as a distinct editorial layer
   * (annotation-color, italic editorial type). Stamped onto note-like
   * annotations that don't set their own `cohesion`; a per-annotation
   * `cohesion` always wins. Off (inherit) by default.
   */
  cohesion?: AnnotationCohesion
  /**
   * M6 — audience adaptation. An `AudienceProfile` (structurally, anything with
   * a `familiarity` map) biases annotation *amount*: a low-familiarity audience
   * keeps more notes (orienting context), an expert audience fewer. It scales
   * the `density` budget, so it only takes effect when `density` is engaged.
   */
  audience?: AnnotationAudience
}

export type AnnotationCohesion = "blended" | "layer"

/** Structural subset of `AudienceProfile` the annotation layer reads — anything
 *  with a per-chart `familiarity` map satisfies it, so a real `AudienceProfile`
 *  can be passed directly without coupling `recipes` to the `ai` module. */
export interface AnnotationAudience {
  name?: string
  familiarity?: Partial<Record<string, number>>
}

export type AutoPlaceAnnotationsConfig = AnnotationLayoutConfig
export type AutoPlaceAnnotations = boolean | AutoPlaceAnnotationsConfig

export interface AnnotationLayoutOptions extends AnnotationLayoutConfig {
  annotations: ReadonlyArray<Datum>
  context: AnnotationContext
}

type Box = { x: number; y: number; width: number; height: number }
type Candidate = { dx: number; dy: number }
type GeoProjection = (coords: [number, number]) => [number, number] | null
type ScalesWithGeoProjection = AnnotationContext["scales"] & { geoProjection?: GeoProjection }

const NOTE_TYPES = new Set(["label", "callout", "callout-circle", "callout-rect", "text", "widget"])
const DEFAULT_OFFSET = 32
const DEFAULT_NOTE_PADDING = 6
const DEFAULT_MARK_PADDING = 4
const DEFAULT_EDGE_PADDING = 8
const DEFAULT_CONNECTOR_THRESHOLD = 72
const DEFAULT_RENDERER_NOTE_DX = 30
const DEFAULT_RENDERER_NOTE_DY = -30

function hasManualOffset(a: Datum): boolean {
  return typeof a.dx === "number" || typeof a.dy === "number"
}

function rendererOffset(a: Datum): Candidate {
  if (a.type === "text" || a.type === "widget") return { dx: 0, dy: 0 }
  return { dx: DEFAULT_RENDERER_NOTE_DX, dy: DEFAULT_RENDERER_NOTE_DY }
}

// M4 — minimum anchor→text offset (px) before a leader line earns its keep.
// Below this the text effectively sits on its anchor, so color isn't doing
// any cross-chart association work and a connector would just be noise.
const REDUNDANT_CUE_MIN_OFFSET = 8

// M5 — plot width (px) at or below which responsive shedding kicks in.
const DEFAULT_RESPONSIVE_MIN_WIDTH = 480

// M6 — neutral familiarity (1..5 scale) when an audience declares none.
const NEUTRAL_FAMILIARITY = 3

/** Aggregate an audience's per-chart familiarity into one 1..5 number. The
 *  annotation layer is chart-agnostic, so it reads the audience's overall
 *  literacy (the mean of declared familiarities), defaulting to neutral. */
function aggregateFamiliarity(audience: AnnotationAudience | undefined): number {
  const map = audience?.familiarity
  if (!map) return NEUTRAL_FAMILIARITY
  const values = Object.values(map).filter((v): v is number => typeof v === "number" && Number.isFinite(v))
  if (values.length === 0) return NEUTRAL_FAMILIARITY
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Map aggregate familiarity to a density-budget multiplier: a low-familiarity
 *  audience keeps more orienting notes (×1.5), an expert audience fewer (×0.6). */
function audienceBudgetFactor(audience: AnnotationAudience | undefined): number {
  if (!audience) return 1
  const fam = aggregateFamiliarity(audience)
  if (fam <= 2) return 1.5
  if (fam >= 4) return 0.6
  return 1
}

const SOURCE_LABELS: Record<string, string> = {
  ai: "AI",
  agent: "agent",
  watcher: "watcher",
  system: "system",
  import: "imported",
  computed: "computed",
  user: "you",
}

/** M6 — make a traveling note's provenance visible on the chart itself, so a
 *  screenshot stripped of metadata still says who made the note and how sure
 *  they were. Appends `(AI · 70%)`-style text to the note's label. */
function applyVisibleProvenance(a: Datum): Datum {
  const prov = a?.provenance
  if (!prov || typeof prov !== "object") return a
  const source = typeof prov.source === "string" ? (SOURCE_LABELS[prov.source] ?? prov.source) : null
  const confidence =
    typeof prov.confidence === "number" && Number.isFinite(prov.confidence)
      ? `${Math.round(Math.max(0, Math.min(1, prov.confidence)) * 100)}%`
      : null
  if (!source && !confidence) return a
  const marker = [source, confidence].filter(Boolean).join(" · ")
  const base = typeof a.label === "string" ? a.label : ""
  // Idempotent: the layout pass reads clean author input each render, but guard
  // against a note already carrying the marker.
  if (base.includes(`(${marker})`)) return a
  return { ...a, label: base ? `${base} (${marker})` : `(${marker})` }
}

/** Stamp a chart-wide cohesion mode onto note-like annotations that don't set
 *  their own. A per-annotation `cohesion` always wins; the renderer reads the
 *  resolved value to apply the visual treatment. */
function applyCohesion(annotations: Datum[], cohesion: AnnotationCohesion): Datum[] {
  let changed = false
  const next = annotations.map((a) => {
    if (!isPlaceableAnnotation(a)) return a
    if (a.cohesion === "blended" || a.cohesion === "layer") return a
    changed = true
    return { ...a, cohesion }
  })
  return changed ? next : annotations
}

/** A colored `text` note offset from its anchor ties to its target by color
 *  alone — the renderer draws no connector for `text`. Flag it so the text
 *  rule adds a leader line (a spatial, CVD-safe cue). */
function applyRedundantCue(a: Datum): Datum {
  if (a.type !== "text" || typeof a.color !== "string") return a
  const dx = typeof a.dx === "number" ? a.dx : 0
  const dy = typeof a.dy === "number" ? a.dy : 0
  if (Math.hypot(dx, dy) < REDUNDANT_CUE_MIN_OFFSET) return a
  return { ...a, _redundantConnector: true }
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

  const pointId = a.pointId ?? a.nodeId
  if (pointId != null && context.pointNodes) {
    const match = context.pointNodes.find((p) => p.pointId === pointId)
    if (match) return { x: match.x, y: match.y }
  }

  const coords = a.coordinates
  const geoProjection = (context.scales as ScalesWithGeoProjection | undefined)?.geoProjection
  if (Array.isArray(coords) && coords.length >= 2 && geoProjection) {
    const lon = coords[0]
    const lat = coords[1]
    if (typeof lon === "number" && typeof lat === "number") {
      const projected = geoProjection([lon, lat])
      if (projected && typeof projected[0] === "number" && typeof projected[1] === "number") {
        return { x: projected[0], y: projected[1] }
      }
    }
  }

  if (!context.scales && typeof a.x === "number" && typeof a.y === "number") {
    return { x: a.x, y: a.y }
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
    density,
    progressiveDisclosure = false,
    redundantCues = false,
    responsive,
    cohesion,
    audience,
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
      const fallback = rendererOffset(annotation)
      const dx = typeof annotation.dx === "number" ? annotation.dx : fallback.dx
      const dy = typeof annotation.dy === "number" ? annotation.dy : fallback.dy
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

  const placedRaw = changed ? output : annotations.slice()

  // M4 — redundant-cue default. Runs after placement so it sees the final
  // offsets. Adds a leader-line flag to colored `text` notes that would
  // otherwise rely on color alone (see `redundantCues`).
  let placed = placedRaw
  if (redundantCues) {
    let cued = false
    const next = placedRaw.map((a) => {
      const enriched = applyRedundantCue(a)
      if (enriched !== a) cued = true
      return enriched
    })
    placed = cued ? next : placedRaw
  }

  // M6 — defensive/traveling notes carry their provenance *visibly* (source +
  // confidence baked into the label) so a screenshot stripped of metadata still
  // shows who made the note and how sure they were.
  {
    let stamped = false
    const next = placed.map((a) => {
      if (a?.defensive !== true) return a
      const enriched = applyVisibleProvenance(a)
      if (enriched !== a) stamped = true
      return enriched
    })
    placed = stamped ? next : placed
  }

  // ── Shedding — density (M3, by count) + responsive (M5, by importance) ──
  // Both run after placement (they need to know what landed) and pool their
  // verdicts into one shed set so a note shed by either is handled once.
  const toShed = new Set<Datum>()

  if (density) {
    const densityConfig = typeof density === "object" ? density : {}
    // M6 — audience biases amount by scaling the budget: a low-familiarity
    // audience keeps more orienting notes, an expert audience fewer.
    const factor = audienceBudgetFactor(audience)
    const scaledConfig =
      factor === 1
        ? densityConfig
        : {
            ...densityConfig,
            maxAnnotations: Math.max(
              1,
              Math.round((densityConfig.maxAnnotations ?? annotationBudget(width, height, densityConfig)) * factor)
            ),
          }
    const { deferred } = annotationDensity({ annotations: placed, width, height, ...scaledConfig })
    for (const a of deferred) toShed.add(a)
  }

  // M5 — responsive: as the plot narrows past the breakpoint, shed
  // `secondary`-emphasis notes by importance. Primary and unmarked notes stay.
  if (responsive) {
    const minWidth =
      typeof responsive === "object" && typeof responsive.minWidth === "number"
        ? responsive.minWidth
        : DEFAULT_RESPONSIVE_MIN_WIDTH
    if (width <= minWidth) {
      for (const a of placed) {
        if (isPlaceableAnnotation(a) && a.emphasis === "secondary") toShed.add(a)
      }
    }
  }

  // M6 — a defensive note is never shed by any pass (the traveling-caveat
  // guarantee). annotationDensity already floors it; this also covers the
  // responsive pass and any future shed source.
  if (toShed.size > 0) {
    for (const a of placed) {
      if (a?.defensive === true) toShed.delete(a)
    }
  }

  // Finalize: drop or (under progressive disclosure) defer the shed notes,
  // then stamp the cohesion mode onto the survivors.
  let result: Datum[]
  if (toShed.size === 0) {
    result = placed
  } else if (progressiveDisclosure) {
    // Keep shed notes tagged so the SVG overlay hides them until hover/focus —
    // the kept set is the floor a non-hover reader still receives.
    result = placed.map((a) => (toShed.has(a) ? { ...a, _annotationDeferred: true } : a))
  } else {
    result = placed.filter((a) => !toShed.has(a))
  }

  return cohesion ? applyCohesion(result, cohesion) : result
}
