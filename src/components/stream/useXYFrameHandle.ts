"use client"
import { useCallback, useImperativeHandle, type MutableRefObject, type Ref } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { DataSourceAdapter } from "./DataSourceAdapter"
import type { PipelineStore } from "./PipelineStore"
import type { HoverData, StreamXYFrameHandle } from "./types"

interface XYFrameHandleOptions {
  storeRef: MutableRefObject<PipelineStore | null>
  adapterRef: MutableRefObject<DataSourceAdapter | null>
  dirtyRef: MutableRefObject<boolean>
  scheduleRender: () => void
  hoverRef: MutableRefObject<HoverData | null>
  setHoverPoint: (hover: HoverData | null) => void
}

/** Keep imperative data mutations separate from the frame's render lifecycle. */
export function useXYFrameHandle(
  ref: Ref<StreamXYFrameHandle>,
  { storeRef, adapterRef, dirtyRef, scheduleRender, hoverRef, setHoverPoint }: XYFrameHandleOptions
) {
  const pushPoint = useCallback((datum: Datum) => {
    adapterRef.current?.push(datum)
  }, [adapterRef])

  const pushManyPoints = useCallback((data: Datum[]) => {
    adapterRef.current?.pushMany(data)
  }, [adapterRef])

  const clearAll = useCallback(() => {
    adapterRef.current?.clear()
    storeRef.current?.clear()
    dirtyRef.current = true
    // emitLegendCategories runs after computeScene in the render loop.
    scheduleRender()
  }, [adapterRef, storeRef, dirtyRef, scheduleRender])

  useImperativeHandle(ref, () => ({
    push: pushPoint,
    pushMany: pushManyPoints,
    remove: (id: string | string[]) => {
      adapterRef.current?.flush()
      const removed = storeRef.current?.remove(id) ?? []
      if (removed.length > 0) {
        // Clear hover if the removed datum was being hovered
        if (hoverRef.current && removed.some(d => d === hoverRef.current?.data)) {
          hoverRef.current = null
          setHoverPoint(null)
        }
        dirtyRef.current = true
        // Legend emit deferred to post-computeScene render path.
        scheduleRender()
      }
      return removed
    },
    update: (id: string | string[], updater: (d: Datum) => Datum) => {
      adapterRef.current?.flush()
      const previous = storeRef.current?.update(id, updater) ?? []
      if (previous.length > 0) {
        dirtyRef.current = true
        // Legend emit deferred to post-computeScene render path.
        scheduleRender()
      }
      return previous
    },
    clear: clearAll,
    getData: () => {
      // Flush any buffered push data so getData() always returns up-to-date results
      adapterRef.current?.flush()
      return storeRef.current?.getData() ?? []
    },
    getScales: () => storeRef.current?.scales ?? null,
    getExtents: () => storeRef.current?.getExtents() ?? null,
    getCustomLayout: () => storeRef.current?.lastCustomLayoutResult ?? null,
    getLayoutFailure: () => storeRef.current?.lastCustomLayoutFailure ?? null
  }), [pushPoint, pushManyPoints, clearAll, scheduleRender, adapterRef, storeRef, dirtyRef, hoverRef, setHoverPoint])
}
