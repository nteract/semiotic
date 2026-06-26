"use client"
import { useEffect, useRef, type MutableRefObject } from "react"

// Bridges that push a React-owned value into the imperative scene store and
// repaint. These are NOT "mirror a store value into another store" relays: the
// values they carry (the memoized pipeline config; the resolved custom-layout
// selection) are owned/assembled in React, and the canvas/scene store is
// imperative and must be told to repaint when they change. That is the
// legitimate "synchronize an external imperative system with React-owned state"
// use of an effect — note neither hook calls `setState`, so they cannot cascade
// React re-renders. All three stream stores (`PipelineStore`,
// `OrdinalPipelineStore`, `NetworkPipelineStore`) plus the geo store structurally
// satisfy the minimal store slices below.

/**
 * Push the memoized pipeline config into the scene store and repaint.
 *
 * `config` is memoized upstream (the frames' `stablePipelineConfig`), so this
 * fires only on a real config change, never per render. Marks the scene dirty
 * and repaints because style callbacks (pointStyle, areaStyle, …) carried in
 * the config may have changed even when geometry did not.
 */
export function useConfigSync<C>(
  storeRef: MutableRefObject<{ updateConfig(config: C): void } | null>,
  config: C,
  dirtyRef: MutableRefObject<boolean>,
  scheduleRender: () => void
): void {
  useEffect(() => {
    storeRef.current?.updateConfig(config)
    dirtyRef.current = true
    scheduleRender()
  }, [config, scheduleRender, storeRef, dirtyRef])
}

/**
 * Bridge a custom layout's resolved selection (`layoutSelection`) into the
 * scene store and repaint.
 *
 * `layoutSelection` has no single home in a store: the custom-chart HOCs
 * assemble it in React by merging local component state (hover-highlight,
 * legend interaction) with the cross-chart selection store
 * (`effectiveSelectionHook = hover ?? legend ?? activeSelection`). React owns
 * that blended value.
 *
 * Kept OFF the rebuild path: when the layout returned a `restyle` callback a
 * selection change re-applies styles to the existing scene and repaints (no
 * relayout, no quadtree rebuild); otherwise it marks the scene dirty so a
 * rebuild lets `ctx.selection` reach the layout. Either way the overlay subtree
 * re-renders against the new selection via `CustomLayoutSelectionProvider`.
 *
 * The `lastSelectionRef` guard makes the write fire only on a real selection
 * change (the HOCs already memoize `layoutSelection` on its `isActive`/
 * `predicate` identity), never per render.
 */
export function useLayoutSelectionSync<S>(
  storeRef: MutableRefObject<{
    setLayoutSelection(selection: S | null): void
    hasCustomRestyle: boolean
    restyleScene(selection: S | null): void
  } | null>,
  layoutSelection: S | null | undefined,
  dirtyRef: MutableRefObject<boolean>,
  scheduleRender: () => void
): void {
  const lastSelectionRef = useRef<S | null>(null)
  useEffect(() => {
    const store = storeRef.current
    if (!store) return
    const sel = layoutSelection ?? null
    if (lastSelectionRef.current === sel) return
    lastSelectionRef.current = sel
    store.setLayoutSelection(sel)
    if (store.hasCustomRestyle) {
      store.restyleScene(sel)
    } else {
      dirtyRef.current = true
    }
    scheduleRender()
  }, [layoutSelection, scheduleRender, storeRef, dirtyRef])
}
