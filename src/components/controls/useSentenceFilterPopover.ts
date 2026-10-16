import * as React from "react"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

interface SentenceFilterPopoverLayout {
  offsetX: number
  placement: "above" | "below"
  maxHeight: number | null
  maxWidth: number | null
}

export const DEFAULT_POPOVER_LAYOUT: SentenceFilterPopoverLayout = {
  offsetX: 0,
  placement: "below",
  maxHeight: null,
  maxWidth: null,
}


export function useSentenceFilterPopover(open: { occurrence: number } | null, rootRef: React.RefObject<HTMLElement | null>, triggerRef: React.RefObject<HTMLButtonElement | null>) {
  const [popoverLayout, setPopoverLayout] = React.useState(DEFAULT_POPOVER_LAYOUT)
  const layoutRef = React.useRef(popoverLayout)
  layoutRef.current = popoverLayout
  useIsomorphicLayoutEffect(() => {
    if (!open || typeof window === "undefined") return
    const popover = rootRef.current?.querySelector<HTMLElement>(
      `[data-sentence-filter-popover="${open.occurrence}"]`,
    )
    if (!popover) return

    const keepInsideViewport = () => {
      const gutter = 16
      const bounds = popover.getBoundingClientRect()
      if (bounds.width <= 0) return
      const triggerBounds = triggerRef.current?.getBoundingClientRect()
      const visualViewport = window.visualViewport
      const viewportLeft = visualViewport?.offsetLeft ?? 0
      const viewportTop = visualViewport?.offsetTop ?? 0
      const viewportWidth = visualViewport?.width ?? window.innerWidth
      const viewportHeight = visualViewport?.height ?? window.innerHeight
      const viewportRight = viewportLeft + viewportWidth
      const viewportBottom = viewportTop + viewportHeight
      const computedPopoverStyle = window.getComputedStyle(popover)
      const configuredTopInset = Number.parseFloat(
        computedPopoverStyle.getPropertyValue("--sentence-filter-popover-viewport-inset-top"),
      )
      const configuredBottomInset = Number.parseFloat(
        computedPopoverStyle.getPropertyValue("--sentence-filter-popover-viewport-inset-bottom"),
      )
      let usableTop = viewportTop + (Number.isFinite(configuredTopInset) ? Math.max(0, configuredTopInset) : 0)
      let usableBottom = viewportBottom - (Number.isFinite(configuredBottomInset) ? Math.max(0, configuredBottomInset) : 0)

      // A control inside a currently pinned sticky bar cannot use the bar (or
      // anything it covers) as open space. Detect that boundary automatically;
      // the CSS variables above remain available for sibling app chrome.
      let ancestor = triggerRef.current?.parentElement ?? null
      while (ancestor) {
        const ancestorStyle = window.getComputedStyle(ancestor)
        if (ancestorStyle.position === "sticky") {
          const ancestorBounds = ancestor.getBoundingClientRect()
          const stickyTop = Number.parseFloat(ancestorStyle.top)
          const stickyBottom = Number.parseFloat(ancestorStyle.bottom)
          if (
            Number.isFinite(stickyTop) &&
            Math.abs(ancestorBounds.top - (viewportTop + stickyTop)) <= 1
          ) {
            usableTop = Math.max(usableTop, ancestorBounds.bottom)
          }
          if (
            Number.isFinite(stickyBottom) &&
            Math.abs(ancestorBounds.bottom - (viewportBottom - stickyBottom)) <= 1
          ) {
            usableBottom = Math.min(usableBottom, ancestorBounds.top)
          }
        }
        ancestor = ancestor.parentElement
      }

      // Measure from the unshifted anchor so a later viewport expansion can
      // restore the natural alignment instead of preserving an old correction.
      const naturalLeft = bounds.left - layoutRef.current.offsetX
      const naturalRight = bounds.right - layoutRef.current.offsetX
      let offsetX = 0
      if (naturalRight > viewportRight - gutter) {
        offsetX -= naturalRight - (viewportRight - gutter)
      }
      if (naturalLeft + offsetX < viewportLeft + gutter) {
        offsetX += viewportLeft + gutter - (naturalLeft + offsetX)
      }

      const gap = 8
      const spaceBelow = triggerBounds
        ? usableBottom - triggerBounds.bottom - gap - gutter
        : usableBottom - usableTop - gutter * 2
      const spaceAbove = triggerBounds
        ? triggerBounds.top - usableTop - gap - gutter
        : 0
      const naturalHeight = Math.max(bounds.height, popover.scrollHeight)
      const placement = spaceBelow < Math.min(naturalHeight, 160) && spaceAbove > spaceBelow
        ? "above"
        : "below"
      const availableHeight = placement === "above" ? spaceAbove : spaceBelow
      const maxHeight = Math.max(0, Math.min(384, Math.floor(availableHeight)))
      const maxWidth = Math.max(0, Math.floor(viewportWidth - gutter * 2))

      setPopoverLayout((current) => {
        if (
          current.offsetX === offsetX &&
          current.placement === placement &&
          current.maxHeight === maxHeight &&
          current.maxWidth === maxWidth
        ) {
          return current
        }
        return { offsetX, placement, maxHeight, maxWidth }
      })
    }

    let frame: number | null = null
    const scheduleMeasure = (event?: Event) => {
      if (event?.type === "scroll" && event.target instanceof Node && popover.contains(event.target)) return
      if (frame != null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        keepInsideViewport()
      })
    }
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => scheduleMeasure())
    resizeObserver?.observe(popover)
    if (triggerRef.current) resizeObserver?.observe(triggerRef.current)
    keepInsideViewport()
    window.addEventListener("resize", scheduleMeasure)
    window.addEventListener("scroll", scheduleMeasure, true)
    window.visualViewport?.addEventListener("resize", scheduleMeasure)
    window.visualViewport?.addEventListener("scroll", scheduleMeasure)
    return () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      window.removeEventListener("resize", scheduleMeasure)
      window.removeEventListener("scroll", scheduleMeasure, true)
      window.visualViewport?.removeEventListener("resize", scheduleMeasure)
      window.visualViewport?.removeEventListener("scroll", scheduleMeasure)
    }
  }, [open, rootRef, triggerRef])


  return { popoverLayout, setPopoverLayout }
}
