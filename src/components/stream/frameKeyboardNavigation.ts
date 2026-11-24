"use client"

import type { HoverData } from "../realtime/types"
import type { PipelineStore } from "./PipelineStore"
import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { SceneNode } from "./types"
import type { OrdinalSceneNode } from "./ordinalTypes"
import { enrichDatumWithBand } from "./xySceneBuilders/ribbonScene"
import {
  extractOrdinalNavPoints,
  extractXYNavPoints,
  navPointToHover,
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
