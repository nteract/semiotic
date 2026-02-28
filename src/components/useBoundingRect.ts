"use client"
import { useState, useLayoutEffect, RefObject } from "react"

export function useBoundingRect(ref: RefObject<HTMLElement>): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (element != null) {
      setRect(element.getBoundingClientRect())
      // TypeScript 3.9 does not know about resize observer
      // @ts-ignore
      const observer = new ResizeObserver((entries) => {
        if (entries.length > 0) {
          setRect(entries[0].contentRect as DOMRect)
        }
      })
      observer.observe(element)
      return () => observer.disconnect()
    }
  }, [])
  return rect
}
