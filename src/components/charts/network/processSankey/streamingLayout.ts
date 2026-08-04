// ProcessSankey custom layout — emits scene primitives for
// StreamNetworkFrame's `customNetworkLayout` escape hatch.
//
// The HOC pre-computes the algorithm output (centerlines, samples,
// attachments, valueScale) and the band/ribbon SVG path-D strings;
// this function is a thin shim that maps that pre-computed data to
// `NetworkBezierEdge` scene primitives the frame can paint.
//
// Bands and ribbons both use the bezier scene-edge type because that's
// the only path-shaped scene primitive the frame supports. The datum
// payload carries `__kind: "band" | "ribbon"` so the tooltip and any
// downstream consumer can distinguish them.

import type { NetworkCustomLayout } from "../../../stream/networkCustomLayout"
import type {
  NetworkBezierEdge,
  NetworkCircleNode,
  NetworkLabel,
  BezierCache,
} from "../../../stream/networkTypes"
import type { Datum } from "../../shared/datumTypes"
import type { HatchFill } from "../../shared/hatchFill"

export interface ProcessSankeyBandSpec {
  id: string
  /** Outer band perimeter — same path used for fill and stroke. */
  pathD: string
  fill: string
  stroke?: string
  strokeWidth?: number
  fillOpacity?: number
  /** Per-edge 20-px gradient stubs (band-color fade-in for
   *  systemInTime, fade-out for systemOutTime). When at least one
   *  stub is present, the band paints outline-only and the stubs
   *  are the only colored regions inside the perimeter. */
  gradientStubs?: BandGradientStub[]
  /** The user's raw node datum, surfaced as `data` in HoverData. */
  rawDatum: Datum
  /** Pre-computed label x/y for the node band. */
  labelX: number
  labelY: number
  labelText: string
  labelAnchor?: "start" | "middle" | "end"
  labelBaseline?: string
  /**
   * When `showLabels="auto"` sheds this label for density, the full text is
   * retained here so selection/hover can re-surface it without relayout.
   */
  labelDeferred?: boolean
  labelFullText?: string
  /** Optional hatch fill descriptor for the band (canvas + SSR). */
  hatchFill?: HatchFill
}

export interface BandGradientStub {
  pathD: string
  x0: number
  x1: number
  /** Vertical gradients use y0/y1 and set x0/x1 to a shared lane value. */
  y0?: number
  y1?: number
  from: 0 | 1
  to: 0 | 1
}

export interface ProcessSankeyRibbonSpec {
  id: string
  pathD: string
  fill: string
  opacity: number
  /** The user's raw edge datum, surfaced as `data` in HoverData. */
  rawDatum: Datum
  /**
   * Pre-computed cubic bezier control points + halfWidth for the
   * shared particle pipeline. ProcessSankey writes these alongside
   * the ribbon's path-D string so the frame's particle pool can
   * spawn / step / render against them without re-deriving the
   * ribbon geometry. Optional — when omitted the ribbon paints
   * normally but no particles flow along it.
   */
  bezier?: BezierCache
}

export type ProcessSankeySelectionDatum = "raw" | "scene"

export interface ProcessSankeyLayoutConfig {
  bands: ProcessSankeyBandSpec[]
  ribbons: ProcessSankeyRibbonSpec[]
  /** Optional dim opacity for unselected bands/ribbons (linkedHover). */
  showLabels?: boolean
  /**
   * Which datum shape selection/linkedHover predicates receive.
   * `"raw"` (default) unwraps author records so field matchers work without
   * knowing ProcessSankey's `{ __kind, data, id }` scene payload.
   * `"scene"` keeps the full payload for tooling that needs `__kind`.
   */
  selectionDatum?: ProcessSankeySelectionDatum
}

/**
 * Marker attached to scene-edge datums so the HOC's `tooltipContent`
 * can route node bands vs. flow ribbons through different default
 * bodies. `data` still carries the user's original node/edge datum.
 */
export interface SceneDatumPayload {
  __kind: "band" | "ribbon"
  /** Original node/edge record, as the user pushed it. */
  data: Datum
  /** Stable id for hit-deduplication and ref operations. */
  id: string
}

const DIM_OPACITY = 0.22

function selectionDatumFor(
  payload: SceneDatumPayload,
  mode: ProcessSankeySelectionDatum | undefined,
): Datum {
  return mode === "scene" ? (payload as unknown as Datum) : payload.data
}

function sceneDatumMatchesSelection(
  payload: SceneDatumPayload,
  selection: { isActive: boolean; predicate: (d: Datum) => boolean } | null | undefined,
  mode: ProcessSankeySelectionDatum | undefined,
): boolean {
  if (!selection?.isActive) return true
  return selection.predicate(selectionDatumFor(payload, mode))
}

export const emitProcessSankeyScenes: NetworkCustomLayout<ProcessSankeyLayoutConfig> = (ctx) => {
  const {
    bands = [],
    ribbons = [],
    showLabels = true,
    selectionDatum = "raw",
  } = ctx.config
  const selection = ctx.selection ?? null

  const sceneEdges: NetworkBezierEdge[] = []

  // Ribbons first so bands paint on top of their attachments.
  for (const r of ribbons) {
    const payload = {
      __kind: "ribbon" as const,
      data: r.rawDatum,
      id: r.id,
    } satisfies SceneDatumPayload
    const dimmed = !sceneDatumMatchesSelection(payload, selection, selectionDatum)
    sceneEdges.push({
      type: "bezier",
      pathD: r.pathD,
      // `bezierCache` is the same data structure (and source) that
      // gets attached to the user-pushed RealtimeEdge for particles.
      // Including it here gives the canvas hit tester an analytic
      // bezier to fall back on for ribbon-level hit detection,
      // matching how SankeyDiagram populates it.
      ...(r.bezier && { bezierCache: r.bezier }),
      style: {
        fill: r.fill,
        opacity: dimmed ? Math.min(r.opacity, DIM_OPACITY) : r.opacity,
        stroke: "none",
      },
      datum: payload as unknown as Datum,
    })
  }

  // Gradient stubs paint underneath the bands. The bands have evenodd
  // cutouts at the same slot, so the band's transparent hole reveals
  // the gradient — net effect is a soft fade-in at each systemInTime.
  // Marked non-interactive so they don't claim hover from the band
  // they're decorating.
  for (const b of bands) {
    if (!b.gradientStubs) continue
    const bandPayload = {
      __kind: "band" as const,
      data: b.rawDatum,
      id: b.id,
    } satisfies SceneDatumPayload
    const dimmed = !sceneDatumMatchesSelection(bandPayload, selection, selectionDatum)
    for (let i = 0; i < b.gradientStubs.length; i++) {
      const stub = b.gradientStubs[i]
      sceneEdges.push({
        type: "bezier",
        pathD: stub.pathD,
        interactive: false,
        style: {
          fill: b.fill,
          fillOpacity: dimmed ? DIM_OPACITY : (b.fillOpacity ?? 0.86),
          stroke: "none",
        },
        _gradient: {
          x0: stub.x0,
          x1: stub.x1,
          ...(stub.y0 != null && { y0: stub.y0 }),
          ...(stub.y1 != null && { y1: stub.y1 }),
          from: stub.from,
          to: stub.to,
        },
        datum: {
          __kind: "band",
          data: b.rawDatum,
          id: `${b.id}__stub${i}`,
        } satisfies SceneDatumPayload as unknown as Datum,
      })
    }
  }

  for (const b of bands) {
    // When the band carries gradient stubs, drop the flat fill — the
    // node should read as "outline + stubs only", so the stubs are
    // the only colored regions inside the perimeter. Otherwise paint
    // the usual translucent band.
    const hasStubs = !!(b.gradientStubs && b.gradientStubs.length > 0)
    const payload = {
      __kind: "band" as const,
      data: b.rawDatum,
      id: b.id,
    } satisfies SceneDatumPayload
    const dimmed = !sceneDatumMatchesSelection(payload, selection, selectionDatum)
    const baseFillOpacity = b.fillOpacity ?? 0.86
    const bandFill = b.hatchFill ?? b.fill
    sceneEdges.push({
      type: "bezier",
      pathD: b.pathD,
      style: {
        ...(hasStubs
          ? { fill: "none" }
          : { fill: bandFill as string, fillOpacity: dimmed ? DIM_OPACITY : baseFillOpacity }),
        stroke: b.stroke ?? (typeof b.fill === "string" ? b.fill : "#666"),
        strokeWidth: b.strokeWidth ?? 0.5,
        ...(dimmed && hasStubs ? { opacity: DIM_OPACITY } : {}),
      },
      datum: payload as unknown as Datum,
    })
  }

  // Labels omit `fill` so the network overlay falls through to its
  // theme-resolved text color (`var(--semiotic-text)` via
  // `currentColor`). Hardcoding `#1e293b` here would force dark labels
  // on dark themes and break high-contrast mode.
  // Deferred labels (auto density shed) reappear when their band is in the
  // active selection — no geometry recompute required.
  const labels: NetworkLabel[] = showLabels
    ? bands.flatMap((b) => {
        const deferred = b.labelDeferred && b.labelFullText?.trim()
        const visible = b.labelText.trim().length > 0
        const revealDeferred = deferred && selection?.isActive &&
          sceneDatumMatchesSelection(
            { __kind: "band", data: b.rawDatum, id: b.id },
            selection,
            selectionDatum,
          )
        const text = visible
          ? b.labelText
          : revealDeferred
            ? b.labelFullText!
            : ""
        if (!text.trim()) return []
        return [{
          x: b.labelX,
          y: b.labelY,
          text,
          anchor: b.labelAnchor ?? "end",
          baseline: b.labelBaseline ?? "middle",
          fontSize: 11,
          fontWeight: 600,
          stroke: "var(--semiotic-surface, #fff)",
          strokeWidth: 3,
          paintOrder: "stroke",
        }]
      })
    : []

  // Color-binding scene nodes — one per node id, off-canvas at r:0 so
  // neither the canvas renderer nor the hit tester picks them up. Their
  // sole purpose is to feed `StreamNetworkFrame`'s `nodeColorMap` from
  // `style.fill`, which is then read by `getEdgeColor`/`getParticleColor`
  // so particles inherit the source band's color. Without these, the
  // frame's palette-by-array-index fallback assigns colors that don't
  // match the HOC's `colorOf` resolution.
  const sceneNodes: NetworkCircleNode[] = bands.map((b) => ({
    type: "circle",
    id: b.id,
    cx: -10000,
    cy: -10000,
    r: 0,
    style: { fill: b.fill },
    datum: { __kind: "band", data: b.rawDatum, id: b.id } satisfies SceneDatumPayload as unknown as Datum,
  }))

  return {
    sceneNodes,
    sceneEdges,
    labels,
  }
}

/**
 * Test whether an arbitrary HoverData/datum-shaped value carries the
 * ProcessSankey scene marker. Lets the HOC's tooltipContent narrow to
 * the band/ribbon variants without leaking the marker key everywhere.
 */
export function isProcessSankeyScenePayload(
  d: unknown
): d is SceneDatumPayload {
  return (
    typeof d === "object" &&
    d !== null &&
    "__kind" in d &&
    ((d as { __kind: unknown }).__kind === "band" ||
      (d as { __kind: unknown }).__kind === "ribbon")
  )
}
