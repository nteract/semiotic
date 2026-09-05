"use client"
import { useCallback, useImperativeHandle, type MutableRefObject, type Ref } from "react"
import { select } from "d3-selection"
import { zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom"
import type { Datum } from "../charts/shared/datumTypes"
import { filterSparseArray } from "../charts/shared/sparseArray"
import type { GeoPipelineStore } from "./GeoPipelineStore"
import type { StreamGeoFrameHandle } from "./geoTypes"
import type { GeoZoomControlBehavior } from "./geoFrameHelpers"

interface GeoFrameHandleOptions {
  storeRef: MutableRefObject<GeoPipelineStore | null>
  dirtyRef: MutableRefObject<boolean>
  scheduleRender: () => void
  zoomTransformRef: MutableRefObject<ZoomTransform>
  containerRef: MutableRefObject<HTMLDivElement | null>
  zoomBehaviorRef: MutableRefObject<ZoomBehavior<HTMLDivElement, unknown> | GeoZoomControlBehavior | null>
}

/** Imperative data and zoom controls, independent of canvas rendering. */
export function useGeoFrameHandle(
  ref: Ref<StreamGeoFrameHandle>,
  { storeRef, dirtyRef, scheduleRender, zoomTransformRef, containerRef, zoomBehaviorRef }: GeoFrameHandleOptions
) {
  // Drop sparse entries before they reach `GeoPipelineStore` -
  // mirrors the bounded-ingest hardening. `ref.push(null)` or
  // `ref.pushMany([null, valid])` would otherwise crash extent /
  // accessor reads inside the store.
  const pushPoint = useCallback(
    (datum: Datum) => {
      if (datum == null || typeof datum !== "object") return
      storeRef.current?.pushPoint(datum)
      dirtyRef.current = true
      scheduleRender()
    },
    [storeRef, dirtyRef, scheduleRender]
  )

  const pushMany = useCallback(
    (data: Datum[]) => {
      const safe = filterSparseArray(data)
      if (safe.length === 0) return
      storeRef.current?.pushMany(safe)
      dirtyRef.current = true
      scheduleRender()
    },
    [storeRef, dirtyRef, scheduleRender]
  )

  const pushLine = useCallback(
    (line: Datum) => {
      if (line == null || typeof line !== "object") return
      storeRef.current?.pushLine(line)
      dirtyRef.current = true
      scheduleRender()
    },
    [storeRef, dirtyRef, scheduleRender]
  )

  const pushManyLines = useCallback(
    (lines: Datum[]) => {
      const safe = filterSparseArray(lines)
      if (safe.length === 0) return
      storeRef.current?.pushManyLines(safe)
      dirtyRef.current = true
      scheduleRender()
    },
    [storeRef, dirtyRef, scheduleRender]
  )

  const clearAll = useCallback(() => {
    storeRef.current?.clear()
    dirtyRef.current = true
    scheduleRender()
  }, [storeRef, dirtyRef, scheduleRender])

  useImperativeHandle(
    ref,
    () => ({
      push: pushPoint,
      pushMany,
      removePoint: (id: string | string[]) => {
        const removed = storeRef.current?.removePoint(id) ?? []
        if (removed.length > 0) {
          dirtyRef.current = true
          scheduleRender()
        }
        return removed
      },
      pushLine,
      pushManyLines,
      removeLine: (id: string | string[]) => {
        const removed = storeRef.current?.removeLine(id) ?? []
        if (removed.length > 0) {
          dirtyRef.current = true
          scheduleRender()
        }
        return removed
      },
      getLines: () => storeRef.current?.getLines() ?? [],
      clear: clearAll,
      getProjection: () => storeRef.current?.scales?.projection ?? null,
      getGeoPath: () => storeRef.current?.scales?.geoPath ?? null,
      getCartogramLayout: () => storeRef.current?.cartogramLayout ?? null,
      getCustomLayout: () => storeRef.current?.lastCustomLayoutResult ?? null,
      getLayoutFailure: () => storeRef.current?.lastCustomLayoutFailure ?? null,
      getZoom: () => zoomTransformRef.current.k,
      resetZoom: () => {
        const container = containerRef.current
        if (container && zoomBehaviorRef.current) {
          // Reset zoom transform - immediate (no d3-transition dependency)
          select(container).call(zoomBehaviorRef.current.transform, zoomIdentity)
        }
      },
      getData: () => storeRef.current?.getPoints() ?? []
    }),
    [pushPoint, pushMany, pushLine, pushManyLines, clearAll, scheduleRender, storeRef, dirtyRef, zoomTransformRef, containerRef, zoomBehaviorRef]
  )
}
