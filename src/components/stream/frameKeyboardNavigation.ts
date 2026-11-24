"use client"

import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { OrdinalSceneNode } from "./ordinalTypes"
import {
  extractOrdinalNavPoints,
  navPointToHover,
} from "./keyboardNav"
import {
  useGraphKeyboardNavigation,
  type KeyboardInteractionParams
} from "./graphKeyboardNavigation"

interface OrdinalKeyboardParams extends KeyboardInteractionParams<
  OrdinalPipelineStore,
  OrdinalSceneNode
> {
  chartType: string
  dataIdAccessor?: string | ((datum: Record<string, unknown>) => string)
  oAccessor: unknown
  rAccessor: unknown
}

export function useOrdinalKeyboardNavigation({
  chartType,
  dataIdAccessor,
  oAccessor,
  rAccessor,
  ...params
}: OrdinalKeyboardParams) {
  return useGraphKeyboardNavigation({
    ...params,
    extractPoints: (scene) => {
      const points = extractOrdinalNavPoints(scene)
      if (dataIdAccessor) for (const point of points) {
        const datum = point.datum
        if (datum && typeof datum === "object" && !Array.isArray(datum) && point.semanticKey == null) {
          const id = typeof dataIdAccessor === "function" ? dataIdAccessor(datum) : datum[dataIdAccessor]
          if (id != null) point.semanticKey = JSON.stringify(["datum", id, datum.__rIndex ?? 0])
        }
      }
      return points
    },
    navigation: "ordered",
    toHover: (point) => ({
      ...navPointToHover(point),
      __oAccessor: typeof oAccessor === "string" ? oAccessor : undefined,
      __rAccessor: typeof rAccessor === "string" ? rAccessor : undefined,
      __chartType: chartType
    })
  })
}
