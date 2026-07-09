"use client"

import type {
  PhysicsColliderBodyFilter,
  PhysicsColliderSpec,
  PhysicsColliderShape
} from "../../stream/physics/PhysicsKernel"
import type {
  PhysicsSemanticItem,
  StreamPhysicsRegionEffect,
  StreamPhysicsRegionKind
} from "../../stream/physics/StreamPhysicsFrame"
import type { Datum } from "../shared/datumTypes"

export interface PhysicsProcessStage {
  id: string
  label?: string
  description?: string
  kind?: StreamPhysicsRegionKind | string
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface PhysicsProcessBodyGroup<TDatum extends Datum = Datum> {
  id: string
  label?: string
  description?: string
  group?: string
  bodyIds?: readonly string[]
  datum?: TDatum
  state?: string
  x?: number
  y?: number
  width?: number
  height?: number
  semanticItem?: false | Partial<PhysicsSemanticItem>
}

export interface PhysicsProcessBoundaryOptions {
  id?: string
  bodyFilter?: PhysicsColliderBodyFilter
  friction?: number
  restitution?: number
  thickness?: number
}

export function physicsProcessBoundaryColliders(
  shape: PhysicsColliderShape,
  options: PhysicsProcessBoundaryOptions = {}
): PhysicsColliderSpec[] {
  const id = options.id ?? "physics-process-boundary"
  const common = {
    bodyFilter: options.bodyFilter,
    friction: options.friction,
    restitution: options.restitution
  }

  if (shape.type === "segment") {
    return [{ ...common, id, shape }]
  }

  const thickness = options.thickness ?? 8
  const left = shape.x - shape.width / 2
  const right = shape.x + shape.width / 2
  const top = shape.y - shape.height / 2
  const bottom = shape.y + shape.height / 2

  return [
    {
      ...common,
      id: `${id}-top`,
      shape: { type: "segment", x1: left, y1: top, x2: right, y2: top, thickness }
    },
    {
      ...common,
      id: `${id}-right`,
      shape: { type: "segment", x1: right, y1: top, x2: right, y2: bottom, thickness }
    },
    {
      ...common,
      id: `${id}-bottom`,
      shape: { type: "segment", x1: right, y1: bottom, x2: left, y2: bottom, thickness }
    },
    {
      ...common,
      id: `${id}-left`,
      shape: { type: "segment", x1: left, y1: bottom, x2: left, y2: top, thickness }
    }
  ]
}

export function physicsProcessRegionSemanticItem(
  region: StreamPhysicsRegionEffect
): PhysicsSemanticItem | null {
  if (region.semanticItem === false) return null
  const override = region.semanticItem ?? {}
  const shape = region.shape
  const base: PhysicsSemanticItem =
    shape.type === "aabb"
      ? {
          id: region.id,
          label: region.label ?? region.id,
          description: region.description,
          group: region.kind ?? "region",
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height
        }
      : {
          id: region.id,
          label: region.label ?? region.id,
          description: region.description,
          group: region.kind ?? "region",
          x: (shape.x1 + shape.x2) / 2,
          y: (shape.y1 + shape.y2) / 2,
          pathData: `M ${shape.x1} ${shape.y1} L ${shape.x2} ${shape.y2}`
        }

  return {
    ...base,
    ...override,
    id: override.id ?? base.id
  }
}

export function physicsProcessStageSemanticItems(
  stages: readonly PhysicsProcessStage[]
): PhysicsSemanticItem[] {
  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label ?? stage.id,
    description: stage.description,
    group: stage.kind ?? "stage",
    x: stage.x ?? 0,
    y: stage.y ?? 0,
    width: stage.width,
    height: stage.height
  }))
}

export function physicsProcessGroupSemanticItems<TDatum extends Datum>(
  groups: readonly PhysicsProcessBodyGroup<TDatum>[]
): PhysicsSemanticItem[] {
  return groups.flatMap((group) => {
    if (group.semanticItem === false) return []
    const override = group.semanticItem ?? {}
    const base: PhysicsSemanticItem = {
      id: group.id,
      label: group.label ?? group.id,
      description: group.description,
      datum: group.datum,
      group: group.group ?? group.state ?? "body group",
      x: group.x ?? 0,
      y: group.y ?? 0,
      width: group.width,
      height: group.height
    }
    return [
      {
        ...base,
        ...override,
        id: override.id ?? base.id
      }
    ]
  })
}
