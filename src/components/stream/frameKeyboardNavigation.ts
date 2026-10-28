"use client"

import type { HoverData } from "../realtime/types"
import type { PipelineStore } from "./PipelineStore"
import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { GeoPipelineStore } from "./GeoPipelineStore"
import type { SceneNode } from "./types"
import type { OrdinalSceneNode } from "./ordinalTypes"
import type { GeoSceneNode } from "./geoTypes"
import type { GeoFeatureLike } from "./geoFrameHelpers"
import { enrichDatumWithBand } from "./xySceneBuilders/ribbonScene"
import {
  extractGeoNavPoints,
  extractOrdinalNavPoints,
  extractXYNavPoints,
  navPointToHover,
  type NavPoint
} from "./keyboardNav"
import {
  useGraphKeyboardNavigation,
  type KeyboardInteractionParams
} from "./graphKeyboardNavigation"

interface XYKeyboardParams extends KeyboardInteractionParams<
  PipelineStore,
  SceneNode
> {
  /** Adds frame-owned context, such as multi-series rows, to a focused point's hover. */
  decorateHover?: (hover: HoverData, store: PipelineStore) => HoverData
}

export function useXYKeyboardNavigation({
  decorateHover,
  ...params
}: XYKeyboardParams) {
  return useGraphKeyboardNavigation({
    ...params,
    extractPoints: extractXYNavPoints,
    toHover: (point, store) => {
      const hover = navPointToHover({
        ...point,
        datum: enrichDatumWithBand(point.datum, store.resolvedRibbons)
      })
      return decorateHover ? decorateHover(hover, store) : hover
    }
  })
}

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
