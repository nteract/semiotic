"use client"

import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { OrdinalSceneNode } from "./ordinalTypes"
import { extractOrdinalNavPoints } from "./ordinalKeyboardNav"
import { navPointToHover } from "./navPointToHover"
import { useGraphKeyboardNavigation, type KeyboardInteractionParams } from "./graphKeyboardNavigation"

interface OrdinalKeyboardParams extends KeyboardInteractionParams<
  OrdinalPipelineStore,
  OrdinalSceneNode
> {
  chartType: string
  oAccessor: unknown
  rAccessor: unknown
}

export function useOrdinalKeyboardNavigation({
  chartType,
  oAccessor,
  rAccessor,
  ...params
}: OrdinalKeyboardParams) {
  return useGraphKeyboardNavigation({
    ...params,
    extractPoints: extractOrdinalNavPoints,
    toHover: (point) => ({
      ...navPointToHover(point),
      __oAccessor: typeof oAccessor === "string" ? oAccessor : undefined,
      __rAccessor: typeof rAccessor === "string" ? rAccessor : undefined,
      __chartType: chartType
    })
  })
}

