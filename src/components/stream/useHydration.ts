/**
 * useHydration — small hook that distinguishes "first client render after
 * SSR" from "subsequent client renders." Returns false on the server pass
 * and during the first client render (so the markup matches what the
 * server emitted, satisfying React's hydration check), then flips to
 * true after the first commit.
 *
 * Stream Frames use this to keep their SVG-fallback branch active during
 * hydration: server output equals first-client-render output, then a
 * post-commit re-render swaps in the canvas + interactivity layer.
 *
 * Frames gate that branch on `isServerEnvironment ||
 * (!hydrated && wasHydratingFromSSR)`. Pure client mounts start with canvas.
 *
 * Implementation note: we use `useLayoutEffect` on the client and
 * `useEffect` on the server (the standard `useIsomorphicLayoutEffect`
 * pattern). `useLayoutEffect` fires synchronously after commit but
 * before the browser paints, so the post-hydration re-render and canvas
 * paint happen in the same paint frame as the initial render.
 */
"use client"
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import type { MutableRefObject, RefObject } from "react"

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Returns `false` on the server (no effect fires there) and during the
 * first client render after hydration; `true` from the first
 * post-commit re-render onward.
 */
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useIsomorphicLayoutEffect(() => {
    setHydrated(true)
  }, [])
  return hydrated
}

const noopSubscribe = () => () => {}
const csrSnapshot = () => false
const ssrSnapshot = () => true

/**
 * Returns `true` when this component instance was mounted via SSR
 * hydration (i.e. there was server-rendered HTML to hydrate from), and
 * `false` when it was mounted via pure client-side rendering (no SSR).
 *
 * `useSyncExternalStore` calls `getServerSnapshot` during SSR and initial
 * hydration, but never during a fresh CSR mount. Distinct values from the two
 * snapshots lets us read the hydration mode on the very first render,
 * then we capture it into a ref so it survives later renders.
 *
 * Stream Frames use this to decide whether to skip the intro animation
 * on the canvas's first paint: when SSR has already shown the chart in
 * its final state, re-animating from blank when the canvas takes over
 * would replay the introduction. CSR mounts start with canvas and keep
 * their intro animation.
 */
export function useWasHydratingFromSSR(): boolean {
  const isHydrating = useSyncExternalStore(noopSubscribe, csrSnapshot, ssrSnapshot)
  // Capture the first-render value. After hydration completes,
  // `isHydrating` flips to `false` (getSnapshot wins), but the ref
  // still holds the first-render value — which is `true` if and only
  // if React called `getServerSnapshot`, i.e. we were hydrating SSR.
  const ref = useRef(isHydrating)
  return ref.current
}

/**
 * Shared post-hydration lifecycle for every Stream Frame.
 *
 * When the hydration signals change and `hydrated` is true:
 *
 * 1. If we just rehydrated from SSR, cancel the intro animation that
 *    the SVG-branch's `computeScene` installed (the server already
 *    painted the chart in its final state).
 * 2. Mark the scene dirty, or request a repaint of an already-built CSR scene.
 * 3. Cancel queued rendering and paint synchronously via `renderFnRef.current()`.
 *
 * Step 3 is the timing-critical bit. The hook fires inside an
 * isomorphic layout effect — `useLayoutEffect` on the client (runs
 * synchronously after commit but before the browser paints),
 * `useEffect` on the server (no-op, since SSR doesn't paint). If we
 * deferred the paint to a `requestAnimationFrame` (the standard
 * `scheduleRender()` route), the rAF callback wouldn't fire until
 * the *next* frame — meaning the browser would paint *frame N* with
 * the canvas in DOM but blank, then *frame N+1* with the canvas
 * actually drawn. Synchronous paint inside the layout effect makes
 * frame N's paint already include the canvas content; no flash.
 *
 * Each frame supplies its own `cleanup` for unmount work that's
 * frame-specific (XY/Ordinal clear the streaming adapter; Geo clears
 * its tile cache). Physics manages worker/store cleanup in its own lifecycle.
 */
export interface HydrationLifecycleOptions {
  hydrated: boolean
  wasHydratingFromSSR: boolean
  /**
   * Ref to the frame's pipeline store. The store optionally implements
   * `cancelIntroAnimation()`; the hook calls it when the SVG → canvas
   * swap fires after SSR rehydration. Physics and custom stores without
   * intro transitions can omit it. `sceneNodes` + `markStylePaintPending()`
   * let the hook repaint an already-built scene instead of forcing a rebuild;
   * both are optional so a minimal custom store still works.
   */
  storeRef: RefObject<{
    cancelIntroAnimation?: () => void
    sceneNodes?: { length: number }
    markStylePaintPending?: () => void
  } | null>
  /**
   * Mutable dirty flag the renderer reads on its next paint. The hook
   * sets it when a post-hydration rebuild is needed.
   */
  dirtyRef: MutableRefObject<boolean>
  /**
   * Ref to the frame's render closure (assigned by `useFrame` /
   * the frame body). The hook calls this synchronously to paint
   * within the same frame as the SVG → canvas swap commit, avoiding
   * the one-frame blank-canvas flicker that an rAF-deferred paint
   * would produce.
   */
  renderFnRef: MutableRefObject<() => void>
  /**
   * Optional shared-scheduler cancellation. A hydration paint is synchronous,
   * so it must take ownership from any queued render before invoking the
   * frame closure.
   */
  cancelRender?: () => void
  /**
   * Optional unmount cleanup. Frame-specific work the hook can't
   * generalize — e.g. clearing the streaming `DataSourceAdapter`
   * (XY/Ordinal) or the geo tile cache.
   */
  cleanup?: () => void
}

export function useHydrationLifecycle(opts: HydrationLifecycleOptions): void {
  const {
    hydrated,
    wasHydratingFromSSR,
    storeRef,
    dirtyRef,
    renderFnRef,
    cancelRender,
    cleanup
  } = opts
  useIsomorphicLayoutEffect(() => {
    // The first CSR commit has a canvas but its passive data/config effects
    // have not run yet. useHydration schedules a second commit before paint;
    // paint there, after ingestion, instead of projecting an empty store now.
    if (!hydrated) return
    const store = storeRef.current
    if (hydrated && wasHydratingFromSSR) {
      store?.cancelIntroAnimation?.()
    }
    // A frame that already built its scene synchronously (the network frame
    // pre-builds for keyboard nav / hit-testing / htmlMarks) only needs a
    // repaint here, not a rebuild — forcing `dirtyRef` would recompute an
    // identical scene (flagged by SceneRevisionDiagnostics). Restrict this to
    // the CSR path: SSR rehydration keeps the unconditional rebuild so the
    // just-cancelled intro state is reflected, and frames that haven't painted
    // a scene yet (XY/ordinal/geo mount, empty SSR client store) fall through
    // to the dirty-flag build.
    const hasBuiltScene = !!store?.sceneNodes && store.sceneNodes.length > 0
    if (!wasHydratingFromSSR && hasBuiltScene && store?.markStylePaintPending) {
      store.markStylePaintPending()
    } else {
      dirtyRef.current = true
    }
    cancelRender?.()
    // Synchronous paint — see the hook's docstring for why an rAF
    // here would produce a one-frame blank-canvas flicker on SSR
    // rehydration. `renderFnRef.current` is the frame body's render
    // closure; it's idempotent and rAF-cancel-safe (resets
    // `rafRef.current = null` at the start), so calling it directly
    // from a layout effect doesn't conflict with the in-flight
    // scheduling that other paths use.
    renderFnRef.current()
    // Stable refs expose the latest store and render closure; the hydration
    // signals determine when this handoff runs.
  }, [hydrated, wasHydratingFromSSR])

  // Keep resource cleanup separate from hydration-signal changes so the
  // first canvas handoff preserves rows pushed through a callback ref.
  const cleanupRef = useRef(cleanup)
  cleanupRef.current = cleanup
  useEffect(() => {
    return () => cleanupRef.current?.()
  }, [])
}
