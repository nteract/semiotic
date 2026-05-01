import * as React from "react"

/**
 * Compose a stack of overlay ReactNodes into a single fragment, dropping
 * null/undefined sources. Each frame paints its `resolvedForeground`
 * (axes, legends, annotations, react overlay) and may layer additional
 * sources on top — currently `customLayoutOverlays` from recipe-managed
 * chrome, with brush UIs and recipe-owned legends planned. Centralising
 * the merge here keeps SSR and client branches in sync and gives future
 * overlay sources one obvious place to plug in.
 *
 * Returns the single non-null source as-is when only one is present
 * (avoids an unnecessary fragment); returns `null` when every source is
 * absent so callers can skip the overlay subtree entirely.
 */
export function composeOverlays(...sources: Array<React.ReactNode | null | undefined>): React.ReactNode {
  const present = sources.filter((s): s is React.ReactNode => s != null)
  if (present.length === 0) return null
  if (present.length === 1) return present[0]
  return React.createElement(React.Fragment, null, ...present)
}
