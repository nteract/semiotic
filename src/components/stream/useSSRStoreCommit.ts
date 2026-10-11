"use client"
import { useEffect, useLayoutEffect } from "react"
import { isServerEnvironment } from "./isServerEnvironment"

const useCommitEffect = isServerEnvironment ? useEffect : useLayoutEffect

/** Adopt an isolated SSR scene only after React commits that render. */
export function useSSRStoreCommit<T>(
  ref: { current: T | null },
  store: T | null
): void {
  useCommitEffect(() => {
    if (store) ref.current = store
  }, [ref, store])
}
