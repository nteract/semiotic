import useEphemeralReadingTrace from "../../../hooks/useEphemeralReadingTrace"

const CHAPTER_ORDER = [
  "prologue",
  "flood",
  "empty-office",
  "last-scarcity",
  "court",
  "companion",
  "agon",
  "commons",
  "observatory",
]

/**
 * Ephemeral, consent-gated reading telemetry for this example.
 *
 * Nothing is written to localStorage, cookies, analytics, or the network. The
 * hook keeps one aggregate per chapter rather than retaining raw pointer or
 * scroll coordinates. Resetting or reloading destroys the trace.
 */
export function useLocalReadingTelemetry({ enabled, activeChapter }) {
  return useEphemeralReadingTrace({
    enabled,
    activeSection: activeChapter,
    sectionOrder: CHAPTER_ORDER,
    maxTransitions: 40,
  })
}

export function formatDwell(milliseconds) {
  const seconds = Math.round((milliseconds ?? 0) / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`
}
