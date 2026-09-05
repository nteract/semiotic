"use client"
import { useCallback, useImperativeHandle, type MutableRefObject, type Ref } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { DataSourceAdapter } from "./DataSourceAdapter"
import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { HoverData, StreamOrdinalFrameHandle } from "./ordinalTypes"

interface OrdinalFrameHandleOptions {
  storeRef: MutableRefObject<OrdinalPipelineStore | null>
  adapterRef: MutableRefObject<DataSourceAdapter | null>
  dirtyRef: MutableRefObject<boolean>
  scheduleRender: () => void
  hoverRef: MutableRefObject<HoverData | null>
  setHoverPoint: (hover: HoverData | null) => void
}

/** Keep imperative data mutations separate from the frame's render lifecycle. */
export function useOrdinalFrameHandle(
  ref: Ref<StreamOrdinalFrameHandle>,
  { storeRef, adapterRef, dirtyRef, scheduleRender, hoverRef, setHoverPoint }: OrdinalFrameHandleOptions
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

  // Data replacement. Routes through `setReplacementData`, which emits
  // `{ bounded: true, preserveCategoryOrder: true }`. Three effects:
  //   1. The store skips `categories.clear()` on ingest so insertion
  //      order is preserved across replacements (otherwise categories
  //      would shuffle as their values fluctuate across re-aggregations
  //      - e.g. LikertChart streaming percentages).
  //   2. `_hasStreamingData` is flipped so `resolveCategories` picks
  //      the streaming-preserve branch for `sort: "auto"` / undefined.
  //   3. Transitions still fire because bounded ingest doesn't wipe
  //      the store's `prevPositionMap`.
  //
  // Parameter type mirrors `pushPoint`/`pushManyPoints` above: the frame
  // itself isn't generic (it's typed with the non-generic
  // `StreamOrdinalFrameHandle`, whose default `T` is `Datum`),
  // so all internal callbacks use that concrete shape. The generic `T` on
  // `StreamOrdinalFrameHandle<T>` still flows to consumers - TS method-
  // bivariance lets this wider internal callback sit inside a ref typed
  // with a narrower `T`, so `useRef<StreamOrdinalFrameHandle<MyDatum>>`
  // sees `replace(data: MyDatum[])` at the call site.
  const replaceData = useCallback((newData: Datum[]) => {
    adapterRef.current?.clearLastData()
    adapterRef.current?.setReplacementData(newData)
  }, [adapterRef])

  useImperativeHandle(ref, () => ({
    push: pushPoint,
    pushMany: pushManyPoints,
    replace: replaceData,
    remove: (id: string | string[]) => {
      adapterRef.current?.flush()
      const removed = storeRef.current?.remove(id) ?? []
      if (removed.length > 0) {
        const hoveredData = hoverRef.current?.data
        const shouldClear = hoverRef.current
          ? Array.isArray(hoveredData)
            ? removed.some(d => hoveredData.includes(d))
            : removed.some(d => d === hoveredData)
          : false
        if (shouldClear) {
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
      adapterRef.current?.flush()
      return storeRef.current?.getData() ?? []
    },
    getScales: () => storeRef.current?.scales ?? null,
    getCustomLayout: () => storeRef.current?.lastCustomLayoutResult ?? null,
    getLayoutFailure: () => storeRef.current?.lastCustomLayoutFailure ?? null
  }), [pushPoint, pushManyPoints, replaceData, clearAll, scheduleRender, adapterRef, storeRef, dirtyRef, hoverRef, setHoverPoint])
}
