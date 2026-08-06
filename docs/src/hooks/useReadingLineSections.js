import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export function sectionIndexAtReadingLine(ids, elements, viewportHeight, ratio = 0.4) {
  if (!ids.length) return null
  const readingLine = viewportHeight * ratio
  let lastPassedIndex = 0
  let found = false
  for (let index = 0; index < ids.length; index += 1) {
    const element = elements.get(ids[index])
    if (!element) continue
    found = true
    const bounds = element.getBoundingClientRect()
    if (bounds.top <= readingLine && bounds.bottom > readingLine) return index
    if (bounds.top <= readingLine) lastPassedIndex = index
  }
  return found ? lastPassedIndex : null
}

/**
 * Stable scrollytelling section state based on a viewport reading line.
 * Programmatic navigation guards against stale IntersectionObserver callbacks
 * from the section being left, which is the usual source of sticky-rail flicker.
 */
export default function useReadingLineSections({
  ids,
  enabled = true,
  initialIndex = 0,
  readingLine = 0.4,
  rootMargin = "-38% 0px -58%",
  threshold = 0,
  reducedMotion = false,
  scrollBlock = "start",
  syncHash = false,
  honorInitialHash = syncHash,
  onActiveChange,
}) {
  const idsKey = JSON.stringify(ids)
  const stableIds = useMemo(() => [...ids], [idsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const thresholdKey = JSON.stringify(threshold)
  const stableThreshold = useMemo(
    () => Array.isArray(threshold) ? [...threshold] : threshold,
    [thresholdKey], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, Math.min(stableIds.length - 1, initialIndex)),
  )
  const elementsRef = useRef(new Map())
  const activeIndexRef = useRef(activeIndex)
  const requestedIdRef = useRef(null)
  const focusCleanupRef = useRef(null)

  const commitIndex = useCallback((index, { force = false, settleRequest = true } = {}) => {
    if (!Number.isInteger(index) || index < 0 || index >= stableIds.length) return false
    const id = stableIds[index]
    if (!force && requestedIdRef.current && requestedIdRef.current !== id) return false
    if (settleRequest && requestedIdRef.current === id) requestedIdRef.current = null
    if (activeIndexRef.current === index) return true
    activeIndexRef.current = index
    setActiveIndex(index)
    onActiveChange?.(id, index)
    return true
  }, [onActiveChange, stableIds])

  const registerSection = useCallback((id, element) => {
    if (element) elementsRef.current.set(id, element)
    else elementsRef.current.delete(id)
  }, [])

  const navigateTo = useCallback((idOrIndex, options = {}) => {
    const index = typeof idOrIndex === "number" ? idOrIndex : stableIds.indexOf(idOrIndex)
    if (index < 0) return false
    const id = stableIds[index]
    const element = elementsRef.current.get(id)
    if (!element) return false
    focusCleanupRef.current?.()
    requestedIdRef.current = id
    // Commit the requested destination immediately, but keep the request guard
    // alive until the observer reaches that section (or scrolling settles).
    // Otherwise a stale observer callback from the section being left can
    // immediately overwrite the reader's explicit choice.
    commitIndex(index, { force: true, settleRequest: false })
    element.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: options.block ?? scrollBlock,
    })

    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      window.removeEventListener("scrollend", settle)
      window.clearTimeout(timeout)
      if (requestedIdRef.current === id) requestedIdRef.current = null
      if (options.focus !== false) {
        element.focus?.({ preventScroll: true })
      }
    }
    const timeout = window.setTimeout(settle, reducedMotion ? 0 : 500)
    if (!reducedMotion) window.addEventListener("scrollend", settle, { once: true })
    focusCleanupRef.current = () => {
      settled = true
      window.removeEventListener("scrollend", settle)
      window.clearTimeout(timeout)
    }
    return true
  }, [commitIndex, reducedMotion, scrollBlock, stableIds])

  useEffect(() => () => focusCleanupRef.current?.(), [])

  useEffect(() => {
    if (!honorInitialHash || typeof window === "undefined") return
    const requestedHash = window.location.hash.replace(/^#/, "")
    if (!stableIds.includes(requestedHash)) return
    const frame = window.requestAnimationFrame(() =>
      navigateTo(requestedHash, { focus: false }),
    )
    return () => window.cancelAnimationFrame(frame)
  }, [honorInitialHash, navigateTo, stableIds])

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return undefined
    if (typeof document !== "undefined") {
      stableIds.forEach((id) => {
        if (!elementsRef.current.has(id)) {
          const element = document.getElementById(id)
          if (element) elementsRef.current.set(id, element)
        }
      })
    }
    const elements = stableIds.map((id) => elementsRef.current.get(id)).filter(Boolean)
    if (!elements.length) return undefined
    const update = () => {
      const index = sectionIndexAtReadingLine(
        stableIds,
        elementsRef.current,
        window.innerHeight,
        readingLine,
      )
      if (index != null) commitIndex(index)
    }
    const observer = new IntersectionObserver(update, { rootMargin, threshold: stableThreshold })
    elements.forEach((element) => observer.observe(element))
    update()
    return () => observer.disconnect()
  }, [commitIndex, enabled, readingLine, rootMargin, stableIds, stableThreshold])

  const activeId = stableIds[activeIndex] ?? stableIds[0]
  useEffect(() => {
    if (!syncHash || !activeId || typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.hash = activeId
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    )
  }, [activeId, syncHash])

  return {
    activeId,
    activeIndex,
    elementsRef,
    navigateTo,
    registerSection,
  }
}
