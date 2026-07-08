import type { PhysicsBodyState, PhysicsColliderSpec } from "./PhysicsKernel"
import type { PhysicsPlotBounds } from "./PhysicsPipelineStore"

export type PhysicsAnnotationRole = "barrier" | "sensor"
export type PhysicsAnnotationAxis = "x" | "y"

export interface PhysicsStaticAnnotation {
  id: string
  label: string
  x: number
  y: number
  x1?: number
  x2?: number
  y1?: number
  y2?: number
  dx?: number
  dy?: number
  physics?: PhysicsAnnotationRole
  axis?: PhysicsAnnotationAxis
  colliderId?: string
  thickness?: number
  restitution?: number
  friction?: number
  description?: string
}

export interface PhysicsBodyAnnotation {
  id: string
  label: string
  bodyId: string
  dx?: number
  dy?: number
  description?: string
}

export interface PhysicsResolvedBodyAnnotation extends PhysicsBodyAnnotation {
  anchorX: number
  anchorY: number
  labelX: number
  labelY: number
  body: PhysicsBodyState
}

export interface PhysicsAnnotationSummary {
  bodyCount: number
  barrierCount: number
  sensorCount: number
  staticCount: number
  totalCount: number
}

export interface PhysicsAnnotationColliderOptions {
  idPrefix?: string
  plotBounds?: PhysicsPlotBounds
  defaultAxis?: PhysicsAnnotationAxis
  barrierThickness?: number
  sensorThickness?: number
  thickness?: number
  barrierRestitution?: number
  barrierFriction?: number
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function resolvedThickness(
  annotation: PhysicsStaticAnnotation,
  options: PhysicsAnnotationColliderOptions
): number {
  const fallback =
    annotation.physics === "sensor"
      ? options.sensorThickness
      : options.barrierThickness
  return Math.max(
    0,
    finiteNumber(annotation.thickness) ??
      finiteNumber(fallback) ??
      finiteNumber(options.thickness) ??
      4
  )
}

export function collidersFromPhysicsAnnotations(
  annotations: PhysicsStaticAnnotation[] = [],
  options: PhysicsAnnotationColliderOptions = {}
): PhysicsColliderSpec[] {
  const prefix = options.idPrefix ? `${options.idPrefix}-` : ""
  const colliders: PhysicsColliderSpec[] = []

  for (const annotation of annotations) {
    if (annotation.physics !== "barrier" && annotation.physics !== "sensor") {
      continue
    }

    const axis = annotation.axis ?? options.defaultAxis ?? "x"
    const thickness = resolvedThickness(annotation, options)
    const id = annotation.colliderId ?? `${prefix}${annotation.id}`
    let shape: PhysicsColliderSpec["shape"] | undefined

    if (axis === "x") {
      const x = finiteNumber(annotation.x)
      const y1 =
        finiteNumber(annotation.y1) ??
        finiteNumber(options.plotBounds?.y) ??
        finiteNumber(annotation.y)
      const y2 =
        finiteNumber(annotation.y2) ??
        (options.plotBounds
          ? options.plotBounds.y + options.plotBounds.height
          : undefined) ??
        finiteNumber(annotation.y)
      if (x == null || y1 == null || y2 == null) continue
      shape = { type: "segment", x1: x, y1, x2: x, y2, thickness }
    } else {
      const y = finiteNumber(annotation.y)
      const x1 =
        finiteNumber(annotation.x1) ??
        finiteNumber(options.plotBounds?.x) ??
        finiteNumber(annotation.x)
      const x2 =
        finiteNumber(annotation.x2) ??
        (options.plotBounds
          ? options.plotBounds.x + options.plotBounds.width
          : undefined) ??
        finiteNumber(annotation.x)
      if (y == null || x1 == null || x2 == null) continue
      shape = { type: "segment", x1, y1: y, x2, y2: y, thickness }
    }

    colliders.push({
      id,
      shape,
      sensor: annotation.physics === "sensor",
      ...(annotation.physics === "barrier" &&
      (annotation.restitution != null || options.barrierRestitution != null)
        ? {
            restitution:
              finiteNumber(annotation.restitution) ??
              finiteNumber(options.barrierRestitution)
          }
        : {}),
      ...(annotation.physics === "barrier" &&
      (annotation.friction != null || options.barrierFriction != null)
        ? {
            friction:
              finiteNumber(annotation.friction) ??
              finiteNumber(options.barrierFriction)
          }
        : {})
    })
  }

  return colliders
}

export function resolvePhysicsBodyAnnotations(
  annotations: PhysicsBodyAnnotation[],
  bodies: PhysicsBodyState[]
): PhysicsResolvedBodyAnnotation[] {
  if (annotations.length === 0 || bodies.length === 0) return []
  const bodyById = new Map(bodies.map((body) => [body.id, body]))
  return annotations.flatMap((annotation) => {
    const body = bodyById.get(annotation.bodyId)
    if (!body) return []
    const dx = annotation.dx ?? 18
    const dy = annotation.dy ?? -24
    return [
      {
        ...annotation,
        anchorX: body.x,
        anchorY: body.y,
        labelX: body.x + dx,
        labelY: body.y + dy,
        body
      }
    ]
  })
}

export function summarizePhysicsAnnotations(
  staticAnnotations: PhysicsStaticAnnotation[] = [],
  bodyAnnotations: PhysicsBodyAnnotation[] = []
): PhysicsAnnotationSummary {
  return {
    bodyCount: bodyAnnotations.length,
    barrierCount: staticAnnotations.filter(
      (annotation) => annotation.physics === "barrier"
    ).length,
    sensorCount: staticAnnotations.filter(
      (annotation) => annotation.physics === "sensor"
    ).length,
    staticCount: staticAnnotations.length,
    totalCount: staticAnnotations.length + bodyAnnotations.length
  }
}
