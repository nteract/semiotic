"use client"

import type { HoverData } from "../realtime/types"
import { extractXYNavPoints, navPointToHover } from "./keyboardNav"
import { useGraphKeyboardNavigation, type KeyboardInteractionParams } from "./graphKeyboardNavigation"
import type { PipelineStore } from "./PipelineStore"
import type { SceneNode } from "./types"
import { enrichDatumWithBand } from "./xySceneBuilders/ribbonScene"

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
