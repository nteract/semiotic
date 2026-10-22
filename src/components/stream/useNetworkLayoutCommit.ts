"use client"
import { useCallback, useLayoutEffect, useRef } from "react"
import type { NetworkLayoutResult } from "./networkCustomLayout"
import type { NetworkViewTransform } from "./networkViewportTypes"
import { networkCameraSource } from "./networkCameraCommit"

interface LayoutOutputStore {
  customLayoutRevision: number
  lastCustomLayoutResult: NetworkLayoutResult | null
}

/** Retain mark geometry even when a layout mutates and returns the same output. */
function snapshotGeometry(result: NetworkLayoutResult | null) {
  return (
    result && {
      ...result,
      sceneNodes: result.sceneNodes?.map((node) => ({ ...node })),
      htmlMarks: result.htmlMarks?.map((mark) => ({ ...mark }))
    }
  )
}

/**
 * Report each custom layout run to the opt-in camera from the commit that
 * renders its HTML marks and overlays. Returns whether a run has not been
 * committed yet, so the paint loop can commit it in the frame it paints.
 */
export function useNetworkLayoutCommit(
  view: NetworkViewTransform | undefined,
  store: LayoutOutputStore | null
): (store: LayoutOutputStore) => boolean {
  const run = store?.lastCustomLayoutResult ? store.customLayoutRevision : null
  const result = store?.lastCustomLayoutResult ?? null
  const committed = useRef<{
    store: LayoutOutputStore | null
    run: number | null
    result: NetworkLayoutResult | null
    output: NetworkLayoutResult | null
  } | null>(null)
  committed.current ??= {
    store,
    run,
    result: snapshotGeometry(result),
    output: result
  }
  useLayoutEffect(() => {
    const previous = committed.current!
    const changed = previous.store !== store || previous.run !== run
    if (changed || previous.output !== result)
      committed.current = {
        store,
        run,
        result: snapshotGeometry(result),
        output: result
      }
    if (changed)
      networkCameraSource(view)?.layoutCommitted?.(result, previous.result)
  })
  return useCallback(
    (latest) =>
      latest !== committed.current!.store ||
      (latest.lastCustomLayoutResult ? latest.customLayoutRevision : null) !==
        committed.current!.run,
    []
  )
}
