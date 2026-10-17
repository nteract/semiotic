"use client"
import { useLayoutEffect, useRef, useSyncExternalStore } from "react"
import type { RefObject } from "react"
import type { NetworkViewTransform } from "./networkViewportTypes"
import { networkCameraSource } from "./networkCameraCommit"
import { normalizeNetworkView } from "./networkViewTransform"

const noSubscription = () => () => {}

/** Only screen-relative consumers (widgets, focus, tooltips) need React updates. */
export function useNetworkCameraView(
  view?: NetworkViewTransform,
  enabled = true
) {
  const camera = enabled ? networkCameraSource(view) : undefined
  const read = camera?.getSnapshot ?? (() => normalizeNetworkView(view))
  return useSyncExternalStore(camera?.subscribe ?? noSubscription, read, read)
}

/** Synchronous raster projection, shared by ordinary prop cameras and the
 * imperative camera. Pointer/paint closures read the stable view's live getters. */
export function useNetworkCameraPaint(
  view: NetworkViewTransform | undefined,
  paint: RefObject<(() => void) | null>,
  leave: RefObject<(() => void) | null>,
  focusIndex: RefObject<number>
) {
  const cameraPaint = useRef(false)
  const wasActive = useRef(false)
  useLayoutEffect(() => {
    const commit = () => {
      if (focusIndex.current < 0) leave.current?.()
      cameraPaint.current = true
      try {
        paint.current?.()
      } finally {
        cameraPaint.current = false
      }
    }
    if (view || wasActive.current) commit()
    wasActive.current = !!view
    return networkCameraSource(view)?.subscribe(commit)
  }, [view, paint, leave, focusIndex])
  return cameraPaint
}
