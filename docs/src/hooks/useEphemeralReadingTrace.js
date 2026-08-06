import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const EMPTY_TRACE = Object.freeze({
  dwell: {},
  visits: {},
  transitions: [],
  backtracks: 0,
  startedAt: null,
  elapsedMs: 0,
})

const clockNow = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now()

/**
 * Consent-controlled, in-memory section trace for docs experiments.
 * It stores aggregates and a bounded transition list—never raw pointer data,
 * persistent storage, or network events.
 */
export default function useEphemeralReadingTrace({
  enabled,
  activeSection,
  sectionOrder = [],
  maxTransitions = 40,
  tickMs = 750,
}) {
  const [trace, setTrace] = useState(EMPTY_TRACE)
  const previousSectionRef = useRef(null)
  const lastTickRef = useRef(null)
  const activeSectionRef = useRef(activeSection)
  activeSectionRef.current = activeSection
  const transitionLimit = Number.isFinite(maxTransitions)
    ? Math.max(0, Math.floor(maxTransitions))
    : 40

  // Callers commonly declare the order inline. Key the derived lookup by its
  // values so a trace update does not turn that harmless new array identity
  // into another effect run (and another trace update).
  const sectionOrderKey = JSON.stringify(sectionOrder)
  const sectionOrderLookup = useMemo(
    () => new Map(sectionOrder.map((id, index) => [id, index])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectionOrderKey],
  )
  const orderIndex = useCallback(
    (id) => sectionOrderLookup.get(id) ?? Number.MAX_SAFE_INTEGER,
    [sectionOrderLookup],
  )

  const reset = useCallback(() => {
    previousSectionRef.current = null
    lastTickRef.current = enabled ? clockNow() : null
    setTrace(EMPTY_TRACE)
  }, [enabled])

  useEffect(() => {
    if (!enabled || !activeSection) {
      lastTickRef.current = null
      previousSectionRef.current = null
      setTrace(EMPTY_TRACE)
      return undefined
    }

    const now = clockNow()
    const previous = previousSectionRef.current
    const previousTick = lastTickRef.current ?? now
    const visible = typeof document === "undefined" || !document.hidden
    const finalPreviousDwell = previous && visible
      ? Math.max(0, Math.min(tickMs * 2, now - previousTick))
      : 0
    lastTickRef.current = now
    previousSectionRef.current = activeSection

    setTrace((current) => ({
      ...current,
      startedAt: current.startedAt ?? Date.now(),
      elapsedMs: current.elapsedMs + finalPreviousDwell,
      dwell: previous && finalPreviousDwell
        ? {
            ...current.dwell,
            [previous]: (current.dwell[previous] ?? 0) + finalPreviousDwell,
          }
        : current.dwell,
      visits: {
        ...current.visits,
        [activeSection]: (current.visits[activeSection] ?? 0) + 1,
      },
      backtracks:
        previous && previous !== activeSection && orderIndex(activeSection) < orderIndex(previous)
          ? current.backtracks + 1
          : current.backtracks,
      transitions:
        previous && previous !== activeSection && transitionLimit > 0
          ? [
              ...(transitionLimit > 1
                ? current.transitions.slice(-(transitionLimit - 1))
                : []),
              { from: previous, to: activeSection, at: Date.now() },
            ]
          : transitionLimit === 0 ? [] : current.transitions,
    }))
    return undefined
  }, [activeSection, enabled, orderIndex, tickMs, transitionLimit])

  useEffect(() => {
    if (!enabled || !activeSection) return undefined
    const tick = () => {
      const now = clockNow()
      if (typeof document !== "undefined" && document.hidden) {
        lastTickRef.current = now
        return
      }
      const previous = lastTickRef.current ?? now
      const delta = Math.max(0, Math.min(tickMs * 2, now - previous))
      lastTickRef.current = now
      const section = activeSectionRef.current
      setTrace((current) => ({
        ...current,
        elapsedMs: current.elapsedMs + delta,
        dwell: {
          ...current.dwell,
          [section]: (current.dwell[section] ?? 0) + delta,
        },
      }))
    }
    const timer = window.setInterval(tick, tickMs)
    return () => window.clearInterval(timer)
  }, [activeSection, enabled, tickMs])

  useEffect(() => {
    if (!enabled || !activeSection || typeof document === "undefined") return undefined
    const handleVisibilityChange = () => {
      const now = clockNow()
      if (!document.hidden) {
        // Resume from a fresh clock so hidden time can never leak into the
        // next interval, even when the page was hidden for less than tickMs.
        lastTickRef.current = now
        return
      }
      const previous = lastTickRef.current ?? now
      const delta = Math.max(0, Math.min(tickMs * 2, now - previous))
      lastTickRef.current = now
      const section = activeSectionRef.current
      if (!delta || !section) return
      setTrace((current) => ({
        ...current,
        elapsedMs: current.elapsedMs + delta,
        dwell: {
          ...current.dwell,
          [section]: (current.dwell[section] ?? 0) + delta,
        },
      }))
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [activeSection, enabled, tickMs])

  return { trace, reset }
}

export { EMPTY_TRACE as EMPTY_EPHEMERAL_READING_TRACE }
