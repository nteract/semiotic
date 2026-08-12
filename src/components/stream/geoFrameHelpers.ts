/**
 * Small StreamGeoFrame helpers: particle conservation defaults, zoom chrome,
 * projection name resolution, and hit-canvas context acquisition.
 */

import type * as React from "react"
import type { Quadtree } from "d3-quadtree"
import type { Selection } from "d3-selection"
import type { ZoomTransform } from "d3-zoom"
import type { Datum } from "../charts/shared/datumTypes"
import type { HoverData } from "../realtime/types"
import { findNearestGeoNode } from "./GeoCanvasHitTester"
import type {
  GeoAreaSceneNode,
  GeoSceneNode,
  ProjectionName,
  ProjectionProp
} from "./geoTypes"
import { getPointerHitRadius, type HoverPointerCoords } from "./hoverUtils"
import type { PointSceneNode } from "./types"

export const DEFAULT_GEO_MARGIN = { top: 10, right: 10, bottom: 10, left: 10 }
export const DEFAULT_GEO_HOVER_RADIUS = 30

let geoParticleConservationCache: boolean | null = null

export function shouldConserveGeoParticles(): boolean {
  if (geoParticleConservationCache !== null) return geoParticleConservationCache
  if (typeof window === "undefined") return false
  const coarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  const lowCoreCount =
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency <= 4
  const lowMemory =
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number" &&
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4
  geoParticleConservationCache = coarsePointer || lowCoreCount || lowMemory
  return geoParticleConservationCache
}

export function defaultGeoParticleMaxPerLine(): number {
  return shouldConserveGeoParticles() ? 12 : 30
}

export function defaultGeoParticleSpawnRate(): number {
  return shouldConserveGeoParticles() ? 0.06 : 0.15
}

export const zoomButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: "1px solid rgba(0,0,0,0.2)",
  borderRadius: 4,
  background: "rgba(255,255,255,0.9)",
  color: "#333",
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
}

export type GeoFeatureLike = Datum & {
  properties?: Datum
  geometry?: unknown
  data?: Datum
}

export type HitCanvas = HTMLCanvasElement | OffscreenCanvas
export type HitCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
export type GeoZoomSelection = Selection<HTMLDivElement, unknown, null, undefined>

export interface GeoZoomControlBehavior {
  scaleBy(selection: GeoZoomSelection, factor: number): void
  transform(selection: GeoZoomSelection, transform: ZoomTransform | Pick<ZoomTransform, "k">): void
}

export function resolveProjectionName(projection: ProjectionProp): ProjectionName | null {
  if (typeof projection === "string") return projection
  if (typeof projection === "object" && projection && "type" in projection) {
    return projection.type
  }
  return null
}

export function ensureHitCanvasContext(canvas: HitCanvas | null): HitCanvasContext | null {
  if (!canvas) return null
  return canvas.getContext("2d")
}

export type GeoPointerResolution =
  | { kind: "outside" | "unavailable" | "miss" }
  | { kind: "hit"; node: GeoSceneNode; hover: HoverData }

/** Resolve Geo pointer geometry and its flattened public hover datum. */
export function resolveGeoPointerHit(options: {
  pointer: HoverPointerCoords
  canvasRect: Pick<DOMRect, "left" | "top">
  margin: { left: number; top: number }
  width: number
  height: number
  scene: GeoSceneNode[]
  pointQuadtree: Quadtree<PointSceneNode> | null
  maxPointRadius: number
  hitCanvasRef: { current: HitCanvas | null }
}): GeoPointerResolution {
  const chartX = options.pointer.clientX - options.canvasRect.left - options.margin.left
  const chartY = options.pointer.clientY - options.canvasRect.top - options.margin.top
  if (
    chartX < 0 ||
    chartX > options.width ||
    chartY < 0 ||
    chartY > options.height
  ) {
    return { kind: "outside" }
  }

  if (!options.hitCanvasRef.current) {
    options.hitCanvasRef.current = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(1, 1)
      : document.createElement("canvas")
  }
  const hitContext = ensureHitCanvasContext(options.hitCanvasRef.current)
  if (!hitContext) return { kind: "unavailable" }

  const hit = findNearestGeoNode(
    options.scene,
    chartX,
    chartY,
    getPointerHitRadius(DEFAULT_GEO_HOVER_RADIUS, options.pointer.pointerType),
    hitContext,
    options.pointQuadtree,
    options.maxPointRadius,
    getPointerHitRadius(6, options.pointer.pointerType)
  )
  if (!hit) return { kind: "miss" }

  const { node } = hit
  const datum = node.datum
  const rawData = Array.isArray(datum)
    ? null
    : datum?.properties
      ? datum
      : datum?.data || datum
  const x = node.type === "point"
    ? node.x
    : node.type === "geoarea"
      ? (node as GeoAreaSceneNode).centroid[0]
      : chartX
  const y = node.type === "point"
    ? node.y
    : node.type === "geoarea"
      ? (node as GeoAreaSceneNode).centroid[1]
      : chartY
  return {
    kind: "hit",
    node,
    hover: {
      ...rawData,
      ...(rawData?.properties || {}),
      data: rawData,
      properties: rawData?.properties,
      __semioticHoverData: true,
      x,
      y
    }
  }
}
