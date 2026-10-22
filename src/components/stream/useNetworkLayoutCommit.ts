"use client"
import { useCallback, useLayoutEffect, useRef } from "react"
import type { NetworkLayoutResult } from "./networkCustomLayout"
import type { NetworkViewTransform } from "./networkViewportTypes"
import { networkCameraSource } from "./networkCameraCommit"

interface LayoutOutputStore {
  customLayoutRun: NetworkLayoutResult | null
  lastCustomLayoutResult: NetworkLayoutResult | null
}

/**
 * Report each custom layout run to the opt-in camera from the commit that
 * renders its HTML marks and overlays. Returns whether a run has not been
 * committed yet, so the paint loop can commit it in the frame it paints.
 */
export function useNetworkLayoutCommit(
  view: NetworkViewTransform | undefined,
  store: LayoutOutputStore | null
): (run: NetworkLayoutResult | null) => boolean {
  const run = store?.customLayoutRun ?? null
  const result = store?.lastCustomLayoutResult ?? null
  const committed = useRef({ run, result })
  useLayoutEffect(() => {
    const previous = committed.current
    committed.current = { run, result }
    if (previous.run !== run)
      networkCameraSource(view)?.layoutCommitted?.(result, previous.result)
  })
  return useCallback((latest) => latest !== committed.current.run, [])
}
