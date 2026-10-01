import { useEffect, useRef } from "react"
import { isServerEnvironment } from "./isServerEnvironment"
import { getXYTransitionEngine, loadXYTransitionEngine } from "./pipelineTransitionEngine"
import { loadFrameModule } from "./loadFrameModule"

/**
 * Load the on-demand XY transition engine whenever a frame configures a
 * transition, then ask the frame to recompute and repaint. Returns a ref that
 * is true while the engine is still missing, so scene rebuilds preserve the
 * previous positions (or the blank intro) until interpolation is available.
 */
export function useXYTransitionEngine(
  transitionConfigured: boolean,
  onReady: () => void
): { readonly current: boolean } {
  const pendingRef = useRef(false)
  const failedRef = useRef(false)
  if (!transitionConfigured) failedRef.current = false
  pendingRef.current = transitionConfigured && !isServerEnvironment && !failedRef.current && !getXYTransitionEngine()
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    if (!transitionConfigured || isServerEnvironment || getXYTransitionEngine()) return undefined
    const resume = () => {
      pendingRef.current = false
      onReadyRef.current()
    }
    return loadFrameModule(loadXYTransitionEngine, resume, "XY transition engine", () => {
      // Failed animation must not leave the chart frozen or an intro blank.
      failedRef.current = true
      resume()
    })
  }, [transitionConfigured])

  return pendingRef
}
