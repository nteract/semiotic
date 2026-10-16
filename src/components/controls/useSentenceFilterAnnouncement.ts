import * as React from "react"

interface PendingAnnouncement {
  key: string
  label: string
  before: string
  after: string
}

/** Continuous edits share one polite announcement; closing flushes the final value. */
export function useSentenceFilterAnnouncement() {
  const [announcement, setAnnouncement] = React.useState("")
  const pendingRef = React.useRef<PendingAnnouncement | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flush = React.useCallback(() => {
    clearTimeout(timerRef.current)
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending && pending.before !== pending.after) {
      setAnnouncement(`${pending.label} changed from ${pending.before} to ${pending.after}.`)
    }
  }, [])
  React.useEffect(() => () => clearTimeout(timerRef.current), [])
  const announce = React.useCallback((next: PendingAnnouncement, continuous: boolean) => {
    const previous = pendingRef.current
    pendingRef.current = {
      ...next,
      before: previous?.key === next.key ? previous.before : next.before,
    }
    clearTimeout(timerRef.current)
    if (continuous) timerRef.current = setTimeout(flush, 500)
    else flush()
  }, [flush])
  return { announcement, setAnnouncement, announce, flush }
}
