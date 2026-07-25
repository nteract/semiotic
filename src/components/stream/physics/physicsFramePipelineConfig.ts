import type { Datum } from "../../charts/shared/datumTypes"
import {
  collidersFromPhysicsAnnotations,
  type PhysicsStaticAnnotation
} from "./PhysicsAnnotations"
import type {
  PhysicsObservationEvent,
  PhysicsPipelineConfig
} from "./PhysicsPipelineStore"
import {
  regionBoundaryColliders,
  regionSensorId
} from "./physicsRegionRuntime"
import type { StreamPhysicsRegionEffect } from "./StreamPhysicsTypes"

interface PhysicsFramePipelineConfigOptions {
  annotations?: Datum[]
  chartId?: string
  chartType: string
  config?: PhysicsPipelineConfig
  onRegionObservation: (event: PhysicsObservationEvent) => void
  regionEffects: StreamPhysicsRegionEffect[]
  seed?: number
  size: [number, number]
}

/**
 * Adds frame-owned annotation/region colliders and observation wiring without
 * mutating the caller's pipeline configuration.
 */
export function resolvePhysicsFramePipelineConfig({
  annotations,
  chartId,
  chartType,
  config,
  onRegionObservation,
  regionEffects,
  seed,
  size
}: PhysicsFramePipelineConfigOptions): PhysicsPipelineConfig | undefined {
  const staticPhysicsNotes = (annotations ?? []).filter(
    (annotation): annotation is PhysicsStaticAnnotation & Datum =>
      annotation.physics === "barrier" || annotation.physics === "sensor"
  )
  const annotationColliders = collidersFromPhysicsAnnotations(
    staticPhysicsNotes,
    {
      idPrefix: chartId ? `${chartId}-ann` : "physics-ann",
      plotBounds: {
        x: 0,
        y: 0,
        width: size[0],
        height: size[1]
      }
    }
  )
  const effectiveConfig =
    seed === undefined || config?.kernel?.seed !== undefined
      ? config
      : {
          ...config,
          kernel: {
            ...config?.kernel,
            seed
          }
        }
  const regionColliders: NonNullable<PhysicsPipelineConfig["colliders"]> =
    regionEffects.flatMap((region) => {
      const sensorCollider = {
        id: regionSensorId(region),
        sensor: true,
        shape: region.shape,
        bodyFilter: region.bodyFilter,
        friction: region.friction,
        restitution: region.restitution
      }
      return [sensorCollider, ...regionBoundaryColliders(region)]
    })
  const regionSensors = Object.fromEntries(
    regionEffects.map((region) => [
      regionSensorId(region),
      {
        binId: region.binId ?? region.id,
        enterType: "physics-proximity-enter",
        exitType: "physics-proximity-exit"
      }
    ])
  ) as NonNullable<
    NonNullable<PhysicsPipelineConfig["observation"]>["sensors"]
  >
  const previousObservation = effectiveConfig?.observation
  const hasRegionWiring = regionEffects.length > 0
  const hasExtraColliders =
    regionColliders.length > 0 || annotationColliders.length > 0

  if (
    !hasRegionWiring &&
    !hasExtraColliders &&
    chartId == null &&
    !previousObservation
  ) {
    return effectiveConfig
  }

  return {
    ...effectiveConfig,
    colliders: [
      ...(effectiveConfig?.colliders ?? []),
      ...regionColliders,
      ...annotationColliders
    ],
    observation: {
      ...previousObservation,
      chartId: chartId ?? previousObservation?.chartId,
      chartType: previousObservation?.chartType ?? chartType,
      sensors: {
        ...(previousObservation?.sensors ?? {}),
        ...regionSensors
      },
      onObservation: (event: PhysicsObservationEvent) => {
        if (hasRegionWiring) onRegionObservation(event)
        previousObservation?.onObservation?.(event)
      }
    }
  }
}
