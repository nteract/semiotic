import { useCallback, useSyncExternalStore } from "react"
import type { UpdateResult, UpdateResultStore } from "./pipelineUpdateContract"

/**
 * Read an additive pipeline update snapshot through React's external-store
 * contract. Store mutation and frame scheduling remain imperative; consumers
 * can use this only for React-owned inspection or diagnostics.
 */
export function useUpdateResultSnapshot(store: UpdateResultStore): UpdateResult {
  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribeUpdateResult(onStoreChange),
    [store]
  )
  const getSnapshot = useCallback(() => store.getUpdateSnapshot(), [store])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
