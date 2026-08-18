import { scaleLinear } from "d3-scale"
import type { Datum } from "../../charts/shared/datumTypes"
import type { AnnotationContext } from "../../realtime/types"
import type { PhysicsBodyState } from "./PhysicsKernel"

export type PhysicsAnnotationAnchorNode = {
  pointId?: string
  x: number
  y: number
  r: number
}

function bodyRadius(body: PhysicsBodyState): number {
  if (body.shape.type === "circle") return body.shape.radius
  return Math.max(body.shape.width, body.shape.height) / 2
}

export function bodiesToAnnotationAnchors(
  bodies: readonly PhysicsBodyState[],
): PhysicsAnnotationAnchorNode[] {
  return bodies.map((body) => ({
    pointId: body.id,
    x: body.x,
    y: body.y,
    r: Math.max(1, bodyRadius(body)),
  }))
}

/** Pixel-space physics context with the exact live scale contract. */
export function buildPhysicsAnnotationContext(options: {
  width: number
  height: number
  pointNodes?: PhysicsAnnotationAnchorNode[]
  data?: Datum[]
}): AnnotationContext {
  const { width, height, pointNodes = [], data } = options
  const x = scaleLinear().domain([0, Math.max(1, width)]).range([0, Math.max(1, width)])
  const y = scaleLinear().domain([0, Math.max(1, height)]).range([0, Math.max(1, height)])
  return {
    scales: { x, y },
    width,
    height,
    frameType: "network",
    pointNodes,
    data,
    xAccessor: "x",
    yAccessor: "y",
  }
}

/** Normalize `bodyId` aliases to the common point-anchor field. */
export function normalizePhysicsAnnotations(
  annotations: Datum[] | undefined,
): Datum[] | undefined {
  if (!annotations?.length) return annotations
  return annotations.map((annotation) => {
    if (annotation.pointId != null || annotation.bodyId == null) return annotation
    return { ...annotation, pointId: String(annotation.bodyId) }
  })
}
