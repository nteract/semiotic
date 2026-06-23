import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"

/**
 * The shared-selection state projected to a custom layout — both into the layout
 * context (`ctx.selection`) and, via {@link useCustomLayoutSelection}, into the
 * layout's React `overlays` subtree.
 *
 * `isActive` is `false` when no selection clause is present (treat every mark as
 * selected). `predicate(datum)` returns `true` when the raw datum matches the
 * active selection.
 */
export interface CustomLayoutSelection {
  isActive: boolean
  predicate: (datum: Datum) => boolean
}

/** Everything-lit default — used when an overlay reads the selection outside a
 *  custom chart, or when no selection is wired. Stable identity so consumers
 *  don't re-render against it. */
const INACTIVE_SELECTION: CustomLayoutSelection = { isActive: false, predicate: () => true }

const CustomLayoutSelectionContext = React.createContext<CustomLayoutSelection | null>(null)

/**
 * Provided by the Stream Frames around a custom layout's `overlays`. The value
 * is the chart's resolved selection; it updates on hover/selection change
 * **without** the frame re-running the layout — so an overlay that subscribes
 * via {@link useCustomLayoutSelection} restyles itself while sceneNodes, the
 * canvas paint, and the quadtree stay untouched.
 */
export function CustomLayoutSelectionProvider({
  value,
  children,
}: {
  value: CustomLayoutSelection | null
  children: React.ReactNode
}): React.ReactElement {
  return <CustomLayoutSelectionContext.Provider value={value}>{children}</CustomLayoutSelectionContext.Provider>
}

/**
 * Read the chart's resolved selection from inside a custom layout's `overlays`.
 *
 * Subscribing components re-render on selection/hover change **without a
 * relayout** — the frame swaps only the context value, never rebuilding the
 * scene. This is the read side of the styling channel; pair it with the
 * `restyle` callback on the layout result to dim/highlight **canvas** marks
 * without re-positioning.
 *
 * Returns an inactive selection (`isActive: false`, predicate always `true`)
 * when called outside a custom chart, so overlays render fully-lit by default.
 *
 * @example
 * ```tsx
 * function ClusterLabel({ datum, x, y }) {
 *   const { isActive, predicate } = useCustomLayoutSelection()
 *   const dim = isActive && !predicate(datum)
 *   return <text x={x} y={y} opacity={dim ? 0.15 : 1}>{datum.label}</text>
 * }
 * ```
 */
export function useCustomLayoutSelection(): CustomLayoutSelection {
  return React.useContext(CustomLayoutSelectionContext) ?? INACTIVE_SELECTION
}

/** Wrap a custom layout's overlay node in the selection provider (no-op for a
 *  null node, so an empty overlay layer stays empty rather than becoming a
 *  provider element). Used by the Stream Frames. */
export function wrapWithCustomLayoutSelection(
  node: React.ReactNode,
  selection: CustomLayoutSelection | null
): React.ReactNode {
  return node != null
    ? <CustomLayoutSelectionProvider value={selection}>{node}</CustomLayoutSelectionProvider>
    : node
}
