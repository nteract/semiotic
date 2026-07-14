import { useCallback, useEffect, useLayoutEffect, useState } from "react"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * Measure an element's border-box dimensions without assuming ResizeObserver
 * exists during static rendering. The initial size keeps SSR and the first
 * client paint deterministic; unchanged measurements preserve object identity.
 *
 * @param {{ width?: number, height?: number }} [initialSize]
 * @returns {[import("react").RefCallback<HTMLElement>, { width: number, height: number }]}
 */
export default function useElementSize(initialSize = {}) {
  const [element, setElement] = useState(null)
  const ref = useCallback((nextElement) => {
    setElement((current) => current === nextElement ? current : nextElement)
  }, [])
  const [size, setSize] = useState({
    width: initialSize.width ?? 0,
    height: initialSize.height ?? 0,
  })

  useIsomorphicLayoutEffect(() => {
    if (!element) return undefined

    const measure = () => {
      const bounds = element.getBoundingClientRect()
      const next = {
        width: Math.round(bounds.width * 100) / 100,
        height: Math.round(bounds.height * 100) / 100,
      }
      setSize((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      )
    }

    measure()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure)
      return () => window.removeEventListener("resize", measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [ref, size]
}
