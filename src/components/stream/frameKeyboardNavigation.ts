"use client"

import type { HoverData } from "../realtime/types"
import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { GeoPipelineStore } from "./GeoPipelineStore"
import type { OrdinalSceneNode } from "./ordinalTypes"
import type { GeoSceneNode } from "./geoTypes"
import type { GeoFeatureLike } from "./geoFrameHelpers"
import {
  extractGeoNavPoints,
  extractOrdinalNavPoints,
  navPointToHover,
  type NavPoint
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

function geoPointToHover(point: NavPoint): HoverData {
  const rawDatum = point.datum as GeoFeatureLike | null
  return {
    ...(rawDatum || {}),
    ...(rawDatum?.properties || {}),
    data: rawDatum,
    properties: rawDatum?.properties,
    x: point.x,
    y: point.y,
    __semioticHoverData: true
  }
}

export function useGeoKeyboardNavigation(
  params: KeyboardInteractionParams<GeoPipelineStore, GeoSceneNode>
) {
  return useGraphKeyboardNavigation({
    ...params,
    extractPoints: extractGeoNavPoints,
    toHover: geoPointToHover,
    navigation: "linear"
  })
}
