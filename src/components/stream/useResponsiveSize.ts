import { useRef, useState, useEffect } from "react"
import {
  resolveResponsiveDimension,
  type ResponsiveSizeOptions,
} from "./responsiveSize"

export { resolveResponsiveDimension } from "./responsiveSize"
export type { ResponsiveSizeOptions } from "./responsiveSize"

/**
 * Hook that measures the parent container and returns responsive dimensions.
 * Uses ResizeObserver to track container size changes.
 *
 * @param baseSize - The default [width, height] from the size prop
 * @param responsiveWidth - Whether width should follow container width
 * @param responsiveHeight - Whether height should follow container height
 * @param options - Optional min/max and resize-quantization constraints
 * @returns [containerRef, effectiveSize] — attach the ref to the container div
 */
export function useResponsiveSize(
  baseSize: [number, number],
  responsiveWidth?: boolean,
  responsiveHeight?: boolean,
  options: ResponsiveSizeOptions = {},
): [React.RefObject<HTMLDivElement>, [number, number]] {
  const containerRef = useRef<HTMLDivElement>(null!)
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (!responsiveWidth && !responsiveHeight) return
    const el = containerRef.current
    if (!el || typeof ResizeObserver === "undefined") return

    const resolveMeasurement = (width: number, height: number) => ({
      w: resolveResponsiveDimension(
        width,
        options.minWidth,
        options.maxWidth,
        options.widthStep,
      ),
      h: resolveResponsiveDimension(
        height,
        options.minHeight,
        options.maxHeight,
        options.heightStep,
      ),
    })

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const next = resolveMeasurement(width, height)
        setMeasured((prev) => {
          if (prev && prev.w === next.w && prev.h === next.h) return prev
          return next
        })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [
    responsiveWidth,
    responsiveHeight,
    options.minWidth,
    options.maxWidth,
    options.widthStep,
    options.minHeight,
    options.maxHeight,
    options.heightStep,
  ])

  const effectiveSize: [number, number] = [
    responsiveWidth && measured ? measured.w : baseSize[0],
    responsiveHeight && measured ? measured.h : baseSize[1],
  ]

  return [containerRef, effectiveSize]
}
