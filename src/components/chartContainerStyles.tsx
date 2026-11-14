"use client"
import type { CSSProperties, RefObject } from "react"
import { useEffect, useLayoutEffect, useState } from "react"

const sharedCSS = `@keyframes semiotic-skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`

const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

type SharedStyle = HTMLStyleElement & { users: number }

function retainStyle(root: Document | ShadowRoot, key: string, css: string) {
  const parent = "head" in root ? root.head : root
  let node = parent.querySelector<SharedStyle>(
    `style[data-semiotic-container-style="${key}"]`
  )
  if (!node) {
    node = parent.ownerDocument.createElement("style") as SharedStyle
    node.dataset.semioticContainerStyle = key
    node.textContent = css
    node.users = 0
    parent.append(node)
  }
  const retained = node
  retained.users++
  return () => {
    if (--retained.users === 0) retained.remove()
  }
}

export function useChartContainerStyles({
  containerRef,
  breakpoint
}: {
  containerRef: RefObject<HTMLDivElement | null>
  breakpoint?: number
}) {
  return useSharedContainerStyles(
    containerRef,
    "chart",
    sharedCSS,
    breakpoint,
    breakpoint === undefined ? "" : mobileRules(breakpoint)
  )
}

/** Share rules within their DOM root; preserve styles in SSR and initial hydration. */
export function useSharedContainerStyles(
  containerRef: RefObject<HTMLDivElement | null>,
  namespace: string,
  sharedCSS: string,
  breakpoint: number | undefined,
  mobileCSS: string
) {
  const [hydrated, setHydrated] = useState(false)
  useClientLayoutEffect(() => {
    const root = containerRef.current?.getRootNode() as
      Document | ShadowRoot | undefined
    if (!root) return
    setHydrated(true)
    const releaseShared = retainStyle(root, `${namespace}-shared`, sharedCSS)
    const releaseMobile =
      breakpoint === undefined
        ? undefined
        : retainStyle(root, `${namespace}-${breakpoint}`, mobileCSS)
    return () => {
      releaseShared()
      releaseMobile?.()
    }
  }, [containerRef, namespace, sharedCSS, breakpoint, mobileCSS])
  // React 18 escapes quotes in style children, breaking attribute selectors.
  return hydrated ? null : (
    <style dangerouslySetInnerHTML={{ __html: sharedCSS + mobileCSS }} />
  )
}

function mobileRules(breakpoint: number) {
  const container = `.semiotic-chart-container[data-semiotic-mobile-breakpoint="${breakpoint}"]`
  const header = `${container} > .semiotic-chart-header`
  return `@media (max-width: ${breakpoint}px) {
  ${header} {
    padding: 10px 12px !important;
    gap: 10px !important;
  }
  ${header} > .semiotic-chart-title-area {
    flex-basis: 100% !important;
  }
  ${header} > .semiotic-chart-toolbar {
    width: 100% !important;
    margin-left: 0 !important;
    justify-content: flex-start !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }
  ${container}[data-semiotic-mobile-hide-toolbar="true"] > .semiotic-chart-header > .semiotic-chart-toolbar {
    display: none !important;
  }
  ${header} .semiotic-chart-action {
    min-width: 32px !important;
    min-height: 32px !important;
  }
  ${container} > .semiotic-chart-mobile-summary {
    display: block !important;
  }
  ${container} > .semiotic-chart-mobile-standard-controls {
    display: block !important;
  }
  ${container}[data-semiotic-mobile-scroll="true"] > .semiotic-chart-body {
    overflow-x: auto !important;
    justify-content: flex-start !important;
    -webkit-overflow-scrolling: touch;
  }
}`
}

export const chartActionButtonStyle: CSSProperties = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 4,
  color: "var(--semiotic-text-secondary, #666)",
  padding: 0
}
