"use client"

import { useMemo, type MutableRefObject } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { DataSourceAdapter } from "./DataSourceAdapter"
import type { PipelineStore } from "./PipelineStore"
import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"

export interface StreamingHandleOptions<S> {
  storeRef: MutableRefObject<S | null>
  adapterRef: MutableRefObject<DataSourceAdapter | null>
  dirtyRef: MutableRefObject<boolean>
  scheduleRender: () => void
  invalidateInteraction: (resetFocus?: boolean) => void
}

/** Both frame families commit mutations and dismiss stale interaction together. */
export function useStreamingDataHandle<
  S extends PipelineStore | OrdinalPipelineStore
>({
  storeRef,
  adapterRef,
  dirtyRef,
  scheduleRender,
  invalidateInteraction
}: StreamingHandleOptions<S>) {
  return useMemo(() => {
    const changed = (rows: Datum[]) => {
      if (rows.length) {
        invalidateInteraction()
        dirtyRef.current = true
        // Legend emission follows computeScene in the render loop.
        scheduleRender()
      }
      return rows
    }
    return {
      push: (datum: Datum) => adapterRef.current?.push(datum),
      pushMany: (data: Datum[]) => adapterRef.current?.pushMany(data),
      remove: (id: string | string[]) => {
        adapterRef.current?.flush()
        return changed(storeRef.current?.remove(id) ?? [])
      },
      update: (id: string | string[], updater: (d: Datum) => Datum) => {
        adapterRef.current?.flush()
        return changed(storeRef.current?.update(id, updater) ?? [])
      },
      clear: () => {
        invalidateInteraction(true)
        adapterRef.current?.clear()
        storeRef.current?.clear()
        dirtyRef.current = true
        scheduleRender()
      },
      getData: () => {
        adapterRef.current?.flush()
        return storeRef.current?.getData() ?? []
      },
      getScales: (): S["scales"] => storeRef.current?.scales ?? null,
      getCustomLayout: (): S["lastCustomLayoutResult"] =>
        storeRef.current?.lastCustomLayoutResult ?? null,
      getLayoutFailure: () => storeRef.current?.lastCustomLayoutFailure ?? null
    }
  }, [storeRef, adapterRef, dirtyRef, scheduleRender, invalidateInteraction])
}
