import { useEffect, useRef, type MutableRefObject, type RefObject } from "react"
import type { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import type { PhysicsWorkerCommand } from "./PhysicsWorkerProtocol"

export function isPhysicsDocumentVisible(): boolean {
  return typeof document === "undefined" ? true : !document.hidden
}

interface PhysicsFrameLifecyclePolicyInput {
  cancelRender: () => void
  lastFrameTimeRef: MutableRefObject<number | null>
  paused: boolean
  postWorkerCommand: (command: PhysicsWorkerCommand, notifyTick?: boolean) => void
  requestRender: () => void
  storeRef: RefObject<PhysicsPipelineStore | null>
  suspendWhenHidden: boolean
}

/** Keep pause and page-visibility scheduling policy consistent for physics frames. */
export function usePhysicsFrameLifecyclePolicy({
  cancelRender,
  lastFrameTimeRef,
  paused,
  postWorkerCommand,
  requestRender,
  storeRef,
  suspendWhenHidden
}: PhysicsFrameLifecyclePolicyInput): void {
  // Mirrored into refs so the persistent visibilitychange listener below
  // always invokes the latest closures instead of the ones captured when
  // the listener was registered.
  const postWorkerCommandRef = useRef(postWorkerCommand)
  postWorkerCommandRef.current = postWorkerCommand
  const requestRenderRef = useRef(requestRender)
  requestRenderRef.current = requestRender

  useEffect(() => {
    const store = storeRef.current
    if (!store) return
    store.setPaused(paused)
    if (paused) {
      lastFrameTimeRef.current = null
      cancelRender()
    }
    postWorkerCommandRef.current({ type: "setPaused", paused }, false)
    requestRenderRef.current()
    // Pause alone controls this effect's lifecycle; callbacks are read via
    // ref so they're never stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelRender, paused])

  useEffect(() => {
    if (!suspendWhenHidden || typeof document === "undefined") return
    const update = () => {
      const store = storeRef.current
      if (!store) return
      const visible = isPhysicsDocumentVisible()
      store.setVisible(visible)
      if (!visible) {
        lastFrameTimeRef.current = null
        cancelRender()
      }
      postWorkerCommandRef.current({ type: "setVisible", visible }, false)
      requestRenderRef.current()
    }
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
    // Visibility alone controls listener registration; callbacks are read via
    // ref at event time to avoid restarting the policy on ordinary frame changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelRender, suspendWhenHidden])
}
