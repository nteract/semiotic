import { useCallback, useEffect, useRef, useState } from "react"

/** One publishing action for saved-edition pages. Navigation and replacement
 * retire imports, downloads and refreshes, including uncancellable file reads
 * and cache writes. Only the current action can release the busy indicator. */
export function useAsyncAction() {
  const current = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const cancel = useCallback(() => {
    const previous = current.current
    current.current = null
    setBusy(false)
    previous?.abort()
  }, [])
  const begin = useCallback(() => {
    const previous = current.current
    const owner = new AbortController()
    current.current = owner
    setBusy(true)
    previous?.abort()
    return owner
  }, [])
  const isCurrent = useCallback((owner: AbortController) => current.current === owner, [])
  const finish = useCallback((owner: AbortController) => {
    if (current.current !== owner) return
    current.current = null
    setBusy(false)
  }, [])
  useEffect(() => cancel, [cancel])
  return { busy, begin, cancel, isCurrent, finish }
}
