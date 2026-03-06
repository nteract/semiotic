import { useRef, useState, useEffect } from "react"

/**
 * Hook that measures the parent container and returns responsive dimensions.
 * Uses ResizeObserver to track container size changes.
 *
 * @param baseSize - The default [width, height] from the size prop
 * @param responsiveWidth - Whether width should follow container width
 * @param responsiveHeight - Whether height should follow container height
 * @returns [containerRef, effectiveSize] — attach the ref to the container div
 */
export function useResponsiveSize(
  baseSize: [number, number],
  responsiveWidth?: boolean,
  responsiveHeight?: boolean
): [React.RefObject<HTMLDivElement>, [number, number]] {
  const containerRef = useRef<HTMLDivElement>(null!)
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (!responsiveWidth && !responsiveHeight) return
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setMeasured((prev) => {
          if (prev && prev.w === width && prev.h === height) return prev
          return { w: width, h: height }
        })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [responsiveWidth, responsiveHeight])

  const effectiveSize: [number, number] = [
    responsiveWidth && measured ? measured.w : baseSize[0],
    responsiveHeight && measured ? measured.h : baseSize[1],
  ]

  return [containerRef, effectiveSize]
}
