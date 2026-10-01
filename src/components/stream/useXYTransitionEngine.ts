import { useEffect, useRef } from "react"
import { isServerEnvironment } from "./isServerEnvironment"
import { getXYTransitionEngine, loadXYTransitionEngine } from "./pipelineTransitionEngine"

/**
 * Load the on-demand XY transition engine whenever a frame configures a
 * transition, then ask the frame to recompute and repaint. Returns a ref that
 * is true while the engine is still missing, so the paint loop can hold an
 * animated intro's first frame instead of flashing the final state.
 */
export function useXYTransitionEngine(
  transitionConfigured: boolean,
  onReady: () => void
): { readonly current: boolean } {
  const pendingRef = useRef(false)
  pendingRef.current = transitionConfigured && !isServerEnvironment && !getXYTransitionEngine()
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    if (!transitionConfigured || getXYTransitionEngine()) return undefined
    let cancelled = false
    void loadXYTransitionEngine().then(() => {
      pendingRef.current = false
      if (!cancelled) onReadyRef.current()
    })
    return () => {
      cancelled = true
    }
  }, [transitionConfigured])

  return pendingRef
}
