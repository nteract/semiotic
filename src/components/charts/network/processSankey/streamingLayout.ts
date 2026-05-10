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
  NetworkLabel,
} from "../../../stream/networkTypes"
import type { Datum } from "../../shared/datumTypes"

export interface ProcessSankeyBandSpec {
  id: string
  pathD: string
  fill: string
  stroke?: string
  strokeWidth?: number
  /** The user's raw node datum, surfaced as `data` in HoverData. */
  rawDatum: Datum
  /** Pre-computed label x/y for the node band. */
  labelX: number
  labelY: number
  labelText: string
}

export interface ProcessSankeyRibbonSpec {
  id: string
  pathD: string
  fill: string
  opacity: number
  /** The user's raw edge datum, surfaced as `data` in HoverData. */
  rawDatum: Datum
}

export interface ProcessSankeyLayoutConfig {
  bands: ProcessSankeyBandSpec[]
  ribbons: ProcessSankeyRibbonSpec[]
  /** Optional dim opacity for unselected bands/ribbons (linkedHover). */
  showLabels?: boolean
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

export const emitProcessSankeyScenes: NetworkCustomLayout<ProcessSankeyLayoutConfig> = (ctx) => {
  const { bands = [], ribbons = [], showLabels = true } = ctx.config

  const sceneEdges: NetworkBezierEdge[] = []

  // Ribbons first so bands paint on top of their attachments.
  for (const r of ribbons) {
    sceneEdges.push({
      type: "bezier",
      pathD: r.pathD,
      style: {
        fill: r.fill,
        opacity: r.opacity,
        stroke: "none",
      },
      datum: {
        __kind: "ribbon",
        data: r.rawDatum,
        id: r.id,
      } satisfies SceneDatumPayload as unknown as Datum,
    })
  }

  for (const b of bands) {
    sceneEdges.push({
      type: "bezier",
      pathD: b.pathD,
      style: {
        fill: b.fill,
        fillOpacity: 0.86,
        stroke: b.stroke ?? b.fill,
        strokeWidth: b.strokeWidth ?? 0.5,
      },
      datum: {
        __kind: "band",
        data: b.rawDatum,
        id: b.id,
      } satisfies SceneDatumPayload as unknown as Datum,
    })
  }

  // Labels omit `fill` so the network overlay falls through to its
  // theme-resolved text color (`var(--semiotic-text)` via
  // `currentColor`). Hardcoding `#1e293b` here would force dark labels
  // on dark themes and break high-contrast mode.
  const labels: NetworkLabel[] = showLabels
    ? bands.map((b) => ({
        x: b.labelX,
        y: b.labelY,
        text: b.labelText,
        anchor: "end" as const,
        baseline: "middle",
        fontSize: 11,
        fontWeight: 600,
      }))
    : []

  return {
    sceneNodes: [],
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
